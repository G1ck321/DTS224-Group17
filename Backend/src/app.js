//app.js
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payments.js';

const app = express();

// Enable Global Middleware Controls
app.use(cors()); // Allow your frontend interface to connect across separate network port limits
app.use(express.json()); // Automatically map incoming JSON body streams to accessible JavaScript components

// Mount System API Routing Gateways
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/payments', paymentRoutes);

// Global Error Catching Route Configuration
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Critical structural crash intercepted safely by server middleware loop.' });
});

export default app;
