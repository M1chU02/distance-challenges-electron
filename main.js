const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
Menu.setApplicationMenu(null);
const path = require("path");
const Store = require("electron-store");
const { nanoid } = require("nanoid");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

log.transports.file.level = "info";
autoUpdater.logger = log;

const isDev = !app.isPackaged;
const store = new Store({ name: "challenges", defaults: { challenges: [] } });
let mainWindow;

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    icon: path.join(__dirname, "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  win.webContents.on("devtools-opened", () => win.webContents.closeDevTools());
  return win;
}

function initAutoUpdate() {
  if (isDev) return;

  autoUpdater.on("checking-for-update", () =>
    send("update:status", { status: "checking" }),
  );
  autoUpdater.on("update-available", (info) =>
    send("update:status", { status: "available", info }),
  );
  autoUpdater.on("update-not-available", () =>
    send("update:status", { status: "none" }),
  );

  autoUpdater.on("download-progress", (p) =>
    send("update:status", {
      status: "downloading",
      percent: p.percent,
      bps: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total,
    }),
  );

  autoUpdater.on("error", (err) => {
    log.error("autoUpdater error", err);
    send("update:status", {
      status: "error",
      message: String(err.message || err),
    });
  });

  autoUpdater.on("update-downloaded", async (info) => {
    send("update:status", { status: "downloaded", info });
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
      message: `Update ${info?.version || ""} ready`,
      detail: "The app will restart to complete installation.",
    });
    if (response === 0) {
      send("update:status", { status: "restarting" });
      autoUpdater.quitAndInstall();
    }
  });

  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 2500);
}

ipcMain.handle("update:check", async () => {
  if (isDev) return { ok: false, reason: "dev" };
  try {
    const r = await autoUpdater.checkForUpdates();
    return { ok: true, info: r?.updateInfo || null };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

app.whenReady().then(() => {
  mainWindow = createWindow();
  initAutoUpdate();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      initAutoUpdate();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Helper
function listChallenges() {
  return store.get("challenges");
}
function saveChallenges(challenges) {
  store.set("challenges", challenges);
}

ipcMain.handle("challenges:list", () => listChallenges());
ipcMain.handle("challenges:create", (event, payload) => {
  const challenges = listChallenges();
  const now = new Date().toISOString();
  const ch = {
    id: nanoid(),
    name: payload.name || "Untitled",
    sport: payload.sport || "general",
    startDate: payload.startDate,
    endDate: payload.endDate,
    targetDistanceKm: Number(payload.targetDistanceKm) || 0,
    distanceLog: [],
    notes: payload.notes || "",
    createdAt: now,
    updatedAt: now,
  };
  challenges.push(ch);
  saveChallenges(challenges);
  return ch;
});
ipcMain.handle("challenges:update", (event, { id, patch }) => {
  const challenges = listChallenges();
  const idx = challenges.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Challenge not found");
  challenges[idx] = {
    ...challenges[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  saveChallenges(challenges);
  return challenges[idx];
});
ipcMain.handle("challenges:delete", (event, id) => {
  const challenges = listChallenges();
  const filtered = challenges.filter((c) => c.id !== id);
  saveChallenges(filtered);
  return { ok: true };
});
ipcMain.handle("logs:add", (event, { id, dateISO, km, note }) => {
  const challenges = listChallenges();
  const idx = challenges.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Challenge not found");
  const logEntry = {
    id: nanoid(),
    dateISO,
    km: Number(km) || 0,
    note: note || "",
  };
  challenges[idx].distanceLog.push(logEntry);
  challenges[idx].updatedAt = new Date().toISOString();
  saveChallenges(challenges);
  return logEntry;
});
ipcMain.handle("logs:delete", (event, { id, logId }) => {
  const challenges = listChallenges();
  const idx = challenges.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Challenge not found");
  challenges[idx].distanceLog = challenges[idx].distanceLog.filter(
    (l) => l.id !== logId,
  );
  challenges[idx].updatedAt = new Date().toISOString();
  saveChallenges(challenges);
  return { ok: true };
});
