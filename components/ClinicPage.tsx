
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Patient, Doctor, Employee, Medicine, Referrar, MedicineItem, ExpenseItem, InternalLabOrder } from './DiagnosticData';
import SearchableSelect from './SearchableSelect';
import PatientInfoPage from './PatientInfoPage';
import DoctorInfoPage from './DoctorInfoPage';
import ReferrerInfoPage from './ReferrerInfoPage';
import ErrorBoundary from './ErrorBoundary';
import { BackIcon, ClinicIcon, StethoscopeIcon, ClipboardIcon, FileTextIcon, SettingsIcon, UserPlusIcon, Armchair, Activity, SaveIcon, MoneyIcon, TrashIcon, PrinterIcon, EyeIcon, SearchIcon, PlusIcon, RefreshIcon, Database as DatabaseIcon, Plus, Save, Trash2, Loader2, Trash2Icon, AlertCircle, UsersIcon, EditIcon, ClipboardList as LayoutIcon } from './Icons';
import { dbService } from '../dbService';
import { CheckCircle2, AlertTriangle, Sparkles, Layers, Calendar, Clock, Pill } from 'lucide-react';
import DailyConsolidatedClinicEntryPage from './clinic/DailyConsolidatedClinicEntryPage';

// Fixed Clinic Config
const CLINIC_REGISTRATION = 'HSM76710';

// Date normalization helper
function normalizeDate(d: any): string {
    if (!d) return '';
    if (typeof d === 'string') {
        const trimmed = d.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
        return trimmed;
    }
    if (d instanceof Date && !isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    return String(d || '');
}

// Clinic Expense Categories for net balance calculation
const clinicExpenseCategories = [
    'Stuff salary', 'Generator', 'Motorcycle', 'Marketing', 'Clinic development', 
    'House rent', 'Stationery', 'Food/Refreshment', 
    'Doctor donation', 'Repair/Instruments', 'Press', 'License/Official', 
    'Bank/NGO Installment', 'Mobile', 'Interest/Loan', 'Others', 'Old Loan Repay'
];

// --- TYPES ---

interface TreatmentLog {
    id: number;
    date: string;
    time: string;
    note: string;
    by: string;
    medicationId?: number;
    supplySrc?: 'Clinic' | 'Outside';
    actualInventoryId?: string; // Tracks which specific inventory item was actually given
}

interface Medication {
    id: number;
    inventoryId?: string; 
    type: string;
    name: string;
    genericName?: string; // Added generic name for smart search
    dosage: string;
    frequency: number;
    category: 'Conservative' | 'Pre-operative' | 'Operative' | 'Post-operative';
}

interface TreatmentTemplate {
    id: string;
    name: string;
    category: 'Conservative' | 'Pre-operative' | 'Operative' | 'Post-operative';
    diet: string;
    medications: Medication[];
    note: string;
}

interface RequestedDrug {
    id: string;
    name: string;
    type: string;
    strength: string;
    genericName: string;
    requestedBy: string;
    date: string;
    status: 'Pending' | 'Fulfilled';
}

// Sequential Order Block
interface ClinicalOrderBlock {
    id: string;
    date: string;
    time: string;
    category: 'Conservative' | 'Pre-operative' | 'Operative' | 'Post-operative';
    diet: string;
    medications: Medication[];
    note: string;
}

interface AdmissionRecord {
    admission_id: string;
    admission_date: string;
    patient_id: string;
    patient_name: string;
    doctor_id: string;
    doctor_name: string;
    referrer_id: string;
    referrer_name: string;
    indication: string;
    service_name: string;
    service_category: string;
    contract_type: 'Contact' | 'Non-Contact';
    contract_amount: number;
    clinical_orders: ClinicalOrderBlock[]; 
    doctor_rounds: TreatmentLog[];
    nurse_chart: TreatmentLog[];
    lab_investigations: InternalLabOrder[];
    discharge_date?: string;
    discharge_note?: string;
    bed_no?: string;
    patient_mobile?: string;
    mobile_relation?: string;
}

const emptyAdmission: AdmissionRecord = {
    admission_id: '',
    admission_date: new Date().toISOString().split('T')[0],
    patient_id: '',
    patient_name: '',
    doctor_id: '',
    doctor_name: '',
    referrer_id: '',
    referrer_name: '',
    indication: '',
    service_name: '',
    service_category: 'Conservative treatment',
    contract_type: 'Non-Contact',
    contract_amount: 0,
    clinical_orders: [],
    doctor_rounds: [],
    nurse_chart: [],
    lab_investigations: [],
    bed_no: '' 
};

export interface Indication {
    id: string;
    name: string;
}

export interface ServiceItemDef {
    id: string;
    name: string;
}

// --- INDOOR INVOICE TYPES ---
interface ServiceItem {
  id: number;
  service_type: string;
  service_provider: string;
  service_charge: number;
  quantity: number;
  line_total: number;
  discount: number;
  payable_amount: number;
  note: string;
  isClinicFund?: boolean; // New checkbox field
}

export interface IndoorInvoice {
  daily_id: string;
  monthly_id: string;
  yearly_id: string;
  invoice_date: string;
  admission_id: string; 
  patient_id: string;
  patient_name: string;
  patient_mobile?: string;
  patient_address?: string;
  patient_dob?: string;
  doctor_id?: string;
  doctor_name?: string;
  referrar_id?: string;
  referrar_name?: string;
  indication: string;
  serviceCategory: string;
  subCategory?: string; // Mandatory for Service Taken
  ot_details?: string;   // Persistent OT Details for this invoice
  services: string[]; 
  contact_bill: string;
  items: ServiceItem[];
  total_bill: number;
  total_discount: number;
  referrer_commission: number;
  payable_bill: number;
  paid_amount: number;
  due_bill: number;
  bill_pay_status: boolean;
  bill_by: string;
  bill_paid_by: string;
  notes: string;
  payment_method: string;
  bill_created_by: string;
  special_commission: number;
  commission_paid: number;
  last_modified?: string;
  special_discount_percent?: number;
  special_discount_amount?: number;
  net_payable?: number;
  admission_date?: string;
  discharge_date?: string;
  status?: string; 
  return_date?: string; // New: added for refund accounting
  created_at?: string;
  edit_history?: any[];
}

const emptyIndoorInvoice: IndoorInvoice = {
  daily_id: '',
  monthly_id: '',
  yearly_id: '',
  invoice_date: new Date().toISOString().split('T')[0],
  admission_id: '',
  patient_id: '',
  patient_name: '',
  patient_mobile: '',
  patient_address: '',
  patient_dob: '',
  doctor_id: '',
  doctor_name: '',
  referrar_id: '',
  referrar_name: '',
  indication: '',
  serviceCategory: 'Conservative treatment',
  subCategory: '',
  ot_details: '',
  services: [],
  contact_bill: '',
  items: [],
  total_bill: 0,
  total_discount: 0,
  referrer_commission: 0,
  payable_bill: 0,
  paid_amount: 0,
  due_bill: 0,
  bill_pay_status: false,
  bill_by: '',
  bill_paid_by: '',
  notes: '',
  payment_method: 'Cash',
  bill_created_by: '',
  special_commission: 0,
  commission_paid: 0,
  special_discount_percent: 0,
  special_discount_amount: 0,
  net_payable: 0,
  admission_date: '',
  discharge_date: '',
  status: 'Posted',
  created_at: '',
  edit_history: []
};

interface ClinicDueCollection {
  collection_id: string;
  invoice_id: string; 
  patient_name: string;
  collection_date: string;
  amount_collected: number;
  collected_by?: string;
}

interface ClinicCertificate {
    id: string;
    type: 'discharge' | 'birth' | 'death' | 'referral';
    admissionId: string;
    patientName: string;
    date: string;
    time: string;
    details: any; // Dynamic fields
    note: string;
    issuedBy: string;
    createdDate: string;
}

const monthOptions = [
    { value: 0, name: 'January' }, { value: 1, name: 'February' }, { value: 2, name: 'March' },
    { value: 3, name: 'April' }, { value: 4, name: 'May' }, { value: 5, name: 'June' },
    { value: 6, name: 'July' }, { value: 7, name: 'August' }, { value: 8, name: 'September' },
    { value: 9, name: 'October' }, { value: 10, name: 'November' }, { value: 11, name: 'December' }
];

const drugTypes = ['Tab', 'Cap', 'Inj', 'Inf', 'Syp', 'Susp', 'Suppository', 'Inhaler', 'Nebulizer', 'Catheter', 'Drop', 'Ointment', 'Cream', 'Gel'];
const drugFrequencies = [
    { label: '6 Hourly (1+1+1+1)', value: 6 },
    { label: '8 Hourly (1+1+1)', value: 8 },
    { label: '12 Hourly (1+0+1)', value: 12 },
    { label: '24 Hourly (1+0+0)', value: 24 },
    { label: 'Stat (Once)', value: 0 },
];
const dietOptions = ['NPO TFO', 'Liquid', 'Liquid and semisolid', 'Regular'];

const serviceCategoriesList = ["Conservative treatment", "Operation", "NVD and D&C", "O2 and nebulizer", "Plaster and Bandage", "Dressing", "Others"];

const serviceTypesList = [
    'Admission Fee', 'Doctor round fee', 'Doctor prescription fee', 'Bed rent', 'Service Charge',
    'Obstetrician/ Midwife', 'Anaesthetist', 'Assistant_1', 'Assistant_2', 'Medicine', 'Stuff_cost', 'Surgeon', 'Discharge writing fee',
    'OT Charge', '02(Oxygen)', 'Nebulization', 'Doctor food', 'Doctor donation', 'Vehicle rent', 'Dressing', 'Maintenance fee', 'Other'
];
const doctorServiceTypes = [
    "Doctor round fee", "Doctor prescription fee", "Obstetrician/ Midwife", "Surgeon", "Anaesthetist", "Assistant_1", "Assistant_2", "Discharge writing fee"
];

const clinicFundServiceTypes = ['Admission Fee', 'OT Charge', '02(Oxygen)', 'Nebulization', 'Dressing', 'Bed rent', 'Service Charge', 'Maintenance fee'];

const getFrequencyText = (freq: number) => {
    switch(freq) {
        case 6: return "1+1+1+1";
        case 8: return "1+1+1";
        case 12: return "1+0+1";
        case 24: return "1+0+0";
        case 0: return "Stat";
        default: return `${freq} Hourly`;
    }
};

// --- GENERIC MANAGER ---
const GenericManagerPage: React.FC<{
    title: string;
    placeholder: string;
    items: {id: string, name: string}[];
    setItems: React.Dispatch<React.SetStateAction<any[]>>;
    onClose: () => void;
    onSaveAndSelect: (id: string, name: string) => void;
    extraFields?: any;
}> = ({ title, placeholder, items, setItems, onClose, onSaveAndSelect, extraFields }) => {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { inputRef.current?.focus(); }, []);
    
    const handleSave = () => {
        if (!name.trim()) return;
        const newItem = { id: new Date().getTime().toString(), name: name.trim(), ...extraFields };
        setItems([...items, newItem]);
        onSaveAndSelect(newItem.id, newItem.name);
    };
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
            <div className="bg-[#1f2937] p-6 rounded-lg w-full max-w-md border border-gray-600 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
                <input ref={inputRef} type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-[#374151] border border-gray-600 rounded text-white mb-6 focus:ring-2 focus:ring-blue-500" placeholder={placeholder}/>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors">Save</button>
                </div>
            </div>
        </div>
    );
};

// --- MASTER DISCHARGE TEMPLATES & RICH EDITOR TYPES ---
interface DischargeMasterTemplate {
    id: string;
    title: string;
    content: string;
    isCustom?: boolean;
}

interface PatientSavedDischarge {
    id: string;
    admissionId: string;
    patientName: string;
    patientId: string;
    dischargeDate: string;
    htmlContent: string;
    savedAt: string;
    consultant: string;
}

const DEFAULT_DISCHARGE_TEMPLATES: DischargeMasterTemplate[] = [
    {
        id: 'lscs_csection',
        title: 'সিজারিয়ান সেকশন (LSCS / C-Section) পোস্ট-অপারেটিভ ডিসচার্জ',
        content: `
<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:10px; font-size:15px; font-weight:bold;">১. রোগ নির্ণয় ও অপারেশনের বিবরণ (Diagnosis & Procedure)</h3>
<p style="margin:4px 0;"><b>Clinical Diagnosis:</b> Full Term Pregnancy with Previous LSCS / Foetal Distress / Cephalopelvic Disproportion (CPD).</p>
<p style="margin:4px 0;"><b>Procedure Done:</b> Lower Segment Caesarean Section (LSCS) with Pfannenstiel incision under Spinal Anaesthesia.</p>
<p style="margin:4px 0;"><b>Baby Summary:</b> Single live born baby, cried immediately at birth. Birth Weight: <b>3.2 kg</b>. APGAR: 8/10 at 1 min, 10/10 at 5 min.</p>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">২. ছুটিকালীন ঔষধ সেবন বিধি (Discharge Medications)</h3>
<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">ঔষধের নাম (Medicine Name)</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">মাত্রা ও নিয়ম (Dosage)</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:center;">সেবনের সময়</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:center;">মেয়াদ (Days)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:6px; border:1px solid #cbd5e1;"><b>Cap. Cefixime 200mg</b></td>
      <td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে ক্যাপসুল দিনে ২ বার (১+০+১)</td>
      <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">ভরা পেটে</td>
      <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">৭ দিন</td>
    </tr>
    <tr>
      <td style="padding:6px; border:1px solid #cbd5e1;"><b>Tab. Paracetamol 500mg</b></td>
      <td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে ট্যাবলেট দিনে ৩ বার (১+১+১)</td>
      <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">ব্যথা হলে খাবার পর</td>
      <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">৫ দিন</td>
    </tr>
    <tr>
      <td style="padding:6px; border:1px solid #cbd5e1;"><b>Cap. Esomeprazole 20mg</b></td>
      <td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে ক্যাপসুল দিনে ২ বার (১+০+১)</td>
      <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">খাবার ২০ মিনিট আগে</td>
      <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">১৪ দিন</td>
    </tr>
    <tr>
      <td style="padding:6px; border:1px solid #cbd5e1;"><b>Tab. Calcium + Vitamin D3</b></td>
      <td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে ট্যাবলেট দিনে ১ বার (০+১+০)</td>
      <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">দুপুরে খাবার পর</td>
      <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">১ মাস</td>
    </tr>
  </tbody>
</table>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">৩. বিশেষ যত্ন ও উপদেশ (Care & Advice)</h3>
<ul style="margin:4px 0; padding-left:22px; line-height:1.6;">
  <li>অপারেশনের সেলাইয়ের স্থান সম্পূর্ণ শুকনা ও পরিষ্কার রাখবেন। সেলাই না কাটা পর্যন্ত পানি লাগানো যাবে না।</li>
  <li>নবজাতক শিশুকে নিয়মিত মায়ের শালদুধ এবং শুধুমাত্র বুকের দুধ পান করাবেন (প্রথম ৬ মাস শুধুমাত্র বুকের দুধ)।</li>
  <li>ভারী জিনিসপত্র তোলা ও অতিরিক্ত পরিশ্রম থেকে বিরত থাকবেন। প্রচুর পানি, পুষ্টিকর মাছ-মাংস ও সবুজ শাকসবজি খাবেন।</li>
</ul>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">৪. ফলো-আপ ও পরবর্তী সাক্ষাত (Follow-up)</h3>
<p style="margin:4px 0;">আগামী <b>৭ থেকে ১০ দিন পর</b> সেলাই কাটা ও নবজাতকের চেকআপের জন্য হাসপাতালে উপস্থিত হবেন। তীব্র পেটব্যথা, অতিরিক্ত রক্তক্ষরণ, সেলাইয়ে পুঁজ বা জ্বর দেখা দিলে তাৎক্ষণিক জরুরি বিভাগে যোগাযোগ করবেন।</p>
`
    },
    {
        id: 'nvd_normal_delivery',
        title: 'স্বাভাবিক প্রসব (Normal Vaginal Delivery - NVD) ডিসচার্জ টেমপ্লেট',
        content: `
<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:10px; font-size:15px; font-weight:bold;">১. প্রসব ও নবজাতকের তথ্য (Delivery Summary)</h3>
<p style="margin:4px 0;"><b>Diagnosis:</b> Normal Vaginal Delivery (NVD) at Term.</p>
<p style="margin:4px 0;"><b>Procedure:</b> Spontaneous delivery under aseptic precautions. Episiotomy repaired in layers. Placenta complete.</p>
<p style="margin:4px 0;"><b>Baby Details:</b> Healthy newborn, cried immediately, active and pink. Birth Weight: <b>3.1 kg</b>.</p>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">২. ছুটিকালীন ঔষধ সেবন বিধি (Medications)</h3>
<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">ঔষধের নাম</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">মাত্রা ও নিয়ম</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:center;">সেবনের সময়</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:center;">মেয়াদ</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:6px; border:1px solid #cbd5e1;"><b>Cap. Amoxicillin 500mg</b></td><td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে দিনে ৩ বার (১+১+১)</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">খাবার পর</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">৫ দিন</td></tr>
    <tr><td style="padding:6px; border:1px solid #cbd5e1;"><b>Tab. Paracetamol 500mg</b></td><td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে দিনে ৩ বার (১+১+১)</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">ব্যথা হলে</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">৩ দিন</td></tr>
    <tr><td style="padding:6px; border:1px solid #cbd5e1;"><b>Tab. Iron + Folic Acid</b></td><td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে রাতে (০+০+১)</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">খাবার পর</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">১ মাস</td></tr>
  </tbody>
</table>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">৩. যত্ন ও ফলো-আপ (Care & Follow-up)</h3>
<p style="margin:4px 0;">ব্যক্তিগত পরিচ্ছন্নতা বজায় রাখবেন। শিশুকে শুধুমাত্র বুকের দুধ দিন। ৭ দিন পর ফলো-আপে আসবেন।</p>
`
    },
    {
        id: 'appendectomy_surgery',
        title: 'এপেন্ডিসেক্টমি / সাধারণ সার্জারি (Appendectomy / General Surgery) টেমপ্লেট',
        content: `
<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:10px; font-size:15px; font-weight:bold;">১. অপারেশনের বিবরণ (Operative Findings)</h3>
<p style="margin:4px 0;"><b>Diagnosis:</b> Acute Appendicitis / Recurrent Appendicitis.</p>
<p style="margin:4px 0;"><b>Operation:</b> Open / Laparoscopic Appendectomy under General / Spinal Anaesthesia. Inflamed appendix removed and sent for Histopathology.</p>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">২. ছুটিকালীন ঔষধপত্র (Discharge Medications)</h3>
<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">ঔষধের নাম</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">মাত্রা</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:center;">নিয়ম</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:center;">দিন</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:6px; border:1px solid #cbd5e1;"><b>Cap. Cefuroxime 500mg</b></td><td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে দিনে ২ বার (১+০+১)</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">খাবার পর</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">৭ দিন</td></tr>
    <tr><td style="padding:6px; border:1px solid #cbd5e1;"><b>Tab. Metronidazole 400mg</b></td><td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে দিনে ৩ বার (১+১+১)</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">খাবার পর</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">৫ দিন</td></tr>
    <tr><td style="padding:6px; border:1px solid #cbd5e1;"><b>Tab. Ketorolac 10mg</b></td><td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে দিনে ২ বার (১+০+১)</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">ভরা পেটে (ব্যথা হলে)</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">৩ দিন</td></tr>
  </tbody>
</table>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">৩. পরামর্শ ও পরবর্তী সাক্ষাত</h3>
<p style="margin:4px 0;">সেলাইয়ের স্থান শুকনা রাখবেন। ৭ দিন পর সেলাই কাটতে আসবেন এবং বায়োপসি রিপোর্ট সংগ্রহ করবেন।</p>
`
    },
    {
        id: 'conservative_medicine',
        title: 'মেডিসিন ও কনজারভেটিভ চিকিৎসা (Conservative Medical Management) টেমপ্লেট',
        content: `
<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:10px; font-size:15px; font-weight:bold;">১. চিকিৎসার বিবরণ (Clinical Management Summary)</h3>
<p style="margin:4px 0;"><b>Diagnosis:</b> Acute Gastroenteritis / Enteric Fever / Bronchial Asthma / UTI.</p>
<p style="margin:4px 0;"><b>Hospital Course:</b> Treated conservatively with IV fluids, antibiotics, bronchodilators and supportive therapy. Patient improved clinically.</p>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">২. পরবর্তী ঔষধ সেবন বিধি (Discharge Prescription)</h3>
<p style="margin:4px 0;">প্রেসক্রিপশন অনুযায়ী চিকিৎসকের নির্দেশিত ঔষধ সেবন করবেন। পর্যাপ্ত বিশ্রাম নিবেন।</p>
`
    }
];

// --- MS WORD STYLE TOOLBAR COMPONENT ---
const MsWordToolbar: React.FC<{ onExec: (cmd: string, arg?: string) => void; onInsertTable?: () => void }> = ({ onExec, onInsertTable }) => {
    const btnCls = "p-1.5 px-2 bg-slate-100 hover:bg-slate-200 active:bg-blue-100 border border-slate-300 rounded text-xs font-bold text-slate-700 shadow-sm transition-all cursor-pointer flex items-center justify-center";
    return (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-gradient-to-r from-slate-100 to-slate-200 border-b border-slate-300 rounded-t-xl select-none">
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('undo'); }} className={btnCls} title="Undo">↺</button>
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('redo'); }} className={btnCls} title="Redo">↻</button>
            </div>
            
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <select onChange={e => onExec('fontName', e.target.value)} className="bg-white border border-slate-300 rounded text-xs px-2 h-7 font-medium text-slate-800 outline-none">
                    <option value="">Font Family</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Cambria">Cambria</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Calibri">Calibri</option>
                    <option value="Verdana">Verdana</option>
                    <option value="SolaimanLipi">SolaimanLipi (বাংলা)</option>
                </select>
                <select onChange={e => {
                    const val = e.target.value;
                    if (!val) return;
                    if (val === 'h1' || val === 'h2' || val === 'h3' || val === 'p') {
                        onExec('formatBlock', `<${val}>`);
                    } else {
                        onExec('fontSize', val);
                    }
                }} className="bg-white border border-slate-300 rounded text-xs px-2 h-7 font-medium text-slate-800 outline-none">
                    <option value="">Font Size / Heading</option>
                    <option value="h1">Heading 1 (বড় শিরোনাম)</option>
                    <option value="h2">Heading 2 (মাঝারি শিরোনাম)</option>
                    <option value="h3">Heading 3 (উপ-শিরোনাম)</option>
                    <option value="p">Paragraph / Normal Text</option>
                    <option value="4">Large Text</option>
                    <option value="2">Small Text</option>
                </select>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('bold'); }} className={`${btnCls} font-black`} title="Bold">B</button>
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('italic'); }} className={`${btnCls} italic font-serif`} title="Italic">I</button>
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('underline'); }} className={`${btnCls} underline`} title="Underline">U</button>
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('strikeThrough'); }} className={`${btnCls} line-through`} title="Strike">S</button>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('justifyLeft'); }} className={btnCls} title="Align Left">⫷ Left</button>
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('justifyCenter'); }} className={btnCls} title="Align Center">☰ Center</button>
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('justifyRight'); }} className={btnCls} title="Align Right">Right ⫸</button>
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('justifyFull'); }} className={btnCls} title="Justify">Justify</button>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('insertUnorderedList'); }} className={btnCls} title="Bullet List">• Bullets</button>
                <button type="button" onMouseDown={e => { e.preventDefault(); onExec('insertOrderedList'); }} className={btnCls} title="Numbered List">1. Numbers</button>
            </div>

            <div className="flex items-center gap-1.5 border-r border-slate-300 pr-2">
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer">
                    Color:
                    <input type="color" onChange={e => onExec('foreColor', e.target.value)} className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer" title="Text Color"/>
                </label>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer">
                    Highlight:
                    <input type="color" onChange={e => onExec('hiliteColor', e.target.value)} className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer" title="Highlight Color"/>
                </label>
            </div>

            {onInsertTable && (
                <button type="button" onMouseDown={e => { e.preventDefault(); onInsertTable(); }} className="p-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1">
                    📊 + ঔষধ টেবিল যোগ
                </button>
            )}

            <button type="button" onMouseDown={e => { e.preventDefault(); onExec('insertHorizontalRule'); }} className={btnCls} title="Horizontal Divider Line">― Line</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); onExec('removeFormat'); }} className={`${btnCls} text-rose-600`} title="Clear Formatting">Clear</button>
        </div>
    );
};

