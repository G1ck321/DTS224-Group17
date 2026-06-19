import express from 'express';
import { logPayment } from '../controllers/paymentController.js';
import authorize from '../middleware/authorize.js';

const router = express.Router();

// Allow both Sellers and the Admin (Boss) to post transaction logs; protect route with security middleware
router.post('/log', authorize('Boss', 'Seller'), logPayment);

export default router;
