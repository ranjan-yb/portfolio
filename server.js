require('dotenv').config()
const express = require("express");
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require("express-rate-limit");


const app = express()

app.use(cors({
  origin: "https://allwebsvs.netlify.app", // your Netlify frontend
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));


// Configure transporter (Gmail via app password or any SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


// Limit: max 5 requests per IP per minute
const contactLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // limit each IP to 5 requests per windowMs
  message: {
    error: "Too many requests. Please wait a minute before trying again."
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,  // Disable the X-RateLimit headers
});


// Basic health check
app.get('/health', (req, res) => res.json({ ok: true, message: "all good" }));

// Contact route
app.post('/api/contact',contactLimiter, async (req, res) => {
  const { name, email, message } = req.body;

  

  // Server-side validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const mailOptions = {
    from: `"${name}" <${process.env.SMTP_USER}>`,
    replyTo: email,
    to: process.env.TO_EMAIL,
    subject: `New portfolio contact from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <pre style="white-space:pre-wrap">${message}</pre>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ ok: true, message: 'Message sent successfully.' });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running successfully  on port ${PORT}`);
});
