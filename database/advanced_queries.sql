-- ============================================================================
-- Smart Course Registration & Prerequisite Management System
-- Advanced SQL Queries (MySQL 8.0+)
-- ============================================================================
-- Phase 4: Demonstrates Complex SQL Concepts for DBMS Viva
-- ============================================================================

USE course_registration_system;

-- ============================================================================
-- QUERY 1: Basic SELECT with WHERE
-- ============================================================================
-- Question: Find all Computer Science students
-- Demonstrates: SELECT, WHERE, JOIN

SELECT
    s.student_id,
    s.name,
    s.email,
    s.current_semester,
    d.department_name
FROM STUDENT s
JOIN DEPARTMENT d ON s.department_id = d.department_id
WHERE d.department_code = 'CS';

-- ============================================================================
-- QUERY 2: ORDER BY
-- ============================================================================
-- Question: List all courses ordered by credits (descending) and name
-- Demonstrates: ORDER BY with multiple columns

SELECT
    course_code,
    course_name,
    credits,
    description
FROM COURSE
ORDER BY credits DESC, course_name ASC;

-- ============================================================================
-- QUERY 3: GROUP BY with Aggregate Functions
-- ============================================================================
-- Question: How many students are in each department?
-- Demonstrates: GROUP BY, COUNT, JOIN

SELECT
    d.department_name,
    d.department_code,
    COUNT(s.student_id) AS student_count
FROM DEPARTMENT d
LEFT JOIN STUDENT s ON d.department_id = s.department_id
GROUP BY d.department_id, d.department_name, d.department_code
ORDER BY student_count DESC;

-- ============================================================================
-- QUERY 4: HAVING clause
-- ============================================================================
-- Question: Which departments have more than 3 students?
-- Demonstrates: GROUP BY, HAVING, aggregate filtering

SELECT
    d.department_name,
    COUNT(s.student_id) AS student_count
FROM DEPARTMENT d
JOIN STUDENT s ON d.department_id = s.department_id
GROUP BY d.department_id, d.department_name
HAVING COUNT(s.student_id) > 3
ORDER BY student_count DESC;

-- ============================================================================
-- QUERY 5: Multiple Aggregate Functions
-- ============================================================================
-- Question: What are the enrollment statistics for each course offering?
-- Demonstrates: COUNT, SUM, AVG, MIN, MAX

SELECT
    c.course_code,
    c.course_name,
    co.semester,
    co.academic_year,
    co.capacity,
    co.enrolled_count,
    (co.capacity - co.enrolled_count) AS available_seats,
    ROUND((co.enrolled_count / co.capacity * 100), 2) AS fill_percentage
FROM COURSE_OFFERING co
JOIN COURSE c ON co.course_id = c.course_id
WHERE co.semester = 'Fall' AND co.academic_year = 2025
ORDER BY fill_percentage DESC;

-- ============================================================================
-- QUERY 6: INNER JOIN - Multiple Tables
-- ============================================================================
-- Question: Show all current enrollments with student, course, and faculty details
-- Demonstrates: INNER JOIN across 5 tables

SELECT
    s.name AS student_name,
    c.course_code,
    c.course_name,
    f.faculty_name AS instructor,
    co.semester,
    co.academic_year,
    co.day_of_week,
    co.start_time,
    co.end_time,
    co.room_number,
    e.status
FROM ENROLLMENT e
INNER JOIN STUDENT s ON e.student_id = s.student_id
INNER JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
INNER JOIN COURSE c ON co.course_id = c.course_id
INNER JOIN FACULTY f ON co.faculty_id = f.faculty_id
WHERE e.status = 'REGISTERED'
ORDER BY s.name, c.course_code;

-- ============================================================================
-- QUERY 7: LEFT JOIN
-- ============================================================================
-- Question: Show all courses and their enrollment counts (including courses with no enrollments)
-- Demonstrates: LEFT JOIN, handling NULL values

