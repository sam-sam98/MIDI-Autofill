const SerialPort = require("serialport");

class SerialServer {
  constructor() {
    this.callbacks = {};
  }

  async init() {
    const ports = await SerialPort.list();
    console.log("Ports: ");
    console.log(JSON.stringify(ports, null, " "));

    // Find a serial COM port which matches our ADAFruit adapter.
    const targetPort = ports.find(
      (port) =>
        port.manufacturer == "Silicon Labs" &&
        port.vendorId == "10C4" &&
        port.productId == "EA60"
    );

    if (targetPort == undefined) {
      this.connected = false;
      throw new Error("Device not connected");
    }

    this.port = new SerialPort(targetPort.path, { baudRate: 115200 });
    const parser = this.port.pipe(
      new SerialPort.parsers.Readline({ delimiter: "\n" })
    );

    // TODO: Send some sort of handshake message here.
    //this.port.on("open", () => {});

    parser.on("data", (message) => {
      let json = JSON.parse(message);
      let message_type = json["message_type"];
      if (message_type == "list_files_response") {
        let files = json["files"];
        this.callbacks["list_files_response"](files);
      } else if (message_type == "fetch_file_response") {
        let file = json["file"];
        let data = json["data"];
        console.log("Received file: " + file);
        console.log("File data:");
        console.log(data);
        this.callbacks["fetch_file_response"](json);
      }
    });

    this.parser = parser;

    this.connected = true;
  }

  _sendJSON(message) {
    this.port.write(JSON.stringify(message) + "\n");
  }

  // Request the list of midi files. The result goes through the
  // "list_files_response" callback.
  async listFiles() {
    let message = {
      message_type: "list_files",
    };
    this._sendJSON(message);
  }

  async fetchFile(file) {
    let message = {
      message_type: "fetch_file",
      file: file,
    };
    this._sendJSON(message);
  }

  on(channel, func) {
    console.log("On " + channel + " is " + func.toString());
    this.callbacks[channel] = func;
  }
}

module.exports = SerialServer;
