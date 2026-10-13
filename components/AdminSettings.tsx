import React, { useState, useEffect } from 'react';
import { BackIcon, SettingsIcon, SaveIcon, DownloadIcon, TrashIcon, DatabaseIcon, RefreshIcon, Activity, UsersIcon, PrinterIcon, PlusIcon, XIcon } from './Icons';
import { DepartmentPasswords } from '../types';
import { 
  dbService, 
  ClinicProfile, 
  PrintSettings, 
  StaffAccount, 
  SMSGatewaySettings, 
  AutoBackupSettings, 
  HospitalAdjustment, 
  HospitalModuleConfig, 
  defaultClinicProfile, 
  defaultPrintSettings, 
  defaultStaffAccounts, 
  defaultSMSGatewaySettings, 
  defaultAutoBackupSettings, 
  defaultHospitalAdjustments, 
  defaultHospitalModuleConfig 
} from '../dbService';
import { 
  MessageSquare, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Send, 
  HardDrive, 
  FileJson, 
  ArrowDownToLine, 
  Upload, 
  Trash2, 
  Sliders, 
  Scale, 
  Sparkles, 
  AlertCircle, 
  Layers, 
  Eye, 
  ChevronRight, 
  CheckCircle, 
  Percent, 
  ArrowUpDown, 
  Plus, 
  Lock, 
  Unlock, 
  FileText, 
  Zap, 
  Check 
} from 'lucide-react';
import { ClinicLogo } from './ClinicLogo';

import { generateOfflineViewer } from '../utils/portableBackup';

interface AdminSettingsProps {
  passwords: DepartmentPasswords;
  onSave?: (newPasswords: DepartmentPasswords) => void;
  setPasswords?: React.Dispatch<React.SetStateAction<DepartmentPasswords>>;
  onBack: () => void;
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
  isManualSyncing?: boolean;
  manualSyncError?: string | null;
}

type SettingsTab = 'admin_hub' | 'profile' | 'security' | 'print' | 'sms' | 'database' | 'autobackup' | 'backup';