SELECT
    c.course_code,
    c.course_name,
    co.semester,
    co.academic_year,
    COALESCE(COUNT(e.enrollment_id), 0) AS actual_enrollments,
    co.enrolled_count AS stored_count
FROM COURSE c
LEFT JOIN COURSE_OFFERING co ON c.course_id = co.course_id
LEFT JOIN ENROLLMENT e ON co.offering_id = e.offering_id AND e.status = 'REGISTERED'
WHERE co.semester = 'Fall' AND co.academic_year = 2025
GROUP BY c.course_id, c.course_code, c.course_name, co.semester, co.academic_year, co.enrolled_count
ORDER BY c.course_code;

-- ============================================================================
-- QUERY 8: Complex 5-Table JOIN with Aggregation
-- ============================================================================
-- Question: For each department, show course offerings and total enrollments
-- Demonstrates: Multi-table JOIN, GROUP BY, aggregate functions

SELECT
    d.department_name,
    c.course_code,
    c.course_name,
    f.faculty_name AS instructor,
    co.semester,
    co.academic_year,
    COUNT(e.enrollment_id) AS total_enrollments,
    co.capacity,
    (co.capacity - COUNT(e.enrollment_id)) AS seats_remaining
FROM DEPARTMENT d
JOIN COURSE c ON d.department_id = c.department_id
JOIN COURSE_OFFERING co ON c.course_id = co.course_id
JOIN FACULTY f ON co.faculty_id = f.faculty_id
LEFT JOIN ENROLLMENT e ON co.offering_id = e.offering_id AND e.status = 'REGISTERED'
WHERE co.semester = 'Fall' AND co.academic_year = 2025
GROUP BY d.department_id, d.department_name, c.course_id, c.course_code,
         c.course_name, f.faculty_name, co.semester, co.academic_year, co.capacity
ORDER BY d.department_name, c.course_code;

-- ============================================================================
-- QUERY 9: Nested Subquery
-- ============================================================================
-- Question: Find students who have completed more courses than the average student
-- Demonstrates: Nested subquery, comparison with aggregate result

SELECT
    s.name,
    s.email,
    COUNT(cc.completion_id) AS courses_completed
FROM STUDENT s
JOIN COMPLETED_COURSE cc ON s.student_id = cc.student_id
GROUP BY s.student_id, s.name, s.email
HAVING COUNT(cc.completion_id) > (
    SELECT AVG(course_count)
    FROM (
        SELECT COUNT(*) AS course_count
        FROM COMPLETED_COURSE
        GROUP BY student_id
    ) AS avg_calc
)
ORDER BY courses_completed DESC;

-- ============================================================================
-- QUERY 10: Correlated Subquery
-- ============================================================================
-- Question: Find courses that have more prerequisites than average
-- Demonstrates: Correlated subquery

SELECT
    c.course_code,
    c.course_name,
    (
        SELECT COUNT(*)
        FROM COURSE_PREREQUISITE cp
        WHERE cp.course_id = c.course_id
    ) AS prerequisite_count
FROM COURSE c
WHERE (
    SELECT COUNT(*)
    FROM COURSE_PREREQUISITE cp
    WHERE cp.course_id = c.course_id
) > (
    SELECT AVG(prereq_count)
    FROM (
        SELECT COUNT(*) AS prereq_count
        FROM COURSE_PREREQUISITE
        GROUP BY course_id
    ) AS avg_prereqs
)
ORDER BY prerequisite_count DESC;

-- ============================================================================
-- QUERY 11: EXISTS
-- ============================================================================
-- Question: Find students who have at least one completed course
-- Demonstrates: EXISTS clause

SELECT
    s.student_id,
    s.name,
    s.email,
    d.department_name
FROM STUDENT s
JOIN DEPARTMENT d ON s.department_id = d.department_id
WHERE EXISTS (
    SELECT 1
    FROM COMPLETED_COURSE cc
    WHERE cc.student_id = s.student_id
)
ORDER BY s.name;

