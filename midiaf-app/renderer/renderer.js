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
addMeasures(Math.max(Math.ceil(scroller.offsetWidth / whole), Math.ceil(totalTime * tempo / 60 / 4)))

// add notes to roll
for (var i = 0; i < sequence.length; i++) {
  var newNote = document.createElement('BUTTON')
  newNote.classList.add('note')
  newNote.style.top = (key.offsetHeight + 1) * 23 - (sequence[i].pitch - 60) * (key.offsetHeight + 1) + 1 + 'px'
  newNote.style.left = Math.round(sequence[i].startTime * tempo / 60) * whole / 4 + 'px'
  newNote.style.width = Math.round((sequence[i].endTime - sequence[i].startTime) * tempo / 60) * whole / 4 + 'px'
  roll.appendChild(newNote)
}
let notes = document.getElementsByClassName('note')
let originalSequence = record(notes)

// expand piano roll
expand.onclick = () => {addMeasures(1)}

// save sequence to reset to
document.getElementById('save').onclick = () => {
  originalSequence = record(notes)
  document.getElementById('reset').disabled = true
}

// return piano roll to most recently saved sequence
document.getElementById('reset').onclick = () => {
  undo.push(record(notes))
  document.getElementById('undo').disabled = false
  document.getElementById('reset').disabled = false
  while (undo.length > 10) {
    undo.shift()
  }

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

  vizualize(undo.pop())
  notes = document.getElementsByClassName('note')

  if (undo.length <= 0) {
    document.getElementById('undo').disabled = true
  }
}

// reinstate most recently reverted change to piano roll
document.getElementById('redo').onclick = () => {
  undo.push(record(notes))
  document.getElementById('undo').disabled = false
  document.getElementById('reset').disabled = false
  while (notes.length > 0) {
    notes.item(0).remove()
  }

  vizualize(redo.pop())
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

// add a note to the piano roll
document.getElementById('add').onclick = () => {
  document.getElementById('add').disabled = true
  document.getElementById('delete').disabled = false
  document.getElementById('move').disabled = false
  document.getElementById('stretch').disabled = false

  for (var i = 0; i < notes.length; i++) {
    notes.item(i).onclick = null
  }

  roll.onclick = (e) => {
    e = e || window.event
    e.preventDefault()

    undo.push(record(notes))
    document.getElementById('undo').disabled = false
    document.getElementById('reset').disabled = false
    while (undo.length > 10) {
      undo.shift()
    }

    var newNote = document.createElement('BUTTON')
    newNote.classList.add('note')
    roll.appendChild(newNote)
    newNote.style.width = whole / Math.min(quant, 8) + 'px'
    newNote.style.left = e.clientX - (keys.offsetLeft + keys.offsetWidth - scroller.scrollLeft) + 'px'
    newNote.style.top = e.clientY - keys.offsetTop - newNote.offsetHeight / 2 + 'px'
    newNote.style.left = Math.round(newNote.offsetLeft / (whole / quant)) * whole / quant + 'px'
    newNote.style.top = Math.round(newNote.offsetTop / (key.offsetHeight + 1)) * (key.offsetHeight + 1) + 1 + 'px'

    notes = document.getElementsByClassName('note')
  }
}

document.getElementById('delete').onclick = () => {
  document.getElementById('add').disabled = false
  document.getElementById('delete').disabled = true
  document.getElementById('move').disabled = false
  document.getElementById('stretch').disabled = false
  roll.onclick = null

  for (var i = 0; i < notes.length; i++) {
    deleteElem(notes.item(i))
  }
}

document.getElementById('move').onclick = () => {
  document.getElementById('add').disabled = false
  document.getElementById('delete').disabled = false
  document.getElementById('move').disabled = true
  document.getElementById('stretch').disabled = false
  roll.onclick = null

  for (var i = 0; i < notes.length; i++) {
    dragElem(notes.item(i))
  }
}

document.getElementById('stretch').onclick = () => {
  document.getElementById('add').disabled = false
  document.getElementById('delete').disabled = false
  document.getElementById('move').disabled = false
  document.getElementById('stretch').disabled = true
  roll.onclick = null

  for (var i = 0; i < notes.length; i++) {
    stretchElem(notes.item(i))
  }
}

document.getElementById('quantize').onclick = () => {
  undo.push(record(notes))
  document.getElementById('undo').disabled = false
  document.getElementById('reset').disabled = false
  while (undo.length > 10) {
    undo.shift()
  }

  for (var i = 0; i < notes.length; i++) {
    notes.item(i). style.left = Math.round(notes.item(i).offsetLeft / (whole / quant)) * whole / quant + 'px'
  }
}

document.getElementById('quant').onclick = () => {
  document.getElementById('quants').classList.toggle('show')
}

const quantOpt = document.getElementsByClassName('quant-opt')
for (var i = 0; i < quantOpt.length; i++) {
  selectQuant(quantOpt.item(i))
}

// FUNCTIONS
function addMeasures(n) {
  for (var i = 0; i < n; i++) {
    var newMeasure = document.createElement('DIV')
    newMeasure.style.width = whole - 1 + 'px'
    newMeasure.style.height = keys.offsetHeight + 'px'
    newMeasure.style.left = (measures + i) * whole + 'px'
    newMeasure.classList.add('measure')
    if ((measures + i) % 2 == 0) {
      newMeasure.style.opacity = 0.15
    } else {
      newMeasure.style.opacity = 0.2
    }

    roll.appendChild(newMeasure)

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
  measures += n
  expand.style.left = measures * whole + 'px'
}

// convert sequence to notes on piano roll
function vizualize(noteRecord) {
  for (var i = 0; i < noteRecord.length; i++) {
    var newNote = document.createElement('BUTTON')
    newNote.classList.add('note')
    newNote.style.top = noteRecord[i].offsetTop + 'px'
    newNote.style.left = noteRecord[i].offsetLeft + 'px'
    newNote.style.width = noteRecord[i].offsetWidth + 'px'
    roll.appendChild(newNote)
  }
}

function record(notes) {
  noteRecord = []
  for (var i = 0; i < notes.length; i++) {
    noteRecord.push({offsetTop: notes.item(i).offsetTop, offsetLeft: notes.item(i).offsetLeft, offsetWidth: notes.item(i).offsetWidth})
  }
  return noteRecord
}

// convert piano roll to sequence
function toSequence(notes) {
  sequence = []
  totalTime = 0
  for (var i = 0; i < notes.length; i++) {
    var pitch = 60 + (1 + (key.offsetHeight + 1) * 23 - notes.item(i).offsetTop) / (key.offsetHeight + 1)
    var startTime = notes.item(i).offsetLeft * 4 / whole * 60 / tempo
    var endTime = notes.item(i).offsetWidth * 4 / whole * 60 / tempo + startTime
    if (endTime > totalTime) {
      totalTime = endTime
    }
    sequence.push({pitch: pitch, startTime: startTime, endTime: endTime})
  }
  return sequence
}

// allow for tempor selection by dropdown menu
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
  sequence = toSequence(notes)

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
    osc.frequency.setValueAtTime(Math.pow(2, (sequence[i].pitch - 69) / 12) * 440, 0)
    osc.start(sequence[i].startTime + 1)
    osc.stop(sequence[i].endTime + 1)
    if (sequence[i].endTime === totalTime) {
      osc.onended = () => {
        audio.close()
        document.getElementById('stop').disabled = true
        document.getElementById('play').textContent = 'Play'
        document.getElementById('play').onclick = playMidi
      }
    }
  }
}

