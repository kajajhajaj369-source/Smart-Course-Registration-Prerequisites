-- ============================================================================
-- Smart Course Registration & Prerequisite Management System
-- Sample Data Script (MySQL 8.0+)
-- ============================================================================
-- Phase 3: Realistic Sample Data for Demonstration
-- ============================================================================

USE course_registration_system;

-- ============================================================================
-- SAMPLE DATA: DEPARTMENT
-- ============================================================================

INSERT INTO DEPARTMENT (department_name, department_code) VALUES
('Computer Science', 'CS'),
('Mathematics', 'MATH'),
('Electrical Engineering', 'EE'),
('Business Administration', 'BA'),
('Physics', 'PHY');

-- ============================================================================
-- SAMPLE DATA: FACULTY
-- ============================================================================

INSERT INTO FACULTY (faculty_name, email, department_id, designation) VALUES
-- Computer Science Faculty
('Dr. Sarah Johnson', 'sarah.johnson@college.edu', 1, 'Professor'),
('Dr. Michael Chen', 'michael.chen@college.edu', 1, 'Associate Professor'),
('Dr. Emily Rodriguez', 'emily.rodriguez@college.edu', 1, 'Assistant Professor'),

-- Mathematics Faculty
('Dr. Robert Kumar', 'robert.kumar@college.edu', 2, 'Professor'),
('Dr. Lisa Anderson', 'lisa.anderson@college.edu', 2, 'Associate Professor'),

-- Electrical Engineering Faculty
('Dr. James Wilson', 'james.wilson@college.edu', 3, 'Professor'),
('Dr. Maria Garcia', 'maria.garcia@college.edu', 3, 'Assistant Professor'),

-- Business Administration Faculty
('Dr. David Thompson', 'david.thompson@college.edu', 4, 'Associate Professor'),

-- Physics Faculty
('Dr. Jennifer Lee', 'jennifer.lee@college.edu', 5, 'Professor');

-- ============================================================================
-- SAMPLE DATA: COURSE
-- ============================================================================

INSERT INTO COURSE (course_code, course_name, credits, description, department_id) VALUES
-- Computer Science Courses (Prerequisite Chain)
('CS101', 'Programming Fundamentals', 4, 'Introduction to programming using Python', 1),
('CS201', 'Data Structures', 4, 'Arrays, linked lists, trees, graphs, and algorithms', 1),
('CS202', 'Object-Oriented Programming', 3, 'OOP concepts using Java', 1),
('CS301', 'Algorithms', 4, 'Design and analysis of algorithms', 1),
('CS302', 'Database Management Systems', 3, 'Relational databases, SQL, normalization', 1),
('CS401', 'Advanced Algorithms', 4, 'Advanced algorithm design and complexity theory', 1),
('CS402', 'Web Development', 3, 'Full-stack web development', 1),
('CS501', 'Machine Learning', 4, 'Introduction to machine learning algorithms', 1),

-- Mathematics Courses
('MATH101', 'Calculus I', 4, 'Differential calculus', 2),
('MATH201', 'Calculus II', 4, 'Integral calculus', 2),
('MATH202', 'Linear Algebra', 3, 'Vectors, matrices, and linear transformations', 2),
('MATH301', 'Probability and Statistics', 3, 'Probability theory and statistical methods', 2),

-- Electrical Engineering Courses
('EE101', 'Circuit Analysis', 4, 'Basic electrical circuits', 3),
('EE201', 'Digital Logic Design', 3, 'Boolean algebra and digital circuits', 3),

-- Business Administration Courses
('BA101', 'Introduction to Business', 3, 'Fundamentals of business management', 4),
('BA201', 'Marketing Principles', 3, 'Basic marketing concepts and strategies', 4),

-- Physics Courses
('PHY101', 'Physics I', 4, 'Mechanics and thermodynamics', 5),
('PHY201', 'Physics II', 4, 'Electromagnetism and optics', 5);

-- ============================================================================
-- SAMPLE DATA: COURSE_PREREQUISITE
-- ============================================================================
-- Demonstrates recursive relationship and prerequisite chains

INSERT INTO COURSE_PREREQUISITE (course_id, prerequisite_course_id, is_strict) VALUES
-- CS Prerequisite Chain: CS101 → CS201 → CS301 → CS401 → CS501
(2, 1, TRUE),   -- CS201 (Data Structures) requires CS101 (Programming Fundamentals)
(3, 1, TRUE),   -- CS202 (OOP) requires CS101
(4, 2, TRUE),   -- CS301 (Algorithms) requires CS201 (Data Structures)
(5, 2, TRUE),   -- CS302 (DBMS) requires CS201
(6, 4, TRUE),   -- CS401 (Advanced Algorithms) requires CS301 (Algorithms)
(7, 3, TRUE),   -- CS402 (Web Development) requires CS202 (OOP)
(8, 6, TRUE),   -- CS501 (Machine Learning) requires CS401 (Advanced Algorithms)
(8, 12, TRUE),  -- CS501 (Machine Learning) also requires MATH301 (Probability)

