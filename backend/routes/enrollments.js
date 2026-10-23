/**
 * Enrollment Routes
 * Handles all enrollment and registration API endpoints
 *
 * KEY DBMS DEMONSTRATIONS:
 * - Stored Procedure calls
 * - Trigger effects
 * - Transaction handling
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');

/**
 * GET /api/enrollments
 * Get all enrollments with student and course details
 * Demonstrates: 5-table JOIN (student → enrollment → offering → course → faculty)
 */
router.get('/', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                e.enrollment_id,
                e.registration_date,
                e.status,
                s.student_id,
                s.name AS student_name,
                s.email AS student_email,
                c.course_id,
                c.course_code,
                c.course_name,
                c.credits,
                f.faculty_id,
                f.faculty_name AS instructor,
                co.offering_id,
                co.semester,
                co.academic_year,
                co.day_of_week,
                co.start_time,
                co.end_time,
                co.room_number
            FROM ENROLLMENT e
            JOIN STUDENT s ON e.student_id = s.student_id
            JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
            JOIN COURSE c ON co.course_id = c.course_id
            JOIN FACULTY f ON co.faculty_id = f.faculty_id
            ORDER BY e.registration_date DESC, s.name, c.course_code
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/enrollments/student/:studentId
 * Get all enrollments for a specific student
 * Demonstrates: JOIN with filtering
 */
router.get('/student/:studentId', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                e.enrollment_id,
                e.registration_date,
                e.status,
                c.course_id,
                c.course_code,
                c.course_name,
                c.credits,
                f.faculty_name AS instructor,
                co.offering_id,
                co.semester,
                co.academic_year,
                co.day_of_week,
                co.start_time,
                co.end_time,
                co.room_number
            FROM ENROLLMENT e
            JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
            JOIN COURSE c ON co.course_id = c.course_id
            JOIN FACULTY f ON co.faculty_id = f.faculty_id
            WHERE e.student_id = ?
            ORDER BY co.academic_year DESC, co.semester, c.course_code
        `, [req.params.studentId]);

        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/enrollments/offering/:offeringId
 * Get all enrollments for a specific offering
 * Demonstrates: JOIN with filtering
 */
router.get('/offering/:offeringId', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                e.enrollment_id,
                e.registration_date,
                e.status,
                s.student_id,
                s.name AS student_name,
                s.email AS student_email
            FROM ENROLLMENT e
            JOIN STUDENT s ON e.student_id = s.student_id
            WHERE e.offering_id = ?
            ORDER BY s.name
        `, [req.params.offeringId]);

        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/enrollments/register
 * Register a student for a course offering
 *
 * DEMONSTRATES: STORED PROCEDURE CALL
 * Calls register_student_for_course procedure which:
 * - Validates prerequisites (nested subquery)
 * - Checks capacity (constraint)
 * - Checks credit limit (aggregate)
 * - Checks time conflicts (self-join)
 * - Inserts enrollment (trigger fires to update enrolled_count)
 */
router.post('/register', async (req, res, next) => {
    const { studentId, offeringId } = req.body;

    if (!studentId || !offeringId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: studentId and offeringId'
        });
    }

    try {
        // Call the stored procedure
        const [result] = await db.query(
            'CALL register_student_for_course(?, ?)',
            [studentId, offeringId]
        );

        // The procedure returns a success message
        const message = result[0] && result[0][0] ? result[0][0].message : 'Registration successful';

        res.json({
            success: true,
            message: message,
            data: {
                studentId: studentId,
                offeringId: offeringId
            }
        });
    } catch (error) {
        // Stored procedure errors come as SQLSTATE 45000
        if (error.sqlState === '45000') {
            return res.status(400).json({
                success: false,
                error: 'Registration failed',
                message: error.sqlMessage || error.message
            });
        }
        next(error);
    }
});

/**
 * POST /api/enrollments/drop
 * Drop a course registration
 *
 * DEMONSTRATES: STORED PROCEDURE CALL + TRIGGER EFFECT
 * Calls drop_course procedure which updates status to DROPPED
 * Trigger fires to decrement enrolled_count
 */
