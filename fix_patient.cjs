const fs = require('fs');
let content = fs.readFileSync('components/PatientInfoPage.tsx', 'utf-8');
content = content.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
content = content.replace(/\\s/g, '\\s').replace(/\\S/g, '\\S').replace(/\\d/g, '\\d').replace(/\\D/g, '\\D');
// Fix the replaces:
content = content.replace(/\\\\s/g, '\\s').replace(/\\\\S/g, '\\S').replace(/\\\\d/g, '\\d').replace(/\\\\D/g, '\\D');
fs.writeFileSync('components/PatientInfoPage.tsx', content);
