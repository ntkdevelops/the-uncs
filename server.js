const express = require('express');
const path = require('path');
const apiApp = require('./api/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Mount the API routes (api/index.js defines routes as /api/contact, etc.)
app.use(apiApp);

// Serve notion app
app.use('/notion', express.static(path.join(__dirname, 'notion')));

// Serve static files from html/public
app.use(express.static(path.join(__dirname, 'html/public')));

// Fallback: serve index.html for unknown paths (mirrors Vercel rewrite)
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'html/public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
