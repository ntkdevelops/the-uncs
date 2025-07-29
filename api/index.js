const express = require('express');
const path = require('path');

const app = express();

// Serve static files from html/public folder
app.use(express.static(path.join(__dirname, '..', 'html', 'public')));

// Export the Express app for Vercel
module.exports = app;