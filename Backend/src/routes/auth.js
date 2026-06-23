// routes/auth.js
import express from 'express';
import { loginUser, registerUser, getStudentDashboardData } from '../controllers/authControllers.js';
import authorize from '../middleware/authorize.js'; 

const router = express.Router();

// 1. Authentication Gateway
router.post('/login', loginUser);

// 2. Identity Creation Gateway (This is what failed!)
router.post('/register', registerUser);

// 3. Protected Dashboard Queries
router.get('/student-profile', authorize('Student'), getStudentDashboardData);

export default router;