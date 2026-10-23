-- ============================================================================
-- Smart Course Registration & Prerequisite Management System
-- User-Defined Functions (MySQL 8.0+)
-- ============================================================================
-- Phase 4: Reusable Functions for Calculations
-- ============================================================================

USE course_registration_system;

DELIMITER $$

-- ============================================================================
-- FUNCTION 1: get_student_total_credits
-- ============================================================================
-- Purpose: Calculate total credits successfully completed by a student
-- Parameters:
--   p_student_id: Student ID
-- Returns: Total credits earned (INT)
-- Demonstrates: Aggregate calculation, DETERMINISTIC function
-- ============================================================================

DROP FUNCTION IF EXISTS get_student_total_credits$$

CREATE FUNCTION get_student_total_credits(
    p_student_id INT
)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_credits INT;

    SELECT COALESCE(SUM(c.credits), 0)
    INTO v_total_credits
    FROM COMPLETED_COURSE cc
    JOIN COURSE c ON cc.course_id = c.course_id
    WHERE cc.student_id = p_student_id
    AND cc.grade NOT IN ('F', 'W', 'I');  -- Exclude failed, withdrawn, incomplete

    RETURN v_total_credits;
END$$

-- Example usage:
-- SELECT get_student_total_credits(4) AS total_credits;
--
-- SELECT
--     student_id,
--     name,
--     get_student_total_credits(student_id) AS credits_earned
-- FROM STUDENT
-- ORDER BY credits_earned DESC;

-- ============================================================================
-- FUNCTION 2: get_available_seats
-- ============================================================================
-- Purpose: Calculate available seats for a course offering
-- Parameters:
--   p_offering_id: Course offering ID
-- Returns: Number of available seats (INT)
-- Demonstrates: Simple calculation function, NULL handling
-- ============================================================================

DROP FUNCTION IF EXISTS get_available_seats$$

CREATE FUNCTION get_available_seats(
    p_offering_id INT
)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_capacity INT;
    DECLARE v_enrolled INT;
    DECLARE v_available INT;

    SELECT capacity, enrolled_count
    INTO v_capacity, v_enrolled
    FROM COURSE_OFFERING
    WHERE offering_id = p_offering_id;

    -- Handle case where offering doesn't exist
    IF v_capacity IS NULL THEN
        RETURN -1;  -- Error indicator
    END IF;

    SET v_available = v_capacity - v_enrolled;

    RETURN v_available;
END$$

-- Example usage:
-- SELECT get_available_seats(1) AS available_seats;
--
-- SELECT
--     co.offering_id,
--     c.course_code,
--     c.course_name,
--     co.capacity,
--     co.enrolled_count,
--     get_available_seats(co.offering_id) AS available_seats
-- FROM COURSE_OFFERING co
-- JOIN COURSE c ON co.course_id = c.course_id
-- WHERE co.semester = 'Fall' AND co.academic_year = 2025;

-- ============================================================================
-- FUNCTION 3: calculate_gpa
-- ============================================================================
-- Purpose: Calculate GPA for a student
-- Parameters:
--   p_student_id: Student ID
-- Returns: GPA as DECIMAL(3,2)
-- Demonstrates: Complex calculation with CASE, grade point conversion
-- ============================================================================

DROP FUNCTION IF EXISTS calculate_gpa$$

CREATE FUNCTION calculate_gpa(
    p_student_id INT
)
RETURNS DECIMAL(3,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_gpa DECIMAL(3,2);

    SELECT ROUND(
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
        END) / NULLIF(SUM(c.credits), 0),
        2
    )
    INTO v_gpa
    FROM COMPLETED_COURSE cc
    JOIN COURSE c ON cc.course_id = c.course_id
    WHERE cc.student_id = p_student_id;

    -- Return 0.00 if no courses completed
    RETURN COALESCE(v_gpa, 0.00);
END$$

-- Example usage:
-- SELECT calculate_gpa(4) AS gpa;
--
-- SELECT
--     s.student_id,
--     s.name,
--     calculate_gpa(s.student_id) AS gpa,
--     CASE
--         WHEN calculate_gpa(s.student_id) >= 3.5 THEN 'Excellent'
--         WHEN calculate_gpa(s.student_id) >= 3.0 THEN 'Good'
--         WHEN calculate_gpa(s.student_id) >= 2.0 THEN 'Satisfactory'
--         ELSE 'Needs Improvement'
--     END AS standing
-- FROM STUDENT s
-- ORDER BY gpa DESC;

