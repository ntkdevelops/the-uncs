const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from html/public folder
app.use(express.static(path.join(__dirname, 'html', 'public')));

// Start server
app.listen(PORT, () => {
    console.log(`Static site server running at http://localhost:${PORT}`);
    console.log(`Serving files from: ${path.join(__dirname, 'html', 'public')}`);
});