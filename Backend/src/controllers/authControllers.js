// controllers/authControllers.js
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Log in an existing user profile
 */
export const loginUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required elements.' });
    }

    try {
        // Query database for matching user identity profile
        const [rows] = await pool.execute(
            'SELECT user_id, username, user_role, password_hash FROM USER_ACCOUNT WHERE username = ?', 
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid authentication credentials.' });
        }

        const user = rows[0];

        // Decrypt and compare password hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid authentication credentials.' });
        }

        // Generate an unalterable signed JWT containing role metrics
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, user_role: user.user_role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Send back profile parameters and token safely to the browser
        return res.json({
            message: 'Sign-in authorized.',
            token,
            user: {
                username: user.username,
                role: user.user_role
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Register a new user profile with optional password (defaults to 'password')
 */
export const registerUser = async (req, res) => {
    const { username, role, password } = req.body;

    // Boundary validations
    if (!username || !role) {
        return res.status(400).json({ error: 'Username and role are required fields.' });
    }

    // Force fallback default password if none was submitted via payload
    const finalPassword = password || 'password';

    try {
        // Verify username uniqueness constraint
        const [existing] = await pool.execute(
            'SELECT username FROM USER_ACCOUNT WHERE username = ?',
            [username]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username already exists within the system boundary.' });
        }

        // Securely hash the password string via bcrypt
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(finalPassword, saltRounds);

        // Write user account record into persistent database storage
        await pool.execute(
            'INSERT INTO USER_ACCOUNT (username, user_role, password_hash) VALUES (?, ?, ?)',
            [username, role, passwordHash]
        );

        return res.status(201).json({
            message: 'User identity established successfully.',
            user: { username, role },
            usingDefaultPassword: !password
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};