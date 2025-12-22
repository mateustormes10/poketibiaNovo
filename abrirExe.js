const { app, BrowserWindow } = require('electron');
const path = require('path');
//abre mas da erro no mapa precisa colocar a pasta assets dentro da pasta client 
function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadFile('./client/menu.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
