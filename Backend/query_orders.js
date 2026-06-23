import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

try {
    const [orders] = await pool.query('SELECT * FROM ORDER_HEADER');
    console.log('ORDER_HEADER rows:', orders);
    const [products] = await pool.query('SELECT * FROM PRODUCT');
    console.log('PRODUCT rows:', products);
} catch (error) {
    console.error('Database query failed:', error);
} finally {
    await pool.end();
}
