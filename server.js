const express = require('express');
const path = require('path');
const app = express();

// ✅ Use port 4000 for backend to avoid conflict with Vite (which uses 3000)
const PORT = process.env.PORT || 4000;

// ✅ Path to your frontend build or dev files
const frontendPath = path.join(__dirname, 'frontend');

// ✅ Serve static files (JS, CSS, images, etc.)
app.use(express.static(frontendPath));

// ✅ Serve the main index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ✅ Example backend API routes
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
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
