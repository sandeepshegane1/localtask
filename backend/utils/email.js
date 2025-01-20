import nodemailer from 'nodemailer';

// Create transporter once and reuse
let transporter = null;

const createGmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    console.log('Sending email to:', to);
    console.log('Subject:', subject);
    
    if (!transporter) {
      console.log('Creating Gmail transporter...');
      
      // Check if Gmail credentials are configured
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file');
      }
      
      transporter = createGmailTransporter();
    }

    const info = await transporter.sendMail({
      from: `"LocalTask" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: text || '',
      html: html || '',
    });

    console.log('Email sent successfully');
    console.log('Message ID:', info.messageId);
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
