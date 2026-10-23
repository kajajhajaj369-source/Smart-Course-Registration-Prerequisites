/**
 * Smart Data Import Route Handler
 * Supports CSV and Excel (.xlsx) data import with:
 * - Intelligent column mapping with confidence scores
 * - Entity type detection
 * - Foreign key resolution (e.g. Department name/code -> department_id)
 * - Multi-stage validation (Required fields, Domain & Check constraints, Duplicates)
 * - Staging preview
 * - Transaction-safe database execution (ACID)
 * - Audit logging (IMPORT_HISTORY)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const pool = require('../db/database');

// Configure multer for memory storage (max 10MB file size)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Entity schema definitions with alias dictionaries and validations
const ENTITY_SCHEMAS = {
    STUDENT: {
        label: 'Students',
        targetTable: 'STUDENT',
        description: 'Student profile records mapped to college departments',
        keyField: 'email',
        fields: {
            name: {
                label: 'Student Name',
                required: true,
                type: 'string',
                aliases: ['student name', 'name', 'full name', 'candidate name', 'student_name', 'studentname']
            },
            email: {
                label: 'Email Address',
                required: true,
                type: 'email',
                aliases: ['email', 'email address', 'mail', 'student email', 'student_email', 'e-mail']
            },
            department_id: {
                label: 'Department',
                required: true,
                type: 'foreign_key',
                lookupType: 'department',
                aliases: ['department', 'dept', 'branch', 'department name', 'dept name', 'department code', 'dept_code', 'department_id']
            },
            current_semester: {
                label: 'Current Semester',
                required: true,
                type: 'integer',
                min: 1,
                max: 12,
                aliases: ['current semester', 'semester', 'sem', 'current_semester', 'term', 'current sem']
            },
            max_credits_per_semester: {
                label: 'Max Credits / Sem',
                required: false,
                type: 'integer',
                default: 18,
                min: 1,
                max: 30,
                aliases: ['max credits', 'credits limit', 'max_credits_per_semester', 'max credits per semester', 'max_credits', 'credit limit']
            },
            student_id: {
                label: 'Student ID (Optional)',
                required: false,
                type: 'integer',
                aliases: ['student id', 'student_id', 'roll no', 'roll number', 'id', 'reg no', 'registration no']
            }
        }
    },
    COURSE: {
        label: 'Courses',
        targetTable: 'COURSE',
        description: 'Academic course catalog and curriculum definitions',
        keyField: 'course_code',
        fields: {
            course_code: {
                label: 'Course Code',
                required: true,
                type: 'string',
                aliases: ['course code', 'course_code', 'code', 'subject code', 'course id', 'course_id']
            },
            course_name: {
                label: 'Course Title',
                required: true,
                type: 'string',
                aliases: ['course name', 'course_name', 'course title', 'title', 'subject name', 'subject', 'name']
            },
            credits: {
                label: 'Credits',
                required: true,
                type: 'integer',
                min: 1,
                max: 10,
                aliases: ['credits', 'credit', 'credit hours', 'credits_per_course']
            },
            department_id: {
                label: 'Department',
                required: true,
                type: 'foreign_key',
                lookupType: 'department',
                aliases: ['department', 'dept', 'branch', 'offering department', 'dept_code', 'department_id']
            },
            description: {
                label: 'Description',
                required: false,
                type: 'string',
                aliases: ['description', 'course description', 'syllabus', 'summary', 'desc']
            }
        }
    },
    FACULTY: {
        label: 'Faculty',
        targetTable: 'FACULTY',
        description: 'Faculty instructors and department designations',
        keyField: 'email',
        fields: {
            faculty_name: {
                label: 'Faculty Name',
                required: true,
                type: 'string',
                aliases: ['faculty name', 'faculty_name', 'name', 'instructor', 'professor', 'teacher', 'instructor name']
            },
            email: {
                label: 'Email Address',
                required: true,
                type: 'email',
                aliases: ['email', 'email address', 'mail', 'faculty email', 'faculty_email']
            },
            department_id: {
                label: 'Department',
                required: true,
                type: 'foreign_key',
                lookupType: 'department',
                aliases: ['department', 'dept', 'branch', 'department_id', 'dept_code']
            },
            designation: {
                label: 'Designation',
                required: false,
                type: 'enum',
                allowed: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'],
                default: 'Assistant Professor',
                aliases: ['designation', 'title', 'role', 'position', 'rank']
            }
        }
    },
    DEPARTMENT: {
        label: 'Departments',
        targetTable: 'DEPARTMENT',
        description: 'Academic departments and branch codes',
        keyField: 'department_code',
        fields: {
            department_name: {
                label: 'Department Name',
                required: true,
                type: 'string',
                aliases: ['department name', 'department_name', 'department', 'dept name', 'dept_name', 'name']
            },
            department_code: {
                label: 'Department Code',
                required: true,
                type: 'string',
                aliases: ['department code', 'department_code', 'dept code', 'dept_code', 'code', 'branch code', 'short code']
            }
        }
    },
    COMPLETED_COURSE: {
        label: 'Completed Courses (Transcripts)',
        targetTable: 'COMPLETED_COURSE',
        description: 'Student past course completion and grade history',
        keyField: 'student_course',
        fields: {
            student_id: {
                label: 'Student (ID or Email)',
                required: true,
                type: 'foreign_key',
                lookupType: 'student',
                aliases: ['student id', 'student_id', 'student', 'roll no', 'email', 'student email', 'student_email']
            },
            course_id: {
                label: 'Course (Code or Name)',
                required: true,
                type: 'foreign_key',
                lookupType: 'course',
                aliases: ['course id', 'course_id', 'course code', 'course_code', 'course', 'subject code']
            },
            grade: {
                label: 'Letter Grade',
                required: true,
                type: 'enum',
                allowed: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'I', 'W', 'P'],
                aliases: ['grade', 'letter grade', 'final grade', 'score grade', 'result']
            },
            completion_semester: {
                label: 'Completion Semester',
                required: false,
                type: 'enum',
                allowed: ['Fall', 'Spring', 'Summer'],
                default: 'Fall',
                aliases: ['completion semester', 'semester', 'completion_semester', 'term']
            },
            completion_year: {
                label: 'Completion Year',
                required: false,
                type: 'integer',
                min: 2000,
                max: 2035,
                default: new Date().getFullYear(),
                aliases: ['completion year', 'completion_year', 'year', 'academic year']
            }
        }
    },
    ENROLLMENT: {
        label: 'Course Enrollments',
        targetTable: 'ENROLLMENT',
        description: 'Student active course section registrations',
        keyField: 'student_offering',
        fields: {
            student_id: {
                label: 'Student (ID or Email)',
                required: true,
                type: 'foreign_key',
                lookupType: 'student',
                aliases: ['student id', 'student_id', 'student', 'roll no', 'email', 'student email']
            },
            offering_id: {
                label: 'Offering ID',
                required: true,
                type: 'foreign_key',
                lookupType: 'offering',
                aliases: ['offering id', 'offering_id', 'section id', 'offering', 'section']
            },
            status: {
                label: 'Enrollment Status',
                required: false,
                type: 'enum',
                allowed: ['REGISTERED', 'DROPPED', 'COMPLETED'],
                default: 'REGISTERED',
                aliases: ['status', 'enrollment status', 'registration status']
            },
            registration_date: {
                label: 'Registration Date',
                required: false,
                type: 'date',
                aliases: ['registration date', 'registration_date', 'date', 'reg date']
            }
        }
    }
};

/**
 * Normalizes header string for comparison
 */
