
export type DiagnosticSubPage = 
  | 'doctor_appointment' 
  | 'lab_invoice' 
  | 'due_collection' 
  | 'lab_reporting' 
  | 'consolidated_entry'
  | 'patient_info' 
  | 'doctor_info' 
  | 'referrer_info' 
  | 'test_info' 
  | 'reagent_info' 
  | 'employee_info';

export const testCategories = [
  'Hematology',
  'Biochemistry',
  'Clinical Pathology',
  'Microbiology',
  'Immunology',
  'Serology',
  'Hormone',
  'Ultrasonography (USG)',
  'X-Ray',
  'ECG',
  'Others'
];

export interface SubTest {
  id: string;
  name: string;
  unit: string;
  normal_range: string;
}

export interface Test {
  test_id: string;
  test_name: string;
  category: string;
  price: number;
  test_commission: number;
  is_group_test: boolean;
  normal_range?: string; 
  unit?: string;         
  sub_tests: SubTest[];  
  usg_exam_charge: number;
  extra_lab_fee: number;
  reagents_required: { reagent_id: string; quantity_per_test: number }[];
  availability: boolean;
  preparation_instructions?: string;
}

export const emptyTest: Test = {
  test_id: '',
  test_name: '',
  category: '',
  price: 0,
  test_commission: 0,
  is_group_test: false,
  normal_range: '',
  unit: '',
  sub_tests: [],
  usg_exam_charge: 0,
  extra_lab_fee: 0,
  reagents_required: [],
  availability: true,
  preparation_instructions: ''
};

export interface ReportField {
  label: string;
  value: string;
  type: 'locked' | 'input';
  isBold: boolean;
  fontSize: string;
  color: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  gender: 'Male' | 'Female' | 'Common';
  testMapping: string[]; 
  fields: ReportField[];
  extraNote: string;
  impression: string;
}

export interface LabReport {
  report_id: string;
  invoice_id: string;
  test_name: string;
  patient_id: string;
  report_date: string;
  status: string;
  data: any;
  technologistId?: string;
  technologistName?: string;
  consultantId?: string;
  consultantName?: string;
  consultantDegree?: string;
  isDelivered?: boolean;
  deliveryDate?: string;
}

export interface Patient {
  pt_id: string; pt_name: string; ageY: string; ageM: string; ageD: string; gender: string; mobile: string;
  co_pref: string; co_name: string; dobY: string; dobM: string; dobD: string; address: string;
  thana: string; district: string; date_modified: string;
}

export const emptyPatient: Patient = {
  pt_id: '', pt_name: '', ageY: '', ageM: '', ageD: '', gender: '', mobile: '',
  co_pref: 'S/O', co_name: '', dobY: '', dobM: '', dobD: '', address: '',
  thana: '', district: 'Sirajganj', date_modified: ''
};

export interface Doctor {
  doctor_id: string; doctor_name: string; degree: string; gender: string; mobile: string; email?: string; photo?: string;
}

export const emptyDoctor: Doctor = {
  doctor_id: '', doctor_name: '', degree: '', gender: '', mobile: '', email: '', photo: ''
};

export interface Referrar {
  ref_id: string; 
  ref_name: string; 
  ref_degrees: string; 
  ref_gender: string; 
  ref_mobile: string; 
  address: string;
  area: string; 
}

export const emptyReferrar: Referrar = {
  ref_id: '', ref_name: '', ref_degrees: '', ref_gender: '', ref_mobile: '', address: '', area: ''
};

export interface Reagent {
  reagent_id: string; 
  reagent_name: string; 
  quantity: number; 
  unit: string; 
  availability: boolean;
  expiry_date?: string; 
  company?: string;      
  capacity_per_unit?: string; 
  linked_test?: string;
  linked_category?: string;
}

export const emptyReagent: Reagent = {
  reagent_id: '', reagent_name: '', quantity: 0, unit: '', availability: true
};

export interface LabInvoiceItem {
  test_id: string; test_name: string; price: number; quantity: number; test_commission: number; usg_exam_charge: number; extra_lab_fee: number; subtotal: number;
}

