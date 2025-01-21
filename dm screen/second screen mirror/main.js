const { app, BrowserWindow, desktopCapturer, session, screen } = require('electron')
const path = require('path');

const DEBUG = false;
var mousePosInter = 0;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
  })

  mainWindow.loadFile('index.html')
  if (DEBUG) {
    mainWindow.webContents.openDevTools()
  }

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // Grant access to the second screen found.
      callback({ video: sources[DEBUG ? 0 : 1], audio: 'loopback' })
    })
    // the { useSystemPicker: true } option is great, but can get stuck in a state when yuo close the app that MacOS still thinks you are "sharing" the screen
  })

  mousePosInter = setInterval(() => {
    if (mainWindow.isDestroyed()) {
      clearInterval(mousePosInter);
      return;
    }

    const { x, y } = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint({ x, y });

    // On debug we are always on the primary screen
    if (DEBUG ? currentDisplay.id === screen.getPrimaryDisplay().id : currentDisplay.id !== screen.getPrimaryDisplay().id) {
      mainWindow.webContents.send('update-border', true);
    } else {
      mainWindow.webContents.send('update-border', false);
    }
  }, 1000); // Check every second

  mainWindow.on('closed', () => {
    app.quit();
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