-- ============================================================================
-- QUERY 12: NOT EXISTS
-- ============================================================================
-- Question: Find courses that have never been completed by any student
-- Demonstrates: NOT EXISTS clause

SELECT
    c.course_code,
    c.course_name,
    c.credits,
    d.department_name
FROM COURSE c
JOIN DEPARTMENT d ON c.department_id = d.department_id
WHERE NOT EXISTS (
    SELECT 1
    FROM COMPLETED_COURSE cc
    WHERE cc.course_id = c.course_id
)
ORDER BY c.course_code;

-- ============================================================================
-- QUERY 13: IN clause with Subquery
-- ============================================================================
-- Question: Find students enrolled in Computer Science courses
-- Demonstrates: IN with subquery

SELECT DISTINCT
    s.student_id,
    s.name,
    s.email
FROM STUDENT s
JOIN ENROLLMENT e ON s.student_id = e.student_id
WHERE e.offering_id IN (
    SELECT co.offering_id
    FROM COURSE_OFFERING co
    JOIN COURSE c ON co.course_id = c.course_id
    JOIN DEPARTMENT d ON c.department_id = d.department_id
    WHERE d.department_code = 'CS'
)
ORDER BY s.name;

-- ============================================================================
-- QUERY 14: CASE Expression
-- ============================================================================
-- Question: Categorize students by their academic progress
-- Demonstrates: CASE statement, complex expressions

SELECT
    s.name,
    s.current_semester,
    COUNT(cc.completion_id) AS courses_completed,
    CASE
        WHEN s.current_semester <= 2 THEN 'Freshman'
        WHEN s.current_semester <= 4 THEN 'Sophomore'
        WHEN s.current_semester <= 6 THEN 'Junior'
        ELSE 'Senior'
    END AS academic_level,
    CASE
        WHEN COUNT(cc.completion_id) = 0 THEN 'No completions yet'
        WHEN COUNT(cc.completion_id) < 5 THEN 'Early stage'
        WHEN COUNT(cc.completion_id) < 10 THEN 'Mid stage'
        ELSE 'Advanced'
    END AS progress_status
FROM STUDENT s
LEFT JOIN COMPLETED_COURSE cc ON s.student_id = cc.student_id
GROUP BY s.student_id, s.name, s.current_semester
ORDER BY s.current_semester DESC, s.name;

-- ============================================================================
-- QUERY 15: Grade Analysis with CASE
-- ============================================================================
-- Question: Analyze grade distribution and GPA calculation
-- Demonstrates: CASE for grade points, AVG, complex calculation

SELECT
    s.name AS student_name,
    COUNT(cc.completion_id) AS total_courses,
    ROUND(AVG(
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
        END
    ), 2) AS gpa,
    CASE
        WHEN AVG(
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
            END
        ) >= 3.7 THEN 'Excellent'
        WHEN AVG(
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
            END
        ) >= 3.0 THEN 'Good'
        WHEN AVG(
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
            END
        ) >= 2.0 THEN 'Satisfactory'
        ELSE 'Needs Improvement'
    END AS performance_category
FROM STUDENT s
JOIN COMPLETED_COURSE cc ON s.student_id = cc.student_id
GROUP BY s.student_id, s.name
HAVING COUNT(cc.completion_id) > 0
ORDER BY gpa DESC;

-- ============================================================================
-- QUERY 16: Prerequisite Checking for a Specific Course
-- ============================================================================
-- Question: Check if a specific student has completed all prerequisites for CS401
-- Demonstrates: NOT EXISTS with nested subquery, prerequisite validation

