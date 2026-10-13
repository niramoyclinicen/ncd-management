import React, { useState, useEffect, useMemo } from 'react';
import { LabInvoice, Employee, DueCollection, Patient } from './DiagnosticData';
import SearchableSelect from './SearchableSelect';
import { formatDateTime } from '../utils/dateUtils';

interface Props {
    patients?: Patient[];
    invoices?: LabInvoice[];
    setInvoices?: React.Dispatch<React.SetStateAction<LabInvoice[]>>;
    dueCollections?: DueCollection[];
    setDueCollections?: React.Dispatch<React.SetStateAction<DueCollection[]>>;
    employees?: Employee[];
    onViewInvoice?: (invoiceId: string) => void;
    performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

const monthOptions = [
    { value: "01", name: 'January' }, { value: "02", name: 'February' }, { value: "03", name: 'March' },
    { value: "04", name: 'April' }, { value: "05", name: 'May' }, { value: "06", name: 'June' },
    { value: "07", name: 'July' }, { value: "08", name: 'August' }, { value: "09", name: 'September' },
    { value: "10", name: 'October' }, { value: "11", name: 'November' }, { value: "12", name: 'December' }
];

const PrevDueCollectionPage: React.FC<Props> = ({ 
    patients = [], 
    invoices = [], 
    setInvoices = () => {}, 
    dueCollections = [], 
    setDueCollections = () => {}, 
    employees = [], 
    onViewInvoice, 
    performBlockingSync 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDay, setFilterDay] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterPatientName, setFilterPatientName] = useState('');

