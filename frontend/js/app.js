/**
 * Main Application JavaScript
 * Handles UI interactions and data display
 */

// State
let currentStudent = null;
let currentStudentId = null;
let allStudents = [];
let allCourses = [];
let allOfferings = [];
let allDepartments = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Load initial data
    await Promise.all([
        loadStudents(),
        loadDepartments(),
        loadCourses(),
        loadOfferings()
    ]);

    // Setup event listeners
    setupNavigation();
    setupStudentSelector();
    setupTabs();
    setupRegistrationForm();
    setupModals();
    setupFilters();
    setupAddStudentForm();
    setupImportModule();

    // Load dashboard
    loadDashboard();

    // Load procedures info for demos page
    loadProceduresInfo();
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            showPage(page);
        });
    });

    // Mobile Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sideNav = document.getElementById('appSideNav');
            if (sideNav) sideNav.classList.toggle('open');
        });
    }
}

function showPage(pageName) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageName);
    });

    // Show page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.id === `page-${pageName}`);
    });

    // Auto-close mobile sidebar if open
    const sideNav = document.getElementById('appSideNav');
    if (sideNav && window.innerWidth <= 768) {
        sideNav.classList.remove('open');
    }

    // Load page-specific data
    switch (pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'my-courses':
            if (currentStudentId) {
                loadStudentCourses(currentStudentId);
            }
            break;
    }
}

// Student Selector
function setupStudentSelector() {
    const selector = document.getElementById('studentSelector');
    selector.addEventListener('change', async (e) => {
        currentStudentId = e.target.value;
        if (currentStudentId) {
            await loadCurrentStudent(currentStudentId);

            // Update my-courses page if visible
            const myCoursesPage = document.getElementById('page-my-courses');
            if (myCoursesPage.classList.contains('active')) {
                loadStudentCourses(currentStudentId);
            }
        } else {
            currentStudent = null;
        }
    });
}

async function loadCurrentStudent(id) {
    try {
        const result = await api.getStudent(id);
        if (result.success) {
            currentStudent = result.data;
        }
    } catch (error) {
        console.error('Error loading student:', error);
    }
}

