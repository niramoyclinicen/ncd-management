
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Patient, Doctor, DrugMonograph, Test, banglaAdviceSamples, PrescriptionRecord, MedicineItem, ComplaintItem } from './DiagnosticData';
import { StethoscopeIcon, Activity, FileTextIcon, ClipboardIcon, TestTubeIcon, EyeIcon, Pill, SettingsIcon, ClinicIcon, ShareIcon, SaveIcon } from './Icons';

interface RxSetTemplate {
    id: string;
    name: string;
    complaints: ComplaintItem[];
    diagnoses: string[];
    tests: string[];
    medicines: MedicineItem[];
    advice: string;
}

interface PrescriptionMakerProps {
    appointmentId: string;
    patient: Patient;
    doctor: Doctor;
    onClose: () => void;
    drugDatabase: DrugMonograph[]; 
    availableTests: Test[];
    existingData?: PrescriptionRecord;
    allPrescriptions: PrescriptionRecord[];
    onSave?: (data: PrescriptionRecord) => Promise<void>;
}

const initialComplaints = ['Fever', 'Headache', 'Cough', 'Abdominal Pain', 'Vomiting', 'Loose Motion', 'Back Pain', 'Joint Pain', 'Weakness', 'Vertigo', 'Chest Pain', 'Breathlessness'];
const initialDiagnoses = ['Viral Fever', 'Acute Gastritis', 'Hypertension', 'Type 2 Diabetes', 'UTI', 'Typhoid Fever', 'Upper Respiratory Tract Infection', 'Migraine', 'IBS', 'Anemia', 'PUD'];

const quickDietAdvices = [
    "পূর্ণ বিশ্রাম নিবেন", "প্রচুর পানি/তরল খাবার খাবেন", "স্বাভাবিক খাবার খাবেন", "নরম ও সহজপাচ্য খাবার", "তৈলাক্ত খাবার নিষেধ", "ধূমপান নিষেধ"
];

