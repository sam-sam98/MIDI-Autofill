import serial
import json
import rtmidi

midiout = rtmidi.MidiOut()
print(midiout.get_ports())
midiout.open_port(0)
#midiout.open_virtual_port("MIDI Autofill")

try:
    with serial.Serial('COM8', timeout=10) as ser:
        # list_files_request = json.dumps({
        #     "message_type": "list_files"
        # }) + '\n'
        list_files_request = b"{\"message_type\": \"list_files\"}\n\n"
        print(len(list_files_request))
        request_bytes = list_files_request
        ser.write(request_bytes)
        # response = ser.readline()
        # print(ser.write(b"hello\n"))
        # i = 0
        # status_byte = 0
        # pitch = 0
        # velocity = 0
        # while i < 3:
        #     in_byte = ser.read()
        #     if i == 0 and (in_byte == 80 or in_byte == 90):
        #         status_byte = in_byte
        #         print("Received status byte: ", status_byte)
        #         i = 1
        #     elif i == 1:
        #         pitch = in_byte
        #         i = 2
        #     elif i == 2:
        #         velocity = in_byte
        #         i = 3
        # message = [status_byte, pitch, velocity]
        # midiout.send_message(message)


except InterruptedError:
    print("Stopping...")
