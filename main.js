// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
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
    width: 1100,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  // keep DevTools off:
  win.webContents.on("devtools-opened", () => win.webContents.closeDevTools());

  return win;
}

function initAutoUpdate(win) {
  if (isDev) {
    log.info("Skipping autoUpdater in dev mode");
    return;
  }

  // Optional: allow prerelease if you publish pre-releases
  // autoUpdater.allowPrerelease = true;

  // Start a check soon after boot (and then you can schedule more checks if you want)
  setTimeout(() => {
    log.info("Checking for updates...");
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);

  // Show simple status to user
  autoUpdater.on("checking-for-update", () => log.info("Checking for update"));
  autoUpdater.on("update-available", (info) =>
    log.info("Update available", info?.version)
  );
  autoUpdater.on("update-not-available", () => log.info("No update available"));

  autoUpdater.on("download-progress", (p) => {
    // You can surface p.percent to the UI via IPC if you like
    log.info(`Downloading: ${Math.round(p.percent)}%`);
  });

  autoUpdater.on("update-downloaded", async (info) => {
    const { response } = await dialog.showMessageBox(win, {
      type: "question",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
      message: `Update ${info?.version || ""} downloaded`,
      detail: "Restart now to install the update.",
    });
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (err) => log.error("autoUpdater error", err));
}

app.whenReady().then(() => {
  mainWindow = createWindow();
  initAutoUpdate(mainWindow); // <-- NEW
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      initAutoUpdate(mainWindow);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("update:check", async () => {
  if (isDev) return { ok: false, reason: "dev" };
  const r = await autoUpdater.checkForUpdates();
  return { ok: true, info: r?.updateInfo };
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
    (l) => l.id !== logId
  );
  challenges[idx].updatedAt = new Date().toISOString();
  saveChallenges(challenges);
  return { ok: true };
});