    const [selectedInvoice, setSelectedInvoice] = useState<LabInvoice | null>(null);
    const [collectionAmount, setCollectionAmount] = useState<number>(0);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [collectedBy, setCollectedBy] = useState<string>('');
    const [showModal, setShowModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [collectionDateInput, setCollectionDateInput] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    
    const handlePrintList = () => {
        const win = window.open('', '_blank');
        if (!win) return;
        
        let contentHtml = '';
        let theadHtml = '';
        let tfootHtml = '';
        let pageStyle = '@page{size:A4 landscape; margin:10mm}';
        let reportTitle = '';
        
        if (activeTab === 'pending') {
            reportTitle = 'DUE LIST (PENDING)';
            pageStyle = '@page{size:A4 landscape; margin:10mm}';
            
            let totalBillSum = 0;
            let totalDueSum = 0;
            const paymentsSum = new Array(detailedPendingData.maxPayments).fill(0);
            
            let paymentHeaders = '';
            for(let i=0; i<detailedPendingData.maxPayments; i++) {
                paymentHeaders += `<th style="text-align:right">Paid_${String(i+1).padStart(2, '0')}</th>`;
            }
            
            theadHtml = `
                <tr>
                    <th style="text-align:center; width: 40px;">SL</th>
                    <th>Invoice ID</th>
                    <th>Patient Name & Address</th>
                    <th style="text-align:right">Total (After Discount)</th>
                    ${paymentHeaders}
                    <th style="text-align:right">Due</th>
                </tr>
            `;
            
            contentHtml = detailedPendingData.items.map((inv, index) => {
                const netPayable = Number(inv.total_amount || 0) - Number(inv.discount_amount || 0);
                totalBillSum += netPayable;
                totalDueSum += Number(inv.due_amount || 0);
                
                let paymentCols = '';
                for(let i=0; i<detailedPendingData.maxPayments; i++) {
                    const p = inv.payments[i];
                    if (p) {
                        paymentsSum[i] += Number(p.amount || 0);
                        paymentCols += `<td style="text-align:right; white-space:nowrap;">${p.date}<br/><b>৳${Number(p.amount || 0).toFixed(2)}</b></td>`;
                    } else {
                        paymentCols += `<td></td>`;
                    }
                }
                
                const discountText = Number(inv.discount_amount || 0) > 0 ? `<br/><span style="font-size:10px; color:#555;">(Disc: ৳${Number(inv.discount_amount || 0).toFixed(2)})</span>` : '';
                const patientInfo = inv.addressStr ? `<b>${inv.patient_name}</b><br/><span style="font-size:11px; color:#444;">${inv.addressStr}</span>` : `<b>${inv.patient_name}</b>`;
                
                return `
                    <tr>
                        <td style="text-align:center">${index + 1}</td>
                        <td style="white-space:nowrap">${inv.invoice_id}</td>
                        <td>${patientInfo}</td>
                        <td style="text-align:right; font-weight:bold;">৳${Number(netPayable).toFixed(2)}${discountText}</td>
                        ${paymentCols}
                        <td style="text-align:right; font-weight:bold; color:red;">৳${Number(inv.due_amount || 0).toFixed(2)}</td>
                    </tr>
                `;
            }).join('');
            
            let paymentFooters = '';
            for(let i=0; i<detailedPendingData.maxPayments; i++) {
                paymentFooters += `<td style="text-align:right; font-weight:bold;">৳${Number(paymentsSum[i] || 0).toFixed(2)}</td>`;
            }
            
            tfootHtml = `
                <tr>
                    <td colspan="3" style="text-align:right; font-weight:bold;">Total:</td>
                    <td style="text-align:right; font-weight:bold;">৳${Number(totalBillSum || 0).toFixed(2)}</td>
                    ${paymentFooters}
                    <td style="text-align:right; font-weight:bold; font-size:16px; color:red;">৳${Number(totalDueSum || 0).toFixed(2)}</td>
                </tr>
            `;
        } else if (activeTab === 'history') {
            reportTitle = 'DUE COLLECTION HISTORY';
            pageStyle = '@page{size:A4 landscape; margin:10mm}';
            let sumBill = 0;
            let sumCollected = 0;
            let sumRemainingDue = 0;
            theadHtml = `
                <tr>
                    <th style="text-align:center; width: 40px;">SL</th>
                    <th>Invoice Date</th>
                    <th>Invoice ID</th>
                    <th>Patient Name</th>
                    <th style="text-align:right">Total Bill</th>
                    <th>Collection Date</th>
                    <th style="text-align:right">Collected Amount</th>
                    <th style="text-align:right">Remaining Due</th>
                </tr>
            `;
            contentHtml = filteredHistory.map((dc, index) => {
                const inv = invoices.find(i => i && i.invoice_id === dc.invoice_id);
                const invDate = inv?.invoice_date || '';
                const totalBill = Number(inv?.total_amount || 0);
                const remainingDue = Number(inv?.due_amount || 0);
                
                sumBill += totalBill;
                sumCollected += Number(dc.amount_collected || 0);
                sumRemainingDue += remainingDue;
                
                return `
                    <tr>
                        <td style="text-align:center">${index + 1}</td>
                        <td style="white-space:nowrap">${invDate}</td>
                        <td style="white-space:nowrap">${dc.invoice_id}</td>
                        <td>${inv ? inv.patient_name : 'Unknown'}</td>
                        <td style="text-align:right">৳${Number(totalBill).toFixed(2)}</td>
                        <td style="white-space:nowrap">${dc.collection_date}</td>
                        <td style="text-align:right; font-weight:bold; color:green;">৳${Number(dc.amount_collected || 0).toFixed(2)}</td>
                        <td style="text-align:right; font-weight:bold; color:red;">৳${Number(remainingDue).toFixed(2)}</td>
                    </tr>
                `;
            }).join('');
            tfootHtml = `
                <tr>
                    <td colspan="4" style="text-align:right; font-weight:bold;">Total:</td>
                    <td style="text-align:right; font-weight:bold;">৳${Number(sumBill).toFixed(2)}</td>
                    <td></td>
                    <td style="text-align:right; font-weight:bold; color:green; font-size:16px;">৳${Number(sumCollected).toFixed(2)}</td>
                    <td style="text-align:right; font-weight:bold; color:red; font-size:16px;">৳${Number(sumRemainingDue).toFixed(2)}</td>
                </tr>
            `;
        }
        
        const html = `<html><head>
            <style>
                ${pageStyle}
                body{font-family:sans-serif;} 
                .box{padding:15px;} 
                .h1{font-size:24px; font-weight:bold; margin:0; text-align:center;} 
                .text-center{text-align:center;}
                table{width:100%; border-collapse:collapse; margin-top: 20px; font-size:14px;} 
                td, th{padding:6px 8px; text-align:left; border: 1px solid #000;}
                th { background-color: #eee; }
            </style>
        </head><body><div class="box">
            <div class="h1">Niramoy Clinic & Diagnostic</div>
            <p class="text-center">Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
            <hr>
            <h3 class="text-center">${reportTitle}</h3>
            
            <table>
                <thead>
                    ${theadHtml}
                </thead>
                <tbody>
                    ${contentHtml}
                    ${tfootHtml}
                </tbody>
            </table>
            
            <div style="margin-top:40px; text-align:right">
                <b>Printed By:</b> ${collectedBy || ''} <br><br>
                ..........................
            </div>
        </div>
        <script>
            window.onload = function() {
                setTimeout(function() { window.print(); }, 300);
            }
        </script>
        </body></html>`;
        
        win.document.write(html); 
        win.document.close(); 
    };

    const filteredInvoices = (() => {

        if (!Array.isArray(invoices)) return [];
        return invoices.filter(inv => {
            if (!inv || inv.due_amount <= 0.5) return false;
            
            const invDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
            const day = invDate ? String(invDate.getDate()).padStart(2, '0') : '';
            const month = invDate ? String(invDate.getMonth() + 1).padStart(2, '0') : '';
            const year = invDate ? String(invDate.getFullYear()) : '';

            const matchesDay = !filterDay || day === filterDay.padStart(2, '0');
            const matchesMonth = !filterMonth || month === filterMonth;
            const matchesYear = !filterYear || year === filterYear;
            const matchesPatient = !filterPatientName || (inv.patient_name || '').toLowerCase().includes(filterPatientName.toLowerCase());
            const matchesSearch = !searchTerm || 
                (inv.invoice_id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                (inv.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase());

            return matchesDay && matchesMonth && matchesYear && matchesPatient && matchesSearch;
        });
    })();

    const detailedPendingData = React.useMemo(() => {
        const safeDcs = Array.isArray(dueCollections) ? dueCollections : [];
        const safePatients = Array.isArray(patients) ? patients : [];
        const items = filteredInvoices.map(inv => {
            const dcs = safeDcs.filter(dc => dc && dc.invoice_id === inv.invoice_id).sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime());
            const sumDcs = dcs.reduce((sum, dc) => sum + (dc.amount_collected || 0), 0);
            
            const payments: { date: string; amount: number }[] = [];
            const initialPaid = (inv.paid_amount || 0) - sumDcs;
            if (initialPaid > 0) {
                payments.push({ date: inv.invoice_date?.split(' ')[0] || '', amount: initialPaid });
            }
            dcs.forEach(dc => {
                if (dc && dc.amount_collected > 0) {
                    payments.push({ date: dc.collection_date?.split(' ')[0] || '', amount: dc.amount_collected });
                }
            });

            const patientObj = safePatients.find(p => p && p.pt_id === inv.patient_id);
            const addressParts = patientObj ? [patientObj.address, patientObj.thana, patientObj.district].filter(Boolean).join(', ') : '';

            return {
                ...inv,
                payments,
                addressStr: addressParts
            };
        });
        const maxPayments = items.reduce((max, it) => Math.max(max, it.payments.length), 0);
        return { items, maxPayments };
    }, [filteredInvoices, dueCollections, patients]);

const filteredHistory = (() => {
        const safeDcs = Array.isArray(dueCollections) ? dueCollections : [];
        const safeInvs = Array.isArray(invoices) ? invoices : [];
        return safeDcs
            .filter(dc => dc && dc.invoice_id && dc.invoice_id.startsWith('INV'))
            .sort((a, b) => new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime())
            .filter(dc => {
                const inv = safeInvs.find(i => i && i.invoice_id === dc.invoice_id);
                const matchName = filterPatientName ? ((inv?.patient_name || '').toLowerCase().includes(filterPatientName.toLowerCase())) : true;
                const matchId = searchTerm ? (dc.invoice_id || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
                const [y, m, d] = (dc.collection_date || '').split(' ')[0].split('-');
                const matchY = filterYear ? y === filterYear : true;
                const matchM = filterMonth ? parseInt(m) === parseInt(filterMonth) : true;
                const matchD = filterDay ? parseInt(d) === parseInt(filterDay) : true;
                return matchName && matchId && matchY && matchM && matchD;
            });
    })();


    const handlePrintReceipt = (invoice: LabInvoice, collectedAmt: number, colDate: string) => {
        const win = window.open('', '_blank');
        if (!win) return;
        const styles = `<style>
            @page{size:A5 landscape; margin:10mm} 
            body{font-family:sans-serif;} 
            .box{border:2px solid #000; padding:15px; border-radius:10px} 
            .h1{font-size:20px; font-weight:bold; margin:0; text-align:center;} 
            .text-center{text-align:center;}
            table{width:100%; border-collapse:collapse} 
            td, th{padding:5px; text-align:left}
            .test-table{margin-top: 15px;}
            .test-table th, .test-table td{border: 1px solid #000;}
            .summary-table td{padding: 2px 5px;}
        </style>`;
        
        const itemsHtml = (invoice.items || []).map((it: any) => 
            `<tr>
                <td>${it.test_name}</td>
                <td style="text-align:center">${it.quantity}</td>
                <td style="text-align:right">৳${Number(it.price * it.quantity).toFixed(2)}</td>
            </tr>`
        ).join('');

        const html = `<html><head>${styles}</head><body><div class="box">
            <div class="h1">Niramoy Clinic & Diagnostic</div>
            <p class="text-center">Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
            <hr>
            <h3 class="text-center">DUE PAYMENT RECEIPT & INVOICE DETAILS</h3>
            <table>
                <tr><td><b>Patient Name:</b> ${invoice.patient_name}</td><td><b>Date:</b> ${new Date(colDate).toLocaleDateString()}</td></tr>
                <tr><td><b>Invoice ID:</b> ${invoice.invoice_id}</td><td><b>Receipt No:</b> DC-${new Date().getTime().toString().slice(-5)}</td></tr>
                <tr><td><b>Ref by:</b> ${invoice.doctor_name || ''}</td><td></td></tr>
            </table>
            
            <table class="test-table">
                <thead>
                    <tr style="background:#eee;">
                        <th>Test Name</th>
                        <th style="text-align:center">Qty</th>
                        <th style="text-align:right">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <table class="summary-table" style="width: 280px; float: right; margin-top: 15px;">
                <tr><td><b>Total Amount:</b></td><td style="text-align:right">৳${Number(invoice.total_amount || 0).toFixed(2)}</td></tr>
                <tr><td><b>Discount:</b></td><td style="text-align:right">৳${Number(invoice.discount_amount || 0).toFixed(2)}</td></tr>
                <tr><td><b>Net Payable:</b></td><td style="text-align:right">৳${((invoice.total_amount || 0) - (invoice.discount_amount || 0)).toFixed(2)}</td></tr>
                <tr><td><b>Previously Paid:</b></td><td style="text-align:right">৳${Number(invoice.paid_amount || 0).toFixed(2)}</td></tr>
                <tr><td><b>Current Payment:</b></td><td style="text-align:right; font-size:16px; font-weight:bold">৳${collectedAmt.toFixed(2)}</td></tr>
                <tr><td><b>Remaining Due:</b></td><td style="text-align:right; color:red; font-weight:bold;">৳${Number(invoice.due_amount - collectedAmt).toFixed(2)}</td></tr>
            </table>
            <div style="clear: both;"></div>
            <div style="margin-top:40px; display: flex; justify-content: space-between;">
                <div><b>Prepared By:</b> ${collectedBy || ''}</div>
                <div style="text-align:right"><b>Authorized Sign</b><br>..........................</div>
            </div>
        </div></body></html>`;
        win.document.write(html); 
        win.document.close(); 
        
        // Timeout to let resources load before printing
        win.setTimeout(() => {
            win.print();
        }, 300);
    };

    const handleConfirmCollection = async () => {
        if (!selectedInvoice || collectionAmount < 0 || discountAmount < 0 || (collectionAmount === 0 && discountAmount === 0) || (collectionAmount + discountAmount) > selectedInvoice.due_amount + 0.1) {
            alert("ভুল অ্যামাউন্ট!"); return;
        }
        
        // Append current time to the selected date string
        const d = new Date();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const collectionDate = `${collectionDateInput} ${hours}:${minutes}:${seconds}`;

        const newCols = [...dueCollections];
        if (collectionAmount > 0) {
            newCols.push({ collection_id: `DC-${new Date().getTime()}`, invoice_id: selectedInvoice.invoice_id, collection_date: collectionDate, amount_collected: collectionAmount, collected_by: collectedBy, payment_method: 'Cash' });
        }
        
        const updatedInvoice: LabInvoice = { 
            ...selectedInvoice, 
            paid_amount: selectedInvoice.paid_amount + collectionAmount, 
            discount_amount: (selectedInvoice.discount_amount || 0) + discountAmount,
            due_amount: selectedInvoice.due_amount - (collectionAmount + discountAmount), 
            status: (selectedInvoice.due_amount - (collectionAmount + discountAmount)) <= 0.5 ? 'Paid' : 'Due', 
            last_modified: collectionDate 
        };
        const newInvs = invoices.map(inv => inv.invoice_id === updatedInvoice.invoice_id ? updatedInvoice : inv);

        if (performBlockingSync) {
            const success = await performBlockingSync({ dueCollections: newCols, labInvoices: newInvs });
            if (success) {
                setDueCollections(newCols);
                setInvoices(newInvs);
                handlePrintReceipt(selectedInvoice, collectionAmount, collectionDate);
                setSuccessMessage('ডাটা সঠিকভাবে সেভ হয়েছে!');
                setShowModal(false); setSelectedInvoice(null);
            }
        } else {
            setDueCollections(newCols);
            setInvoices(newInvs);
            handlePrintReceipt(selectedInvoice, collectionAmount, collectionDate);
            setSuccessMessage(`সফলভাবে ${collectionAmount} টাকা আদায় হয়েছে।`);
            setShowModal(false); setSelectedInvoice(null);
        }
    };

    const totalDueAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.due_amount || 0), 0);

