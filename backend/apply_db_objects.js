const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function applyDbObjects() {
    console.log('Connecting to MySQL...');
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'course_registration_system',
        multipleStatements: true
    });

    console.log('✓ Connected to course_registration_system');

    // 1. Apply Views
    console.log('\nApplying Views from database/views.sql...');
    const viewsSql = fs.readFileSync(path.resolve(__dirname, '../database/views.sql'), 'utf8');
    // Split by semicolons, removing comments and empty lines
    const viewStatements = viewsSql
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of viewStatements) {
        if (stmt.toUpperCase().includes('CREATE') || stmt.toUpperCase().includes('USE')) {
            try {
                await conn.query(stmt);
                const match = stmt.match(/VIEW\s+([a-zA-Z0-9_]+)/i);
                if (match) console.log(`  ✓ Created view: ${match[1]}`);
            } catch (err) {
                console.error(`  ✗ Error in view statement:`, err.message);
            }
        }
    }

    // 2. Apply Functions
    console.log('\nApplying Functions from database/functions.sql...');
    const functionsSql = fs.readFileSync(path.resolve(__dirname, '../database/functions.sql'), 'utf8');
    const funcBlocks = functionsSql.split('DELIMITER');
    // Parse delimiter $$ blocks
    for (const block of funcBlocks) {
        const parts = block.split('$$').map(p => p.trim()).filter(p => p.length > 0);
        for (const part of parts) {
            if (part.toUpperCase().includes('CREATE FUNCTION') || part.toUpperCase().includes('DROP FUNCTION')) {
                try {
                    await conn.query(part);
                    const match = part.match(/FUNCTION\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
                    if (match && part.toUpperCase().includes('CREATE')) {
                        console.log(`  ✓ Created function: ${match[1]}`);
                    }
                } catch (err) {
                    console.error(`  ✗ Error in function statement:`, err.message);
                }
            }
        }
    }

    // 3. Apply Stored Procedures
    console.log('\nApplying Procedures from database/procedures.sql...');
    const procSql = fs.readFileSync(path.resolve(__dirname, '../database/procedures.sql'), 'utf8');
    const procBlocks = procSql.split('DELIMITER');
    for (const block of procBlocks) {
        const parts = block.split('$$').map(p => p.trim()).filter(p => p.length > 0);
        for (const part of parts) {
            if (part.toUpperCase().includes('CREATE PROCEDURE') || part.toUpperCase().includes('DROP PROCEDURE')) {
                try {
                    await conn.query(part);
                    const match = part.match(/PROCEDURE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
                    if (match && part.toUpperCase().includes('CREATE')) {
                        console.log(`  ✓ Created procedure: ${match[1]}`);
                    }
                } catch (err) {
                    console.error(`  ✗ Error in procedure statement:`, err.message);
                }
            }
        }
    }

    // 4. Apply Triggers from database/schema.sql
    console.log('\nApplying Triggers from database/schema.sql...');
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../database/schema.sql'), 'utf8');
    const triggerRegex = /CREATE\s+TRIGGER[\s\S]*?END;/gi;
    const triggers = schemaSql.match(triggerRegex) || [];
    for (const trg of triggers) {
        try {
            const nameMatch = trg.match(/CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)/i);
            const trgName = nameMatch ? nameMatch[1] : 'unknown';
            await conn.query(`DROP TRIGGER IF EXISTS ${trgName}`);
            await conn.query(trg);
            console.log(`  ✓ Created trigger: ${trgName}`);
        } catch (err) {
            console.error(`  ✗ Error creating trigger:`, err.message);
        }
    }

    console.log('\n=== DATABASE OBJECTS DEPLOYMENT COMPLETE ===\n');
    await conn.end();
}

applyDbObjects().catch(err => {
    console.error('Fatal error applying database objects:', err);
    process.exit(1);
});
