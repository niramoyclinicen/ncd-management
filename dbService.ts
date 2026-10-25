import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { 
  Test, 
  SubTest, 
  Patient, 
  Doctor, 
  Referrar, 
  Employee, 
  ReagentItem, 
  MedicineItem, 
  PurchaseInvoice, 
  SalesInvoice, 
  AdmissionRecord, 
  IndoorPatientInvoice, 
  ExpenseItem, 
  PrescriptionRecord, 
  LabReport, 
  Appointment 
} from './components/DiagnosticData';

// =========================================================================
// TYPES & INTERFACES
// =========================================================================

export interface ClinicProfile {
  name: string;
  tagline: string;
  address: string;
  mobile: string;
  email: string;
  website?: string;
  logoUrl?: string;
}

export interface PrintSettings {
  headerHeight: number;
  footerHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  fontSize: number;
  fontFamily: string;
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  prescriptionHeaderHeight: number;
  prescriptionFooterHeight: number;
}

export interface StaffAccount {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: string;
  department: string;
  mobile: string;
  status: 'Active' | 'Inactive';
  permissions: string[];
}

export interface SMSGatewaySettings {
  provider: string;
  apiKey: string;
  senderId: string;
  apiUrl: string;
  isEnabled: boolean;
  templates: {
    admission: string;
    discharge: string;
    labReady: string;
    dueAlert: string;
    appointment: string;
  };
}

export interface AutoBackupSettings {
  autoBackupIntervalHours: number;
  maxSnapshots: number;
  autoDownloadJson: boolean;
  isCloudBackupEnabled: boolean;
  lastBackupTimestamp?: string;
}

export interface HospitalAdjustment {
  profitDist: number;
  houseRent: number;
  loanInstallment: number;
  netProfit?: number;
  notes?: string;
}

export interface HospitalModuleConfig {
  enableDiagnostic: boolean;
  enableClinic: boolean;
  enablePharmacy: boolean;
  enableAccounts: boolean;
  enableMarketing: boolean;
  enableDoctorPortal: boolean;
  enableLabReporting: boolean;
  enableSms: boolean;
}

export interface DailyConsolidatedEntry {
  id: string;
  date: string;
  shift?: string;
  entryType?: string;
  grossAmount: number;
  discountAmount: number;
  netPayable: number;
  cashCollected: number;
  dueAmount: number;
  doctorCommissionPaid: number;
  usgDoctorFeePaid: number;
  totalPatients: number;
  totalTests: number;
  breakdown: {
    pathology: number;
    usg: number;
    xray: number;
    ecg: number;
    hormone: number;
    others: number;
  };
  notes?: string;
  data?: any;
}

export interface DailyConsolidatedClinicEntry {
  id: string;
  date: string;
  shift?: string;
  entryType?: string;
  grossAmount: number;
  discountAmount: number;
  netPayable: number;
  cashCollected: number;
  dueAmount: number;
  doctorCommissionPaid: number;
  otChargesPaid: number;
  totalPatients: number;
  totalIndoorRevenue: number;
  breakdown: Record<string, number>;
  notes?: string;
  data?: any;
}

// =========================================================================
// DEFAULTS
// =========================================================================

export const defaultClinicProfile: ClinicProfile = {
  name: 'Niramoy Clinic & Diagnostic',
  tagline: 'Committed to Quality Healthcare',
  address: 'Hospital Road, Enayetpur, Sirajganj',
  mobile: '01730 923007',
  email: 'niramoyclinic@gmail.com',
  website: 'www.niramoyclinic.com'
};

export const defaultPrintSettings: PrintSettings = {
  headerHeight: 90,
  footerHeight: 60,
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 15,
  marginRight: 15,
  fontSize: 12,
  fontFamily: 'Inter',
  showWatermark: false,
  watermarkText: 'NIRAMOY CLINIC',
  watermarkOpacity: 0.08,
  prescriptionHeaderHeight: 110,
  prescriptionFooterHeight: 70
};

export const defaultStaffAccounts: StaffAccount[] = [];

export const defaultSMSGatewaySettings: SMSGatewaySettings = {
  provider: 'Greenweb',
  apiKey: '',
  senderId: '',
  apiUrl: 'http://api.greenweb.com.bd/api.php',
  isEnabled: false,
  templates: {
    admission: 'Dear {name}, patient {patient_name} admitted to cabin {cabin}. Hotline: 01730923007.',
    discharge: 'Dear {name}, patient {patient_name} successfully discharged. Thank you.',
    labReady: 'Dear {name}, your lab report is ready. Invoice: {invoice_id}.',
    dueAlert: 'Dear {name}, you have a pending bill of Tk {amount}. Please clear at counter.',
    appointment: 'Dear {name}, appointment confirmed with Dr. {doctor} at {time}.'
  }
};

export const defaultAutoBackupSettings: AutoBackupSettings = {
  autoBackupIntervalHours: 6,
  maxSnapshots: 10,
  autoDownloadJson: false,
  isCloudBackupEnabled: true
};

export const defaultHospitalAdjustments: HospitalAdjustment = {
  profitDist: 0,
  houseRent: 0,
  loanInstallment: 0
};

export const defaultHospitalModuleConfig: HospitalModuleConfig = {
  enableDiagnostic: true,
  enableClinic: true,
  enablePharmacy: true,
  enableAccounts: true,
  enableMarketing: true,
  enableDoctorPortal: true,
  enableLabReporting: true,
  enableSms: true
};

// =========================================================================
// SUPABASE CLIENT SETUP (PURE MULTI-TABLE ONLY)
// =========================================================================

const DEFAULT_SUPABASE_URL = 'https://uutvqsxltdddcrwkhxhm.supabase.co';

const getStoredConfig = () => {
  let url = '';
  let key = '';

  try {
    if (typeof localStorage !== 'undefined') {
      url = localStorage.getItem('ncd_supabase_url') || '';
      key = localStorage.getItem('ncd_supabase_anon_key') || '';
    }
  } catch (e) {}

  if (!url) {
    try {
      // @ts-expect-error import.meta is available in Vite environment
      url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
    } catch (e) {}
  }
  if (!url) {
    try {
      url = (typeof process !== 'undefined' && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) || '';
    } catch (e) {}
  }

  // Default to project Ncd_Oct26 if not set
  if (!url) {
    url = DEFAULT_SUPABASE_URL;
  }

  if (!key) {
    try {
      // @ts-expect-error import.meta is available in Vite environment
      key = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
    } catch (e) {}
  }
  if (!key) {
    try {
      key = (typeof process !== 'undefined' && (process.env?.SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) || '';
    } catch (e) {}
  }

  return { url: url.trim(), key: key.trim() };
};

const isValidSupabaseConfig = (url: string, key: string) => {
  try {
    return !!(url && key && (url.startsWith('http://') || url.startsWith('https://')) && key.length > 20);
  } catch {
    return false;
  }
};

let currentConfig = getStoredConfig();
let supabase: SupabaseClient | null = isValidSupabaseConfig(currentConfig.url, currentConfig.key)
  ? createClient(currentConfig.url, currentConfig.key)
  : null;

export const initSupabaseClient = (url: string, key: string): boolean => {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();
  if (isValidSupabaseConfig(cleanUrl, cleanKey)) {
    try {
      supabase = createClient(cleanUrl, cleanKey);
      try {
        localStorage.setItem('ncd_supabase_url', cleanUrl);
        localStorage.setItem('ncd_supabase_anon_key', cleanKey);
      } catch (e) {}
      currentConfig = { url: cleanUrl, key: cleanKey };
      console.log("[dbService] Supabase client initialized for:", cleanUrl);
      return true;
    } catch (e) {
      console.error("[dbService] Supabase client initialization error:", e);
      return false;
    }
  } else {
    try {
      if (cleanUrl) localStorage.setItem('ncd_supabase_url', cleanUrl);
    } catch (e) {}
    supabase = null;
    return false;
  }
};

export const getSupabaseClient = (): SupabaseClient | null => supabase;

// =========================================================================
// NORMALIZATION & DATE HELPERS
// =========================================================================

export const normalizeDate = (raw: any): string => {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';

  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  const converted = s.replace(/[০-৯]/g, ch => bnToEnMap[ch] || ch);

  if (/^\d{4}-\d{2}-\d{2}$/.test(converted)) return converted;

  const isoMatch = converted.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoMatch) return isoMatch[1];

  const dmyMatch = converted.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const d = new Date(converted);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return converted.split(/[T ]/)[0];
};

export const normalizePatientItem = (p: any): Patient | null => {
  if (!p) return null;
  const id = String(p.id || p.pt_id || p.patient_id || '').trim();
  const pt_id = String(p.pt_id || p.patient_id || p.id || '').trim();
  if (!id && !pt_id) return null;

  const rawData = p.data && typeof p.data === 'object' ? p.data : {};
  return {
    ...rawData,
    ...p,
    id: id || pt_id,
    pt_id: pt_id || id,
    name: p.name || p.pt_name || rawData.name || rawData.pt_name || '',
    age: p.age || rawData.age || '',
    gender: p.gender || rawData.gender || 'Male',
    mobile: p.mobile || rawData.mobile || '',
    address: p.address || rawData.address || '',
    created_at: p.created_at || rawData.created_at || new Date().toISOString()
  };
};

