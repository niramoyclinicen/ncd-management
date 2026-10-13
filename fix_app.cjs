const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf-8');

// We need to replace labInvoices with invoices inside <AccountingPage
const startIndex = content.indexOf('<AccountingPage');
if (startIndex !== -1) {
    const endIndex = content.indexOf('/>', startIndex);
    if (endIndex !== -1) {
        let accountingBlock = content.substring(startIndex, endIndex);
        accountingBlock = accountingBlock.replace('labInvoices={data.labInvoices}', 'invoices={data.labInvoices}');
        content = content.substring(0, startIndex) + accountingBlock + content.substring(endIndex);
    }
}

fs.writeFileSync('App.tsx', content);
