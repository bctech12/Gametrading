const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// In-memory storage
const balances = new Map();
let currentPrice = 2500.00;
let connectedClients = 0;

// Mock price updates
setInterval(() => {
    currentPrice += (Math.random() - 0.5) * 10;
    
    // Broadcast price to all connected WebSocket clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'price',
                price: currentPrice,
                slot: Date.now()
            }));
        }
    });
}, 400);

// Broadcast player count
setInterval(() => {
    connectedClients = wss.clients.size;
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'count',
                players: connectedClients
            }));
        }
    });
}, 2000);

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// API endpoints
app.get('/price', (req, res) => {
    res.json({
        price: currentPrice,
        expo: -6,
        slot: Date.now()
    });
});

app.get('/balance/:pubkey', (req, res) => {
    const { pubkey } = req.params;
    const balance = balances.get(pubkey) || 0;
    res.json({ balance });
});

app.post('/deposit', (req, res) => {
    const { signature } = req.body;
    
    // Mock deposit verification
    // In real implementation, verify Solana transaction
    const amount = 10; // Mock amount
    const pubkey = 'mock_pubkey';
    
    const currentBalance = balances.get(pubkey) || 0;
    balances.set(pubkey, currentBalance + amount);
    
    res.json({ success: true, newBalance: currentBalance + amount });
});

app.post('/withdraw', (req, res) => {
    const { amountLamports, destinationATA } = req.body;
    
    // Mock withdrawal
    // In real implementation, create and sign Solana transaction
    const amount = amountLamports / 1000000; // Convert lamports to USDC
    const pubkey = 'mock_pubkey';
    
    const currentBalance = balances.get(pubkey) || 0;
    if (currentBalance >= amount) {
        balances.set(pubkey, currentBalance - amount);
        res.json({ 
            success: true, 
            newBalance: currentBalance - amount,
            transaction: 'mock_transaction_signature'
        });
    } else {
        res.status(400).json({ error: 'Insufficient balance' });
    }
});

// Serve static files
app.use(express.static('../frontend'));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});