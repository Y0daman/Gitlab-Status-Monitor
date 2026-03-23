const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("monitorApi", {
  getState: () => ipcRenderer.invoke("monitor:get-state"),
  refresh: () => ipcRenderer.invoke("monitor:refresh"),
  listBranches: (projectId) => ipcRenderer.invoke("monitor:list-branches", projectId),
  getCommitGraph: (payload) => ipcRenderer.invoke("monitor:get-commit-graph", payload),
  setToken: (token) => ipcRenderer.invoke("config:set-token", token),
  setApiBaseUrl: (url) => ipcRenderer.invoke("config:set-api-base", url),
  setPollInterval: (intervalSec) => ipcRenderer.invoke("config:set-poll-interval", intervalSec),
  setLaunchOnStartup: (enabled) => ipcRenderer.invoke("config:set-launch-on-startup", enabled),
  addProject: (payload) => ipcRenderer.invoke("config:add-project", payload),
  setProjectBranches: (payload) => ipcRenderer.invoke("config:set-project-branches", payload),
  removeProject: (projectId) => ipcRenderer.invoke("config:remove-project", projectId),
  onStatusUpdate: (handler) => {
    const listener = (_, payload) => handler(payload);
    ipcRenderer.on("monitor:status-update", listener);
    return () => ipcRenderer.removeListener("monitor:status-update", listener);
  }
});
