/**
 * Generates synthetic CSV data files for the Course Registration System
 * Outputs to E:\CSV Data\
 */
const fs = require('fs');
const path = require('path');

const OUT = 'E:\\CSV Data';

// ─── Helper utilities ────────────────────────────────────────────────────────
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dec = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dec));
const randPhone = () => `9${randInt(100000000, 999999999)}`;
const randEmail = (name, domain) => name.toLowerCase().replace(/\s+/g, '.') + randInt(10, 99) + '@' + domain;
const randDate = (startYear, endYear) => {
    const y = randInt(startYear, endYear);
    const m = String(randInt(1, 12)).padStart(2, '0');
    const d = String(randInt(1, 28)).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// ─── Reference data (mirrors real DB) ────────────────────────────────────────
const DEPARTMENTS = ['CS', 'EE', 'ME', 'CE', 'EC'];
const DEPT_NAMES = { CS: 'Computer Science', EE: 'Electrical Engineering', ME: 'Mechanical Engineering', CE: 'Civil Engineering', EC: 'Electronics & Communication' };
const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'college.edu', 'students.ac.in'];
const FIRST_NAMES = ['Aarav','Ananya','Rahul','Priya','Vikram','Sneha','Rohan','Kavya','Arjun','Divya','Karan','Meera','Aditya','Riya','Siddharth','Pooja','Nikhil','Shreya','Yash','Tanvi','Harsh','Neha','Varun','Swati','Ankit','Mansi','Raj','Ishita','Dev','Payal'];
const LAST_NAMES = ['Sharma','Patel','Verma','Singh','Kumar','Gupta','Joshi','Mehta','Shah','Yadav','Agarwal','Mishra','Pandey','Tiwari','Chauhan','Nair','Iyer','Reddy','Bose','Das'];
const fullName = () => rand(FIRST_NAMES) + ' ' + rand(LAST_NAMES);

// ─── Existing student IDs (to avoid FK issues in enrollments/completed) ───────
const STUDENT_IDS = [];
const COURSE_IDS = ['CS101','CS201','CS301','CS401','CS501','EE101','EE201','ME101','ME201','CE101'];
const FACULTY_IDS_EXISTING = ['FAC001','FAC002','FAC003','FAC004','FAC005'];

