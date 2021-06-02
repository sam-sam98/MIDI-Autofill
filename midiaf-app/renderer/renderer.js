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

let noteSequence = originalSequence

ipcRenderer.once('ready', (_, checkpoints) => {
  let selector = document.getElementById('checkpoint')
  for (let checkpoint of checkpoints) {
    let option = document.createElement("option")
    option.text = checkpoint
    option.value = checkpoint
    selector.add(option)
  }

})

const roll = document.getElementById('roll')
const scroll = document.getElementById('scroll')
const keys = document.getElementById('keys')
const key = {offsetWidth: 40, offsetHeight: 10}

const octaves = 2
const whole = 128
let quant = whole
let tempo = 120
let measures = 0

roll.style.width = window.innerWidth - keys.offsetWidth - keys.offsetLeft * 2 + 'px' // resize roll to fit screen
// Default number of measures is the max betweeh the minimum number of measures in the MIDI and the minimum number
// of measures required to fill the piano roll
measures = Math.max(Math.ceil(roll.offsetWidth / whole), Math.ceil(originalSequence.totalTime * tempo / 60 / 4))

// populate roll with measures of alternating opacity
for (var i = 0; i < 10; i++) {
  var newMeasure = document.createElement('DIV')
  newMeasure.classList.add('measure')
  newMeasure.style.left = i * whole + 'px'
  if (i % 2 == 0) {
    newMeasure.style.opacity = 0.15
  } else {
    newMeasure.style.opacity = 0.2
  }

  grid.appendChild(newMeasure)

  for (var j = 0; j < octaves; j++) {
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('wht')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('blk')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('wht')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('blk')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('wht')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('blk')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
    for (var k = 0; k < 8; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('wht')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('blk')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('wht')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('blk')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.classList.add('wht')
      newCell.style.width = whole / 4 - 1 + 'px'
      newMeasure.appendChild(newCell)
    }
  }
}
