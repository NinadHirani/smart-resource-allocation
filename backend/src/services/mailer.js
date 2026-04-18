const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail SMTP variables are not configured');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

async function sendAssignmentEmail({ to, task, adminEmail, dashboardUrl }) {
  const subject = `New Task Assignment: ${task.title}`;
  const text = `You have been assigned a new task.\n\nTitle: ${task.title}\nDescription: ${task.description}\nLocation: ${task.location}\nDeadline: ${task.deadline || 'Not specified'}\nAdmin Contact: ${adminEmail}\n\nView your tasks: ${dashboardUrl}`;

  await getTransporter().sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
  });
}

module.exports = { sendAssignmentEmail };
