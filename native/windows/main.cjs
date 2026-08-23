const path = require('path');
const { app, BrowserWindow, session, shell } = require('electron');

const APP_URL = 'https://voice-rag-rho.vercel.app';
const NATIVE_USER_AGENT_SUFFIX = 'GoaVoiceNative/Windows';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    autoHideMenuBar: true,
    backgroundColor: '#fff9e9',
    title: 'Goa Voice',
    icon: path.join(__dirname, 'build', 'icon.ico'),
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

  const defaultUserAgent = win.webContents.getUserAgent();
  win.webContents.setUserAgent(`${defaultUserAgent} ${NATIVE_USER_AGENT_SUFFIX}`);
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
