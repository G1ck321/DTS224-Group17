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

        // 1. Compare tracking data metrics against the master order invoice balance parameters with Row-Level Lock (FOR UPDATE)
        const [orderRows] = await connection.execute(
            'SELECT total_order_amount, customer_id, order_status FROM ORDER_HEADER WHERE order_id = ? FOR UPDATE',
            [order_id]
        );

        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Target order index signature not found.' });
        }

        const { total_order_amount, customer_id, order_status } = orderRows[0];

        // 2. Prevent adding payments if the order status is already 'Completed' (Fully Paid) or 'Refunded'
        if (order_status === 'Completed' || order_status === 'Refunded') {
            await connection.rollback();
            // Note: Keep the text "Fully Paid" in the error response so the test suite script handles rejection checks properly.
            return res.status(400).json({ error: 'Order is already Completed (Fully Paid) and locked against new payments.' });
        }

        // 3. Aggregate the cumulative payment trajectory for this specific customer invoice
        const [ledgerSum] = await connection.execute(
            'SELECT SUM(amount_paid) as total_paid FROM PAYMENT_LEDGER WHERE order_id = ?',
            [order_id]
        );
        const totalPaidBefore = Number(ledgerSum[0].total_paid) || 0;
        const newTotalPaid = totalPaidBefore + Number(amount_paid);

        // 4. Prevent overpayments exceeding the gross order liability limit
        if (newTotalPaid > Number(total_order_amount)) {
            await connection.rollback();
            return res.status(400).json({ 
                error: `Payment exceeds total order amount. Already paid: ₦${totalPaidBefore}, attempted: ₦${amount_paid}, total due: ₦${total_order_amount}.` 
            });
        }

        // 5. Log the individual payment record straight into the transaction ledger
        const [paymentResult] = await connection.execute(
            `INSERT INTO PAYMENT_LEDGER (order_id, amount_paid, payment_method, moniepoint_ref, timestamp) 
             VALUES (?, ?, ?, ?, NOW())`,
            [order_id, amount_paid, payment_method, moniepoint_ref || null]
        );

        const paymentPercentage = (newTotalPaid / total_order_amount) * 100;

        // 6. Milestone Check: Evaluate if the account has cleared the 80% boundary line
        if (paymentPercentage >= 80.0) {
            // Write alert record natively into the notification dispatch buffer pipeline
            await connection.execute(
                `INSERT INTO SYSTEM_ALERT_LOG (event_type, log_message, timestamp) 
                 VALUES ('MILESTONE_80', ?, NOW())`,
                [`Order #${order_id} for Customer ID ${customer_id} is ${paymentPercentage.toFixed(1)}% paid.`]
            );
        }

        // 7. Completion Check: Evaluate if payment is 100% complete
        if (newTotalPaid >= total_order_amount) {
            // Update order status to 'Completed' (which matches DB check constraint chk_status)
            await connection.execute(
                `UPDATE ORDER_HEADER SET order_status = 'Completed' WHERE order_id = ?`,
                [order_id]
            );
            // Log completion alert
            await connection.execute(
                `INSERT INTO SYSTEM_ALERT_LOG (event_type, log_message, timestamp) 
                 VALUES ('PAYMENT_COMPLETED', ?, NOW())`,
                [`Order #${order_id} has reached 100% payment parity and is now Completed.`]
            );
        }

        await connection.commit();
        return res.status(201).json({ 
            message: 'Payment logged successfully.', 
            current_progress: paymentPercentage, 
            outstanding_balance: total_order_amount - newTotalPaid 
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);

        // Handle duplicate moniepoint_ref gracefully (MySQL error 1062 = Duplicate Entry)
        // This happens when the same transfer reference is submitted more than once
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage?.includes('moniepoint_ref')) {
            return res.status(409).json({ 
                error: 'Duplicate Moniepoint reference. This transfer reference has already been recorded in the ledger.' 
            });
        }

        return res.status(500).json({ error: 'Transaction failed, database actions rolled back securely.' });
    } finally {
        connection.release();
    }
};
