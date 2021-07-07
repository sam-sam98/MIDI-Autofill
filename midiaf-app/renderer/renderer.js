const { ipcRenderer } = require("electron/renderer")
const core = require('@magenta/music/node/core');
const { ipcMain } = require("electron");

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
const whole = 256
let sequence = TWINKLE_TWINKLE.notes
let totalTime = TWINKLE_TWINKLE.totalTime
let measures = 0
let quant = whole
let tempo = 120
let undo = []
let redo = []
let metronome = true
let markerInterval = null
let interval = 0

const key = { offsetHeight: document.getElementById('key-sample').offsetHeight }
const keys = document.getElementById('keys')
const roll = document.getElementById('roll')
const marker = document.getElementById('marker')
const vert = document.getElementById('vert-scroller')
const scroller = document.getElementById('scroller')
const expand = document.getElementById('expand')
const resetBtn = document.getElementById('reset')
const undoBtn = document.getElementById('undo')
const redoBtn = document.getElementById('redo')
const tempoBtn = document.getElementById('tempo')
const playBtn = document.getElementById('play')
const stopBtn = document.getElementById('stop')
const addBtn = document.getElementById('add')
const deleteBtn = document.getElementById('delete')
const moveBtn = document.getElementById('move')
const stretchBtn = document.getElementById('stretch')
const timebar = document.getElementById('time-bar')
const spacer = document.getElementById('spacer')
const seeker = document.getElementById('seeker')

resetBtn.disabled = true
undoBtn.disabled = true
redoBtn.disabled = true
// flexible dimensions
keys.style.height = (key.offsetHeight + 1) * 53 - 1 + 'px'
roll.style.height = keys.style.height
marker.style.height = roll.style.height
vert.style.height = (key.offsetHeight + 1) * 29 - 1 + 'px'
vert.scrollTop = (key.offsetHeight + 1) * 12
scroller.style.height = vert.style.height
scroller.style.width = window.innerWidth - keys.offsetWidth - keys.offsetLeft * 2 + 'px'
scroller.scrollTop = vert.scrollTop
expand.style.height = keys.style.height
timebar.style.height = key.offsetHeight + 'px'
timebar.style.width = scroller.style.width
timebar.style['margin-left'] = keys.offsetWidth + 2 + 'px'
spacer.style.width = expand.offsetWidth + 2 + 'px'
seeker.style.width = seeker.offsetHeight + 'px'
seeker.style['border-radius'] = seeker.offsetHeight + 'px'
seeker.style.left = seeker.offsetLeft - seeker.offsetWidth / 2 + 'px'
// fill piano roll with grid
addMeasures(Math.max(Math.ceil(scroller.offsetWidth / whole), Math.ceil(totalTime * tempo / 60 / 4)))
// add notes to roll
toNotes(sequence)
let notes = document.getElementsByClassName('note')
let originalSequence = record(notes)

scroller.onscroll = () => { scrollerMatch() }
vert.onscroll = () => { vertMatch() }
timebar.onscroll = () => { timebarMatch() }

// expand piano roll
expand.onclick = () => { addMeasures(1) }

// save sequence to reset to
document.getElementById('save').onclick = () => {
  originalSequence = record(notes)
  resetBtn.disabled = true
}

// return piano roll to most recently saved sequence
resetBtn.onclick = () => {
  // save state to stack for restoration via undo, maintain stack size < 10
  undo.push(record(notes))
  undoBtn.disabled = false
  resetBtn.disabled = false
  while (undo.length > 10) {
    undo.shift()
  }
  // clear redo stack
  redoBtn.disabled = true
  while (redo.length > 0) {
    redo.shift()
  }

  while (notes.length > 0) {
    notes.item(0).remove()
  }
  visualize(originalSequence)
  notes = document.getElementsByClassName('note')
}

// revert most recent change to piano roll
undoBtn.onclick = () => {
  // save state to stack for restoration via redo, stack size automatically limited by undo
  redoBtn.disabled = false
  resetBtn.disabled = false
  redo.push(record(notes))

  while (notes.length > 0) {
    notes.item(0).remove()
  }
  // restore retreived state
  visualize(undo.pop())
  notes = document.getElementsByClassName('note')

  if (undo.length <= 0) {
    undoBtn.disabled = true
  }
}