function normalizeHeader(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/[-_.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculates column mapping confidence between uploaded header and target field
 */
function calculateConfidence(header, fieldKey, fieldDef, sampleValues = []) {
    const normHeader = normalizeHeader(header);
    const targetKeyNorm = normalizeHeader(fieldKey);
    const labelNorm = normalizeHeader(fieldDef.label);

    // 1. Exact match on key or label
    if (normHeader === targetKeyNorm || normHeader === labelNorm) {
        return 98;
    }

    // 2. Exact match in aliases list
    if (fieldDef.aliases && fieldDef.aliases.some(alias => normalizeHeader(alias) === normHeader)) {
        return 95;
    }

    // 3. Substring inclusion
    if (fieldDef.aliases && fieldDef.aliases.some(alias => {
        const a = normalizeHeader(alias);
        return normHeader.includes(a) || a.includes(normHeader);
    })) {
        return 82;
    }

    // 4. Sample values heuristic verification
    if (sampleValues && sampleValues.length > 0) {
        const nonNullSamples = sampleValues.filter(v => v !== null && v !== undefined && v !== '');

        if (fieldDef.type === 'email') {
            const emailCount = nonNullSamples.filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())).length;
            if (emailCount > nonNullSamples.length * 0.6) {
                return Math.max(90, (normHeader.includes('mail') ? 96 : 85));
            }
        }

        if (fieldDef.type === 'enum' && fieldDef.allowed) {
            const matchCount = nonNullSamples.filter(v => fieldDef.allowed.includes(String(v).trim().toUpperCase())).length;
            if (matchCount > nonNullSamples.length * 0.7) {
                return 88;
            }
        }

        if (fieldKey === 'current_semester' || fieldKey === 'semester') {
            const semMatchCount = nonNullSamples.filter(v => {
                const n = Number(v);
                return !isNaN(n) && n >= 1 && n <= 8;
            }).length;
            if (semMatchCount > nonNullSamples.length * 0.8 && (normHeader.includes('sem') || normHeader.includes('term'))) {
                return 92;
            }
        }
    }

    return 0;
}

