const rnn = require('@magenta/music/node/music_rnn')
const core = require('@magenta/music/node/core')

// TODO: We need to store these locally instead of loading
// over the internet
var checkpoints = [
  {
    name: 'basic_rnn',
    model: new rnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn')
  },
  {
    name: 'melody_rnn',
    model: new rnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn')
  }
]

module.exports = {
  checkpoints: checkpoints,
  initialize: async () => {
    for (let checkpoint of checkpoints){
      await checkpoint.model.initialize()
    }
  },
  autofill: async (checkpoint, noteSequence, steps, temperature) => {
    console.log(noteSequence)
    return await checkpoint.model.continueSequence(noteSequence, steps, temperature)
  }
}
