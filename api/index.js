const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from html/public folder
app.use(express.static(path.join(__dirname, 'html', 'public')));

// Function to create nodemailer transporter when needed
function createTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email configuration missing. Please set EMAIL_USER and EMAIL_PASS environment variables.');
    }
    
    return nodemailer.createTransporter({
        service: 'gmail', // You can change this to your preferred email service
        auth: {
            user: process.env.EMAIL_USER, // Your email
            pass: process.env.EMAIL_PASS  // Your email password or app password
        }
    });
}

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

        // Check if email configuration is available
        try {
            const transporter = createTransporter();
            
            // Email content
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_TO || process.env.EMAIL_USER, // Send to specified email or fallback to sender
                subject: `New Contact Form Submission from ${name}`,
                html: `
                    <h2>New Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                    <p><strong>Service Needed:</strong> ${service}</p>
                    <p><strong>Message:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                    <hr>
                    <p><em>This email was sent from the contact form on your website.</em></p>
                `
            };

            // Send email
            await transporter.sendMail(mailOptions);
            
            res.json({ 
                success: true, 
                message: 'Thank you for your message! We will get back to you soon.' 
            });
            
        } catch (configError) {
            // Email configuration is missing, but we can still log the submission
            console.log('Contact form submission (email not configured):', {
                name, email, phone, service, message, timestamp: new Date().toISOString()
            });
            
            res.json({ 
                success: true, 
                message: 'Thank you for your message! We have received your submission and will get back to you soon.' 
            });
        }
        
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sorry, there was an error sending your message. Please try again later.' 
        });
    }
});

// Export the Express app for Vercel
module.exports = app;