-- Math Prerequisite Chain
(10, 9, TRUE),  -- MATH201 (Calculus II) requires MATH101 (Calculus I)
(12, 10, TRUE), -- MATH301 (Probability) requires MATH201 (Calculus II)

-- EE Prerequisites
(14, 13, TRUE), -- EE201 (Digital Logic) requires EE101 (Circuit Analysis)

-- BA Prerequisites
(16, 15, TRUE), -- BA201 (Marketing) requires BA101 (Intro to Business)

-- Physics Prerequisites
(18, 17, TRUE); -- PHY201 (Physics II) requires PHY101 (Physics I)

-- ============================================================================
-- SAMPLE DATA: STUDENT
-- ============================================================================

INSERT INTO STUDENT (name, email, department_id, current_semester, max_credits_per_semester) VALUES
-- Computer Science Students (various semesters)
('Alice Williams', 'alice.williams@student.college.edu', 1, 1, 18),
('Bob Martinez', 'bob.martinez@student.college.edu', 1, 3, 18),
('Charlie Davis', 'charlie.davis@student.college.edu', 1, 5, 20),
('Diana Foster', 'diana.foster@student.college.edu', 1, 7, 20),
('Ethan Brown', 'ethan.brown@student.college.edu', 1, 8, 18),

-- Mathematics Students
('Fiona Clark', 'fiona.clark@student.college.edu', 2, 2, 18),
('George Adams', 'george.adams@student.college.edu', 2, 4, 18),

-- Electrical Engineering Students
('Hannah White', 'hannah.white@student.college.edu', 3, 3, 18),
('Isaac Taylor', 'isaac.taylor@student.college.edu', 3, 5, 18),

-- Business Administration Students
('Julia Moore', 'julia.moore@student.college.edu', 4, 2, 16),

-- Physics Students
('Kevin Zhang', 'kevin.zhang@student.college.edu', 5, 3, 18),

-- Additional CS Student for testing
('Laura Johnson', 'laura.johnson@student.college.edu', 1, 4, 18);

-- ============================================================================
-- SAMPLE DATA: COMPLETED_COURSE
-- ============================================================================
-- Students' completed courses with grades (for prerequisite checking)

INSERT INTO COMPLETED_COURSE (student_id, course_id, grade, completion_semester, completion_year) VALUES
-- Alice (Semester 1) - Just started, no completions yet

-- Bob (Semester 3) - Completed foundational courses
(2, 1, 'A', 'Fall', 2024),    -- CS101
(2, 9, 'B+', 'Fall', 2024),   -- MATH101
(2, 2, 'A-', 'Spring', 2025), -- CS201

-- Charlie (Semester 5) - Completed many courses
(3, 1, 'A', 'Fall', 2023),    -- CS101
(3, 9, 'B', 'Fall', 2023),    -- MATH101
(3, 2, 'A', 'Spring', 2024),  -- CS201
(3, 3, 'A-', 'Spring', 2024), -- CS202
(3, 10, 'B+', 'Spring', 2024),-- MATH201
(3, 4, 'B+', 'Fall', 2024),   -- CS301
(3, 5, 'A', 'Fall', 2024),    -- CS302

-- Diana (Semester 7) - Advanced student
(4, 1, 'A', 'Fall', 2022),    -- CS101
(4, 2, 'A', 'Spring', 2023),  -- CS201
(4, 3, 'A-', 'Spring', 2023), -- CS202
(4, 9, 'A', 'Fall', 2022),    -- MATH101
(4, 10, 'A-', 'Spring', 2023),-- MATH201
(4, 4, 'B+', 'Fall', 2023),   -- CS301
(4, 5, 'A', 'Fall', 2023),    -- CS302
(4, 11, 'B+', 'Fall', 2023),  -- MATH202
(4, 6, 'A-', 'Spring', 2024), -- CS401
(4, 7, 'A', 'Spring', 2024),  -- CS402
(4, 12, 'B+', 'Fall', 2024),  -- MATH301

