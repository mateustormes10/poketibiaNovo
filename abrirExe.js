const { app, BrowserWindow } = require('electron');
const path = require('path');

// Força uso de GPU e ignora blacklist
app.commandLine.appendSwitch('enable-gpu');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('disable-software-rasterizer', 'false');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization,VaapiVideoDecoder');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: path.join(__dirname, 'client', 'assets', 'icon.ico'), // coloque seu ícone aqui
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // mais seguro
      contextIsolation: true, // mais seguro
    },
  });
  win.loadFile(path.join(__dirname, 'client', 'menu.html'));
  // win.setMenu(null); // Remove o menu padrão
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