// --- CERTIFICATE MODAL ENGINE WITH MS WORD EDITOR ---
const CertificateModal: React.FC<{
    type: 'discharge' | 'birth' | 'death' | 'referral';
    admissions: AdmissionRecord[];
    patients: Patient[];
    doctors: Doctor[];
    onClose: () => void;
}> = ({ type, admissions, patients, doctors, onClose }) => {
    const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
    const [selectedAdmissionId, setSelectedAdmissionId] = useState('');
    const [savedCerts, setSavedCerts] = useState<ClinicCertificate[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(`ncd_certs_${type}`) || '[]');
        } catch (e) {
            console.error("Error parsing saved certs", e);
            return [];
        }
    });
    
    // Form State
    const [certData, setCertData] = useState<any>({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        details: {},
        note: '',
        issuedBy: ''
    });

    const certEditorRef = useRef<HTMLDivElement>(null);

    const selectedAdmission = (Array.isArray(admissions) ? admissions : []).find(a => a && a.admission_id === selectedAdmissionId);
    const selectedPatient = selectedAdmission ? patients.find(p => p.pt_id === selectedAdmission.patient_id) : null;

    useEffect(() => {
        if (selectedAdmission) {
            const timer = setTimeout(() => {
                if (type === 'birth') {
                    setCertData((prev: any) => ({
                        ...prev,
                        details: { ...prev.details, sex: selectedPatient?.gender === 'Female' ? 'Female' : 'Male', weight: '3.0kg', deliveryType: 'Normal' },
                        note: prev.note || `<p>This is to certify that a <b>${selectedPatient?.gender === 'Female' ? 'Female' : 'Male'}</b> baby was safely delivered on <b>${prev.date}</b> at <b>${prev.time}</b> under clinical supervision. The infant cried immediately at birth. Both mother and neonate were managed as per hospital obstetric protocol.</p>`
                    }));
                } else if (type === 'death') {
                    setCertData((prev: any) => ({
                        ...prev,
                        details: { ...prev.details, cause: 'Cardio-respiratory Failure', certBy: selectedAdmission.doctor_name },
                        note: prev.note || `<p>This is to certify that the above mentioned patient expired on <b>${prev.date}</b> at <b>${prev.time}</b> while under active clinical treatment. Cause of death is clinically attributed to Cardio-respiratory Failure.</p>`
                    }));
                } else if (type === 'referral') {
                    setCertData((prev: any) => ({
                        ...prev,
                        details: { ...prev.details, refTo: 'Sirajgonj Sadar Hospital', reason: 'Higher Level Care & ICU Management' },
                        note: prev.note || `<p>The patient is being referred to <b>Sirajgonj Sadar Hospital</b> for advanced management and specialist evaluation. Initial emergency resuscitation and supportive care have been administered.</p>`
                    }));
                } else if (type === 'discharge') {
                    setCertData((prev: any) => ({
                        ...prev,
                        details: { ...prev.details, dischargeStatus: 'Recovered / Stable' },
                        note: prev.note || `<p>The patient was admitted on <b>${selectedAdmission.admission_date}</b> with <b>${selectedAdmission.indication || 'Clinical symptoms'}</b> and managed under Dr. <b>${selectedAdmission.doctor_name || 'Consultant'}</b>. The patient has recovered satisfactorily and is medically fit for discharge today.</p>`
                    }));
                }
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [selectedAdmissionId, type, selectedPatient, selectedAdmission]);

    // Update innerHTML when certData.note changes
    useEffect(() => {
        if (certEditorRef.current && certEditorRef.current.innerHTML !== certData.note) {
            certEditorRef.current.innerHTML = certData.note || '';
        }
    }, [certData.note]);

    const handleExec = (cmd: string, arg?: string) => {
        document.execCommand(cmd, false, arg);
        if (certEditorRef.current) {
            setCertData((prev: any) => ({ ...prev, note: certEditorRef.current?.innerHTML || '' }));
            certEditorRef.current.focus();
        }
    };

    const handleSave = () => {
        if (!selectedAdmissionId) return alert("প্রথমে পেশেন্ট সিলেক্ট করুন");
        const currentHtml = certEditorRef.current ? certEditorRef.current.innerHTML : certData.note;
        const newCert: ClinicCertificate = {
            id: `CERT-${new Date().getTime()}`,
            type,
            admissionId: selectedAdmissionId,
            patientName: selectedPatient?.pt_name || '',
            date: certData.date,
            time: certData.time,
            details: certData.details,
            note: currentHtml,
            issuedBy: certData.issuedBy,
            createdDate: new Date().toISOString()
        };
        const updated = [newCert, ...savedCerts];
        setSavedCerts(updated);
        localStorage.setItem(`ncd_certs_${type}`, JSON.stringify(updated));
        alert("সার্টিফিকেট সফলভাবে সেভ করা হয়েছে!");
    };

    const deleteCert = (id: string) => {
        if (confirm("মুছে ফেলতে চান?")) {
            const updated = savedCerts.filter(c => c.id !== id);
            setSavedCerts(updated);
            localStorage.setItem(`ncd_certs_${type}`, JSON.stringify(updated));
        }
    };

    const handlePrint = (cert: any = null) => {
        const currentHtml = certEditorRef.current ? certEditorRef.current.innerHTML : certData.note;
        const data = cert || {
            ...certData,
            note: currentHtml,
            patientName: selectedPatient?.pt_name,
            ptAge: selectedPatient?.ageY,
            ptSex: selectedPatient?.gender,
            ptId: selectedPatient?.pt_id,
            admId: selectedAdmission?.admission_id,
            admDate: selectedAdmission?.admission_date,
            consultant: selectedAdmission?.doctor_name,
            address: selectedPatient?.address,
            mobile: selectedPatient?.mobile
        };

        if (!data.patientName) return alert("প্রিন্ট করার মতো কোনো ডাটা নেই।");

        const win = window.open('', '_blank');
        if (!win) return;

        const title = type === 'birth' ? 'BIRTH CERTIFICATE' : type === 'death' ? 'DEATH CERTIFICATE' : type === 'discharge' ? 'DISCHARGE CERTIFICATE' : 'REFERRAL SLIP';

        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8"/>
                    <title>${title} - ${data.patientName}</title>
                    <style>
                        @page { size: A4; margin: 15mm; }
                        body { font-family: 'Times New Roman', serif; margin: 0; padding: 10px; color: #111; }
                        .pad-border { border: 3px double #1e3a8a; padding: 25px; min-height: 250mm; position: relative; box-sizing: border-box; }
                        .watermark { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 70pt; color: rgba(30, 58, 138, 0.04); font-weight: 900; pointer-events: none; white-space: nowrap; }
                        .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 20px; }
                        .h1 { font-size: 26px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; margin: 0; }
                        .sub { font-size: 13px; font-weight: bold; margin-top: 4px; color: #334155; }
                        .reg { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-top: 3px; }
                        .badge { display: inline-block; border: 2px solid #1e3a8a; background: #f8fafc; padding: 6px 30px; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-top: 15px; }
                        .pt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 14px; margin: 20px 0; border: 1px solid #cbd5e1; background: #f8fafc; padding: 12px 16px; border-radius: 6px; }
                        .pt-grid b { color: #1e3a8a; }
                        .content-body { font-size: 15px; line-height: 1.8; margin-top: 20px; }
                        .content-body table { width: 100%; border-collapse: collapse; margin: 12px 0; }
                        .content-body th, .content-body td { border: 1px solid #94a3b8; padding: 6px 10px; font-size: 13px; }
                        .signatures { position: absolute; bottom: 25px; left: 25px; right: 25px; display: flex; justify-content: space-between; }
                        .sig-line { width: 180px; border-top: 1px solid #000; text-align: center; font-size: 12px; font-weight: bold; padding-top: 4px; }
                    </style>
                </head>
                <body>
                    <div class="pad-border">
                        <div class="watermark">NIRAMOY CLINIC</div>
                        <div class="header">
                            <div class="h1">Niramoy Clinic & Diagnostic</div>
                            <div class="sub">Hospital Road, Enayetpur, Sirajgonj | Hotline: 01730 923007</div>
                            <div class="reg">Govt. License / Reg. No: ${CLINIC_REGISTRATION}</div>
                            <div class="badge">${title}</div>
                        </div>

                        <div class="pt-grid">
                            <div><b>Patient Name:</b> ${data.patientName}</div>
                            <div><b>Patient ID:</b> ${data.ptId || data.patient_id || 'N/A'}</div>
                            <div><b>Age / Gender:</b> ${data.ptAge || '...'}Y / ${data.ptSex || '...'}</div>
                            <div><b>Admission ID:</b> ${data.admId || data.admissionId || 'N/A'}</div>
                            <div><b>Admission Date:</b> ${data.admDate || '...'}</div>
                            <div><b>Doctor / MO:</b> ${data.consultant || 'Authorized Medical Officer'}</div>
                            <div><b>Contact Mobile:</b> ${data.mobile || 'N/A'}</div>
                            <div><b>Certificate Date:</b> ${data.date} (${data.time || ''})</div>
                        </div>

                        <div class="content-body">
                            ${data.note || ''}
                        </div>

                        <div class="signatures">
                            <div class="sig-line">Nursing Officer</div>
                            <div class="sig-line">Medical Officer / Consultant</div>
                        </div>
                    </div>
                    <script>
                        window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 600); };
                    </script>
                </body>
            </html>
        `;
        win.document.write(html);
        win.document.close();
    };

    const inputClass = "w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none";
    const labelClass = "text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block";

    return (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-slate-900 rounded-[2rem] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden">
                <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/40"><FileTextIcon className="w-5 h-5 text-white" /></div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{type.replace('_', ' ')} System (MS Word Mode)</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">NCD Hospital Management System</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                            <button onClick={() => setActiveTab('generate')} className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'generate' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>New Certificate</button>
                            <button onClick={() => setActiveTab('saved')} className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'saved' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Saved Records ({savedCerts.length})</button>
                        </div>
                        <button onClick={onClose} className="p-2 bg-rose-500/20 text-rose-300 rounded-xl hover:bg-rose-600 hover:text-white transition-all text-xl font-bold ml-2">&times;</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-950">
                    {activeTab === 'generate' ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-inner">
                                <div className="col-span-2">
                                    <label className={labelClass}>Select Target Patient / Admission *</label>
                                    <select value={selectedAdmissionId} onChange={e => setSelectedAdmissionId(e.target.value)} className={inputClass}>
                                        <option value="">-- Select Patient --</option>
                                        {(Array.isArray(admissions) ? admissions : []).map(a => a && <option key={a.admission_id} value={a.admission_id}>{a.patient_name} ({a.admission_id})</option>)}
                                    </select>
                                </div>
                                <div><label className={labelClass}>Event Date</label><input type="date" value={certData.date} onChange={e => setCertData({ ...certData, date: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Event Time</label><input type="time" value={certData.time} onChange={e => setCertData({ ...certData, time: e.target.value })} className={inputClass} /></div>

                                {type === 'birth' && (
                                    <>
                                        <div><label className={labelClass}>Baby Gender</label><select value={certData.details.sex || 'Male'} onChange={e => setCertData({ ...certData, details: { ...certData.details, sex: e.target.value } })} className={inputClass}><option>Male</option><option>Female</option></select></div>
                                        <div><label className={labelClass}>Baby Weight</label><input value={certData.details.weight || ''} onChange={e => setCertData({ ...certData, details: { ...certData.details, weight: e.target.value } })} className={inputClass} placeholder="e.g. 3.2kg" /></div>
                                        <div className="col-span-2"><label className={labelClass}>Delivery Mode</label><select value={certData.details.deliveryType || 'Normal'} onChange={e => setCertData({ ...certData, details: { ...certData.details, deliveryType: e.target.value } })} className={inputClass}><option>Normal Delivery (NVD)</option><option>LUCS / C-Section</option><option>Forceps / Assisted</option></select></div>
                                    </>
                                )}

                                {type === 'death' && (
                                    <>
                                        <div className="col-span-2"><label className={labelClass}>Cause of Death</label><input value={certData.details.cause || ''} onChange={e => setCertData({ ...certData, details: { ...certData.details, cause: e.target.value } })} className={inputClass} placeholder="e.g. Cardio-respiratory failure" /></div>
                                        <div className="col-span-2"><label className={labelClass}>Certified By (Doctor)</label><input value={certData.details.certBy || ''} onChange={e => setCertData({ ...certData, details: { ...certData.details, certBy: e.target.value } })} className={inputClass} /></div>
                                    </>
                                )}
                            </div>

                            {/* MS Word Rich Editor for Notes */}
                            <div className="bg-white rounded-2xl border border-slate-300 shadow-xl overflow-hidden text-slate-800">
                                <div className="p-3 bg-slate-100 border-b border-slate-300 flex justify-between items-center">
                                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                                        📝 Certificate Body Text (MS Word Style Editable Canvas)
                                    </span>
                                </div>
                                <MsWordToolbar onExec={handleExec} />
                                <div
                                    ref={certEditorRef}
                                    contentEditable
                                    onInput={() => setCertData((prev: any) => ({ ...prev, note: certEditorRef.current?.innerHTML || '' }))}
                                    className="p-8 min-h-[260px] outline-none text-slate-900 bg-white font-serif leading-relaxed text-base"
                                    style={{ minHeight: '260px' }}
                                />
                            </div>

                            {selectedAdmissionId && (
                                <div className="flex gap-4">
                                    <button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3.5 rounded-xl text-white font-black uppercase text-xs shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"><SaveIcon size={18} /> Save Certificate to Records</button>
                                    <button onClick={() => handlePrint()} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3.5 rounded-xl text-white font-black uppercase text-xs shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"><PrinterIcon size={18} /> Print Certificate Slip (A4)</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            {(Array.isArray(savedCerts) ? savedCerts : []).map(cert => cert && (
                                <div key={cert.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-blue-500/50 transition-all shadow-md">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center font-black text-cyan-400 text-xs uppercase shadow-inner border border-slate-700">
                                            {cert.date?.split('-')[2] || ''} {cert.date?.split('-')[1] ? monthOptions[parseInt(cert.date.split('-')[1]) - 1]?.name?.substring(0, 3) : ''}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white uppercase text-base leading-none">{cert.patientName}</h4>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">ID: {cert.admissionId} | Issued: {new Date(cert.createdDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handlePrint(cert)} className="p-2.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white rounded-xl transition-all"><PrinterIcon size={16} /></button>
                                        <button onClick={() => deleteCert(cert.id)} className="p-2.5 bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white rounded-xl transition-all"><TrashIcon size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            {(Array.isArray(savedCerts) ? savedCerts : []).length === 0 && (
                                <div className="py-24 text-center opacity-30 flex flex-col items-center">
                                    <FileTextIcon size={80} className="text-slate-500" />
                                    <p className="text-2xl font-black uppercase tracking-widest mt-4 text-slate-400">No Saved Certificates</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- DISCHARGE RX MASTER & MS WORD-STYLE TEMPLATE EDITOR MODAL ---
const DischargeRxMasterModal: React.FC<{
    admissions: AdmissionRecord[];
    patients: Patient[];
    doctors: Doctor[];
    medicines: Medicine[];
    onClose: () => void;
}> = ({ admissions, patients, doctors, medicines, onClose }) => {
    const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeView, setActiveView] = useState<'editor' | 'saved_letters'>('editor');

    const [dischargeMeds, setDischargeMeds] = useState<Array<{ id: string; name: string; dosage: string; timing: string; duration: string }>>([
        { id: '1', name: 'Cap. Cefixime 200mg', dosage: '১ টি করে দিনে ২ বার (১+০+১)', timing: 'ভরা পেটে', duration: '৭ দিন' },
        { id: '2', name: 'Tab. Paracetamol 500mg', dosage: '১ টি করে দিনে ৩ বার (১+১+১)', timing: 'ব্যথা হলে খাবার পর', duration: '৫ দিন' }
    ]);

    const addDischargeMedRow = () => {
        setDischargeMeds(prev => [...prev, { id: 'MED-' + Math.random().toString(36).substring(2, 9), name: '', dosage: '১ টি করে দিনে ২ বার', timing: 'খাবার পর', duration: '৫ দিন' }]);
    };

    const removeDischargeMedRow = (id: string) => {
        setDischargeMeds(prev => prev.filter(m => m.id !== id));
    };

    const updateDischargeMedRow = (id: string, field: string, val: string) => {
        setDischargeMeds(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
    };

    // Templates State
    const [templates, setTemplates] = useState<DischargeMasterTemplate[]>(() => {
        try {
            const saved = localStorage.getItem('ncd_master_discharge_templates');
            return saved ? JSON.parse(saved) : DEFAULT_DISCHARGE_TEMPLATES;
        } catch {
            return DEFAULT_DISCHARGE_TEMPLATES;
        }
    });
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('lscs_csection');
    const [savedDischarges, setSavedDischarges] = useState<PatientSavedDischarge[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('ncd_patient_saved_discharges') || '[]');
        } catch {
            return [];
        }
    });

    const [documentHtml, setDocumentHtml] = useState<string>('');
    const docEditorRef = useRef<HTMLDivElement>(null);

    const selectedAdmission = (Array.isArray(admissions) ? admissions : []).find(a => a && a.admission_id === selectedAdmissionId);
    const selectedPatient = selectedAdmission ? (Array.isArray(patients) ? patients : []).find(p => p && p.pt_id === selectedAdmission.patient_id) : null;

    // Load template or generate dynamic orders content
    const loadTemplateContent = (templateId: string, adm: AdmissionRecord | null = selectedAdmission || null) => {
        setSelectedTemplateId(templateId);
        if (templateId === 'auto_live_orders' && adm) {
            // Dynamically compile clinical orders, doctor rounds, nurse chart
            const liveHtml = `
<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:10px; font-size:15px; font-weight:bold;">১. রোগ নির্ণয় ও চিকিৎসার সারাংশ (Clinical Diagnosis & Course)</h3>
<p style="margin:4px 0;"><b>Clinical Indication:</b> ${adm.indication || 'Indoor Medical Care'}</p>
<p style="margin:4px 0;"><b>Treating Consultant:</b> Dr. ${adm.doctor_name || 'Resident Medical Officer'}</p>
<p style="margin:4px 0;"><b>Bed / Ward:</b> ${adm.bed_no || 'Hospital Bed'} | <b>Contract:</b> ${adm.contract_type || 'Non-Contact'}</p>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">২. ছুটিকালীন চিকিৎসা ও ঔষধ সেবন বিধি (Clinical Orders Prescribed)</h3>
<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">তারিখ ও সময়</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">ক্যাটাগরি</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">ঔষধের বিবরণ (Medications & Dosage)</th>
    </tr>
  </thead>
  <tbody>
    ${(Array.isArray(adm.clinical_orders) && adm.clinical_orders.length > 0)
        ? adm.clinical_orders.map(o => o && `
            <tr>
              <td style="padding:6px; border:1px solid #cbd5e1;">${o.date || ''} ${o.time || ''}</td>
              <td style="padding:6px; border:1px solid #cbd5e1;">${o.category || 'Conservative'}</td>
              <td style="padding:6px; border:1px solid #cbd5e1;">
                ${(Array.isArray(o.medications) ? o.medications : []).map(m => m && `<b>• ${m.type || 'Tab'} ${m.name || ''}</b> - মাত্রা: ${m.dosage || '1+0+1'} (Frequency: ${m.frequency || 8}h)`).join('<br/>') || 'No specific medications'}
                ${o.note ? `<br/><i style="color:#64748b;">Note: ${o.note}</i>` : ''}
              </td>
            </tr>
          `).join('')
        : '<tr><td colspan="3" style="padding:8px; text-align:center; color:#94a3b8;">কোনো ক্লিনিক্যাল অর্ডার এন্ট্রি পাওয়া যায়নি।</td></tr>'
    }
  </tbody>
</table>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">৩. ডাক্তারের রাউন্ড নোট (Doctor Round Notes)</h3>
<ul style="margin:4px 0; padding-left:20px;">
  ${(Array.isArray(adm.doctor_rounds) && adm.doctor_rounds.length > 0)
      ? adm.doctor_rounds.map(r => r && `<li><b>${r.date || ''} ${r.time || ''} (Dr. ${r.by || adm.doctor_name}):</b> ${r.note || 'Patient examined and stable.'}</li>`).join('')
      : '<li>Patient examined routinely during hospital stay. Recovery satisfactory.</li>'
  }
</ul>

<h3 style="color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:4px; margin-top:14px; font-size:15px; font-weight:bold;">৪. ফলো-আপ ও পরবর্তী পরামর্শ (Follow-up Advice)</h3>
<p style="margin:4px 0;">প্রেসক্রিপশন অনুযায়ী সকল ঔষধ নিয়মিত সেবন করবেন। আগামী ৭ দিন পর বহিঃবিভাগে ফলো-আপের জন্য আসবেন। জরুরি প্রয়োজনে ২৪ ঘণ্টা হাসপাতাল হটলাইনে যোগাযোগ করুন।</p>
            `;
            setDocumentHtml(liveHtml);
            if (docEditorRef.current) docEditorRef.current.innerHTML = liveHtml;
            return;
        }

        const target = templates.find(t => t.id === templateId) || DEFAULT_DISCHARGE_TEMPLATES[0];
        setDocumentHtml(target.content);
        if (docEditorRef.current) docEditorRef.current.innerHTML = target.content;
    };

    // When selected admission changes, load current template or auto live orders
    useEffect(() => {
        if (selectedAdmission) {
            loadTemplateContent(selectedTemplateId, selectedAdmission);
        } else if (admissions.length > 0 && !selectedAdmissionId) {
            setSelectedAdmissionId(admissions[0].admission_id);
            loadTemplateContent(selectedTemplateId, admissions[0]);
        }
    }, [selectedAdmissionId]);

    const handleExec = (cmd: string, arg?: string) => {
        document.execCommand(cmd, false, arg);
        if (docEditorRef.current) {
            setDocumentHtml(docEditorRef.current.innerHTML);
            docEditorRef.current.focus();
        }
    };

    const handleInsertMedicineTable = () => {
        const tableHtml = `
<table style="width:100%; border-collapse:collapse; margin:10px 0; font-size:12px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">ঔষধের নাম (Medicine)</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:left;">মাত্রা ও সময় (Dosage)</th>
      <th style="padding:6px; border:1px solid #cbd5e1; text-align:center;">মেয়াদ (Days)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:6px; border:1px solid #cbd5e1;">Tab. ____________________</td>
      <td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে দিনে ৩ বার (খাবার পর)</td>
      <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">৫ দিন</td>
    </tr>
    <tr>
      <td style="padding:6px; border:1px solid #cbd5e1;">Cap. ____________________</td>
      <td style="padding:6px; border:1px solid #cbd5e1;">১ টি করে দিনে ২ বার (খাবার আগে)</td>
      <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">৭ দিন</td>
    </tr>
  </tbody>
</table>
        `;
        document.execCommand('insertHTML', false, tableHtml);
        if (docEditorRef.current) setDocumentHtml(docEditorRef.current.innerHTML);
    };

    const handleSaveNewMasterTemplate = () => {
        const title = prompt("নতুন মাস্টার টেমপ্লেটের নাম লিখুন (যেমন: অর্থোপেডিক পোস্ট-অপারেটিভ ডিসচার্জ):");
        if (!title || !title.trim()) return;
        const currentContent = docEditorRef.current ? docEditorRef.current.innerHTML : documentHtml;
        const newTemplate: DischargeMasterTemplate = {
            id: `custom_${Date.now()}`,
            title: title.trim(),
            content: currentContent,
            isCustom: true
        };
        const updated = [...templates, newTemplate];
        setTemplates(updated);
        localStorage.setItem('ncd_master_discharge_templates', JSON.stringify(updated));
        setSelectedTemplateId(newTemplate.id);
        alert(`"${newTemplate.title}" মাস্টার টেমপ্লেট লাইব্রেরিতে সফলভাবে সেভ করা হয়েছে!`);
    };

    const handleDeleteTemplate = (id: string) => {
        if (!confirm("আপনি কি নিশ্চিত যে এই কাস্টম টেমপ্লেটটি মুছে ফেলতে চান?")) return;
        const updated = templates.filter(t => t.id !== id);
        setTemplates(updated);
        localStorage.setItem('ncd_master_discharge_templates', JSON.stringify(updated));
        setSelectedTemplateId(updated[0]?.id || 'lscs_csection');
        loadTemplateContent(updated[0]?.id || 'lscs_csection');
    };

    const handleSaveDischargeForPatient = () => {
        if (!selectedAdmission) return alert("রোগী সিলেক্ট করা নেই।");
        const currentContent = docEditorRef.current ? docEditorRef.current.innerHTML : documentHtml;
        const record: PatientSavedDischarge = {
            id: `DISCH-${Date.now()}`,
            admissionId: selectedAdmission.admission_id,
            patientName: selectedAdmission.patient_name || selectedPatient?.pt_name || '',
            patientId: selectedAdmission.patient_id,
            dischargeDate: selectedAdmission.discharge_date || new Date().toISOString().split('T')[0],
            htmlContent: currentContent,
            savedAt: new Date().toISOString(),
            consultant: selectedAdmission.doctor_name || ''
        };
        const updated = [record, ...savedDischarges];
        setSavedDischarges(updated);
        localStorage.setItem('ncd_patient_saved_discharges', JSON.stringify(updated));
        alert("রোগীর ডিসচার্জ মাস্টার লেটার সফলভাবে সেভ করা হয়েছে!");
    };

    const handlePrintDischargeDocument = (customHtml: string | null = null, customAdm: any = null) => {
        const adm = customAdm || selectedAdmission;
        const pat = selectedPatient;
        const bodyContent = customHtml || (docEditorRef.current ? docEditorRef.current.innerHTML : documentHtml);

        if (!adm && !pat) return alert("প্রিন্ট করার কোনো রোগী পাওয়া যায়নি।");

        const win = window.open('', '_blank');
        if (!win) return;

        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8"/>
                    <title>DISCHARGE CERTIFICATE & RX MASTER - ${adm?.patient_name || pat?.pt_name}</title>
                    <style>
                        @page { size: A4; margin: 12mm 15mm; }
                        body { font-family: 'Times New Roman', serif; margin: 0; padding: 0; color: #111827; }
                        .a4-container { padding: 15px; position: relative; }
                        .watermark { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 70pt; color: rgba(30, 58, 138, 0.035); font-weight: 900; pointer-events: none; white-space: nowrap; }
                        .header { text-align: center; border-bottom: 2.5px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 15px; }
                        .h1 { font-size: 26px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; margin: 0; }
                        .sub { font-size: 13px; font-weight: bold; margin-top: 3px; color: #334155; }
                        .reg { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-top: 2px; }
                        .badge { display: inline-block; border: 2px solid #1e3a8a; background: #f8fafc; padding: 5px 24px; font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 10px; color: #1e3a8a; }
                        .pt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; font-size: 13px; margin: 15px 0; border: 1.5px solid #cbd5e1; background: #f8fafc; padding: 10px 14px; border-radius: 6px; }
                        .pt-grid b { color: #1e3a8a; }
                        .body-content { font-size: 14px; line-height: 1.6; margin-top: 15px; }
                        .body-content table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        .body-content th, .body-content td { border: 1px solid #94a3b8; padding: 6px 8px; font-size: 12px; }
                        .signatures { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                        .sig-line { width: 170px; border-top: 1.5px solid #000; text-align: center; font-size: 12px; font-weight: bold; padding-top: 4px; }
                    </style>
                </head>
                <body>
                    <div class="a4-container">
                        <div class="watermark">NIRAMOY CLINIC</div>
                        <div class="header">
                            <div class="h1">Niramoy Clinic & Diagnostic</div>
                            <div class="sub">Hospital Road, Enayetpur, Sirajgonj | Mobile: 01730 923007</div>
                            <div class="reg">Govt. Reg. No: ${CLINIC_REGISTRATION}</div>
                            <div class="badge">PATIENT DISCHARGE & TREATMENT MASTER</div>
                        </div>

                        <div class="pt-grid">
                            <div><b>Patient Name:</b> ${adm?.patient_name || pat?.pt_name || 'N/A'}</div>
                            <div><b>Patient ID / Reg:</b> ${adm?.patient_id || pat?.pt_id || 'N/A'}</div>
                            <div><b>Age / Gender:</b> ${pat?.ageY || '...'}Y / ${pat?.gender || '...'}</div>
                            <div><b>Admission ID:</b> ${adm?.admission_id || 'N/A'}</div>
                            <div><b>Bed / Cabin:</b> ${adm?.bed_no || 'Hospital Bed'}</div>
                            <div><b>Treating Consultant:</b> Dr. ${adm?.doctor_name || 'Medical Officer'}</div>
                            <div><b>Admission Date:</b> ${adm?.admission_date || 'N/A'}</div>
                            <div><b>Discharge Date:</b> ${adm?.discharge_date || new Date().toISOString().split('T')[0]}</div>
                        </div>

                        <div class="body-content">
                            ${bodyContent}
                        </div>

                        <div class="signatures">
                            <div class="sig-line">Nursing Officer</div>
                            <div class="sig-line">Duty Medical Officer</div>
                            <div class="sig-line">Consultant / Surgeon</div>
                        </div>
                    </div>
                    <script>
                        window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 600); };
                    </script>
                </body>
            </html>
        `;
        win.document.write(html);
        win.document.close();
    };

    return (
        <div className="fixed inset-0 bg-black/85 z-[300] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md">
            <div className="bg-slate-900 rounded-[2rem] w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden">
                {/* Header & Mode Tabs */}
                <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-2.5 rounded-xl shadow-lg shadow-emerald-900/40">
                            <ClipboardIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                                Discharge & Rx Master <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">MS Word Mode</span>
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Master Discharge Template & Rich Medical Documentation</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                            <button onClick={() => setActiveView('editor')} className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${activeView === 'editor' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Document Editor</button>
                            <button onClick={() => setActiveView('saved_letters')} className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${activeView === 'saved_letters' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Saved Discharges ({savedDischarges.length})</button>
                        </div>
                        <button onClick={onClose} className="p-2 bg-rose-500/20 text-rose-300 rounded-xl hover:bg-rose-600 hover:text-white transition-all text-xl font-bold ml-2 cursor-pointer">&times;</button>
                    </div>
                </div>

                {activeView === 'editor' ? (
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-950 space-y-4">
                        {/* Top Controls: Patient & Template Selector */}
                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 shadow-inner">
                            <div className="md:col-span-5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">১. টার্গেট রোগী সিলেক্ট করুন (Select Patient)</label>
                                <select 
                                    value={selectedAdmissionId} 
                                    onChange={e => {
                                        const admId = e.target.value;
                                        setSelectedAdmissionId(admId);
                                        const targetAdm = admissions.find(a => a && a.admission_id === admId);
                                        if (targetAdm) loadTemplateContent(selectedTemplateId, targetAdm);
                                    }} 
                                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">-- রোগী নির্বাচন করুন --</option>
                                    {(Array.isArray(admissions) ? admissions : []).map(a => a && (
                                        <option key={a.admission_id} value={a.admission_id}>
                                            {a.patient_name} (ID: {a.admission_id}) - Bed: {a.bed_no || 'N/A'} {a.discharge_date ? `[Discharged: ${a.discharge_date}]` : '[Admitted]'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">২. মাস্টার টেমপ্লেট নির্বাচন করুন (Load Template)</label>
                                <select 
                                    value={selectedTemplateId} 
                                    onChange={e => loadTemplateContent(e.target.value)} 
                                    className="w-full p-2.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <optgroup label="✨ রিয়েলটাইম ডাটাবেজ লিংক">
                                        <option value="auto_live_orders">🔄 লাইভ ক্লিনিক্যাল অর্ডার ও রাউন্ড নোট সামারি (Auto-Live)</option>
                                    </optgroup>
                                    <optgroup label="📋 স্ট্যান্ডার্ড ক্লিনিক্যাল টেমপ্লেটস">
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.title} {t.isCustom ? '⭐ (Custom)' : ''}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div className="md:col-span-3 flex items-end gap-2">
                                <button 
                                    type="button" 
                                    onClick={handleSaveNewMasterTemplate} 
                                    className="w-full p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                                    title="বর্তমান ডকুমেন্টের লেখা নতুন মাস্টার টেমপ্লেট হিসেবে লাইব্রেরিতে সংরক্ষণ করুন"
                                >
                                    ⭐ মাস্টার টেমপ্লেট সেভ
                                </button>
                                {templates.find(t => t.id === selectedTemplateId)?.isCustom && (
                                    <button 
                                        type="button" 
                                        onClick={() => handleDeleteTemplate(selectedTemplateId)} 
                                        className="p-2.5 bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30 rounded-xl transition-all cursor-pointer"
                                        title="এই কাস্টম টেমপ্লেটটি মুছে ফেলুন"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* MS Word Canvas Container */}
                        <div className="bg-slate-900/90 rounded-2xl border border-slate-700 shadow-2xl p-4 sm:p-6 flex flex-col items-center">
                            {/* Toolbar */}
                            <div className="w-full max-w-[850px] mb-4">
                                <MsWordToolbar onExec={handleExec} onInsertTable={handleInsertMedicineTable} />
                            </div>

                            {/* White A4 Paper Sheet (MS Word Appearance) */}
                            <div className="w-full max-w-[850px] bg-white text-slate-900 rounded shadow-2xl border border-slate-300 p-8 sm:p-12 min-h-[900px] relative font-serif select-text space-y-4">
                                {/* Letterhead */}
                                <div className="text-center border-b-2 border-blue-900 pb-4 mb-6">
                                    <h1 className="text-2xl sm:text-3xl font-black text-blue-900 uppercase tracking-tight m-0">Niramoy Clinic & Diagnostic</h1>
                                    <p className="text-xs sm:text-sm font-bold text-slate-700 mt-1">Hospital Road, Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Govt. Reg. No: {CLINIC_REGISTRATION}</p>
                                    <div className="inline-block mt-3 px-6 py-1 border-2 border-blue-900 bg-slate-50 text-blue-950 font-black text-sm uppercase tracking-widest">
                                        DISCHARGE CERTIFICATE & TREATMENT MASTER
                                    </div>
                                </div>

                                {/* Patient Info Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-300 rounded-lg text-xs mb-6">
                                    <div><span className="text-slate-500 font-bold block uppercase text-[10px]">Patient Name</span> <b className="text-slate-900 text-sm">{selectedAdmission?.patient_name || selectedPatient?.pt_name || 'Select Patient'}</b></div>
                                    <div><span className="text-slate-500 font-bold block uppercase text-[10px]">Patient ID</span> <b className="text-slate-900">{selectedAdmission?.patient_id || selectedPatient?.pt_id || 'N/A'}</b></div>
                                    <div><span className="text-slate-500 font-bold block uppercase text-[10px]">Age / Sex</span> <b className="text-slate-900">{selectedPatient?.ageY || '...'}Y / {selectedPatient?.gender || '...'}</b></div>
                                    <div><span className="text-slate-500 font-bold block uppercase text-[10px]">Bed / Cabin</span> <b className="text-slate-900">{selectedAdmission?.bed_no || 'Hospital Bed'}</b></div>
                                    <div><span className="text-slate-500 font-bold block uppercase text-[10px]">Admission ID</span> <b className="text-slate-900 font-mono">{selectedAdmission?.admission_id || 'N/A'}</b></div>
                                    <div><span className="text-slate-500 font-bold block uppercase text-[10px]">Admission Date</span> <b className="text-slate-900">{selectedAdmission?.admission_date || 'N/A'}</b></div>
                                    <div><span className="text-slate-500 font-bold block uppercase text-[10px]">Discharge Date</span> <b className="text-slate-900">{selectedAdmission?.discharge_date || new Date().toISOString().split('T')[0]}</b></div>
                                    <div><span className="text-slate-500 font-bold block uppercase text-[10px]">Consultant</span> <b className="text-slate-900">{selectedAdmission?.doctor_name || 'Dr. Medical Officer'}</b></div>
                                </div>

                                {/* Section 1: Diagnosis & Procedure (Editable) */}
                                <div>
                                    <h3 style={{color:'#1e3a8a', borderBottom:'2px solid #1e3a8a', paddingBottom:'4px', marginTop:'10px', fontSize:'15px', fontWeight:'bold'}}>১. রোগ নির্ণয় ও অপারেশনের বিবরণ (Diagnosis & Procedure)</h3>
                                    <div 
                                        contentEditable
                                        className="outline-none text-slate-900 leading-relaxed text-[13.5px] min-h-[60px]"
                                        dangerouslySetInnerHTML={{ __html: selectedAdmission ? `<b>Clinical Indication:</b> ${selectedAdmission.indication || 'Indoor Medical Care'}<br/><b>Consultant:</b> Dr. ${selectedAdmission.doctor_name || 'RMO'}` : 'Diagnosis & Procedure details...' }}
                                    />
                                </div>

                                {/* Section 2: Discharge Medications (Structured Interactive Table) */}
                                <div className="my-4">
                                    <div className="flex items-center justify-between border-b-2 border-blue-900 pb-1 mb-2">
                                        <h3 style={{color:'#1e3a8a', fontSize:'15px', fontWeight:'bold', margin:0}}>২. ছুটিকালীন ঔষধ সেবন বিধি (Discharge Medications)</h3>
                                        <button
                                            type="button"
                                            onClick={addDischargeMedRow}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow cursor-pointer"
                                        >
                                            <PlusIcon size={12} />
                                            <span>+ লাইন যোগ করুন</span>
                                        </button>
                                    </div>
                                    <table className="w-full border-collapse text-xs border border-slate-300">
                                        <thead>
                                            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                                                <th className="p-2 border border-slate-300 text-left">ঔষধের নাম (Medicine Name)</th>
                                                <th className="p-2 border border-slate-300 text-left w-48">মাত্রা ও নিয়ম (Dosage)</th>
                                                <th className="p-2 border border-slate-300 text-center w-28">সেবনের সময়</th>
                                                <th className="p-2 border border-slate-300 text-center w-20">মেয়াদ</th>
                                                <th className="p-2 border border-slate-300 text-center w-16">অ্যাকশন</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-300">
                                            {dischargeMeds.map((med) => (
                                                <tr key={med.id} className="hover:bg-slate-50">
                                                    <td className="p-1 border border-slate-300">
                                                        <SearchableSelect
                                                            theme="light"
                                                            label=""
                                                            options={(Array.isArray(medicines) ? medicines : []).map(m => m && ({ id: m.id, name: `${m.tradeName || ''} (${m.genericName || ''})` }))}
                                                            value={med.name}
                                                            onChange={(id, name) => {
                                                                const cleanName = name.split(' (')[0] || name;
                                                                updateDischargeMedRow(med.id, 'name', cleanName);
                                                            }}
                                                            placeholder="ওষুধ সার্চ করুন..."
                                                            allowCustom={true}
                                                            inputHeightClass="h-8 bg-white border-slate-300 text-xs font-bold text-slate-900"
                                                        />
                                                    </td>
                                                    <td className="p-1 border border-slate-300">
                                                        <input
                                                            type="text"
                                                            value={med.dosage}
                                                            onChange={e => updateDischargeMedRow(med.id, 'dosage', e.target.value)}
                                                            placeholder="যেমন: ১ টি করে দিনে ২ বার"
                                                            className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-bold outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="p-1 border border-slate-300">
                                                        <input
                                                            type="text"
                                                            value={med.timing}
                                                            onChange={e => updateDischargeMedRow(med.id, 'timing', e.target.value)}
                                                            placeholder="ভরা পেটে"
                                                            className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-bold text-center outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="p-1 border border-slate-300">
                                                        <input
                                                            type="text"
                                                            value={med.duration}
                                                            onChange={e => updateDischargeMedRow(med.id, 'duration', e.target.value)}
                                                            placeholder="৭ দিন"
                                                            className="w-full h-8 px-1 bg-white border border-slate-300 rounded text-xs text-slate-900 font-bold text-center outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="p-1 border border-slate-300 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDischargeMedRow(med.id)}
                                                            className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-[10px] font-bold uppercase transition-all cursor-pointer"
                                                            title="কাট / ডিলিট করুন"
                                                        >
                                                            ডিলিট
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Section 3 & 4 (Editable) */}
                                <div>
                                    <h3 style={{color:'#1e3a8a', borderBottom:'2px solid #1e3a8a', paddingBottom:'4px', marginTop:'14px', fontSize:'15px', fontWeight:'bold'}}>৩. বিশেষ যত্ন ও উপদেশ (Care & Advice)</h3>
                                    <div contentEditable className="outline-none text-slate-900 leading-relaxed text-[13.5px] min-h-[50px]">
                                        সেলাইয়ের স্থান সম্পূর্ণ শুকনা ও পরিষ্কার রাখবেন। প্রথম ৬ মাস শিশুকে শুধুমাত্র বুকের দুধ পান করাবেন।
                                    </div>

                                    <h3 style={{color:'#1e3a8a', borderBottom:'2px solid #1e3a8a', paddingBottom:'4px', marginTop:'14px', fontSize:'15px', fontWeight:'bold'}}>৪. ফলো-আপ ও পরবর্তী সাক্ষাত (Follow-up)</h3>
                                    <div contentEditable className="outline-none text-slate-900 leading-relaxed text-[13.5px] min-h-[40px]">
                                        আগামী ৭ দিন পর সেলাই কাটা ও চেকআপের জন্য হাসপাতালে উপস্থিত হবেন।
                                    </div>
                                </div>

                                {/* Signature Block */}
                                <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between items-center text-xs text-slate-700">
                                    <div className="text-center">
                                        <div className="w-36 border-t border-slate-900 mb-1"></div>
                                        <span className="font-bold">Nursing Officer</span>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-40 border-t border-slate-900 mb-1"></div>
                                        <span className="font-bold">Resident Medical Officer</span>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-44 border-t border-slate-900 mb-1"></div>
                                        <span className="font-bold">Consultant / Surgeon</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="w-full max-w-[850px] mt-6 flex flex-wrap gap-4">
                                <button 
                                    type="button" 
                                    onClick={handleSaveDischargeForPatient}
                                    className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-xl shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <SaveIcon size={18} /> রোগীর ফাইলে ডিসচার্জ লেটার সেভ করুন
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => handlePrintDischargeDocument()}
                                    className="flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-xl shadow-blue-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <PrinterIcon size={18} /> প্রিন্ট করুন (A4 Document Print)
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Saved Patient Discharges Tab */
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-950 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-black text-slate-300 uppercase tracking-wider">সংরক্ষিত ডিসচার্জ লেটারসমূহ ({savedDischarges.length})</h4>
                            <div className="relative w-64">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Search by patient name..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-bold"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {savedDischarges.filter(d => (d.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.admissionId || '').toLowerCase().includes(searchTerm.toLowerCase())).map(rec => (
                                <div key={rec.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all shadow-lg flex justify-between items-center">
                                    <div>
                                        <h5 className="font-black text-white uppercase text-base">{rec.patientName}</h5>
                                        <p className="text-xs text-slate-400 font-medium mt-1">Adm ID: <span className="font-mono text-emerald-400">{rec.admissionId}</span> | Disch: {rec.dischargeDate}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Saved on: {new Date(rec.savedAt).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                const targetAdm = admissions.find(a => a && a.admission_id === rec.admissionId);
                                                if (targetAdm) setSelectedAdmissionId(targetAdm.admission_id);
                                                setDocumentHtml(rec.htmlContent);
                                                if (docEditorRef.current) docEditorRef.current.innerHTML = rec.htmlContent;
                                                setActiveView('editor');
                                            }} 
                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                                            title="এডিট করার জন্য এডিটরে ওপেন করুন"
                                        >
                                            <EditIcon size={14} /> Edit
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const targetAdm = admissions.find(a => a && a.admission_id === rec.admissionId);
                                                handlePrintDischargeDocument(rec.htmlContent, targetAdm || { patient_name: rec.patientName, admission_id: rec.admissionId, discharge_date: rec.dischargeDate, doctor_name: rec.consultant });
                                            }} 
                                            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            <PrinterIcon size={14} /> Print
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (!confirm("মুছে ফেলতে চান?")) return;
                                                const updated = savedDischarges.filter(s => s.id !== rec.id);
                                                setSavedDischarges(updated);
                                                localStorage.setItem('ncd_patient_saved_discharges', JSON.stringify(updated));
                                            }} 
                                            className="p-2 bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white rounded-xl transition-all cursor-pointer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {savedDischarges.length === 0 && (
                                <div className="col-span-full py-24 text-center opacity-30 flex flex-col items-center">
                                    <ClipboardIcon size={80} className="text-slate-500" />
                                    <p className="text-2xl font-black uppercase tracking-widest mt-4 text-slate-400">No Saved Discharge Letters</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 1. Admission & Treatment
const AdmissionAndTreatmentPage: React.FC<{
    admissions: AdmissionRecord[];
    setAdmissions: React.Dispatch<React.SetStateAction<AdmissionRecord[]>>;
    patients: Patient[];
    doctors: Doctor[];
    referrars: Referrar[];
    employees: Employee[];
    medicines: Medicine[];
    setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
    indications: Indication[];
    setIndications: React.Dispatch<React.SetStateAction<Indication[]>>;
    services: ServiceItemDef[];
    setServices: React.Dispatch<React.SetStateAction<ServiceItemDef[]>>;
    setSuccessMessage: (msg: string) => void;
    setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
    setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
    setReferrars: React.Dispatch<React.SetStateAction<Referrar[]>>;
    drugDemands: RequestedDrug[];
    setDrugDemands: React.Dispatch<React.SetStateAction<RequestedDrug[]>>;
    admissionData: AdmissionRecord;
    setAdmissionData: React.Dispatch<React.SetStateAction<AdmissionRecord>>;
    performBlockingSync?: (overrides?: any) => Promise<boolean>;
}> = ({ admissions, setAdmissions, patients, doctors, referrars, employees, medicines, setMedicines, indications, setIndications, services, setServices, setSuccessMessage, setPatients, setDoctors, setReferrars, drugDemands, setDrugDemands, admissionData, setAdmissionData, performBlockingSync }) => {
    
    const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
    const [pageMode, setPageMode] = useState<'admission' | 'treatment'>('admission'); 
    const [activeSubTab, setActiveSubTab] = useState<'orders' | 'rounds' | 'nurse' | 'demands'>('orders');
    const [searchTerm, setSearchTerm] = useState('');

    // Standard Ward & Bed Definitions
    const wardDefinitions = useMemo(() => [
        { id: 'male_ward', name: 'পুরুষ ওয়ার্ড (০২ বেড)', beds: ['Male-Bed-01', 'Male-Bed-02'] },
        { id: 'female_ward', name: 'মহিলা ওয়ার্ড (০৫ বেড)', beds: ['Female-Bed-01', 'Female-Bed-02', 'Female-Bed-03', 'Female-Bed-04', 'Female-Bed-05'] },
        { id: 'cabin', name: 'ক্যাবিন (০৩ বেড)', beds: ['CAB-101', 'CAB-102', 'CAB-103'] }
    ], []);

    const allWardBeds = useMemo(() => wardDefinitions.flatMap(w => w.beds), [wardDefinitions]);

    const getOccupiedPatient = (bedId: string) => {
        const safeAdmissions = Array.isArray(admissions) ? admissions : [];
        return safeAdmissions.find(a => 
            a && 
            !a.discharge_date && 
            a.admission_id !== admissionData.admission_id && 
            (a.bed_no === bedId || 
             (bedId === 'CAB-101' && a.bed_no === 'Cabin-01') ||
             (bedId === 'CAB-102' && a.bed_no === 'Cabin-02') ||
             (bedId === 'CAB-103' && a.bed_no === 'Cabin-03') ||
             (bedId === 'Cabin-01' && a.bed_no === 'CAB-101') ||
             (bedId === 'Cabin-02' && a.bed_no === 'CAB-102') ||
             (bedId === 'Cabin-03' && a.bed_no === 'CAB-103'))
        );
    };

    const occupiedBedsCount = useMemo(() => {
        return allWardBeds.filter(b => !!getOccupiedPatient(b)).length;
    }, [allWardBeds, admissions, admissionData.admission_id]);

    const availableBedsCount = allWardBeds.length - occupiedBedsCount;

    const filteredAdmissions = useMemo(() => {
        const safeAdmissions = Array.isArray(admissions) ? admissions : [];
        const safePatients = Array.isArray(patients) ? patients : [];
        const term = searchTerm.toLowerCase().trim();
        if (!term) return safeAdmissions.filter(a => a && !a.discharge_date);

        return safeAdmissions.filter(a => {
            if (!a || a.discharge_date) return false;
            const p = safePatients.find(pt => pt && (pt.pt_id === a.patient_id || pt.patient_id === a.patient_id || (pt.pt_name && a.patient_name && pt.pt_name.trim().toLowerCase() === a.patient_name.trim().toLowerCase())));
            const pMobile = (a.patient_mobile || p?.mobile || '').toLowerCase();
            const pAddress = [p?.address, p?.thana, p?.district].filter(Boolean).join(' ').toLowerCase();

            return (
                (a.patient_name || '').toLowerCase().includes(term) ||
                (a.admission_id || '').toLowerCase().includes(term) ||
                (a.bed_no && a.bed_no.toLowerCase().includes(term)) ||
                (a.doctor_name || '').toLowerCase().includes(term) ||
                (a.indication || '').toLowerCase().includes(term) ||
                pMobile.includes(term) ||
                pAddress.includes(term)
            );
        });
    }, [admissions, patients, searchTerm]);

    const [currentOrder, setCurrentOrder] = useState<Partial<ClinicalOrderBlock>>({
        category: 'Conservative', diet: 'Regular', medications: [], note: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    });
    const [editingOrderBlockId, setEditingOrderBlockId] = useState<string | null>(null);

    // Templates
    const [templates, setTemplates] = useState<TreatmentTemplate[]>([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    const [newMedication, setNewMedication] = useState< Medication>({ id: 0, type: 'Tab', name: '', dosage: '', frequency: 8, category: 'Conservative' });
    const [selectedDrugId, setSelectedDrugId] = useState<string>('');

    const [showDrugDemandModal, setShowDrugDemandModal] = useState(false);
    const [newDrugEntry, setNewDrugEntry] = useState({ name: '', generic: '', type: 'Tab', strength: '' });

    const [roundTime, setRoundTime] = useState('');
    const [roundDoctor, setRoundDoctor] = useState('');
    const [newRoundNote, setNewRoundNote] = useState('');

    const [performingNurse, setPerformingNurse] = useState('');
    const [newNurseNote, setNewNurseNote] = useState('');
    
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    // Tracks source selection for each med being administered in the Nurse Chart
    const [medicationSources, setMedicationSources] = useState<{[key: string]: 'Clinic' | 'Outside'}>({});
    
    const [showIndicationManager, setShowIndicationManager] = useState(false);
    const [showServiceManager, setShowServiceManager] = useState(false);
    const [showNewPatientForm, setShowNewPatientForm] = useState(false);
    const [showNewDoctorForm, setShowNewDoctorForm] = useState(false);
    const [showNewReferrarForm, setShowNewReferrarForm] = useState(false);
    
    // Patient Search Modal State
    const [showPatientSearchModal, setShowPatientSearchModal] = useState(false);
    const [patientSearchFilters, setPatientSearchFilters] = useState({ name: '', mobile: '', address: '', thana: '', age: '' });
    const [barcodeInput, setBarcodeInput] = useState('');
    const [showAdmissionPatientDropdown, setShowAdmissionPatientDropdown] = useState(false);

    const openAdvancedPatientSearch = (currentTerm: string) => {
        setPatientSearchFilters(prev => ({ ...prev, name: currentTerm }));
        setShowPatientSearchModal(true);
    };

    const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const code = barcodeInput.trim();
            if (!code) return;
            const safePatients = Array.isArray(patients) ? patients : [];
            const targetPatient = safePatients.find(p => p && p.pt_id === code);
            
            if (targetPatient) {
                setAdmissionData({
                    ...admissionData, 
                    patient_id: targetPatient.pt_id, 
                    patient_name: targetPatient.pt_name,
                    patient_mobile: targetPatient.mobile || '',
                    mobile_relation: targetPatient.mobile_relation || 'Self'
                });
                setSuccessMessage(`Patient ${targetPatient.pt_name} found!`);
                setBarcodeInput('');
            } else {
                alert(`No patient found with ID: ${code}`);
                setBarcodeInput('');
            }
        }
    };

    const filteredPatientsForModal = useMemo(() => {
        const seenIds = new Set<string>();
        return (Array.isArray(patients) ? patients : []).filter(p => {
          if (!p) return false;
          const pid = String(p.pt_id || '').trim();
          if (pid) {
            if (seenIds.has(pid)) return false;
            seenIds.add(pid);
          }
          const searchName = (patientSearchFilters.name || '').toLowerCase();
          const searchMobile = (patientSearchFilters.mobile || '').toLowerCase();
          const searchAddress = (patientSearchFilters.address || '').toLowerCase();
          const searchThana = (patientSearchFilters.thana || '').toLowerCase();
          const searchAge = (patientSearchFilters.age || '').toLowerCase();
          
          return (
            (p.pt_name || '').toLowerCase().includes(searchName) &&
            (p.mobile || '').toLowerCase().includes(searchMobile) &&
            (p.address || '').toLowerCase().includes(searchAddress) &&
            (p.thana || '').toLowerCase().includes(searchThana) &&
            (p.ageY?.toString() || '').includes(searchAge)
          );
        });
    }, [patients, patientSearchFilters]);

    const handlePatientSelectModal = (id: string, name: string) => {
        const p = (Array.isArray(patients) ? patients : []).find(pt => pt && pt.pt_id === id);
        setAdmissionData(prev => ({
            ...prev, 
            patient_id: id, 
            patient_name: name,
            patient_mobile: p?.mobile || prev.patient_mobile || '',
            mobile_relation: p?.mobile_relation || prev.mobile_relation || 'Self'
        }));
        setShowPatientSearchModal(false);
        setPatientSearchFilters({ name: '', mobile: '', address: '', thana: '', age: '' });
    };

    const handleGetNewId = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const safeAdmissions = Array.isArray(admissions) ? admissions : [];
        const count = safeAdmissions.filter(a => a && a.admission_id && a.admission_id.startsWith(`ADM-${year}-${month}-${day}`)).length + 1;
        const newId = `ADM-${year}-${month}-${day}-${String(count).padStart(3, '0')}`;
        setAdmissionData(prev => ({ 
            ...emptyAdmission, 
            ...prev, 
            admission_id: newId, 
            admission_date: prev.admission_date || `${year}-${month}-${day}` 
        }));
        setSelectedAdmissionId(null);
    };

    // Auto-generate Admission ID on initial load if not already set
    useEffect(() => {
        if (!admissionData.admission_id) {
            handleGetNewId();
        }
    }, []);

    // SYNC FUNCTION: Propagates current admission record changes to the global admissions list and database
    const syncAdmissionToGlobal = (record: AdmissionRecord) => {
        setAdmissions((prev: AdmissionRecord[]) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const idx = safePrev.findIndex((a: AdmissionRecord) => a.admission_id === record.admission_id);
            let newArr: AdmissionRecord[];
            if(idx >= 0) { 
                newArr = [...safePrev]; 
                newArr[idx] = record; 
            } else {
                newArr = [...safePrev, record];
            }
            try {
                const cachedRaw = localStorage.getItem('ncd_offline_cache_v1');
                if (cachedRaw) {
                    const cached = JSON.parse(cachedRaw);
                    cached.admissions = newArr;
                    localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(cached));
                }
            } catch (e) {}
            return newArr;
        });

        // Background direct database save
        try {
            dbService.saveAdmissionDirectly(record);
        } catch (e) {
            console.warn("Direct admission sync notice:", e);
        }
    };

    const handleSaveAdmission = () => {
        let currentRecord = { ...admissionData };

        // 1. Auto generate Admission ID if not generated yet
        if (!currentRecord.admission_id) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const safeAdmissions = Array.isArray(admissions) ? admissions : [];
            const count = safeAdmissions.filter(a => a && a.admission_id && a.admission_id.startsWith(`ADM-${year}-${month}-${day}`)).length + 1;
            currentRecord.admission_id = `ADM-${year}-${month}-${day}-${String(count).padStart(3, '0')}`;
            if (!currentRecord.admission_date) currentRecord.admission_date = `${year}-${month}-${day}`;
        }

        if (!currentRecord.patient_id) {
            alert("দয়া করে একজন পেশেন্ট নির্বাচন করুন (Please select a Patient).");
            return;
        }

        // 2. Auto-fill mobile and relation from patients list if missing
        const safePatients = Array.isArray(patients) ? patients : [];
        const p = safePatients.find(pt => pt && pt.pt_id === currentRecord.patient_id);
        if (!currentRecord.patient_name && p) {
            currentRecord.patient_name = p.pt_name;
        }
        if (!currentRecord.patient_mobile && p?.mobile) {
            currentRecord.patient_mobile = p.mobile;
        }
        if (!currentRecord.mobile_relation) {
            currentRecord.mobile_relation = p?.mobile_relation || 'Self';
        }

        // Apply updated values back to form state
        setAdmissionData(currentRecord);

        setConfirmModal({
            isOpen: true,
            title: 'Confirm Admission',
            message: 'আপনি কি এই ভর্তি ফরমটি সেভ করতে চান?',
            onConfirm: () => executeSaveAdmission(currentRecord)
        });
    };

    const executeSaveAdmission = async (recordToSave?: AdmissionRecord) => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const targetRecord = recordToSave || admissionData;
        if (!targetRecord.admission_id || !targetRecord.patient_id) return;

        const safeAdmissions = Array.isArray(admissions) ? admissions : [];
        const idx = safeAdmissions.findIndex((a: AdmissionRecord) => a && a.admission_id === targetRecord.admission_id);
        let newAdmissions = [...safeAdmissions];
        if (idx >= 0) {
            newAdmissions[idx] = targetRecord;
        } else {
            newAdmissions = [...safeAdmissions, targetRecord];
        }

        // 1. Immediately update state so Indoor Invoice, Bed Status and lists reflect the admitted patient with 0 latency
        setAdmissions(newAdmissions);
        syncAdmissionToGlobal(targetRecord);
        setSelectedAdmissionId(targetRecord.admission_id);
        setSuccessMessage("ভর্তি ডাটা সফলভাবে সেভ হয়েছে!");

        // Backup to local storage cache immediately
        try {
            const cached = localStorage.getItem('ncd_offline_cache_v1');
            if (cached) {
                const parsed = JSON.parse(cached);
                parsed.admissions = newAdmissions;
                localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(parsed));
            }
        } catch (e) {
            console.warn("Local storage cache write notice:", e);
        }

        // 2. Persist to Supabase Cloud directly based on date routing (Jan-Jul 2026 to ncd_state, Aug 2026+ to admissions table)
        try {
            await dbService.saveAdmissionDirectly(targetRecord);
        } catch (err) {
            console.error("Cloud direct save error during admission save:", err);
        }
    };

    // --- PRINT FUNCTIONS ---

    const handlePrintAdmissionList = () => {
        const win = window.open('', '_blank');
        if (!win) return;
        const styles = `
            <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.4; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; color: #1e40af; text-transform: uppercase; }
                .header p { margin: 2px 0; font-weight: bold; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background: #f3f4f6; font-weight: bold; text-transform: uppercase; }
                .report-title { text-align: center; font-size: 16px; font-weight: bold; text-decoration: underline; margin-bottom: 10px; }
            </style>
        `;
        const html = `
            <html><head>${styles}</head><body>
                <div class="header">
                    <h1>Niramoy Clinic & Diagnostic</h1>
                    <p>Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
                </div>
                <div class="report-title">Active Admitted Patients List</div>
                <table>
                    <thead><tr><th>ID</th><th>Date</th><th>Patient Name</th><th>Bed</th><th>Gender/Age</th><th>Doctor</th></tr></thead>
                    <tbody>
                        ${(Array.isArray(admissions) ? admissions : []).filter(a => a && !a.discharge_date).map(a => {
                            const safePatients = Array.isArray(patients) ? patients : [];
                            const p = safePatients.find(pt => pt && pt.pt_id === a.patient_id);
                            return `
                            <tr>
                                <td>${a.admission_id || ''}</td>
                                <td>${a.admission_date || ''}</td>
                                <td><b>${a.patient_name || ''}</b></td>
                                <td style="color: #b45309">${a.bed_no || 'N/A'}</td>
                                <td>${p?.gender || ''}, ${p?.ageY || ''}Y</td>
                                <td>${a.doctor_name || ''}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </body></html>
        `;
        win.document.write(html); win.document.close(); win.print();
    };

    const handlePrintTreatmentRecord = () => {
        if (!admissionData.admission_id) return alert("Select a patient first");
        const win = window.open('', '_blank');
        if (!win) return;
        const styles = `
            <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: sans-serif; padding: 0; color: #000; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                .pt-info { border: 1px solid #000; padding: 10px; margin-bottom: 20px; font-size: 13px; border-radius: 5px; }
                .section-title { background: #eee; padding: 5px 10px; font-weight: bold; margin-top: 20px; border-left: 5px solid #1e40af; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                th, td { border: 1px solid #999; padding: 6px; text-align: left; }
                th { background: #f0f0f0; }
            </style>
        `;
        const html = `
            <html><head>${styles}</head><body>
                <div class="header"><h1>Niramoy Clinic & Diagnostic</h1><p>Patient Treatment Summary</p></div>
                <div class="pt-info">
                    <b>Patient:</b> ${admissionData.patient_name} | <b>ID:</b> ${admissionData.admission_id} | <b>Bed:</b> ${admissionData.bed_no || 'N/A'}<br>
                    <b>Doctor:</b> ${admissionData.doctor_name} | <b>Adm. Date:</b> ${admissionData.admission_date}
                </div>
                <div class="section-title">Clinical Orders (Prescribed)</div>
                <table>
                    <thead><tr><th>Time</th><th>Category</th><th>Details</th></tr></thead>
                    <tbody>${(Array.isArray(admissionData.clinical_orders) ? admissionData.clinical_orders : []).map(o=> o && `<tr><td>${o.date || ''} ${o.time || ''}</td><td>${o.category || ''}</td><td>${(Array.isArray(o.medications) ? o.medications : []).map(m=> m && `• ${m.type || ''} ${m.name || ''} (${m.dosage || ''})`).join('<br>')}</td></tr>`).join('')}</tbody>
                </table>
                <div class="section-title">Nurse Medication Chart</div>
                <table>
                    <thead><tr><th>Time</th><th>Activity/Medication</th><th>Nurse</th></tr></thead>
                    <tbody>${(Array.isArray(admissionData.nurse_chart) ? admissionData.nurse_chart : []).map(l=> l && `<tr><td>${l.time || ''}</td><td>${l.note || ''}</td><td>${l.by || ''}</td></tr>`).join('')}</tbody>
                </table>
            </body></html>
        `;
        win.document.write(html); win.document.close(); win.print();
    };

    const handleSelectPatientForTreatment = (admission: AdmissionRecord) => {
        setAdmissionData(admission);
        setSelectedAdmissionId(admission.admission_id);
        setPageMode('treatment');
        
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 5);
        setRoundTime(timeStr);
        setRoundDoctor(admission.doctor_name || '');
        setCurrentOrder((prev: any) => ({...prev, time: timeStr}));
    };

    const handleEditAdmissionInfo = (admission: AdmissionRecord) => {
        setAdmissionData(admission);
        setSelectedAdmissionId(admission.admission_id);
        setPageMode('admission');
        window.scrollTo(0, 0);
    };

    const handleMedicineSelect = (id: string, name: string) => {
        setSelectedDrugId(id);
        const safeMedicines = Array.isArray(medicines) ? medicines : [];
        const drug = safeMedicines.find(m => m && m.id === id);
        if (drug) {
            setNewMedication(prev => ({ 
                ...prev, 
                name: `${drug.tradeName} (${drug.genericName})`, 
                genericName: drug.genericName, 
                type: drug.formulation, 
                dosage: drug.strength,
                inventoryId: drug.id
            }));
        }
    };

    const addMedicationToDraft = () => {
        if (!newMedication.name) return;
        const med = { ...newMedication, id: Date.now(), category: currentOrder.category as any };
        setCurrentOrder(prev => ({ ...prev, medications: [...(prev.medications || []), med] }));
        setNewMedication({ id: 0, type: 'Tab', name: '', dosage: '', frequency: 8, category: currentOrder.category as any });
        setSelectedDrugId('');
    };

    const removeMedicationFromDraft = (id: number) => {
        setCurrentOrder(prev => ({ ...prev, medications: (Array.isArray(prev.medications) ? prev.medications : []).filter(m => m && m.id !== id) }));
    };

    const handleEditOrder = (block: ClinicalOrderBlock) => {
        setEditingOrderBlockId(block.id);
        setCurrentOrder({
            date: block.date,
            time: block.time,
            category: block.category,
            diet: block.diet,
            medications: block.medications,
            note: block.note
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveOrderBlock = () => {
        if (!currentOrder.date || !currentOrder.time) return alert("Date/Time required");
        if (!admissionData.admission_id) return alert("পেশেন্ট সিলেক্ট করুন");

        let updatedOrders = Array.isArray(admissionData.clinical_orders) ? [...admissionData.clinical_orders] : [];
        if (editingOrderBlockId) {
            updatedOrders = updatedOrders.map(order => order && order.id === editingOrderBlockId ? { ...order, ...currentOrder as ClinicalOrderBlock } : order);
        } else {
            const newBlock: ClinicalOrderBlock = { id: Date.now().toString(), ...currentOrder as ClinicalOrderBlock };
            updatedOrders = [newBlock, ...updatedOrders];
        }
        
        const updatedAdmission = { ...admissionData, clinical_orders: updatedOrders };
        setAdmissionData(updatedAdmission);
        syncAdmissionToGlobal(updatedAdmission); 
        
        setSuccessMessage(editingOrderBlockId ? "Order updated!" : "New order added!");
        setCurrentOrder({ category: 'Conservative', diet: 'Regular', medications: [], note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false}) });
        setEditingOrderBlockId(null);
    };

    const handleSaveTemplate = () => {
        if (!newTemplateName) return alert("Enter template name");
        const newTemplate: TreatmentTemplate = {
            id: Date.now().toString(),
            name: newTemplateName,
            category: currentOrder.category as any,
            diet: currentOrder.diet || '',
            medications: currentOrder.medications || [],
            note: currentOrder.note || ''
        };
        setTemplates([...templates, newTemplate]);
        setNewTemplateName('');
        setShowTemplateModal(false);
        setSuccessMessage("Template Saved!");
    };

    const handleLoadTemplate = (t: TreatmentTemplate) => {
        const safeMeds = Array.isArray(t.medications) ? t.medications : [];
        const medsWithNewIds = safeMeds.map(m => ({
            ...m,
            id: Date.now() + Math.random() 
        }));

        setCurrentOrder(prev => ({
            ...prev,
            category: t.category,
            diet: t.diet,
            medications: medsWithNewIds,
            note: t.note
        }));
        setShowTemplateModal(false);
    };

    const handleSaveNewDrugEntry = () => {
        if(!newDrugEntry.name) return alert("Please enter drug name");
        
        setNewMedication(prev => ({
            ...prev,
            name: `${newDrugEntry.name} (${newDrugEntry.generic})`,
            genericName: newDrugEntry.generic,
            type: newDrugEntry.type,
            dosage: newDrugEntry.strength,
            inventoryId: undefined 
        }));

        const demand: RequestedDrug = {
            id: Date.now().toString(), name: newDrugEntry.name, type: newDrugEntry.type,
            strength: newDrugEntry.strength, genericName: newDrugEntry.generic,
            requestedBy: admissionData.doctor_name || 'Doctor', date: new Date().toISOString().split('T')[0], status: 'Pending'
        };
        setDrugDemands((prev: RequestedDrug[]) => [demand, ...prev]);

        setSuccessMessage("New drug added for prescription!");
        setShowDrugDemandModal(false);
        setNewDrugEntry({ name: '', generic: '', type: 'Tab', strength: '' });
    };

    const activeNurses = useMemo(() => {
        const safeEmployees = Array.isArray(employees) ? employees : [];
        return safeEmployees.filter(e => e && e.status === 'Active');
    }, [employees]);
    const commonInputClass = "w-full p-2 bg-white border border-gray-300 rounded text-gray-800 text-sm focus:ring-1 focus:ring-blue-500";

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex justify-between items-center shadow-2xl backdrop-blur-sm">
                <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button onClick={() => setPageMode('admission')} className={`px-6 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${pageMode === 'admission' ? 'bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-lg shadow-blue-900/40 border border-blue-400/30' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-900/50'}`}>Patient Admission</button>
                    <button onClick={() => setPageMode('treatment')} className={`px-6 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${pageMode === 'treatment' ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400/30' : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-900/50'}`}>Clinical Management</button>
                </div>
                {pageMode === 'treatment' && admissionData.admission_id && (
                    <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-emerald-500/30 shadow-inner">
                        <Activity className="text-emerald-400 animate-pulse drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" size={18}/>
                        <span className="text-slate-300 font-black uppercase text-xs tracking-tighter">{admissionData.patient_name} <span className="text-emerald-400 ml-2 font-mono">({admissionData.admission_id})</span></span>
                    </div>
                )}
            </div>

            {pageMode === 'admission' ? (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-700/50 pb-6 gap-4">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                <span className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><ClinicIcon size={24} /></span>
                                New Patient Admission
                            </h3>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-sky-500/40">
                                    <label htmlFor="barcode_scanner_adm" className="font-black text-[10px] text-sky-400 uppercase tracking-widest whitespace-nowrap">Scanner Mode:</label>
                                    <input
                                        type="text"
                                        id="barcode_scanner_adm"
                                        placeholder="Scan ID..."
                                        value={barcodeInput}
                                        onChange={(e) => setBarcodeInput(e.target.value)}
                                        onKeyDown={handleBarcodeScan}
                                        className="w-36 py-1 px-2 border border-sky-500/30 bg-slate-900 text-white rounded-lg text-xs font-mono focus:ring-1 focus:ring-sky-400 focus:outline-none placeholder:text-slate-500"
                                        autoComplete="off"
                                    />
                                </div>
                                <button onClick={handleGetNewId} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-700 shadow-lg">Add New</button>
                                <button onClick={handleSaveAdmission} className="bg-gradient-to-br from-blue-600 to-indigo-800 hover:from-blue-500 hover:to-indigo-700 text-white px-10 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-900/40 transition-all border border-blue-400/30">Save Admission</button>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {/* Top Section - Source Info: Using a soft blue-slate background */}
                            <div className="bg-blue-900/20 p-6 rounded-3xl border border-blue-500/30 shadow-[inner_0_2px_10px_rgba(0,0,0,0.3)]">
                                <div className="flex flex-col gap-6">
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                                        <div className="col-span-1"><label className="text-[10px] font-black text-blue-300 uppercase ml-2 mb-1.5 block tracking-widest">Adm ID</label><input value={admissionData.admission_id} disabled className="w-full p-3.5 bg-[#0a192f] border border-sky-400/80 rounded-xl text-blue-400 font-mono font-black shadow-inner outline-none"/></div>
                                        <div className="col-span-2 relative">
                                            <label className="text-[10px] font-black text-blue-300 uppercase ml-2 mb-1.5 block tracking-widest">Select Patient *</label>
                                            <input 
                                                type="text"
                                                placeholder="রোগীর নাম বা আইডি দিয়ে খুঁজুন..."
                                                value={admissionData.patient_name || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setAdmissionData(prev => ({ ...prev, patient_name: val }));
                                                    setShowAdmissionPatientDropdown(true);
                                                }}
                                                onFocus={() => setShowAdmissionPatientDropdown(true)}
                                                className="w-full p-3.5 bg-[#0a192f] border border-sky-400/80 rounded-xl text-white font-bold outline-none shadow-inner"
                                                autoComplete="off"
                                            />
                                            {showAdmissionPatientDropdown && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setShowAdmissionPatientDropdown(false)} />
                                                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#faf9f6] border-2 border-sky-500 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto custom-scrollbar text-slate-900">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-slate-200 text-slate-700 font-bold sticky top-0 border-b border-slate-300">
                                                                <tr>
                                                                    <th className="p-2">ID</th>
                                                                    <th className="p-2">Name</th>
                                                                    <th className="p-2">Age</th>
                                                                    <th className="p-2">Gender</th>
                                                                    <th className="p-2">Care Of</th>
                                                                    <th className="p-2">Mobile</th>
                                                                    <th className="p-2">Address</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200 font-medium">
                                                                {(Array.isArray(patients) ? patients : [])
                                                                  .filter(p => p && p.pt_name && (!admissionData.patient_name || p.pt_name.toLowerCase().includes(admissionData.patient_name.toLowerCase()) || p.pt_id?.toLowerCase().includes(admissionData.patient_name.toLowerCase()) || p.mobile?.includes(admissionData.patient_name)))
                                                                  .filter((p, idx, arr) => !p.pt_id || arr.findIndex(x => x && x.pt_id === p.pt_id) === idx)
                                                                  .slice(0, 20)
                                                                  .map((pat, idx) => (
                                                                    <tr 
                                                                        key={`${pat.pt_id || 'pat'}-${idx}`}
                                                                        onClick={() => {
                                                                            setAdmissionData(prev => ({
                                                                                ...prev,
                                                                                patient_id: pat.pt_id,
                                                                                patient_name: pat.pt_name,
                                                                                patient_mobile: pat.mobile || '',
                                                                                mobile_relation: 'Self'
                                                                            }));
                                                                            setShowAdmissionPatientDropdown(false);
                                                                        }}
                                                                        className="hover:bg-sky-100 cursor-pointer transition-colors"
                                                                    >
                                                                        <td className="p-2 font-mono text-blue-800 font-bold">{pat.pt_id}</td>
                                                                        <td className="p-2 font-bold text-slate-900">{pat.pt_name}</td>
                                                                        <td className="p-2 text-slate-700">{pat.ageY ? `${pat.ageY}Y` : ''}</td>
                                                                        <td className="p-2 text-slate-700">{pat.gender || ''}</td>
                                                                        <td className="p-2 text-slate-700">{pat.co_name ? `${pat.co_pref || 'S/O'} ${pat.co_name}` : ''}</td>
                                                                        <td className="p-2 font-mono text-emerald-800 font-semibold">{pat.mobile}</td>
                                                                        <td className="p-2 text-slate-600 truncate max-w-[120px]">{pat.address}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] font-black text-rose-300 uppercase ml-2 mb-1.5 block tracking-widest">Mobile *</label>
                                            <input 
                                                value={admissionData.patient_mobile || ''} 
                                                onChange={(e) => {
                                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                    let formatted = digits;
                                                    if (digits.length > 5) {
                                                        formatted = `${digits.slice(0, 5)} ${digits.slice(5)}`;
                                                    }
                                                    setAdmissionData({...admissionData, patient_mobile: formatted});
                                                }} 
                                                placeholder="01712 765432" 
                                                maxLength={12}
                                                className="w-full p-3.5 bg-[#0a192f] border border-sky-400/80 rounded-xl text-white font-bold outline-none transition-all shadow-inner font-mono tracking-wider"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-rose-300 uppercase ml-2 mb-1.5 block tracking-widest">Relation *</label>
                                            <select value={admissionData.mobile_relation || ''} onChange={(e)=>setAdmissionData({...admissionData, mobile_relation: e.target.value})} className="w-full p-3.5 bg-[#0a192f] border border-sky-400/80 rounded-xl text-white font-bold outline-none transition-all cursor-pointer shadow-inner">
                                                <option value="" className="bg-slate-900">Select...</option>
                                                <option value="Self" className="bg-slate-900">Self (নিজ)</option>
                                                <option value="Father" className="bg-slate-900">Father (পিতা)</option>
                                                <option value="Husband" className="bg-slate-900">Husband (স্বামী)</option>
                                                <option value="Son" className="bg-slate-900">Son (পুত্র)</option>
                                                <option value="Other" className="bg-slate-900">Other (অন্যান্য)</option>
                                            </select>
                                        </div>
                                        <div className="col-span-3"><SearchableSelect label="Consultant / MO" theme="dark" options={(Array.isArray(doctors) ? doctors : []).filter(d => d).map(d=>({id: d.doctor_id, name: d.doctor_name, details: d.degree}))} value={admissionData.doctor_id} onChange={(id, name)=>setAdmissionData({...admissionData, doctor_id: id, doctor_name: name})} onAddNew={()=>setShowNewDoctorForm(true)} /></div>
                                        <div className="col-span-3"><SearchableSelect label="Referrer / Agent" theme="dark" options={(Array.isArray(referrars) ? referrars : []).filter(r => r).map(r=>({id: r.ref_id, name: r.ref_name, details: r.ref_degrees}))} value={admissionData.referrer_id} onChange={(id, name)=>setAdmissionData({...admissionData, referrer_id: id, referrer_name: name})} onAddNew={()=>setShowNewReferrarForm(true)} /></div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Section - Admission Details: Using a soft indigo-slate background */}
                            <div className="bg-indigo-900/20 p-6 rounded-3xl border border-indigo-500/30 shadow-[inner_0_2px_10px_rgba(0,0,0,0.3)]">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <SearchableSelect label="Disease / Indication" theme="dark" options={(Array.isArray(indications) ? indications : []).filter(i => i).map(i=>({id: i.id, name: i.name}))} value={(Array.isArray(indications) ? indications : []).find(i => i && i.name === admissionData.indication)?.id || ''} onChange={(_id, name)=>setAdmissionData({...admissionData, indication: name})} onAddNew={()=>setShowIndicationManager(true)} />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center ml-2 mb-1">
                                            <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Bed No / Ward</label>
                                            {admissionData.bed_no && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setAdmissionData({...admissionData, bed_no: ''})} 
                                                    className="text-[9px] text-rose-300 hover:text-rose-100 font-bold underline"
                                                >
                                                    ক্লিয়ার
                                                </button>
                                            )}
                                        </div>
                                        <select 
                                            value={admissionData.bed_no || ''} 
                                            onChange={e=>setAdmissionData({...admissionData, bed_no: e.target.value})} 
                                            className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                        >
                                            <option value="" className="bg-slate-900 text-slate-400">Select Bed...</option>
                                            {wardDefinitions.map(ward => (
                                                <optgroup key={ward.id} label={ward.name} className="bg-slate-900 text-slate-400 font-bold">
                                                    {ward.beds.map(b => {
                                                        const occ = getOccupiedPatient(b);
                                                        const isOccupied = !!occ;
                                                        return (
                                                            <option 
                                                                key={b} 
                                                                value={b} 
                                                                disabled={isOccupied} 
                                                                className={`bg-slate-900 ${isOccupied ? 'text-rose-400 font-normal italic' : 'text-emerald-400 font-bold'}`}
                                                            >
                                                                {isOccupied ? `🔴 ${b} (বুকড: ${occ.patient_name || 'Patient'})` : `🟢 ${b} (খালি / Available)`}
                                                            </option>
                                                        );
                                                    })}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                    <div><label className="text-[10px] font-black text-emerald-300 uppercase ml-2 mb-1 block tracking-widest">Contract Bill (৳)</label><input type="number" value={admissionData.contract_amount} onChange={e=>setAdmissionData({...admissionData, contract_amount: parseFloat(e.target.value)||0})} className="w-full p-3.5 bg-slate-900 border border-emerald-500/30 rounded-xl text-emerald-400 font-black text-lg shadow-inner outline-none focus:ring-2 focus:ring-emerald-500 transition-all" onFocus={e=>e.target.select()}/></div>
                                    <div><label className="text-[10px] font-black text-slate-300 uppercase ml-2 mb-1 block tracking-widest">Adm. Date</label><input type="date" value={admissionData.admission_date} onChange={e=>setAdmissionData({...admissionData, admission_date: e.target.value})} className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all"/></div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Current Admitted Patients Section: Compact Height & Full Patient Details */}
                    <div className="bg-[#faf9f6] p-5 sm:p-6 rounded-[2rem] border-2 border-sky-500/40 shadow-xl overflow-hidden text-slate-900">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-slate-300 pb-3 gap-3">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                                <Activity className="text-emerald-600 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" size={20}/> 
                                <span>Current Admitted Patients (বর্তমান ভর্তি রোগী: {filteredAdmissions.length} জন)</span>
                            </h3>
                            <div className="flex flex-1 max-w-md w-full relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                <input 
                                    type="text" 
                                    placeholder="Search by Name, Mobile, ID, Bed, Address, Doctor..." 
                                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button onClick={handlePrintAdmissionList} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3.5 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 border border-slate-300 shrink-0 shadow-sm">
                                <PrinterIcon size={13}/> Print Active List
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-inner bg-white">
                             <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-200 text-[10px] uppercase font-black text-slate-700 tracking-widest border-b border-slate-300">
                                    <tr>
                                        <th className="py-2.5 px-2 w-10 text-center">SL</th>
                                        <th className="py-2.5 px-3">Adm ID</th>
                                        <th className="py-2.5 px-3">রোগীর বিবরণ (Name, Age, Mobile, Address)</th>
                                        <th className="py-2.5 px-3">বেড / ওয়ার্ড</th>
                                        <th className="py-2.5 px-3">কনসালটেন্ট ও রোগ</th>
                                        <th className="py-2.5 px-3">ভর্তি তারিখ</th>
                                        <th className="py-2.5 px-3 text-center">একশন (Action)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredAdmissions.map((adm, index) => {
                                        const safePatients = Array.isArray(patients) ? patients : [];
                                        const pat = safePatients.find(p => p && (
                                            p.pt_id === adm.patient_id || 
                                            p.patient_id === adm.patient_id || 
                                            (p.pt_name && adm.patient_name && p.pt_name.trim().toLowerCase() === adm.patient_name.trim().toLowerCase())
                                        ));
                                        const ageGenderStr = [pat?.ageY ? `${pat.ageY} বছর` : '', pat?.gender].filter(Boolean).join(' • ');
                                        const mobileStr = adm.patient_mobile || pat?.mobile || '';
                                        const addressText = [pat?.address, pat?.thana, pat?.district].filter(Boolean).join(', ');

                                        return (
                                            <tr key={adm.admission_id} className="hover:bg-sky-50/70 transition-colors group">
                                                <td className="py-2 px-2 text-center text-slate-500 font-mono text-xs font-bold">{index + 1}</td>
                                                <td className="py-2 px-3 font-mono text-xs text-blue-700 font-black whitespace-nowrap">{adm.admission_id}</td>
                                                <td className="py-2 px-3">
                                                    <div className="flex items-center gap-2 flex-wrap leading-tight">
                                                        <span className="font-black text-slate-900 uppercase text-xs tracking-tight">{adm.patient_name}</span>
                                                        {ageGenderStr && (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                                {ageGenderStr}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2.5 text-[11px] text-slate-600 mt-0.5 leading-none flex-wrap">
                                                        {mobileStr ? (
                                                            <span className="font-mono text-emerald-800 font-bold">
                                                                📞 {mobileStr}
                                                            </span>
                                                        ) : null}
                                                        {addressText ? (
                                                            <span className="text-slate-600 truncate max-w-[260px]" title={addressText}>
                                                                📍 {addressText}
                                                            </span>
                                                        ) : null}
                                                        {!mobileStr && !addressText && (
                                                            <span className="text-slate-400 italic text-[10px]">মোবাইল/ঠিকানা উল্লেখ নেই</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3 whitespace-nowrap">
                                                    <span className="px-2.5 py-1 rounded-md text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
                                                        {adm.bed_no || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 leading-tight">
                                                    <div className="font-bold text-slate-800 text-xs truncate max-w-[170px]" title={adm.doctor_name}>{adm.doctor_name || '---'}</div>
                                                    <div className="text-[10px] text-slate-500 italic truncate max-w-[170px]" title={adm.indication}>{adm.indication || '---'}</div>
                                                </td>
                                                <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600 font-semibold">
                                                    {adm.admission_date || '---'}
                                                </td>
                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 justify-center">
                                                        <button 
                                                            onClick={()=>handleSelectPatientForTreatment(adm)} 
                                                            className="bg-gradient-to-br from-emerald-600 to-teal-800 hover:from-emerald-500 hover:to-teal-700 text-white px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider shadow-sm transition-all border border-emerald-400/30"
                                                        >
                                                            Treatment
                                                        </button>
                                                        <button 
                                                            onClick={()=>handleEditAdmissionInfo(adm)} 
                                                            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all border border-slate-300 shadow-sm"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={async ()=>{
                                                                if(confirm(`Are you sure you want to CANCEL admission for ${adm.patient_name}? This will free the bed.`)) {
                                                                    await dbService.deleteAdmissionDirectly(adm);
                                                                    setAdmissions(prev => prev.filter(a => a.admission_id !== adm.admission_id));
                                                                    setSuccessMessage("Admission cancelled successfully.");
                                                                }
                                                            }} 
                                                            className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all border border-rose-300 shadow-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredAdmissions.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400 italic font-black uppercase opacity-60 text-base tracking-[0.2em]">
                                                {searchTerm ? "No Matching Patients" : "No Active Inpatients"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                             </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-900 p-5 rounded-2xl border border-blue-500/30 shadow-2xl mb-6 flex justify-between items-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10">
                            {admissionData.admission_id ? ( 
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Treating: <span className="text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{admissionData.patient_name}</span></h2>
                                    <p className="text-[10px] font-bold text-blue-100/70 uppercase tracking-[0.2em] mt-1">ID: <span className="font-mono text-white">{admissionData.admission_id}</span> | Dr: <span className="text-white">{admissionData.doctor_name}</span> | Bed: <span className="text-amber-400 font-black">{admissionData.bed_no || 'N/A'}</span></p>
                                </div> 
                            ) : ( 
                                <div className="text-cyan-200 font-black uppercase text-sm tracking-widest animate-pulse">Please select a patient from the Admission Section list first.</div> 
                            )}
                        </div>
                        {admissionData.admission_id && ( 
                            <div className="flex gap-4 items-center relative z-10">
                                <button onClick={handlePrintTreatmentRecord} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all border border-white/20 backdrop-blur-sm"><FileTextIcon className="w-5 h-5"/> Print Full Chart</button>
                                <div className="text-right border-l border-white/20 pl-4">
                                    <span className="block text-[9px] text-blue-200 uppercase font-black tracking-widest mb-1">Status</span>
                                    <span className="inline-block px-3 py-1 bg-emerald-500/80 text-white text-[10px] rounded-lg font-black uppercase tracking-tighter border border-emerald-400/30 shadow-lg shadow-emerald-900/40">Admitted</span>
                                </div> 
                            </div>
                        )}
                    </div>
                    {admissionData.admission_id && (
                        <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                            <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-8 overflow-x-auto scrollbar-hide">
                                {['orders', 'rounds', 'nurse', 'demands'].map(t => ( 
                                    <button 
                                        key={t} 
                                        onClick={() => setActiveSubTab(t as any)} 
                                        className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${activeSubTab === t ? 'bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-lg shadow-blue-900/40 border border-blue-400/30' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-900/50'}`}
                                    > 
                                        {t === 'orders' ? 'Doctor Orders' : t === 'rounds' ? 'Doctor Round' : t === 'demands' ? 'Drug Demands' : 'Nurse Chart'} 
                                    </button> 
                                ))}
                            </div>
                            {activeSubTab === 'orders' && (
                                <div className="space-y-6">
                                    <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-inner">
                                        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{editingOrderBlockId ? "Edit Treatment / Order" : "Add Treatment / Order"}</h4>
                                            <div className="flex gap-3">
                                                <button onClick={() => setShowTemplateModal(true)} className="text-[10px] bg-blue-600 px-4 py-2 rounded-xl text-white hover:bg-blue-500 font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 transition-all border border-blue-400/30">Templates</button>
                                                {editingOrderBlockId && <button onClick={() => { setEditingOrderBlockId(null); setCurrentOrder({ category: 'Conservative', diet: 'Regular', medications: [], note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false}) }); }} className="text-[10px] text-rose-400 hover:text-rose-300 font-black uppercase tracking-widest transition-colors">Cancel Edit</button>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                            <div><label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block tracking-widest">Date</label><input type="date" value={currentOrder.date} onChange={e=>setCurrentOrder({...currentOrder, date: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"/></div>
                                            <div><label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block tracking-widest">Time</label><input type="time" value={currentOrder.time} onChange={e=>setCurrentOrder({...currentOrder, time: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"/></div>
                                            <div><label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block tracking-widest">Category</label><select value={currentOrder.category} onChange={e=>setCurrentOrder({...currentOrder, category: e.target.value as any})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"><option value="Conservative" className="bg-slate-900">Conservative</option><option value="Pre-operative" className="bg-slate-900">Pre-operative</option><option value="Operative" className="bg-slate-900">Operative</option><option value="Post-operative" className="bg-slate-900">Post-operative</option></select></div>
                                            <div><label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block tracking-widest">Diet</label><select value={currentOrder.diet} onChange={e=>setCurrentOrder({...currentOrder, diet: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all">{(Array.isArray(dietOptions) ? dietOptions : []).map(d=><option key={d} value={d} className="bg-slate-900">{d}</option>)}</select></div>
                                        </div>
                                        <div className="bg-slate-900 p-6 rounded-2xl mb-6 border border-slate-800 shadow-lg">
                                            <div className="flex flex-col md:flex-row gap-3 items-end">
                                                <div className="flex-1 relative w-full">
                                                    <SearchableSelect theme="dark" label="" options={(Array.isArray(medicines) ? medicines : []).map(m => m && ({ id: m.id, name: `${m.tradeName} (${m.genericName})` }))} value={selectedDrugId} onChange={handleMedicineSelect} placeholder="Search Drug..." inputHeightClass="h-12 bg-slate-950 border-slate-800" />
                                                    <button onClick={() => setShowDrugDemandModal(true)} className="absolute right-1.5 top-2.5 h-7 w-7 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-black flex items-center justify-center text-sm z-20 shadow-lg transition-all">+</button>
                                                </div>
                                                <div className="flex gap-2 w-full md:w-auto">
                                                    <select value={newMedication.type} onChange={e=>setNewMedication({...newMedication, type:e.target.value})} className="h-12 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-[11px] font-black uppercase px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all">{(Array.isArray(drugTypes) ? drugTypes : []).map(t=><option key={t} value={t} className="bg-slate-900">{t}</option>)}</select>
                                                    <input value={newMedication.dosage} onChange={e=>setNewMedication({...newMedication, dosage:e.target.value})} placeholder="Dose" className="h-12 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-bold px-4 w-24 outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"/>
                                                    <select value={newMedication.frequency} onChange={e=>setNewMedication({...newMedication, frequency:Number(e.target.value)})} className="h-12 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-[11px] font-black uppercase px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all">{(Array.isArray(drugFrequencies) ? drugFrequencies : []).map(f=> f && <option key={f.value} value={f.value} className="bg-slate-900">{f.label}</option>)}</select>
                                                    <button onClick={addMedicationToDraft} className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-xl font-black hover:from-blue-500 hover:to-indigo-700 shadow-lg shadow-blue-900/40 transition-all border border-blue-400/30">+</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 mb-6 min-h-[100px] shadow-inner">
                                            {(Array.isArray(currentOrder.medications) ? currentOrder.medications : []).map((m, i) => m && (
                                                <div key={m.id} className="flex justify-between items-center text-sm text-slate-300 border-b border-slate-800/50 pb-3 mb-3 last:border-0 last:mb-0 group">
                                                    <span className="font-medium">
                                                        <span className="text-slate-600 font-mono text-xs mr-3">{String(i+1).padStart(2, '0')}.</span>
                                                        <b className="text-blue-400 uppercase tracking-tight">{m.type} {m.name}</b> 
                                                        <span className="text-slate-500 mx-2">({m.dosage})</span> 
                                                        <span className="mx-2 text-slate-700">---</span> 
                                                        <span className="text-amber-500 font-black text-[10px] uppercase tracking-widest">{getFrequencyText(m.frequency)}</span>
                                                    </span>
                                                    <button onClick={()=>removeMedicationFromDraft(m.id)} className="text-rose-500/50 hover:text-rose-400 p-2 transition-all opacity-0 group-hover:opacity-100"><TrashIcon size={16}/></button>
                                                </div>
                                            ))}
                                            {(!currentOrder.medications || currentOrder.medications.length === 0) && <p className="text-center text-slate-600 text-[10px] py-8 font-black uppercase tracking-[0.3em] opacity-40 italic">No medications added to draft yet...</p>}
                                        </div>
                                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 mb-6">
                                            <label className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                                <FileTextIcon size={12}/> Clinical Detail and Order Note
                                            </label>
                                            <textarea 
                                                value={currentOrder.note} 
                                                onChange={e=>setCurrentOrder({...currentOrder, note:e.target.value})} 
                                                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 text-xs font-medium h-20 shadow-inner focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-800" 
                                                placeholder="Add clinical notes or special instructions here..."
                                            />
                                        </div>
                                        <button onClick={handleSaveOrderBlock} className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl transition-all duration-300 border ${editingOrderBlockId ? 'bg-gradient-to-br from-amber-500 to-orange-700 text-white border-amber-400/30 shadow-amber-900/40' : 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white border-emerald-400/30 shadow-emerald-900/40'}`}>{editingOrderBlockId ? "Update Clinical Order" : "Save Clinical Order"}</button>
                                    </div>
                                    <div className="space-y-6">
                                        {(Array.isArray(admissionData.clinical_orders) ? admissionData.clinical_orders : []).map(block => (
                                            <div key={block.id} className={`bg-slate-900 border ${editingOrderBlockId === block.id ? 'border-amber-500 ring-4 ring-amber-500/20' : 'border-slate-800'} rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500 hover:border-slate-700`}>
                                                <div className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800">
                                                    <div className="flex gap-4 items-center">
                                                        <span className="text-blue-400 font-black font-mono text-xs tracking-tighter bg-blue-900/20 px-3 py-1 rounded-lg border border-blue-500/20">{block.date} {block.time}</span>
                                                        <span className="text-[9px] bg-indigo-900/40 px-3 py-1 rounded-full text-indigo-300 font-black uppercase tracking-widest border border-indigo-500/20">{block.category}</span>
                                                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-900/20 px-3 py-1 rounded-lg border border-emerald-500/20">Diet: {block.diet}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleEditOrder(block)} className="text-amber-400 text-[9px] font-black uppercase tracking-widest hover:text-amber-300 px-4 py-1.5 bg-amber-900/30 rounded-lg transition-all border border-amber-500/20">EDIT</button>
                                                        <button onClick={()=>{if(confirm("Delete?")) setAdmissionData((prev: AdmissionRecord)=>({...prev, clinical_orders: (Array.isArray(prev.clinical_orders) ? prev.clinical_orders : []).filter((o: ClinicalOrderBlock)=>o.id!==block.id)}))}} className="text-rose-400 text-[9px] font-black uppercase tracking-widest hover:text-rose-300 px-4 py-1.5 bg-rose-900/30 rounded-lg transition-all border border-rose-500/20">DEL</button>
                                                    </div>
                                                </div>
                                                <div className="p-6">
                                                    {(Array.isArray(block.medications) ? block.medications : []).map((m, i) => m && (
                                                        <div key={i} className="text-sm text-slate-300 flex items-center mb-3 last:mb-0 group">
                                                            <span className="w-8 text-slate-600 font-mono font-bold text-xs">{String(i+1).padStart(2, '0')}.</span>
                                                            <span className="font-black text-blue-400 uppercase tracking-tight group-hover:text-blue-300 transition-colors">{m.type} {m.name}</span>
                                                            <span className="text-slate-500 ml-3 text-xs font-bold">({m.dosage})</span>
                                                            <span className="mx-4 text-slate-800">|</span>
                                                            <span className="text-amber-500 font-black text-[9px] uppercase tracking-[0.2em] bg-amber-900/20 px-2 py-0.5 rounded border border-amber-500/10">{getFrequencyText(m.frequency)}</span>
                                                        </div>
                                                    ))}
                                                    {block.note && (
                                                        <div className="mt-5 pt-5 border-t border-slate-800/50 text-sm text-slate-400 italic leading-relaxed">
                                                            <span className="text-slate-600 text-[9px] font-black uppercase tracking-widest mr-3 not-italic bg-slate-950 px-2 py-0.5 rounded border border-slate-800">NOTE:</span>
                                                            {block.note}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {(Array.isArray(admissionData.clinical_orders) ? admissionData.clinical_orders : []).length === 0 && (
                                            <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-950/30">
                                                <p className="text-slate-700 font-black uppercase tracking-[0.4em] text-lg opacity-30">No Treatment Orders Yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {activeSubTab === 'rounds' && (
                                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-inner">
                                    <div className="flex flex-col md:flex-row gap-3 mb-8 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
                                        <div className="flex gap-2 flex-1">
                                            <input type="time" value={roundTime} onChange={e=>setRoundTime(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl text-slate-200 p-3 w-32 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
                                            <div className="relative flex-1">
                                                <input list="doctor_list_round" type="text" value={roundDoctor} onChange={e=>setRoundDoctor(e.target.value)} placeholder="Doctor Name" className="w-full bg-slate-950 border border-slate-800 rounded-xl text-slate-200 p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
                                                <datalist id="doctor_list_round">{(Array.isArray(doctors) ? doctors : []).map(d=>d && <option key={d.doctor_id} value={d.doctor_name}/>)}</datalist>
                                            </div>
                                        </div>
                                        <input type="text" value={newRoundNote} onChange={e=>setNewRoundNote(e.target.value)} placeholder="Enter Round Note..." className="flex-[2] bg-slate-950 border border-slate-800 rounded-xl text-slate-200 p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"/>
                                        <button onClick={()=>{if(!newRoundNote)return; const updated = {...admissionData, doctor_rounds:[...(Array.isArray(admissionData.doctor_rounds) ? admissionData.doctor_rounds : []), {id:Date.now(), date:new Date().toISOString().split('T')[0], time:roundTime, note:newRoundNote, by:roundDoctor}]}; setAdmissionData(updated); syncAdmissionToGlobal(updated); setNewRoundNote('');}} className="bg-gradient-to-br from-teal-600 to-emerald-800 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-900/40 border border-emerald-400/30 hover:from-teal-500 hover:to-emerald-700 transition-all">Add Round</button>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto bg-slate-950 rounded-2xl border border-slate-800 shadow-inner custom-scrollbar">
                                        <table className="w-full text-sm text-left text-slate-300 border-collapse">
                                            <thead className="bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
                                                <tr>
                                                    <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">Time</th>
                                                    <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">Note</th>
                                                    <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">By</th>
                                                    <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {(Array.isArray(admissionData.doctor_rounds) ? admissionData.doctor_rounds : []).map(r=>r && (
                                                    <tr key={r.id} className="hover:bg-slate-900/50 transition-colors group">
                                                        <td className="p-4 font-mono text-xs text-blue-400 font-bold">{r.time}</td>
                                                        <td className="p-4 text-xs font-medium text-slate-300">{r.note}</td>
                                                        <td className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-wider bg-slate-900/30 rounded-lg inline-block my-2 mx-4">{r.by}</td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={()=>{const updated = {...admissionData, doctor_rounds:(Array.isArray(admissionData.doctor_rounds) ? admissionData.doctor_rounds : []).filter(round=>round.id!==r.id)}; setAdmissionData(updated); syncAdmissionToGlobal(updated);}} className="text-rose-500/50 hover:text-rose-400 p-2 transition-all opacity-0 group-hover:opacity-100"><TrashIcon size={16}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(Array.isArray(admissionData.doctor_rounds) ? admissionData.doctor_rounds : []).length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="p-12 text-center text-slate-700 font-black uppercase tracking-[0.3em] text-xs opacity-30">No doctor rounds recorded</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            
                            {activeSubTab === 'nurse' && (
                                <div className="space-y-8">
                                    <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-inner">
                                        <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg mb-8">
                                            <div className="w-full md:w-96">
                                                <SearchableSelect theme="dark" label="Select Performing Nurse (Logged)" options={(Array.isArray(activeNurses) ? activeNurses : []).map(nurse => nurse && ({ id: nurse.emp_name, name: nurse.emp_name, details: nurse.job_position }))} value={performingNurse} onChange={(_id, name) => setPerformingNurse(name)} onAddNew={() => {}} placeholder="Search Nurse..." inputHeightClass="h-12 bg-slate-950 border-slate-800" />
                                            </div>
                                            <div className="flex-1 text-slate-500 text-[10px] font-bold uppercase tracking-widest italic opacity-50">
                                                * Please ensure the correct nurse is selected before logging medications.
                                            </div>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-400 mb-6 uppercase tracking-[0.3em] flex items-center gap-3">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                                            Scheduled Medications
                                        </h4>
                                        <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-2xl bg-slate-950/50">
                                            <table className="w-full text-sm text-left text-slate-300 border-collapse">
                                                <thead className="bg-slate-900 text-[9px] uppercase font-black text-slate-500 tracking-[0.2em]">
                                                    <tr>
                                                        <th className="p-5 border-b border-slate-800">Drug Details</th>
                                                        <th className="p-5 border-b border-slate-800">Frequency</th>
                                                        <th className="p-5 border-b border-slate-800">Category</th>
                                                        <th className="p-5 border-b border-slate-800">Last Given</th>
                                                        <th className="p-5 border-b border-slate-800">Next Dose Due</th>
                                                        <th className="p-5 border-b border-slate-800 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/50">
                                                    {(Array.isArray(admissionData.clinical_orders) ? admissionData.clinical_orders : []).flatMap(o => o && Array.isArray(o.medications) ? o.medications : []).map((med, idx) => {
                                                        if (!med) return null;
                                                        const now = Date.now();
                                                        const logs = (Array.isArray(admissionData.nurse_chart) ? admissionData.nurse_chart : []).filter(l => l && l.medicationId === med.id).sort((a, b) => b.id - a.id);
                                                        const lastLog = logs[0];
                                                        let statusText = 'Not Started';
                                                        let nextTimeText = 'Start Now';
                                                        let lastGivenText = 'Never';
                                                        let lastGivenSrc = '';
                                                        let nextColorClass = 'text-rose-600 font-black';
                                                        let lastColorClass = 'text-gray-400';
 
                                                        const safeMedicines = Array.isArray(medicines) ? medicines : [];
                                                        const substituteMed = safeMedicines.find(m => 
                                                            m && med.genericName && m.genericName && 
                                                            m.genericName.toLowerCase() === med.genericName.toLowerCase() && 
                                                            m.stock > 0
                                                        );
                                                        
                                                        const autoSrc = substituteMed ? 'Clinic' : 'Outside';
                                                        const currentSrc = medicationSources[med.id] || autoSrc;
 
                                                        if (lastLog) {
                                                            lastGivenText = lastLog.time;
                                                            lastGivenSrc = lastLog.supplySrc === 'Outside' ? '(Outside)' : '(Clinic)';
                                                            lastColorClass = 'text-gray-600';
                                                            if (med.frequency === 0) {
                                                                statusText = 'Completed';
                                                                nextTimeText = '-';
                                                                nextColorClass = 'text-emerald-600';
                                                            } else {
                                                                const lastTimeMs = lastLog.id; 
                                                                const nextTimeMs = lastTimeMs + (med.frequency * 60 * 60 * 1000);
                                                                const nextDate = new Date(nextTimeMs);
                                                                const isOverdue = now > nextTimeMs;
                                                                nextTimeText = `Next: ${nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                                                statusText = isOverdue ? 'On Schedule' : 'On Schedule';
                                                                nextColorClass = isOverdue ? 'text-rose-600 font-black' : 'text-emerald-600 font-bold';
                                                            }
                                                        }
 
                                                        return (
                                                            <tr key={`${med.id}-${idx}`} className="hover:bg-slate-900/80 transition-all group border-b border-slate-800/50">
                                                                <td className="p-5">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-blue-400 uppercase tracking-tight text-xs">{med.type}. {med.name}</span>
                                                                        <span className="text-[10px] text-slate-500 font-bold mt-1">Dose: {med.dosage}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-5">
                                                                    <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest bg-amber-900/20 px-2 py-0.5 rounded border border-amber-500/10">
                                                                        {getFrequencyText(med.frequency)}
                                                                    </span>
                                                                </td>
                                                                <td className="p-5">
                                                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-60">{med.category}</span>
                                                                </td>
                                                                <td className="p-5">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className={`text-[10px] font-black uppercase tracking-tighter ${lastColorClass}`}>{statusText} ({lastGivenText})</span>
                                                                        <span className="text-[9px] text-amber-500/80 font-bold">{lastGivenSrc}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-5">
                                                                    <span className={`text-[10px] uppercase tracking-widest ${nextColorClass}`}>{nextTimeText}</span>
                                                                </td>
                                                                <td className="p-5 text-right">
                                                                    <div className="flex flex-col gap-2 items-end">
                                                                        <div className="flex gap-2 items-center">
                                                                            <select 
                                                                                value={currentSrc}
                                                                                onChange={(e) => setMedicationSources(prev => ({...prev, [med.id]: e.target.value as 'Clinic' | 'Outside'}))}
                                                                                className="bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-black uppercase text-slate-400 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                                            >
                                                                                <option value="Clinic" className="bg-slate-900">Clinic Supply</option>
                                                                                <option value="Outside" className="bg-slate-900">Patient/Outside</option>
                                                                            </select>
                                                                            <button 
                                                                                onClick={() => {
                                                                                    if(!performingNurse) return alert("Select Nurse First");
                                                                                    
                                                                                    if (lastLog && (Date.now() - lastLog.id < 120000)) {
                                                                                        if (!confirm("সতর্কতা: এই ঔষধটি মাত্র ২ মিনিট আগে দেওয়া হয়েছে। আপনি কি পুনরায় দিতে চান? (Medicine given < 2 mins ago. Proceed?)")) {
                                                                                            return;
                                                                                        }
                                                                                    }
                                                                
                                                                                    let finalInventoryId = med.inventoryId;
                                                                                    if (currentSrc === 'Clinic') {
                                                                                        if (substituteMed) {
                                                                                            finalInventoryId = substituteMed.id;
                                                                                            const updatedMedicines = (Array.isArray(medicines) ? medicines : []).map(m => m && 
                                                                                                m.id === substituteMed.id 
                                                                                                ? { ...m, stock: m.stock - 1 } 
                                                                                                : m
                                                                                            );
                                                                                            setMedicines(updatedMedicines);
                                                                                        } else {
                                                                                            return alert("Stock unavailable for Clinic Supply. Please switch to Outside.");
                                                                                        }
                                                                                    }
                                                                
                                                                                    const newLog: TreatmentLog = { 
                                                                                        id: Date.now(), 
                                                                                        date: new Date().toISOString().split('T')[0], 
                                                                                        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), 
                                                                                        note: `Given: ${med.name}`, 
                                                                                        by: performingNurse, 
                                                                                        medicationId: med.id,
                                                                                        supplySrc: currentSrc,
                                                                                        actualInventoryId: finalInventoryId
                                                                                    };
                                                                                    const updated = {...admissionData, nurse_chart: [newLog, ...(Array.isArray(admissionData.nurse_chart) ? admissionData.nurse_chart : [])]};
                                                                                    setAdmissionData(updated);
                                                                                    syncAdmissionToGlobal(updated);
                                                                                }} 
                                                                                className={`px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border ${performingNurse ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white border-emerald-400/30 shadow-lg shadow-emerald-900/40 hover:from-emerald-500 hover:to-teal-700' : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed opacity-50'}`}
                                                                            >
                                                                                Give
                                                                            </button>
                                                                        </div>
                                                                        {substituteMed ? (
                                                                            <span className="text-[9px] text-emerald-400 font-black uppercase tracking-tighter bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/10">
                                                                                Available: {substituteMed.tradeName} (Stock: {substituteMed.stock})
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[9px] text-rose-400 font-black uppercase tracking-tighter bg-rose-900/20 px-2 py-0.5 rounded border border-rose-500/10">Out of Stock</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {((Array.isArray(admissionData.clinical_orders) ? admissionData.clinical_orders : []).flatMap(o => o && Array.isArray(o.medications) ? o.medications : [])).length === 0 && <tr><td colSpan={6} className="p-20 text-center text-slate-700 font-black uppercase tracking-[0.4em] text-xs opacity-30">No medications ordered by doctor yet.</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-inner">
                                        <div className="flex gap-3 mb-6 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
                                            <input 
                                                type="text" 
                                                value={newNurseNote} 
                                                onChange={e => setNewNurseNote(e.target.value)} 
                                                placeholder="Enter Nurse Note..." 
                                                className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner placeholder:text-slate-700"
                                            />
                                            <button 
                                                onClick={() => { 
                                                    if(!performingNurse) return alert("Select Nurse"); 
                                                    const updated = {
                                                        ...admissionData, 
                                                        nurse_chart: [
                                                            { 
                                                                id: Date.now(), 
                                                                date: new Date().toISOString().split('T')[0], 
                                                                time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), 
                                                                note: newNurseNote, 
                                                                by: performingNurse 
                                                            }, 
                                                            ...(Array.isArray(admissionData.nurse_chart) ? admissionData.nurse_chart : [])
                                                        ]
                                                    }; 
                                                    setAdmissionData(updated); 
                                                    syncAdmissionToGlobal(updated); 
                                                    setNewNurseNote('');
                                                }} 
                                                className="bg-gradient-to-br from-purple-600 to-indigo-800 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-purple-900/40 border border-purple-400/30 hover:from-purple-500 hover:to-indigo-700 transition-all"
                                            >
                                                Log Note
                                            </button>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto bg-slate-950 rounded-2xl border border-slate-800 shadow-inner custom-scrollbar">
                                            <table className="w-full text-sm text-left text-slate-300 border-collapse">
                                                <thead className="bg-slate-900 sticky top-0 z-10 backdrop-blur-md">
                                                    <tr>
                                                        <th className="p-4 text-[9px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">Time</th>
                                                        <th className="p-4 text-[9px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">Activity / Note</th>
                                                        <th className="p-4 text-[9px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">Nurse</th>
                                                        <th className="p-4 text-[9px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/50">
                                                    {(Array.isArray(admissionData.nurse_chart) ? admissionData.nurse_chart : []).map(n=>n && (
                                                        <tr key={n.id} className="hover:bg-slate-900/50 transition-colors group">
                                                            <td className="p-4 font-mono text-[10px] text-blue-400 font-bold">{n.time}</td>
                                                            <td className="p-4 text-xs font-medium text-slate-300">{n.note}</td>
                                                            <td className="p-4">
                                                                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider bg-purple-900/20 px-3 py-1 rounded-lg border border-purple-500/20">{n.by}</span>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <button onClick={() => {if(confirm("Delete log?")) setAdmissionData((prev: AdmissionRecord) => ({...prev, nurse_chart: (Array.isArray(prev.nurse_chart) ? prev.nurse_chart : []).filter(l => l.id !== n.id)}))}} className="text-rose-500/50 hover:text-rose-400 p-2 transition-all opacity-0 group-hover:opacity-100"><TrashIcon size={16}/></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(Array.isArray(admissionData.nurse_chart) ? admissionData.nurse_chart : []).length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="p-12 text-center text-slate-700 font-black uppercase tracking-[0.3em] text-xs opacity-30">No activity logs recorded</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeSubTab === 'demands' && (
                                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-inner">
                                    <div className="flex justify-between items-center mb-6 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
                                        <div className="flex flex-col">
                                            <h4 className="text-xl font-black text-blue-400 uppercase tracking-tighter">Drug Demand List</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Pharmacy Requisition Tracking</p>
                                        </div>
                                        <button 
                                            onClick={() => setShowDrugDemandModal(true)} 
                                            className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/40 border border-blue-400/30 hover:from-blue-500 hover:to-indigo-700 transition-all flex items-center gap-2"
                                        >
                                            <PlusIcon size={16}/> Add New Demand
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950 custom-scrollbar">
                                        <table className="w-full text-sm text-left text-slate-300 border-collapse">
                                            <thead className="bg-slate-900 sticky top-0 z-10 backdrop-blur-md">
                                                <tr>
                                                    <th className="p-4 text-[9px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">Drug</th>
                                                    <th className="p-4 text-[9px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">Generic</th>
                                                    <th className="p-4 text-[9px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">Req By</th>
                                                    <th className="p-4 text-[9px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {(Array.isArray(drugDemands) ? drugDemands : []).map(req => req && (
                                                    <tr key={req.id} className="hover:bg-slate-900/50 transition-colors group">
                                                        <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-200">{req.name}</span>
                                                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter mt-0.5">{req.type} {req.strength}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs font-medium text-slate-400 italic">{req.genericName}</td>
                                                        <td className="p-4">
                                                            <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider bg-purple-900/20 px-3 py-1 rounded-lg border border-purple-500/20">{req.requestedBy}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${req.status === 'Pending' ? 'bg-amber-900/20 text-amber-400 border-amber-500/20' : 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20'}`}>
                                                                {req.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(Array.isArray(drugDemands) ? drugDemands : []).length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="p-20 text-center text-slate-700 font-black uppercase tracking-[0.4em] text-xs opacity-30">No drug demands found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Components for Admission & Treatment */}
            {showIndicationManager && (
                <GenericManagerPage 
                    title="Manage Indication" 
                    placeholder="Enter Indication Name" 
                    items={indications} 
                    setItems={setIndications as any} 
                    onClose={()=>setShowIndicationManager(false)} 
                    onSaveAndSelect={(_id, name)=>{setAdmissionData((prev: AdmissionRecord)=>({...prev, indication:name})); setShowIndicationManager(false);}} 
                />
            )}
            {showServiceManager && (
                <GenericManagerPage 
                    title="Manage Services" 
                    placeholder="Enter Service Name" 
                    items={services} 
                    setItems={setServices as any} 
                    onClose={()=>setShowServiceManager(false)} 
                    onSaveAndSelect={(_id, name)=>{setAdmissionData((prev: AdmissionRecord)=>({...prev, service_name:name})); setShowServiceManager(false);}} 
                />
            )}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-lg border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                        <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter flex items-center gap-3">
                            <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><LayoutIcon size={24}/></span>
                            Treatment Templates
                        </h3>
                        <div className="flex gap-3 mb-8">
                            <input 
                                value={newTemplateName} 
                                onChange={e=>setNewTemplateName(e.target.value)} 
                                placeholder="New Template Name..." 
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-slate-200 placeholder:text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                            />
                            <button 
                                onClick={handleSaveTemplate} 
                                className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-900/40 border border-emerald-400/30 hover:from-emerald-500 hover:to-teal-700 transition-all"
                            >
                                Save Current
                            </button>
                        </div>
                        <h4 className="text-[10px] font-black text-slate-500 mb-3 uppercase tracking-[0.3em]">Saved Templates</h4>
                        <div className="max-h-80 overflow-y-auto bg-slate-950 rounded-2xl border border-slate-800 p-2 custom-scrollbar">
                            {(Array.isArray(templates) ? templates : []).map(t => t && (
                                <div key={t.id} className="flex justify-between items-center p-4 hover:bg-slate-900 border-b border-slate-800/50 last:border-0 transition-all rounded-xl mb-1 group">
                                    <div onClick={() => handleLoadTemplate(t)} className="cursor-pointer flex-1">
                                        <div className="font-black text-blue-400 uppercase tracking-tight text-sm group-hover:text-blue-300 transition-colors">{t.name}</div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">{t.category} • {(Array.isArray(t.medications) ? t.medications : []).length} Medications</div>
                                    </div>
                                    <button 
                                        onClick={()=>{setTemplates((prev: TreatmentTemplate[])=>(Array.isArray(prev) ? prev : []).filter((x: TreatmentTemplate)=>x.id!==t.id))}} 
                                        className="text-slate-600 hover:text-rose-500 p-2 transition-colors bg-slate-900 rounded-lg border border-slate-800 hover:border-rose-500/30"
                                    >
                                        <Trash2Icon size={16}/>
                                    </button>
                                </div>
                            ))}
                            {(Array.isArray(templates) ? templates : []).length === 0 && (
                                <div className="text-center text-slate-700 p-12 font-black uppercase tracking-[0.3em] text-[10px] opacity-50 italic">No templates saved yet.</div>
                            )}
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={()=>setShowTemplateModal(false)} 
                                className="bg-slate-800 hover:bg-slate-750 text-slate-400 px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showDrugDemandModal && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-md border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                        <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter flex items-center gap-3">
                            <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><PlusIcon size={24}/></span>
                            New Drug Demand
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-black mb-1.5 block tracking-widest">Trade Name</label>
                                <input 
                                    value={newDrugEntry.name} 
                                    onChange={e=>setNewDrugEntry({...newDrugEntry, name:e.target.value})} 
                                    className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                                    placeholder="Enter Trade Name..."
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-black mb-1.5 block tracking-widest">Generic Name</label>
                                <input 
                                    value={newDrugEntry.generic} 
                                    onChange={e=>setNewDrugEntry({...newDrugEntry, generic:e.target.value})} 
                                    className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                                    placeholder="e.g. Paracetamol"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase font-black mb-1.5 block tracking-widest">Type</label>
                                    <select 
                                        value={newDrugEntry.type} 
                                        onChange={e=>setNewDrugEntry({...newDrugEntry, type: e.target.value})} 
                                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none"
                                    >
                                        {drugTypes.map(t=><option key={t} value={t} className="bg-slate-900">{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase font-black mb-1.5 block tracking-widest">Strength</label>
                                    <input 
                                        value={newDrugEntry.strength} 
                                        onChange={e=>setNewDrugEntry({...newDrugEntry, strength: e.target.value})} 
                                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                                        placeholder="500mg"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-3">
                            <button 
                                onClick={()=>setShowDrugDemandModal(false)} 
                                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-400 px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveNewDrugEntry} 
                                className="flex-[2] bg-gradient-to-br from-blue-600 to-indigo-800 text-white px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/40 border border-blue-400/30 hover:from-blue-500 hover:to-indigo-700 transition-all"
                            >
                                Add Demand
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showNewPatientForm && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500"></div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <PatientInfoPage 
                                performBlockingSync={performBlockingSync}
                                patients={patients} 
                                setPatients={setPatients} 
                                isEmbedded={true} 
                                onClose={()=>setShowNewPatientForm(false)} 
                                onSaveAndSelect={(id,name)=>{
                                    const safePatients = Array.isArray(patients) ? patients : [];
                                    const p = safePatients.find(pt => pt && pt.pt_id === id);
                                    setAdmissionData((prev: AdmissionRecord)=>({
                                        ...prev, 
                                        patient_id: id, 
                                        patient_name: name,
                                        patient_mobile: prev.patient_mobile || p?.mobile || '',
                                        mobile_relation: prev.mobile_relation || p?.mobile_relation || 'Self'
                                    })); 
                                    setShowNewPatientForm(false);
                                    setShowPatientSearchModal(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
            {showNewDoctorForm && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <DoctorInfoPage 
                                performBlockingSync={performBlockingSync}
                                doctors={doctors} 
                                setDoctors={setDoctors} 
                                isEmbedded={true} 
                                onClose={()=>setShowNewDoctorForm(false)} 
                                onSaveAndSelect={(id,name)=>{
                                    setAdmissionData((prev: AdmissionRecord)=>({...prev, doctor_id:id, doctor_name:name})); 
                                    setShowNewDoctorForm(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
            {showNewReferrarForm && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"></div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <ReferrerInfoPage 
                                performBlockingSync={performBlockingSync}
                                referrars={referrars} 
                                setReferrars={setReferrars} 
                                isEmbedded 
                                onClose={()=>setShowNewReferrarForm(false)} 
                                onSaveAndSelect={(id,name)=>{
                                    setAdmissionData((prev: AdmissionRecord)=>({...prev, referrer_id:id, referrer_name:name})); 
                                    setShowNewReferrarForm(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 animate-pulse"></div>
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                                <AlertCircle className="w-10 h-10 text-blue-400 animate-pulse" />
                            </div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{confirmModal.title}</h3>
                            <p className="text-slate-400 font-medium text-lg leading-relaxed">{confirmModal.message}</p>
                            <div className="flex gap-4 w-full pt-4">
                                <button 
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-slate-700 active:scale-95"
                                >
                                    No, Cancel
                                </button>
                                <button 
                                    onClick={confirmModal.onConfirm}
                                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-900/40 transition-all active:scale-95 border border-blue-400/30"
                                >
                                    Yes, Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PATIENT SEARCH MODAL */}
            {showPatientSearchModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl max-h-[95vh] rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-white/5 bg-slate-950/40 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
                                    <UsersIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Advanced Patient Search</h2>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Search by Name, mobile, address or Upazila</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setShowNewPatientForm(true)}
                                    className="flex items-center gap-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-900/20"
                                >
                                    <span className="text-lg">+</span> New Patient
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowPatientSearchModal(false);
                                        setPatientSearchFilters({ name: '', mobile: '', address: '', thana: '', age: '' });
                                    }}
                                    className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all duration-300 font-bold text-xl"
                                >
                                    X
                                </button>
                            </div>
                        </div>

                        {/* Modal Content - SEARCH FILTERS */}
                        <div className="px-8 py-5 bg-slate-950/20 grid grid-cols-1 md:grid-cols-5 gap-6 border-b border-white/5 shrink-0">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Search Name</label>
                                <div className="relative group">
                                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Name..."
                                        value={patientSearchFilters.name}
                                        onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Age</label>
                                <input 
                                    type="text" 
                                    placeholder="Age..."
                                    value={patientSearchFilters.age}
                                    onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, age: e.target.value }))}
                                    className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mobile Number</label>
                                <input 
                                    type="text" 
                                    placeholder="017..."
                                    value={patientSearchFilters.mobile}
                                    onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, mobile: e.target.value }))}
                                    className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Address / Village</label>
                                <input 
                                    type="text" 
                                    placeholder="Address..."
                                    value={patientSearchFilters.address}
                                    onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upazila / Thana</label>
                                <input 
                                    type="text" 
                                    placeholder="Thana..."
                                    value={patientSearchFilters.thana}
                                    onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, thana: e.target.value }))}
                                    className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        {/* List Header */}
                        <div className="bg-slate-950 px-10 py-3 border-b border-white/5 grid grid-cols-12 gap-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0">
                            <div className="col-span-1">ID</div>
                            <div className="col-span-3">Patient Name</div>
                            <div className="col-span-2">Age/Sex</div>
                            <div className="col-span-2">Mobile</div>
                            <div className="col-span-2">Address / Thana</div>
                            <div className="col-span-2 text-right">Selection</div>
                        </div>

                        {/* Scrolling List */}
                        <div className="flex-1 overflow-y-auto p-4 no-scrollbar bg-slate-900/20">
                            {filteredPatientsForModal.length > 0 ? (
                                <div className="grid grid-cols-1 gap-2">
                                    {filteredPatientsForModal.map((p, idx) => (
                                        <div 
                                            key={`${p.pt_id || 'pt'}-${idx}`}
                                            onClick={() => handlePatientSelectModal(p.pt_id, p.pt_name)}
                                            onDoubleClick={() => handlePatientSelectModal(p.pt_id, p.pt_name)}
                                            className="px-6 py-4 bg-slate-800/20 hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/50 rounded-2xl grid grid-cols-12 gap-5 items-center cursor-pointer transition-all group active:scale-[0.99]"
                                        >
                                            <div className="col-span-1 font-mono text-xs text-slate-600">{p.pt_id}</div>
                                            <div className="col-span-3">
                                                <p className="text-base font-black text-slate-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{p.pt_name}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="px-2 py-1 bg-slate-800 rounded-md text-[10px] font-black text-slate-400 uppercase">{p.ageY}Y | {p.gender}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-sm font-mono text-white/80">{p.mobile || '---'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-white/60 truncate leading-tight">{p.address}{p.thana ? `\n${p.thana}` : ''}</p>
                                            </div>
                                            <div className="col-span-2 text-right">
                                                <button className="px-5 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Select</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-700">
                                    <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 opacity-30">
                                        <UsersIcon className="w-12 h-12" />
                                    </div>
                                    <p className="text-2xl font-black uppercase tracking-tighter opacity-50 mb-2">Patient Not Found</p>
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-30 max-w-xs text-center leading-relaxed">The searched record does not exist in our database. You can add a new one.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-10 py-5 bg-slate-950/60 border-t border-white/5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Records: {patients.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filter Results: {filteredPatientsForModal.length}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => {
                                        setShowPatientSearchModal(false);
                                        setPatientSearchFilters({ name: '', mobile: '', address: '', thana: '', age: '' });
                                    }}
                                    className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- STANDARD CLINIC HOSPITAL SERVICE CHARGES & RATES ---
interface StandardRateItem {
    id: string;
    name: string;
    category: string;
    defaultRate: number;
    isClinicFund: boolean;
    note: string;
}

const DEFAULT_HOSPITAL_RATES: StandardRateItem[] = [
    { id: 'adm_fee', name: 'Admission Fee', category: 'এডমিশন ও বেড', defaultRate: 500, isClinicFund: true, note: 'হাসপাতাল ভর্তি ফি' },
    { id: 'bed_rent', name: 'General Bed Rent (Per Day)', category: 'এডমিশন ও বেড', defaultRate: 400, isClinicFund: true, note: 'জেনারেল বেড ভাড়া' },
    { id: 'cabin_rent', name: 'Cabin Rent (Per Day)', category: 'এডমিশন ও বেড', defaultRate: 1200, isClinicFund: true, note: 'কেবিন ভাড়া' },
    { id: 'ot_charge', name: 'OT Charge / Operation Theatre', category: 'অপারেশন ও ওটি', defaultRate: 3500, isClinicFund: true, note: 'ওটি সার্ভিস ও ইন্সট্রুমেন্ট চার্জ' },
    { id: 'nursing_charge', name: 'Nursing & Patient Care Charge', category: 'নার্সিং ও সার্ভিস', defaultRate: 500, isClinicFund: true, note: 'নার্সিং ও সার্বক্ষণিক কেয়ার' },
    { id: 'oxygen_charge', name: 'Oxygen Charge', category: 'নার্সিং ও সার্ভিস', defaultRate: 300, isClinicFund: true, note: 'মেডিকেল অক্সিজেন সার্ভিস' },
    { id: 'nebulization_charge', name: 'Nebulization Charge', category: 'নার্সিং ও সার্ভিস', defaultRate: 100, isClinicFund: true, note: 'নেবুলাইজেশন চার্জ' },
    { id: 'dressing_charge', name: 'Dressing Charge (Minor/Major)', category: 'নার্সিং ও সার্ভিস', defaultRate: 300, isClinicFund: true, note: 'ড্রেসিং চার্জ' },
    { id: 'cannula_charge', name: 'IV Cannula & Infusion Set Charge', category: 'নার্সিং ও সার্ভিস', defaultRate: 200, isClinicFund: true, note: 'ক্যানুলা ও স্যালাইন পুশ' },
    { id: 'catheter_charge', name: 'Catheterization Charge', category: 'নার্সিং ও সার্ভিস', defaultRate: 300, isClinicFund: true, note: 'ক্যাথেটার চার্জ' },
    { id: 'nvd_charge', name: 'Normal Vaginal Delivery (NVD) Charge', category: 'প্রসব ও প্রসিডিউর', defaultRate: 4000, isClinicFund: true, note: 'লেবার রুম ও ডেলিভারি চার্জ' },
    { id: 'dc_charge', name: 'D&C / MVA Procedure Charge', category: 'প্রসব ও প্রসিডিউর', defaultRate: 3000, isClinicFund: true, note: 'ডিএন্ডসি চার্জ' },
    { id: 'discharge_fee', name: 'Discharge Slip & File Charge', category: 'অন্যান্য', defaultRate: 200, isClinicFund: true, note: 'ডিসচার্জ ফাইল ও প্রসেসিং' },
    // Staff Cost / Doctor Fees - Default unticked (isClinicFund: false)
    { id: 'staff_cost', name: 'Staff Cost / স্টাফ কস্ট', category: 'স্টাফ ও অন্যান্য খরচ', defaultRate: 500, isClinicFund: false, note: 'স্টাফ খরচ ও বকশিশ (ক্লিনিক ফান্ডের টাকা নয়)' },
    { id: 'ot_staff_cost', name: 'OT Staff Cost / ওটি স্টাফ কস্ট', category: 'স্টাফ ও অন্যান্য খরচ', defaultRate: 1000, isClinicFund: false, note: 'ওটি স্টাফ খরচ (ক্লিনিক ফান্ডে জমা হবে না)' },
    { id: 'surgeon_fee', name: 'Surgeon Fee', category: 'সার্জন ও স্পেশালিস্ট', defaultRate: 6000, isClinicFund: false, note: 'চিফ সার্জন সম্মাননা' },
    { id: 'anesthesia_fee', name: 'Anaesthetist Fee', category: 'সার্জন ও স্পেশালিস্ট', defaultRate: 2500, isClinicFund: false, note: 'এনেসথেসিয়া স্পেশালিস্ট ফি' },
    { id: 'asst_surgeon_fee', name: 'Assistant Surgeon Fee', category: 'সার্জন ও স্পেশালিস্ট', defaultRate: 1500, isClinicFund: false, note: 'সহকারী সার্জন ফি' },
    { id: 'doctor_visit', name: 'Doctor Visit / Round Fee', category: 'সার্জন ও স্পেশালিস্ট', defaultRate: 500, isClinicFund: false, note: 'কনসালট্যান্ট রাউন্ড ভিজিট' },
    { id: 'paediatrician_fee', name: 'Paediatrician / Neonatal Care', category: 'সার্জন ও স্পেশালিস্ট', defaultRate: 1000, isClinicFund: false, note: 'শিশু বিশেষজ্ঞ ফি' }
];

const STANDARD_HOSPITAL_RATES: StandardRateItem[] = DEFAULT_HOSPITAL_RATES;

// 2. Indoor Invoice
const IndoorInvoicePage: React.FC<{ 
    admissions: AdmissionRecord[];
    doctors: Doctor[];
    referrars: Referrar[];
    employees: Employee[];
    indoorInvoices: IndoorInvoice[];
    setIndoorInvoices: React.Dispatch<React.SetStateAction<IndoorInvoice[]>>;
    setSuccessMessage: (msg: string) => void;
    medicines: Medicine[];
    setAdmissions: React.Dispatch<React.SetStateAction<AdmissionRecord[]>>;
    detailedExpenses: Record<string, ExpenseItem[]>;
    patients: Patient[];
    performBlockingSync?: (overrides?: any) => Promise<boolean>;
}> = ({ admissions, doctors, referrars, employees, indoorInvoices, setIndoorInvoices, setSuccessMessage, medicines, setAdmissions, detailedExpenses, patients, performBlockingSync }) => {
    const [formData, setFormData] = useState<IndoorInvoice>(emptyIndoorInvoice);
    const [selectedAdmission, setSelectedAdmission] = useState<AdmissionRecord | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [applyPC, setApplyPC] = useState(false); 
    const [invoiceSubTab, setInvoiceSubTab] = useState<'both' | 'form' | 'journal'>('both');
    const [showRateChart, setShowRateChart] = useState(false);
    const [rateSearchTerm, setRateSearchTerm] = useState('');
    const [rateCategoryFilter, setRateCategoryFilter] = useState('All');
    const [rateSortBy, setRateSortBy] = useState<'name' | 'rateAsc' | 'rateDesc'>('name');
    const [targetRowIdForRate, setTargetRowIdForRate] = useState<number | null>(null);
    const [copiedRateText, setCopiedRateText] = useState<string | null>(null);
    const [hospitalRates, setHospitalRates] = useState<StandardRateItem[]>(() => {
        try {
            const saved = localStorage.getItem('standard_hospital_rates');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error("Error parsing standard hospital rates", e);
        }
        return DEFAULT_HOSPITAL_RATES;
    });
    const [isEditingRates, setIsEditingRates] = useState(false);
    const [rateEditList, setRateEditList] = useState<StandardRateItem[]>([]);

    const handleStartEditingRates = () => {
        setRateEditList(JSON.parse(JSON.stringify(hospitalRates)));
        setIsEditingRates(true);
        setShowRateChart(true);
    };

    const handleSaveRateList = () => {
        // Filter out empty items
        const cleaned = rateEditList.filter(it => it.name.trim().length > 0);
        if (cleaned.length === 0) {
            alert('কমপক্ষে একটি সার্ভিসের নাম থাকতে হবে।');
            return;
        }
        setHospitalRates(cleaned);
        localStorage.setItem('standard_hospital_rates', JSON.stringify(cleaned));
        setIsEditingRates(false);
        setSuccessMessage('সার্ভিস ও রেট চার্ট তালিকা সফলভাবে সংরক্ষিত হয়েছে!');
    };

    const handleResetDefaultRates = () => {
        if (window.confirm('আপনি কি রেট তালিকা পুনরায় মূল ডিফল্ট মানে রিসেট করতে চান?')) {
            setHospitalRates(DEFAULT_HOSPITAL_RATES);
            setRateEditList(JSON.parse(JSON.stringify(DEFAULT_HOSPITAL_RATES)));
            localStorage.setItem('standard_hospital_rates', JSON.stringify(DEFAULT_HOSPITAL_RATES));
            setSuccessMessage('মূল ডিফল্ট রেট চার্ট সফলভাবে পুনরুদ্ধার করা হয়েছে!');
        }
    };

    const handleAddNewRateItem = () => {
        const newItem: StandardRateItem = {
            id: `custom_${Date.now()}`,
            name: '',
            category: 'সাধারণ সার্ভিস',
            defaultRate: 0,
            isClinicFund: false, // Default unticked for custom/cost items
            note: ''
        };
        setRateEditList(prev => [newItem, ...prev]);
    };

    const handleRemoveRateItem = (index: number) => {
        setRateEditList(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleUpdateRateItemField = (index: number, field: keyof StandardRateItem, value: any) => {
        setRateEditList(prev => prev.map((item, idx) => {
            if (idx === index) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };
    const [subCategories, setSubCategories] = useState<{id: string, name: string, mainCategory?: string}[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('ncd_clinic_subcategories') || '[]');
        } catch (e) {
            console.error("Error parsing subcategories", e);
            return [];
        }
    });
    const [showSubCategoryManager, setShowSubCategoryManager] = useState(false);
    
    // Floating Side-Attached Service Suggestions Popover State
    const [suggestRowId, setSuggestRowId] = useState<number | null>(null);
    const [suggestCoords, setSuggestCoords] = useState<{ top: number; left: number } | null>(null);
    const suggestPopupRef = useRef<HTMLDivElement | null>(null);
    const [otDetailsLibrary, setOtDetailsLibrary] = useState<Record<string, string>>(() => {
        try {
            return JSON.parse(localStorage.getItem('ncd_ot_details_library') || '{}');
        } catch (e) {
            console.error("Error parsing OT details library", e);
            return {};
        }
    });
    const [tableSearchTerm, setTableSearchTerm] = useState('');
    const [tableDateFilter, setTableDateFilter] = useState('');
    const [tableMonthFilter, setTableMonthFilter] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyInvoice, setHistoryInvoice] = useState<IndoorInvoice | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    // Faded background overlay state for save/update/delete operations
    const [actionState, setActionState] = useState<{
        isLoading: boolean;
        text: string;
        subText?: string;
        type?: 'save' | 'update' | 'delete' | 'restore' | 'cancel' | 'clean';
    }>({
        isLoading: false,
        text: '',
        subText: '',
    });

    // Prominent success modal state with explicit unlock
    const [prominentSuccess, setProminentSuccess] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
    });

    useEffect(() => {
        if (prominentSuccess.isOpen) {
            const timer = setTimeout(() => {
                setProminentSuccess({ isOpen: false, title: '', message: '' });
            }, 4500);
            return () => clearTimeout(timer);
        }
    }, [prominentSuccess.isOpen]);

    const filteredInvoices = useMemo(() => {
        const isDueSearch = tableSearchTerm.toLowerCase() === 'due';
        const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
        const safePatients = Array.isArray(patients) ? patients : [];
        
        // Optimize patient lookup with a Map
        const patientMap = new Map();
        safePatients.forEach(p => {
          if (p && p.pt_id) patientMap.set(p.pt_id, p);
        });
        
        return safeInvoices.filter(inv => {
            if (!inv) return false;
            if (isDueSearch) {
                return (inv.due_bill || 0) > 0;
            }
            const p = patientMap.get(inv.patient_id);
            const matchesSearch = (inv.patient_name || '').toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
                (inv.daily_id || '').toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
                (inv.patient_id || '').toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
                (inv.indication || '').toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
                (p?.mobile || '').includes(tableSearchTerm) ||
                (p?.address || '').toLowerCase().includes(tableSearchTerm.toLowerCase());
            
            const dateToUse = inv.admission_date || inv.invoice_date || '';
            const matchesDate = !tableDateFilter || dateToUse === tableDateFilter;
            const matchesMonth = !tableMonthFilter || (typeof dateToUse === 'string' && dateToUse.startsWith(tableMonthFilter));

            return matchesSearch && matchesDate && matchesMonth;
        });
    }, [indoorInvoices, tableSearchTerm, tableDateFilter, tableMonthFilter, patients]);

    const hasDeletedInvoices = useMemo(() => {
        const safe = Array.isArray(indoorInvoices) ? indoorInvoices : [];
        return safe.some(i => i && (i.status === 'Deleted' || i.status === 'Cancelled'));
    }, [indoorInvoices]);

    // Helper to determine if a service item belongs to Clinic Fund (Hospital Revenue) vs External Doctor/Expense Fees
    const isItemClinicFund = (it: any): boolean => {
        if (!it) return false;
        const typeLower = (it.service_type || '').trim().toLowerCase();
        const providerLower = (it.service_provider || '').trim().toLowerCase();
        
        // Doctor services (surgeon, anesthetist, doctor fees, staff cost, medicine, etc.) are external expenses / non-clinic funds
        const isNonClinic = (doctorServiceTypes || []).some(d => typeLower.includes(d.toLowerCase())) ||
                            typeLower.includes('surgeon') || typeLower.includes('anaesthetist') ||
                            typeLower.includes('doctor') || typeLower.includes('staff') || typeLower.includes('staff cost') || typeLower.includes('স্টাফ') || typeLower.includes('cost') || typeLower.includes('salary') ||
                            typeLower.includes('medicine') || typeLower.includes('discharge') ||
                            providerLower.startsWith('dr') || providerLower.includes('doctor');
        
        if (isNonClinic) return false;
        if (it.isClinicFund === true) return true;
        if (it.isClinicFund === false) return false;
        return true;
    };

    // Calculate fair Clinic Net: ensures hospital services are counted and prevents uncollected doctor fees from generating false negative balances
    const calculateInvoiceClinicNet = (inv: IndoorInvoice): number => {
        if (!inv || inv.status === 'Cancelled' || inv.status === 'Deleted') return 0;
        
        const items = Array.isArray(inv.items) ? inv.items : [];
        const totalBill = Number(inv.total_bill || 0);
        const paidAmount = Number(inv.paid_amount || 0);
        const pcAmount = Number(inv.special_commission || 0) + Number(inv.commission_paid || 0);
        const specialDiscount = Number(inv.special_discount_amount || 0);

        let clinicFundRevenue = 0;
        let doctorNonFundFees = 0;

        if (items.length > 0) {
            items.forEach((it: any) => {
                if (!it) return;
                const amt = Number(it.payable_amount ?? it.line_total ?? 0);
                if (isItemClinicFund(it)) {
                    clinicFundRevenue += amt;
                } else {
                    doctorNonFundFees += amt;
                }
            });
        } else {
            clinicFundRevenue = totalBill;
        }

        let net = 0;
        if (totalBill > 0 && doctorNonFundFees > 0) {
            // When invoice has doctor charges and clinic charges:
            // Proportionally allocate collected cash so uncollected doctor balance doesn't show as a minus
            const clinicRatio = Math.max(0, Math.min(1, clinicFundRevenue / totalBill));
            const realizedClinicCash = paidAmount * clinicRatio;
            net = realizedClinicCash - specialDiscount - pcAmount;
        } else {
            // Pure clinic charges: collected cash minus discounts & PC
            net = paidAmount - specialDiscount - pcAmount;
        }

        if (inv.status === 'Returned') {
            return -Math.abs(net);
        }
        return Math.max(0, Math.round(net * 100) / 100);
    };

    const tableTotals = useMemo(() => {
        return filteredInvoices.reduce((acc, inv) => {
            if (inv.status !== 'Cancelled' && inv.status !== 'Deleted') {
                acc.total += (inv.total_bill || 0);
                acc.paid += (inv.paid_amount || 0);
                acc.due += (inv.due_bill || 0);
                acc.net += calculateInvoiceClinicNet(inv);
            }
            return acc;
        }, { total: 0, paid: 0, due: 0, net: 0 });
    }, [filteredInvoices]);

    useEffect(() => {
        localStorage.setItem('ncd_clinic_subcategories', JSON.stringify(subCategories));
    }, [subCategories]);

    useEffect(() => {
        localStorage.setItem('ncd_ot_details_library', JSON.stringify(otDetailsLibrary));
    }, [otDetailsLibrary]);

    // Check for pending edit invoice requested from Accounts or other pages
    useEffect(() => {
        const pendingInvoiceId = localStorage.getItem('ncd_pending_edit_invoice_id');
        if (pendingInvoiceId && Array.isArray(indoorInvoices) && indoorInvoices.length > 0) {
            const target = indoorInvoices.find(inv => inv && inv.daily_id === pendingInvoiceId);
            if (target) {
                handleLoadInvoice(target);
                localStorage.removeItem('ncd_pending_edit_invoice_id');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [indoorInvoices]);

    const activeEmployees = useMemo(() => (Array.isArray(employees) ? employees : []).filter(e => e && e.status === 'Active'), [employees]);

    const employeeOptions = useMemo(() => {
        const safeEmployees = (Array.isArray(employees) ? employees : []).filter(emp => emp && typeof emp === 'object' && emp.emp_name);
        const activeList = safeEmployees.filter(emp => emp.status !== 'Released');
        const listToUse = activeList.length > 0 ? activeList : safeEmployees;

        const opts = listToUse.map(emp => ({
            id: emp.emp_name,
            name: emp.emp_name,
            details: [emp.emp_id ? `ID: ${emp.emp_id}` : '', emp.job_position || emp.designation, emp.department, emp.mobile ? `📞 ${emp.mobile}` : ''].filter(Boolean).join(' | ')
        }));

        if (!opts.some(o => o && o.name && o.name.toLowerCase() === 'admin')) {
            opts.unshift({
                id: 'Admin',
                name: 'Admin',
                details: 'System Administrator / Admin'
            });
        }
        return opts;
    }, [employees]);

    // Calculate Stats - Updated with Admission Date as primary collection date & Hospital Net Balance formula
    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentMonthStr = todayStr.substring(0, 7);
        const currentYearStr = now.getFullYear().toString();

        const calculateStatsForPeriod = (period: string, type: 'day' | 'month' | 'year') => {
            let totalBill = 0;
            let hospitalNet = 0;

            const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
            safeInvoices.forEach(inv => {
                if (!inv) return;
                // Priority: Admission date as primary collection date for indoor admissions
                const dateToUse = inv.admission_date || inv.invoice_date;
                if (!dateToUse || typeof dateToUse !== 'string') return;

                const isMatch = type === 'day' ? dateToUse === period 
                              : type === 'month' ? dateToUse.startsWith(period)
                              : dateToUse.startsWith(period);

                if (isMatch && inv.status !== 'Cancelled' && inv.status !== 'Deleted') {
                    if (inv.status !== 'Returned') {
                        totalBill += (inv.total_bill || 0);
                        hospitalNet += calculateInvoiceClinicNet(inv);
                    }
                }
                
                if (inv.status === 'Returned') {
                    const returnDate = inv.return_date || dateToUse;
                    const isReturnMatch = type === 'day' ? returnDate === period 
                                        : type === 'month' ? (typeof returnDate === 'string' && returnDate.startsWith(period))
                                        : (typeof returnDate === 'string' && returnDate.startsWith(period));
                    
                    if (isReturnMatch) {
                        hospitalNet += calculateInvoiceClinicNet(inv); // calculateInvoiceClinicNet returns negative for Returned
                    }
                }
            });

            return { totalBill, hospitalNet };
        };

        const today = calculateStatsForPeriod(todayStr, 'day');
        const month = calculateStatsForPeriod(currentMonthStr, 'month');
        const year = calculateStatsForPeriod(currentYearStr, 'year');
        const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
        const totalDue = safeInvoices.filter(i => i && i.status !== 'Returned' && i.status !== 'Cancelled' && i.status !== 'Deleted').reduce((s, i) => s + (i.due_bill || 0), 0);

        return { today, month, year, totalDue };
    }, [indoorInvoices]);

    // FILTERED SUB-CATEGORIES BASED ON SELECTED MAIN CATEGORY
    const filteredSubCategories = useMemo(() => {
        const safeSubCategories = Array.isArray(subCategories) ? subCategories : [];
        if (formData.serviceCategory === 'Operation') {
            return [
                { id: 'lscs', name: 'LSCS_OT' },
                { id: 'gb', name: 'GB_OT' },
                { id: 'others_ot', name: 'Others_OT' }
            ];
        }
        if (formData.serviceCategory === 'NVD and D&C') {
            return [
                { id: 'nvd', name: 'NVD' },
                { id: 'dc', name: 'D&C' }
            ];
        }
        return safeSubCategories.filter(s => s && s.mainCategory === formData.serviceCategory);
    }, [formData.serviceCategory, subCategories]);

    const calculateTotals = (items: ServiceItem[], _discountAmt: number, paidAmt: number, specialDiscount: number) => {
        const safeItems = Array.isArray(items) ? items : [];
        const newItems = safeItems.map(item => {
            if (!item) return item;
            return { 
                ...item, 
                line_total: (item.service_charge || 0) * (item.quantity || 0), 
                payable_amount: ((item.service_charge || 0) * (item.quantity || 0)) - (item.discount || 0) 
            };
        }).filter(Boolean);
        
        const total_bill = newItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
        const total_row_discount = newItems.reduce((sum, item) => sum + (item.discount || 0), 0);
        const payable_bill = total_bill - total_row_discount;
        const netPayable = payable_bill - (specialDiscount || 0);
        const due_bill = netPayable - (paidAmt || 0);
        
        return { items: newItems, total_bill, total_discount: total_row_discount, payable_bill, due_bill, net_payable: netPayable };
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? parseFloat(value) || 0 : value;
        
        if (name === 'paid_amount' || name === 'special_discount_amount') {
            const paid = name === 'paid_amount' ? val as number : formData.paid_amount;
            const special = name === 'special_discount_amount' ? val as number : formData.special_discount_amount || 0;
            const totals = calculateTotals(formData.items, 0, paid, special);
            setFormData(prev => ({ ...prev, [name]: val, ...totals }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleGenerateId = () => {
        const patientIdToFind = selectedAdmission?.patient_id || formData.patient_id;
        const admIdToFind = selectedAdmission?.admission_id || formData.admission_id;
        if (!selectedAdmission && !patientIdToFind && !admIdToFind) {
            return alert("প্রথমে এডমিটেড পেশেন্ট বা আউটডোর পেশেন্ট সিলেক্ট করুন।");
        }
        
        const dateToUse = normalizeDate(formData.invoice_date || formData.admission_date || new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];
        const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
        const existingSeqNumbers = safeInvoices
            .filter(i => i && normalizeDate(i.invoice_date || i.admission_date) === dateToUse)
            .map(i => {
                const id = String(i.daily_id || i.invoice_id || (i as any).id || '');
                const m = id.match(/CLIN-.*-(\d+)$/);
                return m ? parseInt(m[1], 10) : 0;
            })
            .filter(n => !isNaN(n) && n > 0);
        const maxSeq = existingSeqNumbers.length > 0 ? Math.max(...existingSeqNumbers) : safeInvoices.filter(i => i && normalizeDate(i.invoice_date || i.admission_date) === dateToUse).length;
        const newId = `CLIN-${dateToUse}-${String(maxSeq + 1).padStart(3, '0')}`;
        
        const safePatients = Array.isArray(patients) ? patients : [];
        const patient = safePatients.find(p => p && p.pt_id === patientIdToFind);
        const safeAdmissions = Array.isArray(admissions) ? admissions : [];
        const adm = selectedAdmission || safeAdmissions.find(a => a && ((admIdToFind && a.admission_id === admIdToFind) || (patientIdToFind && a.patient_id === patientIdToFind)));

        const newInvoice: IndoorInvoice = {
            ...emptyIndoorInvoice,
            ...formData,
            daily_id: newId,
            invoice_date: dateToUse,
            admission_id: adm?.admission_id || formData.admission_id || '',
            patient_id: patient?.pt_id || adm?.patient_id || formData.patient_id || '',
            patient_name: patient?.pt_name || adm?.patient_name || formData.patient_name || '',
            referrar_id: adm?.referrer_id || formData.referrar_id || '',
            referrar_name: adm?.referrer_name || formData.referrar_name || '',
            doctor_id: adm?.doctor_id || formData.doctor_id || '',
            doctor_name: adm?.doctor_name || formData.doctor_name || '',
            indication: adm?.indication || formData.indication || (adm ? 'Indoor Service' : 'Outdoor Service'),
            admission_date: adm?.admission_date || formData.admission_date || dateToUse,
            patient_mobile: patient?.mobile || adm?.patient_mobile || formData.patient_mobile || '',
            patient_address: patient?.address || formData.patient_address || '',
            patient_dob: patient ? `${patient.dobY || ''}-${patient.dobM || ''}-${patient.dobD || ''}` : (formData.patient_dob || ''),
            status: formData.status || 'Posted',
            serviceCategory: formData.serviceCategory || (adm?.service_category) || 'Conservative treatment',
            subCategory: formData.subCategory || '',
            items: Array.isArray(formData.items) ? formData.items : [],
            services: Array.isArray(formData.services) ? formData.services : [],
            total_bill: formData.total_bill || 0,
            total_discount: formData.total_discount || 0,
            paid_amount: formData.paid_amount || 0,
            due_bill: formData.due_bill || 0,
            net_payable: formData.net_payable || 0,
            special_discount_amount: formData.special_discount_amount || 0,
            bill_created_by: formData.bill_created_by || 'System',
            edit_history: Array.isArray(formData.edit_history) ? formData.edit_history : []
        };
        if (adm && !selectedAdmission) {
            setSelectedAdmission(adm);
        }
        setFormData(newInvoice);
        setSuccessMessage(`ইনভয়েস আইডি (${newId}) তৈরি হয়েছে!`);
    };

    const handleNewVisit = () => {
        if (!formData.patient_id) return;
        const dateToUse = normalizeDate(formData.invoice_date || new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];
        const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
        const existingSeqNumbers = safeInvoices
            .filter(i => i && normalizeDate(i.invoice_date || i.admission_date) === dateToUse)
            .map(i => {
                const id = String(i.daily_id || i.invoice_id || (i as any).id || '');
                const m = id.match(/CLIN-.*-(\d+)$/);
                return m ? parseInt(m[1], 10) : 0;
            })
            .filter(n => !isNaN(n) && n > 0);
        const maxSeq = existingSeqNumbers.length > 0 ? Math.max(...existingSeqNumbers) : safeInvoices.filter(i => i && normalizeDate(i.invoice_date || i.admission_date) === dateToUse).length;
        const newId = `CLIN-${dateToUse}-${String(maxSeq + 1).padStart(3, '0')}`;
        
        setFormData(prev => ({
            ...emptyIndoorInvoice,
            daily_id: newId,
            invoice_date: dateToUse,
            patient_id: prev.patient_id,
            patient_name: prev.patient_name,
            admission_id: prev.admission_id,
            referrar_id: prev.referrar_id,
            referrar_name: prev.referrar_name,
            doctor_id: prev.doctor_id,
            doctor_name: prev.doctor_name,
            status: 'Posted'
        }));
        setSelectedInvoiceId(null);
    };

    const handleServiceChange = (id: number, field: keyof ServiceItem, value: any) => {
        const items = Array.isArray(formData.items) ? formData.items : [];
        const updatedItems = items.map(item => item && item.id === id ? { ...item, [field]: value } : item);
        
        if (field === 'service_type' && (value === 'Medicine' || value === 'medicine') && formData.admission_id) {
            const safeAdmissions = Array.isArray(admissions) ? admissions : [];
            const latestAdm = safeAdmissions.find(a => a.admission_id === formData.admission_id);
            if (latestAdm && Array.isArray(latestAdm.nurse_chart)) {
                let totalMedicineCost = 0;
                let supplyCount = 0;
                latestAdm.nurse_chart.forEach(log => {
                    if (log.supplySrc === 'Clinic') {
                        supplyCount++;
                        if (log.actualInventoryId) {
                            const safeMedicines = Array.isArray(medicines) ? medicines : [];
                            const inventoryItem = safeMedicines.find(m => m.id === log.actualInventoryId);
                            if (inventoryItem) totalMedicineCost += (inventoryItem.unitPriceSell || 0);
                        }
                    }
                });
                const medicineItemIndex = updatedItems.findIndex(i => i.id === id);
                if (medicineItemIndex !== -1) {
                    updatedItems[medicineItemIndex].service_charge = totalMedicineCost;
                    updatedItems[medicineItemIndex].quantity = 1; 
                    updatedItems[medicineItemIndex].note = `Nurse Chart Analysis: ${supplyCount} Items Billed`;
                }
            }
        }

        if (field === 'service_type') {
            const typeLower = (value || '').trim().toLowerCase();
            const matchedRate = hospitalRates.find(r => r.name.toLowerCase() === typeLower);
            if (matchedRate) {
                const rowIdx = updatedItems.findIndex(it => it.id === id);
                if (rowIdx !== -1) {
                    updatedItems[rowIdx].isClinicFund = !!matchedRate.isClinicFund;
                    if (matchedRate.defaultRate > 0 && (!updatedItems[rowIdx].service_charge || updatedItems[rowIdx].service_charge === 0)) {
                        updatedItems[rowIdx].service_charge = matchedRate.defaultRate;
                        updatedItems[rowIdx].line_total = matchedRate.defaultRate * (updatedItems[rowIdx].quantity || 1);
                        updatedItems[rowIdx].payable_amount = Math.max(0, updatedItems[rowIdx].line_total - (updatedItems[rowIdx].discount || 0));
                    }
                }
            } else {
                const isNonClinic = (doctorServiceTypes || []).some(type => typeLower.includes(type.toLowerCase())) ||
                                    typeLower.includes('surgeon') || typeLower.includes('anaesthetist') ||
                                    typeLower.includes('doctor') || typeLower.includes('staff') || typeLower.includes('staff cost') || 
                                    typeLower.includes('স্টাফ') || typeLower.includes('তাপ') || typeLower.includes('cost') || 
                                    typeLower.includes('salary') || typeLower.includes('medicine') || typeLower.includes('tips') || typeLower.includes('টিপস');
                const isClinicFund = !isNonClinic;
                const rowIdx = updatedItems.findIndex(it => it.id === id);
                if (rowIdx !== -1) updatedItems[rowIdx].isClinicFund = isClinicFund;
            }
        }

        const totals = calculateTotals(updatedItems, 0, formData.paid_amount || 0, formData.special_discount_amount || 0);
        setFormData(prev => ({ ...prev, ...totals }));
    };

    const handleAddServiceItem = () => {
        const items = Array.isArray(formData.items) ? formData.items : [];
        const newItem: ServiceItem = { id: Date.now(), service_type: '', service_provider: '', service_charge: 0, quantity: 1, line_total: 0, discount: 0, payable_amount: 0, note: '', isClinicFund: false };
        const updatedItems = [...items, newItem];
        const totals = calculateTotals(updatedItems, 0, formData.paid_amount || 0, formData.special_discount_amount || 0);
        setFormData(prev => ({ ...prev, items: updatedItems, ...totals }));
    };
    
    const handleRemoveServiceItem = (id: number) => {
        const items = Array.isArray(formData.items) ? formData.items : [];
        const updatedItems = items.filter(i => i.id !== id);
        const totals = calculateTotals(updatedItems, 0, formData.paid_amount || 0, formData.special_discount_amount || 0);
        setFormData(prev => ({ ...prev, items: updatedItems, ...totals }));
    };

    const handleInsertRateIntoRow = (rateItem: StandardRateItem, targetId: number | null) => {
        const items = Array.isArray(formData.items) ? formData.items : [];
        if (targetId && items.some(it => it && it.id === targetId)) {
            const updated = items.map(it => {
                if (it && it.id === targetId) {
                    const qty = it.quantity || 1;
                    const charge = rateItem.defaultRate;
                    const lineTotal = charge * qty;
                    const payable = Math.max(0, lineTotal - (it.discount || 0));
                    return {
                        ...it,
                        service_type: rateItem.name,
                        service_charge: charge,
                        line_total: lineTotal,
                        payable_amount: payable,
                        isClinicFund: !!rateItem.isClinicFund,
                        note: it.note ? `${it.note} (${rateItem.note})` : rateItem.note
                    };
                }
                return it;
            });
            const totals = calculateTotals(updated, 0, formData.paid_amount || 0, formData.special_discount_amount || 0);
            setFormData(prev => ({ ...prev, items: updated, ...totals }));
        } else {
            const newItem: ServiceItem = {
                id: Date.now(),
                service_type: rateItem.name,
                service_provider: rateItem.isClinicFund ? 'Hospital' : 'Doctor / Specialist',
                service_charge: rateItem.defaultRate,
                quantity: 1,
                line_total: rateItem.defaultRate,
                discount: 0,
                payable_amount: rateItem.defaultRate,
                note: rateItem.note,
                isClinicFund: !!rateItem.isClinicFund
            };
            const updated = [...items, newItem];
            const totals = calculateTotals(updated, 0, formData.paid_amount || 0, formData.special_discount_amount || 0);
            setFormData(prev => ({ ...prev, items: updated, ...totals }));
        }
        setShowRateChart(false);
    };

    const handleCopyRate = (rateItem: StandardRateItem) => {
        const text = `${rateItem.name} (৳${rateItem.defaultRate})`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        }
        setCopiedRateText(rateItem.id);
        setTimeout(() => setCopiedRateText(null), 2000);
    };

    const filteredAndSortedRates = useMemo(() => {
        return hospitalRates.filter(r => {
            const matchesCat = rateCategoryFilter === 'All' || r.category === rateCategoryFilter;
            const q = rateSearchTerm.toLowerCase();
            const matchesSearch = !q || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.note.toLowerCase().includes(q);
            return matchesCat && matchesSearch;
        }).sort((a, b) => {
            if (rateSortBy === 'rateAsc') return a.defaultRate - b.defaultRate;
            if (rateSortBy === 'rateDesc') return b.defaultRate - a.defaultRate;
            return a.name.localeCompare(b.name);
        });
    }, [hospitalRates, rateSearchTerm, rateCategoryFilter, rateSortBy]);

    // Side-Attached Floating Suggestions Logic
    const openServiceSuggestions = (rowId: number, targetEl: HTMLElement) => {
        setSuggestRowId(rowId);
        const rect = targetEl.getBoundingClientRect();
        const popupHeight = 310;
        const popupWidth = 320;
        
        // Attached to the side of the entry box
        let left = rect.right + 8;
        if (left + popupWidth > window.innerWidth - 10) {
            // If near right window edge, position attached to the left of the entry box
            left = Math.max(10, rect.left - popupWidth - 8);
        }

        // Vertically centered relative to entry box: "বক্সের উপরেও অংশ থাকবে নিচে অংশ থাকবে"
        let top = rect.top + (rect.height / 2) - (popupHeight / 2);

        // "আবার যদি স্ক্রিনের নিচের দিকে থাকে তাহলে বক্সটি সম্পূর্ণ উপরে থাকবে"
        if (rect.bottom > window.innerHeight - 200 || top + popupHeight > window.innerHeight - 15) {
            top = Math.max(15, rect.bottom - popupHeight);
            if (top + popupHeight > window.innerHeight - 10) {
                top = window.innerHeight - popupHeight - 10;
            }
        }

        // Viewport top guard:
        if (top < 15) {
            top = 15;
        }

        setSuggestCoords({ top, left });
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestPopupRef.current && !suggestPopupRef.current.contains(e.target as Node)) {
                const isTrigger = (e.target as HTMLElement)?.closest?.('[data-suggest-trigger]');
                if (!isTrigger) {
                    setSuggestRowId(null);
                    setSuggestCoords(null);
                }
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSuggestRowId(null);
                setSuggestCoords(null);
            }
        };
        const handleScroll = () => {
            if (suggestRowId) {
                setSuggestRowId(null);
                setSuggestCoords(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [suggestRowId]);

    const suggestedServices = useMemo(() => {
        const activeItem = (formData.items || []).find(it => it.id === suggestRowId);
        const q = (activeItem?.service_type || '').toLowerCase().trim();

        const rateMatches = hospitalRates.filter(r => 
            !q || r.name.toLowerCase().includes(q) || (r.note && r.note.toLowerCase().includes(q)) || (r.category && r.category.toLowerCase().includes(q))
        );

        const existingNames = new Set(hospitalRates.map(r => r.name.toLowerCase()));
        const extraMatches = (Array.isArray(serviceTypesList) ? serviceTypesList : []).filter(s => 
            !existingNames.has(s.toLowerCase()) && (!q || s.toLowerCase().includes(q))
        ).map(s => {
            const sLower = s.toLowerCase();
            const isNonClinic = sLower.includes('staff') || sLower.includes('স্টাফ') || sLower.includes('cost') || sLower.includes('doctor') || sLower.includes('surgeon') || sLower.includes('tips') || sLower.includes('medicine') || sLower.includes('তাপ') || sLower.includes('anaes');
            return {
                id: `st_${s}`,
                name: s,
                category: 'সাধারণ সার্ভিস',
                defaultRate: 0,
                isClinicFund: !isNonClinic,
                note: isNonClinic ? 'নন-ক্লিনিক খরচ' : 'ক্লিনিক সার্ভিস'
            };
        });

        return [...rateMatches, ...extraMatches];
    }, [suggestRowId, formData.items, hospitalRates]);

    const handleSelectSuggestion = (suggested: any) => {
        if (!suggestRowId) return;
        const items = Array.isArray(formData.items) ? formData.items : [];
        const updated = items.map(it => {
            if (it.id === suggestRowId) {
                const qty = it.quantity || 1;
                const charge = suggested.defaultRate > 0 ? suggested.defaultRate : (it.service_charge || 0);
                const discount = it.discount || 0;
                const lineTotal = charge * qty;
                const payable = Math.max(0, lineTotal - discount);
                return {
                    ...it,
                    service_type: suggested.name,
                    service_charge: charge,
                    service_provider: suggested.isClinicFund ? 'Hospital' : (it.service_provider || 'Doctor / Specialist'),
                    quantity: qty,
                    line_total: lineTotal,
                    discount: discount,
                    payable_amount: payable,
                    isClinicFund: suggested.isClinicFund === true,
                    note: it.note ? it.note : (suggested.note || '')
                };
            }
            return it;
        });
        const totals = calculateTotals(updated, 0, formData.paid_amount || 0, formData.special_discount_amount || 0);
        setFormData(prev => ({ ...prev, items: updated, ...totals }));
        setSuggestRowId(null);
        setSuggestCoords(null);
    };

    const handleSaveInvoice = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!formData.daily_id) return alert("Generate ID first");
        if (!formData.subCategory) {
            alert("সাব-ক্যাটাগরি লিস্ট (Sub_Category) এন্ট্রি করা বাধ্যতামূলক।");
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Confirm Save',
            message: 'আপনি কি এই ক্লিনিক বিলটি সেভ করতে চান?',
            onConfirm: () => executeSaveInvoice()
        });
    };

    const executeSaveInvoice = async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const isEditing = Boolean(selectedInvoiceId);
        setActionState({
            isLoading: true,
            text: isEditing ? 'ইনভয়েস আপডেট হচ্ছে...' : 'ইনভয়েস সেভ হচ্ছে...',
            subText: isEditing 
                ? 'পরিবর্তিত তথ্য ডাটাবেজে আপডেট হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...' 
                : 'নতুন ইনভয়েসটি ডাটাবেজে সংরক্ষণ করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...',
            type: isEditing ? 'update' : 'save'
        });
        setLoading(true);
        try {
            const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
            // Check if date has changed for an existing invoice
            const pcAmountToSave = applyPC ? (Number(formData.special_commission) || 0) : 0;
            const finalInvoice = { 
                ...formData,
                special_commission: pcAmountToSave,
                commission_paid: 0 // clear duplicate legacy commission_paid so there is no double-counting
            };
            const oldInvoice = selectedInvoiceId ? safeInvoices.find(inv => inv && (inv.daily_id === selectedInvoiceId || (inv as any).id === selectedInvoiceId)) : null;
            const isDateChanged = selectedInvoiceId && formData.invoice_date !== oldInvoice?.invoice_date;

            if (isDateChanged) {
                const dateToUse = normalizeDate(formData.invoice_date) || formData.invoice_date;
                const existingSeqNumbers = safeInvoices
                    .filter(i => i && normalizeDate(i.invoice_date || i.admission_date) === dateToUse)
                    .map(i => {
                        const id = String(i.daily_id || i.invoice_id || (i as any).id || '');
                        const m = id.match(/CLIN-.*-(\d+)$/);
                        return m ? parseInt(m[1], 10) : 0;
                    })
                    .filter(n => !isNaN(n) && n > 0);
                const maxSeq = existingSeqNumbers.length > 0 ? Math.max(...existingSeqNumbers) : safeInvoices.filter(i => i && normalizeDate(i.invoice_date || i.admission_date) === dateToUse).length;
                const newId = `CLIN-${dateToUse}-${String(maxSeq + 1).padStart(3, '0')}`;
                finalInvoice.daily_id = newId;
            }

            const now = new Date().toISOString();
            let newAdmissions = [...(Array.isArray(admissions) ? admissions : [])];
            if (finalInvoice.admission_id) {
                newAdmissions = newAdmissions.map((adm: AdmissionRecord) => {
                    if (!adm) return adm;
                    if (adm.admission_id === finalInvoice.admission_id) {
                        const hasDischargeDate = !!finalInvoice.discharge_date;
                        return { 
                            ...adm, 
                            discharge_date: finalInvoice.discharge_date || undefined, 
                            bed_no: hasDischargeDate ? '' : (adm.bed_no || 'RE-ASSIGNED') 
                        };
                    }
                    return adm;
                });
            }

            let newInvoicesArr = [...(Array.isArray(indoorInvoices) ? indoorInvoices : [])];
            if (selectedInvoiceId) {
                if (isDateChanged) {
                    newInvoicesArr = newInvoicesArr.filter(inv => {
                        if (!inv) return false;
                        const matchId = String(inv.daily_id || (inv as any).invoice_id || (inv as any).id || '').trim();
                        return matchId !== selectedInvoiceId && matchId !== finalInvoice.daily_id;
                    });
                    const newInvoice = { ...finalInvoice, created_at: now, last_modified: now, edit_history: [] };
                    newInvoicesArr.push(newInvoice);
                } else {
                    const idx = newInvoicesArr.findIndex(inv => {
                        if (!inv) return false;
                        const matchId = String(inv.daily_id || (inv as any).invoice_id || (inv as any).id || '').trim();
                        if (matchId && matchId === selectedInvoiceId) return true;
                        if (finalInvoice.daily_id && matchId && matchId === finalInvoice.daily_id) return true;
                        if (finalInvoice.admission_id && inv.admission_id === finalInvoice.admission_id && inv.patient_id === finalInvoice.patient_id) return true;
                        return false;
                    });
                    if (idx >= 0) {
                        const { edit_history: oldHistory, ...invoiceSnapshot } = newInvoicesArr[idx];
                        const historyEntry = { ...invoiceSnapshot, snapshot_date: now, modified_by: finalInvoice.bill_created_by || 'System' };
                        const updatedHistory = [...(Array.isArray(oldHistory) ? oldHistory : []), historyEntry].slice(-5);
                        newInvoicesArr[idx] = { ...finalInvoice, last_modified: now, edit_history: updatedHistory };
                    } else {
                        newInvoicesArr.push({ ...finalInvoice, created_at: now, last_modified: now, edit_history: [] });
                    }
                }
            } else {
                const newInvoice = { ...finalInvoice, created_at: now, last_modified: now, edit_history: [] };
                newInvoicesArr.push(newInvoice);
            }

            // 1. Direct database save according to January-July 2026 (ncd_state) vs August 2026+ (indoor_invoices)
            const saveRes = await dbService.saveIndoorInvoiceDirectly(finalInvoice);
            if (saveRes && saveRes.success === false) {
                alert("অনলাইনে ইনভয়েস সেভ হয়নি! " + (saveRes.error || "দয়া করে ইন্টারনেট ও ডাটাবেজ কানেকশন চেক করুন।"));
                setActionState({ isLoading: false, text: '', subText: '' });
                setLoading(false);
                return;
            }

            // 2. If an admission record is associated, save it directly as well
            if (finalInvoice.admission_id) {
                const targetAdm = newAdmissions.find((a: any) => a && a.admission_id === finalInvoice.admission_id);
                if (targetAdm) {
                    await dbService.saveAdmissionDirectly(targetAdm);
                }
            }

            // 3. Update local storage cache immediately for offline protection
            try {
                let cached: any = {};
                try {
                    const cachedRaw = localStorage.getItem('ncd_offline_cache_v1');
                    if (cachedRaw) cached = JSON.parse(cachedRaw);
                } catch {}
                if (!cached || typeof cached !== 'object') cached = {};
                cached.indoorInvoices = newInvoicesArr;
                cached.admissions = newAdmissions;
                cached.last_updated_at = now;
                localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(cached));
            } catch (e) {}

            // 4. Also trigger global state sync
            if (performBlockingSync) {
                performBlockingSync({ indoorInvoices: newInvoicesArr, admissions: newAdmissions }).catch(err => console.warn("Global sync notice:", err));
            }

            setIndoorInvoices(newInvoicesArr);
            setAdmissions(newAdmissions);

            // Clear form and unlock UI for new work
            setFormData(emptyIndoorInvoice);
            setSelectedAdmission(null);
            setSelectedInvoiceId(null);
            setApplyPC(false);

            const successMsg = isEditing 
                ? `ইনভয়েস (${finalInvoice.daily_id || ''}) সফলভাবে আপডেট করা হয়েছে!`
                : `ইনভয়েস (${finalInvoice.daily_id || ''}) সফলভাবে তৈরি ও সংরক্ষণ করা হয়েছে!`;
            
            setSuccessMessage(successMsg);
            setProminentSuccess({
                isOpen: true,
                title: isEditing ? 'ইনভয়েস আপডেট সফল!' : 'ইনভয়েস সংরক্ষণ সফল!',
                message: successMsg,
            });
        } catch (error) {
            console.error("Error saving invoice:", error);
            alert("ইনভয়েস সেভ করার সময় একটি ত্রুটি হয়েছে।");
        } finally {
            setActionState({ isLoading: false, text: '', subText: '' });
            setLoading(false);
        }
    };

    // Unique match checker to ensure actions affect ONLY one target invoice
    const isTargetInvoice = (item: IndoorInvoice, target: IndoorInvoice) => {
        if (!item || !target) return false;
        if (item === target) return true;
        // Match by explicit unique ID
        const targetId = (target as any).id || (target as any)._uid;
        const itemId = (item as any).id || (item as any)._uid;
        if (targetId && itemId && String(targetId).trim() === String(itemId).trim()) {
            return true;
        }
        // Match by valid non-empty daily_id
        if (target.daily_id && item.daily_id && typeof target.daily_id === 'string' && target.daily_id.trim() && item.daily_id.trim()) {
            return target.daily_id.trim() === item.daily_id.trim();
        }
        // Match by admission_id + patient_id + invoice_date
        if (target.admission_id && item.admission_id && target.admission_id === item.admission_id) {
            if (target.patient_id === item.patient_id && (target.invoice_date || '') === (item.invoice_date || '')) {
                return Math.abs((target.total_bill || 0) - (item.total_bill || 0)) < 0.01;
            }
        }
        return false;
    };

    const handleReturnInvoice = (inv: IndoorInvoice) => {
        if (inv.status === 'Returned') return alert("Already returned.");
        if (window.confirm(`আপনি কি এই ইনভয়েসটি রিটার্ন করতে চান? কনফার্ম করলে ইনভয়েসটি এডিট করার জন্য লোড হবে।`)) {
            handleLoadInvoice(inv);
            setSuccessMessage("Invoice Loaded for Return/Adjustment.");
        }
    };

    const handleCancelInvoice = async (inv: IndoorInvoice) => {
        if (!window.confirm(`ভুল এন্ট্রি হলে 'Cancel' করুন। এটি একাউন্টে কোনো প্রভাব ফেলবে না (ক্যাশ ইন বা খরচ কোনোটাই পরিবর্তন হবে না)।`)) return;
        setActionState({
            isLoading: true,
            text: 'ইনভয়েস বাতিল হচ্ছে...',
            subText: 'ইনভয়েসটির স্ট্যাটাস Cancelled করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...',
            type: 'cancel'
        });
        setLoading(true);
        try {
            const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
            let matched = false;
            const newInvoicesArr = safeInvoices.map(item => {
                if (!matched && isTargetInvoice(item, inv)) {
                    matched = true;
                    return { ...item, status: 'Cancelled' as const };
                }
                return item;
            });
            
            // Direct save to update status in appropriate table based on date
            await dbService.saveIndoorInvoiceDirectly({ ...inv, status: 'Cancelled' });

            try {
                const cachedRaw = localStorage.getItem('ncd_offline_cache_v1');
                if (cachedRaw) {
                    const cached = JSON.parse(cachedRaw);
                    cached.indoorInvoices = newInvoicesArr;
                    localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(cached));
                }
            } catch (e) {}

            setIndoorInvoices(newInvoicesArr);
            const msg = `ইনভয়েস (${inv.daily_id || ''}) বাতিল (Cancelled) করা হয়েছে। একাউন্টসে কোনো প্রভাব পড়বে না।`;
            setSuccessMessage(msg);
            setProminentSuccess({
                isOpen: true,
                title: 'ইনভয়েস বাতিল করা হয়েছে',
                message: msg
            });
        } catch (err) {
            console.error("Cancel error:", err);
        } finally {
            setActionState({ isLoading: false, text: '', subText: '' });
            setLoading(false);
        }
    };

    const handleRestoreInvoice = async (inv: IndoorInvoice) => {
        setActionState({
            isLoading: true,
            text: 'ইনভয়েস রিস্টোর হচ্ছে...',
            subText: 'ইনভয়েসটি পুনরায় সচল করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...',
            type: 'restore'
        });
        setLoading(true);
        try {
            const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
            let matched = false;
            const newInvoicesArr = safeInvoices.map(item => {
                if (!matched && isTargetInvoice(item, inv)) {
                    matched = true;
                    return { ...item, status: 'Posted' as const };
                }
                return item;
            });
            
            await dbService.saveIndoorInvoiceDirectly({ ...inv, status: 'Posted' });

            try {
                const cachedRaw = localStorage.getItem('ncd_offline_cache_v1');
                if (cachedRaw) {
                    const cached = JSON.parse(cachedRaw);
                    cached.indoorInvoices = newInvoicesArr;
                    localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(cached));
                }
            } catch (e) {}

            setIndoorInvoices(newInvoicesArr);
            const msg = `রোগী "${inv.patient_name}" এর ইনভয়েস সফলভাবে সচল (Restore) করা হয়েছে।`;
            setSuccessMessage(msg);
            setProminentSuccess({
                isOpen: true,
                title: 'ইনভয়েস রিস্টোর সম্পন্ন!',
                message: msg
            });
        } catch (err) {
            console.error("Restore error:", err);
        } finally {
            setActionState({ isLoading: false, text: '', subText: '' });
            setLoading(false);
        }
    };

    const handleRestoreAllDeletedInvoices = async () => {
        if (!window.confirm("আপনি কি পূর্বে ভুলবশত ডিলিট/বাতিল হওয়া সকল ইনভয়েস পুনরায় সচল (Restore to Active) করতে চান?")) return;
        setActionState({
            isLoading: true,
            text: 'সকল ইনভয়েস রিস্টোর হচ্ছে...',
            subText: 'বাতিল ও ডিলিট হওয়া সকল ইনভয়েস সচল করা হচ্ছে...',
            type: 'restore'
        });
        setLoading(true);
        try {
            const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
            const newInvoicesArr = safeInvoices.map(i => {
                if (i && (i.status === 'Deleted' || i.status === 'Cancelled')) {
                    return { ...i, status: 'Posted' as const };
                }
                return i;
            });
            if (performBlockingSync) {
                await performBlockingSync({ indoorInvoices: newInvoicesArr });
            }
            setIndoorInvoices(newInvoicesArr);
            const msg = "সকল ডিলিট/বাতিল হওয়া ইনভয়েস সফলভাবে সচল (Restore) করা হয়েছে!";
            setSuccessMessage(msg);
            setProminentSuccess({
                isOpen: true,
                title: 'রিস্টোর সম্পন্ন!',
                message: msg
            });
        } catch (err) {
            console.error("Restore all error:", err);
            alert("রিস্টোর করার সময় ত্রুটি হয়েছে।");
        } finally {
            setActionState({ isLoading: false, text: '', subText: '' });
            setLoading(false);
        }
    };

    // Calculate duplicates count in indoorInvoices
    const duplicateCount = useMemo(() => {
        const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
        const seen = new Set<string>();
        let dups = 0;
        for (const inv of safeInvoices) {
            if (!inv) continue;
            const key = inv.daily_id 
                ? `id:${inv.daily_id}` 
                : `adm:${inv.admission_id || ''}-${inv.patient_name || ''}-${inv.admission_date || ''}-${inv.total_bill || 0}-${inv.paid_amount || 0}`;
            if (seen.has(key)) {
                dups++;
            } else {
                seen.add(key);
            }
        }
        return dups;
    }, [indoorInvoices]);

    const handleDeduplicateInvoices = async () => {
        if (!window.confirm("আপনি কি অতিরিক্ত ডুপ্লিকেট ইনভয়েসগুলো মুছে ফেলে প্রতিটি ইনভয়েসের কেবল একটি সঠিক কপি রাখতে চান? এটি ডাটাবেজ থেকেও স্থায়ীভাবে মুছে যাবে।")) return;
        setActionState({
            isLoading: true,
            text: 'ডুপ্লিকেট ইনভয়েস ক্লিন হচ্ছে...',
            subText: 'অতিরিক্ত ডুপ্লিকেট ইনভয়েস ডাটাবেজ থেকে মুছে ফেলা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...',
            type: 'clean'
        });
        setLoading(true);
        try {
            const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
            const seenKeys = new Set<string>();
            const deduplicated: IndoorInvoice[] = [];
            const toDelete: IndoorInvoice[] = [];

            for (const inv of safeInvoices) {
                if (!inv) continue;
                const key = inv.daily_id 
                    ? `id:${inv.daily_id}` 
                    : `adm:${inv.admission_id || ''}-${inv.patient_name || ''}-${inv.admission_date || ''}-${inv.total_bill || 0}-${inv.paid_amount || 0}`;
                if (seenKeys.has(key)) {
                    toDelete.push(inv);
                    continue;
                }
                seenKeys.add(key);
                deduplicated.push(inv);
            }

            if (toDelete.length === 0) {
                alert("কোনো ডুপ্লিকেট ইনভয়েস পাওয়া যায়নি। আপনার ইনভয়েস ডাটা সম্পূর্ণ সঠিক রয়েছে।");
                return;
            }

            // Permanently remove duplicates from database (both ncd_state and modular table)
            for (const inv of toDelete) {
                await dbService.deleteIndoorInvoiceDirectly(inv);
            }

            if (performBlockingSync) {
                await performBlockingSync({ indoorInvoices: deduplicated });
            }
            setIndoorInvoices(deduplicated);

            const msg = `সফলভাবে ${toDelete.length}টি অতিরিক্ত ডুপ্লিকেট ইনভয়েস ডাটাবেজ থেকে মুছে একটি করে মূল কপি সংরক্ষিত হয়েছে!`;
            setSuccessMessage(msg);
            setProminentSuccess({
                isOpen: true,
                title: 'ডুপ্লিকেট ক্লিন সম্পন্ন!',
                message: msg
            });
        } catch (err) {
            console.error("Deduplication error:", err);
            alert("ডুপ্লিকেট মোছার সময় একটি ত্রুটি হয়েছে।");
        } finally {
            setActionState({ isLoading: false, text: '', subText: '' });
            setLoading(false);
        }
    };

    const handlePrintInvoice = (inv: IndoorInvoice) => {
        const win = window.open('', '_blank');
        if (!win) return;
        const styles = `
            <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: sans-serif; color: #333; line-height: 1.4; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 28px; color: #1e40af; }
                .inv-title { font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; text-align: center; }
                .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
                th { background: #f3f4f6; font-weight: bold; }
                .total-section { margin-top: 20px; text-align: right; }
                .total-row { display: flex; justify-content: flex-end; gap: 50px; margin-bottom: 5px; font-weight: bold; }
                .signature-area { margin-top: 60px; display: flex; justify-content: space-between; font-size: 12px; }
            </style>
        `;
        const html = `
            <html><head>${styles}</head><body>
                <div class="header">
                    <h1>Niramoy Clinic & Diagnostic</h1>
                    <p>Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
                    <p style="font-size: 10px; opacity: 0.7;">Govt. Reg No: ${CLINIC_REGISTRATION}</p>
                </div>
                <div class="inv-title">INPATIENT BILL / INVOICE ${inv.status === 'Returned' ? '(RETURNED)' : ''}</div>
                <div class="grid-info">
                    <div>
                        <b>Patient Name:</b> ${inv.patient_name}<br>
                        <b>Patient ID:</b> ${inv.patient_id}<br>
                        <b>Admission ID:</b> ${inv.admission_id}
                    </div>
                    <div style="text-align: right;">
                        <b>Invoice No:</b> ${inv.daily_id}<br>
                        <b>Billing Date:</b> ${inv.invoice_date}<br>
                        <b>Consultant:</b> ${inv.doctor_name || 'N/A'}
                    </div>
                </div>
                <table>
                    <thead><tr><th>Service Type</th><th>Provider</th><th>Charge</th><th>Qty</th><th>Total</th></tr></thead>
                    <tbody>
                        ${(Array.isArray(inv.items) ? inv.items : []).map(it => it && `
                            <tr>
                                <td>${it.service_type || ''}</td>
                                <td>${it.service_provider || ''}</td>
                                <td>${(it.service_charge || 0).toFixed(2)}</td>
                                <td>${it.quantity || 0}</td>
                                <td>${(it.payable_amount || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total-section">
                    <div class="total-row"><span>Gross Total:</span> <span>৳${Number(inv.total_bill || 0).toFixed(2)}</span></div>
                    <div class="total-row"><span>Discount:</span> <span>৳${(Number(inv.total_discount || 0) + Number(inv.special_discount_amount || 0)).toFixed(2)}</span></div>
                    <div class="total-row" style="font-size: 18px; color: #1e40af"><span>Net Payable:</span> <span>৳${Number(inv.net_payable || 0).toFixed(2)}</span></div>
                    <div class="total-row" style="color: green"><span>Paid Amount:</span> <span>৳${Number(inv.paid_amount || 0).toFixed(2)}</span></div>
                    <div class="total-row" style="color: red"><span>Due Balance:</span> <span>৳${Number(inv.due_bill || 0).toFixed(2)}</span></div>
                </div>
                ${inv.status === 'Returned' ? '<div style="color: red; text-align: center; border: 2px solid red; padding: 10px; margin-top: 20px; font-weight: bold; font-size: 16px;">RETURNED / REFUNDED</div>' : ''}
                <div class="signature-area">
                    <div style="border-top: 1px solid #000; width: 150px; text-align: center;">Accountant</div>
                    <div style="border-top: 1px solid #000; width: 150px; text-align: center;">Authorized Sign</div>
                </div>
            </body></html>
        `;
        win.document.write(html); win.document.close(); win.print();
    };

    const handleDeleteInvoice = (inv: IndoorInvoice) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirm Delete',
            message: `আপনি কি পেশেন্ট "${inv.patient_name}" এর এই ইনভয়েসটি ডিলিট করতে চান?`,
            onConfirm: () => executeDeleteInvoice(inv)
        });
    };

    const executeDeleteInvoice = async (inv: IndoorInvoice) => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setActionState({
            isLoading: true,
            text: 'ইনভয়েস ডিলিট হচ্ছে...',
            subText: 'ডাটাবেজ ও ক্লাউড থেকে ইনভয়েসটি স্থায়ীভাবে মুছে ফেলা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...',
            type: 'delete'
        });
        setLoading(true);
        try {
            // 1. Direct database deletion:
            // January-July 2026: removed from ncd_state
            // August 2026 onwards: deleted from modular table indoor_invoices & updated in ncd_state
            await dbService.deleteIndoorInvoiceDirectly(inv);

            // 2. Remove the targeted invoice instance from state (handles multiple duplicates safely)
            const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
            let removed = false;
            const newInvoicesArr = safeInvoices.filter((i) => {
                if (!removed && isTargetInvoice(i, inv)) {
                    removed = true;
                    return false; // remove this exact instance
                }
                return true;
            });
            
            try {
                let cached: any = {};
                try {
                    const cachedRaw = localStorage.getItem('ncd_offline_cache_v1');
                    if (cachedRaw) cached = JSON.parse(cachedRaw);
                } catch {}
                if (!cached || typeof cached !== 'object') cached = {};
                cached.indoorInvoices = newInvoicesArr;
                cached.last_updated_at = new Date().toISOString();
                localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(cached));
            } catch (e) {}

            if (performBlockingSync) {
                performBlockingSync({ indoorInvoices: newInvoicesArr }).catch(err => console.warn("Delete sync notice:", err));
            }

            setIndoorInvoices(newInvoicesArr);

            // Clear form if the currently loaded invoice was the deleted one
            if (selectedInvoiceId === inv.daily_id || selectedInvoiceId === (inv as any).id) {
                setFormData(emptyIndoorInvoice);
                setSelectedAdmission(null);
                setSelectedInvoiceId(null);
                setApplyPC(false);
            }

            const invIdStr = inv.daily_id || (inv as any).id || '';
            const msg = `ইনভয়েস ${invIdStr ? `(${invIdStr})` : ''} সফলভাবে ডাটাবেজ থেকে মুছে ফেলা হয়েছে এবং একাউন্টস থেকে বাদ দেওয়া হয়েছে।`;
            setSuccessMessage(msg);
            setProminentSuccess({
                isOpen: true,
                title: 'ইনভয়েস ডিলিট সফল!',
                message: msg
            });
        } catch (err) {
            console.error("Delete error:", err);
            alert("ডিলিট করার সময় একটি ত্রুটি হয়েছে।");
        } finally {
            setActionState({ isLoading: false, text: '', subText: '' });
            setLoading(false);
        }
    };

    const handleLoadInvoice = (inv: IndoorInvoice) => {
        if (!inv) return;
        const safePatients = Array.isArray(patients) ? patients : [];
        const patient = safePatients.find(p => p && p.pt_id === inv.patient_id);
        const originalInvoiceId = String(inv.daily_id || (inv as any).invoice_id || (inv as any).id || '').trim();
        const invDailyId = originalInvoiceId || `CLIN-${inv.invoice_date || new Date().toISOString().split('T')[0]}-001`;
        const existingPC = Number(inv.special_commission || 0) || Number(inv.commission_paid || 0);

        // Normalize items so legacy invoices also have accurate isClinicFund booleans
        const loadedItems = (Array.isArray(inv.items) ? inv.items : []).map(it => {
            if (!it) return it;
            let fund = it.isClinicFund;
            if (typeof fund !== 'boolean') {
                const typeLower = (it.service_type || '').trim().toLowerCase();
                const providerLower = (it.service_provider || '').trim().toLowerCase();
                const isNonClinic = (doctorServiceTypes || []).some(d => typeLower.includes(d.toLowerCase())) ||
                                    typeLower.includes('surgeon') || typeLower.includes('anaesthetist') ||
                                    typeLower.includes('doctor') || typeLower.includes('staff') ||
                                    typeLower.includes('medicine') || typeLower.includes('discharge') ||
                                    providerLower.startsWith('dr') || providerLower.includes('doctor');
                fund = !isNonClinic;
            }
            return { ...it, isClinicFund: fund };
        });
        
        const cleanedInv: IndoorInvoice = {
            ...emptyIndoorInvoice,
            ...inv,
            daily_id: invDailyId,
            patient_id: inv.patient_id || '',
            patient_name: inv.patient_name || patient?.pt_name || '',
            patient_mobile: inv.patient_mobile || patient?.mobile || '',
            patient_address: inv.patient_address || patient?.address || '',
            patient_dob: inv.patient_dob || (patient ? `${patient.dobY || ''}-${patient.dobM || ''}-${patient.dobD || ''}` : ''),
            admission_id: inv.admission_id || '',
            admission_date: inv.admission_date || '',
            discharge_date: inv.discharge_date || '',
            doctor_id: inv.doctor_id || '',
            doctor_name: inv.doctor_name || '',
            referrar_id: inv.referrar_id || '',
            referrar_name: inv.referrar_name || '',
            indication: inv.indication || 'Indoor Service',
            serviceCategory: inv.serviceCategory || 'Hospital Service',
            subCategory: inv.subCategory || '',
            ot_details: inv.ot_details || '',
            items: loadedItems,
            edit_history: Array.isArray(inv.edit_history) ? inv.edit_history : [],
            total_bill: Number(inv.total_bill) || 0,
            total_discount: Number(inv.total_discount) || 0,
            paid_amount: Number(inv.paid_amount) || 0,
            due_bill: Number(inv.due_bill) || 0,
            net_payable: Number(inv.net_payable) || 0,
            special_discount_amount: Number(inv.special_discount_amount) || 0,
            special_commission: existingPC,
            commission_paid: 0,
            bill_created_by: inv.bill_created_by || 'Admin',
            payment_method: inv.payment_method || 'Cash',
            status: inv.status || 'Posted'
        };

        setFormData(cleanedInv);
        setSelectedInvoiceId(invDailyId);
        setApplyPC(existingPC > 0);
        
        const adm = (Array.isArray(admissions) ? admissions : []).find(a => a && a.admission_id === inv.admission_id);
        if (adm) setSelectedAdmission(adm);
        else setSelectedAdmission(null);

        // Smoothly scroll to the form section at the top so the user instantly sees all loaded data
        setTimeout(() => {
            const formSection = document.getElementById('indoor-invoice-form-section');
            if (formSection) {
                formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 60);

        setSuccessMessage(`ইনভয়েস ${invDailyId} এডিটের জন্য ফর্মে লোড হয়েছে`);
    };

    const handleSaveAsTemplate = () => {
        if (!formData.subCategory) return alert("প্রথমে সাব-ক্যাটাগরি সিলেক্ট করুন।");
        if (!formData.ot_details) return alert("ডিটেইলস টেক্সটবক্সে কিছু লিখুন।");
        setOtDetailsLibrary(prev => ({ ...prev, [formData.subCategory!]: formData.ot_details || '' }));
        setSuccessMessage(`"${formData.subCategory}" এর ডিটেইলস লাইব্রেরিতে সেভ করা হয়েছে।`);
    };

    const handleLoadTemplate = () => {
        if (formData.subCategory && otDetailsLibrary[formData.subCategory]) {
            setFormData(prev => ({ ...prev, ot_details: otDetailsLibrary[prev.subCategory!] }));
        }
    };

    const commonInputClasses = "w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700 font-medium";

    const SummaryCard = ({ title, bill, net, color }: any) => (
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-xl shadow-black/40 transition-all hover:border-slate-700 group relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${color.replace('text-', 'bg-')}`}></div>
            <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-2 px-1">{title}</h4>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                <div className="text-center border-r border-slate-800 pr-2">
                    <div className="text-[9px] uppercase text-slate-500 font-bold">Total Bill</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">{bill.toLocaleString()}</div>
                </div>
                <div className="text-center pl-2">
                    <div className="text-[9px] uppercase text-slate-500 font-bold">Hospital Net</div>
                    <div className={`text-sm font-mono font-black ${color}`}>{net.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );

    // --- Helper function for keyword matching ---
    const matchesKeyword = (source: string, words: string[]) => {
        if(!source) return false;
        const lower = source.toLowerCase();
        return words.some(w => lower.includes(w.toLowerCase()));
    };

    // --- Core logic to categorize an invoice (Mapping Category Breakdown) ---
    const categorizeInvoiceData = (inv: IndoorInvoice) => {
        if (!inv || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') {
            return { admFee: 0, oxygen: 0, conservative: 0, nvd: 0, dc: 0, lscs_ot: 0, gb_ot: 0, others_ot: 0, dressing: 0, others: 0, pcAmount: 0, clinicNet: 0 };
        }

        const items = Array.isArray(inv.items) ? inv.items : [];
        const incomeItems = items.filter((it: any) => it && isItemClinicFund(it));

        let admFee = 0, oxygen = 0, dressing = 0, conservative = 0, nvd = 0, dc = 0, lscs_ot = 0, gb_ot = 0, others_ot = 0, others = 0;

        incomeItems.forEach((it: any) => {
            const typeLower = (it.service_type || '').toLowerCase();
            const amt = it.payable_amount;
            const subCat = (inv.subCategory || '').toUpperCase();
            const mainCat = inv.serviceCategory;

            // Priority 1: Direct Item Keywords (Admission, O2, Dressing)
            if (matchesKeyword(typeLower, ['admission fee', 'ভর্তি ফি'])) {
                admFee += amt;
            } else if (matchesKeyword(typeLower, ['oxygen', 'o2', 'nebulizer', 'nebulization'])) {
                oxygen += amt;
            } else if (matchesKeyword(typeLower, ['dressing'])) {
                dressing += amt;
            } 
            // Priority 2: Explicit Sub-Category Matching
            else if (subCat === 'LSCS_OT') {
                lscs_ot += amt;
            } else if (subCat === 'GB_OT') {
                gb_ot += amt;
            } else if (subCat === 'NVD') {
                nvd += amt;
            } else if (subCat === 'D&C') {
                dc += amt;
            } 
            // Priority 3: Main Category Fallbacks
            else if (mainCat === 'Operation') {
                others_ot += amt;
            } else if (mainCat === 'Conservative treatment') {
                conservative += amt;
            } 
            // Priority 4: Misc
            else {
                others += amt;
            }
        });

        const totalRevenue = incomeItems.length > 0
            ? incomeItems.reduce((s, it) => s + (it.payable_amount || 0), 0)
            : (items.length === 0 ? Number(inv.total_bill || 0) : 0);
        // Deduct PC Amount: Sum of special_commission and commission_paid
        const pcAmount = (inv.special_commission || 0) + (inv.commission_paid || 0);
        // Deduct Special Discounts and PC from the Hospital's Gain
        const rawNet = totalRevenue - (inv.special_discount_amount || 0) - pcAmount;
        const clinicNet = inv.status === 'Returned' ? -Math.abs(rawNet) : Math.max(0, rawNet);

        return { admFee, oxygen, conservative, nvd, dc, lscs_ot, gb_ot, others_ot, dressing, others, pcAmount, clinicNet };
    };

    return (
        <div className="space-y-6 relative">
            {/* Full-screen Faded Background Overlay for Delete/Update/Save Operations */}
            {actionState.isLoading && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-all duration-300 select-none">
                    <div className="bg-slate-900/95 border-2 border-slate-700/80 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl shadow-black/80 flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="relative flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin flex items-center justify-center"></div>
                            <div className="absolute">
                                {actionState.type === 'delete' && <Trash2 className="w-6 h-6 text-rose-400 animate-pulse" />}
                                {actionState.type === 'clean' && <DatabaseIcon className="w-6 h-6 text-amber-400 animate-pulse" />}
                                {actionState.type === 'update' && <RefreshIcon className="w-6 h-6 text-blue-400 animate-pulse" />}
                                {actionState.type === 'save' && <Save className="w-6 h-6 text-emerald-400 animate-pulse" />}
                                {(!actionState.type || actionState.type === 'restore' || actionState.type === 'cancel') && <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-white tracking-wide">
                                {actionState.text}
                            </h3>
                            {actionState.subText && (
                                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                                    {actionState.subText}
                                </p>
                            )}
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700/50 text-[11px] text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                            ডাটাবেজ প্রসেসিং ও নিরাপত্তা লক সক্রিয় রয়েছে
                        </div>
                    </div>
                </div>
            )}

            {/* Prominent Success Modal with explicit Unlock button */}
            {prominentSuccess.isOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-all duration-300 select-none">
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-2xl p-7 max-w-md w-full text-center shadow-2xl shadow-emerald-950/40 flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="w-10 h-10 animate-bounce" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-2xl font-black text-emerald-400 tracking-tight">
                                {prominentSuccess.title}
                            </h3>
                            <p className="text-sm font-medium text-slate-300 leading-relaxed px-2">
                                {prominentSuccess.message}
                            </p>
                        </div>
                        <div className="w-full pt-2">
                            <button
                                onClick={() => setProminentSuccess({ isOpen: false, title: '', message: '' })}
                                className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                ঠিক আছে (আনলক করুন)
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {(invoiceSubTab === 'both' || invoiceSubTab === 'form') && (
                <div id="indoor-invoice-form-section" className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl shadow-black/40 scroll-mt-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><DatabaseIcon size={24}/></span>
                        Indoor Invoice
                        {selectedInvoiceId && (
                            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-lg font-mono font-bold flex items-center gap-1.5 ml-2">
                                <EditIcon size={14} className="text-amber-400" /> Editing: {selectedInvoiceId}
                            </span>
                        )}
                    </h3>
                    {selectedInvoiceId && (
                        <button 
                            type="button" 
                            onClick={() => { 
                                setFormData(emptyIndoorInvoice); 
                                setSelectedAdmission(null); 
                                setSelectedInvoiceId(null); 
                            }} 
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={14} /> New Invoice (Exit Edit)
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 mb-8">
                    <div className="w-full md:w-1/4">
                        <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Admitted Patient</label>
                        <SearchableSelect 
                            label="" 
                            theme="dark" 
                            placeholder="Search Admitted Patient..."
                            options={(Array.isArray(admissions) ? admissions : []).filter(a => a && (a.admission_id || a.patient_id)).map(a => {
                                const safePatients = Array.isArray(patients) ? patients : [];
                                const p = safePatients.find(pt => pt && pt.pt_id === a.patient_id);
                                const ptName = a.patient_name || p?.pt_name || 'Unknown Patient';
                                const mob = a.patient_mobile || p?.mobile || '';
                                return {
                                    id: a.admission_id || a.patient_id || '', 
                                    name: ptName, 
                                    details: `Adm: ${a.admission_id || 'N/A'} | ID: ${a.patient_id || 'N/A'} | Bed: ${a.bed_no || 'N/A'} | Indication: ${a.indication || 'N/A'} | Mob: ${mob || 'N/A'} | Addr: ${p?.address || ''} | Adm Date: ${a.admission_date || ''}`
                                };
                            })} 
                            value={selectedAdmission?.admission_id || formData.admission_id || ''} 
                            onChange={(id) => { 
                                const safeAdmissions = Array.isArray(admissions) ? admissions : [];
                                const adm = safeAdmissions.find(a => a && (a.admission_id === id || a.patient_id === id || (a as any).id === id)); 
                                setSelectedAdmission(adm || null); 
                                if(adm) {
                                    const safePatients = Array.isArray(patients) ? patients : [];
                                    const p = safePatients.find(pt => pt && pt.pt_id === adm.patient_id);
                                    const todayStr = new Date().toISOString().split('T')[0];
                                    setFormData(prev => ({
                                        ...emptyIndoorInvoice, 
                                        invoice_date: prev.invoice_date || todayStr,
                                        admission_id: adm.admission_id || '', 
                                        patient_id: adm.patient_id || '', 
                                        patient_name: adm.patient_name || p?.pt_name || '', 
                                        patient_mobile: adm.patient_mobile || p?.mobile || '',
                                        patient_address: p?.address || '',
                                        patient_dob: p ? `${p.dobY || ''}-${p.dobM || ''}-${p.dobD || ''}` : '',
                                        admission_date: adm.admission_date || '', 
                                        doctor_id: adm.doctor_id || '',
                                        doctor_name: adm.doctor_name || '',
                                        referrar_id: adm.referrer_id || '',
                                        referrar_name: adm.referrer_name || '',
                                        indication: adm.indication || 'Indoor Service',
                                        serviceCategory: adm.service_category || 'Conservative treatment',
                                        status: 'Posted'
                                    }));
                                    setApplyPC(false);
                                }
                            }} 
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Outdoor Patient (Not Admitted)</label>
                        <SearchableSelect 
                            label="" 
                            theme="dark" 
                            placeholder="Search All Patients..."
                            options={(Array.isArray(patients) ? patients : []).filter(p => p).map(p => ({
                                id: p.pt_id || '', 
                                name: p.pt_name || 'Unknown', 
                                details: `ID: ${p.pt_id} | Mob: ${p.mobile || 'N/A'} | Addr: ${p.address || 'N/A'}`
                            }))} 
                            value={formData.patient_id || ''} 
                            onChange={(id) => { 
                                const safePatients = Array.isArray(patients) ? patients : [];
                                const p = safePatients.find(pt => pt && (pt.pt_id === id || pt.pt_name === id)); 
                                if(p) {
                                    setSelectedAdmission(null);
                                    const todayStr = new Date().toISOString().split('T')[0];
                                    setFormData(prev => ({
                                        ...emptyIndoorInvoice, 
                                        invoice_date: prev.invoice_date || todayStr,
                                        patient_id: p.pt_id || '', 
                                        patient_name: p.pt_name || '', 
                                        patient_mobile: p.mobile || '',
                                        patient_address: p.address || '',
                                        patient_dob: `${p.dobY || ''}-${p.dobM || ''}-${p.dobD || ''}`,
                                        status: 'Posted',
                                        indication: 'Outdoor Service',
                                        serviceCategory: 'Conservative treatment'
                                    }));
                                    setApplyPC(false);
                                }
                            }} 
                        />
                    </div>
                    <div className="w-full md:w-1/6">
                        <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Invoice Date</label>
                        <input 
                            type="date" 
                            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium h-[42px]" 
                            value={formData.invoice_date || ''} 
                            onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={handleGenerateId} className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/40 border border-blue-400/30 hover:from-blue-500 hover:to-indigo-700 transition-all h-[42px]">Generate ID</button>
                        {formData.daily_id && (
                            <button 
                                onClick={() => { 
                                    setFormData(emptyIndoorInvoice); 
                                    setSelectedAdmission(null); 
                                    setSelectedInvoiceId(null); 
                                    setApplyPC(false);
                                }} 
                                className="bg-slate-800 hover:bg-slate-750 text-slate-400 px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700 h-[42px]"
                            >
                                Clear Form
                            </button>
                        )}
                        {selectedInvoiceId && (
                            <button 
                                onClick={handleNewVisit} 
                                className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-900/40 border border-emerald-400/30 hover:from-emerald-500 hover:to-teal-700 transition-all h-[42px]"
                            >
                                New Visit
                            </button>
                        )}
                    </div>
                </div>
                {formData.daily_id && (
                    <form onSubmit={handleSaveInvoice} className="space-y-8">
                        {/* Edit Mode Banner */}
                        {selectedInvoiceId && (
                            <div className="p-4 bg-gradient-to-r from-amber-950/80 via-amber-900/50 to-slate-900 border-2 border-amber-500/60 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
                                <div className="flex items-center gap-3">
                                    <span className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                                        <EditIcon size={16} /> EDIT MODE
                                    </span>
                                    <div>
                                        <h4 className="text-white font-black text-sm uppercase tracking-wide">
                                            Editing Invoice: <span className="text-amber-400 font-mono">{formData.daily_id}</span>
                                        </h4>
                                        <p className="text-xs text-amber-200/80 font-medium">
                                            Patient: <span className="font-bold text-white">{formData.patient_name || 'N/A'}</span> (ID: {formData.patient_id || 'N/A'}) | Total: ৳{Number(formData.total_bill || 0).toLocaleString()} | Paid: ৳{Number(formData.paid_amount || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(emptyIndoorInvoice);
                                        setSelectedAdmission(null);
                                        setSelectedInvoiceId(null);
                                    }}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-600 shadow-md"
                                >
                                    Cancel Edit
                                </button>
                            </div>
                        )}
                        {/* Section 1: Details & Timeline - Seamless attached container */}
                        <div className="rounded-2xl border-2 border-sky-500/40 bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900 shadow-2xl overflow-hidden mb-6">
                            {/* Eye-catching attached header banner */}
                            <div className="bg-gradient-to-r from-sky-600/30 via-indigo-600/20 to-slate-900/90 px-4 sm:px-5 py-3 border-b border-sky-500/30 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-400/40 shadow-sm flex items-center justify-center">
                                        <Calendar size={15} className="text-cyan-300" />
                                    </span>
                                    <div>
                                        <h4 className="text-xs font-black text-cyan-200 uppercase tracking-[0.2em] flex items-center gap-2 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                                            Invoice Details & Timeline
                                            <span className="text-[10px] font-bold text-sky-300/80 tracking-normal normal-case">| ইনভয়েস ডিটেইলস ও টাইমলাইন</span>
                                        </h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-md bg-sky-950/80 border border-sky-500/40 text-[10px] font-mono font-bold text-sky-300">
                                        ID: {formData.daily_id || 'Auto'}
                                    </span>
                                </div>
                            </div>

                            {/* 3-Row Grid Layout */}
                            <div className="p-4 sm:p-5 space-y-3">
                                {/* Row 1: 6 columns (Dates, ID & Contact) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">Invoice ID</label>
                                        <input type="text" value={formData.daily_id} disabled className="w-full h-10 px-3 bg-slate-950/80 border border-sky-500/30 rounded-xl text-sky-300 font-mono font-bold text-xs" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">Invoice Date</label>
                                        <input type="date" name="invoice_date" value={formData.invoice_date} onChange={handleInputChange} className="w-full h-10 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs font-medium focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">Entry Date (System)</label>
                                        <input type="text" value={formData.created_at ? new Date(formData.created_at).toLocaleString() : 'Not Saved Yet'} disabled className="w-full h-10 px-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-[10px] font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">Admission Date</label>
                                        <input type="date" name="admission_date" value={formData.admission_date} onChange={handleInputChange} className="w-full h-10 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs font-medium focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">Discharge Date</label>
                                        <input type="date" name="discharge_date" value={formData.discharge_date} onChange={handleInputChange} className="w-full h-10 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs font-medium focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">Patient Mobile</label>
                                        <input type="text" name="patient_mobile" value={formData.patient_mobile || ''} onChange={handleInputChange} className="w-full h-10 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs font-medium focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 outline-none transition-all" placeholder="017XX XXXXXX" />
                                    </div>
                                </div>

                                {/* Row 2: 6 columns (Address, DOB, Category, Sub-Category, PC Apply & Referrer Side-by-Side!) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">Patient Address</label>
                                        <input type="text" name="patient_address" value={formData.patient_address || ''} onChange={handleInputChange} className="w-full h-10 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs font-medium focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 outline-none transition-all" placeholder="গ্রাম / থানা" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">Patient DOB / Age</label>
                                        <input type="text" name="patient_dob" value={formData.patient_dob || ''} onChange={handleInputChange} className="w-full h-10 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs font-medium focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 outline-none transition-all" placeholder="YYYY-MM-DD" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">Category</label>
                                        <select name="serviceCategory" value={formData.serviceCategory || ''} onChange={handleInputChange} className="w-full h-10 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs font-medium focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 outline-none transition-all">
                                            {(Array.isArray(serviceCategoriesList) ? serviceCategoriesList : []).map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <SearchableSelect 
                                            theme="dark" 
                                            label="Sub_Category" 
                                            options={(Array.isArray(filteredSubCategories) ? filteredSubCategories : []).filter(s => s && s.id && s.name).map(s => ({id: s.id, name: s.name}))} 
                                            value={(Array.isArray(filteredSubCategories) ? filteredSubCategories : []).find(s => s && s.name === formData.subCategory)?.id || ''} 
                                            onChange={(_id, name) => setFormData(prev => ({...prev, subCategory: name}))} 
                                            onAddNew={() => setShowSubCategoryManager(true)}
                                            required={true}
                                            inputHeightClass="h-10 bg-slate-950 border-slate-700/80 rounded-xl text-xs"
                                            allowCustom={true}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">PC (Apply?)</label>
                                        <div className="flex items-center gap-1.5 h-10 px-2 bg-slate-950 border border-slate-700/80 rounded-xl">
                                            <button 
                                                type="button" 
                                                onClick={() => setApplyPC(true)} 
                                                className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all ${applyPC ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                            >
                                                YES
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => { setApplyPC(false); setFormData(prev => ({ ...prev, special_commission: 0, commission_paid: 0 })); }} 
                                                className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all ${!applyPC ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                            >
                                                NO
                                            </button>
                                            {applyPC && (
                                                <input 
                                                    type="number" 
                                                    value={formData.special_commission === 0 ? '' : formData.special_commission} 
                                                    onChange={e => setFormData(prev => ({...prev, special_commission: parseFloat(e.target.value) || 0}))} 
                                                    onFocus={e => e.target.select()}
                                                    className="w-16 p-1 bg-slate-900 border border-emerald-500/60 rounded-lg text-emerald-300 font-mono font-bold text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-right" 
                                                    placeholder="৳"
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-1">Referrer</label>
                                        <SearchableSelect 
                                            theme="dark" 
                                            label="" 
                                            options={(Array.isArray(referrars) ? referrars : []).filter(r => r).map(r => ({ id: r.ref_id, name: r.ref_name, details: r.ref_degrees }))} 
                                            value={formData.referrar_id || formData.referrar_name || ''} 
                                            onChange={(id, name) => setFormData(prev => ({...prev, referrar_id: id, referrar_name: name}))} 
                                            onAddNew={() => setShowNewReferrarForm(true)}
                                            placeholder="Search Referrer..." 
                                            inputHeightClass="h-10 bg-slate-950 border-slate-700/80 rounded-xl text-xs"
                                            allowCustom={true}
                                        />
                                    </div>
                                </div>

                                {/* Row 3: OT Details & Clinical Notes (Full width) */}
                                <div className="bg-blue-900/10 p-3 rounded-xl border border-blue-500/20 shadow-inner">
                                    <label className="text-[10px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-2 mb-1">
                                        <FileTextIcon size={12} className="text-cyan-400" /> OT Details & Clinical Notes (অপারেশন ও ক্লিনিক্যাল বিবরণ)
                                    </label>
                                    <textarea 
                                        name="ot_details"
                                        value={formData.ot_details || ''}
                                        onChange={handleInputChange}
                                        className="w-full h-14 bg-slate-950/70 border border-slate-700/70 rounded-lg p-2.5 text-slate-100 text-xs focus:ring-1 focus:ring-sky-400 focus:border-sky-400 outline-none resize-none shadow-inner font-mono"
                                        placeholder="Enter OT report details, operation notes..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Services & Charges - Indigo Theme */}
                        <div className="bg-indigo-950/40 p-6 rounded-2xl border border-indigo-500/20 shadow-[0_10px_30px_-10px_rgba(49,46,129,0.3)]">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-lg font-black text-indigo-300 uppercase tracking-tighter flex items-center gap-3">
                                    <span className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Activity size={20} /></span>
                                    Services & Charges
                                </h4>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setTargetRowIdForRate(null);
                                            setIsEditingRates(false);
                                            setShowRateChart(true);
                                        }} 
                                        className="bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 text-white px-3.5 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-teal-950/40 border border-teal-400/40 cursor-pointer"
                                    >
                                        📋 Rate Sheet
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setTargetRowIdForRate(null);
                                            handleStartEditingRates();
                                        }} 
                                        className="bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white px-3.5 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-sky-950/40 border border-sky-400/40 cursor-pointer"
                                        title="রেট তালিকা ও ডিফল্ট টাকা এডিট করুন"
                                    >
                                        ⚙️ রেট চার্ট এডিট (Edit Rates)
                                    </button>
                                    <div className="w-64">
                                        <SearchableSelect 
                                            label=""
                                            theme="dark"
                                            placeholder="Search Medicine..."
                                            options={(Array.isArray(medicines) ? medicines : []).map(m => ({
                                                id: m.id,
                                                name: m.name,
                                                details: `Price: ৳${m.unitPriceSell} | Generic: ${m.genericName || 'N/A'}`
                                            }))}
                                            value=""
                                            onChange={(id) => {
                                                const safeMedicines = Array.isArray(medicines) ? medicines : [];
                                                const med = safeMedicines.find(m => m && m.id === id);
                                                if (med) {
                                                    const newItem: ServiceItem = { 
                                                        id: Date.now(), 
                                                        service_type: med.name || 'Unknown Medicine', 
                                                        service_provider: 'Medicine Store', 
                                                        service_charge: med.unitPriceSell || 0, 
                                                        quantity: 1, 
                                                        line_total: med.unitPriceSell || 0, 
                                                        discount: 0, 
                                                        payable_amount: med.unitPriceSell || 0, 
                                                        note: `Medicine: ${med.name || ''}`, 
                                                        isClinicFund: false 
                                                    };
                                                    const updatedItems = [...(Array.isArray(formData.items) ? formData.items : []), newItem];
                                                    const totals = calculateTotals(updatedItems, 0, formData.paid_amount || 0, formData.special_discount_amount || 0);
                                                    setFormData(prev => ({ ...prev, items: updatedItems, ...totals }));
                                                }
                                            }}
                                            inputHeightClass="h-10 bg-slate-950 border-slate-800"
                                        />
                                    </div>
                                    <button type="button" onClick={handleAddServiceItem} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-blue-900/40 border border-blue-400/30 cursor-pointer">
                                        <Plus size={14}/> Add Service
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner bg-slate-950/50">
                                <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="bg-slate-950 text-slate-500 border-b border-slate-800">
                                        <tr>
                                            <th className="p-4 font-black uppercase tracking-widest text-[10px] w-[26%] min-w-[200px]">Type / Item</th>
                                            <th className="p-4 font-black uppercase tracking-widest text-[10px] w-[22%] min-w-[170px]">Provider</th>
                                            <th className="p-4 font-black uppercase tracking-widest text-[10px] text-right w-24">Charge</th>
                                            <th className="p-4 font-black uppercase tracking-widest text-[10px] text-right w-20">Qty</th>
                                            <th className="p-4 font-black uppercase tracking-widest text-[10px] text-right">Disc</th>
                                            <th className="p-4 font-black uppercase tracking-widest text-[10px] text-right">Payable</th>
                                            <th className="p-4 font-black uppercase tracking-widest text-[10px] text-center">A/C</th>
                                            <th className="p-4 font-black uppercase tracking-widest text-[10px]">Note</th>
                                            <th className="p-4 font-black uppercase tracking-widest text-[10px] text-center">X</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {(formData.items || []).map(item => (
                                            <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="p-2 relative">
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            data-suggest-trigger="true"
                                                            value={item.service_type} 
                                                            onChange={e => {
                                                                handleServiceChange(item.id, 'service_type', e.target.value);
                                                                openServiceSuggestions(item.id, e.currentTarget);
                                                            }} 
                                                            onClick={e => openServiceSuggestions(item.id, e.currentTarget)}
                                                            onFocus={e => openServiceSuggestions(item.id, e.currentTarget)}
                                                            placeholder="Select or type service..."
                                                            className="w-full bg-slate-950 border border-slate-700/80 text-slate-100 p-2 rounded-lg h-9 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-400 outline-none transition-all font-medium" 
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                setTargetRowIdForRate(item.id);
                                                                setShowRateChart(true);
                                                            }}
                                                            title="ক্লিক করে রেট চার্ট থেকে আইটেম ও ফি বেছে নিন"
                                                            className="px-2 py-1.5 bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-white rounded-lg border border-teal-500/40 text-xs font-bold transition-all shrink-0 cursor-pointer"
                                                        >
                                                            📋
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <input list={`service_provider_${item.id}`} value={item.service_provider} onChange={e=>handleServiceChange(item.id,'service_provider',e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg h-9 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                                                    <datalist id={`service_provider_${item.id}`}>
                                                        {item.service_type === 'Assistant_2' 
                                                            ? [
                                                                ...(Array.isArray(doctors) ? doctors : []).filter(d => d && d.doctor_id).map(d => ({id: d.doctor_id, name: d.doctor_name})), 
                                                                ...(Array.isArray(activeEmployees) ? activeEmployees : []).filter(e => e && e.emp_id).map(e => ({id: e.emp_id, name: e.emp_name}))
                                                              ].map(obj => obj && <option key={obj.id} value={obj.name} className="bg-slate-900"/>)
                                                            : (Array.isArray(doctorServiceTypes) ? doctorServiceTypes : []).includes(item.service_type) 
                                                                ? (Array.isArray(doctors) ? doctors : []).filter(d => d && d.doctor_id).map(d=><option key={d.doctor_id} value={d.doctor_name} className="bg-slate-900"/>) 
                                                                : (Array.isArray(activeEmployees) ? activeEmployees : []).filter(e => e && e.emp_id).map(e=><option key={e.emp_id} value={e.emp_name} className="bg-slate-900"/>)
                                                        }
                                                    </datalist>
                                                </td>
                                                <td className="p-2"><input type="number" value={item.service_charge || 0} onChange={e=>handleServiceChange(item.id,'service_charge',parseFloat(e.target.value))} onFocus={e=>e.target.select()} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg text-right h-9 focus:ring-2 focus:ring-blue-500 outline-none font-bold"/></td>
                                                <td className="p-2"><input type="number" value={item.quantity || 0} onChange={e=>handleServiceChange(item.id,'quantity',parseFloat(e.target.value))} onFocus={e=>e.target.select()} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg text-right h-9 focus:ring-2 focus:ring-blue-500 outline-none font-bold"/></td>
                                                <td className="p-2"><input type="number" value={item.discount || 0} onChange={e=>handleServiceChange(item.id,'discount',parseFloat(e.target.value))} onFocus={e=>e.target.select()} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg text-right h-9 focus:ring-2 focus:ring-blue-500 outline-none font-bold"/></td>
                                                <td className="p-2 font-black text-blue-400 text-right">{(item.payable_amount || 0).toFixed(2)}</td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!item.isClinicFund} 
                                                        onChange={e => {
                                                            const items = Array.isArray(formData.items) ? formData.items : [];
                                                            const updated = items.map(it => it.id === item.id ? { ...it, isClinicFund: e.target.checked } : it);
                                                            const totals = calculateTotals(updated, 0, formData.paid_amount || 0, formData.special_discount_amount || 0);
                                                            setFormData(prev => ({ ...prev, items: updated, ...totals }));
                                                        }}
                                                        className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-2"><input type="text" value={item.note || ''} onChange={e=>handleServiceChange(item.id,'note',e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg h-9 text-xs focus:ring-2 focus:ring-blue-500 outline-none"/></td>
                                                <td className="p-2 text-center">
                                                    <button type="button" onClick={()=>handleRemoveServiceItem(item.id)} className="text-rose-500 hover:bg-rose-500/10 transition-all p-2 rounded-lg cursor-pointer"><Trash2 size={18}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Floating Side-Attached Service Suggestions Popover */}
                        {suggestRowId && suggestCoords && (
                            <div 
                                ref={suggestPopupRef}
                                style={{
                                    position: 'fixed',
                                    top: `${suggestCoords.top}px`,
                                    left: `${suggestCoords.left}px`,
                                    zIndex: 9999
                                }}
                                className="w-80 bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-sky-500/70 shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-left animate-fade-in"
                            >
                                {/* Header */}
                                <div className="bg-gradient-to-r from-sky-900/90 to-indigo-900/90 px-3.5 py-2.5 border-b border-sky-500/40 flex items-center justify-between text-xs font-black text-sky-200">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                                        সাজেস্টেড সার্ভিস ও রেট
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-sky-300 font-mono bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-400/30">
                                            {suggestedServices.length} টি
                                        </span>
                                        <button 
                                            type="button" 
                                            onClick={() => { setSuggestRowId(null); setSuggestCoords(null); }}
                                            className="text-slate-400 hover:text-white text-base leading-none px-1 cursor-pointer"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                </div>

                                {/* Suggestions List */}
                                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80 p-1">
                                    {suggestedServices.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            কোন সার্ভিস মেলেনি। আপনি সরাসরি বক্সে লিখে ব্যবহার করতে পারেন।
                                        </div>
                                    ) : (
                                        suggestedServices.map((s: any) => (
                                            <button
                                                key={s.id || s.name}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(s)}
                                                className="w-full text-left p-2.5 hover:bg-sky-950/70 transition-all rounded-xl flex items-center justify-between gap-2 group cursor-pointer"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                                                        {s.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-slate-500 font-medium">{s.category || 'সার্ভিস'}</span>
                                                        {s.note && <span>• {s.note}</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {s.defaultRate > 0 && (
                                                        <div className="text-xs font-mono font-black text-emerald-400">
                                                            ৳{s.defaultRate}
                                                        </div>
                                                    )}
                                                    <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${s.isClinicFund ? 'bg-sky-950 text-sky-300 border border-sky-500/30' : 'bg-purple-950 text-purple-300 border border-purple-500/30'}`}>
                                                        {s.isClinicFund ? 'Hospital' : 'Doctor'}
                                                    </span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="bg-slate-950/90 px-3 py-1.5 border-t border-slate-800 text-[9.5px] text-slate-400 flex justify-between items-center">
                                    <span className="text-sky-400 font-medium">ক্লিক করে ইনসার্ট করুন</span>
                                    <span className="text-[9px] text-slate-500 font-mono">Esc = বন্ধ</span>
                                </div>
                            </div>
                        )}

                        {/* Standard Rates Helper Modal / Popup */}
                        {showRateChart && (
                            <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-3 backdrop-blur-sm animate-fade-in">
                                <div className="bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-teal-500/40 overflow-hidden">
                                    {/* Modal Header */}
                                    <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-teal-600 p-2 rounded-xl text-white shadow-lg shadow-teal-900/50">
                                                <ClipboardIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                                                    {isEditingRates ? '⚙️ সার্ভিস ও স্ট্যান্ডার্ড রেট তালিকা এডিটর' : 'স্ট্যান্ডার্ড ক্লিনিক চার্জ ও সার্ভিস রেট টেবিল'}
                                                    <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                                                        {isEditingRates ? 'এডিট মোড সক্রিয়' : (targetRowIdForRate ? '🎯 নির্দিষ্ট রো-তে বসানো হবে' : '➕ নতুন রো হিসেবে যোগ হবে')}
                                                    </span>
                                                </h3>
                                                <p className="text-[11px] text-slate-400 font-medium">
                                                    {isEditingRates 
                                                        ? 'এখানে আপনি এডমিশন ফি, বেড চার্জ ও অন্যান্য সার্ভিসের ফি এবং ক্লিনিক ফান্ড (A/C টিক) পরিবর্তন ও সংরক্ষণ করতে পারবেন' 
                                                        : 'ক্লিক করে সরাসরি ইনভয়েসে ইনসার্ট করুন অথবা কপি করুন'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isEditingRates ? (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setIsEditingRates(false)} 
                                                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                                                >
                                                    👁️ সাধারণ ভিউ
                                                </button>
                                            ) : (
                                                <button 
                                                    type="button" 
                                                    onClick={handleStartEditingRates} 
                                                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    ✏️ রেট তালিকা এডিট করুন
                                                </button>
                                            )}
                                            <button 
                                                type="button" 
                                                onClick={() => { setShowRateChart(false); setIsEditingRates(false); }} 
                                                className="p-2 bg-rose-500/20 text-rose-300 rounded-xl hover:bg-rose-600 hover:text-white transition-all text-xl font-bold cursor-pointer"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    </div>

                                    {isEditingRates ? (
                                        /* --- EDIT MODE INTERFACE --- */
                                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
                                            {/* Guidelines Banner */}
                                            <div className="p-3.5 bg-blue-950/30 border-b border-blue-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
                                                <div className="text-xs text-blue-200 max-w-2xl">
                                                    <span className="font-bold text-cyan-300 flex items-center gap-1">
                                                        💡 গুরুত্বপূর্ণ দিকনির্দেশনা (Clinic Fund A/C রুলস):
                                                    </span>
                                                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                                                        যে সেবাগুলোর টাকা সরাসরি ক্লিনিক একাউন্টে জমা হবে (যেমন: <b>এডমিশন ফি, বেড চার্জ, ওটি চার্জ, নার্সিং ইত্যাদি</b>) সেগুলোতে <b>"ক্লিনিক ফান্ড (A/C)" বক্সে টিক</b> থাকবে। আর <b>স্টাফ কস্ট (Staff Cost / বকশিশ / খাবার)</b> বা ডাক্তার ফি ইত্যাদিতে <b>টিক থাকবে না (আনটিক)</b>, কারণ এগুলো ক্লিনিক আয় নয়।
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        type="button" 
                                                        onClick={handleAddNewRateItem} 
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow transition-all flex items-center gap-1 cursor-pointer"
                                                    >
                                                        ➕ নতুন সার্ভিস যোগ করুন
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={handleResetDefaultRates} 
                                                        className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-xl text-xs font-bold border border-amber-500/30 transition-all cursor-pointer"
                                                        title="মূল ডিফল্ট রেট তালিকা ফিরিয়ে আনুন"
                                                    >
                                                        🔄 ডিফল্ট রেটে রিসেট
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Editable Items Table */}
                                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                                <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner">
                                                    <table className="w-full text-xs text-left text-slate-200 border-collapse">
                                                        <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800 sticky top-0 z-10">
                                                            <tr>
                                                                <th className="p-3 w-10 text-center">#</th>
                                                                <th className="p-3 min-w-[200px]">সার্ভিস / আইটেমের নাম</th>
                                                                <th className="p-3 min-w-[150px]">ক্যাটাগরি</th>
                                                                <th className="p-3 min-w-[120px] text-right">স্ট্যান্ডার্ড ফি (৳)</th>
                                                                <th className="p-3 min-w-[160px] text-center">ক্লিনিক ফান্ড (A/C টিক)</th>
                                                                <th className="p-3 min-w-[180px]">বিবরণ / নোট</th>
                                                                <th className="p-3 w-14 text-center">মুছুন</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                                                            {rateEditList.map((item, index) => (
                                                                <tr key={item.id || index} className="hover:bg-slate-900/50 transition-colors">
                                                                    <td className="p-2.5 text-center text-slate-500 font-mono text-[10px]">
                                                                        {index + 1}
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <input 
                                                                            type="text" 
                                                                            value={item.name} 
                                                                            onChange={e => handleUpdateRateItemField(index, 'name', e.target.value)} 
                                                                            placeholder="সার্ভিসের নাম..." 
                                                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-teal-400"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <input 
                                                                            type="text" 
                                                                            value={item.category} 
                                                                            onChange={e => handleUpdateRateItemField(index, 'category', e.target.value)} 
                                                                            placeholder="ক্যাটাগরি..." 
                                                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-teal-400"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5 text-right">
                                                                        <input 
                                                                            type="number" 
                                                                            value={item.defaultRate} 
                                                                            onChange={e => handleUpdateRateItemField(index, 'defaultRate', parseFloat(e.target.value) || 0)} 
                                                                            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold text-right outline-none focus:border-teal-400"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5 text-center">
                                                                        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={!!item.isClinicFund} 
                                                                                onChange={e => handleUpdateRateItemField(index, 'isClinicFund', e.target.checked)} 
                                                                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-400 cursor-pointer"
                                                                            />
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.isClinicFund ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950 text-rose-300 border border-rose-500/30'}`}>
                                                                                {item.isClinicFund ? '✓ ক্লিনিক আয়' : '✕ খরচ / আনটিক'}
                                                                            </span>
                                                                        </label>
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <input 
                                                                            type="text" 
                                                                            value={item.note} 
                                                                            onChange={e => handleUpdateRateItemField(index, 'note', e.target.value)} 
                                                                            placeholder="সংক্ষিপ্ত বিবরণ বা নোট..." 
                                                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-teal-400"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5 text-center">
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => handleRemoveRateItem(index)} 
                                                                            className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg transition-all cursor-pointer"
                                                                            title="এই আইটেমটি মুছুন"
                                                                        >
                                                                            <Trash2 size={15} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Edit Mode Footer */}
                                            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs shrink-0">
                                                <span className="text-slate-400">
                                                    মোট তালিকাভুক্ত সার্ভিস: <b className="text-white">{rateEditList.length}</b> টি
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setIsEditingRates(false)} 
                                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
                                                    >
                                                        বাতিল
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={handleSaveRateList} 
                                                        className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black uppercase tracking-wider shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer"
                                                    >
                                                        💾 পরিবর্তনসমূহ সংরক্ষণ করুন (Save All)
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* --- VIEW & INSERT MODE INTERFACE --- */
                                        <>
                                            {/* Search & Category Tabs */}
                                            <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                                                <div className="relative flex-1 min-w-[240px]">
                                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                                    <input 
                                                        type="text" 
                                                        placeholder="সার্চ করুন (যেমন: admission, surgeon, bed, ot, oxygen, dressing, staff)..." 
                                                        value={rateSearchTerm}
                                                        onChange={e => setRateSearchTerm(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-teal-500 font-bold"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">সর্টিং:</span>
                                                    <select 
                                                        value={rateSortBy} 
                                                        onChange={e => setRateSortBy(e.target.value as any)}
                                                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none font-bold"
                                                    >
                                                        <option value="name">নাম অনুযায়ী (A-Z)</option>
                                                        <option value="rateAsc">চার্জ (কম থেকে বেশি)</option>
                                                        <option value="rateDesc">চার্জ (বেশি থেকে কম)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Category Filter Pills */}
                                            <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800 flex flex-wrap gap-1.5 shrink-0">
                                                {['All', 'এডমিশন ও বেড', 'অপারেশন ও ওটি', 'সার্জন ও স্পেশালিস্ট', 'স্টাফ ও অন্যান্য খরচ', 'নার্সিং ও সার্ভিস', 'প্রসব ও প্রসিডিউর', 'অন্যান্য'].map(cat => (
                                                    <button 
                                                        key={cat} 
                                                        type="button" 
                                                        onClick={() => setRateCategoryFilter(cat)}
                                                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${rateCategoryFilter === cat ? 'bg-teal-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                                    >
                                                        {cat === 'All' ? 'সব আইটেম' : cat}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Rates List Table */}
                                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-950">
                                                <div className="overflow-x-auto rounded-xl border border-slate-800">
                                                    <table className="w-full text-xs text-left text-slate-200 border-collapse">
                                                        <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800 sticky top-0">
                                                            <tr>
                                                                <th className="p-3">আইটেম / সার্ভিসের নাম</th>
                                                                <th className="p-3">ক্যাটাগরি</th>
                                                                <th className="p-3 text-right">স্ট্যান্ডার্ড ফি</th>
                                                                <th className="p-3 text-center">ফান্ড ধরন (A/C)</th>
                                                                <th className="p-3">বিবরণ / নোট</th>
                                                                <th className="p-3 text-center">একশন</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800">
                                                            {filteredAndSortedRates.map(r => (
                                                                <tr key={r.id} className="hover:bg-slate-900/60 transition-colors">
                                                                    <td className="p-3 font-bold text-white flex items-center gap-1.5">
                                                                        <span className="text-teal-400">❖</span> {r.name}
                                                                    </td>
                                                                    <td className="p-3 text-slate-400 text-[11px]">{r.category}</td>
                                                                    <td className="p-3 text-right font-black text-emerald-400 text-sm">৳{r.defaultRate.toLocaleString()}</td>
                                                                    <td className="p-3 text-center">
                                                                        {r.isClinicFund ? (
                                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">✓ হাসপাতাল ফান্ড</span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">✕ স্টাফ / খরচ (আনটিক)</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 text-slate-400 text-[11px]">{r.note}</td>
                                                                    <td className="p-3 text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <button 
                                                                                type="button" 
                                                                                onClick={() => handleCopyRate(r)}
                                                                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                                                                                title="ক্লিপবোর্ডে কপি করুন"
                                                                            >
                                                                                {copiedRateText === r.id ? '✓ কপিড' : '📋 কপি'}
                                                                            </button>
                                                                            <button 
                                                                                type="button" 
                                                                                onClick={() => handleInsertRateIntoRow(r, targetRowIdForRate)}
                                                                                className="px-3 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-lg text-[10px] font-black shadow transition-all cursor-pointer flex items-center gap-1"
                                                                            >
                                                                                {targetRowIdForRate ? '📝 এই ঘরে বসান' : '➕ যোগ করুন'}
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {filteredAndSortedRates.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={6} className="py-12 text-center text-slate-500">
                                                                        কোনো আইটেম পাওয়া যায়নি।
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <span>মোট আইটেম: <b>{filteredAndSortedRates.length}</b> টি</span>
                                                    <span className="text-slate-600">|</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={handleStartEditingRates} 
                                                        className="text-sky-400 hover:underline font-bold"
                                                    >
                                                        ✏️ রেট তালিকা পরিবর্তন / নতুন আইটেম যোগ করুন
                                                    </button>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowRateChart(false)}
                                                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                                >
                                                    বন্ধ করুন
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-emerald-950/20 p-8 rounded-2xl border border-emerald-500/20 shadow-[-10px_10px_30px_-5px_rgba(16,185,129,0.1)]">
                            <div className="space-y-6">
                                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 shadow-inner">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 block">Bill Prepared By</label>
                                    <SearchableSelect 
                                        label=""
                                        theme="dark"
                                        options={employeeOptions}
                                        value={formData.bill_created_by || ''}
                                        onChange={(_id, name) => setFormData(prev => ({ ...prev, bill_created_by: name }))}
                                        placeholder="Select Staff / Admin"
                                        allowCustom={true}
                                        inputHeightClass="h-[46px] bg-slate-950 border-slate-800"
                                    />
                                </div>
                                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 shadow-inner">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 block">Payment Method</label>
                                    <div className="grid grid-cols-4 gap-2 mb-6">
                                        {['Cash', 'Card', 'Bkash', 'Nagad'].map(method => (
                                            <button 
                                                key={method}
                                                type="button"
                                                onClick={() => setFormData(prev => ({...prev, payment_method: method}))}
                                                className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.payment_method === method ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/40' : 'bg-slate-950 text-slate-500 border-slate-800'}`}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white py-4 rounded-2xl font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-emerald-900/60 border border-emerald-400/30 hover:from-emerald-500 hover:to-teal-700 transition-all flex items-center justify-center gap-4 group"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={24}/> : <Save className="group-hover:scale-110 transition-transform" size={24}/>}
                                        {selectedInvoiceId ? 'Update & Save Invoice' : 'Confirm & Save Invoice'}
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-700 shadow-xl space-y-1.5 relative overflow-hidden text-xs">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] -mr-16 -mt-16"></div>
                                
                                <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/50 pb-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gross Amount</span> 
                                    <span className="font-black text-slate-300 text-sm">{Number(formData.total_bill || 0).toLocaleString()}</span>
                                </div>
                                
                                <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/50 pb-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Service Discount</span> 
                                    <span className="font-black text-rose-400/60 text-xs">{Number(formData.total_discount || 0).toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between items-center text-amber-400 bg-amber-900/5 p-2 rounded-xl border border-amber-500/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Special Discount</span> 
                                    <div className="relative">
                                        <input type="number" name="special_discount_amount" value={formData.special_discount_amount} onChange={handleInputChange} onFocus={e=>e.target.select()} className="bg-slate-950 text-amber-400 w-28 px-2 py-1 text-right font-black border border-slate-800 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm shadow-inner"/>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 p-2.5 rounded-xl border border-blue-500/20 my-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Net Payable Amount</span> 
                                        <span className="text-xl font-black drop-shadow-lg text-white">{Number(formData.net_payable || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-emerald-400 bg-emerald-900/5 p-2 rounded-xl border border-emerald-500/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Cash Received</span> 
                                    <div className="relative">
                                        <input type="number" name="paid_amount" value={formData.paid_amount} onChange={handleInputChange} onFocus={e=>e.target.select()} className="bg-slate-950 text-emerald-400 w-28 px-2 py-1 text-right font-black border border-slate-800 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-inner"/>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-1 px-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Balance Due</span> 
                                    <span className={`text-xl font-black ${(formData.due_bill || 0) > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                                        {Number(formData.due_bill || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4">
                        </div>
                    </form>
                )}

                {showSubCategoryManager && (
                    <GenericManagerPage 
                        title="Manage Sub_Categories" 
                        placeholder="Enter Sub_Category Name" 
                        items={subCategories} 
                        setItems={setSubCategories} 
                        onClose={() => setShowSubCategoryManager(false)} 
                        extraFields={{ mainCategory: formData.serviceCategory }}
                        onSaveAndSelect={(_id, name) => {
                            setFormData(prev => ({...prev, subCategory: name}));
                            setShowSubCategoryManager(false);
                        }} 
                    />
                )}

                {showHistoryModal && historyInvoice && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4 overflow-y-auto">
                        <div className="bg-white w-full max-w-4xl rounded-2xl border border-gray-200 shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                    <DatabaseIcon className="text-blue-600" size={20} /> Invoice Edit History: {historyInvoice.daily_id}
                                </h3>
                                <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">&times;</button>
                            </div>
                            
                            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                                {historyInvoice.edit_history?.map((snapshot: any, idx: number) => (
                                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                                            <div className="text-xs">
                                                <span className="text-gray-500 font-bold uppercase tracking-tighter">Version {idx + 1} - Captured on: </span>
                                                <span className="text-blue-600 font-black">{new Date(snapshot.snapshot_date).toLocaleString()}</span>
                                                <span className="text-gray-500 ml-4 font-bold uppercase tracking-tighter">By: </span>
                                                <span className="text-emerald-600 font-black">{snapshot.modified_by}</span>
                                            </div>
                                            <button 
                                                onClick={() => handlePrintInvoice(snapshot)}
                                                className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm transition-all"
                                            >
                                                Print This Version
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-[11px] text-gray-700">
                                            <div><span className="text-gray-400 font-bold uppercase">Invoice Date:</span> <span className="font-black">{snapshot.invoice_date}</span></div>
                                            <div><span className="text-gray-400 font-bold uppercase">Total Bill:</span> <span className="font-black">{Number(snapshot.total_bill || 0).toFixed(2)}</span></div>
                                            <div><span className="text-gray-400 font-bold uppercase">Paid:</span> <span className="font-black">{Number(snapshot.paid_amount || 0).toFixed(2)}</span></div>
                                            <div className="col-span-3 bg-white p-2 rounded border border-gray-100">
                                                <span className="text-gray-400 font-bold uppercase block mb-1">Items:</span> 
                                                <div className="flex flex-wrap gap-2">
                                                    {(Array.isArray(snapshot.items) ? snapshot.items : []).map((it: any, i: number) => it && (
                                                        <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 border border-gray-200">
                                                            {it.service_type || 'Unknown'} ({Number(it.payable_amount || 0).toFixed(2)})
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-inner">
                                    <h4 className="text-emerald-700 font-black text-xs mb-2 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Current Active Version
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4 text-[11px] text-gray-800">
                                        <div><span className="text-emerald-600/50 font-bold uppercase">Invoice Date:</span> <span className="font-black">{historyInvoice.invoice_date}</span></div>
                                        <div><span className="text-emerald-600/50 font-bold uppercase">Total Bill:</span> <span className="font-black">{Number(historyInvoice.total_bill || 0).toFixed(2)}</span></div>
                                        <div><span className="text-emerald-600/50 font-bold uppercase">Paid:</span> <span className="font-black">{Number(historyInvoice.paid_amount || 0).toFixed(2)}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            )}
                
            {(invoiceSubTab === 'both' || invoiceSubTab === 'journal') && (
                <div id="master-journal-section" className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl shadow-black/50 scroll-mt-6">
                    {duplicateCount > 0 && (
                        <div className="mb-4 bg-purple-950/40 border border-purple-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                            <div className="flex items-center gap-2.5">
                                <AlertCircle className="w-5 h-5 text-purple-400 shrink-0" />
                                <div>
                                    <div className="text-xs font-black text-purple-300">ডুপ্লিকেট ইনভয়েস চিহ্নিত হয়েছে ({duplicateCount} টি অতিরিক্ত কপি)</div>
                                    <div className="text-[11px] text-purple-300/80 font-medium">অতীতের সিঙ্গেল টেবিল (ncd_state) এ থাকা ট্রিপল বা ডুপ্লিকেট ইনভয়েসগুলো থেকে অতিরিক্ত কপি মুছে একটি সঠিক কপি রাখা হবে।</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDeduplicateInvoices}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-purple-900/40 transition-all shrink-0 cursor-pointer"
                            >
                                🧹 ডুপ্লিকেট মুছে ১টি রাখুন (Clean Duplicates)
                            </button>
                        </div>
                    )}
                    {hasDeletedInvoices && (
                        <div className="mb-4 bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                            <div className="flex items-center gap-2.5">
                                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                                <div>
                                    <div className="text-xs font-black text-amber-300">ডিলিট/বাতিল হওয়া ইনভয়েস রয়েছে</div>
                                    <div className="text-[11px] text-amber-300/80 font-medium">ভুলবশত ডিলিট হয়ে থাকা ইনভয়েসগুলো এক ক্লিকে পুনরায় সচল (Active) করতে পারবেন।</div>
                                </div>
                            </div>
                            <button
                                onClick={handleRestoreAllDeletedInvoices}
                                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all shrink-0 cursor-pointer"
                            >
                                🔄 সব ইনভয়েস সচল করুন (Restore All)
                            </button>
                        </div>
                    )}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (invoiceSubTab === 'journal') {
                                        setInvoiceSubTab('both');
                                    }
                                    document.getElementById('master-journal-section')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="text-white hover:text-blue-400 font-black uppercase text-sm tracking-wider whitespace-nowrap flex items-center gap-2 transition-colors cursor-pointer"
                            >
                                <DatabaseIcon size={18} className="text-blue-400" /> Master Journal: Saved Indoor Invoices
                                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    {indoorInvoices.length}
                                </span>
                            </button>
                            {invoiceSubTab === 'journal' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setInvoiceSubTab('form');
                                        setTimeout(() => {
                                            document.getElementById('indoor-invoice-form-section')?.scrollIntoView({ behavior: 'smooth' });
                                        }, 50);
                                    }}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-bold underline flex items-center gap-1 cursor-pointer ml-2"
                                >
                                    ➕ নতুন ইনভয়েস ফর্মে যান
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <div className="relative w-48">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Search Patient or ID..." 
                                    value={tableSearchTerm}
                                    onChange={e => setTableSearchTerm(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                                />
                            </div>
                            <input 
                                type="date" 
                                value={tableDateFilter}
                                onChange={e => setTableDateFilter(e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                            />
                            <input 
                                type="month" 
                                value={tableMonthFilter}
                                onChange={e => setTableMonthFilter(e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="bg-[#faf9f6] rounded-[2.5rem] border-2 border-sky-500/40 shadow-2xl overflow-hidden text-slate-900 p-6 sm:p-8">
                        <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-inner bg-white">
                            <table className="w-full text-sm text-left text-slate-800 border-collapse">
                                <thead className="bg-slate-200 text-slate-700 sticky top-0 z-10 border-b border-slate-300">
                                    <tr>
                                        <th className="p-3.5 text-center w-12 font-black uppercase text-[10px] tracking-wider">SL</th>
                                        <th className="p-3.5 w-24 font-black uppercase text-[10px] tracking-wider">ID</th>
                                        <th className="p-3.5 w-32 font-black uppercase text-[10px] tracking-wider">Admission / Date</th>
                                        <th className="p-3.5 font-black uppercase text-[10px] tracking-wider">Patient Details</th>
                                        <th className="p-3.5 text-right w-28 font-black uppercase text-[10px] tracking-wider">Total</th>
                                        <th className="p-3.5 text-right w-28 font-black uppercase text-[10px] tracking-wider">Paid</th>
                                        <th className="p-3.5 text-right w-28 font-black uppercase text-[10px] tracking-wider">Due</th>
                                        <th className="p-3.5 text-right w-32 font-black uppercase text-[10px] tracking-wider text-cyan-400">Clinic Net</th>
                                        <th className="p-3.5 text-center w-24 font-black uppercase text-[10px] tracking-wider">Status</th>
                                        <th className="p-3.5 text-center w-48 font-black uppercase text-[10px] tracking-wider">Action</th>
                                    </tr>
                                    <tr className="bg-slate-950/90 text-[10px] border-t border-slate-800 text-slate-300">
                                        <th colSpan={4} className="p-3 text-right text-slate-400 font-black uppercase tracking-widest">Filtered Totals:</th>
                                        <th className="p-3 text-right text-blue-400 font-black font-mono">{tableTotals.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                        <th className="p-3 text-right text-emerald-400 font-black font-mono">{tableTotals.paid.toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                        <th className="p-3 text-right text-rose-400 font-black font-mono">{tableTotals.due.toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                        <th className="p-3 text-right text-cyan-400 font-black font-mono">{tableTotals.net.toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                        <th colSpan={2}></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {filteredInvoices.map((inv, index) => (
                                        <tr key={inv.daily_id} onClick={() => handleLoadInvoice(inv)} className={`cursor-pointer hover:bg-sky-50/70 transition-all ${selectedInvoiceId === inv.daily_id ? 'bg-blue-50 border-l-4 border-blue-600' : ''} ${inv.status === 'Returned' ? 'bg-rose-50/50' : inv.status === 'Cancelled' || inv.status === 'Deleted' ? 'opacity-40 grayscale line-through' : ''}`}>
                                            <td className="py-2 px-3 text-center text-slate-500 font-mono text-xs font-bold">{index + 1}</td>
                                            <td className="py-2 px-3 font-black text-xs text-blue-700 font-mono">{inv.daily_id}</td>
                                            <td className="py-2 px-3 text-xs leading-tight">
                                                <div className="font-bold text-slate-800" title="ভর্তি তারিখ">Adm: {inv.admission_date || inv.invoice_date}</div>
                                                {inv.invoice_date && inv.invoice_date !== inv.admission_date && (
                                                    <div className="text-[10px] text-slate-500">Inv: {inv.invoice_date}</div>
                                                )}
                                                {inv.discharge_date && (
                                                    <div className="text-[10px] text-emerald-700 font-semibold">Disch: {inv.discharge_date}</div>
                                                )}
                                            </td>
                                            <td className="py-2 px-3">
                                                <div className="font-black uppercase text-slate-900 tracking-tight text-xs">{inv.patient_name}</div>
                                                <div className="text-[10px] text-slate-600 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                                                    <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 font-mono font-bold">ID: {inv.patient_id}</span>
                                                    <span className="bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded font-medium">Indication: {inv.indication}</span>
                                                    {(() => {
                                                        const safePatients = Array.isArray(patients) ? patients : [];
                                                        const p = safePatients.find(pt => pt && pt.pt_id === inv.patient_id);
                                                        return p ? (
                                                            <>
                                                                <span className="text-slate-600">Age: {p.ageY}Y</span>
                                                                <span className="text-slate-600">Addr: {p.address}</span>
                                                                <span className="text-emerald-800 font-bold">Mob: {p.mobile}</span>
                                                            </>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-right font-bold font-mono text-slate-800">{Number(inv.total_bill || 0).toFixed(2)}</td>
                                            <td className="py-2 px-3 text-right text-emerald-700 font-black font-mono">{Number(inv.paid_amount || 0).toFixed(2)}</td>
                                            <td className="py-2 px-3 text-right text-rose-700 font-black font-mono">{Number(inv.due_bill || 0).toFixed(2)}</td>
                                            <td className="py-2 px-3 text-right text-cyan-800 font-bold font-mono">
                                                {(() => {
                                                    if (inv.status === 'Cancelled' || inv.status === 'Deleted') return '0.00';
                                                    const net = calculateInvoiceClinicNet(inv);
                                                    return net.toFixed(2);
                                                })()}
                                            </td>
                                            <td className="py-2 px-3 text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${inv.status==='Returned'?'bg-rose-600 text-white':(inv.status==='Cancelled'||inv.status==='Deleted')?'bg-slate-600 text-white':'bg-blue-600 text-white'}`}>{inv.status}</span></td>
                                            <td className="py-2 px-3 text-center space-x-2 whitespace-nowrap" onClick={e=>e.stopPropagation()}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleLoadInvoice(inv); }} 
                                                    className="inline-flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-black border border-amber-500/40 shadow transition-all cursor-pointer"
                                                    title="ইনভয়েসটি এডিট করতে উপরে ফর্মে লোড করুন"
                                                >
                                                    <EditIcon size={12} className="text-amber-400" /> Edit
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handlePrintInvoice(inv); }} className="text-cyan-400 hover:text-cyan-300 text-xs font-black uppercase tracking-wider underline px-2 py-1">Print</button>
                                                {(inv.status === 'Cancelled' || inv.status === 'Deleted') ? (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleRestoreInvoice(inv); }} 
                                                        className="inline-flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-black border border-emerald-500/40 transition-all cursor-pointer"
                                                    >
                                                        🔄 Restore
                                                    </button>
                                                ) : (
                                                    inv.status !== 'Returned' && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); handleReturnInvoice(inv); }} className="text-amber-400 hover:text-amber-300 text-xs font-black uppercase tracking-wider underline px-1">Return</button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(inv); }} className="text-rose-400 hover:text-rose-300 text-xs font-black uppercase tracking-wider underline px-1">Del</button>
                                                        </>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredInvoices.length === 0 && <div className="p-20 text-center text-slate-500 font-black uppercase tracking-widest opacity-40 text-lg">No Records Found</div>}
                        </div>
                    </div>
                </div>
            )}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 animate-pulse"></div>
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                                <AlertCircle className="w-10 h-10 text-blue-400 animate-pulse" />
                            </div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{confirmModal.title}</h3>
                            <p className="text-slate-400 font-medium text-lg leading-relaxed">{confirmModal.message}</p>
                            <div className="flex gap-4 w-full pt-4">
                                <button 
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-slate-700 active:scale-95"
                                >
                                    No, Cancel
                                </button>
                                <button 
                                    onClick={confirmModal.onConfirm}
                                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-900/40 transition-all active:scale-95 border border-blue-400/30"
                                >
                                    Yes, Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 3. Clinic Due Collection
const ClinicDueCollectionPage: React.FC<{
    indoorInvoices: IndoorInvoice[];
    setIndoorInvoices: React.Dispatch<React.SetStateAction<IndoorInvoice[]>>;
    clinicDueCollections: ClinicDueCollection[];
    setClinicDueCollections: React.Dispatch<React.SetStateAction<ClinicDueCollection[]>>;
    employees: Employee[];
    setSuccessMessage: (msg: string) => void;
    performBlockingSync?: (overrides?: any) => Promise<boolean>;
}> = ({ indoorInvoices, setIndoorInvoices, clinicDueCollections, setClinicDueCollections, employees, setSuccessMessage, performBlockingSync }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<IndoorInvoice | null>(null);
    const [amount, setAmount] = useState<number>(0);
    const safeInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
    const dueInvoices = safeInvoices.filter(inv => inv && inv.status !== 'Returned' && inv.status !== 'Cancelled' && (inv.due_bill || 0) > 0.5 && (inv.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    
    const handlePrintReceipt = (invoice: IndoorInvoice, paidAmount: number) => {
        const win = window.open('', '_blank');
        if (!win) return;
        const styles = `<style>@page{size:A5 landscape; margin:10mm} body{font-family:sans-serif; text-align:center} .box{border:2px solid #000; padding:15px; border-radius:10px} .h1{font-size:20px; font-weight:bold; margin:0} table{width:100%; margin-top:10px; border-collapse:collapse} td{padding:5px; text-align:left}</style>`;
        const html = `<html><head>${styles}</head><body><div class="box">
            <div class="h1">Niramoy Clinic & Diagnostic</div>
            <p>Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
            <hr>
            <h3>PAYMENT RECEIPT (DUE RECOVERY)</h3>
            <table>
                <tr><td><b>Patient Name:</b> ${invoice.patient_name}</td><td><b>Date:</b> ${new Date().toLocaleDateString()}</td></tr>
                <tr><td><b>Invoice ID:</b> ${invoice.daily_id}</td><td><b>Receipt No:</b> REC-${Date.now().toString().slice(-5)}</td></tr>
                <tr><td><b>Amount Collected:</b></td><td style="font-size:18px; font-weight:bold">৳${Number(paidAmount || 0).toFixed(2)}</td></tr>
                <tr><td><b>Remaining Due:</b></td><td>৳${Number((invoice.due_bill || 0) - paidAmount).toFixed(2)}</td></tr>
            </table>
            <div style="margin-top:30px; text-align:right"><b>Authorized Sign</b><br>..........................</div>
        </div></body></html>`;
        win.document.write(html); win.document.close(); win.print();
    };

    const handleCollect = async () => {
        if (!selectedInvoice || amount <= 0) return;
        const newCollection: ClinicDueCollection = { 
            collection_id: Date.now().toString(), 
            invoice_id: selectedInvoice.daily_id, 
            patient_name: selectedInvoice.patient_name, 
            collection_date: selectedInvoice.admission_date || new Date().toISOString().split('T')[0], 
            amount_collected: amount 
        };
        const updatedInvoice = { ...selectedInvoice, paid_amount: (selectedInvoice.paid_amount || 0) + amount, due_bill: (selectedInvoice.due_bill || 0) - amount };
        
        const newCollections = [...(Array.isArray(clinicDueCollections) ? clinicDueCollections : []), newCollection];
        const newInvoices = (Array.isArray(indoorInvoices) ? indoorInvoices : []).map((inv: IndoorInvoice) => inv && inv.daily_id === updatedInvoice.daily_id ? updatedInvoice : inv);

        if (performBlockingSync) {
            const success = await performBlockingSync({ clinicDueCollections: newCollections, indoorInvoices: newInvoices });
            if (success) {
                setClinicDueCollections(newCollections);
                setIndoorInvoices(newInvoices);
                setSuccessMessage("ডাটা সঠিকভাবে সেভ হয়েছে!");
                handlePrintReceipt(selectedInvoice, amount);
                setSelectedInvoice(null);
            }
        } else {
            setClinicDueCollections(newCollections);
            setIndoorInvoices(newInvoices);
            setSuccessMessage("Collected Locally!");
            handlePrintReceipt(selectedInvoice, amount);
            setSelectedInvoice(null);
        }
    };
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DatabaseIcon className="text-amber-600" size={20} /> Due Collection
            </h3>
            <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search Patient Name..." 
                    value={searchTerm} 
                    onChange={e=>setSearchTerm(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                />
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-100 text-gray-600 border-b border-gray-200">
                        <tr>
                            <th className="p-3 font-black uppercase text-[10px]">ID</th>
                            <th className="p-3 font-black uppercase text-[10px]">Patient</th>
                            <th className="p-3 font-black uppercase text-[10px] text-right">Due Amount</th>
                            <th className="p-3 font-black uppercase text-[10px] text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {(Array.isArray(dueInvoices) ? dueInvoices : []).map(inv => inv && (
                            <tr key={inv.daily_id} className="hover:bg-amber-50/30 transition-colors">
                                <td className="p-3 font-mono text-xs text-gray-500">{inv.daily_id}</td>
                                <td className="p-3 font-bold text-gray-800">{inv.patient_name}</td>
                                <td className="p-3 text-right text-rose-600 font-black font-mono">৳{(inv.due_bill || 0).toFixed(2)}</td>
                                <td className="p-3 text-center">
                                    <button onClick={()=>{setSelectedInvoice(inv); setAmount(0);}} className="bg-amber-600 px-4 py-1.5 rounded-lg text-white font-bold hover:bg-amber-700 transition-all shadow-sm text-xs uppercase tracking-wider">Collect</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {dueInvoices.length === 0 && <div className="p-10 text-center text-gray-400 font-black uppercase opacity-20">No Due Records</div>}
        </div>
    );
};

const CertificateCard = ({ title, icon, color, onClick }: any) => (
    <div onClick={onClick} className={`bg-white p-4 rounded-xl border border-gray-200 hover:border-${color}-500 transition-all cursor-pointer group flex flex-col items-center justify-center h-32 shadow-sm hover:shadow-md`}>
        <div className={`p-3 rounded-full bg-${color}-50 text-${color}-600 mb-2 group-hover:scale-110 transition-transform`}>{icon}</div>
        <span className="text-gray-700 font-bold text-sm text-center group-hover:text-gray-900">{title}</span>
    </div>
);

// 4. Report Summary
const ReportSummaryPage: React.FC<{ 
    admissions: AdmissionRecord[]; 
    doctors: Doctor[]; 
    patients: Patient[]; 
    onOpenRxMaster: () => void;
}> = ({ admissions, doctors, patients, onOpenRxMaster }) => {
    const safeAdmissions = Array.isArray(admissions) ? admissions : [];
    const totalAdmissions = safeAdmissions.length;
    const activeAdmissions = safeAdmissions.filter(a => a && !a.discharge_date).length;
    const discharged = totalAdmissions - activeAdmissions;
    const [activeCertType, setActiveCertType] = useState<'discharge' | 'birth' | 'death' | 'referral' | null>(null);
    const safeDoctors = Array.isArray(doctors) ? doctors : [];
    const doctorStats = safeDoctors.map(doc => ({ name: doc ? doc.doctor_name : 'Unknown', count: safeAdmissions.filter(a => a && doc && a.doctor_id === doc.doctor_id).length })).filter(d => d.count > 0);
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileTextIcon className="text-purple-600" size={20} /> Report Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-200 shadow-inner">
                    <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Admissions</h4>
                    <p className="text-3xl font-black text-gray-900">{totalAdmissions}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100 shadow-inner">
                    <h4 className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">Active Patients</h4>
                    <p className="text-3xl font-black text-emerald-700">{activeAdmissions}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100 shadow-inner">
                    <h4 className="text-blue-600 text-[10px] font-black uppercase tracking-widest mb-1">Discharged</h4>
                    <p className="text-3xl font-black text-blue-700">{discharged}</p>
                </div>
            </div>
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Certificates & Templates</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <CertificateCard title="Discharge / Rx Master" icon={<ClipboardIcon className="w-6 h-6"/>} color="emerald" onClick={onOpenRxMaster} />
                <CertificateCard title="Discharge Certificate" icon={<ClipboardIcon className="w-6 h-6"/>} color="blue" onClick={() => setActiveCertType('discharge')} />
                <CertificateCard title="Baby Note / Birth Cert" icon={<FileTextIcon className="w-6 h-6"/>} color="pink" onClick={() => setActiveCertType('birth')} />
                <CertificateCard title="Death Certificate" icon={<FileTextIcon className="w-6 h-6"/>} color="red" onClick={() => setActiveCertType('death')} />
                <CertificateCard title="Referral Reports" icon={<UserPlusIcon className="w-6 h-6"/>} color="purple" onClick={() => setActiveCertType('referral')} />
            </div>
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Admissions by Doctor</h4>
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-inner">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-100 text-gray-600 border-b border-gray-200">
                        <tr>
                            <th className="p-3 font-black uppercase text-[10px]">Doctor Name</th>
                            <th className="p-3 text-right font-black uppercase text-[10px]">Patient Count</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {(Array.isArray(doctorStats) ? doctorStats : []).map((stat, idx) => stat && (
                            <tr key={idx} className="hover:bg-white transition-colors">
                                <td className="p-3 font-semibold text-gray-800">{stat.name}</td>
                                <td className="p-3 text-right font-black text-gray-900">{stat.count}</td>
                            </tr>
                        ))}
                        {doctorStats.length === 0 && <tr><td colSpan={2} className="p-6 text-center text-gray-400 font-bold italic">No data available.</td></tr>}
                    </tbody>
                </table>
            </div>
            {activeCertType && (<CertificateModal type={activeCertType} admissions={admissions} patients={patients} doctors={doctors} onClose={() => setActiveCertType(null)} />)}
        </div>
    );
};

// 5. Bed Management
const BedManagementPage: React.FC<{ admissions: AdmissionRecord[]; setAdmissions: React.Dispatch<React.SetStateAction<AdmissionRecord[]>>; setSuccessMessage: (msg: string) => void; performBlockingSync?: (overrides?: any) => Promise<boolean>; }> = ({ admissions, setAdmissions, setSuccessMessage, performBlockingSync }) => {
    const wards = [
        { id: 'male_ward', name: 'পুরুষ ওয়ার্ড', beds: ['Male-Bed-01', 'Male-Bed-02'] },
        { id: 'female_ward', name: 'মহিলা ওয়ার্ড', beds: ['Female-Bed-01', 'Female-Bed-02', 'Female-Bed-03', 'Female-Bed-04', 'Female-Bed-05'] },
        { id: 'cabin', name: 'ক্যাবিন', beds: ['Cabin-01', 'Cabin-02', 'Cabin-03'] }
    ];

    const allBeds = useMemo(() => {
        return wards.flatMap(w => w.beds);
    }, [wards]);

    const getBedStatus = (bedId: string) => {
        const safeAdmissions = Array.isArray(admissions) ? admissions : [];
        return safeAdmissions.find(a => a && a.bed_no === bedId && !a.discharge_date);
    };

    const occupiedCount = useMemo(() => {
        return allBeds.filter(b => !!getBedStatus(b)).length;
    }, [allBeds, admissions]);

    const availableCount = allBeds.length - occupiedCount;

    const handleFreeBed = async (bedId: string) => {
        const admission = getBedStatus(bedId);
        if (!admission) return;
        
        const todayStr = new Date().toISOString().split('T')[0];
        const confirmMsg = `আপনি কি নিশ্চিত যে ${bedId} বেডটি রিলিজ (খালি) করতে চান?\n\nরোগীর নাম: ${admission.patient_name || 'N/A'}\nভর্তি আইডি: ${admission.admission_id || 'N/A'}\nভর্তি তারিখ: ${admission.admission_date || 'N/A'}\n\nরিলিজ করলে বেডটি তাৎক্ষণিক 'Available' (খালি) হয়ে যাবে এবং ডাটাবেজে আপডেট হয়ে যাবে।`;
        
        if (window.confirm(confirmMsg)) {
            const newAdmissions = admissions.map(adm => {
                if (adm.admission_id === admission.admission_id) {
                    return { 
                        ...adm, 
                        bed_no: '',
                        discharge_date: adm.discharge_date || todayStr 
                    };
                }
                return adm;
            });

            if (performBlockingSync) {
                const success = await performBlockingSync({ admissions: newAdmissions });
                if (success) {
                    setAdmissions(newAdmissions);
                    setSuccessMessage(`বেড ${bedId} সফলভাবে রিলিজ (খালি) করা হয়েছে।`);
                }
            } else {
                setAdmissions(newAdmissions);
                setSuccessMessage(`বেড ${bedId} সফলভাবে রিলিজ (খালি) করা হয়েছে।`);
            }
        }
    };

    const handlePrintBedMap = () => {
        const win = window.open('', '_blank');
        if (!win) return;
        const styles = `<style>@page{size:A4; margin:15mm} body{font-family:sans-serif} .header{text-align:center; border-bottom:2px solid #000; padding-bottom:10px} .ward{margin-top:20px; border:1px solid #ccc; border-radius:10px; padding:15px} .grid{display:grid; grid-template-columns:repeat(4,1fr); gap:10px} .bed{border:1px solid #000; padding:10px; font-size:10px} .occupied{background:#fecaca}</style>`;
        const html = `<html><head>${styles}</head><body>
            <div class="header"><h1>Niramoy Clinic & Diagnostic</h1><p>Inpatient Bed Occupancy Map - ${new Date().toLocaleDateString()}</p></div>
            ${(Array.isArray(wards) ? wards : []).map(w => w && `
                <div class="ward">
                    <h3>${w.name || ''}</h3>
                    <div class="grid">
                        ${(Array.isArray(w.beds) ? w.beds : []).map(b => {
                            const adm = getBedStatus(b);
                            return `<div class="bed ${adm ? 'occupied' : ''}"><b>Bed: ${b}</b><br>${adm ? `Patient: ${adm.patient_name || ''}<br>Dr: ${adm.doctor_name || ''}` : 'AVAILABLE'}</div>`;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
        </body></html>`;
        win.document.write(html); win.document.close(); win.print();
    };

    return (
        <div className="bg-slate-950 p-6 sm:p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-slate-800 pb-6 border-b">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Armchair className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" size={28} /> Bed Status Dashboard
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">ক্লিনিকের সকল বেড ও কেবিনের লাইভ অকুপেন্সি এবং তাৎক্ষণিক রিলিজ কন্ট্রোল</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Summary Badges */}
                    <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 font-bold uppercase">মোট বেড:</span>
                        <span className="text-sm font-black text-white">{allBeds.length}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-rose-950/40 px-3.5 py-2 rounded-xl border border-rose-500/30">
                        <span className="text-[11px] text-rose-300 font-bold uppercase">ভর্তি আছে:</span>
                        <span className="text-sm font-black text-rose-400">{occupiedCount}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-950/40 px-3.5 py-2 rounded-xl border border-emerald-500/30">
                        <span className="text-[11px] text-emerald-300 font-bold uppercase">খালি বেড:</span>
                        <span className="text-sm font-black text-emerald-400">{availableCount}</span>
                    </div>
                    <button onClick={handlePrintBedMap} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border border-slate-700 shadow-lg cursor-pointer ml-auto md:ml-0">
                        <PrinterIcon size={14}/> Print Bed Map
                    </button>
                </div>
            </div>

            {/* Instruction Guide Banner */}
            <div className="bg-blue-950/40 border border-blue-600/30 rounded-2xl p-4 text-xs text-slate-300 shadow-lg">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <div className="text-sm font-black text-blue-200">বেড রিলিজের নিয়মাবলি (Bed Release System):</div>
                        <div className="text-slate-300 leading-relaxed">
                            <span className="font-bold text-amber-300">১. স্বয়ংক্রিয় রিলিজ:</span> রোগী ছুটি দেওয়ার সময় <b>"INDOOR INVOICE"</b> এ <b>"Discharge Date"</b> দিয়ে ইনভয়েস সেভ করলেই বেডটি অটোমেটিক রিলিজ হয়ে যায়।<br/>
                            <span className="font-bold text-emerald-300">২. ম্যানুয়াল রিলিজ:</span> অথবা নিচের অকুপাইড (লাল রঙের) যেকোনো বেড থেকে সরাসরি <b>"🔓 বেড রিলিজ করুন"</b> বাটনে ক্লিক করে তাৎক্ষণিক বেড খালি করা যায়।
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-12">
                {(Array.isArray(wards) ? wards : []).map(ward => ward && (
                    <div key={ward.id} className="animate-fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <h4 className="text-sm font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                                {ward.name}
                            </h4>
                            <div className="h-px bg-cyan-500/30 flex-1"></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {(Array.isArray(ward.beds) ? ward.beds : []).map(bedId => {
                                const admission = getBedStatus(bedId);
                                const isOccupied = !!admission;
                                return (
                                    <div key={bedId} className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between min-h-[110px] sm:min-h-[120px] shadow-md overflow-hidden group ${isOccupied ? 'bg-slate-900 border-rose-500/60 shadow-rose-950/30' : 'bg-slate-900 border-emerald-500/60 shadow-emerald-950/30'}`}>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="flex flex-col">
                                                <span className={`text-lg font-black tracking-tighter ${isOccupied ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}>{bedId}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{ward.name}</span>
                                            </div>
                                            {isOccupied ? (
                                                <button 
                                                    onClick={() => handleFreeBed(bedId)} 
                                                    className="p-1.5 bg-rose-950 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-all border border-rose-500/40 cursor-pointer text-xs" 
                                                    title="ম্যানুয়ালি বেড খালি করুন"
                                                >
                                                    <TrashIcon size={12}/>
                                                </button>
                                            ) : (
                                                <Armchair className="w-5 h-5 text-emerald-400/60 drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]"/>
                                            )}
                                        </div>
                                        
                                        {isOccupied ? (
                                            <div className="mt-1 relative z-10 flex flex-col justify-between flex-1">
                                                <div>
                                                    <div className="text-sm text-white font-black truncate drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]" title={admission.patient_name}>
                                                        {admission.patient_name}
                                                    </div>
                                                    <div className="text-[10px] text-rose-300 font-mono font-bold truncate">
                                                        ID: {admission.admission_id}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleFreeBed(bedId)}
                                                    className="w-full mt-2 py-1 px-2 bg-rose-950/80 hover:bg-rose-600 active:scale-95 text-rose-200 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border border-rose-500/40 transition-all cursor-pointer shadow"
                                                >
                                                    🔓 রিলিজ
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-auto relative z-10 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">Available</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">খালি</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
interface ClinicPageProps {
    onBack: () => void;
    patients: Patient[];
    setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
    doctors: Doctor[];
    setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
    referrars: Referrar[];
    setReferrars: React.Dispatch<React.SetStateAction<Referrar[]>>;
    employees: Employee[];
    medicines: Medicine[];
    setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
    admissions: AdmissionRecord[];
    setAdmissions: React.Dispatch<React.SetStateAction<AdmissionRecord[]>>;
    indoorInvoices: IndoorInvoice[];
    setIndoorInvoices: React.Dispatch<React.SetStateAction<IndoorInvoice[]>>;
    detailedExpenses: Record<string, ExpenseItem[]>;
    performBlockingSync?: (overrides?: any) => Promise<boolean>;
    currentUserEmail?: string;
    consolidatedClinicEntries?: any[];
    setConsolidatedClinicEntries?: React.Dispatch<React.SetStateAction<any[]>>;
}

const ClinicPage: React.FC<ClinicPageProps> = ({ 
    onBack, patients, setPatients, doctors, setDoctors, referrars, setReferrars, employees, medicines, setMedicines, admissions, setAdmissions, indoorInvoices, setIndoorInvoices, detailedExpenses, performBlockingSync,
    currentUserEmail = 'Admin', consolidatedClinicEntries, setConsolidatedClinicEntries
}) => {
    const [now] = useState(() => Date.now());
    const [activeTab, setActiveTab] = useState<'admission' | 'invoice' | 'due_collection' | 'report_summary' | 'bed_status' | 'patient_info' | 'consolidated_clinic_entry'>(() => {
        if (localStorage.getItem('ncd_pending_edit_invoice_id')) {
            return 'invoice';
        }
        return 'patient_info';
    });
    const [clinicDueCollections, setClinicDueCollections] = useState<ClinicDueCollection[]>([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [drugDemands, setDrugDemands] = useState<RequestedDrug[]>([]);
    const [admissionFormData, setAdmissionFormData] = useState<AdmissionRecord>(emptyAdmission);
    const [indications, setIndications] = useState<Indication[]>([{ id: '1', name: 'Lower Abdominal Pain' }, { id: '2', name: 'Fever' }]);
    const [services, setServices] = useState<ServiceItemDef[]>([{ id: '1', name: 'C-Section' }, { id: '2', name: 'Appendicectomy' }]);
    
    // State for Discharge/Rx Master Modal
    const [showRxMaster, setShowRxMaster] = useState(false);

    useEffect(() => { if(successMessage) { const t = setTimeout(() => setSuccessMessage(''), 3000); return () => clearTimeout(t); } }, [successMessage]);

    return (
        <div className="w-full h-full flex-1 bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-cyan-500/30 overflow-hidden">
            <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-2xl z-10 sticky top-0">
                <div className="max-w-[1600px] mx-auto px-6 py-4 pt-16 md:pt-4 w-full"> 
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all border border-slate-700 hover:border-cyan-500/50 group"><BackIcon className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" /></button>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tighter mb-1 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Niramoy Clinic & Diagnostic</h1>
                                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                                <ClinicIcon className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"/>
                                <div className="flex flex-col items-end">
                                    <h2 className="text-xl font-black text-cyan-50 font-bengali leading-none tracking-tight">ক্লিনিক ডিপার্টমেন্ট</h2>
                                    <p className="text-[9px] font-bold text-cyan-500/70 font-bengali tracking-widest mt-1 uppercase">গভমেন্ট লাইসেন্স: HSM76710</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex bg-slate-900/50 rounded-xl p-1.5 border border-slate-800 overflow-x-auto w-full scrollbar-hide gap-1">
                            <button onClick={() => setActiveTab('patient_info')} className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${activeTab === 'patient_info' ? 'bg-gradient-to-br from-cyan-500 to-blue-700 text-white shadow-lg shadow-cyan-900/40 border border-cyan-400/30' : 'text-slate-500 hover:text-cyan-400 hover:bg-slate-800/50'}`}>Patient Info</button>
                            <button onClick={() => setActiveTab('admission')} className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${activeTab === 'admission' ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400/30' : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800/50'}`}>Admission & Treatment</button>
                            <button onClick={() => setActiveTab('bed_status')} className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${activeTab === 'bed_status' ? 'bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-lg shadow-teal-900/40 border border-teal-400/30' : 'text-slate-500 hover:text-teal-400 hover:bg-slate-800/50'}`}>Bed Status</button>
                            <button onClick={() => setActiveTab('invoice')} className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${activeTab === 'invoice' ? 'bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-lg shadow-blue-900/40 border border-blue-400/30' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-800/50'}`}>Indoor Invoice</button>
                            <button onClick={() => setActiveTab('due_collection')} className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${activeTab === 'due_collection' ? 'bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-lg shadow-amber-900/40 border border-amber-400/30' : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800/50'}`}>Due Collection</button>
                            <button onClick={() => setActiveTab('report_summary')} className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${activeTab === 'report_summary' ? 'bg-gradient-to-br from-purple-500 to-fuchsia-700 text-white shadow-lg shadow-purple-900/40 border border-purple-400/30' : 'text-slate-500 hover:text-purple-400 hover:bg-slate-800/50'}`}>Report Summary</button>
                            <button onClick={() => setActiveTab('consolidated_clinic_entry')} className={`flex-1 min-w-[210px] px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'consolidated_clinic_entry' ? 'bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 text-white shadow-lg shadow-indigo-900/50 border border-indigo-400/40' : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800/70 border border-transparent'}`}>
                              <Layers className="w-4 h-4 text-indigo-400" />
                              <span>Consolidated clinic data entry</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full">
                <div className={`${activeTab === 'consolidated_clinic_entry' ? 'w-full p-0' : 'max-w-[1600px] mx-auto p-6 w-full'}`}>
                    {successMessage && <div className="fixed top-20 right-5 bg-green-600 text-white px-6 py-3 rounded shadow-xl z-50 animate-bounce">{successMessage}</div>}
                    
                    <div className={activeTab === 'admission' ? 'block' : 'hidden'}>
                        <ErrorBoundary fallbackTitle="অ্যাডমিশন ও ট্রিটমেন্ট মডিউলে ত্রুটি হয়েছে">
                            <AdmissionAndTreatmentPage performBlockingSync={performBlockingSync} admissions={admissions} setAdmissions={setAdmissions} patients={patients} setPatients={setPatients} doctors={doctors} setDoctors={setDoctors} referrars={referrars} setReferrars={setReferrars} employees={employees} medicines={medicines} setMedicines={setMedicines} indications={indications} setIndications={setIndications} services={services} setServices={setServices} setSuccessMessage={setSuccessMessage} drugDemands={drugDemands} setDrugDemands={setDrugDemands} admissionData={admissionFormData} setAdmissionData={setAdmissionFormData} />
                        </ErrorBoundary>
                    </div>

                    <div className={activeTab === 'patient_info' ? 'block' : 'hidden'}>
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl">
                            <ErrorBoundary fallbackTitle="পেশেন্ট ইনফো মডিউলে ত্রুটি হয়েছে">
                                <PatientInfoPage patients={patients} setPatients={setPatients} isEmbedded={false} performBlockingSync={performBlockingSync} />
                            </ErrorBoundary>
                        </div>
                    </div>

                    <div className={activeTab === 'bed_status' ? 'block' : 'hidden'}>
                        <ErrorBoundary fallbackTitle="বেড স্ট্যাটাস মডিউলে ত্রুটি হয়েছে">
                            <BedManagementPage admissions={admissions} setAdmissions={setAdmissions} setSuccessMessage={setSuccessMessage} performBlockingSync={performBlockingSync} />
                        </ErrorBoundary>
                    </div>

                    <div className={activeTab === 'invoice' ? 'block' : 'hidden'}>
                        <ErrorBoundary fallbackTitle="ইনডোর ইনভয়েস মডিউলে ত্রুটি হয়েছে">
                            <IndoorInvoicePage admissions={admissions} doctors={doctors} referrars={referrars} employees={employees} indoorInvoices={indoorInvoices} setIndoorInvoices={setIndoorInvoices} setSuccessMessage={setSuccessMessage} medicines={medicines} setAdmissions={setAdmissions} detailedExpenses={detailedExpenses} patients={patients} performBlockingSync={performBlockingSync} />
                        </ErrorBoundary>
                    </div>

                    <div className={activeTab === 'due_collection' ? 'block' : 'hidden'}>
                        <ErrorBoundary fallbackTitle="ক্লিনিক বকেয়া আদায় মডিউলে ত্রুটি হয়েছে">
                            <ClinicDueCollectionPage indoorInvoices={indoorInvoices} setIndoorInvoices={setIndoorInvoices} clinicDueCollections={clinicDueCollections} setClinicDueCollections={setClinicDueCollections} employees={employees} setSuccessMessage={setSuccessMessage} performBlockingSync={performBlockingSync} />
                        </ErrorBoundary>
                    </div>

                    <div className={activeTab === 'report_summary' ? 'block' : 'hidden'}>
                        <ErrorBoundary fallbackTitle="রিপোর্ট সামারি মডিউলে ত্রুটি হয়েছে">
                            <ReportSummaryPage admissions={admissions} doctors={doctors} patients={patients} onOpenRxMaster={() => setShowRxMaster(true)} />
                        </ErrorBoundary>
                    </div>

                    <div className={activeTab === 'consolidated_clinic_entry' ? 'block w-full h-full' : 'hidden'}>
                        <ErrorBoundary fallbackTitle="কনসোলিডেটেড ক্লিনিক ডাটা এন্ট্রি মডিউলে ত্রুটি হয়েছে">
                            <DailyConsolidatedClinicEntryPage 
                                onBack={() => setActiveTab('patient_info')}
                                performBlockingSync={performBlockingSync}
                                currentUserEmail={currentUserEmail}
                                consolidatedClinicEntries={consolidatedClinicEntries}
                                setConsolidatedClinicEntries={setConsolidatedClinicEntries}
                            />
                        </ErrorBoundary>
                    </div>
                </div>
            </div>
            {showRxMaster && <DischargeRxMasterModal admissions={admissions} patients={patients} doctors={doctors} medicines={medicines} onClose={() => setShowRxMaster(false)} />}
        </div>
    );
};

export default ClinicPage;
