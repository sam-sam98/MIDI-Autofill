const { ipcRenderer } = require("electron/renderer")
const core = require('@magenta/music/node/core');
const Keyboard = window.SimpleKeyboard.default;

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

const synth = new Tone.Sampler({
	urls: {
		'C4': 'C4.mp3',
		'E4': 'E4.mp3',
		'G4': 'G4.mp3',
		'B4': 'B4.mp3',
	},
	release: 0.5,
	baseUrl: 'mp3/',
}).toDestination()

const met = new Tone.Synth({
  decay: 0.9,
  release: 0,
  sustain: 0.05
}).toDestination()

const noteValues = [
  'C0', 'C#0', 'D0', 'D#0', 'E0', 'F0', 'F#0', 'G0', 'G#0', 'A0', 'A#0', 'B0',
  'C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1',
  'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
  'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
  'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6', 'G6', 'G#6', 'A6', 'A#6', 'B6',
  'C7', 'C#7', 'D7', 'D#7', 'E7', 'F7', 'F#7', 'G7', 'G#7', 'A7', 'A#7', 'B7',
  'C8', 'C#8', 'D8', 'D#8', 'E8', 'F8', 'F#8', 'G8', 'G#8', 'A8', 'A#8', 'B8',
  'C9', 'C#9', 'D9', 'D#9', 'E9', 'F9', 'F#9', 'G9', 'G#9', 'A9', 'A#9', 'B9',
  'C10', 'C#10', 'D10', 'D#10', 'E10', 'F10', 'F#10', 'G10'
]

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
let quant = 4
let tempo = 120
let undo = []
let redo = []
let metronome = true
let markerInterval = null
let interval = 0
let octave = 4
let schedule = []
let showingKeyboard = false

let virtualKeyboard = new Keyboard({
  onChange: input => onVirtualKeyboardInput(input),
  onKeyPress: button => onVirtualKeyboardPressed(button)
});

hideKeyboard();

const key = { offsetHeight: document.getElementById('key-sample').offsetHeight }
const keys = document.getElementById('keys')
const samples = document.getElementsByClassName('key')
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
const trackNameInput = document.getElementById('current-track-name')
const trackOptions = document.getElementById('track-options')
const directory = document.getElementById('open-directory')

resetBtn.disabled = true
undoBtn.disabled = true
redoBtn.disabled = true
// flexible dimensions
keys.style.height = (key.offsetHeight + 1) * 128 - 1 + 'px'
roll.style.height = keys.style.height
marker.style.height = roll.style.height
vert.style.height = (key.offsetHeight + 1) * 29 - 1 + 'px'
vert.scrollTop = (key.offsetHeight + 1) * 51
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
trackOptions.style.width = trackNameInput.offsetWidth - 2 + 'px'
trackOptions.style.left = trackNameInput.offsetLeft + 'px'
trackOptions.style.top = trackNameInput.offsetTop + trackNameInput.offsetHeight + 'px'
// fill piano roll with grid
addMeasures(Math.max(Math.ceil(scroller.offsetWidth / whole), Math.ceil(totalTime * tempo / 60 / 4)))
// add notes to roll
toNotes(sequence)
let notes = document.getElementsByClassName('note')
let originalSequence = record(notes)

scroller.onscroll = scrollerMatch
vert.onscroll = vertMatch
timebar.onscroll = timebarMatch

// expand piano roll
expand.onclick = () => { addMeasures(1) }
seekElem(seeker)

for (var i = 0; i < samples.length; i++) {
  playSample(samples.item(i))
}

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
playBtn.onclick = playMIDI

stopBtn.onclick = () => {
  stopPlayback()
  clearInterval(markerInterval)
  marker.style.left = '0px'
  seeker.style.left = -seeker.offsetWidth / 2 + 'px'
}

// add a note to the piano roll by clicking on the grid
addBtn.onclick = () => {
  // deactivate all other interactions
  addBtn.disabled = true
  deleteBtn.disabled = false
  moveBtn.disabled = false
  stretchBtn.disabled = false
  activeTool = "NONE"

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

    setupNoteCallbacks(newNote)

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
  activeTool = "NONE"
  // set note interaction to delete
  for (var i = 0; i < notes.length; i++) {
    deleteElem(notes.item(i))
  }
}

let activeTool = "NONE"

