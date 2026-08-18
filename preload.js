const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlay', {
  keyStatus: () => ipcRenderer.invoke('key:status'),
  saveKey: (key) => ipcRenderer.invoke('key:save', key),
  sendChat: (payload) => ipcRenderer.invoke('chat:send', payload)
});
