const { app, BrowserWindow, ipcMain, session, screen } = require("electron");
const path = require("path");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu-compositing");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow = null;

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.setAlwaysOnTop(false);
  mainWindow.show();
  mainWindow.setSkipTaskbar(false);
  mainWindow.focus();
}

app.on("second-instance", () => {
  showMainWindow();
});

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
    show: true,
    alwaysOnTop: false,
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

  mainWindow = win;
  win.setSkipTaskbar(false);
  win.setAlwaysOnTop(false);

  const chromeSize = 48;
  const closeHit = 40;
  const flipHitWidth = 36;
  const WM_NCLBUTTONDOWN = 0x00a1;
  const WM_LBUTTONDOWN = 0x0201;
  const WM_LBUTTONUP = 0x0202;
  const WM_RESTORED = 0x8008;

  function pointerInWindowTop() {
    const point = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    if (
      point.y < bounds.y ||
      point.y >= bounds.y + chromeSize
    ) {
      return null;
    }
    return { point: point, bounds: bounds };
  }

  function isPointerInCloseHit() {
    const pos = pointerInWindowTop();
    if (!pos) {
      return false;
    }
    return (
      pos.point.x >= pos.bounds.x + pos.bounds.width - closeHit &&
      pos.point.x < pos.bounds.x + pos.bounds.width
    );
  }

  function isPointerInFlipHit() {
    const pos = pointerInWindowTop();
    if (!pos) {
      return false;
    }
    return (
      pos.point.x >= pos.bounds.x + pos.bounds.width - closeHit - flipHitWidth &&
      pos.point.x < pos.bounds.x + pos.bounds.width - closeHit
    );
  }

  function closeFromCaptionClick() {
    if (win.isDestroyed() || !isPointerInCloseHit()) {
      return false;
    }
    win.close();
    return true;
  }

  function flipFromCaptionClick() {
    if (win.isDestroyed() || !isPointerInFlipHit()) {
      return false;
    }
    if (!win.webContents.isDestroyed()) {
      win.webContents.send("window-flip");
    }
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

    win.hookWindowMessage(WM_NCLBUTTONDOWN, () => {
      return closeFromCaptionClick() || flipFromCaptionClick();
    });
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

    const closeHitNow = inside && isPointerInCloseHit();
    const flipHitNow = inside && isPointerInFlipHit();
    const next = inside + ":" + closeHitNow + ":" + flipHitNow;
    if (next === hovering) {
      return;
    }

    hovering = next;
    if (!win.webContents.isDestroyed()) {
      win.webContents.send("window-hover", {
        inside: inside,
        closeHit: closeHitNow,
        flipHit: flipHitNow,
      });
    }
  }, 40);

  win.on("closed", () => {
    clearInterval(hoverTimer);
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  function showIfNeeded() {
    showMainWindow();
  }

  ipcMain.once("window-ready", showIfNeeded);
  win.once("ready-to-show", showIfNeeded);
  setTimeout(showIfNeeded, 1200);

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  if (!gotLock) {
    return;
  }

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
