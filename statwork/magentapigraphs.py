import pandas as pd
import plotly.express as px
import plotly
import plotly.graph_objects as go
from plotly.subplots import make_subplots

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


checkpoints = ['basic_rnn', 'melody_rnn', 'drum_kit_rnn']

durations = [basic_rnn_duration, melody_rnn_duration, drum_kit_rnn_duration]
steps = [basic_rnn_steps, melody_rnn_steps, drum_kit_rnn_steps]
notes = [basic_rnn_notes, melody_rnn_notes, drum_kit_rnn_notes]

basic_rnn = [basic_rnn_duration, basic_rnn_steps, basic_rnn_notes]
melody_rnn = [melody_rnn_duration, melody_rnn_steps, melody_rnn_notes]
drum_kit_rnn = [drum_kit_rnn_duration, drum_kit_rnn_steps, drum_kit_rnn_notes]

everything = durations + steps + notes

for thing in everything:
    create_x_axis(thing)

for (group, checkpoint) in zip([basic_rnn, melody_rnn, drum_kit_rnn], checkpoints):
    for rnn in group:
        create_bench_col(rnn, checkpoint)

layout = go.Layout(autosize=True, margin={'l': 0, 'r': 0, 't': 0, 'b': 0})

fig = make_subplots(3, 1, y_title='Generation time (seconds)')

fig.update_layout(font_family="Helvetica")

colors = [plotly.colors.DEFAULT_PLOTLY_COLORS[i] for i in [0, 3, 2]]

for (i, benchmark) in enumerate([durations, steps, notes]):
    for (b, color, checkpoint) in zip(benchmark, colors, checkpoints):
        fig.append_trace(
            go.Scatter(
                x=b['x'],
                y=b['mean'],
                line=dict(color=color),
                name=checkpoint,
                legendgroup='group',
                showlegend=(i == 0)
            ),
            col=1,
            row=i+1,
        )

fig.update_xaxes(title_text="Input duration (seconds)", row=1, col=1)
fig.update_xaxes(title_text="Generation steps", row=2, col=1)
fig.update_xaxes(title_text="Number of input notes", row=3, col=1)

fig.write_image('../final-design-document/image/perf.pdf', height=800)
