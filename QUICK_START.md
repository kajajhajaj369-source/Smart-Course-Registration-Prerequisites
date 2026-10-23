# QUICK START GUIDE

## Prerequisites
- MySQL 8.0+ installed
- Node.js 18+ installed

## Step-by-Step Setup

### 1. Start MySQL

**Windows:**
```cmd
net start MySQL80
```

**Linux/Mac:**
```bash
sudo systemctl start mysql
# or
mysql.server start
```

### 2. Initialize Database

Open a terminal and run:

```bash
# Navigate to project directory
cd E:\course_registration_system

# Login to MySQL and run schema
mysql -u root -p < database/schema.sql

# Load sample data
mysql -u root -p < database/sample_data.sql
```

You'll be prompted for your MySQL root password twice.

**Alternative: Using MySQL Workbench**
1. Open MySQL Workbench
2. Connect to local server
3. File → Open SQL Script → Select `database/schema.sql`
4. Click Execute (⚡ icon)
5. File → Open SQL Script → Select `database/sample_data.sql`
6. Click Execute (⚡ icon)

### 3. Configure Database Password

Edit the file: `E:\course_registration_system\.env`

Replace this line:
```
DB_PASSWORD=your_mysql_password_here
```

With your actual MySQL root password:
```
DB_PASSWORD=YourActualPassword
```

**⚠️ Important:** Never commit this file to version control!

### 4. Install Node.js Dependencies

```bash
cd E:\course_registration_system\backend
npm install
```

This will install:
- express (web framework)
- mysql2 (database driver)
- dotenv (environment variables)
- cors (cross-origin requests)

### 5. Start the Server

```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║  Course Registration & Prerequisite Management System      ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:3000                  ║
║  Press Ctrl+C to stop                                      ║
╚════════════════════════════════════════════════════════════╝
✓ Database connection established
```

### 6. Open Browser

Navigate to: **http://localhost:3000**

---

## Verify Everything Works

1. **Dashboard should show:**
   - 12 Students
   - 18 Courses
   - 20 Offerings
   - 5 Departments

2. **Select a student** from dropdown (try "Diana Foster")

3. **Go to "My Courses"** - should show her completed courses

4. **Go to "Register"**:
   - Select "Alice Williams" and "CS401" offering
   - Click "Validate Registration"
   - Should show FAIL with "Missing prerequisites"
   
5. **Go to "DBMS Demos"**:
   - Click "Run JOIN Query" - should show enrollment data
   - Try each demo to verify database queries work

---

## Troubleshooting

### "Database connection failed"
- Check MySQL is running: `mysql -u root -p` (should login)
- Verify password in `.env` is correct
- Verify database exists: 
  ```sql
  mysql -u root -p
  SHOW DATABASES LIKE 'course_registration_system';
  ```

### "Cannot find module 'express'"
- Run `npm install` in the `backend` directory

### "Port 3000 already in use"
- Change PORT in `.env` to 3001 or another port
- Or stop the process using port 3000

### Empty dropdowns/No data
- Verify sample data loaded:
  ```sql
  mysql -u root -p course_registration_system
  SELECT COUNT(*) FROM STUDENT;  -- Should show 12
  SELECT COUNT(*) FROM COURSE;   -- Should show 18
  ```
- Check browser console (F12) for API errors

### MySQL Error 1045 (Access Denied)
- Password in `.env` is incorrect
- Update `.env` with correct password

---

## For Viva Demonstration

### Quick Demo Path:
1. **Dashboard** - Show statistics
2. **Courses** - Click CS501 to show prerequisite chain
3. **Register** - Demonstrate validation (Alice fails, Diana passes)
4. **DBMS Demos** → Complex JOINs - Show 5-table join
5. **DBMS Demos** → Stored Procedures - Explain registration validation
6. **DBMS Demos** → Triggers - Show enrolled_count synchronization

### Key Points to Mention:
- All tables in BCNF
- 8 validation checks in stored procedure
- Triggers maintain data consistency
- Views simplify complex queries
- Recursive CTE for prerequisite chains
- 5-table JOIN for complete enrollment data

---

## Need Help?

Check these files:
- `README.md` - Full documentation
- `VERIFICATION_REPORT.md` - Complete project status
- `docs/PHASE_3_SQL_IMPLEMENTATION.md` - Database details

All database queries are documented in:
- `database/advanced_queries.sql` - 25 query examples
- `database/test_queries.sql` - 20 test cases