/**
 * Suggests the best entity type based on uploaded column headers and sample data
 */
function detectEntityType(headers, sampleRows = []) {
    const scores = {};

    for (const [entityType, schema] of Object.entries(ENTITY_SCHEMAS)) {
        let matchedRequired = 0;
        let totalRequired = 0;
        let totalConfidence = 0;

        for (const [fieldKey, fieldDef] of Object.entries(schema.fields)) {
            if (fieldDef.required) totalRequired++;

            let maxColConf = 0;
            headers.forEach(h => {
                const samples = sampleRows.map(row => row[h]);
                const conf = calculateConfidence(h, fieldKey, fieldDef, samples);
                if (conf > maxColConf) maxColConf = conf;
            });

            if (maxColConf >= 75) {
                if (fieldDef.required) matchedRequired++;
                totalConfidence += maxColConf;
            }
        }

        const requiredRatio = totalRequired > 0 ? (matchedRequired / totalRequired) : 0;
        scores[entityType] = {
            entityType,
            label: schema.label,
            matchedRequired,
            totalRequired,
            score: Math.round(requiredRatio * 70 + (totalConfidence / (Object.keys(schema.fields).length * 100)) * 30)
        };
    }

    // Sort by score descending
    const sorted = Object.values(scores).sort((a, b) => b.score - a.score);
    const top = sorted[0];

    return {
        suggestedType: top && top.score >= 50 ? top.entityType : null,
        confidence: top ? top.score : 0,
        candidates: sorted
    };
}

/**
 * Fetches lookup data from the database to assist foreign key mapping and validation
 */
async function fetchLookupData() {
    const [departments] = await pool.query('SELECT department_id, department_name, department_code FROM DEPARTMENT ORDER BY department_name');
    const [courses] = await pool.query('SELECT course_id, course_code, course_name FROM COURSE ORDER BY course_code');
    const [faculty] = await pool.query('SELECT faculty_id, faculty_name, email, department_id FROM FACULTY ORDER BY faculty_name');
    const [students] = await pool.query('SELECT student_id, name, email, department_id, current_semester FROM STUDENT ORDER BY student_id');
    const [offerings] = await pool.query(`
        SELECT co.offering_id, co.course_id, co.semester, co.academic_year, co.capacity, co.enrolled_count, c.course_code, c.course_name
        FROM COURSE_OFFERING co
        JOIN COURSE c ON co.course_id = c.course_id
        ORDER BY co.academic_year DESC, co.semester
    `);

    return { departments, courses, faculty, students, offerings };
}

// ============================================================================
// ROUTE: GET /api/import/reference-data
// Returns dictionaries for UI selectors and reference checks
// ============================================================================
router.get('/reference-data', async (req, res) => {
    try {
        const lookups = await fetchLookupData();
        res.json({
            success: true,
            schemas: ENTITY_SCHEMAS,
            lookups
        });
    } catch (err) {
        console.error('Error fetching reference data:', err);
        res.status(500).json({ success: false, error: 'Database error fetching reference data', message: err.message });
    }
});

// ============================================================================
// ROUTE: POST /api/import/analyze
// Receives CSV or Excel file, extracts columns, samples, sheet info, and suggestions
// ============================================================================
router.post('/analyze', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const originalName = req.file.originalname;
        const extension = originalName.split('.').pop().toLowerCase();

        if (!['csv', 'xlsx', 'xls'].includes(extension)) {
            return res.status(400).json({
                success: false,
                error: 'Unsupported file format',
                message: 'Please upload a valid CSV or Excel (.xlsx) file.'
            });
        }

        // Parse workbook using SheetJS
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetNames = workbook.SheetNames;

        if (!sheetNames || sheetNames.length === 0) {
            return res.status(400).json({ success: false, error: 'The uploaded spreadsheet is empty.' });
        }

        // Use selected sheet or first sheet
        const targetSheetName = req.body.sheetName && sheetNames.includes(req.body.sheetName)
            ? req.body.sheetName
            : sheetNames[0];

        const worksheet = workbook.Sheets[targetSheetName];
        const rawJsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (!rawJsonData || rawJsonData.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Empty spreadsheet sheet',
                message: `Sheet "${targetSheetName}" contains no data rows.`
            });
        }

        // Extract headers
        const headers = Object.keys(rawJsonData[0]).filter(h => h && String(h).trim() !== '');

        // Detect type suggestions
        const sampleRows = rawJsonData.slice(0, 10);
        const typeDetection = detectEntityType(headers, sampleRows);

        // Generate recommended column mapping for all schemas
        const mappingsBySchema = {};
        for (const [entityType, schema] of Object.entries(ENTITY_SCHEMAS)) {
            const columnMappings = {};

            headers.forEach(header => {
                let bestField = null;
                let highestConfidence = 0;

                for (const [fieldKey, fieldDef] of Object.entries(schema.fields)) {
                    const samples = sampleRows.map(r => r[header]);
                    const conf = calculateConfidence(header, fieldKey, fieldDef, samples);
                    if (conf > highestConfidence) {
                        highestConfidence = conf;
                        bestField = fieldKey;
                    }
                }

                columnMappings[header] = {
                    targetField: highestConfidence >= 60 ? bestField : '',
                    confidence: highestConfidence
                };
            });

            mappingsBySchema[entityType] = columnMappings;
        }

        res.json({
            success: true,
            fileInfo: {
                filename: originalName,
                extension,
                fileSize: req.file.size,
                totalRows: rawJsonData.length,
                totalColumns: headers.length,
                sheets: sheetNames,
                activeSheet: targetSheetName
            },
            headers,
            sampleRows,
            typeDetection,
            mappingsBySchema,
            schemas: ENTITY_SCHEMAS,
            // Return raw staged rows (up to 500 rows or sliced) for client-side staging
            stagedData: rawJsonData
        });

    } catch (err) {
        console.error('Error analyzing file:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze uploaded file',
            message: err.message
        });
    }
});

