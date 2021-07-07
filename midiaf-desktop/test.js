const SerialPort = require('serialport')

const serialPort = new SerialPort('COM8', { baudRate: 115200 })
const parser = serialPort.pipe(new SerialPort.parsers.Readline({ delimiter: '\n' }))

function sendJSON(message) {
    serialPort.write(JSON.stringify(message) + '\n')
}

serialPort.on('open', () => {
    let message = {
        message_type: "list_files"
    }
    sendJSON(message)
})

parser.on('data', (message) => {
    let json = JSON.parse(message)
    let message_type = json['message_type']
    if (message_type == 'list_files_response') {
        let files = json['files'];
        for (let file of files) {
            let message = {
                message_type: "fetch_file",
                file: file,
            }
            sendJSON(message)
        }
    }
    else if (message_type == 'fetch_file_response') {
        let file = json['file']
        let data = json['data']
        console.log("Received file: " + file)
        console.log("File data:")
        console.log(data)
    }
})