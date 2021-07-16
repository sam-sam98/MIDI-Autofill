const SerialPort = require('serialport')
const fs = require('fs');
const path = require('path');

class MIDIOutput {
    constructor(saveDataDir) {
        this.saveDataDir = saveDataDir
    }

    async initialize() {
        const ports = await SerialPort.list()
        console.log("Ports: ")
        console.log(JSON.stringify(ports, null, " "))

        // We don't get anything fancy like vendor/product ID
        // for this one, so just look for the one that isn't the arduino
        const targetPort = ports.find(
            (port) =>
                port.manufacturer != "Arduino LLC"
        )

        this.port = new SerialPort(targetPort.path, {
            baudRate: 115200,
        })
        this.port.on('open', () => this.port.flush())
        const parser = new SerialPort.parsers.Readline()
        this.port.pipe(parser)
        parser.on('data', this.onData.bind(this))
        console.log("Initialized MIDI serial connection")
    }

    onData(message) {
        let sendJSONMessage = (message) => {
            let response = JSON.stringify(message) + "\n";
            this.port.write(response)
        }

        console.log("Received serial message")
        console.log(message)
        let json = JSON.parse(message)
        let message_type = json['message_type']
        if (message_type == 'list_files') {
            let files = fs.readdirSync(this.saveDataDir)
            files = files.filter(file => file.endsWith('.mid'))
            let message = {
                message_type: 'list_files_response',
                files: files,
            }
            sendJSONMessage(message)
        }
        else if (message_type == 'fetch_file') {
            let filename = json['file']
            let filepath = path.join(this.saveDataDir, filename)
            const data = fs.readFileSync(filepath, { encoding: 'base64' })
            sendJSONMessage({
                message_type: 'fetch_file_response',
                file: filename,
                data: data,
            })
        }
    }

    sendNoteOn(pitch, velocity) {
        const buffer = new ArrayBuffer(3)
        buffer[0] = 0x90;
        buffer[1] = pitch;
        buffer[2] = velocity;
        this.port.write(buffer)
    }

    sendNoteOff(pitch, velocity) {
        const buffer = new ArrayBuffer(3)
        buffer[0] = 0x80;
        buffer[1] = pitch;
        buffer[2] = velocity;
        this.port.write(buffer)
    }
}

module.exports = MIDIOutput