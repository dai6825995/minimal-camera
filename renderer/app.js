const preview = document.getElementById("preview");
const frame = document.getElementById("frame");
const status = document.getElementById("status");
const closeBtn = document.getElementById("closeBtn");

function notifyReady() {
  if (window.cameraApp && typeof window.cameraApp.ready === "function") {
    window.cameraApp.ready();
  }
}

function showError(message) {
  status.textContent = message;
  frame.classList.remove("is-ready");
  notifyReady();
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showError("当前环境不支持摄像头");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: "user",
      },
    });

    preview.srcObject = stream;
    await preview.play();
    frame.classList.add("is-ready");
    notifyReady();
  } catch (error) {
    if (error && error.name === "NotAllowedError") {
      showError("没有摄像头权限，请在系统设置里允许访问");
      return;
    }
    if (error && error.name === "NotFoundError") {
      showError("没有找到可用的摄像头");
      return;
    }
    showError("无法打开摄像头");
  }
}

closeBtn.addEventListener("click", () => {
  if (window.cameraApp && typeof window.cameraApp.close === "function") {
    window.cameraApp.close();
    return;
  }
  window.close();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeBtn.click();
  }
});

startCamera();
