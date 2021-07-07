import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Button,
  Select,
  MenuItem,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  Snackbar,
} from "@material-ui/core";

import { Alert } from "@material-ui/lab";

import MainContent from "./maincontent.jsx";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      connectionStatus: "loading",
      ports: undefined,
      selectedPort: 0,
    };
  }

  componentDidMount() {
    console.log("componentDidMount");
    window.api.on("app-connection-result", (_event, connectionStatus) => {
      this.setState({
        connectionStatus,
      });
    });

    window.api.send("app-ready");
  }

  render() {
    const retryConnection = () => {
      console.log("Retrying connection..");
      this.setState({
        connectionStatus: "loading",
      });
      window.api.send("retry-connection");
    };
    if (this.state.connectionStatus == "good") {
      return <MainContent />;
    } else if (this.state.connectionStatus == "loading") {
      return <CircularProgress />;
    } else if (this.state.connectionStatus == "error") {
      return (
        <div>
          <Alert severity="error">
            Failed to connect to MIDI Device. Please double check connection.
          </Alert>
          <Button onClick={retryConnection}>Retry</Button>
        </div>
      );
    }
  }
}

function render() {
  ReactDOM.render(<App></App>, document.getElementById("app-container"));
}

render();
