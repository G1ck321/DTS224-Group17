// controllers/authControllers.js
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * 1. Unified Login Gateway supporting Staff Accounts and Student Matric Profiles
 */
export const loginUser = async (req, res) => {
    const { username, password } = req.body;
    
    // X-RAY LOG: See exactly what the frontend sent
    console.log(`\n[🔍 DEBUG] Login Attempt -> Username: '${username}', Password: '${password}'`);

    if (!username || !password) {
        return res.status(400).json({ error: 'Identification keys and credentials are required.' });
    }

    try {
        // Look up inside Staff/User accounts first
        const [staffRows] = await pool.execute(
            'SELECT user_id, username, user_role, password_hash FROM USER_ACCOUNT WHERE username = ?',
            [username]
        );
        
        console.log(`[🔍 DEBUG] Staff record found in DB? ->`, staffRows.length > 0 ? 'YES' : 'NO');

        if (staffRows.length > 0) {
            const user = staffRows[0];
            const isMatch = await bcrypt.compare(password, user.password_hash);
            
            console.log(`[🔍 DEBUG] Bcrypt Password Match? ->`, isMatch ? 'YES' : 'NO');

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

        console.log(`[🔍 DEBUG] Student record found in DB? ->`, customerRows.length > 0 ? 'YES' : 'NO');

        if (customerRows.length > 0) {
            const customer = customerRows[0];
            
            if (password !== 'password') {
                console.log(`[🔍 DEBUG] Student password rejected. Expected 'password', got '${password}'`);
                return res.status(401).json({ error: 'Invalid password for student account demo.' });
            }

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

        console.log(`[🔍 DEBUG] FINAL VERDICT: Username does not exist in any table.`);
        return res.status(401).json({ error: 'Identity record not found within system boundaries.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * 2. Identity Creation Gateway (Transactional Multi-Table Insert)
 */
export const registerUser = async (req, res) => {
    const { username, role, password } = req.body;

    // Boundary validations
    if (!username || !role) {
        return res.status(400).json({ error: 'Username and role are required fields.' });
    }

    const finalPassword = password || 'password';

    // Grab a dedicated connection so we can lock the tables for a multi-step transaction
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Verify uniqueness to prevent duplicates
        let existing = [];
        if (role === 'Student') {
            [existing] = await connection.execute('SELECT matric_no FROM CUSTOMER WHERE matric_no = ?', [username]);
        } else {
            [existing] = await connection.execute('SELECT username FROM USER_ACCOUNT WHERE username = ?', [username]);
        }

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Identity already exists within the system boundary.' });
        }

        // 2. Insert into the PEOPLE supertype table FIRST
        const peopleType = role === 'Student' ? 'C' : 'U';
        // We inject placeholder data for the required fields since the signup form is minimal
        const [personResult] = await connection.execute(
            'INSERT INTO PEOPLE (fullname, phone_number, email, people_type) VALUES (?, ?, ?, ?)',
            [`System ${role} Account`, '00000000000', `${username.toLowerCase()}_${Date.now()}@virts.local`, peopleType]
        );
        
        const newPersonId = personResult.insertId; // Grab the newly created parent ID

        // 3. Insert into the correct child table using the new parent ID
        if (role === 'Student') {
            await connection.execute(
                'INSERT INTO CUSTOMER (customer_id, matric_no) VALUES (?, ?)',
                [newPersonId, username]
            );
        } else {
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(finalPassword, saltRounds);
            await connection.execute(
                'INSERT INTO USER_ACCOUNT (user_id, username, password_hash, user_role) VALUES (?, ?, ?, ?)',
                [newPersonId, username, passwordHash, role]
            );
        }

        // 4. Commit the transaction to save everything permanently
        await connection.commit();

        return res.status(201).json({
            message: 'User identity established successfully.',
            user: { username, role },
            usingDefaultPassword: !password
        });
    } catch (error) {
        // If anything fails, undo all database changes to prevent corrupted half-records
        await connection.rollback();
        console.error('Signup Transaction Failed:', error);
        return res.status(500).json({ error: 'Internal Server Error during identity creation.' });
    } finally {
        connection.release(); // Always release the connection back to the pool
    }
};

/**
 * 3. Aggregates live data profiles, active layaways, and hostel metadata for the Student Dashboard
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