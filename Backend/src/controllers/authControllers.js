// controllers/authControllers.js
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Unified Login Gateway supporting Staff Accounts and Student Matric Profiles
 */
export const loginUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Identification keys and credentials are required.' });
    }

    try {
        // Look up inside Staff/User accounts first
        const [staffRows] = await pool.execute(
            'SELECT user_id, username, user_role, password_hash FROM USER_ACCOUNT WHERE username = ?',
            [username]
        );

        if (staffRows.length > 0) {
            const user = staffRows[0];
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid authentication credentials.' });
            }

            const token = jwt.sign(
                { id: user.user_id, username: user.username, role: user.user_role },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.json({
                message: 'Sign-in authorized.',
                token,
                user: { username: user.username, role: user.user_role }
            });
        }

        // Fallback: Check if user is a Student tracking an installment plan
        const [customerRows] = await pool.execute(
            'SELECT customer_id, matric_no FROM CUSTOMER WHERE matric_no = ?',
            [username]
        );

        if (customerRows.length > 0) {
            const customer = customerRows[0];
            
            // Validate against the academic staging default password
            if (password !== 'password') {
                return res.status(401).json({ error: 'Invalid password for student account demo.' });
            }

            // Fetch name from parent structure
            const [personRows] = await pool.execute(
                'SELECT fullname FROM PEOPLE WHERE people_id = ?',
                [customer.customer_id]
            );
            const fullname = personRows[0]?.fullname || 'Student Account';

            const token = jwt.sign(
                { id: customer.customer_id, username: customer.matric_no, role: 'Student' },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.json({
                message: 'Student balance tracking access granted.',
                token,
                user: { username: fullname, role: 'Student' }
            });
        }

        return res.status(401).json({ error: 'Identity record not found within system boundaries.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Aggregates live data profiles, active layaways, and hostel metadata for the Student Dashboard
 */
export const getStudentDashboardData = async (req, res) => {
    // Extracted safely via authorization middleware token parsing
    const customerId = req.user.id; 

    try {
        // Get core structural metrics
        const [profileRows] = await pool.execute(
            `SELECT p.fullname, p.email, p.phone_number, c.matric_no, c.telegram_handle 
             FROM PEOPLE p 
             JOIN CUSTOMER c ON p.people_id = c.customer_id 
             WHERE p.people_id = ?`,
            [customerId]
        );

        if (profileRows.length === 0) {
            return res.status(404).json({ error: 'Student profile structure missing.' });
        }

        // Get latest residence logging to avoid transitivity updates
        const [residenceRows] = await pool.execute(
            `SELECT hall_name, room_no, semester_code 
             FROM RESIDENCE_LOG 
             WHERE customer_id = ? 
             ORDER BY residence_log_id DESC LIMIT 1`,
            [customerId]
        );

        // Calculate financial layout tracking calculations
        const [orderRows] = await pool.execute(
            `SELECT 
                oh.order_id, 
                oh.total_order_amount, 
                oh.order_status, 
                oh.created_at,
                COALESCE(SUM(pl.amount_paid), 0) as total_paid
             FROM ORDER_HEADER oh
             LEFT JOIN PAYMENT_LEDGER pl ON oh.order_id = pl.order_id
             WHERE oh.customer_id = ?
             GROUP BY oh.order_id`,
            [customerId]
        );

        // Process final mathematical breakdown array
        let totalDebtOutstanding = 0;
        const formattedOrders = orderRows.map(order => {
            const totalOrder = parseFloat(order.total_order_amount);
            const totalPaid = parseFloat(order.total_paid);
            const remainingBalance = Math.max(0, totalOrder - totalPaid);
            
            if (order.order_status !== 'Completed') {
                totalDebtOutstanding += remainingBalance;
            }

            return {
                order_id: order.order_id,
                total_amount: totalOrder,
                amount_paid: totalPaid,
                balance_due: remainingBalance,
                status: order.order_status,
                date: order.created_at
            };
        });

        return res.json({
            profile: profileRows[0],
            residence: residenceRows[0] || { hall_name: 'Unassigned', room_no: 'N/A' },
            financials: {
                total_debt_outstanding: totalDebtOutstanding,
                orders: formattedOrders
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to compile dashboard metrics.' });
    }
};