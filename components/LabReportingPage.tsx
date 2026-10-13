
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LabInvoice as Invoice, Patient, Employee, Doctor, Test, LabReport } from './DiagnosticData'; 
import UltrasonographyReportEditor from './UltrasonographyReportEditor';
import UrineRMEInputPage from './UrineRMEInputPage';
import CBCInputPage from './CBCInputPage';
import SemenAnalysisInputPage from './SemenAnalysisInputPage';
import LipidProfileInputPage from './LipidProfileInputPage';
import TemplateManagementPage from './TemplateManagementPage';
import { RichTextEditor, RichTextToolbar } from './RichTextEditor';
import SearchableSelect from './SearchableSelect';
import { SettingsIcon, Activity, SaveIcon, PrinterIcon } from './Icons';

// Use fixed license constant
const DIAGNOSTIC_LICENSE = 'HSM41671';

// --- STABLE SUB-COMPONENTS ---

const MasterPadHeader = ({ logo, setLogo }: any) => {
    const handleLogoUpload = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const b64 = ev.target?.result as string;
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 150;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                    } else {
                        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const resizedB64 = canvas.toDataURL('image/jpeg', 0.8);
                    setLogo(resizedB64);
                };
                img.src = b64;
            };
            reader.readAsDataURL(file);
        }
    };
    return (
    <div className="header p-8 border-b-2 border-slate-950 flex justify-between items-start shrink-0 mb-6 group/header">
        <div className="flex gap-4">
            <div className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative border border-transparent hover:border-dashed hover:border-slate-400 transition-all cursor-pointer group no-print">
                <input type="file" accept="image/png, image/jpeg" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleLogoUpload} title="Change Logo" />
                {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
                )}
                {!logo && <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-400 hidden absolute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-[8px] font-bold text-center leading-none">Upload<br/>Logo</div>
            </div>
            
            <div className="w-20 h-20 rounded-xl items-center justify-center overflow-hidden shrink-0 hidden print:flex">
                {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
                )}
                {!logo && <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-400 hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
            </div>

            <div className="flex flex-col justify-center">
                <h1 className="text-2xl font-black text-blue-900 leading-tight uppercase tracking-tighter">Niramoy Clinic & Diagnostic</h1>
                <p className="text-[10px] font-bold text-slate-700">Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
                <p className="text-[8px] text-slate-500 mt-0.5 uppercase tracking-widest font-sans font-bold">Govt. Reg No: {DIAGNOSTIC_LICENSE} | Open 24/7</p>
            </div>
        </div>
        <div className="text-right flex items-center">
            <h2 className="text-sm font-black text-white bg-slate-900 px-4 py-1.5 rounded-lg inline-block uppercase tracking-tighter shadow-md">Lab Report</h2>
        </div>
    </div>
);
};

