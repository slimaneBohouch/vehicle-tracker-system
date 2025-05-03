// middleware/error.js
const ErrorResponse = require('../Utils/errorResponse'); // Correct the import path if needed

const errorHandler = (err, req, res, next) => {
  let error = { ...err }; // Clone the error object to prevent mutation of the original error
  error.message = err.message; // Assign the error message

  // Log error for debugging purposes in development
  console.error(err);

  // Mongoose bad ObjectId (Invalid MongoDB ObjectId)
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404); // Create a new ErrorResponse with 404 status code
  }

  // Mongoose duplicate key error (when a duplicate value is inserted in a unique field)
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400); // Set 400 for bad request
  }

  // Mongoose validation error (when the validation of document fails)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', '); // Aggregate all validation messages
    error = new ErrorResponse(message, 400); // Set 400 for bad request
  }

  // If the error is not handled by the above checks, use a default error handler
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error', // Default message for server error
  });
};

module.exports = errorHandler;