// reinstate most recently reverted change to piano roll
redoBtn.onclick = () => {
  // save state to stack for restoration via undo, maintain stack size < 10
  undo.push(record(notes))
  undoBtn.disabled = false
  resetBtn.disabled = false
  while (notes.length > 0) {
    notes.item(0).remove()
  }
  // restore retrieved state
  visualize(redo.pop())
  notes = document.getElementsByClassName('note')

  if (redo.length <= 0) {
    redoBtn.disabled = true
  }
}

// decrease the tempo by 1 bpm (minimum 30 bpm)
document.getElementById('tempo-down').onclick = () => {
  tempo = Math.max(30, tempo - 1)
  tempoBtn.textContent = tempo
}

tempoBtn.onchange = () => {
  tempo = parseInt(tempoBtn.value)
}

// increase tempo by 1 bpm (maximum 300 bpm)
document.getElementById('tempo-up').onclick = () => {
  tempo = Math.min(300, tempo + 1)
  tempoBtn.textContent = tempo
}

// play midi seuqence
playBtn.onclick = playMidi

stopBtn.onclick = () => {
  stopPlayback()
  clearInterval(markerInterval)
  marker.style.left = '0px'
}

// add a note to the piano roll by clicking on the grid
addBtn.onclick = () => {
  // deactivate all other interactions
  addBtn.disabled = true
  deleteBtn.disabled = false
  moveBtn.disabled = false
  stretchBtn.disabled = false

  for (var i = 0; i < notes.length; i++) {
    notes.item(i).onclick = null
    notes.item(i).onmousedown = null
  }

  roll.onclick = (e) => {
    e = e || window.event
    e.preventDefault()
    // save state to stack for restoration via undo, maintain stack size < 10
    undo.push(record(notes))
    undoBtn.disabled = false
    resetBtn.disabled = false
    while (undo.length > 10) {
      undo.shift()
    }
    // clear redo stack
    redoBtn.disabled = true
    while (redo.length > 0) {
      redo.shift()
    }
    // generate new note, position centered under cursor
    var newNote = document.createElement('BUTTON')
    newNote.classList.add('note')
    roll.appendChild(newNote)
    newNote.style.width = whole / Math.min(quant, 8) + 'px'
    newNote.style.height = key.offsetHeight + 'px'
    newNote.style.left = e.clientX - (keys.offsetLeft + keys.offsetWidth - scroller.scrollLeft) + 'px'
    newNote.style.top = e.clientY - (keys.offsetTop - scroller.scrollTop) - newNote.offsetHeight / 2 + 'px'
    // snap to quantized position
    newNote.style.left = Math.round(newNote.offsetLeft / (whole / quant)) * whole / quant + 'px'
    newNote.style.top = Math.round(newNote.offsetTop / (key.offsetHeight + 1)) * (key.offsetHeight + 1) + 'px'

    notes = document.getElementsByClassName('note')
  }
}

// delete note from piano roll by clicking the note
deleteBtn.onclick = () => {
  // deactivate all other interactions
  addBtn.disabled = false
  deleteBtn.disabled = true
  moveBtn.disabled = false
  stretchBtn.disabled = false
  roll.onclick = null
  // set note interaction to delete
  for (var i = 0; i < notes.length; i++) {
    deleteElem(notes.item(i))
  }
}

// change note's position on the piano roll bby clicking and dragging
moveBtn.onclick = () => {
  // deactivate all other interactions
  addBtn.disabled = false
  deleteBtn.disabled = false
  moveBtn.disabled = true
  stretchBtn.disabled = false
  roll.onclick = null
  // set note interaction to move
  for (var i = 0; i < notes.length; i++) {
    dragElem(notes.item(i))
  }
}

// change note duration by clicking and dragging
stretchBtn.onclick = () => {
  // deactivate all other interactions
  addBtn.disabled = false
  deleteBtn.disabled = false
  moveBtn.disabled = false
  stretchBtn.disabled = true
  roll.onclick = null
  // set note interaction to stretch
  for (var i = 0; i < notes.length; i++) {
    stretchElem(notes.item(i))
  }
}

// select quantization value
document.getElementById('quant').onchange = () => {
  quant = parseInt(document.getElementById('quant').value)
}

