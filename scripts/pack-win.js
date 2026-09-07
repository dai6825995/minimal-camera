const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const electronDir = path.join(root, "node_modules", "electron", "dist");
const outDir = path.join(root, "dist", "摄像头");
const appDir = path.join(outDir, "resources", "app");

const appFiles = ["package.json", "main.js", "preload.js"];
const appDirs = ["renderer"];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function emptyDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (!fs.existsSync(path.join(electronDir, "electron.exe"))) {
  throw new Error("未找到 Electron，请先运行 npm install");
}

emptyDir(outDir);
copyRecursive(electronDir, outDir);

const defaultAsar = path.join(outDir, "resources", "default_app.asar");
if (fs.existsSync(defaultAsar)) {
  fs.unlinkSync(defaultAsar);
}

fs.mkdirSync(appDir, { recursive: true });

for (const file of appFiles) {
  copyRecursive(path.join(root, file), path.join(appDir, file));
}

for (const dir of appDirs) {
  copyRecursive(path.join(root, dir), path.join(appDir, dir));
}

const exeSrc = path.join(outDir, "electron.exe");
const exeDest = path.join(outDir, "摄像头.exe");
if (fs.existsSync(exeDest)) {
  fs.unlinkSync(exeDest);
}
fs.renameSync(exeSrc, exeDest);

console.log("已生成: " + exeDest);
