const http = require('http');
const db = require('./db/database');

async function testHealth() {
    console.log('=== STARTING COMPREHENSIVE SYSTEM HEALTH CHECK ===\n');
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  [PASS] ${message}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${message}`);
            failed++;
        }
    }

    // 1. Check Database connection & Tables
    console.log('1. Verifying Database Tables & Record Counts...');
    try {
        const [tables] = await db.query(`SHOW TABLES`);
        const tableNames = tables.map(t => Object.values(t)[0].toUpperCase());
        console.log(`  Found ${tableNames.length} tables: ${tableNames.join(', ')}`);
        
        const requiredTables = [
            'DEPARTMENT', 'STUDENT', 'FACULTY', 'COURSE', 
            'COURSE_PREREQUISITE', 'COURSE_OFFERING', 'ENROLLMENT', 
            'COMPLETED_COURSE', 'IMPORT_HISTORY'
        ];
        for (const rt of requiredTables) {
            assert(tableNames.includes(rt), `Table ${rt} exists`);
            const [[{ count }]] = await db.query(`SELECT COUNT(*) as count FROM ${rt}`);
            console.log(`    - Table ${rt}: ${count} rows`);
        }
    } catch (err) {
        assert(false, `Database table query error: ${err.message}`);
    }

    // 2. Check Database Views
    console.log('\n2. Verifying Database Views...');
    const views = [
        'student_course_history',
        'course_offering_details',
        'student_current_schedule',
        'course_prerequisites_view',
        'student_eligibility_summary'
    ];
    for (const v of views) {
        try {
            const [rows] = await db.query(`SELECT * FROM ${v} LIMIT 2`);
            assert(true, `View ${v} executes successfully (returned ${rows.length} sample rows)`);
        } catch (err) {
            assert(false, `View ${v} failed: ${err.message}`);
        }
    }

    // 3. Check Stored Functions (UDFs)
    console.log('\n3. Verifying User-Defined Functions (UDFs)...');
    try {
        const [[{ totalCredits }]] = await db.query(`SELECT get_student_total_credits(1) as totalCredits`);
        assert(totalCredits !== undefined, `get_student_total_credits(1) works (result: ${totalCredits})`);

        const [[{ availSeats }]] = await db.query(`SELECT get_available_seats(1) as availSeats`);
        assert(availSeats !== undefined, `get_available_seats(1) works (result: ${availSeats})`);

        const [[{ gpa }]] = await db.query(`SELECT calculate_gpa(1) as gpa`);
        assert(gpa !== undefined, `calculate_gpa(1) works (result: ${gpa})`);
    } catch (err) {
        assert(false, `UDF execution error: ${err.message}`);
    }

    // 4. Test HTTP API Endpoints
    console.log('\n4. Testing HTTP REST Endpoints on http://localhost:3000...');
    const endpoints = [
        { path: '/api/students', method: 'GET' },
        { path: '/api/students/1', method: 'GET' },
        { path: '/api/students/1/transcript', method: 'GET' },
        { path: '/api/students/1/current-schedule', method: 'GET' },
        { path: '/api/students/1/eligibility', method: 'GET' },
        { path: '/api/students/1/completed-courses', method: 'GET' },
        { path: '/api/students/1/eligible-courses', method: 'GET' },
        { path: '/api/courses', method: 'GET' },
        { path: '/api/courses/1', method: 'GET' },
        { path: '/api/courses/1/prerequisites', method: 'GET' },
        { path: '/api/courses/1/prerequisite-chain', method: 'GET' },
        { path: '/api/courses/1/offerings', method: 'GET' },
        { path: '/api/courses/departments/all', method: 'GET' },
        { path: '/api/courses/faculty/all', method: 'GET' },
        { path: '/api/courses/offerings/all?semester=Fall&year=2025', method: 'GET' },
        { path: '/api/enrollments', method: 'GET' },
        { path: '/api/enrollments/student/1', method: 'GET' },
        { path: '/api/enrollments/validate/1/1', method: 'GET' },
        { path: '/api/enrollments/time-conflicts/1/1', method: 'GET' },
        { path: '/api/import/history', method: 'GET' },
        { path: '/api/demos/join-example', method: 'GET' },
        { path: '/api/demos/subquery-example', method: 'GET' },
        { path: '/api/demos/correlated-subquery', method: 'GET' },
        { path: '/api/demos/views', method: 'GET' },
        { path: '/api/demos/procedures', method: 'GET' },
        { path: '/api/demos/triggers', method: 'GET' },
        { path: '/api/demos/trigger-effect', method: 'GET' },
        { path: '/api/demos/recursive-cte?course=CS501', method: 'GET' },
        { path: '/api/demos/constraints', method: 'GET' },
        { path: '/api/demos/indexes', method: 'GET' }
    ];

    for (const ep of endpoints) {
        await new Promise((resolve) => {
            http.get(`http://localhost:3000${ep.path}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        assert(res.statusCode === 200 && parsed.success === true, `GET ${ep.path} (Status ${res.statusCode}, success: ${parsed.success})`);
                    } catch (e) {
                        assert(false, `GET ${ep.path} failed: ${data.slice(0, 100)}`);
                    }
                    resolve();
                });
            }).on('error', (err) => {
                assert(false, `GET ${ep.path} request error: ${err.message}`);
                resolve();
            });
        });
    }

    console.log(`\n========================================`);
    console.log(`HEALTH CHECK RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
}

testHealth().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
