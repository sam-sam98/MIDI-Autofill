const { ipcRenderer } = require("electron/renderer")
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

let noteSequence = TWINKLE_TWINKLE

ipcRenderer.once('ready', (_, checkpoints) => {
  let selector = document.getElementById('checkpoint')
  for (let checkpoint of checkpoints) {
    let option = document.createElement("option")
    option.text = checkpoint
    option.value = checkpoint
    selector.add(option)
  }

  document.getElementById('loading').hidden = true
})

let viz = undefined

let player = new core.Player()

document.getElementById('generatebtn').onclick = () => {
  player.stop()
  let selector = document.getElementById('checkpoint')
  let checkpoint = selector.value
  ipcRenderer.invoke('generate', checkpoint, TWINKLE_TWINKLE, 20, 1.5).then((newNotes) => {
    newNotes = core.sequences.unquantizeSequence(newNotes)
    noteSequence = core.sequences.concatenate([noteSequence, newNotes])
    viz = new core.Visualizer(noteSequence, document.getElementById('canvas'))
  })
}

document.getElementById('playbtn').onclick = () => {
  player.start(noteSequence)
}

document.getElementById('resetbtn').onclick = () => {
  player.stop()
  noteSequence = TWINKLE_TWINKLE
  viz = new core.Visualizer(noteSequence, document.getElementById('canvas'))
}

window.onload = function() {
  viz = new core.Visualizer(TWINKLE_TWINKLE, document.getElementById('canvas'))
}
