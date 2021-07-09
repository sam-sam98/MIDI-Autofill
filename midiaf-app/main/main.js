const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const af = require('./autofill/autofill')('magenta')
const core = require('@magenta/music/node/core')
const { sequenceProtoToMidi } = require('@magenta/music/node/core')
const fs = require('fs');
const MIDIOutput = require('./midi-output')
const util = require('util');

const SAVE_DATA_DIR = path.join(app.getPath('userData'), 'midiaf')

let win = undefined
let midiOutput = new MIDIOutput(SAVE_DATA_DIR);


function ensureSaveDirExists() {
  if (!fs.existsSync(SAVE_DATA_DIR)) {
    fs.mkdirSync(SAVE_DATA_DIR, { recursive: true })
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  win.loadFile('static/index.html')
  win.webContents.openDevTools()
}

app.whenReady().then(async () => {
  ensureSaveDirExists();
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

  sendTrackList();
})

function sendTrackList() {
  console.log(SAVE_DATA_DIR);
  fs.readdir(SAVE_DATA_DIR, (err, files) => {
    if (err != null) {
      console.error("Received error trying to read track list: ")
      console.error(err)
    }
    else {
      files = files.filter(file => file.endsWith('.mid') || file.endsWith('.midi'))
      // Remove extension from track names
      let tracks = files.map(file => file.replace(/\.[^/.]+$/, ""))
      console.log("Found the following tracks: ", tracks)
      win.webContents.send('receive-track-list', tracks)
    }
  });
}

ipcMain.handle('fetch-track-notes', async (_, track) => {
  // Note: some midi files are '.midi' instead.
  let trackPath = path.join(SAVE_DATA_DIR, track + '.mid')
  let readFile = util.promisify(fs.readFile);

  try {
    let data = await readFile(trackPath)
    let noteSequence = core.midiToSequenceProto(data)
    return noteSequence;
  } catch(error) {
      console.log("Error occurred while reading midi file ", trackPath, ":");
      console.log(error);
      return null;
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function getTrackPath(trackName) {
  return path.join(SAVE_DATA_DIR, trackName + '.mid')
}

ipcMain.handle('generate', async (_, checkpointName, noteSequence, steps, temperature) => {
  // let qns = core.sequences.quantizeNoteSequence(noteSequence, 4)
  let checkpoint = af.checkpoints.find(check => check.name == checkpointName)
  return await af.autofill(checkpoint, noteSequence, steps, temperature)
})

ipcMain.handle('save', async (_, noteSequence, name) => {
  const midiData = sequenceProtoToMidi(noteSequence)

  // Create the save data folder if it doesn't already exist
  try {
    fs.mkdirSync(SAVE_DATA_DIR)
  } catch (err) { }

  const midiFilePath = path.join(SAVE_DATA_DIR, name + '.mid')

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

ipcMain.handle('rename-track', async (_, oldName, newName) => {
  const oldFilePath = getTrackPath(oldName)
  const newFilePath = getTrackPath(newName)
  try {
    fs.renameSync(oldFilePath, newFilePath)
  } catch (error) {
    return error;
  }
  return null;
})

ipcMain.handle('create-new-track', async (event, trackName) => {
  let writeFile = util.promisify(fs.writeFile);

  let trackPath = getTrackPath(trackName)
  let emptyTrack = {
    notes: [],
    totalTime: 0.0,
  }
  try {
    let emptyMidiData = core.sequenceProtoToMidi(emptyTrack)
    await writeFile(trackPath, emptyMidiData)
  } catch(error) {
    return error
  }

  return null
})

ipcMain.handle('midi-out-note-on', async (_, pitch, velocity) => {
  midiOutput.sendNoteOn(pitch, velocity)
})

ipcMain.handle('midi-out-note-off', async (_, pitch, velocity) => {
  midiOutput.sendNoteOff(pitch, velocity)
})