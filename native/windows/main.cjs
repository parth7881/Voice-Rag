const { app, BrowserWindow, session, shell } = require('electron');

const APP_URL = 'https://voice-rag-rho.vercel.app';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    autoHideMenuBar: true,
    backgroundColor: '#fff9e9',
    title: 'Goa Voice',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const origin = new URL(webContents.getURL()).origin;
    const trusted = origin === 'https://voice-rag-rho.vercel.app';
    callback(trusted && ['media', 'microphone'].includes(permission));
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