// change note's position on the piano roll by clicking and dragging
moveBtn.onclick = () => {
  // deactivate all other interactions
  addBtn.disabled = false
  deleteBtn.disabled = false
  moveBtn.disabled = true
  stretchBtn.disabled = false
  roll.onclick = null
  activeTool = "MOVE"
}

// change note duration by clicking and dragging
stretchBtn.onclick = () => {
  // deactivate all other interactions
  addBtn.disabled = false
  deleteBtn.disabled = false
  moveBtn.disabled = false
  stretchBtn.disabled = true
  roll.onclick = null
  activeTool = "STRETCH"
}

function setupNoteCallbacks(noteElem) {
  noteElem.addEventListener('touchstart', noteTouchStart, false)
  noteElem.addEventListener('touchmove', noteTouchMove, false)
  noteElem.addEventListener('touchend', noteTouchEnd, false)
  noteElem.style.touchAction = 'none'

  const toolCallbacks = {
    'MOVE': {
      touchStart: e => {
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
      },
      touchMove: e => {
        e = e || window.event
        let elem = e.target;
        let touch = e.changedTouches[0];
        elem.style.left = Math.max(0, Math.min(touch.pageX - (keys.offsetWidth + keys.offsetLeft - scroller.scrollLeft) - elem.offsetWidth / 2, expand.offsetLeft - elem.offsetWidth)) + 'px'
        elem.style.top = touch.pageY - elem.offsetHeight / 2 - scroller.offsetTop + scroller.scrollTop + 'px'
      },
      touchEnd: e => {
        let elem = e.target;
        // snap note to quantized positon
        elem.style.left = Math.round(elem.offsetLeft / (whole / quant)) * whole / quant + 'px'
        elem.style.top = Math.round(elem.offsetTop / (key.offsetHeight + 1)) * (key.offsetHeight + 1) + 'px'
      }
    },
    'STRETCH': {
      startX: 0,
      touchStart: e => {
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

        let elem = e.target;
        this.startWidth = elem.offsetWidth
        let touch = e.changedTouches[0]
        //startX = e.clientX
        this.startX = touch.pageX
      },
      touchMove: e => {
        e = e || window.event
        e.preventDefault()
        const elem = e.target;
        // change selected note width according to cursor movement
        let touch = e.changedTouches[0]
        pos = touch.pageX - this.startX
        elem.style.width = Math.min(Math.max(whole / quant, this.startWidth + pos), expand.offsetLeft - elem.offsetLeft) + 'px'
      },
      touchEnd: e => {
        const elem = e.target;
        // snap note to quantized width
        elem.style.width = elem.offsetWidth - ((elem.offsetWidth + whole / quant / 2) % (whole / quant)) + whole / quant / 2 + 'px'
      }
    }
  }

  function noteTouchStart(e) {
    if (activeTool in toolCallbacks) {
      toolCallbacks[activeTool].touchStart(e)
    }
  }

  function noteTouchMove(e) {
    if (activeTool in toolCallbacks) {
      toolCallbacks[activeTool].touchMove(e)
    }
  }

  function noteTouchEnd(e) {
    if (activeTool in toolCallbacks) {
      toolCallbacks[activeTool].touchEnd(e)
    }
  }
}

