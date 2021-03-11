require('@tensorflow/tfjs-node');
const { performance } = require('perf_hooks');
const mrnn = require('@magenta/music/node/music_rnn');
const mvae = require('@magenta/music/node/music_vae');
const core = require('@magenta/music/node/core');
const dayjs = require('dayjs');
const fs = require('fs');
const b = require('benny');


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

function saveNotes(noteSequence) {
    noteSequence.notes.forEach(note => note.velocity = 100);
    const outFilePath = 'data/output-' + dayjs().format('YYYYMMDDHHmmss') + '.mid';
    console.log('Saving the file to ' + outFilePath);
    let bytes = core.sequenceProtoToMidi(noteSequence);
    fs.writeFileSync(outFilePath, Buffer.from(bytes));
}

function randomizeQuantizedSequence(numNotes, duration, quantization, range) {
    let notes = [];
    let [lowNote, highNote] = range;
    for (let i = 0; i < numNotes; i++) {
        let startTime = Math.random() * duration;
        let endTime = startTime + Math.random() * (duration - startTime);
        notes.push({
            pitch: lowNote + Math.floor(Math.random() * (highNote - lowNote)),
            startTime: startTime,
            endTime: endTime,
        });
    }
    let sequence = {
        notes: notes,
        totalTime: duration,
    };
    console.log(sequence);
    return core.sequences.quantizeNoteSequence(sequence, quantization);
}

function runRnnSuite(name, model, range) {
    return b.suite(name,
        b.add('TwinkleTwinkle', async () => {
            let twinkle = core.sequences.quantizeNoteSequence(TWINKLE_TWINKLE, 4);
            await model.continueSequence(twinkle, rnn_steps, rnn_temperature);
            return async () => {
                await model.continueSequence(twinkle, rnn_steps, rnn_temperature);
            };
        }),
        b.add('Random 10 notes', async () => {
            let randomNotes = randomizeQuantizedSequence(10, 8, 4, range);
            return async () => {
                await model.continueSequence(randomNotes, rnn_steps, rnn_temperature);
            };
        }),
        b.add('Random 100 notes', async () => {
            let randomNotes = randomizeQuantizedSequence(100, 8, 4, range);
            return async () => {
                await model.continueSequence(randomNotes, rnn_steps, rnn_temperature);
            };
        }),
        b.add('Random 1000 notes', async () => {
            let randomNotes = randomizeQuantizedSequence(1000, 8, 4, range);
            return async () => {
                await model.continueSequence(randomNotes, rnn_steps, rnn_temperature);
            };
        }),
        b.save({
            file: name,
            folder: 'benchmarks',
            details: true,
            format: 'csv'
        }),
    );
}

runRnnSuite(
    'basic_rnn',
    new mrnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn'),
    [48, 84]
);
runRnnSuite(
    'melody_rnn',
    new mrnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn'),
    [0, 127]
);
runRnnSuite(
    'drum_kit_rnn',
    new mrnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn'),
    [0, 8]
);

(async () => {
    let mel_4bar_small_q2 = new mvae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2');
    await mel_4bar_small_q2.initialize();

    b.suite('MusicVAE',
        b.add('10 Samples', async () => {
            return async () => {
                await mel_4bar_small_q2.sample(10, vae_temperature)
            };
        }),
        b.add('100 Samples', async () => {
            return async () => {
                await mel_4bar_small_q2.sample(100, vae_temperature)
            };
        }),
        b.add('1000 Samples', async () => {
            return async () => {
                await mel_4bar_small_q2.sample(1000, vae_temperature)
            };
        }),
        b.save({
            file: 'musicvae',
            folder: 'benchmarks',
            details: true,
            format: 'csv'
        }),
    );
})();