router.post('/drop', async (req, res, next) => {
    const { studentId, offeringId } = req.body;

    if (!studentId || !offeringId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: studentId and offeringId'
        });
    }

    try {
        const [result] = await db.query(
            'CALL drop_course(?, ?)',
            [studentId, offeringId]
        );

        const message = result[0] && result[0][0] ? result[0][0].message : 'Course dropped successfully';

        res.json({
            success: true,
            message: message
        });
    } catch (error) {
        if (error.sqlState === '45000') {
            return res.status(400).json({
                success: false,
                error: 'Drop failed',
                message: error.sqlMessage || error.message
            });
        }
        next(error);
    }
});

/**
 * POST /api/enrollments/complete
 * Complete an enrollment with grade
 *
 * DEMONSTRATES: STORED PROCEDURE CALL + TRIGGER EFFECT
 * Calls complete_student_course procedure which:
 * - Updates enrollment status to COMPLETED
 * - Creates COMPLETED_COURSE record (via trigger)
 */
router.post('/complete', async (req, res, next) => {
    const { enrollmentId, grade } = req.body;

    if (!enrollmentId || !grade) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: enrollmentId and grade'
        });
    }

    try {
        const [result] = await db.query(
            'CALL complete_student_course(?, ?)',
            [enrollmentId, grade]
        );

        const message = result[0] && result[0][0] ? result[0][0].message : 'Course completed successfully';

        res.json({
            success: true,
            message: message
        });
    } catch (error) {
        if (error.sqlState === '45000') {
            return res.status(400).json({
                success: false,
                error: 'Completion failed',
                message: error.sqlMessage || error.message
            });
        }
        next(error);
    }
});

/**
 * GET /api/enrollments/check-prerequisites/:studentId/:courseId
 * Check if student has all prerequisites for a course
 *
 * DEMONSTRATES: STORED PROCEDURE CALL
 * Calls check_prerequisites procedure
 */
router.get('/check-prerequisites/:studentId/:courseId', async (req, res, next) => {
    try {
        const [result] = await db.query(
            'CALL check_prerequisites(?, ?)',
            [req.params.studentId, req.params.courseId]
        );

        // Result contains multiple result sets
        const header = result[0] && result[0][0] ? result[0][0] : {};
        const missing = result[1] || [];

        res.json({
            success: true,
            data: {
                studentName: header.student_name,
                courseCode: header.course_code,
                courseName: header.course_name,
                missingCount: header.missing_prerequisites_count || 0,
                missingPrerequisites: missing
            }
        });
    } catch (error) {
        if (error.sqlState === '45000') {
            return res.status(400).json({
                success: false,
                error: 'Check failed',
                message: error.sqlMessage || error.message
            });
        }
        next(error);
    }
});

/**
 * GET /api/enrollments/time-conflicts/:studentId/:offeringId
 * Check for time conflicts before registration
 * Demonstrates: Self-join query for conflict detection
 */