    return (
        <div className="bg-slate-900 text-slate-200 rounded-xl p-6 space-y-6">
            {successMessage && <div className="fixed top-20 right-5 bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded-lg z-50 animate-bounce">{successMessage}</div>}
            <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-700 pb-4 gap-4">
                <div className="flex gap-4 items-center">
                    <h2 
                        className={`text-2xl font-bold cursor-pointer transition-colors ${activeTab === 'pending' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Due Recovery
                    </h2>
                    <h2 
                        className={`text-2xl font-bold cursor-pointer transition-colors ${activeTab === 'history' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Collection History
                    </h2>
                    {activeTab === 'pending' && (
                        <div className="ml-4 bg-red-900/30 border border-red-800 text-red-400 px-4 py-1.5 rounded-lg">
                            <span className="text-sm font-bold uppercase mr-2">Total Due:</span>
                            <span className="text-xl font-black">৳{totalDueAmount.toFixed(2)}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-wrap items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                    <div className="w-32">
                        <input 
                            type="text" 
                            placeholder="Patient Name..." 
                            value={filterPatientName} 
                            onChange={(e) => setFilterPatientName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="w-20">
                        <input 
                            type="number" 
                            placeholder="Day" 
                            value={filterDay} 
                            onChange={(e) => setFilterDay(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                            min="1" max="31"
                        />
                    </div>
                    <div className="w-32">
                        <select 
                            value={filterMonth} 
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                        >
                            <option value="">Month...</option>
                            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="w-24">
                        <select 
                            value={filterYear} 
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                        >
                            <option value="">Year...</option>
                            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Search ID..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500" 
                        />
                        <button onClick={handlePrintList} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-colors shadow-lg whitespace-nowrap">
                            Print List
                        </button>
                    </div>
                </div>
            </div>
            {activeTab === 'pending' && (
            <div className="overflow-x-auto rounded-lg border border-slate-700 shadow-xl bg-slate-900">
                <table className="w-full text-left">
                    {(() => {
                        let totalBillSum = 0;
                        let totalDueSum = 0;
                        const paymentsSum = new Array(detailedPendingData.maxPayments).fill(0);
                        
                        return (
                            <>
                                <thead className="bg-slate-800 text-sky-200 text-xs uppercase font-bold tracking-wider border-b border-slate-700">
                                    <tr>
                                        <th className="p-4 w-12 text-center">SL</th>
                                        <th className="p-4">Invoice ID</th>
                                        <th className="p-4">Patient Name & Address</th>
                                        <th className="p-4 text-right whitespace-nowrap">Total <br/><span className="text-[10px] font-medium text-slate-300">(After Disc)</span></th>
                                        {Array.from({length: detailedPendingData.maxPayments}).map((_, i) => (
                                            <th key={i} className="p-4 text-right">Paid_{String(i+1).padStart(2, '0')}</th>
                                        ))}
                                        <th className="p-4 text-right text-rose-300">Due</th>
                                        <th className="p-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {detailedPendingData.items.map((inv, index) => {
                                        const netPayable = (inv.total_amount || 0) - (inv.discount_amount || 0);
                                        totalBillSum += netPayable;
                                        totalDueSum += (inv.due_amount || 0);
                                        
                                        return (
                                            <tr 
                                                key={inv.invoice_id} 
                                                onDoubleClick={() => onViewInvoice && onViewInvoice(inv.invoice_id)}
                                                className="hover:bg-slate-800/80 even:bg-slate-900/70 odd:bg-slate-850/40 transition-colors cursor-pointer group"
                                                title="Double click to view invoice details"
                                            >
                                                <td className="p-4 text-center font-bold text-slate-300">{index + 1}</td>
                                                <td className="p-4 font-mono text-sky-300 font-bold whitespace-nowrap">{inv.invoice_id}</td>
                                                <td className="p-4">
                                                    <div className="font-bold text-white">{inv.patient_name}</div>
                                                    {inv.addressStr && <div className="text-xs text-slate-300 font-medium mt-0.5">{inv.addressStr}</div>}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="font-bold text-white">৳{netPayable.toFixed(2)}</div>
                                                    {inv.discount_amount > 0 && <div className="text-xs text-amber-300 font-medium">(Disc: ৳{inv.discount_amount.toFixed(2)})</div>}
                                                </td>
                                                {Array.from({length: detailedPendingData.maxPayments}).map((_, i) => {
                                                    const p = inv.payments[i];
                                                    if (p) {
                                                        paymentsSum[i] += p.amount;
                                                        return (
                                                            <td key={i} className="p-4 text-right">
                                                                <div className="text-xs text-slate-300 mb-0.5 whitespace-nowrap font-medium">{p.date}</div>
                                                                <div className="font-bold text-emerald-400">৳{p.amount.toFixed(2)}</div>
                                                            </td>
                                                        );
                                                    }
                                                    return <td key={i} className="p-4 text-right"></td>;
                                                })}
                                                <td className="p-4 text-right text-rose-400 font-black">৳{Number(inv.due_amount || 0).toFixed(2)}</td>
                                                <td className="p-4 text-center">
                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); setShowModal(true); setCollectionAmount(0); setDiscountAmount(0); }} className="bg-emerald-600 px-4 py-1.5 rounded-md text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20">Collect</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {detailedPendingData.items.length > 0 && (
                                        <tr className="bg-slate-800 border-t-2 border-slate-600 font-bold uppercase text-xs">
                                            <td colSpan={3} className="p-4 text-right text-slate-200">Total:</td>
                                            <td className="p-4 text-right text-white font-bold">৳{totalBillSum.toFixed(2)}</td>
                                            {Array.from({length: detailedPendingData.maxPayments}).map((_, i) => (
                                                <td key={i} className="p-4 text-right text-emerald-300 font-bold">৳{paymentsSum[i].toFixed(2)}</td>
                                            ))}
                                            <td className="p-4 text-right text-rose-300 font-black text-sm">৳{totalDueSum.toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                    )}
                                </tbody>
                            </>
                        );
                    })()}
                </table>
            </div>
            )}
            
            {activeTab === 'history' && (
            <div className="overflow-x-auto rounded-lg border border-slate-700 shadow-xl bg-slate-900">
                <table className="w-full text-left">
                    <thead className="bg-slate-800 text-sky-200 text-xs uppercase font-bold tracking-wider border-b border-slate-700">
                        <tr>
                            <th className="p-4 w-12 text-center">SL</th>
                            <th className="p-4">Collection Date</th>
                            <th className="p-4">Invoice ID</th>
                            <th className="p-4">Patient Name</th>
                            <th className="p-4">Collected By</th>
                            <th className="p-4 text-right text-emerald-300">Amount Collected</th>
                            <th className="p-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredHistory
                            .slice(0, 100) // limit to 100 recent for performance
                            .map((dc, index) => {
                                const inv = invoices.find(i => i.invoice_id === dc.invoice_id);
                                return (
                                <tr 
                                    key={dc.collection_id}
                                    className="hover:bg-slate-800/80 even:bg-slate-900/70 odd:bg-slate-850/40 transition-colors"
                                >
                                    <td className="p-4 text-center font-bold text-slate-300">{index + 1}</td>
                                    <td className="p-4 text-sm text-slate-200 font-medium">{dc.collection_date}</td>
                                    <td className="p-4 font-mono text-sky-300 font-bold">{dc.invoice_id}</td>
                                    <td className="p-4 font-bold text-white">{inv ? inv.patient_name : 'Unknown'}</td>
                                    <td className="p-4 text-sm text-slate-200 font-medium">{dc.collected_by}</td>
                                    <td className="p-4 text-right text-emerald-400 font-black">৳{Number(dc.amount_collected || 0).toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => inv && handlePrintReceipt(inv, dc.amount_collected, dc.collection_date)} 
                                            className="bg-indigo-600 px-4 py-1.5 rounded-md text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
                                            disabled={!inv}
                                        >
                                            Print Receipt
                                        </button>
                                    </td>
                                </tr>
                            )})}
                    </tbody>
                </table>
            </div>
            )}

            {showModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">বকেয়া টাকা আদায়</h3>
                        <div className="bg-slate-900 p-4 rounded mb-6 flex justify-between items-center"><span className="text-slate-400">Current Due:</span><span className="text-red-400 text-2xl font-black">৳{Number(selectedInvoice.due_amount || 0).toFixed(2)}</span></div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-black">Date</label>
                                <input 
                                    type="date" 
                                    value={collectionDateInput} 
                                    onChange={e => setCollectionDateInput(e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded text-white font-bold" 
                                />
                            </div>
                            <div><label className="text-xs text-slate-500 uppercase font-black">Amount to Pay (৳)</label><input type="number" value={collectionAmount === 0 ? '' : collectionAmount} onChange={e => setCollectionAmount(e.target.value ? parseFloat(e.target.value) : 0)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded text-white text-xl font-bold" autoFocus /></div>
                            <div><label className="text-xs text-slate-500 uppercase font-black">Waive/Discount (মওকুফ) (৳)</label><input type="number" value={discountAmount === 0 ? '' : discountAmount} onChange={e => setDiscountAmount(e.target.value ? parseFloat(e.target.value) : 0)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded text-white text-xl font-bold" /></div>
                            <SearchableSelect 
                                label="Collected By" 
                                theme="dark" 
                                options={(() => {
                                    const safeEmps = Array.isArray(employees) ? employees : [];
                                    const filtered = safeEmps.filter(e => e && e.status !== 'Released');
                                    const list = filtered.length > 0 ? filtered : safeEmps;
                                    const opts = list.map(e => ({
                                        id: e.emp_name, 
                                        name: e.emp_name,
                                        details: [e.job_position || e.designation, e.department, e.mobile ? `📞 ${e.mobile}` : ''].filter(Boolean).join(' | ')
                                    }));
                                    if (!opts.some(o => o.name === 'Admin')) {
                                        opts.unshift({ id: 'Admin', name: 'Admin', details: 'System Administrator' });
                                    }
                                    return opts;
                                })()} 
                                value={collectedBy} 
                                onChange={(id, name)=>setCollectedBy(name)} 
                                allowCustom={true}
                                placeholder="Select or search employee"
                            />
                        </div>
                        <div className="mt-8 flex gap-3"><button onClick={() => setShowModal(false)} className="flex-1 py-2 bg-slate-700 rounded">বাতিল</button><button onClick={handleConfirmCollection} className="flex-1 py-2 bg-green-600 font-bold rounded">Confirm & Print</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrevDueCollectionPage;