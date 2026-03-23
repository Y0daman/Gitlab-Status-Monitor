const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_CONFIG = {
  version: 1,
  pollIntervalSec: 60,
  gitlab: {
    apiBaseUrl: "https://gitlab.com/api/v4",
    token: ""
  },
  ui: {
    expandedTray: false,
    launchOnStartup: false
  },
  projects: []
};

function normalizeApiBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return DEFAULT_CONFIG.gitlab.apiBaseUrl;
  }

  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  if (withoutTrailingSlash.includes("/api/")) {
    return withoutTrailingSlash;
  }

  return `${withoutTrailingSlash}/api/v4`;
}

function createConfigPath(userDataPath) {
  return path.join(userDataPath, "config.json");
}

function normalizeConfig(input) {
  const merged = {
    ...DEFAULT_CONFIG,
    ...input,
    gitlab: {
      ...DEFAULT_CONFIG.gitlab,
      ...(input && input.gitlab ? input.gitlab : {})
    },
    ui: {
      ...DEFAULT_CONFIG.ui,
      ...(input && input.ui ? input.ui : {})
    }
  };

  merged.projects = Array.isArray(merged.projects)
    ? merged.projects
        .filter((project) => project && project.id)
        .map((project) => ({
          id: String(project.id).trim(),
          name: String(project.name || "").trim(),
          branches: Array.isArray(project.branches) && project.branches.length > 0
            ? project.branches.map((branch) => String(branch).trim()).filter(Boolean)
            : ["main"]
        }))
    : [];

  merged.gitlab.apiBaseUrl = normalizeApiBaseUrl(merged.gitlab.apiBaseUrl);

  return merged;
}

function resolveToken(config, env = process.env) {
  return resolveTokenInfo(config, env).token;
}

function resolveTokenInfo(config, env = process.env) {
  const configToken = String((config && config.gitlab && config.gitlab.token) || "").trim();
  const envToken = String(env.TOKEN || "").trim();
  const envGitLabToken = String(env.GITLAB_TOKEN || "").trim();

  if (configToken) {
    return { token: configToken, source: "config", hasEnvToken: Boolean(envToken), hasEnvGitLabToken: Boolean(envGitLabToken) };
  }
  if (envToken) {
    return { token: envToken, source: "TOKEN", hasEnvToken: true, hasEnvGitLabToken: Boolean(envGitLabToken) };
  }
  if (envGitLabToken) {
    return { token: envGitLabToken, source: "GITLAB_TOKEN", hasEnvToken: false, hasEnvGitLabToken: true };
  }

  return { token: "", source: "none", hasEnvToken: false, hasEnvGitLabToken: false };
}

async function loadConfig(userDataPath) {
  const filePath = createConfigPath(userDataPath);
  try {
    const content = await fs.readFile(filePath, "utf8");
    return normalizeConfig(JSON.parse(content));
  } catch (error) {
    if (error.code === "ENOENT") {
      return normalizeConfig(DEFAULT_CONFIG);
    }
    throw error;
  }
}

async function saveConfig(userDataPath, config) {
  const filePath = createConfigPath(userDataPath);
  const normalized = normalizeConfig(config);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2));
  return normalized;
}

module.exports = {
  DEFAULT_CONFIG,
  normalizeApiBaseUrl,
  createConfigPath,
  normalizeConfig,
  resolveToken,
  resolveTokenInfo,
  loadConfig,
  saveConfig
};