-- ============================================================================
-- FUNCTION 4: get_current_semester_credits
-- ============================================================================
-- Purpose: Calculate current semester credit load for a student
-- Parameters:
--   p_student_id: Student ID
--   p_semester: Semester (e.g., 'Fall')
--   p_year: Academic year (e.g., 2025)
-- Returns: Total credits currently registered (INT)
-- Demonstrates: Function with multiple parameters, filtering
-- ============================================================================

DROP FUNCTION IF EXISTS get_current_semester_credits$$

CREATE FUNCTION get_current_semester_credits(
    p_student_id INT,
    p_semester VARCHAR(20),
    p_year INT
)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_current_credits INT;

    SELECT COALESCE(SUM(c.credits), 0)
    INTO v_current_credits
    FROM ENROLLMENT e
    JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
    JOIN COURSE c ON co.course_id = c.course_id
    WHERE e.student_id = p_student_id
    AND e.status = 'REGISTERED'
    AND co.semester = p_semester
    AND co.academic_year = p_year;

    RETURN v_current_credits;
END$$

-- Example usage:
-- SELECT get_current_semester_credits(2, 'Fall', 2025) AS current_credits;
--
-- SELECT
--     s.student_id,
--     s.name,
--     s.max_credits_per_semester,
--     get_current_semester_credits(s.student_id, 'Fall', 2025) AS current_credits,
--     (s.max_credits_per_semester - get_current_semester_credits(s.student_id, 'Fall', 2025)) AS remaining_capacity
-- FROM STUDENT s
-- WHERE get_current_semester_credits(s.student_id, 'Fall', 2025) > 0
-- ORDER BY current_credits DESC;

-- ============================================================================
-- FUNCTION 5: has_prerequisite
-- ============================================================================
-- Purpose: Check if student has completed a specific prerequisite
-- Parameters:
--   p_student_id: Student ID
--   p_course_id: Prerequisite course ID to check
-- Returns: 1 if completed, 0 if not (BOOLEAN as TINYINT)
-- Demonstrates: Boolean function, EXISTS checking
-- ============================================================================

DROP FUNCTION IF EXISTS has_prerequisite$$

CREATE FUNCTION has_prerequisite(
    p_student_id INT,
    p_course_id INT
)
RETURNS TINYINT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_completed TINYINT;

    IF EXISTS (
        SELECT 1
        FROM COMPLETED_COURSE
        WHERE student_id = p_student_id
        AND course_id = p_course_id
    ) THEN
        SET v_completed = 1;
    ELSE
        SET v_completed = 0;
    END IF;

    RETURN v_completed;
END$$

-- Example usage:
-- SELECT has_prerequisite(3, 2) AS has_cs201;  -- Check if student 3 completed CS201
--
-- SELECT
--     s.name,
--     has_prerequisite(s.student_id, 2) AS has_cs201,
--     has_prerequisite(s.student_id, 4) AS has_cs301
-- FROM STUDENT s
-- WHERE s.department_id = (SELECT department_id FROM DEPARTMENT WHERE department_code = 'CS');

-- ============================================================================
-- FUNCTION 6: can_register_for_course
-- ============================================================================
-- Purpose: Comprehensive eligibility check for course registration
-- Parameters:
--   p_student_id: Student ID
--   p_course_id: Course ID to check eligibility for
-- Returns: 1 if eligible, 0 if not (BOOLEAN as TINYINT)
-- Demonstrates: Complex business logic, multiple condition checking
-- ============================================================================

DROP FUNCTION IF EXISTS can_register_for_course$$

CREATE FUNCTION can_register_for_course(
    p_student_id INT,
    p_course_id INT
)
RETURNS TINYINT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_can_register TINYINT DEFAULT 1;
    DECLARE v_missing_prereqs INT;

    -- Check if already completed
    IF EXISTS (
        SELECT 1
        FROM COMPLETED_COURSE
        WHERE student_id = p_student_id
        AND course_id = p_course_id
    ) THEN
        SET v_can_register = 0;
        RETURN v_can_register;
    END IF;

    -- Check if already registered
    IF EXISTS (
        SELECT 1
        FROM ENROLLMENT e
        JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
        WHERE e.student_id = p_student_id
        AND co.course_id = p_course_id
        AND e.status = 'REGISTERED'
    ) THEN
        SET v_can_register = 0;
        RETURN v_can_register;
    END IF;

    -- Check prerequisites
    SELECT COUNT(*)
    INTO v_missing_prereqs
    FROM COURSE_PREREQUISITE cp
    WHERE cp.course_id = p_course_id
    AND cp.is_strict = TRUE
    AND NOT EXISTS (
        SELECT 1
        FROM COMPLETED_COURSE cc
        WHERE cc.student_id = p_student_id
        AND cc.course_id = cp.prerequisite_course_id
    );

    IF v_missing_prereqs > 0 THEN
        SET v_can_register = 0;
    END IF;

    RETURN v_can_register;
