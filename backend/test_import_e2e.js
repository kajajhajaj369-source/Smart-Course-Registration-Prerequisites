/**
 * End-to-End transaction test: analyze → validate → execute → verify history
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

function post(url, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const opts = {
            method: 'POST', hostname: 'localhost', port: 3000, path: url,
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        };
        const req = http.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function uploadFile(filename, fileBuffer, mimeType) {
    const boundary = 'TestBoundary12345';
    const nl = '\r\n';
    const headerStr = ['--' + boundary, 'Content-Disposition: form-data; name="file"; filename="' + filename + '"', 'Content-Type: ' + mimeType, '', ''].join(nl);
    const footerStr = nl + '--' + boundary + '--' + nl;
    const header = Buffer.from(headerStr);
    const footer = Buffer.from(footerStr);
    const data = Buffer.concat([header, fileBuffer, footer]);

    return new Promise((resolve, reject) => {
        const opts = {
            method: 'POST', hostname: 'localhost', port: 3000,
            path: '/api/import/analyze',
            headers: {
                'Content-Type': 'multipart/form-data; boundary=' + boundary,
                'Content-Length': data.length
            }
        };
        const req = http.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('=== END-TO-END IMPORT TRANSACTION TEST ===\n');

    // Step 1: Analyze
    const csvBuf = fs.readFileSync(path.join(__dirname, '..', 'sample_import_files', '1_students_clean.csv'));
    const analyzeResult = await uploadFile('1_students_clean.csv', csvBuf, 'text/csv');
    console.log('Step 1 Analyze: success=' + analyzeResult.success + ', rows=' + (analyzeResult.fileInfo && analyzeResult.fileInfo.totalRows));
    if (!analyzeResult.success) { console.error('Analyze failed:', analyzeResult.error); return; }

    // Step 2: Validate
    const mapping = {};
    const defaultMaps = analyzeResult.mappingsBySchema.STUDENT;
    Object.entries(defaultMaps).forEach(([h, r]) => { mapping[h] = r.targetField || 'ignore'; });

    const validateResult = await post('/api/import/validate', {
        importType: 'STUDENT',
        columnMapping: mapping,
        rawData: analyzeResult.stagedData,
        foreignKeyOverrides: { departments: {}, courses: {} }
    });
    console.log('Step 2 Validate: success=' + validateResult.success
        + ', valid=' + (validateResult.summary && validateResult.summary.validRows)
        + ', warnings=' + (validateResult.summary && validateResult.summary.warningRows)
        + ', errors=' + (validateResult.summary && validateResult.summary.errorRows));

    // Step 3: Execute
    const rowsToImport = (validateResult.validatedRows || []).filter(r => r.status === 'valid' || r.status === 'warning');
    console.log('Rows eligible for import: ' + rowsToImport.length);

    const execResult = await post('/api/import/execute', {
        importType: 'STUDENT',
        filename: '1_students_clean.csv',
        rowsToImport,
        duplicateStrategy: 'skip'
    });
    console.log('Step 3 Execute: success=' + execResult.success
        + ', status=' + execResult.status
        + ', inserted=' + (execResult.metrics && execResult.metrics.inserted)
        + ', skipped=' + (execResult.metrics && execResult.metrics.skipped));

    // Step 4: Verify history
    const histResult = await new Promise((resolve, reject) => {
        http.get('http://localhost:3000/api/import/history', res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        });
    });
    console.log('\nStep 4 History: entries=' + (histResult.history && histResult.history.length));
    if (histResult.history && histResult.history[0]) {
        const h = histResult.history[0];
        console.log('  Latest audit: file=' + h.filename + ' | type=' + h.import_type + ' | status=' + h.status + ' | imported=' + h.successful_rows + ' | skipped=' + h.skipped_rows);
    }

    console.log('\n=== END-TO-END TEST COMPLETE ===');
}

main().catch(e => { console.error('TEST ERROR:', e.message); process.exit(1); });
