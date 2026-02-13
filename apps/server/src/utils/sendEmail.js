const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const message = {
    from: `"${process.env.FROM_NAME}" <${process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('SMTP Error Details:');
    console.error(`- Response: ${error.response}`);
    console.error(`- Code: ${error.code}`);
    console.error(`- Command: ${error.command}`);
    throw error;
  }
};

module.exports = sendEmail;
