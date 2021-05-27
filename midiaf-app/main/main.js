const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const af = require('./autofill/autofill')('magenta')
const core = require('@magenta/music/node/core')
const { sequenceProtoToMidi } = require('@magenta/music/node/core')
const fs = require('fs');

let win = undefined

function createWindow() {
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

ipcMain.handle('save', async (_, noteSequence, name) => {
  const midiData = sequenceProtoToMidi(noteSequence)

  // Create the save data folder if it doesn't already exist
  const saveDataDir = path.join(app.getPath('userData'), 'midiaf')

  try {
    fs.mkdirSync(saveDataDir)
  } catch (err) { }

  const midiFilePath = path.join(saveDataDir, name + '.midi')

  try {
    fs.writeFileSync(midiFilePath, midiData)
    return {
      success: true,
    }
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: err,
    }
  }
})