// snap all notes on piano roll to a quantized position
document.getElementById('quantize').onclick = () => {
  // save state to stack for restoration via undo, maintain stack size < 10
  undo.push(record(notes))
  undoBtn.disabled = false
  resetBtn.disabled = false
  while (undo.length > 10) {
    undo.shift()
  }
  // clear redo stack
  redoBtn.disabled = true
  while (redo.length > 0) {
    redo.shift()
  }

  for (var i = 0; i < notes.length; i++) {
    notes.item(i).style.left = Math.round(notes.item(i).offsetLeft / (whole / quant)) * whole / quant + 'px'
  }
}

// ----- FUNCTIONS -----
//  add n measures to the piano roll
function scrollerMatch() {
  vert.onscroll = null
  timebar.onscroll = null
  vert.scrollTop = scroller.scrollTop
  timebar.scrollLeft = scroller.scrollLeft
  vert.onscroll = () => { vertMatch() }
  timebar.onscroll = () => { timebarMatch() }
}

function vertMatch() {
  scroller.onscroll = null
  scroller.scrollTop = vert.scrollTop
  scroller.onscroll = () => { scrollerMatch() }
}

function timebarMatch() {
  scroller.onscroll = null
  scroller.scrollLeft = timebar.scrollLeft
  scroller.onscroll = () => { scrollerMatch() }
}

