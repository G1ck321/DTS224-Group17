//app.js
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payments.js';

const app = express();

// ── CORS Configuration ────────────────────────────────────────────────────────
// In production (Vercel), set CORS_ORIGIN in the Vercel Environment Variables
// dashboard to your frontend URL, e.g. https://your-app.vercel.app
// In development (localhost), this falls back to allow all origins.
const allowedOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({
    origin: allowedOrigin,             // Restrict which frontend domain can call this API
    methods: ['GET', 'POST', 'OPTIONS'], // Only the HTTP verbs this API actually needs
    allowedHeaders: ['Content-Type', 'Authorization'], // What headers the frontend is allowed to send
}));

// Automatically map incoming JSON body streams to accessible JavaScript objects
app.use(express.json());

// ── API Routing Gateways ──────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/payments', paymentRoutes);

// ── Health Check Endpoint ─────────────────────────────────────────────────────
// Used by Vercel/uptime monitors to verify the server is alive without hitting the DB
app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'VIRTS Backend', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// This is Express's built-in 4-argument error handler (must have all 4 params)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Critical structural crash intercepted safely by server middleware loop.' });
});

export default app;
