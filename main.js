const { app, BrowserWindow, ipcMain, session, screen } = require("electron");
const path = require("path");

function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  const width = 360;
  const height = 202;
  const x = Math.round(area.x + (area.width - width) / 2);
  const y = Math.round(area.y + (area.height - height) / 2);

  const win = new BrowserWindow({
    x: x,
    y: y,
    width: width,
    height: height,
    minWidth: 360,
    minHeight: 202,
    show: false,
    backgroundColor: "#111111",
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  function showMainWindow() {
    if (win.isDestroyed() || win.isVisible()) {
      return;
    }
    win.setBounds({ x: x, y: y, width: width, height: height });
    win.show();
  }

  ipcMain.once("window-ready", showMainWindow);
  setTimeout(showMainWindow, 8000);

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === "media");
  });

  ipcMain.on("window-close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.close();
    }
  });

  createWindow();
});


app.on("window-all-closed", () => {
  app.quit();
});