export interface LabInvoice {
  invoice_id: string; 
  invoice_date: string; 
  patient_id: string; 
  patient_name: string; 
  doctor_id?: string; 
  doctor_name?: string; 
  referrar_id?: string; 
  referrar_name?: string; 
  items: LabInvoiceItem[]; 
  total_amount: number; 
  discount_percentage: number; 
  discount_amount: number; 
  net_payable: number; 
  paid_amount: number; 
  due_amount: number; 
  status: 'Paid' | 'Due' | 'Cancelled' | 'Pending' | 'Report Ready' | 'Returned'; 
  payment_method: string; 
  bill_created_by?: string; 
  bill_paid_by?: string; 
  special_commission: number; 
  commission_paid: number; 
  notes: string; 
  date_created: string; 
  last_modified: string;
  sample_collection_time?: string;
  expected_delivery_time?: string;
  return_date?: string; 
}

export const emptyLabInvoice: LabInvoice = {
  invoice_id: '', invoice_date: '', patient_id: '', patient_name: '', items: [], total_amount: 0, discount_percentage: 0, discount_amount: 0, net_payable: 0, paid_amount: 0, due_amount: 0, status: 'Due', payment_method: 'Cash', special_commission: 0, commission_paid: 0, notes: '', date_created: '', last_modified: '',
  sample_collection_time: '', expected_delivery_time: ''
};

export interface DueCollection {
  collection_id: string; invoice_id: string; amount_collected: number; collection_date: string; collected_by: string; payment_method: string; notes?: string;
}

export interface Employee {
  emp_id: string; 
  emp_name: string; 
  machine_id?: string; 
  gender: string; 
  job_position: string; 
  department: string; 
  designation?: string; 
  degree?: string; 
  role?: string; 
  joining_date: string; 
  release_date?: string; 
  status: 'Active' | 'Released'; 
  mobile: string; 
  address: string; 
  salary: number; 
  is_current_month: boolean;
}

export const emptyEmployee: Employee = {
  emp_id: '', emp_name: '', machine_id: '', gender: '', job_position: '', department: '', joining_date: '', status: 'Active', mobile: '', address: '', salary: 0, is_current_month: false
};

export interface EditLog {
  timestamp: string;
  field: string;
  oldValue: any;
  newValue: any;
  editedBy?: string;
}

