const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoints for future backend integration
app.get('/api/price', (req, res) => {
    res.json({
        price: 2500 + (Math.random() - 0.5) * 100,
        expo: -6,
        slot: Date.now()
    });
});

app.get('/api/balance/:pubkey', (req, res) => {
    res.json({ balance: 42.30 });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});