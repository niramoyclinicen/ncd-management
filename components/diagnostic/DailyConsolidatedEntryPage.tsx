import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { dbService, DailyConsolidatedEntry, ClinicProfile } from '../../dbService';
import { BackIcon, PrinterIcon, PlusIcon, TrashIcon, SearchIcon, Activity } from '../Icons';
import { Save, RefreshCw, Layers, Calendar, Clock, DollarSign, UserCheck, FileSpreadsheet, CheckCircle2, AlertCircle, CalendarRange } from 'lucide-react';

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

interface ShiftRowItem {
  id: string;
  isExistingRecord?: boolean;
  shift: string;
  operatorName: string;
  totalPatients: number;
  pathology: number;
  usg: number;
  xray: number;
  ecg: number;
  hormone: number;
  others: number;
  grossAmount: number;
  discountAmount: number;
  netPayable: number;
  cashCollected: number;
  dueAmount: number;
  doctorCommissionPaid: number;
  usgDoctorFeePaid: number;
  notes: string;
}

export const DailyConsolidatedEntryPage: React.FC<DailyConsolidatedEntryPageProps> = ({
  onBack,
  performBlockingSync,
  currentUserEmail = 'Admin',
  consolidatedLabEntries,
  setConsolidatedLabEntries
}) => {
  const [entries, setEntries] = useState<DailyConsolidatedEntry[]>(() => {
    return (consolidatedLabEntries && consolidatedLabEntries.length > 0)
      ? consolidatedLabEntries
      : dbService.getConsolidatedEntries();
  });
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>(dbService.getClinicProfile());
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'new_entry' | 'history'>('new_entry');
  const [searchDate, setSearchDate] = useState('');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [printingEntry, setPrintingEntry] = useState<DailyConsolidatedEntry | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // In-app deletion and cleaner modal states (no browser confirm/alert)
  const [entryToDelete, setEntryToDelete] = useState<DailyConsolidatedEntry | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
  const [deleteSuccessModalMsg, setDeleteSuccessModalMsg] = useState<string | null>(null);
  const [showCleanAutoModal, setShowCleanAutoModal] = useState(false);
  const [isCleaningAuto, setIsCleaningAuto] = useState(false);
  const [showCleanDuplicatesModal, setShowCleanDuplicatesModal] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

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
    pathology: 0,
    usg: 0,
    xray: 0,
    ecg: 0,
    hormone: 0,
    others: 0,
    grossAmount: 0,
    discountAmount: 0,
    netPayable: 0,
    cashCollected: 0,
    dueAmount: 0,
    doctorCommissionPaid: 0,
    usgDoctorFeePaid: 0,
    notes: ''
  });

  // Shift rows for Excel-style multi-line entry (Default to 1 'সারাদিন' row)
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

  // Sync entries if parent prop updates without losing local entries
  useEffect(() => {
    const local = dbService.getConsolidatedEntries();
    const propList = Array.isArray(consolidatedLabEntries) ? consolidatedLabEntries : [];
    const merged = dbService.mergeEntityList(local, propList, ['id', '_id']);
    if (merged.length > 0) {
      setEntries(merged);
      dbService.saveConsolidatedEntries(merged);
    } else if (local && local.length > 0) {
      setEntries(local);
    }
  }, [consolidatedLabEntries]);

  // Load existing entries non-destructively on mount
  useEffect(() => {
    const local = dbService.getConsolidatedEntries();
    const propList = Array.isArray(consolidatedLabEntries) ? consolidatedLabEntries : [];
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

      // If any department breakdown was edited, recompute gross
      if ('pathology' in updates || 'usg' in updates || 'xray' in updates || 'ecg' in updates || 'hormone' in updates || 'others' in updates) {
        const bGross = (Number(merged.pathology) || 0) + 
                       (Number(merged.usg) || 0) + 
                       (Number(merged.xray) || 0) + 
                       (Number(merged.ecg) || 0) + 
                       (Number(merged.hormone) || 0) + 
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
  const handleStartEdit = (row: DailyConsolidatedEntry) => {
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

    const b = row.breakdown || { pathology: 0, usg: 0, xray: 0, ecg: 0, hormone: 0, others: 0 };
    const editRowItem: ShiftRowItem = {
      id: row.id,
      isExistingRecord: true,
      shift: row.shift || (isMonthly ? 'মাসিক এককালীন' : 'সারাদিন'),
      operatorName: row.operatorName || currentUserEmail || 'Cashier',
      totalPatients: row.totalPatients || 0,
      pathology: Number(b.pathology) || 0,
      usg: Number(b.usg) || 0,
      xray: Number(b.xray) || 0,
      ecg: Number(b.ecg) || 0,
      hormone: Number(b.hormone) || 0,
      others: Number(b.others) || 0,
      grossAmount: Number(row.grossAmount) || 0,
      discountAmount: Number(row.discountAmount) || 0,
      netPayable: Number(row.netPayable) || 0,
      cashCollected: Number(row.cashCollected) || 0,
      dueAmount: Number(row.dueAmount) || 0,
      doctorCommissionPaid: Number(row.doctorCommissionPaid) || 0,
      usgDoctorFeePaid: Number(row.usgDoctorFeePaid) || 0,
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
      acc.pathology += Number(r.pathology) || 0;
      acc.usg += Number(r.usg) || 0;
      acc.xray += Number(r.xray) || 0;
      acc.ecg += Number(r.ecg) || 0;
      acc.hormone += Number(r.hormone) || 0;
      acc.others += Number(r.others) || 0;
      acc.gross += Number(r.grossAmount) || 0;
      acc.discount += Number(r.discountAmount) || 0;
      acc.net += Number(r.netPayable) || 0;
      acc.cash += Number(r.cashCollected) || 0;
      acc.due += Number(r.dueAmount) || 0;
      acc.doctorPC += Number(r.doctorCommissionPaid) || 0;
      acc.usgFee += Number(r.usgDoctorFeePaid) || 0;
      acc.centerNet += (Number(r.cashCollected) || 0) - (Number(r.doctorCommissionPaid) || 0) - (Number(r.usgDoctorFeePaid) || 0);
      return acc;
    }, {
      patients: 0,
      pathology: 0,
      usg: 0,
      xray: 0,
      ecg: 0,
      hormone: 0,
      others: 0,
      gross: 0,
      discount: 0,
      net: 0,
      cash: 0,
      due: 0,
      doctorPC: 0,
      usgFee: 0,
      centerNet: 0,
    });
  }, [shiftRows]);

  // Save All Active Shifts from the Excel Spreadsheet
  const handleSaveAllShifts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const isMonthly = entryMode === 'monthly';

    const computedDate = isMonthly
      ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
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
      (Number(r.pathology) || 0) > 0 ||
      (Number(r.usg) || 0) > 0 ||
      (Number(r.xray) || 0) > 0 ||
      (Number(r.ecg) || 0) > 0
    );

    if (activeRows.length === 0) {
      alert('অনুগ্রহ করে অন্তত একটি শিফটের টেস্ট বা ক্যাশ কালেকশন ডাটা লিখুন!');
      return;
    }

    setIsSaving(true);
    try {
      const monthBn = BENGALI_MONTHS[selectedMonth]?.bn || '';
      const savedRecords: DailyConsolidatedEntry[] = [];

      for (let i = 0; i < activeRows.length; i++) {
        const r = activeRows[i];
        const uniqueSuffix = Math.random().toString(36).substring(2, 7);
        const shiftSlug = String(r.shift || 'shift').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const generatedId = (editingRecordId && activeRows.length === 1) 
          ? editingRecordId 
          : (r.isExistingRecord ? r.id : ((isMonthly ? `MCE-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}` : `DCE-${computedDate}-${shiftSlug}`) + '-' + Date.now() + '-' + uniqueSuffix));

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

        const rec: DailyConsolidatedEntry = {
          id: generatedId,
          date: computedDate,
          shift: isMonthly ? 'Monthly' : (r.shift || 'Full Day'),
          entryType: isMonthly ? 'monthly' : 'daily',
          month: isMonthly ? selectedMonth : (computedDate ? parseInt(computedDate.split('-')[1]) - 1 : new Date().getMonth()),
          year: isMonthly ? selectedYear : (computedDate ? parseInt(computedDate.split('-')[0]) : new Date().getFullYear()),
          entryTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          operatorName: r.operatorName || defaultOperator || currentUserEmail || 'Cashier',
          totalPatients: Number(r.totalPatients) || 0,
          totalTests: 0,
          grossAmount: gross,
          discountAmount: discount,
          netPayable: net,
          cashCollected: cash,
          dueAmount: due,
          doctorCommissionPaid: Number(r.doctorCommissionPaid) || 0,
          usgDoctorFeePaid: Number(r.usgDoctorFeePaid) || 0,
          breakdown: {
            pathology: Number(r.pathology) || 0,
            usg: Number(r.usg) || 0,
            xray: Number(r.xray) || 0,
            ecg: Number(r.ecg) || 0,
            hormone: Number(r.hormone) || 0,
            others: Number(r.others) || 0
          },
          notes: r.notes || (isMonthly ? `মাসিক এককালীন এন্ট্রি: ${monthBn} ${selectedYear}` : ''),
          createdAt: new Date().toISOString()
        };

        await dbService.saveConsolidatedEntryDirectly(rec);
        savedRecords.push(rec);
      }

      // Merge saved records into state
      const currentList = entries || [];
      const savedIds = new Set(savedRecords.map(s => String(s.id).trim()));
      const remaining = currentList.filter(e => !savedIds.has(String(e.id || (e as any)._id).trim()));
      const updatedList = [...savedRecords, ...remaining];

      setEntries(updatedList);
      dbService.saveConsolidatedEntries(updatedList);
      if (setConsolidatedLabEntries) {
        setConsolidatedLabEntries(updatedList);
      }
      if (performBlockingSync) {
        performBlockingSync({ consolidatedLabEntries: updatedList }).catch(err => console.warn("Sync error:", err));
      }

      triggerSuccess(isMonthly ? `মাসিক কনসোলিডেটেড ভাউচার (${monthBn} ${selectedYear}) সফলভাবে সংরক্ষিত হয়েছে!` : `তারিখ ${computedDate} এর ${savedRecords.length}টি শিফটের ডাটা সফলভাবে সংরক্ষিত হয়েছে!`);

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
    setEntryToDelete(null); // Close confirm prompt immediately to show blocking overlay
    const targetId = String(targetItem.id || (targetItem as any)._id || '').trim();
    const targetDate = targetItem.date || '';
    const targetShift = targetItem.shift || '';

    try {
      await dbService.deleteConsolidatedEntry(targetItem);
      const updatedList = (entries || []).filter(item => {
        const itemId = String(item.id || (item as any)._id || '').trim();
        if (targetId && itemId === targetId) return false;
        if (!targetId && item.date === targetDate && item.shift === targetShift) return false;
        return true;
      });
      dbService.saveConsolidatedEntries(updatedList);
      setEntries(updatedList);
      if (setConsolidatedLabEntries) {
        setConsolidatedLabEntries(updatedList);
      }
      try {
        if (performBlockingSync) {
          await performBlockingSync({ consolidatedLabEntries: updatedList });
        }
      } catch (syncErr) {
        console.warn("Delete sync warning:", syncErr);
      }
      setDeleteSuccessModalMsg(`ভাউচার #${targetId || targetDate} ডাটাবেজ ও অনলাইন থেকে সফলভাবে স্থায়ীভাবে মুছে ফেলা হয়েছে!`);
    } catch (err) {
      console.error("Delete consolidated error:", err);
      alert('রেকর্ডটি মুছতে সমস্যা হয়েছে! দয়া করে ইন্টারনেট কানেকশন চেক করুন।');
    } finally {
      setIsDeletingRecord(false);
    }
  };

  // Find duplicate entries (same date/month, type, shift and gross/cash)
  const duplicateEntryIds = useMemo(() => {
    const seen = new Set<string>();
    const dupIds: string[] = [];
    (entries || []).forEach(e => {
      if (!e) return;
      const sig = `${e.date}_${e.entryType || 'daily'}_${e.shift || ''}_${e.grossAmount || 0}_${e.cashCollected || 0}`;
      if (seen.has(sig)) {
        dupIds.push(e.id);
      } else {
        seen.add(sig);
      }
    });
    return dupIds;
  }, [entries]);

  const confirmCleanDuplicates = async () => {
    if (duplicateEntryIds.length === 0) return;
    setIsCleaningDuplicates(true);
    try {
      const seen = new Set<string>();
      const keptList: DailyConsolidatedEntry[] = [];
      const idsToDelete: string[] = [];

      (entries || []).forEach(e => {
        if (!e) return;
        const sig = `${e.date}_${e.entryType || 'daily'}_${e.shift || ''}_${e.grossAmount || 0}_${e.cashCollected || 0}`;
        if (!seen.has(sig)) {
          seen.add(sig);
          keptList.push(e);
        } else {
          idsToDelete.push(e.id);
        }
      });

      for (const dId of idsToDelete) {
        await dbService.deleteConsolidatedEntry(dId);
      }

      dbService.saveConsolidatedEntries(keptList);
      setEntries(keptList);
      if (setConsolidatedLabEntries) {
        setConsolidatedLabEntries(keptList);
      }
      if (performBlockingSync) {
        try {
          await performBlockingSync({ consolidatedLabEntries: keptList });
        } catch (syncErr) {
          console.warn("Sync warning:", syncErr);
        }
      }
      setShowCleanDuplicatesModal(false);
      triggerSuccess(`সফলভাবে ${idsToDelete.length}টি ডুপ্লিকেট রেকর্ড স্থায়ীভাবে মুছে ফেলা হয়েছে!`);
    } catch (err) {
      console.error("Clean duplicates error:", err);
      alert('ডুপ্লিকেট রেকর্ড মুছতে সমস্যা হয়েছে!');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const confirmCleanAutoEntries = async () => {
    setIsCleaningAuto(true);
    try {
      const keptList = (entries || []).filter(e => {
        if (!e) return false;
        const d = String(e.date || '');
        if (d.startsWith('2026-08') || d.startsWith('2026-09')) return true;
        const parts = d.split('-');
        if (parts.length === 3 && parts[2] === '01') {
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 12 && m !== 8 && m !== 9) {
            return false;
          }
        }
        return true;
      });

      const removedIds = (entries || []).filter(e => !keptList.includes(e)).map(e => e.id);
      for (const dId of removedIds) {
        await dbService.deleteConsolidatedEntry(dId);
      }

      dbService.saveConsolidatedEntries(keptList);
      setEntries(keptList);
      if (setConsolidatedLabEntries) {
        setConsolidatedLabEntries(keptList);
      }
      if (performBlockingSync) {
        try {
          await performBlockingSync({ consolidatedLabEntries: keptList });
        } catch (syncErr) {
          console.warn("Sync warning:", syncErr);
        }
      }
      setShowCleanAutoModal(false);
      triggerSuccess('অপ্রয়োজনীয় অটো-এন্ট্রিগুলো সফলভাবে পরিষ্কার করা হয়েছে!');
    } catch (err) {
      console.error("Clean auto entries error:", err);
      alert('অটো-এন্ট্রি মুছতে সমস্যা হয়েছে!');
    } finally {
      setIsCleaningAuto(false);
    }
  };

  // Sorted Entries for consistent chronology (Newest entries first)
  const sortedEntries = useMemo(() => {
    return [...(entries || [])].filter(Boolean).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const createdA = a.createdAt || '';
      const createdB = b.createdAt || '';
      if (createdA !== createdB) return createdB.localeCompare(createdA);
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [entries]);

  // Helper to match a query string against all attributes of an entry
  const matchesSearchQuery = (item: DailyConsolidatedEntry, query: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const dateStr = (item.date || '').toLowerCase();
    const idStr = (item.id || '').toLowerCase();
    const opStr = (item.operatorName || '').toLowerCase();
    const shiftStr = (item.shift || '').toLowerCase();
    const notesStr = (item.notes || '').toLowerCase();
    const itemMonth = item.month !== undefined ? item.month : (item.date ? parseInt(item.date.split('-')[1]) - 1 : 0);
    const itemYear = item.year !== undefined ? item.year : (item.date ? item.date.split('-')[0] : '');
    const monthBn = (BENGALI_MONTHS[itemMonth]?.bn || '').toLowerCase();
    const monthEn = (BENGALI_MONTHS[itemMonth]?.en || '').toLowerCase();

    return dateStr.includes(q) ||
           idStr.includes(q) ||
           opStr.includes(q) ||
           shiftStr.includes(q) ||
           notesStr.includes(q) ||
           monthBn.includes(q) ||
           monthEn.includes(q) ||
           String(itemYear).includes(q) ||
           (q === 'due' && (Number(item.dueAmount) || 0) > 0) ||
           (q === 'বকেয়া' && (Number(item.dueAmount) || 0) > 0) ||
           (q === 'বাকি' && (Number(item.dueAmount) || 0) > 0);
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

      // Search query (date, month, year, operator, etc.)
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
      acc.commission += (curr.doctorCommissionPaid || 0) + (curr.usgDoctorFeePaid || 0);
      acc.centerNet += (curr.cashCollected || 0) - (curr.doctorCommissionPaid || 0) - (curr.usgDoctorFeePaid || 0);
      return acc;
    }, { patients: 0, gross: 0, discount: 0, net: 0, cash: 0, due: 0, commission: 0, centerNet: 0 });
  }, [filteredEntries]);

  // Print Consolidated Voucher
  const handlePrintVoucher = (entry: DailyConsolidatedEntry) => {
    const win = window.open('', '_blank');
    if (!win) return;

    const isMonthly = entry.entryType === 'monthly' || entry.shift === 'Monthly';
    const entryMonth = entry.month !== undefined ? entry.month : (entry.date ? parseInt(entry.date.split('-')[1]) - 1 : 0);
    const entryYear = entry.year !== undefined ? entry.year : (entry.date ? entry.date.split('-')[0] : '');
    const monthBn = BENGALI_MONTHS[entryMonth]?.bn || '';
    const monthEn = BENGALI_MONTHS[entryMonth]?.en || '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${isMonthly ? `Monthly Consolidated Lab Voucher - ${monthEn} ${entryYear}` : `Daily Consolidated Lab Voucher - ${entry.date}`}</title>
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
          <p>${clinicProfile.nameBn || ''} - ${clinicProfile.tagline || ''}</p>
          <p>${clinicProfile.address} | হটলাইন: ${clinicProfile.mobile} | লাইসেন্স: ${clinicProfile.licenseNo}</p>
          <div class="voucher-tag">${isMonthly ? `মাসিক কনসোলিডেটেড ল্যাব ভাউচার (Monthly Consolidated Lab Voucher) - ${monthBn} ${entryYear}` : 'ডেইলি কনসোলিডেটেড ল্যাব সামারি ভাউচার (Daily Consolidated Voucher)'}</div>
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
            <td class="label">মোট টেস্ট সংখ্যা:</td>
            <td><b>${entry.totalTests} টি</b></td>
          </tr>
        </table>

        <div class="section-title">১. বিভাগভিত্তিক কালেকশন বিবরণী (Department Breakdown)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>বিভাগ (Department)</th>
              <th class="text-right">মোট পরিমাণ (Amount ৳)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>🧪 প্যাথলজি (Pathology & Bio-chemistry)</td><td class="text-right">৳${(Number(entry.breakdown?.pathology) || 0).toLocaleString()}</td></tr>
            <tr><td>🩺 আল্ট্রাসনোগ্রাফি (USG)</td><td class="text-right">৳${(Number(entry.breakdown?.usg) || 0).toLocaleString()}</td></tr>
            <tr><td>☢️ ডিজিটাল এক্স-রে (Digital X-Ray)</td><td class="text-right">৳${(Number(entry.breakdown?.xray) || 0).toLocaleString()}</td></tr>
            <tr><td>📈 ইসিজি (ECG)</td><td class="text-right">৳${(Number(entry.breakdown?.ecg) || 0).toLocaleString()}</td></tr>
            <tr><td>🔬 হরমোন টেস্ট (Hormone)</td><td class="text-right">৳${(Number(entry.breakdown?.hormone) || 0).toLocaleString()}</td></tr>
            <tr><td>📦 অন্যান্য ও বিশেষ টেস্ট (Others)</td><td class="text-right">৳${(Number(entry.breakdown?.others) || 0).toLocaleString()}</td></tr>
          </tbody>
          <tfoot>
            <tr class="grand-total-row">
              <td>মোট গ্রস ডিপার্টমেন্টাল বিল (Gross Total)</td>
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
              <td>প্রদত্ত ডাক্তার পিসি কমিশন (Doctor Commission Paid):</td>
              <td class="text-right" style="color: #dc2626;">-৳${(Number(entry.doctorCommissionPaid) || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>ইউএসজি ডাক্তার অনারিয়াম ফি (USG Doctor Honorarium):</td>
              <td class="text-right" style="color: #dc2626;">-৳${(Number(entry.usgDoctorFeePaid) || 0).toLocaleString()}</td>
            </tr>
            <tr class="grand-total-row" style="background: #1e293b; color: #fff;">
              <td>ক্লিনিকের নিট ক্যাশ জমা (Net Center Cash In Hand):</td>
              <td class="text-right">৳${((Number(entry.cashCollected) || 0) - (Number(entry.doctorCommissionPaid) || 0) - (Number(entry.usgDoctorFeePaid) || 0)).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        ${entry.notes ? `<p style="margin-top: 15px; font-size: 11px;"><b>মন্তব্য/নোট:</b> ${entry.notes}</p>` : ''}

        <div class="footer">
          <div class="sig-box">ক্যাশিয়ার / প্রস্তুতকারী</div>
          <div class="sig-box">অ্যাকাউন্টিং অফিসার</div>
          <div class="sig-box">ব্যবস্থাপনা পরিচালক</div>
        </div>
      </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
  };

  const inputClass = "w-full bg-slate-950 border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-2.5 py-1.5 text-white font-bold text-xs outline-none transition-all";
  const labelClass = "text-[10.5px] font-bold text-slate-300 uppercase tracking-wide block mb-1 flex items-center gap-1";

  return (
    <div className="w-full h-full min-h-0 flex-1 bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-4 sm:px-6 py-2 flex flex-col sm:flex-row justify-between items-center gap-2 shadow-xl no-print shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95 transition-all text-white shadow-sm border border-slate-700">
              <BackIcon className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20"></span>
            <div>
              <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Layers className="text-sky-400" size={18} /> কনসোলিডেটেড ল্যাব ডাটা এন্ট্রি
              </h1>
              <p className="text-[10.5px] text-slate-400 font-medium">
                ব্যস্ত দিনের দিনভিত্তিক অথবা সারামাসের মোট হিসেব একবারে জমা ও একাউন্টস সমন্বয়
              </p>
            </div>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setActiveSubTab('new_entry')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'new_entry' ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusIcon size={13} /> নতুন এন্ট্রি
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'history' ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet size={13} /> ভাউচার হিস্ট্রি ({entries.length})
            </button>
          </div>
        </div>
      </header>

      {/* Success Notification Modal */}
      {successMsg && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in pointer-events-auto">
          <div className="bg-slate-900 border-2 border-emerald-500 p-6 sm:p-7 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-3.5">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-black ring-8 ring-emerald-500/10">
              ✓
            </div>
            <h3 className="text-lg font-black text-white font-['Hind_Siliguri']">অপারেশন সম্পন্ন হয়েছে</h3>
            <p className="text-xs font-bold text-emerald-300">
              {successMsg}
            </p>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              ঠিক আছে (OK)
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-2 sm:p-3 md:p-4 w-full overflow-y-auto">
        {activeSubTab === 'new_entry' && (
          <div className="space-y-3.5 w-full max-w-[99%] 2xl:max-w-[1900px] mx-auto animate-fade-in">
            {/* Editing Notice Banner */}
            {editingRecordId && (
              <div className="bg-gradient-to-r from-amber-950/90 via-amber-900/70 to-slate-900 border-2 border-amber-500/80 text-amber-200 px-4 py-2 rounded-xl flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-2.5">
                  <span className="p-1 bg-amber-500 text-slate-950 rounded-md font-black text-xs">EDIT</span>
                  <span className="text-xs font-bold">
                    আপনি ভাউচার আইডি <span className="font-mono text-white font-black underline">{editingRecordId}</span> সম্পাদনা (Edit) করছেন। পরিবর্তন শেষে সেভ করুন।
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetSheet}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-200 rounded-lg text-xs font-bold transition-all border border-amber-500/30 cursor-pointer shadow"
                >
                  ✕ বাতিল করুন (Cancel)
                </button>
              </div>
            )}

            {/* PLAIN EXCEL SPREADSHEET CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              {/* Card Top Toolbar */}
              <div className="p-3 sm:px-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Mode Switcher */}
                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner h-12 sm:h-13 items-center">
                    <button
                      type="button"
                      onClick={() => handleModeChange('daily')}
                      className={`h-full px-3.5 sm:px-4 rounded-lg text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                        entryMode === 'daily'
                          ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Calendar size={15} /> দিনভিত্তিক শিফট এন্ট্রি
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange('monthly')}
                      className={`h-full px-3.5 sm:px-4 rounded-lg text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                        entryMode === 'monthly'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <CalendarRange size={15} /> মাসভিত্তিক এককালীন
                    </button>
                  </div>

                  {/* Date or Month Picker */}
                  {entryMode === 'daily' ? (
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 h-12 sm:h-13 shadow-inner">
                      <span className="text-slate-300 text-xs sm:text-sm font-bold whitespace-nowrap">📅 তারিখ:</span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="bg-transparent text-white font-mono font-bold text-xs sm:text-sm outline-none cursor-pointer h-full"
                        required
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 h-12 sm:h-13 shadow-inner">
                        <span className="text-slate-300 text-xs sm:text-sm font-bold whitespace-nowrap">🗓️ মাস:</span>
                        <select
                          value={selectedMonth}
                          onChange={e => setSelectedMonth(parseInt(e.target.value))}
                          className="bg-transparent text-white font-bold text-xs sm:text-sm outline-none cursor-pointer h-full"
                        >
                          {BENGALI_MONTHS.map(m => (
                            <option key={m.value} value={m.value} className="bg-slate-900 text-white">{m.bn} ({m.en})</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 h-12 sm:h-13 shadow-inner">
                        <span className="text-slate-300 text-xs sm:text-sm font-bold whitespace-nowrap">📅 সন:</span>
                        <select
                          value={selectedYear}
                          onChange={e => setSelectedYear(parseInt(e.target.value))}
                          className="bg-transparent text-white font-bold text-xs sm:text-sm outline-none cursor-pointer h-full"
                        >
                          {AVAILABLE_YEARS.map(y => (
                            <option key={y} value={y} className="bg-slate-900 text-white">{y} সন</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Operator Name */}
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 h-12 sm:h-13 shadow-inner">
                    <span className="text-slate-300 text-xs sm:text-sm font-bold whitespace-nowrap">👤 অপারেটর:</span>
                    <input
                      type="text"
                      value={defaultOperator}
                      onChange={e => setDefaultOperator(e.target.value)}
                      placeholder="Cashier"
                      className="bg-transparent text-white font-bold text-xs sm:text-sm outline-none w-24 sm:w-32 h-full"
                    />
                  </div>
                </div>
              </div>

              {/* EXCEL SPREADSHEET TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950 text-slate-300 uppercase font-black tracking-wider border-b-2 border-slate-700 select-none">
                    <tr className="divide-x divide-slate-800 text-[11px]">
                      <th className="py-2.5 px-1.5 text-center w-9 whitespace-nowrap text-slate-400">#</th>
                      <th className="py-2.5 px-2 min-w-[170px] whitespace-nowrap text-sky-400 bg-sky-950/20">শিফট / সেশন</th>
                      <th className="py-2.5 px-1 text-center w-14 whitespace-nowrap text-slate-200">রোগী</th>
                      <th className="py-2.5 px-2 text-right min-w-[85px] whitespace-nowrap text-indigo-300 bg-indigo-950/30">প্যাথলজি</th>
                      <th className="py-2.5 px-2 text-right min-w-[85px] whitespace-nowrap text-cyan-300 bg-cyan-950/30">ইউএসজি</th>
                      <th className="py-2.5 px-2 text-right min-w-[80px] whitespace-nowrap text-amber-300 bg-amber-950/30">এক্স-রে</th>
                      <th className="py-2.5 px-2 text-right min-w-[75px] whitespace-nowrap text-rose-300 bg-rose-950/30">ইসিজি</th>
                      <th className="py-2.5 px-2 text-right min-w-[85px] whitespace-nowrap text-purple-300 bg-purple-950/30">অন্যান্য</th>
                      <th className="py-2.5 px-2 text-right min-w-[90px] whitespace-nowrap text-white bg-slate-900 font-black">গ্রস বিল</th>
                      <th className="py-2.5 px-2 text-right min-w-[75px] whitespace-nowrap text-rose-400 bg-rose-950/20">ছাড়</th>
                      <th className="py-2.5 px-2 text-right min-w-[85px] whitespace-nowrap text-sky-300 bg-sky-950/30 font-black">নিট বিল</th>
                      <th className="py-2.5 px-2 text-right min-w-[100px] whitespace-nowrap text-emerald-300 bg-emerald-950/50 font-black">নগদ আদায়</th>
                      <th className="py-2.5 px-2 text-right min-w-[80px] whitespace-nowrap text-amber-400 bg-amber-950/20">বকেয়া</th>
                      <th className="py-2.5 px-2 text-right min-w-[85px] whitespace-nowrap text-rose-300 bg-rose-950/20">ডাক্তার পিসি</th>
                      <th className="py-2.5 px-2 text-right min-w-[85px] whitespace-nowrap text-amber-300 bg-amber-950/20">ইউএসজি ফি</th>
                      <th className="py-2.5 px-2 text-right min-w-[95px] whitespace-nowrap text-emerald-400 bg-emerald-950/40 font-black">নিট জমা</th>
                      <th className="py-2.5 px-2 min-w-[110px] whitespace-nowrap text-slate-400">মন্তব্য</th>
                      <th className="py-2.5 px-1 text-center w-10 whitespace-nowrap text-slate-500">মুছুন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 bg-slate-100 font-bold">
                    {shiftRows.map((row, idx) => {
                      const rowNetCash = (Number(row.cashCollected) || 0) - (Number(row.doctorCommissionPaid) || 0) - (Number(row.usgDoctorFeePaid) || 0);

                      return (
                        <tr key={row.id} className="divide-x divide-slate-300 bg-slate-100 hover:bg-slate-200/90 transition-colors">
                          {/* Row Index */}
                          <td className="p-1.5 text-center font-mono text-slate-700 bg-slate-200/90 font-bold">
                            {idx + 1}
                          </td>

                          {/* Shift Dropdown Menu */}
                          <td className="p-0 min-w-[170px] bg-slate-100">
                            <select
                              value={row.shift}
                              onChange={e => updateShiftRow(row.id, { shift: e.target.value })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-sky-600 focus:bg-white px-2 text-slate-900 font-bold text-xs cursor-pointer"
                            >
                              <option value="সারাদিন (Full Day)" className="bg-slate-900 text-white">সারাদিন (Full Day)</option>
                              <option value="সকল শিফট" className="bg-slate-900 text-white">সকল শিফট (All Shifts)</option>
                              <option value="সকাল (Morning)" className="bg-slate-900 text-white">সকাল (Morning)</option>
                              <option value="বিকাল (Afternoon)" className="bg-slate-900 text-white">বিকাল (Afternoon)</option>
                              <option value="সন্ধ্যা (Evening)" className="bg-slate-900 text-white">সন্ধ্যা (Evening)</option>
                              <option value="রাত (Night)" className="bg-slate-900 text-white">রাত (Night)</option>
                              <option value="জরুরি (Emergency)" className="bg-slate-900 text-white">জরুরি (Emergency)</option>
                              <option value="শিফট-১" className="bg-slate-900 text-white">শিফট-১ (Shift 1)</option>
                              <option value="শিফট-২" className="bg-slate-900 text-white">শিফট-২ (Shift 2)</option>
                              <option value="শিফট-৩" className="bg-slate-900 text-white">শিফট-৩ (Shift 3)</option>
                              <option value="মাসিক এককালীন (Monthly)" className="bg-slate-900 text-white">মাসিক এককালীন (Monthly)</option>
                              {row.shift && ![
                                'সারাদিন (Full Day)', 'সকল শিফট', 'সকাল (Morning)', 'বিকাল (Afternoon)', 'সন্ধ্যা (Evening)',
                                'রাত (Night)', 'জরুরি (Emergency)', 'শিফট-১', 'শিফট-২', 'শিফট-৩', 'মাসিক এককালীন (Monthly)'
                              ].includes(row.shift) && (
                                <option value={row.shift} className="bg-slate-900 text-white">{row.shift}</option>
                              )}
                            </select>
                          </td>

                          {/* Patients */}
                          <td className="p-0 w-14 bg-slate-50">
                            <input
                              type="number"
                              min="0"
                              value={row.totalPatients || ''}
                              onChange={e => updateShiftRow(row.id, { totalPatients: parseInt(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-sky-600 focus:bg-white px-1 text-slate-900 font-mono font-bold text-xs text-center select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* Pathology */}
                          <td className="p-0 min-w-[85px] bg-slate-50">
                            <input
                              type="number"
                              min="0"
                              value={row.pathology || ''}
                              onChange={e => updateShiftRow(row.id, { pathology: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white px-1.5 text-slate-900 font-mono font-bold text-xs text-right select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* USG */}
                          <td className="p-0 min-w-[85px] bg-slate-50">
                            <input
                              type="number"
                              min="0"
                              value={row.usg || ''}
                              onChange={e => updateShiftRow(row.id, { usg: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-cyan-600 focus:bg-white px-1.5 text-slate-900 font-mono font-bold text-xs text-right select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* X-Ray */}
                          <td className="p-0 min-w-[80px] bg-slate-50">
                            <input
                              type="number"
                              min="0"
                              value={row.xray || ''}
                              onChange={e => updateShiftRow(row.id, { xray: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-amber-600 focus:bg-white px-1.5 text-slate-900 font-mono font-bold text-xs text-right select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* ECG */}
                          <td className="p-0 min-w-[75px] bg-slate-50">
                            <input
                              type="number"
                              min="0"
                              value={row.ecg || ''}
                              onChange={e => updateShiftRow(row.id, { ecg: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-rose-600 focus:bg-white px-1.5 text-slate-900 font-mono font-bold text-xs text-right select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* Hormone & Others */}
                          <td className="p-0 min-w-[85px] bg-slate-50">
                            <input
                              type="number"
                              min="0"
                              value={(row.hormone || row.others) || ''}
                              onChange={e => updateShiftRow(row.id, { others: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-purple-600 focus:bg-white px-1.5 text-slate-900 font-mono font-bold text-xs text-right select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* Gross Amount */}
                          <td className="p-0 min-w-[90px] bg-slate-200/80 font-black">
                            <input
                              type="number"
                              min="0"
                              value={row.grossAmount || ''}
                              onChange={e => updateShiftRow(row.id, { grossAmount: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-sky-600 focus:bg-white px-1.5 text-slate-950 font-mono font-black text-sm sm:text-[15px] text-right select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* Discount */}
                          <td className="p-0 min-w-[75px] bg-slate-50">
                            <input
                              type="number"
                              min="0"
                              value={row.discountAmount || ''}
                              onChange={e => updateShiftRow(row.id, { discountAmount: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-rose-600 focus:bg-white px-1.5 text-rose-700 font-mono font-bold text-xs text-right select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* Net Payable (Auto) */}
                          <td className="px-2 py-1 min-w-[85px] text-right font-mono font-black text-slate-900 bg-slate-200/80">
                            ৳{(Number(row.netPayable) || 0).toLocaleString()}
                          </td>

                          {/* Cash Collected (Key Excel Cell) */}
                          <td className="p-0 min-w-[100px] bg-emerald-50">
                            <input
                              type="number"
                              min="0"
                              value={row.cashCollected !== undefined && row.cashCollected !== null ? row.cashCollected : ''}
                              onChange={e => updateShiftRow(row.id, { cashCollected: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white px-2 text-emerald-900 font-mono font-black text-xs text-right select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* Due Amount (Auto) */}
                          <td className="px-2 py-1 min-w-[80px] text-right font-mono bg-amber-50/70">
                            {(Number(row.dueAmount) || 0) > 0 ? (
                              <span className="text-amber-800 font-black">৳{(Number(row.dueAmount) || 0).toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">৳0</span>
                            )}
                          </td>

                          {/* Doctor PC */}
                          <td className="p-0 min-w-[85px] bg-slate-50">
                            <input
                              type="number"
                              min="0"
                              value={row.doctorCommissionPaid || ''}
                              onChange={e => updateShiftRow(row.id, { doctorCommissionPaid: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-amber-600 focus:bg-white px-1.5 text-amber-900 font-mono font-bold text-xs text-right select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* USG Doctor Fee */}
                          <td className="p-0 min-w-[85px] bg-slate-50">
                            <input
                              type="number"
                              min="0"
                              value={row.usgDoctorFeePaid || ''}
                              onChange={e => updateShiftRow(row.id, { usgDoctorFeePaid: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-amber-600 focus:bg-white px-1.5 text-amber-900 font-mono font-bold text-xs text-right select-all"
                              placeholder="0"
                            />
                          </td>

                          {/* Net Center Cash In Hand */}
                          <td className="px-2 py-1 min-w-[95px] text-right font-mono font-black text-emerald-950 bg-emerald-100/90">
                            ৳{rowNetCash.toLocaleString()}
                          </td>

                          {/* Notes */}
                          <td className="p-0 min-w-[110px] bg-slate-50">
                            <input
                              type="text"
                              value={row.notes || ''}
                              onChange={e => updateShiftRow(row.id, { notes: e.target.value })}
                              className="w-full h-9 bg-transparent border-0 outline-none focus:outline-none focus:ring-1 focus:ring-sky-600 focus:bg-white px-2 text-slate-900 font-medium text-xs"
                              placeholder="নোট..."
                            />
                          </td>

                          {/* Remove Row Button */}
                          <td className="p-1 text-center w-10 bg-slate-100">
                            <button
                              type="button"
                              onClick={() => handleRemoveShiftRow(row.id)}
                              className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-100 rounded transition-all cursor-pointer font-black"
                              title="লাইনটি মুছুন"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* GRAND TOTAL SUMMARY ROW (AUTO-SUMMED) */}
                  <tfoot className="bg-slate-950 font-black border-t-2 border-slate-700 select-none">
                    <tr className="divide-x divide-slate-800">
                      <td colSpan={2} className="py-3.5 px-2 text-center text-sky-400 uppercase tracking-wider font-black whitespace-nowrap text-sm sm:text-base">
                        📊 মোট যোগফল:
                      </td>
                      <td className="py-3.5 px-1 text-center font-mono text-white font-black whitespace-nowrap text-sm sm:text-base">
                        {shiftSheetTotals.patients}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-indigo-300 font-black whitespace-nowrap text-sm sm:text-base">
                        ৳{shiftSheetTotals.pathology.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-cyan-300 font-black whitespace-nowrap text-sm sm:text-base">
                        ৳{shiftSheetTotals.usg.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-amber-300 font-black whitespace-nowrap text-sm sm:text-base">
                        ৳{shiftSheetTotals.xray.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-rose-300 font-black whitespace-nowrap text-sm sm:text-base">
                        ৳{shiftSheetTotals.ecg.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-purple-300 font-black whitespace-nowrap text-sm sm:text-base">
                        ৳{(shiftSheetTotals.hormone + shiftSheetTotals.others).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono text-white bg-slate-900/90 font-black whitespace-nowrap text-base sm:text-lg">
                        ৳{shiftSheetTotals.gross.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-rose-400 font-black whitespace-nowrap text-sm sm:text-base">
                        -৳{shiftSheetTotals.discount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono text-sky-300 font-black whitespace-nowrap text-base sm:text-lg">
                        ৳{shiftSheetTotals.net.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono text-emerald-300 bg-emerald-950/80 font-black text-base sm:text-lg whitespace-nowrap">
                        ৳{shiftSheetTotals.cash.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono text-amber-300 font-black whitespace-nowrap text-base sm:text-lg">
                        ৳{shiftSheetTotals.due.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-rose-300 font-black whitespace-nowrap text-sm sm:text-base">
                        -৳{shiftSheetTotals.doctorPC.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-amber-300 font-black whitespace-nowrap text-sm sm:text-base">
                        -৳{shiftSheetTotals.usgFee.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono text-emerald-400 bg-slate-900 font-black text-base sm:text-lg whitespace-nowrap">
                        ৳{shiftSheetTotals.centerNet.toLocaleString()}
                      </td>
                      <td colSpan={2} className="py-3.5 px-2 text-center text-slate-400 font-black text-xs sm:text-sm whitespace-nowrap">
                        {shiftRows.length}টি শিফট
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* SPREADSHEET BOTTOM ACTION TOOLBAR */}
              <div className="p-3 sm:px-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="hidden sm:inline">💡 কি-বোর্ডের <b>Tab</b> চেপে দ্রুত এক সেল থেকে অন্য সেলে গিয়ে ডেটা এন্ট্রি করুন।</span>
                  <span className="sm:hidden text-sky-400 font-medium text-[11px]">📱 ডানে-বামে স্ক্রোল করে সব কলাম দেখতে পারবেন</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleAddShiftRow}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <PlusIcon size={14} /> + আরও শিফট যোগ
                  </button>

                  <button
                    type="button"
                    onClick={handleResetSheet}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                    title="সম্পূর্ণ শিট ক্লিয়ার করুন"
                  >
                    🔄 ক্লিয়ার
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveAllShifts()}
                    disabled={isSaving}
                    className="flex-1 sm:flex-initial px-5 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Save size={15} /> {isSaving ? 'সংরক্ষণ হচ্ছে...' : '💾 সেভ ও প্রিন্ট স্লিপ'}
                  </button>
                </div>
              </div>
            </div>

            {/* Embedded Saved Vouchers History List right below the form - Excel Like Light Eye-protective UI */}
            <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-4 shadow-xl space-y-3.5 text-slate-800">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 border-b border-slate-300 pb-3">
                <div className="shrink-0">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 whitespace-nowrap">
                    <FileSpreadsheet className="text-emerald-700" size={17} /> সংরক্ষিত ভাউচার তালিকা ও হিস্ট্রি ({sortedEntries.length} টি)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    পূর্বের সকল সংরক্ষিত ভাউচার দেখুন, ফিল্টার করুন এবং এডিট বা প্রিন্ট করুন।
                  </p>
                </div>

                {/* Filter & Search Bar Placed Neatly on the Right Side of Heading */}
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-start xl:justify-end">
                  <select
                    value={liveTypeFilter}
                    onChange={e => setLiveTypeFilter(e.target.value as any)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 font-bold text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-sm cursor-pointer"
                  >
                    <option value="all">সকল ধরন ({sortedEntries.length})</option>
                    <option value="daily">📅 দৈনিক</option>
                    <option value="monthly">🗓️ মাসিক</option>
                  </select>

                  <select
                    value={liveDueFilter}
                    onChange={e => setLiveDueFilter(e.target.value as any)}
                    className={`border rounded-xl px-2.5 py-1.5 font-black text-xs outline-none transition-all cursor-pointer shadow-sm ${
                      liveDueFilter === 'due'
                        ? 'bg-rose-100 border-rose-400 text-rose-800 ring-2 ring-rose-300'
                        : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-600'
                    }`}
                  >
                    <option value="all">সকল পেমেন্ট</option>
                    <option value="due">⚠️ বকেয়া</option>
                    <option value="paid">✅ পরিশোধিত</option>
                  </select>

                  <select
                    value={liveMonthFilter}
                    onChange={e => setLiveMonthFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 font-bold text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-sm cursor-pointer"
                  >
                    <option value="all">সকল মাস</option>
                    {BENGALI_MONTHS.map(m => (
                      <option key={m.value} value={String(m.value)}>{m.bn}</option>
                    ))}
                  </select>

                  <select
                    value={liveYearFilter}
                    onChange={e => setLiveYearFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 font-bold text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-sm cursor-pointer"
                  >
                    <option value="all">সকল সন</option>
                    {AVAILABLE_YEARS.map(y => (
                      <option key={y} value={String(y)}>{y} সন</option>
                    ))}
                  </select>

                  <div className="relative flex-1 sm:w-48 xl:w-52">
                    <input
                      type="text"
                      value={liveSearchQuery}
                      onChange={e => setLiveSearchQuery(e.target.value)}
                      placeholder="তারিখ, মাস, সন বা অপারেটর..."
                      className="w-full bg-white border border-slate-300 rounded-xl pl-7 pr-2.5 py-1.5 text-slate-900 font-bold text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-sm placeholder:text-slate-400"
                    />
                    <SearchIcon className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400" />
                  </div>

                  {(liveSearchQuery || liveTypeFilter !== 'all' || liveDueFilter !== 'all' || liveMonthFilter !== 'all' || liveYearFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setLiveSearchQuery('');
                        setLiveTypeFilter('all');
                        setLiveDueFilter('all');
                        setLiveMonthFilter('all');
                        setLiveYearFilter('all');
                      }}
                      className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                      title="ফিল্টার রিসেট"
                    >
                      ✕ রিসেট
                    </button>
                  )}
                </div>
              </div>

            {/* Live Stats Summary Ribbon */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold bg-white px-5 py-2.5 rounded-xl border border-slate-300 shadow-sm justify-around">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">মোট ভাউচার:</span>
                <span className="text-slate-950 font-mono font-black text-sm">{liveFilteredEntries.length} টি</span>
              </div>
              <div className="h-5 w-px bg-slate-300"></div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">মোট রোগী:</span>
                <span className="text-slate-950 font-mono font-black text-sm">{Number(liveStats?.patients || 0).toLocaleString()} জন</span>
              </div>
              <div className="h-5 w-px bg-slate-300"></div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">মোট গ্রস বিল:</span>
                <span className="text-sky-800 font-mono font-black text-sm">৳{(Number(liveStats?.gross) || 0).toLocaleString()}</span>
              </div>
              <div className="h-5 w-px bg-slate-300"></div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">মোট ক্যাশ আদায়:</span>
                <span className="text-emerald-700 font-mono font-black text-base">৳{(Number(liveStats?.cash) || 0).toLocaleString()}</span>
              </div>
              <div className="h-5 w-px bg-slate-300"></div>
              <button
                type="button"
                onClick={() => setLiveDueFilter(prev => prev === 'due' ? 'all' : 'due')}
                className={`text-left rounded-xl px-3 py-1 transition-all cursor-pointer ${
                  liveDueFilter === 'due'
                    ? 'bg-rose-100 border border-rose-400 ring-2 ring-rose-300'
                    : 'hover:bg-slate-100 border border-transparent'
                }`}
                title="ক্লিক করে বকেয়া ভাউচার ফিল্টার করুন"
              >
                <span className="text-slate-500 block text-[10px] uppercase font-bold flex items-center gap-1">
                  মোট বকেয়া {liveDueFilter === 'due' && <span className="text-rose-700 font-bold">(ফিল্টার সক্রিয়)</span>}:
                </span>
                <span className="text-rose-700 font-mono font-black text-base flex items-center gap-1">
                  ৳{(Number(liveStats?.due) || 0).toLocaleString()}
                  {(Number(liveStats?.due) || 0) > 0 && <span className="text-[11px]">⚠️</span>}
                </span>
              </button>
            </div>

            {/* Embedded Excel-Grid Table */}
            <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse text-xs border border-slate-300">
                  <thead className="bg-slate-200 text-slate-800 uppercase font-black tracking-wider border-b-2 border-slate-400 sticky top-0 z-10 select-none text-[11px]">
                    <tr className="divide-x divide-slate-300">
                      <th className="border border-slate-300 p-2.5 text-center w-12">ক্রমিক</th>
                      <th className="border border-slate-300 p-2.5">তারিখ / মাস-বছর</th>
                      <th className="border border-slate-300 p-2.5">এন্ট্রি টাইপ ও শিফট</th>
                      <th className="border border-slate-300 p-2.5">অপারেটর</th>
                      <th className="border border-slate-300 p-2.5 text-center w-16">রোগী</th>
                      <th className="border border-slate-300 p-2.5 text-right">গ্রস বিল</th>
                      <th className="border border-slate-300 p-2.5 text-right text-rose-700">ছাড়</th>
                      <th className="border border-slate-300 p-2.5 text-right text-sky-800">নিট বিল</th>
                      <th className="border border-slate-300 p-2.5 text-right text-emerald-800">ক্যাশ আদায়</th>
                      <th className="border border-slate-300 p-2.5 text-right text-amber-800">বাকি (Due)</th>
                      <th className="border border-slate-300 p-2.5 text-center w-28">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-800 divide-y divide-slate-300">
                    {liveFilteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="border border-slate-300 p-8 text-center text-slate-500 font-bold bg-white">
                          কোনো সংরক্ষিত রেকর্ড পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      liveFilteredEntries.map((row, index) => {
                        const isRowMonthly = row.entryType === 'monthly' || row.shift === 'Monthly';
                        const rowMonth = row.month !== undefined ? row.month : (row.date ? parseInt(row.date.split('-')[1]) - 1 : 0);
                        const rowYear = row.year !== undefined ? row.year : (row.date ? row.date.split('-')[0] : '');
                        const isEditingThis = editingRecordId === row.id;
                        const rowDue = Number(row.dueAmount) || 0;

                        return (
                          <tr key={row.id} className={`transition-colors divide-x divide-slate-300 ${isEditingThis ? 'bg-amber-100/90 text-amber-950 font-bold' : 'hover:bg-blue-50/70 bg-white even:bg-slate-50/70'}`}>
                            <td className="border border-slate-300 p-2 text-center font-mono text-slate-600 bg-slate-100/60 font-bold">{index + 1}</td>
                            <td className="border border-slate-300 p-2.5 font-mono text-slate-900 font-bold whitespace-nowrap">
                              {isRowMonthly ? (
                                <span className="font-black text-emerald-800">
                                  🗓️ {BENGALI_MONTHS[rowMonth]?.bn} {rowYear}
                                </span>
                              ) : (
                                <>
                                  <span className="font-bold">{row.date}</span> <span className="text-[10px] text-slate-500">({row.entryTime || 'N/A'})</span>
                                </>
                              )}
                            </td>
                            <td className="border border-slate-300 p-2.5 whitespace-nowrap">
                              {isRowMonthly ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black uppercase">
                                  মাসিক এককালীন
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-800 text-[10px] font-black uppercase">
                                  দৈনিক ({row.shift || 'Full Day'})
                                </span>
                              )}
                            </td>
                            <td className="border border-slate-300 p-2.5 text-slate-700 font-bold whitespace-nowrap">{row.operatorName || 'Cashier'}</td>
                            <td className="border border-slate-300 p-2 text-center font-mono text-slate-950 font-black">{row.totalPatients || 0}</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono text-slate-950 font-bold bg-slate-50/60">৳{(Number(row.grossAmount) || 0).toLocaleString()}</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono text-rose-600 font-bold">-৳{(Number(row.discountAmount) || 0).toLocaleString()}</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono text-sky-900 font-black bg-sky-50/40">৳{(Number(row.netPayable) || 0).toLocaleString()}</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono text-emerald-800 font-black bg-emerald-50/60">৳{(Number(row.cashCollected) || 0).toLocaleString()}</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono whitespace-nowrap">
                              {rowDue > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-rose-100 border border-rose-300 text-rose-800 font-black inline-flex items-center gap-1 shadow-sm text-xs">
                                  ৳{rowDue.toLocaleString()} <span className="text-[10px]">⚠️</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 font-bold">৳0</span>
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center bg-slate-50/40">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(row)}
                                  className={`p-1.5 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer ${
                                    isEditingThis ? 'bg-amber-500 text-slate-950 font-black' : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                                  }`}
                                  title="সম্পাদনা করুন (Edit)"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintVoucher(row)}
                                  className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                                  title="প্রিন্ট ভাউচার"
                                >
                                  <PrinterIcon size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEntryToDelete(row)}
                                  className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                                  title="মুছে ফেলুন"
                                >
                                  <TrashIcon size={14} />
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
        </div>
      )}

        {/* History Tab */}
        {activeSubTab === 'history' && (
          <div className="space-y-6 animate-fade-in w-full max-w-[98%] 2xl:max-w-[1800px] mx-auto">
            {/* Quick Clean Auto Entries Banner */}
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-slate-300 text-xs font-bold flex items-center gap-2">
                <span className="text-lg">🧹</span>
                <span>
                  <b>অটো-জেনারেটেড ডামি এন্ট্রি পরিষ্কার:</b> সফটওয়্যার আপডেট বা সিঙ্কের কারণে জানুয়ারি/ফেব্রুয়ারি/মার্চ বা অন্য মাসের ১ তারিখে কোনো অতিরিক্ত ডামি এন্ট্রি এসে থাকলে এক ক্লিকে তা মুছে ফেলুন (আগস্ট ও সেপ্টেম্বর সুরক্ষিত থাকবে)।
                </span>
              </div>
              <button
                onClick={() => setShowCleanAutoModal(true)}
                disabled={isSaving}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 shrink-0"
              >
                {isSaving ? 'পরিষ্কার হচ্ছে...' : '⚡ ১ তারিখের ডামি এন্ট্রিগুলো মুছুন'}
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">এন্ট্রি ধরন</label>
                  <select
                    value={historyTypeFilter || 'all'}
                    onChange={e => setHistoryTypeFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs outline-none focus:border-sky-500"
                  >
                    <option value="all">সকল ভাউচার ({sortedEntries.length})</option>
                    <option value="daily">📅 শুধুমাত্র দৈনিক</option>
                    <option value="monthly">🗓️ শুধুমাত্র মাসিক</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">পেমেন্ট স্ট্যাটাস (Due)</label>
                  <select
                    value={historyDueFilter}
                    onChange={e => setHistoryDueFilter(e.target.value as any)}
                    className={`border rounded-xl px-3 py-2 font-black text-xs outline-none transition-all ${
                      historyDueFilter === 'due'
                        ? 'bg-rose-950 border-rose-500 text-rose-200'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-sky-500'
                    }`}
                  >
                    <option value="all">সকল পেমেন্ট স্ট্যাটাস</option>
                    <option value="due">⚠️ শুধুমাত্র বকেয়া ভাউচার (Due Only)</option>
                    <option value="paid">✅ সম্পূর্ণ পরিশোধিত (Paid)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">মাস ফিল্টার</label>
                  <select
                    value={historyMonthFilter || 'all'}
                    onChange={e => setHistoryMonthFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs outline-none focus:border-sky-500"
                  >
                    <option value="all">সকল মাস</option>
                    {BENGALI_MONTHS.map(m => (
                      <option key={m.value} value={String(m.value)}>{m.bn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">বৎসর ফিল্টার</label>
                  <select
                    value={historyYearFilter || 'all'}
                    onChange={e => setHistoryYearFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs outline-none focus:border-sky-500"
                  >
                    <option value="all">সকল বৎসর</option>
                    {AVAILABLE_YEARS.map(y => (
                      <option key={y} value={String(y)}>{y} সন</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">নির্দিষ্ট তারিখ</label>
                  <input
                    type="date"
                    value={searchDate || ''}
                    onChange={e => setSearchDate(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs outline-none focus:border-sky-500"
                  />
                </div>

                {(searchDate || historyTypeFilter !== 'all' || historyDueFilter !== 'all' || historyMonthFilter !== 'all' || historyYearFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchDate('');
                      setHistoryTypeFilter('all');
                      setHistoryDueFilter('all');
                      setHistoryMonthFilter('all');
                      setHistoryYearFilter('all');
                    }}
                    className="mt-4 px-3 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-black transition-all"
                  >
                    ✕ ফিল্টার রিসেট
                  </button>
                )}
              </div>

              {/* Summary Stats Pill */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 self-stretch lg:self-auto justify-around">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">মোট রোগী:</span>
                  <span className="text-white font-mono font-black text-sm">{Number(historyStats?.patients || 0).toLocaleString()} জন</span>
                </div>
                <div className="h-6 w-px bg-slate-800"></div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">মোট ক্যাশ আদায়:</span>
                  <span className="text-emerald-400 font-mono font-black text-base">৳{(Number(historyStats?.cash) || 0).toLocaleString()}</span>
                </div>
                <div className="h-6 w-px bg-slate-800"></div>
                <button
                  type="button"
                  onClick={() => setHistoryDueFilter(prev => prev === 'due' ? 'all' : 'due')}
                  className={`text-left rounded-xl px-3 py-1 transition-all cursor-pointer ${
                    historyDueFilter === 'due'
                      ? 'bg-rose-500/30 border border-rose-500 ring-2 ring-rose-500/50'
                      : 'hover:bg-slate-900 border border-transparent'
                  }`}
                  title="ক্লিক করে বকেয়া ভাউচার ফিল্টার করুন"
                >
                  <span className="text-slate-400 block text-[10px] uppercase flex items-center gap-1">
                    মোট বকেয়া {historyDueFilter === 'due' && <span className="text-rose-400 font-bold">(ফিল্টার সক্রিয়)</span>}:
                  </span>
                  <span className="text-rose-400 font-mono font-black text-base flex items-center gap-1">
                    ৳{(Number(historyStats?.due) || 0).toLocaleString()}
                    {(Number(historyStats?.due) || 0) > 0 && <span className="text-[11px]">⚠️</span>}
                  </span>
                </button>
              </div>
            </div>

            {/* Duplicate Notice Banner */}
            {duplicateEntryIds.length > 0 && (
              <div className="bg-amber-950/60 border-2 border-amber-500/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-lg animate-pulse">
                <div className="flex items-center gap-3 text-amber-200 text-sm font-bold">
                  <span className="text-xl">⚠️</span>
                  <span>
                    তালিকায় <b>{duplicateEntryIds.length}টি ডুপ্লিকেট এন্ট্রি</b> শনাক্ত হয়েছে (যেমন একই মাসের বা তারিখের ডাবল রেকর্ড)।
                  </span>
                </div>
                <button
                  onClick={() => setShowCleanDuplicatesModal(true)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 shrink-0"
                >
                  {isSaving ? 'মুছে ফেলা হচ্ছে...' : '⚡ অতিরিক্ত ডুপ্লিকেট মুছে একটি রাখুন'}
                </button>
              </div>
            )}

            {/* Records Table - Eye-Protective Excel Grid */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs border border-slate-300">
                  <thead className="bg-slate-200 text-slate-800 uppercase font-black tracking-wider border-b-2 border-slate-400 sticky top-0 z-10 select-none text-[11px]">
                    <tr className="divide-x divide-slate-300">
                      <th className="border border-slate-300 p-2.5 text-center w-12">ক্রমিক</th>
                      <th className="border border-slate-300 p-2.5">তারিখ ও সময়</th>
                      <th className="border border-slate-300 p-2.5">তারিখ / মাস-বছর</th>
                      <th className="border border-slate-300 p-2.5">এন্ট্রি টাইপ ও শিফট</th>
                      <th className="border border-slate-300 p-2.5">অপারেটর</th>
                      <th className="border border-slate-300 p-2.5 text-center w-16">রোগী</th>
                      <th className="border border-slate-300 p-2.5 text-right">গ্রস বিল</th>
                      <th className="border border-slate-300 p-2.5 text-right text-rose-700">ছাড়</th>
                      <th className="border border-slate-300 p-2.5 text-right text-sky-800">নিট বিল</th>
                      <th className="border border-slate-300 p-2.5 text-right text-emerald-800">ক্যাশ আদায়</th>
                      <th className="border border-slate-300 p-2.5 text-right text-amber-800">বাকি (Due)</th>
                      <th className="border border-slate-300 p-2.5 text-center w-28">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-800 divide-y divide-slate-300">
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="border border-slate-300 p-8 text-center text-slate-500 font-bold bg-white">
                          কোনো কনসোলিডেটেড রেকর্ড পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((row, index) => {
                        const isRowMonthly = row.entryType === 'monthly' || row.shift === 'Monthly';
                        const rowMonth = row.month !== undefined ? row.month : (row.date ? parseInt(row.date.split('-')[1]) - 1 : 0);
                        const rowYear = row.year !== undefined ? row.year : (row.date ? row.date.split('-')[0] : '');

                        return (
                          <tr key={row.id} className="hover:bg-blue-50/70 transition-colors bg-white even:bg-slate-50/70 divide-x divide-slate-300">
                            <td className="border border-slate-300 p-2 text-center font-mono text-slate-600 bg-slate-100/60 font-bold">{index + 1}</td>
                            <td className="border border-slate-300 p-2.5 font-mono text-slate-600 text-xs">
                              {row.createdAt ? new Date(row.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : (row.date || 'N/A')}
                            </td>
                            <td className="border border-slate-300 p-2.5 font-mono text-slate-900 font-bold whitespace-nowrap">
                              {isRowMonthly ? (
                                <span className="font-black text-emerald-800">
                                  {BENGALI_MONTHS[rowMonth]?.bn} {rowYear}
                                </span>
                              ) : (
                                <>
                                  <span className="font-bold">{row.date}</span> <span className="text-[10px] text-slate-500">({row.entryTime})</span>
                                </>
                              )}
                            </td>
                            <td className="border border-slate-300 p-2.5 whitespace-nowrap">
                              {isRowMonthly ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black uppercase">
                                  🗓️ মাসিক এককালীন
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-800 text-[10px] font-black uppercase">
                                  📅 দৈনিক ({row.shift})
                                </span>
                              )}
                            </td>
                            <td className="border border-slate-300 p-2.5 text-slate-700 font-bold whitespace-nowrap">{row.operatorName}</td>
                            <td className="border border-slate-300 p-2 text-center font-mono text-slate-950 font-black">{row.totalPatients}</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono text-slate-950 font-bold bg-slate-50/60">৳{(Number(row.grossAmount) || 0).toLocaleString()}</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono text-rose-600 font-bold">-৳{(Number(row.discountAmount) || 0).toLocaleString()}</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono text-sky-900 font-black bg-sky-50/40">৳{(Number(row.netPayable) || 0).toLocaleString()}</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono text-emerald-800 font-black bg-emerald-50/60">৳{(Number(row.cashCollected) || 0).toLocaleString()}</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono whitespace-nowrap">
                              {(Number(row.dueAmount) || 0) > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-rose-100 border border-rose-300 text-rose-800 font-black inline-flex items-center gap-1 shadow-sm text-xs">
                                  ৳{(Number(row.dueAmount) || 0).toLocaleString()} <span className="text-[10px]">⚠️</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 font-bold">৳0</span>
                              )}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center bg-slate-50/40">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleStartEdit(row)}
                                  className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-all shadow-sm active:scale-95 cursor-pointer"
                                  title="সম্পাদনা করুন"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handlePrintVoucher(row)}
                                  className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                                  title="প্রিন্ট ভাউচার"
                                >
                                  <PrinterIcon size={14} />
                                </button>
                                <button
                                  onClick={() => setEntryToDelete(row)}
                                  className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                                  title="মুছে ফেলুন"
                                >
                                  <TrashIcon size={14} />
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
      </main>

      {/* In-App Confirmation Modal: Delete Single Entry */}
      {entryToDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in pointer-events-auto">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight font-['Hind_Siliguri']">রেকর্ড মুছে ফেলার নিশ্চয়তা</h3>
              <p className="text-xs text-slate-300 font-bold mt-1">
                আপনি কি নিশ্চিত যে এই কনসোলিডেটেড রেকর্ডটি স্থায়ীভাবে ডাটাবেজ ও অনলাইন থেকে মুছে ফেলতে চান?
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>ভাউচার আইডি:</span>
                <span className="text-sky-400 font-bold">{entryToDelete.id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>তারিখ / মাস:</span>
                <span className="text-white font-bold">
                  {entryToDelete.entryType === 'monthly' || entryToDelete.shift === 'Monthly'
                    ? `${BENGALI_MONTHS[entryToDelete.month ?? 0]?.bn} ${entryToDelete.year ?? ''}`
                    : entryToDelete.date}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>মোট গ্রস বিল:</span>
                <span className="text-white font-bold">৳{(Number(entryToDelete.grossAmount) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ক্যাশ আদায়:</span>
                <span className="text-emerald-400 font-bold">৳{(Number(entryToDelete.cashCollected) || 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => setEntryToDelete(null)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={confirmDeleteRecord}
                className="py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-rose-900/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeletingRecord ? 'মুছে ফেলা হচ্ছে...' : '🗑️ হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* In-App Confirmation Modal: Clean Auto Entries */}
      {showCleanAutoModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in pointer-events-auto">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              🧹
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight font-['Hind_Siliguri']">ডামি অটো-এন্ট্রি পরিষ্কার</h3>
              <p className="text-xs text-slate-300 font-bold mt-2 leading-relaxed">
                সফটওয়্যার আপডেট বা সিঙ্কের কারণে তৈরি হওয়া জানুয়ারি, ফেব্রুয়ারি ও মার্চ মাসের ১ তারিখের অতিরিক্ত ডামি রেকর্ডগুলো মুছে ফেলা হবে।
              </p>
              <p className="text-xs text-emerald-400 font-bold mt-1">
                (আপনার আগস্ট মাসের ৳৪,৮৯,৫৬৯ ও সেপ্টেম্বর মাসের ৳২০,০০০ কালেকশন সম্পূর্ণ সুরক্ষিত থাকবে)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isCleaningAuto}
                onClick={() => setShowCleanAutoModal(false)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                disabled={isCleaningAuto}
                onClick={confirmCleanAutoEntries}
                className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCleaningAuto ? 'পরিষ্কার হচ্ছে...' : '⚡ হ্যাঁ, পরিষ্কার করুন'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* In-App Confirmation Modal: Clean Duplicates */}
      {showCleanDuplicatesModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in pointer-events-auto">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight font-['Hind_Siliguri']">ডুপ্লিকেট রেকর্ড পরিষ্কার</h3>
              <p className="text-xs text-slate-300 font-bold mt-2">
                শনাক্তকৃত {duplicateEntryIds.length}টি ডুপ্লিকেট রেকর্ড স্থায়ীভাবে মুছে ফেলা হবে। একটি মূল রেকর্ড অক্ষত রাখা হবে।
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isCleaningDuplicates}
                onClick={() => setShowCleanDuplicatesModal(false)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                disabled={isCleaningDuplicates}
                onClick={confirmCleanDuplicates}
                className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCleaningDuplicates ? 'পরিষ্কার হচ্ছে...' : '⚡ হ্যাঁ, ডুপ্লিকেট মুছুন'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Full-Screen Blocking Loading Overlay During Delete/Clean Operation */}
      {(isDeletingRecord || isCleaningAuto || isCleaningDuplicates) && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1000003] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none cursor-wait pointer-events-auto">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-rose-500 text-3xl font-black">
              🗑️
            </div>
          </div>
          <h3 className="text-2xl font-black text-white mb-3 font-['Hind_Siliguri'] tracking-wide">
            অনলাইনে ডাটা মুছে ফেলা হচ্ছে...
          </h3>
          <p className="text-slate-300 font-medium text-sm max-w-md">
            ক্লাউড ডাটাবেজ আপডেট সম্পন্ন না হওয়া পর্যন্ত অন্য কোনো কাজ করা যাবে না। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।
          </p>
        </div>,
        document.body
      )}

      {/* Success Notification Modal */}
      {deleteSuccessModalMsg && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1000002] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in pointer-events-auto">
          <div className="bg-slate-900 border-2 border-emerald-500 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
              ✓
            </div>
            <h3 className="text-xl font-black text-white font-['Hind_Siliguri']">ডাটা মুছে ফেলা সম্পন্ন হয়েছে</h3>
            <p className="text-sm font-bold text-emerald-300">
              {deleteSuccessModalMsg}
            </p>
            <button
              type="button"
              onClick={() => setDeleteSuccessModalMsg(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              ঠিক আছে (OK)
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Auto-Prompt Print Modal after save */}
      {printingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase">
                {printingEntry.entryType === 'monthly' || printingEntry.shift === 'Monthly'
                  ? 'মাসিক ভাউচার সংরক্ষিত হয়েছে!'
                  : 'ভাউচার সংরক্ষিত হয়েছে!'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                ভাউচার নং: <span className="font-mono text-sky-400 font-bold">{printingEntry.id}</span>
                {printingEntry.entryType === 'monthly' || printingEntry.shift === 'Monthly' ? (
                  <> | মাস-বৎসর: <span className="text-emerald-400 font-bold">{BENGALI_MONTHS[printingEntry.month ?? new Date(printingEntry.date).getMonth()]?.bn} {printingEntry.year ?? printingEntry.date.split('-')[0]}</span></>
                ) : (
                  <> | তারিখ: {printingEntry.date}</>
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setPrintingEntry(null)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-xs uppercase"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={() => {
                  handlePrintVoucher(printingEntry);
                  setPrintingEntry(null);
                }}
                className="py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2"
              >
                <PrinterIcon size={16} /> প্রিন্ট ভাউচার
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
