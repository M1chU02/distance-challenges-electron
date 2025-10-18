const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  listChallenges: () => ipcRenderer.invoke("challenges:list"),
  createChallenge: (payload) =>
    ipcRenderer.invoke("challenges:create", payload),
  updateChallenge: (id, patch) =>
    ipcRenderer.invoke("challenges:update", { id, patch }),
  deleteChallenge: (id) => ipcRenderer.invoke("challenges:delete", id),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  onUpdateStatus: (handler) =>
    ipcRenderer.on("update:status", (_e, payload) => handler(payload)),
  addLog: (id, dateISO, km, note) =>
    ipcRenderer.invoke("logs:add", { id, dateISO, km, note }),
  deleteLog: (id, logId) => ipcRenderer.invoke("logs:delete", { id, logId }),
});
