//controllers/paymentController.js
import pool from '../config/db.js';

export const logPayment = async (req, res) => {
    const { order_id, amount_paid, payment_method, moniepoint_ref } = req.body;

    if (!order_id || !amount_paid || !payment_method) {
        return res.status(400).json({ error: 'Missing core payload transaction elements.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Log the individual payment record straight into the transaction ledger
        const [paymentResult] = await connection.execute(
            `INSERT INTO PAYMENT_LEDGER (order_id, amount_paid, payment_method, moniepoint_ref, timestamp) 
             VALUES (?, ?, ?, ?, NOW())`,
            [order_id, amount_paid, payment_method, moniepoint_ref || null]
        );

        // 2. Aggregate the cumulative payment trajectory for this specific customer invoice
        const [ledgerSum] = await connection.execute(
            'SELECT SUM(amount_paid) as total_paid FROM PAYMENT_LEDGER WHERE order_id = ?',
            [order_id]
        );
        const totalPaid = ledgerSum[0].total_paid || 0;

        // 3. Compare tracking data metrics against the master order invoice balance parameters
        const [orderRows] = await connection.execute(
            'SELECT total_order_amount, customer_id FROM ORDER_HEADER WHERE order_id = ?',
            [order_id]
        );

        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Target order index signature not found.' });
        }

        const { total_order_amount, customer_id } = orderRows[0];
        const paymentPercentage = (totalPaid / total_order_amount) * 100;

        // 4. Milestone Check: Evaluate if the account has cleared the 80% boundary line
        if (paymentPercentage >= 80.0) {
            // Write alert record natively into the notification dispatch buffer pipeline
            await connection.execute(
                `INSERT INTO SYSTEM_ALERT_LOG (event_type, log_message, timestamp) 
                 VALUES ('MILESTONE_80', ?, NOW())`,
                [`Order #${order_id} for Customer ID ${customer_id} is ${paymentPercentage.toFixed(1)}% paid.`]
            );
        }

        // 5. Completion Check: Evaluate if payment is 100% complete
        if (totalPaid >= total_order_amount) {
            await connection.execute(
                `UPDATE ORDER_HEADER SET order_status = 'Fully Paid' WHERE order_id = ?`,
                [order_id]
            );
        }

        await connection.commit();
        return res.status(201).json({ 
            message: 'Payment logged successfully.', 
            current_progress: paymentPercentage, 
            outstanding_balance: total_order_amount - totalPaid 
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        return res.status(500).json({ error: 'Transaction failed, database actions rolled back securely.' });
    } finally {
        connection.release();
    }
};
