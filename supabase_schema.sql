-- =========================================================================
-- NIRAMOY CLINIC & DIAGNOSTIC - FULL MULTI-TABLE DATABASE SCHEMA
-- For Supabase PostgreSQL Cloud Database
-- Instructions: Copy this entire script, open your Supabase Project Dashboard,
-- go to "SQL Editor", click "New Query", paste this SQL and click "RUN".
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PATIENTS (রোগীর তালিকা ও রেকর্ড)
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

-- 2. DOCTORS (ডাক্তারদের তালিকা ও তথ্য)
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

-- 3. REFERRARS (রেফারার ও এজেন্টদের তালিকা)
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

CREATE TABLE IF NOT EXISTS public.referrers (
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

-- 4. TESTS (ল্যাব টেস্ট তালিকা ও চার্জ)
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

-- 5. REAGENTS (ল্যাব কেমিক্যাল, রিএজেন্ট ও এক্স-রে ফিল্ম ইনভেন্টরি)
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

-- 6. EMPLOYEES (কর্মকর্তা-কর্মচারী তালিকা)
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

-- 7. LAB_INVOICES (ডায়াগনস্টিক ল্যাব টেস্ট ইনভয়েস)
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

-- Alias for lab invoices
CREATE TABLE IF NOT EXISTS public.invoices (
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
  items JSONB DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 8. INDOOR_INVOICES (ক্লিনিক বিভাগ ইনডোর ইনভয়েস)
CREATE TABLE IF NOT EXISTS public.indoor_invoices (
  id TEXT PRIMARY KEY,
  daily_id TEXT,
  invoice_id TEXT,
  admission_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  invoice_date TEXT,
  admission_date TEXT,
  total_bill NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  net_bill NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  advance_paid NUMERIC DEFAULT 0,
  final_paid NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  doctor_fee NUMERIC DEFAULT 0,
  ot_fee NUMERIC DEFAULT 0,
  medicine_bill NUMERIC DEFAULT 0,
  bed_charge NUMERIC DEFAULT 0,
  services JSONB DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 9. ADMISSIONS (ক্লিনিক ভর্তি রোগী ও বেড ম্যানেজমেন্ট)
CREATE TABLE IF NOT EXISTS public.admissions (
  id TEXT PRIMARY KEY,
  admission_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  admission_date TEXT,
  bed_no TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  status TEXT,
  advance_paid NUMERIC DEFAULT 0,
  final_bill NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 10. DUE_COLLECTIONS (বকেয়া আদায় রেকর্ড)
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

CREATE TABLE IF NOT EXISTS public.dues (
  id TEXT PRIMARY KEY,
  collection_id TEXT,
  invoice_id TEXT,
  daily_id TEXT,
  collection_date TEXT,
  amount_collected NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 11. DETAILED_EXPENSES (দৈনিক খরচের খাত ও ভাউচার)
CREATE TABLE IF NOT EXISTS public.detailed_expenses (
  id TEXT PRIMARY KEY,
  date TEXT,
  category TEXT,
  sub_category TEXT,
  description TEXT,
  bill_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  dept TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 12. MEDICINES (ফার্মেসি ঔষধ ক্যাটালগ ও স্টক)
CREATE TABLE IF NOT EXISTS public.medicines (
  id TEXT PRIMARY KEY,
  trade_name TEXT,
  generic_name TEXT,
  form TEXT,
  strength TEXT,
  company TEXT,
  purchase_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 13. PURCHASE_INVOICES (মেডিসিন ক্রয় ইনভয়েস)
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  supplier TEXT,
  invoice_date TEXT,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 14. SALES_INVOICES (মেডিসিন বিক্রয় ইনভয়েস)
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  invoice_date TEXT,
  total_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  net_payable NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 15. REPORTS (ডায়াগনস্টিক টেস্ট রিপোর্ট)
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

-- 16. PRESCRIPTIONS (ডাক্তার প্রেসক্রিপশন)
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

-- 17. APPOINTMENTS (সিরিয়াল ও অ্যাপয়েন্টমেন্ট)
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

-- 18. ATTENDANCE_LOG (হাজিরা লগ)
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

-- 19. LEAVE_LOG (ছুটি রেকর্ড)
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

-- 20. MONTHLY_ADJUSTMENTS (মাসিক হিসাব সমন্বয় / লভ্যাংশ বণ্টন / বাড়ি ভাড়া / লোন কিস্তি)
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

CREATE TABLE IF NOT EXISTS public.adjustments (
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

-- 21. CONSOLIDATED_LAB_ENTRIES (ডায়াগনস্টিক কনসোলিডেটেড ডাটা এন্ট্রি)
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

CREATE TABLE IF NOT EXISTS public.consolidated_entries (
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

-- 22. CONSOLIDATED_CLINIC_ENTRIES (ক্লিনিক ডিপার্টমেন্ট কনসোলিডেটেড ডাটা এন্ট্রি - ১১টি উপখাত সহ)
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

-- 23. DIAGNOSTIC_SETTINGS (ডায়াগনস্টিক ক্যালকুলেশন সেটিংস)
CREATE TABLE IF NOT EXISTS public.diagnostic_settings (
  id TEXT PRIMARY KEY,
  key TEXT,
  value JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 24. APP_SETTINGS (পাসওয়ার্ড, ক্লিনিক প্রোফাইল, প্রিন্ট সেটিংস)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  passwords JSONB DEFAULT '{}'::jsonb,
  clinic_profile JSONB DEFAULT '{}'::jsonb,
  print_settings JSONB DEFAULT '{}'::jsonb,
  sms_settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 25. NCD_STATE (মাস্টার ক্লাউড ব্যাকআপ স্টেট)
CREATE TABLE IF NOT EXISTS public.ncd_state (
  id BIGINT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- PERMISSIONS & ROW LEVEL SECURITY (RLS)
-- Disable RLS on all tables so your web app can read and write online seamlessly
-- =========================================================================

ALTER TABLE IF EXISTS public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrars DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reagents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lab_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.indoor_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.due_collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dues DISABLE ROW LEVEL SECURITY;
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
ALTER TABLE IF EXISTS public.adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consolidated_lab_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consolidated_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consolidated_clinic_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diagnostic_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ncd_state DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, postgres, service_role;

-- Helpful comment:
COMMENT ON TABLE public.consolidated_clinic_entries IS 'Niramoy Clinic Department Consolidated Daily and Monthly Service & Financial Entries';
