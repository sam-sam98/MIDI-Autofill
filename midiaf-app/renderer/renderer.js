const { ipcRenderer } = require("electron/renderer")
const core = require('@magenta/music/node/core')

TWINKLE_TWINKLE = {
  notes: [
    { pitch: 60, startTime: 0.0, endTime: 0.5 },
    { pitch: 60, startTime: 0.5, endTime: 1.0 },
    { pitch: 67, startTime: 1.0, endTime: 1.5 },
    { pitch: 67, startTime: 1.5, endTime: 2.0 },
    { pitch: 69, startTime: 2.0, endTime: 2.5 },
    { pitch: 69, startTime: 2.5, endTime: 3.0 },
    { pitch: 67, startTime: 3.0, endTime: 4.0 },
    { pitch: 65, startTime: 4.0, endTime: 4.5 },
    { pitch: 65, startTime: 4.5, endTime: 5.0 },
    { pitch: 64, startTime: 5.0, endTime: 5.5 },
    { pitch: 64, startTime: 5.5, endTime: 6.0 },
    { pitch: 62, startTime: 6.0, endTime: 6.5 },
    { pitch: 62, startTime: 6.5, endTime: 7.0 },
    { pitch: 60, startTime: 7.0, endTime: 8.0 },
  ],
  totalTime: 8
};

// The starting melody. This starts as twinkle twinkle, but
// can be changed to a user uploaded MIDI.
let originalSequence = TWINKLE_TWINKLE

ipcRenderer.once('ready', (_, checkpoints) => {
  let selector = document.getElementById('checkpoint')
  for (let checkpoint of checkpoints) {
    let option = document.createElement("option")
    option.text = checkpoint
    option.value = checkpoint
    selector.add(option)
  }

})

// establish reference values
const whole = 128
let sequence = TWINKLE_TWINKLE.notes
let totalTime = TWINKLE_TWINKLE.totalTime
let measures = 0
let quant = whole
let tempo = 120
let undo = []
let redo = []

const key = {offsetHeight: 10}
const keys = document.getElementById('keys')
const roll = document.getElementById('roll')
const scroller = document.getElementById('scroller')
const expand = document.getElementById('expand')

const tempoOpt = document.getElementsByClassName('tempo-opt')
for (var i = 0; i < tempoOpt.length; i++) {
  selectTempo(tempoOpt.item(i))
}

document.getElementById('reset').disabled = true
document.getElementById('undo').disabled = true
document.getElementById('redo').disabled = true
document.getElementById('stop').disabled = true

// flexible dimensions
keys.style.height = (key.offsetHeight + 1) * 24 - 1 +'px'
roll.style.height = keys.offsetHeight + 'px'
scroller.style.height = (key.offsetHeight + 1) * 24 + 18 + 'px'
scroller.style.width = window.innerWidth - keys.offsetWidth - keys.offsetLeft * 2 + 'px'

// fill piano roll with grid
measures = Math.max(Math.ceil(scroller.offsetWidth / whole), Math.ceil(totalTime * tempo / 60 / 4))

for (var i = 0; i < measures; i++) {
  var newMeasure = document.createElement('DIV')
  newMeasure.style.width = whole - 1 + 'px'
  newMeasure.style.height = keys.offsetHeight + 'px'
  newMeasure.style.left = i * whole + 'px'
  newMeasure.classList.add('measure')
  if (i % 2 == 0) {
    newMeasure.style.opacity = 0.15
  } else {
    newMeasure.style.opacity = 0.2
  }

  grid.appendChild(newMeasure)

  for (var j = 0; j < 2; j++) {
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('blk')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('blk')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('blk')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 8; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('blk')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('blk')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }
  }
}

expand.style.left = measures * whole + 'px'

// add notes to roll
vizualize(sequence)
let notes = document.getElementsByClassName('note')

// expand piano roll
expand.onclick = () => {
  var newMeasure = document.createElement('DIV')
  newMeasure.style.width = whole - 1 + 'px'
  newMeasure.style.height = keys.offsetHeight + 'px'
  newMeasure.style.left = measures * whole + 'px'
  newMeasure.classList.add('measure')
  if (measures % 2 == 0) {
    newMeasure.style.opacity = 0.15
  } else {
    newMeasure.style.opacity = 0.2
  }

  grid.appendChild(newMeasure)

  for (j = 0; j < 2; j++) {
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight - 1 + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('blk')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('blk')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('blk')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 8; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('blk')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('blk')
      newMeasure.appendChild(newCell)
    }

    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newMeasure.appendChild(newCell)
    }
  }
  expand.style.left = ++measures * whole + 'px'
}

// save sequence to reset to
document.getElementById('save').onclick = () => {
  originalSequence = record(notes)
  document.getElementById('reset').disabled = true
}

