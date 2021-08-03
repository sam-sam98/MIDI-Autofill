const tf = require('@tensorflow/tfjs-node')
//const tf = require('@tensorflow/tfjs')
const handler = tf.io.fileSystem('./main/autofill/models/model.json')
const core = require('@magenta/music/node/core')

const DURATION_TO_INT = [
  [(1/ 12.0), 0],
  [(1 / 6.0), 1],
  [0.25, 2],
  [(1 / 3.0), 3],
  [(5/ 12.0), 4],
  [0.5, 5],
  [(7 / 12), 6],
  [(2 / 3), 7],
  [0.75, 8],
  [(5 / 6), 9],
  [(11 / 12), 10],
  [1.0, 11],
  [(13 / 12), 12],
  [(7 / 6), 13],
  [1.25, 14],
  [(4 / 3), 15],
  [(17 / 12), 16],
  [1.5, 17],
  [(19 / 12), 18],
  [(5 / 3), 19],
  [1.75, 20],
  [(23 / 12), 21],
  [2.0, 22],
  [(13 / 6), 23],
  [2.25, 24],
  [2.5, 25],
  [(8 / 3), 26], 
  [2.75, 27], 
  [(17 / 6), 28], 
  [(35 / 12), 29], 
  [3.0, 30], 
  [3.25, 31], 
  [(41 / 12), 32], 
  [3.5, 33], 
  [3.75, 34], 
  [(23 / 6), 35], 
  [4.0, 36], 
  [4.25, 37], 
  [4.5, 38], 
  [4.75, 39], 
  [5.0, 40],
  [5.5, 41],
  [(71 / 12), 42],
  [6.0, 43],
  [(83 / 12), 44], 
  [7.0, 45],
  [7.5, 46],
  [8.0, 47],
  [(97/ 12), 48],
  [9.0, 49],
  [10.0, 50],
  [12.0, 51],
]

var checkpoints = [
  {
    name: 'MIDI_Autofill',
    model: null,
  }
]

function convertDuration(duration)
{
  for (let i = DURATION_TO_INT.length - 1; i >= 0; i--) {
    let entry = DURATION_TO_INT[i]
    if (duration >= entry[0]) {
      return entry[1]
    }
  }

  return entry[0]
}

function argMax(array) {
  return [].reduce.call(array, (m, c, i, arr) => c > arr[m] ? i : m, 0)
}

function interpretAIResult(noteOutput, durationOutput) {
  let note = argMax(noteOutput)
  let durationIdx = argMax(durationOutput)
  return [note, DURATION_TO_INT[durationIdx][0]]
}

module.exports = {
  checkpoints: checkpoints,
  initialize: async () => {
    checkpoints[0].model = await tf.loadLayersModel(handler)
  },
  autofill: async (checkpoint, noteSequence, steps, temperature) => {
    let regions = []
    let notes = []
    let durations = []
    for (let note of noteSequence.notes) { 
      let {pitch, startTime, endTime} = note
      let region = regions.find(([existingStartTime, existingEndTime]) => existingStartTime < endTime && existingEndTime > startTime)
      if (region == null)
      {
        regions.push([startTime, endTime])
        notes.push(pitch)
        durations.push(endTime - startTime)
      }
      else
      {
        console.log(`Overlapping region found in range ${startTime} - ${endTime}`)
      }
    }

    let originalNotes = [...notes]
    let originalDurations = [...durations]

    // Repeat melody until we're at 32 notes
    while (notes.length < 32)
    {
      notes.push(...originalNotes)
      durations.push(...originalDurations)
    }

    while (notes.length > 32)
    {
      notes.pop()
      durations.pop()
    }

    durations = durations.map(convertDuration)

    let outputNotes = []
    //let lastEndTime = noteSequence.notes.reduce((accumulator, note) => note.endTime > accumulator ? note.endTime : accumulator, 0)
    let lastEndTime = 0

    for (let i = 0; i < steps; i++)
    {
      let input = [tf.tensor1d(notes).expandDims(), tf.tensor1d(durations).expandDims()]
      console.log("Input notes:")
      tf.print(input[0])
      console.log("Input durations:")
      tf.print(input[1])
      let output = checkpoint.model.predict(input)
      let aiNotes = await output[0].data()
      let aiDurations = await output[1].data()
      let [note, duration] = interpretAIResult(aiNotes, aiDurations)
      let startTime = lastEndTime;
      let endTime = startTime + duration
      outputNotes.push({
        pitch: note,
        startTime,
        endTime,
      })

      lastEndTime = endTime
      notes = notes.slice(1)
      durations = durations.slice(1)
      notes.push(note)
      durations.push(duration)
    }

    let totalTime = outputNotes.reduce((accumulator, note) => note.endTime > accumulator ? note.endTime : accumulator, 0)

    let newNoteSequence = {
      notes: outputNotes,
      totalTime,
    }
    return core.sequences.quantizeNoteSequence(newNoteSequence, 4)
  }
}
