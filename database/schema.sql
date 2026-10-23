-- ============================================================================
-- Smart Course Registration & Prerequisite Management System
-- Database Schema Implementation (MySQL 8.0+)
-- ============================================================================
-- Phase 3: SQL DDL Implementation
-- Based on Phase 2 Normalized Schema (BCNF)
-- ============================================================================

-- Drop database if exists (for clean setup)
DROP DATABASE IF EXISTS course_registration_system;

-- Create database
CREATE DATABASE course_registration_system
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Use the database
USE course_registration_system;

-- ============================================================================
-- TABLE 1: DEPARTMENT
-- ============================================================================
-- Represents academic departments in the college
-- Demonstrates: PRIMARY KEY, UNIQUE constraints, NOT NULL
-- Candidate Keys: {department_id}, {department_name}, {department_code}
-- ============================================================================

CREATE TABLE DEPARTMENT (
    department_id INT AUTO_INCREMENT,
    department_name VARCHAR(100) NOT NULL,
    department_code VARCHAR(10) NOT NULL,

    -- Primary Key
    PRIMARY KEY (department_id),

    -- Unique Constraints (alternate candidate keys)
    UNIQUE KEY uk_department_name (department_name),
    UNIQUE KEY uk_department_code (department_code)

) ENGINE=InnoDB COMMENT='Academic departments';

-- ============================================================================
-- TABLE 2: STUDENT
-- ============================================================================
-- Represents students enrolled in the college
-- Demonstrates: PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK, NOT NULL
-- Candidate Keys: {student_id}, {email}
-- Foreign Keys: department_id â†’ DEPARTMENT
-- ============================================================================

CREATE TABLE STUDENT (
    student_id INT AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    department_id INT NOT NULL,
    current_semester INT NOT NULL,
    max_credits_per_semester INT NOT NULL DEFAULT 18,

    -- Primary Key
    PRIMARY KEY (student_id),

    -- Unique Constraint (alternate candidate key)
    UNIQUE KEY uk_student_email (email),

    -- Foreign Key
    CONSTRAINT fk_student_department
        FOREIGN KEY (department_id)
        REFERENCES DEPARTMENT(department_id)
        ON DELETE RESTRICT,  -- Cannot delete department with students

    -- Domain Constraints (CHECK)
    CONSTRAINT chk_student_semester
        CHECK (current_semester > 0),
    CONSTRAINT chk_student_max_credits
        CHECK (max_credits_per_semester > 0)

) ENGINE=InnoDB COMMENT='Students enrolled in the college';

-- Index on foreign key for join performance
CREATE INDEX idx_student_department ON STUDENT(department_id);

-- ============================================================================
-- TABLE 3: FACULTY
-- ============================================================================
-- Represents faculty members teaching courses
-- Demonstrates: PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL
-- Candidate Keys: {faculty_id}, {email}
-- Foreign Keys: department_id â†’ DEPARTMENT
-- ============================================================================

CREATE TABLE FACULTY (
    faculty_id INT AUTO_INCREMENT,
    faculty_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    department_id INT NOT NULL,
    designation VARCHAR(50) DEFAULT 'Assistant Professor',

    -- Primary Key
    PRIMARY KEY (faculty_id),

    -- Unique Constraint (alternate candidate key)
    UNIQUE KEY uk_faculty_email (email),

    -- Foreign Key
    CONSTRAINT fk_faculty_department
        FOREIGN KEY (department_id)
        REFERENCES DEPARTMENT(department_id)
        ON DELETE RESTRICT,  -- Cannot delete department with faculty

    -- Valid Designations
    CONSTRAINT chk_faculty_designation
        CHECK (designation IN ('Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'))

) ENGINE=InnoDB COMMENT='Faculty members';

-- Index on foreign key for join performance
CREATE INDEX idx_faculty_department ON FACULTY(department_id);

-- ============================================================================
-- TABLE 4: COURSE
-- ============================================================================
-- Represents courses offered by the college
-- Demonstrates: PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK, NOT NULL
-- Candidate Keys: {course_id}, {course_code}
-- Foreign Keys: department_id â†’ DEPARTMENT
-- ============================================================================

CREATE TABLE COURSE (
    course_id INT AUTO_INCREMENT,
    course_code VARCHAR(10) NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    credits INT NOT NULL,
    description TEXT,
    department_id INT NOT NULL,

    -- Primary Key
    PRIMARY KEY (course_id),

    -- Unique Constraint (alternate candidate key)
    UNIQUE KEY uk_course_code (course_code),

    -- Foreign Key
    CONSTRAINT fk_course_department
        FOREIGN KEY (department_id)
        REFERENCES DEPARTMENT(department_id)
        ON DELETE RESTRICT,  -- Cannot delete department with courses

    -- Domain Constraint
    CONSTRAINT chk_course_credits
        CHECK (credits > 0)

) ENGINE=InnoDB COMMENT='Courses offered by departments';

-- Index on foreign key for join performance
CREATE INDEX idx_course_department ON COURSE(department_id);

-- ============================================================================
-- TABLE 5: COURSE_PREREQUISITE
-- ============================================================================
-- Represents prerequisite relationships between courses (RECURSIVE M:N)
-- Demonstrates: Composite PRIMARY KEY, Multiple FOREIGN KEYs to same table, CHECK
-- Candidate Keys: {course_id, prerequisite_course_id}
-- Foreign Keys: course_id â†’ COURSE, prerequisite_course_id â†’ COURSE
-- ============================================================================