function addMeasures(n) {
  for (var i = 0; i < n; i++) {
    // generate measure, establish dimensions to fit
    var newMeasure = document.createElement('DIV')
    newMeasure.style.width = whole - 1 + 'px'
    newMeasure.style.height = keys.style.height + 'px'
    newMeasure.style.left = (measures + i) * whole + 'px'
    newMeasure.classList.add('measure')
    // maintain alternating opacity
    if ((measures + i) % 2 == 0) {
      newMeasure.style.opacity = 0.3
    } else {
      newMeasure.style.opacity = 0.4
    }

    roll.appendChild(newMeasure)
    // populate with grid cells, matching color to key
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

    for (var j = 0; j < 4; j++) {
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
    // expand time bar to match
    var newTimeSection = document.createElement('DIV')
    newTimeSection.style.width = whole - 1 + 'px'
    newTimeSection.style.height = timebar.style.height
    newTimeSection.style.left = (measures + i) * whole + 'px'
    newTimeSection.classList.add('measure')
    newTimeSection.style.opacity = 0.5
    timebar.appendChild(newTimeSection)
    // populate with grid cells, matching color to key
    for (var k = 0; k < 4; k++) {
      var newCell = document.createElement('DIV')
      newCell.style.height = key.offsetHeight + 'px'
      newCell.style.width = whole / 4 - 1 + 'px'
      newCell.classList.add('wht')
      newTimeSection.appendChild(newCell)
    }
  }
  measures += n
  expand.style.left = measures * whole + 'px'
  spacer.style.left = expand.style.left
}

// convert positional value sequence to piano roll notes
function visualize(noteRecord) {
  for (var i = 0; i < noteRecord.length; i++) {
    var newNote = document.createElement('BUTTON')
    newNote.classList.add('note')
    newNote.style.top = noteRecord[i].offsetTop + 'px'
    newNote.style.left = noteRecord[i].offsetLeft + 'px'
    newNote.style.width = noteRecord[i].offsetWidth + 'px'
    newNote.style.height = key.offsetHeight + 'px'
    roll.appendChild(newNote)
  }
}

// convert piano roll configuration to a positional value sequence
function record(notes) {
  noteRecord = []
  for (var i = 0; i < notes.length; i++) {
    noteRecord.push({ offsetTop: notes.item(i).offsetTop, offsetLeft: notes.item(i).offsetLeft, offsetWidth: notes.item(i).offsetWidth })
  }
  return noteRecord
}

// convert MIDI sequence to piano roll notes
function toNotes(sequence) {
  for (var i = 0; i < sequence.length; i++) {
    var newNote = document.createElement('BUTTON')
    newNote.classList.add('note')
    newNote.style.top = (key.offsetHeight + 1) * 28 - (sequence[i].pitch - 60) * (key.offsetHeight + 1) + 'px'
    newNote.style.left = Math.round(sequence[i].startTime * tempo / 60) * whole / 4 + 'px'
    newNote.style.width = Math.round((sequence[i].endTime - sequence[i].startTime) * tempo / 60) * whole / 4 + 'px'
    newNote.style.height = key.offsetHeight + 'px'
    roll.appendChild(newNote)
  }
}

// convert piano roll cofiguration to MIDI sequence
function toMIDI(notes) {
  sequence = []
  totalTime = 0
  for (var i = 0; i < notes.length; i++) {
    var pitch = 60 + ((key.offsetHeight + 1) * 28 - notes.item(i).offsetTop) / (key.offsetHeight + 1)
    var startTime = notes.item(i).offsetLeft * 4 / whole * 60 / tempo
    var endTime = notes.item(i).offsetWidth * 4 / whole * 60 / tempo + startTime
    if (endTime > totalTime) {
      totalTime = endTime
    }
    sequence.push({ pitch: pitch, startTime: startTime, endTime: endTime })
  }
  return sequence
}

var audio = null

function stopPlayback() {
  console.log("stopPlayback was called")
  audio.close()
  playBtn.textContent = 'Play'
  playBtn.onclick = playMidi
}


// play midi sequence
function playMidi(e) {
  // read notes into sequence based on position and dimensions
  sequence = toMIDI(notes)
  // translate sequence into audio
  audio = new (window.AudioContext || window.webkitAudioContext)()
  var gain = audio.createGain()
  gain.connect(audio.destination)
  gain.gain.setValueAtTime(0.02, audio.currentTime)
  stopBtn.disabled = false
  playBtn.textContent = 'Pause'
  animateMarker()
  // allow pausing during playback
  playBtn.onclick = () => {
    if (audio.state === 'running') {
      audio.suspend().then(function () {
        playBtn.textContent = 'Play'
      })
      clearInterval(markerInterval)
    } else if (audio.state === 'suspended') {
      audio.resume().then(function () {
        playBtn.textContent = 'Pause'
      })
      animateMarker()
    }
  }
  // play metronome audio if activated
  if (metronome) {
      for (var i = 0; i < measures * 4; i++) {
        var metOsc = audio.createOscillator()
        metOsc.detune = 10
        metOsc.connect(gain)
        if (i % 4 == 0) {
          metOsc.frequency.setValueAtTime(4000, 0)
        } else {
          metOsc.frequency.setValueAtTime(3000, 0)
        }
        metOsc.start(i * (tempo / 60 / 4))
        metOsc.stop(i * (tempo / 60 / 4) + 0.01)
      }
  }
  // create tones from MIDI data
  for (var i = 0; i < notes.length; i++) {
    var osc = audio.createOscillator()
    osc.type = 'square'
    osc.connect(gain)
    osc.frequency.setValueAtTime(Math.pow(2, (sequence[i].pitch - 69) / 12) * 440, 0)
    osc.start(sequence[i].startTime)
    osc.stop(sequence[i].endTime)
    if (sequence[i].endTime === totalTime) {
      osc.onended = () => {
        audio.close()
        playBtn.textContent = 'Play'
        playBtn.onclick = playMidi
      }
    }
  }
}

// marker moves to show progress of MIDI playback
function animateMarker() {
  interval = 4.0 * 60 * 1000 / (whole * tempo)
  markerInterval = setInterval(function() {
    marker.style.left = marker.offsetLeft + 1 + 'px'
    seeker.style.left = seeker.offsetLeft + 1 + 'px'
    if (marker.offsetLeft >= totalTime * tempo / 60 / 4 * whole) {
      clearInterval(markerInterval)
    }
  }, interval)
}

// delete selected note from piano roll
function deleteElem(elem) {
  elem.onmousedown = null
  elem.onclick = () => {
    // save state to stack for restoration via undo, maintain stack size < 10
    undo.push(record(notes))
    undoBtn.disabled = false
    resetBtn.disabled = false
    while (undo.length > 10) {
      undo.shift()
    }
    // clear redo stack
    redoBtn.disabled = true
    while (redo.length > 0) {
      redo.shift()
    }

    elem.remove()
  }
}

function dragElem(elem) {
  elem.onmousedown = dragDown
  elem.onclick = null

  function dragDown(e) {
    // save state to stack for restoration via undo, maintain stack size < 10
    undo.push(record(notes))
    undoBtn.disabled = false
    resetBtn.disabled = false
    while (undo.length > 10) {
      undo.shift()
    }
    // clear redo stack
    redoBtn.disabled = true
    while (redo.length > 0) {
      redo.shift()
    }

    document.onmousemove = dragMove
    document.onmouseup = dragUp
  }

  function dragMove(e) {
    e = e || window.event
    e.preventDefault()
    // center selected note over cursor
    elem.style.left = Math.max(0, Math.min(e.clientX - (keys.offsetWidth + keys.offsetLeft - scroller.scrollLeft) - elem.offsetWidth / 2, expand.offsetLeft - elem.offsetWidth)) + 'px'
    elem.style.top = e.clientY - elem.offsetHeight / 2 - scroller.offsetTop + scroller.scrollTop + 'px'
  }

  function dragUp(e) {
    document.onmousemove = null
    document.onmouseup = null
    // snap note to quantized positon
    elem.style.left = Math.round(elem.offsetLeft / (whole / quant)) * whole / quant + 'px'
    elem.style.top = Math.round(elem.offsetTop / (key.offsetHeight + 1)) * (key.offsetHeight + 1) + 'px'
  }
}

function stretchElem(elem) {
  let pos = 0, startX = 0, startWidth = 0
  elem.onmousedown = stretchDown
  elem.onclick = null

  function stretchDown(e) {
    // save state to stack for restoration via undo, maintain stack size < 10
    undo.push(record(notes))
    undoBtn.disabled = false
    resetBtn.disabled = false
    while (undo.length > 10) {
      undo.shift()
    }
    // clear redo stack
    redoBtn.disabled = true
    while (redo.length > 0) {
      redo.shift()
    }

    startWidth = elem.offsetWidth
    startX = e.clientX

    document.onmousemove = stretchMove
    document.onmouseup = stretchUp
  }

  function stretchMove(e) {
    e = e || window.event
    e.preventDefault()
    // change selected note width according to cursor movement
    pos = e.clientX - startX
    elem.style.width = Math.min(Math.max(whole / quant, startWidth + pos), expand.offsetLeft - elem.offsetLeft) + 'px'
  }

  function stretchUp(e) {
    document.onmousemove = null
    document.onmouseup = null
    // snap note to uantized width
    elem.style.width = elem.offsetWidth - ((elem.offsetWidth + whole / quant / 2) % (whole / quant)) + whole / quant / 2 + 'px'
  }
}

// generate melody completion
document.getElementById('generate').onclick = () => {
  // save state to stack for restoration via undo, maintain stack size < 10
  undo.push(record(document.getElementsByClassName('note')))
  undoBtn.disabled = false
  resetBtn.disabled = false
  while (undo.length > 10) {
    undo.shift()
  }
  // clear redo stack
  redoBtn.disabled = true
  while (redo.length > 0) {
    redo.shift()
  }

  console.log("generate onclick was called")
  if (audio != null) {
    stopPlayback()
  }

  let selector = document.getElementById('checkpoint')
  let checkpoint = selector.value
  let notes = document.getElementsByClassName('note')
  let convertedNotes = toMIDI(notes);
  let totalTime = convertedNotes.reduce((accumulator, note) => note.endTime > accumulator ? note.endTime : accumulator, 0)
  let noteSequence = {
    notes: convertedNotes,
    totalTime: totalTime,
  }
  // minimum quantization value set at 8th
  noteSequence = core.sequences.quantizeNoteSequence(noteSequence, Math.min(quant, 8))
  ipcRenderer.invoke('generate', checkpoint, noteSequence, 20, 1.5).then((newNotes) => {
    let end = 0
    newNotes.notes = newNotes.notes.map((note) => {
      let startTime = totalTime + note.quantizedStartStep / Math.min(quant, 8);
      let endTime = totalTime + note.quantizedEndStep / Math.min(quant, 8);
      end = Math.max(end, endTime)
      return {
        pitch: note.pitch,
        startTime: startTime,
        endTime: endTime,
      }
    })
    if (end > 4 * measures * 60 / tempo) {
      addMeasures(Math.ceil((end - 4 * measures * 60 / tempo) / (4 * 60 / tempo)))
    }
    toNotes(newNotes.notes)
  })
  notes = document.getElementsByClassName('note')
}

document.getElementById('testA').onmousedown = (_event) => {
  ipcMain.send('midi-out-note-on', 69, 100)
}

document.getElementById('testA').onmouseup = (_event) => {
  ipcMain.send('midi-out-note-off', 69, 100)
}
