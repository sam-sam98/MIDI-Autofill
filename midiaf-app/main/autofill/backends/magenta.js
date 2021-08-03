require('@tensorflow/tfjs-node')
const rnn = require('@magenta/music/node/music_rnn')
const core = require('@magenta/music/node/core')

// TODO: We need to store these locally instead of loading
// over the internet
var checkpoints = [
  {
    name: 'basic_rnn',
    model: new rnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn'),
    minNote: 0,
    maxNote: 83,
  },
  {
    name: 'melody_rnn',
    model: new rnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn'),
    minNote: 48,
    maxNote: 84,
  }
]

function wrapNoteToRange(note, min, max)
{
  const range = max - min;
  let newNote = min + ((note - min) % range);

  if (newNote != note)
  {
    console.log(`Adjusted pitch ${note} to ${newNote} to fit the range ${min} - ${max}`)
  }

  return newNote;
}

module.exports = {
  checkpoints: checkpoints,
  initialize: async () => {
    for (let checkpoint of checkpoints){
      await checkpoint.model.initialize()
    }
  },
  autofill: async (checkpoint, noteSequence, steps, temperature) => {
    console.log(noteSequence)
    noteSequence.notes = noteSequence.notes.map(note => note.pitch = wrapNoteToRange(note.pitch, checkpoint.minNote, checkpoint.maxNote))
    return await checkpoint.model.continueSequence(noteSequence, steps, temperature)
  }
}

