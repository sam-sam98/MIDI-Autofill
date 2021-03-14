import pandas as pd
import plotly.express as px
import plotly
import plotly.graph_objects as go
from plotly.subplots import make_subplots


CASES = [
    'StepsAndDuration',
    'Duration',
    'Steps',
    'Notes',
    'Temperature'
]

X_AXIS_TITLES = [
    'Number of steps and duration (seconds)',
    'Input melody duration (seconds)',
    'Total generation steps',
    'Input notes',
    'RNN Temperature',
]

CHECKPOINTS = ['basic_rnn', 'melody_rnn', 'drum_kit_rnn']

CSV_FILES = [
    '../magenta-trials/benchmarks/linear_basic_rnn.csv',
    '../magenta-trials/benchmarks/linear_melody_rnn.csv',
    '../magenta-trials/benchmarks/linear_drum_kit_rnn.csv',
]

csvs = list(map(pd.read_csv, CSV_FILES))


def extract_cases(csv):
    return list(map(lambda bench: csv[csv['name'].str.contains('^' + bench + ' ')], CASES))


all_cases = list(map(extract_cases, csvs))

# grouped_cases = [case for case in all_cases]
grouped_cases = [[] for i in CASES]
# There is probably some cute functional way to do this that my brain is too fried
# to think of.
for checkpoint_cases in all_cases:
    for (i, case) in enumerate(checkpoint_cases):
        grouped_cases[i].append(case)


def create_x_axis(df):
    df['x'] = df['name'].apply(lambda name: float(name.split()[1]))


def create_bench_col(df, checkpoint):
    df.insert(0, 'checkpoint', checkpoint)


for case_set in all_cases:
    for case in case_set:
        create_x_axis(case)

layout = go.Layout(autosize=True, margin={'l': 0, 'r': 0, 't': 0, 'b': 0})

fig = make_subplots(len(CASES), 1, y_title='Generation time (seconds)')

fig.update_layout(font_family="Helvetica")

colors = [plotly.colors.DEFAULT_PLOTLY_COLORS[i] for i in [0, 3, 2]]

for (i, benchmark) in enumerate(grouped_cases):
    for (b, color, checkpoint) in zip(benchmark, colors, CHECKPOINTS):
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

for (i, title) in enumerate(X_AXIS_TITLES):
    fig.update_xaxes(title_text=title, row=i+1, col=1)

fig.write_image('../final-design-document/image/perf.pdf', height=1500)
