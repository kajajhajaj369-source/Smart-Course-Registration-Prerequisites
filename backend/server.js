/**
 * Smart Course Registration & Prerequisite Management System
 * Main Server File
 *
 * A Node.js + Express backend demonstrating DBMS concepts:
 * - Complex JOINs
 * - Subqueries
 * - Views
 * - Stored Procedures
 * - Triggers
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Import route handlers
const studentRoutes = require('./routes/students');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
const demoRoutes = require('./routes/demos');
const importRoutes = require('./routes/import');

// Auto-initialize IMPORT_HISTORY table if not present
const pool = require('./db/database');
pool.query(`
    CREATE TABLE IF NOT EXISTS IMPORT_HISTORY (
        import_id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        import_type VARCHAR(50) NOT NULL,
        imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        total_rows INT NOT NULL DEFAULT 0,
        successful_rows INT NOT NULL DEFAULT 0,
        skipped_rows INT NOT NULL DEFAULT 0,
        failed_rows INT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL,
        details JSON,
        INDEX idx_import_history_date (imported_at),
        INDEX idx_import_history_type (import_type)
    ) ENGINE=InnoDB COMMENT='Audit log for batch data imports'
`).catch(err => console.warn('Note on IMPORT_HISTORY init:', err.message));

// API Routes
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/demos', demoRoutes);
app.use('/api/import', importRoutes);

// Serve frontend for all other routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);

    // MySQL errors
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            error: 'Duplicate entry',
            message: 'This record already exists'
        });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            success: false,
            error: 'Referenced record not found',
            message: 'The referenced entity does not exist'
        });
    }

    // Stored procedure SIGNAL errors
    if (err.sqlState === '45000') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: err.sqlMessage || err.message
        });
    }

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  Course Registration & Prerequisite Management System      ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                   ║
║  Press Ctrl+C to stop                                      ║
╚════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
