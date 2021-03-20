module.exports = function(backend) {
  const b = require('./backends/' + backend)
  return {
    ...b
  }
}