const PrescriptionMaker: React.FC<PrescriptionMakerProps> = ({ appointmentId, patient, doctor, onClose, drugDatabase, availableTests, existingData, allPrescriptions, onSave }) => {
    const [centerTab, setCenterTab] = useState<'clinical' | 'medicine'>('clinical');
    const [rightPanelTab, setRightPanelTab] = useState<'preview' | 'history' | 'drugInfo'>('preview');

    // UI Local State
    const [localDocName, setLocalDocName] = useState(doctor.doctor_name);
    const [localDocDegree, setLocalDocDegree] = useState(doctor.degree);
    const [localDocSchedule, setLocalDocSchedule] = useState("প্রতিদিন বিকাল ৪টা - রাত ৮টা (শুক্রবার বন্ধ)"); 

    // Master Lists
    const [complaintsList, setComplaintsList] = useState<string[]>(initialComplaints);
    const [diagnosisList, setDiagnosisList] = useState<string[]>(initialDiagnoses);
    
    // Master Templates
    const [rxTemplates, setRxTemplates] = useState<RxSetTemplate[]>(() => {
        const saved = localStorage.getItem('ncd_full_rx_templates_v2');
        return saved ? JSON.parse(saved) : [];
    });

    const [manageModal, setManageModal] = useState<{ isOpen: boolean, type: 'complaint' | 'diagnosis' | 'advice' | 'pad_settings' | 'master_templates' | null }>({ isOpen: false, type: null });

    // --- CURRENT PRESCRIPTION DATA ---
    const [selectedComplaints, setSelectedComplaints] = useState<ComplaintItem[]>([]);
    const [complaintInput, setComplaintInput] = useState('');
    const [complaintDuration, setComplaintDuration] = useState('');
    const [onExam, setOnExam] = useState('');
    const [vitals, setVitals] = useState({ bp: '', pulse: '', weight: '', temp: '' });
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [testSearch, setTestSearch] = useState('');
    const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
    const [diagnosisInput, setDiagnosisInput] = useState('');
    const [medicines, setMedicines] = useState<MedicineItem[]>([]);
    const [medSearchTerm, setMedSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false); 
    const [focusedMedicine, setFocusedMedicine] = useState<DrugMonograph | null>(null);
    const [tempDose, setTempDose] = useState('1+0+1');
    const [tempDuration, setTempDuration] = useState('5 Days');
    const [tempInstruction, setTempInstruction] = useState('খাওয়ার পর');
    const [adviceText, setAdviceText] = useState('');
    const [nextVisit, setNextVisit] = useState('');

    const searchInputRef = useRef<HTMLInputElement>(null);
    const complaintInputRef = useRef<HTMLInputElement>(null);

    // Patient History Data
    const patientHistory = useMemo(() => {
        return allPrescriptions.filter(p => p.patientId === patient.pt_id).reverse();
    }, [allPrescriptions, patient.pt_id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (existingData) {
                setSelectedComplaints(existingData.complaints || []);
                setSelectedDiagnoses(existingData.diagnoses || []);
                setOnExam(existingData.onExam || '');
                setVitals(existingData.vitals || { bp: '', pulse: '', weight: '', temp: '' });
                setSelectedTests(existingData.tests || []);
                setMedicines(existingData.medicines || []);
                setAdviceText(existingData.advice || '');
                setNextVisit(existingData.nextVisit || '');
            }

            const savedName = localStorage.getItem(`rx_pref_name_${doctor.doctor_id}`);
            const savedDegree = localStorage.getItem(`rx_pref_degree_${doctor.doctor_id}`);
            const savedSchedule = localStorage.getItem(`rx_pref_schedule_${doctor.doctor_id}`);
            if (savedName) setLocalDocName(savedName);
            if (savedDegree) setLocalDocDegree(savedDegree);
            if (savedSchedule) setLocalDocSchedule(savedSchedule);
        }, 0);
        return () => clearTimeout(timer);
    }, [existingData, doctor.doctor_id]);

    useEffect(() => {
        localStorage.setItem('ncd_full_rx_templates_v2', JSON.stringify(rxTemplates));
    }, [rxTemplates]);

    // Template Handlers
    const handleSaveAsTemplate = () => {
        if (medicines.length === 0 && selectedDiagnoses.length === 0) return alert("প্রথমে কিছু তথ্য ইনপুট দিন।");
        const tName = prompt("নতুন মাস্টার টেমপ্লেটের নাম দিন:");
        if (tName) {
            const newTemplate: RxSetTemplate = { id: `T-${Date.now()}`, name: tName, complaints: [...selectedComplaints], diagnoses: [...selectedDiagnoses], tests: [...selectedTests], medicines: [...medicines], advice: adviceText };
            setRxTemplates([newTemplate, ...rxTemplates]);
            alert("মাস্টার টেমপ্লেট সেভ হয়েছে!");
        }
    };

    const handleLoadTemplate = (t: RxSetTemplate | PrescriptionRecord) => {
        if (confirm("আপনি কি পুরানো বা টেমপ্লেট ডাটা লোড করতে চান? এটি বর্তমান ডাটা পরিবর্তন করবে।")) {
            setSelectedComplaints([...(t.complaints || [])]);
            setSelectedDiagnoses([...(t.diagnoses || [])]);
            setSelectedTests([...(t.tests || [])]);
            setMedicines((t.medicines || []).map(m => ({ ...m, id: Date.now() + Math.random() })));
            setAdviceText(t.advice || '');
            setManageModal({ isOpen: false, type: null });
            if ('name' in t) alert(`টেমপ্লেট "${t.name}" লোড করা হয়েছে।`);
            else alert("পুরানো প্রেসক্রিপশন রেকর্ড লোড করা হয়েছে।");
        }
    };

    // Input Handlers
    const handleAddComplaint = (e?: React.KeyboardEvent) => {
        if (e && e.key !== 'Enter') return;
        if (!complaintInput.trim()) return;
        setSelectedComplaints([...selectedComplaints, { name: complaintInput, duration: complaintDuration }]);
        if (!complaintsList.includes(complaintInput)) setComplaintsList([...complaintsList, complaintInput]);
        setComplaintInput(''); setComplaintDuration('');
        if (complaintInputRef.current) complaintInputRef.current.focus();
    };

    const handleAddDiagnosis = (e?: React.KeyboardEvent) => {
        if (e && e.key !== 'Enter') return;
        if (!diagnosisInput.trim()) return;
        if (!selectedDiagnoses.includes(diagnosisInput)) setSelectedDiagnoses([...selectedDiagnoses, diagnosisInput]);
        if (!diagnosisList.includes(diagnosisInput)) setDiagnosisList([...diagnosisList, diagnosisInput]);
        setDiagnosisInput('');
    };

    const handleAddTest = (testName: string) => {
        if (!testName.trim()) return;
        if (!selectedTests.includes(testName)) setSelectedTests([...selectedTests, testName]);
        setTestSearch('');
    };

    const searchResults = useMemo(() => {
        if (medSearchTerm.length > 0) {
            const term = medSearchTerm.toLowerCase();
            return drugDatabase.filter(d => d.brandName.toLowerCase().includes(term) || d.genericName.toLowerCase().includes(term)).slice(0, 50);
        }
        return drugDatabase.slice(0, 20);
    }, [medSearchTerm, drugDatabase]);

    const handleSelectDrug = (drug: DrugMonograph) => {
        setFocusedMedicine(drug);
        setMedSearchTerm(`${drug.brandName} (${drug.strength})`); 
        setShowDropdown(false);
    };

    const handleAddMedicine = () => {
        const name = focusedMedicine ? `${focusedMedicine.brandName} ${focusedMedicine.strength}` : medSearchTerm;
        if (!name.trim()) return;
        const newItem: MedicineItem = { id: Date.now(), drugId: focusedMedicine?.id, name: name, genericName: focusedMedicine ? focusedMedicine.genericName : '', type: focusedMedicine ? focusedMedicine.formulation : 'Med', dose: tempDose, duration: tempDuration, instruction: tempInstruction };
        setMedicines([...medicines, newItem]);
        setMedSearchTerm(''); setFocusedMedicine(null); setTempDose('1+0+1');
        if (searchInputRef.current) searchInputRef.current.focus();
    };

    const handleSave = async () => {
        const prescriptionData: PrescriptionRecord = { id: existingData?.id || `RX-${Date.now()}`, appointmentId, date: new Date().toISOString(), patientId: patient.pt_id, doctorId: doctor.doctor_id, complaints: selectedComplaints, diagnoses: selectedDiagnoses, onExam, vitals, tests: selectedTests, medicines, advice: adviceText, nextVisit };
        if (onSave) await onSave(prescriptionData);
    };

    const handlePrint = () => {
        const printArea = document.getElementById('print-area-wrapper');
        if (!printArea) return;
        const win = window.open('', '', 'width=900,height=1200');
        if (!win) return alert("Popup blocked!");
        win.document.write(`<html><head><title>Rx_${patient.pt_name}</title><script src="https://cdn.tailwindcss.com"></script><style>@page { size: A4; margin: 0; } body { background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; font-family: 'Times New Roman', serif; } #print-area { width: 210mm; min-height: 297mm; margin: 0 auto; display: flex; flex-direction: column; } .no-print { display: none !important; }</style></head><body>${printArea.innerHTML}<script>setTimeout(()=>{window.print(); window.close();}, 700);</script></body></html>`);
        win.document.close();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#020617] text-slate-100 flex flex-col font-sans">
            {/* Modal Components (Pad Settings, Templates) - Same as previous but kept for completeness */}
            {manageModal.isOpen && manageModal.type === 'master_templates' && (
                 <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md">
                 <div className="bg-slate-800 rounded-3xl w-full max-w-2xl border border-slate-600 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                     <div className="p-6 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                         <h3 className="text-2xl font-black text-white flex items-center gap-3"><ClipboardIcon size={32}/> Master Rx Templates</h3>
                         <button onClick={() => setManageModal({ isOpen: false, type: null })} className="text-slate-400 hover:text-white text-4xl font-black">&times;</button>
                     </div>
                     <div className="p-8 overflow-y-auto space-y-4 custom-scrollbar bg-slate-950/30">
                         {rxTemplates.map(t => (
                             <div key={t.id} className="p-5 bg-slate-800 rounded-2xl border-2 border-slate-700 hover:border-blue-500 transition-all group flex justify-between items-center shadow-lg">
                                 <div className="flex-1 cursor-pointer" onClick={() => handleLoadTemplate(t)}>
                                     <h4 className="text-xl font-black text-blue-100 uppercase tracking-tighter">{t.name}</h4>
                                     <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Contains: {t.medicines.length} Medicines & {t.diagnoses.length} Dx</p>
                                 </div>
                                 <button onClick={() => handleLoadTemplate(t)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-xl transition-all">Load</button>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
            )}
            
            {/* TOP TOOLBAR */}
            <div className="h-16 bg-[#0f172a] border-b border-slate-800 flex justify-between items-center px-8 shadow-2xl shrink-0 z-30">
                <div className="flex items-center gap-5">
                    <div className="bg-blue-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]"><StethoscopeIcon className="w-5 h-5 text-white" /></div>
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none">{patient.pt_name}</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{patient.gender}, {patient.ageY}Y | Patient_ID: {patient.pt_id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setManageModal({ isOpen: true, type: 'master_templates' })} className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-inner hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"><ClipboardIcon size={14}/> Library</button>
                    <button onClick={handleSaveAsTemplate} className="bg-slate-800 text-slate-300 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase shadow hover:bg-slate-700 transition-all border border-slate-700">Save Template</button>
                    <div className="h-10 w-[1.5px] bg-slate-800 mx-2"></div>
                    <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-2.5 rounded-2xl font-black uppercase text-[12px] shadow-[0_0_40px_rgba(16,185,129,0.3)] border-b-4 border-emerald-900 active:scale-95 transition-all flex items-center gap-2">SAVE RECORD</button>
                    <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-2xl font-black uppercase text-[12px] shadow-xl border-b-4 border-blue-900 active:scale-95 transition-all">PRINT PAD</button>
                    <button onClick={onClose} className="bg-rose-900/30 text-rose-500 p-3 rounded-xl hover:bg-rose-600 hover:text-white transition-all ml-4">×</button>
                </div>
            </div>

            <div className="grid grid-cols-12 overflow-hidden h-[calc(100vh-64px)]">
                
                {/* --- LEFT: CLINICAL INPUTS (Width: 2/12) --- */}
                <div className="col-span-2 bg-[#0f172a] border-r border-slate-800 flex flex-col h-full overflow-y-auto custom-scrollbar no-print">
                    <div className="p-5 border-b border-slate-800 space-y-4">
                        <h3 className="text-[10px] font-black text-teal-500 uppercase tracking-[0.3em] mb-1">Chief Complaints (C/C)</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedComplaints.map((c, i) => (<span key={i} className="bg-teal-900/40 text-teal-300 border border-teal-800 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-2 group">{c.name} <button onClick={() => setSelectedComplaints(selectedComplaints.filter((_, idx) => idx !== i))} className="text-teal-600 hover:text-white">×</button></span>))}
                        </div>
                        <input ref={complaintInputRef} list="c_opts" value={complaintInput} onChange={e=>setComplaintInput(e.target.value)} onKeyDown={handleAddComplaint} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-teal-500 outline-none" placeholder="Enter Complaint..."/>
                        <datalist id="c_opts">{complaintsList.map((c,i)=><option key={i} value={c}/>)}</datalist>
                    </div>

                    <div className="p-5 border-b border-slate-800 space-y-4 bg-slate-900/20">
                        <h3 className="text-[10px] font-black text-sky-500 uppercase tracking-[0.3em] mb-1">Examination / Vitals</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {['bp', 'pulse', 'weight', 'temp'].map(v => (<div key={v}><label className="text-[8px] font-black text-slate-600 uppercase ml-1">{v}</label><input value={(vitals as any)[v]} onChange={e=>setVitals({...vitals, [v]:e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-center text-xs text-sky-400 font-black" placeholder="--"/></div>))}
                        </div>
                        <textarea value={onExam} onChange={e=>setOnExam(e.target.value)} placeholder="Exam findings..." className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white resize-none outline-none focus:border-sky-500"/>
                    </div>

                    <div className="p-5 border-b border-slate-800 space-y-4">
                        <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1">Diagnosis (Dx)</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedDiagnoses.map((d, i) => (<span key={i} className="bg-amber-900/40 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-2">{d} <button onClick={() => setSelectedDiagnoses(selectedDiagnoses.filter((_, idx) => idx !== i))} className="text-amber-600 hover:text-white">×</button></span>))}
                        </div>
                        <input list="d_opts" value={diagnosisInput} onChange={e=>setDiagnosisInput(e.target.value)} onKeyDown={handleAddDiagnosis} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none" placeholder="Diagnosis..."/>
                        <datalist id="d_opts">{diagnosisList.map((d,i)=><option key={i} value={d}/>)}</datalist>
                    </div>

                    <div className="p-5 space-y-4">
                        <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-1">Investigation (Inv)</h3>
                        <div className="space-y-2">
                            {selectedTests.map((t, i) => (<div key={i} className="bg-purple-900/40 text-purple-300 border border-purple-800 px-3 py-2 rounded-xl text-xs font-bold flex justify-between items-center group">{t} <button onClick={() => setSelectedTests(selectedTests.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-white">×</button></div>))}
                        </div>
                        <input list="t_opts" value={testSearch} onChange={e=>setTestSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddTest(testSearch)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-purple-500 outline-none" placeholder="Search Test..."/>
                        <datalist id="t_opts">{availableTests.map(t=><option key={t.test_id} value={t.test_name}/>)}</datalist>
                    </div>
                </div>

                {/* --- MIDDLE: MAIN RX BUILDER (Width: 6/12) --- */}
                <div className="col-span-6 bg-[#020617] flex flex-col h-full border-r border-slate-800 overflow-hidden no-print">
                    
                    {/* TAB TOGGLE: Clinical vs Medication */}
                    <div className="bg-slate-900/50 p-2 flex border-b border-slate-800 shrink-0">
                         <button onClick={() => setCenterTab('clinical')} className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${centerTab === 'clinical' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' : 'text-slate-500 hover:text-slate-300'}`}>Clinical Notes</button>
                         <button onClick={() => setCenterTab('medicine')} className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${centerTab === 'medicine' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]' : 'text-slate-500 hover:text-slate-300'}`}>Prescribe Medication</button>
                    </div>

                    {centerTab === 'medicine' ? (
                        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                            <div className="p-6 bg-slate-900/30 border-b border-slate-800 shadow-inner">
                                <div className="relative mb-5">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-3xl italic tracking-tighter z-10">Rx</span>
                                    <input ref={searchInputRef} value={medSearchTerm} onChange={e=>setMedSearchTerm(e.target.value)} onFocus={()=>setShowDropdown(true)} onBlur={()=>setTimeout(()=>setShowDropdown(false),300)} className="w-full py-5 pl-16 pr-6 bg-slate-950 border-2 border-emerald-900/50 rounded-3xl text-white font-black text-xl focus:ring-4 focus:ring-emerald-600/20 focus:border-emerald-500 outline-none transition-all placeholder-slate-800 shadow-2xl" placeholder="Search Brand / Generic Name..." autoComplete="off" />
                                    {showDropdown && searchResults.length > 0 && (
                                        <ul className="absolute left-0 right-0 top-full mt-3 bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-h-96 overflow-y-auto z-[100] divide-y divide-slate-800 ring-1 ring-white/5">
                                            {searchResults.map(drug => (
                                                <li key={drug.id} onClick={()=>handleSelectDrug(drug)} className="px-6 py-5 hover:bg-emerald-900/20 cursor-pointer transition-colors group flex justify-between items-center">
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-black text-white text-xl group-hover:text-emerald-400">{drug.brandName}</span>
                                                            <span className="text-[10px] font-black uppercase bg-slate-950 border border-slate-700 text-slate-500 px-2.5 py-1 rounded-lg">{drug.formulation}</span>
                                                        </div>
                                                        <div className="text-xs font-bold text-sky-400 mt-1 italic">{drug.genericName} | {drug.strength}</div>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${drug.pregnancyCategory === 'X' ? 'bg-rose-900 text-rose-300' : 'bg-emerald-900 text-emerald-300'}`}>CAT: {drug.pregnancyCategory}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                     <input list="ds_o" value={tempDose} onChange={e=>setTempDose(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center text-sm text-blue-400 font-black outline-none focus:border-blue-500" placeholder="1+0+1"/>
                                     <datalist id="ds_o"><option value="1+0+1"/><option value="1+1+1"/><option value="1+0+0"/><option value="0+0+1"/><option value="0+1+0"/><option value="2+2+2"/></datalist>
                                     <input list="dr_o" value={tempDuration} onChange={e=>setTempDuration(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center text-sm text-white font-bold outline-none focus:border-blue-500" placeholder="7 Days"/>
                                     <datalist id="dr_o"><option value="3 Days"/><option value="5 Days"/><option value="7 Days"/><option value="10 Days"/><option value="1 Month"/><option value="Continue"/></datalist>
                                     <input list="is_o" value={tempInstruction} onChange={e=>setTempInstruction(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-400 font-bold outline-none focus:border-blue-500" placeholder="Instruction"/>
                                     <datalist id="is_o"><option value="খাওয়ার পর"/><option value="খাওয়ার আগে"/><option value="ভরা পেটে"/><option value="খালি পেটে"/></datalist>
                                     <button onClick={handleAddMedicine} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Add to Rx</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {medicines.map((med, idx) => (
                                    <div key={med.id} className="p-5 rounded-[2rem] bg-slate-900 border border-slate-800 flex justify-between items-center group hover:border-emerald-500/50 transition-all shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600/30 group-hover:bg-emerald-600 transition-all"></div>
                                        <div className="flex items-center gap-5">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-slate-500">{idx + 1}</div>
                                            <div>
                                                <h4 className="font-black text-xl text-white group-hover:text-emerald-200 transition-colors">{med.name}</h4>
                                                <div className="flex items-center gap-5 text-[14px] mt-1.5">
                                                    <span className="font-black text-blue-400 font-mono bg-blue-950/40 px-2.5 py-0.5 rounded-lg border border-blue-900/30">{med.dose}</span>
                                                    <span className="text-slate-600 font-bold">--- {med.duration}</span>
                                                    <span className="text-sky-300 italic font-black">({med.instruction})</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setMedicines(medicines.filter(m => m.id !== med.id))} className="text-rose-500/30 hover:text-rose-500 p-3 rounded-full hover:bg-rose-950/30 transition-all text-2xl font-black">×</button>
                                    </div>
                                ))}
                                {medicines.length === 0 && (
                                    <div className="text-center py-40 opacity-10 flex flex-col items-center">
                                        <Pill size={160} className="mb-6"/>
                                        <p className="text-4xl font-black uppercase tracking-[0.4em] italic">Begin Medication</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar animate-fade-in">
                            <section>
                                <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 border-l-4 border-blue-600 pl-4">Detailed Clinical Observation / Research Notes</h4>
                                <textarea value={onExam} onChange={e=>setOnExam(e.target.value)} className="w-full h-64 bg-slate-900 border border-slate-700 rounded-[2.5rem] p-8 text-white text-lg font-medium focus:border-blue-500 outline-none shadow-inner" placeholder="Write detailed clinical findings, observation notes, or research data for this patient..."/>
                            </section>
                            
                            <section>
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest border-l-4 border-purple-600 pl-4">Patient Advice / উপদেশাবলী</h4>
                                    <div className="flex gap-2">
                                        {quickDietAdvices.slice(0, 3).map((qa, i) => (<button key={i} onClick={()=>setAdviceText(prev=>prev?prev+'\n'+qa:qa)} className="whitespace-nowrap px-3 py-1 bg-slate-800 hover:bg-blue-900 border border-slate-700 text-slate-400 hover:text-white text-[10px] font-black rounded-xl transition-all shadow-inner">{qa}</button>))}
                                    </div>
                                </div>
                                <textarea value={adviceText} onChange={e=>setAdviceText(e.target.value)} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-[2.5rem] p-8 text-white text-base font-bold focus:border-purple-500 outline-none shadow-inner" placeholder="উপদেশসমূহ লিখুন..."/>
                            </section>

                            <section className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 ml-4">Follow up Date / পরবর্তী সাক্ষাৎ</label>
                                <input value={nextVisit} onChange={e=>setNextVisit(e.target.value)} placeholder="যেমন: ৭ দিন পর (7 days later)" className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-5 text-blue-400 font-black text-xl outline-none text-center shadow-2xl focus:border-blue-500"/>
                            </section>
                        </div>
                    )}
                </div>

                {/* --- RIGHT: PREVIEW & HISTORY (Width: 4/12) --- */}
                <div className="col-span-4 bg-slate-200 border-l border-slate-700 flex flex-col h-full overflow-hidden">
                    <div className="h-10 bg-[#0f172a] flex shrink-0">
                        <button onClick={() => setRightPanelTab('preview')} className={`flex-1 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${rightPanelTab === 'preview' ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:text-white'}`}><EyeIcon size={14}/> Pad Preview</button>
                        <button onClick={() => setRightPanelTab('history')} className={`flex-1 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${rightPanelTab === 'history' ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:text-white'}`}><Activity size={14}/> History ({patientHistory.length})</button>
                        <button onClick={() => setRightPanelTab('drugInfo')} className={`flex-1 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${rightPanelTab === 'drugInfo' ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:text-white'}`}><Pill size={14}/> Drug Info</button>
                    </div>

                    <div className="flex-1 overflow-hidden pt-5 relative">
                        {rightPanelTab === 'preview' ? (
                            <div className="h-full overflow-y-auto bg-slate-400/50 p-8 flex justify-center custom-scrollbar">
                                <div id="print-area-wrapper" className="w-full">
                                    <div className="bg-white text-black w-full min-h-[296mm] shadow-[0_20px_80px_rgba(0,0,0,0.4)] flex flex-col font-serif relative overflow-hidden mx-auto border border-gray-300" id="print-area">
                                        <div id="header-section" className="p-12 border-b-4 border-slate-800 flex justify-between items-start shrink-0 relative">
                                            <div className="w-[60%] z-10 flex gap-6">
                                                <div className="w-24 h-24 bg-slate-50 border-2 border-slate-200 rounded-[2rem] flex items-center justify-center shrink-0 shadow-inner"><ClinicIcon className="w-14 h-14 text-slate-300" /></div>
                                                <div className="flex-1">
                                                    <h2 className="text-3xl font-black text-blue-900 uppercase leading-none tracking-tighter">{localDocName}</h2>
                                                    <p className="text-base font-bold text-slate-800 mt-2 whitespace-pre-wrap leading-tight">{localDocDegree}</p>
                                                    <p className="text-[11px] font-black text-slate-500 mt-4 uppercase tracking-[0.2em] border-t border-slate-100 pt-2">{localDocSchedule}</p>
                                                </div>
                                            </div>
                                            <div className="text-right w-[40%] z-10 flex flex-col items-end">
                                                <h2 className="text-3xl font-black text-emerald-800 tracking-tighter uppercase leading-none italic">Niramoy Clinic</h2>
                                                <p className="text-[12px] font-bold text-slate-700 mt-1">Enayetpur, Sirajgonj</p>
                                                <p className="text-[14px] font-black text-blue-900 mt-1">01730 923007</p>
                                                <div className="mt-6 inline-block bg-slate-950 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-lg">Prescription</div>
                                            </div>
                                        </div>

                                        <div id="content-wrapper" className="flex flex-col flex-1">
                                            <div className="px-12 py-6 border-b-2 border-slate-200 bg-slate-50/50 shrink-0">
                                                <div className="grid grid-cols-12 gap-4 items-center text-black font-black text-base w-full">
                                                    <div className="col-span-6 flex items-center"><span className="mr-3 text-slate-400 uppercase text-[10px] font-black tracking-widest">Patient:</span> <span className="text-2xl uppercase tracking-tighter">{patient.pt_name}</span></div>
                                                    <div className="col-span-2 flex items-center justify-center border-x border-slate-200"><span className="mr-2 text-slate-400 uppercase text-[10px] font-black">Sex:</span> <span>{patient.gender}</span></div>
                                                    <div className="col-span-2 flex items-center justify-center"><span className="mr-2 text-slate-400 uppercase text-[10px] font-black">Age:</span> <span>{patient.ageY} Y</span></div>
                                                    <div className="col-span-2 flex items-center justify-end"><span className="mr-2 text-slate-400 uppercase text-[10px] font-black">Date:</span> <span>{new Date().toLocaleDateString('en-GB')}</span></div>
                                                </div>
                                            </div>

                                            <div className="flex-1 flex flex-row relative h-full">
                                                <div className="w-[32%] p-10 border-r-2 border-slate-100 flex flex-col h-full bg-slate-50/20">
                                                    <div className="space-y-10">
                                                        {selectedComplaints.length > 0 && (
                                                            <div>
                                                                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-1">Complaints:</h4>
                                                                <ul className="space-y-3 text-[15px] font-bold text-slate-800">
                                                                    {selectedComplaints.map((c, i) => (<li key={i} className="flex flex-col"><span>• {c.name}</span>{c.duration && <span className="text-[11px] text-blue-600/60 ml-4 font-black italic">--- {c.duration}</span>}</li>))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {(vitals.bp || vitals.pulse || vitals.weight || vitals.temp || onExam) && (
                                                            <div className="bg-white/50 p-4 rounded-3xl border border-slate-100 shadow-sm">
                                                                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3">Vitals:</h4>
                                                                <div className="text-[14px] font-black text-slate-700 space-y-2">
                                                                    {vitals.bp && <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>B.P:</span> <span>{vitals.bp}</span></div>}
                                                                    {vitals.pulse && <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Pulse:</span> <span>{vitals.pulse}</span></div>}
                                                                    {vitals.temp && <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Temp:</span> <span>{vitals.temp}°F</span></div>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedTests.length > 0 && (
                                                            <div>
                                                                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-1">Investigation:</h4>
                                                                <ul className="space-y-1.5 text-[14px] font-bold text-purple-900/70 italic">
                                                                    {selectedTests.map((t, i) => <li key={i}>{i+1}. {t}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {selectedDiagnoses.length > 0 && (
                                                        <div className="mt-auto pt-10 pb-4">
                                                            <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-1">Diagnosis:</h4>
                                                            <ul className="space-y-2 text-xl font-black text-slate-950 italic underline decoration-blue-200 decoration-4">
                                                                {selectedDiagnoses.map((d, i) => <li key={i}>{d}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="w-[68%] p-10 relative flex flex-col h-full">
                                                    <div className="flex items-end mb-10 border-b-4 border-slate-950 pb-3 shrink-0">
                                                        <h2 className="text-6xl font-serif italic font-black shrink-0 tracking-tighter">Rx</h2>
                                                    </div>
                                                    
                                                    <div className="space-y-8 flex-1">
                                                        {medicines.map((med, idx) => (
                                                            <div key={idx} className="border-b border-slate-50 pb-4 last:border-0 group">
                                                                <div className="flex items-baseline gap-4">
                                                                    <span className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center text-xs font-black shrink-0">{idx + 1}</span>
                                                                    <div className="flex-1">
                                                                        <div className="font-black text-2xl text-slate-950 leading-none uppercase tracking-tight">{med.type}. {med.name}</div>
                                                                        <div className="flex gap-12 items-center text-lg font-black mt-3 ml-1">
                                                                            <span className="font-mono bg-slate-100 px-3 py-0.5 rounded-lg border-2 border-slate-200 text-blue-900">{med.dose}</span>
                                                                            <span className="text-slate-600 border-l-2 border-slate-200 pl-6 uppercase tracking-tighter">{med.duration}</span>
                                                                            <span className="text-slate-400 italic border-l-2 border-slate-200 pl-6 text-base">({med.instruction})</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-10 pt-10 border-t-4 border-slate-100">
                                                        {adviceText && (
                                                            <div className="mb-6">
                                                                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3 underline decoration-4 decoration-blue-100 underline-offset-8">Advice / উপদেশ:</h4>
                                                                <div className="text-base font-bold whitespace-pre-wrap leading-relaxed bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-800 italic shadow-inner">
                                                                    {adviceText}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-6 pt-4 shrink-0 border-t border-slate-50">
                                                            <span className="font-black text-[11px] uppercase text-slate-400 tracking-tighter">Follow up:</span>
                                                            <span className="text-xl font-black border-b-4 border-slate-950 px-16 italic text-blue-900 tracking-tighter">{nextVisit || '...........................................'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-12 border-t border-slate-200 mt-auto shrink-0 bg-white z-10 flex justify-between items-end">
                                                <div><p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em] mb-1">NcD Medical Records</p></div>
                                                <div className="text-center"><p className="font-black text-slate-950 text-xl uppercase tracking-tighter">{localDocName}</p><div className="h-1.5 w-64 bg-slate-950 mt-1 rounded-full shadow-sm"></div><p className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-[0.4em]">Authorized Sign</p></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : rightPanelTab === 'history' ? (
                            <div className="h-full overflow-y-auto bg-slate-900 p-6 space-y-6 animate-fade-in custom-scrollbar">
                                <h3 className="text-xl font-black text-white flex items-center gap-3"><Activity className="text-blue-400"/> Patient Visit History</h3>
                                {patientHistory.length === 0 ? (
                                    <div className="text-center py-40 text-slate-600 font-bold italic">No previous visits recorded for this patient.</div>
                                ) : (
                                    patientHistory.map((rx) => (
                                        <div key={rx.id} className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 hover:border-blue-500/50 transition-all group">
                                            <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                                                <div>
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Consultation Date</span>
                                                    <span className="text-sm font-black text-white">{new Date(rx.date).toLocaleDateString('en-GB')}</span>
                                                </div>
                                                <button onClick={() => handleLoadTemplate(rx)} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-1.5 rounded-xl font-black text-[10px] uppercase shadow-inner transition-all">Copy Rx</button>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {rx.diagnoses.map((dx, i) => <span key={i} className="text-[9px] font-bold bg-slate-900 text-amber-400 px-2 py-0.5 rounded border border-slate-700">{dx}</span>)}
                                                </div>
                                                <div className="space-y-1 mt-3">
                                                    {rx.medicines.map((m, i) => (
                                                        <div key={i} className="text-[11px] text-slate-400 flex items-center gap-2">
                                                            <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                                                            <span className="font-bold text-slate-300">{m.name}</span>
                                                            <span className="text-[9px] italic">({m.dose})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="h-full bg-[#020617]"><DrugInfoPanel drugDatabase={drugDatabase} focusedMedicine={focusedMedicine} /></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DrugInfoPanel = ({ focusedMedicine }: any) => {
    if (!focusedMedicine) return <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-20 p-12 text-center"><Pill size={160} className="mb-8"/><p className="text-3xl font-black uppercase tracking-[0.3em] italic">Select a Medicine <br/> to view monograph</p></div>;
    return (
        <div className="p-10 text-slate-200 space-y-10 animate-fade-in custom-scrollbar overflow-y-auto h-full bg-[#020617]">
            <div className="border-b border-slate-800 pb-10">
                <h3 className="text-5xl font-black text-white leading-tight tracking-tighter">{focusedMedicine.brandName} <span className="text-2xl text-blue-500 block mt-2">{focusedMedicine.strength}</span></h3>
                <p className="text-sky-400 text-xl font-bold italic mt-4 border-l-4 border-sky-400 pl-4">{focusedMedicine.genericName}</p>
                <div className="flex gap-4 mt-8">
                    <span className="bg-slate-800 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 border border-slate-700">{focusedMedicine.company}</span>
                    <span className={`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest text-white border-2 shadow-xl ${focusedMedicine.pregnancyCategory==='X'||focusedMedicine.pregnancyCategory==='D'?'bg-rose-600 border-rose-400':'bg-emerald-600 border-emerald-400'}`}>Pregnancy: {focusedMedicine.pregnancyCategory}</span>
                </div>
            </div>
            <div className="space-y-10">
                <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-4"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Indications & Usage</h4>
                    <div className="flex flex-wrap gap-3">{focusedMedicine.indications.map((ind: string, i: number) => <span key={i} className="px-5 py-2.5 bg-blue-600/10 text-blue-300 border border-blue-500/20 rounded-2xl text-sm font-bold shadow-inner">{ind}</span>)}</div>
                </section>
                <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-4"><div className="w-2 h-2 bg-amber-500 rounded-full"></div> Standard Adult Dosage</h4>
                    <div className="p-8 bg-slate-950 border border-slate-800 rounded-3xl text-lg font-bold leading-relaxed shadow-2xl text-slate-100 italic border-l-8 border-l-blue-600">"{focusedMedicine.adultDose}"</div>
                </section>
            </div>
        </div>
    );
};

export default PrescriptionMaker;