CREATE TABLE COURSE_PREREQUISITE (
    course_id INT NOT NULL,
    prerequisite_course_id INT NOT NULL,
    is_strict BOOLEAN NOT NULL DEFAULT TRUE,

    -- Composite Primary Key
    PRIMARY KEY (course_id, prerequisite_course_id),

    -- Foreign Keys (both reference COURSE - recursive relationship)
    CONSTRAINT fk_prereq_course
        FOREIGN KEY (course_id)
        REFERENCES COURSE(course_id)
        ON DELETE CASCADE,  -- Delete prerequisites if course is deleted

    CONSTRAINT fk_prereq_prerequisite
        FOREIGN KEY (prerequisite_course_id)
        REFERENCES COURSE(course_id)
        ON DELETE CASCADE,  -- Delete relationship if prerequisite course is deleted

    -- Prevent self-prerequisite
    CONSTRAINT chk_not_self_prerequisite
        CHECK (course_id != prerequisite_course_id)

) ENGINE=InnoDB COMMENT='Course prerequisite relationships (recursive)';

-- Index on prerequisite_course_id for reverse lookups
CREATE INDEX idx_prereq_course ON COURSE_PREREQUISITE(prerequisite_course_id);

-- ============================================================================
-- TABLE 6: COURSE_OFFERING
-- ============================================================================
-- Represents semester-specific course offerings
-- Demonstrates: PRIMARY KEY, FOREIGN KEYs, UNIQUE composite constraint,
--               CHECK, DEFAULT, Controlled Redundancy (enrolled_count)
-- Candidate Keys: {offering_id}, {course_id, semester, academic_year, day_of_week, start_time}
-- Foreign Keys: course_id â†’ COURSE, faculty_id â†’ FACULTY
-- ============================================================================

CREATE TABLE COURSE_OFFERING (
    offering_id INT AUTO_INCREMENT,
    course_id INT NOT NULL,
    faculty_id INT NOT NULL,
    semester VARCHAR(20) NOT NULL,
    academic_year INT NOT NULL,
    capacity INT NOT NULL,
    enrolled_count INT NOT NULL DEFAULT 0,
    day_of_week VARCHAR(10),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(20),

    -- Primary Key (surrogate)
    PRIMARY KEY (offering_id),

    -- Natural Candidate Key (prevents duplicate offerings at same time)
    UNIQUE KEY uk_offering_schedule (course_id, semester, academic_year, day_of_week, start_time),

    -- Foreign Keys
    CONSTRAINT fk_offering_course
        FOREIGN KEY (course_id)
        REFERENCES COURSE(course_id)
        ON DELETE CASCADE,  -- Delete offerings if course is deleted

    CONSTRAINT fk_offering_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES FACULTY(faculty_id)
        ON DELETE RESTRICT,  -- Cannot delete faculty with active offerings

    -- Domain Constraints
    CONSTRAINT chk_offering_capacity
        CHECK (capacity > 0),

    CONSTRAINT chk_offering_enrolled
        CHECK (enrolled_count >= 0),

    CONSTRAINT chk_offering_not_overenrolled
        CHECK (enrolled_count <= capacity),

    CONSTRAINT chk_offering_time_valid
        CHECK (start_time < end_time),

    CONSTRAINT chk_offering_semester
        CHECK (semester IN ('Fall', 'Spring', 'Summer')),

    CONSTRAINT chk_offering_day
        CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'))

) ENGINE=InnoDB COMMENT='Semester-specific course offerings (enrolled_count maintained by triggers)';

-- Indexes for foreign keys and common queries
CREATE INDEX idx_offering_course ON COURSE_OFFERING(course_id);
CREATE INDEX idx_offering_faculty ON COURSE_OFFERING(faculty_id);
CREATE INDEX idx_offering_semester ON COURSE_OFFERING(semester, academic_year);

-- ============================================================================
-- TABLE 7: ENROLLMENT
-- ============================================================================
-- Represents student registrations for course offerings
-- Demonstrates: PRIMARY KEY, FOREIGN KEYs, UNIQUE composite, CHECK, DEFAULT
-- Candidate Keys: {enrollment_id}, {student_id, offering_id}
-- Foreign Keys: student_id â†’ STUDENT, offering_id â†’ COURSE_OFFERING
-- ============================================================================

CREATE TABLE ENROLLMENT (
    enrollment_id INT AUTO_INCREMENT,
    student_id INT NOT NULL,
    offering_id INT NOT NULL,
    registration_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED',

    -- Primary Key (surrogate)
    PRIMARY KEY (enrollment_id),

    -- Natural Candidate Key (prevents duplicate registrations)
    UNIQUE KEY uk_enrollment_student_offering (student_id, offering_id),

    -- Foreign Keys
    CONSTRAINT fk_enrollment_student
        FOREIGN KEY (student_id)
        REFERENCES STUDENT(student_id)
        ON DELETE CASCADE,  -- Delete enrollments if student is deleted

    CONSTRAINT fk_enrollment_offering
        FOREIGN KEY (offering_id)
        REFERENCES COURSE_OFFERING(offering_id)
        ON DELETE CASCADE,  -- Delete enrollments if offering is deleted

    -- Domain Constraint
    CONSTRAINT chk_enrollment_status
        CHECK (status IN ('REGISTERED', 'DROPPED', 'COMPLETED'))

) ENGINE=InnoDB COMMENT='Student registrations (triggers maintain enrolled_count and create COMPLETED_COURSE)';

-- Indexes for foreign keys and common queries
CREATE INDEX idx_enrollment_student ON ENROLLMENT(student_id);
CREATE INDEX idx_enrollment_offering ON ENROLLMENT(offering_id);
CREATE INDEX idx_enrollment_status ON ENROLLMENT(status);

