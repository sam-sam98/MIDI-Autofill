import * as React from "react";
import {
  Typography,
  Box,
  Container,
  Grid,
  List,
  ListItem,
  CircularProgress,
  Checkbox,
  ListItemIcon,
  ListItemText,
  Paper,
  Button,
  FormControlLabel,
} from "@material-ui/core";

export default class MainContent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "loading",
      files: [],
      checkedFiles: [],
    };
  }

  componentDidMount() {
    window.api.on("list-files-result", (_event, files) => {
      let checkedFiles = files.map((_) => false);
      this.setState({
        status: "loaded",
        files,
        checkedFiles,
      });
    });

    window.api.send("list-files");
  }

  render() {
    let listContent = <CircularProgress align="center" />;

    const handleChecked = (value) => () => {
      let checkedFiles = this.state.checkedFiles;
      checkedFiles[value] = !checkedFiles[value];
      this.setState({
        checkedFiles,
      });
    };

    const saveFiles = () => {
      let filesToSave = this.state.files.filter(
        (_file, index) => this.state.checkedFiles[index]
      );
      console.log(filesToSave);
      window.api.send("save-files", filesToSave);
    };

    if (this.state.status == "loaded") {
      listContent = (
        <List>
          {this.state.files.map((file, index) => (
            <ListItem
              key={index}
              role={undefined}
              dense
              button
              onClick={handleChecked(index)}
            >
              <ListItemIcon>
                <Checkbox checked={this.state.checkedFiles[index]} />
              </ListItemIcon>
              <ListItemText>{file}</ListItemText>
            </ListItem>
          ))}
        </List>
      );
    }

    return (
      <Grid container spacing={4} style={{ maxHeight: "100%" }}>
        <Grid item xs={12}>
          <Typography variant="h4" align="center">
            MIDI Files
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Paper style={{ maxHeight: 400, overflow: "auto" }}>
            {listContent}
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Grid container item xs={12} justifyContent="flex-end" m={2}>
            <Button
              variant="contained"
              align="right"
              color="primary"
              flex={1}
              m={2}
              onClick={saveFiles}
            >
              Save Selected
            </Button>
          </Grid>
        </Grid>
      </Grid>
    );
  }
}