-- Ethan (Semester 8) - Senior student
(5, 1, 'B+', 'Fall', 2022),   -- CS101
(5, 2, 'B', 'Spring', 2023),  -- CS201
(5, 3, 'B+', 'Spring', 2023), -- CS202
(5, 4, 'B', 'Fall', 2023),    -- CS301
(5, 5, 'A-', 'Fall', 2023),   -- CS302
(5, 6, 'B+', 'Spring', 2024), -- CS401
(5, 9, 'B', 'Fall', 2022),    -- MATH101
(5, 10, 'B-', 'Spring', 2023),-- MATH201
(5, 12, 'B', 'Fall', 2024),   -- MATH301

-- Fiona (Math, Semester 2)
(6, 9, 'A', 'Fall', 2024),    -- MATH101

-- George (Math, Semester 4)
(7, 9, 'A-', 'Fall', 2023),   -- MATH101
(7, 10, 'B+', 'Spring', 2024),-- MATH201
(7, 11, 'A', 'Spring', 2024), -- MATH202

-- Hannah (EE, Semester 3)
(8, 13, 'A-', 'Fall', 2024),  -- EE101
(8, 17, 'B+', 'Fall', 2024),  -- PHY101

-- Isaac (EE, Semester 5)
(9, 13, 'A', 'Fall', 2023),   -- EE101
(9, 14, 'A-', 'Spring', 2024),-- EE201
(9, 17, 'B+', 'Fall', 2023),  -- PHY101
(9, 18, 'B', 'Spring', 2024), -- PHY201

-- Julia (BA, Semester 2)
(10, 15, 'A', 'Fall', 2024),  -- BA101

-- Kevin (PHY, Semester 3)
(11, 17, 'A-', 'Fall', 2024), -- PHY101
(11, 9, 'B+', 'Fall', 2024),  -- MATH101

-- Laura (CS, Semester 4)
(12, 1, 'A', 'Fall', 2023),   -- CS101
(12, 2, 'A-', 'Spring', 2024),-- CS201
(12, 9, 'B+', 'Fall', 2023),  -- MATH101
(12, 10, 'B', 'Spring', 2024);-- MATH201

-- ============================================================================
-- SAMPLE DATA: COURSE_OFFERING
-- ============================================================================
-- Current semester: Fall 2025 and Spring 2026

INSERT INTO COURSE_OFFERING (course_id, faculty_id, semester, academic_year, capacity, day_of_week, start_time, end_time, room_number) VALUES
-- Fall 2025 Offerings
(1, 1, 'Fall', 2025, 50, 'Monday', '09:00:00', '10:30:00', 'CS-101'),      -- CS101 - Programming Fundamentals
(2, 2, 'Fall', 2025, 45, 'Tuesday', '10:00:00', '11:30:00', 'CS-102'),     -- CS201 - Data Structures
(3, 3, 'Fall', 2025, 40, 'Wednesday', '14:00:00', '15:30:00', 'CS-103'),   -- CS202 - OOP
(4, 1, 'Fall', 2025, 40, 'Thursday', '10:00:00', '11:30:00', 'CS-104'),    -- CS301 - Algorithms
(5, 2, 'Fall', 2025, 35, 'Monday', '14:00:00', '15:30:00', 'CS-105'),      -- CS302 - DBMS
(6, 1, 'Fall', 2025, 30, 'Friday', '09:00:00', '10:30:00', 'CS-106'),      -- CS401 - Advanced Algorithms
(9, 4, 'Fall', 2025, 60, 'Monday', '08:00:00', '09:30:00', 'MATH-201'),    -- MATH101 - Calculus I
(10, 5, 'Fall', 2025, 50, 'Tuesday', '08:00:00', '09:30:00', 'MATH-202'),  -- MATH201 - Calculus II
(12, 5, 'Fall', 2025, 40, 'Wednesday', '10:00:00', '11:30:00', 'MATH-203'),-- MATH301 - Probability
(13, 6, 'Fall', 2025, 40, 'Thursday', '14:00:00', '15:30:00', 'EE-101'),   -- EE101 - Circuit Analysis
(15, 8, 'Fall', 2025, 50, 'Friday', '10:00:00', '11:30:00', 'BA-101'),     -- BA101 - Intro to Business
(17, 9, 'Fall', 2025, 55, 'Monday', '10:00:00', '11:30:00', 'PHY-101'),    -- PHY101 - Physics I

