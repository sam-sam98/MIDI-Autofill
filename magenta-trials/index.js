require('@tensorflow/tfjs-node');
const { performance } = require('perf_hooks');
const mrnn = require('@magenta/music/node/music_rnn');
const mvae = require('@magenta/music/node/music_vae');
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


const rnn_steps = 40;
const rnn_temperature = 1.5;
const vae_temperature = 1.5;

const DUPLICATIONS = 200;

let sequences = [];

for (let i = 0; i < DUPLICATIONS; i++) {
    sequences.push(TWINKLE_TWINKLE);
}

let large_twinkle_twinkle = core.sequences.concatenate(sequences);

console.log(large_twinkle_twinkle);

let quantized = core.sequences.quantizeNoteSequence(large_twinkle_twinkle, 4);

console.log(quantized.notes);

function saveNotes(noteSequence) {
    noteSequence.notes.forEach(note => note.velocity = 100);
    const outFilePath = 'data/output-' + dayjs().format('YYYYMMDDHHmmss') + '.mid';
    console.log('Saving the file to ' + outFilePath);
    let bytes = core.sequenceProtoToMidi(noteSequence);
    fs.writeFileSync(outFilePath, Buffer.from(bytes));
}

async function runRNNModel() {
    console.log("Running RNN Model...")
    let rnn = new mrnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
    rnn.initialize();
    let startTime = performance.now();
    let newSequence = await rnn.continueSequence(quantized, rnn_steps, rnn_temperature);
    let deltaTime = (performance.now() - startTime) / 1000.0;
    console.log('It took ' + deltaTime + ' seconds to autofill');
    let melody = core.sequences.concatenate([quantized, newSequence]);
    console.log(newSequence.notes);
    saveNotes(melody);
}

async function runVAEModel() {
    console.log("Running VAE Model...")
    let vae = new mvae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2');
    await vae.initialize();
    let startTime = performance.now();
    let newSequence = await vae.sample(1, vae_temperature);
    let deltaTime = (performance.now() - startTime) / 1000.0;
    console.log('It took ' + deltaTime + ' seconds to generate a new sequence');
    console.log(newSequence[0].notes);
    saveNotes(newSequence[0]);
}

async function runModels() {
    await runRNNModel();
    await runVAEModel();
}

try {
    runModels();
} catch {
    console.log('Uh oh');
}
