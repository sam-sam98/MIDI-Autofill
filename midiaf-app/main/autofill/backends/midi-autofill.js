const tf = require('@tensorflow/tfjs')
const tfn = require('@tensorflow/tfjs-node')
const handler = tfn.io.fileSystem('./models/model.json')

var checkpoints = [
  {
    name: 'MIDI_Autofill',
    model: await tf.loadLayersModel(handler)
  }
]

module.exports = {
  checkpoints: checkpoints,
  initialize: async () => {
    for (let checkpoint of checkpoints){
      // initialize
    }
  },
  autofill: async (checkpoint, noteSequence, steps, temperature) => {
    console.log(noteSequence)
    // run
  }
}
