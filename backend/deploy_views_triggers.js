const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function deployAllDbObjects() {
    console.log('Connecting to MySQL...');
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'course_registration_system',
        multipleStatements: true
    });

    console.log('✓ Connected to course_registration_system\n');

    // 1. Deploy Views
    console.log('1. Deploying Database Views...');
    const views = [
        `CREATE OR REPLACE VIEW student_course_history AS
        SELECT
            s.student_id,
            s.name AS student_name,
            s.email AS student_email,
            d.department_name,
            c.course_id,
            c.course_code,
            c.course_name,
            c.credits,
            cc.grade,
            cc.completion_semester,
            cc.completion_year,
            CASE cc.grade
                WHEN 'A' THEN 4.0
                WHEN 'A-' THEN 3.7
                WHEN 'B+' THEN 3.3
                WHEN 'B' THEN 3.0
                WHEN 'B-' THEN 2.7
                WHEN 'C+' THEN 2.3
                WHEN 'C' THEN 2.0
                WHEN 'D' THEN 1.0
                WHEN 'F' THEN 0.0
                ELSE NULL
            END AS grade_points,
            c.credits * CASE cc.grade
                WHEN 'A' THEN 4.0
                WHEN 'A-' THEN 3.7
                WHEN 'B+' THEN 3.3
                WHEN 'B' THEN 3.0
                WHEN 'B-' THEN 2.7
                WHEN 'C+' THEN 2.3
                WHEN 'C' THEN 2.0
                WHEN 'D' THEN 1.0
                WHEN 'F' THEN 0.0
                ELSE NULL
            END AS quality_points
        FROM STUDENT s
        JOIN DEPARTMENT d ON s.department_id = d.department_id
        JOIN COMPLETED_COURSE cc ON s.student_id = cc.student_id
        JOIN COURSE c ON cc.course_id = c.course_id;`,

        `CREATE OR REPLACE VIEW course_offering_details AS
        SELECT
            co.offering_id,
            c.course_id,
            c.course_code,
            c.course_name,
            c.credits,
            c.description AS course_description,
            d.department_name,
            d.department_code,
            f.faculty_id,
            f.faculty_name AS instructor_name,
            f.designation AS instructor_designation,
            co.semester,
            co.academic_year,
            co.day_of_week,
            co.start_time,
            co.end_time,
            co.room_number,
            co.capacity,
            co.enrolled_count,
            (co.capacity - co.enrolled_count) AS available_seats,
            ROUND((co.enrolled_count / co.capacity * 100), 2) AS fill_percentage,
            CASE
                WHEN co.enrolled_count >= co.capacity THEN 'FULL'
                WHEN co.enrolled_count >= co.capacity * 0.9 THEN 'NEARLY FULL'
                WHEN co.enrolled_count >= co.capacity * 0.5 THEN 'FILLING UP'
                ELSE 'AVAILABLE'
            END AS availability_status,
            CONCAT(
                co.day_of_week, ' ',
                TIME_FORMAT(co.start_time, '%h:%i %p'), ' - ',
                TIME_FORMAT(co.end_time, '%h:%i %p')
            ) AS schedule_display
        FROM COURSE_OFFERING co
        JOIN COURSE c ON co.course_id = c.course_id
        JOIN DEPARTMENT d ON c.department_id = d.department_id
        JOIN FACULTY f ON co.faculty_id = f.faculty_id;`,

        `CREATE OR REPLACE VIEW student_current_schedule AS
        SELECT
            s.student_id,
            s.name AS student_name,
            s.email AS student_email,
            s.current_semester,
            e.enrollment_id,
            e.registration_date,
            e.status AS enrollment_status,
            co.offering_id,
            c.course_id,
            c.course_code,
            c.course_name,
            c.credits,
            f.faculty_name AS instructor,
            co.semester,
            co.academic_year,
            co.day_of_week,
            co.start_time,
            co.end_time,
            co.room_number,
            CONCAT(
                co.day_of_week, ' ',
                TIME_FORMAT(co.start_time, '%h:%i %p'), ' - ',
                TIME_FORMAT(co.end_time, '%h:%i %p')
            ) AS schedule_display
        FROM STUDENT s
        JOIN ENROLLMENT e ON s.student_id = e.student_id
        JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
        JOIN COURSE c ON co.course_id = c.course_id
        JOIN FACULTY f ON co.faculty_id = f.faculty_id
        WHERE e.status = 'REGISTERED';`,

        `CREATE OR REPLACE VIEW course_prerequisites_view AS
        SELECT
            c.course_id,
            c.course_code,
            c.course_name,
            c.credits,
            prereq.course_id AS prerequisite_id,
            prereq.course_code AS prerequisite_code,
            prereq.course_name AS prerequisite_name,
            cp.is_strict,
            CASE
                WHEN cp.is_strict = TRUE THEN 'Required'
                ELSE 'Recommended'
            END AS prerequisite_type
        FROM COURSE c
        JOIN COURSE_PREREQUISITE cp ON c.course_id = cp.course_id
        JOIN COURSE prereq ON cp.prerequisite_course_id = prereq.course_id;`,

        `CREATE OR REPLACE VIEW student_eligibility_summary AS
        SELECT
            s.student_id,
            s.name AS student_name,
            s.current_semester,
            s.max_credits_per_semester,
            d.department_name,
            d.department_code,
            COALESCE(completed.total_credits_earned, 0) AS credits_earned,
            COALESCE(completed.courses_completed_count, 0) AS courses_completed,
            COALESCE(current_enr.current_semester_credits, 0) AS current_enrolled_credits,
            (s.max_credits_per_semester - COALESCE(current_enr.current_semester_credits, 0)) AS remaining_credit_capacity,
            COALESCE(completed.cumulative_gpa, 0.00) AS cumulative_gpa
        FROM STUDENT s
        JOIN DEPARTMENT d ON s.department_id = d.department_id
        LEFT JOIN (
            SELECT
                student_id,
                SUM(credits) AS total_credits_earned,
                COUNT(*) AS courses_completed_count,
                ROUND(SUM(quality_points) / NULLIF(SUM(credits), 0), 2) AS cumulative_gpa
            FROM student_course_history
            WHERE grade NOT IN ('F', 'W', 'I')
            GROUP BY student_id
        ) completed ON s.student_id = completed.student_id
        LEFT JOIN (
            SELECT
                student_id,
                SUM(credits) AS current_semester_credits
            FROM student_current_schedule
            GROUP BY student_id
        ) current_enr ON s.student_id = current_enr.student_id;`
    ];

    for (const vSql of views) {
        await conn.query(vSql);
        const nameMatch = vSql.match(/VIEW\s+([a-zA-Z0-9_]+)/i);
        console.log(`  ✓ View created: ${nameMatch ? nameMatch[1] : 'view'}`);
    }

    // 2. Deploy Triggers
    console.log('\n2. Deploying Database Triggers...');
    const triggers = [
        {
            name: 'trg_enrollment_insert_increment',
            sql: `CREATE TRIGGER trg_enrollment_insert_increment
            AFTER INSERT ON ENROLLMENT
            FOR EACH ROW
            BEGIN
                IF NEW.status = 'REGISTERED' THEN
                    UPDATE COURSE_OFFERING
                    SET enrolled_count = enrolled_count + 1
                    WHERE offering_id = NEW.offering_id;
                END IF;
            END;`
        },
        {
            name: 'trg_enrollment_update_count',
            sql: `CREATE TRIGGER trg_enrollment_update_count
            AFTER UPDATE ON ENROLLMENT
            FOR EACH ROW
            BEGIN
                IF OLD.status = 'REGISTERED' AND NEW.status != 'REGISTERED' THEN
                    UPDATE COURSE_OFFERING
                    SET enrolled_count = enrolled_count - 1
                    WHERE offering_id = NEW.offering_id;
                END IF;
                IF OLD.status != 'REGISTERED' AND NEW.status = 'REGISTERED' THEN
                    UPDATE COURSE_OFFERING
                    SET enrolled_count = enrolled_count + 1
                    WHERE offering_id = NEW.offering_id;
                END IF;
            END;`
        },
        {
            name: 'trg_enrollment_delete_decrement',
            sql: `CREATE TRIGGER trg_enrollment_delete_decrement
            AFTER DELETE ON ENROLLMENT
            FOR EACH ROW
            BEGIN
                IF OLD.status = 'REGISTERED' THEN
                    UPDATE COURSE_OFFERING
                    SET enrolled_count = enrolled_count - 1
                    WHERE offering_id = OLD.offering_id;
                END IF;
            END;`
        },
        {
            name: 'trg_enrollment_complete',
            sql: `CREATE TRIGGER trg_enrollment_complete
            AFTER UPDATE ON ENROLLMENT
            FOR EACH ROW
            BEGIN
                DECLARE v_course_id INT;
                DECLARE v_semester VARCHAR(20);
                DECLARE v_year INT;

                IF OLD.status != 'COMPLETED' AND NEW.status = 'COMPLETED' THEN
                    SELECT course_id, semester, academic_year
                    INTO v_course_id, v_semester, v_year
                    FROM COURSE_OFFERING
                    WHERE offering_id = NEW.offering_id;

                    INSERT INTO COMPLETED_COURSE (
                        student_id,
                        course_id,
                        grade,
                        completion_semester,
                        completion_year
                    ) VALUES (
                        NEW.student_id,
                        v_course_id,
                        'A',
                        v_semester,
                        v_year
                    )
                    ON DUPLICATE KEY UPDATE grade = 'A';
                END IF;
            END;`
        }
    ];

    for (const t of triggers) {
        await conn.query(`DROP TRIGGER IF EXISTS ${t.name}`);
        await conn.query(t.sql);
        console.log(`  ✓ Trigger created: ${t.name}`);
    }

    console.log('\n=== ALL VIEWS AND TRIGGERS SUCCESSFULLY DEPLOYED ===\n');
    await conn.end();
}

deployAllDbObjects().catch(err => {
    console.error('Fatal error deploying DB objects:', err);
    process.exit(1);
});
