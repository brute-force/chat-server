// custom error since socketio doesn't return actual error objects
class UserNotFoundError extends Error {
  constructor (message) {
    super(message);
    this.name = 'UserNotFoundError';
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

module.exports = UserNotFoundError;
