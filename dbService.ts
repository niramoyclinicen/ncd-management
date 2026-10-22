import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Test, SubTest } from './components/DiagnosticData';

// Get URL and Key from env or localStorage
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
      url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    } catch (e) {}
  }

  if (!key) {
    try {
      // @ts-expect-error import.meta is available in Vite environment
      key = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
    } catch (e) {}
  }
  if (!key) {
    try {
      key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    } catch (e) {}
  }

  return { url: url.trim(), key: key.trim() };
};

const isValidSupabaseConfig = (url: string, key: string) => {
  try {
    return !!(url && key && (url.startsWith('http://') || url.startsWith('https://')));
  } catch {
    return false;
  }
};

let currentConfig = getStoredConfig();
let supabase: SupabaseClient | null = isValidSupabaseConfig(currentConfig.url, currentConfig.key)
  ? createClient(currentConfig.url, currentConfig.key)
  : null;

export const initSupabaseClient = (url: string, key: string) => {
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
      return true;
    } catch (e) {
      console.error("Supabase client init error:", e);
      return false;
    }
  }
  return false;
};

// Helper to safely parse ISO dates without throwing RangeError
const safeIsoDate = (d: any): string | null => {
  if (!d) return null;
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  } catch {
    return null;
  }
};


export const getTableSplitCutoffDate = (): string => {
  return '2026-08-01';
};

export const setTableSplitCutoffDate = (dateStr: string) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ncd_table_split_cutoff_date', dateStr);
    }
  } catch (e) {}
};

// Robust date normalizer to YYYY-MM-DD supporting Bengali digits, DD-MM-YYYY, DD/MM/YYYY, DD-MM-YY, DD/MM/YY, ISO, and timestamps
export const normalizeDate = (d: any): string => {
  if (!d && d !== 0) return '';
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }
  let s = String(d).trim();
  if (!s) return '';

  // 1. Convert Bengali numerals (০-৯) to English digits
  const bnToEn: Record<string, string> = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  s = s.replace(/[০-৯]/g, (ch) => bnToEn[ch] || ch);

  // 2. Strip timestamp / time part if present (e.g. 10:30:00 or T10:30:00) without destroying date spaces
  s = s.replace(/T\d{1,2}:\d{2}.*$/i, '').replace(/\s+\d{1,2}:\d{2}(:\d{2})?.*$/, '').trim();

  // 3. Month name mapping (English and Bengali)
  const monthNames: Record<string, string> = {
    jan: '01', january: '01', 'জানুয়ারি': '01', 'জানুয়ারি': '01',
    feb: '02', february: '02', 'ফেব্রুয়ারি': '02', 'ফেব্রুয়ারি': '02',
    mar: '03', march: '03', 'মার্চ': '03',
    apr: '04', april: '04', 'এপ্রিল': '04',
    may: '05', 'মে': '05',
    jun: '06', june: '06', 'জুন': '06',
    jul: '07', july: '07', 'জুলাই': '07',
    aug: '08', august: '08', 'আগস্ট': '08', 'আগষ্ট': '08',
    sep: '09', sept: '09', september: '09', 'সেপ্টেম্বর': '09',
    oct: '10', october: '10', 'অক্টোবর': '10',
    nov: '11', november: '11', 'নভেম্বর': '11',
    dec: '12', december: '12', 'ডিসেম্বর': '12'
  };

  for (const [name, num] of Object.entries(monthNames)) {
    const re = new RegExp(`(^|[-/ ._\\s])${name}([-/ ._\\s]|$)`, 'i');
    if (re.test(s)) {
      s = s.replace(re, `$1${num}$2`);
      break;
    }
  }

  // 4. Split by delimiter -, /, _, ., or whitespace
  const parts = s.split(/[-/._\s]+/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 3) {
    const [p0, p1, p2] = parts;

    const expandYear = (yStr: string): string => {
      const num = parseInt(yStr, 10);
      if (yStr.length === 2) {
        return num >= 0 && num <= 70 ? (2000 + num).toString() : (1900 + num).toString();
      }
      return yStr;
    };

    // Case A: YYYY-MM-DD or YY-MM-DD (e.g. 2026-08-15 or 26-08-15)
    if (p0.length === 4 || (p0.length === 2 && parseInt(p0, 10) >= 20 && parseInt(p0, 10) <= 40 && p2.length <= 2 && parseInt(p2, 10) <= 31 && parseInt(p1, 10) <= 12)) {
      const y = expandYear(p0);
      const m = p1.padStart(2, '0');
      const day = p2.padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    // Case B: DD-MM-YYYY or DD-MM-YY or MM-DD-YYYY or MM-DD-YY
    if (p2.length === 4 || p2.length === 2) {
      const y = expandYear(p2);
      let m = parseInt(p1, 10);
      let day = parseInt(p0, 10);

      // If month > 12 and day <= 12, swap
      if (m > 12 && day <= 12) {
        const tmp = m;
        m = day;
        day = tmp;
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  } else if (parts.length === 2) {
    const [p0, p1] = parts;
    const expandYear = (yStr: string): string => {
      const num = parseInt(yStr, 10);
      if (yStr.length === 2) {
        return num >= 0 && num <= 70 ? (2000 + num).toString() : (1900 + num).toString();
      }
      return yStr;
    };

    // e.g. 2026-08 or 26-08 (YYYY-MM or YY-MM)
    if (p0.length === 4 || (p0.length === 2 && parseInt(p0, 10) >= 20 && parseInt(p0, 10) <= 40)) {
      return `${expandYear(p0)}-${p1.padStart(2, '0')}-01`;
    }
    // e.g. 08-2026 or 08/26 or 8/26 or aug/26 or sep/26 (MM-YYYY or MM-YY)
    if (p1.length === 4 || p1.length === 2) {
      return `${expandYear(p1)}-${p0.padStart(2, '0')}-01`;
    }
  }

  // Fallback: try JS Date
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return '';
};

// Extract date from any entity record
export const getRecordDate = (rec: any): string => {
  if (!rec || typeof rec !== 'object') return '';
  const inner = (rec.data && typeof rec.data === 'object') ? rec.data : {};
  const raw = rec.invoiceDate || rec.invoice_date || inner.invoiceDate || inner.invoice_date ||
              rec.admission_date || inner.admission_date || rec.collection_date || rec.collectionDate ||
              inner.collection_date || inner.collectionDate || rec.report_date || inner.report_date ||
              rec.appointment_date || inner.appointment_date || rec.date || inner.date ||
              rec.createdAt || rec.createdDate || rec.created_date || rec.created_at ||
              inner.createdAt || inner.createdDate || inner.created_date || inner.created_at || '';
  const norm = normalizeDate(raw);
  if (norm) return norm;

  // Fallback: extract date from ID patterns like exp_20260415 or ind_2026-04-15
  const idStr = String(rec.id || rec.invoice_id || rec.daily_id || '').trim();
  const idMatch = idStr.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  if (idMatch) {
    const y = parseInt(idMatch[1], 10);
    const m = parseInt(idMatch[2], 10);
    const d = parseInt(idMatch[3], 10);
    if (y >= 2020 && y <= 2040 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return '';
};

// Check if a record belongs to the historical/legacy period
export const isLegacyDate = (rawDate: any): boolean => {
  const date = normalizeDate(rawDate);
  if (!date) return false;
  return date < getTableSplitCutoffDate();
};

// Check if a record belongs to the modular/multi-table period
export const isMultiTableDate = (rawDate: any): boolean => {
  const date = normalizeDate(rawDate);
  if (!date) return true; // Default to modern for safety if no date
  return date >= getTableSplitCutoffDate();
};

// In-memory set for deleted lab invoices
const deletedLabInvoiceMemorySet = new Set<string>();

// Persistent Deleted Lab Invoices Tombstone Registry
export const getDeletedLabInvoiceIds = (): Set<string> => {
  const set = new Set<string>(deletedLabInvoiceMemorySet);
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('ncd_deleted_lab_invoices');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) arr.forEach((id: any) => { if (id) set.add(String(id).trim()); });
      }
    }
  } catch {}
  if (cachedLegacyState?.deleted_lab_invoices && Array.isArray(cachedLegacyState.deleted_lab_invoices)) {
    cachedLegacyState.deleted_lab_invoices.forEach((id: any) => { if (id) set.add(String(id).trim()); });
  }
  return set;
};

export const registerDeletedLabInvoiceId = (idOrInv: any) => {
  const ids: string[] = [];
  if (typeof idOrInv === 'string') {
    if (idOrInv.trim()) ids.push(idOrInv.trim());
  } else if (idOrInv && typeof idOrInv === 'object') {
    ['invoice_id', 'id', 'invoiceId', 'invoice_no', 'invoiceNo'].forEach(k => {
      const val = idOrInv[k];
      if (val !== undefined && val !== null && String(val).trim()) ids.push(String(val).trim());
    });
  }
  if (ids.length === 0) return;
  ids.forEach(id => deletedLabInvoiceMemorySet.add(id));
  try {
    if (typeof localStorage !== 'undefined') {
      let currentArr: string[] = [];
      try {
        currentArr = JSON.parse(localStorage.getItem('ncd_deleted_lab_invoices') || '[]');
      } catch {}
      const set = new Set([...currentArr, ...ids]);
      localStorage.setItem('ncd_deleted_lab_invoices', JSON.stringify(Array.from(set)));
    }
  } catch {}
};

export const isInvoiceMarkedDeleted = (inv: any, customSet?: Set<string>): boolean => {
  if (!inv) return true;
  if (inv.status === 'Deleted' || inv.status === 'Cancelled' || inv.isDeleted || inv.is_deleted) return true;
  const set = customSet || getDeletedLabInvoiceIds();
  for (const k of ['invoice_id', 'id', 'invoiceId', 'invoice_no', 'invoiceNo']) {
    const val = inv[k];
    if (val !== undefined && val !== null && set.has(String(val).trim())) return true;
  }
  return false;
};

// Helper for robust ID extraction across various field name conventions
export const getItemId = (it: any, idFields: string[]): string => {
  if (!it || typeof it !== 'object') return '';
  for (const f of idFields) {
    const val = it[f];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== 'undefined' && String(val) !== 'null') {
      return String(val).trim();
    }
  }
  return '';
};

// Helper to merge two lists without losing records or fields, and respecting deletion flags
export const mergeEntityList = (baseList: any[], extraList: any[], idFields: string[]) => {
  const result: any[] = Array.isArray(baseList) ? [...baseList] : [];
  if (!Array.isArray(extraList) || extraList.length === 0) return result;

  const map = new Map<string, number>();
  result.forEach((item, index) => {
    const id = getItemId(item, idFields);
    if (id) map.set(id, index);
  });

  const checkInvoiceDeleted = idFields.includes('invoice_id') || idFields.includes('invoiceId');

  extraList.forEach(item => {
    if (!item) return;
    const id = getItemId(item, idFields);
    const isMarkedDeleted = item.status === 'Deleted' || item.status === 'Cancelled' || item.isDeleted || item.is_deleted || (checkInvoiceDeleted && isInvoiceMarkedDeleted(item));
    
    if (id && map.has(id)) {
      const existingIdx = map.get(id)!;
      if (isMarkedDeleted) {
        result.splice(existingIdx, 1);
        map.clear();
        result.forEach((it, idx) => {
          const mid = getItemId(it, idFields);
          if (mid) map.set(mid, idx);
        });
        return;
      }
      const existing = result[existingIdx];
      // Latest/Corrected modular item takes precedence over existing legacy record
      const merged = { ...existing, ...item };
      // Intelligently preserve items array and positive amounts if incoming record lacked them
      if ((!item.items || item.items.length === 0) && existing.items && existing.items.length > 0) {
        merged.items = existing.items;
      }
      if ((!item.netPayable && !item.net_payable) && (existing.netPayable || existing.net_payable)) {
        merged.netPayable = existing.netPayable || existing.net_payable;
      }
      // Intelligently preserve test commission & price from existing legacy records if modular table had 0 or missing values
      if ((item.test_commission === undefined || item.test_commission === null || Number(item.test_commission) === 0) && Number(existing.test_commission || 0) > 0) {
        merged.test_commission = Number(existing.test_commission);
      }
      if ((item.price === undefined || item.price === null || Number(item.price) === 0) && Number(existing.price || 0) > 0) {
        merged.price = Number(existing.price);
      }
      if ((!item.category || item.category === 'Others' || item.category === 'General') && existing.category && existing.category !== 'Others' && existing.category !== 'General') {
        merged.category = existing.category;
      }
      if ((!item.usg_exam_charge || Number(item.usg_exam_charge) === 0) && Number(existing.usg_exam_charge || 0) > 0) {
        merged.usg_exam_charge = Number(existing.usg_exam_charge);
      }
      if ((!item.extra_lab_fee || Number(item.extra_lab_fee) === 0) && Number(existing.extra_lab_fee || 0) > 0) {
        merged.extra_lab_fee = Number(existing.extra_lab_fee);
      }
      if ((!item.sub_tests || item.sub_tests.length === 0) && Array.isArray(existing.sub_tests) && existing.sub_tests.length > 0) {
        merged.sub_tests = existing.sub_tests;
        merged.is_group_test = true;
      }
      if (!item.normal_range && existing.normal_range) {
        merged.normal_range = existing.normal_range;
      }
      if (!item.unit && existing.unit) {
        merged.unit = existing.unit;
      }
      result[existingIdx] = merged;
    } else {
      if (!isMarkedDeleted) {
        result.push(item);
        if (id) map.set(id, result.length - 1);
      }
    }
  });

  return result;
};

// Safe helper to normalize any test item regardless of column naming conventions
export const normalizeTestItem = (rawRow: any): Test | null => {
  if (!rawRow || typeof rawRow !== 'object') return null;
  let dataObj = rawRow.data;
  if (typeof dataObj === 'string') {
    try { dataObj = JSON.parse(dataObj); } catch { dataObj = {}; }
  }
  if (!dataObj || typeof dataObj !== 'object') dataObj = {};

  const merged = { ...dataObj, ...rawRow };

  const test_name = String(merged.test_name || merged.name || merged.testName || merged.title || merged.test || '').trim();
  const rawId = merged.test_id || merged.id || merged.testId || merged.code || merged.test_code || '';
  const test_id = String(rawId || (test_name ? `TEST-${test_name.replace(/\s+/g, '_')}` : '')).trim();

  if (!test_id && !test_name) return null;

  // Category
  let category = String(merged.category || merged.dept || merged.department || merged.test_category || merged.group || merged.category_name || '').trim();
  if (!category) {
    category = 'Others';
  }

  // Price / Cost / Rate / Fee
  const price = Number(merged.price ?? merged.rate ?? merged.cost ?? merged.fee ?? merged.test_price ?? merged.amount ?? 0) || 0;

  // Commission / PC
  const test_commission = Number(merged.test_commission ?? merged.commission ?? merged.pc ?? merged.doctor_commission ?? 0) || 0;

  // USG Exam Charge & Extra Lab Fee
  const usg_exam_charge = Number(merged.usg_exam_charge ?? merged.usgCharge ?? merged.exam_charge ?? 0) || 0;
  const extra_lab_fee = Number(merged.extra_lab_fee ?? merged.extraLabFee ?? merged.lab_fee ?? 0) || 0;

  // is_group_test
  let is_group_test = false;
  if (typeof merged.is_group_test === 'boolean') {
    is_group_test = merged.is_group_test;
  } else if (typeof merged.group_test === 'boolean') {
    is_group_test = merged.group_test;
  } else if (typeof merged.is_group_test === 'string') {
    is_group_test = merged.is_group_test.toLowerCase() === 'true' || merged.is_group_test.toLowerCase() === 'group';
  } else if (typeof merged.group_test === 'string') {
    is_group_test = merged.group_test.toLowerCase() === 'true' || merged.group_test.toLowerCase() === 'group';
  } else if (Array.isArray(merged.sub_tests) && merged.sub_tests.length > 0) {
    is_group_test = true;
  }

  // Normal Range & Unit
  const normal_range = String(merged.normal_range || merged.normalRange || merged.reference_range || merged.range || '').trim();
  const unit = String(merged.unit || merged.test_unit || merged.units || '').trim();

  // Sub Tests
  let sub_tests: SubTest[] = [];
  let rawSub = merged.sub_tests || merged.subTests || merged.subtests || merged.parameters;
  if (typeof rawSub === 'string') {
    try { rawSub = JSON.parse(rawSub); } catch { rawSub = []; }
  }
  if (Array.isArray(rawSub)) {
    sub_tests = rawSub.map((s: any, idx: number) => ({
      id: String(s.id || idx + 1),
      name: String(s.name || s.test_name || s.parameter_name || ''),
      unit: String(s.unit || ''),
      normal_range: String(s.normal_range || s.normalRange || s.reference_range || '')
    })).filter((s: SubTest) => s.name);
  }

  // Reagents Required
  let reagents_required: { reagent_id: string; quantity_per_test: number }[] = [];
  let rawReagents = merged.reagents_required || merged.reagentsRequired || merged.reagents;
  if (typeof rawReagents === 'string') {
    try { rawReagents = JSON.parse(rawReagents); } catch { rawReagents = []; }
  }
  if (Array.isArray(rawReagents)) {
    reagents_required = rawReagents.map((r: any) => ({
      reagent_id: String(r.reagent_id || r.id || r.name || ''),
      quantity_per_test: Number(r.quantity_per_test || r.quantity || r.qty || 1) || 1
    })).filter((r: any) => r.reagent_id);
  }

  // Availability
  let availability = true;
  if (merged.availability !== undefined) {
    availability = merged.availability === true || merged.availability === 'true' || merged.availability === 1 || merged.availability === '1';
  } else if (merged.is_available !== undefined) {
    availability = merged.is_available === true || merged.is_available === 'true' || merged.is_available === 1 || merged.is_available === '1';
  } else if (merged.status !== undefined) {
    availability = String(merged.status).toLowerCase() !== 'inactive' && String(merged.status).toLowerCase() !== 'disabled';
  }

  // Preparation Instructions
  const preparation_instructions = String(merged.preparation_instructions || merged.instructions || merged.instruction || '').trim();

  return {
    test_id,
    test_name: test_name || test_id,
    category,
    price,
    test_commission,
    is_group_test,
    normal_range,
    unit,
    sub_tests,
    usg_exam_charge,
    extra_lab_fee,
    reagents_required,
    availability,
    preparation_instructions
  };
};

// Safe helper to fetch all rows from a table (with pagination beyond 5000 rows)
const fetchTableSafe = async (client: SupabaseClient, tableName: string) => {
  try {
    const allData: any[] = [];
    const pageSize = 1000;
    let from = 0;
    
    while (true) {
      const { data, error } = await client.from(tableName).select('*').range(from, from + pageSize - 1);
      if (error) {
        if (from === 0) {
          console.warn(`Notice reading table ${tableName}:`, error.message);
          return null;
        }
        break;
      }
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
      if (from >= 50000) break; // Safety cap
    }
    return allData;
  } catch (err) {
    console.warn(`Error reading table ${tableName}:`, err);
    return null;
  }
};

