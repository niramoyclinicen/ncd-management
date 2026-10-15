import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { dbService, DailyConsolidatedClinicEntry, ClinicProfile } from '../../dbService';
import { BackIcon, PrinterIcon, PlusIcon, TrashIcon, SearchIcon, Activity } from '../Icons';
import { 
  Save, RefreshCw, Layers, Calendar, Clock, DollarSign, UserCheck, 
  FileSpreadsheet, CheckCircle2, AlertCircle, CalendarRange, 
  Bed, Scissors, HeartPulse, Pill, Baby, Sparkles, Building2, Stethoscope
} from 'lucide-react';

export const BENGALI_MONTHS = [
  { value: 0, bn: 'জানুয়ারি', en: 'January' },
  { value: 1, bn: 'ফেব্রুয়ারি', en: 'February' },
  { value: 2, bn: 'মার্চ', en: 'March' },
  { value: 3, bn: 'এপ্রিল', en: 'April' },
  { value: 4, bn: 'মে', en: 'May' },
  { value: 5, bn: 'জুন', en: 'June' },
  { value: 6, bn: 'জুলাই', en: 'July' },
  { value: 7, bn: 'আগস্ট', en: 'August' },
  { value: 8, bn: 'সেপ্টেম্বর', en: 'September' },
  { value: 9, bn: 'অক্টোবর', en: 'October' },
  { value: 10, bn: 'নভেম্বর', en: 'November' },
  { value: 11, bn: 'ডিসেম্বর', en: 'December' },
];

export const AVAILABLE_YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export interface ShiftRowItem {
  id: string;
  isExistingRecord?: boolean;
  shift: string;
  operatorName: string;
  totalPatients: number;
  // Requested breakdown categories
  totalIndoorRevenue: number;   // ভর্তি রোগী বাবদ সকল টাকা একত্রে
  admissionFee: number;         // এডমিশন ফি
  oxygenNebulization: number;   // অক্সিজেন এবং নেবুলাইজেশন
  conservativeTreatment: number;// কনজারভেটিভ ট্রিটমেন্ট
  normalDelivery: number;       // নরমাল ডেলিভারি
  dmcMinorSurgery: number;      // ডিএমসি এবং মাইনর সার্জারি
  cesareanOperation: number;    // সিজার সহ অন্যান্য অপারেশন
  dressing: number;             // ড্রেসিং
  medicinePurchase: number;     // মেডিসিন ক্রয় (Medicine Purchase)
  medicineSales: number;        // মেডিসিন বিক্রয় (Medicine Sales)
  others: number;               // অন্যান্য
  grossAmount: number;          // মোট গ্রস
  discountAmount: number;       // মোট ছাড়
  netPayable: number;           // প্রদেয় নিট বিল
  cashCollected: number;        // নগদ আদায়
  dueAmount: number;            // বকেয়া
  doctorCommissionPaid: number; // সার্জন / ডাক্তার ফি
  otChargesPaid: number;        // ওটি / এনেস্থেসিয়া চার্জ
  notes: string;
}

export interface DailyConsolidatedClinicEntryPageProps {
  onBack?: () => void;
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
  currentUserEmail?: string;
  consolidatedClinicEntries?: DailyConsolidatedClinicEntry[];
  setConsolidatedClinicEntries?: React.Dispatch<React.SetStateAction<DailyConsolidatedClinicEntry[]>>;
}