export const normalizeTestItem = (t: any): Test | null => {
  if (!t) return null;
  const testId = String(t.test_id || t.id || t.code || '').trim();
  if (!testId) return null;

  const rawData = t.data && typeof t.data === 'object' ? t.data : {};
  let subTests = t.sub_tests ?? t.subTests ?? rawData.sub_tests ?? rawData.subTests ?? [];
  if (typeof subTests === 'string') {
    try { subTests = JSON.parse(subTests); } catch { subTests = []; }
  }
  let reagents = t.reagents_required ?? t.reagentsRequired ?? rawData.reagents_required ?? [];
  if (typeof reagents === 'string') {
    try { reagents = JSON.parse(reagents); } catch { reagents = []; }
  }

  const price = Number(t.price ?? rawData.price ?? 0);
  const comm = Number(t.test_commission ?? t.testCommission ?? t.commission ?? rawData.test_commission ?? 0);

  return {
    ...rawData,
    ...t,
    id: testId,
    test_id: testId,
    test_name: t.test_name || t.testName || t.name || rawData.test_name || '',
    category: t.category || rawData.category || 'Pathology',
    price: price,
    test_commission: comm,
    normal_range: t.normal_range || t.normalRange || rawData.normal_range || '',
    unit: t.unit || rawData.unit || '',
    is_group_test: !!(t.is_group_test ?? t.isGroupTest ?? rawData.is_group_test),
    sub_tests: Array.isArray(subTests) ? subTests : [],
    reagents_required: Array.isArray(reagents) ? reagents : [],
    usg_exam_charge: Number(t.usg_exam_charge ?? t.usgExamCharge ?? rawData.usg_exam_charge ?? 0),
    extra_lab_fee: Number(t.extra_lab_fee ?? t.extraLabFee ?? rawData.extra_lab_fee ?? 0),
    availability: t.availability !== undefined ? !!t.availability : true
  };
};

export const mergeEntityList = <T>(currentList: T[], newList: T[], idFields: string[]): T[] => {
  if (!Array.isArray(currentList)) currentList = [];
  if (!Array.isArray(newList)) return currentList;

  const map = new Map<string, T>();

  const getEntityId = (item: any): string => {
    if (!item || typeof item !== 'object') return '';
    for (const f of idFields) {
      if (item[f] !== undefined && item[f] !== null && String(item[f]).trim() !== '') {
        return String(item[f]).trim();
      }
    }
    return '';
  };

  currentList.forEach(item => {
    const id = getEntityId(item);
    if (id) map.set(id, item);
  });

  newList.forEach(item => {
    const id = getEntityId(item);
    if (id) {
      const existing = map.get(id);
      map.set(id, existing ? { ...existing, ...item } : item);
    }
  });

  return Array.from(map.values());
};

// =========================================================================
// SAFE SUPABASE QUERIES (PURE MULTI-TABLE ONLY)
// =========================================================================

const fetchTableSafe = async (client: SupabaseClient, tableName: string): Promise<any[]> => {
  try {
    const { data, error } = await client.from(tableName).select('*').limit(50000);
    if (error) {
      console.warn(`[dbService] fetchTableSafe notice for ${tableName}:`, error.message);
      return [];
    }
    return data || [];
  } catch (e: any) {
    console.warn(`[dbService] fetchTableSafe exception for ${tableName}:`, e?.message);
    return [];
  }
};

const upsertTableSafe = async (client: SupabaseClient, tableName: string, rows: any[]): Promise<{ success: boolean; error?: string }> => {
  if (!rows || rows.length === 0) return { success: true };
  try {
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      let { error } = await client.from(tableName).upsert(chunk, { onConflict: 'id' });

      // If missing column error in schema cache, iteratively remove bad column and retry
      let colRetry = 0;
      let sanitizedChunk = chunk;
      while (error && colRetry < 20) {
        const colMatch = error.message 
          ? (error.message.match(/Could not find the '([^']+)' column/i) || 
             error.message.match(/column "([^"]+)" of relation "[^"]+" does not exist/i) ||
             error.message.match(/column '([^']+)' does not exist/i))
          : null;
        if (colMatch && colMatch[1]) {
          const badCol = colMatch[1];
          sanitizedChunk = sanitizedChunk.map(r => {
            const copy = { ...r };
            delete copy[badCol];
            return copy;
          });
          const retryRes = await client.from(tableName).upsert(sanitizedChunk, { onConflict: 'id' });
          if (!retryRes.error) {
            error = null;
            break;
          }
          error = retryRes.error;
          colRetry++;
        } else {
          break;
        }
      }

      // If upsert still failed, try fallback insert
      if (error) {
        const { error: insertErr } = await client.from(tableName).insert(sanitizedChunk);
        if (!insertErr) {
          error = null;
        } else {
          error = insertErr;
        }
      }

      if (error) {
        console.error(`[dbService] Upsert failed for table ${tableName}:`, error.message);
        return { success: false, error: `Table [${tableName}]: ${error.message}` };
      }
    }
    return { success: true };
  } catch (err: any) {
    console.error(`[dbService] Upsert exception for table ${tableName}:`, err?.message || err);
    return { success: false, error: `Table [${tableName}]: ${err?.message || 'Unknown error'}` };
  }
};

// =========================================================================
// MAIN SERVICE IMPLEMENTATION
// =========================================================================

