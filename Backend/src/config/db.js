import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection instantly upon server startup
try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL Database Connection Pool.');
    connection.release();
} catch (error) {
    console.error('Database connection failed catastrophically:', error.message);
}

export default pool;