router.get('/time-conflicts/:studentId/:offeringId', async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                c1.course_code AS existing_course,
                co1.day_of_week,
                co1.start_time AS existing_start,
                co1.end_time AS existing_end,
                c2.course_code AS new_course,
                co2.start_time AS new_start,
                co2.end_time AS new_end
            FROM ENROLLMENT e1
            JOIN COURSE_OFFERING co1 ON e1.offering_id = co1.offering_id
            JOIN COURSE c1 ON co1.course_id = c1.course_id
            JOIN COURSE_OFFERING co2 ON co2.offering_id = ?
            JOIN COURSE c2 ON co2.course_id = c2.course_id
            WHERE e1.student_id = ?
            AND e1.status = 'REGISTERED'
            AND co1.semester = co2.semester
            AND co1.academic_year = co2.academic_year
            AND co1.day_of_week = co2.day_of_week
            AND (co1.start_time < co2.end_time AND co1.end_time > co2.start_time)
        `, [req.params.offeringId, req.params.studentId]);

        res.json({
            success: true,
            hasConflicts: rows.length > 0,
            conflicts: rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/enrollments/validate/:studentId/:offeringId
 * Comprehensive validation for registration
 * Checks all constraints and returns detailed results
 */
router.get('/validate/:studentId/:offeringId', async (req, res, next) => {
    try {
        const { studentId, offeringId } = req.params;

        // Get student info
        const [studentRows] = await db.query(`
            SELECT s.*, d.department_code
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.department_id = d.department_id
            WHERE s.student_id = ?
        `, [studentId]);

        if (studentRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        // Get offering info
        const [offeringRows] = await db.query(`
            SELECT co.*, c.course_id, c.course_code, c.course_name, c.credits
            FROM COURSE_OFFERING co
            JOIN COURSE c ON co.course_id = c.course_id
            WHERE co.offering_id = ?
        `, [offeringId]);

        if (offeringRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Offering not found'
            });
        }

        const student = studentRows[0];
        const offering = offeringRows[0];

        // Check all constraints
        const validations = {
            student: {
                id: student.student_id,
                name: student.name,
                currentSemester: student.current_semester,
                maxCredits: student.max_credits_per_semester
            },
            course: {
                id: offering.course_id,
                code: offering.course_code,
                name: offering.course_name,
                credits: offering.credits
            },
            offering: {
                id: offering.offering_id,
                semester: offering.semester,
                year: offering.academic_year,
                capacity: offering.capacity,
                enrolled: offering.enrolled_count,
                available: offering.capacity - offering.enrolled_count
            },
            checks: {}
        };

        // Check 1: Already registered?
        const [existingReg] = await db.query(`
            SELECT 1 FROM ENROLLMENT
            WHERE student_id = ? AND offering_id = ?
        `, [studentId, offeringId]);
        validations.checks.alreadyRegistered = existingReg.length > 0;

        // Check 2: Already completed?
        const [completedCourse] = await db.query(`
            SELECT 1 FROM COMPLETED_COURSE
            WHERE student_id = ? AND course_id = ?
        `, [studentId, offering.course_id]);
        validations.checks.alreadyCompleted = completedCourse.length > 0;

        // Check 3: Capacity available?
        validations.checks.hasCapacity = offering.enrolled_count < offering.capacity;

        // Check 4: Missing prerequisites?
        const [missingPrereqs] = await db.query(`
            SELECT prereq.course_code, prereq.course_name
            FROM COURSE_PREREQUISITE cp
            JOIN COURSE prereq ON cp.prerequisite_course_id = prereq.course_id
            WHERE cp.course_id = ? AND cp.is_strict = TRUE
            AND NOT EXISTS (
                SELECT 1 FROM COMPLETED_COURSE cc
                WHERE cc.student_id = ? AND cc.course_id = prereq.course_id
            )
        `, [offering.course_id, studentId]);
        validations.checks.missingPrerequisites = missingPrereqs;
        validations.checks.hasAllPrerequisites = missingPrereqs.length === 0;

        // Check 5: Credit limit?
        const [currentCredits] = await db.query(`
            SELECT COALESCE(SUM(c.credits), 0) AS current
            FROM ENROLLMENT e
            JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
            JOIN COURSE c ON co.course_id = c.course_id
            WHERE e.student_id = ? AND e.status = 'REGISTERED'
            AND co.semester = ? AND co.academic_year = ?
        `, [studentId, offering.semester, offering.academic_year]);

        const currentCreditLoad = currentCredits[0].current;
        const newTotalCredits = currentCreditLoad + offering.credits;
        validations.checks.currentCreditLoad = currentCreditLoad;
        validations.checks.newTotalCredits = newTotalCredits;
        validations.checks.withinCreditLimit = newTotalCredits <= student.max_credits_per_semester;

        // Check 6: Time conflicts?
        const [conflicts] = await db.query(`
            SELECT c.course_code, c.course_name
            FROM ENROLLMENT e
            JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
            JOIN COURSE c ON co.course_id = c.course_id
            WHERE e.student_id = ? AND e.status = 'REGISTERED'
            AND co.semester = ? AND co.academic_year = ?
            AND co.day_of_week = ?
            AND (co.start_time < ? AND co.end_time > ?)
        `, [studentId, offering.semester, offering.academic_year,
            offering.day_of_week, offering.end_time, offering.start_time]);
        validations.checks.timeConflicts = conflicts;
        validations.checks.hasTimeConflicts = conflicts.length > 0;

        // Overall validation result
        validations.isValid =
            !validations.checks.alreadyRegistered &&
            !validations.checks.alreadyCompleted &&
            validations.checks.hasCapacity &&
            validations.checks.hasAllPrerequisites &&
            validations.checks.withinCreditLimit &&
            !validations.checks.hasTimeConflicts;

        res.json({ success: true, data: validations });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
