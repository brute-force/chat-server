// custom error since socketio doesn't return actual error objects
class SocketError extends Error {
  constructor (message) {
    super(message);
    this.name = 'SocketError';
    this.message = message;
  }

  toJSON () {
    return {
      name: this.name,
      message: this.message,
      stacktrace: this.stack
    };
  }
}

module.exports = SocketError;
