const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const testEmail = async () => {
  console.log('--- SMTP Diagnostic Tool ---');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_EMAIL:', process.env.SMTP_EMAIL);
  console.log(
    'SMTP_PASSWORD:',
    process.env.SMTP_PASSWORD ? '********' : 'MISSING',
  );
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('---------------------------');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('Testing connection...');
    await transporter.verify();
    console.log('SUCCESS: Connection verified.');

    console.log('Sending test email to:', process.env.SMTP_EMAIL);
    const info = await transporter.sendMail({
      from: `"FinFlo Diagnostic" <${process.env.SMTP_EMAIL}>`,
      to: process.env.SMTP_EMAIL,
      subject: 'FinFlo SMTP Diagnostic Test',
      text: 'If you are reading this, your SMTP configuration is working perfectly!',
      html: '<b>If you are reading this, your SMTP configuration is working perfectly!</b>',
    });

    console.log('SUCCESS: Email sent.');
    console.log('Message ID:', info.messageId);
    process.exit(0);
  } catch (error) {
    console.error('FAILED: SMTP Error');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Command:', error.command);
    console.error('Error Response:', error.response);
    process.exit(1);
  }
};

testEmail();
