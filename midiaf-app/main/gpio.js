const rpio = require('rpio')

module.exports = {
  initialize: (callbacks) => {
    this.callbacks = callbacks;

    rpio.open(3, rpio.INPUT, rpio.PULL_DOWN)
    rpio.open(5, rpio.INPUT, rpio.PULL_DOWN)
    rpio.open(29, rpio.INPUT, rpio.PULL_DOWN)
    rpio.open(31, rpio.INPUT, rpio.PULL_DOWN)

    function pollButtons(button) {
      if (rpio.read(button)) {
        console.log(`Recieved GPIO on port ${button}`)
        switch (button) {
          case 3:
            this.callbacks.record()
            break
          case 5:
            this.callbacks.octaveUp()
            break
          case 29:
            this.callbacks.octaveDown()
            break
          case 31:
            this.callbacks.play()
            break
        }
      }
    }

    function record(button) {
      if (gpio.read(button)) {
        console.log("Received RECORD GPIO")
        this.callbacks.record()
      }
    }

    function octaveUp(button) {
      if (gpio.read(button)) {
        console.log("Received OCTAVEUP GPIO")
        this.callbacks.octaveUp()
      }
    }

    function octaveDown(button) {
      if (gpio.read(button)) {
        console.log("Received OCTAVEDOWN GPIO")
        this.callbacks.octaveDown()
      }
    }

    function play(button) {
      if (gpio.read(button)) {
        console.log("Received PLAY GPIO")
        this.callbacks.play()
      }
    }


    rpio.poll(3, record)
    rpio.poll(5, octaveUp)
    rpio.poll(29, octaveDown)
    rpio.poll(31, play)
  }
}