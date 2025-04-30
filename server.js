// server.js or index.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const cors = require('cors');
const axios = require('axios');
const fetch = require('node-fetch');

dotenv.config();

const app = express();

// Enable CORS with custom settings
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting (only in production)
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200,
    message: 'Too many requests, try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
if (process.env.NODE_ENV === 'production') app.use('/api/', limiter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'Invalid JSON' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Payload too large' });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

// MongoDB connection with fallback logging
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10,
    minPoolSize: 2,
    family: 4
}).then(() => {
    console.log('Connected to MongoDB Atlas');
}).catch(err => {
    console.error('MongoDB initial connection error:', err.message);
    console.warn('Ensure your .env contains a valid MONGODB_URI. If using SRV and facing ETIMEOUT, try switching to a standard connection string.');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Session
app.use(session({
    secret: process.env.JWT_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 86400
    }),
    cookie: {
        maxAge: 86400000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

// Routes
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Image proxy route
app.get('/api/proxy-image', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!response.ok) return res.status(response.status).send(`Fetch error: ${response.statusText}`);
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) return res.status(400).send('Invalid image type');
        const buffer = await response.buffer();
        if (buffer.length < 100) return res.status(400).send('Image too small');
        res.set({
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
        });
        res.send(buffer);
    } catch (err) {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy failed', detail: err.message });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Start server with dynamic port to avoid EADDRINUSE
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
