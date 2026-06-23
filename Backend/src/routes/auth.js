// routes/auth.js
import express from 'express';
import { loginUser, registerUser } from '../controllers/authControllers.js';

const router = express.Router();

// Authentication Gateways
router.post('/login', loginUser);
router.post('/register', registerUser);

export default router;