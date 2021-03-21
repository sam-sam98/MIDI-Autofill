require('@tensorflow/tfjs-node')
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const af = require('./autofill/autofill')('magenta')
const core = require('@magenta/music/node/core')

TWINKLE_TWINKLE = {
  notes: [
    {pitch: 60, startTime: 0.0, endTime: 0.5},
    {pitch: 60, startTime: 0.5, endTime: 1.0},
    {pitch: 67, startTime: 1.0, endTime: 1.5},
    {pitch: 67, startTime: 1.5, endTime: 2.0},
    {pitch: 69, startTime: 2.0, endTime: 2.5},
    {pitch: 69, startTime: 2.5, endTime: 3.0},
    {pitch: 67, startTime: 3.0, endTime: 4.0},
    {pitch: 65, startTime: 4.0, endTime: 4.5},
    {pitch: 65, startTime: 4.5, endTime: 5.0},
    {pitch: 64, startTime: 5.0, endTime: 5.5},
    {pitch: 64, startTime: 5.5, endTime: 6.0},
    {pitch: 62, startTime: 6.0, endTime: 6.5},
    {pitch: 62, startTime: 6.5, endTime: 7.0},
    {pitch: 60, startTime: 7.0, endTime: 8.0},
  ],
  totalTime: 8
};

let win = undefined

function createWindow () {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  win.loadFile('static/index.html')
}

app.whenReady().then(async () => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  await af.initialize()
  let checkpoints = af.checkpoints.map((checkpoint) => checkpoint.name)
  console.log(checkpoints)
  win.webContents.send('ready', checkpoints)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('generate', async (_, checkpointName, noteSequence, steps, temperature) => {
  let qns = core.sequences.quantizeNoteSequence(noteSequence, 4)
  let checkpoint = af.checkpoints.find(check => check.name == checkpointName)
  return await af.autofill(checkpoint, qns, steps, temperature)
})
