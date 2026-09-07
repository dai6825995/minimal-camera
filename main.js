const { app, BrowserWindow, ipcMain, session, screen } = require("electron");
const path = require("path");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu-compositing");

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
    thickFrame: true,
    hasShadow: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  win.setSkipTaskbar(false);

  const closeHit = 48;
  const WM_NCLBUTTONDOWN = 0x00a1;
  const WM_LBUTTONDOWN = 0x0201;
  const WM_LBUTTONUP = 0x0202;
  const WM_RESTORED = 0x8008;

  function isPointerInCloseHit() {
    const point = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    return (
      point.x >= bounds.x + bounds.width - closeHit &&
      point.x < bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y < bounds.y + closeHit
    );
  }

  function closeFromCaptionClick() {
    if (win.isDestroyed() || !isPointerInCloseHit()) {
      return false;
    }
    win.close();
    return true;
  }

  function bindCloseHooks() {
    if (win.isDestroyed()) {
      return;
    }

    try {
      win.unhookWindowMessage(WM_NCLBUTTONDOWN);
      win.unhookWindowMessage(WM_LBUTTONDOWN);
      win.unhookWindowMessage(WM_LBUTTONUP);
      win.unhookWindowMessage(WM_RESTORED);
    } catch (_error) {
    }

    win.hookWindowMessage(WM_NCLBUTTONDOWN, () => closeFromCaptionClick());
    win.hookWindowMessage(WM_LBUTTONDOWN, () => closeFromCaptionClick());
    win.hookWindowMessage(WM_LBUTTONUP, () => closeFromCaptionClick());
    win.hookWindowMessage(WM_RESTORED, () => {
      bindCloseHooks();
      return false;
    });
  }

  bindCloseHooks();
  win.on("show", bindCloseHooks);
  win.on("restore", bindCloseHooks);
  win.on("focus", bindCloseHooks);

  let hovering = false;
  const hoverTimer = setInterval(() => {
    if (win.isDestroyed()) {
      clearInterval(hoverTimer);
      return;
    }

    const point = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    const inside =
      win.isVisible() &&
      !win.isMinimized() &&
      point.x >= bounds.x &&
      point.y >= bounds.y &&
      point.x < bounds.x + bounds.width &&
      point.y < bounds.y + bounds.height;

    const closeHit = inside && isPointerInCloseHit();
    const next = inside + ":" + closeHit;
    if (next === hovering) {
      return;
    }

    hovering = next;
    if (!win.webContents.isDestroyed()) {
      win.webContents.send("window-hover", { inside: inside, closeHit: closeHit });
    }
  }, 40);

  win.on("closed", () => {
    clearInterval(hoverTimer);
  });

  function showMainWindow() {
    if (win.isDestroyed() || win.isVisible()) {
      return;
    }
    win.setBounds({ x: x, y: y, width: width, height: height });
    win.show();
    win.setSkipTaskbar(false);
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
