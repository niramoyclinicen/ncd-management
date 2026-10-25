-- =========================================================================
-- NIRAMOY CLINIC & DIAGNOSTIC (NCD)
-- CLEAN PURE MULTI-TABLE DATABASE SCHEMA (NO ncd_state)
--
-- Instructions:
-- 1. Open your Supabase Project Dashboard (e.g. Ncd_Oct26)
-- 2. Go to "SQL Editor" -> Click "New Query"
-- 3. Copy & paste this entire script and click "RUN".
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step A: Safely drop deprecated single-table and obsolete duplicate tables
DROP TABLE IF EXISTS public.ncd_state CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.dues CASCADE;
DROP TABLE IF EXISTS public.test CASCADE;
DROP TABLE IF EXISTS public.lab_tests CASCADE;
DROP TABLE IF EXISTS public.test_info CASCADE;
DROP TABLE IF EXISTS public.referrers CASCADE;
DROP TABLE IF EXISTS public.adjustments CASCADE;
DROP TABLE IF EXISTS public.consolidated_entries CASCADE;
DROP TABLE IF EXISTS public.ncd_monthly_adjustments CASCADE;

-- Step B: Create 24 Standard Pure Multi-Tables

-- 1. PATIENTS
CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY,
  pt_id TEXT,
  name TEXT,
  age TEXT,
  gender TEXT,
  mobile TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 2. DOCTORS
