const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
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

    return result;
  } catch (error) {
    console.error('❌ Email send error:', {
      error: error.message,
      code: error.code,
      to: options.to,
      subject: options.subject
    });
    throw new Error(`Failed to send email: ${error.message}`);
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
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name
 * @returns {Promise} - Email send result
 */
const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
  const resetUrl = `${process.env.CLIENT_URL}/peppinos/reset-password.html?token=${resetToken}`;

  const subject = 'Password Reset Request - Peppino\'s Restaurant';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px;">Peppino's Restaurant</h1>
          <div style="width: 50px; height: 3px; background-color: #d4af37; margin: 10px auto;"></div>
        </div>

        <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password for your Peppino's Restaurant account.
          If you made this request, please click the button below to reset your password:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #d4af37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
            Reset Your Password
          </a>
        </div>

        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If the button doesn't work, you can copy and paste this link into your browser:
        </p>
        <p style="color: #d4af37; font-size: 14px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
          ${resetUrl}
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px; line-height: 1.6;">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons.
          </p>
          <p style="color: #999; font-size: 14px; line-height: 1.6;">
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            Best regards,<br>
            The Peppino's Restaurant Team<br>
            434 Moody St, Waltham, MA 02453<br>
            (781) 547-6099
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
    Password Reset Request - Peppino's Restaurant

    Dear ${userName},

    We received a request to reset your password for your Peppino's Restaurant account.

    Please click the following link to reset your password:
    ${resetUrl}

    This link will expire in 1 hour for security reasons.

    If you didn't request this password reset, please ignore this email.

    Best regards,
    The Peppino's Restaurant Team
  `;

  return await sendEmail({
    to: email,
    subject,
    html,
    text
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
  sendPasswordResetEmail,
  sendNewsletter
};