directory.onmouseover = () => {
  icon.src = 'img/directory-hover.png'
}
directory.onmouseout = () => {
  icon.src = 'img/directory-icon.png'
}
directory.onclick = () => {
  trackOptions.classList.toggle('visible')
  trackOptions.classList.toggle('invisible')
  if (trackOptions.classList.contains('visible')) {
    document.onmousedown = (event) => {
      if(!trackOptions.contains(event.target) && !trackNameInput.contains(event.target)){
        trackOptions.classList.toggle('visible')
        trackOptions.classList.toggle('invisible')
        document.onmousedown = null
      }
    }
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

    for (var j = 0; j < 10; j++) {
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
  roll.style.width = measures * whole + 'px'
}

// synchronize scroll axes
function scrollerMatch() {
  vert.onscroll = null
  timebar.onscroll = null
  vert.scrollTop = scroller.scrollTop
  timebar.scrollLeft = scroller.scrollLeft
  vert.onscroll = vertMatch
  timebar.onscroll = timebarMatch
}
function vertMatch() {
  scroller.onscroll = null
  scroller.scrollTop = vert.scrollTop
  scroller.onscroll = scrollerMatch
}
function timebarMatch() {
  scroller.onscroll = null
  scroller.scrollLeft = timebar.scrollLeft
  scroller.onscroll = scrollerMatch
}

// play sample audio of note
function playSample(elem) {
  elem.onclick = async () => {
    await Tone.start()
    Tone.loaded().then(() => {
      let pitch = ((key.offsetHeight + 1) * 127 + keys.offsetTop - elem.offsetTop) / (key.offsetHeight + 1)
      synth.triggerAttackRelease(noteValues[pitch], 0.5)
    })
  }
}

// move time scroller
function seekElem(elem) {
  var playback = false
  elem.onmousedown = seekDown

  elem.addEventListener('touchstart', seekDown, false)
  elem.addEventListener('touchmove', seekMove, false)
  elem.addEventListener('touchend', seekUp, false)
  elem.addEventListener('mousedown', seekDown, false)
  elem.addEventListener('mousemove', seekMove, false)
  elem.addEventListener('mouseup', seekUp, false)

  elem.style.touchAction = 'none'

  function seekDown(e) {
    e.preventDefault()
    clearInterval(markerInterval)
    playBtn.onclick = playMIDI
  }

  function seekMove(e) {
    e.preventDefault()
    e = e || window.event
    const x = e.changedTouches[0].pageX;
    // center seeker over cursor
    elem.style.left = Math.max(-elem.offsetWidth / 2, Math.min(x - (keys.offsetWidth + keys.offsetLeft - timebar.scrollLeft) - elem.offsetWidth / 2, spacer.offsetLeft - elem.offsetWidth / 2)) + 'px'
    marker.style.left = elem.offsetLeft + elem.offsetWidth / 2 + 'px'
  }

  function seekUp(e) {
    e.preventDefault()
    if (playback) {
      playMIDI()
    }
  }
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
    setupNoteCallbacks(newNote)
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
    newNote.style.top = (key.offsetHeight + 1) * 127 - sequence[i].pitch * (key.offsetHeight + 1) + 'px'
    newNote.style.left = sequence[i].startTime * tempo / 60 * whole / 4 + 'px'
    newNote.style.width = (sequence[i].endTime - sequence[i].startTime) * tempo / 60 * whole / 4 + 'px'
    newNote.style.height = key.offsetHeight + 'px'
    roll.appendChild(newNote)
    setupNoteCallbacks(newNote);
  }
}

// convert piano roll cofiguration to MIDI sequence
function toMIDI(notes) {
  sequence = []
  totalTime = 0
  for (var i = 0; i < notes.length; i++) {
    var pitch = ((key.offsetHeight + 1) * 127 - notes.item(i).offsetTop) / (key.offsetHeight + 1)
    var startTime = notes.item(i).offsetLeft * 4 / whole * 60 / tempo
    var endTime = notes.item(i).offsetWidth * 4 / whole * 60 / tempo + startTime
    if (endTime > totalTime) {
      totalTime = endTime
    }
    sequence.push({ pitch: pitch, startTime: startTime, endTime: endTime })
  }
  return sequence
}

// Like toMIDI, but puts the results into a magenta INoteSequence
function toNoteSequence(notes) {
  let convertedNotes = toMIDI(notes);
  let totalTime = convertedNotes.reduce((accumulator, note) => note.endTime > accumulator ? note.endTime : accumulator, 0)
  return {
    notes: convertedNotes,
    totalTime: totalTime,
  }
}

function stopPlayback() {
  console.log("stopPlayback was called")
  Tone.Transport.stop()
  while (schedule.length > 0) {
    Tone.Transport.clear(schedule.pop())
  }
  playBtn.textContent = 'Play'
  playBtn.onclick = playMIDI
}

// play midi sequence
async function playMIDI(e) {
  await Tone.start()
  // read notes into sequence based on position and dimensions
  sequence = toMIDI(notes)

  if (marker.offsetLeft >= totalTime * tempo / 60 / 4 * whole) {
    marker.style.left = '0px'
    seeker.style.left = -seeker.offsetWidth / 2 + 'px'
  }
  stopBtn.disabled = false
  playBtn.textContent = 'Pause'

  animateMarker(true)
  Tone.loaded().then(() => {
    if (metronome) {
      Tone.Transport.bpm.value = tempo
      schedule.push(
        Tone.Transport.scheduleRepeat ((time) => {
          met.triggerAttackRelease(Tone.Frequency(1000), 0.1, Tone.now(), 0.05)
        }, '4n', 0, totalTime)
      )
      schedule.push(
        Tone.Transport.scheduleRepeat ((time) => {
          met.triggerAttackRelease(Tone.Frequency(2000), 0.1, Tone.now(), 0.05)
        }, '1m', 0, totalTime)
      )
    }

    // create tones from MIDI data
    for (var i = 0; i < sequence.length; i++) {
      if (sequence[i].startTime < (60 * 4 * marker.offsetLeft / whole / tempo)) {
        continue
      }
      var pitch = sequence[i].pitch
      var duration = sequence[i].endTime - sequence[i].startTime
      schedule.push(
        Tone.Transport.schedule(((pitch, duration) => (time) => {
          synth.triggerAttackRelease(noteValues[pitch], duration, Tone.now())
        })(pitch, duration), sequence[i].startTime)
      )
    }
    Tone.Transport.stop()
    Tone.Transport.start()
  })

  // allow pausing during playback
  playBtn.onclick = () => {
    if (Tone.Transport.state === 'started') {
      Tone.Transport.pause().then(function () {
        playBtn.textContent = 'Play'
      })
      clearInterval(markerInterval)
    } else if (Tone.Transport.state === 'paused') {
      Tone.Transport.start().then(function () {
        playBtn.textContent = 'Pause'
      })
      animateMarker(true)
    }
  }
}

// marker moves to show progress of MIDI playback
function animateMarker(playing) {
  interval = 4 * 60 * 1000 / (whole * tempo)
  markerInterval = setInterval(function() {
    marker.style.left = marker.offsetLeft + 1 + 'px'
    seeker.style.left = seeker.offsetLeft + 1 + 'px'
    if (playing) {
      if (marker.offsetLeft >= totalTime * tempo / 60 / 4 * whole) {
        clearInterval(markerInterval)
      }
    } else {
      if (marker.offsetLeft >= expand.offsetLeft) {
        clearInterval(markerInterval)
      }
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

function resetPianoRoll() {
  let notes = document.getElementsByClassName("note");
  for (var i = notes.length - 1; i >= 0; i--) {
    roll.removeChild(notes[i])
  }
}

function loadNewSequence(noteSequence) {
  resetPianoRoll()
  toNotes(noteSequence)
}

async function renameTrack() {
  // Jeez...
  let oldName = trackList.options[trackList.selectedIndex].value
  let newName = trackNameInput.value
  let err = await ipcRenderer.invoke('rename-track', oldName, newName)

  if (err != null) {
    trackNameInput.value = oldName
  } else {
    let option = trackList.options[trackList.selectedIndex]
    option.textContent = newName
    option.value = newName
  }
}

async function switchTrack(trackName, saveTrack) {
  if (saveTrack) {
    await saveActiveTrack()
  }

  ipcRenderer.invoke('fetch-track-notes', trackName).then((noteSequence) => {
    if (noteSequence != null) {
      loadNewSequence(noteSequence.notes)

      // Allow the user to rename the track by simply entering a new name
      trackNameInput.onchange = null
      trackNameInput.value = trackName
      trackNameInput.onfocus = () => {
        showKeyboard();
      }
      notes = document.getElementsByClassName('note')
      originalSequence = record(notes)
    } else {
      alert("Failed to load MIDI track")
    }
  })
}

function onVirtualKeyboardInput(input) {
  trackNameInput.value = input
}

async function onVirtualKeyboardPressed(button) {
  if (button == '{enter}') {
    await renameTrack()
    hideKeyboard();
  }
}

async function saveActiveTrack() {
  let noteSequence = toNoteSequence(notes);
  await ipcRenderer.invoke('save', noteSequence, trackNameInput.value)
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
  stopPlayback()

  let selector = document.getElementById('checkpoint')
  let checkpoint = selector.value
  let notes = document.getElementsByClassName('note')
  let noteSequence = toNoteSequence(notes);
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

document.addEventListener('mousedown', (event) => {
  let keyboardContainer = document.getElementById('keyboard-container')
  if (showingKeyboard && !keyboardContainer.contains(event.target) && !trackNameInput.contains(event.target)){
    hideKeyboard();
    renameTrack();
  }
})

function showKeyboard() {
  let keyboardContainer = document.getElementById('keyboard-container')
  showingKeyboard = true;
  keyboardContainer.style.display = 'block';
}

function hideKeyboard() {
  let keyboardContainer = document.getElementById('keyboard-container')
  showingKeyboard = false;
  keyboardContainer.style.display = 'none';
}

// TODO:
// * Don't start with TWINKLE_TWINKLE, have piano roll disabled
// * After tracks list is loaded, enable piano roll
// * If no existing tracks, create a default one and leave it blank
// * Implement rename MIDI track feature with the text area.

// Receive the list of existing MIDI tracks from main process
ipcRenderer.on('receive-track-list', (_, tracks) => {
  if (tracks.length == 0) {
    // This is a bit hacky.
    // If no current track exists, create a twinkle twinkle one
    // and add it to the track list.
    tracks.push('twinkle-twinkle')
    trackNameInput.value = "twinkle-twinkle"
    saveActiveTrack();
  }

  for (let track of tracks) {
    let option = document.createElement('option')
    option.textContent = track
    option.value = track
    option.classList.add('track')
    option.style.height = trackNameInput.style.height
    option.style.width = trackNameInput.style.width
    trackOptions.appendChild(option)
  }
  let newTrackBtn = document.createElement('option')
  newTrackBtn.textContent = '-- Add New Track --'
  newTrackBtn.value = trackNameInput.textContent
  newTrackBtn.classList.add('new-track')
  newTrackBtn.style.height = trackNameInput.style.height
  newTrackBtn.style.width = trackNameInput.style.width
  trackOptions.appendChild(newTrackBtn)

  newTrackBtn.onclick = async () => {
    let existingTrackNames = []
    // Can't map options :/
    for (let i = 0; i < trackList.options.length; i++) {
      existingTrackNames.push(trackList.options[i].value)
    }

    // Default name, increment a number suffix until we find something unique
    let newTrackCounter = 0
    let newTrackName = `NewTrack ${newTrackCounter}`
    while (existingTrackNames.includes(newTrackName)) {
      newTrackCounter += 1
      newTrackName = `NewTrack ${newTrackCounter}`
    }

    let err = await ipcRenderer.invoke('create-new-track', newTrackName);
    if (err == null) {
      let option = document.createElement('option')
      option.textContent = newTrackName
      option.value = newTrackName
      trackList.add(option)
      trackList.selectedIndex = trackList.options.length - 1;
      switchTrack(newTrackName, true)
    } else {
      alert("Error occurred creating new track");
    }
  }

  if (tracks.length > 0) {
    // Load first track by default.
    // TODO: This would be better if the last track worked on was saved somewhere, say a cookie.
    switchTrack(tracks[0], false)
  }

  let opts = document.getElementsByClassName('track')
  for (let opt of opts) {
    selectOpt(opt)
  }

  function selectOpt(opt) {
    let onclick = async (event) => {
      trackOptions.classList.toggle('visible')
      trackOptions.classList.toggle('invisible')
      console.log("Onclick called with ", event.target.value);
      await switchTrack(event.target.value, true)
    }
    opt.onclick = onclick
    opt.addEventListener('touchend', onclick, false)
  }
  // When changing tracks:
  // 1. Save the current track
  // 2. Fetch the new tracks notes
  // 3. Clear the piano roll
  // 4. Fill it with the new notes
  trackNameInput.onsubmit = async (event) => {
    await switchTrack(event.target.value, true)
  };
})

document.getElementById('record').onclick = recordMIDI

var pitches = []
for (i = 0; i < 128; i++) {
  pitches.push({on: [], off: [], velocity: []})
}

ipcRenderer.on('keyboard-input', async (_, status, pitch, velocity) => {
  await Tone.start()
  Tone.loaded().then(() => {
    document.getElementById('debug').textContent = `${status}, ${pitch}, ${velocity}`
    if (status == 'ON') {
      synth.triggerAttack(noteValues[pitch + octave * 12], Tone.now(), velocity / 127)
    } else {
      synth.triggerRelease(noteValues[pitch + octave * 12], Tone.now(), velocity / 127)
    }
  })
})

function recordMIDI() {
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

  // disable all UI buttons
  var ui = document.getElementsByClassName('ui-bar')
  for (i = 0; i < ui.length; i++) {
    var buttons = ui.item(i).getElementsByTagName('BUTTON')
    for (j = 0; j < buttons.length; j++) {
      buttons.item(j).disabled = true
    }
  }
  tempoBtn.disabled = true
  document.getElementById('record').disabled = false

  // disable note interactions
  for (i = 0; i < notes.length; i++) {
    notes.item(i).onclick = null
    notes.item(i).onmousedown = null
  }
  roll.onclick = null

  // give user a one-measure count-in
  marker.style.left = Math.round((marker.offsetLeft - whole) / whole) * whole + 'px'
  seeker.style.left = marker.offsetLeft - seeker.offsetWidth / 2 + 'px'
  var recordStart =  marker.offsetLeft / whole * 4 * 60 / tempo
  var markerStart = marker.offsetLeft

  // play metronome audio if activated
  if (metronome) {
    Tone.Transport.bpm.value = tempo
    schedule.push(
      Tone.Transport.scheduleRepeat ((time) => {
        met.triggerAttackRelease(Tone.Frequency(1000), 0.1, Tone.now(), 0.05)
      }, '4n', 0, measures * 60 * 4 / tempo)
    )
    schedule.push(
      Tone.Transport.scheduleRepeat ((time) => {
        met.triggerAttackRelease(Tone.Frequency(2000), 0.1, Tone.now(), 0.05)
      }, '1m', 0, measures * 60 * 4 / tempo)
    )
    Tone.Transport.stop()
    Tone.Transport.start()
  }

  // begin registering key actions
  ipcRenderer.on('keyboard-input', async (_, status, pitch, velocity) => {
    await Tone.start()
    Tone.loaded().then(() => {
      document.getElementById('debug').textContent = `${status}, ${pitch}, ${velocity}`
      if (status == 'ON') {
        pitches[pitch + octave * 12].on.push(Tone.Transport.seconds)
        pitches[pitch + octave * 12].velocity.push(velocity)
        synth.triggerAttack(noteValues[pitch + octave * 12], Tone.now(), velocity / 127)
      } else {
        pitches[pitch + octave * 12].off.push(Tone.Transport.seconds)
        synth.triggerRelease(noteValues[pitch + octave + 12], Tone.now(), velocity / 127)
      }
    })
  })

  document.getElementById('record').onclick = () => {
    stopPlayback()
    var ui = document.getElementsByClassName('ui-bar')
    for (i = 0; i < ui.length; i++) {
      var buttons = ui.item(i).getElementsByTagName('BUTTON')
      for (j = 0; j < buttons.length; j++) {
        buttons.item(j).disabled = false
      }
    }
    redoBtn.disabled = true
    tempoBtn.disabled = false
    clearInterval(markerInterval)

    // restore live playback without recording
    ipcRenderer.on('keyboard-input', async (_, status, pitch, velocity) => {
      await Tone.start()
      Tone.loaded().then(() => {
        document.getElementById('debug').textContent = `${status}, ${pitch}, ${velocity}`
        if (status == 'ON') {
          synth.triggerAttack(noteValues[pitch + octave * 12], Tone.now(), velocity / 127)
        } else {
          synth.triggerRelease(noteValues[pitch + octave * 12], tone.now(), velocity / 127)
        }
      })
    })

    // add recorded notes to roll
    var sequence = toMIDI(notes)
    for (i = 0; i < 128; i++) {
      for (j = 0; j < pitches[i].on.length; j++) {
        var startTime = pitches[i].on[j] + recordStart
        var endTime = (pitches[i].off[j] == null) ? measures * 60 / (tempo * 4) : pitches[i].off[j] + recordStart

        sequence.push({pitch: i, startTime: startTime, endTime: endTime})
      }
    }

    while (notes.length > 0) {
      notes.item(0).remove()
    }

    toNotes(sequence)
    notes = document.getElementsByClassName('note')

    // clear recorded notes
    for (var i = 0; i < 128; i++) {
      pitches[i].on.length = 0
      pitches[i].off.length = 0
      pitches[i].velocity.length = 0
    }

    document.getElementById('record').onclick = recordMIDI
  }
}
