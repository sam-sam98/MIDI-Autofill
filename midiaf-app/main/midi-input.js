const SerialPort = require('serialport')

class MIDIInputServer {
	MIDIInputServer() {
		this.keyCallback = null;
	}

	async initialize(keyCallback, volumeCallback) {
		const ports = await SerialPort.list()
		console.log("Ports: ")
		console.log(JSON.stringify(ports, null, " "))

		// Find a serial COM port which matches our ADAFruit adapter.
		const targetPort = ports.find(
			(port) =>
				port.manufacturer == "Arduino LLC" &&
				port.vendorId == "2341" &&
				port.productId == "0058"
		)

		if (targetPort == undefined) {
			throw new Error("Multiplexor not plugged in")
		}

		const serialPort = new SerialPort(targetPort.path, {
			baudRate: 9600
		})

		const parser = new SerialPort.parsers.Readline({
			delimiter: '\r\n'
		})
		serialPort.pipe(parser)
		parser.on('data', this.onData.bind(this))
		this.keyCallback = keyCallback;
		this.volumeCallback = volumeCallback;
	}

	onData(message) {
		try {
			let parts = message.split(' ')

			let status = parts[0];

			if (status == 'VOL') {
				let volume = parseInt(parts[1]);
				this.volumeCallback(volume);
			}
			else {
				let key = parseInt(parts[1]);
				let velocity = parseFloat(parts[2]);

				// Sanity checks
				if (velocity == NaN || (status != 'ON' && status != 'OFF') || key < 0 || key > 29) {
					throw new Error();
				}

				console.log("Received MIDI input: ", status, key, velocity)

				this.keyCallback(status, key, velocity)
			}

		} catch {
			console.log('Received garbage from MIDI input: ', message)
		}
	}
}

module.exports = MIDIInputServer;