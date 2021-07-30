const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

const af = [
  require('./autofill/autofill')('magenta'),
  require('./autofill/autofill')('midi-autofill'),
]

const core = require('@magenta/music/node/core')
const { sequenceProtoToMidi } = require('@magenta/music/node/core')
const fs = require('fs');
const MIDIOutput = require('./midi-output')
const MIDIInput = require('./midi-input')
const util = require('util')
const gpio = require('./gpio')

const SAVE_DATA_DIR = path.join(app.getPath('userData'), 'midiaf')

let win = undefined
let midiOutput = new MIDIOutput(SAVE_DATA_DIR);
let midiInput = new MIDIInput();


function ensureSaveDirExists() {
  if (!fs.existsSync(SAVE_DATA_DIR)) {
    fs.mkdirSync(SAVE_DATA_DIR, { recursive: true })
  }
}

function keyCallback(status, pitch, velocity) {
  win.webContents.send('keyboard-input', status, pitch, velocity)
}

let RAW_VOLUME_MAX = 700
let lastVolumeVal = (Math.floor(RAW_VOLUME_MAX/10));

function volumeCallback(volume) {
  if (Math.floor(lastVolumeVal) != Math.floor(volume / 10)) {
    lastVolumeVal = Math.floor(volume / 10);
    let normalizedVolume = Math.min(volume / (RAW_VOLUME_MAX/10) / 10, 1.0);
    console.log(`Sending volume value of ${normalizedVolume} to the UI`)
    win.webContents.send('volume', normalizedVolume)
  }
}

const BUTTON_THRESHOLD_DELTA_TIME = 0.5
let lastPlayButtonTime = 0;
let lastOctaveUpTime = 0;
let lastOctaveDownTime = 0;
let lastRecordButtonTIme = 0;

const gpioCallbacks = {
  record: () => {
    let currentTimeSeconds = new Date() / 1000;
    if (currentTimeSeconds - lastRecordButtonTIme < BUTTON_THRESHOLD_DELTA_TIME) {
      return;
    }

    lastRecordButtonTIme = currentTimeSeconds
    win.webContents.send('record')
  },
  octaveUp: () => {
    let currentTimeSeconds = new Date() / 1000;
    if (currentTimeSeconds - lastOctaveUpTime < BUTTON_THRESHOLD_DELTA_TIME) {
      return;
    }
    
    lastOctaveUpTime = currentTimeSeconds
    win.webContents.send('octave-up')
  },
  octaveDown: () => {
    let currentTimeSeconds = new Date() / 1000;
    if (currentTimeSeconds - lastOctaveDownTime < BUTTON_THRESHOLD_DELTA_TIME) {
      return;
    }
    
    lastOctaveDownTime = currentTimeSeconds
    win.webContents.send('octave-down')
  },
  play: () => {
    let currentTimeSeconds = new Date() / 1000;
    if (currentTimeSeconds - lastPlayButtonTime < BUTTON_THRESHOLD_DELTA_TIME) {
      return;
    }

    lastPlayButtonTime = currentTimeSeconds
    win.webContents.send('play')
  },
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  try {
    await midiOutput.initialize()
    await midiInput.initialize(keyCallback, volumeCallback)
    await gpio.initialize(gpioCallbacks)
  } catch (error) {
    console.error(error);
  }
  win.webContents.on('before-input-event', (event, input) => {
    let pitch = null
    let status = null
    let velocity = 127

    if (input.isAutoRepeat) {
      return
    }

    if (input.type == 'keyDown') {
      status = 'ON'
    } else if (input.type == 'keyUp') {
      status = 'OFF'
    } else {
      return
    }

    switch (input.key.toLowerCase()) {
      case 'a':
        pitch = 0
        break;
      case 's':
        pitch = 1
        break;
      case 'd':
        pitch = 2
        break;
      case 'f':
        pitch = 3
        break;
      case 'g':
        pitch = 4
        break;
      case 'h':
        pitch = 5
        break;
      case 'j':
        pitch = 6
        break;
      case 'p':
        if  (input.type == 'keyUp')
        {
          win.webContents.send('play')
        }
        return
      case 'r':
        if  (input.type == 'keyUp')
        {
          win.webContents.send('record')
        }
        return
      case 'i':
        if  (input.type == 'keyUp')
        {
          if (win.webContents.isDevToolsOpened()) {
            win.webContents.closeDevTools()
          } else {
            win.webContents.openDevTools()
          }
        }
        return
    }

    if (pitch != null && status != null) {
      console.log(`Sending over ${status} ${pitch} ${velocity}`)
      win.webContents.send('keyboard-input', status, pitch, velocity)
    }
  })

  win.removeMenu()

  win.loadFile('static/index.html')
}

app.whenReady().then(async () => {
  ensureSaveDirExists();
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  for (let backend of af)
  {
    // TODO: Slow. Should all happen simultaneously.
    await backend.initialize()
  }

  let checkpoints = af.flatMap(backend => backend.checkpoints.map((checkpoint) => checkpoint.name))
  console.log(checkpoints)

  await new Promise(resolve => setTimeout(resolve, 5000));
  
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
  for (let backend of af)
  {
    let checkpoint = backend.checkpoints.find(check => check.name == checkpointName)
    if (checkpoint != null) {
      return await backend.autofill(checkpoint, noteSequence, steps, temperature)
    }
  }
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
