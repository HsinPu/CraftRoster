const {app, BrowserWindow, Menu} = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({width: 720, height: 480,
    webPreferences: {nodeIntegration: false, contextIsolation: true}});
  win.loadFile('settings.html');
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label: 'Edit', submenu: [{label: 'Copy', accelerator: 'CmdOrCtrl+C', click() {
      win.webContents.send('copy-profile');
    }}]}
  ]));
});
