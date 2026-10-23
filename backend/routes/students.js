/**
 * Student Routes
 * Handles all student-related API endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');

/**
 * GET /api/students
 * Retrieve all students with department info
 * Demonstrates: JOIN, ORDER BY
 */
router.get('/', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                s.student_id,
                s.name,
                s.email,
                s.current_semester,
                s.max_credits_per_semester,
                d.department_id,
                d.department_name,
                d.department_code
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.department_id = d.department_id
            ORDER BY s.name
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/students
 * Add a new student
 *
 * Demonstrates: INSERT with parameterized query
 * Relies on server-level error mapping:
 *  - Duplicate email -> 409 (ER_DUP_ENTRY)
 *  - Invalid department -> 400 (ER_NO_REFERENCED_ROW_2)
 */
router.post('/', async (req, res, next) => {
    const { name, email, departmentId, currentSemester, maxCreditsPerSemester } = req.body;

    // Required fields
    if (!name || !email || !departmentId || currentSemester === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: 'name, email, departmentId, and currentSemester are required'
        });
    }

    // Domain validation (mirrors database CHECK constraints)
    const semester = Number(currentSemester);
    const maxCredits = Number(maxCreditsPerSemester || 18);

    if (semester <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: 'currentSemester must be greater than 0'
        });
    }
    if (maxCredits <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: 'maxCreditsPerSemester must be greater than 0'
        });
    }

    try {
        const [result] = await db.query(`
            INSERT INTO STUDENT (name, email, department_id, current_semester, max_credits_per_semester)
            VALUES (?, ?, ?, ?, ?)
        `, [name, email, departmentId, semester, maxCredits]);

        res.status(201).json({
            success: true,
            message: 'Student added successfully',
            data: { student_id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/students/:id
 * Retrieve a specific student with detailed info
 * Demonstrates: JOIN with WHERE
 */
router.get('/:id', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                s.student_id,
                s.name,
                s.email,
                s.current_semester,
                s.max_credits_per_semester,
                d.department_id,
                d.department_name,
                d.department_code
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.department_id = d.department_id
            WHERE s.student_id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/students/:id/transcript
 * Get student's completed courses (transcript)
 * Demonstrates: VIEW usage (student_course_history)
 */
router.get('/:id/transcript', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM student_course_history
            WHERE student_id = ?
            ORDER BY completion_year DESC, completion_semester, course_code
        `, [req.params.id]);

        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/students/:id/current-schedule
 * Get student's current semester schedule
 * Demonstrates: VIEW usage (student_current_schedule)
 */
router.get('/:id/current-schedule', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM student_current_schedule
            WHERE student_id = ?
            ORDER BY day_of_week, start_time
        `, [req.params.id]);

        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/students/:id/eligibility
 * Get student's eligibility summary
 * Demonstrates: VIEW usage (student_eligibility_summary)
 */
router.get('/:id/eligibility', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM student_eligibility_summary
            WHERE student_id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/students/:id/completed-courses
 * Get list of completed course IDs for prerequisite checking
 * Demonstrates: Simple SELECT with JOIN
 */
router.get('/:id/completed-courses', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                c.course_id,
                c.course_code,
                c.course_name,
                cc.grade,
                cc.completion_semester,
                cc.completion_year
            FROM COMPLETED_COURSE cc
            JOIN COURSE c ON cc.course_id = c.course_id
            WHERE cc.student_id = ?
            ORDER BY c.course_code
        `, [req.params.id]);

        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/students/:id/current-credits
 * Calculate current semester credit load
 * Demonstrates: Aggregate function (SUM), GROUP BY
 */
router.get('/:id/current-credits', async (req, res, next) => {
    try {
        const semester = req.query.semester || 'Fall';
        const year = req.query.year || 2025;

        const [rows] = await db.query(`
            SELECT
                s.student_id,
                s.name,
                s.max_credits_per_semester,
                COALESCE(SUM(c.credits), 0) AS current_credits,
                (s.max_credits_per_semester - COALESCE(SUM(c.credits), 0)) AS remaining_capacity
            FROM STUDENT s
            LEFT JOIN ENROLLMENT e ON s.student_id = e.student_id AND e.status = 'REGISTERED'
            LEFT JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
                AND co.semester = ? AND co.academic_year = ?
            LEFT JOIN COURSE c ON co.course_id = c.course_id
            WHERE s.student_id = ?
            GROUP BY s.student_id, s.name, s.max_credits_per_semester
        `, [semester, year, req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/students/:id/missing-prerequisites/:courseId
 * Find missing prerequisites for a specific course
 * Demonstrates: Nested subquery, NOT EXISTS
 */
router.get('/:id/missing-prerequisites/:courseId', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                prereq_course.course_code,
                prereq_course.course_name
            FROM COURSE target_course
            JOIN COURSE_PREREQUISITE cp ON target_course.course_id = cp.course_id
            JOIN COURSE prereq_course ON cp.prerequisite_course_id = prereq_course.course_id
            WHERE target_course.course_id = ?
            AND cp.is_strict = TRUE
            AND NOT EXISTS (
                SELECT 1
                FROM COMPLETED_COURSE cc
                WHERE cc.student_id = ?
                AND cc.course_id = prereq_course.course_id
            )
            ORDER BY prereq_course.course_code
        `, [req.params.courseId, req.params.id]);

        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/students/:id/eligible-courses
 * Find all courses a student is eligible to register for
 * Demonstrates: Complex subquery, NOT EXISTS
 */
router.get('/:id/eligible-courses', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                c.course_id,
                c.course_code,
                c.course_name,
                c.credits,
                d.department_name
            FROM COURSE c
            JOIN DEPARTMENT d ON c.department_id = d.department_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM COMPLETED_COURSE cc
                WHERE cc.student_id = ?
                AND cc.course_id = c.course_id
            )
            AND NOT EXISTS (
                SELECT 1
                FROM COURSE_PREREQUISITE cp
                WHERE cp.course_id = c.course_id
                AND cp.is_strict = TRUE
                AND NOT EXISTS (
                    SELECT 1
                    FROM COMPLETED_COURSE cc2
                    WHERE cc2.student_id = ?
                    AND cc2.course_id = cp.prerequisite_course_id
                )
            )
            ORDER BY c.course_code
        `, [req.params.id, req.params.id]);

        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
