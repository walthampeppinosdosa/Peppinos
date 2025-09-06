const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise} - Email send result
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send order confirmation email
 * @param {Object} order - Order details
 * @param {Object} user - User details
 * @returns {Promise} - Email send result
 */
const sendOrderConfirmation = async (order, user) => {
  const subject = `Order Confirmation - #${order._id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">Thank you for your order!</h2>
      <p>Dear ${user.name},</p>
      <p>Your order has been confirmed and is being prepared.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0;">
        <h3>Order Details:</h3>
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Total Amount:</strong> $${order.totalPrice}</p>
        <p><strong>Status:</strong> ${order.deliveryStatus}</p>
      </div>
      
      <p>We'll notify you when your order is ready for delivery.</p>
      <p>Thank you for choosing Peppino's Restaurant!</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html
  });
};

/**
 * Send newsletter email
 * @param {string} email - Recipient email
 * @param {string} content - Newsletter content
 * @returns {Promise} - Email send result
 */
const sendNewsletter = async (email, content) => {
  const subject = 'Peppino\'s Restaurant Newsletter';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">Peppino's Restaurant Newsletter</h2>
      ${content}
      <hr style="margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        You're receiving this email because you subscribed to our newsletter.
        <a href="#">Unsubscribe</a>
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html
  });
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendNewsletter
};