// return piano roll to most recently saved sequence
document.getElementById('reset').onclick = () => {
  while (notes.length > 0) {
    notes.item(0).remove()
  }
  vizualize(originalSequence)
  notes = document.getElementsByClassName('note')
}

// revert most recent change to piano roll
document.getElementById('undo').onclick = () => {
  document.getElementById('redo').disabled = false
  document.getElementById('reset').disabled = false
  redo.push(record(notes))

  while (notes.length > 0) {
    notes.item(0).remove()
  }

  sequence = undo.pop()
  vizualize(sequence)
  notes = document.getElementsByClassName('note')

  if (undo.length <= 0) {
    document.getElementById('undo').disabled = true
  }
}

// reinstate most recently reverted change to piano roll
document.getElementById('redo').onclick = () => {
  document.getElementById('undo').disabled = false
  undo.push(record(notes))

  while (notes.length > 0) {
    notes.item(0).remove()
  }

  sequence = redo.pop()
  vizualize(sequence)
  notes = document.getElementsByClassName('note')

  if (redo.length <= 0) {
    document.getElementById('redo').disabled = true
  }
}

// decrease the tempo by 1 bpm (minimum 30 bpm)
document.getElementById('tempo-down').onclick = () => {
  tempo = Math.max(30, tempo - 1)
  document.getElementById('tempo').textContent = tempo
}

// select tempo from dropdowm menu
document.getElementById('tempo').onclick = () => {
  document.getElementById('tempos').classList.toggle('show')
}

// increase tempo by 1 bpm (maximum 300 bpm)
document.getElementById('tempo-up').onclick = () => {
  tempo = Math.min(300, tempo + 1)
  document.getElementById('tempo').textContent = tempo
}

// play midi seuqence
document.getElementById('play').onclick = playMidi

document.getElementById
// FUNCTIONS
function vizualize(sequence) {
  for (var i = 0; i < sequence.length; i++) {
    var newNote = document.createElement('BUTTON')
    newNote.classList.add('note')
    newNote.style.top = (key.offsetHeight + 1) * 23 - (sequence[i].pitch - 60) * (key.offsetHeight + 1) + 1 + 'px'
    newNote.style.left = Math.round(sequence[i].startTime * tempo / 60) * whole / 4 + 'px'
    newNote.style.width = Math.round((sequence[i].endTime - sequence[i].startTime) * tempo / 60) * whole / 4 + 'px'
    roll.appendChild(newNote)
  }
}

function record(notes) {
  sequence = []
  for (var i = 0; i < notes.length; i++) {
    var pitch = 60 + (1 + (key.offsetHeight + 1) * 23 - notes.item(i).offsetTop) / (key.offsetHeight + 1)
    var startTime = notes.item(i).offsetLeft * 4 / whole * 60 / tempo
    var endTime = notes.item(i).offsetWidth * 4 / whole * 60 / tempo + startTime

    sequence.push({pitch: pitch, startTime: startTime, endTime: endTime})
  }
  return sequence
}

function selectTempo(elem) {
  elem.onclick = () => {
    tempo = parseInt(elem.textContent)
    document.getElementById('tempo').textContent = tempo
    document.getElementById('tempos').classList.toggle('show')
  }
}

// play midi sequence
function playMidi(e) {
  // read notes into sequence based on position and dimensions
  playseq = record(notes)

  // translate sequence into audio
  var audio = new (window.AudioContext || window.webkitAudioContext)()
  var gain = audio.createGain()
  gain.connect(audio.destination)
  gain.gain.setValueAtTime(0.02, audio.currentTime)
  document.getElementById('stop').disabled = false
  document.getElementById('play').textContent = 'Pause'
  document.getElementById('play').onclick = () => {
    if(audio.state === 'running') {
      audio.suspend().then(function() {
        document.getElementById('play').textContent = 'Play'
      })
    } else if(audio.state === 'suspended') {
      audio.resume().then(function() {
        document.getElementById('play').textContent = 'Pause'
      })
    }
  }
  document.getElementById('stop').onclick = () => {
    audio.close()
    document.getElementById('stop').disabled = true
    document.getElementById('play').textContent = 'Play'
    document.getElementById('play').onclick = playMidi
  }
  for (var i = 0; i < notes.length; i++) {
    var osc = audio.createOscillator()
    osc.type = 'square'
    osc.connect(gain)
    osc.frequency.setValueAtTime(Math.pow(2, (playseq[i].pitch - 69) / 12) * 440, 0)
    osc.start(playseq[i].startTime + 1)
    osc.stop(playseq[i].endTime + 1)
    if (playseq[i].endTime === totalTime) {
      osc.onended = () => {
        audio.close()
        document.getElementById('stop').disabled = true
        document.getElementById('play').textContent = 'Play'
        document.getElementById('play').onclick = playMidi
      }
    }
  }
}
