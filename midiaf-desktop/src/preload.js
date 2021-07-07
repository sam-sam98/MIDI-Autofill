import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  send: (channel, ...args) => {
    ipcRenderer.send(channel, ...args);
  },
  on: (channel, func) => {
    ipcRenderer.on(channel, func);
  },
});