const ReportHeader = ({ patient, currentInvoice, doctors }: { patient: any, currentInvoice: any, doctors: any[] }) => {
    const regNo = currentInvoice?.invoice_id?.split('-').pop() + '/' + (currentInvoice?.invoice_date.substring(2,4) || '25');
    const docObj = doctors.find((d: Doctor) => d.doctor_id === currentInvoice?.doctor_id);
    const doctorFullInfo = (currentInvoice?.doctor_name || 'Self') + (docObj?.degree ? ', ' + docObj.degree : '');
    
    return (
        <div className="mb-6 shrink-0 text-black">
            <table className="w-full border-collapse border border-black text-[10px]">
                <tbody>
                    <tr className="h-7">
                        <td className="border border-black px-2 py-0.5 font-bold whitespace-nowrap" style={{ width: '80px' }}>Pt. Name :</td>
                        <td className="border border-black px-2 py-0.5 font-bold uppercase" style={{ width: 'auto' }}>
                            {patient?.pt_name} / {patient?.ageY}Y
                        </td>
                        <td className="border border-black px-2 py-0.5 font-bold whitespace-nowrap" style={{ width: '40px' }}>Sex :</td>
                        <td className="border border-black px-2 py-0.5 font-normal" style={{ width: '50px' }}>{patient?.gender || 'N/A'}</td>
                        <td className="border border-black px-2 py-0.5 font-bold whitespace-nowrap" style={{ width: '60px' }}>Reg.No :</td>
                        <td className="border border-black px-2 py-0.5 font-bold text-blue-800" style={{ width: '80px' }}>{regNo}</td>
                        <td className="border border-black px-2 py-0.5 font-bold whitespace-nowrap" style={{ width: '40px' }}>Date :</td>
                        <td className="border border-black px-2 py-0.5 font-normal" style={{ width: '80px' }}>{currentInvoice?.invoice_date}</td>
                    </tr>
                    <tr className="h-8">
                        <td className="border border-black px-2 py-0.5 font-bold whitespace-nowrap" style={{ width: '80px' }}>Refd By Dr. :</td>
                        <td colSpan={3} className="border border-black px-2 py-0.5 font-bold text-[9px]" style={{ width: 'auto' }}>{doctorFullInfo}</td>
                        <td className="border border-black px-2 py-0.5 font-bold whitespace-nowrap" style={{ width: '60px' }}>B_Code :</td>
                        <td colSpan={3} className="border border-black p-0.5 bg-white">
                            <div className="flex items-center justify-center w-full">
                                <img src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(patient?.pt_id || '')}&scale=1&height=5&incltext=false`} alt="BC" className="h-4" />
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>



        </div>
    );
};

const Signatures = ({ customTechName, customTechDegree, customDocName, customDocDegree, techLabel = "Lab Technologist", docLabel = "Pathologist / Reporter" }: any) => (


    <div className="footer-sign-container no-break-inside">
        <div className="text-center w-64">
            <p className="text-[12px] font-black uppercase text-black mb-1">{techLabel}</p>
            <div className="h-16 w-full"></div>
            <div className="border-t-2 border-black w-full mb-1"></div>
            <p className="text-[12px] font-black uppercase text-black" style={{ color: '#000000 !important' }}>{customTechName}</p>
            <p className="text-[10px] font-bold text-black whitespace-pre-wrap" style={{ color: '#000000 !important' }}>{customTechDegree}</p>
        </div>
        <div className="text-center w-64">
            <p className="text-[12px] font-black uppercase text-black mb-1">{docLabel}</p>
            <div className="h-16 w-full"></div>
            <div className="border-t-2 border-black w-full mb-1"></div>
            <p className="text-[12px] font-black uppercase text-black" style={{ color: '#000000 !important' }}>{customDocName}</p>
            <p className="text-[10px] font-bold text-black whitespace-pre-wrap" style={{ color: '#000000 !important' }}>{customDocDegree}</p>
        </div>
    </div>
);

const isOutOfRange = (valStr: string, rangeStr: string): boolean => {
    if (!valStr || !rangeStr) return false;
    const val = parseFloat(valStr);
    if (isNaN(val)) {
        if (rangeStr.toLowerCase().includes('non-reactive') && valStr.toLowerCase().includes('reactive')) return true;
        if (rangeStr.toLowerCase().includes('nil') && !['nil', 'negative', 'normal'].includes(valStr.toLowerCase())) return true;
        return false;
    }
    const dashMatch = rangeStr.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (dashMatch) {
        const min = parseFloat(dashMatch[1]); const max = parseFloat(dashMatch[2]);
        return val < min || val > max;
    }
    return false;
};

// --- MAIN COMPONENT ---

const LabReportingPage: React.FC<any> = ({ invoices, setInvoices, reports, setReports, rtTemplates: _rtTemplates, setRtTemplates, diagnosticSettings, setDiagnosticSettings, patients, employees, tests, doctors, performBlockingSync }) => {
    const rtTemplates = Array.isArray(_rtTemplates) ? _rtTemplates : [];
    const handleSetLogo = (newLogo: string) => { setDiagnosticSettings({ ...diagnosticSettings, clinicLogo: newLogo }); if(performBlockingSync) performBlockingSync({ diagnosticSettings: { ...diagnosticSettings, clinicLogo: newLogo } }); };
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [activeTestName, setActiveTestName] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [viewMode, setViewMode] = useState<'reporting' | 'template_mgmt'>('reporting');
    const [selectedTechnologistId, setSelectedTechnologistId] = useState<string>('');
    const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');
    const [currentReportData, setCurrentReportData] = useState<any>(null);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [showInsertTemplateModal, setShowInsertTemplateModal] = useState(false);
    const [templateSaveName, setTemplateSaveName] = useState('');
    const [templateSaveCategory, setTemplateSaveCategory] = useState('');
    const [templateSaveSubCategory, setTemplateSaveSubCategory] = useState('');
    
    const [insertTemplateCategoryFilter, setInsertTemplateCategoryFilter] = useState('All');
    const [insertTemplateSubCategoryFilter, setInsertTemplateSubCategoryFilter] = useState('All');
    const [insertTemplateSearchTerm, setInsertTemplateSearchTerm] = useState('');
    
    
    
    
    const [customTechName, setCustomTechName] = useState('');
    const [customTechDegree, setCustomTechDegree] = useState('');
    const [customDocName, setCustomDocName] = useState('');
    const [customDocDegree, setCustomDocDegree] = useState('');

    const [printFullPad, setPrintFullPad] = useState<boolean>(true); 

    const handleSelectInvoice = (id: string) => {
        setSelectedInvoiceId(id);
        setActiveTestName(null);
        setCurrentReportData(null);
    };

    const handleSelectTest = (tName: string) => {
        setActiveTestName(tName);
        
        const activeTestDef = tests.find((t: any) => t.test_name === tName);
        const activeCategory = activeTestDef?.category || 'General';
        
        const groupTests = currentInvoice ? currentInvoice.items.map((it: any) => it.test_name).filter((groupTName: string) => {
            const def = tests.find((t: any) => t.test_name === groupTName);
            const cat = def?.category || 'General';
            return cat === activeCategory;
        }) : [tName];
        
        let mergedData: any = {};
        let foundAny = false;
        let lastTech = '', lastDoc = '';
        
        groupTests.forEach(gName => {
            const saved = reports.find((r: LabReport) => r.invoice_id === selectedInvoiceId && r.test_name === gName);
            if (saved) {
                if (typeof saved.data === 'string') {
                    mergedData = saved.data;
                } else if (typeof mergedData === 'object' && mergedData !== null) {
                    mergedData = { ...mergedData, ...saved.data };
                }
                foundAny = true;
                if (saved?.technologistId) lastTech = saved?.technologistId;
                if (saved?.consultantId) lastDoc = saved?.consultantId;
            }
        });

        if (foundAny) {
            setCurrentReportData(mergedData);
            setSelectedTechnologistId(lastTech);
            setSelectedConsultantId(lastDoc);
            
            const saved = reports.find((r: LabReport) => r.invoice_id === selectedInvoiceId && r.test_name === tName) || reports.find((r: LabReport) => r.invoice_id === selectedInvoiceId && groupTests.includes(r.test_name));
            
            setSelectedTechnologistId(saved?.technologistId || '');
            setSelectedConsultantId(saved?.consultantId || '');
            
            const tech = employees.find((e: any) => e.emp_id === saved?.technologistId);
            if (tech) {
                setCustomTechName(tech.emp_name);
                setCustomTechDegree(tech.degree || 'Medical Technologist');
            }
            const doc = doctors.find((d: any) => d.doctor_id === saved?.consultantId);
            if (doc) {
                setCustomDocName(doc.doctor_name);
                setCustomDocDegree(doc.degree);
            }
        } else {
            setCurrentReportData(null);
            
            // Auto-fill from last selected in localStorage
            const lastTechId = localStorage.getItem('last_tech_id');
            const lastDocId = localStorage.getItem('last_doc_id');
            
            if (lastTechId) {
                setSelectedTechnologistId(lastTechId);
                const tech = employees.find((e: any) => e.emp_id === lastTechId);
                if (tech) {
                    setCustomTechName(tech.emp_name);
                    setCustomTechDegree(tech.degree || 'Medical Technologist');
                }
            }
            if (lastDocId) {
                setSelectedConsultantId(lastDocId);
                const doc = doctors.find((d: any) => d.doctor_id === lastDocId);
                if (doc) {
                    setCustomDocName(doc.doctor_name);
                    setCustomDocDegree(doc.degree);
                }
            }
        }
    };
    const currentInvoice = useMemo(() => {
        if (!Array.isArray(invoices)) return null;
        return invoices.find((inv: Invoice) => inv.invoice_id === selectedInvoiceId);
    }, [selectedInvoiceId, invoices]);

    const patient = useMemo(() => {
        if (!Array.isArray(patients) || !currentInvoice) return null;
        return patients.find((p: Patient) => p.pt_id === currentInvoice.patient_id);
    }, [currentInvoice, patients]);

    const isUSG = (activeTestName || '').toLowerCase().includes('usg') || (activeTestName || '').toLowerCase().includes('ultra');

    const techOptions = useMemo(() => employees.map((e: any) => ({
        id: e.emp_id,
        name: e.emp_name,
        details: e.job_position || e.degree
    })), [employees]);

    const doctorOptions = useMemo(() => doctors.map((d: any) => ({
        id: d.doctor_id,
        name: d.doctor_name,
        details: d.degree
    })), [doctors]);

    const leftSignatureOptions = isUSG ? doctorOptions : techOptions;

    // Clear success message quickly (1s)
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 1000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // FOCUS LOGIC: Only show/print the active selected test
    const activeTestGroup = useMemo(() => {
        if (!currentInvoice || !activeTestName) return [];
        const activeTestDef = tests.find((t: any) => t.test_name === activeTestName);
        const activeCategory = activeTestDef?.category || 'General';
        
        // Return all tests in the current invoice that share the exact same category
        return currentInvoice.items.map((it: any) => it.test_name).filter((tName: string) => {
            const def = tests.find((t: any) => t.test_name === tName);
            const cat = def?.category || 'General';
            return cat === activeCategory;
        });
    }, [currentInvoice, activeTestName, tests]);

    const groupedPathologyTests = useMemo(() => {
        const groups: Record<string, string[]> = {};
        activeTestGroup.forEach(tName => {
            const testDef = tests.find((t: any) => t.test_name === tName);
            const cat = testDef?.category || 'Others';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(tName);
        });
        return groups;
    }, [activeTestGroup, tests]);

    const handleSaveReport = async (reportData: any, isAutoSave: boolean = false) => {
        if (!selectedInvoiceId || !activeTestName) return;
        
        // 1. Calculate updated reports
        let updatedReports = [...reports];
        activeTestGroup.forEach((tName: string) => {
             const existing = updatedReports.find((r: LabReport) => r.invoice_id === selectedInvoiceId && r.test_name === tName);
             const safeTName = tName || 'UnknownTest';
             const newReport: LabReport = {
                 report_id: existing?.report_id || `REP-${selectedInvoiceId}-${safeTName.replace(/\s+/g, '')}`,
                 invoice_id: selectedInvoiceId, test_name: tName, patient_id: patient?.pt_id || '',
                 report_date: new Date().toISOString().split('T')[0], status: 'Completed', data: reportData,
                 technologistId: selectedTechnologistId, consultantId: selectedConsultantId,
                 isDelivered: existing?.isDelivered || false
             };
             updatedReports = updatedReports.filter((r: LabReport) => !(r.invoice_id === selectedInvoiceId && r.test_name === tName));
             updatedReports.push(newReport);
        });

        // 2. Calculate updated invoices
        let finalUpdatedInvoices = invoices;
        if (currentInvoice) {
            const completedTestsForInvoice = updatedReports.filter(r => r.invoice_id === selectedInvoiceId).map(r => r.test_name);
            const allTestsDone = currentInvoice.items.every((item: any) => completedTestsForInvoice.includes(item.test_name));
            if (allTestsDone && currentInvoice.status !== 'Cancelled') {
                finalUpdatedInvoices = invoices.map(inv => inv.invoice_id === selectedInvoiceId ? { ...inv, status: 'Report Ready' } : inv);
            }
        }

        // 3. Perform blocking sync if requested manually
        if (!isAutoSave && performBlockingSync) {
            setReports(updatedReports);
            if (finalUpdatedInvoices !== invoices) {
                setInvoices(finalUpdatedInvoices);
            }
            setSuccessMessage(`রিপোর্ট সফলভাবে সেভ হয়েছে!`);
            performBlockingSync({ 
                reports: updatedReports, 
                labInvoices: finalUpdatedInvoices 
            }).catch(console.error);
        } else {
            // For auto-save or if no sync function provided
            setReports(updatedReports);
            if (finalUpdatedInvoices !== invoices) {
                setInvoices(finalUpdatedInvoices);
            }
            if (!isAutoSave) setSuccessMessage(`রিপোর্ট সফলভাবে সেভ হয়েছে!`);
        }
    };

    const handlePrintReport = () => {
        const content = document.getElementById('printable-report-content');
        if (!content) return;
        const win = window.open('', '_blank');
        if (!win) return;
        
        win.document.write(`
            <html>
                <head>
                    <title>Report_${patient?.pt_name}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @page { size: A4; margin: 0; }
                        * { box-sizing: border-box; }
                        html, body { 
                            background: white; 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            font-family: 'Times New Roman', serif; 
                            color: black; 
                            width: 100%; 
                            -webkit-print-color-adjust: exact;
                        }
                        .paper-page { 
                            width: 210mm; 
                            position: relative; 
                            display: flex; 
                            flex-direction: column; 
                            background: white; 
                            box-sizing: border-box;
                            margin: 0 auto;
                        }
                        .paper-inner { padding: 0 15mm; flex: 1; display: flex; flex-direction: column; width: 100%; }
                        .report-content-body { ${printFullPad ? 'margin-top: 0;' : 'margin-top: 2.3in;'} flex: 1; width: 100%; padding-bottom: 10px; }
                        
                        @media print {
                            body { height: auto !important; overflow: visible !important; }
                            .footer-sign-container { 
                                display: flex; 
                                justify-content: space-between; 
                                align-items: flex-end; 
                                width: 100%; 
                                margin-top: auto;
                                padding-top: 40px;
                                page-break-inside: avoid;
                            }
                        }
                        .footer-sign-container { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: flex-end; 
                            width: 100%; 
                            margin-top: auto;
                            padding-top: 40px;
                        }
                        .no-break-inside { page-break-inside: avoid; }
                        .signature-box { text-align: center; width: 45%; }
                        .category-title { 
                            font-weight: 950 !important; 
                            text-transform: uppercase; 
                            text-decoration: underline; 
                            font-size: 14pt; 
                            margin-bottom: 15px; 
                            text-align: center; 
                            display: block; 
                            color: #000000 !important; 
                        }
                        .no-print { display: none !important; }
                        input, textarea { border: none !important; outline: none !important; background: transparent !important; }
                    </style>
                </head>
                <body>
                    <div id="print-mount" style="width: 100%; height: 100%; overflow: hidden;">${content.innerHTML}</div>
                    <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 850); };</script>
                </body>
            </html>
        `);
        win.document.close();
    };

    if (viewMode === 'template_mgmt') return <TemplateManagementPage onBack={() => setViewMode('reporting')} tests={tests} templates={rtTemplates} setTemplates={setRtTemplates} performBlockingSync={performBlockingSync} />;

    const renderModals = () => (
        <>
            {/* Template Save Modal */}
            {showSaveTemplateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-200">
                        <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-widest border-b pb-2">Save Template</h3>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Category</label>
                                <input 
                                    type="text" 
                                    className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 font-bold text-slate-800"
                                    placeholder="e.g. Ultrasonography"
                                    value={templateSaveCategory}
                                    onChange={e => setTemplateSaveCategory(e.target.value)}
                                    list="save-cat-list"
                                />
                                <datalist id="save-cat-list">
                                    {Array.from(new Set(rtTemplates.map(t => t.category).filter(Boolean))).map(c => <option key={c as string} value={c as string} />)}
                                </datalist>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Sub Category</label>
                                <input 
                                    type="text" 
                                    className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 font-bold text-slate-800"
                                    placeholder="e.g. Pregnancy"
                                    value={templateSaveSubCategory}
                                    onChange={e => setTemplateSaveSubCategory(e.target.value)}
                                    list="save-subcat-list"
                                />
                                <datalist id="save-subcat-list">
                                    {Array.from(new Set(rtTemplates.filter(t => t.category === templateSaveCategory).map(t => t.subCategory).filter(Boolean))).map(c => <option key={c as string} value={c as string} />)}
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Template Name</label>
                                <input 
                                    type="text" 
                                    className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 font-bold text-slate-800"
                                    placeholder="e.g. Normal Study"
                                    value={templateSaveName}
                                    onChange={e => setTemplateSaveName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowSaveTemplateModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={() => {
                                if (!templateSaveName.trim() || !templateSaveCategory.trim() || !templateSaveSubCategory.trim()) { alert("Please fill all fields"); return; }
                                const newTpl = {
                                    id: 'TPL-' + Date.now(),
                                    templateName: templateSaveName.trim(),
                                    category: templateSaveCategory.trim(),
                                    subCategory: templateSaveSubCategory.trim(),
                                    testName: templateSaveSubCategory.trim(),
                                    contentHtml: typeof currentReportData === 'string' ? currentReportData : (currentReportData?.html || currentReportData?.impression || '')
                                };
                                try {
                                    const current = JSON.parse(localStorage.getItem('ncd_rt_templates_v1') || '[]');
                                    const updated = [...current, newTpl];
                                    try { localStorage.setItem('ncd_rt_templates_v1', JSON.stringify(updated)); } catch(e){}
                                    setRtTemplates(updated);
                                    setShowSaveTemplateModal(false);
                                    setSuccessMessage("টেমপ্লেট সফলভাবে সেভ হয়েছে!");
                                    setTimeout(() => setSuccessMessage(''), 3000);
                                    if (performBlockingSync) performBlockingSync({ rtTemplates: updated });
                                } catch (e: any) {
                                    if (e.name === 'QuotaExceededError' || e.message.includes('exceeded the quota')) {
                                        alert("আপনার ব্রাউজারের স্টোরেজ ফুল হয়ে গেছে (5MB Limit)। দয়া করে কিছু অপ্রয়োজনীয় টেমপ্লেট ডিলিট করুন।");
                                    } else {
                                        alert("Failed to save: " + e.message);
                                    }
                                }
                            }} className="px-5 py-2.5 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-lg">Save Template</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Insert Modal */}
            {showInsertTemplateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-fade-in">
                    <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
                        <div className="bg-white px-6 py-4 border-b flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Insert Template</h3>
                                <p className="text-xs font-bold text-slate-500">Find and insert a template into your report</p>
                            </div>
                            <button onClick={() => setShowInsertTemplateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors">×</button>
                        </div>
                        
                        <div className="flex flex-1 overflow-hidden min-h-0">
                            {/* Filter Sidebar */}
                            <div className="w-[250px] bg-white border-r p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Search Templates</label>
                                    <input 
                                        type="text" 
                                        placeholder="Search..."
                                        value={insertTemplateSearchTerm}
                                        onChange={e => setInsertTemplateSearchTerm(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Category</label>
                                    <select 
                                        value={insertTemplateCategoryFilter}
                                        onChange={e => { setInsertTemplateCategoryFilter(e.target.value); setInsertTemplateSubCategoryFilter('All'); }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                    >
                                        <option value="All">All Categories</option>
                                        {Array.from(new Set(rtTemplates.map(t => t.category).filter(Boolean))).map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                                    </select>
                                </div>
                                {insertTemplateCategoryFilter !== 'All' && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Sub Category</label>
                                        <select 
                                            value={insertTemplateSubCategoryFilter}
                                            onChange={e => setInsertTemplateSubCategoryFilter(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                        >
                                            <option value="All">All Sub Categories</option>
                                            {Array.from(new Set(rtTemplates.filter(t => t.category === insertTemplateCategoryFilter).map(t => t.subCategory).filter(Boolean))).map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            
                            {/* Results Grid */}
                            <div className="flex-1 p-6 overflow-y-auto bg-slate-50 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(() => {
                                        const filtered = rtTemplates.filter(t => 
                                            (insertTemplateCategoryFilter === 'All' || t.category === insertTemplateCategoryFilter) &&
                                            (insertTemplateSubCategoryFilter === 'All' || t.subCategory === insertTemplateSubCategoryFilter) &&
                                            (t.templateName.toLowerCase().includes(insertTemplateSearchTerm.toLowerCase()) || 
                                             (t.subCategory && t.subCategory.toLowerCase().includes(insertTemplateSearchTerm.toLowerCase())))
                                        );
                                        
                                        if (filtered.length === 0) {
                                            return <div className="col-span-full py-10 text-center text-slate-400 font-bold">No templates found matching your criteria.</div>;
                                        }
                                        
                                        return filtered.map(t => (
                                            <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col">
                                                <div className="mb-3">
                                                    <div className="flex flex-wrap gap-1 mb-1">
                                                        <span className="text-[8px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-sm font-black uppercase">{t.category}</span>
                                                        <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-sm font-black uppercase">{t.subCategory}</span>
                                                    </div>
                                                    <h4 className="font-black text-slate-800 text-sm leading-tight">{t.templateName}</h4>
                                                </div>
                                                <button onClick={() => {
                                                    if(confirm('Replace current content with this template?')) {
                                                        setCurrentReportData(t.contentHtml);
                                                        setShowInsertTemplateModal(false);
                                                    }
                                                }} className="mt-auto w-full py-2 bg-indigo-50 text-indigo-700 font-black uppercase tracking-widest text-[10px] rounded-lg hover:bg-indigo-600 hover:text-white transition-colors">
                                                    Insert
                                                </button>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="bg-slate-200 flex-1 flex flex-col font-sans overflow-hidden text-black min-h-0">
            <style>{`
                .paper-page { width: 210mm; min-height: 294mm; margin: 0 auto; position: relative; background: white; display: flex; flex-direction: column; box-shadow: 0 0 50px rgba(0,0,0,0.1); box-sizing: border-box; overflow: visible; }
                .paper-inner { padding: 0 15mm 15mm 15mm; flex: 1; display: flex; flex-direction: column; min-height: 100%; }
                .footer-sign-container { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin-top: auto; padding-top: 20px; page-break-inside: avoid; break-inside: avoid; }
                .signature-box { text-align: center; width: 45%; }
                .category-title { font-weight: 950 !important; text-transform: uppercase; text-decoration: underline; font-size: 14pt; margin-bottom: 15px; text-align: center; display: block; color: #000000 !important; }
                
                /* In-workspace Side Controls */
                .side-controls-container { position: sticky; top: 20px; z-index: 50; width: 0; height: 0; }
                .side-controls-left { position: absolute; right: 15px; top: 20px; display: flex; flex-direction: column; gap: 10px; width: 120px; }
                .side-controls-right { position: absolute; left: calc(210mm + 15px); top: 20px; display: flex; flex-direction: column; gap: 12px; width: 50px; }
            `}</style>

            {successMessage && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border-2 border-emerald-500 text-white px-12 py-8 rounded-[3rem] shadow-2xl z-[500] animate-fade-in-up flex flex-col items-center gap-4"><div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl font-black">✓</div><div className="text-xl font-black uppercase tracking-widest">{successMessage}</div></div>}
            
            <div className="flex flex-1 overflow-hidden min-h-0">
                <div className="w-[220px] shrink-0 bg-white border-r flex flex-col shadow-sm no-print min-h-0">
                    <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                        <h3 className="font-black text-[10px] uppercase tracking-widest">Reporting Queue</h3>
                        <button onClick={() => setViewMode('template_mgmt')} className="p-2 bg-slate-800 rounded-xl hover:bg-blue-600 transition-all shadow-md"><SettingsIcon size={14}/></button>
                    </div>
                    <div className="p-3 bg-slate-50 border-b">
                        <input placeholder="Search Patient..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-2xl text-[11px] bg-white outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm" />
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 py-4 space-y-3 custom-scrollbar">
                        {invoices.filter((i: any) => i.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) || i.invoice_id.includes(searchTerm)).map((r: any) => {
                            const isActive = selectedInvoiceId === r.invoice_id;
                            const pat = patients.find((p: any) => p.pt_id === r.patient_id);
                            return (
                                <div key={r.invoice_id} onClick={() => handleSelectInvoice(r.invoice_id)} className={`p-3 border-2 rounded-2xl cursor-pointer transition-all ${isActive ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-105' : 'bg-white hover:border-blue-200'}`}>
                                    <div className={`font-black text-[11px] uppercase tracking-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>{r.patient_name}</div>
                                    <div className={`text-[9px] mt-1 font-bold ${isActive ? 'text-blue-100' : 'text-slate-600'}`}>
                                        {pat?.age ? `Age: ${pat.age}` : ''} {pat?.address ? `| ${pat.address}` : ''}
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className={`text-[9px] font-mono ${isActive ? 'text-white/70' : 'text-slate-500'}`}>{r.invoice_id}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="w-[220px] shrink-0 bg-slate-100 border-r flex flex-col shadow-inner no-print">
                    <div className="p-5 border-b bg-white text-[11px] font-black text-slate-800 uppercase tracking-widest">Investigations</div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {currentInvoice?.items.map((it: any) => {
                            const isTestDone = reports.some((rep: any) => rep.invoice_id === selectedInvoiceId && rep.test_name === it.test_name);
                            return (
                                <button key={it.test_id} onClick={() => handleSelectTest(it.test_name)} className={`w-full text-left p-3 rounded-2xl text-[11px] font-black transition-all border flex justify-between items-center ${activeTestName === it.test_name ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : isTestDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                                    <span className="truncate pr-1 uppercase flex-1">{it.test_name}</span>
                                    {isTestDone ? <span className={`text-[8px] px-2 py-0.5 rounded-full shrink-0 uppercase tracking-widest border ${activeTestName === it.test_name ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>Done</span> : <span className={`text-[8px] px-2 py-0.5 rounded-full shrink-0 uppercase tracking-widest border ${activeTestName === it.test_name ? 'bg-indigo-400 text-white border-indigo-300' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>Pend</span>}
                                </button>
                            );
                        })}
                    </div>
                    <div className="p-4 bg-slate-900 border-t border-slate-700 space-y-3">
                        <SearchableSelect 
                            label={isUSG ? "Sonographer" : "Technologist"}
                            options={leftSignatureOptions}
                            value={selectedTechnologistId}
                            onChange={(id) => {
                                setSelectedTechnologistId(id);
                                localStorage.setItem('last_tech_id', id);
                                const person = employees.find((e: any) => e.emp_id === id) || doctors.find((d: any) => d.doctor_id === id);
                                if (person) {
                                    setCustomTechName(person.emp_name || person.doctor_name);
                                    setCustomTechDegree(person.degree || (isUSG ? 'Sonographer' : 'Medical Technologist'));
                                } else {
                                    setCustomTechName('');
                                    setCustomTechDegree('');
                                }
                            }}
                            theme="dark"
                        />
                        <SearchableSelect 
                            label="Pathologist / Sonologist"
                            options={doctorOptions}
                            value={selectedConsultantId}
                            onChange={(id) => {
                                setSelectedConsultantId(id);
                                localStorage.setItem('last_doc_id', id);
                                const doc = doctors.find((d: any) => d.doctor_id === id);
                                if (doc) {
                                    setCustomDocName(doc.doctor_name);
                                    setCustomDocDegree(doc.degree);
                                } else {
                                    setCustomDocName('');
                                    setCustomDocDegree('');
                                }
                            }}
                            theme="dark"
                        />
                    </div>
                </div>

                <div className="flex-1 bg-slate-200 flex flex-col relative overflow-hidden min-h-0">
                    {activeTestName ? (
                        <div className="flex-1 overflow-y-auto bg-slate-200 custom-scrollbar relative min-h-0">
                            {/* CENTERED WRAPPER FOR PAPER AND IMMEDIATE CONTROLS */}
                            <div className="relative mx-auto w-fit py-10">
                                
                                {/* STICKY SIDE CONTROLS WITHIN THE WORKSPACE BACKGROUND */}
                                <div className="side-controls-container no-print">
                                    <div className="side-controls-left" style={{ width: '180px' }}>
                                        <div className="bg-indigo-600 text-white px-2 py-1.5 rounded-lg font-black text-[9px] uppercase shadow-lg text-center truncate border border-indigo-400">{activeTestName}</div>
                                        <label className="flex items-center justify-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border-2 border-slate-300 shadow-xl group hover:border-blue-500 transition-all">
                                            <input type="checkbox" checked={printFullPad} onChange={e => setPrintFullPad(e.target.checked)} className="w-4 h-4 text-blue-600" />
                                            <span className="text-[12px] font-black uppercase text-slate-700 group-hover:text-blue-600 leading-none">Pad Mode</span>
                                        </label>
                                        
                                        {(activeTestName.toLowerCase().includes('usg') || activeTestName.toLowerCase().includes('ultra') || activeTestName.toLowerCase().includes('semen')) && (
                                            <>
                                                <div className="bg-white p-2 rounded-lg border border-slate-300 shadow-xl flex flex-col gap-2 max-h-[350px]">
                                                    <span className="text-[10px] font-black uppercase text-indigo-800 text-center border-b pb-1">Templates</span>
                                                    
                                                    <button 
                                                        onClick={() => {
                                                            setInsertTemplateSearchTerm('');
                                                            setInsertTemplateCategoryFilter(isUSG ? 'Ultrasonography (USG)' : 'Pathology');
                                                            setInsertTemplateSubCategoryFilter(activeTestName || 'All');
                                                            setShowInsertTemplateModal(true);
                                                        }}
                                                        className="w-full bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] py-2 rounded uppercase font-black shadow-md transition-all active:scale-95 mb-1"
                                                    >
                                                        Insert Template
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setTemplateSaveName('');
                                                            setTemplateSaveCategory(isUSG ? 'Ultrasonography (USG)' : 'Pathology');
                                                            setTemplateSaveSubCategory(activeTestName || '');
                                                            setShowSaveTemplateModal(true);
                                                        }}
                                                        className="w-full bg-slate-800 text-white hover:bg-slate-700 text-[10px] py-2 rounded uppercase font-black shadow-md transition-all active:scale-95"
                                                    >
                                                        Save As Template
                                                    </button>
                                                </div>
                                                <RichTextToolbar onExec={(cmd, arg) => document.execCommand(cmd, false, arg)} />
                                            </>
                                        )}
                                    </div>
                                    <div className="side-controls-right">
                                        <button onClick={() => handleSaveReport(currentReportData)} className="bg-emerald-600 hover:bg-emerald-500 text-white w-9 h-9 rounded-full shadow-xl transition-all flex items-center justify-center border-2 border-white active:scale-90" title="Save Report"><SaveIcon size={16}/></button>
                                        <button onClick={handlePrintReport} className="bg-blue-600 hover:bg-blue-500 text-white w-9 h-9 rounded-full shadow-xl transition-all flex items-center justify-center border-2 border-white active:scale-90" title="Print Report"><PrinterIcon size={16}/></button>
                                    </div>
                                </div>

                                <div id="printable-report-content">
                                    {(activeTestName.toLowerCase().includes('usg') || activeTestName.toLowerCase().includes('ultra') || activeTestName.toLowerCase().includes('semen')) ? (
                                        <div className="paper-page">
                                            <div className="paper-inner">
                                                {printFullPad && <MasterPadHeader logo={diagnosticSettings?.clinicLogo} setLogo={handleSetLogo} />}
                                                <div className="report-content-body flex flex-col">
                                                    <ReportHeader patient={patient} currentInvoice={currentInvoice} doctors={doctors} />
                                                    <div className="category-title">{activeTestName}</div>
                                                    
                                                    <div className="flex-1 min-h-[400px]">
                                                        <RichTextEditor 
                                                            value={typeof currentReportData === 'string' ? currentReportData : (currentReportData?.html || currentReportData?.impression || '')} 
                                                            onChange={(val: string) => setCurrentReportData(val)} 
                                                            readOnly={false}
                                                            hideToolbar={true}
                                                        />
                                                    </div>
                                                </div>
                                                <Signatures techLabel={activeTestName.toLowerCase().includes('usg') ? "Sonographer" : "Lab Technologist"} docLabel={activeTestName.toLowerCase().includes('usg') ? "Sonologist" : "Pathologist / Reporter"} customTechName={customTechName} customTechDegree={customTechDegree} customDocName={customDocName} customDocDegree={customDocDegree} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-10">
                                            {(Object.entries(groupedPathologyTests) as [string, string[]][]).map(([category, testsInCat]) => {
                                                const cbcTest = testsInCat.find((t: any) => t.toLowerCase().includes('cbc'));
                                                const otherTests = testsInCat.filter((t: any) => !t.toLowerCase().includes('cbc'));
                                                const specialTests = otherTests.filter((t: any) => t.toLowerCase().includes('urine')); // Semen handled by RichText
                                                const regularTests = otherTests.filter((t: any) => !specialTests.includes(t));

                                                return (
                                                    <React.Fragment key={category}>
                                                        {regularTests.length > 0 && (
                                                            <div className="paper-page">
                                                                <div className="paper-inner">
                                                                    {printFullPad && <MasterPadHeader logo={diagnosticSettings?.clinicLogo} setLogo={handleSetLogo} />}
                                                                    <div className="report-content-body">
                                                                        <ReportHeader patient={patient} currentInvoice={currentInvoice} doctors={doctors} />
                                                                        <div className="category-title">{category} Report</div>
                                                                        <table className="w-full border-collapse border border-black">
                                                                            <thead className="bg-slate-50">
                                                                                <tr>
                                                                                    <th className="border border-black p-2 text-left text-[10px] uppercase font-black w-[45%]">Investigation</th>
                                                                                    <th className="border border-black p-2 text-center text-[10px] uppercase font-black w-[20%]">Result</th>
                                                                                    <th className="border border-black p-2 text-center text-[10px] uppercase font-black w-[15%]">Unit</th>
                                                                                    <th className="border border-black p-2 text-left text-[10px] uppercase font-black w-[20%]">Normal Range</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {regularTests.map((tName: string) => {
                                                                                    const testDef = tests.find((t: any) => t.test_name === tName);
                                                                                    const val = currentReportData?.[tName] || '';
                                                                                    const isAlert = isOutOfRange(val, testDef?.normal_range || '');
                                                                                    return (
                                                                                        <tr key={tName} className="h-8">
                                                                                            <td className="border border-black px-2 py-0.5 font-bold uppercase text-[10px]">{tName}</td>
                                                                                            <td className="border border-black p-0 text-center">
                                                                                                <input className={`w-full h-full p-1 border-none font-black text-center text-sm outline-none no-print ${isAlert ? 'bg-red-50 text-red-600' : 'bg-blue-50'}`} onChange={(e) => setCurrentReportData({ ...currentReportData, [tName]: e.target.value })} value={val} />
                                                                                                <span className={`hidden print:block font-black text-sm ${isAlert ? 'text-red-600' : ''}`}>{val || '---'}</span>
                                                                                            </td>
                                                                                            <td className="border border-black text-center text-[9px]">{testDef?.unit || '-'}</td>
                                                                                            <td className="border border-black px-2 text-[9px] italic font-bold">{testDef?.normal_range || '-'}</td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                    <Signatures customTechName={customTechName} customTechDegree={customTechDegree} customDocName={customDocName} customDocDegree={customDocDegree} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {cbcTest && (
                                                            <div className="paper-page">
                                                                <div className="paper-inner">
                                                                    {printFullPad && <MasterPadHeader logo={diagnosticSettings?.clinicLogo} setLogo={handleSetLogo} />}
                                                                    <div className="report-content-body">
                                                                        <ReportHeader patient={patient} currentInvoice={currentInvoice} doctors={doctors} />
                                                                        <div className="category-title">Hematology Report</div>
                                                                        <CBCInputPage results={currentReportData} onSaveOverride={(data: any) => setCurrentReportData(data)} patient={patient} invoice={currentInvoice} doctors={doctors} employees={employees} technologistId={selectedTechnologistId} consultantId={selectedConsultantId} isEmbedded={true} checkRange={isOutOfRange} />
                                                                    </div>
                                                                    <Signatures customTechName={customTechName} customTechDegree={customTechDegree} customDocName={customDocName} customDocDegree={customDocDegree} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {specialTests.map(tName => (
                                                            <div key={tName} className="paper-page">
                                                                <div className="paper-inner">
                                                                    {printFullPad && <MasterPadHeader logo={diagnosticSettings?.clinicLogo} setLogo={handleSetLogo} />}
                                                                    <div className="report-content-body">
                                                                        <ReportHeader patient={patient} currentInvoice={currentInvoice} doctors={doctors} />
                                                                        <div className="category-title">Clinical Pathology Report</div>
                                                                        {tName.toLowerCase().includes('urine') ? (
                                                                            <UrineRMEInputPage results={currentReportData} onSaveOverride={(data: any) => setCurrentReportData(data)} patient={patient} invoice={currentInvoice} doctors={doctors} employees={employees} technologistId={selectedTechnologistId} consultantId={selectedConsultantId} isEmbedded={true} />
                                                                        ) : (
                                                                            <SemenAnalysisInputPage results={currentReportData} onSaveOverride={(data: any) => setCurrentReportData(data)} patient={patient} invoice={currentInvoice} doctors={doctors} employees={employees} technologistId={selectedTechnologistId} consultantId={selectedConsultantId} isEmbedded={true} />
                                                                        )}
                                                                    </div>
                                                                    <Signatures customTechName={customTechName} customTechDegree={customTechDegree} customDocName={customDocName} customDocDegree={customDocDegree} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-4 bg-white p-20 text-center">
                            <div className="p-16 bg-slate-50 rounded-full border-4 border-dashed border-slate-100 shadow-inner opacity-20"><Activity size={100} /></div>
                            <h2 className="text-2xl font-black uppercase tracking-widest text-slate-400">Select Patient & Test to Begin</h2>
                        </div>
                    )}
                </div>
            </div>
            {renderModals()}
        </div>
    );
};

export default LabReportingPage;