// ============================================================================
// ROUTE: POST /api/import/validate
// Validates mapped data against database schemas, lookups, and constraints
// ============================================================================
router.post('/validate', async (req, res) => {
    try {
        const { importType, columnMapping, rawData, foreignKeyOverrides } = req.body;

        if (!importType || !ENTITY_SCHEMAS[importType]) {
            return res.status(400).json({ success: false, error: 'Invalid or missing importType' });
        }

        if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
            return res.status(400).json({ success: false, error: 'No data provided to validate' });
        }

        const schema = ENTITY_SCHEMAS[importType];
        const lookups = await fetchLookupData();

        // Create quick lookup maps
        const deptById = new Map(lookups.departments.map(d => [String(d.department_id), d]));
        const deptByCode = new Map(lookups.departments.map(d => [d.department_code.toUpperCase(), d]));
        const deptByName = new Map(lookups.departments.map(d => [d.department_name.toUpperCase(), d]));

        const courseByCode = new Map(lookups.courses.map(c => [c.course_code.toUpperCase(), c]));
        const courseById = new Map(lookups.courses.map(c => [String(c.course_id), c]));

        const studentByEmail = new Map(lookups.students.map(s => [s.email.toLowerCase(), s]));
        const studentById = new Map(lookups.students.map(s => [String(s.student_id), s]));

        const facultyByEmail = new Map(lookups.faculty.map(f => [f.email.toLowerCase(), f]));

        const validatedRows = [];
        const duplicateRecordsInFile = new Set();
        const unmappedDepartments = new Set();
        const unmappedCourses = new Set();

        let validCount = 0;
        let warningCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rawData.length; i++) {
            const rawRow = rawData[i];
            const rowNumber = i + 1;
            const mappedRow = {};
            const errors = [];
            const warnings = [];

            // Map columns
            for (const [sourceHeader, targetField] of Object.entries(columnMapping)) {
                if (targetField && targetField !== 'ignore') {
                    mappedRow[targetField] = rawRow[sourceHeader] !== undefined ? String(rawRow[sourceHeader]).trim() : '';
                }
            }

            // Check required fields
            for (const [fieldKey, fieldDef] of Object.entries(schema.fields)) {
                if (fieldDef.required && (!mappedRow[fieldKey] || mappedRow[fieldKey] === '')) {
                    errors.push(`Missing required field: ${fieldDef.label}`);
                }
            }

            // Type-specific field validations & FK lookups
            if (importType === 'STUDENT') {
                // Email format
                if (mappedRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mappedRow.email)) {
                    errors.push(`Invalid email format: "${mappedRow.email}"`);
                }

                // Department resolution
                if (mappedRow.department_id) {
                    const rawDept = mappedRow.department_id.toUpperCase();
                    let resolvedDept = null;

                    // Check user FK override first
                    if (foreignKeyOverrides && foreignKeyOverrides.departments && foreignKeyOverrides.departments[rawDept]) {
                        resolvedDept = deptById.get(String(foreignKeyOverrides.departments[rawDept]));
                    }

                    if (!resolvedDept) {
                        resolvedDept = deptByCode.get(rawDept) || deptByName.get(rawDept) || deptById.get(rawDept);
                    }

                    if (resolvedDept) {
                        mappedRow.resolved_department_id = resolvedDept.department_id;
                        mappedRow.resolved_department_name = resolvedDept.department_name;
                    } else {
                        errors.push(`Department "${mappedRow.department_id}" not found in database.`);
                        unmappedDepartments.add(mappedRow.department_id);
                    }
                }

                // Semester domain check
                if (mappedRow.current_semester) {
                    const sem = Number(mappedRow.current_semester);
                    if (isNaN(sem) || sem < 1 || sem > 12) {
                        errors.push(`Invalid semester: "${mappedRow.current_semester}". Must be between 1 and 12.`);
                    } else {
                        mappedRow.current_semester = sem;
                    }
                }

                // Max credits
                if (mappedRow.max_credits_per_semester) {
                    const cred = Number(mappedRow.max_credits_per_semester);
                    if (isNaN(cred) || cred < 1 || cred > 35) {
                        warnings.push(`Max credits "${mappedRow.max_credits_per_semester}" unusual. Defaulting to 18.`);
                        mappedRow.max_credits_per_semester = 18;
                    } else {
                        mappedRow.max_credits_per_semester = cred;
                    }
                } else {
                    mappedRow.max_credits_per_semester = 18;
                }

                // Duplicate checking
                if (mappedRow.email) {
                    const emailLower = mappedRow.email.toLowerCase();
                    if (duplicateRecordsInFile.has(emailLower)) {
                        errors.push(`Duplicate email "${mappedRow.email}" found multiple times in uploaded file.`);
                    } else {
                        duplicateRecordsInFile.add(emailLower);
                    }

                    const existingStudent = studentByEmail.get(emailLower);
                    if (existingStudent) {
                        warnings.push(`Student with email "${mappedRow.email}" already exists in database (ID: ${existingStudent.student_id}).`);
                        mappedRow.existingRecordId = existingStudent.student_id;
                    }
                }
            } else if (importType === 'COURSE') {
                if (mappedRow.course_code) {
                    const codeUpper = mappedRow.course_code.toUpperCase();
                    if (duplicateRecordsInFile.has(codeUpper)) {
                        errors.push(`Duplicate course code "${codeUpper}" in uploaded file.`);
                    } else {
                        duplicateRecordsInFile.add(codeUpper);
                    }

                    const existingCourse = courseByCode.get(codeUpper);
                    if (existingCourse) {
                        warnings.push(`Course "${codeUpper}" already exists in database.`);
                        mappedRow.existingRecordId = existingCourse.course_id;
                    }
                }

                if (mappedRow.credits) {
                    const cred = Number(mappedRow.credits);
                    if (isNaN(cred) || cred < 1 || cred > 10) {
                        errors.push(`Invalid credits value: "${mappedRow.credits}". Must be between 1 and 10.`);
                    } else {
                        mappedRow.credits = cred;
                    }
                }

                if (mappedRow.department_id) {
                    const rawDept = mappedRow.department_id.toUpperCase();
                    let resolvedDept = null;

                    if (foreignKeyOverrides && foreignKeyOverrides.departments && foreignKeyOverrides.departments[rawDept]) {
                        resolvedDept = deptById.get(String(foreignKeyOverrides.departments[rawDept]));
                    }

                    if (!resolvedDept) {
                        resolvedDept = deptByCode.get(rawDept) || deptByName.get(rawDept) || deptById.get(rawDept);
                    }

                    if (resolvedDept) {
                        mappedRow.resolved_department_id = resolvedDept.department_id;
                        mappedRow.resolved_department_name = resolvedDept.department_name;
                    } else {
                        errors.push(`Department "${mappedRow.department_id}" not found.`);
                        unmappedDepartments.add(mappedRow.department_id);
                    }
                }
            } else if (importType === 'FACULTY') {
                if (mappedRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mappedRow.email)) {
                    errors.push(`Invalid email format: "${mappedRow.email}"`);
                }

                if (mappedRow.department_id) {
                    const rawDept = mappedRow.department_id.toUpperCase();
                    const resolvedDept = deptByCode.get(rawDept) || deptByName.get(rawDept) || deptById.get(rawDept);
                    if (resolvedDept) {
                        mappedRow.resolved_department_id = resolvedDept.department_id;
                    } else {
                        errors.push(`Department "${mappedRow.department_id}" not found.`);
                        unmappedDepartments.add(mappedRow.department_id);
                    }
                }

                if (mappedRow.designation) {
                    const allowed = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];
                    if (!allowed.includes(mappedRow.designation)) {
                        warnings.push(`Designation "${mappedRow.designation}" adjusted to Assistant Professor.`);
                        mappedRow.designation = 'Assistant Professor';
                    }
                }

                if (mappedRow.email) {
                    const emailLower = mappedRow.email.toLowerCase();
                    if (facultyByEmail.has(emailLower)) {
                        warnings.push(`Faculty with email "${mappedRow.email}" already exists.`);
                        mappedRow.existingRecordId = facultyByEmail.get(emailLower).faculty_id;
                    }
                }
            } else if (importType === 'DEPARTMENT') {
                if (mappedRow.department_code) {
                    const codeUpper = mappedRow.department_code.toUpperCase();
                    if (deptByCode.has(codeUpper)) {
                        warnings.push(`Department code "${codeUpper}" already exists.`);
                        mappedRow.existingRecordId = deptByCode.get(codeUpper).department_id;
                    }
                }
            } else if (importType === 'COMPLETED_COURSE') {
                // Student resolution
                if (mappedRow.student_id) {
                    const sRef = mappedRow.student_id.trim();
                    const sMatch = studentById.get(sRef) || studentByEmail.get(sRef.toLowerCase());
                    if (sMatch) {
                        mappedRow.resolved_student_id = sMatch.student_id;
                        mappedRow.student_name = sMatch.name;
                    } else {
                        errors.push(`Student reference "${sRef}" could not be resolved.`);
                    }
                }

                // Course resolution
                if (mappedRow.course_id) {
                    const cRef = mappedRow.course_id.trim().toUpperCase();
                    const cMatch = courseByCode.get(cRef) || courseById.get(cRef);
                    if (cMatch) {
                        mappedRow.resolved_course_id = cMatch.course_id;
                        mappedRow.course_code = cMatch.course_code;
                    } else {
                        errors.push(`Course reference "${cRef}" could not be resolved.`);
                        unmappedCourses.add(mappedRow.course_id);
                    }
                }

                // Grade check
                if (mappedRow.grade) {
                    const gUpper = mappedRow.grade.toUpperCase();
                    const allowedGrades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'I', 'W', 'P'];
                    if (!allowedGrades.includes(gUpper)) {
                        errors.push(`Invalid letter grade: "${mappedRow.grade}". Must be one of: ${allowedGrades.join(', ')}`);
                    } else {
                        mappedRow.grade = gUpper;
                    }
                }
            }

            const rowStatus = errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'valid');
            if (rowStatus === 'error') errorCount++;
            else if (rowStatus === 'warning') warningCount++;
            else validCount++;

            validatedRows.push({
                rowNumber,
                rawRow,
                mappedRow,
                status: rowStatus,
                errors,
                warnings
            });
        }

        res.json({
            success: true,
            summary: {
                totalRows: rawData.length,
                validRows: validCount,
                warningRows: warningCount,
                errorRows: errorCount,
                isImportable: errorCount < rawData.length
            },
            unmappedEntities: {
                departments: Array.from(unmappedDepartments),
                courses: Array.from(unmappedCourses)
            },
            availableDepartments: lookups.departments,
            availableCourses: lookups.courses,
            validatedRows
        });

    } catch (err) {
        console.error('Error validating import data:', err);
        res.status(500).json({ success: false, error: 'Validation failed', message: err.message });
    }
});