function deleteElem(elem) {
  elem.onclick = () => {
    undo.push(record(notes))
    document.getElementById('undo').disabled = false
    document.getElementById('reset').disabled = false
    while (undo.length > 10) {
      undo.shift()
    }
    elem.remove()
  }
}

function dragElem(elem) {
  elem.onmousedown = dragDown

  function dragDown(e) {
    undo.push(record(notes))
    document.getElementById('undo').disabled = false
    document.getElementById('reset').disabled = false
    while (undo.length > 10) {
      undo.shift()
    }

    document.onmousemove = dragMove
    document.onmouseup = dragUp
  }

  function dragMove(e) {
    e = e || window.event
    e.preventDefault()

    elem.style.left = Math.max(0, Math.min(e.clientX - (keys.offsetWidth + keys.offsetLeft - scroller.scrollLeft) - elem.offsetWidth / 2, expand.offsetLeft - elem.offsetWidth)) + 'px'
    elem.style.top = e.clientY - elem.offsetHeight / 2 - scroller.offsetTop + 'px'
  }

  function dragUp(e) {
    document.onmousemove = null
    document.onmouseup = null

    elem.style.left = Math.round(elem.offsetLeft / (whole / quant)) * whole / quant + 'px'
    elem.style.top = Math.round(elem.offsetTop / (key.offsetHeight + 1)) * (key.offsetHeight + 1) + 1 + 'px'
  }
}

function stretchElem(elem) { // click-and-drag version
  let pos = 0, startX = 0, startWidth = 0
  elem.onmousedown = stretchDown

  function stretchDown(e) {
    undo.push(record(notes))
    document.getElementById('undo').disabled = false
    document.getElementById('reset').disabled = false
    while (undo.length > 10) {
      undo.shift()
    }

    startWidth = elem.offsetWidth
    startX = e.clientX

    document.onmousemove = stretchMove
    document.onmouseup = stretchUp
  }

  function stretchMove(e) {
    e = e || window.event
    e.preventDefault()

    pos = e.clientX - startX
    elem.style.width = Math.min(Math.max(whole / quant, startWidth + pos), expand.offsetLeft - elem.offsetLeft) + 'px'
  }

  function stretchUp(e) {
    document.onmousemove = null
    document.onmouseup = null

    elem.style.width = elem.offsetWidth - ((elem.offsetWidth + whole / quant / 2) % (whole / quant)) + whole / quant / 2 + 'px'
  }
}

function selectQuant(elem) {
  elem.onclick = () => {
    if (!elem.textContent.localeCompare('none')) {
      quant = whole
    } else {
      quant = parseInt(elem.textContent.slice(2))
    }
    document.getElementById('quant').textContent = elem.textContent
    document.getElementById('quants').classList.toggle('show')
  }
}
