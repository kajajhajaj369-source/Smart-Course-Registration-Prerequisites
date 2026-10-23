const fs = require('fs');
const path = require('path');
const xlsx = require('../backend/node_modules/xlsx');

const samplesDir = __dirname;
const csvFiles = fs.readdirSync(samplesDir).filter(f => f.endsWith('.csv'));

csvFiles.forEach(csvFile => {
    const csvPath = path.join(samplesDir, csvFile);
    const content = fs.readFileSync(csvPath, 'utf8');
    const workbook = xlsx.read(content, { type: 'string' });
    const xlsxPath = path.join(samplesDir, csvFile.replace('.csv', '.xlsx'));
    xlsx.writeFile(workbook, xlsxPath);
    console.log(`Generated Excel: ${xlsxPath}`);
});