-- Spring 2026 Offerings (future semester for planning)
(2, 2, 'Spring', 2026, 45, 'Monday', '10:00:00', '11:30:00', 'CS-102'),    -- CS201 - Data Structures
(4, 1, 'Spring', 2026, 40, 'Tuesday', '14:00:00', '15:30:00', 'CS-104'),   -- CS301 - Algorithms
(7, 3, 'Spring', 2026, 35, 'Wednesday', '10:00:00', '11:30:00', 'CS-107'), -- CS402 - Web Development
(8, 1, 'Spring', 2026, 25, 'Thursday', '09:00:00', '10:30:00', 'CS-108'),  -- CS501 - Machine Learning
(11, 4, 'Spring', 2026, 45, 'Monday', '14:00:00', '15:30:00', 'MATH-204'), -- MATH202 - Linear Algebra
(14, 7, 'Spring', 2026, 35, 'Tuesday', '10:00:00', '11:30:00', 'EE-102'),  -- EE201 - Digital Logic
(16, 8, 'Spring', 2026, 45, 'Friday', '14:00:00', '15:30:00', 'BA-102'),   -- BA201 - Marketing
(18, 9, 'Spring', 2026, 50, 'Thursday', '10:00:00', '11:30:00', 'PHY-102');-- PHY201 - Physics II

-- ============================================================================
-- SAMPLE DATA: ENROLLMENT
-- ============================================================================
-- Current registrations for Fall 2025

INSERT INTO ENROLLMENT (student_id, offering_id, registration_date, status) VALUES
-- Alice (Semester 1) - Taking first courses
(1, 1, '2025-08-15', 'REGISTERED'),  -- CS101
(1, 9, '2025-08-15', 'REGISTERED'),  -- MATH101

-- Bob (Semester 3) - Taking intermediate courses (has prerequisites)
(2, 4, '2025-08-16', 'REGISTERED'),  -- CS301 (has CS201 completed)
(2, 5, '2025-08-16', 'REGISTERED'),  -- CS302 (has CS201 completed)
(2, 10, '2025-08-16', 'REGISTERED'), -- MATH201 (has MATH101 completed)

-- Charlie (Semester 5) - Taking advanced courses
(3, 6, '2025-08-17', 'REGISTERED'),  -- CS401 (has CS301 completed)
(3, 12, '2025-08-17', 'REGISTERED'), -- MATH301 (has MATH201 completed)

-- Diana (Semester 7) - Taking Machine Learning (has all prerequisites)
-- Diana is ready for CS501 in Spring 2026 but taking other courses in Fall 2025
(4, 6, '2025-08-18', 'REGISTERED'),  -- CS401 (already completed, retaking for better grade)

-- Ethan (Semester 8) - Senior, preparing for Machine Learning
(5, 6, '2025-08-19', 'REGISTERED'),  -- CS401 (already completed, retaking)

-- Fiona (Math, Semester 2) - Continuing math
(6, 10, '2025-08-20', 'REGISTERED'), -- MATH201 (has MATH101 completed)

-- George (Math, Semester 4) - Advanced math
(7, 12, '2025-08-21', 'REGISTERED'), -- MATH301 (has MATH201 completed)

-- Hannah (EE, Semester 3) - Continuing EE
(8, 10, '2025-08-22', 'REGISTERED'), -- MATH201 (for cross-department enrollment)

-- Isaac (EE, Semester 5) - Advanced EE student
(9, 13, '2025-08-23', 'REGISTERED'), -- EE101 (retaking)

-- Julia (BA, Semester 2) - Continuing BA
(10, 11, '2025-08-24', 'REGISTERED'),-- BA101 (retaking)

-- Kevin (PHY, Semester 3) - Continuing physics
(11, 10, '2025-08-25', 'REGISTERED'),-- MATH201 (has MATH101 completed)
(11, 12, '2025-08-25', 'REGISTERED'),-- PHY101 (retaking)

-- Laura (CS, Semester 4) - Intermediate CS student
(12, 4, '2025-08-26', 'REGISTERED'), -- CS301 (has CS201 completed)
(12, 3, '2025-08-26', 'REGISTERED'); -- CS202 (has CS101 completed)

-- Test case: One dropped enrollment
UPDATE ENROLLMENT SET status = 'DROPPED' WHERE enrollment_id = 11;

-- ============================================================================
-- SAMPLE DATA INSERTION COMPLETE
-- ============================================================================
-- Summary:
-- - 5 Departments
-- - 9 Faculty members
-- - 18 Courses
-- - 18 Prerequisite relationships (demonstrating chains)
-- - 12 Students (various semesters and departments)
-- - 44 Completed courses (various grades)
-- - 18 Course offerings (Fall 2025 + Spring 2026)
-- - 13 Enrollments (12 REGISTERED, 1 DROPPED)
--
-- enrolled_count should be automatically maintained by triggers
-- Ready for testing and demonstration
-- ============================================================================
