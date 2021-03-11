require('@tensorflow/tfjs-node');
const mrnn = require('@magenta/music/node/music_rnn');
const mvae = require('@magenta/music/node/music_vae');
const core = require('@magenta/music/node/core');
const dayjs = require('dayjs');
const fs = require('fs');
const b = require('benny');
const Papa = require('papaparse');


TWINKLE_TWINKLE = {
    notes: [{
            pitch: 60,
            startTime: 0.0,
            endTime: 0.5
        },
        {
            pitch: 60,
            startTime: 0.5,
            endTime: 1.0
        },
        {
            pitch: 67,
            startTime: 1.0,
            endTime: 1.5
        },
        {
            pitch: 67,
            startTime: 1.5,
            endTime: 2.0
        },
        {
            pitch: 69,
            startTime: 2.0,
            endTime: 2.5
        },
        {
            pitch: 69,
            startTime: 2.5,
            endTime: 3.0
        },
        {
            pitch: 67,
            startTime: 3.0,
            endTime: 4.0
        },
        {
            pitch: 65,
            startTime: 4.0,
            endTime: 4.5
        },
        {
            pitch: 65,
            startTime: 4.5,
            endTime: 5.0
        },
        {
            pitch: 64,
            startTime: 5.0,
            endTime: 5.5
        },
        {
            pitch: 64,
            startTime: 5.5,
            endTime: 6.0
        },
        {
            pitch: 62,
            startTime: 6.0,
            endTime: 6.5
        },
        {
            pitch: 62,
            startTime: 6.5,
            endTime: 7.0
        },
        {
            pitch: 60,
            startTime: 7.0,
            endTime: 8.0
        },
    ],
    totalTime: 8
};


const rnn_temperature = 1.5;
const vae_temperature = 1.5;

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
    return core.sequences.quantizeNoteSequence(sequence, quantization);
}

function randomNoteCases(model, noteRange, durations, steps, sizes) {
    return durations.map((duration) => {
        return steps.map((step) => {
            return sizes.map((size) => {
                return b.add(`${size} notes ${step} steps ${duration} duration`, async () => {
                    let randomNotes = randomizeQuantizedSequence(size, duration, 4, noteRange);
                    return async () => {
                        await model.continueSequence(randomNotes, step, rnn_temperature);
                    };
                });
            });
        })
    }).flat(Infinity);
}

function twinkleRepetitions(model, repetitions, steps) {
    return steps.map((step) => {
        return repetitions.map((repetition) => {
            return b.add(`Twinkle ${repetition} repetitions ${step} steps`, async () => {
                //let randomNotes = randomizeQuantizedSequence(size, duration, 4, noteRange);
                let sequences = Array(repetition).fill(TWINKLE_TWINKLE);
                let sequence = core.sequences.quantizeNoteSequence(
                    core.sequences.concatenate(sequences),
                    4
                );
                return async () => {
                    await model.continueSequence(sequence, step, rnn_temperature);
                };
            });
        });
    }).flat(Infinity);
}

async function runRnnSuite(name, model, range) {
    await model.initialize();
    return b.suite(name,
        b.add('Twinkle', async () => {
            const rnn_steps = 80;
            let twinkle = core.sequences.quantizeNoteSequence(TWINKLE_TWINKLE, 4);
            await model.continueSequence(twinkle, rnn_steps, rnn_temperature);
            return async () => {
                await model.continueSequence(twinkle, rnn_steps, rnn_temperature);
            };
        }),
        ...randomNoteCases(model, range, [8, 16, 32, 64, 128], [16], [16]), // Increasing duration
        ...randomNoteCases(model, range, [8], [16, 32, 64, 128], [16]), // Increasing generation steps
        ...randomNoteCases(model, range, [8], [16], [16, 32, 64, 128]), // Increasing random note size
        ...twinkleRepetitions(model, [2, 4, 8], [32]),
        b.save({
            file: name,
            folder: 'benchmarks',
            details: true,
            format: 'csv'
        }),
    );
}

// Write a summary of each suite to benchmarks/summary.csv
async function createSummaryCSV(modelCheckpoints) {
    const papaPromise = (importFile) => new Promise((resolve, reject) => {
        const file = fs.createReadStream(importFile);
        Papa.parse(file, {
            //header: true,
            complete: function (results) {
                resolve(results);
            },
            error: function (error) {
                reject(error);
            }
        });
    });

    let csvResults = [];
    for (const modelCheckpoint of modelCheckpoints) {
        // Here lies spaghetti...
        let wroteModelName = false;
        csvResults.push((await Promise.all(
            modelCheckpoint.checkpoints.map(checkpoint => papaPromise(`benchmarks/${checkpoint}.csv`))
        )).map((checkpoint, index) => {
            // Remove the header
            checkpoint.data.splice(0, 1);
            // Remove fields we don't need
            checkpoint.data.forEach((data) => {
                [1, 2, 3, 5, 9, 11, 12, 13, 14].reverse().forEach(index => data.splice(index, 1));
            });
            // Add a field for the checkpoint name
            checkpoint.data.forEach((data, cidx) => data.splice(0, 0, cidx == 0 ? modelCheckpoint.checkpoints[index] : ''));
            // Add a field for the model name.
            // Only fill out the model name on first row for aesthetics.
            checkpoint.data.forEach((data, index) => data.splice(0, 0, (!wroteModelName && index == 0) ? modelCheckpoint.model : ''));
            wroteModelName = true;
            console.log(checkpoint);
            return checkpoint;
        }).flat());
    }

    const header = ['Model', 'Checkpoint', 'Benchmark', 'Samples', 'Min', 'Max', 'Mean', 'Std. Dev'];
    let summaryData = [header];

    for (let csv of csvResults) {
        summaryData = summaryData.concat(csv.map(item => item.data).flat());
    }

    let summary = {
        data: summaryData,
        meta: csvResults[0][0].meta,
    };

    let outCsv = Papa.unparse(summary);

    console.log(JSON.stringify(summaryData, undefined, 2));
    console.log(outCsv);

    fs.writeFileSync('benchmarks/summary.csv', outCsv);
}

(async () => {
    await runRnnSuite(
        'basic_rnn',
        new mrnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn'),
        [48, 84]
    );
    await runRnnSuite(
        'melody_rnn',
        new mrnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn'),
        [0, 127]
    );
    await runRnnSuite(
        'drum_kit_rnn',
        new mrnn.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn'),
        [0, 8]
    );

    let mel_4bar_small_q2 = new mvae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2');
    await mel_4bar_small_q2.initialize();

    await b.suite('musicvae',
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
            file: 'mel_4bar_small_q2',
            folder: 'benchmarks',
            details: true,
            format: 'csv'
        }),
    );

    await createSummaryCSV(
        [{
                model: 'MusicRNN',
                checkpoints: ['basic_rnn', 'melody_rnn', 'drum_kit_rnn']
            },
            {
                model: 'MusicVAE',
                checkpoints: ['mel_4bar_small_q2']
            },
        ]
    );
})();