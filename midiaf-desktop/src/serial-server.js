//import SerialPort from 'serialport';
const SerialPort = require("serialport");

class SerialServer {
  async init() {
    const ports = await SerialPort.list();
    console.log("Ports: ");
    console.log(JSON.stringify(ports, null, " "));

    this.port = ports.find(
      (port) =>
        port.manufacturer == "Silicon Labs" &&
        port.vendorId == "10C4" &&
        port.productId == "EA60"
    );

    if (port == undefined) {
      this.connected = false;
      throw new Error("Device not connected");
    }

    this.connected = true;
  }
}

module.exports = SerialServer;
