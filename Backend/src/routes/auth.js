// routes/auth.js
import express from 'express';
import { loginUser, getStudentDashboardData } from '../controllers/authControllers.js';
import authorize from '../middleware/authorize.js'; // Existing security gateway

const router = express.Router();

router.post('/login', loginUser);

// Protected student-only query route
router.get('/student-profile', authorize('Student'), getStudentDashboardData);

export default router;