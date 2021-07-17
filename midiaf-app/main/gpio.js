const rpio = require('rpio')

module.exports = {
  initialize: (callbacks) => {
    this.callbacks = callbacks;

    rpio.open(3, rpio.INPUT, rpio.PULL_DOWN)
    rpio.open(5, rpio.INPUT, rpio.PULL_DOWN)
    rpio.open(7, rpio.INPUT, rpio.PULL_UP)
    rpio.open(27, rpio.INPUT, rpio.PULL_UP)

    record = (button) => {
      if (rpio.read(button)) {
        console.log("Received RECORD GPIO")
        this.callbacks.record()
      }
    }

    octaveUp = (button) => {
      if (rpio.read(button)) {
        console.log("Received OCTAVEUP GPIO")
        this.callbacks.octaveUp()
      }
    }

    octaveDown = (button) => {
      if (rpio.read(button)) {
        console.log("Received OCTAVEDOWN GPIO")
        this.callbacks.octaveDown()
      }
    }

    play = (button) => {
      if (!rpio.read(button)) {
        console.log("Received PLAY GPIO")
        this.callbacks.play()
      }
    }


    rpio.poll(3, record)
    rpio.poll(5, octaveUp)
    rpio.poll(7, octaveDown)
    rpio.poll(27, play)
  }
}