// Data Loading Functions
async function loadStudents() {
    try {
        const result = await api.getStudents();
        if (result.success) {
            allStudents = result.data;

            // Populate student selector (reset placeholders first so re-calls don't duplicate)
            const selector = document.getElementById('studentSelector');
            const regStudentSelect = document.getElementById('regStudent');
            selector.innerHTML = '<option value="">Select Student...</option>';
            regStudentSelect.innerHTML = '<option value="">Select Student</option>';

            allStudents.forEach(student => {
                // Nav selector
                const option = document.createElement('option');
                option.value = student.student_id;
                option.textContent = `${student.name} (${student.department_code})`;
                selector.appendChild(option);

                // Registration selector
                const option2 = option.cloneNode(true);
                regStudentSelect.appendChild(option2);
            });
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadDepartments() {
    try {
        const result = await api.getDepartments();
        if (result.success) {
            allDepartments = result.data;

            // Populate department filters
            const deptFilter = document.getElementById('departmentFilter');
            const courseDeptFilter = document.getElementById('courseDeptFilter');
            const addStudentDept = document.getElementById('addStudentDepartment');

            allDepartments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.department_id;
                option.textContent = dept.department_name;
                deptFilter.appendChild(option);
                courseDeptFilter.appendChild(option.cloneNode(true));
                addStudentDept.appendChild(option.cloneNode(true));
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

async function loadCourses() {
    try {
        const result = await api.getCourses();
        if (result.success) {
            allCourses = result.data;
            displayCourses();
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

async function loadOfferings() {
    try {
        const result = await api.getAllOfferings('Fall', 2025);
        if (result.success) {
            allOfferings = result.data;
            populateOfferingSelect();
        }
    } catch (error) {
        console.error('Error loading offerings:', error);
    }
}

// Dashboard
async function loadDashboard() {
    // Stats
    const stats = [
        { label: 'Students', value: allStudents.length },
        { label: 'Courses', value: allCourses.length },
        { label: 'Offerings (Fall 2025)', value: allOfferings.length },
        { label: 'Departments', value: allDepartments.length }
    ];

    const statsGrid = document.getElementById('dashboardStats');
    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <h3>${stat.label}</h3>
            <div class="value">${stat.value}</div>
        </div>
    `).join('');

    // Current offerings
    displayOfferings();

    // Recent enrollments
    try {
        const result = await api.getEnrollments();
        if (result.success) {
            const recent = result.data.slice(0, 10);
            const container = document.getElementById('recentEnrollments');
            container.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Course</th>
                            <th>Semester</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recent.map(e => `
                            <tr>
                                <td>${e.student_name}</td>
                                <td>${e.course_code} - ${e.course_name}</td>
                                <td>${e.semester} ${e.academic_year}</td>
                                <td><span class="card-badge badge-${e.status === 'REGISTERED' ? 'success' : e.status === 'DROPPED' ? 'danger' : 'primary'}">${e.status}</span></td>
                                <td>${e.registration_date}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error loading enrollments:', error);
    }
}

function displayOfferings() {
    const container = document.getElementById('currentOfferings');
    container.innerHTML = allOfferings.slice(0, 6).map(o => `
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">${o.course_code}</div>
                    <div class="card-subtitle">${o.course_name}</div>
                </div>
                <span class="card-badge badge-${o.availability_status === 'FULL' ? 'full' : o.availability_status === 'NEARLY FULL' ? 'nearly-full' : 'available'}">
                    ${o.availability_status}
                </span>
            </div>
            <div class="card-body">
                <div class="card-info">
                    <span>👨‍🏫 ${o.instructor_name}</span>
                    <span>📅 ${o.schedule_display}</span>
                </div>
                <div class="card-info">
                    <span>🪑 ${o.available_seats}/${o.capacity} seats</span>
                    <span>📍 ${o.room_number}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Students Page
function displayStudents(filter = '') {
    let filtered = allStudents;
    if (filter) {
        filtered = allStudents.filter(s => s.department_id == filter);
    }

    const tbody = document.getElementById('studentsBody');
    tbody.innerHTML = filtered.map(s => `
        <tr>
            <td>${s.student_id}</td>
            <td>${s.name}</td>
            <td>${s.email}</td>
            <td>${s.department_name}</td>
            <td>${s.current_semester}</td>
            <td>${s.max_credits_per_semester}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="showStudentDetail(${s.student_id})">View</button>
            </td>
        </tr>
    `).join('');
}

// Add Student Modal
function openAddStudentModal() {
    const modal = document.getElementById('addStudentModal');
    modal.classList.add('active');

    // Reset the form and any previous result
    document.getElementById('addStudentForm').reset();
    document.getElementById('addStudentSemester').value = '';
    document.getElementById('addStudentMaxCredits').value = '18';
    document.getElementById('addStudentResult').innerHTML = '';
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').classList.remove('active');
    document.getElementById('addStudentResult').innerHTML = '';
}

function setupAddStudentForm() {
    const form = document.getElementById('addStudentForm');
    form.addEventListener('submit', submitAddStudent);
}

async function submitAddStudent(e) {
    e.preventDefault();

    const resultDiv = document.getElementById('addStudentResult');
    const submitBtn = document.getElementById('addStudentSubmitBtn');

    const student = {
        name: document.getElementById('addStudentName').value.trim(),
        email: document.getElementById('addStudentEmail').value.trim(),
        departmentId: document.getElementById('addStudentDepartment').value,
        currentSemester: document.getElementById('addStudentSemester').value.trim(),
        maxCreditsPerSemester: document.getElementById('addStudentMaxCredits').value.trim()
    };

    // Client-side validation
    if (!student.name || !student.email || !student.departmentId || !student.currentSemester) {
        resultDiv.innerHTML = '<p class="error">Please fill in all required fields.</p>';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
        const result = await api.addStudent(student);

        if (result.success) {
            resultDiv.innerHTML = `<p class="success-msg">✅ ${result.message}</p>`;
            closeAddStudentModal();
            // Refresh student data and re-select the added student
            await loadStudents();
            displayStudents(document.getElementById('departmentFilter').value);
            if (result.data.student_id) {
                currentStudentId = result.data.student_id;
                document.getElementById('studentSelector').value = result.data.student_id;
                await loadCurrentStudent(result.data.student_id);
            }
        } else {
            resultDiv.innerHTML = `<p class="error">${result.message || result.error || 'Failed to add student'}</p>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Student';
    }
}

// Courses Page
function displayCourses(filter = '', search = '') {
    let filtered = allCourses;
    if (filter) {
        filtered = filtered.filter(c => c.department_id == filter);
    }
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(c =>
            c.course_code.toLowerCase().includes(searchLower) ||
            c.course_name.toLowerCase().includes(searchLower)
        );
    }

    const container = document.getElementById('coursesGrid');
    container.innerHTML = filtered.map(c => `
        <div class="card" onclick="showCourseDetail(${c.course_id})" style="cursor: pointer;">
            <div class="card-header">
                <div>
                    <div class="card-title">${c.course_code}</div>
                    <div class="card-subtitle">${c.course_name}</div>
                </div>
                <span class="card-badge badge-primary">${c.credits} credits</span>
            </div>
            <div class="card-body">
                <div class="card-info">
                    <span>🏛️ ${c.department_name}</span>
                </div>
                <p style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-light);">
                    ${c.description || 'No description available'}
                </p>
            </div>
        </div>
    `).join('');
}

// Course Detail Modal
async function showCourseDetail(courseId) {
    const modal = document.getElementById('courseModal');
    const content = document.getElementById('modalCourseContent');
    const title = document.getElementById('modalCourseName');

    try {
        const [courseResult, prereqsResult, chainResult, offeringsResult] = await Promise.all([
            api.getCourse(courseId),
            api.getCoursePrerequisites(courseId),
            api.getPrerequisiteChain(courseId),
            api.getCourseOfferings(courseId)
        ]);

        if (courseResult.success) {
            const course = courseResult.data;
            title.textContent = `${course.course_code} - ${course.course_name}`;

            let html = `
                <div class="card-info">
                    <span>🏛️ ${course.department_name}</span>
                    <span>📚 ${course.credits} credits</span>
                </div>
                <p style="margin: 1rem 0;">${course.description || 'No description available'}</p>
            `;

            // Prerequisites
            if (prereqsResult.success && prereqsResult.data.length > 0) {
                html += `
                    <h4>Prerequisites</h4>
                    <div style="margin-bottom: 1rem;">
                        ${prereqsResult.data.map(p => `
                            <span class="prereq-badge">${p.prerequisite_code} - ${p.prerequisite_name}</span>
                        `).join('')}
                    </div>
                `;
            }

            // Prerequisite chain
            if (chainResult.success && chainResult.data.length > 1) {
                html += `
                    <h4>Complete Prerequisite Chain</h4>
                    <div class="prerequisite-chain">
                        ${chainResult.data.map(item => `
                            <div class="prereq-level">
                                <span class="level">Level ${item.level}</span>
                                <span>${item.course_code} - ${item.course_name}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            // Offerings
            if (offeringsResult.success && offeringsResult.data.length > 0) {
                html += `
                    <h4 style="margin-top: 1rem;">Current Offerings</h4>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Semester</th>
                                <th>Instructor</th>
                                <th>Schedule</th>
                                <th>Seats</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${offeringsResult.data.map(o => `
                                <tr>
                                    <td>${o.semester} ${o.academic_year}</td>
                                    <td>${o.instructor_name}</td>
                                    <td>${o.schedule_display}</td>
                                    <td>${o.available_seats}/${o.capacity}</td>
                                    <td><span class="card-badge badge-${o.availability_status === 'FULL' ? 'full' : 'available'}">${o.availability_status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            content.innerHTML = html;
            modal.classList.add('active');
        }
    } catch (error) {
        console.error('Error loading course detail:', error);
    }
}

// Student Detail Modal
async function showStudentDetail(studentId) {
    const modal = document.getElementById('studentModal');
    const content = document.getElementById('modalStudentContent');
    const title = document.getElementById('modalStudentName');

    try {
        const [studentResult, eligibilityResult] = await Promise.all([
            api.getStudent(studentId),
            api.getStudentEligibility(studentId)
        ]);

        if (studentResult.success) {
            const student = studentResult.data;
            title.textContent = student.name;

            let html = `
                <div class="card-info">
                    <span>📧 ${student.email}</span>
                    <span>🏛️ ${student.department_name}</span>
                    <span>📖 Semester ${student.current_semester}</span>
                </div>
            `;

            if (eligibilityResult.success) {
                const eligibility = eligibilityResult.data;
                html += `
                    <div class="stats-grid" style="margin-top: 1rem;">
                        <div class="stat-card">
                            <h3>Courses Completed</h3>
                            <div class="value">${eligibility.courses_completed || 0}</div>
                        </div>
                        <div class="stat-card">
                            <h3>Credits Earned</h3>
                            <div class="value">${eligibility.total_credits_earned || 0}</div>
                        </div>
                        <div class="stat-card">
                            <h3>GPA</h3>
                            <div class="value">${eligibility.gpa || '0.00'}</div>
                        </div>
                        <div class="stat-card">
                            <h3>Current Credits</h3>
                            <div class="value">${eligibility.current_credits || 0}/${student.max_credits_per_semester}</div>
                        </div>
                    </div>
                    <div class="card-info" style="margin-top: 1rem;">
                        <span>📊 Academic Standing: <strong>${eligibility.academic_standing || 'N/A'}</strong></span>
                        <span>📝 Registration: <strong>${eligibility.registration_capacity_status || 'N/A'}</strong></span>
                    </div>
                `;
            }

            content.innerHTML = html;
            modal.classList.add('active');
        }
    } catch (error) {
        console.error('Error loading student detail:', error);
    }
}

// Registration Page
function populateOfferingSelect() {
    const select = document.getElementById('regOffering');
    select.innerHTML = '<option value="">Select Course Offering</option>';

    allOfferings.forEach(o => {
        const option = document.createElement('option');
        option.value = o.offering_id;
        option.textContent = `${o.course_code} - ${o.course_name} (${o.semester} ${o.academic_year}, ${o.day_of_week} ${o.start_time}) - ${o.available_seats} seats`;
        select.appendChild(option);
    });
}

function setupRegistrationForm() {
    const validateBtn = document.getElementById('validateBtn');
    const registerBtn = document.getElementById('registerBtn');

    validateBtn.addEventListener('click', validateRegistration);
    registerBtn.addEventListener('click', performRegistration);
}

async function validateRegistration() {
    const studentId = document.getElementById('regStudent').value;
    const offeringId = document.getElementById('regOffering').value;
    const resultsDiv = document.getElementById('validationResults');
    const registerBtn = document.getElementById('registerBtn');

    if (!studentId || !offeringId) {
        resultsDiv.innerHTML = '<p class="hint">Please select both a student and course offering.</p>';
        return;
    }

    try {
        const result = await api.validateRegistration(studentId, offeringId);

        if (result.success) {
            const v = result.data;
            let html = `<h4>Validation for ${v.student.name} registering for ${v.course.code}</h4>`;

            const checks = [
                { label: 'Not already registered', pass: !v.checks.alreadyRegistered, detail: v.checks.alreadyRegistered ? 'Already registered' : 'Not registered' },
                { label: 'Not already completed', pass: !v.checks.alreadyCompleted, detail: v.checks.alreadyCompleted ? 'Already completed' : 'Not completed' },
                { label: 'Capacity available', pass: v.checks.hasCapacity, detail: `${v.offering.available}/${v.offering.capacity} seats available` },
                { label: 'All prerequisites satisfied', pass: v.checks.hasAllPrerequisites, detail: v.checks.missingPrerequisites.length > 0 ? `Missing: ${v.checks.missingPrerequisites.map(p => p.course_code).join(', ')}` : 'All satisfied' },
                { label: 'Within credit limit', pass: v.checks.withinCreditLimit, detail: `${v.checks.currentCreditLoad} + ${v.course.credits} = ${v.checks.newTotalCredits}/${v.student.maxCredits}` },
                { label: 'No time conflicts', pass: !v.checks.hasTimeConflicts, detail: v.checks.timeConflicts.length > 0 ? `Conflicts with: ${v.checks.timeConflicts.map(c => c.course_code).join(', ')}` : 'No conflicts' }
            ];

            checks.forEach(check => {
                html += `
                    <div class="check-item ${check.pass ? 'pass' : 'fail'}">
                        <span class="check-icon">${check.pass ? '✅' : '❌'}</span>
                        <span><strong>${check.label}:</strong> ${check.detail}</span>
                    </div>
                `;
            });

            const canRegister = checks.every(c => c.pass);
            html += canRegister ?
                '<p style="margin-top: 1rem; color: var(--success); font-weight: 600;">All validations passed. Ready to register.</p>' :
                '<p style="margin-top: 1rem; color: var(--danger); font-weight: 600;">Cannot register. Resolve the issues above.</p>';

            resultsDiv.innerHTML = html;
            registerBtn.disabled = !canRegister;
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

async function performRegistration() {
    const studentId = document.getElementById('regStudent').value;
    const offeringId = document.getElementById('regOffering').value;
    const resultDiv = document.getElementById('registrationResult');

    try {
        const result = await api.registerForCourse(parseInt(studentId), parseInt(offeringId));

        resultDiv.style.display = 'block';
        if (result.success) {
            resultDiv.className = 'registration-result success';
            resultDiv.innerHTML = `<strong>Success:</strong> ${result.message}`;
            // Reset form
            document.getElementById('regStudent').value = '';
            document.getElementById('regOffering').value = '';
            document.getElementById('validationResults').innerHTML = '<p class="hint">Select a student and course offering, then click "Validate Registration"</p>';
            document.getElementById('registerBtn').disabled = true;
            // Reload offerings
            await loadOfferings();
        } else {
            resultDiv.className = 'registration-result error';
            resultDiv.innerHTML = `<strong>Registration Failed:</strong> ${result.message || result.error}`;
        }
    } catch (error) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'registration-result error';
        resultDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
    }
}

// My Courses Page
async function loadStudentCourses(studentId) {
    const noStudentDiv = document.getElementById('noStudentSelected');
    const contentDiv = document.getElementById('studentCoursesContent');

    if (!studentId) {
        noStudentDiv.style.display = 'block';
        contentDiv.style.display = 'none';
        return;
    }

    noStudentDiv.style.display = 'none';
    contentDiv.style.display = 'block';

    try {
        // Load student info
        const [studentResult, eligibilityResult] = await Promise.all([
            api.getStudent(studentId),
            api.getStudentEligibility(studentId)
        ]);

        if (studentResult.success) {
            const student = studentResult.data;
            const eligibility = eligibilityResult.success ? eligibilityResult.data : {};

            document.getElementById('studentInfoCard').innerHTML = `
                <div>
                    <h3>${student.name}</h3>
                    <p>${student.department_name} | Semester ${student.current_semester}</p>
                </div>
                <div class="student-stats">
                    <div class="student-stat">
                        <div class="value">${eligibility.gpa || '0.00'}</div>
                        <div class="label">GPA</div>
                    </div>
                    <div class="student-stat">
                        <div class="value">${eligibility.courses_completed || 0}</div>
                        <div class="label">Courses</div>
                    </div>
                    <div class="student-stat">
                        <div class="value">${eligibility.current_credits || 0}/${student.max_credits_per_semester}</div>
                        <div class="label">Credits</div>
                    </div>
                </div>
            `;
        }

        // Load current schedule
        loadCurrentSchedule(studentId);

        // Load completed courses
        loadCompletedCourses(studentId);

        // Load eligible courses
        loadEligibleCourses(studentId);

    } catch (error) {
        console.error('Error loading student courses:', error);
    }
}

async function loadCurrentSchedule(studentId) {
    try {
        const result = await api.getStudentCurrentSchedule(studentId);
        const container = document.getElementById('currentSchedule');

        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(course => `
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${course.course_code}</div>
                            <div class="card-subtitle">${course.course_name}</div>
                        </div>
                        <span class="card-badge badge-success">${course.enrollment_status}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-info">
                            <span>👨‍🏫 ${course.instructor}</span>
                        </div>
                        <div class="card-info">
                            <span>📅 ${course.schedule_display}</span>
                        </div>
                        <div class="card-info">
                            <span>📍 ${course.room_number}</span>
                            <span>📚 ${course.credits} credits</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="empty-state">No current registrations.</p>';
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

async function loadCompletedCourses(studentId) {
    try {
        const result = await api.getStudentTranscript(studentId);
        const container = document.getElementById('completedCourses');

        if (result.success && result.data.length > 0) {
            container.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Course</th>
                            <th>Credits</th>
                            <th>Grade</th>
                            <th>Points</th>
                            <th>Semester</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.data.map(c => `
                            <tr>
                                <td>${c.course_code}</td>
                                <td>${c.course_name}</td>
                                <td>${c.credits}</td>
                                <td><strong>${c.grade}</strong></td>
                                <td>${c.grade_points || 'N/A'}</td>
                                <td>${c.completion_semester} ${c.completion_year}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            container.innerHTML = '<p class="empty-state">No completed courses yet.</p>';
        }
    } catch (error) {
        console.error('Error loading completed courses:', error);
    }
}

async function loadEligibleCourses(studentId) {
    try {
        const result = await api.getStudentEligibleCourses(studentId);
        const container = document.getElementById('eligibleCourses');

        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(c => `
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${c.course_code}</div>
                            <div class="card-subtitle">${c.course_name}</div>
                        </div>
                        <span class="card-badge badge-primary">${c.credits} credits</span>
                    </div>
                    <div class="card-body">
                        <div class="card-info">
                            <span>🏛️ ${c.department_name}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="empty-state">No eligible courses found.</p>';
        }
    } catch (error) {
        console.error('Error loading eligible courses:', error);
    }
}

// Tabs
function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Update tab buttons
            tab.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update tab content
            tab.closest('section').querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `tab-${tabName}`);
            });
        });
    });
}

// Modals
function setupModals() {
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').classList.remove('active');
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Filters
function setupFilters() {
    document.getElementById('departmentFilter').addEventListener('change', (e) => {
        displayStudents(e.target.value);
    });

    document.getElementById('courseDeptFilter').addEventListener('change', (e) => {
        displayCourses(e.target.value, document.getElementById('courseSearch').value);
    });

    document.getElementById('courseSearch').addEventListener('input', (e) => {
        displayCourses(document.getElementById('courseDeptFilter').value, e.target.value);
    });
}

// Demo Functions
function setupDemoNavigation() {
    document.querySelectorAll('.demo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const demo = btn.dataset.demo;

            document.querySelectorAll('.demo-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.demo-section').forEach(section => {
                section.classList.toggle('active', section.id === `demo-${demo}`);
            });
        });
    });
}

async function loadProceduresInfo() {
    try {
        const result = await api.getProcedures();
        if (result.success) {
            const container = document.getElementById('procedureInfo');
            container.innerHTML = result.data.map(p => `
                <div class="trigger-item">
                    <strong>${p.name}</strong>
                    <span>${p.description}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading procedures:', error);
    }
}

async function runDemo(type) {
    const resultDivs = {
        'join-example': 'joins-result',
        'subquery-example': 'subqueries-result',
        'correlated-subquery': 'subqueries-result',
        'trigger-effect': 'triggers-result',
        'constraints': 'constraints-result',
        'indexes': 'constraints-result'
    };

    const resultDiv = document.getElementById(resultDivs[type]);
    resultDiv.innerHTML = '<p>Loading...</p>';

    try {
        let result;
        switch (type) {
            case 'join-example':
                result = await api.getJoinExample();
                break;
            case 'subquery-example':
                result = await api.getSubqueryExample();
                break;
            case 'correlated-subquery':
                result = await api.getCorrelatedSubquery();
                break;
            case 'trigger-effect':
                result = await api.getTriggerEffect();
                break;
            case 'constraints':
                result = await api.getConstraints();
                break;
            case 'indexes':
                result = await api.getIndexes();
                break;
        }

        if (result && result.success) {
            displayDemoResult(result, resultDiv);
        }
    } catch (error) {
        resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

async function runViewDemo(viewName) {
    const resultDiv = document.getElementById('views-result');
    resultDiv.innerHTML = '<p>Loading...</p>';

    try {
        const result = await api.queryView(viewName);
        if (result.success) {
            displayDemoResult(result, resultDiv);
        }
    } catch (error) {
        resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

async function runRecursiveCTE() {
    const courseCode = document.getElementById('recursiveCourse').value || 'CS501';
    const resultDiv = document.getElementById('recursive-result');
    resultDiv.innerHTML = '<p>Loading...</p>';

    try {
        const result = await api.getRecursiveCTE(courseCode);
        if (result.success) {
            displayDemoResult(result, resultDiv);
        }
    } catch (error) {
        resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

function displayDemoResult(result, container) {
    let html = `
        <p><strong>Concept:</strong> ${result.concept}</p>
        <p style="color: var(--text-light);">${result.description}</p>
    `;

    if (Array.isArray(result.data)) {
        if (result.data.length === 0) {
            html += '<p>No results found.</p>';
        } else if (typeof result.data[0] === 'object') {
            html += renderResultTable(result.data);
        } else {
            html += `<p>${result.data.join(', ')}</p>`;
        }
    } else if (typeof result.data === 'object') {
        html += renderResultTable([result.data]);
    }

    container.innerHTML = html;
}

function renderResultTable(data) {
    if (!data || data.length === 0) return '<p>No data</p>';

    const columns = Object.keys(data[0]).slice(0, 10); // Limit columns

    return `
        <table class="result-table">
            <thead>
                <tr>
                    ${columns.map(col => `<th>${col}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.slice(0, 20).map(row => `
                    <tr>
                        ${columns.map(col => `<td>${row[col] ?? 'NULL'}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${data.length > 20 ? `<p style="color: var(--text-light); font-style: italic;">Showing 20 of ${data.length} results</p>` : ''}
    `;
}

function showProcedureDemo() {
    const resultDiv = document.getElementById('procedures-result');
    resultDiv.innerHTML = `
        <div class="query-display" style="margin-top: 1rem;">
            <pre>
PROCEDURE register_student_for_course(p_student_id, p_offering_id)
BEGIN
    -- Validation 1: Student exists
    -- Validation 2: Offering exists
    -- Validation 3: Not already registered
    -- Validation 4: Not already completed
    -- Validation 5: Capacity available
    -- Validation 6: All prerequisites completed (NESTED SUBQUERY)
    -- Validation 7: Credit limit not exceeded (AGGREGATE)
    -- Validation 8: No time conflicts (SELF-JOIN)

    IF all validations pass THEN
        INSERT INTO ENROLLMENT (student_id, offering_id, status)
        VALUES (p_student_id, p_offering_id, 'REGISTERED');

        -- Trigger fires automatically to update enrolled_count
        COMMIT;
    END IF;
END
            </pre>
        </div>
        <p style="margin-top: 1rem;">
            This procedure demonstrates:
            <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                <li>Transaction handling (START TRANSACTION, COMMIT, ROLLBACK)</li>
                <li>Error handling with SIGNAL SQLSTATE</li>
                <li>Nested subquery for prerequisite checking</li>
                <li>Aggregate functions for credit calculation</li>
                <li>Self-join for time conflict detection</li>
                <li>Integration with triggers</li>
            </ul>
        </p>
    `;
}

// Initialize demo navigation after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupDemoNavigation, 100);
});

// ============================================================================
// SMART DRAG-AND-DROP DATA IMPORT MODULE
// ============================================================================

const importState = {
    file: null,
    analysis: null,
    referenceData: null,
    currentType: 'STUDENT',
    columnMapping: {},
    foreignKeyOverrides: {
        departments: {},
        courses: {}
    },
    validationResult: null,
    currentStep: 1,
    filterErrorsOnly: false
};

/**
 * Initializes listeners for file drag-and-drop, browsing, and subtabs
 */
function setupImportModule() {
    const dropzoneArea = document.getElementById('dropzoneArea');
    const fileInput = document.getElementById('fileUploadInput');

    if (!dropzoneArea || !fileInput) return;

    // Drag and drop event listeners
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzoneArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneArea.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzoneArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneArea.classList.remove('dragover');
        });
    });

    dropzoneArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleSelectedImportFile(files[0]);
        }
    });

    // Make entire drop area clickable
    dropzoneArea.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-browse')) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleSelectedImportFile(e.target.files[0]);
        }
    });

    // Entity type selector buttons
    document.querySelectorAll('.entity-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const chosenType = btn.dataset.type;
            selectImportEntityType(chosenType);
        });
    });

    // Pre-fetch reference data
    api.getImportReferenceData()
        .then(res => {
            if (res.success) {
                importState.referenceData = res;
            }
        })
        .catch(err => console.error('Failed to load import reference data:', err));
}

/**
 * Subtab switcher between Import Wizard and Import History
 */
function switchImportSubTab(tabName) {
    const btnWizard = document.getElementById('btnTabImportNew');
    const btnHistory = document.getElementById('btnTabImportHistory');
    const wizardContainer = document.getElementById('importWizardContainer');
    const historyContainer = document.getElementById('importHistoryContainer');

    if (tabName === 'wizard') {
        btnWizard.classList.add('active');
        btnHistory.classList.remove('active');
        wizardContainer.style.display = 'block';
        historyContainer.style.display = 'none';
    } else {
        btnWizard.classList.remove('active');
        btnHistory.classList.add('active');
        wizardContainer.style.display = 'none';
        historyContainer.style.display = 'block';
        loadImportHistory();
    }
}

/**
 * Step navigation in import wizard
 */
function goToStep(stepNumber) {
    importState.currentStep = stepNumber;

    // Update step progress indicator
    for (let i = 1; i <= 4; i++) {
        const badge = document.getElementById(`stepBadge${i}`);
        if (!badge) continue;
        badge.classList.remove('active', 'completed');
        if (i === stepNumber) {
            badge.classList.add('active');
        } else if (i < stepNumber) {
            badge.classList.add('completed');
        }
    }

    // Toggle step containers
    const steps = [
        document.getElementById('importStepUpload'),
        document.getElementById('importStepMapping'),
        document.getElementById('importStepPreview'),
        document.getElementById('importStepComplete')
    ];

    steps.forEach((el, index) => {
        if (el) el.style.display = (index + 1 === stepNumber) ? 'block' : 'none';
    });
}

/**
 * Handles uploaded file, validates format/size, and calls backend analyzer
 */
async function handleSelectedImportFile(file) {
    if (!file) return;

    const validExtensions = ['csv', 'xlsx', 'xls'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
        alert(`Unsupported file format ".${ext}". Please upload a CSV or Excel (.xlsx) file.`);
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit. Please upload a smaller file.');
        return;
    }

    importState.file = file;

    // Show analyzing state on dropzone
    const dropzoneArea = document.getElementById('dropzoneArea');
    const originalHtml = dropzoneArea.innerHTML;
    dropzoneArea.innerHTML = `
        <div class="dropzone-icon">⏳</div>
        <h3>Reading "${file.name}"...</h3>
        <p class="dropzone-instruction">Scanning columns and matching target table fields...</p>
    `;

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.analyzeImportFile(formData);

        if (!response.success) {
            throw new Error(response.message || response.error || 'File analysis failed');
        }

        importState.analysis = response;

        // Auto-select detected entity type or fallback to top candidate
        const detected = response.typeDetection && response.typeDetection.suggestedType
            ? response.typeDetection.suggestedType
            : 'STUDENT';

        importState.currentType = detected;

        // Render file summary and column mapping
        renderFileSummary(response.fileInfo);
        renderEntityTypeDetection(response.typeDetection);
        renderColumnMappingTable();

        // Advance to step 2
        goToStep(2);

    } catch (err) {
        alert(`Error analyzing file: ${err.message}`);
        console.error(err);
    } finally {
        dropzoneArea.innerHTML = originalHtml;
        const fileInput = document.getElementById('fileUploadInput');
        if (fileInput) fileInput.value = '';
    }
}

/**
 * Renders file metadata summary card
 */
function renderFileSummary(info) {
    const card = document.getElementById('fileSummaryCard');
    if (!card) return;

    const formattedSize = (info.fileSize / 1024).toFixed(1) + ' KB';

    let sheetSelectorHtml = '';
    if (info.sheets && info.sheets.length > 1) {
        sheetSelectorHtml = `
            <div class="meta-item">
                <span class="meta-lbl">Active Sheet</span>
                <select id="sheetSelector" onchange="changeActiveSheet(this.value)" style="padding: 0.25rem 0.5rem; font-size: 0.9rem; border-radius: 4px; border: 1px solid var(--border);">
                    ${info.sheets.map(s => `<option value="${s}" ${s === info.activeSheet ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="file-meta-grid">
            <div class="meta-item">
                <span class="meta-lbl">Filename</span>
                <span class="meta-val">📄 ${info.filename}</span>
            </div>
            <div class="meta-item">
                <span class="meta-lbl">File Format</span>
                <span class="meta-val">${info.extension.toUpperCase()}</span>
            </div>
            <div class="meta-item">
                <span class="meta-lbl">File Size</span>
                <span class="meta-val">${formattedSize}</span>
            </div>
            <div class="meta-item">
                <span class="meta-lbl">Data Rows</span>
                <span class="meta-val">${info.totalRows}</span>
            </div>
            <div class="meta-item">
                <span class="meta-lbl">Columns</span>
                <span class="meta-val">${info.totalColumns}</span>
            </div>
            ${sheetSelectorHtml}
        </div>
    `;
}

/**
 * Handles switching active sheet in multi-sheet Excel file
 */
async function changeActiveSheet(sheetName) {
    if (!importState.file) return;
    const formData = new FormData();
    formData.append('file', importState.file);
    formData.append('sheetName', sheetName);

    try {
        const response = await api.analyzeImportFile(formData);
        if (response.success) {
            importState.analysis = response;
            renderFileSummary(response.fileInfo);
            renderColumnMappingTable();
        }
    } catch (err) {
        alert('Error changing sheet: ' + err.message);
    }
}

/**
 * Renders entity detection badge and type selector buttons
 */
function renderEntityTypeDetection(typeDetection) {
    const labelEl = document.getElementById('detectedTypeLabel');
    const confEl = document.getElementById('detectedTypeConfidence');

    const schema = importState.analysis.schemas[importState.currentType];
    const schemaLabel = schema ? schema.label : importState.currentType;

    if (labelEl) labelEl.textContent = schemaLabel;
    if (confEl) {
        if (typeDetection && typeDetection.confidence > 0) {
            confEl.textContent = `Detected with ${typeDetection.confidence}% match based on column headers.`;
        } else {
            confEl.textContent = 'Select the target data type below if this is not correct.';
        }
    }

    // Update active button state
    document.querySelectorAll('.entity-choice-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === importState.currentType);
    });
}

/**
 * Allows user to switch entity type manually
 */
function selectImportEntityType(type) {
    importState.currentType = type;
    renderEntityTypeDetection(importState.analysis ? importState.analysis.typeDetection : null);
    renderColumnMappingTable();
}

/**
 * Renders the intelligent column mapping table with confidence indicators
 */
function renderColumnMappingTable() {
    const tbody = document.getElementById('mappingTableBody');
    if (!tbody || !importState.analysis) return;

    const headers = importState.analysis.headers;
    const sampleRows = importState.analysis.sampleRows || [];
    const schema = importState.analysis.schemas[importState.currentType];
    const defaultMappings = (importState.analysis.mappingsBySchema && importState.analysis.mappingsBySchema[importState.currentType]) || {};

    importState.columnMapping = {};

    tbody.innerHTML = headers.map(header => {
        const rec = defaultMappings[header] || { targetField: '', confidence: 0 };
        const initialField = rec.targetField || '';
        importState.columnMapping[header] = initialField;

        // Sample values preview (first 3 distinct non-empty values)
        const samples = sampleRows
            .map(r => r[header])
            .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
            .slice(0, 3);

        const sampleHtml = samples.length > 0
            ? samples.map(s => `<span class="sample-pill" title="${String(s)}">${String(s)}</span>`).join('')
            : '<span style="color: var(--text-light); font-size: 0.85rem; font-style: italic;">No samples</span>';

        // Target field dropdown options
        const optionsHtml = [
            `<option value="ignore" ${initialField === '' || initialField === 'ignore' ? 'selected' : ''}>-- Do Not Import / Ignore --</option>`,
            ...Object.entries(schema.fields).map(([fKey, fDef]) => {
                const reqStar = fDef.required ? ' *' : '';
                return `<option value="${fKey}" ${initialField === fKey ? 'selected' : ''}>${fDef.label}${reqStar}</option>`;
            })
        ].join('');

        // Confidence badge
        let confidenceBadge = '';
        if (rec.confidence >= 85) {
            confidenceBadge = `<span class="confidence-pill confidence-high">${rec.confidence}% match</span>`;
        } else if (rec.confidence >= 60) {
            confidenceBadge = `<span class="confidence-pill confidence-med">${rec.confidence}% match</span>`;
        } else if (initialField) {
            confidenceBadge = `<span class="confidence-pill confidence-low">Low match (${rec.confidence}%)</span>`;
        } else {
            confidenceBadge = `<span class="confidence-pill" style="background:#e2e8f0; color:#64748b;">Unmapped</span>`;
        }

        return `
            <tr>
                <td><strong>${header}</strong></td>
                <td><div style="max-width: 250px; display: flex; flex-wrap: wrap;">${sampleHtml}</div></td>
                <td>
                    <select class="mapping-select" data-header="${header}" onchange="updateColumnMapping('${header}', this.value)">
                        ${optionsHtml}
                    </select>
                </td>
                <td id="conf-badge-${header.replace(/[^a-zA-Z0-9]/g, '_')}">${confidenceBadge}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Updates column mapping in state when user changes dropdown
 */
function updateColumnMapping(header, targetField) {
    importState.columnMapping[header] = targetField;
    const badgeId = `conf-badge-${header.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const badgeEl = document.getElementById(badgeId);

    if (badgeEl) {
        if (targetField === 'ignore' || targetField === '') {
            badgeEl.innerHTML = `<span class="confidence-pill" style="background:#e2e8f0; color:#64748b;">Ignored</span>`;
        } else {
            badgeEl.innerHTML = `<span class="confidence-pill confidence-high">Manual</span>`;
        }
    }
}

/**
 * Validates mapped data and advances to Preview (Step 3)
 */
async function proceedToValidation() {
    if (!importState.analysis || !importState.analysis.stagedData) {
        alert('No staged data to validate');
        return;
    }

    // Verify all required fields have a mapped source
    const schema = importState.analysis.schemas[importState.currentType];
    const mappedTargets = Object.values(importState.columnMapping);
    const missingRequired = [];

    for (const [fKey, fDef] of Object.entries(schema.fields)) {
        if (fDef.required && !mappedTargets.includes(fKey)) {
            missingRequired.push(fDef.label);
        }
    }

    if (missingRequired.length > 0) {
        const proceed = confirm(`Warning: The following required fields are not mapped:\n- ${missingRequired.join('\n- ')}\n\nDo you want to proceed with validation anyway?`);
        if (!proceed) return;
    }

    try {
        const payload = {
            importType: importState.currentType,
            columnMapping: importState.columnMapping,
            rawData: importState.analysis.stagedData,
            foreignKeyOverrides: importState.foreignKeyOverrides
        };

        const response = await api.validateImportData(payload);

        if (!response.success) {
            throw new Error(response.message || response.error || 'Validation failed');
        }

        importState.validationResult = response;

        renderValidationSummary(response.summary);
        renderForeignKeyResolvers(response.unmappedEntities, response.availableDepartments, response.availableCourses);
        renderStagingPreviewTable();

        goToStep(3);

    } catch (err) {
        alert(`Validation error: ${err.message}`);
        console.error(err);
    }
}

/**
 * Renders validation summary counter cards
 */
function renderValidationSummary(summary) {
    const container = document.getElementById('validationSummaryCards');
    if (!container) return;

    container.innerHTML = `
        <div class="val-card total">
            <div class="val-icon">📊</div>
            <div class="val-details">
                <div class="val-num">${summary.totalRows}</div>
                <div class="val-label">Total Rows</div>
            </div>
        </div>
        <div class="val-card valid">
            <div class="val-icon">✓</div>
            <div class="val-details">
                <div class="val-num" style="color: var(--success);">${summary.validRows}</div>
                <div class="val-label">Valid Rows</div>
            </div>
        </div>
        <div class="val-card warning">
            <div class="val-icon">⚠</div>
            <div class="val-details">
                <div class="val-num" style="color: var(--warning);">${summary.warningRows}</div>
                <div class="val-label">Warnings</div>
            </div>
        </div>
        <div class="val-card error">
            <div class="val-icon">✗</div>
            <div class="val-details">
                <div class="val-num" style="color: var(--danger);">${summary.errorRows}</div>
                <div class="val-label">Errors</div>
            </div>
        </div>
    `;

    const btnExec = document.getElementById('btnExecuteImport');
    if (btnExec) {
        const importableCount = summary.validRows + summary.warningRows;
        btnExec.disabled = (importableCount === 0);
        btnExec.innerHTML = `Import ${importableCount} Valid Records`;
    }
}

/**
 * Renders foreign key resolution helper when unknown departments/courses appear
 */
function renderForeignKeyResolvers(unmapped, depts = [], courses = []) {
    const sec = document.getElementById('foreignKeyResolverSection');
    if (!sec) return;

    const unmappedDepts = unmapped.departments || [];
    if (unmappedDepts.length === 0) {
        sec.style.display = 'none';
        return;
    }

    sec.style.display = 'block';
    sec.innerHTML = `
        <h4>Unmatched Department Values</h4>
        <p style="font-size: 0.9rem; color: #92400e;">Some department values in the file do not match existing records. Select an existing department to map them:</p>
        ${unmappedDepts.map(rawDept => `
            <div class="fk-resolver-row">
                <span>Map <strong>"${rawDept}"</strong> to:</span>
                <select onchange="handleFkOverride('departments', '${rawDept.toUpperCase()}', this.value)">
                    <option value="">-- Select Existing Department --</option>
                    ${depts.map(d => `<option value="${d.department_id}">${d.department_name} (${d.department_code})</option>`).join('')}
                </select>
            </div>
        `).join('')}
    `;
}

function handleFkOverride(category, rawKey, targetId) {
    if (!importState.foreignKeyOverrides[category]) {
        importState.foreignKeyOverrides[category] = {};
    }
    if (targetId) {
        importState.foreignKeyOverrides[category][rawKey] = targetId;
    } else {
        delete importState.foreignKeyOverrides[category][rawKey];
    }
    // Re-run validation seamlessly
    proceedToValidation();
}

/**
 * Toggles preview error filter checkbox
 */
function togglePreviewErrorFilter() {
    const chk = document.getElementById('chkShowErrorsOnly');
    importState.filterErrorsOnly = chk ? chk.checked : false;
    renderStagingPreviewTable();
}

/**
 * Renders interactive Staging Preview Table with color-coded rows & error messages
 */
function renderStagingPreviewTable() {
    const head = document.getElementById('previewTableHead');
    const body = document.getElementById('previewTableBody');

    if (!head || !body || !importState.validationResult) return;

    const schema = importState.analysis.schemas[importState.currentType];
    const fieldKeys = Object.keys(schema.fields);

    // Render Table Header
    head.innerHTML = `
        <tr>
            <th style="width: 70px;">Row #</th>
            <th style="width: 120px;">Status</th>
            ${fieldKeys.map(k => `<th>${schema.fields[k].label}</th>`).join('')}
            <th>Validation Notes</th>
        </tr>
    `;

    // Filter rows if requested
    let rowsToRender = importState.validationResult.validatedRows || [];
    if (importState.filterErrorsOnly) {
        rowsToRender = rowsToRender.filter(r => r.status === 'error' || r.status === 'warning');
    }

    if (rowsToRender.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="${fieldKeys.length + 3}" style="text-align:center; padding: 2rem; color: var(--text-light);">
                    No rows to display with current filter.
                </td>
            </tr>
        `;
        return;
    }

    // Render Rows (capped at first 100 in table for high performance)
    const displaySlice = rowsToRender.slice(0, 100);

    body.innerHTML = displaySlice.map(item => {
        let rowClass = 'row-valid';
        let statusBadge = '<span class="badge-valid">Valid</span>';

        if (item.status === 'warning') {
            rowClass = 'row-warning';
            statusBadge = '<span class="badge-warning">Warning</span>';
        } else if (item.status === 'error') {
            rowClass = 'row-error';
            statusBadge = '<span class="badge-error">Invalid</span>';
        }

        let notesHtml = '';
        if (item.errors && item.errors.length > 0) {
            notesHtml += `<div class="issue-list">${item.errors.map(e => `• ${e}`).join('<br>')}</div>`;
        }
        if (item.warnings && item.warnings.length > 0) {
            notesHtml += `<div class="warning-list">${item.warnings.map(w => `• ${w}`).join('<br>')}</div>`;
        }
        if (!notesHtml) {
            notesHtml = `<span style="color: var(--success); font-size: 0.85rem;">Valid</span>`;
        }

        const cellsHtml = fieldKeys.map(k => {
            const val = item.mappedRow[k] ?? '';
            return `<td>${val !== '' ? val : '<span style="color:#94a3b8;">—</span>'}</td>`;
        }).join('');

        return `
            <tr class="${rowClass}">
                <td><strong>#${item.rowNumber}</strong></td>
                <td>${statusBadge}</td>
                ${cellsHtml}
                <td>${notesHtml}</td>
            </tr>
        `;
    }).join('');

    if (rowsToRender.length > 100) {
        body.innerHTML += `
            <tr>
                <td colspan="${fieldKeys.length + 3}" style="text-align: center; color: var(--text-light); font-style: italic; background: #f8fafc;">
                    Showing first 100 rows of ${rowsToRender.length} total rows.
                </td>
            </tr>
        `;
    }
}

/**
 * Executes the database transaction to import valid records
 */
async function executeCurrentImport() {
    if (!importState.validationResult) return;

    const validated = importState.validationResult.validatedRows || [];
    // Only import valid and warning rows (errors are excluded to protect referential integrity)
    const rowsToImport = validated.filter(r => r.status === 'valid' || r.status === 'warning');

    if (rowsToImport.length === 0) {
        alert('There are no valid records to import.');
        return;
    }

    const dupStrategyEl = document.querySelector('input[name="duplicateStrategy"]:checked');
    const duplicateStrategy = dupStrategyEl ? dupStrategyEl.value : 'skip';

    const btnExec = document.getElementById('btnExecuteImport');
    if (btnExec) {
        btnExec.disabled = true;
        btnExec.textContent = 'Importing records...';
    }

    try {
        const payload = {
            importType: importState.currentType,
            filename: importState.file ? importState.file.name : 'uploaded_file',
            rowsToImport,
            duplicateStrategy
        };

        const response = await api.executeImport(payload);

        if (!response.success) {
            throw new Error(response.message || response.error || 'Import transaction failed');
        }

        // Render result card
        renderImportResultCard(response.metrics, response.status);

        // Refresh global caches in background
        loadStudents();
        loadCourses();
        loadOfferings();
        loadDashboard();

        // Advance to step 4
        goToStep(4);

    } catch (err) {
        alert(`Import failed: ${err.message}\nAny partial changes were rolled back.`);
        console.error(err);
    } finally {
        if (btnExec) {
            btnExec.disabled = false;
            btnExec.textContent = 'Import Valid Records';
        }
    }
}

/**
 * Renders the Step 4 Import Complete card with metrics and audit summary
 */
function renderImportResultCard(metrics, status) {
    const card = document.getElementById('importResultCard');
    if (!card) return;

    let icon = '✓';
    let statusTitle = 'Import Complete';
    let statusClass = 'color: var(--success);';

    if (status === 'SUCCESS WITH WARNINGS') {
        icon = '⚠️';
        statusTitle = 'Import Finished with Warnings';
        statusClass = 'color: var(--warning);';
    } else if (status === 'FAILED') {
        icon = '❌';
        statusTitle = 'Import Failed';
        statusClass = 'color: var(--danger);';
    }

    let failureHtml = '';
    if (metrics.failures && metrics.failures.length > 0) {
        failureHtml = `
            <div class="failure-log-box">
                <h4>Row Errors:</h4>
                <ul>
                    ${metrics.failures.map(f => `<li><strong>Row ${f.rowNumber}:</strong> ${f.error}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="result-status-icon">${icon}</div>
        <h2 style="${statusClass}">${statusTitle}</h2>
        <p style="color: var(--text-light); font-size: 1.05rem;">
            Imported <strong>${metrics.filename}</strong> into the <strong>${metrics.importType}</strong> table.
        </p>

        <div class="result-stats-row">
            <div class="result-stat-box">
                <div class="res-val">${metrics.totalProcessed}</div>
                <div class="res-lbl">Total Rows</div>
            </div>
            <div class="result-stat-box">
                <div class="res-val" style="color: var(--success);">${metrics.successful}</div>
                <div class="res-lbl">Imported</div>
            </div>
            <div class="result-stat-box">
                <div class="res-val" style="color: var(--warning);">${metrics.skipped}</div>
                <div class="res-lbl">Skipped</div>
            </div>
            <div class="result-stat-box">
                <div class="res-val" style="color: var(--danger);">${metrics.failed}</div>
                <div class="res-lbl">Errors</div>
            </div>
        </div>

        ${failureHtml}
    `;
}

/**
 * Resets the import wizard to start a fresh import
 */
function resetImportWizard() {
    importState.file = null;
    importState.analysis = null;
    importState.columnMapping = {};
    importState.foreignKeyOverrides = { departments: {}, courses: {} };
    importState.validationResult = null;
    goToStep(1);
}

/**
 * Loads and displays the chronological Import Audit History
 */
async function loadImportHistory() {
    const tbody = document.getElementById('importHistoryBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 1.5rem;">Loading import history...</td></tr>`;

    try {
        const response = await api.getImportHistory();

        if (!response.success || !response.history || response.history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align:center; padding: 2rem; color: var(--text-light);">
                        No import history found. Use the "New Import" tab to upload a file.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = response.history.map(item => {
            const dateStr = new Date(item.imported_at).toLocaleString();
            let statusBadge = '<span class="badge-valid">SUCCESS</span>';
            if (item.status === 'SUCCESS WITH WARNINGS') statusBadge = '<span class="badge-warning">WARNINGS</span>';
            else if (item.status === 'FAILED') statusBadge = '<span class="badge-error">FAILED</span>';

            return `
                <tr>
                    <td><strong>#${item.import_id}</strong></td>
                    <td>📄 ${item.filename}</td>
                    <td><span class="format-tag">${item.import_type}</span></td>
                    <td style="font-size: 0.9rem; color: var(--text-light);">${dateStr}</td>
                    <td>${item.total_rows}</td>
                    <td style="color: var(--success); font-weight: 600;">${item.successful_rows}</td>
                    <td style="color: var(--warning);">${item.skipped_rows}</td>
                    <td style="color: var(--danger);">${item.failed_rows}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="viewImportHistoryDetails(${item.import_id}, ${JSON.stringify(JSON.stringify(item.details))})">
                            View Log
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color: var(--danger); padding: 1rem;">Failed to load history: ${err.message}</td></tr>`;
        console.error(err);
    }
}

/**
 * Shows history detail modal / alert
 */
function viewImportHistoryDetails(importId, detailsJsonStr) {
    try {
        const details = JSON.parse(detailsJsonStr);
        let msg = `Import ID: #${importId}\nInserted: ${details.inserted}\nUpdated: ${details.updated}\nSkipped: ${details.skipped}\nFailed: ${details.failed}`;
        if (details.failures && details.failures.length > 0) {
            msg += `\n\nFailures:\n` + details.failures.map(f => `• Row ${f.rowNumber}: ${f.error}`).join('\n');
        }
        alert(msg);
    } catch (e) {
        alert('Details: ' + detailsJsonStr);
    }
}