-- Check if student with ID 3 (Charlie) can register for CS401
SELECT
    s.name AS student_name,
    c.course_code,
    c.course_name,
    CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM COURSE_PREREQUISITE cp
            WHERE cp.course_id = c.course_id
            AND NOT EXISTS (
                SELECT 1
                FROM COMPLETED_COURSE cc
                WHERE cc.student_id = s.student_id
                AND cc.course_id = cp.prerequisite_course_id
            )
        ) THEN 'All prerequisites completed'
        ELSE 'Missing prerequisites'
    END AS prerequisite_status
FROM STUDENT s
CROSS JOIN COURSE c
WHERE s.student_id = 3
AND c.course_code = 'CS401';

-- ============================================================================
-- QUERY 17: Find Missing Prerequisites for a Student
-- ============================================================================
-- Question: What prerequisites is a student missing for a specific course?
-- Demonstrates: Complex subquery, prerequisite chain analysis

SELECT
    prereq_course.course_code AS missing_prerequisite_code,
    prereq_course.course_name AS missing_prerequisite_name
FROM COURSE target_course
JOIN COURSE_PREREQUISITE cp ON target_course.course_id = cp.course_id
JOIN COURSE prereq_course ON cp.prerequisite_course_id = prereq_course.course_id
WHERE target_course.course_code = 'CS501'
AND NOT EXISTS (
    SELECT 1
    FROM COMPLETED_COURSE cc
    WHERE cc.student_id = 3  -- Charlie
    AND cc.course_id = prereq_course.course_id
)
ORDER BY prereq_course.course_code;

-- ============================================================================
-- QUERY 18: Recursive CTE - Full Prerequisite Chain
-- ============================================================================
-- Question: Show the complete prerequisite chain for Machine Learning (CS501)
-- Demonstrates: Recursive Common Table Expression (CTE), hierarchical data

WITH RECURSIVE PrerequisiteChain AS (
    -- Base case: Start with CS501
    SELECT
        c.course_id,
        c.course_code,
        c.course_name,
        0 AS level,
        CAST(c.course_code AS CHAR(200)) AS path
    FROM COURSE c
    WHERE c.course_code = 'CS501'

    UNION ALL

    -- Recursive case: Find prerequisites
    SELECT
        prereq.course_id,
        prereq.course_code,
        prereq.course_name,
        pc.level + 1 AS level,
        CONCAT(prereq.course_code, ' -> ', pc.path) AS path
    FROM PrerequisiteChain pc
    JOIN COURSE_PREREQUISITE cp ON pc.course_id = cp.course_id
    JOIN COURSE prereq ON cp.prerequisite_course_id = prereq.course_id
)
SELECT
    level,
    course_code,
    course_name,
    path
FROM PrerequisiteChain
ORDER BY level DESC, course_code;

-- ============================================================================
-- QUERY 19: Find All Courses a Course is a Prerequisite For
-- ============================================================================
-- Question: Which courses require CS201 as a prerequisite?
-- Demonstrates: Reverse prerequisite lookup, JOIN

SELECT
    dependent.course_code,
    dependent.course_name,
    dependent.credits,
    cp.is_strict
FROM COURSE_PREREQUISITE cp
JOIN COURSE dependent ON cp.course_id = dependent.course_id
JOIN COURSE prerequisite ON cp.prerequisite_course_id = prerequisite.course_id
WHERE prerequisite.course_code = 'CS201'
ORDER BY dependent.course_code;

-- ============================================================================
-- QUERY 20: Student Credit Load Analysis
-- ============================================================================
-- Question: Calculate current semester credit load for each enrolled student
-- Demonstrates: SUM, GROUP BY, JOIN, filtering

SELECT
    s.student_id,
    s.name AS student_name,
    s.max_credits_per_semester,
    SUM(c.credits) AS current_credits,
    (s.max_credits_per_semester - SUM(c.credits)) AS remaining_capacity,
    CASE
        WHEN SUM(c.credits) >= s.max_credits_per_semester THEN 'At Limit'
        WHEN SUM(c.credits) >= s.max_credits_per_semester * 0.8 THEN 'Near Limit'
        ELSE 'Has Capacity'
    END AS load_status
