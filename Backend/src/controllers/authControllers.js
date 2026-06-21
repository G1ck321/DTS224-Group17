//controllers/authControllers.js
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
        role: user.user_role,
        
    }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
