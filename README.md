# Course Registration & Prerequisite Management System

A web-based Course Registration System demonstrating key DBMS concepts for a college project.

## DBMS Concepts Demonstrated

| Concept | Implementation |
|---------|---------------|
| **ER Diagram** | 8 entities with relationships documented in `docs/` |
| **Normalization** | All tables in BCNF (documented in Phase 2) |
| **Primary/Foreign Keys** | 8 PKs, 10 FKs with appropriate cascade rules |
| **Constraints** | 18 CHECK constraints, 9 UNIQUE constraints |
| **Complex JOINs** | 5-table JOIN in demo routes |
| **Subqueries** | Nested and correlated subqueries |
| **Views** | 5 views for common queries |
| **Stored Procedures** | 5 procedures with transaction handling |
| **Triggers** | 4 triggers for data consistency |
| **Recursive CTE** | Prerequisite chain traversal |
| **Indexes** | 29 indexes for performance |

## Quick Start

### 1. Prerequisites
- MySQL 8.0+ installed and running
- Node.js 18+ installed

### 2. Setup Database

```bash
# From MySQL command line or Workbench
mysql -u root -p < database/schema.sql
mysql -u root -p < database/sample_data.sql
```

Or in MySQL Workbench:
1. Open `database/schema.sql` and execute
2. Open `database/sample_data.sql` and execute

### 3. Configure Environment

Edit `.env` and set your MySQL password:
```
DB_PASSWORD=your_actual_mysql_password
```

### 4. Install and Run

```bash
cd backend
npm install
npm start
```

The application will be available at http://localhost:3000

## Project Structure

```
course_registration_system/
├── backend/
│   ├── server.js           # Express server entry point
│   ├── db/
│   │   └── database.js     # MySQL connection pool
│   ├── routes/
│   │   ├── students.js     # Student API endpoints
│   │   ├── courses.js      # Course API endpoints
│   │   ├── enrollments.js  # Registration API (stored procedures)
│   │   └── demos.js        # DBMS demonstration endpoints
│   └── package.json
├── frontend/
│   ├── index.html          # Main HTML
│   ├── css/style.css       # Styles
│   └── js/
│       ├── api.js          # API client
│       └── app.js          # Application logic
├── database/
│   ├── schema.sql          # Database schema with triggers
│   ├── sample_data.sql     # Test data
│   ├── views.sql           # VIEW definitions
│   ├── procedures.sql      # Stored procedures
│   ├── functions.sql       # User-defined functions
│   └── advanced_queries.sql # Complex query examples
├── docs/
│   ├── PHASE_1_DATABASE_REQUIREMENTS.md
│   ├── PHASE_2_NORMALIZATION.md
│   ├── PHASE_2_FINAL_VALIDATION.md
│   └── PHASE_3_SQL_IMPLEMENTATION.md
├── .env                    # Environment configuration
└── README.md
```

## Key Features

### Student Features
- View enrolled courses and schedule
- View completed courses (transcript)
- Check eligibility for courses
- Register for courses with validation

### Course Features
- Browse course catalog
- View prerequisites and prerequisite chains
- See available offerings

### Registration Validation
The `register_student_for_course` stored procedure validates:
1. Student exists
2. Offering exists
3. Not already registered
4. Not already completed
5. Capacity available
6. All prerequisites completed (nested subquery)
7. Credit limit not exceeded (aggregate)
8. No time conflicts (self-join)

## DBMS Demonstration Guide

### Complex JOIN (5-Table)
Navigate to "DBMS Demos" → "Complex JOINs" → Click "Run JOIN Query"

Shows: `STUDENT → ENROLLMENT → COURSE_OFFERING → COURSE → FACULTY`

### Subqueries
Navigate to "DBMS Demos" → "Subqueries"

Demonstrates:
- Nested subquery: Students with above-average completions
- Correlated subquery: Courses with above-average prerequisites

### Views
Navigate to "DBMS Demos" → "Views"

5 views available:
- `student_course_history` - Academic transcript
- `course_offering_details` - Course catalog
- `student_current_schedule` - Current registrations
- `course_prerequisites_view` - Prerequisite relationships
- `student_eligibility_summary` - Student status

### Stored Procedures
Navigate to "DBMS Demos" → "Stored Procedures"

Key procedure: `register_student_for_course`
- Demonstrates transaction handling
- Error handling with SIGNAL
- Multiple validation checks

### Triggers
Navigate to "DBMS Demos" → "Triggers"

4 triggers:
- `trg_enrollment_insert_increment` - Updates enrolled_count
- `trg_enrollment_update_count` - Handles status changes
- `trg_enrollment_delete_decrement` - Cleanup on delete
- `trg_enrollment_complete` - Auto-creates COMPLETED_COURSE

### Recursive CTE
Navigate to "DBMS Demos" → "Recursive CTE"

Shows complete prerequisite chain for a course.

## Testing Registration

1. Select a student from the dropdown (e.g., "Alice Williams")
2. Go to "Register" page
3. Select the same student and an offering
4. Click "Validate Registration"
5. View validation results
6. If valid, click "Register"

Try registering:
- Alice (semester 1) for CS401 - should fail (missing prerequisites)
- Diana (semester 7) for CS401 - should pass (has prerequisites)

## Viva Preparation

Key points to explain:
1. **Why 8 tables?** - Proper normalization, separate concerns
2. **Why COURSE_OFFERING separate from COURSE?** - Same course, multiple semesters
3. **Why ENROLLMENT separate from COMPLETED_COURSE?** - Different purposes/lifecycle
4. **Why enrolled_count is redundant?** - Performance trade-off, maintained by triggers
5. **How triggers work** - Automatic maintenance of derived data
6. **How procedures work** - Encapsulate business logic, transactions

## Sample Data

- 5 Departments (CS, Math, EE, BA, Physics)
- 12 Students (various semesters)
- 18 Courses with prerequisite chains
- 20 Course Offerings (Fall 2025, Spring 2026)
- Sample enrollments and completed courses

## Troubleshooting

**"Database connection failed"**
- Ensure MySQL is running
- Check credentials in `.env`
- Verify database exists: `SHOW DATABASES LIKE 'course_registration_system';`

**"Cannot find module"**
- Run `npm install` in backend directory

**Empty dropdowns**
- Verify sample data was loaded
- Check browser console for API errors

## License

Educational project for DBMS course demonstration.