// ============================================================================
// ROUTE: POST /api/import/execute
// Performs database transaction to import normalized rows
// ============================================================================
router.post('/execute', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { importType, filename, rowsToImport, duplicateStrategy = 'skip' } = req.body;

        if (!importType || !ENTITY_SCHEMAS[importType]) {
            connection.release();
            return res.status(400).json({ success: false, error: 'Invalid importType' });
        }

        if (!rowsToImport || !Array.isArray(rowsToImport) || rowsToImport.length === 0) {
            connection.release();
            return res.status(400).json({ success: false, error: 'No rows provided to import' });
        }

        // Begin ACID transaction
        await connection.beginTransaction();

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        const failureDetails = [];

        for (const item of rowsToImport) {
            const mapped = item.mappedRow || item;

            try {
                if (importType === 'STUDENT') {
                    const deptId = mapped.resolved_department_id || mapped.department_id;
                    const isExisting = Boolean(item.existingRecordId || mapped.existingRecordId);

                    if (isExisting) {
                        if (duplicateStrategy === 'skip') {
                            skippedCount++;
                            continue;
                        } else if (duplicateStrategy === 'update') {
                            await connection.query(`
                                UPDATE STUDENT
                                SET name = ?, department_id = ?, current_semester = ?, max_credits_per_semester = ?
                                WHERE email = ?
                            `, [mapped.name, deptId, mapped.current_semester, mapped.max_credits_per_semester || 18, mapped.email]);
                            updatedCount++;
                            continue;
                        }
                    }

                    // Insert new student
                    await connection.query(`
                        INSERT INTO STUDENT (name, email, department_id, current_semester, max_credits_per_semester)
                        VALUES (?, ?, ?, ?, ?)
                    `, [mapped.name, mapped.email, deptId, mapped.current_semester, mapped.max_credits_per_semester || 18]);
                    insertedCount++;

                } else if (importType === 'COURSE') {
                    const deptId = mapped.resolved_department_id || mapped.department_id;
                    const isExisting = Boolean(item.existingRecordId || mapped.existingRecordId);

                    if (isExisting) {
                        if (duplicateStrategy === 'skip') {
                            skippedCount++;
                            continue;
                        } else if (duplicateStrategy === 'update') {
                            await connection.query(`
                                UPDATE COURSE
                                SET course_name = ?, credits = ?, department_id = ?, description = ?
                                WHERE course_code = ?
                            `, [mapped.course_name, mapped.credits, deptId, mapped.description || '', mapped.course_code]);
                            updatedCount++;
                            continue;
                        }
                    }

                    await connection.query(`
                        INSERT INTO COURSE (course_code, course_name, credits, department_id, description)
                        VALUES (?, ?, ?, ?, ?)
                    `, [mapped.course_code, mapped.course_name, mapped.credits, deptId, mapped.description || '']);
                    insertedCount++;

                } else if (importType === 'FACULTY') {
                    const deptId = mapped.resolved_department_id || mapped.department_id;
                    const isExisting = Boolean(item.existingRecordId || mapped.existingRecordId);

                    if (isExisting) {
                        if (duplicateStrategy === 'skip') {
                            skippedCount++;
                            continue;
                        } else if (duplicateStrategy === 'update') {
                            await connection.query(`
                                UPDATE FACULTY
                                SET faculty_name = ?, department_id = ?, designation = ?
                                WHERE email = ?
                            `, [mapped.faculty_name, deptId, mapped.designation || 'Assistant Professor', mapped.email]);
                            updatedCount++;
                            continue;
                        }
                    }

                    await connection.query(`
                        INSERT INTO FACULTY (faculty_name, email, department_id, designation)
                        VALUES (?, ?, ?, ?)
                    `, [mapped.faculty_name, mapped.email, deptId, mapped.designation || 'Assistant Professor']);
                    insertedCount++;

                } else if (importType === 'DEPARTMENT') {
                    const isExisting = Boolean(item.existingRecordId || mapped.existingRecordId);

                    if (isExisting) {
                        if (duplicateStrategy === 'skip') {
                            skippedCount++;
                            continue;
                        } else if (duplicateStrategy === 'update') {
                            await connection.query(`
                                UPDATE DEPARTMENT
                                SET department_name = ?
                                WHERE department_code = ?
                            `, [mapped.department_name, mapped.department_code]);
                            updatedCount++;
                            continue;
                        }
                    }

                    await connection.query(`
                        INSERT INTO DEPARTMENT (department_name, department_code)
                        VALUES (?, ?)
                    `, [mapped.department_name, mapped.department_code]);
                    insertedCount++;

                } else if (importType === 'COMPLETED_COURSE') {
                    const studentId = mapped.resolved_student_id || mapped.student_id;
                    const courseId = mapped.resolved_course_id || mapped.course_id;

                    await connection.query(`
                        INSERT INTO COMPLETED_COURSE (student_id, course_id, grade, completion_semester, completion_year)
                        VALUES (?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            grade = VALUES(grade),
                            completion_semester = VALUES(completion_semester),
                            completion_year = VALUES(completion_year)
                    `, [studentId, courseId, mapped.grade, mapped.completion_semester || 'Fall', mapped.completion_year || new Date().getFullYear()]);
                    insertedCount++;
                }
            } catch (rowErr) {
                console.error(`Row import error (Row ${item.rowNumber}):`, rowErr.message);
                failedCount++;
                failureDetails.push({
                    rowNumber: item.rowNumber,
                    error: rowErr.message
                });
            }
        }

        // Determine overall status
        let importStatus = 'SUCCESS';
        if (failedCount > 0 && insertedCount + updatedCount > 0) importStatus = 'SUCCESS WITH WARNINGS';
        else if (failedCount > 0 && insertedCount + updatedCount === 0) importStatus = 'FAILED';

        // Commit transaction
        await connection.commit();

        // Record audit entry in IMPORT_HISTORY table
        try {
            await pool.query(`
                INSERT INTO IMPORT_HISTORY (filename, import_type, total_rows, successful_rows, skipped_rows, failed_rows, status, details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                filename || 'uploaded_file',
                importType,
                rowsToImport.length,
                insertedCount + updatedCount,
                skippedCount,
                failedCount,
                importStatus,
                JSON.stringify({
                    inserted: insertedCount,
                    updated: updatedCount,
                    skipped: skippedCount,
                    failed: failedCount,
                    failures: failureDetails
                })
            ]);
        } catch (auditErr) {
            console.error('Audit logging error:', auditErr.message);
        }

        connection.release();

        res.json({
            success: true,
            status: importStatus,
            metrics: {
                filename: filename || 'uploaded_file',
                importType,
                totalProcessed: rowsToImport.length,
                inserted: insertedCount,
                updated: updatedCount,
                successful: insertedCount + updatedCount,
                skipped: skippedCount,
                failed: failedCount,
                failures: failureDetails
            }
        });

    } catch (txErr) {
        await connection.rollback();
        connection.release();
        console.error('Import transaction rollback due to error:', txErr);
        res.status(500).json({
            success: false,
            error: 'Transaction rolled back',
            message: txErr.message
        });
    }
});

// ============================================================================
// ROUTE: GET /api/import/history
// Returns chronological list of import operations
// ============================================================================
router.get('/history', async (req, res) => {
    try {
        const [history] = await pool.query(`
            SELECT import_id, filename, import_type, imported_at, total_rows, successful_rows, skipped_rows, failed_rows, status, details
            FROM IMPORT_HISTORY
            ORDER BY imported_at DESC
            LIMIT 50
        `);

        res.json({
            success: true,
            history
        });
    } catch (err) {
        console.error('Error fetching import history:', err);
        res.status(500).json({ success: false, error: 'Database error', message: err.message });
    }
});

module.exports = router;
