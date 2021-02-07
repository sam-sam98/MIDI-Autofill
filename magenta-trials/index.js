require('@tensorflow/tfjs-node');
const { performance } = require('perf_hooks');
const mrnn = require('@magenta/music/node/music_rnn');
const core = require('@magenta/music/node/core');
const dayjs = require('dayjs');
const fs = require('fs');


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

let rnn = new mrnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn')

rnn.initialize();

const rnn_steps = 20;
const rnn_temperature = 1.5;

let quantized = core.sequences.quantizeNoteSequence(TWINKLE_TWINKLE, 4);
console.log(quantized.notes);

function saveNotes(noteSequence) {
    noteSequence.notes.forEach(note => note.velocity = 100);
    const outFilePath = 'data/output-' + dayjs().format('YYYYMMDDHHmmss') + '.mid';
    console.log('Saving the file to ' + outFilePath);
    let bytes = core.sequenceProtoToMidi(noteSequence);
    fs.writeFileSync(outFilePath, Buffer.from(bytes));
}

async function runModel() {
    let startTime = performance.now();
    let newSequence = await rnn.continueSequence(quantized, rnn_steps, rnn_temperature);
    let deltaTime = (performance.now() - startTime) / 1000.0;
    console.log('It took ' + deltaTime + ' seconds to autofill');
    console.log(newSequence.notes);
    saveNotes(newSequence);
}

try {
    runModel();
} catch {
    console.log('Uh oh');
}
