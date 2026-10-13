const fs = require('fs');
let code = fs.readFileSync('components/DashboardButton.tsx', 'utf-8');
code = code.replace(
    '{React.isValidElement(icon) ? {React.cloneElement(icon as React.ReactElement<any>, { size: 40 })} : icon}',
    '{React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 40 }) : icon}'
);
fs.writeFileSync('components/DashboardButton.tsx', code);
