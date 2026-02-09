const sendContactEmail = async (req, res) => {
  const { name, email, phone, company, message, subject, recipientEmail } =
    req.body;

  try {
    // Validate required fields
    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ message: 'Name, email, and message are required' });
    }

    // Log the contact form submission
    console.log('='.repeat(50));
    console.log('📧 NEW CONTACT FORM SUBMISSION');
    console.log('='.repeat(50));
    console.log(`To: ${recipientEmail || 'arshadnawazbaig@gmail.com'}`);
    console.log(`Subject: ${subject || 'Strategy Call Request'}`);
    console.log(`From: ${name} <${email}>`);
    console.log(`Phone: ${phone || 'Not provided'}`);
    console.log(`Company: ${company || 'Not provided'}`);
    console.log(`Message: ${message}`);
    console.log('='.repeat(50));

    // For production, you would integrate with an email service like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Or any SMTP service with nodemailer

    res
      .status(200)
      .json({
        message: 'Message sent successfully! We will get back to you soon.',
      });
  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

module.exports = { sendContactEmail };
