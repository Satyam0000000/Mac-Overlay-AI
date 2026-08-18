const { app, BrowserWindow, globalShortcut, ipcMain, Menu, safeStorage } = require('electron');
const OpenAI = require('openai');
const fs = require('node:fs');
const path = require('node:path');

let win;

// The encrypted file is only readable by this macOS user account when
// Electron's safeStorage backend is available (Keychain on macOS).
function keyFile() {
  return path.join(app.getPath('userData'), 'openai-key.bin');
}

function saveApiKey(apiKey) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('macOS Keychain encryption is unavailable; the key was not saved.');
  }
  fs.writeFileSync(keyFile(), safeStorage.encryptString(apiKey), { mode: 0o600 });
}

function getApiKey() {
  if (!fs.existsSync(keyFile())) return null;
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('macOS Keychain encryption is unavailable; cannot read the saved key.');
  }
  return safeStorage.decryptString(fs.readFileSync(keyFile()));
}

function createWindow() {
  win = new BrowserWindow({
    width: 430,
    height: 610,
    minWidth: 350,
    minHeight: 420,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    alwaysOnTop: true,
    focusable: true,          // Ensures proper keyboard focus and typing on macOS
    acceptFirstMouse: true,   // Allows immediate interaction on click
    type: 'panel',          // macOS-specific window type for overlay behavior
    
    // CRITICAL FIX 1: Activates operating system hardware-level window concealment
    contentProtection: true,  

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'status');
  win.loadFile('index.html');
}

// A native macOS application menu is required for normal text-editing command
// routing in a packaged app. The Edit selectors make both typing and standard
// clipboard shortcuts work correctly in renderer input elements.
function installMacMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  // Accessory apps run without a Dock icon and keep their process alive when
  // the overlay is hidden. Alt+L is the normal way to bring it back.
  app.setActivationPolicy('accessory');
  installMacMenu();
  createWindow();

  // Updated to include the robustness shortcut configuration requested while keeping Alt+L
  globalShortcut.register('CommandOrControl+Shift+K', () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
      win.webContents.focus();
    }
  });

  globalShortcut.register('Alt+L', () => {
    if (win.isVisible()) win.hide();
    else {
      win.show();
      win.focus();
      win.webContents.focus();
    }
  });

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('will-quit', () => globalShortcut.unregisterAll());

ipcMain.handle('key:status', () => Boolean(getApiKey()));
ipcMain.handle('key:save', (_event, value) => {
  const apiKey = String(value || '').trim();
  if (!apiKey.startsWith('sk-')) throw new Error('Enter a valid OpenAI API key.');
  saveApiKey(apiKey);
  return true;
});

ipcMain.handle('chat:send', async (_event, { text, imageDataUrl, history }) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Save an OpenAI API key in Settings first.');

  // A string is valid content for both user and assistant history entries.
  // This avoids sending `input_text` (a user-input type) inside an assistant
  // message, which the Responses API correctly rejects.
  const input = (history || []).map(({ role, text: messageText }) => ({
    role,
    content: messageText
  }));
  const content = [{ type: 'input_text', text: String(text || '') }];
  if (imageDataUrl) content.push({ type: 'input_image', image_url: imageDataUrl, detail: 'auto' });
  input.push({ role: 'user', content });

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({ model: 'o3', input });
  return response.output_text || 'No text response returned.';
});