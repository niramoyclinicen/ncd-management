export const generateOfflineViewer = (appState: any) => {
  const jsonStr = JSON.stringify(appState || {}).replace(/</g, '\\u003c');
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Niramoy Offline Data Viewer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: sans-serif; }
    .tab-active { border-bottom: 2px solid #3b82f6; color: #3b82f6; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #f1f1f1; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col">
  <header class="bg-white border-b border-slate-200 shadow-sm p-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded-xl font-black text-xl shadow-inner">
        N
      </div>
      <div>
        <h1 class="text-xl font-bold text-slate-800">Niramoy Offline Viewer</h1>
        <p class="text-xs text-slate-500 font-medium">Read-Only Backup Viewer</p>
      </div>
    </div>
    <div class="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
      Generated: ${new Date().toLocaleString('en-GB')}
    </div>
  </header>
  
  <div class="flex-1 p-4 md:p-6 max-w-[1600px] mx-auto w-full flex flex-col h-[calc(100vh-80px)]">
    <!-- Tabs -->
    <div class="flex space-x-1 sm:space-x-4 border-b border-slate-200 mb-4 overflow-x-auto shrink-0 pb-1">
      <button onclick="showTab('lab')" id="tab-lab" class="tab-btn tab-active pb-2 px-2 sm:px-4 font-bold text-sm whitespace-nowrap transition-colors">🧪 Lab Invoices</button>
      <button onclick="showTab('sales')" id="tab-sales" class="tab-btn pb-2 px-2 sm:px-4 font-bold text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap transition-colors">💊 Pharmacy Sales</button>
      <button onclick="showTab('purchases')" id="tab-purchases" class="tab-btn pb-2 px-2 sm:px-4 font-bold text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap transition-colors">🛒 Pharmacy Purchases</button>
      <button onclick="showTab('indoor')" id="tab-indoor" class="tab-btn pb-2 px-2 sm:px-4 font-bold text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap transition-colors">🏥 Clinic/Indoor</button>
      <button onclick="showTab('expenses')" id="tab-expenses" class="tab-btn pb-2 px-2 sm:px-4 font-bold text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap transition-colors">💸 Expenses</button>
      <button onclick="showTab('dues')" id="tab-dues" class="tab-btn pb-2 px-2 sm:px-4 font-bold text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap transition-colors">💰 Due Collections</button>
    </div>

    <!-- Content -->
    <div id="content-area" class="bg-white flex-1 rounded-xl shadow-sm border border-slate-200 overflow-auto">
    </div>
  </div>

  <script>
    const appData = ${jsonStr};
    
    function formatDate(d) {
      if (!d) return '-';
      try { 
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); 
      } catch(e) { return d; }
    }

    function renderTable(headers, rows, renderRow) {
      if (!rows || rows.length === 0) {
        return '<div class="text-slate-500 italic p-8 text-center flex flex-col items-center justify-center h-full gap-2"><span class="text-4xl opacity-20">📂</span> No data found in this category</div>';
      }
      
      let html = '<table class="w-full text-left border-collapse whitespace-nowrap text-sm min-w-[800px]">';
      html += '<thead class="bg-slate-50 text-slate-600 sticky top-0 shadow-sm z-10"><tr>';
      headers.forEach(h => html += '<th class="px-4 py-3 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">' + h + '</th>');
      html += '</tr></thead><tbody class="divide-y divide-slate-100">';
      
      rows.forEach((r, idx) => {
        html += '<tr class="hover:bg-blue-50/50 transition-colors ' + (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30') + '">';
        html += renderRow(r);
        html += '</tr>';
      });
      
      html += '</tbody></table>';
      return html;
    }

    function showTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab-active', 'text-blue-600');
        b.classList.add('text-slate-500');
      });
      const activeBtn = document.getElementById('tab-' + tabId);
      if(activeBtn) {
        activeBtn.classList.add('tab-active', 'text-blue-600');
        activeBtn.classList.remove('text-slate-500');
      }

      const content = document.getElementById('content-area');
      
      if (tabId === 'lab') {
        let rows = appData.labInvoices || [];
        rows = rows.sort((a, b) => new Date(b.invoice_date || b.date || 0) - new Date(a.invoice_date || a.date || 0));
        content.innerHTML = renderTable(
          ['ID / Invoice No', 'Date', 'Patient Name', 'Total Bill', 'Paid Amount', 'Due Amount', 'Status'],
          rows,
          r => \`
            <td class="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">\${r.invoice_id || r.id || '-'}</td>
            <td class="px-4 py-2.5 text-slate-600">\${formatDate(r.invoice_date || r.date)}</td>
            <td class="px-4 py-2.5 font-semibold text-slate-800">\${r.patient_name || '-'}</td>
            <td class="px-4 py-2.5 font-bold text-slate-800">৳ \${Number(r.total_amount || 0).toLocaleString()}</td>
            <td class="px-4 py-2.5 font-semibold text-emerald-600">৳ \${Number(r.paid_amount || 0).toLocaleString()}</td>
            <td class="px-4 py-2.5 font-semibold text-rose-500">৳ \${Number(r.due_amount || 0).toLocaleString()}</td>
            <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase \${r.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">\${r.status || '-'}</span></td>
          \`
        );
      } else if (tabId === 'sales') {
        let rows = appData.salesInvoices || [];
        rows = rows.sort((a, b) => new Date(b.invoiceDate || b.invoice_date || 0) - new Date(a.invoiceDate || a.invoice_date || 0));
        content.innerHTML = renderTable(
          ['Invoice No', 'Date', 'Customer Name', 'Total Amount', 'Discount', 'Paid', 'Due'],
          rows,
          r => \`
            <td class="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">\${r.invoiceId || r.invoice_id || r.id || '-'}</td>
            <td class="px-4 py-2.5 text-slate-600">\${formatDate(r.invoiceDate || r.invoice_date || r.date)}</td>
            <td class="px-4 py-2.5 font-semibold text-slate-800">\${r.customerName || r.customer_name || '-'}</td>
            <td class="px-4 py-2.5 font-bold text-slate-800">৳ \${Number(r.totalAmount || r.total_amount || 0).toLocaleString()}</td>
            <td class="px-4 py-2.5 text-slate-500">৳ \${Number(r.discount || 0).toLocaleString()}</td>
            <td class="px-4 py-2.5 font-semibold text-emerald-600">৳ \${Number(r.paidAmount || r.paid_amount || 0).toLocaleString()}</td>
            <td class="px-4 py-2.5 font-semibold text-rose-500">৳ \${Number(r.dueAmount || r.due_amount || 0).toLocaleString()}</td>
          \`
        );
      } else if (tabId === 'purchases') {
        let rows = appData.purchaseInvoices || [];
        rows = rows.sort((a, b) => new Date(b.invoiceDate || b.invoice_date || 0) - new Date(a.invoiceDate || a.invoice_date || 0));
        content.innerHTML = renderTable(
          ['Invoice No', 'Date', 'Supplier / Source', 'Total Bill', 'Paid', 'Due'],
          rows,
          r => \`
            <td class="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">\${r.invoiceId || r.invoice_id || r.id || '-'}</td>
            <td class="px-4 py-2.5 text-slate-600">\${formatDate(r.invoiceDate || r.invoice_date || r.date)}</td>
            <td class="px-4 py-2.5 font-semibold text-slate-800">\${r.source || r.supplier || '-'}</td>
            <td class="px-4 py-2.5 font-bold text-slate-800">৳ \${Number(r.totalAmount || r.total_amount || 0).toLocaleString()}</td>
            <td class="px-4 py-2.5 font-semibold text-emerald-600">৳ \${Number(r.paidAmount || r.paid_amount || 0).toLocaleString()}</td>
            <td class="px-4 py-2.5 font-semibold text-rose-500">৳ \${Number(r.dueAmount || r.due_amount || 0).toLocaleString()}</td>
          \`
        );
      } else if (tabId === 'indoor') {
        let rows = appData.indoorInvoices || [];
        rows = rows.sort((a, b) => new Date(b.invoice_date || b.date || 0) - new Date(a.invoice_date || a.date || 0));
        content.innerHTML = renderTable(
          ['Invoice / Daily ID', 'Date', 'Patient Name', 'Paid Amount'],
          rows,
          r => \`
            <td class="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">\${r.invoice_id || r.id || '-'}</td>
            <td class="px-4 py-2.5 text-slate-600">\${formatDate(r.invoice_date || r.date)}</td>
            <td class="px-4 py-2.5 font-semibold text-slate-800">\${r.patient_name || '-'}</td>
            <td class="px-4 py-2.5 font-semibold text-emerald-600">৳ \${Number(r.paid_amount || 0).toLocaleString()}</td>
          \`
        );
      } else if (tabId === 'expenses') {
        let rows = [];
        if (appData.detailedExpenses) {
           Object.values(appData.detailedExpenses).forEach(list => {
              if (Array.isArray(list)) rows = rows.concat(list);
           });
        }
        rows = rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        content.innerHTML = renderTable(
          ['Date', 'Department', 'Category', 'Description', 'Amount'],
          rows,
          r => \`
            <td class="px-4 py-2.5 text-slate-600">\${formatDate(r.date)}</td>
            <td class="px-4 py-2.5 text-slate-600"><span class="px-2 py-0.5 rounded bg-slate-100 text-xs">\${r.dept || '-'}</span></td>
            <td class="px-4 py-2.5 font-semibold text-slate-800">\${r.category || '-'}</td>
            <td class="px-4 py-2.5 text-slate-600">\${r.description || '-'}</td>
            <td class="px-4 py-2.5 font-bold text-rose-600">৳ \${Number(r.bill_amount || r.billAmount || r.paid_amount || r.paidAmount || 0).toLocaleString()}</td>
          \`
        );
      } else if (tabId === 'dues') {
        let rows = appData.dueCollections || [];
        rows = rows.sort((a, b) => new Date(b.collection_date || b.date || 0) - new Date(a.collection_date || a.date || 0));
        content.innerHTML = renderTable(
          ['Collection ID', 'Date', 'Related Invoice ID', 'Amount Collected'],
          rows,
          r => \`
            <td class="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">\${r.collection_id || r.id || '-'}</td>
            <td class="px-4 py-2.5 text-slate-600">\${formatDate(r.collection_date || r.date)}</td>
            <td class="px-4 py-2.5 font-mono text-xs text-slate-500">\${r.invoice_id || '-'}</td>
            <td class="px-4 py-2.5 font-bold text-emerald-600">৳ \${Number(r.amount_collected || r.amount || 0).toLocaleString()}</td>
          \`
        );
      }
    }

    // Init
    showTab('lab');
  </script>
</body>
</html>`;

  // Trigger Download
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Niramoy_Offline_Viewer_${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