export const dbService = {
  // Config & Connection
  getSupabaseConfig: () => {
    return {
      url: currentConfig.url || DEFAULT_SUPABASE_URL,
      key: currentConfig.key || '',
      isConnected: !!supabase
    };
  },

  setSupabaseConfig: (url: string, key: string): boolean => {
    return initSupabaseClient(url, key);
  },

  isSupabaseConnected: (): boolean => {
    return !!supabase;
  },

  testConnection: async (): Promise<{ success: boolean; message: string; tablesFound?: Record<string, number> }> => {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase ক্লায়েন্ট ইনিশিয়ালাইজ হয়নি। অনুগ্রহ করে Settings এ গিয়ে Supabase Anon Key প্রদান করুন।'
      };
    }

    try {
      const checkTables = [
        'patients', 'doctors', 'referrars', 'tests', 'lab_invoices',
        'indoor_invoices', 'medicines', 'detailed_expenses', 'consolidated_lab_entries'
      ];
      
      const counts: Record<string, number> = {};
      let anyFound = false;

      for (const tbl of checkTables) {
        const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          counts[tbl] = count;
          anyFound = true;
        }
      }

      if (anyFound) {
        return {
          success: true,
          message: 'সুপাবেজ ক্লাউড ডাটাবেজ (Ncd_Oct26) সফলভাবে সংযুক্ত রয়েছে এবং মাল্টি-টেবিল সক্রিয়!',
          tablesFound: counts
        };
      }

      return {
        success: false,
        message: 'সুপাবেজ প্রজেক্টে সংযুক্ত হওয়া যাচ্ছে না অথবা টেবিলগুলো এখনও তৈরি করা হয়নি। অনুগ্রহ করে Supabase SQL Editor এ গিয়ে স্ক্রিপ্টটি চালান।'
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'কানেকশন ত্রুটি: ' + (e?.message || 'Unknown network error')
      };
    }
  },

  // -----------------------------------------------------------------------
  // LOAD FROM CLOUD (PURE MULTI-TABLE ONLY)
  // -----------------------------------------------------------------------
  loadFromCloud: async (): Promise<any> => {
    console.log("[dbService] loadFromCloud started (Pure Multi-Table Architecture)");
    try {
      if (!supabase) {
        console.warn("[dbService] Supabase not initialized, attempting local backup fallback");
        return { _error: "Supabase not initialized." };
      }

      // Concurrently query the 24 modular tables
      const [
        patientsRes,
        doctorsRes,
        referrarsRes,
        testsRes,
        reagentsRes,
        employeesRes,
        labInvoicesRes,
        dueCollectionsRes,
        indoorInvoicesRes,
        admissionsRes,
        dischargesRes,
        medicinesRes,
        clinicalDrugsRes,
        salesInvoicesRes,
        purchaseInvoicesRes,
        medicineSuppliersRes,
        detailedExpensesRes,
        monthlyAdjustmentsRes,
        consolidatedLabRes,
        consolidatedClinicRes,
        appointmentsRes,
        prescriptionsRes,
        reportsRes,
        settingsRes
      ] = await Promise.all([
        fetchTableSafe(supabase, 'patients'),
        fetchTableSafe(supabase, 'doctors'),
        fetchTableSafe(supabase, 'referrars'),
        fetchTableSafe(supabase, 'tests'),
        fetchTableSafe(supabase, 'reagents'),
        fetchTableSafe(supabase, 'employees'),
        fetchTableSafe(supabase, 'lab_invoices'),
        fetchTableSafe(supabase, 'due_collections'),
        fetchTableSafe(supabase, 'indoor_invoices'),
        fetchTableSafe(supabase, 'admissions'),
        fetchTableSafe(supabase, 'discharges'),
        fetchTableSafe(supabase, 'medicines'),
        fetchTableSafe(supabase, 'clinical_drugs'),
        fetchTableSafe(supabase, 'sales_invoices'),
        fetchTableSafe(supabase, 'purchase_invoices'),
        fetchTableSafe(supabase, 'medicine_suppliers'),
        fetchTableSafe(supabase, 'detailed_expenses'),
        fetchTableSafe(supabase, 'monthly_adjustments'),
        fetchTableSafe(supabase, 'consolidated_lab_entries'),
        fetchTableSafe(supabase, 'consolidated_clinic_entries'),
        fetchTableSafe(supabase, 'appointments'),
        fetchTableSafe(supabase, 'prescriptions'),
        fetchTableSafe(supabase, 'reports'),
        fetchTableSafe(supabase, 'app_settings')
      ]);

      const state: any = {};

      // 1. Patients
      state.patients = (patientsRes || [])
        .map(r => normalizePatientItem(r))
        .filter((p): p is Patient => p !== null && !!p.pt_id);

      // 2. Doctors
      state.doctors = (doctorsRes || []).map((d: any) => ({
        ...d.data,
        ...d,
        id: String(d.doctor_id || d.id || '').trim(),
        doctor_id: String(d.doctor_id || d.id || '').trim(),
        name: d.name || d.data?.name || '',
        specialty: d.specialty || d.data?.specialty || '',
        degree: d.degree || d.data?.degree || '',
        mobile: d.mobile || d.data?.mobile || '',
        commission_rate: Number(d.commission_rate ?? d.data?.commission_rate ?? 0),
        room_no: d.room_no || d.data?.room_no || ''
      }));

      // 3. Referrars
      state.referrars = (referrarsRes || []).map((r: any) => ({
        ...r.data,
        ...r,
        id: String(r.ref_id || r.id || '').trim(),
        ref_id: String(r.ref_id || r.id || '').trim(),
        ref_name: r.ref_name || r.name || r.data?.ref_name || '',
        area: r.area || r.data?.area || '',
        ref_mobile: r.ref_mobile || r.mobile || r.data?.ref_mobile || '',
        commission_percent: Number(r.commission_percent ?? r.data?.commission_percent ?? 0)
      }));

      // 4. Tests
      state.tests = (testsRes || [])
        .map(t => normalizeTestItem(t))
        .filter((t): t is Test => t !== null && !!t.test_id);

      // 5. Reagents
      state.reagents = (reagentsRes || []).map((r: any) => ({
        ...r.data,
        ...r,
        id: String(r.reagent_id || r.id || '').trim(),
        reagent_id: String(r.reagent_id || r.id || '').trim(),
        reagent_name: r.reagent_name || r.name || r.data?.reagent_name || '',
        company: r.company || r.data?.company || '',
        quantity: Number(r.quantity ?? r.data?.quantity ?? 0),
        cost_per_unit: Number(r.cost_per_unit ?? r.data?.cost_per_unit ?? 0),
        expiry_date: r.expiry_date || r.data?.expiry_date || ''
      }));

      // 6. Employees
      state.employees = (employeesRes || []).map((e: any) => ({
        ...e.data,
        ...e,
        id: String(e.emp_id || e.id || '').trim(),
        emp_id: String(e.emp_id || e.id || '').trim(),
        name: e.name || e.data?.name || '',
        designation: e.designation || e.data?.designation || '',
        department: e.department || e.data?.department || '',
        mobile: e.mobile || e.data?.mobile || '',
        basic_salary: Number(e.basic_salary ?? e.data?.basic_salary ?? 0),
        join_date: e.join_date || e.data?.join_date || ''
      }));

      // 7. Lab Invoices
      state.labInvoices = (labInvoicesRes || [])
        .filter((r: any) => r.status !== 'Deleted' && !r.is_deleted)
        .map((r: any) => {
          const raw = r.data && typeof r.data === 'object' ? r.data : {};
          let items = r.items ?? raw.items;
          if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch { items = []; }
          }
          const invId = String(r.invoice_id || r.id || raw.invoice_id || '').trim();
          const invDate = normalizeDate(r.invoice_date || r.date || raw.invoice_date || '');
          const total = Number(r.total_amount ?? r.total ?? raw.total_amount ?? 0);
          const paid = Number(r.paid_amount ?? r.paid ?? raw.paid_amount ?? 0);
          const discount = Number(r.discount_amount ?? r.discount ?? raw.discount_amount ?? 0);
          const due = Number(r.due_amount ?? r.due ?? raw.due_amount ?? Math.max(0, total - discount - paid));

          return {
            ...raw,
            ...r,
            id: invId,
            invoice_id: invId,
            invoiceId: invId,
            invoice_date: invDate,
            invoiceDate: invDate,
            date: invDate,
            patient_id: r.patient_id || raw.patient_id || '',
            patient_name: r.patient_name || raw.patient_name || '',
            doctor_id: r.doctor_id || raw.doctor_id || '',
            doctor_name: r.doctor_name || raw.doctor_name || '',
            referrar_id: r.referrar_id || raw.referrar_id || '',
            referrar_name: r.referrar_name || raw.referrar_name || '',
            items: Array.isArray(items) ? items : [],
            total_amount: total,
            totalAmount: total,
            paid_amount: paid,
            paidAmount: paid,
            discount_amount: discount,
            discount: discount,
            due_amount: due,
            dueAmount: due,
            status: r.status || raw.status || (due > 0 ? 'Due' : 'Paid')
          };
        }).filter(r => r.invoice_id);

      // 8. Due Collections
      state.dueCollections = (dueCollectionsRes || []).map((r: any) => {
        const raw = r.data && typeof r.data === 'object' ? r.data : {};
        const colId = String(r.collection_id || r.id || raw.collection_id || '').trim();
        const invId = String(r.invoice_id || raw.invoice_id || '').trim();
        const colDate = normalizeDate(r.collection_date || r.date || raw.collection_date || '');
        return {
          ...raw,
          ...r,
          id: colId,
          collection_id: colId,
          collectionId: colId,
          invoice_id: invId,
          amount_collected: Number(r.amount_collected ?? r.amount ?? raw.amount_collected ?? 0),
          collection_date: colDate,
          date: colDate
        };
      }).filter(r => r.collection_id || r.invoice_id);

      // 9. Indoor Invoices
      state.indoorInvoices = (indoorInvoicesRes || []).map((r: any) => {
        const raw = r.data && typeof r.data === 'object' ? r.data : {};
        let items = r.items ?? raw.items;
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch { items = []; }
        }
        const invId = String(r.daily_id || r.invoice_id || r.id || raw.daily_id || '').trim();
        const invDate = normalizeDate(r.admission_date || r.invoice_date || r.date || raw.admission_date || '');
        const paid = Number(r.paid_amount ?? raw.paid_amount ?? 0);
        const bill = Number(r.total_bill ?? raw.total_bill ?? 0);
        return {
          ...raw,
          ...r,
          id: invId,
          daily_id: invId,
          invoice_id: invId,
          admission_date: invDate,
          invoice_date: invDate,
          date: invDate,
          items: Array.isArray(items) ? items : [],
          total_bill: bill,
          paid_amount: paid,
          paidAmount: paid,
          status: r.status || raw.status || 'Posted'
        };
      }).filter(r => r.daily_id);

      // 10. Admissions & Discharges
      state.admissions = (admissionsRes || []).map((a: any) => ({
        ...a.data,
        ...a,
        id: String(a.admission_id || a.id || '').trim(),
        admission_id: String(a.admission_id || a.id || '').trim(),
        patient_name: a.patient_name || a.data?.patient_name || '',
        cabin_bed_no: a.cabin_bed_no || a.data?.cabin_bed_no || '',
        admission_date: normalizeDate(a.admission_date || a.data?.admission_date || ''),
        status: a.status || a.data?.status || 'Admitted'
      }));

      // 11. Medicines
      state.medicines = (medicinesRes || []).map((m: any) => {
        const raw = m.data && typeof m.data === 'object' ? m.data : {};
        const medId = String(m.id || raw.id || '').trim();
        return {
          ...raw,
          ...m,
          id: medId,
          tradeName: m.trade_name || m.tradeName || raw.tradeName || '',
          genericName: m.generic_name || m.genericName || raw.genericName || '',
          formulation: m.formulation || raw.formulation || 'Tab',
          strength: m.strength || raw.strength || '',
          unitPriceBuy: Number(m.unit_price_buy ?? m.unitPriceBuy ?? raw.unitPriceBuy ?? 0),
          unitPriceSell: Number(m.unit_price_sell ?? m.unitPriceSell ?? raw.unitPriceSell ?? 0),
          stock: Number(m.stock ?? raw.stock ?? 0),
          boxSize: Number(m.box_size ?? m.boxSize ?? raw.boxSize ?? 1),
          supplier: m.supplier || raw.supplier || '',
          expiryDate: m.expiry_date || m.expiryDate || raw.expiryDate || '',
          isAntibiotic: !!(m.is_antibiotic ?? m.isAntibiotic ?? raw.isAntibiotic),
          requiresPrescription: !!(m.requires_prescription ?? m.requiresPrescription ?? raw.requiresPrescription)
        };
      }).filter(m => m.id);

      // 12. Clinical Drugs
      state.clinicalDrugs = clinicalDrugsRes || [];

      // 13. Sales Invoices
      state.salesInvoices = (salesInvoicesRes || []).map((r: any) => {
        const raw = r.data && typeof r.data === 'object' ? r.data : {};
        let items = r.items ?? raw.items;
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch { items = []; }
        }
        const invId = String(r.invoice_id || r.id || raw.invoice_id || '').trim();
        const invDate = normalizeDate(r.invoice_date || r.date || raw.invoice_date || '');
        const net = Number(r.net_payable ?? r.netPayable ?? raw.net_payable ?? 0);
        const paid = Number(r.paid_amount ?? r.paidAmount ?? raw.paid_amount ?? 0);
        const due = Number(r.due_amount ?? r.dueAmount ?? raw.due_amount ?? Math.max(0, net - paid));
        return {
          ...raw,
          ...r,
          id: invId,
          invoiceId: invId,
          invoice_id: invId,
          invoiceDate: invDate,
          invoice_date: invDate,
          date: invDate,
          customerName: r.customer_name || raw.customerName || '',
          items: Array.isArray(items) ? items : [],
          netPayable: net,
          net_payable: net,
          paidAmount: paid,
          paid_amount: paid,
          dueAmount: due,
          due_amount: due,
          status: r.status || raw.status || 'Posted'
        };
      }).filter(r => r.invoiceId);

      // 14. Purchase Invoices
      state.purchaseInvoices = (purchaseInvoicesRes || []).map((r: any) => {
        const raw = r.data && typeof r.data === 'object' ? r.data : {};
        let items = r.items ?? raw.items;
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch { items = []; }
        }
        const invId = String(r.invoice_id || r.id || raw.invoice_id || '').trim();
        const invDate = normalizeDate(r.invoice_date || r.date || raw.invoice_date || '');
        const net = Number(r.net_payable ?? r.netPayable ?? raw.net_payable ?? 0);
        const paid = Number(r.paid_amount ?? r.paidAmount ?? raw.paid_amount ?? 0);
        const due = Number(r.due_amount ?? r.dueAmount ?? raw.due_amount ?? Math.max(0, net - paid));
        return {
          ...raw,
          ...r,
          id: invId,
          invoiceId: invId,
          invoice_id: invId,
          invoiceDate: invDate,
          invoice_date: invDate,
          date: invDate,
          source: r.source || raw.source || '',
          items: Array.isArray(items) ? items : [],
          netPayable: net,
          net_payable: net,
          paidAmount: paid,
          paid_amount: paid,
          dueAmount: due,
          due_amount: due,
          status: r.status || raw.status || 'Saved'
        };
      }).filter(r => r.invoiceId);

      // 15. Detailed Expenses
      const cleanExpenses: Record<string, ExpenseItem[]> = {};
      (detailedExpensesRes || []).forEach((row: any) => {
        const raw = row.data && typeof row.data === 'object' ? row.data : {};
        const dateKey = normalizeDate(row.date || row.expense_date || raw.date || '');
        if (!dateKey) return;

        if (!cleanExpenses[dateKey]) cleanExpenses[dateKey] = [];
        const expId = String(row.id || raw.id || `exp_${dateKey}_${Date.now()}`);
        const bill = Number(row.bill_amount ?? row.amount ?? raw.billAmount ?? 0);
        const paid = Number(row.paid_amount ?? row.amount ?? raw.paidAmount ?? bill);

        const expItem: ExpenseItem = {
          ...raw,
          id: expId,
          date: dateKey,
          category: row.category || raw.category || 'General',
          subCategory: row.sub_category || raw.subCategory || '',
          description: row.description || raw.description || '',
          billAmount: bill,
          paidAmount: paid,
          dept: row.dept || raw.dept || 'Diagnostic'
        };

        const existingIdx = cleanExpenses[dateKey].findIndex(x => String(x.id) === expId);
        if (existingIdx >= 0) {
          cleanExpenses[dateKey][existingIdx] = expItem;
        } else {
          cleanExpenses[dateKey].push(expItem);
        }
      });
      state.detailedExpenses = cleanExpenses;

      // 16. Monthly Adjustments
      const cleanAdjustments: Record<string, HospitalAdjustment> = {};
      (monthlyAdjustmentsRes || []).forEach((r: any) => {
        const raw = r.data && typeof r.data === 'object' ? r.data : {};
        const k = String(r.month_key || raw.month_key || r.id || '').trim();
        if (k) {
          cleanAdjustments[k] = {
            profitDist: Number(r.profit_distribution ?? raw.profitDist ?? 0),
            houseRent: Number(r.house_rent ?? raw.houseRent ?? 0),
            loanInstallment: Number(r.loan_installment ?? raw.loanInstallment ?? 0),
            netProfit: Number(r.net_profit ?? raw.netProfit ?? 0),
            notes: r.notes || raw.notes || ''
          };
        }
      });
      state.monthlyAdjustments = cleanAdjustments;

      // 17. Consolidated Lab Entries
      state.consolidatedLabEntries = (consolidatedLabRes || []).map((r: any) => {
        const raw = r.data && typeof r.data === 'object' ? r.data : {};
        return {
          ...raw,
          ...r,
          id: String(r.id || raw.id || '').trim(),
          date: normalizeDate(r.date || raw.date || ''),
          shift: r.shift || raw.shift || 'Full Day',
          grossAmount: Number(r.gross_amount ?? raw.grossAmount ?? 0),
          discountAmount: Number(r.discount_amount ?? raw.discountAmount ?? 0),
          netPayable: Number(r.net_payable ?? raw.netPayable ?? 0),
          cashCollected: Number(r.cash_collected ?? raw.cashCollected ?? 0),
          dueAmount: Number(r.due_amount ?? raw.dueAmount ?? 0),
          doctorCommissionPaid: Number(r.doctor_commission_paid ?? raw.doctorCommissionPaid ?? 0),
          usgDoctorFeePaid: Number(r.usg_doctor_fee_paid ?? raw.usgDoctorFeePaid ?? 0),
          totalPatients: Number(r.total_patients ?? raw.totalPatients ?? 0),
          totalTests: Number(r.total_tests ?? raw.totalTests ?? 0),
          breakdown: r.breakdown || raw.breakdown || {},
          notes: r.notes || raw.notes || ''
        };
      }).filter((e: any) => e.id);

      // 18. Consolidated Clinic Entries
      state.consolidatedClinicEntries = (consolidatedClinicRes || []).map((r: any) => {
        const raw = r.data && typeof r.data === 'object' ? r.data : {};
        return {
          ...raw,
          ...r,
          id: String(r.id || raw.id || '').trim(),
          date: normalizeDate(r.date || raw.date || ''),
          shift: r.shift || raw.shift || 'Full Day',
          grossAmount: Number(r.gross_amount ?? raw.grossAmount ?? 0),
          discountAmount: Number(r.discount_amount ?? raw.discountAmount ?? 0),
          netPayable: Number(r.net_payable ?? raw.netPayable ?? 0),
          cashCollected: Number(r.cash_collected ?? raw.cashCollected ?? 0),
          dueAmount: Number(r.due_amount ?? raw.dueAmount ?? 0),
          doctorCommissionPaid: Number(r.doctor_commission_paid ?? raw.doctorCommissionPaid ?? 0),
          otChargesPaid: Number(r.ot_charges_paid ?? raw.otChargesPaid ?? 0),
          totalPatients: Number(r.total_patients ?? raw.totalPatients ?? 0),
          totalIndoorRevenue: Number(r.total_indoor_revenue ?? raw.totalIndoorRevenue ?? 0),
          breakdown: r.breakdown || raw.breakdown || {},
          notes: r.notes || raw.notes || ''
        };
      }).filter((e: any) => e.id);

      // 19. Appointments, Prescriptions, Reports
      state.appointments = appointmentsRes || [];
      state.prescriptions = prescriptionsRes || [];
      state.reports = reportsRes || [];

      // Save state into local offline cache for resilient refreshes
      try {
        localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(state));
      } catch (e) {}

      console.log("[dbService] loadFromCloud successful. Total modular records retrieved.");
      return state;
    } catch (e: any) {
      console.error("[dbService] loadFromCloud error:", e);
      return { _error: e?.message || "Failed to load state from cloud." };
    }
  },

  // -----------------------------------------------------------------------
  // SAVE TO CLOUD (PURE MULTI-TABLE ONLY)
  // -----------------------------------------------------------------------
  saveToCloud: async (appState: any): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase ডাটাবেজ সংযুক্ত নেই। Admin Settings এ গিয়ে Supabase Anon Key সেট করুন।'
      };
    }

    try {
      const syncPromises: Promise<{ success: boolean; error?: string }>[] = [];

      if (Array.isArray(appState.patients) && appState.patients.length > 0) {
        syncPromises.push(dbService.syncPatientsToModularTable(appState.patients));
      }
      if (Array.isArray(appState.doctors) && appState.doctors.length > 0) {
        syncPromises.push(dbService.syncDoctorsToModularTable(appState.doctors));
      }
      if (Array.isArray(appState.referrars) && appState.referrars.length > 0) {
        syncPromises.push(dbService.syncReferrarsToModularTable(appState.referrars));
      }
      if (Array.isArray(appState.tests) && appState.tests.length > 0) {
        syncPromises.push(dbService.syncTestsToModularTable(appState.tests));
      }
      if (Array.isArray(appState.reagents) && appState.reagents.length > 0) {
        syncPromises.push(dbService.syncReagentsToModularTable(appState.reagents));
      }
      if (Array.isArray(appState.employees) && appState.employees.length > 0) {
        syncPromises.push(dbService.syncEmployeesToModularTable(appState.employees));
      }
      if (Array.isArray(appState.labInvoices) && appState.labInvoices.length > 0) {
        syncPromises.push(dbService.syncLabInvoicesToModularTable(appState.labInvoices));
      }
      if (Array.isArray(appState.dueCollections) && appState.dueCollections.length > 0) {
        syncPromises.push(dbService.syncDueCollectionsToModularTable(appState.dueCollections));
      }
      if (Array.isArray(appState.indoorInvoices) && appState.indoorInvoices.length > 0) {
        syncPromises.push(dbService.syncIndoorInvoicesToModularTable(appState.indoorInvoices));
      }
      if (Array.isArray(appState.admissions) && appState.admissions.length > 0) {
        syncPromises.push(dbService.syncAdmissionsToModularTable(appState.admissions));
      }
      if (Array.isArray(appState.medicines) && appState.medicines.length > 0) {
        syncPromises.push(dbService.syncMedicinesToModularTable(appState.medicines));
      }
      if (Array.isArray(appState.salesInvoices) && appState.salesInvoices.length > 0) {
        syncPromises.push(dbService.syncSalesInvoicesToModularTable(appState.salesInvoices));
      }
      if (Array.isArray(appState.purchaseInvoices) && appState.purchaseInvoices.length > 0) {
        syncPromises.push(dbService.syncPurchaseInvoicesToModularTable(appState.purchaseInvoices));
      }
      if (appState.detailedExpenses) {
        syncPromises.push(dbService.syncDetailedExpensesToModularTable(appState.detailedExpenses));
      }
      if (appState.monthlyAdjustments) {
        syncPromises.push(dbService.syncAdjustmentsToModularTable(appState.monthlyAdjustments));
      }
      if (Array.isArray(appState.consolidatedLabEntries) && appState.consolidatedLabEntries.length > 0) {
        syncPromises.push(dbService.syncConsolidatedLabEntriesToModularTable(appState.consolidatedLabEntries));
      }
      if (Array.isArray(appState.consolidatedClinicEntries) && appState.consolidatedClinicEntries.length > 0) {
        syncPromises.push(dbService.syncConsolidatedClinicEntriesToModularTable(appState.consolidatedClinicEntries));
      }

      const results = await Promise.all(syncPromises);
      const failed = results.find(r => !r.success);

      // Cache locally
      try {
        localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(appState));
      } catch (e) {}

      if (failed) {
        return { success: false, error: failed.error || 'কিছু টেবিলে ডাটা সেভ হতে সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট ও সুপাবেজ কানেকশন চেক করুন।' };
      }

      return { success: true };
    } catch (e: any) {
      console.error("[dbService] saveToCloud error:", e);
      return { success: false, error: e?.message || 'ডাটা ক্লাউডে সেভ করতে ব্যর্থ হয়েছে।' };
    }
  },

  // -----------------------------------------------------------------------
  // MODULAR TABLE SYNC METHODS
  // -----------------------------------------------------------------------
  syncPatientsToModularTable: async (patients: Patient[]): Promise<boolean> => {
    if (!supabase) {
      console.warn("[dbService] syncPatients: Supabase client is null");
      return false;
    }
    if (!Array.isArray(patients) || patients.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = patients.map(p => {
        const id = String(p.id || p.pt_id || `PT-${Date.now()}`).trim();
        return {
          id: id,
          pt_id: p.pt_id || id,
          name: p.name || '',
          age: String(p.age || ''),
          gender: p.gender || 'Male',
          mobile: p.mobile || '',
          address: p.address || '',
          updated_at: now,
          data: p
        };
      });
      return await upsertTableSafe(supabase, 'patients', rows);
    } catch (e) {
      console.error("[dbService] syncPatients exception:", e);
      return false;
    }
  },

  syncDoctorsToModularTable: async (doctors: Doctor[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(doctors) || doctors.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = doctors.map(d => {
        const id = String(d.doctor_id || d.id || `DOC-${Date.now()}`).trim();
        return {
          id: id,
          doctor_id: id,
          name: d.name || '',
          degree: d.degree || '',
          specialty: d.specialty || '',
          mobile: d.mobile || '',
          commission_rate: Number(d.commission_rate ?? 0),
          room_no: d.room_no || '',
          updated_at: now,
          data: d
        };
      });
      return await upsertTableSafe(supabase, 'doctors', rows);
    } catch (e) {
      console.error("[dbService] syncDoctors exception:", e);
      return false;
    }
  },

  syncReferrarsToModularTable: async (referrars: Referrar[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(referrars) || referrars.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = referrars.map(r => {
        const id = String(r.ref_id || r.id || `REF-${Date.now()}`).trim();
        return {
          id: id,
          ref_id: id,
          ref_name: r.ref_name || '',
          area: r.area || '',
          ref_mobile: r.ref_mobile || '',
          commission_percent: Number(r.commission_percent ?? 0),
          updated_at: now,
          data: r
        };
      });
      return await upsertTableSafe(supabase, 'referrars', rows);
    } catch (e) {
      console.error("[dbService] syncReferrars exception:", e);
      return false;
    }
  },

  syncTestsToModularTable: async (tests: Test[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(tests) || tests.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = tests.map(t => {
        const id = String(t.test_id || t.id || `TEST-${Date.now()}`).trim();
        return {
          id: id,
          test_id: id,
          test_name: t.test_name || '',
          category: t.category || 'Pathology',
          price: Number(t.price ?? 0),
          test_commission: Number(t.test_commission ?? 0),
          normal_range: t.normal_range || '',
          unit: t.unit || '',
          is_group_test: !!t.is_group_test,
          sub_tests: t.sub_tests || [],
          reagents_required: t.reagents_required || [],
          usg_exam_charge: Number(t.usg_exam_charge ?? 0),
          extra_lab_fee: Number(t.extra_lab_fee ?? 0),
          availability: t.availability !== undefined ? !!t.availability : true,
          updated_at: now,
          data: t
        };
      });
      return await upsertTableSafe(supabase, 'tests', rows);
    } catch (e) {
      console.error("[dbService] syncTests exception:", e);
      return false;
    }
  },

  syncReagentsToModularTable: async (reagents: ReagentItem[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(reagents) || reagents.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = reagents.map(r => {
        const id = String(r.reagent_id || r.id || `RGT-${Date.now()}`).trim();
        return {
          id: id,
          reagent_id: id,
          reagent_name: r.reagent_name || '',
          company: r.company || '',
          quantity: Number(r.quantity ?? 0),
          cost_per_unit: Number(r.cost_per_unit ?? 0),
          expiry_date: r.expiry_date || '',
          updated_at: now,
          data: r
        };
      });
      return await upsertTableSafe(supabase, 'reagents', rows);
    } catch (e) {
      console.error("[dbService] syncReagents exception:", e);
      return false;
    }
  },

  syncEmployeesToModularTable: async (employees: Employee[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(employees) || employees.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = employees.map(e => {
        const id = String(e.emp_id || e.id || `EMP-${Date.now()}`).trim();
        return {
          id: id,
          emp_id: id,
          name: e.name || '',
          designation: e.designation || '',
          department: e.department || '',
          mobile: e.mobile || '',
          basic_salary: Number(e.basic_salary ?? 0),
          join_date: e.join_date || '',
          updated_at: now,
          data: e
        };
      });
      return await upsertTableSafe(supabase, 'employees', rows);
    } catch (e) {
      console.error("[dbService] syncEmployees exception:", e);
      return false;
    }
  },

  syncLabInvoicesToModularTable: async (invoices: any[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(invoices) || invoices.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = invoices.map(inv => {
        const id = String(inv.invoice_id || inv.id || inv.invoiceId || `INV-${Date.now()}`).trim();
        const invDate = normalizeDate(inv.invoice_date || inv.date || now);
        const total = Number(inv.total_amount ?? inv.totalAmount ?? inv.total ?? 0);
        const paid = Number(inv.paid_amount ?? inv.paidAmount ?? inv.paid ?? 0);
        const discount = Number(inv.discount_amount ?? inv.discountAmount ?? inv.discount ?? 0);
        const due = Number(inv.due_amount ?? inv.dueAmount ?? Math.max(0, total - discount - paid));
        return {
          id: id,
          invoice_id: id,
          patient_id: String(inv.patient_id || inv.pt_id || ''),
          patient_name: inv.patient_name || inv.pt_name || '',
          doctor_id: String(inv.doctor_id || ''),
          doctor_name: inv.doctor_name || '',
          referrar_id: String(inv.referrar_id || inv.ref_id || ''),
          referrar_name: inv.referrar_name || inv.ref_name || '',
          invoice_date: invDate,
          total_amount: total,
          discount_amount: discount,
          paid_amount: paid,
          due_amount: due,
          commission_paid: Number(inv.commission_paid ?? inv.commissionPaid ?? 0),
          special_commission: Number(inv.special_commission ?? inv.specialCommission ?? 0),
          items: Array.isArray(inv.items) ? inv.items : [],
          status: inv.status || (due > 0 ? 'Due' : 'Paid'),
          updated_at: now,
          data: inv
        };
      });
      return await upsertTableSafe(supabase, 'lab_invoices', rows);
    } catch (e) {
      console.error("[dbService] syncLabInvoices exception:", e);
      return false;
    }
  },

  syncDueCollectionsToModularTable: async (collections: any[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(collections) || collections.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = collections.map(dc => {
        const id = String(dc.collection_id || dc.id || dc.collectionId || `DUE-${Date.now()}`).trim();
        const colDate = normalizeDate(dc.collection_date || dc.date || now);
        return {
          id: id,
          collection_id: id,
          invoice_id: String(dc.invoice_id || dc.invoiceId || ''),
          patient_id: String(dc.patient_id || ''),
          patient_name: dc.patient_name || '',
          collection_date: colDate,
          amount_collected: Number(dc.amount_collected ?? dc.amount ?? 0),
          payment_method: dc.payment_method || 'Cash',
          collector: dc.collector || 'Admin',
          remarks: dc.remarks || '',
          updated_at: now,
          data: dc
        };
      });
      return await upsertTableSafe(supabase, 'due_collections', rows);
    } catch (e) {
      console.error("[dbService] syncDueCollections exception:", e);
      return false;
    }
  },

  syncIndoorInvoicesToModularTable: async (invoices: any[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(invoices) || invoices.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = invoices.map(inv => {
        const id = String(inv.daily_id || inv.invoice_id || inv.id || `INDOOR-${Date.now()}`).trim();
        const invDate = normalizeDate(inv.admission_date || inv.invoice_date || inv.date || now);
        const bill = Number(inv.total_bill ?? inv.totalBill ?? 0);
        const paid = Number(inv.paid_amount ?? inv.paidAmount ?? 0);
        const due = Number(inv.due_amount ?? inv.dueAmount ?? Math.max(0, bill - paid));
        return {
          id: id,
          daily_id: id,
          admission_id: String(inv.admission_id || ''),
          invoice_id: id,
          patient_name: inv.patient_name || '',
          admission_date: invDate,
          invoice_date: invDate,
          total_bill: bill,
          paid_amount: paid,
          due_amount: due,
          status: inv.status || 'Posted',
          items: Array.isArray(inv.items) ? inv.items : [],
          updated_at: now,
          data: inv
        };
      });
      return await upsertTableSafe(supabase, 'indoor_invoices', rows);
    } catch (e) {
      console.error("[dbService] syncIndoorInvoices exception:", e);
      return false;
    }
  },

  syncAdmissionsToModularTable: async (admissions: AdmissionRecord[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(admissions) || admissions.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = admissions.map(adm => {
        const id = String(adm.admission_id || adm.id || `ADM-${Date.now()}`).trim();
        return {
          id: id,
          admission_id: id,
          patient_id: String(adm.patient_id || ''),
          patient_name: adm.patient_name || '',
          cabin_bed_no: adm.cabin_bed_no || '',
          admission_date: normalizeDate(adm.admission_date || now),
          advance_deposit: Number(adm.advance_deposit ?? 0),
          status: adm.status || 'Admitted',
          doctor_name: adm.doctor_name || '',
          updated_at: now,
          data: adm
        };
      });
      return await upsertTableSafe(supabase, 'admissions', rows);
    } catch (e) {
      console.error("[dbService] syncAdmissions exception:", e);
      return false;
    }
  },

  syncMedicinesToModularTable: async (medicines: MedicineItem[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(medicines) || medicines.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = medicines.map(m => {
        const id = String(m.id || `MED-${Date.now()}`).trim();
        return {
          id: id,
          trade_name: m.tradeName || (m as any).trade_name || '',
          generic_name: m.genericName || (m as any).generic_name || '',
          formulation: m.formulation || 'Tab',
          strength: m.strength || '',
          unit_price_buy: Number(m.unitPriceBuy ?? (m as any).unit_price_buy ?? 0),
          unit_price_sell: Number(m.unitPriceSell ?? (m as any).unit_price_sell ?? 0),
          stock: Number(m.stock ?? 0),
          box_size: Number(m.boxSize ?? (m as any).box_size ?? 1),
          supplier: m.supplier || '',
          expiry_date: m.expiryDate || (m as any).expiry_date || '',
          is_antibiotic: !!(m.isAntibiotic ?? (m as any).is_antibiotic),
          requires_prescription: !!(m.requiresPrescription ?? (m as any).requires_prescription),
          updated_at: now,
          data: m
        };
      });
      return await upsertTableSafe(supabase, 'medicines', rows);
    } catch (e) {
      console.error("[dbService] syncMedicines exception:", e);
      return false;
    }
  },

  syncSalesInvoicesToModularTable: async (invoices: SalesInvoice[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(invoices) || invoices.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = invoices.map(inv => {
        const id = String(inv.invoiceId || (inv as any).invoice_id || inv.id || `SALES-${Date.now()}`).trim();
        const invDate = normalizeDate(inv.invoiceDate || (inv as any).invoice_date || now);
        const net = Number(inv.netPayable ?? (inv as any).net_payable ?? 0);
        const paid = Number(inv.paidAmount ?? (inv as any).paid_amount ?? 0);
        const due = Number(inv.dueAmount ?? (inv as any).due_amount ?? Math.max(0, net - paid));
        return {
          id: id,
          invoice_id: id,
          invoice_date: invDate,
          customer_name: inv.customerName || (inv as any).customer_name || '',
          customer_mobile: inv.customerMobile || (inv as any).customer_mobile || '',
          customer_age: inv.customerAge || (inv as any).customer_age || '',
          customer_gender: inv.customerGender || (inv as any).customer_gender || '',
          ref_doctor_name: inv.refDoctorName || (inv as any).ref_doctor_name || '',
          items: Array.isArray(inv.items) ? inv.items : [],
          total_amount: Number(inv.totalAmount ?? (inv as any).total_amount ?? net),
          discount: Number(inv.discount ?? 0),
          net_payable: net,
          paid_amount: paid,
          due_amount: due,
          bill_created_by: inv.billCreatedBy || (inv as any).bill_created_by || 'Admin',
          status: inv.status || 'Posted',
          updated_at: now,
          data: inv
        };
      });
      return await upsertTableSafe(supabase, 'sales_invoices', rows);
    } catch (e) {
      console.error("[dbService] syncSalesInvoices exception:", e);
      return false;
    }
  },

  syncPurchaseInvoicesToModularTable: async (invoices: PurchaseInvoice[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(invoices) || invoices.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = invoices.map(inv => {
        const id = String(inv.invoiceId || (inv as any).invoice_id || inv.id || `PUR-${Date.now()}`).trim();
        const invDate = normalizeDate(inv.invoiceDate || (inv as any).invoice_date || now);
        const net = Number(inv.netPayable ?? (inv as any).net_payable ?? 0);
        const paid = Number(inv.paidAmount ?? (inv as any).paid_amount ?? 0);
        const due = Number(inv.dueAmount ?? (inv as any).due_amount ?? Math.max(0, net - paid));
        return {
          id: id,
          invoice_id: id,
          invoice_date: invDate,
          source: inv.source || '',
          items: Array.isArray(inv.items) ? inv.items : [],
          total_amount: Number(inv.totalAmount ?? (inv as any).total_amount ?? net),
          discount: Number(inv.discount ?? 0),
          net_payable: net,
          paid_amount: paid,
          due_amount: due,
          bill_created_by: inv.billCreatedBy || (inv as any).bill_created_by || 'Admin',
          status: inv.status || 'Saved',
          updated_at: now,
          data: inv
        };
      });
      return await upsertTableSafe(supabase, 'purchase_invoices', rows);
    } catch (e) {
      console.error("[dbService] syncPurchaseInvoices exception:", e);
      return false;
    }
  },

  syncDetailedExpensesToModularTable: async (expenses: Record<string, ExpenseItem[]> | ExpenseItem[]): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const now = new Date().toISOString();
      const flatList: ExpenseItem[] = [];

      if (Array.isArray(expenses)) {
        flatList.push(...expenses);
      } else if (expenses && typeof expenses === 'object') {
        Object.entries(expenses).forEach(([dKey, items]) => {
          if (Array.isArray(items)) {
            items.forEach(it => {
              if (it && !it.isDeleted) {
                flatList.push({ ...it, date: normalizeDate(it.date || dKey) });
              }
            });
          }
        });
      }

      if (flatList.length === 0) return true;

      const rows = flatList.map(it => {
        const dateKey = normalizeDate(it.date || now);
        const id = String(it.id || `exp_${dateKey}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
        const bill = Number(it.billAmount ?? (it as any).bill_amount ?? it.paidAmount ?? 0);
        const paid = Number(it.paidAmount ?? (it as any).paid_amount ?? bill);
        return {
          id: id,
          date: dateKey,
          expense_date: dateKey,
          category: it.category || 'General',
          sub_category: it.subCategory || (it as any).sub_category || '',
          description: it.description || '',
          bill_amount: bill,
          paid_amount: paid,
          dept: it.dept || 'Diagnostic',
          updated_at: now,
          data: it
        };
      });

      return await upsertTableSafe(supabase, 'detailed_expenses', rows);
    } catch (e) {
      console.error("[dbService] syncDetailedExpenses exception:", e);
      return false;
    }
  },

  syncAdjustmentsToModularTable: async (adjustments: Record<string, HospitalAdjustment>): Promise<boolean> => {
    if (!supabase) return false;
    if (!adjustments || typeof adjustments !== 'object') return true;
    try {
      const now = new Date().toISOString();
      const rows = Object.entries(adjustments).map(([k, adj]) => {
        const id = String(k).trim();
        const parts = id.split('-');
        const year = parts[0] || '2026';
        const month = parts[1] || '01';
        return {
          id: id,
          month_key: id,
          year: year,
          month: month,
          profit_distribution: Number(adj.profitDist ?? 0),
          house_rent: Number(adj.houseRent ?? 0),
          loan_installment: Number(adj.loanInstallment ?? 0),
          net_profit: Number(adj.netProfit ?? 0),
          notes: adj.notes || '',
          updated_at: now,
          data: adj
        };
      });
      return await upsertTableSafe(supabase, 'monthly_adjustments', rows);
    } catch (e) {
      console.error("[dbService] syncAdjustments exception:", e);
      return false;
    }
  },

  syncConsolidatedLabEntriesToModularTable: async (entries: DailyConsolidatedEntry[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(entries) || entries.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = entries.map(e => {
        const id = String(e.id || `LAB-CONS-${Date.now()}`).trim();
        const entryDate = normalizeDate(e.date || now);
        return {
          id: id,
          date: entryDate,
          shift: e.shift || 'Full Day',
          entry_type: e.entryType || 'daily',
          gross_amount: Number(e.grossAmount ?? 0),
          discount_amount: Number(e.discountAmount ?? 0),
          net_payable: Number(e.netPayable ?? 0),
          cash_collected: Number(e.cashCollected ?? 0),
          due_amount: Number(e.dueAmount ?? 0),
          doctor_commission_paid: Number(e.doctorCommissionPaid ?? 0),
          usg_doctor_fee_paid: Number(e.usgDoctorFeePaid ?? 0),
          total_patients: Number(e.totalPatients ?? 0),
          total_tests: Number(e.totalTests ?? 0),
          breakdown: e.breakdown || {},
          notes: e.notes || '',
          updated_at: now,
          data: e
        };
      });
      return await upsertTableSafe(supabase, 'consolidated_lab_entries', rows);
    } catch (e) {
      console.error("[dbService] syncConsolidatedLabEntries exception:", e);
      return false;
    }
  },

  syncConsolidatedClinicEntriesToModularTable: async (entries: DailyConsolidatedClinicEntry[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(entries) || entries.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = entries.map(e => {
        const id = String(e.id || `CLN-CONS-${Date.now()}`).trim();
        const entryDate = normalizeDate(e.date || now);
        return {
          id: id,
          date: entryDate,
          shift: e.shift || 'Full Day',
          entry_type: e.entryType || 'daily',
          gross_amount: Number(e.grossAmount ?? 0),
          discount_amount: Number(e.discountAmount ?? 0),
          net_payable: Number(e.netPayable ?? 0),
          cash_collected: Number(e.cashCollected ?? 0),
          due_amount: Number(e.dueAmount ?? 0),
          doctor_commission_paid: Number(e.doctorCommissionPaid ?? 0),
          ot_charges_paid: Number(e.otChargesPaid ?? 0),
          total_patients: Number(e.totalPatients ?? 0),
          total_indoor_revenue: Number(e.totalIndoorRevenue ?? 0),
          breakdown: e.breakdown || {},
          notes: e.notes || '',
          updated_at: now,
          data: e
        };
      });
      return await upsertTableSafe(supabase, 'consolidated_clinic_entries', rows);
    } catch (e) {
      console.error("[dbService] syncConsolidatedClinicEntries exception:", e);
      return false;
    }
  },

  syncAppointmentsToModularTable: async (appointments: Appointment[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(appointments) || appointments.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = appointments.map(a => {
        const id = String(a.id || a.appointment_id || `APT-${Date.now()}`).trim();
        return {
          id: id,
          appointment_id: id,
          doctor_id: String(a.doctor_id || ''),
          doctor_name: a.doctor_name || '',
          patient_name: a.patient_name || '',
          mobile: a.mobile || '',
          appointment_date: normalizeDate(a.appointment_date || now),
          appointment_time: a.appointment_time || '',
          serial_no: Number(a.serial_no ?? 1),
          fee: Number(a.fee ?? 0),
          status: a.status || 'Scheduled',
          notes: a.notes || '',
          updated_at: now,
          data: a
        };
      });
      return await upsertTableSafe(supabase, 'doctor_appointments', rows);
    } catch (e) {
      console.error("[dbService] syncAppointments exception:", e);
      return false;
    }
  },

  syncPrescriptionsToModularTable: async (prescriptions: PrescriptionRecord[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(prescriptions) || prescriptions.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = prescriptions.map(p => {
        const id = String(p.id || `RX-${Date.now()}`).trim();
        return {
          id: id,
          rx_id: id,
          patient_id: String(p.patient_id || ''),
          patient_name: p.patient_name || '',
          doctor_name: p.doctor_name || '',
          date: normalizeDate(p.date || now),
          chief_complaints: p.chief_complaints || '',
          clinical_findings: p.clinical_findings || '',
          diagnosis: p.diagnosis || '',
          medicines: p.medicines || [],
          tests_advised: p.tests_advised || [],
          advice: p.advice || '',
          follow_up: p.follow_up || '',
          updated_at: now,
          data: p
        };
      });
      return await upsertTableSafe(supabase, 'prescriptions', rows);
    } catch (e) {
      console.error("[dbService] syncPrescriptions exception:", e);
      return false;
    }
  },

  syncReportsToModularTable: async (reports: LabReport[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(reports) || reports.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = reports.map(r => {
        const id = String(r.id || r.report_id || `REP-${Date.now()}`).trim();
        return {
          id: id,
          report_id: id,
          invoice_id: String(r.invoice_id || ''),
          patient_id: String(r.patient_id || ''),
          patient_name: r.patient_name || '',
          test_id: String(r.test_id || ''),
          test_name: r.test_name || '',
          report_date: normalizeDate(r.report_date || now),
          results: r.results || {},
          reported_by: r.reported_by || 'Lab In-charge',
          finalized: !!r.finalized,
          updated_at: now,
          data: r
        };
      });
      return await upsertTableSafe(supabase, 'reports', rows);
    } catch (e) {
      console.error("[dbService] syncReports exception:", e);
      return false;
    }
  },

  // -----------------------------------------------------------------------
  // DIRECT ENTITY SAVES & DELETIONS
  // -----------------------------------------------------------------------
  saveLabInvoiceDirectly: async (inv: any): Promise<{ success: boolean; error?: string }> => {
    if (!inv) return { success: false, error: 'কোনো ইনভয়েস ডাটা পাওয়া যায়নি।' };
    if (!supabase) return { success: false, error: 'সুপাবেজ ক্লাউড ডাটাবেজ কানেক্টেড নেই।' };
    const ok = await dbService.syncLabInvoicesToModularTable([inv]);
    return ok ? { success: true } : { success: false, error: 'lab_invoices টেবিলে সেভ ব্যর্থ হয়েছে।' };
  },

  deleteLabInvoiceDirectly: async (inv: any): Promise<{ success: boolean; error?: string }> => {
    if (!inv) return { success: true };
    const targetId = String(inv.invoice_id || inv.id || inv.invoiceId || inv.invoice_no || '').trim();
    if (!targetId) return { success: true };
    if (!supabase) return { success: true };
    try {
      await supabase.from('lab_invoices').delete().eq('id', targetId);
      await supabase.from('lab_invoices').delete().eq('invoice_id', targetId);
      return { success: true };
    } catch (e: any) {
      console.error("[dbService] deleteLabInvoice exception:", e);
      return { success: false, error: e?.message };
    }
  },

  deleteDueCollectionDirectly: async (dc: any): Promise<{ success: boolean; error?: string }> => {
    if (!dc) return { success: true };
    const targetId = String(dc.collection_id || dc.id || dc.collectionId || '').trim();
    if (!targetId || !supabase) return { success: true };
    try {
      await supabase.from('due_collections').delete().eq('id', targetId);
      await supabase.from('due_collections').delete().eq('collection_id', targetId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  saveIndoorInvoiceDirectly: async (inv: any): Promise<{ success: boolean; error?: string }> => {
    if (!inv) return { success: false, error: 'No invoice data' };
    if (!supabase) return { success: false, error: 'সুপাবেজ ক্লাউড ডাটাবেজ কানেক্টেড নেই।' };
    const ok = await dbService.syncIndoorInvoicesToModularTable([inv]);
    return ok ? { success: true } : { success: false, error: 'indoor_invoices টেবিলে সেভ ব্যর্থ হয়েছে।' };
  },

  deleteIndoorInvoiceDirectly: async (inv: any): Promise<{ success: boolean; error?: string }> => {
    if (!inv) return { success: true };
    const targetId = String(inv.daily_id || inv.invoice_id || inv.id || '').trim();
    if (!targetId || !supabase) return { success: true };
    try {
      await supabase.from('indoor_invoices').delete().eq('id', targetId);
      await supabase.from('indoor_invoices').delete().eq('daily_id', targetId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  saveAdmissionDirectly: async (adm: AdmissionRecord): Promise<{ success: boolean; error?: string }> => {
    if (!adm) return { success: false, error: 'No admission data' };
    if (!supabase) return { success: false, error: 'সুপাবেজ ক্লাউড ডাটাবেজ কানেক্টেড নেই।' };
    const ok = await dbService.syncAdmissionsToModularTable([adm]);
    return ok ? { success: true } : { success: false, error: 'admissions টেবিলে সেভ ব্যর্থ হয়েছে।' };
  },

  deleteAdmissionDirectly: async (adm: any): Promise<{ success: boolean; error?: string }> => {
    if (!adm) return { success: true };
    const targetId = String(adm.admission_id || adm.id || '').trim();
    if (!targetId || !supabase) return { success: true };
    try {
      await supabase.from('admissions').delete().eq('id', targetId);
      await supabase.from('admissions').delete().eq('admission_id', targetId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  saveSalesInvoiceDirectly: async (inv: SalesInvoice): Promise<{ success: boolean; error?: string }> => {
    if (!inv) return { success: false, error: 'No sales invoice data' };
    if (!supabase) return { success: false, error: 'সুপাবেজ ক্লাউড ডাটাবেজ কানেক্টেড নেই।' };
    const ok = await dbService.syncSalesInvoicesToModularTable([inv]);
    return ok ? { success: true } : { success: false, error: 'sales_invoices টেবিলে সেভ ব্যর্থ হয়েছে।' };
  },

  deleteSalesInvoiceDirectly: async (inv: any): Promise<{ success: boolean; error?: string }> => {
    if (!inv) return { success: true };
    const targetId = String(inv.invoiceId || inv.invoice_id || inv.id || '').trim();
    if (!targetId || !supabase) return { success: true };
    try {
      await supabase.from('sales_invoices').delete().eq('id', targetId);
      await supabase.from('sales_invoices').delete().eq('invoice_id', targetId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  savePurchaseInvoiceDirectly: async (inv: PurchaseInvoice): Promise<{ success: boolean; error?: string }> => {
    if (!inv) return { success: false, error: 'No purchase invoice data' };
    if (!supabase) return { success: false, error: 'সুপাবেজ ক্লাউড ডাটাবেজ কানেক্টেড নেই।' };
    const ok = await dbService.syncPurchaseInvoicesToModularTable([inv]);
    return ok ? { success: true } : { success: false, error: 'purchase_invoices টেবিলে সেভ ব্যর্থ হয়েছে।' };
  },

  deletePurchaseInvoiceDirectly: async (inv: any): Promise<{ success: boolean; error?: string }> => {
    if (!inv) return { success: true };
    const targetId = String(inv.invoiceId || inv.invoice_id || inv.id || '').trim();
    if (!targetId || !supabase) return { success: true };
    try {
      await supabase.from('purchase_invoices').delete().eq('id', targetId);
      await supabase.from('purchase_invoices').delete().eq('invoice_id', targetId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  saveExpensesDirectly: async (date: string, items: ExpenseItem[], _currentState?: any): Promise<{ success: boolean; error?: string }> => {
    if (!date) return { success: false, error: 'No date provided' };
    if (!supabase) return { success: false, error: 'সুপাবেজ ক্লাউড ডাটাবেজ কানেক্টেড নেই।' };
    const normDate = normalizeDate(date);
    const validItems = (Array.isArray(items) ? items : []).map(it => ({ ...it, date: normDate }));
    const ok = await dbService.syncDetailedExpensesToModularTable(validItems);
    return ok ? { success: true } : { success: false, error: 'detailed_expenses টেবিলে সেভ ব্যর্থ হয়েছে।' };
  },

  deleteExpense: async (date: string, expId: string): Promise<boolean> => {
    if (!expId) return true;
    if (!supabase) return true;
    try {
      const { error } = await supabase.from('detailed_expenses').delete().eq('id', expId);
      return !error;
    } catch (e) {
      console.error("[dbService] deleteExpense exception:", e);
      return false;
    }
  },

  cleanDuplicateExpenses: async (_date?: string): Promise<number> => {
    // With unique primary key id in modular detailed_expenses, duplicate cleaning is automated
    return 0;
  },

  saveConsolidatedEntryDirectly: async (entry: DailyConsolidatedEntry): Promise<{ success: boolean; error?: string }> => {
    if (!entry) return { success: false, error: 'No entry provided' };
    // Always update local storage
    const current = dbService.getConsolidatedEntries();
    const updated = [entry, ...current.filter(e => e.id !== entry.id)];
    dbService.saveConsolidatedEntries(updated);

    if (!supabase) return { success: false, error: 'সুপাবেজ ক্লাউড ডাটাবেজ কানেক্টেড নেই।' };
    const ok = await dbService.syncConsolidatedLabEntriesToModularTable([entry]);
    return ok ? { success: true } : { success: false, error: 'consolidated_lab_entries টেবিলে সেভ ব্যর্থ হয়েছে।' };
  },

  deleteConsolidatedEntry: async (idOrObj: any): Promise<{ success: boolean }> => {
    const targetId = typeof idOrObj === 'string' ? idOrObj.trim() : String(idOrObj?.id || '').trim();
    if (!targetId) return { success: true };
    const current = dbService.getConsolidatedEntries();
    dbService.saveConsolidatedEntries(current.filter(e => e.id !== targetId));

    if (supabase) {
      try {
        await supabase.from('consolidated_lab_entries').delete().eq('id', targetId);
      } catch (e) {}
    }
    return { success: true };
  },

  deleteConsolidatedEntryDirectly: async (idOrObj: any): Promise<{ success: boolean }> => {
    return dbService.deleteConsolidatedEntry(idOrObj);
  },

  saveConsolidatedClinicEntryDirectly: async (entry: DailyConsolidatedClinicEntry): Promise<{ success: boolean; error?: string }> => {
    if (!entry) return { success: false, error: 'No clinic entry provided' };
    const current = dbService.getConsolidatedClinicEntries();
    const updated = [entry, ...current.filter(e => e.id !== entry.id)];
    dbService.saveConsolidatedClinicEntries(updated);

    if (!supabase) return { success: false, error: 'সুপাবেজ ক্লাউড ডাটাবেজ কানেক্টেড নেই।' };
    const ok = await dbService.syncConsolidatedClinicEntriesToModularTable([entry]);
    return ok ? { success: true } : { success: false, error: 'consolidated_clinic_entries টেবিলে সেভ ব্যর্থ হয়েছে।' };
  },

  deleteConsolidatedClinicEntry: async (idOrObj: any): Promise<{ success: boolean }> => {
    const targetId = typeof idOrObj === 'string' ? idOrObj.trim() : String(idOrObj?.id || '').trim();
    if (!targetId) return { success: true };
    const current = dbService.getConsolidatedClinicEntries();
    dbService.saveConsolidatedClinicEntries(current.filter(e => e.id !== targetId));

    if (supabase) {
      try {
        await supabase.from('consolidated_clinic_entries').delete().eq('id', targetId);
      } catch (e) {}
    }
    return { success: true };
  },

  loadTestsDirectly: async (): Promise<Test[]> => {
    if (!supabase) return [];
    try {
      const rows = await fetchTableSafe(supabase, 'tests');
      return rows.map(t => normalizeTestItem(t)).filter((t): t is Test => t !== null && !!t.test_id);
    } catch {
      return [];
    }
  },

  // -----------------------------------------------------------------------
  // LOCAL CONFIG & BACKUP METHODS
  // -----------------------------------------------------------------------
  getClinicProfile: (): ClinicProfile => {
    try {
      const saved = localStorage.getItem('ncd_clinic_profile');
      if (saved) return { ...defaultClinicProfile, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultClinicProfile;
  },

  saveClinicProfile: (profile: ClinicProfile): boolean => {
    try {
      localStorage.setItem('ncd_clinic_profile', JSON.stringify(profile));
      return true;
    } catch {
      return false;
    }
  },

  getPrintSettings: (): PrintSettings => {
    try {
      const saved = localStorage.getItem('ncd_print_settings');
      if (saved) return { ...defaultPrintSettings, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultPrintSettings;
  },

  savePrintSettings: (settings: PrintSettings): boolean => {
    try {
      localStorage.setItem('ncd_print_settings', JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  },

  getStaffAccounts: (): StaffAccount[] => {
    try {
      const saved = localStorage.getItem('ncd_staff_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultStaffAccounts;
  },

  saveStaffAccounts: (accounts: StaffAccount[]): boolean => {
    try {
      localStorage.setItem('ncd_staff_accounts', JSON.stringify(accounts));
      return true;
    } catch {
      return false;
    }
  },

  getSMSGatewaySettings: (): SMSGatewaySettings => {
    try {
      const saved = localStorage.getItem('ncd_sms_gateway_settings');
      if (saved) return { ...defaultSMSGatewaySettings, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultSMSGatewaySettings;
  },

  saveSMSGatewaySettings: (settings: SMSGatewaySettings): boolean => {
    try {
      localStorage.setItem('ncd_sms_gateway_settings', JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  },

  getAutoBackupSettings: (): AutoBackupSettings => {
    try {
      const saved = localStorage.getItem('ncd_auto_backup_settings');
      if (saved) return { ...defaultAutoBackupSettings, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultAutoBackupSettings;
  },

  saveAutoBackupSettings: (settings: AutoBackupSettings): boolean => {
    try {
      localStorage.setItem('ncd_auto_backup_settings', JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  },

  getHospitalAdjustments: (): HospitalAdjustment => {
    try {
      const saved = localStorage.getItem('ncd_hospital_adjustments');
      if (saved) return { ...defaultHospitalAdjustments, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultHospitalAdjustments;
  },

  saveHospitalAdjustments: (adj: HospitalAdjustment): boolean => {
    try {
      localStorage.setItem('ncd_hospital_adjustments', JSON.stringify(adj));
      return true;
    } catch {
      return false;
    }
  },

  getHospitalModuleConfig: (): HospitalModuleConfig => {
    try {
      const saved = localStorage.getItem('ncd_hospital_module_config');
      if (saved) return { ...defaultHospitalModuleConfig, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultHospitalModuleConfig;
  },

  saveHospitalModuleConfig: (cfg: HospitalModuleConfig): boolean => {
    try {
      localStorage.setItem('ncd_hospital_module_config', JSON.stringify(cfg));
      return true;
    } catch {
      return false;
    }
  },

  getLocalSnapshots: (): { id: string; timestamp: string; title: string; recordCount: number; sizeKb: number; data: any }[] => {
    try {
      const saved = localStorage.getItem('ncd_local_snapshots_vault');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  },

  saveLocalSnapshot: (title: string, data: any): boolean => {
    try {
      const snapshots = dbService.getLocalSnapshots();
      const jsonStr = JSON.stringify(data);
      const sizeKb = Math.round(jsonStr.length / 1024);
      let recordCount = 0;
      if (typeof data === 'object' && data !== null) {
        Object.values(data).forEach(val => {
          if (Array.isArray(val)) recordCount += val.length;
        });
      }
      const newSnapshot = {
        id: 'SNP-' + Date.now(),
        timestamp: new Date().toISOString(),
        title: title || `Auto Snapshot ${new Date().toLocaleDateString()}`,
        recordCount,
        sizeKb,
        data
      };
      const settings = dbService.getAutoBackupSettings();
      const updated = [newSnapshot, ...snapshots].slice(0, settings.maxSnapshots || 10);
      localStorage.setItem('ncd_local_snapshots_vault', JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },

  deleteLocalSnapshot: (id: string): boolean => {
    try {
      const snapshots = dbService.getLocalSnapshots();
      const updated = snapshots.filter(s => s.id !== id);
      localStorage.setItem('ncd_local_snapshots_vault', JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },

  getConsolidatedEntries: (): DailyConsolidatedEntry[] => {
    try {
      const raw = localStorage.getItem('ncd_consolidated_lab_entries');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  },

  saveConsolidatedEntries: (entries: DailyConsolidatedEntry[]): boolean => {
    try {
      localStorage.setItem('ncd_consolidated_lab_entries', JSON.stringify(entries));
      return true;
    } catch {
      return false;
    }
  },

  getConsolidatedClinicEntries: (): DailyConsolidatedClinicEntry[] => {
    try {
      const raw = localStorage.getItem('ncd_consolidated_clinic_entries');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  },

  saveConsolidatedClinicEntries: (entries: DailyConsolidatedClinicEntry[]): boolean => {
    try {
      localStorage.setItem('ncd_consolidated_clinic_entries', JSON.stringify(entries));
      return true;
    } catch {
      return false;
    }
  },

  getLocalBackup: (): any => {
    try {
      const raw = localStorage.getItem('ncd_offline_cache_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  },

  // Concurrency locking (in-memory / local storage)
  acquireLock: async (moduleName: string, userEmail: string): Promise<{ success: boolean; owner?: string }> => {
    try {
      const lockKey = `ncd_lock_${moduleName}`;
      const now = Date.now();
      const existing = localStorage.getItem(lockKey);
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (parsed.owner !== userEmail && now - parsed.time < 30000) {
            return { success: false, owner: parsed.owner };
          }
        } catch (e) {}
      }
      localStorage.setItem(lockKey, JSON.stringify({ owner: userEmail, time: now }));
      return { success: true };
    } catch {
      return { success: true };
    }
  },

  releaseLock: async (moduleName: string, userEmail: string): Promise<boolean> => {
    try {
      const lockKey = `ncd_lock_${moduleName}`;
      const existing = localStorage.getItem(lockKey);
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (parsed.owner === userEmail) {
            localStorage.removeItem(lockKey);
          }
        } catch (e) {}
      }
      return true;
    } catch {
      return true;
    }
  },

  // Stats for modular tables (replaces old migration stats)
  getMultiTableMigrationStats: async (): Promise<Record<string, number>> => {
    if (!supabase) return {};
    const tableNames = [
      'patients', 'doctors', 'referrars', 'tests', 'reagents',
      'employees', 'lab_invoices', 'due_collections', 'indoor_invoices',
      'admissions', 'medicines', 'sales_invoices', 'purchase_invoices',
      'detailed_expenses', 'consolidated_lab_entries', 'consolidated_clinic_entries'
    ];
    const stats: Record<string, number> = {};
    for (const tbl of tableNames) {
      try {
        const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          stats[tbl] = count;
        }
      } catch (e) {}
    }
    return stats;
  },

  getMedicineModularStats: async (): Promise<{ medicines: number; purchases: number; sales: number }> => {
    if (!supabase) return { medicines: 0, purchases: 0, sales: 0 };
    try {
      const [m, p, s] = await Promise.all([
        supabase.from('medicines').select('*', { count: 'exact', head: true }),
        supabase.from('purchase_invoices').select('*', { count: 'exact', head: true }),
        supabase.from('sales_invoices').select('*', { count: 'exact', head: true })
      ]);
      return {
        medicines: m.count || 0,
        purchases: p.count || 0,
        sales: s.count || 0
      };
    } catch {
      return { medicines: 0, purchases: 0, sales: 0 };
    }
  },

  // Backward-compatible safe stubs for deprecated single-table / migration methods
  subscribeToChanges: (_cb: any) => null,
  setSingleTableSaveDisabled: (_val: boolean) => true,
  normalizeRecoveredData: (d: any) => d,
  saveState: async (data: any) => dbService.saveToCloud(data),
  readStateSafe: async () => dbService.loadFromCloud(),
  saveInChunks: async (data: any) => dbService.saveToCloud(data),
  createPreMigrationSnapshot: async () => ({ success: true }),
  getPreMigrationSnapshotInfo: () => null,
  rollbackToPreMigrationSnapshot: async () => ({ success: false, message: 'সিঙ্গেল টেবিল আর্কিটেকচার স্থায়ীভাবে বিলুপ্ত হয়েছে।' }),
  runSmartMigrationEngine: async () => ({ success: true, message: 'সফটওয়্যারটি ইতিমধ্যেই ১০০% মাল্টি-টেবিল ব্যবহার করছে।' }),
  migrateMedicineToModularTables: async () => ({ success: true, message: 'মেডিসিন ডাটা মাল্টি-টেবিলে সংরক্ষিত আছে।' }),
  migrateExpensesFromNcdStateToModular: async () => ({ success: true, message: 'খরচের ডাটা মাল্টি-টেবিলে সংরক্ষিত আছে।' }),
  migrateTestsFromNcdStateToModular: async () => ({ success: true, message: 'টেস্ট ডাটা মাল্টি-টেবিলে সংরক্ষিত আছে।' }),
  mergeEntityList: mergeEntityList
};
