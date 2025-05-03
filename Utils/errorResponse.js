// utils/errorResponse.js

class ErrorResponse extends Error {
    constructor(message, statusCode) {
      super(message); // Call the parent Error constructor
      this.statusCode = statusCode; // HTTP status code
      Error.captureStackTrace(this, this.constructor); // Capture the stack trace for debugging
    }
  }
  
  module.exports = ErrorResponse;
  