CREATE TABLE IF NOT EXISTS public.doctors (
  id TEXT PRIMARY KEY,
  doctor_id TEXT,
  name TEXT,
  degree TEXT,
  specialty TEXT,
  mobile TEXT,
  commission_rate NUMERIC DEFAULT 0,
  room_no TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 3. REFERRARS
CREATE TABLE IF NOT EXISTS public.referrars (
  id TEXT PRIMARY KEY,
  ref_id TEXT,
  ref_name TEXT,
  area TEXT,
  ref_mobile TEXT,
  commission_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 4. TESTS
CREATE TABLE IF NOT EXISTS public.tests (
  id TEXT PRIMARY KEY,
  test_id TEXT,
  test_name TEXT,
  category TEXT,
  price NUMERIC DEFAULT 0,
  test_commission NUMERIC DEFAULT 0,
  normal_range TEXT,
  unit TEXT,
  is_group_test BOOLEAN DEFAULT false,
  sub_tests JSONB DEFAULT '[]'::jsonb,
  reagents_required JSONB DEFAULT '[]'::jsonb,
  usg_exam_charge NUMERIC DEFAULT 0,
  extra_lab_fee NUMERIC DEFAULT 0,
  availability BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 5. REAGENTS
CREATE TABLE IF NOT EXISTS public.reagents (
  id TEXT PRIMARY KEY,
  reagent_id TEXT,
  reagent_name TEXT,
  company TEXT,
  quantity NUMERIC DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  expiry_date TEXT,
  manualStockUpdates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 6. EMPLOYEES
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  emp_id TEXT,
  name TEXT,
  designation TEXT,
  department TEXT,
  mobile TEXT,
  basic_salary NUMERIC DEFAULT 0,
  join_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 7. LAB_INVOICES
CREATE TABLE IF NOT EXISTS public.lab_invoices (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  daily_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  invoice_date TEXT,
  total_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  net_payable NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  doctor_commission NUMERIC DEFAULT 0,
  items JSONB DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 8. INDOOR_INVOICES
CREATE TABLE IF NOT EXISTS public.indoor_invoices (
  id TEXT PRIMARY KEY,
  daily_id TEXT,
  invoice_id TEXT,
  admission_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  referrar_id TEXT,
  referrar_name TEXT,
  admission_date TEXT,
  discharge_date TEXT,
  invoice_date TEXT,
  indication TEXT,
  service_category TEXT,
  sub_category TEXT,
  ot_details TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total_bill NUMERIC DEFAULT 0,
  total_discount NUMERIC DEFAULT 0,
  net_payable NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  due_bill NUMERIC DEFAULT 0,
  special_commission NUMERIC DEFAULT 0,
  commission_paid NUMERIC DEFAULT 0,
  bill_created_by TEXT,
  status TEXT DEFAULT 'Posted',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 9. ADMISSIONS
CREATE TABLE IF NOT EXISTS public.admissions (
  id TEXT PRIMARY KEY,
  admission_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  admission_date TEXT,
  bed_no TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  referrer_id TEXT,
  referrer_name TEXT,
  indication TEXT,
  service_name TEXT,
  service_category TEXT,
  contract_type TEXT DEFAULT 'Non-Contact',
  contract_amount NUMERIC DEFAULT 0,
  discharge_date TEXT,
  discharge_note TEXT,
  patient_mobile TEXT,
  status TEXT,
  advance_paid NUMERIC DEFAULT 0,
  final_bill NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  clinical_orders JSONB DEFAULT '[]'::jsonb,
  doctor_rounds JSONB DEFAULT '[]'::jsonb,
  nurse_chart JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 10. DUE_COLLECTIONS
CREATE TABLE IF NOT EXISTS public.due_collections (
  id TEXT PRIMARY KEY,
  collection_id TEXT,
  invoice_id TEXT,
  daily_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  collection_date TEXT,
  amount_collected NUMERIC DEFAULT 0,
  prev_due NUMERIC DEFAULT 0,
  new_due NUMERIC DEFAULT 0,
  dept TEXT,
  received_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 11. DETAILED_EXPENSES
CREATE TABLE IF NOT EXISTS public.detailed_expenses (
  id TEXT PRIMARY KEY,
  date TEXT,
  category TEXT,
  sub_category TEXT,
  description TEXT,
  bill_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  dept TEXT DEFAULT 'Diagnostic',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 12. MEDICINES
CREATE TABLE IF NOT EXISTS public.medicines (
  id TEXT PRIMARY KEY,
  trade_name TEXT,
  generic_name TEXT,
  formulation TEXT,
  strength TEXT,
  company TEXT,
  supplier TEXT,
  purchase_price NUMERIC DEFAULT 0,
  unit_price_buy NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  unit_price_sell NUMERIC DEFAULT 0,
  stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  box_size NUMERIC DEFAULT 1,
  expiry_date TEXT,
  is_antibiotic BOOLEAN DEFAULT false,
  requires_prescription BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 13. PURCHASE_INVOICES
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  supplier TEXT,
  source TEXT,
  invoice_date TEXT,
  total_amount NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  net_payable NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  items JSONB DEFAULT '[]'::jsonb,
  bill_created_by TEXT,
  bill_paid_by TEXT,
  received_by TEXT,
  status TEXT DEFAULT 'Saved',
  created_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 14. SALES_INVOICES
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  customer_name TEXT,
  customer_mobile TEXT,
  customer_age TEXT,
  customer_gender TEXT,
  ref_doctor_name TEXT,
  invoice_date TEXT,
  total_amount NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  net_payable NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  items JSONB DEFAULT '[]'::jsonb,
  bill_created_by TEXT,
  status TEXT DEFAULT 'Posted',
  created_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 15. REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  invoice_id TEXT,
  patient_id TEXT,
  test_id TEXT,
  test_name TEXT,
  report_date TEXT,
  delivery_status TEXT,
  results JSONB DEFAULT '[]'::jsonb,
  findings TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 16. PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id TEXT PRIMARY KEY,
  doctor_id TEXT,
  doctor_name TEXT,
  patient_id TEXT,
  patient_name TEXT,
  date TEXT,
  complaints TEXT,
  diagnosis TEXT,
  medicines JSONB DEFAULT '[]'::jsonb,
  tests JSONB DEFAULT '[]'::jsonb,
  advice TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 17. APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  patient_id TEXT,
  patient_name TEXT,
  mobile TEXT,
  appointment_date TEXT,
  time_slot TEXT,
  serial_no NUMERIC DEFAULT 0,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 18. ATTENDANCE_LOG
CREATE TABLE IF NOT EXISTS public.attendance_log (
  id TEXT PRIMARY KEY,
  date TEXT,
  emp_id TEXT,
  status TEXT,
  in_time TEXT,
  out_time TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 19. LEAVE_LOG
CREATE TABLE IF NOT EXISTS public.leave_log (
  id TEXT PRIMARY KEY,
  emp_id TEXT,
  start_date TEXT,
  end_date TEXT,
  leave_type TEXT,
  reason TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 20. MONTHLY_ADJUSTMENTS
CREATE TABLE IF NOT EXISTS public.monthly_adjustments (
  id TEXT PRIMARY KEY,
  month_key TEXT,
  profit_dist NUMERIC DEFAULT 0,
  house_rent NUMERIC DEFAULT 0,
  loan_installment NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  department TEXT,
  category TEXT,
  note TEXT,
  date TEXT,
  authorized_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 21. CONSOLIDATED_LAB_ENTRIES
CREATE TABLE IF NOT EXISTS public.consolidated_lab_entries (
  id TEXT PRIMARY KEY,
  date TEXT,
  shift TEXT,
  entry_time TEXT,
  operator_name TEXT,
  total_patients NUMERIC DEFAULT 0,
  total_tests NUMERIC DEFAULT 0,
  gross_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  net_payable NUMERIC DEFAULT 0,
  cash_collected NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  doctor_commission_paid NUMERIC DEFAULT 0,
  usg_doctor_fee_paid NUMERIC DEFAULT 0,
  breakdown JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  entry_type TEXT,
  month NUMERIC,
  year NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 22. CONSOLIDATED_CLINIC_ENTRIES
CREATE TABLE IF NOT EXISTS public.consolidated_clinic_entries (
  id TEXT PRIMARY KEY,
  date TEXT,
  shift TEXT,
  entry_time TEXT,
  operator_name TEXT,
  total_patients NUMERIC DEFAULT 0,
  total_tests NUMERIC DEFAULT 0,
  gross_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  net_payable NUMERIC DEFAULT 0,
  cash_collected NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  doctor_commission_paid NUMERIC DEFAULT 0,
  ot_charges_paid NUMERIC DEFAULT 0,
  total_indoor_revenue NUMERIC DEFAULT 0,
  admission_fee NUMERIC DEFAULT 0,
  oxygen_nebulization NUMERIC DEFAULT 0,
  conservative_treatment NUMERIC DEFAULT 0,
  normal_delivery NUMERIC DEFAULT 0,
  dmc_minor_surgery NUMERIC DEFAULT 0,
  cesarean_operation NUMERIC DEFAULT 0,
  dressing NUMERIC DEFAULT 0,
  medicine_purchase NUMERIC DEFAULT 0,
  medicine_sales NUMERIC DEFAULT 0,
  others_revenue NUMERIC DEFAULT 0,
  breakdown JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  entry_type TEXT,
  month NUMERIC,
  year NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 23. DIAGNOSTIC_SETTINGS
CREATE TABLE IF NOT EXISTS public.diagnostic_settings (
  id TEXT PRIMARY KEY,
  key TEXT,
  value JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 24. APP_SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  passwords JSONB DEFAULT '{}'::jsonb,
  clinic_profile JSONB DEFAULT '{}'::jsonb,
  print_settings JSONB DEFAULT '{}'::jsonb,
  sms_settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step C: DISABLE ROW LEVEL SECURITY (RLS) FOR FAST RELIABLE APPLICATION ACCESS
ALTER TABLE IF EXISTS public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrars DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reagents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lab_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.indoor_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.due_collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detailed_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medicines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leave_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.monthly_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consolidated_lab_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consolidated_clinic_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diagnostic_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings DISABLE ROW LEVEL SECURITY;

-- Step D: Grant all permissions to anon, authenticated, postgres, service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, postgres, service_role;