END$$

-- Example usage:
-- SELECT can_register_for_course(3, 6) AS can_register_cs401;
--
-- SELECT
--     c.course_code,
--     c.course_name,
--     CASE
--         WHEN can_register_for_course(3, c.course_id) = 1 THEN 'Eligible'
--         ELSE 'Not Eligible'
--     END AS eligibility
-- FROM COURSE c
-- WHERE c.department_id = (SELECT department_id FROM DEPARTMENT WHERE department_code = 'CS')
-- ORDER BY c.course_code;

-- ============================================================================
-- FUNCTION 7: get_course_fill_percentage
-- ============================================================================
-- Purpose: Calculate percentage of seats filled for a course offering
-- Parameters:
--   p_offering_id: Course offering ID
-- Returns: Fill percentage as DECIMAL(5,2)
-- Demonstrates: Percentage calculation, division handling
-- ============================================================================

DROP FUNCTION IF EXISTS get_course_fill_percentage$$

CREATE FUNCTION get_course_fill_percentage(
    p_offering_id INT
)
RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_capacity INT;
    DECLARE v_enrolled INT;
    DECLARE v_percentage DECIMAL(5,2);

    SELECT capacity, enrolled_count
    INTO v_capacity, v_enrolled
    FROM COURSE_OFFERING
    WHERE offering_id = p_offering_id;

    IF v_capacity IS NULL OR v_capacity = 0 THEN
        RETURN 0.00;
    END IF;

    SET v_percentage = ROUND((v_enrolled / v_capacity * 100), 2);

    RETURN v_percentage;
END$$

-- Example usage:
-- SELECT get_course_fill_percentage(1) AS fill_percentage;
--
-- SELECT
--     c.course_code,
--     c.course_name,
--     co.capacity,
--     co.enrolled_count,
--     get_course_fill_percentage(co.offering_id) AS fill_percentage
-- FROM COURSE_OFFERING co
-- JOIN COURSE c ON co.course_id = c.course_id
-- WHERE co.semester = 'Fall' AND co.academic_year = 2025
-- ORDER BY fill_percentage DESC;

DELIMITER ;

-- ============================================================================
-- FUNCTIONS SUMMARY
-- ============================================================================
-- Created 7 functions:
-- 1. get_student_total_credits - Total credits earned by student
-- 2. get_available_seats - Available seats in offering
-- 3. calculate_gpa - Student GPA calculation
-- 4. get_current_semester_credits - Current semester credit load
-- 5. has_prerequisite - Check if prerequisite completed
-- 6. can_register_for_course - Comprehensive eligibility check
-- 7. get_course_fill_percentage - Course fill rate percentage
--
-- Demonstrates:
-- - DETERMINISTIC functions
-- - READS SQL DATA declaration
-- - Return types (INT, DECIMAL, TINYINT)
-- - NULL handling with COALESCE and NULLIF
-- - Complex calculations
-- - Boolean logic (TINYINT as boolean)
-- - Multiple parameters
-- - Aggregate functions within UDFs
-- ============================================================================

-- ============================================================================
-- COMBINED FUNCTION USAGE EXAMPLE
-- ============================================================================
-- Query that uses multiple functions together

SELECT
    s.student_id,
    s.name AS student_name,
    s.current_semester,
    get_student_total_credits(s.student_id) AS total_credits_earned,
    calculate_gpa(s.student_id) AS gpa,
    get_current_semester_credits(s.student_id, 'Fall', 2025) AS fall_2025_credits,
    s.max_credits_per_semester AS credit_limit,
    (s.max_credits_per_semester - get_current_semester_credits(s.student_id, 'Fall', 2025)) AS remaining_capacity,
    has_prerequisite(s.student_id, 4) AS has_algorithms,
    can_register_for_course(s.student_id, 6) AS can_take_advanced_algo
FROM STUDENT s
WHERE s.department_id = (SELECT department_id FROM DEPARTMENT WHERE department_code = 'CS')
ORDER BY gpa DESC;

-- ============================================================================