-- ============================================================================
-- TABLE 8: COMPLETED_COURSE
-- ============================================================================
-- Represents courses completed by students (permanent transcript record)
-- Demonstrates: PRIMARY KEY, FOREIGN KEYs, UNIQUE composite, CHECK, NOT NULL
-- Candidate Keys: {completion_id}, {student_id, course_id}
-- Foreign Keys: student_id â†’ STUDENT, course_id â†’ COURSE
-- ============================================================================

CREATE TABLE COMPLETED_COURSE (
    completion_id INT AUTO_INCREMENT,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    grade VARCHAR(3) NOT NULL,
    completion_semester VARCHAR(20),
    completion_year INT,

    -- Primary Key (surrogate)
    PRIMARY KEY (completion_id),

    -- Natural Candidate Key (student completes each course only once)
    UNIQUE KEY uk_completion_student_course (student_id, course_id),

    -- Foreign Keys
    CONSTRAINT fk_completion_student
        FOREIGN KEY (student_id)
        REFERENCES STUDENT(student_id)
        ON DELETE CASCADE,  -- Delete completions if student is deleted

    CONSTRAINT fk_completion_course
        FOREIGN KEY (course_id)
        REFERENCES COURSE(course_id)
        ON DELETE CASCADE,  -- Delete completions if course is deleted

    -- Domain Constraint (valid grades)
    CONSTRAINT chk_completion_grade
        CHECK (grade IN ('A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'I', 'W')),

    -- Semester validation
    CONSTRAINT chk_completion_semester
        CHECK (completion_semester IN ('Fall', 'Spring', 'Summer'))

) ENGINE=InnoDB COMMENT='Permanent course completion records (created by trigger from ENROLLMENT)';

-- Indexes for foreign keys and common prerequisite checking queries
CREATE INDEX idx_completion_student ON COMPLETED_COURSE(student_id);
CREATE INDEX idx_completion_course ON COMPLETED_COURSE(course_id);
CREATE INDEX idx_completion_student_course ON COMPLETED_COURSE(student_id, course_id);

-- ============================================================================
-- TRIGGERS: enrolled_count Maintenance
-- ============================================================================
-- Demonstrates: Controlled redundancy, trigger usage, data consistency
-- Purpose: Automatically maintain enrolled_count in COURSE_OFFERING
-- ============================================================================

DELIMITER $$

-- Trigger 1: Increment enrolled_count when student registers
CREATE TRIGGER trg_enrollment_insert_increment
AFTER INSERT ON ENROLLMENT
FOR EACH ROW
BEGIN
    -- Only increment if status is REGISTERED
    IF NEW.status = 'REGISTERED' THEN
        UPDATE COURSE_OFFERING
        SET enrolled_count = enrolled_count + 1
        WHERE offering_id = NEW.offering_id;
    END IF;
END$$

-- Trigger 2: Handle status changes (REGISTERED â†’ DROPPED, etc.)
CREATE TRIGGER trg_enrollment_update_count
AFTER UPDATE ON ENROLLMENT
FOR EACH ROW
BEGIN
    -- If status changed from REGISTERED to something else, decrement
    IF OLD.status = 'REGISTERED' AND NEW.status != 'REGISTERED' THEN
        UPDATE COURSE_OFFERING
        SET enrolled_count = enrolled_count - 1
        WHERE offering_id = NEW.offering_id;
    END IF;

    -- If status changed from non-REGISTERED to REGISTERED, increment
    IF OLD.status != 'REGISTERED' AND NEW.status = 'REGISTERED' THEN
        UPDATE COURSE_OFFERING
        SET enrolled_count = enrollï®vîÚ$z{-®éÜj×±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµÍÕ•ÍÌ¤ì)ô((¹¡•¬µ¥Ñ•´¹™…¥°€¹¡•¬µ¥½¸ì(€€€½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµ•ÉÉ½È¤ì)ô((¹É•¥ÍÑÉ…Ñ¥½¸µÉ•ÍÕ±Ðì(€€€Á…‘‘¥¹œè€ÅÉ•´€Ä¸ÈÕÉ•´ì(€€€µ…É¥¸µÑ½Àè€ÅÉ•´ì(€€€‰½É‘•Èµ±•™Ðè€ÑÁàÍ½±¥ÑÉ…¹ÍÁ…É•¹Ðì(€€€™½¹ÐµÍ¥é”è€À¸àÜÕÉ•´ì)ô((¹É•¥ÍÑÉ…Ñ¥½¸µÉ•ÍÕ±Ð¹ÍÕ•ÍÌì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµÍÕ•ÍÌµ‰œ¤ì(€€€‰½É‘•Èµ±•™Ðµ½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµÍÕ•ÍÌ¤ì(€€€½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµÍÕ•ÍÌµÑ•áÐ¤ì)ô((¹É•¥ÍÑÉ…Ñ¥½¸µÉ•ÍÕ±Ð¹•ÉÉ½Èì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµ•ÉÉ½Èµ‰œ¤ì(€€€‰½É‘•Èµ±•™Ðµ½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµ•ÉÉ½È¤ì(€€€½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµ•ÉÉ½ÈµÑ•áÐ¤ì)ô((¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´(€€€ÄÐ¸MÑÕ‘•¹ÐAÉ½™¥±”€˜QÉ…¹ÍÉ¥ÁÐ…É‘Ì(€€€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(¹‘ÌµÍÑÕ‘•¹Ðµ…É°€¹ÍÑÕ‘•¹Ðµ¥¹™¼µ…Éì(€€€‘¥ÍÁ±…äè™±•àì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€©ÕÍÑ¥™äµ½¹Ñ•¹ÐèÍÁ…”µ‰•ÑÝ••¸ì(€€€µ…É¥¸µ‰½ÑÑ½´è€Ä¸ÕÉ•´ì)ô((¹‘Ìµ•µÁÑäµÑ¥±”°€¹•µÁÑäµÍÑ…Ñ”ì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘Ìµ±…å•È´ÀÄ¤ì(€€€‰½É‘•Èè€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÕ‰Ñ±”¤ì(€€€Á…‘‘¥¹œè€ÍÉ•´ì(€€€Ñ•áÐµ…±¥¸è•¹Ñ•Èì(€€€½±½ÈèÙ…È ´µ‘ÌµÑ•áÐµÍ•½¹‘…Éä¤ì(€€€‘¥ÍÁ±…äè™±•àì(€€€™±•àµ‘¥É•Ñ¥½¸è½±Õµ¸ì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€…Àè€ÅÉ•´ì)ô((¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´(€€€ÄÔ¸…É‰½¸…Ñ„%µÁ½ÉÐ]¥é…É€¡MÑ…¥¹œ°5…ÁÁ¥¹œ°AÉ•Ù¥•Ü¤(€€€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(¹‘ÌµÍÕ‰¹…Øì(€€€‘¥ÍÁ±…äè™±•àì(€€€…Àè€À¸ÕÉ•´ì)ô((¹‘ÌµÑ…ˆµ‰Ñ¸ì(€€€Á…‘‘¥¹œè€À¸ÕÉ•´€ÅÉ•´ì(€€€‰…­É½Õ¹è€™™™™™˜ì(€€€‰½É‘•Èè€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÑÉ½¹œ¤ì(€€€½±½ÈèÙ…È ´µ‘ÌµÑ•áÐµÁÉ¥µ…Éä¤ì(€€€™½¹ÐµÍ¥é”è€À¸àÄÈÕÉ•´ì(€€€™½¹ÐµÝ•¥¡Ðè€ÔÀÀì(€€€ÕÉÍ½ÈèÁ½¥¹Ñ•Èì(€€€‰½É‘•ÈµÉ…‘¥ÕÌè€Àì)ô((¹‘ÌµÑ…ˆµ‰Ñ¸¹…Ñ¥Ù”ì(€€€‰…­É½Õ¹è€ŒÄØÄØÄØì(€€€½±½Èè€™™™™™˜ì(€€€‰½É‘•Èµ½±½Èè€ŒÄØÄØÄØì)ô((¼¨AÉ½É•ÍÌMÑ•À	…È€¨¼(¹‘ÌµÁÉ½É•ÍÌµ‰…È°€¹¥µÁ½ÉÐµÍÑ•Àµ‰…Èì(€€€‘¥ÍÁ±…äè™±•àì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘Ìµ±…å•È´ÀÄ¤ì(€€€‰½É‘•Èè€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÕ‰Ñ±”¤ì(€€€µ…É¥¸µ‰½ÑÑ½´è€Ä¸ÕÉ•´ì)ô((¹‘ÌµÁÉ½É•ÍÌµÍÑ•À°€¹ÍÑ•Àµ‰…‘”ì(€€€™±•àè€Äì(€€€‘¥ÍÁ±…äè™±•àì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€…Àè€À¸ÜÕÉ•´ì(€€€Á…‘‘¥¹œè€À¸àÕÉ•´€Ä¸ÈÕÉ•´ì(€€€‰½É‘•ÈµÉ¥¡Ðè€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÕ‰Ñ±”¤ì(€€€½±½ÈèÙ…È ´µ‘ÌµÑ•áÐµÍ•½¹‘…Éä¤ì(€€€™½¹ÐµÍ¥é”è€À¸àÄÈÕÉ•´ì)ô((¹‘ÌµÁÉ½É•ÍÌµÍÑ•Àé±…ÍÐµ¡¥±ì(€€€‰½É‘•ÈµÉ¥¡Ðè¹½¹”ì)ô((¹‘ÌµÁÉ½É•ÍÌµÍÑ•À¹…Ñ¥Ù”°€¹ÍÑ•Àµ‰…‘”¹…Ñ¥Ù”ì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”µ±¥¡Ð¤ì(€€€½±½ÈèÙ…È ´µ‘ÌµÑ•áÐµÁÉ¥µ…Éä¤ì(€€€™½¹ÐµÝ•¥¡Ðè€ØÀÀì(€€€‰½É‘•Èµ‰½ÑÑ½´è€ÉÁàÍ½±¥Ù…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤ì)ô((¹ÍÑ•Àµ¹Õ´ì(€€€Ý¥‘Ñ è€ÈÉÁàì(€€€¡•¥¡Ðè€ÈÉÁàì(€€€‰…­É½Õ¹µ½±½Èè€”Á”Á”Àì(€€€½±½Èè€ŒÄØÄØÄØì(€€€‘¥ÍÁ±…äè™±•àì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€©ÕÍÑ¥™äµ½¹Ñ•¹Ðè•¹Ñ•Èì(€€€™½¹ÐµÍ¥é”è€À¸ÜÕÉ•´ì(€€€™½¹ÐµÝ•¥¡Ðè€ØÀÀì(€€€‰½É‘•ÈµÉ…‘¥ÕÌè€ÔÀ”ì)ô((¹‘ÌµÁÉ½É•ÍÌµÍÑ•À¹…Ñ¥Ù”€¹ÍÑ•Àµ¹Õ´ì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤ì(€€€½±½Èè€™™™™™˜ì)ô((¼¨É½Áé½¹”€¨¼(¹‘Ìµ‘É½Áé½¹”µ…É°€¹‘É½Áé½¹”µ…Éì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘Ìµ±…å•È´ÀÄ¤ì(€€€‰½É‘•Èè€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÕ‰Ñ±”¤ì(€€€Á…‘‘¥¹œè€È¸ÕÉ•´ì(€€€Ñ•áÐµ…±¥¸è•¹Ñ•Èì(€€€µ…É¥¸µ‰½ÑÑ½´è€Ä¸ÕÉ•´ì)ô((¹‘Ìµ‘É½Áé½¹”µ¥¹¹•È°€¹‘É½Áé½¹”µ¥¹¹•Èì(€€€‰½É‘•Èè€ÅÁà‘…Í¡•Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÑÉ½¹œ¤ì(€€€Á…‘‘¥¹œè€ÍÉ•´€ÉÉ•´ì(€€€‰…­É½Õ¹µ½±½Èè€™…™…™„ì(€€€‘¥ÍÁ±…äè™±•àì(€€€™±•àµ‘¥É•Ñ¥½¸è½±Õµ¸ì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€…Àè€ÅÉ•´ì(€€€ÕÉÍ½ÈèÁ½¥¹Ñ•Èì(€€€ÑÉ…¹Í¥Ñ¥½¸è‰…­É½Õ¹µ½±½È€À¸ÄÕÌ°‰½É‘•Èµ½±½È€À¸ÄÕÌì)ô((¹‘Ìµ‘É½Áé½¹”µ¥¹¹•Èé¡½Ù•È°€¹‘Ìµ‘É½Áé½¹”µ¥¹¹•È¹‘É…½Ù•Èì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”µ±¥¡Ð¤ì(€€€‰½É‘•Èµ½±½ÈèÙ…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤ì)ô((¹‘É½Áé½¹”µ¥½¸ì(€€€½±½ÈèÙ…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤ì)ô((¹‘É½Áé½¹”µ¥¹ÍÑÉÕÑ¥½¸ì(€€€™½¹ÐµÍ¥é”è€À¸äÌÜÕÉ•´ì(€€€½±½ÈèÙ…È ´µ‘ÌµÑ•áÐµÍ•½¹‘…Éä¤ì)ô((¹‘É½Áé½¹”µ‘¥Ù¥‘•Èì(€€€™½¹ÐµÍ¥é”è€À¸ÜÕÉ•´ì(€€€½±½ÈèÙ…È ´µ‘ÌµÑ•áÐµÍ•½¹‘…Éä¤ì(€€€Ñ•áÐµÑÉ…¹Í™½É´èÕÁÁ•É…Í”ì)ô((¹ÍÕÁÁ½ÉÑ•µ™½Éµ…ÑÌì(€€€‘¥ÍÁ±…äè™±•àì(€€€…Àè€À¸ÕÉ•´ì(€€€µ…É¥¸µÑ½Àè€À¸ÕÉ•´ì)ô((¹‘Ìµ™•…ÑÕÉ•ÌµÉ¥°€¹¥µÁ½ÉÐµ™•…ÑÕÉ•ÌµÉ¥ì(€€€‘¥ÍÁ±…äèÉ¥ì(€€€É¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìè€Å™È€Å™È€Å™Èì(€€€…Àè€ÅÉ•´ì)ô((¹™•…ÑÕÉ”µ¥Ñ•´ì(€€€‰½É‘•ÈµÑ½Àè€ÍÁàÍ½±¥Ù…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤ì)ô((¹™•…ÑÕÉ”µÑ…œì(€€€™½¹ÐµÍ¥é”è€À¸ØàÜÕÉ•´ì(€€€™½¹ÐµÝ•¥¡Ðè€ØÀÀì(€€€½±½ÈèÙ…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤ì(€€€±•ÑÑ•ÈµÍÁ…¥¹œè€À¸ÕÁàì(€€€µ…É¥¸µ‰½ÑÑ½´è€À¸ÈÕÉ•´ì)ô((¹™•…ÑÕÉ”µ¥Ñ•´ Ðì(€€€™½¹ÐµÍ¥é”è€ÅÉ•´ì(€€€™½¹ÐµÝ•¥¡Ðè€ØÀÀì(€€€µ…É¥¸µ‰½ÑÑ½´è€À¸ÕÉ•´ì)ô((¹™•…ÑÕÉ”µ¥Ñ•´Àì(€€€™½¹ÐµÍ¥é”è€À¸àÄÈÕÉ•´ì(€€€½±½ÈèÙ…È ´µ‘ÌµÑ•áÐµÍ•½¹‘…Éä¤ì)ô((¼¨¹Ñ¥ÑäM•±•Ñ½È€¨¼(¹•¹Ñ¥Ñäµ‘•Ñ•Ñ¥½¸µ‰½àì(€€€µ…É¥¸µ‰½ÑÑ½´è€Ä¸ÕÉ•´ì)ô((¹•¹Ñ¥Ñäµ‘•Ñ•Ñ¥½¸µ¡•…‘•Èì(€€€µ…É¥¸µ‰½ÑÑ½´è€ÅÉ•´ì(€€€Á…‘‘¥¹œµ‰½ÑÑ½´è€À¸ÜÕÉ•´ì(€€€‰½É‘•Èµ‰½ÑÑ½´è€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÕ‰Ñ±”¤ì)ô((¹¡¥¡±¥¡ÐµÑåÁ”ì(€€€½±½ÈèÙ…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤ì(€€€™½¹Ðµ™…µ¥±äèÙ…È ´µ‘Ìµ™½¹Ðµµ½¹¼¤ì)ô((¹•¹Ñ¥Ñäµ¡½¥”µ‰Ñ¸¹…Ñ¥Ù”ì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤€…¥µÁ½ÉÑ…¹Ðì(€€€‰½É‘•Èµ½±½ÈèÙ…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤€…¥µÁ½ÉÑ…¹Ðì(€€€½±½Èè€™™™™™˜€…¥µÁ½ÉÑ…¹Ðì)ô((¼¨½±Õµ¸5…ÁÁ¥¹œQ…‰±”€¨¼(¹µ…ÁÁ¥¹œµÑ…‰±”Í•±•Ðì(€€€¡•¥¡Ðè€ÌÉÁàì(€€€™½¹ÐµÍ¥é”è€À¸àÄÈÕÉ•´ì)ô((¹Í…µÁ±”µÁ¥±°ì(€€€‘¥ÍÁ±…äè¥¹±¥¹”µ‰±½¬ì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘Ìµ±…å•È´ÀÈ¤ì(€€€‰½É‘•Èè€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÕ‰Ñ±”¤ì(€€€Á…‘‘¥¹œè€À¸ÄÕÉ•´€À¸ÑÉ•´ì(€€€™½¹ÐµÍ¥é”è€À¸ØàÜÕÉ•´ì(€€€™½¹Ðµ™…µ¥±äèÙ…È ´µ‘Ìµ™½¹Ðµµ½¹¼¤ì(€€€µ…É¥¸è€À¸ÄÕÉ•´ì)ô((¹½¹™¥‘•¹”µÁ¥±°ì(€€€Á…‘‘¥¹œè€À¸ÉÉ•´€À¸ÕÉ•´ì(€€€™½¹ÐµÍ¥é”è€À¸ØàÜÕÉ•´ì(€€€™½¹ÐµÝ•¥¡Ðè€ØÀÀì(€€€Ñ•áÐµÑÉ…¹Í™½É´èÕÁÁ•É…Í”ì)ô((¹½¹™¥‘•¹”µ¡¥ ì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµÍÕ•ÍÌµ‰œ¤ì(€€€½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµÍÕ•ÍÌµÑ•áÐ¤ì)ô((¹½¹™¥‘•¹”µµ•ì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµÝ…É¹¥¹œµ‰œ¤ì(€€€½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµÝ…É¹¥¹œµÑ•áÐ¤ì)ô((¹½¹™¥‘•¹”µ±½Üì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµ•ÉÉ½Èµ‰œ¤ì(€€€½±½ÈèÙ…È ´µ‘ÌµÍÕÁÁ½ÉÐµ•ÉÉ½ÈµÑ•áÐ¤ì)ô((¼¨Y…±¥‘…Ñ¥½¸MÕµµ…Éä…É‘Ì€¨¼(¹Ù…±¥‘…Ñ¥½¸µÍÕµµ…ÉäµÉ¥ì(€€€‘¥ÍÁ±…äèÉ¥ì(€€€É¥µÑ•µÁ±…Ñ”µ½±Õµ¹ÌèÉ•Á•…Ð Ð°€Å™È¤ì(€€€…Àè€ÅÉ•´ì(€€€µ…É¥¸µ‰½ÑÑ½´è€Ä¸ÕÉ•´ì)ô((¹Ù…°µ…Éì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘Ìµ±…å•È´ÀÄ¤ì(€€€‰½É‘•Èè€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÕ‰Ñ±”¤ì(€€€Á…‘‘¥¹œè€ÅÉ•´€Ä¸ÈÕÉ•´ì(€€€‘¥ÍÁ±…äè™±•àì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€…Àè€ÅÉ•´ì)ô((¹Ù…°µ…É¹Ñ½Ñ…°ì‰½É‘•ÈµÑ½Àè€ÍÁàÍ½±¥€ŒÄØÄØÄØìô(¹Ù…°µ…É¹Ù…±¥ì‰½É‘•ÈµÑ½Àè€ÍÁàÍ½±¥Ù…È ´µ‘ÌµÍÕÁÁ½ÉÐµÍÕ•ÍÌ¤ìô(¹Ù…°µ…É¹Ý…É¹¥¹œì‰½É‘•ÈµÑ½Àè€ÍÁàÍ½±¥Ù…È ´µ‘ÌµÍÕÁÁ½ÉÐµÝ…É¹¥¹œ¤ìô(¹Ù…°µ…É¹•ÉÉ½Èì‰½É‘•ÈµÑ½Àè€ÍÁàÍ½±¥Ù…È ´µ‘ÌµÍÕÁÁ½ÉÐµ•ÉÉ½È¤ìô((¹Ù…°µ¹Õ´ì(€€€™½¹ÐµÍ¥é”è€Ä¸ÜÕÉ•´ì(€€€™½¹ÐµÝ•¥¡Ðè€ÌÀÀì(€€€™½¹Ðµ™…µ¥±äèÙ…È ´µ‘Ìµ™½¹Ðµµ½¹¼¤ì(€€€±¥¹”µ¡•¥¡Ðè€Äì)ô((¹Ù…°µ±…‰•°ì(€€€™½¹ÐµÍ¥é”è€À¸ÜÕÉ•´ì(€€€Ñ•áÐµÑÉ…¹Í™½É´èÕÁÁ•É…Í”ì(€€€±•ÑÑ•ÈµÍÁ…¥¹œè€À¸ÕÁàì(€€€½±½ÈèÙ…È ´µ‘ÌµÑ•áÐµÍ•½¹‘…Éä¤ì)ô((¹‘ÕÁ±¥…Ñ”µÍÑÉ…Ñ•äµ‰½à°€¹™¬µÉ•Í½±Ù•Èµ‰½àì(€€€µ…É¥¸µ‰½ÑÑ½´è€Ä¸ÕÉ•´ì)ô((¹‘ÌµÉ…‘¥¼µÉ½ÕÀì(€€€‘¥ÍÁ±…äè™±•àì(€€€…Àè€Ä¸ÕÉ•´ì(€€€µ…É¥¸µÑ½Àè€À¸ÕÉ•´ì)ô((¹‘ÌµÉ…‘¥¼µ±…‰•°ì(€€€‘¥ÍÁ±…äè™±•àì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€…Àè€À¸ÕÉ•´ì(€€€™½¹ÐµÍ¥é”è€À¸àÜÕÉ•´ì(€€€ÕÉÍ½ÈèÁ½¥¹Ñ•Èì)ô((¹‘ÌµÑ½½±‰…Èµ…Ñ¥½¹Ìì(€€€‘¥ÍÁ±…äè™±•àì(€€€©ÕÍÑ¥™äµ½¹Ñ•¹ÐèÍÁ…”µ‰•ÑÝ••¸ì(€€€µ…É¥¸µÑ½Àè€Ä¸ÕÉ•´ì)ô((¹‘ÌµÑ½½±‰…Èµ…Ñ¥½¹Ì¹•¹Ñ•É•ì(€€€©ÕÍÑ¥™äµ½¹Ñ•¹Ðè•¹Ñ•Èì(€€€…Àè€ÅÉ•´ì)ô((¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´(€€€ÄØ¸…É‰½¸	5L•µ½Ì€¡½‘”€˜á•ÕÑ¥½¸=ÕÑÁÕÐ¤(€€€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(¹‘ÌµÍ•Ñ¥½¸µÑ¥Ñ±”ì(€€€‘¥ÍÁ±…äè™±•àì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€©ÕÍÑ¥™äµ½¹Ñ•¹ÐèÍÁ…”µ‰•ÑÝ••¸ì(€€€µ…É¥¸µ‰½ÑÑ½´è€ÅÉ•´ì)ô((¹‘Ìµ½‘”µ‰±½¬°€¹ÅÕ•Éäµ‘¥ÍÁ±…äì(€€€‰…­É½Õ¹µ½±½Èè€ŒÄØÄØÄØì(€€€½±½Èè€˜Ñ˜Ñ˜Ðì(€€€Á…‘‘¥¹œè€ÅÉ•´€Ä¸ÈÕÉ•´ì(€€€™½¹Ðµ™…µ¥±äèÙ…È ´µ‘Ìµ™½¹Ðµµ½¹¼¤ì(€€€™½¹ÐµÍ¥é”è€À¸àÄÈÕÉ•´ì(€€€±¥¹”µ¡•¥¡Ðè€Ä¸Øì(€€€‰½É‘•Èµ±•™Ðè€ÍÁàÍ½±¥Ù…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤ì(€€€µ…É¥¸µ‰½ÑÑ½´è€ÅÉ•´ì(€€€½Ù•É™±½Üµàè…ÕÑ¼ì)ô((¹‘ÌµÑÉ¥•ÉÌµÉ¥ì(€€€‘¥ÍÁ±…äèÉ¥ì(€€€É¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìè€Å™È€Å™Èì(€€€…Àè€ÅÉ•´ì(€€€µ…É¥¸µ‰½ÑÑ½´è€Ä¸ÕÉ•´ì)ô((¹‘•µ¼µÉ•ÍÕ±Ðì(€€€µ…É¥¸µÑ½Àè€Ä¸ÕÉ•´ì(€€€‰½É‘•ÈµÑ½Àè€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÕ‰Ñ±”¤ì(€€€Á…‘‘¥¹œµÑ½Àè€ÅÉ•´ì)ô((¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´(€€€ÄÜ¸…É‰½¸5½‘…±Ì€˜¥…±½Ì(€€€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(¹‘Ìµµ½‘…°°€¹µ½‘…°ì(€€€‘¥ÍÁ±…äè¹½¹”ì(€€€Á½Í¥Ñ¥½¸è™¥á•ì(€€€Ñ½Àè€Àì(€€€±•™Ðè€Àì(€€€Ý¥‘Ñ è€ÄÀÀ”ì(€€€¡•¥¡Ðè€ÄÀÀ”ì(€€€‰…­É½Õ¹µ½±½ÈèÉ‰„ ÈÈ°€ÈÈ°€ÈÈ°€À¸Ø¤ì(€€€èµ¥¹‘•àè€äÀÀÀì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€©ÕÍÑ¥™äµ½¹Ñ•¹Ðè•¹Ñ•Èì)ô((¹‘Ìµµ½‘…°¹…Ñ¥Ù”°€¹µ½‘…°¹…Ñ¥Ù”°€¹µ½‘…±mÍÑå±”¨ô‰‘¥ÍÁ±…äè‰±½¬‰tì(€€€‘¥ÍÁ±…äè™±•à€…¥µÁ½ÉÑ…¹Ðì)ô((¹‘Ìµµ½‘…°µ½¹Ñ…¥¹•È°€¹µ½‘…°µ½¹Ñ•¹Ðì(€€€‰…­É½Õ¹µ½±½Èè€™™™™™˜ì(€€€Ý¥‘Ñ è€ÄÀÀ”ì(€€€µ…àµÝ¥‘Ñ è€ØÀÁÁàì(€€€µ…àµ¡•¥¡Ðè€äÁÙ ì(€€€½Ù•É™±½Üµäè…ÕÑ¼ì(€€€‰½É‘•Èè€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÑÉ½¹œ¤ì(€€€‰½É‘•ÈµÑ½Àè€ÑÁàÍ½±¥Ù…È ´µ‘Ìµ¥¹Ñ•É…Ñ¥Ù”¤ì(€€€Á…‘‘¥¹œè€Àì(€€€‰½É‘•ÈµÉ…‘¥ÕÌè€Àì(€€€‰½àµÍ¡…‘½Üè€À€áÁà€ÈÑÁàÉ‰„ À°€À°€À°€À¸È¤ì)ô((¹‘Ìµµ½‘…°µ¡•…‘•Èì(€€€‘¥ÍÁ±…äè™±•àì(€€€…±¥¸µ¥Ñ•µÌè•¹Ñ•Èì(€€€©ÕÍÑ¥™äµ½¹Ñ•¹ÐèÍÁ…”µ‰•ÑÝ••¸ì(€€€Á…‘‘¥¹œè€Ä¸ÈÕÉ•´€Ä¸ÕÉ•´ì(€€€‰½É‘•Èµ‰½ÑÑ½´è€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÕ‰Ñ±”¤ì)ô((¹‘Ìµµ½‘…°µÑ¥Ñ±”ì(€€€™½¹ÐµÍ¥é”è€Ä¸ÄÈÕÉ•´ì(€€€™½¹ÐµÝ•¥¡Ðè€ØÀÀì)ô((¹‘Ìµµ½‘…°µ±½Í”°€¹±½Í”ì(€€€‰…­É½Õ¹èÑÉ…¹ÍÁ…É•¹Ðì(€€€‰½É‘•Èè¹½¹”ì(€€€™½¹ÐµÍ¥é”è€Ä¸ÕÉ•´ì(€€€ÕÉÍ½ÈèÁ½¥¹Ñ•Èì(€€€½±½ÈèÙ…È ´µ‘ÌµÑ•áÐµÍ•½¹‘…Éä¤ì(€€€±¥¹”µ¡•¥¡Ðè€Äì)ô((¹‘Ìµµ½‘…°µ±½Í”é¡½Ù•È°€¹±½Í”é¡½Ù•Èì(€€€½±½ÈèÙ…È ´µ‘ÌµÑ•áÐµÁÉ¥µ…Éä¤ì)ô((¹‘Ìµµ½‘…°µ‰½‘äì(€€€Á…‘‘¥¹œè€Ä¸ÕÉ•´ì)ô((¹‘Ìµµ½‘…°µ™½½Ñ•È°€¹™½É´µ…Ñ¥½¹Ìì(€€€‘¥ÍÁ±…äè™±•àì(€€€©ÕÍÑ¥™äµ½¹Ñ•¹Ðè™±•àµ•¹ì(€€€…Àè€À¸ÜÕÉ•´ì(€€€Á…‘‘¥¹œè€ÅÉ•´€Ä¸ÕÉ•´ì(€€€‰…­É½Õ¹µ½±½ÈèÙ…È ´µ‘Ìµ±…å•È´ÀÈ¤ì(€€€‰½É‘•ÈµÑ½Àè€ÅÁàÍ½±¥Ù…È ´µ‘Ìµ‰½É‘•ÈµÍÕ‰Ñ±”¤ì)ô((¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´(€€€Äà¸I•ÍÁ½¹Í¥Ù”	É•…­Á½¥¹ÑÌ(€€€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼)µ•‘¥„€¡µ…àµÝ¥‘Ñ è€ÄÀÈÑÁà¤ì(€€€€¹‘Ìµ‘…Í¡‰½…ÉµÍÁ±¥Ðì(€€€€€€€É¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìè€Å™Èì(€€€ô(€€€€¹‘ÌµÉ•¥ÍÑ•Èµ±…å½ÕÐì(€€€€€€€É¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìè€Å™Èì(€€€ô(€€€€¹Ù…±¥‘…Ñ¥½¸µÍÕµµ…ÉäµÉ¥ì(€€€€€€€É¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìè€Å™È€Å™Èì(€€€ô(€€€€¹‘Ìµ™•…ÑÕÉ•ÌµÉ¥ì(€€€€€€€É¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìè€Å™Èì(€€€ô)ô()µ•‘¥„€¡µ…àµÝ¥‘Ñ è€ÜØáÁà¤ì(€€€€¹‘ÌµÍ¥‘•¹…Øì(€€€€€€€ÑÉ…¹Í™½É´èÑÉ…¹Í±…Ñ•` ´ÄÀÀ”¤ì(€€€ô(€€€€¹‘ÌµÍ¥‘•¹…Ø¹½Á•¸ì(€€€€€€€ÑÉ…¹Í™½É´èÑÉ…¹Í±…Ñ•` À¤ì(€€€€€€€‰½àµÍ¡…‘½Üè€ÑÁà€À€ÄÙÁàÉ‰„ À°À°À°À¸Ô¤ì(€€€ô(€€€€¹‘Ìµ½¹Ñ•¹Ðì(€€€€€€€µ…É¥¸µ±•™Ðè€Àì(€€€€€€€Á…‘‘¥¹œè€ÅÉ•´ì(€€€ô(€€€€¹‘Ìµ¡•…‘•É}}±½‰…°€¹Ñ•É´µ‰…‘”°(€€€€¹‘Ìµ¡•…‘•É}}±½‰…°€¹‘ˆµÍÑ…ÑÕÌì(€€€€€€€‘¥ÍÁ±…äè¹½¹”ì(€€€ô(€€€€¹‘Ìµ¡•…‘•É}}Í•±•Ðì(€€€€€€€µ¥¸µÝ¥‘Ñ è€ÄÔÁÁàì(€€€ô)ô(