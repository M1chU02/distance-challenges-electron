// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { nanoid } = require('nanoid');

const isDev = !app.isPackaged;
const store = new Store({ name: 'challenges', defaults: { challenges: [] } });

function createWindow () {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Helper
function listChallenges() {
  return store.get('challenges');
}
function saveChallenges(challenges) {
  store.set('challenges', challenges);
}

// IPC handlers
ipcMain.handle('challenges:list', () => {
  return listChallenges();
});

ipcMain.handle('challenges:create', (event, payload) => {
  const challenges = listChallenges();
  const now = new Date().toISOString();
  const ch = {
    id: nanoid(),
    name: payload.name || 'Untitled',
    sport: payload.sport || 'general',
    startDate: payload.startDate,
    endDate: payload.endDate,
    targetDistanceKm: Number(payload.targetDistanceKm) || 0,
    distanceLog: [],
    notes: payload.notes || '',
    createdAt: now,
    updatedAt: now
  };
  challenges.push(ch);
  saveChallenges(challenges);
  return ch;
});

ipcMain.handle('challenges:update', (event, { id, patch }) => {
  const challenges = listChallenges();
  const idx = challenges.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Challenge not found');
  challenges[idx] = { ...challenges[idx], ...patch, updatedAt: new Date().toISOString() };
  saveChallenges(challenges);
  return challenges[idx];
});

ipcMain.handle('challenges:delete', (event, id) => {
  const challenges = listChallenges();
  const filtered = challenges.filter(c => c.id !== id);
  saveChallenges(filtered);
  return { ok: true };
});

ipcMain.handle('logs:add', (event, { id, dateISO, km, note }) => {
  const challenges = listChallenges();
  const idx = challenges.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Challenge not found');
  const logEntry = { id: nanoid(), dateISO, km: Number(km) || 0, note: note || '' };
  challenges[idx].distanceLog.push(logEntry);
  challenges[idx].updatedAt = new Date().toISOString();
  saveChallenges(challenges);
  return logEntry;
});

ipcMain.handle('logs:delete', (event, { id, logId }) => {
  const challenges = listChallenges();
  const idx = challenges.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Challenge not found');
  challenges[idx].distanceLog = challenges[idx].distanceLog.filter(l => l.id !== logId);
  challenges[idx].updatedAt = new Date().toISOString();
  saveChallenges(challenges);
  return { ok: true };
});