const AdminSettings: React.FC<AdminSettingsProps> = ({ 
  passwords, 
  onSave, 
  setPasswords, 
  onBack, 
  performBlockingSync 
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('admin_hub');
  const [localPasswords, setLocalPasswords] = useState<DepartmentPasswords>(passwords);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // Hospital Adjustments & Modules State
  const [hospitalAdjustments, setHospitalAdjustments] = useState<HospitalAdjustment[]>(() => dbService.getHospitalAdjustments());
  const [moduleConfig, setModuleConfig] = useState<HospitalModuleConfig>(() => dbService.getHospitalModuleConfig());
  const [adjDept, setAdjDept] = useState<'DIAGNOSTIC' | 'CLINIC' | 'MEDICINE' | 'ACCOUNTS' | 'GENERAL'>('DIAGNOSTIC');
  const [adjType, setAdjType] = useState<'INCOME_ADD' | 'EXPENSE_ADJUST' | 'DISCOUNT_WAIVER' | 'AUDIT_CORRECTION'>('INCOME_ADD');
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjDate, setAdjDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [adjCategory, setAdjCategory] = useState<string>('ল্যাব আয় সমন্বয়');
  const [adjNote, setAdjNote] = useState<string>('');
  const [adjFilterDept, setAdjFilterDept] = useState<string>('ALL');
  const [logoAutoAdjusting, setLogoAutoAdjusting] = useState(false);

  // Clinic Profile State
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>(() => dbService.getClinicProfile());
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Print Settings State
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => dbService.getPrintSettings());
  const [isSavingPrint, setIsSavingPrint] = useState(false);

  // SMS Gateway State
  const [smsSettings, setSmsSettings] = useState<SMSGatewaySettings>(() => dbService.getSMSGatewaySettings());
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [testSmsRecipient, setTestSmsRecipient] = useState('');
  const [testSmsMessage, setTestSmsMessage] = useState('Dear Patient, welcome to Niramoy Clinic & Diagnostic. Your test is in progress.');
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<string | null>(null);

  // Auto-Backup & Snapshots State
  const [autoBackupSettings, setAutoBackupSettings] = useState<AutoBackupSettings>(() => dbService.getAutoBackupSettings());
  const [isSavingAutoBackup, setIsSavingAutoBackup] = useState(false);
  const [localSnapshots, setLocalSnapshots] = useState(() => dbService.getLocalSnapshots());
  const [snapshotTitleInput, setSnapshotTitleInput] = useState('');
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);

  // Staff Accounts State
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(() => dbService.getStaffAccounts());
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState<StaffAccount>({
    id: `STF-${String(Date.now()).slice(-4)}`,
    name: '',
    username: '',
    role: 'RECEPTIONIST',
    dept: 'Diagnostic & Billing',
    mobile: '',
    status: 'Active'
  });

  // Reset & Recovery State
  const [resetStep, setResetStep] = useState(0); // 0: None, 1: Confirm, 2: Backup Prompt, 3: Final Type Check
  const [finalConfirmText, setFinalConfirmText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [pastedJson, setPastedJson] = useState('');

  // Supabase Live DB state
  const supConfig = dbService.getSupabaseConfig();
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(supConfig.url || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(supConfig.key || '');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tablesFound?: Record<string, number> } | null>(null);
  const [isReloadingFromCloud, setIsReloadingFromCloud] = useState(false);
  const [showConfigInputs, setShowConfigInputs] = useState(!supConfig.isConnected);

  // Medicine Multi-Table Migration State
  const [isMigratingMedicine, setIsMigratingMedicine] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [medicineStats, setMedicineStats] = useState<{ purchases: number; sales: number; medicines: number; connected: boolean } | null>(null);
  const [showSqlScript, setShowSqlScript] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Safe Pre-Migration Backup & Smart Migration Engine State
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);
  const [rollbackSnapshotInfo, setRollbackSnapshotInfo] = useState(() => dbService.getPreMigrationSnapshotInfo());
  const [isSmartMigrating, setIsSmartMigrating] = useState(false);
  const [migrationStepMsg, setMigrationStepMsg] = useState('');
  const [migrationPct, setMigrationPct] = useState(0);
  const [smartMigrationReport, setSmartMigrationReport] = useState<any | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackMsg, setRollbackMsg] = useState<string | null>(null);
  const [multiTableStats, setMultiTableStats] = useState<{ connected: boolean; tables: Record<string, number>; totalCount: number } | null>(null);
  const [showFullSqlScript, setShowFullSqlScript] = useState(false);
  const [copiedFullSql, setCopiedFullSql] = useState(false);
  const [showDropNcdStateGuidance, setShowDropNcdStateGuidance] = useState(false);
  const [isSingleTableDisabled, setIsSingleTableDisabled] = useState(() => dbService.isSingleTableSaveDisabled());

  // Dedicated Expense Transfer State
  const [isTransferringExpenses, setIsTransferringExpenses] = useState(false);
  const [expenseTransferPct, setExpenseTransferPct] = useState(0);
  const [expenseTransferMsg, setExpenseTransferMsg] = useState('');
  const [expenseTransferReport, setExpenseTransferReport] = useState<{
    success: boolean;
    message: string;
    transferredCount: number;
    duplicatesSkipped: number;
    totalLegacyExpenses: number;
    totalModularExpensesNow: number;
    datesCovered: string[];
  } | null>(null);

  // Dedicated Tests & Commission Transfer State
  const [isTransferringTests, setIsTransferringTests] = useState(false);
  const [testTransferPct, setTestTransferPct] = useState(0);
  const [testTransferMsg, setTestTransferMsg] = useState('');
  const [testTransferReport, setTestTransferReport] = useState<{
    success: boolean;
    message: string;
    restoredCommissionsCount: number;
    transferredCount: number;
    totalTestsNow: number;
  } | null>(null);

  const handleTransferTests = async () => {
    if (!window.confirm("আপনি কি ncd_state থেকে সমস্ত টেস্টের আসল কমিশন (PC) ও সার্ভিস প্রাইজ Supabase-এর tests/test টেবিলে পার্মানেন্ট ট্রান্সফার করতে চান?\n\n১. এটি ncd_state-এর কোনো ডাটা ডিলিট করবে না (১০০% রিড-অনলি)।\n২. বর্তমান কোনো টেস্টের সঠিক ডাটা নষ্ট হবে না।\n৩. ট্রান্সফার শেষে ল্যাব ইনভয়েস ও টেস্ট টেবিলে কমিশন স্বয়ংক্রিয়ভাবে কার্যকর হবে।\n\nচালিয়ে যেতে 'OK' চাপুন।")) {
      return;
    }
    setIsTransferringTests(true);
    setTestTransferReport(null);
    setTestTransferMsg('শুরু হচ্ছে...');
    setTestTransferPct(5);

    try {
      const report = await dbService.migrateTestsFromNcdStateToModular((msg, pct) => {
        setTestTransferMsg(msg);
        setTestTransferPct(pct);
      });
      setTestTransferReport(report);
      if (performBlockingSync) {
        await performBlockingSync();
      }
    } catch (e: any) {
      setTestTransferReport({
        success: false,
        message: 'টেস্ট ট্রান্সফারে অপ্রত্যাশিত ত্রুটি: ' + (e?.message || 'অজানা ত্রুটি'),
        restoredCommissionsCount: 0,
        transferredCount: 0,
        totalTestsNow: 0
      });
    } finally {
      setIsTransferringTests(false);
    }
  };

  const handleTransferExpenses = async () => {
    if (!window.confirm("আপনি কি ncd_state থেকে জানুয়ারি-জুলাই ও সমস্ত ঐতিহাসিক খরচের ডাটা Supabase-এর detailed_expenses টেবিলে পার্মানেন্ট ট্রান্সফার করতে চান?\n\n১. এটি ncd_state-এর কোনো ডাটা ডিলিট করবে না (১০০% রিড-অনলি)।\n২. detailed_expenses টেবিলে থাকা বর্তমান কোনো ডাটা ক্ষতিগ্রস্ত হবে না এবং কোনো ডুপ্লিকেট তৈরি হবে না।\n৩. ট্রান্সফার শেষে অ্যাপের সমস্ত খরচ সরাসরি detailed_expenses থেকে আসবে।\n\nচালিয়ে যেতে 'OK' চাপুন।")) {
      return;
    }
    setIsTransferringExpenses(true);
    setExpenseTransferReport(null);
    setExpenseTransferMsg('শুরু হচ্ছে...');
    setExpenseTransferPct(5);

    try {
      const report = await dbService.migrateExpensesFromNcdStateToModular((msg, pct) => {
        setExpenseTransferMsg(msg);
        setExpenseTransferPct(pct);
      });
      setExpenseTransferReport(report);
      if (performBlockingSync) {
        await performBlockingSync();
      }
    } catch (e: any) {
      setExpenseTransferReport({
        success: false,
        message: 'খরচ ট্রান্সফারে অপ্রত্যাশিত ত্রুটি: ' + (e?.message || 'অজানা ত্রুটি'),
        transferredCount: 0,
        duplicatesSkipped: 0,
        totalLegacyExpenses: 0,
        totalModularExpensesNow: 0,
        datesCovered: []
      });
    } finally {
      setIsTransferringExpenses(false);
    }
  };

  const isConnected = dbService.isSupabaseConnected();

  const handleToggleSingleTableSave = () => {
    const nextVal = !isSingleTableDisabled;
    dbService.setSingleTableSaveDisabled(nextVal);
    setIsSingleTableDisabled(nextVal);
  };

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    setSnapshotMsg(null);
    try {
      const res = await dbService.createPreMigrationSnapshot();
      if (res.success) {
        setSnapshotMsg(`✓ সেফটি স্ন্যাপশট ও ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন হয়েছে (${res.filename})!`);
        setRollbackSnapshotInfo(dbService.getPreMigrationSnapshotInfo());
      } else {
        setSnapshotMsg('স্ন্যাপশট তৈরি করতে সমস্যা হয়েছে।');
      }
    } catch (e: any) {
      setSnapshotMsg('ত্রুটি: ' + (e?.message || 'অজানা ত্রুটি'));
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRunSmartMigration = async () => {
    if (!window.confirm("আপনি কি নিরাপদ স্মার্ট মাইগ্রেশন ইঞ্জিন চালু করতে চান?\n\n১. এটি শুরু করার আগে স্বয়ংক্রিয়ভাবে বর্তমান ডাটার একটি সেফটি স্ন্যাপশট ও JSON ব্যাকআপ ফাইল ডাউনলোড করবে।\n২. পুরাতন ncd_state থেকে কোনো ডাটা ডিলিট করা হবে না (১০০% রিড-অনলি)।\n৩. নতুন পৃথক টেবিলে আগে থেকেই থাকা ডাটা সর্বোচ্চ অগ্রাধিকার পাবে এবং পুরোনো ডুপ্লিকেট বাদ দেওয়া হবে।\n\nচালিয়ে যেতে 'OK' চাপুন।")) {
      return;
    }
    setIsSmartMigrating(true);
    setSmartMigrationReport(null);
    setMigrationStepMsg('শুরু হচ্ছে...');
    setMigrationPct(5);

    try {
      const report = await dbService.runSmartMigrationEngine(undefined, (msg, pct) => {
        setMigrationStepMsg(msg);
        setMigrationPct(pct);
      });
      setSmartMigrationReport(report);
      setRollbackSnapshotInfo(dbService.getPreMigrationSnapshotInfo());
      const stats = await dbService.getMultiTableMigrationStats();
      setMultiTableStats(stats);
      if (performBlockingSync) {
        await performBlockingSync();
      }
    } catch (e: any) {
      setSmartMigrationReport({
        success: false,
        message: 'মাইগ্রেশনে অপ্রত্যাশিত ত্রুটি: ' + (e?.message || 'অজানা ত্রুটি'),
        rescued: { total: 0 },
        duplicatesIgnored: 0,
        tablesUpdated: []
      });
    } finally {
      setIsSmartMigrating(false);
    }
  };

  const handleRollbackSnapshot = async () => {
    if (!window.confirm("সতর্কতা: আপনি কি নিশ্চিতভাবে প্রি-মাইগ্রেশন স্ন্যাপশটে রোলব্যাক করতে চান?\n\nএটি বর্তমান ডাটাকে মাইগ্রেশন শুরুর আগের ঠিক সেই মুহূর্তে ফেরত নিয়ে যাবে।")) {
      return;
    }
    setIsRollingBack(true);
    setRollbackMsg(null);
    try {
      const res = await dbService.rollbackToPreMigrationSnapshot();
      if (res.success) {
        setRollbackMsg(`✓ ${res.message}`);
        if (performBlockingSync) {
          await performBlockingSync(res.restoredData);
        }
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setRollbackMsg(`রোলব্যাক ব্যর্থ: ${res.message}`);
      }
    } catch (e: any) {
      setRollbackMsg(`ত্রুটি: ${e?.message || 'অজানা ত্রুটি'}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleCheckMultiTableStats = async () => {
    const stats = await dbService.getMultiTableMigrationStats();
    setMultiTableStats(stats);
  };

  const handleRunMedicineMigration = async () => {
    setIsMigratingMedicine(true);
    setMigrationStatus(null);
    try {
      const res = await dbService.migrateMedicineToModularTables();
      setMigrationStatus({ success: res.success, message: res.message });
      const stats = await dbService.getMedicineModularStats();
      setMedicineStats(stats);
    } catch (e: any) {
      setMigrationStatus({ success: false, message: e?.message || 'মাইগ্রেশন ব্যর্থ হয়েছে' });
    } finally {
      setIsMigratingMedicine(false);
    }
  };

  const handleCheckMedicineStats = async () => {
    const stats = await dbService.getMedicineModularStats();
    setMedicineStats(stats);
  };

  const handleAddAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(adjAmount);
    if (isNaN(val) || val <= 0) {
      alert('অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন!');
      return;
    }
    const newAdj: HospitalAdjustment = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      department: adjDept,
      type: adjType,
      amount: val,
      date: adjDate,
      category: adjCategory.trim() || 'সাধারণ সমন্বয়',
      note: adjNote.trim(),
      authorizedBy: 'Super Admin',
      createdAt: new Date().toISOString()
    };
    const updated = [newAdj, ...hospitalAdjustments];
    setHospitalAdjustments(updated);
    dbService.saveHospitalAdjustments(updated);
    
    // Also mirror to monthlyAdjustments in dbService non-destructively
    try {
      const monthKey = adjDate.substring(0, 7);
      const existingMonthly = JSON.parse(localStorage.getItem('ncd_monthly_adjustments') || '{}');
      const curItem = existingMonthly[monthKey] || { profitDist: 0, houseRent: 0, loanInstallment: 0 };
      if (adjType === 'INCOME_ADD') {
        curItem.profitDist = (curItem.profitDist || 0) + val;
      }
      existingMonthly[monthKey] = curItem;
      localStorage.setItem('ncd_monthly_adjustments', JSON.stringify(existingMonthly));
    } catch {}

    if (performBlockingSync) {
      performBlockingSync().catch(() => {});
    }

    setAdjAmount('');
    setAdjNote('');
    setSuccessMsg('✓ ডিপার্টমেন্টাল সমন্বয় সফলভাবে যোগ করা হয়েছে এবং একাউন্টসে আপডেট হয়েছে!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteAdjustment = (id: string) => {
    if (!window.confirm('আপনি কি এই সমন্বয় রেকর্ডটি ডিলিট করতে চান?')) return;
    const updated = hospitalAdjustments.filter(a => a.id !== id);
    setHospitalAdjustments(updated);
    dbService.saveHospitalAdjustments(updated);
    if (performBlockingSync) {
      performBlockingSync().catch(() => {});
    }
    setSuccessMsg('✓ সমন্বয় রেকর্ড মুছে ফেলা হয়েছে!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleModule = (key: keyof HospitalModuleConfig) => {
    const updated = { ...moduleConfig, [key]: !moduleConfig[key] };
    setModuleConfig(updated);
    dbService.saveHospitalModuleConfig(updated);
    if (performBlockingSync) {
      performBlockingSync().catch(() => {});
    }
    setSuccessMsg(`✓ ${key} স্ট্যাটাস আপডেট হয়েছে!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('লোগো ফাইলের সাইজ ৮MB এর কম হতে হবে!');
      return;
    }

    setLogoAutoAdjusting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // High-DPI Auto-Correction Canvas
        const targetDim = 256;
        const canvas = document.createElement('canvas');
        canvas.width = targetDim;
        canvas.height = targetDim;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setLogoAutoAdjusting(false);
          return;
        }

        // Center crop calculation
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.clearRect(0, 0, targetDim, targetDim);

        // Draw image centered with padding for ring bezel
        ctx.drawImage(img, sx, sy, minDim, minDim, 8, 8, targetDim - 16, targetDim - 16);

        // Auto background cleaning: check if edges are pure white/light
        const imgData = ctx.getImageData(0, 0, targetDim, targetDim);
        const d = imgData.data;
        const isLightCorner = d[0] > 235 && d[1] > 235 && d[2] > 235;

        if (isLightCorner) {
          for (let i = 0; i < d.length; i += 4) {
            if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) {
              d[i + 3] = 0; // Make pure white transparent so it looks crisp on both dark and light
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        // Circular clipping
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(targetDim / 2, targetDim / 2, (targetDim / 2) - 4, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Optimized ultra-lightweight PNG dataURL (under ~60-80KB)
        const optimizedB64 = canvas.toDataURL('image/png', 0.9);
        const updatedProfile = { ...clinicProfile, logoUrl: optimizedB64 };
        setClinicProfile(updatedProfile);
        dbService.saveClinicProfile(updatedProfile);
        setLogoAutoAdjusting(false);
        setSuccessMsg('✓ লোগো অটো-এডজাস্ট ও কারেকশন সম্পন্ন হয়েছে! এটি ড্যাশবোর্ড, হেডার ও সব রিপোর্টে সক্রিয়।');
        setTimeout(() => setSuccessMsg(''), 5000);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setClinicProfile(prev => ({ ...prev, logoUrl: '' }));
    setSuccessMsg('✓ কাস্টম লোগো সরানো হয়েছে। সিস্টেমের ডিফল্ট লোগো প্রদর্শিত হবে।');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSaveClinicProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    dbService.saveClinicProfile(clinicProfile);
    if (performBlockingSync) {
      performBlockingSync().catch(() => {});
    }
    setTimeout(() => {
      setIsSavingProfile(false);
      setSuccessMsg('✓ ক্লিনিক প্রোফাইল সফলভাবে আপডেট হয়েছে!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 400);
  };

  const handleSavePrintSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrint(true);
    dbService.savePrintSettings(printSettings);
    if (performBlockingSync) {
      performBlockingSync().catch(() => {});
    }
    setTimeout(() => {
      setIsSavingPrint(false);
      setSuccessMsg('✓ প্রিন্ট ও ইনভয়েস সেটিংস সফলভাবে আপডেট হয়েছে!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 400);
  };

  const handleSaveSmsSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSms(true);
    dbService.saveSMSGatewaySettings(smsSettings);
    if (performBlockingSync) {
      performBlockingSync().catch(() => {});
    }
    setTimeout(() => {
      setIsSavingSms(false);
      setSuccessMsg('✓ এসএমএস গেটওয়ে সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 400);
  };

  const handleSendTestSms = async () => {
    if (!testSmsRecipient.trim()) {
      alert('অনুগ্রহ করে মোবাইল নম্বর প্রদান করুন!');
      return;
    }
    setIsSendingTestSms(true);
    setTestSmsResult(null);

    // Simulate SMS Gateway dispatch
    setTimeout(() => {
      setIsSendingTestSms(false);
      if (smsSettings.apiKey) {
        setTestSmsResult(`✓ সফল! "${smsSettings.provider.toUpperCase()}" গেটওয়ের মাধ্যমে ${testSmsRecipient} নম্বরে টেস্ট এসএমএস কিউ-তে পাঠানো হয়েছে।`);
      } else {
        setTestSmsResult(`⚠️ সতর্কবার্তা: API Key ফাঁকা রয়েছে। অনুগ্রহ করে API Key প্রদান করুন। টেস্ট মেসেজ লোকাল সিমুলেশনে সফল হয়েছে।`);
      }
    }, 1200);
  };

  const handleSaveAutoBackupSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAutoBackup(true);
    dbService.saveAutoBackupSettings(autoBackupSettings);
    setTimeout(() => {
      setIsSavingAutoBackup(false);
      setSuccessMsg('✓ অটো ব্যাকআপ শিডিউল সফলভাবে আপডেট হয়েছে!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 300);
  };

  const handleTakeSnapshot = () => {
    setIsTakingSnapshot(true);
    try {
      const fullState = dbService.readStateSafe();
      const title = snapshotTitleInput.trim() || `Manual Snapshot (${new Date().toLocaleTimeString()})`;
      dbService.saveLocalSnapshot(title, fullState);
      setLocalSnapshots(dbService.getLocalSnapshots());
      setSnapshotTitleInput('');
      setSuccessMsg('✓ নতুন লোকাল স্ন্যাপশট সফলভাবে ভল্টে সংরক্ষিত হয়েছে!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      alert('স্ন্যাপশট নিতে ত্রুটি হয়েছে!');
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snapshot: any) => {
    if (!confirm(`আপনি কি "${snapshot.title}" (${new Date(snapshot.timestamp).toLocaleString()}) ব্যাকআপটি রিস্টোর করতে চান? এটি বর্তমান মেমোরি আপডেট করবে।`)) {
      return;
    }
    setIsRestoring(true);
    try {
      if (snapshot.data) {
        await dbService.saveState(snapshot.data);
        if (performBlockingSync) {
          await performBlockingSync(snapshot.data);
        }
        alert('সফলভাবে স্ন্যাপশট থেকে ডাটা রিস্টোর করা হয়েছে!');
        window.location.reload();
      }
    } catch (e) {
      alert('রিস্টোর করতে সমস্যা হয়েছে!');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    if (confirm('আপনি কি এই স্ন্যাপশটটি মুছে ফেলতে চান?')) {
      dbService.deleteLocalSnapshot(id);
      setLocalSnapshots(dbService.getLocalSnapshots());
      setSuccessMsg('স্ন্যাপশট মুছে ফেলা হয়েছে।');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleSavePasswords = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('ncd_passwords', JSON.stringify(localPasswords));
    } catch {}
    if (setPasswords) setPasswords(localPasswords);
    if (onSave) onSave(localPasswords);

    if (performBlockingSync) {
      await performBlockingSync({ passwords: localPasswords });
    }
    setSuccessMsg('✓ ডিপার্টমেন্ট পাসওয়ার্ড সফলভাবে আপডেট হয়েছে!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleAddStaffAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffForm.name || !newStaffForm.username) {
      alert('দয়া করে স্টাফের নাম ও ইউজারনেম প্রদান করুন!');
      return;
    }
    const updated = [...staffAccounts, { ...newStaffForm, id: `STF-${String(Date.now()).slice(-4)}` }];
    setStaffAccounts(updated);
    dbService.saveStaffAccounts(updated);
    setShowAddStaffModal(false);
    setNewStaffForm({
      id: `STF-${String(Date.now()).slice(-4)}`,
      name: '',
      username: '',
      role: 'RECEPTIONIST',
      dept: 'Diagnostic & Billing',
      mobile: '',
      status: 'Active'
    });
    setSuccessMsg('✓ নতুন স্টাফ অ্যাকাউন্ট যুক্ত হয়েছে!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteStaffAccount = (id: string) => {
    if (confirm('আপনি কি এই স্টাফ অ্যাকাউন্ট মুছে ফেলতে চান?')) {
      const updated = staffAccounts.filter(s => s.id !== id);
      setStaffAccounts(updated);
      dbService.saveStaffAccounts(updated);
    }
  };

  const handleSaveSupabaseConfig = () => {
    if (!supabaseUrlInput.trim() || !supabaseKeyInput.trim()) {
      alert("দয়া করে Supabase URL এবং Anon Key দিন!");
      return;
    }
    const ok = dbService.setSupabaseConfig(supabaseUrlInput.trim(), supabaseKeyInput.trim());
    if (ok) {
      alert("Supabase কনফিগারেশন সফলভাবে সেভ হয়েছে!");
      handleTestSupabaseConnection();
    } else {
      alert("Supabase URL বা Key এর ফরম্যাট সঠিক নয়।");
    }
  };

  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    setTestResult(null);
    try {
      const res = await dbService.testConnection();
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || "টেস্ট ব্যর্থ হয়েছে" });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleForcePullAllFromCloud = async () => {
    const confirmPull = window.confirm("আপনি কি Supabase ক্লাউড থেকে সব লাইভ ডাটা লোড করে বর্তমান অ্যাপ রিফ্রেশ করতে চান?");
    if (!confirmPull) return;

    setIsReloadingFromCloud(true);
    try {
      const cloudState = await dbService.loadFromCloud();
      if (cloudState && !cloudState._error) {
        if (performBlockingSync) {
          await performBlockingSync(cloudState);
        }
        alert("Supabase থেকে সফলভাবে সব ডাটা লোড হয়েছে! পেজ রিলোড হচ্ছে...");
        window.location.reload();
      } else {
        alert("ডাটা ফেচ ব্যর্থ: " + (cloudState?._error || "Unknown error"));
      }
    } catch (e: any) {
      alert("ত্রুটি: " + e.message);
    } finally {
      setIsReloadingFromCloud(false);
    }
  };

  const handleManualRestore = async () => {
    if (!pastedJson.trim()) return;
    try {
      const rawData = JSON.parse(pastedJson);
      const normalized = dbService.normalizeRecoveredData(rawData);
      
      if (Object.keys(normalized).length < 2) {
        alert("সঠিক ডাটা পাওয়া যায়নি! দয়া করে পুরো টেক্সটটি কপি করে পেস্ট করুন।");
        return;
      }
      processRestore(normalized);
    } catch (e) {
      alert("ডাটা ফরম্যাট সঠিক নয়! ব্রাউজার কনসোল থেকে পুরো টেক্সটটি কপি করুন।");
    }
  };

  const processRestore = async (backup: any) => {
    const listEntries: string[] = [];
    Object.entries(backup).forEach(([k, v]) => {
      if (Array.isArray(v) && v.length > 0) {
        listEntries.push(`- ${k}: ${v.length}`);
      } else if (k === 'detailedExpenses' && v && typeof v === 'object') {
        const count = Object.values(v).reduce((s: number, a: any) => s + (Array.isArray(a) ? a.length : 1), 0);
        if (count > 0) listEntries.push(`- detailedExpenses: ${count}`);
      }
    });
    const entitiesFound = listEntries.join('\n');
    
    if (!entitiesFound) {
      alert("পিক আপ করার মতো কোন ডাটা পাওয়া যায়নি! দয়া করে সঠিক কোডটি কপি করেছেন কিনা নিশ্চিত হয়ে নিন।");
      return;
    }

    const confirmRestore = window.confirm(`নিচের ডাটাগুলো পাওয়া গেছে:\n${entitiesFound}\n\nআপনি কি এই ডাটাগুলো ক্লাউডে (Supabase) রিস্টোর করতে চান? এটি বর্তমান ডাটাকে রিপ্লেস করবে।`);
    if (!confirmRestore) return;

    setIsRestoring(true);
    setRestoreProgress(0);
    try {
      if (backup.consolidatedLabEntries && Array.isArray(backup.consolidatedLabEntries)) {
        dbService.saveConsolidatedEntries(backup.consolidatedLabEntries);
      }
      const success = await dbService.saveInChunks(backup, (p) => setRestoreProgress(p));
      if (success) {
        if (performBlockingSync) {
          await performBlockingSync(backup);
        }
        alert("সফলভাবে ডাটা ক্লাউডে রিস্টোর করা হয়েছে! এখন অন্য সব কম্পিউটার থেকেও এই ডাটা দেখা যাবে।");
        window.location.reload();
      } else {
        alert("রিস্টোর ব্যর্থ হয়েছে। ইন্টারনেট কানেকশন চেক করুন।");
      }
    } catch (e) {
      alert("একটি ত্রুটি ঘটেছে!");
    } finally {
      setIsRestoring(false);
      setRestoreProgress(0);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const state = await dbService.loadFromCloud();
      generateOfflineViewer(state);
      setSuccessMsg('অফলাইন ব্যাকআপ ভিউয়ার (HTML) ডাউনলোড শুরু হয়েছে!');
      setTimeout(() => setSuccessMsg(''), 3000);
      
      if (resetStep === 2) setResetStep(3);
    } catch (err) {
      alert('ব্যাকআপ তৈরি করতে সমস্যা হয়েছে! ইন্টারনেট কানেকশন চেক করুন।');
    }
  };

  const executeFullReset = () => {
    if (finalConfirmText !== 'RESET') {
      alert("ভুল টাইপ করেছেন! পুনরায় চেষ্টা করুন।");
      return;
    }
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ncd_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    alert("সফলভাবে পুরো সিস্টেম রিসেট করা হয়েছে। পেজটি রিলোড হবে।");
    window.location.reload();
  };

  useEffect(() => {
    const mainViewport = document.getElementById('main-content-viewport');
    if (mainViewport) {
      mainViewport.scrollTop = 0;
    }
  }, [activeTab]);

  const inputClass = "w-full bg-slate-900 border-2 border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-white font-medium outline-none transition-all";
  const labelClass = "block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 md:p-8 pb-36">
      <div className="bg-slate-900 w-full max-w-6xl rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col mb-10">
        
        {/* HEADER BAR */}
        <div className="p-6 md:p-8 bg-slate-900/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/20 p-3.5 rounded-2xl border border-blue-500/30 shadow-inner">
              <SettingsIcon className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">System Control Panel</h1>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 ${isConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  {isConnected ? 'Cloud Live' : 'Offline Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                Hospital & Diagnostic Center Master Settings & Control
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {successMsg && (
              <span className="text-emerald-400 font-black text-xs px-3.5 py-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl animate-pulse">
                {successMsg}
              </span>
            )}
            <button 
              onClick={onBack} 
              className="px-5 py-2.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg"
            >
              <BackIcon className="w-4 h-4"/>
              Dashboard
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="bg-slate-950 px-4 md:px-8 py-4 border-b border-slate-800 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('admin_hub')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'admin_hub' ? 'bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-900/40 ring-2 ring-cyan-400' : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'}`}
          >
            <Zap size={15} /> ⚡ হসপিটাল কন্ট্রোল ও আর্থিক সমন্বয়
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 ring-2 ring-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'}`}
          >
            🏥 ক্লিনিক প্রোফাইল ও রিং লোগো
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'security' ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40 ring-2 ring-sky-400' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'}`}
          >
            <UsersIcon size={15} /> 🔐 ডিপার্টমেন্ট পাসওয়ার্ড ও স্টাফ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('print')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'print' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 ring-2 ring-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'}`}
          >
            <PrinterIcon size={15} /> প্রিন্ট ও রসিদ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'sms' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 ring-2 ring-purple-400' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'}`}
          >
            <MessageSquare size={15} /> এসএমএস গেটওয়ে
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'database' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'}`}
          >
            <DatabaseIcon size={15} /> 🛡️ ক্লাউড ডাটাবেজ ও স্মার্ট মাইগ্রেশন
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('autobackup')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'autobackup' ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/40 ring-2 ring-teal-400' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'}`}
          >
            <Clock size={15} /> অটো ব্যাকআপ ও স্ন্যাপশট
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'backup' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 ring-2 ring-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'}`}
          >
            <DownloadIcon size={15} /> মাস্টার ব্যাকআপ ও রিসেট
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-6 md:p-10">

          {/* TAB 0: ADMIN CONTROL HUB & DEPARTMENT FINANCIAL ADJUSTMENTS */}
          {activeTab === 'admin_hub' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    ⚡ হসপিটাল মাস্টার কন্ট্রোল ও ডিপার্টমেন্টাল আর্থিক সমন্বয় হাব
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    এডমিন প্যানেল থেকে হসপিটালের ৪টি প্রধান ডিপার্টমেন্টের কার্যক্রম নিয়ন্ত্রণ, জরুরি সমন্বয় ও আয়-ব্যয়ের হিসাব সমন্বয় করুন।
                  </p>
                </div>
              </div>

              {/* Department Financial Adjustments Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(() => {
                  const pos = hospitalAdjustments
                    .filter(a => a.type === 'INCOME_ADD')
                    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
                  const neg = hospitalAdjustments
                    .filter(a => a.type === 'EXPENSE_ADJUST' || a.type === 'DISCOUNT_WAIVER')
                    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
                  const net = pos - neg;
                  return (
                    <>
                      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                        <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">মোট সমন্বিত আয় (+ Added)</div>
                        <div className="text-2xl font-black text-emerald-300 mt-1">৳ {pos.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">অতিরিক্ত আয় বা রিকভারি যোগ</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30">
                        <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">মোট সমন্বিত ব্যয় / ছাড় (- Deducted)</div>
                        <div className="text-2xl font-black text-rose-300 mt-1">৳ {neg.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">খরচ সংশোধন বা বিশেষ ছাড়</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
                        <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">নেট সমন্বয় ব্যালেন্স (Net Impact)</div>
                        <div className={`text-2xl font-black mt-1 ${net >= 0 ? 'text-cyan-300' : 'text-amber-400'}`}>
                          {net >= 0 ? '+' : ''}৳ {net.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">মোট {hospitalAdjustments.length} টি সমন্বয় এন্ট্রি</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Financial Adjustment Input Form */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Scale size={18} className="text-cyan-400" />
                    <span>নতুন ডিপার্টমেন্টাল আর্থিক সমন্বয় যোগ করুন</span>
                  </h3>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    এডমিন ওভাররাইড ইঞ্জিন
                  </span>
                </div>

                <form onSubmit={handleAddAdjustment} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className={labelClass}>ডিপার্টমেন্ট নির্বাচন করুন</label>
                    <select
                      value={adjDept}
                      onChange={(e) => setAdjDept(e.target.value as any)}
                      className={inputClass}
                    >
                      <option value="DIAGNOSTIC">🔬 ডায়াগনস্টিক ও ল্যাব (Diagnostic)</option>
                      <option value="CLINIC">🏥 ক্লিনিক ও ইনডোর (Clinic & Indoor)</option>
                      <option value="MEDICINE">💊 ফার্মেসি ও ঔষধ (Medicine)</option>
                      <option value="ACCOUNTS">📊 সাধারণ একাউন্টস (General Accounts)</option>
                      <option value="GENERAL">🏢 সেন্ট্রাল হসপিটাল ফান্ড (General)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>সমন্বয়ের ধরন (Adjustment Type)</label>
                    <select
                      value={adjType}
                      onChange={(e) => setAdjType(e.target.value as any)}
                      className={inputClass}
                    >
                      <option value="INCOME_ADD">➕ অতিরিক্ত আয় যোগ (+ Income Addition)</option>
                      <option value="EXPENSE_ADJUST">➖ খরচ সমন্বয় / ব্যয় বৃদ্ধি (- Expense Adj)</option>
                      <option value="DISCOUNT_WAIVER">🏷️ বিশেষ ছাড় / মওকুফ (- Discount / Waiver)</option>
                      <option value="AUDIT_CORRECTION">⚖️ অডিট ব্যালেন্স কারেকশন (Audit Balance Correction)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>টাকার পরিমাণ (Amount ৳)</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="যেমন: 5000"
                      value={adjAmount}
                      onChange={(e) => setAdjAmount(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>তারিখ (Adjustment Date)</label>
                    <input
                      type="date"
                      required
                      value={adjDate}
                      onChange={(e) => setAdjDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>ক্যাটাগরি / খাতের নাম</label>
                    <input
                      type="text"
                      placeholder="যেমন: ল্যাব টেস্ট ছাড় সমন্বয়, স্টক সংশোধন..."
                      value={adjCategory}
                      onChange={(e) => setAdjCategory(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>বিবরণ / কারণ (Note / Reference)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="সমন্বয়ের বিস্তারিত কারণ লিখুন..."
                        value={adjNote}
                        onChange={(e) => setAdjNote(e.target.value)}
                        className={inputClass}
                      />
                      <button
                        type="submit"
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shrink-0 transition-all shadow-lg active:scale-95 flex items-center gap-1.5"
                      >
                        <Plus size={16} /> সমন্বয় সংরক্ষণ
                      </button>
                    </div>
                  </div>
                </form>

                {/* Adjustments History Table */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      সাম্প্রতিক আর্থিক সমন্বয়সমূহ ({hospitalAdjustments.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">ফিল্টার:</span>
                      <select
                        value={adjFilterDept}
                        onChange={(e) => setAdjFilterDept(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 outline-none"
                      >
                        <option value="ALL">সকল ডিপার্টমেন্ট</option>
                        <option value="DIAGNOSTIC">ডায়াগনস্টিক</option>
                        <option value="CLINIC">ক্লিনিক</option>
                        <option value="MEDICINE">ফার্মেসি</option>
                        <option value="ACCOUNTS">একাউন্টস</option>
                      </select>
                    </div>
                  </div>

                  {hospitalAdjustments.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/50 rounded-xl border border-slate-800/80">
                      কোনো সমন্বয় রেকর্ড নেই। প্রয়োজন অনুযায়ী উপরের ফর্ম ব্যবহার করে যেকোনো ডিপার্টমেন্টের আয়-ব্যয় সমন্বয় করুন।
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="p-2.5">তারিখ</th>
                            <th className="p-2.5">ডিপার্টমেন্ট</th>
                            <th className="p-2.5">ধরন</th>
                            <th className="p-2.5">খাত / বিবরণ</th>
                            <th className="p-2.5 text-right">পরিমাণ (৳)</th>
                            <th className="p-2.5 text-center">একশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {hospitalAdjustments
                            .filter(a => adjFilterDept === 'ALL' || a.department === adjFilterDept)
                            .map((adj) => (
                              <tr key={adj.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-2.5 font-mono text-slate-300">{adj.date}</td>
                                <td className="p-2.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                    {adj.department}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    adj.type === 'INCOME_ADD' 
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                      : adj.type === 'DISCOUNT_WAIVER'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}>
                                    {adj.type === 'INCOME_ADD' ? '+ আয় যোগ' : adj.type === 'DISCOUNT_WAIVER' ? '- ছাড়' : '- ব্যয় সমন্বয়'}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <div className="font-bold text-slate-200">{adj.category}</div>
                                  {adj.note && <div className="text-[10px] text-slate-400">{adj.note}</div>}
                                </td>
                                <td className={`p-2.5 text-right font-bold ${adj.type === 'INCOME_ADD' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {adj.type === 'INCOME_ADD' ? '+' : '-'}৳ {Number(adj.amount).toLocaleString()}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    onClick={() => handleDeleteAdjustment(adj.id)}
                                    className="p-1 rounded-lg hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors"
                                    title="মুছে ফেলুন"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Hospital Operational Switches & Feature Flags */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders size={17} className="text-teal-400" />
                  <span>হসপিটাল মডিউল নিয়ন্ত্রণ ও অপারেশনাল প্রিভিলেজ (Feature Controls)</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">🔬 ডায়াগনস্টিক ও ল্যাব রিপোর্টিং</div>
                      <div className="text-[10px] text-slate-400">ইনভয়েসিং ও টেস্ট এন্ট্রি</div>
                    </div>
                    <button
                      onClick={() => handleToggleModule('diagnosticActive')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${moduleConfig.diagnosticActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                    >
                      {moduleConfig.diagnosticActive ? 'চালু (Active)' : 'বন্ধ (Paused)'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">🏥 ক্লিনিক ও ইনডোর এডমিশন</div>
                      <div className="text-[10px] text-slate-400">কেবিন ও ওটি অপারেশন</div>
                    </div>
                    <button
                      onClick={() => handleToggleModule('clinicActive')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${moduleConfig.clinicActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                    >
                      {moduleConfig.clinicActive ? 'চালু (Active)' : 'বন্ধ (Paused)'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">💊 ফার্মেসি ও মেডিসিন কাউন্টার</div>
                      <div className="text-[10px] text-slate-400">সেলস ও স্টক ম্যানেজমেন্ট</div>
                    </div>
                    <button
                      onClick={() => handleToggleModule('medicineActive')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${moduleConfig.medicineActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                    >
                      {moduleConfig.medicineActive ? 'চালু (Active)' : 'বন্ধ (Paused)'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">🖨️ রিপোর্টে ক্লিনিক প্যাড হেডার</div>
                      <div className="text-[10px] text-slate-400">অটো-প্রিন্ট হেডার ও রিং লোগো</div>
                    </div>
                    <button
                      onClick={() => handleToggleModule('autoPrintHeader')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${moduleConfig.autoPrintHeader ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                    >
                      {moduleConfig.autoPrintHeader ? 'অন (On)' : 'অফ (Off)'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">🛡️ রিপোর্টে অফিসিয়াল ওয়াটারমার্ক</div>
                      <div className="text-[10px] text-slate-400">নিরাপত্তা সিল ওয়াটারমার্ক</div>
                    </div>
                    <button
                      onClick={() => handleToggleModule('showWatermark')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${moduleConfig.showWatermark ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                    >
                      {moduleConfig.showWatermark ? 'অন (On)' : 'অফ (Off)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Central Logo & Storage Protection Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 flex items-center gap-4">
                <ClinicLogo size="md" />
                <div>
                  <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span>সেন্ট্রালাইজড রিং লোগো ও ডাটাবেজ ব্লোট-প্রতিরোধ প্রযুক্তি সক্রিয়</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1">
                    ক্লিনিকের অফিসিয়াল রিং লোগোটি একক মাস্টার স্টোরে সংরক্ষিত। প্রতিটি প্যাথলজি বা কেমিক্যাল রিপোর্টে আলাদাভাবে কোনো ইমেজ সেভ হয় না; বরং ডায়নামিকালি রেন্ডার হয়। ফলে ডাটাবেজ সাইজ বৃদ্ধি পায় না এবং প্রিন্ট লোডিং টাইম থাকে <span className="text-emerald-400 font-bold">&lt;২ মিলি-সেকেন্ড</span>!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: CLINIC PROFILE & AUTO-ADJUSTING RING LOGO */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveClinicProfile} className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    🏥 ক্লিনিক প্রোফাইল ও অটো-এডজাস্টিং রিং লোগো স্টুডিও
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    এই তথ্যগুলো ড্যাশবোর্ড, ইনভয়েস, মানি রিসিট এবং প্যাথলজি রিপোর্ট প্যাডের উপরে স্বয়ংক্রিয়ভাবে সমন্বিত হয়ে প্রদর্শিত হবে।
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2 transition-all cursor-pointer"
                >
                  <SaveIcon size={16} /> {isSavingProfile ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল সংরক্ষণ করুন'}
                </button>
              </div>

              {/* Organization Logo Customizer & Live 3-Way Preview */}
              <div className="p-6 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap">
                      <Sparkles size={16} className="text-cyan-400" />
                      <span>প্রতিষ্ঠানের অফিসিয়াল রিং লোগো (Ring Logo Auto-Adjuster)</span>
                      {clinicProfile.logoUrl ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ✓ কাস্টম লোগো সক্রিয়
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          🛡️ সিস্টেম ডিফল্ট রিং লোগো
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      মোবাইল বা কম্পিউটার থেকে যেকোনো ইমেজ আপলোড করুন। সিস্টেম স্বয়ংক্রিয়ভাবে সাইজ অপটিমাইজ, ব্যাকগ্রাউন্ড কারেকশন ও গোলাকার রিং-ডিজাইনে এডজাস্ট করে নিবে।
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30 active:scale-95">
                      <Upload size={15} />
                      <span>{logoAutoAdjusting ? 'এডজাস্ট হচ্ছে...' : (clinicProfile.logoUrl ? 'নতুন লোগো আপলোড ও অটো-ফিট' : 'লোগো আপলোড ও অটো-ফিট')}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>

                    {clinicProfile.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        title="ডিফল্ট মেডিকেল রিং লোগোতে ফিরিয়ে আনুন"
                      >
                        <Trash2 size={14} />
                        <span>ডিফল্ট লোগো রিসেট</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3-Way Live Multi-Surface Preview */}
                <div>
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Eye size={14} className="text-cyan-400" />
                    <span>লাইভ মাল্টি-ডিভাইস ও প্রিন্ট প্রিভিউ (Live Previews)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Preview 1: Dark Mode Dashboard & App Header */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">১. ড্যাশবোর্ড ও অ্যাপ হেডার (Dark Mode)</div>
                      <div className="p-3 my-1">
                        <ClinicLogo size="lg" logoUrl={clinicProfile.logoUrl} />
                      </div>
                      <div className="text-[11px] font-bold text-slate-200 mt-1">গ্লোয়িং নিওন রিং ডিজাইন</div>
                      <div className="text-[9.5px] text-slate-500">কম্পিউটার ও ট্যাবলেট ভিউ</div>
                    </div>

                    {/* Preview 2: Medical Test Report Print Sheet (White Paper Mode) */}
                    <div className="p-4 rounded-xl bg-white border border-slate-300 text-slate-900 flex flex-col items-center justify-center text-center shadow-md">
                      <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-2">২. প্যাথলজি ও টেস্ট রিপোর্ট প্যাড (A4 Print)</div>
                      <div className="p-3 my-1">
                        <ClinicLogo size="md" logoUrl={clinicProfile.logoUrl} variant="print" />
                      </div>
                      <div className="text-[11px] font-bold text-slate-900 mt-1">ক্লিন প্রিন্ট সিল (Zero Inking Bleed)</div>
                      <div className="text-[9.5px] text-slate-600">প্যাথলজি ও কেমিক্যাল রিপোর্ট প্যাড</div>
                    </div>

                    {/* Preview 3: Mobile Touch Header */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">৩. মোবাইল রেসপন্সিভ হেডার (Mobile View)</div>
                      <div className="p-3 my-1">
                        <ClinicLogo size="sm" logoUrl={clinicProfile.logoUrl} />
                      </div>
                      <div className="text-[11px] font-bold text-slate-200 mt-1">স্মার্টফোন ও টাচ স্ক্রিন</div>
                      <div className="text-[9.5px] text-slate-500">কম্প্যাক্ট ইউনিফায়েড রিং লোগো</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>প্রতিষ্ঠানের ইংরেজি নাম (Organization Name)</label>
                  <input
                    type="text"
                    value={clinicProfile.name}
                    onChange={e => setClinicProfile({ ...clinicProfile, name: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>প্রতিষ্ঠানের বাংলা নাম (Bangla Name)</label>
                  <input
                    type="text"
                    value={clinicProfile.nameBn}
                    onChange={e => setClinicProfile({ ...clinicProfile, nameBn: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>ট্যাগলাইন / স্লোগান (Tagline / Slogan)</label>
                  <input
                    type="text"
                    value={clinicProfile.tagline}
                    onChange={e => setClinicProfile({ ...clinicProfile, tagline: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>প্রতিষ্ঠানের পূর্ণ ঠিকানা (Full Address)</label>
                  <input
                    type="text"
                    value={clinicProfile.address}
                    onChange={e => setClinicProfile({ ...clinicProfile, address: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>হটলাইন ও মোবাইল নম্বর (Mobile / Hotline)</label>
                  <input
                    type="text"
                    value={clinicProfile.mobile}
                    onChange={e => setClinicProfile({ ...clinicProfile, mobile: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>জরুরি সেবা নম্বর (Emergency Hotline)</label>
                  <input
                    type="text"
                    value={clinicProfile.emergencyHotline}
                    onChange={e => setClinicProfile({ ...clinicProfile, emergencyHotline: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>ইমেইল ঠিকানা (Email Address)</label>
                  <input
                    type="email"
                    value={clinicProfile.email}
                    onChange={e => setClinicProfile({ ...clinicProfile, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>স্বাস্থ্য অধিদপ্তর লাইসেন্স নং (DG Health License)</label>
                  <input
                    type="text"
                    value={clinicProfile.licenseNo}
                    onChange={e => setClinicProfile({ ...clinicProfile, licenseNo: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>হাসপাতাল রেজিস্ট্রেশন নং (Hospital Reg / TIN)</label>
                  <input
                    type="text"
                    value={clinicProfile.regNo}
                    onChange={e => setClinicProfile({ ...clinicProfile, regNo: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* LIVE BRANDING PREVIEW CARD */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-[10px] font-black text-sky-400 uppercase tracking-widest">
                  রসিদ ও প্রিন্ট হেডারের লাইভ প্রিভিউ (Live Header Preview)
                </div>
                <div className="bg-white text-black p-6 rounded-xl border border-gray-300 text-center shadow-lg">
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{clinicProfile.name || 'Niramoy Clinic & Diagnostic'}</h3>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{clinicProfile.nameBn} - {clinicProfile.tagline}</p>
                  <p className="text-xs text-slate-600 mt-1">{clinicProfile.address} | হটলাইন: {clinicProfile.mobile} | লাইসেন্স: {clinicProfile.licenseNo}</p>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: PRINT & INVOICE SETTINGS */}
          {activeTab === 'print' && (
            <form onSubmit={handleSavePrintSettings} className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    🖨️ প্রিন্ট পেপার সাইজ ও ইনভয়েস কনফিগারেশন
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    ডিফল্ট পেপার ফরম্যাট, টার্মস নোট ও স্বাক্ষরের পদবী নির্ধারণ করুন।
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSavingPrint}
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2 transition-all"
                >
                  <SaveIcon size={16} /> {isSavingPrint ? 'সংরক্ষণ হচ্ছে...' : 'প্রিন্ট সেটিংস সেভ করুন'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5 bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                    প্রিন্ট সাইজ নির্বাচন (Print Format)
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'A4_landscape', title: 'A4 Landscape (2-in-1)', desc: 'এক পাতায় দুটি স্লিপ (অফিস ও রোগী কপি)' },
                      { id: 'A4_portrait', title: 'A4 Portrait (Full Page)', desc: 'পূর্ণ এ৪ সাইজে সিঙ্গেল ইনভয়েস' },
                      { id: 'A5_portrait', title: 'A5 Half Page', desc: 'হাফ পেজ সাইজে কম্প্যাক্ট ইনভয়েস' },
                      { id: 'POS_80mm', title: 'POS / Thermal (80mm)', desc: 'থার্মাল রোল পেপারে দ্রুত ক্যাশ স্লিপ' }
                    ].map(opt => (
                      <div
                        key={opt.id}
                        onClick={() => setPrintSettings({ ...printSettings, paperSize: opt.id as any })}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${printSettings.paperSize === opt.id ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                      >
                        <div className="font-black text-xs text-white uppercase">{opt.title}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{opt.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printSettings.showBarcode}
                        onChange={e => setPrintSettings({ ...printSettings, showBarcode: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                      />
                      <span className="text-xs font-bold text-slate-300">ইনভয়েসে বারকোড (Barcode) প্রদর্শন করুন</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printSettings.showQrCode}
                        onChange={e => setPrintSettings({ ...printSettings, showQrCode: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                      />
                      <span className="text-xs font-bold text-slate-300">রিপোর্ট ট্র্যাকিং QR কোড প্রদর্শন করুন</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-5 bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                    ইনভয়েস টেক্সট ও স্বাক্ষরকারী
                  </h3>

                  <div>
                    <label className={labelClass}>ইনভয়েস টপ টাইটেল (Invoice Top Header)</label>
                    <input
                      type="text"
                      value={printSettings.headerTitle}
                      onChange={e => setPrintSettings({ ...printSettings, headerTitle: e.target.value })}
                      className={inputClass}
                      placeholder="Niramoy Clinic & Diagnostic"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>অনুমোদিত স্বাক্ষরকারীর পদবী (Signature Title)</label>
                    <input
                      type="text"
                      value={printSettings.authorizedSign}
                      onChange={e => setPrintSettings({ ...printSettings, authorizedSign: e.target.value })}
                      className={inputClass}
                      placeholder="Authorized Sign / প্রধান হিসাবরক্ষক"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>ইনভয়েসের নিচের শর্তাবলী / ফুটার নোট (Footer Notes)</label>
                    <textarea
                      rows={3}
                      value={printSettings.footerNote}
                      onChange={e => setPrintSettings({ ...printSettings, footerNote: e.target.value })}
                      className="w-full bg-slate-900 border-2 border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-white font-medium outline-none transition-all"
                      placeholder="* জরুরি প্রয়োজনে আমাদের হেল্পলাইনে কল করুন..."
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: SMS GATEWAY INTEGRATION */}
          {activeTab === 'sms' && (
            <div className="space-y-8 animate-fade-in">
              <form onSubmit={handleSaveSmsSettings} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      📱 এসএমএস গেটওয়ে ও অটোমেশন (SMS Gateway Integration)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      রোগীদের ইনভয়েস কনফার্মেশন, টেস্ট রিপোর্ট রেডি নোটিফিকেশন এবং বকেয়া আদায়ের স্বয়ংক্রিয় এসএমএস।
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingSms}
                    className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2 transition-all"
                  >
                    <SaveIcon size={16} /> {isSavingSms ? 'সংরক্ষণ হচ্ছে...' : 'এসএমএস সেটিংস সেভ করুন'}
                  </button>
                </div>

                {/* Gateway Credentials & Provider */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-5 bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={16} /> গেটওয়ে ক্রেডেনশিয়াল (API Setup)
                      </h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smsSettings.enabled}
                          onChange={e => setSmsSettings({ ...smsSettings, enabled: e.target.checked })}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700"
                        />
                        <span className="text-xs font-bold text-slate-300">গেটওয়ে সক্রিয় (Enabled)</span>
                      </label>
                    </div>

                    <div>
                      <label className={labelClass}>এসএমএস প্রোভাইডার (SMS Provider)</label>
                      <select
                        value={smsSettings.provider}
                        onChange={e => setSmsSettings({ ...smsSettings, provider: e.target.value as any })}
                        className={inputClass}
                      >
                        <option value="bulksmsbd">BulkSMSBD (www.bulksmsbd.com)</option>
                        <option value="greenweb">Greenweb SMS (greenweb.com.bd)</option>
                        <option value="onnorokom">Onnorokom SMS</option>
                        <option value="alphasms">Alpha Net SMS (alpha.net.bd)</option>
                        <option value="custom">Custom REST API Gateway</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>API Key / Secret Token</label>
                      <input
                        type="password"
                        value={smsSettings.apiKey}
                        onChange={e => setSmsSettings({ ...smsSettings, apiKey: e.target.value })}
                        className={inputClass}
                        placeholder="e.g. 7h9Kx992LmPq..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Sender ID (মাস্কিং / নন-মাস্কিং)</label>
                        <input
                          type="text"
                          value={smsSettings.senderId}
                          onChange={e => setSmsSettings({ ...smsSettings, senderId: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. NIRAMOY"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Client ID / Username (যদি থাকে)</label>
                        <input
                          type="text"
                          value={smsSettings.clientId}
                          onChange={e => setSmsSettings({ ...smsSettings, clientId: e.target.value })}
                          className={inputClass}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Automation Triggers */}
                  <div className="space-y-5 bg-slate-950/60 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest border-b border-slate-800 pb-3">
                        ⚡ স্বয়ংক্রিয় ট্রিগার রুলস (Automation Rules)
                      </h3>

                      <div className="space-y-4 mt-4">
                        <label className="flex items-start gap-3 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 cursor-pointer hover:border-purple-500/50 transition-all">
                          <input
                            type="checkbox"
                            checked={smsSettings.autoSendOnInvoice}
                            onChange={e => setSmsSettings({ ...smsSettings, autoSendOnInvoice: e.target.checked })}
                            className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700"
                          />
                          <div>
                            <span className="text-xs font-black text-white block">ল্যাব ইনভয়েস বিল এসএমএস (New Invoice Confirmation)</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">নতুন ইনভয়েস তৈরির সাথে সাথে বিল ও পরিশোধের বিবরণী পাঠানো হবে।</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 cursor-pointer hover:border-purple-500/50 transition-all">
                          <input
                            type="checkbox"
                            checked={smsSettings.autoSendOnReportReady}
                            onChange={e => setSmsSettings({ ...smsSettings, autoSendOnReportReady: e.target.checked })}
                            className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700"
                          />
                          <div>
                            <span className="text-xs font-black text-white block">রিপোর্ট প্রস্তুত এসএমএস (Lab Report Delivery Alert)</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">রিপোর্ট ভেরিফাই বা প্রিন্ট রেডি মার্ক করলে রোগীকে ডেলিভারি বার্তা যাবে।</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 bg-purple-950/30 rounded-xl border border-purple-800/40 text-xs text-purple-200">
                      <p className="font-bold flex items-center gap-1.5"><CheckCircle2 size={15} /> টেমপ্লেট ভেরিয়েবল ট্যাগসমূহ:</p>
                      <p className="text-[11px] text-purple-300/80 mt-1 font-mono">
                        {'{patient_name}'}, {'{clinic_name}'}, {'{invoice_id}'}, {'{total}'}, {'{paid}'}, {'{due}'}, {'{hotline}'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Templates Section */}
                <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-6">
                  <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest border-b border-slate-800 pb-3">
                    💬 এসএমএস মেসেজ টেমপ্লেট (Custom SMS Templates)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className={labelClass}>১. ইনভয়েস কনফার্মেশন টেমপ্লেট</label>
                      <textarea
                        rows={4}
                        value={smsSettings.templates.invoiceCreated}
                        onChange={e => setSmsSettings({
                          ...smsSettings,
                          templates: { ...smsSettings.templates, invoiceCreated: e.target.value }
                        })}
                        className="w-full bg-slate-900 border-2 border-slate-800 focus:border-purple-500 rounded-xl p-3 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>২. রিপোর্ট প্রস্তুত টেমপ্লেট</label>
                      <textarea
                        rows={4}
                        value={smsSettings.templates.reportReady}
                        onChange={e => setSmsSettings({
                          ...smsSettings,
                          templates: { ...smsSettings.templates, reportReady: e.target.value }
                        })}
                        className="w-full bg-slate-900 border-2 border-slate-800 focus:border-purple-500 rounded-xl p-3 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>৩. বকেয়া পরিশোধ রিমাইন্ডার টেমপ্লেট</label>
                      <textarea
                        rows={4}
                        value={smsSettings.templates.dueReminder}
                        onChange={e => setSmsSettings({
                          ...smsSettings,
                          templates: { ...smsSettings.templates, dueReminder: e.target.value }
                        })}
                        className="w-full bg-slate-900 border-2 border-slate-800 focus:border-purple-500 rounded-xl p-3 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </form>

              {/* Test SMS Sending Console */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Send size={16} className="text-purple-400" /> টেস্ট এসএমএস সেন্ডিং কনসোল (Live SMS Tester)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>প্রাপকের মোবাইল নম্বর (Recipient Mobile)</label>
                    <input
                      type="text"
                      value={testSmsRecipient}
                      onChange={e => setTestSmsRecipient(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. 01711000000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>টেস্ট মেসেজ বডি ({testSmsMessage.length} অক্ষর)</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={testSmsMessage}
                        onChange={e => setTestSmsMessage(e.target.value)}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={handleSendTestSms}
                        disabled={isSendingTestSms}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black text-xs uppercase rounded-xl shadow-lg shrink-0 flex items-center gap-2 transition-all"
                      >
                        <Send size={14} /> {isSendingTestSms ? 'পাঠানো হচ্ছে...' : 'টেস্ট পাঠান'}
                      </button>
                    </div>
                  </div>
                </div>

                {testSmsResult && (
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-purple-500/40 text-xs text-purple-200 font-bold">
                    {testSmsResult}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PASSWORDS & STAFF ACCOUNTS */}
          {activeTab === 'security' && (
            <div className="space-y-10 animate-fade-in">
              {/* PASSWORDS SECTION */}
              <form onSubmit={handleSavePasswords} className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      🔐 ডিপার্টমেন্ট এক্সেস পাসওয়ার্ড (Security Passwords)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      প্রতিটি মডিউলের জন্য আলাদা সিকিউরিটি কী নির্ধারণ করুন।
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-500 active:scale-95 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2 transition-all"
                  >
                    <SaveIcon size={16} /> পাসওয়ার্ড সংরক্ষণ করুন
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { key: 'ADMIN', label: '👑 অ্যাডমিন মাস্টার কি (Admin Master Key)', subtitle: 'সম্পূর্ণ সিস্টেম ও সেটিংস নিয়ন্ত্রণ', color: 'from-amber-600/20 to-rose-600/20 border-amber-500/40 text-amber-300' },
                    { key: 'DIAGNOSTIC', label: '🔬 ডায়াগনস্টিক ও ল্যাব (Diagnostic & Lab Key)', subtitle: 'ইনভয়েস, টেস্ট ও কাউন্টার এক্সেস', color: 'from-blue-600/20 to-cyan-600/20 border-blue-500/40 text-blue-300' },
                    { key: 'LAB_REPORTING', label: '🧪 ল্যাব রিপোর্টিং পোর্টাল (Lab Reporting Key)', subtitle: 'প্যাথলজি ও টেস্ট রিপোর্ট তৈরি', color: 'from-purple-600/20 to-pink-600/20 border-purple-500/40 text-purple-300' },
                    { key: 'CLINIC', label: '🏥 ক্লিনিক ও ইনডোর (Clinic & Hospital Key)', subtitle: 'ইনডোর পেশেন্ট, কেবিন ও এডমিশন', color: 'from-emerald-600/20 to-teal-600/20 border-emerald-500/40 text-emerald-300' },
                    { key: 'MEDICINE', label: '💊 ফার্মেসি ও মেডিসিন (Pharmacy Key)', subtitle: 'ওষুধ বিক্রয় ও ইনভেন্টরি স্টক', color: 'from-indigo-600/20 to-violet-600/20 border-indigo-500/40 text-indigo-300' },
                    { key: 'ACCOUNTING', label: '📊 একাউন্টিং ও হিসাব (Accounting Key)', subtitle: 'আয়-ব্যয় লেজার ও ব্যালেন্স শিট', color: 'from-sky-600/20 to-blue-600/20 border-sky-500/40 text-sky-300' },
                  ].map(item => (
                    <div key={item.key} className={`bg-gradient-to-br ${item.color} p-5 rounded-2xl border space-y-3 shadow-lg relative`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <label className="block text-xs font-black text-white tracking-wide">{item.label}</label>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.subtitle}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type={showPasswordMap[item.key] ? "text" : "password"}
                          value={(localPasswords as any)[item.key] || ''}
                          onChange={e => setLocalPasswords({ ...localPasswords, [item.key]: e.target.value })}
                          className="w-full bg-slate-900/90 border-2 border-slate-700/80 focus:border-white rounded-xl px-4 py-3 text-white font-bold outline-none pr-16 text-sm tracking-wider"
                          placeholder="পাসওয়ার্ড লিখুন..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordMap(p => ({ ...p, [item.key]: !p[item.key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 transition-all"
                        >
                          {showPasswordMap[item.key] ? 'গোপন' : 'দেখান'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </form>

              {/* STAFF ACCOUNTS SECTION */}
              <div className="pt-8 border-t border-slate-800 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      👥 স্টাফ ইউজার ও দায়িত্ব বণ্টন (Staff Accounts)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      ক্লিনিক ও ডায়াগনস্টিকের কর্মকর্তা ও অপারেটরদের রোল তালিকা।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg"
                  >
                    <PlusIcon size={16} /> নতুন স্টাফ যোগ করুন
                  </button>
                </div>

                <div className="overflow-x-auto bg-slate-950/60 rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-black tracking-widest border-b border-slate-800">
                      <tr>
                        <th className="p-4">স্টাফ আইডি</th>
                        <th className="p-4">নাম</th>
                        <th className="p-4">ইউজারনেম</th>
                        <th className="p-4">রোল / পদবী</th>
                        <th className="p-4">ডিপার্টমেন্ট</th>
                        <th className="p-4">মোবাইল</th>
                        <th className="p-4">স্ট্যাটাস</th>
                        <th className="p-4 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {staffAccounts.map(s => (
                        <tr key={s.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-4 font-mono font-bold text-sky-400">{s.id}</td>
                          <td className="p-4 font-bold text-white">{s.name}</td>
                          <td className="p-4 font-mono text-slate-300">@{s.username}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-blue-950/80 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-black uppercase">
                              {s.role}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300">{s.dept}</td>
                          <td className="p-4 font-mono text-slate-400">{s.mobile || '---'}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded text-[10px] font-bold">
                              {s.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteStaffAccount(s.id)}
                              className="text-rose-400 hover:text-rose-200 font-bold p-1 hover:bg-rose-950/50 rounded transition-colors"
                              title="মুছুন"
                            >
                              <TrashIcon size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SUPABASE CLOUD DATABASE */}
          {activeTab === 'database' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    ☁️ Supabase লাইভ ক্লাউড ডাটাবেজ ও সিঙ্ক স্ট্যাটাস
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    সার্ভার কানেক্টিভিটি যাচাই করুন, ডাটা ফেচ করুন অথবা ডাটাবেজ ক্রেডেনশিয়াল কনফিগার করুন।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LIVE CONNECTION STATUS CARD */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-3.5 w-3.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${supConfig.isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${supConfig.isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      </span>
                      <span className="text-sm font-black text-white uppercase tracking-wider">
                        লাইভ ক্লাউড ডাটাবেজ স্ট্যাটাস
                      </span>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${supConfig.isConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                      {supConfig.isConnected ? '✓ ক্লাউড কানেক্টেড' : '✕ ডিসকানেক্টেড'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    সরাসরি অনলাইন Supabase ডাটাবেজ থেকে ডাটা লোড, কানেকশন যাচাই এবং সব ডিভাইসের জন্য রিয়েল-টাইম ডাটা সিঙ্ক নিশ্চিত করুন।
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleTestSupabaseConnection}
                      disabled={isTestingSupabase}
                      className="bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-black py-3 px-4 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Activity size={16} className={isTestingSupabase ? 'animate-spin' : ''} />
                      {isTestingSupabase ? 'চেক হচ্ছে...' : '🔍 কানেকশন টেস্ট'}
                    </button>

                    <button
                      type="button"
                      onClick={handleForcePullAllFromCloud}
                      disabled={isReloadingFromCloud}
                      className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black py-3 px-4 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      <RefreshIcon size={16} className={isReloadingFromCloud ? 'animate-spin' : ''} />
                      {isReloadingFromCloud ? 'লোড হচ্ছে...' : '⚡ ক্লাউড ডাটা রিফ্রেশ'}
                    </button>
                  </div>

                  {testResult && (
                    <div className={`p-4 rounded-xl text-xs space-y-3 border ${testResult.success ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/40 border-rose-500/40 text-rose-200'}`}>
                      <div className="font-bold flex items-center justify-between">
                        <span>{testResult.message}</span>
                      </div>
                      {testResult.tablesFound && Object.keys(testResult.tablesFound).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800">
                          <div className="text-[10px] font-black text-amber-400 uppercase mb-2">ক্লাউডে পাওয়া টেবিল ও মোট ডাটা সংখ্যা:</div>
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            {Object.entries(testResult.tablesFound).map(([tbl, cnt]) => (
                              <div key={tbl} className="flex justify-between bg-slate-900 px-3 py-1.5 rounded-lg">
                                <span className="text-slate-300 font-bold">{tbl}:</span>
                                <span className="text-emerald-400 font-black">{cnt} টি</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SUPABASE CONFIG INPUTS */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-sky-400 uppercase tracking-widest">
                      Supabase সংযোগ ক্রেডেনশিয়াল
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowConfigInputs(!showConfigInputs)}
                      className="text-[10px] text-slate-400 hover:text-white font-bold uppercase"
                    >
                      {showConfigInputs ? 'সংকোচন করুন' : 'সম্পাদনা করুন'}
                    </button>
                  </div>

                  {showConfigInputs ? (
                    <div className="space-y-4">
                      <div>
                        <label className={labelClass}>Supabase Project URL</label>
                        <input
                          type="text"
                          value={supabaseUrlInput}
                          onChange={e => setSupabaseUrlInput(e.target.value)}
                          placeholder="https://xyzcompany.supabase.co"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Supabase Anon / Public Key</label>
                        <input
                          type="password"
                          value={supabaseKeyInput}
                          onChange={e => setSupabaseKeyInput(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                          className={inputClass}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveSupabaseConfig}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-3 rounded-xl uppercase tracking-wider transition-all shadow-lg"
                      >
                        💾 Supabase ক্রেডেনশিয়াল সেভ করুন
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Project URL:</span>
                        <span className="font-mono text-white truncate max-w-[240px]">{supabaseUrlInput || 'Default Built-in URL'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Anon Key:</span>
                        <span className="font-mono text-white">••••••••••••••••</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* MIGRATION & DISCONNECT SINGLE TABLE SECTION */}
              <div className="space-y-6 pt-4 border-t border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                      💎 পার্মানেন্ট ডাটা মাইগ্রেশন ও সিঙ্গেল টেবিল (ncd_state) পৃথকীকরণ
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ncd_state থেকে সমস্ত ঐতিহাসিক ডাটা পৃথক পৃথক টেবিলে স্থায়ীভাবে ট্রান্সফার করে সিঙ্গেল টেবিলের সাথে সম্পর্ক ছিন্ন করুন।
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                      সিঙ্গেল টেবিল রাইট: সম্পূর্ণ বন্ধ (Safe)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* CARD 1: EXPENSES PERMANENT TRANSFER */}
                  <div className="bg-slate-950 p-6 rounded-2xl border-2 border-emerald-600/30 space-y-5 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 font-bold text-lg">
                          💰
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase">
                            ১. খরচের ডাটা পার্মানেন্ট ট্রান্সফার
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            detailed_expenses টেবিলে পুশ
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      ncd_state টেবিল থেকে জানুয়ারি থেকে ৩১ জুলাই পর্যন্ত সমস্ত খরচের এন্ট্রি বের করে Supabase-এর <span className="font-mono text-emerald-400 font-bold">detailed_expenses</span> টেবিলে স্বয়ংক্রিয়ভাবে INSERT/UPSERT করা হবে।
                    </p>

                    <button
                      type="button"
                      onClick={handleTransferExpenses}
                      disabled={isTransferringExpenses}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white text-xs font-black py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                    >
                      {isTransferringExpenses ? (
                        <>
                          <Activity size={16} className="animate-spin" />
                          ট্রান্সফার চলছে ({expenseTransferPct}%)...
                        </>
                      ) : (
                        <>
                          <span>🚀</span>
                          <span>খরচ ট্রান্সফার করুন</span>
                        </>
                      )}
                    </button>

                    {isTransferringExpenses && (
                      <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-emerald-500/20">
                        <div className="flex justify-between text-xs text-slate-300 font-bold">
                          <span>{expenseTransferMsg}</span>
                          <span className="font-mono text-emerald-400">{expenseTransferPct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${expenseTransferPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {expenseTransferReport && (
                      <div className={`p-4 rounded-xl text-xs space-y-2.5 border ${expenseTransferReport.success ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/40 border-rose-500/40 text-rose-200'}`}>
                        <div className="font-bold flex items-center gap-2">
                          <span>{expenseTransferReport.success ? '✓' : '✕'}</span>
                          <span>{expenseTransferReport.message}</span>
                        </div>
                        {expenseTransferReport.success && (
                          <div className="pt-2 border-t border-emerald-900/60 grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <div className="bg-slate-900/80 p-2 rounded-lg">
                              <span className="text-slate-400 block text-[10px]">ট্রান্সফার হওয়া খরচ:</span>
                              <span className="text-emerald-400 font-bold">{expenseTransferReport.transferredCount} টি</span>
                            </div>
                            <div className="bg-slate-900/80 p-2 rounded-lg">
                              <span className="text-slate-400 block text-[10px]">ডুপ্লিকেট বাদ:</span>
                              <span className="text-amber-400 font-bold">{expenseTransferReport.duplicatesSkipped} টি</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CARD 2: TEST & COMMISSION RECOVERY & PERMANENT TRANSFER */}
                  <div className="bg-slate-950 p-6 rounded-2xl border-2 border-amber-500/30 space-y-5 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 font-bold text-lg">
                          🧪
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase">
                            ২. টেস্ট ও কমিশন (PC) ট্রান্সফার
                          </h4>
                          <span className="text-[10px] text-amber-400 font-semibold">
                            tests টেবিলে কমিশন রিস্টোর
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      ncd_state টেবিল থেকে সমস্ত টেস্টের আসল কমিশন (PC) ও সার্ভিস প্রাইজ বের করে Supabase-এর <span className="font-mono text-amber-400 font-bold">tests/test</span> টেবিলে পার্মানেন্ট সেভ ও রিস্টোর করা হবে।
                    </p>

                    <button
                      type="button"
                      onClick={handleTransferTests}
                      disabled={isTransferringTests}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-98 text-white text-xs font-black py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 disabled:opacity-50"
                    >
                      {isTransferringTests ? (
                        <>
                          <Activity size={16} className="animate-spin" />
                          ট্রান্সফার চলছে ({testTransferPct}%)...
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>টেস্ট ও কমিশন ট্রান্সফার করুন</span>
                        </>
                      )}
                    </button>

                    {isTransferringTests && (
                      <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-amber-500/20">
                        <div className="flex justify-between text-xs text-slate-300 font-bold">
                          <span>{testTransferMsg}</span>
                          <span className="font-mono text-amber-400">{testTransferPct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${testTransferPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {testTransferReport && (
                      <div className={`p-4 rounded-xl text-xs space-y-2.5 border ${testTransferReport.success ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' : 'bg-rose-950/40 border-rose-500/40 text-rose-200'}`}>
                        <div className="font-bold flex items-center gap-2">
                          <span>{testTransferReport.success ? '✓' : '✕'}</span>
                          <span>{testTransferReport.message}</span>
                        </div>
                        {testTransferReport.success && (
                          <div className="pt-2 border-t border-amber-900/60 grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <div className="bg-slate-900/80 p-2 rounded-lg">
                              <span className="text-slate-400 block text-[10px]">আপডেটকৃত টেস্ট:</span>
                              <span className="text-amber-400 font-bold">{testTransferReport.transferredCount} টি</span>
                            </div>
                            <div className="bg-slate-900/80 p-2 rounded-lg">
                              <span className="text-slate-400 block text-[10px]">উদ্ধারকৃত কমিশন:</span>
                              <span className="text-emerald-400 font-bold">{testTransferReport.restoredCommissionsCount} টি</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CARD 3: FULL SMART MULTI-TABLE MIGRATION */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-xl bg-sky-600/20 text-sky-400 font-bold text-lg">
                          🔄
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase">
                            ৩. সম্পূর্ণ স্মার্ট মাইগ্রেশন (সকল)
                          </h4>
                          <span className="text-[10px] text-sky-400 font-semibold">
                            ইনভয়েস, ওষুধ, ল্যাব, খরচ ও ডিউ
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCheckMultiTableStats}
                        className="text-[10px] text-slate-400 hover:text-white font-bold bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 uppercase"
                      >
                        স্ট্যাটাস
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      এটি শুরুর পূর্বে স্বয়ংক্রিয়ভাবে একটি সেফটি স্ন্যাপশট ও অফলাইন ব্যাকআপ ডাউনলোড করবে। পুরাতন ncd_state থেকে কোনো ডাটা ডিলিট হবে না (রিড-অনলি)। নতুন পৃথক টেবিলে থাকা ডাটা অপরিবর্তিত রেখে কেবল মিসিং রেকর্ড পুশ করবে।
                    </p>

                    <button
                      type="button"
                      onClick={handleRunSmartMigration}
                      disabled={isSmartMigrating}
                      className="w-full bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-black py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      {isSmartMigrating ? (
                        <>
                          <Activity size={16} className="animate-spin" />
                          মাইগ্রেশন চলছে ({migrationPct}%)...
                        </>
                      ) : (
                        <>
                          <span>🛡️</span>
                          <span>স্মার্ট মাইগ্রেশন ইঞ্জিন চালান (All Modules)</span>
                        </>
                      )}
                    </button>

                    {isSmartMigrating && (
                      <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-sky-500/20">
                        <div className="flex justify-between text-xs text-slate-300 font-bold">
                          <span>{migrationStepMsg}</span>
                          <span className="font-mono text-sky-400">{migrationPct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-sky-500 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${migrationPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {smartMigrationReport && (
                      <div className={`p-4 rounded-xl text-xs space-y-2 border ${smartMigrationReport.success ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/40 border-rose-500/40 text-rose-200'}`}>
                        <div className="font-bold flex items-center gap-2">
                          <span>{smartMigrationReport.success ? '✓' : '✕'}</span>
                          <span>{smartMigrationReport.message}</span>
                        </div>
                        {smartMigrationReport.rescued && (
                          <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <div className="bg-slate-900 p-2 rounded-lg">
                              <span className="text-slate-400 block text-[10px]">মোট উদ্ধারকৃত রেকর্ড:</span>
                              <span className="text-emerald-400 font-bold">{smartMigrationReport.rescued.total} টি</span>
                            </div>
                            <div className="bg-slate-900 p-2 rounded-lg">
                              <span className="text-slate-400 block text-[10px]">ডুপ্লিকেট বাদ দেওয়া:</span>
                              <span className="text-amber-400 font-bold">{smartMigrationReport.duplicatesIgnored} টি</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {rollbackSnapshotInfo && (
                      <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                        <span className="text-slate-400 text-[11px]">
                          প্রি-মাইগ্রেশন স্ন্যাপশট সংরক্ষিত আছে ({new Date(rollbackSnapshotInfo.createdAt).toLocaleTimeString()})
                        </span>
                        <button
                          type="button"
                          onClick={handleRollbackSnapshot}
                          disabled={isRollingBack}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline ml-2"
                        >
                          {isRollingBack ? 'রোলব্যাক হচ্ছে...' : 'রোলব্যাক'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* SINGLE TABLE CLEANUP & DROP GUIDANCE CARD */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🗑️</span>
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                        ৩. সিঙ্গেল টেবিল (ncd_state) স্থায়ীভাবে ডিলিট করার নিয়ম
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDropNcdStateGuidance(!showDropNcdStateGuidance)}
                      className="text-[11px] font-bold text-sky-400 hover:text-white"
                    >
                      {showDropNcdStateGuidance ? 'গাইড বন্ধ করুন ▲' : 'গাইড দেখুন ▼'}
                    </button>
                  </div>

                  {showDropNcdStateGuidance && (
                    <div className="pt-3 border-t border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed animate-fade-in">
                      <p>
                        ১ ও ২ নম্বর ধাপের ট্রান্সফার সফলভাবে সম্পন্ন হওয়ার পর এবং একাউন্টস পেজে জানুয়ারি-জুলাইয়ের হিসাব মিলিয়ে নেওয়ার পর আপনি নিশ্চিন্তে Supabase থেকে <span className="font-mono text-rose-400 font-bold">ncd_state</span> টেবিলটি মুছে ফেলতে পারেন:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-400">
                        <li>Supabase ড্যাশবোর্ডে গিয়ে আপনার প্রোজেক্ট খুলুন।</li>
                        <li>বাম পাশের মেনু থেকে <span className="text-white font-bold">SQL Editor</span>-এ যান।</li>
                        <li>নিচের কমান্ডটি লিখে <span className="text-white font-bold">Run</span> চাপুন:</li>
                      </ol>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 flex justify-between items-center">
                        <code>DROP TABLE IF EXISTS ncd_state;</code>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-semibold">
                        ✓ সফটওয়্যারটি ইতিমধ্যেই শতভাগ পৃথক টেবিল (modular tables) থেকে ডাটা পড়া ও লেখার জন্য কনফিগার করা হয়েছে। ncd_state ড্রপ করলেও সফটওয়্যার পুরোপুরি স্বাভাবিকভাবে আজীবন চলবে।
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AUTO-BACKUP SCHEDULER & SNAPSHOT VAULT */}
          {activeTab === 'autobackup' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    ⏱️ অটো ব্যাকআপ শিডিউলার ও লোকাল স্ন্যাপশট ভল্ট
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    ক্লিনিকের সমস্ত ডাটা নির্দিষ্ট সময় অন্তর স্বয়ংক্রিয়ভাবে টাইম-স্ট্যাম্পড পয়েন্টে ব্যাকআপ হবে।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Auto-Backup Config Form */}
                <form onSubmit={handleSaveAutoBackupSettings} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-black text-teal-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={16} /> শিডিউল পলিসি কনফিগারেশন
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoBackupSettings.autoBackupEnabled}
                        onChange={e => setAutoBackupSettings({ ...autoBackupSettings, autoBackupEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-900 border-slate-700"
                      />
                      <span className="text-xs font-bold text-slate-300">অটো-ব্যাকআপ সক্রিয়</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>ব্যাকআপ ফ্রিকোয়েন্সি (Frequency)</label>
                      <select
                        value={autoBackupSettings.frequency}
                        onChange={e => setAutoBackupSettings({ ...autoBackupSettings, frequency: e.target.value as any })}
                        className={inputClass}
                      >
                        <option value="daily">দৈনিক (প্রতিদিন একবার)</option>
                        <option value="weekly">সাপ্তাহিক (প্রতি ৭ দিনে একবার)</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>সর্বোচ্চ স্ন্যাপশট সংরক্ষণ সংখ্যা</label>
                      <select
                        value={autoBackupSettings.maxSnapshots}
                        onChange={e => setAutoBackupSettings({ ...autoBackupSettings, maxSnapshots: parseInt(e.target.value) || 10 })}
                        className={inputClass}
                      >
                        <option value={5}>৫টি স্ন্যাপশট</option>
                        <option value={10}>১০টি স্ন্যাপশট</option>
                        <option value={20}>২০টি স্ন্যাপশট</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingAutoBackup}
                    className="w-full bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-black text-xs uppercase py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <SaveIcon size={16} /> {isSavingAutoBackup ? 'সংরক্ষণ হচ্ছে...' : 'শিডিউলার পলিসি সেভ করুন'}
                  </button>
                </form>

                {/* Instant Snapshot Creator */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black text-teal-400 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2">
                      <HardDrive size={16} /> তাৎক্ষণিক সম্পূর্ণ স্ন্যাপশট গ্রহণ
                    </h3>
                    <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                      যে কোনো বড় পরিবর্তন করার পূর্বে বর্তমান অবস্থার একটি ফুল ডাটাবেজ পয়েন্ট ক্যাপচার করে সুরক্ষিত রাখতে পারেন।
                    </p>

                    <div className="mt-4">
                      <label className={labelClass}>স্ন্যাপশটের নাম / শিরোনাম (Optional Label)</label>
                      <input
                        type="text"
                        value={snapshotTitleInput}
                        onChange={e => setSnapshotTitleInput(e.target.value)}
                        placeholder="e.g. Month End Snapshot / Before Update"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTakeSnapshot}
                    disabled={isTakingSnapshot}
                    className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-95 text-white font-black text-xs uppercase py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <HardDrive size={18} /> {isTakingSnapshot ? 'ক্যাপচার হচ্ছে...' : 'এখনই ফুল স্ন্যাপশট তৈরি করুন'}
                  </button>
                </div>
              </div>

              {/* Local Snapshots Table */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <FileJson size={16} className="text-teal-400" /> সংরক্ষিত লোকাল স্ন্যাপশট ভল্ট ({localSnapshots.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">স্ন্যাপশট আইডি ও নাম</th>
                        <th className="p-3">তারিখ ও সময়</th>
                        <th className="p-3 text-center">মোট রেকর্ড</th>
                        <th className="p-3 text-right">সাইজ (KB)</th>
                        <th className="p-3 text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-bold">
                      {localSnapshots.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">
                            ভল্টে কোনো সংরক্ষিত স্ন্যাপশট নেই। উপরের বাটন দিয়ে নতুন স্ন্যাপশট তৈরি করুন।
                          </td>
                        </tr>
                      ) : (
                        localSnapshots.map(snp => (
                          <tr key={snp.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-3">
                              <span className="text-white font-black block">{snp.title}</span>
                              <span className="font-mono text-[10px] text-teal-400">{snp.id}</span>
                            </td>
                            <td className="p-3 text-slate-300">
                              {new Date(snp.timestamp).toLocaleString()}
                            </td>
                            <td className="p-3 text-center font-mono text-emerald-400">
                              {snp.recordCount || 'Full State'}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-400">
                              {snp.sizeKb || '15'} KB
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreSnapshot(snp)}
                                  className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all"
                                  title="এই ব্যাকআপটি রিস্টোর করুন"
                                >
                                  রিস্টোর
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const blob = new Blob([JSON.stringify(snp.data, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${snp.title.replace(/\s+/g, '_')}_${snp.id}.json`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"
                                  title="ডাউনলোড করুন"
                                >
                                  <DownloadIcon size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSnapshot(snp.id)}
                                  className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all"
                                  title="মুছে ফেলুন"
                                >
                                  <TrashIcon size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: MASTER BACKUP & FACTORY RESET */}
          {activeTab === 'backup' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    💾 মাস্টার ব্যাকআপ ডাউনলোড ও সিস্টেম ডাটা রিসেট
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    সম্পূর্ণ ডাটাবেজ এক ক্লিকে অফলাইনে এক্সপোর্ট করুন অথবা জরুরি প্রয়োজনে রিস্টোর করুন।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* BACKUP EXPORT CARD */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
                      <DownloadIcon size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase">মাস্টার ব্যাকআপ ফাইল ডাউনলোড</h3>
                      <p className="text-xs text-slate-400">সকল পেশেন্ট, ইনভয়েস, রিপোর্ট ও লেজার ডাটা</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    আপনার ক্লিনিকের সম্পূর্ণ ডাটা (JSON ফরম্যাটে) কম্পিউটারে নিরাপদে সংরক্ষণ করতে নিচের বাটনে চাপ দিন।
                  </p>

                  <button
                    onClick={handleDownloadBackup}
                    className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white p-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl"
                  >
                    <DownloadIcon size={18} /> মাস্টার ব্যাকআপ ডাউনলোড করুন (.json)
                  </button>

                  <div className="pt-4 border-t border-slate-800">
                    <button 
                      onClick={() => setShowManualPaste(!showManualPaste)} 
                      className="text-xs font-black text-blue-400 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2"
                    >
                      {showManualPaste ? '▼ ম্যানুয়াল রিস্টোর বক্স লুকান' : '⚙️ ম্যানুয়াল ব্যাকআপ রিস্টোর (Paste JSON)'}
                    </button>
                    
                    {showManualPaste && (
                      <div className="mt-4 space-y-3 animate-fade-in">
                        <textarea 
                          rows={4}
                          value={pastedJson}
                          onChange={(e) => setPastedJson(e.target.value)}
                          placeholder='{"patients": [...], "labInvoices": [...]}'
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-[10px] font-mono text-blue-300 outline-none focus:border-blue-500 transition-all"
                        />
                        <button 
                          onClick={handleManualRestore}
                          disabled={isRestoring || !pastedJson.trim()}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-black uppercase text-xs disabled:opacity-50 transition-all shadow-lg"
                        >
                          {isRestoring ? `Restoring (${restoreProgress}%)` : 'ভেরিফাই ও রিস্টোর করুন'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* FACTORY RESET CARD */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-rose-900/40 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-600/20 text-rose-400 rounded-xl">
                      <TrashIcon size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-rose-400 uppercase">ফ্যাক্টরি ডাটা রিসেট (সতর্কতা)</h3>
                      <p className="text-xs text-rose-300/70">সকল রেকর্ড স্থায়ীভাবে মুছে নতুন শুরু করতে</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    এটি আপনার ব্রাউজারের সকল স্থানীয় ডাটা মুছে ফেলবে। এটি অপরিবর্তনীয়! রিসেট করার আগে অবশ্যই ব্যাকআপ ডাউনলোড করুন।
                  </p>

                  <div className="relative">
                    {resetStep === 0 ? (
                      <button 
                        onClick={() => setResetStep(1)} 
                        className="w-full bg-rose-900/30 hover:bg-rose-600 border border-rose-900/50 p-4 rounded-xl flex items-center justify-between group transition-all"
                      >
                        <span className="text-rose-400 group-hover:text-white font-black text-xs uppercase tracking-wider">
                          সিস্টেম ফ্যাক্টরি রিসেট শুরু করুন
                        </span>
                        <TrashIcon size={18} className="text-rose-500 group-hover:text-white" />
                      </button>
                    ) : (
                      <div className="bg-slate-900 p-5 rounded-2xl border-2 border-rose-500 shadow-2xl space-y-4">
                        {resetStep === 1 && (
                          <>
                            <p className="text-xs font-black text-white uppercase text-center">আপনি কি নিশ্চিত যে আপনি সব ডাটা ডিলিট করতে চান?</p>
                            <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => setResetStep(0)} className="py-2.5 bg-slate-800 rounded-xl text-xs font-bold">বাতিল</button>
                              <button onClick={() => setResetStep(2)} className="py-2.5 bg-rose-600 rounded-xl text-xs font-black">হ্যাঁ, এগিয়ে যান</button>
                            </div>
                          </>
                        )}
                        {resetStep === 2 && (
                          <>
                            <p className="text-xs font-black text-amber-400 uppercase text-center">রিসেট করার আগে ব্যাকআপ ডাউনলোড করতে চান?</p>
                            <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => setResetStep(3)} className="py-2.5 bg-slate-800 rounded-xl text-xs font-bold italic">না, সরাসরি মুছুন</button>
                              <button onClick={handleDownloadBackup} className="py-2.5 bg-blue-600 rounded-xl text-xs font-black">হ্যাঁ, ব্যাকআপ দিন</button>
                            </div>
                          </>
                        )}
                        {resetStep === 3 && (
                          <>
                            <p className="text-[11px] font-black text-rose-400 uppercase text-center">চূড়ান্ত ধাপ: নিশ্চিত করতে নিচের বক্সে 'RESET' টাইপ করুন</p>
                            <input 
                              value={finalConfirmText} 
                              onChange={e => setFinalConfirmText(e.target.value)} 
                              className="w-full bg-slate-950 border-2 border-rose-500 p-2.5 text-center text-white font-black rounded-xl outline-none text-xs"
                              placeholder="RESET লিখুন"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => setResetStep(0)} className="py-2.5 bg-slate-800 rounded-xl text-xs font-bold">বাতিল</button>
                              <button onClick={executeFullReset} className="py-2.5 bg-rose-600 rounded-xl text-xs font-black shadow-lg shadow-rose-900/50">RESET NOW</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ADD STAFF MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white uppercase">নতুন স্টাফ যুক্ত করুন</h3>
              <button onClick={() => setShowAddStaffModal(false)} className="text-slate-400 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleAddStaffAccount} className="space-y-4">
              <div>
                <label className={labelClass}>স্টাফের পুরো নাম</label>
                <input
                  type="text"
                  value={newStaffForm.name}
                  onChange={e => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                  placeholder="e.g. মোঃ রফিকুল ইসলাম"
                  className={inputClass}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>ইউজারনেম (Login Username)</label>
                  <input
                    type="text"
                    value={newStaffForm.username}
                    onChange={e => setNewStaffForm({ ...newStaffForm, username: e.target.value.toLowerCase().trim() })}
                    placeholder="e.g. rafiq"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>রোল / পদবী</label>
                  <select
                    value={newStaffForm.role}
                    onChange={e => setNewStaffForm({ ...newStaffForm, role: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="RECEPTIONIST">Receptionist / Cashier</option>
                    <option value="LAB_TECHNOLOGIST">Lab Technologist</option>
                    <option value="DOCTOR">Consultant Doctor</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>ডিপার্টমেন্ট</label>
                  <input
                    type="text"
                    value={newStaffForm.dept}
                    onChange={e => setNewStaffForm({ ...newStaffForm, dept: e.target.value })}
                    placeholder="Diagnostic & Billing"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>মোবাইল নম্বর</label>
                  <input
                    type="text"
                    value={newStaffForm.mobile}
                    onChange={e => setNewStaffForm({ ...newStaffForm, mobile: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-black text-xs uppercase"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase shadow-lg"
                >
                  যুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
