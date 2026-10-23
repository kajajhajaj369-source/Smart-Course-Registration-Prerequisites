/**
 * Database Connection Module
 * Smart Course Registration & Prerequisite Management System
 *
 * Uses connection pooling for efficient database access
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'course_registration_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection on startup
pool.getConnection()
    .then(conn => {
        console.log('✓ Database connection established');
        conn.release();
    })
    .catch(err => {
        console.error('✗ Database connection failed:', err.message);
        console.log('  Make sure MySQL is running and .env is configured correctly');
    });

module.exports = pool;
