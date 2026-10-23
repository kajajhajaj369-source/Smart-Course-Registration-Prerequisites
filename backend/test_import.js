/**
 * Integration test for the Smart Data Import API
 * Tests: file analysis, validation, and history endpoints
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';

function request(method, url, body, contentType) {
    return new Promise((resolve, reject) => {
        const opts = {
            method,
            headers: {}
        };
        let bodyData = null;
        if (body) {
            if (contentType === 'json') {
                bodyData = JSON.stringify(body);
                opts.headers['Content-Type'] = 'application/json';
                opts.headers['Content-Length'] = Buffer.byteLength(bodyData);
            } else if (contentType === 'form') {
                bodyData = body;
                opts.headers['Content-Type'] = body.boundary ? `multipart/form-data; boundary=${body.boundary}` : 'application/x-www-form-urlencoded';
                opts.headers['Content-Length'] = Buffer.byteLength(bodyData.data);
            }
        }
        const urlObj = new URL(url);
        opts.hostname = urlObj.hostname;
        opts.port = urlObj.port;
        opts.path = urlObj.pathname + urlObj.search;
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (bodyData) {
            if (contentType === 'form') req.write(bodyData.data);
            else req.write(bodyData);
        }
        req.end();
    });
}

function buildMultipartBody(fieldName, filename, fileBuffer, mimeType) {
    const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);
    const nl = '\r\n';
    const header = Buffer.from(
        `--${boundary}${nl}Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${nl}Content-Type: ${mimeType}${nl}${nl}`
    );
    const footer = Buffer.from(`${nl}--${boundary}--${nl}`);
    const data = Buffer.concat([header, fileBuffer, footer]);
    return { boundary, data };
}

async function runTests() {
    let passed = 0, failed = 0;

    function check(name, condition, details = '') {
        if (condition) {
            console.log(`  ✓ ${name}`);
            passed++;
        } else {
            console.log(`  ✗ ${name}${details ? ' — ' + details : ''}`);
            failed++;
        }
    }

    console.log('\n=== SMART DATA IMPORT: API INTEGRATION TESTS ===\n');

    // === TEST 1: Reference Data Endpoint ===
    console.log('TEST 1: /api/import/reference-data');
    const ref = await request('GET', `${BASE}/api/import/reference-data`);
    check('Returns success:true', ref.body.success === true);
    check('Has departments array', Array.isArray(ref.body.lookups.departments));
    check('Has departments loaded', ref.body.lookups.departments.length > 0, `count=${ref.body.lookups.departments.length}`);
    check('Has 6 entity schemas', Object.keys(ref.body.schemas).length === 6);

    // === TEST 2: Import History (empty initially) ===
    console.log('\nTEST 2: /api/import/history');
    const hist = await request('GET', `${BASE}/api/import/history`);
    check('Returns success:true', hist.body.success === true);
    check('Has history array', Array.isArray(hist.body.history));

    // === TEST 3: Analyze valid CSV file ===
    console.log('\nTEST 3: Analyze students_clean.csv');
    const csvPath = path.join(__dirname, '..', 'sample_import_files', '1_students_clean.csv');
    const csvBuf = fs.readFileSync(csvPath);
    const form = buildMultipartBody('file', '1_students_clean.csv', csvBuf, 'text/csv');
    const analyzeRes = await new Promise((resolve, reject) => {
        const opts = {
            method: 'POST',
            hostname: 'localhost',
            port: 3000,
            path: '/api/import/analyze',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${form.boundary}`,
                'Content-Length': form.data.length
            }
        };
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(form.data);
        req.end();
    });
    check('Returns success:true', analyzeRes.body.success === true, JSON.stringify(analyzeRes.body.error));
    check('Detects 10 rows', analyzeRes.body.fileInfo && analyzeRes.body.fileInfo.totalRows === 10);
    check('Detects 5+ columns', analyzeRes.body.fileInfo && analyzeRes.body.fileInfo.totalColumns >= 5);
    check('Suggests STUDENT type', analyzeRes.body.typeDetection && analyzeRes.body.typeDetection.suggestedType === 'STUDENT');
    check('Has mappingsBySchema for STUDENT', analyzeRes.body.mappingsBySchema && analyzeRes.body.mappingsBySchema.STUDENT);

    // === TEST 4: Analyze alternate column names CSV ===
    console.log('\nTEST 4: Analyze alternate column headers (Roll No, Branch, Sem)');
    const altPath = path.join(__dirname, '..', 'sample_import_files', '2_students_alternate_columns.csv');
    const altBuf = fs.readFileSync(altPath);
    const altForm = buildMultipartBody('file', '2_students_alternate_columns.csv', altBuf, 'text/csv');
    const altRes = await new Promise((resolve, reject) => {
        const opts = {
            method: 'POST',
            hostname: 'localhost',
            port: 3000,
            path: '/api/import/analyze',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${altForm.boundary}`,
                'Content-Length': altForm.data.length
            }
        };
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(altForm.data);
        req.end();
    });
    check('Returns success:true', altRes.body.success === true);
    check('Detects 6 rows', altRes.body.fileInfo && altRes.body.fileInfo.totalRows === 6);
    const studentMapping = altRes.body.mappingsBySchema && altRes.body.mappingsBySchema.STUDENT;
    if (studentMapping) {
        const nameMap = studentMapping['Student Name'];
        const semMap = studentMapping['Sem'];
        check('Maps Student Name to name', nameMap && nameMap.targetField === 'name', `got: ${nameMap && nameMap.targetField}`);
        check('Maps Sem to current_semester with confidence', semMap && semMap.confidence > 0, `got: ${semMap && semMap.confidence}`);
    }

    // === TEST 5: Validate data with known departments ===
    console.log('\nTEST 5: Validate clean CSV data');
    if (analyzeRes.body.success) {
        const schema = analyzeRes.body.schemas.STUDENT;
        const mapping = {};
        const defaultMaps = analyzeRes.body.mappingsBySchema.STUDENT;
        Object.entries(defaultMaps).forEach(([h, r]) => {
            mapping[h] = r.targetField || 'ignore';
        });
        const validateRes = await request('POST', `${BASE}/api/import/validate`, {
            importType: 'STUDENT',
            columnMapping: mapping,
            rawData: analyzeRes.body.stagedData,
            foreignKeyOverrides: { departments: {}, courses: {} }
        }, 'json');
        check('Validation returns success', validateRes.body.success === true, validateRes.body.error);
        check('Has validatedRows', Array.isArray(validateRes.body.validatedRows));
        check('Has summary', validateRes.body.summary && validateRes.body.summary.totalRows === 10);
    }

    // === TEST 6: Unsupported file type rejected ===
    console.log('\nTEST 6: Reject unsupported file type (.pdf)');
    const fakePdfBuf = Buffer.from('%PDF-1.4 fake pdf content');
    const pdfForm = buildMultipartBody('file', 'report.pdf', fakePdfBuf, 'application/pdf');
    const pdfRes = await new Promise((resolve, reject) => {
        const opts = {
            method: 'POST',
            hostname: 'localhost',
            port: 3000,
            path: '/api/import/analyze',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${pdfForm.boundary}`,
                'Content-Length': pdfForm.data.length
            }
        };
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(pdfForm.data);
        req.end();
    });
    check('Rejects unsupported .pdf with 400', pdfRes.status === 400);
    check('Returns informative error', pdfRes.body.error && pdfRes.body.error.includes('Unsupported'));

    // === TEST 7: Error file validation ===
    console.log('\nTEST 7: Validate file with known errors');
    const errPath = path.join(__dirname, '..', 'sample_import_files', '3_students_with_errors.csv');
    const errBuf = fs.readFileSync(errPath);
    const errForm = buildMultipartBody('file', '3_students_with_errors.csv', errBuf, 'text/csv');
    const errAnalyze = await new Promise((resolve, reject) => {
        const opts = {
            method: 'POST',
            hostname: 'localhost',
            port: 3000,
            path: '/api/import/analyze',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${errForm.boundary}`,
                'Content-Length': errForm.data.length
            }
        };
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(errForm.data);
        req.end();
    });
    if (errAnalyze.body.success) {
        const errMapping = {};
        const errMaps = errAnalyze.body.mappingsBySchema.STUDENT;
        Object.entries(errMaps).forEach(([h, r]) => {
            errMapping[h] = r.targetField || 'ignore';
        });
        const errValidate = await request('POST', `${BASE}/api/import/validate`, {
            importType: 'STUDENT',
            columnMapping: errMapping,
            rawData: errAnalyze.body.stagedData,
            foreignKeyOverrides: { departments: {}, courses: {} }
        }, 'json');
        check('Error file returns success on validate call', errValidate.body.success === true);
        check('Detects error rows', errValidate.body.summary && errValidate.body.summary.errorRows > 0,
            `errorRows=${errValidate.body.summary && errValidate.body.summary.errorRows}`);
        check('Has unmapped departments', errValidate.body.unmappedEntities && errValidate.body.unmappedEntities.departments.length > 0);
    }

    // === SUMMARY ===
    console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
    return failed === 0;
}

runTests().catch(err => {
    console.error('Test runner crashed:', err.message);
    process.exit(1);
});