FROM STUDENT s
JOIN ENROLLMENT e ON s.student_id = e.student_id
JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
JOIN COURSE c ON co.course_id = c.course_id
WHERE e.status = 'REGISTERED'
AND co.semester = 'Fall'
AND co.academic_year = 2025
GROUP BY s.student_id, s.name, s.max_credits_per_semester
ORDER BY current_credits DESC;

-- ============================================================================
-- QUERY 21: Students Eligible for a Specific Course
-- ============================================================================
-- Question: Which students are eligible to register for CS401 (Advanced Algorithms)?
-- Demonstrates: Complex eligibility checking with multiple conditions

SELECT
    s.student_id,
    s.name,
    s.email,
    s.current_semester,
    -- Check if all prerequisites are completed
    CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM COURSE_PREREQUISITE cp
            JOIN COURSE target ON target.course_code = 'CS401'
            WHERE cp.course_id = target.course_id
            AND NOT EXISTS (
                SELECT 1
                FROM COMPLETED_COURSE cc
                WHERE cc.student_id = s.student_id
                AND cc.course_id = cp.prerequisite_course_id
            )
        ) THEN 'Yes'
        ELSE 'No'
    END AS has_prerequisites,
    -- Check if already completed
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM COMPLETED_COURSE cc
            JOIN COURSE c ON cc.course_id = c.course_id
            WHERE cc.student_id = s.student_id
            AND c.course_code = 'CS401'
        ) THEN 'Already Completed'
        ELSE 'Not Completed'
    END AS completion_status,
    -- Check if already registered
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM ENROLLMENT e
            JOIN COURSE_OFFERING co ON e.offering_id = co.offering_id
            JOIN COURSE c ON co.course_id = c.course_id
            WHERE e.student_id = s.student_id
            AND c.course_code = 'CS401'
            AND e.status = 'REGISTERED'
        ) THEN 'Already Registered'
        ELSE 'Not Registered'
    END AS registration_status
FROM STUDENT s
WHERE s.department_id = (SELECT department_id FROM DEPARTMENT WHERE department_code = 'CS')
HAVING has_prerequisites = 'Yes'
    AND completion_status = 'Not Completed'
    AND registration_status = 'Not Registered'
ORDER BY s.current_semester DESC, s.name;

-- ============================================================================
-- QUERY 22: Courses with Available Seats
-- ============================================================================
-- Question: Which courses in Fall 2025 still have available seats?
-- Demonstrates: Calculated columns, filtering, sorting

SELECT
    c.course_code,
    c.course_name,
    f.faculty_name AS instructor,
    co.day_of_week,
    co.start_time,
    co.end_time,
    co.room_number,
    co.capacity,
    co.enrolled_count,
    (co.capacity - co.enrolled_count) AS available_seats,
    ROUND((co.enrolled_count / co.capacity * 100), 2) AS fill_percentage
FROM COURSE_OFFERING co
JOIN COURSE c ON co.course_id = c.course_id
JOIN FACULTY f ON co.faculty_id = f.faculty_id
WHERE co.semester = 'Fall'
AND co.academic_year = 2025
AND co.enrolled_count < co.capacity
ORDER BY available_seats DESC, fill_percentage ASC;

-- ============================================================================
-- QUERY 23: Time Conflict Detection
-- ============================================================================
-- Question: Check if a student has any time conflicts in their current schedule
-- Demonstrates: Self-join, time comparison, complex WHERE conditions

SELECT
    s.name AS student_name,
    c1.course_code AS course1,
    co1.day_of_week,
    co1.start_time AS course1_start,
    co1.end_time AS course1_end,
    c2.course_code AS conflicting_course,
    co2.start_time AS course2_start,
    co2.end_time AS course2_end