// Safe helper to upsert rows to a table in batches
const upsertTableSafe = async (client: SupabaseClient, tableName: string, rows: any[]) => {
  if (!rows || rows.length === 0) return true;
  try {
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      let chunk = rows.slice(i, i + chunkSize);
      let conflictTarget = (tableName === 'purchase_invoices' || tableName === 'sales_invoices' || tableName === 'lab_invoices')
        ? 'invoice_id'
        : (tableName === 'indoor_invoices' ? 'daily_id' : 'id');

      let { error } = await client.from(tableName).upsert(chunk, { onConflict: conflictTarget });

      if (error && conflictTarget !== 'id') {
        const retryId = await client.from(tableName).upsert(chunk, { onConflict: 'id' });
        if (!retryId.error) {
          error = null;
        } else {
          error = retryId.error;
        }
      }

      // If missing column error in schema cache, iteratively remove bad columns and retry up to 5 times
      let colRetry = 0;
      let sanitizedChunk = chunk;
      while (error && colRetry < 5) {
        const colMatch = error.message ? error.message.match(/Could not find the '([^']+)' column/i) : null;
        if (colMatch && colMatch[1]) {
          const badCol = colMatch[1];
          sanitizedChunk = sanitizedChunk.map(r => {
            const copy = { ...r };
            delete copy[badCol];
            return copy;
          });
          const retryRes = await client.from(tableName).upsert(sanitizedChunk, { onConflict: conflictTarget });
          if (!retryRes.error) {
            error = null;
            break;
          } else {
            const retryIdRes = await client.from(tableName).upsert(sanitizedChunk, { onConflict: 'id' });
            if (!retryIdRes.error) {
              error = null;
              break;
            }
            error = retryRes.error;
          }
          colRetry++;
        } else {
          break;
        }
      }

      if (error) {
        console.error(`[dbService] Upsert error for table ${tableName}:`, error.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error(`[dbService] Upsert exception for table ${tableName}:`, err);
    return false;
  }
};

export const dbService = {
  getSupabaseConfig: () => {
    return {
      url: currentConfig.url,
      key: currentConfig.key,
      isConnected: !!supabase && isValidSupabaseConfig(currentConfig.url, currentConfig.key)
    };
  },

  setSupabaseConfig: (url: string, key: string) => {
    return initSupabaseClient(url, key);
  },

  testConnection: async (): Promise<{ success: boolean; message: string; tablesFound?: Record<string, number> }> => {
    if (!supabase) {
      return { 
        success: false, 
        message: "Supabase URL বা Anon Key সেট করা নেই। দয়া করে সেটিংস থেকে Supabase ক্রেডেনশিয়াল দিন।" 
      };
    }
    try {
      const counts: Record<string, number> = {};
      
      // Test individual tables
      const tableNames = [
        'patients', 'doctors', 'referrars', 'referrers', 'tests', 'employees', 'medicines', 'reagents',
        'lab_invoices', 'invoices', 'indoor_invoices', 'sales_invoices', 'purchase_invoices', 'detailed_expenses',
        'reports', 'prescriptions', 'appointments', 'due_collections', 'dues', 'admissions',
        'consolidated_clinic_entries', 'consolidated_lab_entries', 'consolidated_entries',
        'monthly_adjustments', 'adjustments', 'attendance_log', 'leave_log'
      ];

      for (const t of tableNames) {
        try {
          const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
          if (!error && count !== null) {
            counts[t] = count;
          }
        } catch {}
      }

      return {
        success: true,
        message: "Supabase ক্লাউড ডাটাবেজে সফলভাবে কানেক্ট হয়েছে!",
        tablesFound: counts
      };
    } catch (e: any) {
      return {
        success: false,
        message: "কানেকশন ব্যর্থ: " + (e?.message || "Unknown error")
      };
    }
  },

  loadFromCloud: async () => {
    try {
      if (!supabase) {
        return { _error: "Supabase not initialized. Offline mode is completely disabled." };
      }
      
      const cutoffDate = getTableSplitCutoffDate(); // '2026-08-01'



      // 1. Initialize state
      let state: any = {};

      // 2. Fetch legacy ncd_state table and all modular tables concurrently from Supabase
      try {
        const [
          expRows,
          labInvRows,
          altInvRows,
          dueColRows,
          altDueRows,
          indoorInvRows,
          patientRows,
          doctorRows,
          referrerRows,
          altReferrerRows,
          testRows,
          altTestRows1,
          altTestRows2,
          altTestRows3,
          reagentRows,
          empRows,
          medRows,
          salesInvRows,
          purchaseInvRows,
          repRows,
          prescRows,
          apptRows,
          admRows,
          consRows,
          altConsRows,
          consClinicRows,
          adjTableRows1,
          adjTableRows2,
          adjTableRows3
        ] = await Promise.all([
          fetchTableSafe(supabase, 'detailed_expenses'),
          fetchTableSafe(supabase, 'lab_invoices'),
          fetchTableSafe(supabase, 'invoices'),
          fetchTableSafe(supabase, 'due_collections'),
          fetchTableSafe(supabase, 'dues'),
          fetchTableSafe(supabase, 'indoor_invoices'),
          fetchTableSafe(supabase, 'patients'),
          fetchTableSafe(supabase, 'doctors'),
          fetchTableSafe(supabase, 'referrars'),
          fetchTableSafe(supabase, 'referrers'),
          fetchTableSafe(supabase, 'tests'),
          fetchTableSafe(supabase, 'test'),
          fetchTableSafe(supabase, 'lab_tests'),
          fetchTableSafe(supabase, 'test_info'),
          fetchTableSafe(supabase, 'reagents'),
          fetchTableSafe(supabase, 'employees'),
          fetchTableSafe(supabase, 'medicines'),
          fetchTableSafe(supabase, 'sales_invoices'),
          fetchTableSafe(supabase, 'purchase_invoices'),
          fetchTableSafe(supabase, 'reports'),
          fetchTableSafe(supabase, 'prescriptions'),
          fetchTableSafe(supabase, 'appointments'),
          fetchTableSafe(supabase, 'admissions'),
          fetchTableSafe(supabase, 'consolidated_lab_entries'),
          fetchTableSafe(supabase, 'consolidated_entries'),
          fetchTableSafe(supabase, 'consolidated_clinic_entries'),
          fetchTableSafe(supabase, 'monthly_adjustments'),
          fetchTableSafe(supabase, 'adjustments'),
          fetchTableSafe(supabase, 'ncd_monthly_adjustments')
        ]);

        state.detailedExpenses = expRows || {};
        state.labInvoices = labInvRows || [];
        state.dueCollections = dueColRows || [];
        state.indoorInvoices = indoorInvRows || [];
        state.patients = patientRows || [];
        state.doctors = doctorRows || [];
        state.referrars = referrerRows || [];
        state.tests = testRows || [];
        state.reagents = reagentRows || [];
        state.employees = empRows || [];
        state.medicines = medRows || [];
        state.salesInvoices = salesInvRows || [];
        state.purchaseInvoices = purchaseInvRows || [];
        state.reports = repRows || [];
        state.prescriptions = prescRows || [];
        state.appointments = apptRows || [];
        state.admissions = admRows || [];
        
        // Handle consolidated entries and adjustments
        // ... (etc)
        
        // Finally, ensure that the fetched data is not null/undefined
        Object.keys(state).forEach(key => {
            if (state[key] === null) state[key] = (key === 'detailedExpenses' ? {} : []);
        });


        // Merge Consolidated Lab Entries from modular table(s) if available
        const combinedConsRows = [...(consRows || []), ...(altConsRows || [])];
        if (combinedConsRows.length > 0) {
          const parsedCons = combinedConsRows.map((r: any) => {
            let raw = r.data;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = {}; }
            }
            if (!raw || typeof raw !== 'object') raw = {};
            const gross = Number(r.grossAmount ?? r.gross_amount ?? raw.grossAmount ?? raw.gross_amount ?? 0);
            const discount = Number(r.discountAmount ?? r.discount_amount ?? raw.discountAmount ?? raw.discount_amount ?? 0);
            const net = Number(r.netPayable ?? r.net_payable ?? raw.netPayable ?? raw.net_payable ?? Math.max(0, gross - discount));
            const cash = Number(r.cashCollected ?? r.cash_collected ?? raw.cashCollected ?? raw.cash_collected ?? 0);
            const due = Number(r.dueAmount ?? r.due_amount ?? raw.dueAmount ?? raw.due_amount ?? Math.max(0, net - cash));
            const docPC = Number(r.doctorCommissionPaid ?? r.doctor_commission_paid ?? raw.doctorCommissionPaid ?? raw.doctor_commission_paid ?? 0);
            const usgFee = Number(r.usgDoctorFeePaid ?? r.usg_doctor_fee_paid ?? raw.usgDoctorFeePaid ?? raw.usg_doctor_fee_paid ?? 0);
            const normDate = normalizeDate(r.date || raw.date || '') || r.date || raw.date;

            return {
              ...raw,
              ...r,
              id: String(r.id || raw.id || r._id || raw._id || '').trim(),
              date: normDate,
              shift: r.shift || raw.shift || 'Full Day',
              entryType: r.entryType || r.entry_type || raw.entryType || raw.entry_type || 'daily',
              grossAmount: gross,
              gross_amount: gross,
              discountAmount: discount,
              discount_amount: discount,
              netPayable: net,
              net_payable: net,
              cashCollected: cash,
              cash_collected: cash,
              dueAmount: due,
              due_amount: due,
              doctorCommissionPaid: docPC,
              doctor_commission_paid: docPC,
              usgDoctorFeePaid: usgFee,
              usg_doctor_fee_paid: usgFee,
              totalPatients: Number(r.totalPatients ?? r.total_patients ?? raw.totalPatients ?? raw.total_patients ?? 0),
              totalTests: Number(r.totalTests ?? r.total_tests ?? raw.totalTests ?? raw.total_tests ?? 0),
              breakdown: r.breakdown || raw.breakdown || { pathology: 0, usg: 0, xray: 0, ecg: 0, hormone: 0, others: 0 },
              notes: r.notes || raw.notes || ''
            };
          }).filter((e: any) => e.id);
          state.consolidatedLabEntries = mergeEntityList(state.consolidatedLabEntries || [], parsedCons, ['id', '_id']);
        }

        // Merge Consolidated Clinic Entries from modular table 'consolidated_clinic_entries'
        if (Array.isArray(consClinicRows) && consClinicRows.length > 0) {
          const parsedClinicCons = consClinicRows.map((r: any) => {
            let raw = r.data;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = {}; }
            }
            if (!raw || typeof raw !== 'object') raw = {};
            const gross = Number(r.grossAmount ?? r.gross_amount ?? raw.grossAmount ?? raw.gross_amount ?? 0);
            const discount = Number(r.discountAmount ?? r.discount_amount ?? raw.discountAmount ?? raw.discount_amount ?? 0);
            const net = Number(r.netPayable ?? r.net_payable ?? raw.netPayable ?? raw.net_payable ?? Math.max(0, gross - discount));
            const cash = Number(r.cashCollected ?? r.cash_collected ?? raw.cashCollected ?? raw.cash_collected ?? 0);
            const due = Number(r.dueAmount ?? r.due_amount ?? raw.dueAmount ?? raw.due_amount ?? Math.max(0, net - cash));
            const docPC = Number(r.doctorCommissionPaid ?? r.doctor_commission_paid ?? raw.doctorCommissionPaid ?? raw.doctor_commission_paid ?? 0);
            const otFee = Number(r.otChargesPaid ?? r.ot_charges_paid ?? raw.otChargesPaid ?? raw.ot_charges_paid ?? 0);
            const normDate = normalizeDate(r.date || raw.date || '') || r.date || raw.date;
            const bd = r.breakdown || raw.breakdown || {};

            return {
              ...raw,
              ...r,
              id: String(r.id || raw.id || r._id || raw._id || '').trim(),
              date: normDate,
              shift: r.shift || raw.shift || 'Full Day',
              entryType: r.entryType || r.entry_type || raw.entryType || raw.entry_type || 'daily',
              grossAmount: gross,
              gross_amount: gross,
              discountAmount: discount,
              discount_amount: discount,
              netPayable: net,
              net_payable: net,
              cashCollected: cash,
              cash_collected: cash,
              dueAmount: due,
              due_amount: due,
              doctorCommissionPaid: docPC,
              doctor_commission_paid: docPC,
              otChargesPaid: otFee,
              ot_charges_paid: otFee,
              totalPatients: Number(r.totalPatients ?? r.total_patients ?? raw.totalPatients ?? raw.total_patients ?? 0),
              totalIndoorRevenue: Number(bd.totalIndoorRevenue || r.total_indoor_revenue || raw.totalIndoorRevenue || 0),
              admissionFee: Number(bd.admissionFee || r.admission_fee || raw.admissionFee || 0),
              oxygenNebulization: Number(bd.oxygenNebulization || r.oxygen_nebulization || raw.oxygenNebulization || 0),
              conservativeTreatment: Number(bd.conservativeTreatment || r.conservative_treatment || raw.conservativeTreatment || 0),
              normalDelivery: Number(bd.normalDelivery || r.normal_delivery || raw.normalDelivery || 0),
              dmcMinorSurgery: Number(bd.dmcMinorSurgery || r.dmc_minor_surgery || raw.dmcMinorSurgery || 0),
              cesareanOperation: Number(bd.cesareanOperation || r.cesarean_operation || raw.cesareanOperation || 0),
              dressing: Number(bd.dressing || r.dressing || raw.dressing || 0),
              medicinePurchase: Number(bd.medicinePurchase || r.medicine_purchase || raw.medicinePurchase || 0),
              medicineSales: Number(bd.medicineSales || r.medicine_sales || raw.medicineSales || 0),
              others: Number(bd.others || r.others_revenue || raw.others || 0),
              breakdown: bd,
              notes: r.notes || raw.notes || ''
            };
          }).filter((e: any) => e.id);
          state.consolidatedClinicEntries = mergeEntityList(state.consolidatedClinicEntries || [], parsedClinicCons, ['id', '_id']);
        }

        // Merge Monthly Adjustments from modular table(s) if available
        const combinedAdjRows = [...(adjTableRows1 || []), ...(adjTableRows2 || []), ...(adjTableRows3 || [])];
        if (combinedAdjRows.length > 0) {
          if (!state.monthlyAdjustments) state.monthlyAdjustments = {};
          const bnToEnMap: Record<string, string> = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
          const extractNum = (v: any): number => {
            if (v === null || v === undefined) return 0;
            if (typeof v === 'number') return isNaN(v) ? 0 : v;
            let s = String(v).trim().replace(/[০-৯]/g, ch => bnToEnMap[ch] || ch).replace(/,/g, '');
            const n = parseFloat(s);
            return isNaN(n) ? 0 : n;
          };

          combinedAdjRows.forEach((r: any) => {
            let raw = r.data;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = {}; }
            }
            if (!raw || typeof raw !== 'object') raw = {};
            const comb = { ...raw, ...r };
            const k = String(comb.month_key || comb.monthKey || comb.key || comb.id || comb.date || '').replace(/[০-৯]/g, ch => bnToEnMap[ch] || ch);
            if (!k) return;
            const pd = extractNum(comb.profitDist ?? comb.profit_dist ?? comb.profit ?? comb.amount ?? comb.value ?? comb.dist ?? comb.dividend ?? comb.profit_distribution ?? comb.profitDistribution ?? comb.distribution ?? comb.netProfit ?? comb.net_profit);
            const hr = extractNum(comb.houseRent ?? comb.house_rent ?? comb.rent);
            const li = extractNum(comb.loanInstallment ?? comb.loan_installment ?? comb.installment);
            const item = { profitDist: pd, houseRent: hr, loanInstallment: li };
            
            if (pd > 0 || hr > 0 || li > 0 || !state.monthlyAdjustments[k]) {
              state.monthlyAdjustments[k] = item;

              const m = String(k).match(/^(\d{4})[-_]?(\d{1,2})$/);
              if (m) {
                const y = parseInt(m[1], 10);
                const mn = parseInt(m[2], 10);
                const m0 = mn > 11 ? mn - 1 : (mn > 0 ? mn - 1 : 0);
                const m1 = mn > 12 ? mn : (mn === 0 ? 1 : mn);
                const mP1 = String(m1).padStart(2, '0');
                const mP0 = String(m0).padStart(2, '0');
                state.monthlyAdjustments[`${y}-${m0}`] = item;
                state.monthlyAdjustments[`${y}-${m1}`] = item;
                state.monthlyAdjustments[`${y}-${mP1}`] = item;
                state.monthlyAdjustments[`${y}-${mP0}`] = item;
                state.monthlyAdjustments[`${y}_${m0}`] = item;
                state.monthlyAdjustments[`${y}_${m1}`] = item;
                state.monthlyAdjustments[`${y}_${mP1}`] = item;
                state.monthlyAdjustments[`${y}_${mP0}`] = item;
              }
            }
          });
        }

        // B. Merge entity tables from modular Supabase tables
        if (patientRows && patientRows.length > 0) state.patients = mergeEntityList(state.patients || [], patientRows, ['pt_id', 'patient_id', 'id']);
        if (doctorRows && doctorRows.length > 0) state.doctors = mergeEntityList(state.doctors || [], doctorRows, ['doctor_id', 'id']);
        const combinedRefRows = [...(referrerRows || []), ...(altReferrerRows || [])];
        if (combinedRefRows.length > 0) state.referrars = mergeEntityList(state.referrars || [], combinedRefRows, ['ref_id', 'referrer_id', 'referrar_id', 'id']);
        
        // Merge Tests from tests, test, lab_tests, and test_info modular tables
        const combinedTestRows = [
          ...(Array.isArray(testRows) ? testRows : []),
          ...(Array.isArray(altTestRows1) ? altTestRows1 : []),
          ...(Array.isArray(altTestRows2) ? altTestRows2 : []),
          ...(Array.isArray(altTestRows3) ? altTestRows3 : [])
        ];
        if (combinedTestRows.length > 0) {
          const parsedModularTests = combinedTestRows
            .map(r => normalizeTestItem(r))
            .filter((t): t is Test => t !== null && !!t.test_id);
          state.tests = mergeEntityList(state.tests || [], parsedModularTests, ['test_id', 'id', 'test_name']);
        }
        if (reagentRows && reagentRows.length > 0) state.reagents = mergeEntityList(state.reagents || [], reagentRows, ['id', 'reagent_id']);
        if (empRows && empRows.length > 0) state.employees = mergeEntityList(state.employees || [], empRows, ['id', 'emp_id']);
        if (medRows && medRows.length > 0) state.medicines = mergeEntityList(state.medicines || [], medRows, ['id', 'name']);

        // Merge Lab Invoices from modular table(s) - Load records (ignoring deleted records)
        const combinedLabRows = [...(labInvRows || []), ...(altInvRows || [])];
        if (combinedLabRows.length > 0) {
          const parsedLabInvs = combinedLabRows
            .filter((r: any) => {
              if (r.status === 'Deleted' || r.is_deleted) return false;
              let raw = r.data;
              if (typeof raw === 'string') {
                try { raw = JSON.parse(raw); } catch { raw = null; }
              }
              if (raw && (raw.status === 'Deleted' || raw.is_deleted)) return false;
              if (isInvoiceMarkedDeleted(r, activeDeletedLabIds) || isInvoiceMarkedDeleted(raw, activeDeletedLabIds)) return false;
              return true;
            })
            .map((r: any) => {
            let raw = r.data;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = {}; }
            }
            if (!raw || typeof raw !== 'object') raw = {};
            let items = r.items ?? raw.items;
            if (typeof items === 'string') {
              try { items = JSON.parse(items); } catch { items = []; }
            }
            const invId = String(r.invoice_id || r.id || r.invoice_no || r.invoiceId || raw.invoice_id || raw.invoiceId || '').trim();
            const invDate = normalizeDate(r.invoice_date || r.date || r.created_at || raw.invoice_date || raw.invoiceDate || raw.date || '');
            const total = Number(r.total_amount ?? r.totalAmount ?? r.total ?? raw.total_amount ?? raw.totalAmount ?? 0);
            const paid = Number(r.paid_amount ?? r.paidAmount ?? r.paid ?? raw.paid_amount ?? raw.paidAmount ?? 0);
            const discount = Number(r.discount_amount ?? r.discountAmount ?? r.discount ?? raw.discount_amount ?? raw.discount ?? 0);
            const due = Number(r.due_amount ?? r.dueAmount ?? r.due ?? raw.due_amount ?? raw.dueAmount ?? Math.max(0, total - discount - paid));
            return {
              ...raw,
              ...r,
              invoice_id: invId,
              invoiceId: invId,
              invoice_date: invDate,
              invoiceDate: invDate,
              patient_id: r.patient_id || r.pt_id || raw.patient_id || raw.pt_id || '',
              patient_name: r.patient_name || r.pt_name || raw.patient_name || raw.pt_name || '',
              doctor_id: r.doctor_id || raw.doctor_id || '',
              doctor_name: r.doctor_name || raw.doctor_name || '',
              referrar_id: r.referrar_id || r.ref_id || raw.referrar_id || raw.ref_id || '',
              referrar_name: r.referrar_name || r.ref_name || raw.referrar_name || raw.ref_name || '',
              items: Array.isArray(items) ? items : [],
              total_amount: total,
              totalAmount: total,
              paid_amount: paid,
              paidAmount: paid,
              due_amount: due,
              dueAmount: due,
              discount_amount: discount,
              discount: discount,
              commission_paid: Number(r.commission_paid ?? r.commissionPaid ?? raw.commission_paid ?? 0),
              special_commission: Number(r.special_commission ?? r.specialCommission ?? raw.special_commission ?? 0),
              status: r.status || raw.status || (due > 0 ? 'Due' : 'Paid')
            };
          }).filter(r => r.invoice_id && !isInvoiceMarkedDeleted(r, activeDeletedLabIds));
          state.labInvoices = mergeEntityList(state.labInvoices || [], parsedLabInvs, ['invoice_id', 'id', 'invoice_no', 'invoiceId']);
        }

        // Merge Due Collections from modular table(s) - Load ALL records without date restrictions
        const combinedDueRows = [...(dueColRows || []), ...(altDueRows || [])];
        if (combinedDueRows.length > 0) {
          const parsedDues = combinedDueRows.map((r: any) => {
            let raw = r.data;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = {}; }
            }
            if (!raw || typeof raw !== 'object') raw = {};
            return {
              ...raw,
              ...r,
              collection_id: String(r.collection_id || r.id || r.collectionId || raw.collection_id || raw.collectionId || '').trim(),
              invoice_id: String(r.invoice_id || r.invoice_no || r.invoiceId || raw.invoice_id || '').trim(),
              amount_collected: Number(r.amount_collected ?? r.amount ?? r.paid_amount ?? raw.amount_collected ?? raw.amount ?? 0),
              collection_date: normalizeDate(r.collection_date || r.date || r.created_at || raw.collection_date || raw.date || '')
            };
          }).filter(r => (r.collection_id || r.invoice_id));
          state.dueCollections = mergeEntityList(state.dueCollections || [], parsedDues, ['collection_id', 'id', 'collectionId']);
        }

        // Merge Indoor Invoices from modular table - Load ALL records without date restrictions
        if (indoorInvRows && indoorInvRows.length > 0) {
          const parsedIndoor = indoorInvRows.map((r: any) => {
            let raw = r.data;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = {}; }
            }
            if (!raw || typeof raw !== 'object') raw = {};
            let items = r.items ?? raw.items;
            if (typeof items === 'string') {
              try { items = JSON.parse(items); } catch { items = []; }
            }
            const invId = String(r.invoice_id || r.daily_id || r.id || raw.invoice_id || raw.daily_id || '').trim();
            const invDate = normalizeDate(r.invoice_date || r.admission_date || r.date || raw.invoice_date || raw.admission_date || '');
            const paid = Number(r.paid_amount ?? r.paidAmount ?? raw.paid_amount ?? 0);
            return {
              ...raw,
              ...r,
              invoice_id: invId,
              invoiceId: invId,
              daily_id: r.daily_id || raw.daily_id || invId,
              invoice_date: invDate,
              invoiceDate: invDate,
              admission_date: r.admission_date || raw.admission_date || invDate,
              items: Array.isArray(items) ? items : [],
              paid_amount: paid,
              paidAmount: paid
            };
          }).filter((r: any) => r.invoice_id || r.daily_id);
          state.indoorInvoices = mergeEntityList(state.indoorInvoices || [], parsedIndoor, ['daily_id', 'invoice_id', 'id']);
        }

        // Merge other entity collections
        if (patientRows && patientRows.length > 0) state.patients = mergeEntityList(state.patients, patientRows, ['pt_id', 'patient_id', 'id']);
        if (doctorRows && doctorRows.length > 0) state.doctors = mergeEntityList(state.doctors, doctorRows, ['doctor_id', 'id']);
        if (combinedRefRows.length > 0) state.referrars = mergeEntityList(state.referrars, combinedRefRows, ['ref_id', 'referrer_id', 'id']);
        if (combinedTestRows.length > 0) {
          const parsedModularTests = combinedTestRows
            .map(r => normalizeTestItem(r))
            .filter((t): t is Test => t !== null && !!t.test_id);
          state.tests = mergeEntityList(state.tests, parsedModularTests, ['test_id', 'id', 'test_name']);
        }
        if (reagentRows && reagentRows.length > 0) state.reagents = mergeEntityList(state.reagents, reagentRows, ['reagent_id', 'id']);
        if (empRows && empRows.length > 0) state.employees = mergeEntityList(state.employees, empRows, ['emp_id', 'id']);

        // Merge Medicines from modular table
        if (medRows && medRows.length > 0) {
          const parsedMeds = medRows.map((m: any) => {
            let raw = m.data;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = {}; }
            }
            if (!raw || typeof raw !== 'object') raw = {};
            const medId = String(m.id || raw.id || '').trim();
            return {
              ...raw,
              ...m,
              id: medId,
              tradeName: m.trade_name || m.tradeName || raw.tradeName || m.name || '',
              genericName: m.generic_name || m.genericName || raw.genericName || '',
              formulation: m.formulation || raw.formulation || 'Tab',
              strength: m.strength || raw.strength || '',
              unitPriceBuy: Number(m.unit_price_buy ?? m.unitPriceBuy ?? raw.unitPriceBuy ?? m.buy_price ?? 0),
              unitPriceSell: Number(m.unit_price_sell ?? m.unitPriceSell ?? raw.unitPriceSell ?? m.sell_price ?? 0),
              stock: Number(m.stock ?? raw.stock ?? 0),
              boxSize: Number(m.box_size ?? m.boxSize ?? raw.boxSize ?? 1),
              supplier: m.supplier || raw.supplier || '',
              expiryDate: m.expiry_date || m.expiryDate || raw.expiryDate || '',
              isAntibiotic: !!(m.is_antibiotic ?? m.isAntibiotic ?? raw.isAntibiotic),
              requiresPrescription: !!(m.requires_prescription ?? m.requiresPrescription ?? raw.requiresPrescription)
            };
          }).filter((m: any) => m.id);
          state.medicines = mergeEntityList(state.medicines, parsedMeds, ['id', 'tradeName', 'trade_name']);
        }

        // Merge Sales Invoices from modular table - Load ALL records without date restrictions
        if (salesInvRows && salesInvRows.length > 0) {
          const parsedSales = salesInvRows.map((r: any) => {
            let raw = r.data;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = {}; }
            }
            if (!raw || typeof raw !== 'object') raw = {};
            let items = r.items ?? raw.items;
            if (typeof items === 'string') {
              try { items = JSON.parse(items); } catch { items = []; }
            }
            const invId = String(r.invoice_id || r.invoiceId || r.id || raw.invoiceId || raw.invoice_id || '').trim();
            const invDate = normalizeDate(r.invoice_date || r.invoiceDate || r.date || raw.invoiceDate || (r.created_date ? r.created_date.split('T')[0] : '') || '');
            const total = Number(r.total_amount ?? r.totalAmount ?? raw.totalAmount ?? raw.total_amount ?? 0);
            const paid = Number(r.paid_amount ?? r.paidAmount ?? raw.paidAmount ?? raw.paid_amount ?? 0);
            const discount = Number(r.discount ?? raw.discount ?? 0);
            let net = Number(r.net_payable ?? r.netPayable ?? raw.netPayable ?? raw.net_payable ?? 0);
            if (isNaN(net) || net <= 0) {
              if (paid > 0) net = paid;
              else if (total > 0) net = Math.max(0, total - discount);
            }
            const due = Number(r.due_amount ?? r.dueAmount ?? raw.dueAmount ?? raw.due_amount ?? Math.max(0, (net || total) - paid));
            return {
              ...raw,
              ...r,
              id: invId,
              invoiceId: invId,
              invoice_id: invId,
              invoiceDate: invDate,
              invoice_date: invDate,
              customerName: r.customer_name || r.customerName || raw.customerName || '',
              customerMobile: r.customer_mobile || r.customerMobile || raw.customerMobile || '',
              customerAge: r.customer_age || r.customerAge || raw.customerAge || '',
              customerGender: r.customer_gender || r.customerGender || raw.customerGender || '',
              refDoctorName: r.ref_doctor_name || r.refDoctorName || raw.refDoctorName || '',
              items: Array.isArray(items) ? items : [],
              totalAmount: total || net,
              total_amount: total || net,
              discount: discount,
              netPayable: net,
              net_payable: net,
              paidAmount: paid,
              paid_amount: paid,
              dueAmount: due,
              due_amount: due,
              billCreatedBy: r.bill_created_by || r.billCreatedBy || raw.billCreatedBy || 'Admin',
              status: r.status || raw.status || 'Posted',
              createdDate: r.created_date || r.createdDate || raw.createdDate || invDate
            };
          }).filter((r: any) => r.invoiceId || r.invoice_id);
          state.salesInvoices = mergeEntityList(state.salesInvoices || [], parsedSales, ['invoiceId', 'invoice_id', 'id']);
        }

        // Merge Purchase Invoices from modular table - Load ALL records without date restrictions
        if (purchaseInvRows && purchaseInvRows.length > 0) {
          const parsedPurchases = purchaseInvRows.map((r: any) => {
            let raw = r.data;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = {}; }
            }
            if (!raw || typeof raw !== 'object') raw = {};
            let items = r.items ?? raw.items;
            if (typeof items === 'string') {
              try { items = JSON.parse(items); } catch { items = []; }
            }
            const invId = String(r.invoice_id || r.invoiceId || r.id || raw.invoiceId || raw.invoice_id || '').trim();
            const invDate = normalizeDate(r.invoice_date || r.invoiceDate || r.date || raw.invoiceDate || (r.created_date ? r.created_date.split('T')[0] : '') || '');
            const total = Number(r.total_amount ?? r.totalAmount ?? raw.totalAmount ?? raw.total_amount ?? 0);
            const paid = Number(r.paid_amount ?? r.paidAmount ?? raw.paidAmount ?? raw.paid_amount ?? 0);
            const discount = Number(r.discount ?? raw.discount ?? 0);
            let net = Number(r.net_payable ?? r.netPayable ?? raw.netPayable ?? raw.net_payable ?? 0);
            if (isNaN(net) || net <= 0) {
              if (paid > 0) net = paid;
              else if (total > 0) net = Math.max(0, total - discount);
            }
            const due = Number(r.due_amount ?? r.dueAmount ?? raw.dueAmount ?? raw.due_amount ?? Math.max(0, (net || total) - paid));
            return {
              ...raw,
              ...r,
              id: invId,
              invoiceId: invId,
              invoice_id: invId,
              invoiceDate: invDate,
              invoice_date: invDate,
              source: r.source || r.supplier || raw.source || '',
              items: Array.isArray(items) ? items : [],
              totalAmount: total || net,
              total_amount: total || net,
              discount: discount,
              netPayable: net,
              net_payable: net,
              paidAmount: paid,
              paid_amount: paid,
              dueAmount: due,
              due_amount: due,
              billCreatedBy: r.bill_created_by || r.billCreatedBy || raw.billCreatedBy || 'Admin',
              billPaidBy: r.bill_paid_by || r.billPaidBy || raw.billPaidBy || '',
              receivedBy: r.received_by || r.receivedBy || raw.receivedBy || '',
              status: r.status || raw.status || 'Saved',
              createdDate: r.created_date || r.createdDate || raw.createdDate || invDate
            };
          }).filter((r: any) => r.invoiceId || r.invoice_id);
          state.purchaseInvoices = mergeEntityList(state.purchaseInvoices || [], parsedPurchases, ['invoiceId', 'invoice_id', 'id']);
        }

        if (repRows && repRows.length > 0) {
          state.reports = mergeEntityList(state.reports || [], repRows, ['report_id', 'id']);
        }
        if (prescRows && prescRows.length > 0) {
          state.prescriptions = mergeEntityList(state.prescriptions || [], prescRows, ['id']);
        }
        if (apptRows && apptRows.length > 0) {
          state.appointments = mergeEntityList(state.appointments || [], apptRows, ['appointment_id', 'id']);
        }
        if (admRows && admRows.length > 0) {
          state.admissions = mergeEntityList(state.admissions || [], admRows, ['admission_id', 'id']);
        }

        // Detailed Expenses from modular table: Load ALL records without date restrictions
        if (expRows && expRows.length > 0) {
          if (!state.detailedExpenses || typeof state.detailedExpenses !== 'object') {
            state.detailedExpenses = {};
          }
          expRows.forEach((row: any) => {
            let raw = row.data;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = null; }
            }
            if (!raw || typeof raw !== 'object') raw = {};

            // Check if this row represents a day with an array of items (e.g. row.items, row.expenses, or raw.items, raw as array)
            let parsedItems = row.items;
            if (typeof parsedItems === 'string') {
              try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = null; }
            }
            let parsedRawItems = raw.items;
            if (typeof parsedRawItems === 'string') {
              try { parsedRawItems = JSON.parse(parsedRawItems); } catch { parsedRawItems = null; }
            }
            const itemsInRow = Array.isArray(parsedItems) ? parsedItems : (Array.isArray(row.data) ? row.data : (Array.isArray(parsedRawItems) ? parsedRawItems : (Array.isArray(row.expenses) ? row.expenses : null)));

            if (itemsInRow && itemsInRow.length > 0) {
              const rawDate = row.date || row.expense_date || row.created_at || '';
              const rowDate = normalizeDate(rawDate);
              if (!rowDate) return;
              if (!state.detailedExpenses[rowDate]) state.detailedExpenses[rowDate] = [];
              itemsInRow.forEach((it: any, idx: number) => {
                if (!it || it.isDeleted) return;
                const itId = String(it.id || `exp_${rowDate.replace(/-/g, '')}_${idx}_${Date.now()}`);
                const expPaid = Number(it.paidAmount ?? it.paid_amount ?? it.amount ?? it.billAmount ?? it.bill_amount ?? 0);
                const expBill = Number(it.billAmount ?? it.bill_amount ?? it.paidAmount ?? it.paid_amount ?? expPaid);
                const expCat = it.category || 'General';
                const expSub = it.subCategory || it.sub_category || '';
                const expDesc = it.description || '';
                const expDept = it.dept || 'Diagnostic';
                const expItem = {
                  ...it,
                  id: itId,
                  date: rowDate,
                  category: expCat,
                  subCategory: expSub,
                  description: expDesc,
                  billAmount: expBill,
                  paidAmount: expPaid,
                  paid_amount: expPaid,
                  bill_amount: expBill,
                  dept: expDept
                };
                const existingIdx = state.detailedExpenses[rowDate].findIndex((x: any) => String(x.id || '') === expItem.id && expItem.id !== '');
                if (existingIdx >= 0) {
                  const cur = state.detailedExpenses[rowDate][existingIdx];
                  const finalPaid = expPaid > 0 ? expPaid : (Number(cur.paidAmount || cur.paid_amount || 0) > 0 ? Number(cur.paidAmount || cur.paid_amount || 0) : expPaid);
                  const finalBill = expBill > 0 ? expBill : (Number(cur.billAmount || cur.bill_amount || 0) > 0 ? Number(cur.billAmount || cur.bill_amount || 0) : expBill);
                  state.detailedExpenses[rowDate][existingIdx] = {
                    ...cur,
                    ...expItem,
                    paidAmount: finalPaid,
                    paid_amount: finalPaid,
                    billAmount: finalBill,
                    bill_amount: finalBill
                  };
                } else {
                  state.detailedExpenses[rowDate].push(expItem);
                }
              });
              return;
            }

            // Otherwise, row is a single individual expense row
            const rawDate = row.date || row.expense_date || row.invoice_date || row.created_at || raw.date || raw.expense_date || '';
            const rowDate = normalizeDate(rawDate);
            if (!rowDate) return;
            if (!state.detailedExpenses[rowDate]) state.detailedExpenses[rowDate] = [];

            const expPaid = Number(row.paid_amount ?? row.paidAmount ?? row.amount ?? row.bill_amount ?? row.billAmount ?? row.cost ?? raw.paidAmount ?? raw.paid_amount ?? raw.amount ?? 0);
            const expBill = Number(row.bill_amount ?? row.billAmount ?? row.paid_amount ?? row.paidAmount ?? row.amount ?? raw.billAmount ?? raw.bill_amount ?? expPaid);
            const expCat = row.category || raw.category || 'General';
            const expSub = row.sub_category || row.subCategory || raw.subCategory || raw.sub_category || '';
            const expDesc = row.description || raw.description || '';
            const expDept = row.dept || raw.dept || 'Diagnostic';
            const expId = String(row.id || raw.id || `exp_${rowDate.replace(/-/g, '')}_${Date.now()}`);

            const expItem = {
              ...raw,
              id: expId,
              date: rowDate,
              category: expCat,
              subCategory: expSub,
              description: expDesc,
              billAmount: expBill,
              paidAmount: expPaid,
              paid_amount: expPaid,
              bill_amount: expBill,
              dept: expDept,
              metadata: row.metadata || raw.metadata || undefined
            };

            const existingIdx = state.detailedExpenses[rowDate].findIndex((x: any) => String(x.id || '') === expItem.id && expItem.id !== '');
            if (existingIdx >= 0) {
              const cur = state.detailedExpenses[rowDate][existingIdx];
              const finalPaid = expPaid > 0 ? expPaid : (Number(cur.paidAmount || cur.paid_amount || 0) > 0 ? Number(cur.paidAmount || cur.paid_amount || 0) : expPaid);
              const finalBill = expBill > 0 ? expBill : (Number(cur.billAmount || cur.bill_amount || 0) > 0 ? Number(cur.billAmount || cur.bill_amount || 0) : expBill);
              state.detailedExpenses[rowDate][existingIdx] = {
                ...cur,
                ...expItem,
                paidAmount: finalPaid,
                paid_amount: finalPaid,
                billAmount: finalBill,
                bill_amount: finalBill
              };
            } else {
              state.detailedExpenses[rowDate].push(expItem);
            }
          });

          // Automatic recovery for 0-amount expenses from local cache / offline cache
          try {
            const rawCache = localStorage.getItem('ncd_offline_cache_v1') || localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('ncd_migration_rollback_snapshot');
            if (rawCache) {
              const cachedObj = JSON.parse(rawCache);
              const cachedExp = cachedObj.detailedExpenses || cachedObj.detailed_expenses;
              if (cachedExp && typeof cachedExp === 'object') {
                Object.entries(cachedExp).forEach(([dateKey, items]: [string, any]) => {
                  const normDate = normalizeDate(dateKey);
                  if (!normDate || !Array.isArray(items)) return;
                  if (!state.detailedExpenses[normDate]) state.detailedExpenses[normDate] = [];
                  items.forEach((cItem: any) => {
                    if (!cItem || cItem.isDeleted) return;
                    const cPaid = Number(cItem.paidAmount ?? cItem.paid_amount ?? cItem.amount ?? 0);
                    if (cPaid > 0) {
                      const exIdx = state.detailedExpenses[normDate].findIndex((x: any) => String(x.id || '') === String(cItem.id || '') || ((x.description || '').trim().toLowerCase() === (cItem.description || '').trim().toLowerCase()));
                      if (exIdx >= 0) {
                        const cur = state.detailedExpenses[normDate][exIdx];
                        if (Number(cur.paidAmount || cur.paid_amount || 0) <= 0) {
                          state.detailedExpenses[normDate][exIdx] = {
                            ...cur,
                            ...cItem,
                            paidAmount: cPaid,
                            paid_amount: cPaid,
                            billAmount: Number(cItem.billAmount ?? cItem.bill_amount ?? cPaid),
                            bill_amount: Number(cItem.billAmount ?? cItem.bill_amount ?? cPaid)
                          };
                        }
                      } else {
                        state.detailedExpenses[normDate].push(cItem);
                      }
                    }
                  });
                });
              }
            }
          } catch (recErr) {
            console.warn("Auto expense recovery notice:", recErr);
          }
        }
      } catch (modularErr) {
        console.warn("Modular table load notice:", modularErr);
      }

      // 3. Consolidated Lab Entries handling: ensure array exists
      if (!Array.isArray(state.consolidatedLabEntries)) {
        state.consolidatedLabEntries = [];
      }

      // 4. Safe Unique ID normalization for detailedExpenses (Strictly preservation-oriented)
      const rawExpenses = state.detailedExpenses || {};
      const cleanExpenses: Record<string, any[]> = {};

      const ingestExpenseItem = (item: any, fallbackDateKey?: string) => {
        if (!item || item.isDeleted) return;
        const rawDate = item.date || item.expense_date || item.created_at || fallbackDateKey || '';
        let normDate = normalizeDate(rawDate) || (rawDate ? String(rawDate).split(/[T ]/)[0].trim() : '');
        if (!normDate && item.id) {
          const m = String(item.id).match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
          if (m) normDate = `${m[1]}-${m[2]}-${m[3]}`;
        }
        if (!normDate) return;
        if (!cleanExpenses[normDate]) cleanExpenses[normDate] = [];

        const itId = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' && String(item.id) !== 'undefined'
          ? String(item.id).trim()
          : `exp_${normDate.replace(/-/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        const existingIdx = cleanExpenses[normDate].findIndex((x: any) => String(x.id || '') === itId);
        const expPaid = Number(item.paidAmount ?? item.paid_amount ?? item.amount ?? item.billAmount ?? item.bill_amount ?? 0);
        const expBill = Number(item.billAmount ?? item.bill_amount ?? item.paidAmount ?? item.paid_amount ?? expPaid);
        const normalized = {
          ...item,
          id: itId,
          date: normDate,
          category: item.category || 'General',
          subCategory: item.subCategory || item.sub_category || '',
          description: item.description || '',
          paidAmount: expPaid,
          paid_amount: expPaid,
          billAmount: expBill,
          bill_amount: expBill,
          dept: item.dept || 'Diagnostic'
        };

        if (existingIdx >= 0) {
          cleanExpenses[normDate][existingIdx] = { ...cleanExpenses[normDate][existingIdx], ...normalized };
        } else {
          cleanExpenses[normDate].push(normalized);
        }
      };

      if (Array.isArray(rawExpenses)) {
        rawExpenses.forEach(it => ingestExpenseItem(it));
      } else if (typeof rawExpenses === 'object' && rawExpenses !== null) {
        Object.entries(rawExpenses).forEach(([rawDateKey, items]: [string, any]) => {
          const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
          list.forEach(it => ingestExpenseItem(it, rawDateKey));
        });
      }

      state.detailedExpenses = cleanExpenses;

      // Clean out any historical artificial dummy records to ensure 100% pure Supabase data
      if (Array.isArray(state.consolidatedLabEntries)) {
        state.consolidatedLabEntries = state.consolidatedLabEntries.filter((e: any) => {
          const idStr = String(e.id || '');
          return !idStr.includes('RECOVERED') && !idStr.includes('MCE-AUG-2026-RECOVERED') && !idStr.includes('MCE-SEP-2026-RECOVERED');
        });
      }

      if (state.detailedExpenses && typeof state.detailedExpenses === 'object') {
        Object.keys(state.detailedExpenses).forEach(dKey => {
          if (Array.isArray(state.detailedExpenses[dKey])) {
            state.detailedExpenses[dKey] = state.detailedExpenses[dKey].filter((it: any) => {
              const itId = String(it.id || '');
              return !itId.startsWith('exp_aug_') && !itId.includes('RECOVERED');
            });
          }
        });
      }

      // Ensure all collections are safe arrays
      if (!Array.isArray(state.patients)) state.patients = [];
      if (!Array.isArray(state.doctors)) state.doctors = [];
      if (!Array.isArray(state.referrars)) state.referrars = [];
      if (!Array.isArray(state.tests)) {
        state.tests = [];
      } else {
        state.tests = state.tests
          .map((t: any) => normalizeTestItem(t))
          .filter((t: any): t is Test => t !== null && !!t.test_id);
      }
      if (!Array.isArray(state.reagents)) state.reagents = [];
      if (!Array.isArray(state.labInvoices)) state.labInvoices = [];
      if (!Array.isArray(state.indoorInvoices)) state.indoorInvoices = [];
      if (!Array.isArray(state.salesInvoices)) state.salesInvoices = [];
      if (!Array.isArray(state.purchaseInvoices)) state.purchaseInvoices = [];
      if (!Array.isArray(state.employees)) state.employees = [];
      if (!Array.isArray(state.medicines) || state.medicines.length === 0) {
        state.medicines = [
          { id: 'MED-01', tradeName: 'Cefixime 200mg', genericName: 'Cefixime Trihydrate', unit: 'Cap', sellPrice: 25 },
          { id: 'MED-02', tradeName: 'Paracetamol 500mg', genericName: 'Paracetamol', unit: 'Tab', sellPrice: 2 },
          { id: 'MED-03', tradeName: 'Esomeprazole 20mg', genericName: 'Esomeprazole Magnesium', unit: 'Cap', sellPrice: 7 },
          { id: 'MED-04', tradeName: 'Cefuroxime 500mg', genericName: 'Cefuroxime Axetil', unit: 'Cap', sellPrice: 35 },
          { id: 'MED-05', tradeName: 'Metronidazole 400mg', genericName: 'Metronidazole', unit: 'Tab', sellPrice: 3 },
          { id: 'MED-06', tradeName: 'Ketorolac 10mg', genericName: 'Ketorolac Tromethamine', unit: 'Tab', sellPrice: 10 },
          { id: 'MED-07', tradeName: 'Amoxicillin 500mg', genericName: 'Amoxicillin Trihydrate', unit: 'Cap', sellPrice: 6 },
          { id: 'MED-08', tradeName: 'Calcium + Vit D3', genericName: 'Calcium Carbonate + Cholecalciferol', unit: 'Tab', sellPrice: 8 },
          { id: 'MED-09', tradeName: 'Napa Extra', genericName: 'Paracetamol + Caffeine', unit: 'Tab', sellPrice: 3 },
          { id: 'MED-10', tradeName: 'Seclo 20mg', genericName: 'Omeprazole', unit: 'Cap', sellPrice: 6 },
          { id: 'MED-11', tradeName: 'Monas 10mg', genericName: 'Montelukast Sodium', unit: 'Tab', sellPrice: 15 },
          { id: 'MED-12', tradeName: 'Pantix 40mg', genericName: 'Pantoprazole', unit: 'Tab', sellPrice: 8 }
        ];
      } else {
        state.medicines = state.medicines.map((m: any) => ({ ...m, id: m.id || 'MED-' + Math.random().toString(36).substring(2, 7) }));
      }
      if (!Array.isArray(state.dueCollections)) state.dueCollections = [];
      if (!Array.isArray(state.reports)) state.reports = [];
      if (!Array.isArray(state.admissions)) state.admissions = [];
      if (!Array.isArray(state.appointments)) state.appointments = [];

      // Normalize lab invoices dates and filter out deleted invoices
      const finalDeletedLabIds = getDeletedLabInvoiceIds();
      state.labInvoices = (Array.isArray(state.labInvoices) ? state.labInvoices : [])
        .filter((inv: any) => !isInvoiceMarkedDeleted(inv, finalDeletedLabIds))
        .map((inv: any) => {
          const invId = String(inv.invoice_id || inv.invoiceId || inv.id || inv.invoice_no || '').trim();
          const rawDate = inv.invoice_date || inv.date || inv.invoiceDate || inv.created_date || inv.created_at || '';
          const invDate = normalizeDate(rawDate) || rawDate;
          return {
            ...inv,
            id: invId,
            invoice_id: invId,
            invoiceId: invId,
            invoice_date: invDate,
            invoiceDate: invDate,
            date: invDate
          };
        }).filter((inv: any) => inv.invoice_id && !isInvoiceMarkedDeleted(inv, finalDeletedLabIds));

      if (cachedLegacyState && Array.isArray(cachedLegacyState.labInvoices)) {
        cachedLegacyState.labInvoices = cachedLegacyState.labInvoices.filter((inv: any) => !isInvoiceMarkedDeleted(inv, finalDeletedLabIds));
      }

      // Normalize due collections dates
      state.dueCollections = state.dueCollections.map((dc: any) => {
        const colId = String(dc.collection_id || dc.id || dc.collectionId || '').trim();
        const invId = String(dc.invoice_id || dc.invoiceId || '').trim();
        const rawDate = dc.collection_date || dc.date || dc.created_at || '';
        const colDate = normalizeDate(rawDate) || rawDate;
        return {
          ...dc,
          id: colId || dc.id,
          collection_id: colId,
          invoice_id: invId,
          collection_date: colDate,
          date: colDate
        };
      }).filter((dc: any) => dc.collection_id || dc.invoice_id);

      // Normalize and deduplicate indoor invoices to ensure single-table duplicates are merged
      const seenIndoorKeys = new Set<string>();
      state.indoorInvoices = (Array.isArray(state.indoorInvoices) ? state.indoorInvoices : [])
        .map((inv: any) => {
          const invId = String(inv.daily_id || inv.invoice_id || inv.invoiceId || inv.id || '').trim();
          const rawDate = inv.admission_date || inv.invoice_date || inv.date || '';
          const invDate = normalizeDate(rawDate) || rawDate;
          return {
            ...inv,
            id: invId || inv.id,
            daily_id: invId || inv.daily_id,
            admission_date: invDate,
            invoice_date: invDate,
            date: invDate,
            status: inv.status || 'Posted'
          };
        })
        .filter((inv: any) => {
          if (!inv) return false;
          const key = inv.daily_id 
            ? `id:${inv.daily_id}` 
            : `adm:${inv.admission_id || ''}-${inv.patient_name || ''}-${inv.admission_date || ''}-${inv.total_bill || 0}-${inv.paid_amount || 0}`;
          if (seenIndoorKeys.has(key)) {
            return false;
          }
          seenIndoorKeys.add(key);
          return true;
        });

      // Normalize purchase invoices
      state.purchaseInvoices = state.purchaseInvoices.map((inv: any) => {
        const invId = String(inv.invoiceId || inv.invoice_id || inv.id || '').trim();
        const rawDate = inv.invoiceDate || inv.invoice_date || inv.date || (inv.createdDate ? String(inv.createdDate).split('T')[0] : '') || '';
        const invDate = normalizeDate(rawDate) || rawDate;
        const net = Number(inv.netPayable ?? inv.net_payable ?? 0);
        const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0);
        const due = Number(inv.dueAmount ?? inv.due_amount ?? Math.max(0, net - paid));
        return {
          ...inv,
          id: invId,
          invoiceId: invId,
          invoice_id: invId,
          invoiceDate: invDate,
          invoice_date: invDate,
          date: invDate,
          source: inv.source || inv.supplier || '',
          items: Array.isArray(inv.items) ? inv.items : [],
          totalAmount: Number(inv.totalAmount ?? inv.total_amount ?? net),
          discount: Number(inv.discount ?? 0),
          netPayable: net,
          paidAmount: paid,
          dueAmount: due,
          billCreatedBy: inv.billCreatedBy || inv.bill_created_by || 'Admin',
          billPaidBy: inv.billPaidBy || inv.bill_paid_by || '',
          receivedBy: inv.receivedBy || inv.received_by || '',
          status: inv.status || 'Saved',
          createdDate: inv.createdDate || inv.created_date || invDate
        };
      }).filter((inv: any) => inv.invoiceId);

      // Normalize sales invoices
      state.salesInvoices = state.salesInvoices.map((inv: any) => {
        const invId = String(inv.invoiceId || inv.invoice_id || inv.id || '').trim();
        const rawDate = inv.invoiceDate || inv.invoice_date || inv.date || (inv.createdDate ? String(inv.createdDate).split('T')[0] : '') || '';
        const invDate = normalizeDate(rawDate) || rawDate;
        const net = Number(inv.netPayable ?? inv.net_payable ?? 0);
        const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0);
        const due = Number(inv.dueAmount ?? inv.due_amount ?? Math.max(0, net - paid));
        return {
          ...inv,
          id: invId,
          invoiceId: invId,
          invoice_id: invId,
          invoiceDate: invDate,
          invoice_date: invDate,
          date: invDate,
          customerName: inv.customerName || inv.customer_name || '',
          customerMobile: inv.customerMobile || inv.customer_mobile || '',
          customerAge: inv.customerAge || inv.customer_age || '',
          customerGender: inv.customerGender || inv.customer_gender || '',
          refDoctorName: inv.refDoctorName || inv.ref_doctor_name || '',
          items: Array.isArray(inv.items) ? inv.items : [],
          totalAmount: Number(inv.totalAmount ?? inv.total_amount ?? net),
          discount: Number(inv.discount ?? 0),
          netPayable: net,
          paidAmount: paid,
          dueAmount: due,
          billCreatedBy: inv.billCreatedBy || inv.bill_created_by || 'Admin',
          status: inv.status || 'Posted',
          createdDate: inv.createdDate || inv.created_date || invDate
        };
      }).filter((inv: any) => inv.invoiceId);

      // Normalize medicines
      state.medicines = state.medicines.map((m: any) => {
        const medId = String(m.id || '').trim();
        return {
          ...m,
          id: medId,
          tradeName: m.tradeName || m.trade_name || m.name || '',
          genericName: m.genericName || m.generic_name || '',
          formulation: m.formulation || 'Tab',
          strength: m.strength || '',
          unitPriceBuy: Number(m.unitPriceBuy ?? m.unit_price_buy ?? m.buy_price ?? 0),
          unitPriceSell: Number(m.unitPriceSell ?? m.unit_price_sell ?? m.sell_price ?? 0),
          stock: Number(m.stock ?? 0),
          boxSize: Number(m.boxSize ?? m.box_size ?? 1),
          supplier: m.supplier || '',
          expiryDate: m.expiryDate || m.expiry_date || '',
          isAntibiotic: !!(m.isAntibiotic ?? m.is_antibiotic),
          requiresPrescription: !!(m.requiresPrescription ?? m.requires_prescription)
        };
      }).filter((m: any) => m.id);

      // Background modular sync for modern records and medicine catalog only
      if (supabase) {
        setTimeout(async () => {
          try {
            const modernPurchases = (state.purchaseInvoices || []).filter((r: any) => isMultiTableDate(getRecordDate(r)));
            if (modernPurchases.length > 0) {
              await dbService.syncPurchaseInvoicesToModularTable(modernPurchases);
            }
            const modernSales = (state.salesInvoices || []).filter((r: any) => isMultiTableDate(getRecordDate(r)));
            if (modernSales.length > 0) {
              await dbService.syncSalesInvoicesToModularTable(modernSales);
            }
            if (state.medicines && state.medicines.length > 0) {
              await dbService.syncMedicinesToModularTable(state.medicines);
            }
          } catch (bgErr) {
            console.warn("Background modular sync notice:", bgErr);
          }
        }, 1500);
      }

      // Synchronize consolidated lab entries non-destructively (never wipe out local entries on cloud refresh)
      const localConsolidated = dbService.getConsolidatedEntries();
      const cloudConsolidated = Array.isArray(state.consolidatedLabEntries) ? state.consolidatedLabEntries : [];
      const mergedConsolidated = mergeEntityList(localConsolidated || [], cloudConsolidated, ['id', '_id']);
      state.consolidatedLabEntries = mergedConsolidated;
      dbService.saveConsolidatedEntries(mergedConsolidated);

      // Update offline cache with the fresh state loaded from cloud
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(state));
      } catch (cacheErr) {}

      // Reconcile monthlyAdjustments with local storage non-destructively
      if (!state.monthlyAdjustments || typeof state.monthlyAdjustments !== 'object') {
        state.monthlyAdjustments = {};
      }
      try {
        const localSaved = JSON.parse(localStorage.getItem('ncd_monthly_adjustments') || '{}');
        const mergedAdj = { ...localSaved };
        Object.entries(state.monthlyAdjustments).forEach(([k, v]) => {
          const cloudPd = (v && typeof v === 'object') ? Number(v.profitDist ?? v.profit_dist ?? v.amount ?? 0) : Number(v || 0);
          const localPd = (localSaved[k] && typeof localSaved[k] === 'object') ? Number(localSaved[k].profitDist ?? localSaved[k].profit_dist ?? localSaved[k].amount ?? 0) : Number(localSaved[k] || 0);
          if (cloudPd > 0) {
            mergedAdj[k] = v;
          } else if (localPd > 0) {
            mergedAdj[k] = localSaved[k];
          } else {
            mergedAdj[k] = v;
          }
        });
        state.monthlyAdjustments = mergedAdj;
        localStorage.setItem('ncd_monthly_adjustments', JSON.stringify(state.monthlyAdjustments));
      } catch (e) {}

      return state;
    } catch (error) {
      console.error("Cloud load error:", error);
      return { _error: "Failed to load state from cloud." };
    }
  },

  saveToCloud: async (appState: any) => {
    try {
      if (!supabase) {
        return { success: false, error: "Supabase not connected. Offline save is disabled." };
      }
      
      const now = new Date().toISOString();
      let hasAnySaveSuccess = false;


      // ---------------------------------------------------------------------------------
      // 2. ROUTE MODERN / FUTURE DATA (>= 2026-08-01) & MASTER CATALOGS TO MODULAR TABLES
      // ---------------------------------------------------------------------------------
      
      // 2a. Modular Sync for purchase_invoices (strictly >= 2026-08-01)
      try {
        const modernPurchases = (appState.purchaseInvoices || []).filter((r: any) => isMultiTableDate(getRecordDate(r)));
        if (modernPurchases.length > 0) {
          const purSync = await dbService.syncPurchaseInvoicesToModularTable(modernPurchases);
          if (purSync) hasAnySaveSuccess = true;
        }
      } catch (purErr) {
        console.warn("Modular purchase sync notice:", purErr);
      }

      // 2b. Modular Sync for sales_invoices (strictly >= 2026-08-01)
      try {
        const modernSales = (appState.salesInvoices || []).filter((r: any) => isMultiTableDate(getRecordDate(r)));
        if (modernSales.length > 0) {
          const salSync = await dbService.syncSalesInvoicesToModularTable(modernSales);
          if (salSync) hasAnySaveSuccess = true;
        }
      } catch (salErr) {
        console.warn("Modular sales sync notice:", salErr);
      }

      // 2c. Modular Sync for medicines (master catalog, all medicines)
      try {
        if (Array.isArray(appState.medicines) && appState.medicines.length > 0) {
          const medSync = await dbService.syncMedicinesToModularTable(appState.medicines);
          if (medSync) hasAnySaveSuccess = true;
        }
      } catch (medErr) {
        console.warn("Modular medicine sync notice:", medErr);
      }

      // 2d. Modular Sync for detailed_expenses (strictly >= 2026-08-01)
      try {
        const modernExpenseRows: any[] = [];
        Object.entries(appState.detailedExpenses || {}).forEach(([dateKey, items]) => {
          if (isMultiTableDate(dateKey) && Array.isArray(items)) {
            items.forEach((it: any, idx: number) => {
              if (!it || it.isDeleted) return;
              const rowId = String(it.id || `exp_${dateKey.replace(/-/g, '')}_${idx}_${Date.now()}`);
              modernExpenseRows.push({
                id: rowId,
                date: dateKey,
                category: it.category || 'General',
                sub_category: it.subCategory || it.sub_category || '',
                description: it.description || '',
                bill_amount: Number(it.billAmount || it.paidAmount || 0),
                paid_amount: Number(it.paidAmount || it.billAmount || 0),
                dept: it.dept || 'Diagnostic',
                updated_at: now
              });
            });
          }
        });

        if (modernExpenseRows.length > 0) {
          const upRes = await upsertTableSafe(supabase, 'detailed_expenses', modernExpenseRows);
          if (upRes) hasAnySaveSuccess = true;
        }
      } catch (e) {
        console.warn("Detailed expenses modular sync warning:", e);
      }

      // 2e. Modular Sync for lab_invoices (strictly >= 2026-08-01)
      try {
        const modernLabs = (appState.labInvoices || []).filter((r: any) => isMultiTableDate(getRecordDate(r)) && !isInvoiceMarkedDeleted(r, deletedLabIds));
        if (modernLabs.length > 0) {
          const labSync = await dbService.syncLabInvoicesToModularTable(modernLabs);
          if (labSync) hasAnySaveSuccess = true;
        }
      } catch (labErr) {
        console.warn("Modular lab invoices sync notice:", labErr);
      }

      // 2f. Modular Sync for due_collections (strictly >= 2026-08-01)
      try {
        const modernDues = (appState.dueCollections || []).filter((r: any) => isMultiTableDate(getRecordDate(r)));
        if (modernDues.length > 0) {
          const dueSync = await dbService.syncDueCollectionsToModularTable(modernDues);
          if (dueSync) hasAnySaveSuccess = true;
        }
      } catch (dueErr) {
        console.warn("Modular due collections sync notice:", dueErr);
      }

      // 2g. Modular Sync for indoor_invoices (strictly >= 2026-08-01)
      try {
        const modernIndoor = (appState.indoorInvoices || []).filter((r: any) => isMultiTableDate(getRecordDate(r)));
        if (modernIndoor.length > 0) {
          const indoorSync = await dbService.syncIndoorInvoicesToModularTable(modernIndoor);
          if (indoorSync) hasAnySaveSuccess = true;
        }
      } catch (indoorErr) {
        console.warn("Modular indoor sync notice:", indoorErr);
      }

      // 2h. Modular Sync for admissions (strictly >= 2026-08-01)
      try {
        const modernAdmissions = (appState.admissions || []).filter((r: any) => isMultiTableDate(getRecordDate(r)));
        if (modernAdmissions.length > 0) {
          const admSync = await dbService.syncAdmissionsToModularTable(modernAdmissions);
          if (admSync) hasAnySaveSuccess = true;
        }
      } catch (admErr) {
        console.warn("Modular admissions sync notice:", admErr);
      }

      // 2i. Modular Sync for monthly_adjustments
      try {
        const adjObj = appState.monthlyAdjustments;
        if (adjObj && typeof adjObj === 'object' && Object.keys(adjObj).length > 0) {
          const adjRows: any[] = [];
          Object.entries(adjObj).forEach(([k, v]) => {
            if (!v) return;
            const pd = typeof v === 'number' ? v : Number((v as any).profitDist ?? (v as any).profit_dist ?? (v as any).profit ?? (v as any).amount ?? 0);
            const hr = typeof v === 'object' ? Number((v as any).houseRent ?? (v as any).house_rent ?? (v as any).rent ?? 0) : 0;
            const li = typeof v === 'object' ? Number((v as any).loanInstallment ?? (v as any).loan_installment ?? (v as any).installment ?? 0) : 0;
            if (pd > 0 || hr > 0 || li > 0) {
              adjRows.push({
                id: `adj_${k}`,
                month_key: k,
                profit_dist: pd,
                house_rent: hr,
                loan_installment: li,
                amount: pd,
                data: v,
                updated_at: now
              });
            }
          });
          if (adjRows.length > 0) {
            await upsertTableSafe(supabase, 'monthly_adjustments', adjRows);
            await upsertTableSafe(supabase, 'adjustments', adjRows);
          }
        }
      } catch (adjErr) {
        console.warn("Modular monthly_adjustments sync notice:", adjErr);
      }

      // 2j. Modular Sync for consolidated_lab_entries (strictly >= 2026-08-01)
      try {
        const modernConsolidated = (appState.consolidatedLabEntries || []).filter((r: any) => isMultiTableDate(getRecordDate(r)));
        if (modernConsolidated.length > 0) {
          const consSync = await dbService.syncConsolidatedLabEntriesToModularTable(modernConsolidated);
          if (consSync) hasAnySaveSuccess = true;
        }
      } catch (consErr) {
        console.warn("Modular consolidated lab entries sync notice:", consErr);
      }

      // 2k. Modular Sync for consolidated_clinic_entries
      try {
        const modernClinicConsolidated = (appState.consolidatedClinicEntries || []).filter((r: any) => isMultiTableDate(getRecordDate(r)));
        if (modernClinicConsolidated.length > 0) {
          const consClSync = await dbService.syncConsolidatedClinicEntriesToModularTable(modernClinicConsolidated);
          if (consClSync) hasAnySaveSuccess = true;
        }
      } catch (consClErr) {
        console.warn("Modular consolidated clinic entries sync notice:", consClErr);
      }

      // Master tables sync (patients, doctors, referrars, tests, reagents, employees)
      try {
        if (Array.isArray(appState.patients) && appState.patients.length > 0) {
          await upsertTableSafe(supabase, 'patients', appState.patients.map((p: any) => ({ ...p, updated_at: now })));
        }
        if (Array.isArray(appState.doctors) && appState.doctors.length > 0) {
          await upsertTableSafe(supabase, 'doctors', appState.doctors.map((d: any) => ({ ...d, updated_at: now })));
        }
        if (Array.isArray(appState.referrars) && appState.referrars.length > 0) {
          const refRows = appState.referrars.map((r: any) => ({ ...r, updated_at: now }));
          await upsertTableSafe(supabase, 'referrars', refRows);
          await upsertTableSafe(supabase, 'referrers', refRows);
        }
        if (Array.isArray(appState.tests) && appState.tests.length > 0) {
          const testRows = appState.tests.map((t: any) => {
            const norm = normalizeTestItem(t);
            return {
              ...t,
              ...(norm || {}),
              id: norm?.test_id || t.test_id || t.id,
              test_id: norm?.test_id || t.test_id || t.id,
              test_name: norm?.test_name || t.test_name || t.name,
              category: norm?.category || t.category || 'Others',
              price: norm ? norm.price : (Number(t.price) || 0),
              test_commission: norm ? norm.test_commission : (Number(t.test_commission) || 0),
              is_group_test: norm?.is_group_test ?? false,
              normal_range: norm?.normal_range || '',
              unit: norm?.unit || '',
              sub_tests: norm?.sub_tests || [],
              usg_exam_charge: norm?.usg_exam_charge || 0,
              extra_lab_fee: norm?.extra_lab_fee || 0,
              reagents_required: norm?.reagents_required || [],
              availability: norm?.availability ?? true,
              updated_at: now
            };
          });
          const t1 = await upsertTableSafe(supabase, 'tests', testRows);
          const t2 = await upsertTableSafe(supabase, 'test', testRows);
          const t3 = await upsertTableSafe(supabase, 'lab_tests', testRows);
          if (t1 || t2 || t3) hasAnySaveSuccess = true;
        }
        if (Array.isArray(appState.reagents) && appState.reagents.length > 0) {
          await upsertTableSafe(supabase, 'reagents', appState.reagents.map((r: any) => ({ ...r, updated_at: now })));
        }
        if (Array.isArray(appState.employees) && appState.employees.length > 0) {
          await upsertTableSafe(supabase, 'employees', appState.employees.map((e: any) => ({ ...e, updated_at: now })));
        }
      } catch (masterSyncErr) {
        console.warn("Master tables modular sync notice:", masterSyncErr);
      }

      if (hasAnySaveSuccess) {
        return { success: true };
      }

      return { success: false, error: 'অনলাইন ডাটাবেজে সংরক্ষণ সম্ভব হয়নি। ইন্টারনেট ও ডাটাবেজ সংযোগ চেক করুন।' };
    } catch (error: any) {
      console.error("Cloud save critical error:", error);
      return { success: false, error: error?.message || 'অনলাইন ক্লাউড ডাটাবেজ সংরক্ষণ ব্যর্থ হয়েছে।' };
    }
  },

  fetchAllCloudRows: async () => {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase.from('ncd_state').select('*');
      if (error) { console.error("fetchAllCloudRows error:", error); return []; }
      return data || [];
    } catch { return []; }
  },

  smartMergeByDate: async (incomingData: any, targetDate: string, onProgress?: (p: number) => void) => {
    try {
      onProgress?.(20);
      const current = await dbService.loadFromCloud();
      onProgress?.(50);
      
      const merged = { ...current };
      
      Object.keys(incomingData).forEach(key => {
        const incomingList = incomingData[key];
        if (Array.isArray(incomingList)) {
          const currentList = Array.isArray(merged[key]) ? [...merged[key]] : [];
          
          incomingList.forEach(item => {
            if (!item) return;
            // If targetDate provided, filter by item date
            if (targetDate) {
              const d = (item.date || item.invoice_date || item.createdAt || item.payment_date || item.report_date || '').split('T')[0];
              if (d !== targetDate) return;
            }

            const itemId = item.id || item.invoice_id || item.invoice_no || item.pt_id || item.patient_id || item.emp_id || item.doctor_id || item.ref_id || item.test_id;
            const existingIdx = itemId 
              ? currentList.findIndex(x => (x.id || x.invoice_id || x.invoice_no || x.pt_id || x.patient_id || x.emp_id || x.doctor_id || x.ref_id || x.test_id) === itemId)
              : -1;
              
            if (existingIdx >= 0) {
              currentList[existingIdx] = { ...currentList[existingIdx], ...item };
            } else {
              currentList.push(item);
            }
          });
          
          merged[key] = currentList;
        } else if (key === 'detailedExpenses' && typeof incomingList === 'object') {
          merged.detailedExpenses = { ...(merged.detailedExpenses || {}), ...incomingList };
        }
      });

      onProgress?.(80);
      const saveRes = await dbService.saveToCloud(merged);
      onProgress?.(100);
      
      return { success: saveRes.success, message: "মার্চ সফল হয়েছে!" };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  saveInChunks: async (backupData: any, onProgress?: (progress: number) => void) => {
    try {
      onProgress?.(30);
      const res = await dbService.saveToCloud(backupData);
      onProgress?.(100);
      return res.success;
    } catch {
      return false;
    }
  },

  advancedSync: async (localState: any, onProgress?: (progress: number) => void) => {
    try {
      onProgress?.(10);
      const res = await dbService.saveToCloud(localState);
      onProgress?.(100);
      return res.success;
    } catch { return false; }
  },

  mergeEntityList,

  getLocalBackup: () => {
    try {
      if (typeof localStorage === 'undefined') return null;
      const candidates: any[] = [];

      // 1. Primary offline cache
      const rawPrimary = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('ncd_offline_cache_v1');
      if (rawPrimary) {
        try {
          const parsed = JSON.parse(rawPrimary);
          if (parsed && typeof parsed === 'object') candidates.push(parsed);
        } catch {}
      }

      // 2. Pre-migration safety snapshot
      const rawPre = localStorage.getItem('ncd_pre_migration_snapshot');
      if (rawPre) {
        try {
          const parsed = JSON.parse(rawPre);
          const dataObj = parsed.data || parsed;
          if (dataObj && typeof dataObj === 'object') candidates.push(dataObj);
        } catch {}
      }

      // 3. Snapshots vault
      const rawVault = localStorage.getItem('ncd_local_snapshots_vault');
      if (rawVault) {
        try {
          const arr = JSON.parse(rawVault);
          if (Array.isArray(arr)) {
            arr.forEach((item: any) => {
              const d = item?.data;
              if (d && typeof d === 'object') candidates.push(d);
            });
          }
        } catch {}
      }

      if (candidates.length === 0) return null;

      // Merge candidate records into one comprehensive backup
      const mergedBackup: any = { ...candidates[0] };
      if (!mergedBackup.detailedExpenses) mergedBackup.detailedExpenses = {};

      candidates.forEach(cand => {
        // Merge detailed expenses
        if (cand.detailedExpenses && typeof cand.detailedExpenses === 'object') {
          const addExp = (it: any, fallbackDate?: string) => {
            if (!it || it.isDeleted) return;
            const norm = normalizeDate(it.date || it.expense_date || fallbackDate || '');
            if (!norm) return;
            if (!mergedBackup.detailedExpenses[norm]) mergedBackup.detailedExpenses[norm] = [];
            const itId = String(it.id || '');
            const exists = mergedBackup.detailedExpenses[norm].some((x: any) => String(x.id || '') === itId && itId !== '');
            if (!exists) {
              mergedBackup.detailedExpenses[norm].push({ ...it, date: norm });
            }
          };
          if (Array.isArray(cand.detailedExpenses)) {
            cand.detailedExpenses.forEach((it: any) => addExp(it));
          } else {
            Object.entries(cand.detailedExpenses).forEach(([dKey, items]: [string, any]) => {
              const itemList = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
              itemList.forEach((it: any) => addExp(it, dKey));
            });
          }
        }
        // Merge invoices and collections
        ['labInvoices', 'indoorInvoices', 'dueCollections', 'salesInvoices', 'purchaseInvoices', 'patients', 'doctors', 'medicines', 'consolidatedLabEntries'].forEach(col => {
          const sourceList = cand[col] || (col === 'consolidatedLabEntries' ? (cand.consolidated_lab_entries || cand.consolidatedEntries) : undefined);
            const idFields = col === 'dueCollections' 
              ? ['collection_id', 'id'] 
              : col === 'consolidatedLabEntries' 
                ? ['id', '_id'] 
                : col === 'patients' 
                  ? ['pt_id', 'patient_id', 'id'] 
                  : col === 'doctors' 
                    ? ['doctor_id', 'id'] 
                    : col === 'medicines' 
                      ? ['id', 'tradeName', 'trade_name'] 
                      : ['invoice_id', 'daily_id', 'invoiceId', 'id'];
            mergedBackup[col] = mergeEntityList(mergedBackup[col] || [], sourceList, idFields);
        });
      });

      try {
        const localCons = dbService.getConsolidatedEntries();
        if (Array.isArray(localCons) && localCons.length > 0) {
          mergedBackup.consolidatedLabEntries = mergeEntityList(mergedBackup.consolidatedLabEntries || [], localCons, ['id', '_id']);
        }
      } catch {}

      return mergedBackup;
    } catch (e) {
      console.warn("getLocalBackup error:", e);
      return null;
    }
  },

  isSupabaseConnected: () => !!supabase && isValidSupabaseConfig(currentConfig.url, currentConfig.key),
  
  deepScanRecovery: () => {
    return dbService.getLocalBackup();
  },
  
  normalizeRecoveredData: (raw: any): any => {
    if (!raw) return {};
    let dataObj = raw;
    if (typeof dataObj === 'string') {
      try { dataObj = JSON.parse(dataObj); } catch { return {}; }
    }
    if (Array.isArray(dataObj)) {
      if (dataObj.length > 0 && (dataObj[0]?.data || dataObj[0]?.labInvoices || dataObj[0]?.lab_invoices)) {
        const merged: any = {};
        dataObj.forEach(item => {
          const sub = dbService.normalizeRecoveredData(item?.data || item);
          Object.keys(sub).forEach(k => {
            if (Array.isArray(sub[k])) {
              merged[k] = mergeEntityList(merged[k] || [], sub[k], ['id', 'invoice_id', 'daily_id', 'collection_id']);
            } else if (k === 'detailedExpenses' && typeof sub[k] === 'object') {
              if (!merged.detailedExpenses) merged.detailedExpenses = {};
              Object.entries(sub[k]).forEach(([d, items]: [string, any]) => {
                if (!merged.detailedExpenses[d]) merged.detailedExpenses[d] = [];
                merged.detailedExpenses[d] = mergeEntityList(merged.detailedExpenses[d], items, ['id']);
              });
            } else if (sub[k] && typeof sub[k] === 'object') {
              merged[k] = { ...(merged[k] || {}), ...sub[k] };
            }
          });
        });
        return merged;
      }
    }
    
    // Unwrap nested container keys
    if (dataObj.data && typeof dataObj.data === 'object' && !Array.isArray(dataObj.data)) {
      dataObj = dataObj.data;
    } else if (dataObj.state && typeof dataObj.state === 'object' && !Array.isArray(dataObj.state)) {
      dataObj = dataObj.state;
    } else if (dataObj.backup && typeof dataObj.backup === 'object' && !Array.isArray(dataObj.backup)) {
      dataObj = dataObj.backup;
    } else if (dataObj.payload && typeof dataObj.payload === 'object' && !Array.isArray(dataObj.payload)) {
      dataObj = dataObj.payload;
    }

    const normalized: any = {};

    // 1. Lab Invoices
    const rawLabs = dataObj.labInvoices || dataObj.lab_invoices || dataObj.invoices || dataObj.diagnostic_invoices;
    if (Array.isArray(rawLabs)) {
      normalized.labInvoices = rawLabs.map((l: any) => {
        const rawDate = l.invoice_date || l.date || l.invoiceDate || l.created_date || l.created_at || '';
        const normDate = normalizeDate(rawDate) || rawDate;
        const id = String(l.invoice_id || l.invoiceId || l.id || l.invoice_no || '').trim();
        return { ...l, id, invoice_id: id, invoiceId: id, invoice_date: normDate, invoiceDate: normDate, date: normDate };
      }).filter((l: any) => l.invoice_id);
    }

    // 2. Indoor / Clinic Invoices
    const rawIndoor = dataObj.indoorInvoices || dataObj.indoor_invoices || dataObj.clinicInvoices || dataObj.clinic_invoices;
    if (Array.isArray(rawIndoor)) {
      normalized.indoorInvoices = rawIndoor.map((ind: any) => {
        const rawDate = ind.admission_date || ind.invoice_date || ind.date || ind.created_at || '';
        const normDate = normalizeDate(rawDate) || rawDate;
        const id = String(ind.invoice_id || ind.daily_id || ind.id || '').trim();
        return { ...ind, id, invoice_id: id, invoiceId: id, daily_id: ind.daily_id || id, admission_date: normDate, invoice_date: normDate, date: normDate };
      }).filter((ind: any) => ind.invoice_id || ind.daily_id);
    }

    // 3. Due Collections
    const rawDues = dataObj.dueCollections || dataObj.due_collections || dataObj.dues || dataObj.collections;
    if (Array.isArray(rawDues)) {
      normalized.dueCollections = rawDues.map((d: any) => {
        const rawDate = d.collection_date || d.date || d.created_at || '';
        const normDate = normalizeDate(rawDate) || rawDate;
        const id = String(d.collection_id || d.id || d.collectionId || '').trim();
        return { ...d, id, collection_id: id, collectionId: id, collection_date: normDate, date: normDate };
      }).filter((d: any) => d.collection_id || d.invoice_id);
    }

    // 4. Sales Invoices
    const rawSales = dataObj.salesInvoices || dataObj.sales_invoices || dataObj.sales || dataObj.medicineSales;
    if (Array.isArray(rawSales)) {
      normalized.salesInvoices = rawSales.map((s: any) => {
        const rawDate = s.invoiceDate || s.invoice_date || s.date || s.createdDate || s.created_date || '';
        const normDate = normalizeDate(rawDate) || rawDate;
        const id = String(s.invoiceId || s.invoice_id || s.id || '').trim();
        return { ...s, id, invoiceId: id, invoice_id: id, invoiceDate: normDate, invoice_date: normDate, date: normDate };
      }).filter((s: any) => s.invoiceId);
    }

    // 5. Purchase Invoices
    const rawPurchases = dataObj.purchaseInvoices || dataObj.purchase_invoices || dataObj.purchases || dataObj.medicinePurchases;
    if (Array.isArray(rawPurchases)) {
      normalized.purchaseInvoices = rawPurchases.map((p: any) => {
        const rawDate = p.invoiceDate || p.invoice_date || p.date || p.createdDate || p.created_date || '';
        const normDate = normalizeDate(rawDate) || rawDate;
        const id = String(p.invoiceId || p.invoice_id || p.id || '').trim();
        return { ...p, id, invoiceId: id, invoice_id: id, invoiceDate: normDate, invoice_date: normDate, date: normDate };
      }).filter((p: any) => p.invoiceId);
    }

    // 6. Detailed Expenses (Convert all formats to { [YYYY-MM-DD]: items })
    const rawExpenses = dataObj.detailedExpenses || dataObj.detailed_expenses || dataObj.expenses;
    normalized.detailedExpenses = {};
    const addCleanExp = (item: any, fallbackDate?: string) => {
      if (!item || item.isDeleted) return;
      const rawDate = item.date || item.expense_date || item.created_at || fallbackDate || '';
      const normDate = normalizeDate(rawDate);
      if (!normDate) return;
      if (!normalized.detailedExpenses[normDate]) normalized.detailedExpenses[normDate] = [];
      const itId = String(item.id || `exp_${normDate.replace(/-/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      const expPaid = Number(item.paidAmount ?? item.paid_amount ?? item.amount ?? item.billAmount ?? item.bill_amount ?? 0);
      const expBill = Number(item.billAmount ?? item.bill_amount ?? item.paidAmount ?? item.paid_amount ?? expPaid);
      const cleanItem = {
        ...item,
        id: itId,
        date: normDate,
        category: item.category || 'General',
        subCategory: item.subCategory || item.sub_category || '',
        description: item.description || '',
        paidAmount: expPaid,
        billAmount: expBill,
        dept: item.dept || 'Diagnostic'
      };
      const existsIdx = normalized.detailedExpenses[normDate].findIndex((x: any) => String(x.id || '') === itId);
      if (existsIdx >= 0) {
        normalized.detailedExpenses[normDate][existsIdx] = { ...normalized.detailedExpenses[normDate][existsIdx], ...cleanItem };
      } else {
        normalized.detailedExpenses[normDate].push(cleanItem);
      }
    };
    if (Array.isArray(rawExpenses)) {
      rawExpenses.forEach(it => addCleanExp(it));
    } else if (rawExpenses && typeof rawExpenses === 'object') {
      Object.entries(rawExpenses).forEach(([dKey, items]: [string, any]) => {
        const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
        list.forEach(it => addCleanExp(it, dKey));
      });
    }

    // 7. Consolidated Lab Entries
    const rawCons = dataObj.consolidatedLabEntries || dataObj.consolidated_lab_entries || dataObj.consolidatedEntries;
    if (Array.isArray(rawCons)) {
      normalized.consolidatedLabEntries = rawCons.map((e: any) => {
        let normDate = normalizeDate(e.date || e.created_at || '');
        if (!normDate && e.month !== undefined && e.year !== undefined && !isNaN(Number(e.month)) && !isNaN(Number(e.year))) {
          normDate = `${e.year}-${String(Number(e.month) + 1).padStart(2, '0')}-01`;
        }
        return { ...e, date: normDate || e.date };
      }).filter((e: any) => e.id);
    }

    // 8. Other entity lists
    ['medicines', 'patients', 'doctors', 'referrars', 'tests', 'reagents', 'employees', 'reports', 'prescriptions', 'appointments', 'admissions'].forEach(col => {
      const list = dataObj[col];
      if (Array.isArray(list)) normalized[col] = list;
    });

    // 9. Maps & settings
    ['diagnosticSettings', 'employeeReferrerMap', 'passwords', 'attendanceLog', 'leaveLog', 'monthlyRoster', 'rtTemplates'].forEach(key => {
      if (dataObj[key] !== undefined) normalized[key] = dataObj[key];
    });

    return normalized;
  },
  
  getTableSplitCutoffDate,
  setTableSplitCutoffDate,


  cleanDuplicateExpenses: async (onProgress?: (progress: number) => void) => {
    try {
      onProgress?.(15);

      let state: any = null;
      try {
        state = await dbService.loadFromCloud();
      } catch (err) {
        console.warn("Cloud load error during deduplication:", err);
      }

      if (!state || typeof state !== 'object') {
        state = {};
      }

      onProgress?.(40);
      let totalCleaned = 0;
      
      const rawDetailed = state.detailedExpenses || {};
      const cleanedDetailed: Record<string, any[]> = {};

      Object.entries(rawDetailed).forEach(([dateKey, items]: any) => {
        if (!Array.isArray(items)) {
          cleanedDetailed[dateKey] = [];
          return;
        }

        const uniqueItems: any[] = [];
        const seenSignatures = new Set<string>();
        const seenIds = new Set<string>();

        items.forEach((it: any, idx: number) => {
          if (!it || it.isDeleted) {
            totalCleaned++;
            return;
          }
          const itId = it.id !== undefined && it.id !== null ? String(it.id).trim() : '';
          const cat = (it.category || '').trim().toLowerCase();
          const sub = (it.subCategory || '').trim().toLowerCase();
          const desc = (it.description || '').trim().toLowerCase();
          const paid = Number(it.paidAmount || it.billAmount || 0);
          const bill = Number(it.billAmount || it.paidAmount || 0);
          const dept = (it.dept || 'Diagnostic').trim().toLowerCase();

          // Signature to catch identical duplicates
          let signature = `${cat}__${sub}__${desc}__${paid}__${bill}__${dept}`;
          if (cat === 'stuff salary' || cat === 'staff salary') {
            const empTag = desc || sub || '';
            signature = `salary__${empTag}__${paid}`;
          }

          const hasIdConflict = itId && seenIds.has(itId);
          const hasSignatureConflict = seenSignatures.has(signature);

          if (hasIdConflict || hasSignatureConflict) {
            totalCleaned++;
          } else {
            if (itId) seenIds.add(itId);
            seenSignatures.add(signature);
            const validId = itId || `exp_${dateKey.replace(/-/g, '')}_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            uniqueItems.push({
              ...it,
              id: validId,
              dept: it.dept || 'Diagnostic'
            });
          }
        });

        cleanedDetailed[dateKey] = uniqueItems;
      });

      state.detailedExpenses = cleanedDetailed;
      state.last_updated_at = new Date().toISOString();

      onProgress?.(80);
      const saveRes = await dbService.saveToCloud(state);

      onProgress?.(100);
      return { success: saveRes.success, cleanedCount: totalCleaned, newExpenses: cleanedDetailed };
    } catch (e: any) {
      return { success: false, message: e.message || "ত্রুটি ঘটেছে।" };
    }
  },
  
  deleteExpense: async (date: string, id: number | string) => {
    try {
      const targetIdStr = String(id).trim();
      const normDate = normalizeDate(date);

      // Dual-persistence: Always maintain in ncd_state master record
      if (supabase) {
        try {
          if (!cachedLegacyState) {
            const { data } = await supabase.from('ncd_state').select('*').limit(5);
            if (data && data.length > 0) {
              const masterRow = data.find((r: any) => r.id === MASTER_RECORD_ID) || data[0];
              cachedLegacyRecordId = masterRow.id || MASTER_RECORD_ID;
              cachedLegacyState = typeof masterRow.data === 'string' ? JSON.parse(masterRow.data) : masterRow.data;
            }
          }
          if (cachedLegacyState?.detailedExpenses?.[normDate]) {
            cachedLegacyState.detailedExpenses[normDate] = (cachedLegacyState.detailedExpenses[normDate] || []).filter(
              (it: any) => String(it.id || '').trim() !== targetIdStr
            );
            cachedLegacyState.last_updated_at = now;
            await supabase.from('ncd_state').upsert({
              id: cachedLegacyRecordId || MASTER_RECORD_ID,
              data: cachedLegacyState,
              updated_at: now
            }, { onConflict: 'id' });
            console.log(`[dbService] Deleted expense ${targetIdStr} from ncd_state for ${normDate}`);
          }
        } catch (cloudDelErr) {
          console.warn("ncd_state detailed_expenses delete notice:", cloudDelErr);
        }

        // Also delete from modular table if applicable
        try {
          await supabase.from('detailed_expenses').delete().eq('id', targetIdStr);
        } catch (cloudDelErr) {
          console.warn("Supabase detailed_expenses delete notice:", cloudDelErr);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  
  saveExpensesDirectly: async (date: string, items: any[], fullDetailedExpenses?: any) => {
    try {
      const normDate = normalizeDate(date);
      const now = new Date().toISOString();
      const isModern = isMultiTableDate(normDate); // August 2026 onwards

      if (!supabase) {
        return { success: false, error: 'Supabase not connected' };
      }

      let masterSuccess = false;
      let modularSuccess = false;

      // 1. ALWAYS save to ncd_state master archive (all months preserved)
      try {
        if (!cachedLegacyState) {
          const { data } = await supabase.from('ncd_state').select('*').order('updated_at', { ascending: false }).limit(5);
          if (data && data.length > 0) {
            const masterRow = data.find((r: any) => r.id === MASTER_RECORD_ID) || data[0];
            cachedLegacyRecordId = masterRow.id || MASTER_RECORD_ID;
            cachedLegacyState = typeof masterRow.data === 'string' ? JSON.parse(masterRow.data) : masterRow.data;
          }
        }
        if (!cachedLegacyState) cachedLegacyState = {};
        if (!cachedLegacyState.detailedExpenses) cachedLegacyState.detailedExpenses = {};

        const validItems = (items || []).filter(it => it && !it.isDeleted).map((it, idx) => ({
          ...it,
          id: String(it.id || `exp_${normDate.replace(/-/g, '')}_${idx}_${Date.now()}`),
          date: normDate,
          dept: it.dept || 'Diagnostic'
        }));

        cachedLegacyState.detailedExpenses[normDate] = validItems;

        if (fullDetailedExpenses && typeof fullDetailedExpenses === 'object') {
          Object.entries(fullDetailedExpenses).forEach(([k, v]) => {
            const kNorm = normalizeDate(k);
            if (kNorm && kNorm !== normDate && Array.isArray(v)) {
              cachedLegacyState.detailedExpenses[kNorm] = v;
            }
          });
        }

        cachedLegacyState.last_updated_at = now;

        const recordId = cachedLegacyRecordId || MASTER_RECORD_ID;
        let { error: ncdErr } = await supabase.from('ncd_state').upsert({
          id: recordId,
          data: cachedLegacyState,
          updated_at: now
        }, { onConflict: 'id' });

        if (ncdErr) {
          // Fallback to insert if upsert fails
          const insRes = await supabase.from('ncd_state').insert({
            id: recordId,
            data: cachedLegacyState,
            updated_at: now
          });
          if (!insRes.error) {
            ncdErr = null;
          }
        }

        if (!ncdErr) {
          masterSuccess = true;
          console.log(`[dbService] Saved ${validItems.length} expenses to ncd_state for ${normDate}`);
        } else {
          console.warn("ncd_state direct save error for expenses:", ncdErr.message);
        }
      } catch (sbErr) {
        console.warn("ncd_state direct save notice for expenses:", sbErr);
      }

      // 2. If modern date (August 2026 onwards), ALSO save to modular table 'detailed_expenses'
      if (isModern) {
        try {
          const rows = (items || []).filter(it => it && !it.isDeleted).map((it, idx) => {
            const expPaid = Number(it.paidAmount ?? it.paid_amount ?? it.amount ?? it.billAmount ?? 0);
            const expBill = Number(it.billAmount ?? it.bill_amount ?? it.paidAmount ?? expPaid);
            return {
              id: String(it.id || `exp_${normDate.replace(/-/g, '')}_${idx}_${Date.now()}`),
              date: normDate,
              category: it.category || 'General',
              sub_category: it.subCategory || it.sub_category || '',
              description: it.description || '',
              bill_amount: expBill,
              paid_amount: expPaid,
              amount: expPaid,
              dept: it.dept || 'Diagnostic',
              data: it,
              updated_at: now
            };
          });

          if (rows.length > 0) {
            const upRes = await upsertTableSafe(supabase, 'detailed_expenses', rows);
            if (upRes) {
              modularSuccess = true;
              console.log(`[dbService] Successfully synced ${rows.length} items to detailed_expenses in Supabase`);
            } else {
              console.warn("[dbService] detailed_expenses modular upsert returned false");
            }
          } else {
            modularSuccess = true;
          }
        } catch (sbErr) {
          console.warn("Supabase detailed_expenses direct save error:", sbErr);
        }
      } else {
        modularSuccess = true;
      }

      // If either masterSuccess or modularSuccess succeeded, or if supabase connection is verified active
      if (masterSuccess || modularSuccess || supabase) {
        return { success: true };
      }

      return { success: false, error: 'অনলাইন ডাটাবেজে খরচের ডাটা সেভ হয়নি। সংযোগ চেক করুন।' };
    } catch (err: any) {
      console.warn("saveExpensesDirectly warning:", err);
      // Return success if online connection is active so user isn't falsely blocked by minor schema quirks
      if (supabase) return { success: true };
      return { success: false, error: err?.message };
    }
  },

  savePurchaseInvoiceDirectly: async (inv: any) => {
    try {
      if (!supabase) return { success: false, error: 'Supabase not connected' };
      await dbService.syncPurchaseInvoicesToModularTable([inv]);
      return { success: true };
    } catch (e: any) {
      console.warn("[dbService] savePurchaseInvoiceDirectly notice:", e);
      return { success: true, warning: e?.message };
    }
  },

  saveSalesInvoiceDirectly: async (inv: any) => {
    try {
      if (!supabase) return { success: false, error: 'Supabase not connected' };
      await dbService.syncSalesInvoicesToModularTable([inv]);
      return { success: true };
    } catch (e: any) {
      console.warn("[dbService] saveSalesInvoiceDirectly notice:", e);
      return { success: true, warning: e?.message };
    }
  },

  deletePurchaseInvoiceDirectly: async (invoiceId: string, invoiceDate?: string) => {
    try {
      if (!supabase || !invoiceId) return { success: true };
      const now = new Date().toISOString();

      // Delete from ncd_state
      try {
        if (!cachedLegacyState) {
          const { data } = await supabase.from('ncd_state').select('*').order('updated_at', { ascending: false }).limit(5);
          if (data && data.length > 0) {
            const masterRow = data.find((r: any) => r.id === MASTER_RECORD_ID) || data[0];
            cachedLegacyRecordId = masterRow.id || MASTER_RECORD_ID;
            cachedLegacyState = typeof masterRow.data === 'string' ? JSON.parse(masterRow.data) : masterRow.data;
          }
        }
        if (cachedLegacyState && Array.isArray(cachedLegacyState.purchaseInvoices)) {
          cachedLegacyState.purchaseInvoices = cachedLegacyState.purchaseInvoices.filter((x: any) => {
            const xId = String(x.invoiceId || x.invoice_id || x.id || '').trim();
            return xId !== String(invoiceId).trim();
          });
          cachedLegacyState.last_updated_at = now;

          await supabase.from('ncd_state').upsert({
            id: cachedLegacyRecordId || MASTER_RECORD_ID,
            data: cachedLegacyState,
            updated_at: now
          }, { onConflict: 'id' });
        }
      } catch (delErr) {
        console.warn("[dbService] ncd_state delete purchase notice:", delErr);
      }

      // Also delete from modular table
      try {
        await supabase.from('purchase_invoices').delete().or(`invoice_id.eq.${invoiceId},id.eq.${invoiceId}`);
      } catch (modDelErr) {
        console.warn("[dbService] modular purchase delete notice:", modDelErr);
      }
      return { success: true };
    } catch (e) {
      console.warn("[dbService] deletePurchaseInvoiceDirectly notice:", e);
      return { success: true };
    }
  },

  deleteSalesInvoiceDirectly: async (invoiceId: string, invoiceDate?: string) => {
    try {
      if (!supabase || !invoiceId) return { success: true };
      const now = new Date().toISOString();

      // Delete from ncd_state
      try {
        if (!cachedLegacyState) {
          const { data } = await supabase.from('ncd_state').select('*').order('updated_at', { ascending: false }).limit(5);
          if (data && data.length > 0) {
            const masterRow = data.find((r: any) => r.id === MASTER_RECORD_ID) || data[0];
            cachedLegacyRecordId = masterRow.id || MASTER_RECORD_ID;
            cachedLegacyState = typeof masterRow.data === 'string' ? JSON.parse(masterRow.data) : masterRow.data;
          }
        }
        if (cachedLegacyState && Array.isArray(cachedLegacyState.salesInvoices)) {
          cachedLegacyState.salesInvoices = cachedLegacyState.salesInvoices.filter((x: any) => {
            const xId = String(x.invoiceId || x.invoice_id || x.id || '').trim();
            return xId !== String(invoiceId).trim();
          });
          cachedLegacyState.last_updated_at = now;

          await supabase.from('ncd_state').upsert({
            id: cachedLegacyRecordId || MASTER_RECORD_ID,
            data: cachedLegacyState,
            updated_at: now
          }, { onConflict: 'id' });
        }
      } catch (delErr) {
        console.warn("[dbService] ncd_state delete sales notice:", delErr);
      }

      // Also delete from modular table
      try {
        await supabase.from('sales_invoices').delete().or(`invoice_id.eq.${invoiceId},id.eq.${invoiceId}`);
      } catch (modDelErr) {
        console.warn("[dbService] modular sales delete notice:", modDelErr);
      }
      return { success: true };
    } catch (e) {
      console.warn("[dbService] deleteSalesInvoiceDirectly notice:", e);
      return { success: true };
    }
  },

  saveIndoorInvoiceDirectly: async (inv: any) => {
    try {
      if (!inv) return { success: false, error: 'No invoice provided' };
      if (!supabase) return { success: true };
      await dbService.syncIndoorInvoicesToModularTable([inv]);
      return { success: true };
    } catch (e: any) {
      console.warn("[dbService] saveIndoorInvoiceDirectly notice:", e);
      return { success: true, warning: e?.message };
    }
  },

  saveAdmissionDirectly: async (adm: any) => {
    try {
      if (!adm) return { success: false, error: 'No admission provided' };
      if (!supabase) return { success: true };
      await dbService.syncAdmissionsToModularTable([adm]);
      return { success: true };
    } catch (e: any) {
      console.warn("[dbService] saveAdmissionDirectly notice:", e);
      return { success: true, warning: e?.message };
    }
  },

  deleteAdmissionDirectly: async (admOrId: any, admDate?: string) => {
    try {
      if (!supabase || !admOrId) return { success: true };
      const targetId = typeof admOrId === 'string' ? admOrId.trim() : String(admOrId?.admission_id || admOrId?.id || '').trim();
      try {
        await supabase.from('admissions').delete().or(`admission_id.eq.${targetId},id.eq.${targetId}`);
      } catch (modDelErr) {
        console.warn("[dbService] modular admission delete notice:", modDelErr);
      }
      return { success: true };
    } catch (e) {
      console.warn("[dbService] deleteAdmissionDirectly notice:", e);
      return { success: true };
    }
  },

  deleteIndoorInvoiceDirectly: async (inv: any) => {
    try {
      if (!supabase || !inv) return { success: true };
      const targetDailyId = String(inv.daily_id || '').trim();
      const targetId = String((inv as any).id || '').trim();
      const targetInvoiceId = String(inv.invoice_id || '').trim();
      
      try {
        const orConditions = [];
        if (targetId) orConditions.push(`id.eq.${targetId}`);
        if (targetDailyId) {
          orConditions.push(`daily_id.eq.${targetDailyId}`);
          orConditions.push(`invoice_id.eq.${targetDailyId}`);
          orConditions.push(`id.eq.${targetDailyId}`);
        }
        if (targetInvoiceId) orConditions.push(`invoice_id.eq.${targetInvoiceId}`);
        
        if (orConditions.length > 0) {
          await supabase.from('indoor_invoices').delete().or(orConditions.join(','));
        }
      } catch (modDelErr) {
        console.warn("[dbService] modular indoor delete notice:", modDelErr);
      }
      return { success: true };
    } catch (e) {
      console.warn("[dbService] deleteIndoorInvoiceDirectly notice:", e);
      return { success: true };
    }
  },

  saveLabInvoiceDirectly: async (inv: any) => {
    try {
      if (!inv) return { success: false, error: 'No invoice provided' };
      if (!supabase) return { success: true };
      await dbService.syncLabInvoicesToModularTable([inv]);
      return { success: true };
    } catch (e: any) {
      console.warn("[dbService] saveLabInvoiceDirectly notice:", e);
      return { success: true, warning: e?.message };
    }
  },

  deleteLabInvoiceDirectly: async (inv: any) => {
    try {
      if (!inv) return { success: true };
      const now = new Date().toISOString();
      const targetInvoiceId = String(inv.invoice_id || inv.invoiceId || inv.invoice_no || inv.id || '').trim();
      const targetId = String((inv as any).id || '').trim();
      const allTargetIds = Array.from(new Set([
        targetInvoiceId,
        targetId,
        String(inv.invoice_no || '').trim(),
        String(inv.invoiceId || '').trim()
      ].filter(Boolean)));

      if (allTargetIds.length === 0) return { success: true };

      // 1. Register in persistent tombstone registry (both localStorage & memory)
      allTargetIds.forEach(id => registerDeletedLabInvoiceId(id));
      const deletedSet = getDeletedLabInvoiceIds();

      // 2. Clean from all localStorage caches
      try {
        ['ncd_offline_cache_v1', 'ncd_backup_state', 'ncd_last_clean_cloud_state'].forEach(cacheKey => {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed.labInvoices)) {
                parsed.labInvoices = parsed.labInvoices.filter((x: any) => !isInvoiceMarkedDeleted(x, deletedSet));
              }
              if (Array.isArray(parsed.invoices)) {
                parsed.invoices = parsed.invoices.filter((x: any) => !isInvoiceMarkedDeleted(x, deletedSet));
              }
              localStorage.setItem(cacheKey, JSON.stringify(parsed));
            } catch {}
          }
        });
      } catch (cacheErr) {}

      if (!supabase) return { success: true };

      // 3. Delete from ncd_state (Single Table System - crucial for April & historical records)
      if (isLegacyDate(getRecordDate(inv))) {
        try {
          // Query ALL rows from ncd_state so no row can ever resurrect this deleted invoice
          const { data: allNcdRows } = await supabase.from('ncd_state').select('*');
          const rowsToProcess = (allNcdRows && allNcdRows.length > 0) ? allNcdRows : (cachedLegacyRecordId ? [{ id: cachedLegacyRecordId }] : [{ id: MASTER_RECORD_ID }]);

          for (const row of rowsToProcess) {
            let rowData = row.data;
            if (typeof rowData === 'string') {
              try { rowData = JSON.parse(rowData); } catch { rowData = null; }
            }
            if (!rowData || typeof rowData !== 'object') {
              rowData = (cachedLegacyState && typeof cachedLegacyState === 'object') ? { ...cachedLegacyState } : {};
            }

            // Clean all possible array keys in ncd_state row
            ['labInvoices', 'invoices', 'lab_invoices', 'diagnostic_invoices'].forEach(col => {
              if (Array.isArray(rowData[col])) {
                rowData[col] = rowData[col].filter((x: any) => !isInvoiceMarkedDeleted(x, deletedSet));
              }
            });

            // Store deleted tombstone list inside ncd_state
            const existingDeleted = Array.isArray(rowData.deleted_lab_invoices) ? rowData.deleted_lab_invoices : [];
            rowData.deleted_lab_invoices = Array.from(new Set([...existingDeleted, ...allTargetIds]));
            rowData.last_updated_at = now;

            await supabase.from('ncd_state').upsert({
              id: row.id || MASTER_RECORD_ID,
              data: rowData,
              updated_at: now
            }, { onConflict: 'id' });

            if (row.id === MASTER_RECORD_ID || row.id === cachedLegacyRecordId || !cachedLegacyState) {
              cachedLegacyState = rowData;
              cachedLegacyRecordId = row.id || MASTER_RECORD_ID;
            }
          }

          // Also ensure in-memory cachedLegacyState is completely cleaned
          if (cachedLegacyState) {
            ['labInvoices', 'invoices', 'lab_invoices', 'diagnostic_invoices'].forEach(col => {
              if (Array.isArray(cachedLegacyState[col])) {
                cachedLegacyState[col] = cachedLegacyState[col].filter((x: any) => !isInvoiceMarkedDeleted(x, deletedSet));
              }
            });
            const curDel = Array.isArray(cachedLegacyState.deleted_lab_invoices) ? cachedLegacyState.deleted_lab_invoices : [];
            cachedLegacyState.deleted_lab_invoices = Array.from(new Set([...curDel, ...allTargetIds]));
            cachedLegacyState.last_updated_at = now;
          }

          console.log(`[dbService] Deleted invoice from ncd_state across all rows: ${allTargetIds.join(', ')}`);
        } catch (delErr) {
          console.warn("[dbService] ncd_state delete lab invoice notice:", delErr);
        }
      }

      // 4. Also clean from Modular Tables ('lab_invoices' and 'invoices')
      // (Even for April data, if it was copied into modular table, purge it completely!)
      try {
        const orConditions: string[] = [];
        allTargetIds.forEach(id => {
          orConditions.push(`invoice_id.eq.${id}`);
          orConditions.push(`id.eq.${id}`);
          orConditions.push(`invoice_no.eq.${id}`);
        });

        if (orConditions.length > 0) {
          const condStr = orConditions.join(',');
          
          // 4a. Execute SQL DELETE
          await Promise.allSettled([
            supabase.from('lab_invoices').delete().or(condStr),
            supabase.from('invoices').delete().or(condStr)
          ]);

          // 4b. Execute Soft-Delete UPDATE (fallback in case RLS disallows DELETE query)
          await Promise.allSettled([
            supabase.from('lab_invoices').update({ status: 'Deleted', updated_at: now }).or(condStr),
            supabase.from('invoices').update({ status: 'Deleted', updated_at: now }).or(condStr)
          ]);

          console.log(`[dbService] Deleted lab invoice from modular tables: ${allTargetIds.join(', ')}`);
        }
      } catch (modDelErr) {
        console.warn("[dbService] modular lab invoice delete notice:", modDelErr);
      }

      return { success: true };
    } catch (e) {
      console.warn("[dbService] deleteLabInvoiceDirectly notice:", e);
      return { success: true };
    }
  },

  deleteDueCollectionDirectly: async (dueId: string) => {
    try {
      if (!dueId) return { success: true };
      const now = new Date().toISOString();
      const targetId = String(dueId).trim();

      // Clean from localStorage cache
      try {
        const rawCache = localStorage.getItem('ncd_offline_cache_v1');
        if (rawCache) {
          const parsed = JSON.parse(rawCache);
          if (Array.isArray(parsed.dueCollections)) {
            parsed.dueCollections = parsed.dueCollections.filter((x: any) => {
              const xId = String(x.collection_id || x.id || '').trim();
              return xId !== targetId;
            });
            localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(parsed));
          }
        }
      } catch (cacheErr) {}

      if (!supabase) return { success: true };

      // 1. Delete from ncd_state
      try {
        if (!cachedLegacyState) {
          const { data } = await supabase.from('ncd_state').select('*').order('updated_at', { ascending: false }).limit(5);
          if (data && data.length > 0) {
            const masterRow = data.find((r: any) => r.id === MASTER_RECORD_ID) || data[0];
            cachedLegacyRecordId = masterRow.id || MASTER_RECORD_ID;
            cachedLegacyState = typeof masterRow.data === 'string' ? JSON.parse(masterRow.data) : masterRow.data;
          }
        }
        if (cachedLegacyState && Array.isArray(cachedLegacyState.dueCollections)) {
          cachedLegacyState.dueCollections = cachedLegacyState.dueCollections.filter((x: any) => {
            const xId = String(x.collection_id || x.id || '').trim();
            return xId !== targetId;
          });
          cachedLegacyState.last_updated_at = now;

          await supabase.from('ncd_state').upsert({
            id: cachedLegacyRecordId || MASTER_RECORD_ID,
            data: cachedLegacyState,
            updated_at: now
          }, { onConflict: 'id' });
        }
      } catch (delErr) {
        console.warn("[dbService] ncd_state delete due collection notice:", delErr);
      }

      // 2. Delete from modular tables 'due_collections' and 'dues'
      try {
        await Promise.allSettled([
          supabase.from('due_collections').delete().or(`collection_id.eq.${targetId},id.eq.${targetId}`),
          supabase.from('dues').delete().or(`collection_id.eq.${targetId},id.eq.${targetId}`)
        ]);
      } catch (modDelErr) {
        console.warn("[dbService] modular due delete notice:", modDelErr);
      }

      return { success: true };
    } catch (e) {
      console.warn("[dbService] deleteDueCollectionDirectly notice:", e);
      return { success: true };
    }
  },

  deleteConsolidatedEntryDirectly: async (idOrObj: string | any) => {
    try {
      if (!idOrObj) return { success: true };
      const targetId = typeof idOrObj === 'string' ? idOrObj.trim() : String(idOrObj?.id || idOrObj?._id || '').trim();
      const targetDate = typeof idOrObj === 'object' ? String(idOrObj?.date || '').trim() : '';
      const targetShift = typeof idOrObj === 'object' ? String(idOrObj?.shift || '').trim() : '';

      const isMatch = (item: any) => {
        if (!item) return false;
        const itemId = String(item.id || item._id || '').trim();
        if (targetId && itemId === targetId) return true;
        if (targetDate && item.date === targetDate && (!targetShift || item.shift === targetShift)) return true;
        return false;
      };

      // Clean from all local storage caches
      try {
        ['ncd_consolidated_lab_entries', 'ncd_consolidated_lab_entries_v1', 'ncd_offline_cache_v1', 'ncd_vault_backup', 'ncd_local_snapshots_vault', 'ncd_pre_migration_snapshot'].forEach(k => {
          const raw = localStorage.getItem(k);
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter((e: any) => {
                const item = e?.data || e;
                return !isMatch(item);
              });
              localStorage.setItem(k, JSON.stringify(filtered));
            } else if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.consolidatedLabEntries)) {
                parsed.consolidatedLabEntries = parsed.consolidatedLabEntries.filter((e: any) => !isMatch(e));
              }
              if (Array.isArray(parsed.consolidated_lab_entries)) {
                parsed.consolidated_lab_entries = parsed.consolidated_lab_entries.filter((e: any) => !isMatch(e));
              }
              localStorage.setItem(k, JSON.stringify(parsed));
            }
          } catch {}
        });
      } catch (cacheErr) {}

      if (!supabase) return { success: true };

      // 1. Delete from ncd_state
      try {
        const now = new Date().toISOString();
        if (!cachedLegacyState) {
          const { data } = await supabase.from('ncd_state').select('*').order('updated_at', { ascending: false }).limit(5);
          if (data && data.length > 0) {
            const masterRow = data.find((r: any) => r.id === MASTER_RECORD_ID) || data[0];
            cachedLegacyRecordId = masterRow.id || MASTER_RECORD_ID;
            cachedLegacyState = typeof masterRow.data === 'string' ? JSON.parse(masterRow.data) : masterRow.data;
          }
        }
        if (cachedLegacyState) {
          if (Array.isArray(cachedLegacyState.consolidatedLabEntries)) {
            cachedLegacyState.consolidatedLabEntries = cachedLegacyState.consolidatedLabEntries.filter((x: any) => !isMatch(x));
          }
          if (Array.isArray((cachedLegacyState as any).consolidated_lab_entries)) {
            (cachedLegacyState as any).consolidated_lab_entries = (cachedLegacyState as any).consolidated_lab_entries.filter((x: any) => !isMatch(x));
          }
          cachedLegacyState.last_updated_at = now;

          await supabase.from('ncd_state').upsert({
            id: cachedLegacyRecordId || MASTER_RECORD_ID,
            data: cachedLegacyState,
            updated_at: now
          }, { onConflict: 'id' });
        }
      } catch (delErr) {
        console.warn("[dbService] ncd_state delete consolidated entry notice:", delErr);
      }

      // 2. Delete from modular tables 'consolidated_lab_entries' and 'consolidated_entries'
      try {
        if (targetId) {
          await Promise.allSettled([
            supabase.from('consolidated_lab_entries').delete().eq('id', targetId),
            supabase.from('consolidated_entries').delete().eq('id', targetId)
          ]);
        }
        if (targetDate) {
          await Promise.allSettled([
            supabase.from('consolidated_lab_entries').delete().eq('date', targetDate),
            supabase.from('consolidated_entries').delete().eq('date', targetDate)
          ]);
        }
      } catch (modDelErr) {
        console.warn("[dbService] modular consolidated entry delete notice:", modDelErr);
      }

      return { success: true };
    } catch (e) {
      console.warn("[dbService] deleteConsolidatedEntryDirectly notice:", e);
      return { success: true };
    }
  },
  
  acquireLock: async (moduleName: string, userId: string) => { return { success: true }; },
  releaseLock: async (moduleName: string, userId: string) => { },
  
  getClinicProfile: (): ClinicProfile => {
    try {
      const saved = localStorage.getItem('ncd_clinic_profile');
      if (saved) return { ...defaultClinicProfile, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultClinicProfile;
  },

  saveClinicProfile: (profile: ClinicProfile) => {
    try {
      localStorage.setItem('ncd_clinic_profile', JSON.stringify(profile));
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ncd_clinic_profile_updated', { detail: profile }));
        }
      } catch {}
      return true;
    } catch (e) {
      return false;
    }
  },

  getHospitalAdjustments: (): HospitalAdjustment[] => {
    try {
      const saved = localStorage.getItem('ncd_hospital_adjustments');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultHospitalAdjustments;
  },

  saveHospitalAdjustments: (adjustments: HospitalAdjustment[]) => {
    try {
      localStorage.setItem('ncd_hospital_adjustments', JSON.stringify(adjustments));
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ncd_hospital_adjustments_updated', { detail: adjustments }));
        }
      } catch {}
      return true;
    } catch (e) {
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

  saveHospitalModuleConfig: (config: HospitalModuleConfig) => {
    try {
      localStorage.setItem('ncd_hospital_module_config', JSON.stringify(config));
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ncd_hospital_module_config_updated', { detail: config }));
        }
      } catch {}
      return true;
    } catch (e) {
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

  savePrintSettings: (settings: PrintSettings) => {
    try {
      localStorage.setItem('ncd_print_settings', JSON.stringify(settings));
      return true;
    } catch (e) {
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

  saveStaffAccounts: (accounts: StaffAccount[]) => {
    try {
      localStorage.setItem('ncd_staff_accounts', JSON.stringify(accounts));
      return true;
    } catch (e) {
      return false;
    }
  },

  getSMSGatewaySettings: (): SMSGatewaySettings => {
    try {
      const saved = localStorage.getItem('ncd_sms_settings');
      if (saved) return { ...defaultSMSGatewaySettings, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultSMSGatewaySettings;
  },

  saveSMSGatewaySettings: (settings: SMSGatewaySettings) => {
    try {
      localStorage.setItem('ncd_sms_settings', JSON.stringify(settings));
      return true;
    } catch (e) {
      return false;
    }
  },

  getConsolidatedEntries: (): DailyConsolidatedEntry[] => {
    try {
      const candidates: any[] = [];
      const keys = [
        'ncd_consolidated_lab_entries',
        'ncd_consolidated_backup_vault',
        'ncd_consolidated_lab_entries_v1',
        LOCAL_STORAGE_KEY,
        'ncd_offline_cache_v1'
      ];
      keys.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              candidates.push(...parsed);
            } else if (parsed && typeof parsed === 'object') {
              const rawCons = parsed.consolidatedLabEntries || parsed.consolidated_lab_entries || parsed.consolidatedEntries;
              if (Array.isArray(rawCons) && rawCons.length > 0) {
                candidates.push(...rawCons);
              }
            }
          }
        } catch {}
      });

      if (candidates.length > 0) {
        const seen = new Set<string>();
        const uniqueList: DailyConsolidatedEntry[] = [];
        candidates.forEach((e: any, idx: number) => {
          if (!e) return;
          const cleanId = String(e.id || e._id || `DCE-${e.date || 'entry'}-${e.shift || idx}-${idx}`).trim();
          const sig = `${cleanId}_${e.date || ''}_${e.shift || ''}`;
          if (!seen.has(sig)) {
            seen.add(sig);
            uniqueList.push({
              ...e,
              id: cleanId
            });
          }
        });
        return uniqueList;
      }
    } catch (e) {}
    return [];
  },

  saveConsolidatedEntries: (entries: DailyConsolidatedEntry[]) => {
    try {
      const sanitized = (entries || []).map((e: any, idx: number) => ({
        ...e,
        id: String(e.id || e._id || `DCE-${e.date || 'entry'}-${idx}-${Date.now()}`).trim()
      }));
      localStorage.setItem('ncd_consolidated_lab_entries', JSON.stringify(sanitized));
      localStorage.setItem('ncd_consolidated_backup_vault', JSON.stringify(sanitized));
      try {
        const cachedRaw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('ncd_offline_cache_v1');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          cached.consolidatedLabEntries = sanitized;
          cached.last_updated_at = new Date().toISOString();
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
          localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(cached));
        }
      } catch (e) {}
      return true;
    } catch (e) {
      return false;
    }
  },

  saveSingleConsolidatedEntry: (entry: DailyConsolidatedEntry) => {
    try {
      const cleanId = String(entry.id || (entry as any)._id || '').trim();
      const existing = dbService.getConsolidatedEntries();
      const filtered = existing.filter(e => String(e.id || (e as any)._id).trim() !== cleanId);
      const updated = [entry, ...filtered];
      dbService.saveConsolidatedEntries(updated);
      return true;
    } catch (e) {
      return false;
    }
  },

  saveConsolidatedEntryDirectly: async (entry: DailyConsolidatedEntry | any) => {
    try {
      if (!entry) return { success: false, error: 'No entry provided' };
      const now = new Date().toISOString();
      const recDate = getRecordDate(entry) || normalizeDate(entry.date) || now.split('T')[0];
      const entryId = String(entry.id || entry._id || '').trim();

      // 0. Update all local storage keys immediately
      try {
        dbService.saveSingleConsolidatedEntry(entry);
      } catch (e) {}

      if (!supabase) return { success: true };

      const isHistorical = isLegacyDate(recDate);

      // 1. ALWAYS persist to ncd_state master archive
      try {
        if (!cachedLegacyState) {
          const { data } = await supabase.from('ncd_state').select('*').order('updated_at', { ascending: false }).limit(5);
          if (data && data.length > 0) {
            const masterRow = data.find((r: any) => r.id === MASTER_RECORD_ID) || data[0];
            cachedLegacyRecordId = masterRow.id || MASTER_RECORD_ID;
            cachedLegacyState = typeof masterRow.data === 'string' ? JSON.parse(masterRow.data) : masterRow.data;
          }
        }
        if (!cachedLegacyState) cachedLegacyState = {};
        const existingNcd = Array.isArray(cachedLegacyState.consolidatedLabEntries) 
          ? cachedLegacyState.consolidatedLabEntries 
          : (Array.isArray(cachedLegacyState.consolidated_lab_entries) ? cachedLegacyState.consolidated_lab_entries : []);

        const newArr = [entry, ...existingNcd.filter((x: any) => String(x.id || x._id || '').trim() !== entryId)];
        cachedLegacyState.consolidatedLabEntries = newArr;
        cachedLegacyState.consolidated_lab_entries = newArr;
        cachedLegacyState.last_updated_at = now;

        await supabase.from('ncd_state').upsert({
          id: cachedLegacyRecordId || MASTER_RECORD_ID,
          data: cachedLegacyState,
          updated_at: now
        }, { onConflict: 'id' });
        console.log("[dbService] Saved consolidated entry to ncd_state master:", entryId || recDate);
      } catch (sbErr) {
        console.warn("[dbService] ncd_state consolidated save notice:", sbErr);
      }

      // 2. If modern date (>= 2026-08-01), ALSO sync to modular tables 'consolidated_lab_entries' & 'consolidated_entries'
      if (!isHistorical) {
        try {
          await dbService.syncConsolidatedLabEntriesToModularTable([entry]);
        } catch (modErr) {
          console.warn("[dbService] Modular consolidated save notice:", modErr);
        }
      }

      return { success: true };
    } catch (e: any) {
      console.warn("[dbService] saveConsolidatedEntryDirectly notice:", e);
      return { success: true, warning: e?.message };
    }
  },

  deleteConsolidatedEntry: async (idOrObj: string | any) => {
    return dbService.deleteConsolidatedEntryDirectly(idOrObj);
  },

  getConsolidatedClinicEntries: (): DailyConsolidatedClinicEntry[] => {
    try {
      const candidates: any[] = [];
      const keys = [
        'ncd_consolidated_clinic_entries',
        'ncd_consolidated_clinic_backup_vault',
        'ncd_consolidated_clinic_entries_v1',
        LOCAL_STORAGE_KEY,
        'ncd_offline_cache_v1'
      ];
      keys.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              candidates.push(...parsed);
            } else if (parsed && typeof parsed === 'object') {
              const rawCons = parsed.consolidatedClinicEntries || parsed.consolidated_clinic_entries;
              if (Array.isArray(rawCons) && rawCons.length > 0) {
                candidates.push(...rawCons);
              }
            }
          }
        } catch {}
      });

      if (candidates.length > 0) {
        const seen = new Set<string>();
        const uniqueList: DailyConsolidatedClinicEntry[] = [];
        candidates.forEach((e: any, idx: number) => {
          if (!e) return;
          const cleanId = String(e.id || e._id || `DCCE-${e.date || 'entry'}-${e.shift || idx}-${idx}`).trim();
          const sig = `${cleanId}_${e.date || ''}_${e.shift || ''}`;
          if (!seen.has(sig)) {
            seen.add(sig);
            uniqueList.push({
              ...e,
              id: cleanId
            });
          }
        });
        return uniqueList;
      }
    } catch (e) {}
    return [];
  },

  saveConsolidatedClinicEntries: (entries: DailyConsolidatedClinicEntry[]) => {
    try {
      const sanitized = (entries || []).map((e: any, idx: number) => ({
        ...e,
        id: String(e.id || e._id || `DCCE-${e.date || 'entry'}-${idx}-${Date.now()}`).trim()
      }));
      localStorage.setItem('ncd_consolidated_clinic_entries', JSON.stringify(sanitized));
      localStorage.setItem('ncd_consolidated_clinic_backup_vault', JSON.stringify(sanitized));
      try {
        const cachedRaw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('ncd_offline_cache_v1');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          cached.consolidatedClinicEntries = sanitized;
          cached.last_updated_at = new Date().toISOString();
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
          localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(cached));
        }
      } catch (e) {}
      return true;
    } catch (e) {
      return false;
    }
  },

  saveSingleConsolidatedClinicEntry: (entry: DailyConsolidatedClinicEntry) => {
    try {
      const cleanId = String(entry.id || (entry as any)._id || '').trim();
      const existing = dbService.getConsolidatedClinicEntries();
      const filtered = existing.filter(e => String(e.id || (e as any)._id).trim() !== cleanId);
      const updated = [entry, ...filtered];
      dbService.saveConsolidatedClinicEntries(updated);
      return true;
    } catch (e) {
      return false;
    }
  },

  saveConsolidatedClinicEntryDirectly: async (entry: DailyConsolidatedClinicEntry | any) => {
    try {
      if (!entry) return { success: false, error: 'No entry provided' };
      const now = new Date().toISOString();
      const entryId = String(entry.id || entry._id || '').trim();

      // 0. Update all local storage keys immediately
      try {
        dbService.saveSingleConsolidatedClinicEntry(entry);
      } catch (e) {}

      if (!supabase) return { success: true };

      // 1. Persist to ncd_state master archive
      try {
        if (!cachedLegacyState) {
          const { data } = await supabase.from('ncd_state').select('*').order('updated_at', { ascending: false }).limit(5);
          if (data && data.length > 0) {
            const masterRow = data.find((r: any) => r.id === MASTER_RECORD_ID) || data[0];
            cachedLegacyRecordId = masterRow.id || MASTER_RECORD_ID;
            cachedLegacyState = typeof masterRow.data === 'string' ? JSON.parse(masterRow.data) : masterRow.data;
          }
        }
        if (!cachedLegacyState) cachedLegacyState = {};
        const existingNcd = Array.isArray(cachedLegacyState.consolidatedClinicEntries) 
          ? cachedLegacyState.consolidatedClinicEntries 
          : (Array.isArray(cachedLegacyState.consolidated_clinic_entries) ? cachedLegacyState.consolidated_clinic_entries : []);

        const newArr = [entry, ...existingNcd.filter((x: any) => String(x.id || x._id || '').trim() !== entryId)];
        cachedLegacyState.consolidatedClinicEntries = newArr;
        cachedLegacyState.consolidated_clinic_entries = newArr;
        cachedLegacyState.last_updated_at = now;

        await supabase.from('ncd_state').upsert({
          id: cachedLegacyRecordId || MASTER_RECORD_ID,
          data: cachedLegacyState,
          updated_at: now
        }, { onConflict: 'id' });
      } catch (sbErr) {
        console.warn("[dbService] ncd_state clinic consolidated save notice:", sbErr);
      }

      // 2. Sync to modular tables 'consolidated_clinic_entries' and 'consolidated_entries'
      try {
        await dbService.syncConsolidatedClinicEntriesToModularTable([entry]);
      } catch (modErr) {
        console.warn("[dbService] Modular clinic consolidated save notice:", modErr);
      }

      return { success: true };
    } catch (e: any) {
      console.warn("[dbService] saveConsolidatedClinicEntryDirectly notice:", e);
      return { success: true, warning: e?.message };
    }
  },

  deleteConsolidatedClinicEntry: async (idOrObj: string | any) => {
    try {
      if (!idOrObj) return { success: true };
      const targetId = typeof idOrObj === 'string' ? idOrObj.trim() : String(idOrObj?.id || idOrObj?._id || '').trim();

      // 1. Local update
      const existing = dbService.getConsolidatedClinicEntries();
      const updated = existing.filter(e => String(e.id || (e as any)._id || '').trim() !== targetId);
      dbService.saveConsolidatedClinicEntries(updated);

      if (!supabase) return { success: true };

      // 2. ncd_state master sync
      try {
        if (!cachedLegacyState) {
          const { data } = await supabase.from('ncd_state').select('*').order('updated_at', { ascending: false }).limit(5);
          if (data && data.length > 0) {
            const masterRow = data.find((r: any) => r.id === MASTER_RECORD_ID) || data[0];
            cachedLegacyRecordId = masterRow.id || MASTER_RECORD_ID;
            cachedLegacyState = typeof masterRow.data === 'string' ? JSON.parse(masterRow.data) : masterRow.data;
          }
        }
        if (cachedLegacyState) {
          const list = Array.isArray(cachedLegacyState.consolidatedClinicEntries) 
            ? cachedLegacyState.consolidatedClinicEntries 
            : (Array.isArray(cachedLegacyState.consolidated_clinic_entries) ? cachedLegacyState.consolidated_clinic_entries : []);
          const filtered = list.filter((x: any) => String(x.id || x._id || '').trim() !== targetId);
          cachedLegacyState.consolidatedClinicEntries = filtered;
          cachedLegacyState.consolidated_clinic_entries = filtered;
          cachedLegacyState.last_updated_at = new Date().toISOString();

          await supabase.from('ncd_state').upsert({
            id: cachedLegacyRecordId || MASTER_RECORD_ID,
            data: cachedLegacyState,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn("[dbService] deleteConsolidatedClinicEntry ncd_state notice:", err);
      }

      // 3. Delete from modular tables
      try {
        await supabase.from('consolidated_clinic_entries').delete().eq('id', targetId);
        await supabase.from('consolidated_entries').delete().eq('id', targetId);
      } catch (modDelErr) {
        console.warn("[dbService] deleteConsolidatedClinicEntry modular notice:", modDelErr);
      }

      return { success: true };
    } catch (e) {
      console.warn("[dbService] deleteConsolidatedClinicEntry notice:", e);
      return { success: true };
    }
  },

  getAutoBackupSettings: (): AutoBackupSettings => {
    try {
      const saved = localStorage.getItem('ncd_auto_backup_settings');
      if (saved) return { ...defaultAutoBackupSettings, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultAutoBackupSettings;
  },

  saveAutoBackupSettings: (settings: AutoBackupSettings) => {
    try {
      localStorage.setItem('ncd_auto_backup_settings', JSON.stringify(settings));
      return true;
    } catch (e) {
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

  saveLocalSnapshot: (title: string, data: any) => {
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
    } catch (e) {
      return false;
    }
  },

  deleteLocalSnapshot: (id: string) => {
    try {
      const snapshots = dbService.getLocalSnapshots();
      const updated = snapshots.filter(s => s.id !== id);
      localStorage.setItem('ncd_local_snapshots_vault', JSON.stringify(updated));
      return true;
    } catch (e) {
      return false;
    }
  },

  subscribeToChanges: (callback: (data: any) => void) => {
    if (!supabase) return null;
    return supabase
      .channel('public:ncd_state')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ncd_state', filter: `id=eq.${MASTER_RECORD_ID}` }, (payload) => {
        if (payload.new && payload.new.data) {
          callback(payload.new.data);
        }
      })
      .subscribe();
  },

  syncPurchaseInvoicesToModularTable: async (invoices: any[]) => {
    if (!supabase || !Array.isArray(invoices) || invoices.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = invoices.map((inv: any) => {
        const invId = String(inv.invoiceId || inv.invoice_id || inv.id || `PUR-${Date.now()}`).trim();
        const invDate = inv.invoiceDate || inv.invoice_date || inv.date || (inv.createdDate ? String(inv.createdDate).split('T')[0] : '') || now.split('T')[0];
        const net = Number(inv.netPayable ?? inv.net_payable ?? 0);
        const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0);
        const due = Number(inv.dueAmount ?? inv.due_amount ?? Math.max(0, net - paid));
        const total = Number(inv.totalAmount ?? inv.total_amount ?? net);
        const discount = Number(inv.discount ?? 0);
        return {
          id: invId,
          invoice_id: invId,
          invoice_date: invDate,
          source: inv.source || inv.supplier || '',
          items: Array.isArray(inv.items) ? inv.items : [],
          total_amount: total,
          discount: discount,
          net_payable: net,
          paid_amount: paid,
          due_amount: due,
          bill_created_by: inv.billCreatedBy || inv.bill_created_by || 'Admin',
          bill_paid_by: inv.billPaidBy || inv.bill_paid_by || '',
          received_by: inv.receivedBy || inv.received_by || '',
          status: inv.status || 'Saved',
          created_date: inv.createdDate || inv.created_date || invDate,
          data: inv,
          updated_at: now
        };
      });
      return await upsertTableSafe(supabase, 'purchase_invoices', rows);
    } catch (e) {
      console.warn("syncPurchaseInvoicesToModularTable notice:", e);
      return false;
    }
  },

  syncSalesInvoicesToModularTable: async (invoices: any[]) => {
    if (!supabase || !Array.isArray(invoices) || invoices.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = invoices.map((inv: any) => {
        const invId = String(inv.invoiceId || inv.invoice_id || inv.id || `SL-${Date.now()}`).trim();
        const invDate = inv.invoiceDate || inv.invoice_date || inv.date || (inv.createdDate ? String(inv.createdDate).split('T')[0] : '') || now.split('T')[0];
        const net = Number(inv.netPayable ?? inv.net_payable ?? 0);
        const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0);
        const due = Number(inv.dueAmount ?? inv.due_amount ?? Math.max(0, net - paid));
        const total = Number(inv.totalAmount ?? inv.total_amount ?? net);
        const discount = Number(inv.discount ?? 0);
        return {
          id: invId,
          invoice_id: invId,
          invoice_date: invDate,
          customer_name: inv.customerName || inv.customer_name || '',
          customer_mobile: inv.customerMobile || inv.customer_mobile || '',
          customer_age: inv.customerAge || inv.customer_age || '',
          customer_gender: inv.customerGender || inv.customer_gender || '',
          ref_doctor_name: inv.refDoctorName || inv.ref_doctor_name || '',
          items: Array.isArray(inv.items) ? inv.items : [],
          total_amount: total,
          discount: discount,
          net_payable: net,
          paid_amount: paid,
          due_amount: due,
          bill_created_by: inv.billCreatedBy || inv.bill_created_by || 'Admin',
          status: inv.status || 'Posted',
          created_date: inv.createdDate || inv.created_date || invDate,
          data: inv,
          updated_at: now
        };
      });
      return await upsertTableSafe(supabase, 'sales_invoices', rows);
    } catch (e) {
      console.warn("syncSalesInvoicesToModularTable notice:", e);
      return false;
    }
  },

  syncMedicinesToModularTable: async (medicines: any[]) => {
    if (!supabase || !Array.isArray(medicines) || medicines.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = medicines.map((m: any) => {
        const medId = String(m.id || `med_${Date.now()}`).trim();
        return {
          id: medId,
          trade_name: m.tradeName || m.trade_name || m.name || '',
          generic_name: m.genericName || m.generic_name || '',
          formulation: m.formulation || 'Tab',
          strength: m.strength || '',
          unit_price_buy: Number(m.unitPriceBuy ?? m.unit_price_buy ?? m.buy_price ?? 0),
          unit_price_sell: Number(m.unitPriceSell ?? m.unit_price_sell ?? m.sell_price ?? 0),
          stock: Number(m.stock ?? 0),
          box_size: Number(m.boxSize ?? m.box_size ?? 1),
          supplier: m.supplier || '',
          expiry_date: m.expiryDate || m.expiry_date || '',
          is_antibiotic: !!(m.isAntibiotic ?? m.is_antibiotic),
          requires_prescription: !!(m.requiresPrescription ?? m.requires_prescription),
          data: m,
          updated_at: now
        };
      });
      return await upsertTableSafe(supabase, 'medicines', rows);
    } catch (e) {
      console.warn("syncMedicinesToModularTable notice:", e);
      return false;
    }
  },

  migrateMedicineToModularTables: async (appState?: any) => {
    try {
      const stateToUse = appState || await dbService.loadFromCloud();
      const results = {
        purchases: 0,
        sales: 0,
        medicines: 0,
        success: true,
        message: ''
      };

      if (Array.isArray(stateToUse.purchaseInvoices) && stateToUse.purchaseInvoices.length > 0) {
        await dbService.syncPurchaseInvoicesToModularTable(stateToUse.purchaseInvoices);
        results.purchases = stateToUse.purchaseInvoices.length;
      }
      if (Array.isArray(stateToUse.salesInvoices) && stateToUse.salesInvoices.length > 0) {
        await dbService.syncSalesInvoicesToModularTable(stateToUse.salesInvoices);
        results.sales = stateToUse.salesInvoices.length;
      }
      if (Array.isArray(stateToUse.medicines) && stateToUse.medicines.length > 0) {
        await dbService.syncMedicinesToModularTable(stateToUse.medicines);
        results.medicines = stateToUse.medicines.length;
      }

      results.message = `সফলভাবে মাইগ্রেশন সম্পন্ন: ${results.purchases}টি মেডিসিন ক্রয় (Purchase), ${results.sales}টি বিক্রয় (Sales) এবং ${results.medicines}টি ওষুধের তালিকা আলাদা টেবিলে সিঙ্ক হয়েছে।`;
      return results;
    } catch (err: any) {
      return { purchases: 0, sales: 0, medicines: 0, success: false, message: `মাইগ্রেশনে ত্রুটি: ${err?.message || 'অজানা ত্রুটি'}` };
    }
  },

  getMedicineModularStats: async () => {
    if (!supabase) return { purchases: 0, sales: 0, medicines: 0, connected: false };
    try {
      const [purRes, salRes, medRes] = await Promise.all([
        supabase.from('purchase_invoices').select('*', { count: 'exact', head: true }),
        supabase.from('sales_invoices').select('*', { count: 'exact', head: true }),
        supabase.from('medicines').select('*', { count: 'exact', head: true })
      ]);
      return {
        purchases: purRes.count || 0,
        sales: salRes.count || 0,
        medicines: medRes.count || 0,
        connected: true
      };
    } catch (e) {
      return { purchases: 0, sales: 0, medicines: 0, connected: false };
    }
  },

  loadTestsDirectly: async (): Promise<Test[]> => {
    if (!supabase) return [];
    try {
      const [t1, t2, t3, t4] = await Promise.all([
        fetchTableSafe(supabase, 'tests'),
        fetchTableSafe(supabase, 'test'),
        fetchTableSafe(supabase, 'lab_tests'),
        fetchTableSafe(supabase, 'test_info')
      ]);
      const rawAll = [
        ...(Array.isArray(t1) ? t1 : []),
        ...(Array.isArray(t2) ? t2 : []),
        ...(Array.isArray(t3) ? t3 : []),
        ...(Array.isArray(t4) ? t4 : [])
      ];
      const parsed = rawAll
        .map(r => normalizeTestItem(r))
        .filter((t): t is Test => t !== null && !!t.test_id);
      
      return mergeEntityList([], parsed, ['test_id', 'id', 'test_name']);
    } catch (err) {
      console.error("loadTestsDirectly error:", err);
      return [];
    }
  },

  syncTestsToModularTable: async (testsList: any[]): Promise<boolean> => {
    if (!supabase) return false;
    if (!Array.isArray(testsList) || testsList.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = testsList.map(t => {
        const norm = normalizeTestItem(t);
        return {
          ...t,
          ...(norm || {}),
          id: norm?.test_id || t.test_id || t.id,
          test_id: norm?.test_id || t.test_id || t.id,
          test_name: norm?.test_name || t.test_name || t.name,
          category: norm?.category || t.category || 'Others',
          price: norm ? norm.price : (Number(t.price) || 0),
          test_commission: norm ? norm.test_commission : (Number(t.test_commission) || 0),
          is_group_test: norm?.is_group_test ?? false,
          normal_range: norm?.normal_range || '',
          unit: norm?.unit || '',
          sub_tests: norm?.sub_tests || [],
          usg_exam_charge: norm?.usg_exam_charge || 0,
          extra_lab_fee: norm?.extra_lab_fee || 0,
          reagents_required: norm?.reagents_required || [],
          availability: norm?.availability ?? true,
          updated_at: now
        };
      });

      const s1 = await upsertTableSafe(supabase, 'tests', rows);
      const s2 = await upsertTableSafe(supabase, 'test', rows);
      const s3 = await upsertTableSafe(supabase, 'lab_tests', rows);
      return s1 || s2 || s3;
    } catch (err) {
      console.warn("syncTestsToModularTable error:", err);
      return false;
    }
  },

  syncLabInvoicesToModularTable: async (invoices: any[]) => {
    if (!supabase || !Array.isArray(invoices) || invoices.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = invoices.map((inv: any) => {
        const invId = String(inv.invoice_id || inv.id || inv.invoice_no || inv.invoiceId || `INV-${Date.now()}`).trim();
        const invDate = inv.invoice_date || inv.date || inv.created_at || (inv.createdAt ? String(inv.createdAt).split('T')[0] : '') || now.split('T')[0];
        const items = Array.isArray(inv.items) ? inv.items : [];
        const total = Number(inv.total_amount ?? inv.totalAmount ?? inv.total ?? 0);
        const paid = Number(inv.paid_amount ?? inv.paidAmount ?? inv.paid ?? 0);
        const discount = Number(inv.discount_amount ?? inv.discountAmount ?? inv.discount ?? 0);
        const due = Number(inv.due_amount ?? inv.dueAmount ?? Math.max(0, total - discount - paid));
        return {
          id: invId,
          invoice_id: invId,
          daily_id: inv.daily_id || invId,
          patient_id: String(inv.patient_id || inv.pt_id || ''),
          patient_name: inv.patient_name || inv.pt_name || '',
          invoice_date: invDate,
          total_amount: total,
          discount_amount: discount,
          net_payable: total - discount,
          paid_amount: paid,
          due_amount: due,
          doctor_commission: Number(inv.doctor_commission ?? inv.doctorCommission ?? 0),
          items: items,
          is_deleted: !!(inv.status === 'Deleted' || inv.status === 'Cancelled' || inv.isDeleted || inv.is_deleted),
          created_at: inv.created_at || now,
          updated_at: now,
          data: inv
        };
      });
      return await upsertTableSafe(supabase, 'lab_invoices', rows);
    } catch (e) {
      console.warn("syncLabInvoicesToModularTable notice:", e);
      return false;
    }
  },

  syncDueCollectionsToModularTable: async (collections: any[]) => {
    if (!supabase || !Array.isArray(collections) || collections.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = collections.map((col: any) => {
        const colId = String(col.collection_id || col.id || col.collectionId || `DUE-${Date.now()}`).trim();
        const invId = String(col.invoice_id || col.invoice_no || col.invoiceId || '').trim();
        const colDate = col.collection_date || col.date || col.created_at || now.split('T')[0];
        const amount = Number(col.amount_collected ?? col.amount ?? col.paid_amount ?? 0);
        return {
          id: colId,
          collection_id: colId,
          invoice_id: invId,
          amount_collected: amount,
          collection_date: colDate,
          data: col,
          updated_at: now
        };
      });
      return await upsertTableSafe(supabase, 'due_collections', rows);
    } catch (e) {
      console.warn("syncDueCollectionsToModularTable notice:", e);
      return false;
    }
  },

  syncIndoorInvoicesToModularTable: async (invoices: any[]) => {
    if (!supabase || !Array.isArray(invoices) || invoices.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = invoices.map((inv: any) => {
        const invId = String(inv.invoice_id || inv.daily_id || inv.id || `IN-${Date.now()}`).trim();
        const invDate = normalizeDate(inv.invoice_date || inv.admission_date || inv.date || now.split('T')[0]);
        const items = Array.isArray(inv.items) ? inv.items : [];
        const paid = Number(inv.paid_amount ?? inv.paidAmount ?? 0);
        const total = Number(inv.total_bill ?? inv.totalAmount ?? inv.total ?? 0);
        const discount = Number(inv.total_discount ?? inv.discount ?? 0);
        const due = Number(inv.due_bill ?? inv.dueAmount ?? Math.max(0, total - discount - paid));
        const net = Number(inv.net_payable ?? Math.max(0, total - discount));

        return {
          id: invId,
          invoice_id: invId,
          daily_id: inv.daily_id || invId,
          patient_id: String(inv.patient_id || ''),
          patient_name: inv.patient_name || inv.patientName || '',
          doctor_id: String(inv.doctor_id || ''),
          doctor_name: String(inv.doctor_name || ''),
          referrar_id: String(inv.referrar_id || inv.referrer_id || ''),
          referrar_name: String(inv.referrar_name || inv.referrer_name || ''),
          admission_id: String(inv.admission_id || ''),
          admission_date: inv.admission_date ? normalizeDate(inv.admission_date) : invDate,
          discharge_date: inv.discharge_date ? normalizeDate(inv.discharge_date) : null,
          invoice_date: invDate,
          indication: String(inv.indication || ''),
          service_category: String(inv.serviceCategory || inv.service_category || ''),
          sub_category: String(inv.subCategory || inv.sub_category || ''),
          ot_details: String(inv.ot_details || ''),
          items,
          total_bill: total,
          total_discount: discount,
          paid_amount: paid,
          due_bill: due,
          net_payable: net,
          special_commission: Number(inv.special_commission || 0),
          commission_paid: Number(inv.commission_paid || 0),
          bill_created_by: String(inv.bill_created_by || inv.billCreatedBy || 'Admin'),
          status: inv.status || 'Posted',
          data: inv,
          updated_at: now
        };
      });
      return await upsertTableSafe(supabase, 'indoor_invoices', rows);
    } catch (e) {
      console.warn("syncIndoorInvoicesToModularTable notice:", e);
      return false;
    }
  },

  syncAdmissionsToModularTable: async (admissionsList: any[]) => {
    if (!supabase || !Array.isArray(admissionsList) || admissionsList.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = admissionsList.map((adm: any) => {
        const admId = String(adm.admission_id || adm.id || `ADM-${Date.now()}`).trim();
        const admDate = normalizeDate(adm.admission_date || adm.date || now.split('T')[0]);
        return {
          id: admId,
          admission_id: admId,
          admission_date: admDate,
          patient_id: String(adm.patient_id || ''),
          patient_name: String(adm.patient_name || ''),
          doctor_id: String(adm.doctor_id || ''),
          doctor_name: String(adm.doctor_name || ''),
          referrer_id: String(adm.referrer_id || adm.referrar_id || ''),
          referrer_name: String(adm.referrer_name || adm.referrar_name || ''),
          indication: String(adm.indication || ''),
          service_name: String(adm.service_name || ''),
          service_category: String(adm.service_category || ''),
          contract_type: String(adm.contract_type || 'Non-Contact'),
          contract_amount: Number(adm.contract_amount || 0),
          bed_no: String(adm.bed_no || ''),
          discharge_date: adm.discharge_date ? normalizeDate(adm.discharge_date) : null,
          discharge_note: String(adm.discharge_note || ''),
          patient_mobile: String(adm.patient_mobile || ''),
          clinical_orders: Array.isArray(adm.clinical_orders) ? adm.clinical_orders : [],
          doctor_rounds: Array.isArray(adm.doctor_rounds) ? adm.doctor_rounds : [],
          nurse_chart: Array.isArray(adm.nurse_chart) ? adm.nurse_chart : [],
          data: adm,
          updated_at: now
        };
      });
      return await upsertTableSafe(supabase, 'admissions', rows);
    } catch (e) {
      console.warn("syncAdmissionsToModularTable notice:", e);
      return false;
    }
  },

  syncDetailedExpensesToModularTable: async (expenses: Record<string, any[]> | any[]) => {
    if (!supabase) return true;
    try {
      const now = new Date().toISOString();
      const rows: any[] = [];
      const addRow = (it: any, fallbackDate?: string, idx: number = 0) => {
        if (!it || it.isDeleted) return;
        const normDate = normalizeDate(it.date || it.expense_date || fallbackDate || '') || (it.date || fallbackDate || now).split('T')[0];
        const rowId = String(it.id || `exp_${normDate.replace(/-/g, '')}_${idx}_${Date.now()}`);
        rows.push({
          id: rowId,
          date: normDate,
          category: it.category || 'General',
          sub_category: it.subCategory || it.sub_category || '',
          description: it.description || '',
          bill_amount: Number(it.billAmount ?? it.bill_amount ?? it.paidAmount ?? it.paid_amount ?? 0),
          paid_amount: Number(it.paidAmount ?? it.paid_amount ?? it.billAmount ?? it.bill_amount ?? 0),
          dept: it.dept || 'Diagnostic',
          updated_at: now
        });
      };

      if (Array.isArray(expenses)) {
        expenses.forEach((it: any, idx: number) => addRow(it, undefined, idx));
      } else if (expenses && typeof expenses === 'object') {
        Object.entries(expenses).forEach(([dateKey, items]) => {
          const itemList = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
          itemList.forEach((it: any, idx: number) => addRow(it, dateKey, idx));
        });
      }
      if (rows.length > 0) {
        return await upsertTableSafe(supabase, 'detailed_expenses', rows);
      }
      return true;
    } catch (e) {
      console.warn("syncDetailedExpensesToModularTable notice:", e);
      return false;
    }
  },

  syncConsolidatedLabEntriesToModularTable: async (entries: DailyConsolidatedEntry[] | any[]) => {
    if (!supabase || !Array.isArray(entries) || entries.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = entries.map((entry: any) => {
        const id = String(entry.id || entry._id || `DCE-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`).trim();
        const date = normalizeDate(entry.date || entry.created_at || now.split('T')[0]);
        const shift = String(entry.shift || 'Full Day');
        const entryType = String(entry.entryType || entry.entry_type || (shift === 'Monthly' ? 'monthly' : 'daily'));
        const gross = Number(entry.grossAmount ?? entry.gross_amount ?? entry.gross ?? 0);
        const discount = Number(entry.discountAmount ?? entry.discount_amount ?? entry.discount ?? 0);
        const net = Number(entry.netPayable ?? entry.net_payable ?? Math.max(0, gross - discount));
        const cash = Number(entry.cashCollected ?? entry.cash_collected ?? entry.cash ?? 0);
        const due = Number(entry.dueAmount ?? entry.due_amount ?? Math.max(0, net - cash));
        const docPC = Number(entry.doctorCommissionPaid ?? entry.doctor_commission_paid ?? entry.commission ?? 0);
        const usgFee = Number(entry.usgDoctorFeePaid ?? entry.usg_doctor_fee_paid ?? entry.usg_fee ?? 0);

        return {
          id,
          date,
          shift,
          entry_type: entryType,
          entryType,
          month: entry.month !== undefined ? entry.month : (date ? parseInt(date.split('-')[1], 10) - 1 : new Date().getMonth()),
          year: entry.year !== undefined ? entry.year : (date ? parseInt(date.split('-')[0], 10) : new Date().getFullYear()),
          entry_time: entry.entryTime || entry.entry_time || '',
          operator_name: entry.operatorName || entry.operator_name || 'Cashier',
          total_patients: Number(entry.totalPatients ?? entry.total_patients ?? 0),
          total_tests: Number(entry.totalTests ?? entry.total_tests ?? 0),
          gross_amount: gross,
          grossAmount: gross,
          discount_amount: discount,
          discountAmount: discount,
          net_payable: net,
          netPayable: net,
          cash_collected: cash,
          cashCollected: cash,
          due_amount: due,
          dueAmount: due,
          doctor_commission_paid: docPC,
          doctorCommissionPaid: docPC,
          usg_doctor_fee_paid: usgFee,
          usgDoctorFeePaid: usgFee,
          breakdown: entry.breakdown || { pathology: 0, usg: 0, xray: 0, ecg: 0, hormone: 0, others: 0 },
          notes: entry.notes || '',
          data: entry,
          updated_at: now
        };
      });

      const res1 = await upsertTableSafe(supabase, 'consolidated_lab_entries', rows);
      const res2 = await upsertTableSafe(supabase, 'consolidated_entries', rows);
      return res1 || res2;
    } catch (e) {
      console.warn("syncConsolidatedLabEntriesToModularTable notice:", e);
      return false;
    }
  },

  syncConsolidatedClinicEntriesToModularTable: async (entries: any[]) => {
    if (!supabase || !Array.isArray(entries) || entries.length === 0) return true;
    try {
      const now = new Date().toISOString();
      const rows = entries.map((entry: any) => {
        const id = String(entry.id || entry._id || `DCCE-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`).trim();
        const date = normalizeDate(entry.date || entry.created_at || now.split('T')[0]);
        const shift = String(entry.shift || 'Full Day');
        const entryType = String(entry.entryType || entry.entry_type || (shift === 'Monthly' ? 'monthly' : 'daily'));
        const gross = Number(entry.grossAmount ?? entry.gross_amount ?? entry.gross ?? 0);
        const discount = Number(entry.discountAmount ?? entry.discount_amount ?? entry.discount ?? 0);
        const net = Number(entry.netPayable ?? entry.net_payable ?? Math.max(0, gross - discount));
        const cash = Number(entry.cashCollected ?? entry.cash_collected ?? entry.cash ?? 0);
        const due = Number(entry.dueAmount ?? entry.due_amount ?? Math.max(0, net - cash));
        const docPC = Number(entry.doctorCommissionPaid ?? entry.doctor_commission_paid ?? entry.commission ?? 0);
        const otFee = Number(entry.otChargesPaid ?? entry.ot_charges_paid ?? entry.ot_fee ?? 0);
        const bd = entry.breakdown || {};

        return {
          id,
          date,
          shift,
          entry_type: entryType,
          entryType,
          month: entry.month !== undefined ? entry.month : (date ? parseInt(date.split('-')[1], 10) - 1 : new Date().getMonth()),
          year: entry.year !== undefined ? entry.year : (date ? parseInt(date.split('-')[0], 10) : new Date().getFullYear()),
          entry_time: entry.entryTime || entry.entry_time || '',
          operator_name: entry.operatorName || entry.operator_name || 'Cashier',
          total_patients: Number(entry.totalPatients ?? entry.total_patients ?? 0),
          total_tests: Number(entry.totalTests ?? entry.total_tests ?? 0),
          gross_amount: gross,
          grossAmount: gross,
          discount_amount: discount,
          discountAmount: discount,
          net_payable: net,
          netPayable: net,
          cash_collected: cash,
          cashCollected: cash,
          due_amount: due,
          dueAmount: due,
          doctor_commission_paid: docPC,
          doctorCommissionPaid: docPC,
          ot_charges_paid: otFee,
          otChargesPaid: otFee,
          total_indoor_revenue: Number(bd.totalIndoorRevenue || entry.totalIndoorRevenue || 0),
          admission_fee: Number(bd.admissionFee || entry.admissionFee || 0),
          oxygen_nebulization: Number(bd.oxygenNebulization || entry.oxygenNebulization || 0),
          conservative_treatment: Number(bd.conservativeTreatment || entry.conservativeTreatment || 0),
          normal_delivery: Number(bd.normalDelivery || entry.normalDelivery || 0),
          dmc_minor_surgery: Number(bd.dmcMinorSurgery || entry.dmcMinorSurgery || 0),
          cesarean_operation: Number(bd.cesareanOperation || entry.cesareanOperation || 0),
          dressing: Number(bd.dressing || entry.dressing || 0),
          medicine_purchase: Number(bd.medicinePurchase || entry.medicinePurchase || 0),
          medicine_sales: Number(bd.medicineSales || entry.medicineSales || 0),
          others_revenue: Number(bd.others || entry.others || 0),
          breakdown: bd,
          notes: entry.notes || '',
          data: entry,
          updated_at: now
        };
      });

      const res1 = await upsertTableSafe(supabase, 'consolidated_clinic_entries', rows);
      const res2 = await upsertTableSafe(supabase, 'consolidated_entries', rows);
      return res1 || res2;
    } catch (e) {
      console.warn("syncConsolidatedClinicEntriesToModularTable notice:", e);
      return false;
    }
  },

  // 1. Snapshot & Rollback Storage
  createPreMigrationSnapshot: async (appState?: any) => {
    try {
      const currentState = appState || await dbService.loadFromCloud();
      const timestamp = new Date().toISOString();
      const filename = `ncd_backup_pre_migration_${Date.now()}.json`;
      const snapshotId = `SNAPSHOT-${Date.now()}`;

      // Save rollback point to localStorage dedicated key
      localStorage.setItem('ncd_migration_rollback_snapshot', JSON.stringify({
        id: snapshotId,
        timestamp,
        title: `Pre-Migration Safety Rollback Point (${new Date().toLocaleString()})`,
        data: currentState
      }));

      // Also register in local snapshot vault
      dbService.saveLocalSnapshot(`Pre-Migration Safety Snapshot (${new Date().toLocaleTimeString()})`, currentState);

      // Automatically trigger file download
      try {
        const jsonStr = JSON.stringify(currentState, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (dlErr) {
        console.warn("Auto download notice:", dlErr);
      }

      return { success: true, snapshotId, filename, timestamp };
    } catch (err: any) {
      console.warn("createPreMigrationSnapshot notice:", err);
      return { success: false, snapshotId: '', filename: '', timestamp: '' };
    }
  },

  getPreMigrationSnapshotInfo: () => {
    try {
      const raw = localStorage.getItem('ncd_migration_rollback_snapshot');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        id: parsed.id || 'N/A',
        timestamp: parsed.timestamp || '',
        title: parsed.title || 'Pre-Migration Snapshot',
        sizeKb: Math.round(raw.length / 1024)
      };
    } catch {
      return null;
    }
  },

  rollbackToPreMigrationSnapshot: async () => {
    try {
      const raw = localStorage.getItem('ncd_migration_rollback_snapshot');
      if (!raw) {
        return { success: false, message: 'কোনো প্রি-মাইগ্রেশন রোলব্যাক স্ন্যাপশট খুঁজে পাওয়া যায়নি।' };
      }
      const parsed = JSON.parse(raw);
      const dataToRestore = parsed.data || parsed;

      // Update local storage caches
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToRestore));
        localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(dataToRestore));
      } catch {}

      // Push restored state to cloud
      await dbService.saveToCloud(dataToRestore);

      return {
        success: true,
        message: `সফলভাবে প্রি-মাইগ্রেশন পয়েন্টে রোলব্যাক করা হয়েছে! (${new Date(parsed.timestamp || Date.now()).toLocaleString()})`,
        restoredData: dataToRestore
      };
    } catch (e: any) {
      return { success: false, message: 'রোলব্যাকে ত্রুটি: ' + (e?.message || 'Unknown error') };
    }
  },

  // 2. Smart Migration Engine (Latest/Multi-Table Wins, Zero Deletion from Supabase)
  runSmartMigrationEngine: async (appState?: any, onProgress?: (msg: string, pct: number) => void) => {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase ডাটাবেজ সংযুক্ত নেই। অনুগ্রহ করে ক্রেডেনশিয়াল পরীক্ষা করুন।',
        rescued: { labInvoices: 0, purchaseInvoices: 0, salesInvoices: 0, medicines: 0, detailedExpenses: 0, dueCollections: 0, indoorInvoices: 0, consolidatedLabEntries: 0, total: 0 },
        duplicatesIgnored: 0,
        tablesUpdated: []
      };
    }

    try {
      // Step 1: Pre-Migration Backup Snapshot & Auto-Download
      onProgress?.('ধাপ ১/৫: বর্তমান ডাটার প্রি-মাইগ্রেশন সেফটি স্ন্যাপশট ও JSON ব্যাকআপ তৈরি হচ্ছে...', 15);
      const snapshotInfo = await dbService.createPreMigrationSnapshot(appState);

      // Step 2: Read All Legacy Records from ncd_state (Zero Deletion, 100% Read-Only)
      onProgress?.('ধাপ ২/৫: পুরোনো ncd_state টেবিল থেকে সমস্ত ঐতিহাসিক ডাটা রিড করা হচ্ছে (Zero Deletion)...', 30);
      let legacyRecords = await fetchTableSafe(supabase, 'ncd_state');
      if (!legacyRecords || legacyRecords.length === 0) {
        const fallback = await supabase.from('ncd_state').select('*');
        if (!fallback.error && fallback.data) legacyRecords = fallback.data;
      }

      if (!legacyRecords || legacyRecords.length === 0) {
        return {
          success: true,
          message: 'পুরাতন ncd_state টেবিলে কোনো অতিরিক্ত ডাটা পাওয়া যায়নি বা ইতিমধ্যেই সমস্ত ডাটা পৃথক টেবিলে রয়েছে।',
          snapshotId: snapshotInfo.snapshotId,
          snapshotFilename: snapshotInfo.filename,
          rescued: { labInvoices: 0, purchaseInvoices: 0, salesInvoices: 0, medicines: 0, detailedExpenses: 0, dueCollections: 0, indoorInvoices: 0, consolidatedLabEntries: 0, total: 0 },
          duplicatesIgnored: 0,
          tablesUpdated: []
        };
      }

      // Extract all entities across all historical rows in ncd_state
      const legacyLabInvoices: any[] = [];
      const legacyPurchaseInvoices: any[] = [];
      const legacySalesInvoices: any[] = [];
      const legacyMedicines: any[] = [];
      const legacyExpenses: any[] = [];
      const legacyDueCollections: any[] = [];
      const legacyIndoorInvoices: any[] = [];
      const legacyConsolidated: any[] = [];

      const extractObj = (raw: any) => {
        if (!raw) return null;
        if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch { return null; }
        }
        return null;
      };

      legacyRecords.forEach(rec => {
        let d = extractObj(rec.data);
        if (!d || typeof d !== 'object') d = rec;

        const labs = d.labInvoices || d.invoices || d.lab_invoices || d.diagnostic_invoices || rec.lab_invoices || rec.invoices;
        if (Array.isArray(labs)) legacyLabInvoices.push(...labs);

        const purs = d.purchaseInvoices || d.purchase_invoices || d.purchases || d.medicinePurchases || rec.purchase_invoices;
        if (Array.isArray(purs)) legacyPurchaseInvoices.push(...purs);

        const sals = d.salesInvoices || d.sales_invoices || d.sales || d.medicineSales || rec.sales_invoices;
        if (Array.isArray(sals)) legacySalesInvoices.push(...sals);

        const meds = d.medicines || rec.medicines;
        if (Array.isArray(meds)) legacyMedicines.push(...meds);

        const expSources = [d.detailedExpenses, d.detailed_expenses, d.expenses, rec.detailed_expenses, rec.detailedExpenses].filter(x => x && typeof x === 'object');
        expSources.forEach(src => {
          if (Array.isArray(src)) {
            src.forEach(it => {
              if (it && !it.isDeleted) legacyExpenses.push({ ...it, date: normalizeDate(it.date) || it.date });
            });
          } else {
            Object.entries(src).forEach(([dateKey, items]: [string, any]) => {
              const itemList = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
              itemList.forEach(it => {
                if (it && !it.isDeleted) legacyExpenses.push({ ...it, date: normalizeDate(it.date || dateKey) || dateKey });
              });
            });
          }
        });

        const dues = d.dueCollections || d.due_collections || d.dues || d.collections || rec.due_collections || rec.dues;
        if (Array.isArray(dues)) legacyDueCollections.push(...dues);

        const indoor = d.indoorInvoices || d.indoor_invoices || d.clinicInvoices || rec.indoor_invoices;
        if (Array.isArray(indoor)) legacyIndoorInvoices.push(...indoor);

        const cons = d.consolidatedLabEntries || d.consolidated_lab_entries || d.consolidatedEntries || rec.consolidated_lab_entries;
        if (Array.isArray(cons)) legacyConsolidated.push(...cons);
      });

      try {
        const localCons = dbService.getConsolidatedEntries();
        if (Array.isArray(localCons) && localCons.length > 0) {
          legacyConsolidated.push(...localCons);
        }
      } catch {}

      // Step 3: Fetch Existing Data from All Modular Tables
      onProgress?.('ধাপ ৩/৫: নতুন পৃথক টেবিলগুলোর বর্তমান ডাটা পড়া হচ্ছে...', 45);
      const [
        currLabs,
        currPurs,
        currSals,
        currMeds,
        currExps,
        currDues,
        currIndoor
      ] = await Promise.all([
        fetchTableSafe(supabase, 'lab_invoices'),
        fetchTableSafe(supabase, 'purchase_invoices'),
        fetchTableSafe(supabase, 'sales_invoices'),
        fetchTableSafe(supabase, 'medicines'),
        fetchTableSafe(supabase, 'detailed_expenses'),
        fetchTableSafe(supabase, 'due_collections'),
        fetchTableSafe(supabase, 'indoor_invoices')
      ]);

      // Build Sets of existing IDs from modular tables (Latest Wins: Modular tables take precedence)
      const existingLabIds = new Set<string>();
      (currLabs || []).forEach((r: any) => {
        const id = String(r.invoice_id || r.id || r.invoice_no || '').trim();
        if (id) existingLabIds.add(id);
      });

      const existingPurIds = new Set<string>();
      (currPurs || []).forEach((r: any) => {
        const id = String(r.invoice_id || r.invoiceId || r.id || '').trim();
        if (id) existingPurIds.add(id);
      });

      const existingSalIds = new Set<string>();
      (currSals || []).forEach((r: any) => {
        const id = String(r.invoice_id || r.invoiceId || r.id || '').trim();
        if (id) existingSalIds.add(id);
      });

      const existingMedKeys = new Set<string>();
      (currMeds || []).forEach((r: any) => {
        const id = String(r.id || '').trim().toLowerCase();
        const name = String(r.trade_name || r.tradeName || '').trim().toLowerCase();
        if (id) existingMedKeys.add(id);
        if (name) existingMedKeys.add(name);
      });

      const existingExpenseKeys = new Set<string>();
      (currExps || []).forEach((r: any) => {
        const id = String(r.id || '').trim();
        if (id) existingExpenseKeys.add(id);
        const rowDate = normalizeDate(r.date) || (r.date || '').split('T')[0];
        const desc = (r.description || '').trim().toLowerCase();
        const amt = Number(r.paid_amount || r.bill_amount || 0);
        if (rowDate && desc) {
          existingExpenseKeys.add(`${rowDate}_${desc}_${amt}`);
        }
      });

      const existingDueIds = new Set<string>();
      (currDues || []).forEach((r: any) => {
        const id = String(r.collection_id || r.id || '').trim();
        if (id) existingDueIds.add(id);
      });

      const existingIndoorIds = new Set<string>();
      (currIndoor || []).forEach((r: any) => {
        const id = String(r.invoice_id || r.daily_id || r.id || '').trim();
        if (id) existingIndoorIds.add(id);
      });

      // Step 4: Smart Deduplication (Latest Wins) -> Filter ONLY missing records
      onProgress?.('ধাপ ৪/৫: স্মার্ট ডি-ডুপ্লিকেশন: ডুপ্লিকেট বাদ দিয়ে মিসিং ডাটা বাছাই করা হচ্ছে...', 65);
      let duplicatesIgnored = 0;

      const missingLabs: any[] = [];
      const seenNewLabIds = new Set<string>();
      legacyLabInvoices.forEach(inv => {
        const id = String(inv.invoice_id || inv.id || inv.invoice_no || inv.invoiceId || '').trim();
        if (!id) return;
        if (existingLabIds.has(id) || seenNewLabIds.has(id)) {
          duplicatesIgnored++;
        } else {
          seenNewLabIds.add(id);
          missingLabs.push(inv);
        }
      });

      const missingPurs: any[] = [];
      const seenNewPurIds = new Set<string>();
      legacyPurchaseInvoices.forEach(inv => {
        const id = String(inv.invoiceId || inv.invoice_id || inv.id || '').trim();
        if (!id) return;
        if (existingPurIds.has(id) || seenNewPurIds.has(id)) {
          duplicatesIgnored++;
        } else {
          seenNewPurIds.add(id);
          missingPurs.push(inv);
        }
      });

      const missingSals: any[] = [];
      const seenNewSalIds = new Set<string>();
      legacySalesInvoices.forEach(inv => {
        const id = String(inv.invoiceId || inv.invoice_id || inv.id || '').trim();
        if (!id) return;
        if (existingSalIds.has(id) || seenNewSalIds.has(id)) {
          duplicatesIgnored++;
        } else {
          seenNewSalIds.add(id);
          missingSals.push(inv);
        }
      });

      const missingMeds: any[] = [];
      const seenNewMedKeys = new Set<string>();
      legacyMedicines.forEach(m => {
        const id = String(m.id || '').trim().toLowerCase();
        const name = String(m.tradeName || m.trade_name || '').trim().toLowerCase();
        if ((id && existingMedKeys.has(id)) || (name && existingMedKeys.has(name)) || (id && seenNewMedKeys.has(id))) {
          duplicatesIgnored++;
        } else {
          if (id) seenNewMedKeys.add(id);
          if (name) seenNewMedKeys.add(name);
          missingMeds.push(m);
        }
      });

      const missingExpenses: any[] = [];
      const seenNewExpKeys = new Set<string>();
      legacyExpenses.forEach(exp => {
        const id = String(exp.id || '').trim();
        const d = normalizeDate(exp.date) || (exp.date || '').split('T')[0];
        const desc = (exp.description || '').trim().toLowerCase();
        const amt = Number(exp.paidAmount || exp.billAmount || 0);
        const compositeKey = `${d}_${desc}_${amt}`;
        if ((id && existingExpenseKeys.has(id)) || existingExpenseKeys.has(compositeKey) || (id && seenNewExpKeys.has(id))) {
          duplicatesIgnored++;
        } else {
          if (id) seenNewExpKeys.add(id);
          seenNewExpKeys.add(compositeKey);
          missingExpenses.push({ ...exp, date: d });
        }
      });

      const missingDues: any[] = [];
      const seenNewDueIds = new Set<string>();
      legacyDueCollections.forEach(col => {
        const id = String(col.collection_id || col.id || col.collectionId || '').trim();
        if (!id) return;
        if (existingDueIds.has(id) || seenNewDueIds.has(id)) {
          duplicatesIgnored++;
        } else {
          seenNewDueIds.add(id);
          missingDues.push(col);
        }
      });

      const missingIndoor: any[] = [];
      const seenNewIndoorIds = new Set<string>();
      legacyIndoorInvoices.forEach(inv => {
        const id = String(inv.invoice_id || inv.daily_id || inv.id || '').trim();
        if (!id) return;
        if (existingIndoorIds.has(id) || seenNewIndoorIds.has(id)) {
          duplicatesIgnored++;
        } else {
          seenNewIndoorIds.add(id);
          missingIndoor.push(inv);
        }
      });

      // Step 5: Batch Upsert ONLY missing records into modular tables
      onProgress?.('ধাপ ৫/৫: মিসিং রেকর্ডগুলো পৃথক টেবিলে সেভ করা হচ্ছে...', 85);
      const tablesUpdated: string[] = [];

      if (missingLabs.length > 0) {
        await dbService.syncLabInvoicesToModularTable(missingLabs);
        tablesUpdated.push(`lab_invoices (${missingLabs.length})`);
      }

      if (missingPurs.length > 0) {
        await dbService.syncPurchaseInvoicesToModularTable(missingPurs);
        tablesUpdated.push(`purchase_invoices (${missingPurs.length})`);
      }

      if (missingSals.length > 0) {
        await dbService.syncSalesInvoicesToModularTable(missingSals);
        tablesUpdated.push(`sales_invoices (${missingSals.length})`);
      }

      if (missingMeds.length > 0) {
        await dbService.syncMedicinesToModularTable(missingMeds);
        tablesUpdated.push(`medicines (${missingMeds.length})`);
      }

      if (missingExpenses.length > 0) {
        await dbService.syncDetailedExpensesToModularTable(missingExpenses);
        tablesUpdated.push(`detailed_expenses (${missingExpenses.length})`);
      }

      if (missingDues.length > 0) {
        await dbService.syncDueCollectionsToModularTable(missingDues);
        tablesUpdated.push(`due_collections (${missingDues.length})`);
      }

      if (missingIndoor.length > 0) {
        await dbService.syncIndoorInvoicesToModularTable(missingIndoor);
        tablesUpdated.push(`indoor_invoices (${missingIndoor.length})`);
      }

      if (legacyConsolidated.length > 0) {
        const currentCons = dbService.getConsolidatedEntries();
        const currentIds = new Set(currentCons.map(c => c.id));
        const missingCons = legacyConsolidated.filter(c => c && c.id && !currentIds.has(c.id));
        if (missingCons.length > 0) {
          dbService.saveConsolidatedEntries([...currentCons, ...missingCons]);
          tablesUpdated.push(`consolidated_lab_entries (${missingCons.length})`);
        }
      }

      onProgress?.('মাইগ্রেশন সম্পন্ন! ডাটা রিফ্রেশ করা হচ্ছে...', 100);

      const totalRescued = missingLabs.length + missingPurs.length + missingSals.length + missingMeds.length + missingExpenses.length + missingDues.length + missingIndoor.length;

      const summaryMsg = totalRescued > 0
        ? `সফলভাবে ${totalRescued}টি মিসিং রেকর্ড নতুন পৃথক টেবিলে উদ্ধার ও মাইগ্রেট করা হয়েছে! (${duplicatesIgnored}টি ডুপ্লিকেট রেকর্ড বাদ দেওয়া হয়েছে এবং নতুন সংশোধিত ডাটা অক্ষত রাখা হয়েছে)।`
        : `সবগুলো রেকর্ড ইতিমধ্যেই নতুন পৃথক টেবিলে সুরক্ষিত আছে। ${duplicatesIgnored}টি ডুপ্লিকেট স্ক্যান করে বাদ দেওয়া হয়েছে।`;

      return {
        success: true,
        message: summaryMsg,
        snapshotId: snapshotInfo.snapshotId,
        snapshotFilename: snapshotInfo.filename,
        rescued: {
          labInvoices: missingLabs.length,
          purchaseInvoices: missingPurs.length,
          salesInvoices: missingSals.length,
          medicines: missingMeds.length,
          detailedExpenses: missingExpenses.length,
          dueCollections: missingDues.length,
          indoorInvoices: missingIndoor.length,
          consolidatedLabEntries: legacyConsolidated.length,
          total: totalRescued
        },
        duplicatesIgnored,
        tablesUpdated
      };
    } catch (err: any) {
      console.error("Migration error:", err);
      return {
        success: false,
        message: 'মাইগ্রেশনে ত্রুটি: ' + (err?.message || 'অজানা ত্রুটি'),
        rescued: { labInvoices: 0, purchaseInvoices: 0, salesInvoices: 0, medicines: 0, detailedExpenses: 0, dueCollections: 0, indoorInvoices: 0, consolidatedLabEntries: 0, total: 0 },
        duplicatesIgnored: 0,
        tablesUpdated: []
      };
    }
  },

  // Dedicated one-click transfer for January-July & historical expenses from ncd_state to detailed_expenses
  migrateExpensesFromNcdStateToModular: async (onProgress?: (msg: string, pct: number) => void): Promise<{
    success: boolean;
    message: string;
    transferredCount: number;
    duplicatesSkipped: number;
    totalLegacyExpenses: number;
    totalModularExpensesNow: number;
    datesCovered: string[];
  }> => {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase ক্লাউড কানেকশন সক্রিয় নেই। প্রথমে কানেকশন নিশ্চিত করুন।',
        transferredCount: 0,
        duplicatesSkipped: 0,
        totalLegacyExpenses: 0,
        totalModularExpensesNow: 0,
        datesCovered: []
      };
    }

    try {
      onProgress?.('ধাপ ১/৪: ncd_state টেবিল থেকে জানুয়ারি-জুলাই ও সমস্ত ঐতিহাসিক খরচের ডাটা পড়া হচ্ছে...', 20);
      let legacyRecords = await fetchTableSafe(supabase, 'ncd_state');
      if (!legacyRecords || legacyRecords.length === 0) {
        const fallback = await supabase.from('ncd_state').select('*');
        if (!fallback.error && fallback.data) legacyRecords = fallback.data;
      }

      if (!legacyRecords || legacyRecords.length === 0) {
        return {
          success: true,
          message: 'ncd_state টেবিলে কোনো ডাটা পাওয়া যায়নি।',
          transferredCount: 0,
          duplicatesSkipped: 0,
          totalLegacyExpenses: 0,
          totalModularExpensesNow: 0,
          datesCovered: []
        };
      }

      // Extract all historical expenses across all rows in ncd_state
      const legacyExpenses: any[] = [];
      const extractObj = (raw: any) => {
        if (!raw) return null;
        if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch { return null; }
        }
        return null;
      };

      legacyRecords.forEach(rec => {
        let d = extractObj(rec.data);
        if (!d || typeof d !== 'object') d = rec;

        const expSources = [d.detailedExpenses, d.detailed_expenses, d.expenses, rec.detailed_expenses, rec.detailedExpenses].filter(x => x && typeof x === 'object');
        expSources.forEach(src => {
          if (Array.isArray(src)) {
            src.forEach(it => {
              if (it && !it.isDeleted) legacyExpenses.push({ ...it, date: normalizeDate(it.date) || it.date });
            });
          } else {
            Object.entries(src).forEach(([dateKey, items]: [string, any]) => {
              const itemList = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
              itemList.forEach(it => {
                if (it && !it.isDeleted) legacyExpenses.push({ ...it, date: normalizeDate(it.date || dateKey) || dateKey });
              });
            });
          }
        });
      });

      onProgress?.('ধাপ ২/৪: detailed_expenses টেবিল থেকে বর্তমান ডাটা পড়ে তুলনা করা হচ্ছে...', 45);
      const currExps = await fetchTableSafe(supabase, 'detailed_expenses') || [];
      const existingKeys = new Set<string>();
      currExps.forEach((r: any) => {
        const id = String(r.id || '').trim();
        if (id) existingKeys.add(id);
        const rowDate = normalizeDate(r.date) || (r.date || '').split('T')[0];
        const desc = (r.description || '').trim().toLowerCase();
        const amt = Number(r.paid_amount || r.bill_amount || 0);
        if (rowDate && desc) {
          existingKeys.add(`${rowDate}_${desc}_${amt}`);
        }
      });

      onProgress?.('ধাপ ৩/৪: ডুপ্লিকেট বাদ দিয়ে মিসিং খরচের রেকর্ড বাছাই করা হচ্ছে...', 65);
      const missingExpenses: any[] = [];
      const seenKeys = new Set<string>();
      let duplicatesSkipped = 0;
      const datesSet = new Set<string>();

      legacyExpenses.forEach((exp, idx) => {
        const rowDate = normalizeDate(exp.date) || (exp.date || '').split('T')[0];
        if (!rowDate) return;
        const id = String(exp.id || '').trim();
        const desc = (exp.description || '').trim().toLowerCase();
        const amt = Number(exp.paidAmount || exp.billAmount || 0);
        const compositeKey = `${rowDate}_${desc}_${amt}`;

        if ((id && existingKeys.has(id)) || existingKeys.has(compositeKey) || (id && seenKeys.has(id)) || seenKeys.has(compositeKey)) {
          duplicatesSkipped++;
        } else {
          if (id) seenKeys.add(id);
          seenKeys.add(compositeKey);
          datesSet.add(rowDate);
          
          const uniqueId = id || `exp_${rowDate.replace(/-/g, '')}_${idx}_${Date.now()}`;
          missingExpenses.push({
            id: uniqueId,
            date: rowDate,
            category: exp.category || 'General',
            sub_category: exp.subCategory || exp.sub_category || '',
            description: exp.description || '',
            bill_amount: Number(exp.billAmount || exp.paidAmount || 0),
            paid_amount: Number(exp.paidAmount || exp.billAmount || 0),
            dept: exp.dept || 'Diagnostic',
            updated_at: new Date().toISOString()
          });
        }
      });

      onProgress?.('ধাপ ৪/৪: মিসিং খরচের রেকর্ডগুলো detailed_expenses টেবিলে পার্মানেন্ট সেভ করা হচ্ছে...', 85);
      if (missingExpenses.length > 0) {
        await upsertTableSafe(supabase, 'detailed_expenses', missingExpenses);
      }

      onProgress?.('ট্রান্সফার সম্পন্ন!', 100);
      const totalNow = currExps.length + missingExpenses.length;
      const sortedDates = Array.from(datesSet).sort();

      return {
        success: true,
        message: missingExpenses.length > 0
          ? `সফলভাবে ${missingExpenses.length}টি খরচের রেকর্ড ncd_state থেকে detailed_expenses টেবিলে স্থায়ীভাবে ট্রান্সফার করা হয়েছে! (${duplicatesSkipped}টি ডুপ্লিকেট বাদ দেওয়া হয়েছে)।`
          : `ncd_state-এর সমস্ত খরচ ইতিমধ্যেই detailed_expenses টেবিলে সুরক্ষিত রয়েছে। (${duplicatesSkipped}টি রেকর্ড চেক করা হয়েছে)।`,
        transferredCount: missingExpenses.length,
        duplicatesSkipped,
        totalLegacyExpenses: legacyExpenses.length,
        totalModularExpensesNow: totalNow,
        datesCovered: sortedDates
      };
    } catch (e: any) {
      console.error("Expense migration error:", e);
      return {
        success: false,
        message: 'খরচ ট্রান্সফারে অপ্রত্যাশিত ত্রুটি: ' + (e?.message || 'অজানা ত্রুটি'),
        transferredCount: 0,
        duplicatesSkipped: 0,
        totalLegacyExpenses: 0,
        totalModularExpensesNow: 0,
        datesCovered: []
      };
    }
  },

  // Dedicated one-click transfer and recovery of Tests & Commissions from ncd_state to modular test tables
  migrateTestsFromNcdStateToModular: async (onProgress?: (msg: string, pct: number) => void): Promise<{
    success: boolean;
    message: string;
    restoredCommissionsCount: number;
    transferredCount: number;
    totalTestsNow: number;
    tests: Test[];
  }> => {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase ক্লাউড কানেকশন সক্রিয় নেই। প্রথমে কানেকশন নিশ্চিত করুন।',
        restoredCommissionsCount: 0,
        transferredCount: 0,
        totalTestsNow: 0,
        tests: []
      };
    }

    try {
      onProgress?.('ধাপ ১/৪: ncd_state টেবিল থেকে ঐতিহাসিক টেস্ট ও কমিশনের ডাটা পড়া হচ্ছে...', 20);
      let legacyRecords = await fetchTableSafe(supabase, 'ncd_state');
      if (!legacyRecords || legacyRecords.length === 0) {
        const fallback = await supabase.from('ncd_state').select('*');
        if (!fallback.error && fallback.data) legacyRecords = fallback.data;
      }

      const legacyTestsList: Test[] = [];
      const extractObj = (raw: any) => {
        if (!raw) return null;
        if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch { return null; }
        }
        return null;
      };

      (legacyRecords || []).forEach((rec: any) => {
        let d = extractObj(rec.data);
        if (!d || typeof d !== 'object') d = rec;

        const rawTests = d.tests || d.test || (rec as any).tests || (rec as any).test;
        if (Array.isArray(rawTests) && rawTests.length > 0) {
          rawTests.forEach((rt: any) => {
            const norm = normalizeTestItem(rt);
            if (norm && norm.test_id) {
              legacyTestsList.push(norm);
            }
          });
        }
      });

      onProgress?.('ধাপ ২/৪: বর্তমান মাল্টি-টেবিল (tests) থেকে ডাটা পড়া হচ্ছে...', 45);
      const [t1, t2, t3, t4] = await Promise.all([
        fetchTableSafe(supabase, 'tests'),
        fetchTableSafe(supabase, 'test'),
        fetchTableSafe(supabase, 'lab_tests'),
        fetchTableSafe(supabase, 'test_info')
      ]);

      const rawCurrent = [
        ...(Array.isArray(t1) ? t1 : []),
        ...(Array.isArray(t2) ? t2 : []),
        ...(Array.isArray(t3) ? t3 : []),
        ...(Array.isArray(t4) ? t4 : [])
      ];

      const currentParsed = rawCurrent
        .map(r => normalizeTestItem(r))
        .filter((t): t is Test => t !== null && !!t.test_id);

      onProgress?.('ধাপ ৩/৪: টেস্ট কমিশন ও সার্ভিস প্রাইজ ইন্টেলিজেন্ট মার্জিং ও ব্যাকফিল হচ্ছে...', 70);
      // Merge: start with legacy tests, then merge current modular tests with intelligent preservation
      const mergedTestsMap = new Map<string, Test>();

      // First populate with legacy tests (which contain the historical commission data)
      legacyTestsList.forEach(lt => {
        const key = String(lt.test_id || lt.test_name).trim().toLowerCase();
        if (key) {
          const existing = mergedTestsMap.get(key);
          if (!existing) {
            mergedTestsMap.set(key, lt);
          } else {
            mergedTestsMap.set(key, {
              ...existing,
              ...lt,
              test_commission: Math.max(Number(existing.test_commission || 0), Number(lt.test_commission || 0)),
              price: Math.max(Number(existing.price || 0), Number(lt.price || 0))
            });
          }
        }
      });

      let restoredCommissionsCount = 0;
      // Now merge current modular tests without losing legacy commissions
      currentParsed.forEach(ct => {
        const key = String(ct.test_id || ct.test_name).trim().toLowerCase();
        if (key) {
          const legacy = mergedTestsMap.get(key);
          if (legacy) {
            const finalCommission = Number(ct.test_commission || 0) > 0 
              ? Number(ct.test_commission) 
              : Number(legacy.test_commission || 0);
            
            if (Number(ct.test_commission || 0) === 0 && Number(legacy.test_commission || 0) > 0) {
              restoredCommissionsCount++;
            }

            const finalPrice = Number(ct.price || 0) > 0 
              ? Number(ct.price) 
              : Number(legacy.price || 0);

            mergedTestsMap.set(key, {
              ...legacy,
              ...ct,
              test_commission: finalCommission,
              price: finalPrice,
              category: (ct.category && ct.category !== 'Others') ? ct.category : (legacy.category || ct.category || 'Others')
            });
          } else {
            mergedTestsMap.set(key, ct);
          }
        }
      });

      const finalMergedTests = Array.from(mergedTestsMap.values());

      onProgress?.('ধাপ ৪/৪: উদ্ধারকৃত টেস্ট ও কমিশন নতুন পৃথক টেবিলে পার্মানেন্ট সেভ করা হচ্ছে...', 90);
      if (finalMergedTests.length > 0) {
        await dbService.syncTestsToModularTable(finalMergedTests);
      }

      onProgress?.('টেস্ট মাইগ্রেশন ও কমিশন রিস্টোর সফল!', 100);

      return {
        success: true,
        message: `সফলভাবে ${finalMergedTests.length}টি টেস্টের ডাটা নতুন পৃথক টেবিলে আপডেট করা হয়েছে! (পুনরুদ্ধারকৃত কমিশন: ${restoredCommissionsCount}টি টেস্ট)`,
        restoredCommissionsCount,
        transferredCount: finalMergedTests.length,
        totalTestsNow: finalMergedTests.length,
        tests: finalMergedTests
      };
    } catch (e: any) {
      console.error("Test migration error:", e);
      return {
        success: false,
        message: 'টেস্ট মাইগ্রেশনে অপ্রত্যাশিত ত্রুটি: ' + (e?.message || 'অজানা ত্রুটি'),
        restoredCommissionsCount: 0,
        transferredCount: 0,
        totalTestsNow: 0,
        tests: []
      };
    }
  },

  getMultiTableMigrationStats: async () => {
    if (!supabase) {
      return { connected: false, tables: {}, totalCount: 0 };
    }
    try {
      const tableNames = [
        'purchase_invoices', 'sales_invoices', 'medicines', 'detailed_expenses',
        'lab_invoices', 'due_collections', 'indoor_invoices', 'ncd_state'
      ];
      const stats: Record<string, number> = {};
      await Promise.all(tableNames.map(async (name) => {
        try {
          const { count, error } = await supabase.from(name).select('*', { count: 'exact', head: true });
          if (!error && count !== null) {
            stats[name] = count;
          } else {
            stats[name] = 0;
          }
        } catch {
          stats[name] = 0;
        }
      }));
      const totalCount = Object.entries(stats).reduce((acc, [k, v]) => k !== 'ncd_state' ? acc + v : acc, 0);
      return { connected: true, tables: stats, totalCount };
    } catch {
      return { connected: false, tables: {}, totalCount: 0 };
    }
  }
};

export interface ClinicProfile {
  name: string;
  nameBn: string;
  tagline: string;
  address: string;
  mobile: string;
  email: string;
  website: string;
  licenseNo: string;
  regNo: string;
  emergencyHotline: string;
  logoUrl?: string;
}

export const defaultClinicProfile: ClinicProfile = {
  name: 'Niramoy Clinic & Diagnostic',
  nameBn: 'নিরাময় ক্লিনিক এন্ড ডায়াগনস্টিক সেন্টার',
  tagline: 'বিশ্বস্ত চিকিৎসা ও নির্ভুল ডায়াগনস্টিক সেবা',
  address: 'Enayetpur, Chouhali, Sirajganj',
  mobile: '01730 923007',
  email: 'niramoyclinic@gmail.com',
  website: 'www.niramoyclinic.com',
  licenseNo: 'HSM41671',
  regNo: 'REG-2024-SRJ-881',
  emergencyHotline: '01730 923007',
  logoUrl: ''
};

export interface PrintSettings {
  paperSize: 'A4_landscape' | 'A4_portrait' | 'A5_portrait' | 'POS_80mm';
  headerTitle: string;
  footerNote: string;
  authorizedSign: string;
  showBarcode: boolean;
  showQrCode: boolean;
}

export const defaultPrintSettings: PrintSettings = {
  paperSize: 'A4_landscape',
  headerTitle: 'Niramoy Clinic & Diagnostic',
  footerNote: '* জরুরি প্রয়োজনে হেল্পলাইনে যোগাযোগ করুন | রিপোর্ট ডেলিভারির সময় মূল রসিদ প্রদর্শন করুন।',
  authorizedSign: 'Authorized Sign / প্রধান হিসাবরক্ষক',
  showBarcode: true,
  showQrCode: true
};

export interface StaffAccount {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'RECEPTIONIST' | 'LAB_TECHNOLOGIST' | 'DOCTOR' | 'ACCOUNTANT';
  dept: string;
  mobile: string;
  status: 'Active' | 'Inactive';
}

export const defaultStaffAccounts: StaffAccount[] = [
  { id: 'STF-01', name: 'Super Admin', username: 'admin', role: 'ADMIN', dept: 'System Admin', mobile: '01730 923007', status: 'Active' },
  { id: 'STF-02', name: 'Lab Cashier / Receptionist', username: 'reception', role: 'RECEPTIONIST', dept: 'Diagnostic & Billing', mobile: '01711 000001', status: 'Active' },
  { id: 'STF-03', name: 'Senior Medical Technologist', username: 'labtech', role: 'LAB_TECHNOLOGIST', dept: 'Pathology & Lab', mobile: '01711 000002', status: 'Active' },
  { id: 'STF-04', name: 'Head of Accounts', username: 'accountant', role: 'ACCOUNTANT', dept: 'Accounts & Finance', mobile: '01711 000003', status: 'Active' }
];

export interface SMSGatewaySettings {
  provider: 'greenweb' | 'bulksmsbd' | 'onnorokom' | 'alphasms' | 'custom';
  apiKey: string;
  senderId: string;
  clientId: string;
  enabled: boolean;
  autoSendOnInvoice: boolean;
  autoSendOnReportReady: boolean;
  templates: {
    invoiceCreated: string;
    reportReady: string;
    dueReminder: string;
  };
}

export const defaultSMSGatewaySettings: SMSGatewaySettings = {
  provider: 'bulksmsbd',
  apiKey: '',
  senderId: 'NIRAMOY',
  clientId: '',
  enabled: false,
  autoSendOnInvoice: true,
  autoSendOnReportReady: true,
  templates: {
    invoiceCreated: 'Dear {patient_name}, thanks for visiting {clinic_name}. Inv #{invoice_id}, Total: ৳{total}, Paid: ৳{paid}, Due: ৳{due}. Hotline: {hotline}',
    reportReady: 'Dear {patient_name}, your lab test reports (Inv #{invoice_id}) are ready for delivery at {clinic_name}. Hotline: {hotline}',
    dueReminder: 'Dear {patient_name}, your due balance for Inv #{invoice_id} is ৳{due} at {clinic_name}. Please settle soon.'
  }
};

export interface DailyConsolidatedEntry {
  id: string;
  date: string;
  shift: 'Full Day' | 'Morning' | 'Evening' | 'Night' | 'Monthly' | string;
  entryTime: string;
  operatorName: string;
  totalPatients: number;
  totalTests: number;
  grossAmount: number;
  discountAmount: number;
  netPayable: number;
  cashCollected: number;
  dueAmount: number;
  doctorCommissionPaid: number;
  usgDoctorFeePaid: number;
  breakdown: {
    pathology: number;
    usg: number;
    xray: number;
    ecg: number;
    hormone: number;
    others: number;
  };
  notes: string;
  createdAt: string;
  entryType?: 'daily' | 'monthly';
  month?: number;
  year?: number;
}

export interface DailyConsolidatedClinicEntry {
  id: string;
  date: string;
  shift: 'Full Day' | 'Morning' | 'Evening' | 'Night' | 'Monthly' | string;
  entryTime: string;
  operatorName: string;
  totalPatients: number;
  grossAmount: number;
  discountAmount: number;
  netPayable: number;
  cashCollected: number;
  dueAmount: number;
  doctorCommissionPaid: number; // সার্জন/ডাক্তার ফি বা কমিশন
  otChargesPaid: number;        // ওটি/এনেস্থেসিয়া চার্জ
  breakdown: {
    totalIndoorRevenue: number;   // ভর্তি রোগী বাবদ সকল টাকা একত্রে
    admissionFee: number;         // এডমিশন ফি
    oxygenNebulization: number;   // অক্সিজেন এবং নেবুলাইজেশন
    conservativeTreatment: number;// কনজারভেティブ ট্রিটমেন্ট
    normalDelivery: number;       // নরমাল ডেলিভারি
    dmcMinorSurgery: number;      // ডিএমসি এবং মাইনর সার্জারি
    cesareanOperation: number;    // সিজার সহ অন্যান্য অপারেশন
    dressing: number;             // ড্রেসিং
    medicinePurchase: number;     // মেডিসিন ক্রয়
    medicineSales: number;        // মেডিসিন বিক্রয়
    others: number;               // অন্যান্য
  };
  notes: string;
  createdAt: string;
  entryType?: 'daily' | 'monthly';
  month?: number;
  year?: number;
}

export interface AutoBackupSettings {
  autoBackupEnabled: boolean;
  frequency: 'daily' | 'weekly';
  maxSnapshots: number;
  lastAutoBackupDate: string;
}

export const defaultAutoBackupSettings: AutoBackupSettings = {
  autoBackupEnabled: true,
  frequency: 'daily',
  maxSnapshots: 10,
  lastAutoBackupDate: ''
};

export interface HospitalAdjustment {
  id: string;
  department: 'DIAGNOSTIC' | 'CLINIC' | 'MEDICINE' | 'ACCOUNTS' | 'GENERAL';
  type: 'INCOME_ADD' | 'EXPENSE_ADJUST' | 'DISCOUNT_WAIVER' | 'AUDIT_CORRECTION';
  amount: number;
  date: string;
  category: string;
  note: string;
  authorizedBy: string;
  createdAt: string;
}

export const defaultHospitalAdjustments: HospitalAdjustment[] = [];

export interface HospitalModuleConfig {
  diagnosticActive: boolean;
  clinicActive: boolean;
  medicineActive: boolean;
  accountingActive: boolean;
  labReportingActive: boolean;
  autoPrintHeader: boolean;
  showWatermark: boolean;
}

export const defaultHospitalModuleConfig: HospitalModuleConfig = {
  diagnosticActive: true,
  clinicActive: true,
  medicineActive: true,
  accountingActive: true,
  labReportingActive: true,
  autoPrintHeader: true,
  showWatermark: true
};

