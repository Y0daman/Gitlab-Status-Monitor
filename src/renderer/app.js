function statusToLight(status) {
  switch (status) {
    case "success":
    case "skipped":
      return "green";
    case "running":
    case "pending":
    case "created":
    case "manual":
    case "preparing":
    case "waiting_for_resource":
      return "yellow";
    case "failed":
    case "canceled":
      return "red";
    default:
      return "gray";
  }
}

const elements = {
  refreshBtn: document.getElementById("refresh-btn"),
  saveTokenBtn: document.getElementById("save-token-btn"),
  saveApiBtn: document.getElementById("save-api-btn"),
  savePollBtn: document.getElementById("save-poll-btn"),
  loadBranchesBtn: document.getElementById("load-branches-btn"),
  tokenInput: document.getElementById("token"),
  apiBaseInput: document.getElementById("api-base"),
  pollIntervalInput: document.getElementById("poll-interval"),
  tokenActive: document.getElementById("token-active"),
  tokenSource: document.getElementById("token-source"),
  envTokenFound: document.getElementById("env-token-found"),
  lastUpdate: document.getElementById("last-update"),
  addProjectForm: document.getElementById("add-project-form"),
  projectIdInput: document.getElementById("project-id"),
  projectBranchesInput: document.getElementById("project-branches"),
  projectsTable: document.getElementById("projects-table"),
  statusTable: document.getElementById("status-table")
};

let appState = {
  config: null,
  entries: []
};

function renderProjects(projects) {
  elements.projectsTable.innerHTML = "";

  if (!projects || projects.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4">No projects configured yet.</td>`;
    elements.projectsTable.appendChild(row);
    return;
  }

  for (const project of projects) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="break">${project.name || "-"}</td>
      <td class="break">${project.id}</td>
      <td class="break">${project.branches.join(", ")}</td>
      <td><button data-remove-project="${project.id}">Remove</button></td>
    `;
    elements.projectsTable.appendChild(row);
  }

  for (const button of elements.projectsTable.querySelectorAll("button[data-remove-project]")) {
    button.addEventListener("click", async () => {
      await window.monitorApi.removeProject(button.dataset.removeProject);
      await refreshState();
    });
  }
}

function renderStatuses(entries) {
  elements.statusTable.innerHTML = "";

  if (!entries || entries.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="7">No project branches to monitor.</td>`;
    elements.statusTable.appendChild(row);
    return;
  }

  for (const entry of entries.slice().sort((a, b) => `${a.projectId}:${a.branch}`.localeCompare(`${b.projectId}:${b.branch}`))) {
    const row = document.createElement("tr");
    const light = statusToLight(entry.pipelineStatus);
    const ongoing = entry.isOngoing ? " (ongoing)" : "";
    const details = entry.error
      ? `Error: ${entry.error}`
      : entry.pipelineWebUrl
        ? `<a href="${entry.pipelineWebUrl}" target="_blank" rel="noreferrer">Pipeline #${entry.pipelineId || "?"}</a>`
        : "No pipeline found";

    row.innerHTML = `
      <td><span class="pill ${light}">${light.toUpperCase()}</span></td>
      <td class="break">${entry.projectName || "-"}</td>
      <td class="break">${entry.projectId}</td>
      <td>${entry.branch}</td>
      <td>${entry.pipelineStatus || "unknown"}${ongoing}</td>
      <td>${entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "-"}</td>
      <td class="break">${details}</td>
    `;
    elements.statusTable.appendChild(row);
  }
}

function renderState(payload) {
  appState = payload;
  const { config, entries, generatedAt, hasToken, tokenSource, hasEnvToken } = payload;

  elements.apiBaseInput.value = config.gitlab.apiBaseUrl;
  elements.pollIntervalInput.value = String(config.pollIntervalSec);
  elements.tokenActive.textContent = hasToken ? "Yes" : "No";
  elements.tokenSource.textContent = tokenSource || "none";
  elements.envTokenFound.textContent = hasEnvToken ? "Yes" : "No";
  elements.lastUpdate.textContent = generatedAt ? new Date(generatedAt).toLocaleString() : "-";

  renderProjects(config.projects);
  renderStatuses(entries);
}

async function refreshState() {
  const payload = await window.monitorApi.getState();
  renderState(payload);
}

elements.refreshBtn.addEventListener("click", async () => {
  await window.monitorApi.refresh();
  await refreshState();
});

elements.saveTokenBtn.addEventListener("click", async () => {
  await window.monitorApi.setToken(elements.tokenInput.value);
  elements.tokenInput.value = "";
  await refreshState();
});

elements.saveApiBtn.addEventListener("click", async () => {
  await window.monitorApi.setApiBaseUrl(elements.apiBaseInput.value);
  await refreshState();
});

elements.savePollBtn.addEventListener("click", async () => {
  await window.monitorApi.setPollInterval(Number(elements.pollIntervalInput.value));
  await refreshState();
});

elements.addProjectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedBranches = Array.from(elements.projectBranchesInput.selectedOptions)
    .map((option) => option.value)
    .filter(Boolean);

  await window.monitorApi.addProject({
    id: elements.projectIdInput.value,
    branches: selectedBranches.length > 0 ? selectedBranches : ["main"]
  });

  elements.projectIdInput.value = "";
  elements.projectBranchesInput.innerHTML = "";
  await refreshState();
});

elements.loadBranchesBtn.addEventListener("click", async () => {
  const projectId = elements.projectIdInput.value.trim();
  if (!projectId) {
    return;
  }

  elements.loadBranchesBtn.disabled = true;
  elements.loadBranchesBtn.textContent = "Loading...";

  try {
    const result = await window.monitorApi.listBranches(projectId);
    elements.projectBranchesInput.innerHTML = "";

    if (!result.branches || result.branches.length === 0) {
      const option = document.createElement("option");
      option.value = "main";
      option.textContent = "main";
      option.selected = true;
      elements.projectBranchesInput.appendChild(option);
      return;
    }

    for (const branch of result.branches) {
      const option = document.createElement("option");
      option.value = branch;
      option.textContent = branch;
      if (branch === "main") {
        option.selected = true;
      }
      elements.projectBranchesInput.appendChild(option);
    }
  } catch (error) {
    elements.projectBranchesInput.innerHTML = "";
    const fallback = document.createElement("option");
    fallback.value = "main";
    fallback.textContent = "main";
    fallback.selected = true;
    elements.projectBranchesInput.appendChild(fallback);
  } finally {
    elements.loadBranchesBtn.disabled = false;
    elements.loadBranchesBtn.textContent = "Load Branches";
  }
});

window.monitorApi.onStatusUpdate((payload) => {
  renderState(payload);
});

refreshState();
