const mongoose = require('mongoose');

const connectDB = async () => {
  console.log('Mongo URI:', process.env.MONGO_URI);  // Log the value of MONGO_URI
  const conn = await mongoose.connect(process.env.MONGO_URI); // Removed deprecated options

  console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
};

module.exports = connectDB;