export const DailyConsolidatedClinicEntryPage: React.FC<DailyConsolidatedClinicEntryPageProps> = ({
  onBack,
  performBlockingSync,
  currentUserEmail = 'Admin',
  consolidatedClinicEntries,
  setConsolidatedClinicEntries
}) => {
  const [entries, setEntries] = useState<DailyConsolidatedClinicEntry[]>(() => {
    return (consolidatedClinicEntries && consolidatedClinicEntries.length > 0)
      ? consolidatedClinicEntries
      : dbService.getConsolidatedClinicEntries();
  });
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>(dbService.getClinicProfile());
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'new_entry' | 'history'>('new_entry');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // In-app deletion and cleaner modal states
  const [entryToDelete, setEntryToDelete] = useState<DailyConsolidatedClinicEntry | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
  const [printingEntry, setPrintingEntry] = useState<DailyConsolidatedClinicEntry | null>(null);

  // Entry Mode: 'daily' (দিনভিত্তিক) or 'monthly' (মাসভিত্তিক একবারে)
  const [entryMode, setEntryMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [defaultOperator, setDefaultOperator] = useState<string>(currentUserEmail || 'Cashier');

  // Excel Sheet multi-shift row generator
  const createDefaultShiftRow = (shiftName = 'সারাদিন (Full Day)', op = 'Cashier'): ShiftRowItem => ({
    id: 'ROW-' + Math.random().toString(36).substring(2, 9),
    shift: shiftName,
    operatorName: op,
    totalPatients: 0,
    totalIndoorRevenue: 0,
    admissionFee: 0,
    oxygenNebulization: 0,
    conservativeTreatment: 0,
    normalDelivery: 0,
    dmcMinorSurgery: 0,
    cesareanOperation: 0,
    dressing: 0,
    medicinePurchase: 0,
    medicineSales: 0,
    others: 0,
    grossAmount: 0,
    discountAmount: 0,
    netPayable: 0,
    cashCollected: 0,
    dueAmount: 0,
    doctorCommissionPaid: 0,
    otChargesPaid: 0,
    notes: ''
  });

  // Shift rows for Excel-style multi-line entry
  const [shiftRows, setShiftRows] = useState<ShiftRowItem[]>([
    createDefaultShiftRow('সারাদিন (Full Day)', currentUserEmail || 'Cashier')
  ]);

  // Live History filters on entry tab
  const [liveSearchQuery, setLiveSearchQuery] = useState('');
  const [liveTypeFilter, setLiveTypeFilter] = useState<'all' | 'daily' | 'monthly'>('all');
  const [liveMonthFilter, setLiveMonthFilter] = useState<string>('all');
  const [liveYearFilter, setLiveYearFilter] = useState<string>('all');
  const [liveDueFilter, setLiveDueFilter] = useState<'all' | 'due' | 'paid'>('all');

  // History filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'daily' | 'monthly'>('all');
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>('all');
  const [historyYearFilter, setHistoryYearFilter] = useState<string>('all');
  const [historyDueFilter, setHistoryDueFilter] = useState<'all' | 'due' | 'paid'>('all');
  const [searchDate, setSearchDate] = useState('');
  const [filterShift, setFilterShift] = useState<string>('all');

  // Sync entries if parent prop updates
  useEffect(() => {
    const local = dbService.getConsolidatedClinicEntries();
    const propList = Array.isArray(consolidatedClinicEntries) ? consolidatedClinicEntries : [];
    const merged = dbService.mergeEntityList(local, propList, ['id', '_id']);
    if (merged.length > 0) {
      setEntries(merged);
      dbService.saveConsolidatedClinicEntries(merged);
    } else if (local && local.length > 0) {
      setEntries(local);
    }
  }, [consolidatedClinicEntries]);

  useEffect(() => {
    const local = dbService.getConsolidatedClinicEntries();
    const propList = Array.isArray(consolidatedClinicEntries) ? consolidatedClinicEntries : [];
    const merged = dbService.mergeEntityList(local, propList, ['id', '_id']);
    if (merged.length > 0) {
      setEntries(merged);
    }
    setClinicProfile(dbService.getClinicProfile());
  }, []);

  // Update a specific cell / field in the shift rows with instant live calculation
  const updateShiftRow = (rowId: string, updates: Partial<ShiftRowItem>) => {
    setShiftRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const merged = { ...r, ...updates };

      // If any revenue breakdown category was edited, compute gross
      const breakdownFields = [
        'totalIndoorRevenue', 'admissionFee', 'oxygenNebulization',
        'conservativeTreatment', 'normalDelivery', 'dmcMinorSurgery',
        'cesareanOperation', 'dressing', 'medicineSales', 'others'
      ];
      const hasBreakdownEdit = breakdownFields.some(f => f in updates);

      if (hasBreakdownEdit) {
        const bGross = (Number(merged.totalIndoorRevenue) || 0) +
                       (Number(merged.admissionFee) || 0) +
                       (Number(merged.oxygenNebulization) || 0) +
                       (Number(merged.conservativeTreatment) || 0) +
                       (Number(merged.normalDelivery) || 0) +
                       (Number(merged.dmcMinorSurgery) || 0) +
                       (Number(merged.cesareanOperation) || 0) +
                       (Number(merged.dressing) || 0) +
                       (Number(merged.medicineSales) || 0) +
                       (Number(merged.others) || 0);
        if (bGross > 0 || !('grossAmount' in updates)) {
          merged.grossAmount = bGross;
        }
      }

      const gross = Number(merged.grossAmount) || 0;
      const discount = Number(merged.discountAmount) || 0;
      const net = Math.max(0, gross - discount);
      merged.netPayable = net;

      // If user did not manually specify cash, default cashCollected to netPayable
      if (!('cashCollected' in updates) && (r.cashCollected === 0 || r.cashCollected === r.netPayable)) {
        merged.cashCollected = net;
        merged.dueAmount = 0;
      } else {
        const cash = Number(merged.cashCollected) || 0;
        merged.dueAmount = Math.max(0, net - cash);
      }

      return merged;
    }));
  };

  // Add new line in Excel spreadsheet
  const handleAddShiftRow = () => {
    const shiftOptions = ['সকাল (Morning)', 'বিকাল (Afternoon)', 'সন্ধ্যা (Evening)', 'রাত (Night)', 'জরুরি (Emergency)', 'শিফট-১', 'শিফট-২'];
    const nextShift = shiftOptions[shiftRows.length - 1] || `শিফট #${shiftRows.length + 1}`;
    setShiftRows(prev => [...prev, createDefaultShiftRow(nextShift, defaultOperator)]);
  };

  // Remove a line from Excel spreadsheet
  const handleRemoveShiftRow = (rowId: string) => {
    if (shiftRows.length <= 1) {
      setShiftRows([createDefaultShiftRow(entryMode === 'monthly' ? 'মাসিক এককালীন (Monthly)' : 'সারাদিন (Full Day)', defaultOperator)]);
      return;
    }
    setShiftRows(prev => prev.filter(r => r.id !== rowId));
  };

  // Reset spreadsheet
  const handleResetSheet = () => {
    setEditingRecordId(null);
    if (entryMode === 'monthly') {
      setShiftRows([createDefaultShiftRow('মাসিক এককালীন (Monthly)', defaultOperator)]);
    } else {
      setShiftRows([
        createDefaultShiftRow('সারাদিন (Full Day)', defaultOperator)
      ]);
    }
  };

  // Handle Mode Change (Daily vs Monthly)
  const handleModeChange = (mode: 'daily' | 'monthly') => {
    setEntryMode(mode);
    setEditingRecordId(null);
    if (mode === 'monthly') {
      setShiftRows([createDefaultShiftRow('মাসিক এককালীন (Monthly)', defaultOperator)]);
    } else {
      setShiftRows([
        createDefaultShiftRow('সারাদিন (Full Day)', defaultOperator)
      ]);
    }
  };

  // Handle start editing an existing consolidated entry
  const handleStartEdit = (row: DailyConsolidatedClinicEntry) => {
    setActiveSubTab('new_entry');
    setEditingRecordId(row.id);
    const isMonthly = row.entryType === 'monthly' || row.shift === 'Monthly';
    setEntryMode(isMonthly ? 'monthly' : 'daily');
    if (isMonthly) {
      const m = row.month !== undefined ? row.month : (row.date ? parseInt(row.date.split('-')[1]) - 1 : new Date().getMonth());
      const y = row.year !== undefined ? row.year : (row.date ? parseInt(row.date.split('-')[0]) : new Date().getFullYear());
      setSelectedMonth(m);
      setSelectedYear(y);
    } else {
      setSelectedDate(row.date || new Date().toISOString().split('T')[0]);
    }
    setDefaultOperator(row.operatorName || currentUserEmail || 'Cashier');

    const b = row.breakdown || {
      totalIndoorRevenue: 0, admissionFee: 0, oxygenNebulization: 0,
      conservativeTreatment: 0, normalDelivery: 0, dmcMinorSurgery: 0,
      cesareanOperation: 0, dressing: 0, medicinePurchase: 0, medicineSales: 0, others: 0
    };

    const editRowItem: ShiftRowItem = {
      id: row.id,
      isExistingRecord: true,
      shift: row.shift || (isMonthly ? 'মাসিক এককালীন' : 'সারাদিন'),
      operatorName: row.operatorName || currentUserEmail || 'Cashier',
      totalPatients: row.totalPatients || 0,
      totalIndoorRevenue: Number(b.totalIndoorRevenue) || 0,
      admissionFee: Number(b.admissionFee) || 0,
      oxygenNebulization: Number(b.oxygenNebulization) || 0,
      conservativeTreatment: Number(b.conservativeTreatment) || 0,
      normalDelivery: Number(b.normalDelivery) || 0,
      dmcMinorSurgery: Number(b.dmcMinorSurgery) || 0,
      cesareanOperation: Number(b.cesareanOperation) || 0,
      dressing: Number(b.dressing) || 0,
      medicinePurchase: Number(b.medicinePurchase) || 0,
      medicineSales: Number(b.medicineSales) || 0,
      others: Number(b.others) || 0,
      grossAmount: Number(row.grossAmount) || 0,
      discountAmount: Number(row.discountAmount) || 0,
      netPayable: Number(row.netPayable) || 0,
      cashCollected: Number(row.cashCollected) || 0,
      dueAmount: Number(row.dueAmount) || 0,
      doctorCommissionPaid: Number(row.doctorCommissionPaid) || 0,
      otChargesPaid: Number(row.otChargesPaid) || 0,
      notes: row.notes || ''
    };

    setShiftRows([editRowItem]);
    try {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {}
  };

  // Show temporary success banner
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Live Calculations across all spreadsheet shift rows (Grand Totals)
  const shiftSheetTotals = useMemo(() => {
    return shiftRows.reduce((acc, r) => {
      acc.patients += Number(r.totalPatients) || 0;
      acc.totalIndoorRevenue += Number(r.totalIndoorRevenue) || 0;
      acc.admissionFee += Number(r.admissionFee) || 0;
      acc.oxygenNebulization += Number(r.oxygenNebulization) || 0;
      acc.conservativeTreatment += Number(r.conservativeTreatment) || 0;
      acc.normalDelivery += Number(r.normalDelivery) || 0;
      acc.dmcMinorSurgery += Number(r.dmcMinorSurgery) || 0;
      acc.cesareanOperation += Number(r.cesareanOperation) || 0;
      acc.dressing += Number(r.dressing) || 0;
      acc.medicinePurchase += Number(r.medicinePurchase) || 0;
      acc.medicineSales += Number(r.medicineSales) || 0;
      acc.others += Number(r.others) || 0;
      acc.gross += Number(r.grossAmount) || 0;
      acc.discount += Number(r.discountAmount) || 0;
      acc.net += Number(r.netPayable) || 0;
      acc.cash += Number(r.cashCollected) || 0;
      acc.due += Number(r.dueAmount) || 0;
      acc.doctorCommission += Number(r.doctorCommissionPaid) || 0;
      acc.otCharge += Number(r.otChargesPaid) || 0;
      acc.centerNet += (Number(r.cashCollected) || 0) - (Number(r.doctorCommissionPaid) || 0) - (Number(r.otChargesPaid) || 0);
      return acc;
    }, {
      patients: 0, totalIndoorRevenue: 0, admissionFee: 0, oxygenNebulization: 0,
      conservativeTreatment: 0, normalDelivery: 0, dmcMinorSurgery: 0, cesareanOperation: 0,
      dressing: 0, medicinePurchase: 0, medicineSales: 0, others: 0,
      gross: 0, discount: 0, net: 0, cash: 0, due: 0, doctorCommission: 0, otCharge: 0, centerNet: 0
    });
  }, [shiftRows]);

  // Save All Active Shifts from the Excel Spreadsheet
  const handleSaveAllShifts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const isMonthly = entryMode === 'monthly';

    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const computedDate = isMonthly
      ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      : selectedDate;

    if (!computedDate) {
      alert('অনুগ্রহ করে তারিখ বা মাস-বছর নির্বাচন করুন!');
      return;
    }

    // Filter rows that have meaningful entries
    const activeRows = shiftRows.filter(r => 
      (Number(r.grossAmount) || 0) > 0 || 
      (Number(r.cashCollected) || 0) > 0 || 
      (Number(r.totalPatients) || 0) > 0 ||
      (Number(r.totalIndoorRevenue) || 0) > 0 ||
      (Number(r.admissionFee) || 0) > 0 ||
      (Number(r.cesareanOperation) || 0) > 0 ||
      (Number(r.medicinePurchase) || 0) > 0 ||
      (Number(r.medicineSales) || 0) > 0
    );

    if (activeRows.length === 0) {
      alert('অনুগ্রহ করে অন্তত একটি শিফটের বা ক্যাটাগরির ডাটা বা ক্যাশ কালেকশন লিখুন!');
      return;
    }

    setIsSaving(true);
    try {
      const monthBn = BENGALI_MONTHS[selectedMonth]?.bn || '';
      const savedRecords: DailyConsolidatedClinicEntry[] = [];

      for (let i = 0; i < activeRows.length; i++) {
        const r = activeRows[i];
        const uniqueSuffix = Math.random().toString(36).substring(2, 7);
        const shiftSlug = String(r.shift || 'shift').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const generatedId = (editingRecordId && activeRows.length === 1) 
          ? editingRecordId 
          : (r.isExistingRecord ? r.id : ((isMonthly ? `MCCE-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}` : `DCCE-${computedDate}-${shiftSlug}`) + '-' + Date.now() + '-' + uniqueSuffix));

        const gross = Number(r.grossAmount) || 0;
        const discount = Number(r.discountAmount) || 0;
        const net = Number(r.netPayable) || Math.max(0, gross - discount);
        let cash = Number(r.cashCollected) || 0;
        let due = Number(r.dueAmount) || 0;

        if (cash === 0 && due === 0 && net > 0) {
          cash = net;
          due = 0;
        } else if (cash > 0 && due === 0 && cash < net) {
          due = net - cash;
        }

        const rec: DailyConsolidatedClinicEntry = {
          id: generatedId,
          date: computedDate,
          shift: isMonthly ? 'Monthly' : (r.shift || 'Full Day'),
          entryType: isMonthly ? 'monthly' : 'daily',
          month: isMonthly ? selectedMonth : (computedDate ? parseInt(computedDate.split('-')[1]) - 1 : new Date().getMonth()),
          year: isMonthly ? selectedYear : (computedDate ? parseInt(computedDate.split('-')[0]) : new Date().getFullYear()),
          entryTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          operatorName: r.operatorName || defaultOperator || currentUserEmail || 'Cashier',
          totalPatients: Number(r.totalPatients) || 0,
          grossAmount: gross,
          discountAmount: discount,
          netPayable: net,
          cashCollected: cash,
          dueAmount: due,
          doctorCommissionPaid: Number(r.doctorCommissionPaid) || 0,
          otChargesPaid: Number(r.otChargesPaid) || 0,
          breakdown: {
            totalIndoorRevenue: Number(r.totalIndoorRevenue) || 0,
            admissionFee: Number(r.admissionFee) || 0,
            oxygenNebulization: Number(r.oxygenNebulization) || 0,
            conservativeTreatment: Number(r.conservativeTreatment) || 0,
            normalDelivery: Number(r.normalDelivery) || 0,
            dmcMinorSurgery: Number(r.dmcMinorSurgery) || 0,
            cesareanOperation: Number(r.cesareanOperation) || 0,
            dressing: Number(r.dressing) || 0,
            medicinePurchase: Number(r.medicinePurchase) || 0,
            medicineSales: Number(r.medicineSales) || 0,
            others: Number(r.others) || 0
          },
          notes: r.notes || (isMonthly ? `মাসিক এককালীন ক্লিনিক এন্ট্রি: ${monthBn} ${selectedYear}` : ''),
          createdAt: new Date().toISOString()
        };

        await dbService.saveConsolidatedClinicEntryDirectly(rec);
        savedRecords.push(rec);
      }

      // Merge saved records into state
      const currentList = entries || [];
      const savedIds = new Set(savedRecords.map(s => String(s.id).trim()));
      const remaining = currentList.filter(e => !savedIds.has(String(e.id || (e as any)._id).trim()));
      const updatedList = [...savedRecords, ...remaining];

      setEntries(updatedList);
      dbService.saveConsolidatedClinicEntries(updatedList);
      if (setConsolidatedClinicEntries) {
        setConsolidatedClinicEntries(updatedList);
      }
      if (performBlockingSync) {
        performBlockingSync({ consolidatedClinicEntries: updatedList }).catch(err => console.warn("Sync error:", err));
      }

      triggerSuccess(isMonthly ? `মাসিক ক্লিনিক ভাউচার (${monthBn} ${selectedYear}) সফলভাবে সংরক্ষিত হয়েছে!` : `তারিখ ${computedDate} এর ${savedRecords.length}টি শিফটের ডাটা সফলভাবে সংরক্ষিত হয়েছে!`);

      // Reset editing and sheet
      setEditingRecordId(null);
      handleResetSheet();

      // Print first saved record
      if (savedRecords.length > 0) {
        setPrintingEntry(savedRecords[0]);
      }
    } catch (err) {
      console.error(err);
      alert('সংরক্ষণে ত্রুটি হয়েছে!');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteRecord = async () => {
    if (!entryToDelete) return;
    const targetItem = entryToDelete;
    setIsDeletingRecord(true);
    setEntryToDelete(null);
    const targetId = String(targetItem.id || (targetItem as any)._id || '').trim();

    try {
      await dbService.deleteConsolidatedClinicEntry(targetItem);
      const updated = entries.filter(e => String(e.id || (e as any)._id || '').trim() !== targetId);
      setEntries(updated);
      dbService.saveConsolidatedClinicEntries(updated);
      if (setConsolidatedClinicEntries) {
        setConsolidatedClinicEntries(updated);
      }
      if (performBlockingSync) {
        await performBlockingSync({ consolidatedClinicEntries: updated });
      }
      triggerSuccess('রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে!');
    } catch (err) {
      console.error("Delete consolidated clinic error:", err);
      alert('ডিলিট করতে সমস্যা হয়েছে!');
    } finally {
      setIsDeletingRecord(false);
    }
  };

  // Sort entries newest first
  const sortedEntries = useMemo(() => {
    return [...(entries || [])].sort((a, b) => {
      const dateA = a.date || a.createdAt || '';
      const dateB = b.date || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [entries]);

  // Search filter query
  const matchesSearchQuery = (item: DailyConsolidatedClinicEntry, qRaw: string) => {
    const q = qRaw.trim().toLowerCase();
    if (!q) return true;
    const op = (item.operatorName || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    const id = (item.id || '').toLowerCase();
    const shift = (item.shift || '').toLowerCase();
    const date = (item.date || '').toLowerCase();
    const mBn = BENGALI_MONTHS[item.month ?? -1]?.bn?.toLowerCase() || '';

    return id.includes(q) ||
           op.includes(q) ||
           notes.includes(q) ||
           shift.includes(q) ||
           date.includes(q) ||
           mBn.includes(q) ||
           (q === 'monthly' && (item.entryType === 'monthly' || item.shift === 'Monthly')) ||
           (q === 'daily' && (item.entryType !== 'monthly' && item.shift !== 'Monthly'));
  };

  // Live Filtered Entries for the entry tab embedded history
  const liveFilteredEntries = useMemo(() => {
    return sortedEntries.filter(item => {
      if (!item) return false;
      const isItemMonthly = item.entryType === 'monthly' || item.shift === 'Monthly';
      const itemDue = Number(item.dueAmount) || 0;

      // Type filter
      if (liveTypeFilter === 'daily' && isItemMonthly) return false;
      if (liveTypeFilter === 'monthly' && !isItemMonthly) return false;

      // Due filter
      if (liveDueFilter === 'due' && itemDue <= 0) return false;
      if (liveDueFilter === 'paid' && itemDue > 0) return false;

      // Month filter
      if (liveMonthFilter !== 'all') {
        const itemMonth = item.month !== undefined ? item.month : (item.date ? parseInt(item.date.split('-')[1]) - 1 : null);
        if (String(itemMonth) !== liveMonthFilter) return false;
      }

      // Year filter
      if (liveYearFilter !== 'all') {
        const itemYear = item.year !== undefined ? item.year : (item.date ? parseInt(item.date.split('-')[0]) : null);
        if (String(itemYear) !== liveYearFilter) return false;
      }

      if (liveSearchQuery && !matchesSearchQuery(item, liveSearchQuery)) {
        return false;
      }
      return true;
    });
  }, [sortedEntries, liveTypeFilter, liveDueFilter, liveMonthFilter, liveYearFilter, liveSearchQuery]);

  // Live Stats for embedded entry view
  const liveStats = useMemo(() => {
    return liveFilteredEntries.reduce((acc, curr) => {
      acc.patients += curr.totalPatients || 0;
      acc.gross += curr.grossAmount || 0;
      acc.discount += curr.discountAmount || 0;
      acc.net += curr.netPayable || 0;
      acc.cash += curr.cashCollected || 0;
      acc.due += curr.dueAmount || 0;
      return acc;
    }, { patients: 0, gross: 0, discount: 0, net: 0, cash: 0, due: 0 });
  }, [liveFilteredEntries]);

  // Filtered Entries for History Tab
  const filteredEntries = useMemo(() => {
    return sortedEntries.filter(item => {
      if (!item) return false;
      const isItemMonthly = item.entryType === 'monthly' || item.shift === 'Monthly';
      const itemDue = Number(item.dueAmount) || 0;

      if (historyTypeFilter === 'daily' && isItemMonthly) return false;
      if (historyTypeFilter === 'monthly' && !isItemMonthly) return false;

      // Due filter
      if (historyDueFilter === 'due' && itemDue <= 0) return false;
      if (historyDueFilter === 'paid' && itemDue > 0) return false;

      if (searchDate && item.date !== searchDate) return false;
      if (filterShift !== 'all' && item.shift !== filterShift) return false;

      if (historyYearFilter !== 'all') {
        const itemYear = item.year !== undefined ? item.year : (item.date ? parseInt(item.date.split('-')[0]) : null);
        if (String(itemYear) !== historyYearFilter) return false;
      }
      if (historyMonthFilter !== 'all') {
        const itemMonth = item.month !== undefined ? item.month : (item.date ? parseInt(item.date.split('-')[1]) - 1 : null);
        if (String(itemMonth) !== historyMonthFilter) return false;
      }

      return true;
    });
  }, [sortedEntries, historyTypeFilter, historyDueFilter, searchDate, filterShift, historyYearFilter, historyMonthFilter]);

  // History Stats
  const historyStats = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => {
      acc.patients += curr.totalPatients || 0;
      acc.gross += curr.grossAmount || 0;
      acc.discount += curr.discountAmount || 0;
      acc.net += curr.netPayable || 0;
      acc.cash += curr.cashCollected || 0;
      acc.due += curr.dueAmount || 0;
      acc.commission += (curr.doctorCommissionPaid || 0) + (curr.otChargesPaid || 0);
      return acc;
    }, { patients: 0, gross: 0, discount: 0, net: 0, cash: 0, due: 0, commission: 0 });
  }, [filteredEntries]);

  // Print Clinic Consolidated Voucher
  const handlePrintVoucher = (entry: DailyConsolidatedClinicEntry) => {
    const win = window.open('', '_blank');
    if (!win) return;

    const isMonthly = entry.entryType === 'monthly' || entry.shift === 'Monthly';
    const entryMonth = entry.month !== undefined ? entry.month : (entry.date ? parseInt(entry.date.split('-')[1]) - 1 : 0);
    const entryYear = entry.year !== undefined ? entry.year : (entry.date ? entry.date.split('-')[0] : '');
    const monthBn = BENGALI_MONTHS[entryMonth]?.bn || '';
    const monthEn = BENGALI_MONTHS[entryMonth]?.en || '';

    const b = entry.breakdown || {
      totalIndoorRevenue: 0, admissionFee: 0, oxygenNebulization: 0,
      conservativeTreatment: 0, normalDelivery: 0, dmcMinorSurgery: 0,
      cesareanOperation: 0, dressing: 0, medicinePurchase: 0, medicineSales: 0, others: 0
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${isMonthly ? `Monthly Consolidated Clinic Voucher - ${monthEn} ${entryYear}` : `Daily Consolidated Clinic Voucher - ${entry.date}`}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 13px; }
          .header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; font-weight: 900; }
          .header p { margin: 3px 0; font-size: 12px; color: #475569; }
          .voucher-tag { display: inline-block; background: #0f172a; color: white; padding: 4px 14px; font-size: 11px; font-weight: 900; text-transform: uppercase; border-radius: 4px; margin-top: 8px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-table td { padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 12px; }
          .info-table td.label { font-weight: bold; background: #f8fafc; width: 25%; color: #334155; }
          .section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 16px 0 8px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 8px 12px; }
          .data-table th { background: #f1f5f9; text-transform: uppercase; font-size: 11px; font-weight: 900; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .grand-total-row { background: #f8fafc; font-weight: 900; font-size: 14px; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; }
          .sig-box { border-top: 1.5px solid #0f172a; width: 180px; text-align: center; padding-top: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
        </style>
      </head>
      <body onload="window.print();">
        <div class="header">
          <h1>${clinicProfile.name || 'Niramoy Clinic & Diagnostic'}</h1>
          <p>${clinicProfile.nameBn || 'নিরাময় ক্লিনিক এন্ড ডায়াগনস্টিক'} - ${clinicProfile.tagline || ''}</p>
          <p>${clinicProfile.address} | হটলাইন: ${clinicProfile.mobile} | লাইসেন্স: HSM76710</p>
          <div class="voucher-tag">${isMonthly ? `মাসিক কনসোলিডেটেড ক্লিনিক ভাউচার (Monthly Consolidated Clinic Voucher) - ${monthBn} ${entryYear}` : 'ডেইলি কনসোলিডেটেড ক্লিনিক ভাউচার (Daily Consolidated Clinic Voucher)'}</div>
        </div>

        <table class="info-table">
          <tr>
            <td class="label">ভাউচার আইডি:</td>
            <td><b>${entry.id}</b></td>
            <td class="label">${isMonthly ? 'মাস ও বৎসর:' : 'তারিখ ও সময়:'}</td>
            <td><b>${isMonthly ? `${monthBn} ${entryYear} (${monthEn} ${entryYear})` : `${entry.date} (${entry.entryTime})`}</b></td>
          </tr>
          <tr>
            <td class="label">এন্ট্রি ধরন ও শিফট:</td>
            <td><b>${isMonthly ? 'মাসিক এককালীন জমা (সারামাস)' : `${entry.shift}`}</b></td>
            <td class="label">হিসাব গ্রহণকারী:</td>
            <td><b>${entry.operatorName}</b></td>
          </tr>
          <tr>
            <td class="label">মোট রোগী সংখ্যা:</td>
            <td><b>${entry.totalPatients} জন</b></td>
            <td class="label">বিভাগ:</td>
            <td><b>ক্লিনিক বিভাগ (Clinic Department)</b></td>
          </tr>
        </table>

        <div class="section-title">১. ক্লিনিক সেবাভিত্তিক কালেকশন বিবরণী (Clinic Services Breakdown)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>বিবরণ / সেবা খাত (Service Head)</th>
              <th class="text-right">মোট পরিমাণ (Amount ৳)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>🏥 ভর্তি রোগী বাবদ সকল টাকা একত্রে (Indoor Revenue Total)</td><td class="text-right">৳${(Number(b.totalIndoorRevenue) || 0).toLocaleString()}</td></tr>
            <tr><td>📋 এডমিশন ফি (Admission Fee)</td><td class="text-right">৳${(Number(b.admissionFee) || 0).toLocaleString()}</td></tr>
            <tr><td>💨 অক্সিজেন এবং নেবুলাইজেশন (Oxygen & Nebulization)</td><td class="text-right">৳${(Number(b.oxygenNebulization) || 0).toLocaleString()}</td></tr>
            <tr><td>💊 কনজারভেটিভ ট্রিটমেন্ট (Conservative Treatment)</td><td class="text-right">৳${(Number(b.conservativeTreatment) || 0).toLocaleString()}</td></tr>
            <tr><td>👶 নরমাল ডেলিভারি (Normal Delivery)</td><td class="text-right">৳${(Number(b.normalDelivery) || 0).toLocaleString()}</td></tr>
            <tr><td>🩹 ডিএমসি এবং মাইনর সার্জারি (D&C & Minor Surgery)</td><td class="text-right">৳${(Number(b.dmcMinorSurgery) || 0).toLocaleString()}</td></tr>
            <tr><td>🔪 সিজার সহ অন্যান্য অপারেশন (Cesarean & Other Operations)</td><td class="text-right">৳${(Number(b.cesareanOperation) || 0).toLocaleString()}</td></tr>
            <tr><td>🩺 ড্রেসিং চার্জ (Dressing Charge)</td><td class="text-right">৳${(Number(b.dressing) || 0).toLocaleString()}</td></tr>
            <tr><td>💊 মেডিসিন বিক্রয় (Medicine Sales)</td><td class="text-right">৳${(Number(b.medicineSales) || 0).toLocaleString()}</td></tr>
            <tr><td>📦 অন্যান্য সেবা / বিবিধ (Others)</td><td class="text-right">৳${(Number(b.others) || 0).toLocaleString()}</td></tr>
            ${(Number(b.medicinePurchase) || 0) > 0 ? `
              <tr style="background: #fff1f2; color: #9f1239;">
                <td>🛒 মেডিসিন ক্রয় বাবদ খরচ (Medicine Purchase Cost):</td>
                <td class="text-right"><b>৳${(Number(b.medicinePurchase) || 0).toLocaleString()}</b></td>
              </tr>
            ` : ''}
          </tbody>
          <tfoot>
            <tr class="grand-total-row">
              <td>মোট গ্রস বিল (Gross Total)</td>
              <td class="text-right font-black">৳${(Number(entry.grossAmount) || 0).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div class="section-title">২. আর্থিক সারসংক্ষেপ (Financial Summary)</div>
        <table class="data-table">
          <tbody>
            <tr>
              <td>মোট গ্রস বিল (Gross Total Amount):</td>
              <td class="text-right"><b>৳${(Number(entry.grossAmount) || 0).toLocaleString()}</b></td>
            </tr>
            <tr>
              <td>মোট ছাড় (Special Discount Given):</td>
              <td class="text-right" style="color: #dc2626;">-৳${(Number(entry.discountAmount) || 0).toLocaleString()}</td>
            </tr>
            <tr style="background: #f8fafc; font-weight: bold;">
              <td>প্রদেয় নিট বিল (Net Payable):</td>
              <td class="text-right">৳${(Number(entry.netPayable) || 0).toLocaleString()}</td>
            </tr>
            <tr style="background: #ecfdf5; font-weight: bold; color: #047857;">
              <td>নগদ ক্যাশ আদায় (Cash Collected):</td>
              <td class="text-right">৳${(Number(entry.cashCollected) || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>বকেয়া / বাকি (Due Balance):</td>
              <td class="text-right" style="color: #b45309;">৳${(Number(entry.dueAmount) || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>প্রদত্ত সার্জন / ডাক্তার ফি (Doctor/Surgeon Fee Paid):</td>
              <td class="text-right" style="color: #4338ca;">-৳${(Number(entry.doctorCommissionPaid) || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>ওটি / এনেস্থেসিয়া চার্জ (OT / Anaesthesia Charge Paid):</td>
              <td class="text-right" style="color: #4338ca;">-৳${(Number(entry.otChargesPaid) || 0).toLocaleString()}</td>
            </tr>
            <tr style="background: #e0f2fe; font-weight: 900; font-size: 14px; color: #0369a1;">
              <td>ক্লিনিক নিট ক্যাশ জমা (Center Net Cash):</td>
              <td class="text-right">৳${Math.max(0, (Number(entry.cashCollected) || 0) - (Number(entry.doctorCommissionPaid) || 0) - (Number(entry.otChargesPaid) || 0)).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        ${entry.notes ? `
          <div style="margin-top: 15px; padding: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px;">
            <b>মন্তব্য / নোট:</b> ${entry.notes}
          </div>
        ` : ''}

        <div class="footer">
          <div class="sig-box">ক্যাশিয়ার / অপারেটর</div>
          <div class="sig-box">হিসাবরক্ষক</div>
          <div class="sig-box">ম্যানেজার / পরিচালক</div>
        </div>
      </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 shrink-0 shadow-lg">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
                title="পেছনে যান"
              >
                <BackIcon className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                  Consolidated Clinic Data Entry
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ক্লিনিক বিভাগ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ক্লিনিকের দৈনিক বা মাসিকভিত্তিক সকল সার্ভিস ও কালেকশন এক্সেল শিটের মতো দ্রুত এন্ট্রি করুন
              </p>
            </div>
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('new_entry')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'new_entry'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{editingRecordId ? 'এন্ট্রি এডিট মোড' : 'নতুন ডাটা এন্ট্রি'}</span>
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'history'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>পূর্বের রেকর্ড তালিকা ({entries.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto py-6 px-4 md:px-6 custom-scrollbar">
        <div className="w-full max-w-[1600px] mx-auto space-y-6">

          {/* Success Notification */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between shadow-xl animate-fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-sm font-bold">{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
          )}

          {activeSubTab === 'new_entry' ? (
            <div className="space-y-6">
              {/* Mode & Date Control Panel */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  {/* Mode Buttons */}
                  <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleModeChange('daily')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                        entryMode === 'daily'
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>দিনভিত্তিক এন্ট্রি (Daily Entry)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange('monthly')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                        entryMode === 'monthly'
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <CalendarRange className="w-4 h-4" />
                      <span>মাসভিত্তিক এককালীন এন্ট্রি (Monthly Entry)</span>
                    </button>
                  </div>

                  {/* Reset & Add buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddShiftRow}
                      className="px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>+ নতুন শিফট / সারি যোগ করুন</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetSheet}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="শিট রিসেট করুন"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>রিসেট</span>
                    </button>
                  </div>
                </div>

                {/* Date / Month Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {entryMode === 'daily' ? (
                    <div>
                      <label className="block text-[11px] font-black uppercase text-indigo-400 tracking-wider mb-1.5">
                        তারিখ নির্বাচন করুন (Target Date) *
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-black uppercase text-purple-400 tracking-wider mb-1.5">
                          মাস নির্বাচন করুন (Target Month) *
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={e => setSelectedMonth(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-bold"
                        >
                          {BENGALI_MONTHS.map(m => (
                            <option key={m.value} value={m.value}>
                              {m.bn} ({m.en})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase text-purple-400 tracking-wider mb-1.5">
                          বৎসর (Target Year) *
                        </label>
                        <select
                          value={selectedYear}
                          onChange={e => setSelectedYear(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-bold font-mono"
                        >
                          {AVAILABLE_YEARS.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                      অপারেটর / ক্যাশিয়ার
                    </label>
                    <input
                      type="text"
                      value={defaultOperator}
                      onChange={e => setDefaultOperator(e.target.value)}
                      placeholder="ক্যাশিয়ার বা অপারেটরের নাম"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Live Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black">মোট রোগী</p>
                  <p className="text-base font-black text-cyan-400 font-mono mt-0.5">{shiftSheetTotals.patients} জন</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black">মোট গ্রস বিল</p>
                  <p className="text-base font-black text-white font-mono mt-0.5">৳{shiftSheetTotals.gross.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black">মোট ছাড়</p>
                  <p className="text-base font-black text-rose-400 font-mono mt-0.5">-৳{shiftSheetTotals.discount.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black">প্রদেয় নেট</p>
                  <p className="text-base font-black text-indigo-300 font-mono mt-0.5">৳{shiftSheetTotals.net.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900/80 border border-emerald-900/40 bg-emerald-950/20 p-3 rounded-xl">
                  <p className="text-[10px] text-emerald-400 uppercase font-black">নগদ ক্যাশ আদায়</p>
                  <p className="text-base font-black text-emerald-300 font-mono mt-0.5">৳{shiftSheetTotals.cash.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900/80 border border-amber-900/40 bg-amber-950/20 p-3 rounded-xl">
                  <p className="text-[10px] text-amber-400 uppercase font-black">বকেয়া / ডিউ</p>
                  <p className="text-base font-black text-amber-300 font-mono mt-0.5">৳{shiftSheetTotals.due.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black">ডাক্তার/সার্জন ফি</p>
                  <p className="text-base font-black text-rose-400 font-mono mt-0.5">৳{shiftSheetTotals.doctorCommission.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900/80 border border-blue-900/40 bg-blue-950/20 p-3 rounded-xl">
                  <p className="text-[10px] text-blue-400 uppercase font-black">ক্লিনিক নেট জমা</p>
                  <p className="text-base font-black text-blue-300 font-mono mt-0.5">৳{shiftSheetTotals.centerNet.toLocaleString()}</p>
                </div>
              </div>

              {/* Excel Spreadsheet Table */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                      ক্লিনিক কালেকশন ও সেবা ডাটা শিট ({shiftRows.length} টি সারি)
                    </h3>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    💡 খাতভিত্তিক অ্যামাউন্ট লিখলে স্বয়ংক্রিয়ভাবে মোট গ্রস ও নিট হিসাব হবে
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[1700px]">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-black text-[10px] tracking-wider">
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5 w-[680px]">শিফট / ধরণ</th>
                        <th className="p-2.5 w-24 text-right">রোগী সংখ্যা</th>
                        {/* 11 Requested Categories */}
                        <th className="p-2.5 w-36 text-right bg-indigo-950/40 text-indigo-300">ভর্তি রোগী বাবদ একত্রে</th>
                        <th className="p-2.5 w-32 text-right bg-indigo-950/30 text-indigo-300">এডমিশন ফি</th>
                        <th className="p-2.5 w-16 text-right bg-indigo-950/20 text-indigo-300 leading-tight">অক্সিজেন<br/>নেবুলাইজার</th>
                        <th className="p-2.5 w-32 text-right bg-indigo-950/30 text-indigo-300">কনজারভেটিভ</th>
                        <th className="p-2.5 w-32 text-right bg-indigo-950/20 text-indigo-300">নরমাল ডেলিভারি</th>
                        <th className="p-2.5 w-32 text-right bg-indigo-950/30 text-indigo-300">ডিএমসি+মাইনর সার্জারি</th>
                        <th className="p-2.5 w-32 text-right bg-indigo-950/40 text-indigo-300">সিজার+অন্যান্য অপারেশন</th>
                        <th className="p-2.5 w-32 text-right bg-indigo-950/20 text-indigo-300">ড্রেসিং</th>
                        <th className="p-2.5 w-32 text-right bg-rose-950/40 text-rose-300">মেডিসিন ক্রয়</th>
                        <th className="p-2.5 w-32 text-right bg-emerald-950/40 text-emerald-300">মেডিসিন বিক্রয়</th>
                        <th className="p-2.5 w-32 text-right bg-slate-950 text-slate-300">অন্যান্য</th>
                        {/* Financial Totals */}
                        <th className="p-2.5 w-32 text-right bg-slate-800 text-white font-black">মোট গ্রস</th>
                        <th className="p-2.5 w-24 text-right bg-rose-950/30 text-rose-300">ছাড়</th>
                        <th className="p-2.5 w-32 text-right bg-indigo-950 text-indigo-200 font-black">প্রদেয় নেট</th>
                        <th className="p-2.5 w-32 text-right bg-emerald-950 text-emerald-300 font-black">নগদ আদায়</th>
                        <th className="p-2.5 w-28 text-right bg-amber-950 text-amber-300 font-black">বকেয়া</th>
                        <th className="p-2.5 w-40">মন্তব্য</th>
                        <th className="p-2.5 w-12 text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-mono">
                      {shiftRows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-2 text-center font-bold text-slate-500 font-sans">{idx + 1}</td>
                          <td className="p-1.5 font-sans">
                            <input
                              type="text"
                              value={row.shift}
                              onChange={e => updateShiftRow(row.id, { shift: e.target.value })}
                              placeholder="শিফটের নাম"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min="0"
                              value={row.totalPatients || ''}
                              onChange={e => updateShiftRow(row.id, { totalPatients: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-cyan-400 font-bold"
                            />
                          </td>

                          {/* 11 Breakdown categories */}
                          <td className="p-1.5 bg-indigo-950/20">
                            <input
                              type="number"
                              min="0"
                              value={row.totalIndoorRevenue || ''}
                              onChange={e => updateShiftRow(row.id, { totalIndoorRevenue: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-indigo-700/60 rounded-lg px-2 py-1 text-xs text-right text-indigo-300 font-bold"
                            />
                          </td>
                          <td className="p-1.5 bg-indigo-950/15">
                            <input
                              type="number"
                              min="0"
                              value={row.admissionFee || ''}
                              onChange={e => updateShiftRow(row.id, { admissionFee: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-indigo-200"
                            />
                          </td>
                          <td className="p-1.5 bg-indigo-950/10">
                            <input
                              type="number"
                              min="0"
                              value={row.oxygenNebulization || ''}
                              onChange={e => updateShiftRow(row.id, { oxygenNebulization: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-indigo-200"
                            />
                          </td>
                          <td className="p-1.5 bg-indigo-950/15">
                            <input
                              type="number"
                              min="0"
                              value={row.conservativeTreatment || ''}
                              onChange={e => updateShiftRow(row.id, { conservativeTreatment: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-indigo-200"
                            />
                          </td>
                          <td className="p-1.5 bg-indigo-950/10">
                            <input
                              type="number"
                              min="0"
                              value={row.normalDelivery || ''}
                              onChange={e => updateShiftRow(row.id, { normalDelivery: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-indigo-200"
                            />
                          </td>
                          <td className="p-1.5 bg-indigo-950/15">
                            <input
                              type="number"
                              min="0"
                              value={row.dmcMinorSurgery || ''}
                              onChange={e => updateShiftRow(row.id, { dmcMinorSurgery: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-indigo-200"
                            />
                          </td>
                          <td className="p-1.5 bg-indigo-950/20">
                            <input
                              type="number"
                              min="0"
                              value={row.cesareanOperation || ''}
                              onChange={e => updateShiftRow(row.id, { cesareanOperation: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-purple-300 font-bold"
                            />
                          </td>
                          <td className="p-1.5 bg-indigo-950/10">
                            <input
                              type="number"
                              min="0"
                              value={row.dressing || ''}
                              onChange={e => updateShiftRow(row.id, { dressing: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-indigo-200"
                            />
                          </td>
                          <td className="p-1.5 bg-rose-950/20">
                            <input
                              type="number"
                              min="0"
                              value={row.medicinePurchase || ''}
                              onChange={e => updateShiftRow(row.id, { medicinePurchase: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-rose-800/60 rounded-lg px-2 py-1 text-xs text-right text-rose-300 font-bold"
                            />
                          </td>
                          <td className="p-1.5 bg-emerald-950/20">
                            <input
                              type="number"
                              min="0"
                              value={row.medicineSales || ''}
                              onChange={e => updateShiftRow(row.id, { medicineSales: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-emerald-800/60 rounded-lg px-2 py-1 text-xs text-right text-emerald-300 font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min="0"
                              value={row.others || ''}
                              onChange={e => updateShiftRow(row.id, { others: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-slate-300"
                            />
                          </td>

                          {/* Financials */}
                          <td className="p-1.5 bg-slate-950">
                            <input
                              type="number"
                              min="0"
                              value={row.grossAmount || ''}
                              onChange={e => updateShiftRow(row.id, { grossAmount: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-right text-white font-black"
                            />
                          </td>
                          <td className="p-1.5 bg-rose-950/20">
                            <input
                              type="number"
                              min="0"
                              value={row.discountAmount || ''}
                              onChange={e => updateShiftRow(row.id, { discountAmount: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-rose-400 font-bold"
                            />
                          </td>
                          <td className="p-1.5 bg-indigo-950/30">
                            <span className="block px-2 py-1 text-right text-xs font-black text-indigo-300">
                              ৳{row.netPayable.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-1.5 bg-emerald-950/30">
                            <input
                              type="number"
                              min="0"
                              value={row.cashCollected || ''}
                              onChange={e => updateShiftRow(row.id, { cashCollected: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full bg-slate-950 border border-emerald-700/80 rounded-lg px-2 py-1 text-xs text-right text-emerald-300 font-black"
                            />
                          </td>
                          <td className="p-1.5 bg-amber-950/30">
                            <span className="block px-2 py-1 text-right text-xs font-black text-amber-300">
                              ৳{row.dueAmount.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-1.5 font-sans">
                            <input
                              type="text"
                              value={row.notes}
                              onChange={e => updateShiftRow(row.id, { notes: e.target.value })}
                              placeholder="নোট / মন্তব্য"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveShiftRow(row.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all"
                              title="সারি মুছুন"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-950 border-t-2 border-slate-700 font-bold text-white uppercase text-[11px]">
                        <td colSpan={3} className="p-3 text-center text-indigo-400 font-black font-sans">
                          সর্বমোট যোগফল (Grand Totals):
                        </td>
                        <td className="p-3 text-right text-cyan-400 font-mono font-black">{shiftSheetTotals.patients}</td>
                        <td className="p-3 text-right text-indigo-300 font-mono font-black">৳{shiftSheetTotals.totalIndoorRevenue.toLocaleString()}</td>
                        <td className="p-3 text-right text-indigo-200 font-mono">৳{shiftSheetTotals.admissionFee.toLocaleString()}</td>
                        <td className="p-3 text-right text-indigo-200 font-mono">৳{shiftSheetTotals.oxygenNebulization.toLocaleString()}</td>
                        <td className="p-3 text-right text-indigo-200 font-mono">৳{shiftSheetTotals.conservativeTreatment.toLocaleString()}</td>
                        <td className="p-3 text-right text-indigo-200 font-mono">৳{shiftSheetTotals.normalDelivery.toLocaleString()}</td>
                        <td className="p-3 text-right text-indigo-200 font-mono">৳{shiftSheetTotals.dmcMinorSurgery.toLocaleString()}</td>
                        <td className="p-3 text-right text-purple-300 font-mono font-black">৳{shiftSheetTotals.cesareanOperation.toLocaleString()}</td>
                        <td className="p-3 text-right text-indigo-200 font-mono">৳{shiftSheetTotals.dressing.toLocaleString()}</td>
                        <td className="p-3 text-right text-rose-300 font-mono font-black">৳{shiftSheetTotals.medicinePurchase.toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-300 font-mono font-black">৳{shiftSheetTotals.medicineSales.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-300 font-mono">৳{shiftSheetTotals.others.toLocaleString()}</td>
                        <td className="p-3 text-right text-white font-mono font-black bg-slate-800">৳{shiftSheetTotals.gross.toLocaleString()}</td>
                        <td className="p-3 text-right text-rose-400 font-mono font-bold bg-rose-950/30">৳{shiftSheetTotals.discount.toLocaleString()}</td>
                        <td className="p-3 text-right text-indigo-300 font-mono font-black bg-indigo-950">৳{shiftSheetTotals.net.toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-300 font-mono font-black bg-emerald-950">৳{shiftSheetTotals.cash.toLocaleString()}</td>
                        <td className="p-3 text-right text-amber-300 font-mono font-black bg-amber-950">৳{shiftSheetTotals.due.toLocaleString()}</td>
                        <td colSpan={2} className="p-3 text-center text-xs text-slate-500 font-sans">
                          {shiftRows.length} টি শিফট
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Save Bar */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="text-xs text-slate-400">
                    {entryMode === 'monthly' ? (
                      <span className="text-purple-300 font-bold">
                        📅 নির্ধারিত মাস: {BENGALI_MONTHS[selectedMonth]?.bn} {selectedYear}
                      </span>
                    ) : (
                      <span className="text-indigo-300 font-bold">
                        📅 নির্ধারিত তারিখ: {selectedDate}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResetSheet}
                      className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
                    >
                      বাতিল / রিসেট
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveAllShifts}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : (editingRecordId ? 'আপডেট ও সেভ করুন' : 'সকল শিফট সংরক্ষণ করুন')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Filtered Entries table below the spreadsheet */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <span>সংরক্ষিত ক্লিনিক কনসোলিডেটেড ডাটা তালিকা</span>
                    </h3>
                    <p className="text-xs text-slate-400">এখান থেকে সংরক্ষিত যে কোনো রেকর্ড সরাসরি দেখতে, এডিট করতে বা প্রিন্ট ভাউচার তৈরি করতে পারেন</p>
                  </div>

                  {/* Filter controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <SearchIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={liveSearchQuery}
                        onChange={e => setLiveSearchQuery(e.target.value)}
                        placeholder="আইডি, তারিখ বা অপারেটর সার্চ..."
                        className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-52 font-medium"
                      />
                    </div>
                    <select
                      value={liveTypeFilter}
                      onChange={e => setLiveTypeFilter(e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-bold"
                    >
                      <option value="all">সকল ধরন</option>
                      <option value="daily">দিনভিত্তিক</option>
                      <option value="monthly">মাসভিত্তিক</option>
                    </select>
                    <select
                      value={liveDueFilter}
                      onChange={e => setLiveDueFilter(e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-bold"
                    >
                      <option value="all">সকল পেমেন্ট</option>
                      <option value="due">বকেয়া রয়েছে</option>
                      <option value="paid">পরিশোধিত</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-black text-[10px]">
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3 w-40">আইডি</th>
                        <th className="p-3 w-32">তারিখ / মাস</th>
                        <th className="p-3 w-48">শিফট / ধরণ</th>
                        <th className="p-3 w-20 text-right">রোগী</th>
                        <th className="p-3 w-28 text-right text-slate-200">গ্রস</th>
                        <th className="p-3 w-28 text-right text-indigo-300 font-bold">নেট</th>
                        <th className="p-3 w-28 text-right text-emerald-400 font-black">নগদ আদায়</th>
                        <th className="p-3 w-24 text-right text-amber-400 font-bold">বকেয়া</th>
                        <th className="p-3 w-36 text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                      {liveFilteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-500 font-sans text-xs">
                            কোনো সংরক্ষিত ক্লিনিক কনসোলিডেটেড রেকর্ড পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        liveFilteredEntries.map((row, idx) => {
                          const isMonthly = row.entryType === 'monthly' || row.shift === 'Monthly';
                          const mBn = BENGALI_MONTHS[row.month ?? -1]?.bn || '';
                          const isEditingThis = editingRecordId === row.id;

                          return (
                            <tr
                              key={row.id}
                              className={`hover:bg-slate-800/50 transition-colors ${
                                isEditingThis ? 'bg-indigo-950/40 border-l-4 border-indigo-500' : ''
                              }`}
                            >
                              <td className="p-3 text-center text-slate-500 font-sans font-bold">{idx + 1}</td>
                              <td className="p-3 text-indigo-400 font-bold">{row.id}</td>
                              <td className="p-3 font-sans">
                                {isMonthly ? (
                                  <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 font-bold border border-purple-800/40">
                                    {mBn} {row.year}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">{row.date}</span>
                                )}
                              </td>
                              <td className="p-3 font-sans">
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300">
                                  {isMonthly ? 'মাসিক এককালীন' : row.shift}
                                </span>
                              </td>
                              <td className="p-3 text-right text-cyan-400 font-bold">{row.totalPatients}</td>
                              <td className="p-3 text-right text-slate-200">৳{Number(row.grossAmount || 0).toLocaleString()}</td>
                              <td className="p-3 text-right text-indigo-300 font-bold">৳{Number(row.netPayable || 0).toLocaleString()}</td>
                              <td className="p-3 text-right text-emerald-400 font-black">৳{Number(row.cashCollected || 0).toLocaleString()}</td>
                              <td className="p-3 text-right text-amber-400 font-bold">৳{Number(row.dueAmount || 0).toLocaleString()}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 font-sans">
                                  <button
                                    onClick={() => handlePrintVoucher(row)}
                                    className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all"
                                    title="প্রিন্ট ভাউচার"
                                  >
                                    <PrinterIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(row)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-all"
                                    title="এডিট করুন"
                                  >
                                    এডিট
                                  </button>
                                  <button
                                    onClick={() => setEntryToDelete(row)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                                    title="মুছুন"
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Sub Tab 2: Full History and Detailed Reports */
            <div className="space-y-5">
              {/* History Search Bar */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">ধরণ ফিল্টার</label>
                    <select
                      value={historyTypeFilter}
                      onChange={e => setHistoryTypeFilter(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="all">সকল ধরন</option>
                      <option value="daily">দিনভিত্তিক</option>
                      <option value="monthly">মাসভিত্তিক</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">মাস</label>
                    <select
                      value={historyMonthFilter}
                      onChange={e => setHistoryMonthFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="all">সকল মাস</option>
                      {BENGALI_MONTHS.map(m => (
                        <option key={m.value} value={String(m.value)}>{m.bn}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">বছর</label>
                    <select
                      value={historyYearFilter}
                      onChange={e => setHistoryYearFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="all">সকল বছর</option>
                      {AVAILABLE_YEARS.map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">পেমেন্ট অবস্থা</label>
                    <select
                      value={historyDueFilter}
                      onChange={e => setHistoryDueFilter(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="all">সকল অবস্থা</option>
                      <option value="due">বকেয়া রয়েছে</option>
                      <option value="paid">সম্পূর্ণ পরিশোধিত</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* History Grand Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black">মোট রোগী</p>
                  <p className="text-lg font-black text-cyan-400 font-mono mt-0.5">{historyStats.patients} জন</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black">মোট গ্রস বিল</p>
                  <p className="text-lg font-black text-white font-mono mt-0.5">৳{historyStats.gross.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black">মোট নেট বিল</p>
                  <p className="text-lg font-black text-indigo-300 font-mono mt-0.5">৳{historyStats.net.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 border border-emerald-900/40 bg-emerald-950/20 p-3.5 rounded-xl">
                  <p className="text-[10px] text-emerald-400 uppercase font-black">মোট নগদ আদায়</p>
                  <p className="text-lg font-black text-emerald-300 font-mono mt-0.5">৳{historyStats.cash.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 border border-amber-900/40 bg-amber-950/20 p-3.5 rounded-xl">
                  <p className="text-[10px] text-amber-400 uppercase font-black">মোট বকেয়া</p>
                  <p className="text-lg font-black text-amber-300 font-mono mt-0.5">৳{historyStats.due.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 border border-blue-900/40 bg-blue-950/20 p-3.5 rounded-xl">
                  <p className="text-[10px] text-blue-400 uppercase font-black">মোট সেন্টার নিট</p>
                  <p className="text-lg font-black text-blue-300 font-mono mt-0.5">৳{Math.max(0, historyStats.cash - historyStats.commission).toLocaleString()}</p>
                </div>
              </div>

              {/* History Detailed Table */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-black text-[10px]">
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3 w-40">আইডি</th>
                        <th className="p-3 w-32">তারিখ / মাস</th>
                        <th className="p-3 w-48">শিফট / ধরণ</th>
                        <th className="p-3 w-20 text-right">রোগী</th>
                        <th className="p-3 w-28 text-right text-slate-200">গ্রস</th>
                        <th className="p-3 w-28 text-right text-indigo-300 font-bold">নেট</th>
                        <th className="p-3 w-28 text-right text-emerald-400 font-black">নগদ আদায়</th>
                        <th className="p-3 w-24 text-right text-amber-400 font-bold">বকেয়া</th>
                        <th className="p-3 w-36 text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-500 font-sans text-xs">
                            কোনো কনসোলিডেটেড রেকর্ড পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((row, idx) => {
                          const isMonthly = row.entryType === 'monthly' || row.shift === 'Monthly';
                          const mBn = BENGALI_MONTHS[row.month ?? -1]?.bn || '';

                          return (
                            <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                              <td className="p-3 text-center text-slate-500 font-sans font-bold">{idx + 1}</td>
                              <td className="p-3 text-indigo-400 font-bold">{row.id}</td>
                              <td className="p-3 font-sans">
                                {isMonthly ? (
                                  <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 font-bold border border-purple-800/40">
                                    {mBn} {row.year}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">{row.date}</span>
                                )}
                              </td>
                              <td className="p-3 font-sans">
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300">
                                  {isMonthly ? 'মাসিক এককালীন' : row.shift}
                                </span>
                              </td>
                              <td className="p-3 text-right text-cyan-400 font-bold">{row.totalPatients}</td>
                              <td className="p-3 text-right text-slate-200">৳{Number(row.grossAmount || 0).toLocaleString()}</td>
                              <td className="p-3 text-right text-indigo-300 font-bold">৳{Number(row.netPayable || 0).toLocaleString()}</td>
                              <td className="p-3 text-right text-emerald-400 font-black">৳{Number(row.cashCollected || 0).toLocaleString()}</td>
                              <td className="p-3 text-right text-amber-400 font-bold">৳{Number(row.dueAmount || 0).toLocaleString()}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 font-sans">
                                  <button
                                    onClick={() => handlePrintVoucher(row)}
                                    className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all"
                                    title="প্রিন্ট ভাউচার"
                                  >
                                    <PrinterIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(row)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-all"
                                    title="এডিট করুন"
                                  >
                                    এডিট
                                  </button>
                                  <button
                                    onClick={() => setEntryToDelete(row)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                                    title="মুছুন"
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-black">রেকর্ড নিশ্চিত মুছে ফেলতে চান?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              আইডি: <span className="font-mono text-indigo-400 font-bold">{entryToDelete.id}</span>
              <br />
              তারিখ/মাস: {entryToDelete.date || `${BENGALI_MONTHS[entryToDelete.month ?? -1]?.bn} ${entryToDelete.year}`}
              <br />
              টাকার পরিমাণ: ৳{Number(entryToDelete.cashCollected || 0).toLocaleString()}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                বাতিল
              </button>
              <button
                onClick={confirmDeleteRecord}
                disabled={isDeletingRecord}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all"
              >
                {isDeletingRecord ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Print Success Modal */}
      {printingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">
              {printingEntry.entryType === 'monthly' || printingEntry.shift === 'Monthly'
                ? 'মাসিক ক্লিনিক ভাউচার সংরক্ষিত হয়েছে!'
                : 'ক্লিনিক ভাউচার সংরক্ষিত হয়েছে!'}
            </h3>
            <p className="text-xs text-slate-400">
              ভাউচার নং: <span className="font-mono text-indigo-400 font-bold">{printingEntry.id}</span>
              <br />
              ক্যাশ আদায়: ৳{Number(printingEntry.cashCollected || 0).toLocaleString()}
            </p>
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setPrintingEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={() => {
                  handlePrintVoucher(printingEntry);
                  setPrintingEntry(null);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-2"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>প্রিন্ট ভাউচার</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyConsolidatedClinicEntryPage;
