-- ============================================================================
-- Smart Course Registration & Prerequisite Management System
-- Stored Procedures (MySQL 8.0+)
-- ============================================================================
-- Phase 4: Business Logic Procedures
-- ============================================================================

USE course_registration_system;

DELIMITER $$

-- ============================================================================
-- PROCEDURE 1: register_student_for_course
-- ============================================================================
-- Purpose: Validates and registers a student for a course offering
-- Parameters:
--   p_student_id: Student attempting to register
--   p_offering_id: Course offering to register for
-- Returns: Success message or error via SIGNAL
-- Demonstrates: Transactions, error handling, complex validation logic
-- ============================================================================

DROP PROCEDURE IF EXISTS register_student_for_course$$

CREATE PROCEDURE register_student_for_course(
    IN p_student_id INT,
    IN p_offering_id INT
)
BEGIN
    DECLARE v_course_id INT;
    DECLARE v_capacity INT;
    DECLARE v_enrolled_count INT;
    DECLARE v_student_max_credits INT;
    DECLARE v_current_credits INT;
    DECLARE v_course_credits INT;
    DECLARE v_course_code VARCHAR(10);
    DECLARE v_course_name VARCHAR(150);
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_offering_day VARCHAR(10);
    DECLARE v_offering_start TIME;
    DECLARE v_offering_end TIME;
    DECLARE v_offering_semester VARCHAR(20);
    DECLARE v_offering_year INT;
    DECLARE v_missing_prereqs INT;
    DECLARE v_time_conflicts INT;

    -- Error handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- ========================================================================
    -- VALIDATION 1: Check if student exists
    -- ========================================================================
    SELECT name, max_credits_per_semester
    INTO v_student_name, v_student_max_credits
    FROM STUDENT
    WHERE student_id = p_student_id;

    IF v_student_name IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Student does not exist';
    END IF;

    -- ========================================================================
    -- VALIDATION 2: Check if offering exists and get course details
    -- ========================================================================
    SELECT
        co.course_id,
        co.capacity,
        co.enrolled_count,
        co.day_of_week,
        co.start_time,
        co.end_time,
        co.semester,
        co.academic_year,
        c.credits,
        c.course_code,
        c.course_name
    INTO
        v_course_id,
        v_capacity,
        v_enrolled_count,
        v_offering_day,
        v_offering_start,
        v_offering_end,
        v_offering_semester,
        v_offering_year,
        v_course_credits,
        v_course_code,
        v_course_name
    FROM COURSE_OFFERING co
    JOIN COURSE c ON co.course_id = c.course_id
    WHERE co.offering_id = p_offering_id;

    IF v_course_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Course offering does not exist';
    END IF;

    -- ========================================================================
    -- VALIDATION 3: Check if student already registered for this offering
    -- ========================================================================
    IF EXISTS (
        SELECT 1
        FROM ENROLLMENT
        WHERE student_id = p_student_id
        AND offering_id = p_offering_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Student is already registered for this course offering';
    END IF;

    -- ========================================================================
    -- VALIDATION 4: Check if student has already completed this course
    -- ========================================================================
    IF EXISTS (
        SELECT 1
        FROM COMPLETED_COURSE
        WHERE student_id = p_student_id
        AND course_id = v_course_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Student has already completed this course';
    END IF;

    -- ========================================================================
    -- VALIDATION 5: Check if course has available seats
    -- ========================================================================
    IF v_enrolled_count >= v_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Course is full - no available seats';
    END IF;

    -- ========================================================================
    -- VALIDATION 6: Check prerequisites
    -- ========================================================================
    SELECT COUNT(*)
    INTO v_missing_prereqs
    FROM COURSE_PREREQUISITE cp
    WHERE cp.course_id = v_course_id
    AND cp.is_strict = TRUE
    AND NOT EXISTS (
        SELECT 1
        FROM COMPLETED_COURSE cc
        WHERE cc.student_id = p_student_id
        AND cc.course_id = cp.prerequisite_course_id
    );

    IF v_missing_prereqs > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Student has not completed all required prerequisites';
    END IF;

    -- ========================================================================
    -- VALIDATION 7: Check credit limit
    -- ========================================================================
    SELECT COALESCE(SUM(c.credits), 0)
    INTO v_current_credits
    FROM ENROLLMENT e
    JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
    JOIN COURSE c ON co.course_id = c.course_id
    WHERE e.student_id = p_student_id
    AND e.status = 'REGISTERED'
    AND co.semester = v_offering_semester
    AND co.academic_year = v_offering_year;

    IF (v_current_credits + v_course_credits) > v_student_max_credits THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Registration would exceed student credit limit';
    END IF;

    -- ========================================================================
    -- VALIDATION 8: Check for time conflicts
    -- ========================================================================
    SELECT COUNT(*)
    INTO v_time_conflicts
    FROM ENROLLMENT e
    JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
    WHERE e.student_id = p_student_id
    AND e.status = 'REGISTERED'
    AND co.semester = v_offering_semester
    AND co.academic_year = v_offering_year
    AND co.day_of_week = v_offering_day
    AND (
        (co.start_time < v_offering_end AND co.end_time > v_offering_start)
    );

    IF v_time_conflicts > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Time conflict with another registered course';
    END IF;

    -- ========================================================================
    -- ALL VALIDATIONS PASSED - REGISTER STUDENT
    -- ========================================================================
    INSERT INTO ENROLLMENT (student_id, offering_id, registration_date, status)
    VALUES (p_student_id, p_offering_id, CURRENT_DATE, 'REGISTERED');

    -- The trigger will automatically update enrolled_count

    COMMIT;

    -- Success message
    SELECT CONCAT(
        'SUCCESS: Student ',
        v_student_name,
        ' successfully registered for ',
        v_course_code,
        ' - ',
        v_course_name
    ) AS message;

END$$

-- ============================================================================
-- PROCEDURE 2: complete_student_course
-- ============================================================================
-- Purpose: Completes a student's enrollment and records final grade
-- Parameters:
--   p_enrollment_id: Enrollment to complete
--   p_final_grade: Final grade (A, A-, B+, etc.)
-- Returns: Success message or error
-- Demonstrates: Transaction handling, grade validation, status updates
-- ============================================================================

DROP PROCEDURE IF EXISTS complete_student_course$$

CREATE PROCEDURE complete_student_course(
    IN p_enrollment_id INT,
    IN p_final_grade VARCHAR(3)
)
BEGIN
    DECLARE v_student_id INT;
    DECLARE v_offering_id INT;
    DECLARE v_course_id INT;
    DECLARE v_current_status VARCHAR(20);
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_course_code VARCHAR(10);
    DECLARE v_semester VARCHAR(20);
    DECLARE v_year INT;

    -- Error handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- ========================================================================
    -- VALIDATION 1: Check if enrollment exists and get details
    -- ========================================================================
    SELECT
        e.student_id,
        e.offering_id,
        e.status,
        co.course_id,
        co.semester,
        co.academic_year,
        s.name,
        c.course_code
    INTO
        v_student_id,
        v_offering_id,
        v_current_status,
        v_course_id,
        v_semester,
        v_year,
        v_student_name,
        v_course_code
    FROM ENROLLMENT e
    JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
    JOIN STUDENT s ON e.student_id = s.student_id
    JOIN COURSE c ON co.course_id = c.course_id
    WHERE e.enrollment_id = p_enrollment_id;

    IF v_student_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Enrollment does not exist';
    END IF;

    -- ========================================================================
    -- VALIDATION 2: Check if enrollment is registered (not already completed/dropped)
    -- ========================================================================
    IF v_current_status != 'REGISTERED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Enrollment is not in REGISTERED status';
    END IF;

    -- ========================================================================
    -- VALIDATION 3: Validate grade
    -- ========================================================================
    IF p_final_grade NOT IN ('A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'I', 'W') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Invalid grade. Must be A, A-, B+, B, B-, C+, C, D, F, I, or W';
    END IF;

    -- ========================================================================
    -- STEP 1: Update enrollment status to COMPLETED
    -- ========================================================================
    UPDATE ENROLLMENT
    SET status = 'COMPLETED'
    WHERE enrollment_id = p_enrollment_id;

    -- The trigger will create COMPLETED_COURSE record with placeholder grade

    -- ========================================================================
    -- STEP 2: Update the grade in COMPLETED_COURSE
    -- ========================================================================
    -- Update existing record (created by trigger) with actual grade
    UPDATE COMPLETED_COURSE
    SET
        grade = p_final_grade,
        completion_semester = v_semester,
        completion_year = v_year
    WHERE student_id = v_student_id
    AND course_id = v_course_id;

    COMMIT;

    -- Success message
    SELECT CONCAT(
        'SUCCESS: Course completed for ',
        v_student_name,
        ' - ',
        v_course_code,
        ' with grade ',
        p_final_grade
    ) AS message;

END$$

-- ============================================================================
-- PROCEDURE 3: get_student_transcript
-- ============================================================================
-- Purpose: Generates a complete transcript for a student
-- Parameters:
--   p_student_id: Student ID
-- Returns: Result set with transcript details
-- Demonstrates: Complex SELECT with calculations, result set return
-- ============================================================================

DROP PROCEDURE IF EXISTS get_student_transcript$$

CREATE PROCEDURE get_student_transcript(
    IN p_student_id INT
)
BEGIN
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_department_name VARCHAR(100);

    -- Get student info
    SELECT s.name, d.department_name
    INTO v_student_name, v_department_name
    FROM STUDENT s
    JOIN DEPARTMENT d ON s.department_id = d.department_id
    WHERE s.student_id = p_student_id;

    IF v_student_name IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Student does not exist';
    END IF;

    -- Return student header info
    SELECT
        p_student_id AS student_id,
        v_student_name AS student_name,
        v_department_name AS department;

    -- Return transcript details
    SELECT
        c.course_code,
        c.course_name,
        c.credits,
        cc.grade,
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
        cc.completion_semester,
        cc.completion_year,
        CONCAT(cc.completion_semester, ' ', cc.completion_year) AS term
    FROM COMPLETED_COURSE cc
    JOIN COURSE c ON cc.course_id = c.course_id
    WHERE cc.student_id = p_student_id
    ORDER BY cc.completion_year, cc.completion_semester, c.course_code;

    -- Return summary statistics
    SELECT
        COUNT(*) AS total_courses,
        SUM(c.credits) AS total_credits,
        ROUND(
            SUM(c.credits * CASE cc.grade
                WHEN 'A' THEN 4.0
                WHEN 'A-' THEN 3.7
                WHEN 'B+' THEN 3.3
                WHEN 'B' THEN 3.0
                WHEN 'B-' THEN 2.7
                WHEN 'C+' THEN 2.3
                WHEN 'C' THEN 2.0
                WHEN 'D' THEN 1.0
                WHEN 'F' THEN 0.0
                ELSE 0
            END) / SUM(c.credits),
            2
        ) AS cumulative_gpa
    FROM COMPLETED_COURSE cc
    JOIN COURSE c ON cc.course_id = c.course_id
    WHERE cc.student_id = p_student_id;

END$$

-- ============================================================================
-- PROCEDURE 4: check_prerequisites
-- ============================================================================
-- Purpose: Checks if a student has completed all prerequisites for a course
-- Parameters:
--   p_student_id: Student ID
--   p_course_id: Course to check prerequisites for
-- Returns: List of missing prerequisites or success message
-- Demonstrates: Complex prerequisite validation logic
-- ============================================================================

DROP PROCEDURE IF EXISTS check_prerequisites$$

CREATE PROCEDURE check_prerequisites(
    IN p_student_id INT,
    IN p_course_id INT
)
BEGIN
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_course_code VARCHAR(10);
    DECLARE v_course_name VARCHAR(150);
    DECLARE v_missing_count INT;

    -- Get student and course info
    SELECT s.name
    INTO v_student_name
    FROM STUDENT s
    WHERE s.student_id = p_student_id;

    SELECT c.course_code, c.course_name
    INTO v_course_code, v_course_name
    FROM COURSE c
    WHERE c.course_id = p_course_id;

    IF v_student_name IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Student does not exist';
    END IF;

    IF v_course_code IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Course does not exist';
    END IF;

    -- Count missing prerequisites
    SELECT COUNT(*)
    INTO v_missing_count
    FROM COURSE_PREREQUISITE cp
    WHERE cp.course_id = p_course_id
    AND cp.is_strict = TRUE
    AND NOT EXISTS (
        SELECT 1
        FROM COMPLETED_COURSE cc
        WHERE cc.student_id = p_student_id
        AND cc.course_id = cp.prerequisite_course_id
    );

    -- Return header
    SELECT
        v_student_name AS student_name,
        v_course_code AS course_code,
        v_course_name AS course_name,
        v_missing_count AS missing_prerequisites_count;

    -- Return missing prerequisites if any
    IF v_missing_count > 0 THEN
        SELECT
            prereq.course_code AS missing_prerequisite_code,
            prereq.course_name AS missing_prerequisite_name,
            cp.is_strict
        FROM COURSE_PREREQUISITE cp
        JOIN COURSE prereq ON cp.prerequisite_course_id = prereq.course_id
        WHERE cp.course_id = p_course_id
        AND cp.is_strict = TRUE
        AND NOT EXISTS (
            SELECT 1
            FROM COMPLETED_COURSE cc
            WHERE cc.student_id = p_student_id
            AND cc.course_id = cp.prerequisite_course_id
        )
        ORDER BY prereq.course_code;
    ELSE
        SELECT 'All prerequisites satisfied' AS status;
    END IF;

END$$

-- ============================================================================
-- PROCEDURE 5: drop_course
-- ============================================================================
-- Purpose: Allows a student to drop a registered course
-- Parameters:
--   p_student_id: Student ID
--   p_offering_id: Offering ID to drop
-- Returns: Success message or error
-- Demonstrates: Status updates, trigger interaction
-- ============================================================================

DROP PROCEDURE IF EXISTS drop_course$$

CREATE PROCEDURE drop_course(
    IN p_student_id INT,
    IN p_offering_id INT
)
BEGIN
    DECLARE v_enrollment_id INT;
    DECLARE v_current_status VARCHAR(20);
    DECLARE v_course_code VARCHAR(10);
    DECLARE v_student_name VARCHAR(100);

    -- Error handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if enrollment exists
    SELECT
        e.enrollment_id,
        e.status,
        c.course_code,
        s.name
    INTO
        v_enrollment_id,
        v_current_status,
        v_course_code,
        v_student_name
    FROM ENROLLMENT e
    JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
    JOIN COURSE c ON co.course_id = c.course_id
    JOIN STUDENT s ON e.student_id = s.student_id
    WHERE e.student_id = p_student_id
    AND e.offering_id = p_offering_id;

    IF v_enrollment_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Enrollment not found';
    END IF;

    IF v_current_status != 'REGISTERED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Can only drop courses with REGISTERED status';
    END IF;

    -- Update status to DROPPED
    UPDATE ENROLLMENT
    SET status = 'DROPPED'
    WHERE enrollment_id = v_enrollment_id;

    -- Trigger will automatically update enrolled_count

    COMMIT;

    SELECT CONCAT(
        'SUCCESS: ',
        v_student_name,
        ' dropped ',
        v_course_code
    ) AS message;

END$$

DELIMITER ;

-- ============================================================================
-- STORED PROCEDURES SUMMARY
-- ============================================================================
-- Created 5 procedures:
-- 1. register_student_for_course - Complete registration with 8 validations
-- 2. complete_student_course - Mark enrollment complete with grade
-- 3. get_student_transcript - Generate complete academic transcript
-- 4. check_prerequisites - Validate prerequisite completion
-- 5. drop_course - Drop a registered course
--
-- Demonstrates:
-- - Transactions (START TRANSACTION, COMMIT, ROLLBACK)
-- - Error handling (DECLARE EXIT HANDLER, SIGNAL SQLSTATE)
-- - Complex validation logic
-- - Multiple result sets
-- - Integration with triggers
-- - Business logic encapsulation
-- ============================================================================
