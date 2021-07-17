const tf = require('@tensorflow/tfjs-node')
const handler = tf.io.fileSystem('./main/autofill/models/model.json')

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
  for (let entry of DURATION_TO_INT)
  {
    if (duration >= entry[0]) {
      return entry[1];
    }
  }

  return entry[DURATION_TO_INT.length() - 1]
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
      let region = regions.find(([existingStartTime, existingEndTime]) => existingStartTime <= endTime && existingEndTime >= startTime)
      if (region == null)
      {
        regions.push([startTime, endTime])
        notes.push(pitch)
        durations.push(endTime - startTime)
      }
      else
      {
        console.log('Overlapping region found in range ${startTime} - ${endTime}')
      }
    }

    durations = durations.map(convertDuration)

    let output = checkpoint.model.predict([notes, durations])
    console.log(output)
  }
}
