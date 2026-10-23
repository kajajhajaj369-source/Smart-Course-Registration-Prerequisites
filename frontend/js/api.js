/**
 * API Module
 * Handles all HTTP requests to the backend
 */

const API_BASE = '/api';

const api = {
    // Students
    async getStudents() {
        const response = await fetch(`${API_BASE}/students`);
        return response.json();
    },

    async getStudent(id) {
        const response = await fetch(`${API_BASE}/students/${id}`);
        return response.json();
    },

    async getStudentTranscript(id) {
        const response = await fetch(`${API_BASE}/students/${id}/transcript`);
        return response.json();
    },

    async getStudentCurrentSchedule(id) {
        const response = await fetch(`${API_BASE}/students/${id}/current-schedule`);
        return response.json();
    },

    async getStudentEligibility(id) {
        const response = await fetch(`${API_BASE}/students/${id}/eligibility`);
        return response.json();
    },

    async getStudentCompletedCourses(id) {
        const response = await fetch(`${API_BASE}/students/${id}/completed-courses`);
        return response.json();
    },

    async getStudentEligibleCourses(id) {
        const response = await fetch(`${API_BASE}/students/${id}/eligible-courses`);
        return response.json();
    },

    async getMissingPrerequisites(studentId, courseId) {
        const response = await fetch(`${API_BASE}/students/${studentId}/missing-prerequisites/${courseId}`);
        return response.json();
    },

    async addStudent(student) {
        const response = await fetch(`${API_BASE}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(student)
        });
        return response.json();
    },

    // Courses
    async getCourses() {
        const response = await fetch(`${API_BASE}/courses`);
        return response.json();
    },

    async getCourse(id) {
        const response = await fetch(`${API_BASE}/courses/${id}`);
        return response.json();
    },

    async getCoursePrerequisites(id) {
        const response = await fetch(`${API_BASE}/courses/${id}/prerequisites`);
        return response.json();
    },

    async getPrerequisiteChain(id) {
        const response = await fetch(`${API_BASE}/courses/${id}/prerequisite-chain`);
        return response.json();
    },

    async getCoursesRequiringThis(id) {
        const response = await fetch(`${API_BASE}/courses/${id}/required-for`);
        return response.json();
    },

    async getCourseOfferings(courseId) {
        const response = await fetch(`${API_BASE}/courses/${courseId}/offerings`);
        return response.json();
    },

    async getAllOfferings(semester = 'Fall', year = 2025) {
        const response = await fetch(`${API_BASE}/courses/offerings/all?semester=${semester}&year=${year}`);
        return response.json();
    },

    async getOffering(offeringId) {
        const response = await fetch(`${API_BASE}/courses/offerings/${offeringId}`);
        return response.json();
    },

    async getAvailableOfferings(semester = 'Fall', year = 2025) {
        const response = await fetch(`${API_BASE}/courses/offerings/available?semester=${semester}&year=${year}`);
        return response.json();
    },

    async getDepartments() {
        const response = await fetch(`${API_BASE}/courses/departments/all`);
        return response.json();
    },

    async getFaculty() {
        const response = await fetch(`${API_BASE}/courses/faculty/all`);
        return response.json();
    },

    // Enrollments
    async getEnrollments() {
        const response = await fetch(`${API_BASE}/enrollments`);
        return response.json();
    },

    async getStudentEnrollments(studentId) {
        const response = await fetch(`${API_BASE}/enrollments/student/${studentId}`);
        return response.json();
    },

    async getOfferingEnrollments(offeringId) {
        const response = await fetch(`${API_BASE}/enrollments/offering/${offeringId}`);
        return response.json();
    },

    async registerForCourse(studentId, offeringId) {
        const response = await fetch(`${API_BASE}/enrollments/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, offeringId })
        });
        return response.json();
    },

    async dropCourse(studentId, offeringId) {
        const response = await fetch(`${API_BASE}/enrollments/drop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, offeringId })
        });
        return response.json();
    },

    async completeCourse(enrollmentId, grade) {
        const response = await fetch(`${API_BASE}/enrollments/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enrollmentId, grade })
        });
        return response.json();
    },

    async checkPrerequisites(studentId, courseId) {
        const response = await fetch(`${API_BASE}/enrollments/check-prerequisites/${studentId}/${courseId}`);
        return response.json();
    },

    async validateRegistration(studentId, offeringId) {
        const response = await fetch(`${API_BASE}/enrollments/validate/${studentId}/${offeringId}`);
        return response.json();
    },

    async checkTimeConflicts(studentId, offeringId) {
        const response = await fetch(`${API_BASE}/enrollments/time-conflicts/${studentId}/${offeringId}`);
        return response.json();
    },

    // Demos
    async getJoinExample() {
        const response = await fetch(`${API_BASE}/demos/join-example`);
        return response.json();
    },

    async getSubqueryExample() {
        const response = await fetch(`${API_BASE}/demos/subquery-example`);
        return response.json();
    },

    async getCorrelatedSubquery() {
        const response = await fetch(`${API_BASE}/demos/correlated-subquery`);
        return response.json();
    },

    async getRecursiveCTE(courseCode) {
        const response = await fetch(`${API_BASE}/demos/recursive-cte?course=${courseCode}`);
        return response.json();
    },

    async getExistsExample() {
        const response = await fetch(`${API_BASE}/demos/exists-example`);
        return response.json();
    },

    async getViewsList() {
        const response = await fetch(`${API_BASE}/demos/views`);
        return response.json();
    },

    async queryView(name, filters = {}) {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_BASE}/demos/view/${name}?${params}`);
        return response.json();
    },

    async getProcedures() {
        const response = await fetch(`${API_BASE}/demos/procedures`);
        return response.json();
    },

    async getTriggers() {
        const response = await fetch(`${API_BASE}/demos/triggers`);
        return response.json();
    },

    async getTriggerEffect() {
        const response = await fetch(`${API_BASE}/demos/trigger-effect`);
        return response.json();
    },

    async getFunctions() {
        const response = await fetch(`${API_BASE}/demos/functions`);
        return response.json();
    },

    async getAggregateExample() {
        const response = await fetch(`${API_BASE}/demos/aggregate-example`);
        return response.json();
    },

    async getCaseExpression() {
        const response = await fetch(`${API_BASE}/demos/case-expression`);
        return response.json();
    },

    async getConstraints() {
        const response = await fetch(`${API_BASE}/demos/constraints`);
        return response.json();
    },

    async getIndexes() {
        const response = await fetch(`${API_BASE}/demos/indexes`);
        return response.json();
    },

    async getDemosSummary() {
        const response = await fetch(`${API_BASE}/demos/summary`);
        return response.json();
    },

    // Smart Data Import
    async getImportReferenceData() {
        const response = await fetch(`${API_BASE}/import/reference-data`);
        return response.json();
    },

    async analyzeImportFile(formData) {
        const response = await fetch(`${API_BASE}/import/analyze`, {
            method: 'POST',
            body: formData
        });
        return response.json();
    },

    async validateImportData(payload) {
        const response = await fetch(`${API_BASE}/import/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.json();
    },

    async executeImport(payload) {
        const response = await fetch(`${API_BASE}/import/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.json();
    },

    async getImportHistory() {
        const response = await fetch(`${API_BASE}/import/history`);
        return response.json();
    }
};