FROM STUDENT s
JOIN ENROLLMENT e1 ON s.student_id = e1.student_id
JOIN COURSE_OFFERING co1 ON e1.offering_id = co1.offering_id
JOIN COURSE c1 ON co1.course_id = c1.course_id
JOIN ENROLLMENT e2 ON s.student_id = e2.student_id
JOIN COURSE_OFFERING co2 ON e2.offering_id = co2.offering_id
JOIN COURSE c2 ON co2.course_id = c2.course_id
WHERE e1.status = 'REGISTERED'
AND e2.status = 'REGISTERED'
AND e1.offering_id < e2.offering_id  -- Avoid duplicate pairs
AND co1.day_of_week = co2.day_of_week
AND co1.semester = co2.semester
AND co1.academic_year = co2.academic_year
AND (
    (co1.start_time < co2.end_time AND co1.end_time > co2.start_time)
)
ORDER BY s.name;

-- ============================================================================
-- QUERY 24: Department Performance Statistics
-- ============================================================================
-- Question: Compare departments by student performance and course offerings
-- Demonstrates: Multiple aggregations, complex GROUP BY, multiple JOINs

SELECT
    d.department_name,
    COUNT(DISTINCT s.student_id) AS total_students,
    COUNT(DISTINCT c.course_id) AS total_courses,
    COUNT(DISTINCT co.offering_id) AS total_offerings,
    COUNT(DISTINCT e.enrollment_id) AS total_enrollments,
    ROUND(AVG(
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
        END
    ), 2) AS average_gpa
FROM DEPARTMENT d
LEFT JOIN STUDENT s ON d.department_id = s.department_id
LEFT JOIN COURSE c ON d.department_id = c.department_id
LEFT JOIN COURSE_OFFERING co ON c.course_id = co.course_id
LEFT JOIN ENROLLMENT e ON s.student_id = e.student_id AND e.status = 'REGISTERED'
LEFT JOIN COMPLETED_COURSE cc ON s.student_id = cc.student_id
GROUP BY d.department_id, d.department_name
ORDER BY average_gpa DESC, total_students DESC;

-- ============================================================================
-- QUERY 25: Popular Courses Analysis
-- ============================================================================
-- Question: Which courses have the highest demand (enrollment rate)?
-- Demonstrates: Multiple metrics, ranking, percentage calculation

SELECT
    c.course_code,
    c.course_name,
    c.credits,
    COUNT(DISTINCT co.offering_id) AS times_offered,
    SUM(co.enrolled_count) AS total_enrollments,
    SUM(co.capacity) AS total_capacity,
    ROUND((SUM(co.enrolled_count) / SUM(co.capacity) * 100), 2) AS avg_fill_rate,
    CASE
        WHEN (SUM(co.enrolled_count) / SUM(co.capacity) * 100) >= 90 THEN 'Very High Demand'
        WHEN (SUM(co.enrolled_count) / SUM(co.capacity) * 100) >= 70 THEN 'High Demand'
        WHEN (SUM(co.enrolled_count) / SUM(co.capacity) * 100) >= 50 THEN 'Moderate Demand'
        ELSE 'Low Demand'
    END AS demand_level
FROM COURSE c
JOIN COURSE_OFFERING co ON c.course_id = co.course_id
GROUP BY c.course_id, c.course_code, c.course_name, c.credits
HAVING times_offered > 0
ORDER BY avg_fill_rate DESC, total_enrollments DESC;

-- ============================================================================
-- END OF ADVANCED QUERIES
-- ============================================================================
-- Total Queries: 25
-- Demonstrates: SELECT, WHERE, ORDER BY, GROUP BY, HAVING, aggregates,
--               INNER JOIN, LEFT JOIN, multi-table JOINs, nested subqueries,
--               correlated subqueries, EXISTS, NOT EXISTS, IN, CASE,
--               recursive CTE, prerequisite checking, credit calculation,
--               eligibility checking, time conflicts, and more
-- ============================================================================
