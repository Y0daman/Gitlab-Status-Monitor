const path = require("node:path");
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require("electron");
const { loadConfig, saveConfig, normalizeConfig, normalizeApiBaseUrl, resolveTokenInfo } = require("./lib/config");
const { fetchLatestPipeline, fetchProjectBranches, fetchProjectDetails } = require("./lib/gitlab");
const { aggregateLight, mapPipelineStatusToLight, lightEmoji, isOngoingPipeline, parseBranchesInput } = require("./lib/status");

let tray;
let mainWindow;
let appConfig;
let statusEntries = [];
let pollingTimer;
let isQuitting = false;
let trayReady = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 680,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    if (!trayReady) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });
}

function createCircleIcon(light) {
  const color = light === "green"
    ? "#2fa84f"
    : light === "yellow"
      ? "#e7af00"
      : light === "red"
        ? "#db4638"
        : "#9096a2";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="${color}"/></svg>`;
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
  return image.resize({ width: 18, height: 18 });
}

function openDashboard() {
  if (!mainWindow) {
    return;
  }
  mainWindow.show();
  mainWindow.focus();
}

function projectDisplay(projectId, projectName) {
  const name = String(projectName || "").trim();
  return name ? `${name} (${projectId})` : projectId;
}

function rebuildTrayMenu() {
  const aggregate = aggregateLight(statusEntries);
  const aggregateEmoji = lightEmoji(aggregate);
  const menuItems = [
    {
      label: `${aggregateEmoji} Overall: ${aggregate.toUpperCase()}`,
      enabled: false
    },
    {
      label: "Open Dashboard",
      click: () => openDashboard()
    },
    {
      label: "Refresh Now",
      click: () => refreshStatuses()
    },
    {
      type: "checkbox",
      label: "Expand per project/branch",
      checked: Boolean(appConfig.ui.expandedTray),
      click: async (item) => {
        appConfig.ui.expandedTray = item.checked;
        appConfig = await saveConfig(app.getPath("userData"), appConfig);
        rebuildTrayMenu();
      }
    }
  ];

  if (appConfig.ui.expandedTray && statusEntries.length > 0) {
    menuItems.push({ type: "separator" });
    statusEntries
      .slice()
      .sort((a, b) => `${a.projectId}:${a.branch}`.localeCompare(`${b.projectId}:${b.branch}`))
      .forEach((entry) => {
        const light = mapPipelineStatusToLight(entry.pipelineStatus);
        const ongoingMarker = entry.isOngoing ? " (ongoing)" : "";
        menuItems.push({
          label: `${lightEmoji(light)} ${projectDisplay(entry.projectId, entry.projectName)} [${entry.branch}] - ${entry.pipelineStatus || "unknown"}${ongoingMarker}`,
          enabled: false
        });
      });
  }

  menuItems.push({ type: "separator" });
  menuItems.push({
    label: "Quit",
    click: () => {
      app.quit();
    }
  });

  tray.setImage(createCircleIcon(aggregate));
  tray.setToolTip(`GitLab Status Monitor - ${aggregate.toUpperCase()}`);
  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

async function refreshStatuses() {
  const tokenInfo = resolveTokenInfo(appConfig);
  const token = tokenInfo.token;
  const entries = [];
  const projectNameById = new Map(appConfig.projects.map((project) => [project.id, project.name || ""]));

  let configUpdated = false;
  await Promise.all(
    appConfig.projects.map(async (project) => {
      if (project.name) {
        return;
      }

      try {
        const details = await fetchProjectDetails({
          apiBaseUrl: appConfig.gitlab.apiBaseUrl,
          projectId: project.id,
          token
        });

        if (details && details.name) {
          project.name = details.name;
          projectNameById.set(project.id, details.name);
          configUpdated = true;
        }
      } catch {
        projectNameById.set(project.id, "");
      }
    })
  );

  if (configUpdated) {
    appConfig = await saveConfig(app.getPath("userData"), appConfig);
  }

  await Promise.all(
    appConfig.projects.flatMap((project) =>
      project.branches.map(async (branch) => {
        const entry = {
          projectId: project.id,
          projectName: projectNameById.get(project.id) || "",
          branch,
          pipelineStatus: "unknown",
          pipelineId: null,
          pipelineWebUrl: "",
          updatedAt: "",
          error: "",
          isOngoing: false
        };

        try {
          const pipeline = await fetchLatestPipeline({
            apiBaseUrl: appConfig.gitlab.apiBaseUrl,
            projectId: project.id,
            branch,
            token
          });

          if (pipeline) {
            entry.pipelineStatus = pipeline.status || "unknown";
            entry.pipelineId = pipeline.id || null;
            entry.pipelineWebUrl = pipeline.web_url || "";
            entry.updatedAt = pipeline.updated_at || "";
            entry.isOngoing = isOngoingPipeline(entry.pipelineStatus);
          }
        } catch (error) {
          entry.error = error.message;
        }

        entries.push(entry);
      })
    )
  );

  statusEntries = entries;
  if (trayReady) {
    rebuildTrayMenu();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("monitor:status-update", {
      config: appConfig,
      entries: statusEntries,
      generatedAt: new Date().toISOString(),
      hasToken: Boolean(token),
      tokenSource: tokenInfo.source,
      hasEnvToken: tokenInfo.hasEnvToken,
      hasEnvGitLabToken: tokenInfo.hasEnvGitLabToken
    });
  }
}

function setupPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
  }

  const intervalMs = Math.max(15, Number(appConfig.pollIntervalSec) || 60) * 1000;
  pollingTimer = setInterval(() => {
    refreshStatuses();
  }, intervalMs);
}

function setupIpc() {
  ipcMain.handle("monitor:get-state", async () => {
    const tokenInfo = resolveTokenInfo(appConfig);
    return {
      config: appConfig,
      entries: statusEntries,
      generatedAt: new Date().toISOString(),
      hasToken: Boolean(tokenInfo.token),
      tokenSource: tokenInfo.source,
      hasEnvToken: tokenInfo.hasEnvToken,
      hasEnvGitLabToken: tokenInfo.hasEnvGitLabToken
    };
  });

  ipcMain.handle("monitor:refresh", async () => {
    await refreshStatuses();
    return { ok: true };
  });

  ipcMain.handle("monitor:list-branches", async (_, projectId) => {
    const id = String(projectId || "").trim();
    if (!id) {
      throw new Error("Project id/path is required");
    }

    const tokenInfo = resolveTokenInfo(appConfig);
    const branches = await fetchProjectBranches({
      apiBaseUrl: appConfig.gitlab.apiBaseUrl,
      projectId: id,
      token: tokenInfo.token
    });

    let projectName = "";
    try {
      const details = await fetchProjectDetails({
        apiBaseUrl: appConfig.gitlab.apiBaseUrl,
        projectId: id,
        token: tokenInfo.token
      });
      projectName = details.name;
    } catch {
      projectName = "";
    }

    return { projectId: id, projectName, branches };
  });

  ipcMain.handle("config:set-token", async (_, token) => {
    appConfig.gitlab.token = String(token || "").trim();
    appConfig = await saveConfig(app.getPath("userData"), appConfig);
    await refreshStatuses();
    return appConfig;
  });

  ipcMain.handle("config:set-api-base", async (_, apiBaseUrl) => {
    appConfig.gitlab.apiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
    appConfig = await saveConfig(app.getPath("userData"), appConfig);
    await refreshStatuses();
    return appConfig;
  });

  ipcMain.handle("config:set-poll-interval", async (_, intervalSec) => {
    appConfig.pollIntervalSec = Math.max(15, Number(intervalSec) || 60);
    appConfig = await saveConfig(app.getPath("userData"), appConfig);
    setupPolling();
    return appConfig;
  });

  ipcMain.handle("config:add-project", async (_, payload) => {
    const id = String(payload.id || "").trim();
    if (!id) {
      throw new Error("Project id/path is required");
    }

    const branches = Array.isArray(payload.branches)
      ? payload.branches.map((branch) => String(branch).trim()).filter(Boolean)
      : parseBranchesInput(payload.branchesInput || "main");

    const tokenInfo = resolveTokenInfo(appConfig);
    let fetchedProjectName = "";
    try {
      const details = await fetchProjectDetails({
        apiBaseUrl: appConfig.gitlab.apiBaseUrl,
        projectId: id,
        token: tokenInfo.token
      });
      fetchedProjectName = details.name;
    } catch {
      fetchedProjectName = "";
    }

    const existing = appConfig.projects.find((project) => project.id === id);
    if (existing) {
      existing.branches = Array.from(new Set([...(existing.branches || []), ...branches]));
      if (fetchedProjectName) {
        existing.name = fetchedProjectName;
      }
    } else {
      appConfig.projects.push({ id, name: fetchedProjectName, branches });
    }

    appConfig = normalizeConfig(appConfig);
    appConfig = await saveConfig(app.getPath("userData"), appConfig);
    await refreshStatuses();
    return appConfig;
  });

  ipcMain.handle("config:remove-project", async (_, projectId) => {
    appConfig.projects = appConfig.projects.filter((project) => project.id !== projectId);
    appConfig = await saveConfig(app.getPath("userData"), appConfig);
    await refreshStatuses();
    return appConfig;
  });

  ipcMain.handle("window:show", async () => {
    openDashboard();
    return { ok: true };
  });
}

async function bootstrap() {
  appConfig = await loadConfig(app.getPath("userData"));

  createWindow();

  try {
    tray = new Tray(createCircleIcon("gray"));
    tray.on("click", () => openDashboard());
    trayReady = true;
  } catch (error) {
    trayReady = false;
    console.error("Tray initialization failed, keeping window visible:", error.message);
  }

  setupIpc();
  if (trayReady) {
    rebuildTrayMenu();
  }
  setupPolling();
  await refreshStatuses();

  openDashboard();
}

app.whenReady().then(bootstrap);

app.on("before-quit", () => {
  isQuitting = true;
  if (pollingTimer) {
    clearInterval(pollingTimer);
  }
});

app.on("activate", () => {
  openDashboard();
});

app.on("window-all-closed", (event) => {
  if (!isQuitting) {
    event.preventDefault();
  }
});
