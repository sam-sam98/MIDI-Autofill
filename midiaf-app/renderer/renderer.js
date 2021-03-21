const { ipcRenderer } = require("electron/renderer")

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

ipcRenderer.once('ready', (_, checkpoints) => {
  let selector = document.getElementById('checkpoint')
  for (let checkpoint of checkpoints) {
    let name = checkpoint.name;
    let option = document.createElement("option")
    option.text = checkpoint
    option.value = checkpoint
    selector.add(option)
  }

  document.getElementById('loading').hidden = true
})

let viz = undefined

document.getElementById('generatebtn').onclick = () => {
  let selector = document.getElementById('checkpoint')
  let checkpoint = selector.value
  ipcRenderer.invoke('generate', checkpoint, TWINKLE_TWINKLE, 20, 1.5).then((newNotes) => {
    newNotes = mm.sequences.unquantizeSequence(newNotes)
    let seq = mm.sequences.concatenate([TWINKLE_TWINKLE, newNotes])
    seq.totalTime = TWINKLE_TWINKLE.totalTime + newNotes.totalTime
    viz = new mm.Visualizer(seq, document.getElementById('canvas'))
  })
}

window.onload = function() {
  viz = new mm.Visualizer(TWINKLE_TWINKLE, document.getElementById('canvas'))
}
