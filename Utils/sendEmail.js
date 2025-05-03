// Utils/sendEmail.js
const nodemailer = require('nodemailer');

// Function to send email
const sendEmail = async (to, subject, text) => {
  // Create a transporter object using SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-email-password',
    },
  });

  // Email options
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: to,
    subject: subject,
    text: text,
  };

  // Send email
  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendEmail;
