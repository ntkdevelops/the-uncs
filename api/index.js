const express = require('express');
const nodemailer = require('nodemailer');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Configure nodemailer transporter
const transporter = nodemailer.createTransporter({
    service: 'gmail', // You can change this to your preferred email service
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your email password or app password
    }
});

// Contact form submission endpoint
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, service, message } = req.body;
        
        // Validate required fields
        if (!name || !email || !service || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill in all required fields.' 
            });
        }
        
        // Email content
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to your own email
            subject: `New Contact Form Submission - ${service}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                <p><strong>Service:</strong> ${service}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p><em>Submitted from G&J Home Services website</em></p>
            `,
            replyTo: email
        };
        
        // Send email
        await transporter.sendMail(mailOptions);
        
        res.json({ 
            success: true, 
            message: 'Thank you for your message! We\'ll get back to you within 24 hours.' 
        });
        
    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sorry, there was an error sending your message. Please try again or call us directly.' 
        });
    }
});

// Export the Express app for Vercel
module.exports = app;