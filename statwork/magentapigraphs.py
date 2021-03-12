import pandas as pd
import plotly.express as px

basic_rnn_csv = pd.read_csv(
    '../magenta-trials/benchmarks/linear_basic_rnn.csv')
melody_rnn_csv = pd.read_csv(
    '../magenta-trials/benchmarks/linear_melody_rnn.csv')
drum_kit_rnn_csv = pd.read_csv(
    '../magenta-trials/benchmarks/linear_drum_kit_rnn.csv')


def extract_cases(csv):
    return map(lambda bench: csv[csv['name'].str.contains(bench)], ['Duration', 'Steps', 'Notes'])


[basic_rnn_duration, basic_rnn_steps,
    basic_rnn_notes] = extract_cases(basic_rnn_csv)
[melody_rnn_duration, melody_rnn_steps,
    melody_rnn_notes] = extract_cases(melody_rnn_csv)
[drum_kit_rnn_duration, drum_kit_rnn_steps,
    drum_kit_rnn_notes] = extract_cases(drum_kit_rnn_csv)


def create_x_axis(df):
    df['x'] = df['name'].apply(lambda name: int(name.split()[1]))


def create_bench_col(df, checkpoint):
    df.insert(0, 'checkpoint', checkpoint)


create_x_axis(basic_rnn_duration)
create_x_axis(melody_rnn_duration)
create_x_axis(drum_kit_rnn_duration)
create_x_axis(basic_rnn_steps)
create_x_axis(melody_rnn_steps)
create_x_axis(drum_kit_rnn_steps)
create_x_axis(basic_rnn_notes)
create_x_axis(melody_rnn_notes)
create_x_axis(drum_kit_rnn_notes)

create_bench_col(basic_rnn_duration, 'basic_rnn')
create_bench_col(melody_rnn_duration, 'melody_rnn')
create_bench_col(drum_kit_rnn_duration, 'drum_kit_rnn')
create_bench_col(basic_rnn_steps, 'basic_rnn')
create_bench_col(melody_rnn_steps, 'melody_rnn')
create_bench_col(drum_kit_rnn_steps, 'drum_kit_rnn')
create_bench_col(basic_rnn_notes, 'basic_rnn')
create_bench_col(melody_rnn_notes, 'melody_rnn')
create_bench_col(drum_kit_rnn_notes, 'drum_kit_rnn')


duration = pd.concat(
    [basic_rnn_duration, melody_rnn_duration, drum_kit_rnn_duration])
steps = pd.concat([basic_rnn_steps, melody_rnn_steps, drum_kit_rnn_steps])
notes = pd.concat([basic_rnn_notes, melody_rnn_notes, drum_kit_rnn_notes])

fig = px.line(duration,
              x="x",
              y="mean",
              color='checkpoint',
              labels={
                  'x': 'Input melody duration (seconds)',
                  'mean': 'Autocomplete time (seconds)'
              },
              width=500,
              height=400)
fig = fig.for_each_trace(lambda t: t.update(name=t.name.replace("=", ": ")))
fig.update_layout(font_family="Helvetica")
fig.write_image('perfwrtduration.pdf')

fig = px.line(steps,
              x="x",
              y="mean",
              color='checkpoint',
              labels={
                  'x': 'Generation steps',
                  'mean': 'Autocomplete time (seconds)'
              },
              width=500,
              height=400)
fig.update_layout(font_family="Helvetica")
fig = fig.for_each_trace(lambda t: t.update(name=t.name.replace("=", ": ")))
fig.write_image("perfwrtsteps.pdf")

fig = px.line(notes,
              x="x",
              y="mean",
              color='checkpoint',
              labels={
                  'x': 'Number of input notes',
                  'mean': 'Generation time (seconds)'
              },
              width=500,
              height=400)
fig.update_layout(font_family="Helvetica")
fig = fig.for_each_trace(lambda t: t.update(name=t.name.replace("=", ": ")))
fig.write_image("perfwrtnotes.pdf")