// ─────────────────────────────────────────────────────────────────────────────
// 1. STUDENTS — 50 rows
// ─────────────────────────────────────────────────────────────────────────────
function generateStudents(count = 50) {
    const rows = [['student_id', 'name', 'email', 'phone', 'department_id', 'current_semester', 'cgpa', 'date_of_birth', 'admission_date', 'address']];
    const usedIds = new Set();
    let i = 0;
    while (i < count) {
        const id = 'S' + String(randInt(3001, 9999));
        if (usedIds.has(id)) continue;
        usedIds.add(id);
        STUDENT_IDS.push(id);
        const name = fullName();
        const dept = rand(DEPARTMENTS);
        const sem = randInt(1, 8);
        const cgpa = randFloat(5.0, 10.0);
        const dob = randDate(2000, 2005);
        const adm = randDate(2022, 2025);
        const addr = `${randInt(1, 999)}, ${rand(['MG Road','Park Street','Anna Salai','Brigade Road','Linking Road'])}, ${rand(['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Kolkata'])}`;
        rows.push([id, name, randEmail(name, rand(DOMAINS)), randPhone(), dept, sem, cgpa, dob, adm, addr]);
        i++;
    }
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COURSES — 30 rows
// ─────────────────────────────────────────────────────────────────────────────
function generateCourses(count = 30) {
    const rows = [['course_id', 'course_name', 'credits', 'department_id', 'semester', 'max_capacity', 'description']];
    const subjects = {
        CS: ['Data Structures', 'Algorithms', 'Database Management', 'Operating Systems', 'Computer Networks', 'Machine Learning', 'Web Technology', 'Software Engineering', 'Compiler Design', 'Cloud Computing'],
        EE: ['Circuit Theory', 'Electromagnetic Fields', 'Power Systems', 'Control Systems', 'Digital Electronics', 'Signal Processing'],
        ME: ['Thermodynamics', 'Fluid Mechanics', 'Manufacturing Processes', 'Machine Design', 'Heat Transfer'],
        CE: ['Structural Analysis', 'Geotechnical Engineering', 'Hydraulics', 'Transportation Engineering'],
        EC: ['Analog Circuits', 'VLSI Design', 'Microprocessors', 'Communication Systems', 'Embedded Systems']
    };
    const usedIds = new Set(['CS101','CS201','CS301','CS401','CS501','EE101','EE201','ME101','ME201','CE101']); // existing
    let i = 0;
    const depts = Object.keys(subjects);
    while (i < count) {
        const dept = rand(depts);
        const subjList = subjects[dept];
        const subj = rand(subjList);
        const num = String(randInt(601, 999));
        const id = dept + num;
        if (usedIds.has(id)) continue;
        usedIds.add(id);
        const credits = rand([2, 3, 4]);
        const sem = randInt(1, 8);
        const cap = rand([30, 40, 50, 60]);
        const desc = `Advanced study of ${subj.toLowerCase()} with hands-on lab sessions and project work.`;
        rows.push([id, `Advanced ${subj}`, credits, dept, sem, cap, desc]);
        i++;
    }
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FACULTY — 20 rows
// ─────────────────────────────────────────────────────────────────────────────
function generateFaculty(count = 20) {
    const rows = [['faculty_id', 'name', 'email', 'phone', 'department_id', 'designation', 'qualification', 'experience_years', 'joining_date']];
    const designations = ['Assistant Professor', 'Associate Professor', 'Professor', 'Senior Professor', 'Lecturer'];
    const quals = ['M.Tech', 'Ph.D', 'M.E', 'M.Sc', 'MBA'];
    const usedIds = new Set(['FAC001','FAC002','FAC003','FAC004','FAC005']);
    let i = 0;
    while (i < count) {
        const id = 'FAC' + String(randInt(6, 99)).padStart(3, '0');
        if (usedIds.has(id)) continue;
        usedIds.add(id);
        const name = fullName();
        const dept = rand(DEPARTMENTS);
        const desig = rand(designations);
        const qual = rand(quals);
        const exp = randInt(1, 30);
        const joined = randDate(1995, 2023);
        rows.push([id, name, randEmail(name, rand(['college.edu', 'university.ac.in', 'gmail.com'])), randPhone(), dept, desig, qual, exp, joined]);
        i++;
    }
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DEPARTMENTS (extra/update rows) — 10 rows
// ─────────────────────────────────────────────────────────────────────────────
function generateDepartments() {
    const rows = [['department_id', 'department_name', 'hod_name', 'established_year', 'total_students', 'contact_email', 'location']];
    const extraDepts = [
        ['BT', 'Biotechnology', 'Dr. Anil Kapoor', 2005, 280, 'biotech@college.edu', 'Block D, Room 201'],
        ['CH', 'Chemical Engineering', 'Dr. Sunita Rao', 1998, 320, 'chem@college.edu', 'Block E, Room 101'],
        ['IT', 'Information Technology', 'Dr. Ramesh Gupta', 2001, 450, 'it@college.edu', 'Block A, Room 305'],
        ['PHY', 'Applied Physics', 'Dr. Kavitha Menon', 1990, 180, 'physics@college.edu', 'Block F, Room 102'],
        ['MATH', 'Mathematics', 'Dr. Sanjay Jain', 1988, 200, 'math@college.edu', 'Block G, Room 210'],
        ['MBA', 'Business Administration', 'Dr. Nisha Patel', 2003, 390, 'mba@college.edu', 'Block H, Room 301'],
        ['ARCH', 'Architecture', 'Dr. Pradeep Kumar', 2010, 150, 'arch@college.edu', 'Block I, Room 105'],
        ['ENV', 'Environmental Science', 'Dr. Deepa Nair', 2008, 130, 'env@college.edu', 'Block J, Room 203'],
        ['AUTO', 'Automobile Engineering', 'Dr. Harish Verma', 2006, 240, 'auto@college.edu', 'Block K, Room 401'],
        ['AERO', 'Aerospace Engineering', 'Dr. Lakshmi Reddy', 2012, 170, 'aero@college.edu', 'Block L, Room 501'],
    ];
    extraDepts.forEach(r => rows.push(r));
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ENROLLMENTS — 60 rows
// ─────────────────────────────────────────────────────────────────────────────
function generateEnrollments(count = 60) {
    const rows = [['student_id', 'course_id', 'faculty_id', 'semester', 'academic_year', 'enrollment_date', 'grade', 'attendance_percent']];
    const grades = [null, null, 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];
    const years = ['2023-24', '2024-25', '2025-26'];
    const usedPairs = new Set();
    let i = 0;
    while (i < count && STUDENT_IDS.length > 0) {
        const sid = rand(STUDENT_IDS);
        const cid = rand(COURSE_IDS);
        const key = sid + '|' + cid;
        if (usedPairs.has(key)) continue;
        usedPairs.add(key);
        const fid = rand(FACULTY_IDS_EXISTING);
        const sem = randInt(1, 8);
        const year = rand(years);
        const date = randDate(2022, 2025);
        const grade = rand(grades);
        const attend = randFloat(40, 100);
        rows.push([sid, cid, fid, sem, year, date, grade || '', attend]);
        i++;
    }
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. COMPLETED COURSES — 40 rows
// ─────────────────────────────────────────────────────────────────────────────
function generateCompletedCourses(count = 40) {
    const rows = [['student_id', 'course_id', 'grade', 'semester_completed', 'academic_year', 'completion_date']];
    const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D'];
    const years = ['2022-23', '2023-24', '2024-25'];
    const usedPairs = new Set();
    let i = 0;
    while (i < count && STUDENT_IDS.length > 0) {
        const sid = rand(STUDENT_IDS);
        const cid = rand(COURSE_IDS);
        const key = sid + '|' + cid;
        if (usedPairs.has(key)) continue;
        usedPairs.add(key);
        const grade = rand(grades);
        const sem = randInt(1, 6);
        const year = rand(years);
        const date = randDate(2022, 2025);
        rows.push([sid, cid, grade, sem, year, date]);
        i++;
    }
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. MIXED / MESSY DATA (for testing validation) — 20 rows
// ─────────────────────────────────────────────────────────────────────────────
function generateMessyStudents() {
    return [
        ['student_id', 'name', 'email', 'phone', 'department_id', 'current_semester', 'cgpa'],
        // Valid rows
        ['S9001', 'Ravi Shankar', 'ravi.shankar91@gmail.com', '9812345678', 'CS', 3, 8.5],
        ['S9002', 'Anita Desai', 'anita.d@outlook.com', '8923456789', 'EE', 5, 7.2],
        ['S9003', 'Mohan Lal', 'mohanlal22@yahoo.com', '7834567890', 'ME', 1, 9.1],
        // Invalid CGPA > 10
        ['S9004', 'Geeta Rani', 'geeta.rani@gmail.com', '9745678901', 'CE', 2, 11.5],
        // Invalid email
        ['S9005', 'Sundar Pichai', 'not-an-email', '9656789012', 'CS', 4, 8.0],
        // Invalid department
        ['S9006', 'Lakshmi Priya', 'lakshmi.p@gmail.com', '9567890123', 'UNKNOWN_DEPT', 6, 7.8],
        // Missing phone
        ['S9007', 'Vijay Kumar', 'vijay.k99@gmail.com', '', 'EE', 7, 6.5],
        // Valid
        ['S9008', 'Chandni Sharma', 'chandni.s@college.edu', '9478901234', 'CS', 2, 9.4],
        // Duplicate ID (S9008 again)
        ['S9008', 'Duplicate Row', 'dupe@test.com', '9000000001', 'CS', 2, 8.0],
        // Semester out of range
        ['S9009', 'Rohit Gupta', 'rohit.g@gmail.com', '9389012345', 'ME', 12, 7.3],
        // Negative CGPA
        ['S9010', 'Prem Chand', 'prem.c@gmail.com', '9290123456', 'CE', 3, -1.5],
        // Valid
        ['S9011', 'Savita Bhabhi', 'savita.b@gmail.com', '9101234567', 'EC', 4, 8.8],
        ['S9012', 'Ajay Devgn', 'ajay.d@yahoo.com', '9012345678', 'CS', 5, 7.5],
        ['S9013', 'Katrina Kaif', 'katrina.k@gmail.com', '8923456700', 'EE', 6, 8.1],
        ['S9014', 'Deepika Padukone', 'deepika.p@college.edu', '8834567800', 'ME', 3, 9.0],
        // Phone too short
        ['S9015', 'Hrithik Roshan', 'hrithik.r@gmail.com', '12345', 'CS', 2, 8.3],
        // Valid
        ['S9016', 'Priyanka Chopra', 'priyanka.c@gmail.com', '8745678900', 'EC', 7, 7.9],
        ['S9017', 'Ranveer Singh', 'ranveer.s@outlook.com', '8656789000', 'CE', 4, 8.6],
        // Missing name
        ['S9018', '', 'noname@gmail.com', '8567890100', 'CS', 1, 7.0],
        // Valid
        ['S9019', 'Alia Bhatt', 'alia.b@gmail.com', '8478901200', 'EE', 5, 9.2],
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ALTERNATE HEADERS (testing column mapping) — 15 rows
// ─────────────────────────────────────────────────────────────────────────────
function generateAltHeaders() {
    return [
        ['Roll No', 'Student Name', 'Mail ID', 'Mobile', 'Branch', 'Sem', 'GPA'],
        ['S8001', 'Ashwin Mehta', 'ashwin.m@gmail.com', '9988776655', 'CS', 3, 8.7],
        ['S8002', 'Bhavna Shah', 'bhavna.s@yahoo.com', '9877665544', 'EE', 5, 7.4],
        ['S8003', 'Chirag Patel', 'chirag.p@outlook.com', '9766554433', 'ME', 2, 8.9],
        ['S8004', 'Dhruv Trivedi', 'dhruv.t@gmail.com', '9655443322', 'CE', 4, 6.8],
        ['S8005', 'Esha Nair', 'esha.n@college.edu', '9544332211', 'EC', 6, 9.1],
        ['S8006', 'Farhan Akhtar', 'farhan.a@gmail.com', '9433221100', 'CS', 1, 7.6],
        ['S8007', 'Gayatri Iyer', 'gayatri.i@yahoo.com', '9322110099', 'EE', 7, 8.3],
        ['S8008', 'Hemant Bose', 'hemant.b@gmail.com', '9211009988', 'ME', 3, 7.9],
        ['S8009', 'Ishani Das', 'ishani.d@college.edu', '9100998877', 'CS', 8, 8.5],
        ['S8010', 'Jay Pandey', 'jay.p@gmail.com', '8999887766', 'CE', 2, 9.3],
        ['S8011', 'Kiara Mishra', 'kiara.m@yahoo.com', '8888776655', 'EC', 4, 7.1],
        ['S8012', 'Laxman Tiwari', 'laxman.t@gmail.com', '8777665544', 'CS', 5, 8.0],
        ['S8013', 'Madhuri Dixit', 'madhuri.d@outlook.com', '8666554433', 'EE', 3, 9.4],
        ['S8014', 'Naveen Reddy', 'naveen.r@gmail.com', '8555443322', 'ME', 6, 7.7],
        ['S8015', 'Ojal Chauhan', 'ojal.c@gmail.com', '8444332211', 'CE', 1, 8.2],
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV writer
// ─────────────────────────────────────────────────────────────────────────────
function toCSV(rows) {
    return rows.map(row =>
        row.map(cell => {
            const s = String(cell == null ? '' : cell);
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',')
    ).join('\r\n');
}

function writeCSV(filename, rows) {
    const fp = path.join(OUT, filename);
    fs.writeFileSync(fp, toCSV(rows), 'utf-8');
    console.log(`✓ Written: ${filename} (${rows.length - 1} data rows)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate all files
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGenerating synthetic CSV datasets...\n');

const students = generateStudents(50);
writeCSV('students_50rows.csv', students);

const courses = generateCourses(30);
writeCSV('courses_30rows.csv', courses);

const faculty = generateFaculty(20);
writeCSV('faculty_20rows.csv', faculty);

const depts = generateDepartments();
writeCSV('departments_new.csv', depts);

const enrollments = generateEnrollments(60);
writeCSV('enrollments_60rows.csv', enrollments);

const completed = generateCompletedCourses(40);
writeCSV('completed_courses_40rows.csv', completed);

const messy = generateMessyStudents();
writeCSV('students_messy_validation_test.csv', messy);

const altHeaders = generateAltHeaders();
writeCSV('students_alternate_headers.csv', altHeaders);

console.log(`\nAll files created in: ${OUT}`);
console.log('\nFile summary:');
const files = fs.readdirSync(OUT);
files.forEach(f => {
    const size = fs.statSync(path.join(OUT, f)).size;
    const lines = fs.readFileSync(path.join(OUT, f), 'utf-8').split('\n').length - 1;
    console.log(`  ${f.padEnd(45)} ${String(lines).padStart(4)} rows   ${String(size).padStart(7)} bytes`);
});