export interface ExpenseItem {
  id: number; 
  category: string; 
  subCategory: string; 
  description: string; 
  billAmount: number; 
  paidAmount: number;
  dept?: 'Clinic' | 'Diagnostic';
  metadata?: any; 
  isEdited?: boolean;
  lastEditedAt?: string;
  editHistory?: EditLog[];
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Medicine {
  id: string; tradeName: string; genericName: string; formulation: string; strength: string; stock: number; unitPriceBuy: number; unitPriceSell: number; defaultFrequency?: string; expiryDate?: string;
}

export interface InvoiceItem {
  id: string;
  tradeName: string;
  genericName: string;
  formulation: string;
  strength: string;
  unitPriceBuy: number;
  unitPriceSell: number;
  qtyBuying: number;
  lineTotalBuy: number;
  expiryDate: string;
  stock: number;
  defaultFrequency?: string;
}

export interface SalesItem {
  id: string;
  tradeName: string;
  genericName: string;
  formulation: string;
  strength: string;
  unitPriceBuy: number;
  unitPriceSell: number;
  qtySelling: number;
  lineTotalSell: number;
  stock: number;
  defaultFrequency?: string;
}

export interface PurchaseInvoice {
  invoiceId: string; 
  invoiceDate: string; 
  source: string; 
  items: InvoiceItem[]; 
  totalAmount: number; 
  discount: number; 
  netPayable: number; 
  paidAmount: number; 
  dueAmount: number; 
  billCreatedBy: string; 
  billPaidBy?: string; 
  receivedBy?: string; 
  status: 'Saved' | 'Posted' | 'Cancelled' | 'Initial'; 
  createdDate: string;
}

export interface SalesInvoice {
  invoiceId: string; invoiceDate: string; customerName: string; customerMobile: string; customerAge: string; customerGender: string; refDoctorName: string; items: SalesItem[]; totalAmount: number; discount: number; netPayable: number; paidAmount: number; dueAmount: number; billCreatedBy: string; status: 'Saved' | 'Posted'; createdDate: string;
}

export interface Appointment {
  appointment_id: string; patient_id: string; patient_name: string; doctor_id: string; doctor_name: string; referrar_id?: string; referrar_name?: string; appointment_date: string; appointment_time: string; reason: string; doctor_fee: number; status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Returned' | ''; notes: string;
  return_date?: string; 
}

export interface MedicineItem {
    id: number;
    drugId?: string;
    name: string;
    genericName: string;
    type: string;
    dose: string;
    duration: string;
    instruction: string;
}

export interface ComplaintItem {
    name: string;
    duration: string;
}

export interface PrescriptionRecord {
    id: string; appointmentId: string; date: string; patientId: string; doctorId: string; complaints: ComplaintItem[]; diagnoses: string[]; onExam: string; vitals: { bp: string; pulse: string; weight: string; temp: string }; tests: string[]; medicines: MedicineItem[]; advice: string; nextVisit: string;
}

export interface DrugMonograph {
  id: string; brandName: string; genericName: string; strength: string; formulation: string; company: string; pregnancyCategory: 'A' | 'B' | 'C' | 'D' | 'X' | 'N/A'; indications: string[]; sideEffects: string[]; adultDose: string;
}

export const banglaAdviceSamples = [
    "পূর্ণ বিশ্রাম নিবেন", "প্রচুর পানি/তরল খাবার খাবেন", "স্বাভাবিক খাবার খাবেন", "নরম ও সহজপাচ্য খাবার", "তৈলাক্ত খাবার নিষেধ", "ধূমপান নিষেধ"
];

export interface InternalLabOrder {
  test_id: string;
  test_name: string;
  date: string;
  status: 'Pending' | 'Invoiced' | 'Reported';
}

export interface AdmissionRecord {
    admission_id: string;
    admission_date: string;
    patient_id: string;
    patient_name: string;
    patient_mobile?: string;
    mobile_relation?: string;
    doctor_id: string;
    doctor_name: string;
    referrer_id: string;
    referrer_name: string;
    indication: string;
    service_name: string;
    service_category: string;
    contract_type: 'Contact' | 'Non-Contact';
    contract_amount: number;
    clinical_orders: any[]; 
    doctor_rounds: any[];
    nurse_chart: any[];
    lab_investigations: InternalLabOrder[]; 
    discharge_date?: string;
    discharge_note?: string;
    bed_no?: string;
}

export type Indication = string;

export interface ServiceItem {
  id: number;
  service_type: string;
  service_provider: string;
  service_charge: number;
  quantity: number;
  line_total: number;
  discount: number;
  payable_amount: number;
  note: string;
  isClinicFund?: boolean; 
}

export type ServiceItemDef = ServiceItem;

export interface IndoorInvoice {
  daily_id: string;
  monthly_id: string;
  yearly_id: string;
  invoice_date: string;
  admission_id: string; 
  patient_id: string;
  patient_name: string;
  doctor_id?: string;
  doctor_name?: string;
  referrar_id?: string;
  referrar_name?: string;
  indication: string;
  serviceCategory: string;
  subCategory?: string; 
  services: any[]; 
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
  special_discount_percent: number;
  special_discount_amount: number;
  net_payable: number;
  admission_date: string;
  discharge_date: string;
  status: 'Posted' | 'Returned' | 'Paid' | 'Due' | 'Cancelled' | 'Pending' | 'Report Ready';
  return_date?: string;
}

export interface MarketingTarget {
  id: string;
  staff_id: string;
  month: number;
  year: number;
  pt_count_target: number;
  revenue_target: number;
}

export interface CommissionPayment {
  payment_id: string;
  ref_id: string;
  amount: number;
  date: string;
  method: string;
}

export interface FieldVisitLog {
  visit_id: string;
  staff_id: string;
  date: string;
  location: string;
  objective: string;
  outcomes: string;
}

// --- ALL MOCK DATA REMOVED FOR CLEAN START ---

export const mockPatients: Patient[] = [];
export const mockDoctors: Doctor[] = [];
export const mockReferrars: Referrar[] = [];
export const mockTests: Test[] = [];
export const mockInvoices: LabInvoice[] = [];
export const mockReagents: Reagent[] = [];
export const mockDueCollections: DueCollection[] = [];
export const mockEmployees: Employee[] = [];
export const mockMedicines: Medicine[] = [];
export const mockPurchaseInvoices: PurchaseInvoice[] = [];
export const mockSalesInvoices: SalesInvoice[] = [];
export const mockAdmissions: any[] = [];
export const mockIndoorInvoices: any[] = [];
export const initialAppointments: Appointment[] = [];
export const initialClinicalDrugs: DrugMonograph[] = [];

export const defaultPregnancyTemplates: ReportTemplate[] = [
  {
    id: 'TMP-PREG-SINGLE',
    name: 'PREGNANCY PROFILE (SINGLE BABY)',
    category: 'Ultrasonography (USG)',
    gender: 'Female',
    testMapping: ['USG of Pregnancy Profile', 'USG OF PREGNANCY'],
    fields: [
      { label: 'LMP', value: '___', type: 'input', isBold: false, fontSize: '14px', color: '#000000' },
      { label: 'EDD', value: '___', type: 'input', isBold: false, fontSize: '14px', color: '#000000' },
      { label: 'G.A (BY USG)', value: '___ Weeks ___ Days', type: 'input', isBold: true, fontSize: '14px', color: '#000000' },
      { label: 'FETAL MOVEMENT', value: 'Present / Active', type: 'input', isBold: false, fontSize: '14px', color: '#000000' },
      { label: 'FETAL HEART RATE', value: '___ bpm (Regular)', type: 'input', isBold: false, fontSize: '14px', color: '#000000' },
      { label: 'PRESENTATION', value: 'Cephalic / Breech', type: 'input', isBold: false, fontSize: '14px', color: '#000000' },
      { label: 'PLACENTA', value: '___ Position, Grade-___ maturity', type: 'input', isBold: false, fontSize: '14px', color: '#000000' },
      { label: 'LIQUOR AMNII', value: 'Adequate / Normal', type: 'input', isBold: false, fontSize: '14px', color: '#000000' },
      { label: 'BPD', value: '___ mm', type: 'input', isBold: false, fontSize: '14px', color: '#000000' },
      { label: 'FL', value: '___ mm', type: 'input', isBold: false, fontSize: '14px', color: '#000000' },
      { label: 'AC', value: '___ mm', type: 'input', isBold: false, fontSize: '14px', color: '#000000' },
      { label: 'EFW', value: '___ gm +/- ___', type: 'input', isBold: true, fontSize: '14px', color: '#000000' },
    ],
    extraNote: '',
    impression: 'Single live intrauterine pregnancy of ___ weeks ___ days.'
  }
];

export interface UrineRMEResults {
  quantity: string;
  colour: string;
  appearance: string;
  sediment: string;
  specificGravity: string;
  reaction: string;
  albumin: string;
  sugar: string;
  bileSalt: string;
  bilePigment: string;
  ketones: string;
  epithelialCells: string;
  pusCells: string;
  rbc: string;
  bacteria: string;
  sperm: string;
  casts: string;
  crystals: string;
  amorphousPhosphate: string;
  calciumOxalate: string;
  uricAcid: string;
  others: string;
}

export const normalUrineRMEResults: UrineRMEResults = {
  quantity: 'Sufficient',
  colour: 'Straw',
  appearance: 'Clear',
  sediment: 'Nil',
  specificGravity: '1.015',
  reaction: 'Acidic',
  albumin: 'Nil',
  sugar: 'Nil',
  bileSalt: 'Nil',
  bilePigment: 'Nil',
  ketones: 'Nil',
  epithelialCells: '',
  pusCells: '',
  rbc: '',
  bacteria: 'Nil',
  sperm: 'Nil',
  casts: 'Nil',
  crystals: '',
  amorphousPhosphate: '',
  calciumOxalate: '',
  uricAcid: '',
  others: 'Urine routine examination reveals normal findings.'
};

export interface CBCResults {
    hemoglobin: string;
    esr: string;
    wbc: string;
    neutrophils: string;
    lymphocytes: string;
    monocytes: string;
    eosinophils: string;
    basophils: string;
    platelets: string;
}

export const emptyCBCResults: CBCResults = {
    hemoglobin: '',
    esr: '',
    wbc: '',
    neutrophils: '',
    lymphocytes: '',
    monocytes: '',
    eosinophils: '',
    basophils: '',
    platelets: ''
};

export interface LipidResults {
  s_cholesterol: string;
  triglycerides: string;
  hdl_cholesterol: string;
  ldl_cholesterol: string;
  vldl_cholesterol: string;
  note: string;
  s_cholesterol_range: string;
  triglycerides_range: string;
  hdl_cholesterol_range: string;
  ldl_cholesterol_range: string;
  vldl_cholesterol_range: string;
}

export interface SemenResults {
  volume: string; color: string; viscosity: string; liquefactionTime: string; ph: string; totalCount: string; motilityActive: string; motilitySluggish: string; motilityNonMotile: string; pusCells: string;
}

export const normalSemenResults: SemenResults = {
  volume: '2.0', color: 'Whitish', viscosity: 'Normal', liquefactionTime: '30 min', ph: '7.5', totalCount: '60', motilityActive: '60', motilitySluggish: '10', motilityNonMotile: '30', pusCells: '1-2'
};
