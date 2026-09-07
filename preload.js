const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cameraApp", {
  close: () => ipcRenderer.send("window-close"),
  ready: () => ipcRenderer.send("window-ready"),
  onHover: (callback) => {
    ipcRenderer.on("window-hover", (_event, state) => {
      callback(state);
    });
  },
});
