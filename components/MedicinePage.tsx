import React, { useState, useEffect, useMemo } from 'react';
import { Medicine, Employee, PurchaseInvoice, InvoiceItem, Doctor, SalesInvoice, SalesItem, DrugMonograph, IndoorInvoice } from './DiagnosticData';
import { BackIcon, MapPinIcon, PhoneIcon, MedicineIcon, FileTextIcon, Pill, SearchIcon, Activity, SaveIcon, TrashIcon, PlusIcon, TrendingDownIcon, RefreshIcon, AlertCircle, EyeIcon, PrinterIcon, XIcon, EditIcon } from './Icons';
import { CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { dbService } from '../dbService';

interface MedicinePageProps {
  onBack: () => void;
  medicines?: Medicine[];
  setMedicines?: React.Dispatch<React.SetStateAction<Medicine[]>>;
  clinicalDrugs?: DrugMonograph[];
  setClinicalDrugs?: React.Dispatch<React.SetStateAction<DrugMonograph[]>>;
  employees?: Employee[];
  doctors?: Doctor[];
  invoices?: PurchaseInvoice[];
  setInvoices?: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  purchaseInvoices?: PurchaseInvoice[];
  setPurchaseInvoices?: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  salesInvoices?: SalesInvoice[];
  setSalesInvoices?: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  indoorInvoices?: IndoorInvoice[];
  patients?: any[];
  setPatients?: any;
  detailedExpenses?: Record<string, any[]>;
  setDetailedExpenses?: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

type MedicineTab = 'buy' | 'due_paid' | 'sell' | 'store' | 'chart' | 'hishab';
type ViewMode = 'list' | 'add' | 'edit' | 'print';

// Added Soln and Inf to the formulations list
const formulations = ['Tab', 'Cap', 'Syr', 'Inj', 'Susp', 'Soln', 'Inf', 'Cream', 'Oint', 'Drops', 'Inhaler', 'Supp', 'Sachet', 'Other'];

const monthOptions = [
    { value: 0, name: 'January' }, { value: 1, name: 'February' }, { value: 2, name: 'March' },
    { value: 3, name: 'April' }, { value: 4, name: 'May' }, { value: 5, name: 'June' },
    { value: 6, name: 'July' }, { value: 7, name: 'August' }, { value: 8, name: 'September' },
    { value: 9, name: 'October' }, { value: 10, name: 'November' }, { value: 11, name: 'December' }
];

const defaultSuppliers = [
    "Medicine Store", "Square Pharmaceuticals", "Beximco Pharmaceuticals", "Incepta Pharmaceuticals", "Renata Limited",
    "Healthcare Pharmaceuticals", "ACI Limited", "Aristopharma Ltd.", "Eskayef Pharmaceuticals", "ACME Laboratories",
    "Drug International", "Radiant Pharmaceuticals", "Sun Pharmaceutical", "Popular Pharmaceuticals"
];

export const getExpiryInfo = (expiryDateStr?: string | null) => {
  if (!expiryDateStr || typeof expiryDateStr !== 'string' || !expiryDateStr.trim()) {
    return {
      status: 'none' as const,
      label: 'মেয়াদ উল্লেখ নেই',
      shortLabel: 'N/A',
      badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
      rowClass: '',
      daysLeft: null
    };
  }

  const clean = expiryDateStr.trim();
  let expYear = 0;
  let expMonth = 0; // 1-12
  let expDay = 28;

  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length >= 2) {
      expYear = Number(parts[0]);
      expMonth = Number(parts[1]);
      if (parts.length >= 3) expDay = Number(parts[2]);
    }
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      expMonth = Number(parts[0]);
      expYear = Number(parts[1]);
      if (expYear < 100) expYear += 2000;
    }
  }

  if (!expYear || !expMonth || isNaN(expYear) || isNaN(expMonth)) {
    return {
      status: 'none' as const,
      label: clean,
      shortLabel: clean,
      badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
      rowClass: '',
      daysLeft: null
    };
  }

  // End of that month
  const expDateObj = new Date(expYear, expMonth, 0, 23, 59, 59);
  const now = new Date();
  const diffMs = expDateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired' as const,
      label: `🔴 মেয়াদোত্তীর্ণ (${clean})`,
      shortLabel: 'মেয়াদোত্তীর্ণ',
      badgeClass: 'bg-rose-950/90 text-rose-200 border border-rose-500 font-black shadow-md shadow-rose-950/60 animate-pulse',
      rowClass: 'bg-rose-950/40 hover:bg-rose-900/50 border-l-4 border-l-rose-500 text-rose-100',
      daysLeft: diffDays
    };
  } else if (diffDays <= 90) {
    return {
      status: 'expiring' as const,
      label: `🟡 মেয়াদ আসন্ন (${diffDays} দিন)`,
      shortLabel: 'মেয়াদ আসন্ন',
      badgeClass: 'bg-amber-950/80 text-amber-200 border border-amber-500 font-black shadow-md',
      rowClass: 'bg-amber-950/30 hover:bg-amber-900/40 border-l-4 border-l-amber-500 text-amber-100',
      daysLeft: diffDays
    };
  } else {
    return {
      status: 'valid' as const,
      label: `🟢 সচল (${clean})`,
      shortLabel: 'সচল',
      badgeClass: 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/40 font-bold',
      rowClass: '',
      daysLeft: diffDays
    };
  }
};

const MedicinePage: React.FC<MedicinePageProps> = ({ 
    onBack, medicines = [], setMedicines, clinicalDrugs = [], setClinicalDrugs, employees = [], doctors = [], invoices = [], setInvoices, purchaseInvoices = [], setPurchaseInvoices, salesInvoices = [], setSalesInvoices, indoorInvoices = [], performBlockingSync
}) => {
  const safeInvoices = useMemo(() => {
    const listA = Array.isArray(invoices) ? invoices : [];
    const listB = Array.isArray(purchaseInvoices) ? purchaseInvoices : [];
    if (listA.length > 0 && listB.length > 0) {
      const map = new Map<string, any>();
      listA.forEach(item => { if (item?.invoiceId) map.set(item.invoiceId, item); });
      listB.forEach(item => { if (item?.invoiceId && !map.has(item.invoiceId)) map.set(item.invoiceId, item); });
      return Array.from(map.values());
    }
    return listA.length > 0 ? listA : listB;
  }, [invoices, purchaseInvoices]);

  const safeSetInvoices = (newInvs: any[]) => {
    if (setInvoices) setInvoices(newInvs);
    if (setPurchaseInvoices) setPurchaseInvoices(newInvs);
  };
  const safeMedicines = useMemo(() => Array.isArray(medicines) ? medicines : [], [medicines]);
  const safeSetMedicines = setMedicines || (() => {});
  const safeSalesInvoices = useMemo(() => Array.isArray(salesInvoices) ? salesInvoices : [], [salesInvoices]);
  const safeSetSalesInvoices = setSalesInvoices || (() => {});
  const safeIndoorInvoices = useMemo(() => Array.isArray(indoorInvoices) ? indoorInvoices : [], [indoorInvoices]);
  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);
  const safeClinicalDrugs = useMemo(() => Array.isArray(clinicalDrugs) ? clinicalDrugs : [], [clinicalDrugs]);
  const safeSetClinicalDrugs = setClinicalDrugs || (() => {});

  const [activeTab, setActiveTab] = useState<MedicineTab>('sell');
  const [buyViewMode, setBuyViewMode] = useState<ViewMode>('list');
  const [sellViewMode, setSellViewMode] = useState<ViewMode>('list');
  const [sellSubTab, setSellSubTab] = useState<'outdoor' | 'indoor'>('outdoor');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
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

  // Dedicated blocking progress & success overlay state for sales item/record deletion
  const [deleteProgressState, setDeleteProgressState] = useState<{
    isDeleting: boolean;
    step: string;
    isSuccess: boolean;
    message: string;
  } | null>(null);

  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [isOpeningStock, setIsOpeningStock] = useState(false);
  const [viewingPurchaseInvoice, setViewingPurchaseInvoice] = useState<PurchaseInvoice | null>(null);

  // Sales State Extras
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Supplier Payment Logic
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ invoiceId: '', supplierName: '', currentDue: 0, payAmount: '' });

  // Drug Monograph State
  const [clinicalDrugForm, setClinicalDrugForm] = useState<DrugMonograph>({
      id: '', brandName: '', genericName: '', strength: '', formulation: 'Tab', company: '',
      pregnancyCategory: 'B', indications: [], sideEffects: [], adultDose: ''
  });
  const [isEditingDrug, setIsEditingDrug] = useState(false);
  const [drugSearch, setDrugSearch] = useState('');

  // Manual Stock Adjustment State
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    medicineId: '',
    tradeName: '',
    genericName: '',
    strength: '',
    formulation: '',
    currentStock: 0,
    adjustmentType: 'add' as 'add' | 'subtract',
    adjustmentQty: '',
    newSellingPrice: '',
  });

  // Purchase Form State
  const [purchaseFormData, setPurchaseFormData] = useState<PurchaseInvoice>({
      invoiceId: '', invoiceDate: new Date().toISOString().split('T')[0], source: '', items: [], totalAmount: 0, discount: 0, netPayable: 0, paidAmount: 0, dueAmount: 0, billCreatedBy: 'Admin', billPaidBy: '', receivedBy: '', status: 'Saved', createdDate: ''
  });
  const [currentPurchaseItem, setCurrentPurchaseItem] = useState<Partial<InvoiceItem>>({ tradeName: '', genericName: '', formulation: 'Tab', strength: '', unitPriceBuy: 0, unitPriceSell: 0, qtyBuying: 0, lineTotalBuy: 0, expiryDate: '' });
  
  // Sales Form State
  const [salesFormData, setSalesFormData] = useState<SalesInvoice>({
      invoiceId: '', invoiceDate: new Date().toISOString().split('T')[0], customerName: '', customerMobile: '', customerAge: '', customerGender: '', refDoctorName: '', items: [], totalAmount: 0, discount: 0, netPayable: 0, paidAmount: 0, dueAmount: 0, billCreatedBy: 'Admin', status: 'Saved', createdDate: ''
  });
  const [currentSalesItem, setCurrentSalesItem] = useState<Partial<SalesItem>>({ tradeName: '', genericName: '', formulation: 'Tab', strength: '', unitPriceSell: 0, qtySelling: 0, lineTotalSell: 0, stock: 0 });
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Purchase Search & Filter State
  const [buySearchSupplier, setBuySearchSupplier] = useState('');
  const [buySearchDate, setBuySearchDate] = useState('');
  const [buySearchMonth, setBuySearchMonth] = useState<string>('all');
  const [buySearchYear, setBuySearchYear] = useState<string>(new Date().getFullYear().toString());
  const [buySubTab, setBuySubTab] = useState<'invoices' | 'items'>('invoices');

  // Store Expiry & Search Filter State
  const [storeSearch, setStoreSearch] = useState('');
  const [storeFilterStatus, setStoreFilterStatus] = useState<'all' | 'expired' | 'expiring' | 'low_stock'>('all');

  const [sellSearchName, setSellSearchName] = useState('');
  const [sellSearchDate, setSellSearchDate] = useState('');
  const [sellSearchMonth, setSellSearchMonth] = useState<string>('all');
  const [sellSearchYear, setSellSearchYear] = useState<string>(new Date().getFullYear().toString());
  const [suggestions, setSuggestions] = useState<Medicine[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [supplierSuggestions, setSupplierSuggestions] = useState<string[]>([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);

  // Helper to parse Bengali numbers, formatted numbers with commas/currency symbols
  const parseBengaliOrFormattedNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    let s = String(val).trim();
    const bnDigits: Record<string, string> = {
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
      '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    s = s.replace(/[০-৯]/g, d => bnDigits[d] || d);
    s = s.replace(/,/g, '').replace(/৳/g, '').replace(/Tk/gi, '').replace(/\s+/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  // Helper for calculating last day of month
  const getLastDayOfMonth = (year: number, monthZeroIndexed: number) => {
    const d = new Date(year, monthZeroIndexed + 1, 0);
    const mm = String(monthZeroIndexed + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Detect whether an invoice is an aggregated lump-sum entry
  const isLumpSumPurchase = (inv: PurchaseInvoice) => {
    return (
      (inv.invoiceId || '').startsWith('PUR-LUMP') ||
      (inv.billCreatedBy || '').includes('এককালীন') ||
      (inv.billCreatedBy || '').includes('Lump-Sum') ||
      (inv.source || '').includes('এককালীন') ||
      (Array.isArray(inv.items) && inv.items.some(it => (it?.genericName || '').includes('এককালীন') || (it?.tradeName || '').includes('এককালীন')))
    );
  };

  const isLumpSumSale = (inv: SalesInvoice) => {
    return (
      (inv.invoiceId || '').startsWith('SALE-LUMP') ||
      (inv.billCreatedBy || '').includes('এককালীন') ||
      (inv.billCreatedBy || '').includes('Lump-Sum') ||
      (inv.customerName || '').includes('এককালীন') ||
      (Array.isArray(inv.items) && inv.items.some(it => (it?.genericName || '').includes('এককালীন') || (it?.tradeName || '').includes('এককালীন')))
    );
  };

  // Lump-Sum Monthly Purchase Modal state
  const [showLumpSumPurchaseModal, setShowLumpSumPurchaseModal] = useState(false);
  const [lumpSumPurchaseForm, setLumpSumPurchaseForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    date: '',
    supplier: '',
    totalAmount: '',
    paidAmount: '',
    dueAmount: 0,
    notes: '',
    editingInvoiceId: ''
  });

  // Lump-Sum Monthly Sales Modal state
  const [showLumpSumSalesModal, setShowLumpSumSalesModal] = useState(false);
  const [lumpSumSalesForm, setLumpSumSalesForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    date: '',
    customerName: '',
    totalAmount: '',
    paidAmount: '',
    dueAmount: 0,
    notes: '',
    editingInvoiceId: ''
  });

  const openLumpSumPurchaseModal = (targetMonth?: number, targetYear?: number) => {
    const y = targetYear ?? (buySearchYear !== 'all' ? Number(buySearchYear) : selectedYear);
    const m = targetMonth ?? (buySearchMonth !== 'all' ? Number(buySearchMonth) : selectedMonth);
    const mName = monthOptions[m]?.name || `Month ${m + 1}`;
    setLumpSumPurchaseForm({
      year: y,
      month: m,
      date: getLastDayOfMonth(y, m),
      supplier: `এককালীন ওষুধ ক্রয় (${mName} ${y})`,
      totalAmount: '',
      paidAmount: '',
      dueAmount: 0,
      notes: 'বিগত মাসের মোট ওষুধ ক্রয় (এককালীন রেকর্ড)',
      editingInvoiceId: ''
    });
    setShowLumpSumPurchaseModal(true);
  };

  const openEditLumpSumPurchase = (inv: PurchaseInvoice) => {
    const [yStr, mStr] = (inv.invoiceDate || '').split('-');
    const y = Number(yStr) || selectedYear;
    const m = (Number(mStr) || (selectedMonth + 1)) - 1;
    setLumpSumPurchaseForm({
      year: y,
      month: m,
      date: inv.invoiceDate || getLastDayOfMonth(y, m),
      supplier: inv.source || '',
      totalAmount: String(inv.netPayable || inv.totalAmount || ''),
      paidAmount: String(inv.paidAmount ?? ''),
      dueAmount: Number(inv.dueAmount || 0),
      notes: inv.items?.[0]?.genericName || '',
      editingInvoiceId: inv.invoiceId
    });
    setShowLumpSumPurchaseModal(true);
  };

  const handleSaveLumpSumPurchase = async () => {
    const amount = parseBengaliOrFormattedNumber(lumpSumPurchaseForm.totalAmount);
    if (!amount || amount <= 0) {
      alert("অনুগ্রহ করে ক্রয়ের মোট টাকার পরিমাণ সঠিকভাবে লিখুন!");
      return;
    }
    const paid = parseBengaliOrFormattedNumber(lumpSumPurchaseForm.paidAmount);
    const due = Math.max(0, amount - paid);
    const mZero = Number(lumpSumPurchaseForm.month);
    const yNum = Number(lumpSumPurchaseForm.year);
    const mName = monthOptions[mZero]?.name || `Month ${mZero + 1}`;
    const invDate = lumpSumPurchaseForm.date || getLastDayOfMonth(yNum, mZero);
    const invoiceId = lumpSumPurchaseForm.editingInvoiceId || `PUR-LUMP-${yNum}-${String(mZero + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
    const supplierName = (lumpSumPurchaseForm.supplier || '').trim() || `এককালীন ওষুধ ক্রয় (${mName} ${yNum})`;
    const note = (lumpSumPurchaseForm.notes || '').trim();

    const newInv: PurchaseInvoice = {
      invoiceId,
      invoiceDate: invDate,
      source: supplierName,
      items: [{
        id: `ITEM-LUMP-${Date.now()}`,
        tradeName: `এককালীন মাসিক ওষুধ ক্রয় (${mName} ${yNum})`,
        genericName: note || 'মাসিক মোট ক্রয় রেকর্ড (এককালীন)',
        formulation: 'Other',
        strength: '',
        qtyBuying: 1,
        unitPriceBuy: amount,
        unitPriceSell: 0,
        lineTotalBuy: amount,
        expiryDate: ''
      }],
      totalAmount: amount,
      discount: 0,
      netPayable: amount,
      paidAmount: paid,
      dueAmount: due,
      billCreatedBy: 'Admin (এককালীন)',
      billPaidBy: '',
      receivedBy: '',
      status: 'Posted',
      createdDate: new Date().toISOString()
    };

    setLoading(true);
    try {
      // Direct write ensures instant persistence in database (ncd_state for < 2026-08-01, or purchase_invoices for >= 2026-08-01)
      try {
        await dbService.savePurchaseInvoiceDirectly(newInv);
      } catch (dbErr) {
        console.warn("[MedicinePage] Direct db purchase save notice:", dbErr);
      }

      let newInvoicesArr = [...safeInvoices];
      if (lumpSumPurchaseForm.editingInvoiceId) {
        newInvoicesArr = newInvoicesArr.map(x => x.invoiceId === lumpSumPurchaseForm.editingInvoiceId ? newInv : x);
      } else {
        newInvoicesArr = [newInv, ...newInvoicesArr];
      }

      safeSetInvoices(newInvoicesArr);

      // Set filter to the saved invoice's year and month so the user sees it immediately
      setBuySearchYear(yNum.toString());
      setBuySearchMonth(mZero.toString());

      if (performBlockingSync) {
        try {
          await performBlockingSync({ purchaseInvoices: newInvoicesArr });
        } catch (syncErr) {
          console.warn("[MedicinePage] Blocking sync notice:", syncErr);
        }
      }

      setSuccessMessage(`${mName} ${yNum} এর এককালীন ক্রয় সফলভাবে সংরক্ষিত হয়েছে!`);
      setShowLumpSumPurchaseModal(false);
    } catch (e: any) {
      console.error("Lump purchase save error:", e);
      alert("এককালীন ক্রয় সেভ করার সময় সমস্যা হয়েছে: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLumpSumPurchase = async (invoiceId: string, invoiceDate?: string) => {
    if (!window.confirm('আপনি কি এই এককালীন ক্রয় এন্ট্রি মুছে ফেলতে চান?')) return;
    setLoading(true);
    try {
      try {
        await dbService.deletePurchaseInvoiceDirectly(invoiceId, invoiceDate);
      } catch (dbErr) {
        console.warn("[MedicinePage] Direct delete notice:", dbErr);
      }
      const newInvoicesArr = safeInvoices.filter(x => x.invoiceId !== invoiceId);
      safeSetInvoices(newInvoicesArr);
      if (performBlockingSync) {
        try {
          await performBlockingSync({ purchaseInvoices: newInvoicesArr });
        } catch (syncErr) {
          console.warn("[MedicinePage] Blocking sync notice:", syncErr);
        }
      }
      setShowLumpSumPurchaseModal(false);
      setSuccessMessage('এককালীন ক্রয় সফলভাবে মুছে ফেলা হয়েছে।');
    } catch (e: any) {
      console.error('Delete lump purchase error:', e);
      alert('এককালীন ক্রয় মুছতে সমস্যা হয়েছে: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const openLumpSumSalesModal = (targetMonth?: number, targetYear?: number) => {
    const y = targetYear ?? (sellSearchYear !== 'all' ? Number(sellSearchYear) : selectedYear);
    const m = targetMonth ?? (sellSearchMonth !== 'all' ? Number(sellSearchMonth) : selectedMonth);
    const mName = monthOptions[m]?.name || `Month ${m + 1}`;
    setLumpSumSalesForm({
      year: y,
      month: m,
      date: getLastDayOfMonth(y, m),
      customerName: `এককালীন মোট ফার্মেসি বিক্রয় (${mName} ${y})`,
      totalAmount: '',
      paidAmount: '',
      dueAmount: 0,
      notes: 'বিগত মাসের মোট ওষুধ বিক্রয় (এককালীন রেকর্ড)',
      editingInvoiceId: ''
    });
    setShowLumpSumSalesModal(true);
  };

  const openEditLumpSumSales = (inv: SalesInvoice) => {
    const [yStr, mStr] = (inv.invoiceDate || '').split('-');
    const y = Number(yStr) || selectedYear;
    const m = (Number(mStr) || (selectedMonth + 1)) - 1;
    setLumpSumSalesForm({
      year: y,
      month: m,
      date: inv.invoiceDate || getLastDayOfMonth(y, m),
      customerName: inv.customerName || '',
      totalAmount: String(inv.netPayable || inv.totalAmount || ''),
      paidAmount: String(inv.paidAmount ?? ''),
      dueAmount: Number(inv.dueAmount || 0),
      notes: inv.refDoctorName || inv.items?.[0]?.genericName || '',
      editingInvoiceId: inv.invoiceId
    });
    setShowLumpSumSalesModal(true);
  };

  const handleSaveLumpSumSales = async () => {
    const amount = parseBengaliOrFormattedNumber(lumpSumSalesForm.totalAmount);
    if (!amount || amount <= 0) {
      alert("অনুগ্রহ করে বিক্রয়ের মোট টাকার পরিমাণ সঠিকভাবে লিখুন!");
      return;
    }
    const paid = parseBengaliOrFormattedNumber(lumpSumSalesForm.paidAmount);
    const due = Math.max(0, amount - paid);
    const mZero = Number(lumpSumSalesForm.month);
    const yNum = Number(lumpSumSalesForm.year);
    const mName = monthOptions[mZero]?.name || `Month ${mZero + 1}`;
    const invDate = lumpSumSalesForm.date || getLastDayOfMonth(yNum, mZero);
    const invoiceId = lumpSumSalesForm.editingInvoiceId || `SALE-LUMP-${yNum}-${String(mZero + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
    const custName = (lumpSumSalesForm.customerName || '').trim() || `এককালীন মোট ফার্মেসি বিক্রয় (${mName} ${yNum})`;
    const note = (lumpSumSalesForm.notes || '').trim();

    const newSalesInv: SalesInvoice = {
      invoiceId,
      invoiceDate: invDate,
      customerName: custName,
      customerMobile: '',
      customerAge: '',
      customerGender: '',
      refDoctorName: note || 'এককালীন মাসিক বিক্রয়',
      items: [{
        id: `ITEM-LUMP-SALE-${Date.now()}`,
        tradeName: `এককালীন মাসিক ফার্মেসি বিক্রয় (${mName} ${yNum})`,
        genericName: note || 'মাসিক মোট বিক্রয় রেকর্ড (এককালীন)',
        qtySelling: 1,
        unitPriceSell: amount,
        lineTotalSell: amount
      }],
      totalAmount: amount,
      discount: 0,
      netPayable: amount,
      paidAmount: paid,
      dueAmount: due,
      billCreatedBy: 'Admin (এককালীন)',
      status: 'Posted',
      createdDate: new Date().toISOString()
    };

    setLoading(true);
    try {
      // Direct write ensures instant persistence in database (ncd_state for < 2026-08-01, or sales_invoices for >= 2026-08-01)
      try {
        await dbService.saveSalesInvoiceDirectly(newSalesInv);
      } catch (dbErr) {
        console.warn("[MedicinePage] Direct db sales save notice:", dbErr);
      }

      let newSalesArr = [...safeSalesInvoices];
      if (lumpSumSalesForm.editingInvoiceId) {
        newSalesArr = newSalesArr.map(x => x.invoiceId === lumpSumSalesForm.editingInvoiceId ? newSalesInv : x);
      } else {
        newSalesArr = [newSalesInv, ...newSalesArr];
      }

      safeSetSalesInvoices(newSalesArr);

      // Set filter to the saved invoice's year and month so the user sees it immediately
      setSellSearchYear(yNum.toString());
      setSellSearchMonth(mZero.toString());

      if (performBlockingSync) {
        try {
          await performBlockingSync({ salesInvoices: newSalesArr });
        } catch (syncErr) {
          console.warn("[MedicinePage] Blocking sync notice:", syncErr);
        }
      }

      setSuccessMessage(`${mName} ${yNum} এর এককালীন বিক্রয় সফলভাবে সংরক্ষিত হয়েছে!`);
      setShowLumpSumSalesModal(false);
    } catch (e: any) {
      console.error("Lump sales save error:", e);
      alert("এককালীন বিক্রয় সেভ করার সময় সমস্যা হয়েছে: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLumpSumSales = async (invoiceId: string, invoiceDate?: string) => {
    const targetInv = safeSalesInvoices.find(x => x && (x.invoiceId === invoiceId || x.id === invoiceId));
    if (targetInv) {
      handleDeleteSaleWithConfirmation(targetInv);
    } else {
      setConfirmModal({
        isOpen: true,
        title: '⚠️ এককালীন বিক্রয় ডিলিট নিশ্চিতকরণ',
        message: `আপনি কি নিশ্চিতভাবে এই এককালীন বিক্রয় এন্ট্রি মুছে ফেলতে চান?\n\n• আইডি: ${invoiceId}\n• তারিখ: ${invoiceDate || 'N/A'}\n\n⚠️ এটি অনলাইন ডাটাবেজ (Supabase) এবং সেলস তালিকা থেকে সম্পূর্ণ মুছে যাবে।`,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setDeleteProgressState({
            isDeleting: true,
            step: 'অনলাইন ডেটাবেজ থেকে এককালীন বিক্রয় মুছে ফেলা হচ্ছে...',
            isSuccess: false,
            message: ''
          });
          try {
            try {
              await dbService.deleteSalesInvoiceDirectly(invoiceId, invoiceDate);
            } catch (dbErr) {
              console.warn("[MedicinePage] Direct delete notice:", dbErr);
            }
            const newSalesArr = safeSalesInvoices.filter(x => x.invoiceId !== invoiceId && x.id !== invoiceId);
            safeSetSalesInvoices(newSalesArr);
            if (performBlockingSync) {
              try {
                await performBlockingSync({ salesInvoices: newSalesArr });
              } catch (syncErr) {
                console.warn("[MedicinePage] Blocking sync notice:", syncErr);
              }
            }
            setShowLumpSumSalesModal(false);
            setDeleteProgressState({
              isDeleting: false,
              step: '',
              isSuccess: true,
              message: 'এককালীন বিক্রয় সফলভাবে মুছে ফেলা হয়েছে।'
            });
            setTimeout(() => setDeleteProgressState(null), 1400);
          } catch (e: any) {
            console.error('Delete lump sale error:', e);
            setDeleteProgressState(null);
            alert('এককালীন বিক্রয় মুছতে সমস্যা হয়েছে: ' + (e?.message || e));
          }
        }
      });
    }
  };

  // Filtered Purchases & Statistics Calculation
  const filteredPurchases = useMemo(() => {
    return safeInvoices.filter(inv => {
      if (!inv || inv.status === 'Cancelled' || inv.status === 'Deleted') return false;
      const invDate = inv.invoiceDate || (inv as any).date || '';
      const q = buySearchSupplier.trim().toLowerCase();
      const matchesSupplier = !q || 
        (inv.source || '').toLowerCase().includes(q) || 
        (inv.invoiceId || '').toLowerCase().includes(q) ||
        (Array.isArray(inv.items) && inv.items.some(it => 
          (it.tradeName || '').toLowerCase().includes(q) || 
          (it.genericName || '').toLowerCase().includes(q)
        ));
      
      const matchesDate = !buySearchDate || invDate === buySearchDate;
      
      let matchesMonth = true;
      let matchesYear = true;
      const parts = (invDate || '').split('-');
      if (parts.length >= 2) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        matchesMonth = buySearchMonth === 'all' || (m - 1) === parseInt(buySearchMonth);
        matchesYear = buySearchYear === 'all' || isNaN(y) ? true : y === parseInt(buySearchYear);
      }
      return matchesSupplier && matchesDate && matchesMonth && matchesYear;
    });
  }, [safeInvoices, buySearchSupplier, buySearchDate, buySearchMonth, buySearchYear]);

  const purchaseStats = useMemo(() => {
    let totalInvoices = 0;
    let totalMedsQty = 0;
    let totalNetBuy = 0;
    let totalPaid = 0;
    let totalDue = 0;
    const uniqueMedicineSet = new Set<string>();

    filteredPurchases.forEach(inv => {
      if (inv.status === 'Initial') return;
      totalInvoices += 1;
      totalNetBuy += (Number(inv.netPayable) || 0);
      totalPaid += (Number(inv.paidAmount) || 0);
      totalDue += (Number(inv.dueAmount) || 0);
      if (Array.isArray(inv.items)) {
        inv.items.forEach(it => {
          if (!it) return;
          totalMedsQty += (Number(it.qtyBuying) || 0);
          if (it.tradeName) uniqueMedicineSet.add(it.tradeName.trim().toLowerCase());
        });
      }
    });

    return {
      totalInvoices,
      totalMedsQty,
      uniqueMedicines: uniqueMedicineSet.size,
      totalNetBuy,
      totalPaid,
      totalDue
    };
  }, [filteredPurchases]);

  const itemizedPurchasedMedicines = useMemo(() => {
    const list: Array<{
      invoiceId: string;
      invoiceDate: string;
      source: string;
      tradeName: string;
      genericName?: string;
      formulation?: string;
      strength?: string;
      qty: number;
      buyPrice: number;
      sellPrice: number;
      total: number;
      expiryDate?: string;
      status?: string;
    }> = [];

    filteredPurchases.forEach(inv => {
      if (Array.isArray(inv.items)) {
        inv.items.forEach(it => {
          if (!it) return;
          list.push({
            invoiceId: inv.invoiceId,
            invoiceDate: inv.invoiceDate,
            source: inv.source,
            tradeName: it.tradeName || 'Unnamed',
            genericName: it.genericName,
            formulation: it.formulation,
            strength: it.strength,
            qty: Number(it.qtyBuying) || 0,
            buyPrice: Number(it.unitPriceBuy) || 0,
            sellPrice: Number(it.unitPriceSell) || 0,
            total: Number(it.lineTotalBuy) || ((Number(it.unitPriceBuy) || 0) * (Number(it.qtyBuying) || 0)),
            expiryDate: it.expiryDate || '',
            status: inv.status
          });
        });
      }
    });
    return list;
  }, [filteredPurchases]);

  // Store Medicines with Expiry Status
  const storeMedicinesWithExpiry = useMemo(() => {
    return safeMedicines.map(m => {
      const expInfo = getExpiryInfo(m?.expiryDate);
      return {
        ...m,
        expInfo
      };
    });
  }, [safeMedicines]);

  const storeStats = useMemo(() => {
    let totalItems = storeMedicinesWithExpiry.length;
    let totalAssetValue = 0;
    let expiredCount = 0;
    let expiringCount = 0;
    let lowStockCount = 0;

    storeMedicinesWithExpiry.forEach(m => {
      totalAssetValue += (Number(m.stock) || 0) * (Number(m.unitPriceBuy) || 0);
      if (m.expInfo.status === 'expired') expiredCount++;
      if (m.expInfo.status === 'expiring') expiringCount++;
      if ((m.stock || 0) < 10) lowStockCount++;
    });

    return { totalItems, totalAssetValue, expiredCount, expiringCount, lowStockCount };
  }, [storeMedicinesWithExpiry]);

  const filteredStoreMedicines = useMemo(() => {
    return storeMedicinesWithExpiry.filter(m => {
      if (!m) return false;
      const q = storeSearch.trim().toLowerCase();
      const matchesSearch = !q || 
        (m.tradeName || '').toLowerCase().includes(q) || 
        (m.genericName || '').toLowerCase().includes(q) || 
        (m.strength || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (storeFilterStatus === 'expired') return m.expInfo.status === 'expired';
      if (storeFilterStatus === 'expiring') return m.expInfo.status === 'expiring';
      if (storeFilterStatus === 'low_stock') return (m.stock || 0) < 10;
      return true;
    });
  }, [storeMedicinesWithExpiry, storeSearch, storeFilterStatus]);

  useEffect(() => { if (successMessage) { const timer = setTimeout(() => setSuccessMessage(''), 3000); return () => clearTimeout(timer); } }, [successMessage]);
  
  // Auto Calculations
  useEffect(() => {
    const timer = setTimeout(() => {
      const sub = purchaseFormData.items.reduce((sum, item) => sum + item.lineTotalBuy, 0);
      const net = sub - purchaseFormData.discount;
      const due = net - (purchaseFormData.paidAmount || 0);
      setPurchaseFormData(prev => ({ ...prev, totalAmount: sub, netPayable: net, dueAmount: due }));
    }, 0);
    return () => clearTimeout(timer);
  }, [purchaseFormData.items, purchaseFormData.discount, purchaseFormData.paidAmount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const sub = salesFormData.items.reduce((sum, item) => sum + item.lineTotalSell, 0);
      const net = sub - salesFormData.discount;
      const due = net - salesFormData.paidAmount;
      setSalesFormData(prev => ({ ...prev, totalAmount: sub, netPayable: net, dueAmount: due }));
    }, 0);
    return () => clearTimeout(timer);
  }, [salesFormData.items, salesFormData.discount, salesFormData.paidAmount]);

  const handleSearchChange = (term: string, type: 'buy' | 'sell') => {
    setSearchTerm(term);
    if (type === 'buy') {
        setCurrentPurchaseItem(prev => ({ ...prev, tradeName: term }));
        if (term.length > 0) {
            const matches = safeMedicines.filter(m => m && ((m.tradeName || '').toLowerCase().includes(term.toLowerCase()) || (m.genericName || '').toLowerCase().includes(term.toLowerCase())));
            setSuggestions(matches);
            setShowSuggestions(true);
        } else { setSuggestions([]); setShowSuggestions(false); }
    } else {
        setCurrentSalesItem(prev => ({ ...prev, tradeName: term }));
        if (term.length === 0) {
            setSuggestions(safeMedicines.filter(m => m && (m.stock || 0) > 0));
            setShowSuggestions(true);
        } else {
            const matches = safeMedicines.filter(m => m && (((m.tradeName || '').toLowerCase().includes(term.toLowerCase())) || ((m.genericName || '').toLowerCase().includes(term.toLowerCase()))));
            setSuggestions(matches);
            setShowSuggestions(true);
        }
    }
  };

  const handleSupplierChange = (val: string) => {
      setPurchaseFormData(prev => ({ ...prev, source: val }));
      const historySuppliers = Array.from(new Set(safeInvoices.map(i => i && i.source))).filter((s): s is string => !!s);
      const allSuppliers = Array.from(new Set([...defaultSuppliers, ...historySuppliers]));
      if (val) {
          const matches = allSuppliers.filter(s => s && s.toLowerCase().includes(val.toLowerCase()));
          setSupplierSuggestions(matches);
      } else { setSupplierSuggestions(allSuppliers); }
      setShowSupplierSuggestions(true);
  };

  const handleProcessDuePayment = async () => {
      const amt = parseFloat(paymentData.payAmount);
      if (isNaN(amt) || amt <= 0 || amt > paymentData.currentDue + 0.1) {
          alert("Invalid payment amount"); return;
      }
      
      const newInvoicesArr = safeInvoices.map(inv => {
          if (inv.invoiceId === paymentData.invoiceId) {
              const newPaid = (inv.paidAmount || 0) + amt;
              return { ...inv, paidAmount: newPaid, dueAmount: Math.max(0, (inv.netPayable || 0) - newPaid) };
          }
          return inv;
      });

      if (performBlockingSync) {
          const success = await performBlockingSync({ purchaseInvoices: newInvoicesArr });
          if (success) {
              safeSetInvoices(newInvoicesArr);
              setSuccessMessage("ডাটা সেভ হয়েছে");
              setShowPaymentModal(false);
          }
      } else {
          safeSetInvoices(newInvoicesArr);
          setSuccessMessage("Supplier payment processed!");
          setShowPaymentModal(false);
      }
  };

  const selectMedicineForPurchase = (med: Medicine) => {
      setCurrentPurchaseItem({ id: med.id, tradeName: med.tradeName, genericName: med.genericName, formulation: med.formulation, strength: med.strength, unitPriceBuy: med.unitPriceBuy, unitPriceSell: med.unitPriceSell, qtyBuying: 1, lineTotalBuy: med.unitPriceBuy, expiryDate: med.expiryDate || '' });
      setSearchTerm(med.tradeName); setSuggestions([]); setShowSuggestions(false);
  };

  const selectMedicineForSale = (med: Medicine) => {
      setCurrentSalesItem({ id: med.id, tradeName: med.tradeName, genericName: med.genericName, formulation: med.formulation, strength: med.strength, unitPriceSell: med.unitPriceSell, stock: med.stock, qtySelling: 1, lineTotalSell: med.unitPriceSell });
      setSearchTerm(med.tradeName); setSuggestions([]); setShowSuggestions(false);
  };

  const addPurchaseItem = () => {
      const tradeName = currentPurchaseItem.tradeName?.trim();
      const qty = Number(currentPurchaseItem.qtyBuying) || 0;
      const buyPrice = Number(currentPurchaseItem.unitPriceBuy) || 0;
      const sellPrice = Number(currentPurchaseItem.unitPriceSell) || 0;

      if (!tradeName) {
          alert("ঔষধের নাম (Trade Name) লিখুন!");
          return;
      }
      if (qty <= 0) {
          alert("ক্রয়ের পরিমাণ (Quantity) সঠিক হতে باشد!");
          return;
      }

      const existingMed = safeMedicines.find(m => m && m.tradeName && m.tradeName.trim().toLowerCase() === tradeName.toLowerCase());
      let itemId = currentPurchaseItem.id;
      if (!itemId && existingMed) {
          if (confirm(`"${existingMed.tradeName}" নামে ঔষধটি আগে থেকেই তালিকায় আছে। আপনি কি এই ঔষধটির সাথেই নতুন স্টক যোগ করতে চান?`)) {
              itemId = existingMed.id;
          } else { return; }
      }
      
      const newItem: InvoiceItem = { 
          ...currentPurchaseItem as InvoiceItem, 
          tradeName,
          id: itemId || `NEW-${Date.now()}`, 
          unitPriceBuy: buyPrice,
          unitPriceSell: sellPrice,
          qtyBuying: qty,
          lineTotalBuy: buyPrice * qty, 
          stock: 0, 
          defaultFrequency: '' 
      };
      
      setPurchaseFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
      setCurrentPurchaseItem({ tradeName: '', genericName: '', formulation: 'Tab', strength: '', unitPriceBuy: 0, unitPriceSell: 0, qtyBuying: 0, lineTotalBuy: 0, expiryDate: '' });
      setSearchTerm(''); 
      setShowSuggestions(false);
  };

  const addSalesItem = () => {
      if (!currentSalesItem.id) { alert("Please select a medicine from stock list only."); return; }
      const qty = Number(currentSalesItem.qtySelling) || 0; 
      const existingStock = safeMedicines.find(m => m && m.id === currentSalesItem.id)?.stock || 0;
      
      const alreadyInDraft = salesFormData.items.find(i => i && i.id === currentSalesItem.id)?.qtySelling || 0;
      const available = existingStock - alreadyInDraft;

      if (qty <= 0 || qty > available) { alert(`Invalid Quantity. Available: ${available}`); return; }

      const existingItemIdx = salesFormData.items.findIndex(i => i && i.id === currentSalesItem.id);
      if (existingItemIdx >= 0) {
          const updatedItems = [...salesFormData.items];
          updatedItems[existingItemIdx].qtySelling += qty;
          updatedItems[existingItemIdx].lineTotalSell = updatedItems[existingItemIdx].qtySelling * updatedItems[existingItemIdx].unitPriceSell;
          setSalesFormData(prev => ({ ...prev, items: updatedItems }));
      } else {
          const newItem: SalesItem = { id: currentSalesItem.id, tradeName: currentSalesItem.tradeName || '', genericName: currentSalesItem.genericName || '', formulation: currentSalesItem.formulation || '', strength: currentSalesItem.strength || '', unitPriceBuy: 0, unitPriceSell: Number(currentSalesItem.unitPriceSell) || 0, qtySelling: qty, lineTotalSell: (Number(currentSalesItem.unitPriceSell) || 0) * qty, stock: existingStock, defaultFrequency: '' };
          setSalesFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
      }
      setCurrentSalesItem({ tradeName: '', genericName: '', formulation: 'Tab', strength: '', unitPriceSell: 0, qtySelling: 0, lineTotalSell: 0, stock: 0 });
      setSearchTerm(''); setShowSuggestions(false);
  };

  const removePurchaseItem = (index: number) => { setPurchaseFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) })); };
  const removeSalesItem = (index: number) => { setSalesFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) })); };

  const handleRemoveSalesItemWithConfirm = (index: number) => {
    const item = salesFormData.items[index];
    if (!item) return;
    setConfirmModal({
      isOpen: true,
      title: '⚠️ ঔষধ আইটেম অপসারণ নিশ্চিতকরণ',
      message: `আপনি কি "${item.tradeName || 'এই ঔষধটি'}" বিক্রয় তালিকা থেকে মুছে ফেলতে চান?\n\n• পরিমাণ: ${item.qtySelling || 1}\n• মূল্য: ৳${Number(item.lineTotalSell || 0).toFixed(2)}`,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        removeSalesItem(index);
      }
    });
  };

  const handleSavePurchase = async () => {
      if (!purchaseFormData.source) { 
          setErrors({ source: true }); 
          alert("সাপ্লায়ার বা সোর্সের নাম লিখুন!");
          return; 
      }
      if (purchaseFormData.items.length === 0) {
          alert("অন্তত একটি ঔষধ তালিকায় যোগ করুন (Add বাটনে ক্লিক করে)!");
          return;
      }
      
      const isEdit = buyViewMode === 'edit';
      setConfirmModal({
          isOpen: true,
          title: isEdit ? 'ক্রয় ইনভয়েস সংশোধন নিশ্চিতকরণ' : 'ক্রয় ইনভয়েস সংরক্ষণ নিশ্চিতকরণ',
          message: `আপনি কি নিশ্চিতভাবে এই ক্রয় ইনভয়েসটি (${purchaseFormData.invoiceId}) ${isEdit ? 'আপডেট' : 'সেভ'} করতে চান?\n\n• সরবরাহকারী (Supplier): ${purchaseFormData.source}\n• মোট প্রদেয় বিল: ৳${(purchaseFormData.netPayable || 0).toFixed(2)}\n• পরিশোধিত টাকা: ৳${(purchaseFormData.paidAmount || 0).toFixed(2)}\n• বর্তমান বকেয়া: ৳${(purchaseFormData.dueAmount || 0).toFixed(2)}\n\n💡 এটি সংরক্ষণ করলে তালিকাভুক্ত ঔষধগুলোর স্টক স্বয়ংক্রিয়ভাবে সমন্বিত হবে এবং সাপ্লায়ার বকেয়া হিসেবে নির্ভুলভাবে যোগ হবে।`,
          onConfirm: executeSavePurchase
      });
  };

  const executeSavePurchase = async () => {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      setLoading(true);
      try {
          const finalStatus = isOpeningStock ? 'Initial' : 'Posted';
          
          const newMedsArr = [...safeMedicines];
          // If editing, reverse the previous invoice items quantities first
          if(buyViewMode === 'edit' && editingPurchaseId) {
              const oldInv = safeInvoices.find(x => x && (x.invoiceId === editingPurchaseId || x.id === editingPurchaseId));
              if(oldInv && Array.isArray(oldInv.items)) {
                  oldInv.items.forEach(oldItem => {
                      if (!oldItem) return;
                      const mIdx = newMedsArr.findIndex(m => m && m.id === oldItem.id);
                      if (mIdx >= 0) newMedsArr[mIdx] = { ...newMedsArr[mIdx], stock: Math.max(0, (newMedsArr[mIdx].stock || 0) - (oldItem.qtyBuying || 0)) };
                  });
              }
          }

          // Sanitize items array to ensure clean numeric values and complete properties
          const sanitizedItems = (purchaseFormData.items || []).map((it, idx) => {
              const qBuying = Number(it.qtyBuying) || 0;
              const buyP = Number(it.unitPriceBuy) || 0;
              const sellP = Number(it.unitPriceSell) || 0;
              const lineT = Number(it.lineTotalBuy) || (buyP * qBuying);
              return {
                  ...it,
                  id: it.id || `MED-ITEM-${Date.now()}-${idx}`,
                  tradeName: String(it.tradeName || '').trim(),
                  genericName: String(it.genericName || '').trim(),
                  formulation: it.formulation || 'Tab',
                  strength: String(it.strength || '').trim(),
                  unitPriceBuy: buyP,
                  unitPriceSell: sellP,
                  qtyBuying: qBuying,
                  lineTotalBuy: lineT,
                  stock: Number(it.stock) || 0,
                  defaultFrequency: it.defaultFrequency || '',
                  expiryDate: it.expiryDate || ''
              };
          });

          // Apply current form quantities to medicines stock
          sanitizedItems.forEach(item => {
              const mIdx = newMedsArr.findIndex(m => m && m.id === item.id);
              if (mIdx >= 0) { 
                  newMedsArr[mIdx] = { 
                      ...newMedsArr[mIdx], 
                      stock: (newMedsArr[mIdx].stock || 0) + Number(item.qtyBuying || 0),
                      unitPriceBuy: Number(item.unitPriceBuy || 0),
                      unitPriceSell: Number(item.unitPriceSell || 0),
                      genericName: item.genericName,
                      strength: item.strength,
                      formulation: item.formulation,
                      expiryDate: item.expiryDate
                  };
              } else { 
                  newMedsArr.push({ 
                      id: item.id || `MED-${Date.now()}-${Math.random()}`, 
                      tradeName: item.tradeName, 
                      genericName: item.genericName, 
                      formulation: item.formulation, 
                      strength: item.strength, 
                      stock: Number(item.qtyBuying || 0), 
                      unitPriceBuy: item.unitPriceBuy || 0, 
                      unitPriceSell: item.unitPriceSell || 0, 
                      expiryDate: item.expiryDate 
                  }); 
              }
          });

          // Accurately and synchronously compute financial amounts directly from sanitized items
          const subTotal = sanitizedItems.reduce((sum, it) => sum + it.lineTotalBuy, 0);
          const disc = Number(purchaseFormData.discount) || 0;
          const net = Math.max(0, subTotal - disc);
          const paid = Number(purchaseFormData.paidAmount) || 0;
          const due = Math.max(0, net - paid);

          const invId = String(purchaseFormData.invoiceId || editingPurchaseId || `PUR-${Date.now()}`).trim();
          const defaultDate = (buySearchYear !== 'all' && buySearchMonth !== 'all')
              ? `${buySearchYear}-${String(parseInt(buySearchMonth) + 1).padStart(2, '0')}-01`
              : new Date().toISOString().split('T')[0];
          const invDate = purchaseFormData.invoiceDate || defaultDate;

          const savedInvoice: PurchaseInvoice = {
              ...purchaseFormData,
              id: invId,
              invoiceId: invId,
              invoiceDate: invDate,
              items: sanitizedItems,
              totalAmount: subTotal,
              discount: disc,
              netPayable: net,
              paidAmount: paid,
              dueAmount: due,
              status: finalStatus as any,
              createdDate: purchaseFormData.createdDate || new Date().toISOString()
          };

          // 1. Direct database persistence (writes to both ncd_state and modular purchase_invoices table)
          try {
              await dbService.savePurchaseInvoiceDirectly(savedInvoice);
          } catch (dbErr) {
              console.warn("[MedicinePage] Direct purchase save notice:", dbErr);
          }

          let newInvoicesArr = [...safeInvoices];
          if (buyViewMode === 'edit') {
              newInvoicesArr = newInvoicesArr.map(inv => (inv && (inv.invoiceId === editingPurchaseId || inv.id === editingPurchaseId)) ? savedInvoice : inv);
          } else {
              newInvoicesArr = [ savedInvoice, ...newInvoicesArr.filter(x => x && x.invoiceId !== invId && x.id !== invId) ];
          }

          // 2. Automatically align month/year filters so that the user immediately sees the saved voucher in the list
          const [invY, invM] = invDate.split('-');
          if (invY && invM) {
              setBuySearchYear(invY);
              setBuySearchMonth((parseInt(invM) - 1).toString());
          }

          // 3. Update global application state & trigger blocking cloud sync
          if (performBlockingSync) {
              await performBlockingSync({ medicines: newMedsArr, purchaseInvoices: newInvoicesArr });
          }
          safeSetMedicines(newMedsArr);
          safeSetInvoices(newInvoicesArr);
          setSuccessMessage(buyViewMode === 'edit' ? "ক্রয় ইনভয়েস সফলভাবে আপডেট হয়েছে!" : "ক্রয় ইনভয়েস সফলভাবে সেভ হয়েছে!");
          setBuyViewMode('list');
          setEditingPurchaseId(null);
          setIsOpeningStock(false);
          setViewingPurchaseInvoice(savedInvoice);
      } catch (err) {
          console.error("Save error:", err);
          alert("ডাটা সেভ করার সময় একটি ত্রুটি হয়েছে।");
      } finally {
          setLoading(false);
      }
  };

  const handleReturnPurchase = async (inv: PurchaseInvoice) => {
    setConfirmModal({
        isOpen: true,
        title: '⚠️ ক্রয় ইনভয়েস ফেরত/বাতিল নিশ্চিতকরণ',
        message: `আপনি কি নিশ্চিতভাবে সরবরাহকারী "${inv.source}" এর এই ক্রয় ইনভয়েসটি (${inv.invoiceId}) ফেরত/বাতিল করতে চান?\n\n• মোট বিল: ৳${(inv.netPayable || 0).toFixed(2)}\n• পরিশোধিত ছিল: ৳${Number(inv.paidAmount || 0).toFixed(2)}\n• বকেয়া ছিল: ৳${Number(inv.dueAmount || 0).toFixed(2)}\n• ফেরতযোগ্য ঔষধ: ${(inv.items || []).length} প্রকার\n\n⚠️ সতর্কতা: এই ইনভয়েসের সকল ঔষধ ফার্মেসি স্টক থেকে স্বয়ংক্রিয়ভাবে বিয়োগ হয়ে যাবে এবং সংশ্লিষ্ট দেনা-পাওনা/বকেয়া হিসাব সমন্বয় হবে।`,
        onConfirm: () => executeReturnPurchase(inv)
    });
  };

  const executeReturnPurchase = async (inv: PurchaseInvoice) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setLoading(true);
    try {
        const newMedsArr = safeMedicines.map(m => {
            if (!m) return m;
            const items = Array.isArray(inv.items) ? inv.items : [];
            const returnedItem = items.find(it => it && it.id === m.id);
            if (returnedItem) {
                return { ...m, stock: Math.max(0, (m.stock || 0) - (returnedItem.qtyBuying || 0)) };
            }
            return m;
        });

        const newInvoicesArr = safeInvoices.filter(x => x && x.invoiceId !== inv.invoiceId);

        // Direct delete from database
        try {
            await dbService.deletePurchaseInvoiceDirectly(inv.invoiceId, inv.invoiceDate);
        } catch (delErr) {
            console.warn("[MedicinePage] Direct purchase delete notice:", delErr);
        }

        if (performBlockingSync) {
            const success = await performBlockingSync({ medicines: newMedsArr, purchaseInvoices: newInvoicesArr });
            if (success) {
                safeSetMedicines(newMedsArr);
                safeSetInvoices(newInvoicesArr);
                setSuccessMessage("ডাটা সেভ হয়েছে");
            }
        } else {
            safeSetMedicines(newMedsArr);
            safeSetInvoices(newInvoicesArr);
            setSuccessMessage("Purchase Invoice Returned & Stock Adjusted!");
        }
    } catch (err) {
        console.error("Return error:", err);
        alert("ফেরত পাঠানোর সময় একটি ত্রুটি হয়েছে।");
    } finally {
        setLoading(false);
    }
  };

  const handleSaveSales = () => {
      if (!salesFormData.customerName) { 
          setErrors({ customerName: true }); 
          alert("পেশেন্টের নাম লিখুন!");
          return; 
      }
      if (salesFormData.items.length === 0) {
          alert("অন্তত একটি ঔষধ যোগ করুন!");
          return;
      }
      
      const isEdit = sellViewMode === 'edit';
      setConfirmModal({
          isOpen: true,
          title: isEdit ? 'বিক্রয় রশিদ সংশোধন নিশ্চিতকরণ' : 'বিক্রয় রশিদ সংরক্ষণ নিশ্চিতকরণ',
          message: `আপনি কি নিশ্চিতভাবে পেশেন্ট "${salesFormData.customerName}" এর এই বিক্রয় রশিদটি (${salesFormData.invoiceId}) ${isEdit ? 'আপডেট' : 'সেভ'} করতে চান?\n\n• মোট বিল: ৳${(salesFormData.totalAmount || 0).toFixed(2)}\n• ছাড়: ৳${(salesFormData.discount || 0).toFixed(2)}\n• সর্বমোট প্রদেয়: ৳${(salesFormData.netPayable || 0).toFixed(2)}\n• ক্যাশ আদায়: ৳${(salesFormData.paidAmount || 0).toFixed(2)}\n• বর্তমান বকেয়া: ৳${(salesFormData.dueAmount || 0).toFixed(2)}\n\n💡 তথ্য: এটি সংরক্ষণ করলে বিক্রি হওয়া পরিমাণ স্টক থেকে স্বয়ংক্রিয়ভাবে বিয়োগ হবে এবং সেলস রেভিনিউ যুক্ত হবে।`,
          onConfirm: () => executeSaveSales()
      });
  };

  const executeSaveSales = async () => {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      setLoading(true);
      try {
          const newMedsArr = [...safeMedicines];
          if (sellViewMode === 'edit' && editingInvoiceId) {
              const oldInv = safeSalesInvoices.find(x => x && x.invoiceId === editingInvoiceId);
              if (oldInv && Array.isArray(oldInv.items)) {
                  oldInv.items.forEach(oldItem => {
                      if (!oldItem) return;
                      const mIdx = newMedsArr.findIndex(m => m && m.id === oldItem.id);
                      if (mIdx >= 0) newMedsArr[mIdx] = { ...newMedsArr[mIdx], stock: (newMedsArr[mIdx].stock || 0) + (oldItem.qtySelling || 0) };
                  });
              }
          }
          (salesFormData.items || []).forEach(newItem => {
              if (!newItem) return;
              const mIdx = newMedsArr.findIndex(m => m && m.id === newItem.id);
              if (mIdx >= 0) newMedsArr[mIdx] = { ...newMedsArr[mIdx], stock: Math.max(0, (newMedsArr[mIdx].stock || 0) - (newItem.qtySelling || 0)) };
          });

          const salesSubTotal = (salesFormData.items || []).reduce((sum, item) => {
              const line = Number(item.lineTotalSell) || ((Number(item.unitPriceSell) || 0) * (Number(item.qtySelling) || 0));
              return sum + line;
          }, 0);
          const salesDisc = Number(salesFormData.discount) || 0;
          const salesNet = Math.max(0, salesSubTotal - salesDisc);
          const salesPaid = Number(salesFormData.paidAmount) || 0;
          const salesDue = Math.max(0, salesNet - salesPaid);
          const slId = String(salesFormData.invoiceId || editingInvoiceId || `SL-${Date.now()}`).trim();
          const slDate = salesFormData.invoiceDate || new Date().toISOString().split('T')[0];

          const savedSalesInvoice: SalesInvoice = {
              ...salesFormData,
              id: slId,
              invoiceId: slId,
              invoiceDate: slDate,
              totalAmount: salesSubTotal,
              discount: salesDisc,
              netPayable: salesNet,
              paidAmount: salesPaid,
              dueAmount: salesDue,
              status: 'Posted',
              createdDate: salesFormData.createdDate || new Date().toISOString()
          };

          // Direct database persistence
          try {
              await dbService.saveSalesInvoiceDirectly(savedSalesInvoice);
          } catch (dbErr) {
              console.warn("[MedicinePage] Direct sales save notice:", dbErr);
          }

          let newSalesArr = [...safeSalesInvoices];
          if (sellViewMode === 'edit') {
              newSalesArr = newSalesArr.map(inv => (inv && inv.invoiceId === editingInvoiceId) ? savedSalesInvoice : inv);
          } else {
              newSalesArr = [ savedSalesInvoice, ...newSalesArr.filter(x => x && x.invoiceId !== slId && x.id !== slId) ];
          }

          if (performBlockingSync) {
              const success = await performBlockingSync({ medicines: newMedsArr, salesInvoices: newSalesArr });
              if (success) {
                  safeSetMedicines(newMedsArr);
                  safeSetSalesInvoices(newSalesArr);
                  setSuccessMessage("ডাটা সেভ হয়েছে");
                  setSellViewMode('list');
                  setEditingInvoiceId(null);
              }
          } else {
              safeSetMedicines(newMedsArr);
              safeSetSalesInvoices(newSalesArr);
              setSuccessMessage(sellViewMode === 'edit' ? "Invoice Correction Saved!" : "ডাটা সেভ হয়েছে");
              setSellViewMode('list');
              setEditingInvoiceId(null);
          }
      } catch (error) {
          console.error("Error saving sales:", error);
          alert("বিক্রি সেভ করার সময় একটি ত্রুটি হয়েছে।");
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteSaleWithConfirmation = (inv: SalesInvoice) => {
    const isLump = isLumpSumSale(inv);
    const invId = inv.invoiceId || (inv as any).id || '';
    const cust = inv.customerName || (isLump ? 'এককালীন ফার্মেসি বিক্রয়' : 'ক্রেতা');
    const amount = Number(inv.netPayable || inv.totalAmount || 0).toFixed(2);
    const itemsCount = Array.isArray(inv.items) ? inv.items.length : 0;

    setConfirmModal({
      isOpen: true,
      title: '⚠️ মেডিসিন সেলস রেকর্ড ডিলিট নিশ্চিতকরণ',
      message: `আপনি কি নিশ্চিতভাবে এই মেডিসিন সেলস রেকর্ডটি (${invId}) ডিলিট করতে চান?\n\n• বিবরণ/ক্রেতা: ${cust}\n• সর্বমোট বিল: ৳${amount}\n• তারিখ: ${inv.invoiceDate || 'N/A'}\n• মোট আইটেম: ${itemsCount} টি\n\n⚠️ সতর্কতা: ডিলিট নিশ্চিত করলে অনলাইন ডেটাবেজ (Supabase) এবং সেলস তালিকা থেকে এটি স্থায়ীভাবে মুছে ফেলা হবে এবং সংশ্লিষ্ট ওষুধের স্টক পুনরুদ্ধার হবে।`,
      onConfirm: () => executeDeleteSale(inv)
    });
  };

  const executeDeleteSale = async (inv: SalesInvoice) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    const invId = inv.invoiceId || (inv as any).id;
    const invDate = inv.invoiceDate || (inv as any).date;

    setDeleteProgressState({
      isDeleting: true,
      step: `অনলাইন ডেটাবেজ (Supabase) থেকে মেডিসিন সেলস (${invId}) ডিলিট করা হচ্ছে...`,
      isSuccess: false,
      message: ''
    });

    try {
      // 1. Restore medicine stock if not lump sum
      let newMedsArr = [...safeMedicines];
      if (!isLumpSumSale(inv) && Array.isArray(inv.items) && inv.items.length > 0) {
        newMedsArr = safeMedicines.map(m => {
          if (!m) return m;
          const returnedItem = inv.items.find(it => it && it.id === m.id);
          if (returnedItem) {
            return { ...m, stock: (m.stock || 0) + (Number(returnedItem.qtySelling) || 0) };
          }
          return m;
        });
      }

      // 2. Direct database delete
      try {
        await dbService.deleteSalesInvoiceDirectly(invId, invDate);
      } catch (delErr) {
        console.warn("[MedicinePage] Direct sales delete notice:", delErr);
      }

      // 3. Update local sales state
      const newSalesArr = safeSalesInvoices.filter(x => x && x.invoiceId !== invId && x.id !== invId);

      setDeleteProgressState(prev => prev ? {
        ...prev,
        step: 'ক্লাউড ডেটাবেজে পরিবর্তন সিঙ্ক করা হচ্ছে...'
      } : null);

      if (performBlockingSync) {
        try {
          await performBlockingSync({ medicines: newMedsArr, salesInvoices: newSalesArr });
        } catch (syncErr) {
          console.warn("[MedicinePage] Blocking sync notice:", syncErr);
        }
      }

      safeSetMedicines(newMedsArr);
      safeSetSalesInvoices(newSalesArr);
      setShowLumpSumSalesModal(false);

      // 4. Show success in overlay
      setDeleteProgressState({
        isDeleting: false,
        step: '',
        isSuccess: true,
        message: `মেডিসিন সেলস রেকর্ড (${invId}) সফলভাবে ডিলিট ও সিঙ্ক সম্পন্ন হয়েছে!`
      });

      setSuccessMessage(`মেডিসিন সেলস (${invId}) সফলভাবে মুছে ফেলা হয়েছে`);

      setTimeout(() => {
        setDeleteProgressState(null);
      }, 1500);
    } catch (err: any) {
      console.error("Delete sale error:", err);
      setDeleteProgressState({
        isDeleting: false,
        step: '',
        isSuccess: false,
        message: 'ডিলিট করার সময় ত্রুটি হয়েছে: ' + (err?.message || 'অজানা ত্রুটি')
      });
      setTimeout(() => {
        setDeleteProgressState(null);
      }, 2500);
    }
  };

  const handleReturnSale = (inv: SalesInvoice) => {
      setConfirmModal({
          isOpen: true,
          title: '⚠️ বিক্রয় রশিদ ফেরত/বাতিল নিশ্চিতকরণ',
          message: `আপনি কি নিশ্চিতভাবে পেশেন্ট "${inv.customerName}" এর বিক্রয় ইনভয়েসটি (${inv.invoiceId}) বাতিল/ফেরত নিতে চান?\n\n• মোট বিল: ৳${(inv.netPayable || 0).toFixed(2)}\n• ফেরতযোগ্য ঔষধ: ${(inv.items || []).length} প্রকার\n\n⚠️ সতর্কতা: ফেরত নেওয়া ঔষধগুলো ফার্মেসি স্টকে স্বয়ংক্রিয়ভাবে পুনরায় যোগ হবে এবং সেলস হিসাব সমন্বয় হবে।`,
          onConfirm: () => executeReturnSale(inv)
      });
  };

  const executeReturnSale = async (inv: SalesInvoice) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    const invId = inv.invoiceId || (inv as any).id;
    const invDate = inv.invoiceDate || (inv as any).date;

    setDeleteProgressState({
      isDeleting: true,
      step: `সেলস রিটার্ন প্রসেস এবং স্টক রিস্টোর করা হচ্ছে (${invId})...`,
      isSuccess: false,
      message: ''
    });

    try {
        const newMedsArr = safeMedicines.map(m => {
            if (!m) return m;
            const items = Array.isArray(inv.items) ? inv.items : [];
            const returnedItem = items.find(it => it && it.id === m.id);
            if (returnedItem) return { ...m, stock: (m.stock || 0) + (returnedItem.qtySelling || 0) };
            return m;
        });
        
        const newSalesArr = safeSalesInvoices.filter(x => x && x.invoiceId !== inv.invoiceId && x.id !== inv.invoiceId);

        // Direct delete from database
        try {
            await dbService.deleteSalesInvoiceDirectly(invId, invDate);
        } catch (delErr) {
            console.warn("[MedicinePage] Direct sales delete notice:", delErr);
        }
    
        if (performBlockingSync) {
            await performBlockingSync({ medicines: newMedsArr, salesInvoices: newSalesArr });
        }

        safeSetMedicines(newMedsArr);
        safeSetSalesInvoices(newSalesArr);
        setSuccessMessage("Return Processed! Stock Restored.");

        setDeleteProgressState({
          isDeleting: false,
          step: '',
          isSuccess: true,
          message: `বিক্রয় ইনভয়েস (${invId}) সফলভাবে ফেরত/বাতিল এবং স্টক রিস্টোর হয়েছে!`
        });

        setTimeout(() => {
          setDeleteProgressState(null);
        }, 1500);
    } catch (err: any) {
        console.error("Return error:", err);
        setDeleteProgressState({
          isDeleting: false,
          step: '',
          isSuccess: false,
          message: 'ফেরত নেওয়ার সময় একটি ত্রুটি হয়েছে: ' + (err?.message || 'অজানা ত্রুটি')
        });
        setTimeout(() => {
          setDeleteProgressState(null);
        }, 2500);
    }
  };

  const startEditSale = (inv: SalesInvoice) => {
    setSalesFormData({...inv});
    setEditingInvoiceId(inv.invoiceId);
    setSellViewMode('edit');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleSaveClinicalDrug = () => {
    if (!clinicalDrugForm.brandName || !clinicalDrugForm.genericName) return;
    if (isEditingDrug) safeSetClinicalDrugs(prev => (Array.isArray(prev) ? prev : []).map(d => d.id === clinicalDrugForm.id ? clinicalDrugForm : d));
    else safeSetClinicalDrugs(prev => [{ ...clinicalDrugForm, id: Date.now().toString() }, ...(Array.isArray(prev) ? prev : [])]);
    setClinicalDrugForm({ id: '', brandName: '', genericName: '', strength: '', formulation: 'Tab', company: '', pregnancyCategory: 'B', indications: [], sideEffects: [], adultDose: '' });
    setIsEditingDrug(false);
    setSuccessMessage("Drug Database updated!");
  };

  const handleManualAdjustment = async () => {
    const qty = parseFloat(adjustmentData.adjustmentQty);
    const sellPrice = parseFloat(adjustmentData.newSellingPrice);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }
    if (isNaN(sellPrice) || sellPrice < 0) {
      alert("Please enter a valid selling price.");
      return;
    }

    const newMedsArr = safeMedicines.map(m => {
      if (m && m.id === adjustmentData.medicineId) {
        const newStock = adjustmentData.adjustmentType === 'add' 
          ? (m.stock || 0) + qty 
          : Math.max(0, (m.stock || 0) - qty);
        return {
          ...m,
          stock: newStock,
          unitPriceSell: sellPrice,
        };
      }
      return m;
    });

    if (performBlockingSync) {
        const success = await performBlockingSync({ medicines: newMedsArr });
        if (success) {
            safeSetMedicines(newMedsArr);
            setSuccessMessage("ডাটা সঠিকভাবে সেভ হয়েছে!");
            setShowAdjustmentModal(false);
        }
    } else {
        safeSetMedicines(newMedsArr);
        setSuccessMessage(`Stock adjusted for ${adjustmentData.tradeName}`);
        setShowAdjustmentModal(false);
    }
  };

  // --- PRINT FUNCTIONS ---
  const handlePrintPurchase = (inv: PurchaseInvoice) => {
    const printContent = `<html><head><title>Purchase ${inv.invoiceId}</title><style>
      @page { size: A4; margin: 12mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #111; margin: 0; }
      .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
      .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 0.5px; }
      .header p { margin: 3px 0; font-size: 12px; color: #444; font-weight: 600; }
      .badge { display: inline-block; background: #111; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 14px; border-radius: 12px; margin-top: 4px; text-transform: uppercase; }
      .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 16px; background: #f8f9fa; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; }
      .meta-col { line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
      th, td { border: 1px solid #ccc; padding: 7px 8px; text-align: left; }
      th { background: #eef2f7; font-weight: bold; text-transform: uppercase; font-size: 10px; }
      .total-area { margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
      .notes { font-size: 10px; color: #666; max-width: 50%; line-height: 1.5; }
      .totals-box { width: 240px; font-size: 12px; background: #fafafa; border: 1px solid #ddd; padding: 10px 12px; border-radius: 6px; }
      .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
      .totals-net { font-size: 13px; font-weight: bold; border-top: 1px solid #111; border-bottom: 1px solid #111; padding: 4px 0; margin: 4px 0; }
      .sig-area { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
      .sig-line { border-top: 1px solid #111; width: 160px; text-align: center; padding-top: 4px; }
    </style></head><body>
      <div class="header">
        <h1>Niramoy Clinic & Diagnostic</h1>
        <p>এনায়েতপুর মন্ডলপাড়া, এনায়েতপুর, সিরাজগঞ্জ | মোবাইল: 01730 923007</p>
        <div class="badge">ঔষধ ক্রয় রশিদ / PURCHASE VOUCHER</div>
      </div>
      <div class="meta">
        <div class="meta-col">
          <div><b>ইনভয়েস নং (Invoice #):</b> ${inv.invoiceId}</div>
          <div><b>ক্রয় তারিখ (Date):</b> ${inv.invoiceDate}</div>
        </div>
        <div class="meta-col" style="text-align: right;">
          <div><b>সরবরাহকারী (Supplier):</b> ${inv.source}</div>
          <div><b>বিল প্রস্তুতকারক:</b> ${inv.billCreatedBy || 'Admin'}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th>ঔষধের নাম ও শক্তি (Medicine Name)</th>
            <th>জেনেরিক (Generic)</th>
            <th style="text-align: center;">ফর্ম</th>
            <th style="text-align: center;">মেয়াদ (Expiry)</th>
            <th style="text-align: center;">পরিমাণ</th>
            <th style="text-align: right;">ক্রয়মূল্য</th>
            <th style="text-align: right;">বিক্রয়মূল্য</th>
            <th style="text-align: right;">মোট টাকা (৳)</th>
          </tr>
        </thead>
        <tbody>
          ${(inv.items || []).map((i, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td><b>${i.tradeName}</b> ${i.strength || ''}</td>
              <td style="color: #555; font-style: italic;">${i.genericName || '-'}</td>
              <td style="text-align: center; text-transform: uppercase;">${i.formulation || '-'}</td>
              <td style="text-align: center; font-weight: bold;">${i.expiryDate || 'N/A'}</td>
              <td style="text-align: center; font-weight: bold;">${i.qtyBuying}</td>
              <td style="text-align: right;">৳${Number(i.unitPriceBuy || 0).toFixed(2)}</td>
              <td style="text-align: right;">৳${Number(i.unitPriceSell || 0).toFixed(2)}</td>
              <td style="text-align: right; font-weight: bold;">৳${Number(i.lineTotalBuy || (i.qtyBuying * i.unitPriceBuy) || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="total-area">
        <div class="notes">
          <p>• ঔষধ গ্রহণের সময় সিল ও মেয়াদ পরীক্ষা করে নিশ্চিত হোন।</p>
          <p>• কম্পিউটারাইজড ক্রয় ভাউচার — নিরাময় ক্লিনিক অ্যান্ড ডায়াগনস্টিক।</p>
        </div>
        <div class="totals-box">
          <div class="totals-row"><span>মোট বিল (Sub Total):</span> <span>৳${(inv.totalAmount || 0).toFixed(2)}</span></div>
          ${Number(inv.discount || 0) > 0 ? `<div class="totals-row" style="color: green;"><span>ছাড় (Discount):</span> <span>- ৳${Number(inv.discount || 0).toFixed(2)}</span></div>` : ''}
          <div class="totals-row totals-net"><span>সর্বমোট প্রদেয় (Net):</span> <span>৳${(inv.netPayable || 0).toFixed(2)}</span></div>
          <div class="totals-row" style="color: #0b7285;"><span>পরিশোধিত (Paid):</span> <span>৳${Number(inv.paidAmount || 0).toFixed(2)}</span></div>
          <div class="totals-row" style="color: #c92a2a; font-weight: bold;"><span>বকেয়া (Due):</span> <span>৳${Number(inv.dueAmount || 0).toFixed(2)}</span></div>
        </div>
      </div>
      <div class="sig-area">
        <div class="sig-line">সরবরাহকারীর স্বাক্ষর</div>
        <div class="sig-line">গ্রহণকারীর স্বাক্ষর</div>
      </div>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 250);
    }
  };

  const handlePrintSale = (inv: SalesInvoice) => {
    const printContent = `<html><head><title>Sale ${inv.invoiceId}</title><style>
      @page { size: A4; margin: 12mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #111; margin: 0; }
      .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
      .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 0.5px; }
      .header p { margin: 3px 0; font-size: 12px; color: #444; font-weight: 600; }
      .badge { display: inline-block; background: #059669; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 14px; border-radius: 12px; margin-top: 4px; text-transform: uppercase; }
      .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 16px; background: #f8f9fa; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; }
      .meta-col { line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
      th, td { border: 1px solid #ccc; padding: 7px 8px; text-align: left; }
      th { background: #eef2f7; font-weight: bold; text-transform: uppercase; font-size: 10px; }
      .total-area { margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
      .notes { font-size: 10px; color: #666; max-width: 50%; line-height: 1.5; }
      .totals-box { width: 240px; font-size: 12px; background: #fafafa; border: 1px solid #ddd; padding: 10px 12px; border-radius: 6px; }
      .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
      .totals-net { font-size: 13px; font-weight: bold; border-top: 1px solid #111; border-bottom: 1px solid #111; padding: 4px 0; margin: 4px 0; }
      .sig-area { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
      .sig-line { border-top: 1px solid #111; width: 160px; text-align: center; padding-top: 4px; }
    </style></head><body>
      <div class="header">
        <h1>Niramoy Clinic & Diagnostic</h1>
        <p>এনায়েতপুর মন্ডলপাড়া, এনায়েতপুর, সিরাজগঞ্জ | মোবাইল: 01730 923007</p>
        <div class="badge">ঔষধ বিক্রয় রশিদ / CASH MEMO</div>
      </div>
      <div class="meta">
        <div class="meta-col">
          <div><b>রশিদ নং (Invoice #):</b> ${inv.invoiceId}</div>
          <div><b>তারিখ (Date):</b> ${inv.invoiceDate}</div>
          <div><b>রেফারার ডাক্তার:</b> ${inv.refDoctorName || 'Self / Duty Doctor'}</div>
        </div>
        <div class="meta-col" style="text-align: right;">
          <div><b>পেশেন্টের নাম:</b> <b>${inv.customerName}</b></div>
          <div><b>মোবাইল:</b> ${inv.customerMobile || '-'}</div>
          <div><b>বিল প্রস্তুতকারক:</b> ${inv.billCreatedBy || 'Admin'}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th>ঔষধের নাম ও শক্তি (Medicine Info)</th>
            <th>জেনেরিক (Generic)</th>
            <th style="text-align: center;">পরিমাণ (Qty)</th>
            <th style="text-align: right;">ইউনিট মূল্য</th>
            <th style="text-align: right;">মোট টাকা (৳)</th>
          </tr>
        </thead>
        <tbody>
          ${(inv.items || []).map((i, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td><b>${i.tradeName}</b> ${i.strength || ''}</td>
              <td style="color: #555; font-style: italic;">${i.genericName || '-'}</td>
              <td style="text-align: center; font-weight: bold;">${i.qtySelling}</td>
              <td style="text-align: right;">৳${Number(i.unitPriceSell || 0).toFixed(2)}</td>
              <td style="text-align: right; font-weight: bold;">৳${Number(i.lineTotalSell || (i.qtySelling * i.unitPriceSell) || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="total-area">
        <div class="notes">
          <p>• বিক্রিত ঔষধ ফেরত নেওয়া হয় না।</p>
          <p>• চিকিৎসকের পরামর্শ ব্যতীত ঔষধ সেবন করবেন না।</p>
          <p>• কম্পিউটারাইজড বিক্রয় রশিদ — নিরাময় ক্লিনিক অ্যান্ড ডায়াগনস্টিক।</p>
        </div>
        <div class="totals-box">
          <div class="totals-row"><span>মোট বিল (Gross Bill):</span> <span>৳${Number(inv.totalAmount || 0).toFixed(2)}</span></div>
          ${Number(inv.discount || 0) > 0 ? `<div class="totals-row" style="color: green;"><span>ছাড় (Discount):</span> <span>- ৳${Number(inv.discount || 0).toFixed(2)}</span></div>` : ''}
          <div class="totals-row totals-net"><span>সর্বমোট প্রদেয় (Net Bill):</span> <span>৳${Number(inv.netPayable || 0).toFixed(2)}</span></div>
          <div class="totals-row" style="color: #0b7285;"><span>আদায়কৃত টাকা (Paid):</span> <span>৳${Number(inv.paidAmount || 0).toFixed(2)}</span></div>
          ${Number(inv.dueAmount || 0) > 0 ? `<div class="totals-row" style="color: #c92a2a; font-weight: bold;"><span>বকেয়া (Due):</span> <span>৳${Number(inv.dueAmount || 0).toFixed(2)}</span></div>` : ''}
        </div>
      </div>
      <div class="sig-area">
        <div class="sig-line">গ্রাহকের স্বাক্ষর</div>
        <div class="sig-line">ক্যাশিয়ারের স্বাক্ষর</div>
      </div>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 250);
    }
  };

  // --- MONTHLY LIST REPORT PRINT FUNCTIONS ---
  const handlePrintPurchaseMonthlyReport = (invoicesToPrint: PurchaseInvoice[], periodTitle: string) => {
    const totalBill = invoicesToPrint.reduce((acc, i) => acc + (Number(i.netPayable) || 0), 0);
    const totalPaid = invoicesToPrint.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0);
    const totalDue = invoicesToPrint.reduce((acc, i) => acc + (Number(i.dueAmount) || 0), 0);
    const totalQty = invoicesToPrint.reduce((acc, i) => acc + (Array.isArray(i.items) ? i.items.reduce((sum, item) => sum + (Number(item.qtyBuying) || 0), 0) : 0), 0);

    const printContent = `<html><head><title>Purchase Report - ${periodTitle}</title><style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #111; margin: 0; }
      .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 12px; }
      .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
      .header p { margin: 2px 0; font-size: 11px; color: #444; }
      .title-banner { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 12px; font-size: 11px; }
      .summary-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; }
      .scard { border: 1px solid #cbd5e1; background: #f8fafc; padding: 6px 10px; border-radius: 6px; text-align: center; }
      .scard-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
      .scard-val { font-size: 14px; font-weight: bold; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
      th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: left; }
      th { background: #e2e8f0; font-weight: bold; text-transform: uppercase; font-size: 9.5px; }
      .sig-area { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
      .sig-line { border-top: 1px solid #111; width: 180px; text-align: center; padding-top: 4px; }
    </style></head><body>
      <div class="header">
        <h1>Niramoy Clinic & Diagnostic</h1>
        <p>এনায়েতপুর মন্ডলপাড়া, এনায়েতপুর, সিরাজগঞ্জ | মোবাইল: 01730 923007</p>
        <div style="font-size: 13px; font-weight: bold; margin-top: 3px;">ঔষধ ক্রয় মাসিক রিপোর্ট (Medicine Purchase Monthly / Periodic Report)</div>
      </div>
      <div class="title-banner">
        <div><b>সময়কাল / ফিল্টার:</b> ${periodTitle}</div>
        <div><b>মোট ইনভয়েস:</b> ${invoicesToPrint.length} টি | <b>মোট ঔষধ:</b> ${totalQty} পিস</div>
        <div><b>রিপোর্ট প্রিন্টের সময়:</b> ${new Date().toLocaleDateString('bn-BD')}</div>
      </div>
      <div class="summary-cards">
        <div class="scard"><div class="scard-label">মোট ইনভয়েস</div><div class="scard-val">${invoicesToPrint.length} টি</div></div>
        <div class="scard"><div class="scard-label">মোট ঔষধ ক্রয় (Qty)</div><div class="scard-val" style="color: #0284c7;">${totalQty} পিস</div></div>
        <div class="scard"><div class="scard-label">মোট ক্রয় মূল্য</div><div class="scard-val" style="color: #b45309;">৳${totalBill.toFixed(2)}</div></div>
        <div class="scard"><div class="scard-label">মোট পরিশোধিত</div><div class="scard-val" style="color: #16a34a;">৳${totalPaid.toFixed(2)}</div></div>
        <div class="scard"><div class="scard-label">মোট বকেয়া (Due)</div><div class="scard-val" style="color: #dc2626;">৳${totalDue.toFixed(2)}</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">ক্রমিক</th>
            <th style="width: 90px;">ইনভয়েস নং</th>
            <th style="width: 75px;">তারিখ</th>
            <th>সরবরাহকারী (Supplier)</th>
            <th style="text-align: center; width: 60px;">আইটেম</th>
            <th style="text-align: right; width: 85px;">মোট বিল (৳)</th>
            <th style="text-align: right; width: 85px;">পরিশোধ (৳)</th>
            <th style="text-align: right; width: 85px;">বকেয়া (৳)</th>
            <th style="text-align: center; width: 65px;">স্ট্যাটাস</th>
          </tr>
        </thead>
        <tbody>
          ${invoicesToPrint.map((inv, idx) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
              <td style="font-family: monospace; font-weight: bold;">${inv.invoiceId}</td>
              <td>${inv.invoiceDate}</td>
              <td><b>${inv.source}</b></td>
              <td style="text-align: center;">${Array.isArray(inv.items) ? inv.items.length : 0} টি</td>
              <td style="text-align: right; font-weight: bold;">৳${(inv.netPayable || 0).toFixed(2)}</td>
              <td style="text-align: right; color: #16a34a;">৳${Number(inv.paidAmount || 0).toFixed(2)}</td>
              <td style="text-align: right; color: #dc2626; font-weight: bold;">৳${Number(inv.dueAmount || 0).toFixed(2)}</td>
              <td style="text-align: center; font-size: 9px;">${inv.status || 'Posted'}</td>
            </tr>
          `).join('')}
          <tr style="background: #e2e8f0; font-weight: bold; font-size: 11px;">
            <td colspan="5" style="text-align: right; padding: 6px;">সর্বমোট (Grand Total):</td>
            <td style="text-align: right;">৳${totalBill.toFixed(2)}</td>
            <td style="text-align: right; color: #16a34a;">৳${totalPaid.toFixed(2)}</td>
            <td style="text-align: right; color: #dc2626;">৳${totalDue.toFixed(2)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div class="sig-area">
        <div class="sig-line">ফার্মাসিস্ট / স্টোরকিপার</div>
        <div class="sig-line">হিসাবরক্ষকের স্বাক্ষর</div>
        <div class="sig-line">ম্যানেজার / পরিচালকের স্বাক্ষর</div>
      </div>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 250);
    }
  };

  const handlePrintSalesMonthlyReport = (salesToPrint: SalesInvoice[], periodTitle: string) => {
    const totalBill = salesToPrint.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0);
    const totalNet = salesToPrint.reduce((acc, i) => acc + (Number(i.netPayable) || 0), 0);
    const totalPaid = salesToPrint.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0);
    const totalDue = salesToPrint.reduce((acc, i) => acc + (Number(i.dueAmount) || 0), 0);

    const printContent = `<html><head><title>Sales Report - ${periodTitle}</title><style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #111; margin: 0; }
      .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 12px; }
      .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
      .header p { margin: 2px 0; font-size: 11px; color: #444; }
      .title-banner { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 12px; font-size: 11px; }
      .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
      .scard { border: 1px solid #cbd5e1; background: #f8fafc; padding: 6px 10px; border-radius: 6px; text-align: center; }
      .scard-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
      .scard-val { font-size: 14px; font-weight: bold; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
      th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: left; }
      th { background: #e2e8f0; font-weight: bold; text-transform: uppercase; font-size: 9.5px; }
      .sig-area { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
      .sig-line { border-top: 1px solid #111; width: 180px; text-align: center; padding-top: 4px; }
    </style></head><body>
      <div class="header">
        <h1>Niramoy Clinic & Diagnostic</h1>
        <p>এনায়েতপুর মন্ডলপাড়া, এনায়েতপুর, সিরাজগঞ্জ | মোবাইল: 01730 923007</p>
        <div style="font-size: 13px; font-weight: bold; margin-top: 3px;">ঔষধ বিক্রয় মাসিক রিপোর্ট (Medicine Sales Monthly / Periodic Report)</div>
      </div>
      <div class="title-banner">
        <div><b>সময়কাল / ফিল্টার:</b> ${periodTitle}</div>
        <div><b>মোট বিক্রয় রসিদ:</b> ${salesToPrint.length} টি</div>
        <div><b>রিপোর্ট প্রিন্টের সময়:</b> ${new Date().toLocaleDateString('bn-BD')}</div>
      </div>
      <div class="summary-cards">
        <div class="scard"><div class="scard-label">মোট বিক্রয় ইনভয়েস</div><div class="scard-val">${salesToPrint.length} টি</div></div>
        <div class="scard"><div class="scard-label">মোট নেট বিক্রয় মূল্য</div><div class="scard-val" style="color: #0284c7;">৳${totalNet.toFixed(2)}</div></div>
        <div class="scard"><div class="scard-label">মোট ক্যাশ আদায়</div><div class="scard-val" style="color: #16a34a;">৳${totalPaid.toFixed(2)}</div></div>
        <div class="scard"><div class="scard-label">মোট বকেয়া (Due)</div><div class="scard-val" style="color: #dc2626;">৳${totalDue.toFixed(2)}</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">ক্রমিক</th>
            <th style="width: 90px;">ইনভয়েস নং</th>
            <th style="width: 75px;">তারিখ</th>
            <th>পেশেন্টের নাম (Customer)</th>
            <th style="width: 85px;">মোবাইল</th>
            <th style="text-align: center; width: 55px;">আইটেম</th>
            <th style="text-align: right; width: 85px;">মোট বিল (৳)</th>
            <th style="text-align: right; width: 85px;">আদায়কৃত (৳)</th>
            <th style="text-align: right; width: 85px;">বকেয়া (৳)</th>
            <th style="text-align: center; width: 65px;">স্ট্যাটাস</th>
          </tr>
        </thead>
        <tbody>
          ${salesToPrint.map((inv, idx) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
              <td style="font-family: monospace; font-weight: bold;">${inv.invoiceId}</td>
              <td>${inv.invoiceDate}</td>
              <td><b>${inv.customerName}</b></td>
              <td>${inv.customerMobile || '-'}</td>
              <td style="text-align: center;">${Array.isArray(inv.items) ? inv.items.length : 0} টি</td>
              <td style="text-align: right; font-weight: bold;">৳${(inv.netPayable || 0).toFixed(2)}</td>
              <td style="text-align: right; color: #16a34a;">৳${Number(inv.paidAmount || 0).toFixed(2)}</td>
              <td style="text-align: right; color: #dc2626; font-weight: bold;">৳${Number(inv.dueAmount || 0).toFixed(2)}</td>
              <td style="text-align: center; font-size: 9px;">${inv.status || 'Posted'}</td>
            </tr>
          `).join('')}
          <tr style="background: #e2e8f0; font-weight: bold; font-size: 11px;">
            <td colspan="6" style="text-align: right; padding: 6px;">সর্বমোট (Grand Total):</td>
            <td style="text-align: right;">৳${totalNet.toFixed(2)}</td>
            <td style="text-align: right; color: #16a34a;">৳${totalPaid.toFixed(2)}</td>
            <td style="text-align: right; color: #dc2626;">৳${totalDue.toFixed(2)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div class="sig-area">
        <div class="sig-line">ক্যাশিয়ার / ফার্মাসিস্ট</div>
        <div class="sig-line">হিসাবরক্ষকের স্বাক্ষর</div>
        <div class="sig-line">ম্যানেজার / পরিচালকের স্বাক্ষর</div>
      </div>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 250);
    }
  };

  const handlePrintStore = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `
      <html>
        <head>
          <title>Medicine Stock Inventory</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-10">
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold uppercase">Niramoy Clinic & Diagnostic</h1>
            <p>Medicine Stock Inventory - ${new Date().toLocaleDateString()}</p>
          </div>
          <table class="w-full border-collapse border border-slate-400 text-sm">
            <thead>
              <tr class="bg-slate-100">
                <th class="border border-slate-400 p-2">Medicine Name</th>
                <th class="border border-slate-400 p-2">Generic Name</th>
                <th class="border border-slate-400 p-2 text-center">Expiry Status</th>
                <th class="border border-slate-400 p-2 text-center">Stock</th>
                <th class="border border-slate-400 p-2 text-right">Buy Price</th>
                <th class="border border-slate-400 p-2 text-right">Asset Value</th>
              </tr>
            </thead>
            <tbody>
              ${safeMedicines.map(m => {
                const exp = getExpiryInfo(m?.expiryDate);
                const isExp = exp.status === 'expired';
                return `
                <tr class="${isExp ? 'bg-red-50 text-red-900 font-semibold' : ''}">
                  <td class="border border-slate-400 p-2 font-bold">${m.tradeName || ''} ${m.strength || ''}</td>
                  <td class="border border-slate-400 p-2 italic text-slate-600">${m.genericName || ''}</td>
                  <td class="border border-slate-400 p-2 text-center ${isExp ? 'text-red-600 font-black' : ''}">
                    ${m.expiryDate || 'N/A'} ${isExp ? ' [মেয়াদোত্তীর্ণ]' : ''}
                  </td>
                  <td class="border border-slate-400 p-2 text-center">${m.stock || 0}</td>
                  <td class="border border-slate-400 p-2 text-right">${Number(m.unitPriceBuy || 0).toFixed(2)}</td>
                  <td class="border border-slate-400 p-2 text-right font-bold">${((m.stock || 0) * (m.unitPriceBuy || 0)).toFixed(2)}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr class="bg-slate-50 font-bold">
                <td colspan="5" class="border border-slate-400 p-2 text-right">Total Asset Value:</td>
                <td class="border border-slate-400 p-2 text-right">৳${safeMedicines.reduce((sum, m) => sum + ((m.stock || 0) * (m.unitPriceBuy || 0)), 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;
    win.document.write(html); win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handlePrintHishab = () => {
    const monthName = monthOptions[selectedMonth]?.name || '';
    const filteredPurchases = safeInvoices.filter(inv => {
        if (!inv || !inv.invoiceDate || inv.status === 'Cancelled' || inv.status === 'Initial' || inv.status === 'Deleted') return false;
        const [y, m] = inv.invoiceDate.split('-').map(Number);
        return (m - 1) === selectedMonth && y === selectedYear;
    });
    const filteredSales = safeSalesInvoices.filter(inv => {
        if (!inv || !inv.invoiceDate || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return false;
        const [y, m] = inv.invoiceDate.split('-').map(Number);
        return (m - 1) === selectedMonth && y === selectedYear;
    });

    const indoorSalesTotal = safeIndoorInvoices.filter(inv => {
        if (!inv) return false;
        const dateToUse = inv.invoice_date || inv.admission_date || (inv as any).date || '';
        if (!dateToUse || typeof dateToUse !== 'string' || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return false;
        const parts = dateToUse.split('-');
        if (parts.length < 2) return false;
        const [y, m] = parts.map(Number);
        return (m - 1) === selectedMonth && y === selectedYear;
    }).reduce((sum, inv) => {
        const items = Array.isArray(inv.items) ? inv.items : [];
        return sum + items.filter(it => it && (it.service_type === 'Medicine' || it.service_type === 'ঔষধ' || (it.service_type || '').toLowerCase().includes('med'))).reduce((s, it) => s + (Number(it.payable_amount) || Number(it.line_total) || 0), 0);
    }, 0);

    const buyTotal = filteredPurchases.reduce((sum, inv) => sum + (Number(inv.netPayable) || 0), 0);
    const outdoorSaleTotal = filteredSales.reduce((sum, inv) => sum + (Number(inv.netPayable) || 0), 0);
    const grandSaleTotal = outdoorSaleTotal + indoorSalesTotal;
    const netProfit = grandSaleTotal - buyTotal;

    const win = window.open('', '_blank');
    if (!win) return;
    const html = `
      <html>
        <head>
          <title>মেডিসিন মাসিক লেজার রিপোর্ট - ${monthName} ${selectedYear}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1e293b; margin: 0; padding: 10px; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
            .header p { margin: 2px 0 0; font-size: 10.5px; color: #475569; }
            .title-banner { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 11px; }
            .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
            .scard { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; background: #fff; text-align: center; }
            .scard-label { font-size: 9.5px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .scard-val { font-size: 13px; font-weight: 900; margin-top: 2px; }
            .tables-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background: #e2e8f0; color: #0f172a; padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; text-align: left; }
            td { padding: 4px 5px; border: 1px solid #cbd5e1; }
            tfoot tr td { background: #f8fafc; font-weight: bold; }
            .badge-lump { display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; font-size: 8.5px; font-weight: bold; padding: 0.5px 3.5px; border-radius: 3px; margin-left: 3px; }
            .sig-area { margin-top: 24px; display: flex; justify-content: space-between; padding-top: 15px; }
            .sig-line { border-top: 1px dashed #64748b; width: 130px; text-align: center; font-size: 10px; color: #475569; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Niramoy Clinic & Diagnostic</h1>
            <p>এনায়েতপুর মন্ডলপাড়া, এনায়েতপুর, সিরাজগঞ্জ | মোবাইল: 01730 923007</p>
            <div style="font-size: 12px; font-weight: bold; margin-top: 3px; color: #0284c7;">ঔষধ লেজার ও হিসাব বিশ্লেষণ (Medicine Monthly Ledger Report)</div>
          </div>
          <div class="title-banner">
            <div><b>মাস ও বছর:</b> ${monthName}, ${selectedYear}</div>
            <div><b>প্রিন্টের তারিখ:</b> ${new Date().toLocaleDateString('bn-BD')}</div>
            <div><b>মোট রেকর্ড:</b> ক্রয় ${filteredPurchases.length} টি | বিক্রয় ${filteredSales.length} টি</div>
          </div>
          <div class="summary-cards">
            <div class="scard"><div class="scard-label">মোট ঔষধ ক্রয়</div><div class="scard-val" style="color: #dc2626;">৳${buyTotal.toFixed(2)}</div></div>
            <div class="scard"><div class="scard-label">আউটডোর বিক্রয়</div><div class="scard-val" style="color: #16a34a;">৳${outdoorSaleTotal.toFixed(2)}</div></div>
            <div class="scard"><div class="scard-label">ইনডোর ঔষধ বিক্রয়</div><div class="scard-val" style="color: #7c3aed;">৳${indoorSalesTotal.toFixed(2)}</div></div>
            <div class="scard"><div class="scard-label">নিট লাভ / উদ্বৃত্ত</div><div class="scard-val" style="color: ${netProfit >= 0 ? '#0284c7' : '#dc2626'};">৳${netProfit.toFixed(2)}</div></div>
          </div>
          <div class="tables-grid">
            <div>
              <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; color: #0369a1; border-bottom: 2px solid #0284c7; padding-bottom: 2px;">ক্রয় খতিয়ান (Stock Purchase Ledger)</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 65px;">তারিখ</th>
                    <th>সরবরাহকারী (Supplier)</th>
                    <th style="text-align: right; width: 65px;">টাকা (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredPurchases.map(inv => {
                    const isLump = isLumpSumPurchase(inv);
                    return `
                      <tr>
                        <td>${inv.invoiceDate}</td>
                        <td><b>${inv.source}</b> ${isLump ? '<span class="badge-lump">এককালীন</span>' : ''}</td>
                        <td style="text-align: right; font-weight: bold;">৳${(Number(inv.netPayable) || 0).toFixed(2)}</td>
                      </tr>
                    `;
                  }).join('')}
                  ${filteredPurchases.length === 0 ? '<tr><td colspan="3" style="text-align:center; color:#94a3b8; padding:12px;">কোনো ক্রয় রেকর্ড নেই</td></tr>' : ''}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="text-align: right; padding: 5px;">মোট ক্রয় (Total Buy):</td>
                    <td style="text-align: right; color: #dc2626; font-weight: 900;">৳${buyTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; color: #15803d; border-bottom: 2px solid #16a34a; padding-bottom: 2px;">বিক্রয় খতিয়ান (Sales Journal)</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 65px;">তারিখ</th>
                    <th>খাত / বিবরণ</th>
                    <th style="text-align: right; width: 65px;">টাকা (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredSales.map(inv => {
                    const isLump = isLumpSumSale(inv);
                    return `
                      <tr>
                        <td>${inv.invoiceDate}</td>
                        <td><b>${inv.customerName}</b> ${isLump ? '<span class="badge-lump">এককালীন</span>' : ''}</td>
                        <td style="text-align: right; font-weight: bold; color: #15803d;">৳${(Number(inv.netPayable) || 0).toFixed(2)}</td>
                      </tr>
                    `;
                  }).join('')}
                  ${indoorSalesTotal > 0 ? `
                    <tr style="background: #faf5ff;">
                      <td>-</td>
                      <td><b>ইনডোর মোট ঔষধ বিক্রয়</b></td>
                      <td style="text-align: right; font-weight: bold; color: #7c3aed;">৳${indoorSalesTotal.toFixed(2)}</td>
                    </tr>
                  ` : ''}
                  ${filteredSales.length === 0 && indoorSalesTotal === 0 ? '<tr><td colspan="3" style="text-align:center; color:#94a3b8; padding:12px;">কোনো বিক্রয় রেকর্ড নেই</td></tr>' : ''}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="text-align: right; padding: 5px;">মোট বিক্রয় (Total Sell):</td>
                    <td style="text-align: right; color: #16a34a; font-weight: 900;">৳${grandSaleTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div style="margin-top: 12px; padding: 8px 12px; background: #f8fafc; border: 1.5px solid #0f172a; border-radius: 6px; display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
            <span>${monthName} ${selectedYear} এর নিট মেডিসিন ব্যালেন্স / প্রফিট:</span>
            <span style="color: ${netProfit >= 0 ? '#16a34a' : '#dc2626'}; font-size: 13px;">৳${netProfit.toFixed(2)}</span>
          </div>

          <div class="sig-area">
            <div class="sig-line">ফার্মাসিস্ট / ক্যাশিয়ার</div>
            <div class="sig-line">হিসাবরক্ষক</div>
            <div class="sig-line">ম্যানেজার / পরিচালক</div>
          </div>
        </body>
      </html>
    `;
    win.document.write(html); win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 750);
  };

  const renderBuyTab = () => {
    if (buyViewMode === 'list') {
      const selectedMonthLabel = buySearchMonth === 'all' 
        ? 'সকল মাস' 
        : (monthOptions.find(m => m.value.toString() === buySearchMonth)?.name || '');
      const selectedYearLabel = buySearchYear === 'all' ? 'সকল বছর' : buySearchYear;

      return (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Add Button */}
          <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-800/90 p-5 rounded-2xl border border-slate-700 shadow-xl">
            <div>
              <h2 className="text-2xl font-black text-blue-400 uppercase tracking-tight flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 animate-pulse"></span>
                ওষুধ ক্রয় ও ইনভয়েস তালিকা (Medicine Purchases)
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1">
                মাস ও বছরভিত্তিক ক্রয় হিসাব, ইনভয়েস এবং ওষুধভিত্তিক আলাদা রিপোর্ট
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => openLumpSumPurchaseModal()}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-amber-900/30 transition-all active:scale-95 flex items-center gap-2 text-sm border border-amber-500"
                title="পূর্বের ইনভয়েস না থাকলে নির্দিষ্ট মাসের এককালীন মোট ঔষধ ক্রয় লিখুন"
              >
                <PlusIcon className="w-5 h-5 text-amber-200" />
                <span>এককালীন মাসিক ক্রয়</span>
              </button>
              <button
                onClick={() => {
                  const mLabel = buySearchMonth === 'all' ? 'সকল মাস' : (monthOptions.find(m => m.value.toString() === buySearchMonth)?.name || '');
                  handlePrintPurchaseMonthlyReport(filteredPurchases, `${mLabel}, ${buySearchYear}${buySearchSupplier ? ` (${buySearchSupplier})` : ''}`);
                }}
                className="bg-slate-700 hover:bg-slate-600 text-sky-300 hover:text-white px-5 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 text-sm border border-slate-600"
                title="ফিল্টারকৃত মাসের ক্রয় তালিকা প্রিন্ট করুন"
              >
                <PrinterIcon className="w-5 h-5 text-sky-400" />
                <span>মাসিক রিপোর্ট প্রিন্ট ({filteredPurchases.length})</span>
              </button>
              <button 
                onClick={() => {
                  const newId = `PUR-${Date.now()}`;
                  const defaultDate = (buySearchYear !== 'all' && buySearchMonth !== 'all')
                    ? `${buySearchYear}-${String(parseInt(buySearchMonth) + 1).padStart(2, '0')}-01`
                    : new Date().toISOString().split('T')[0];
                  setPurchaseFormData({
                    invoiceId: newId,
                    invoiceDate: defaultDate,
                    source: '',
                    items: [],
                    totalAmount: 0,
                    discount: 0,
                    netPayable: 0,
                    paidAmount: 0,
                    dueAmount: 0,
                    billCreatedBy: 'Admin',
                    billPaidBy: '',
                    receivedBy: '',
                    status: 'Saved',
                    createdDate: ''
                  });
                  setBuyViewMode('add');
                  setErrors({});
                  setIsOpeningStock(false);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-blue-900/30 transition-all active:scale-95 flex items-center gap-2 text-sm uppercase tracking-wider"
              >
                <PlusIcon className="w-5 h-5" /> + নতুন ক্রয় এন্ট্রি (Add Purchase)
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-900/70 p-4 rounded-2xl border border-slate-700 shadow-lg">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">
                সাপ্লায়ার / ইনভয়েস / ওষুধের নাম দিয়ে খুঁজুন
              </label>
              <input
                type="text"
                value={buySearchSupplier}
                onChange={e => setBuySearchSupplier(e.target.value)}
                placeholder="যেমন: Square, PUR-123, Napa..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm font-bold placeholder-slate-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">
                নির্দিষ্ট তারিখ
              </label>
              <input
                type="date"
                value={buySearchDate}
                onChange={e => setBuySearchDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm font-bold focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">
                মাস নির্বাচন (Month)
              </label>
              <select
                value={buySearchMonth}
                onChange={e => setBuySearchMonth(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm font-bold focus:border-blue-500 outline-none"
              >
                <option value="all">📅 সকল মাস (All Months)</option>
                {monthOptions.map(m => (
                  <option key={m.value} value={m.value.toString()}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">
                বছর নির্বাচন (Year)
              </label>
              <select
                value={buySearchYear}
                onChange={e => setBuySearchYear(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm font-bold focus:border-blue-500 outline-none"
              >
                <option value="all">সকল বছর (All Years)</option>
                {[2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Monthly / Annual Summary Statistics Bar */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-700 shadow-2xl space-y-3">
            <div className="flex flex-wrap justify-between items-center pb-3 border-b border-slate-800">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                📊 ক্রয়ের হিসাব সামারি: <span className="text-blue-400">{selectedMonthLabel}, {selectedYearLabel}</span>
              </span>
              {(buySearchSupplier || buySearchDate || buySearchMonth !== 'all' || buySearchYear !== 'all') && (
                <button
                  onClick={() => {
                    setBuySearchSupplier('');
                    setBuySearchDate('');
                    setBuySearchMonth('all');
                    setBuySearchYear(new Date().getFullYear().toString());
                  }}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 underline"
                >
                  ফিল্টার রিসেট করুন
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">মোট ক্রয় ইনভয়েস</span>
                <span className="text-xl font-black text-white">{purchaseStats.totalInvoices} টি</span>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">মোট ওষুধ ক্রয় (Qty)</span>
                <span className="text-xl font-black text-sky-400">
                  {purchaseStats.totalMedsQty} <span className="text-xs font-bold text-slate-400">পিস ({purchaseStats.uniqueMedicines} প্রকার)</span>
                </span>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">মোট ক্রয় মূল্য</span>
                <span className="text-xl font-black text-amber-400">৳ {purchaseStats.totalNetBuy.toLocaleString()}</span>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">পরিশোধিত টাকা</span>
                <span className="text-xl font-black text-emerald-400">৳ {purchaseStats.totalPaid.toLocaleString()}</span>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">মোট বকেয়া (Due)</span>
                <span className="text-xl font-black text-rose-400">৳ {purchaseStats.totalDue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Sub-View Switcher (Invoices vs Itemized Medicine List) */}
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-700 max-w-xl">
            <button
              onClick={() => setBuySubTab('invoices')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                buySubTab === 'invoices' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              🧾 ইনভয়েস আকারে দেখুন ({filteredPurchases.length})
            </button>
            <button
              onClick={() => setBuySubTab('items')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                buySubTab === 'items' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              💊 আলাদা আলাদা ওষুধ আকারে দেখুন ({itemizedPurchasedMedicines.length})
            </button>
          </div>

          {/* View Mode 1: Invoices View */}
          {buySubTab === 'invoices' && (
            <div className="space-y-3">
              <div className="bg-sky-950/40 border border-sky-800/40 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-sky-300">
                <span className="flex items-center gap-2">
                  <FileTextIcon className="w-4 h-4 text-sky-400" />
                  💡 <b>টিপস:</b> যেকোনো ইনভয়েসের উপর <b>ডাবল-ক্লিক (Double-Click)</b> করুন অথবা <b>ভাউচার</b> বাটনে চাপলে পুরো ক্রয় রশিদ দেখতে ও প্রিন্ট করতে পারবেন।
                </span>
                <span className="font-mono text-slate-400 hidden sm:inline">মোট ইনভয়েস: {filteredPurchases.length} টি</span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-700 shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-700 text-slate-100">
                    <tr>
                      <th className="p-4 uppercase text-xs font-black text-center w-12"># ক্রমিক</th>
                      <th className="p-4 uppercase text-xs font-black">ইনভয়েস নং</th>
                      <th className="p-4 uppercase text-xs font-black">তারিখ</th>
                      <th className="p-4 uppercase text-xs font-black">সাপ্লায়ার</th>
                      <th className="p-4 uppercase text-xs font-black text-center">আইটেম সংখ্যা</th>
                      <th className="p-4 text-right uppercase text-xs font-black">মোট বিল</th>
                      <th className="p-4 text-right uppercase text-xs font-black">পরিশোধ</th>
                      <th className="p-4 text-right uppercase text-xs font-black">বকেয়া</th>
                      <th className="p-4 text-center uppercase text-xs font-black">স্ট্যাটাস</th>
                      <th className="p-4 text-center uppercase text-xs font-black">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredPurchases.map((inv, idx) => (
                      <tr
                        key={inv.invoiceId}
                        onDoubleClick={() => setViewingPurchaseInvoice(inv)}
                        title="ডাবল ক্লিক করে ইনভয়েস ভাউচার দেখুন ও প্রিন্ট করুন"
                        className={`bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer group ${
                          inv.status === 'Initial' ? 'opacity-75' : ''
                        }`}
                      >
                        <td className="p-4 text-slate-400 font-bold text-center text-xs">
                          {idx + 1}
                        </td>
                        <td className="p-4 text-sky-400 group-hover:text-white font-mono text-sm font-bold flex items-center gap-2">
                          <EyeIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-sky-400 transition-opacity" />
                          {inv.invoiceId}
                        </td>
                        <td className="p-4 text-slate-100 font-bold">{inv.invoiceDate}</td>
                        <td className="p-4 text-white font-black text-base">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{inv.source}</span>
                            {isLumpSumPurchase(inv) && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                                🏷️ এককালীন ক্রয়
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center font-bold text-sky-400">
                          {Array.isArray(inv.items) ? inv.items.length : 0} টি
                        </td>
                        <td className="p-4 text-sky-400 text-right font-black text-base">
                          ৳{(inv.netPayable || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-emerald-400 text-right font-black">
                          ৳{Number(inv.paidAmount || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-rose-500 text-right font-black text-base">
                          ৳{Number(inv.dueAmount || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded ${
                              inv.status === 'Initial'
                                ? 'bg-amber-600/20 text-amber-500'
                                : isLumpSumPurchase(inv)
                                ? 'bg-amber-600/20 text-amber-400'
                                : 'bg-blue-600/20 text-blue-400'
                            }`}
                          >
                            {isLumpSumPurchase(inv) ? 'এককালীন' : (inv.status || 'Posted')}
                          </span>
                        </td>
                        <td className="p-4 text-center space-x-2 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingPurchaseInvoice(inv);
                            }}
                            className="bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white px-2.5 py-1 rounded text-xs font-bold transition-all border border-blue-500/40 inline-flex items-center gap-1"
                            title="ইনভয়েস ভাউচার দেখুন ও প্রিন্ট করুন"
                          >
                            <EyeIcon className="w-3.5 h-3.5" /> ভাউচার
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isLumpSumPurchase(inv)) {
                                openEditLumpSumPurchase(inv);
                              } else {
                                setPurchaseFormData(inv);
                                setBuyViewMode('edit');
                                setEditingPurchaseId(inv.invoiceId);
                                setIsOpeningStock(inv.status === 'Initial');
                                setErrors({});
                              }
                            }}
                            className="text-sky-400 hover:text-white text-xs font-bold underline"
                          >
                            এডিট
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReturnPurchase(inv);
                            }}
                            className="text-rose-400 hover:text-rose-600 text-xs font-bold underline"
                          >
                            ফেরত/বাতিল
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintPurchase(inv);
                            }}
                            className="text-emerald-400 hover:text-white text-xs font-bold underline inline-flex items-center gap-1"
                          >
                            <PrinterIcon className="w-3.5 h-3.5" /> প্রিন্ট
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPurchases.length === 0 && (
                  <div className="p-16 text-center text-slate-500 font-black text-lg uppercase tracking-wider">
                    কোনো ক্রয় ইনভয়েস পাওয়া যায়নি।
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Mode 2: Itemized Medicine List */}
          {buySubTab === 'items' && (
            <div className="space-y-3">
              <div className="bg-emerald-950/40 border border-emerald-800/40 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <span className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-400" />
                  💡 <b>টিপস:</b> যেকোনো ওষুধের সারিতে <b>ডাবল-ক্লিক</b> করুন অথবা <b>ভাউচার</b> বাটনে চাপলে সেটির মূল ক্রয় ইনভয়েস দেখতে ও প্রিন্ট করতে পারবেন।
                </span>
                <span className="font-mono text-slate-400 hidden sm:inline">মোট ওষুধ রেকর্ড: {itemizedPurchasedMedicines.length} টি</span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-700 shadow-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-700 text-slate-100">
                    <tr>
                      <th className="p-4 uppercase text-xs font-black">ঔষধের নাম ও শক্তি</th>
                      <th className="p-4 uppercase text-xs font-black">জেনেরিক</th>
                      <th className="p-4 uppercase text-xs font-black">ফরম</th>
                      <th className="p-4 text-center uppercase text-xs font-black">মেয়াদ (Expiry)</th>
                      <th className="p-4 uppercase text-xs font-black">সাপ্লায়ার ও তারিখ</th>
                      <th className="p-4 text-right uppercase text-xs font-black">ক্রয়মূল্য</th>
                      <th className="p-4 text-right uppercase text-xs font-black">বিক্রয়মূল্য</th>
                      <th className="p-4 text-center uppercase text-xs font-black">পরিমাণ (Qty)</th>
                      <th className="p-4 text-right uppercase text-xs font-black">মোট খরচ</th>
                      <th className="p-4 text-center uppercase text-xs font-black">ভাউচার</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {itemizedPurchasedMedicines.map((item, idx) => {
                      const expInfo = getExpiryInfo(item.expiryDate);
                      const parentInv = safeInvoices.find(inv => inv.invoiceId === item.invoiceId);
                      return (
                        <tr
                          key={idx}
                          onDoubleClick={() => {
                            if (parentInv) setViewingPurchaseInvoice(parentInv);
                          }}
                          title="ডাবল ক্লিক করে সম্পূর্ণ ক্রয় ভাউচার দেখুন"
                          className={`bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer group ${expInfo.rowClass}`}
                        >
                          <td className="p-4 font-black text-white">
                            {item.tradeName} <span className="text-xs font-bold text-slate-400">({item.strength})</span>
                          </td>
                          <td className="p-4 text-sky-400 text-xs font-bold italic">{item.genericName || '-'}</td>
                          <td className="p-4 text-slate-300 font-bold text-xs uppercase">{item.formulation}</td>
                          <td className="p-4 text-center whitespace-nowrap">
                            {item.expiryDate ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-mono inline-block ${expInfo.badgeClass}`}>
                                {item.expiryDate} {expInfo.status === 'expired' ? '⚠️' : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 italic">উল্লেখ নেই</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-300 text-xs">
                            <div className="font-bold text-white">{item.source}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.invoiceDate} ({item.invoiceId})</div>
                          </td>
                          <td className="p-4 text-right text-slate-300 font-bold">৳{item.buyPrice.toFixed(2)}</td>
                          <td className="p-4 text-right text-white font-bold">৳{item.sellPrice.toFixed(2)}</td>
                          <td className="p-4 text-center font-black text-emerald-400 text-base">{item.qty}</td>
                          <td className="p-4 text-right font-black text-amber-400 text-base">৳{item.total.toFixed(2)}</td>
                          <td className="p-4 text-center whitespace-nowrap">
                            {parentInv && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingPurchaseInvoice(parentInv);
                                }}
                                className="bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white px-2.5 py-1 rounded text-xs font-bold transition-all border border-sky-500/40 inline-flex items-center gap-1"
                                title="ইনভয়েস ভাউচার দেখুন"
                              >
                                <EyeIcon className="w-3.5 h-3.5" /> ভাউচার
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {itemizedPurchasedMedicines.length === 0 && (
                  <div className="p-16 text-center text-slate-500 font-black text-lg uppercase tracking-wider">
                    কোনো ওষুধের তালিকা পাওয়া যায়নি।
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2">
                <h2 className="text-2xl font-black text-white">{buyViewMode === 'add' ? 'New Purchase Entry' : 'Edit Purchase Entry'}</h2>
                <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-amber-900/30">
                    <input type="checkbox" id="opening_stock" checked={isOpeningStock} onChange={e=>setIsOpeningStock(e.target.checked)} className="w-5 h-5 accent-amber-500"/>
                    <label htmlFor="opening_stock" className="text-xs font-black text-amber-500 uppercase tracking-widest cursor-pointer">Initial Opening Stock (No Expense)</label>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div><label className="block text-xs font-black text-slate-400 mb-1 uppercase">Invoice ID</label><input type="text" value={purchaseFormData.invoiceId} disabled className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-slate-500 font-bold" /></div>
                <div><label className="block text-xs font-black text-slate-400 mb-1 uppercase">Date</label><input type="date" value={purchaseFormData.invoiceDate} onChange={e=>setPurchaseFormData({...purchaseFormData, invoiceDate:e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white font-black" /></div>
                <div className="relative"><label className="block text-xs font-black text-slate-400 mb-1 uppercase">Supplier Name</label><input type="text" value={purchaseFormData.source} onChange={e=>handleSupplierChange(e.target.value)} onFocus={() => handleSupplierChange(purchaseFormData.source)} onBlur={()=>setTimeout(()=>setShowSupplierSuggestions(false), 200)} className={`w-full bg-slate-900 border rounded p-2.5 text-white font-black ${errors.source ? 'border-red-500' : 'border-slate-600'}`} placeholder="Search Supplier..." autoComplete="off"/>{showSupplierSuggestions && supplierSuggestions.length > 0 && (<ul className="absolute z-50 w-full bg-slate-700 border border-slate-500 mt-1 max-h-48 overflow-y-auto rounded shadow-2xl">{supplierSuggestions.map((s,i)=>(<li key={i} onMouseDown={()=>setPurchaseFormData({...purchaseFormData, source: s})} className="p-3 hover:bg-slate-600 cursor-pointer text-white text-sm border-b border-slate-600/30 last:border-0 font-bold">{s}</li>))}</ul>)}</div>
            </div>
            <div className="bg-slate-900/80 p-5 rounded-lg border border-slate-700 mb-6 shadow-inner">
                <h3 className="text-xs font-black text-blue-300 mb-4 uppercase tracking-[0.2em]">Add Medicine Items (Trade + Generic)</h3>
                <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-[2] min-w-[200px] relative">
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase ml-1">Trade_Name</label>
                        <input type="text" value={searchTerm} onChange={e=>handleSearchChange(e.target.value, 'buy')} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(()=>setShowSuggestions(false), 200)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white font-black text-sm placeholder-slate-600" placeholder="Brand Name" />
                        {showSuggestions && suggestions.length > 0 && <ul className="absolute z-50 w-full bg-slate-700 border border-slate-500 mt-1 max-h-56 overflow-y-auto rounded shadow-2xl">{suggestions.map(m=><li key={m.id} onMouseDown={()=>selectMedicineForPurchase(m)} className="p-2 hover:bg-slate-600 cursor-pointer text-white border-b border-slate-600 flex flex-col"><span className="font-black text-xs">{m.tradeName} ({m.strength})</span><span className="text-[10px] text-slate-400 font-bold italic">{m.genericName}</span></li>)}</ul>}
                    </div>
                    <div className="flex-[1.5] min-w-[150px]">
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Generic_Name</label>
                        <input type="text" value={currentPurchaseItem.genericName} onChange={e=>setCurrentPurchaseItem({...currentPurchaseItem, genericName:e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white font-black text-sm" placeholder="Generic Formula"/>
                    </div>
                    <div className="w-20">
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Form</label>
                        <select value={currentPurchaseItem.formulation} onChange={e=>setCurrentPurchaseItem({...currentPurchaseItem, formulation:e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-[11px] font-black h-[38px]">{formulations.map(f=><option key={f} value={f}>{f}</option>)}</select>
                    </div>
                    <div className="w-20">
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Strength</label>
                        <input type="text" value={currentPurchaseItem.strength} onChange={e=>setCurrentPurchaseItem({...currentPurchaseItem, strength:e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white font-black text-sm" placeholder="e.g. 500mg"/>
                    </div>
                    <div className="w-32">
                        <label className="block text-[10px] font-black text-amber-400 mb-1 uppercase">মেয়াদ (Expiry)</label>
                        <input type="month" value={currentPurchaseItem.expiryDate} onChange={e=>setCurrentPurchaseItem({...currentPurchaseItem, expiryDate:e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs font-black focus:border-amber-500 outline-none" title="ঔষধের মেয়াদ উত্তীর্ণের তারিখ" />
                    </div>
                    <div className="w-20">
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Buy_Price</label>
                        <input type="number" value={currentPurchaseItem.unitPriceBuy || ''} onChange={e=>setCurrentPurchaseItem({...currentPurchaseItem, unitPriceBuy:parseFloat(e.target.value) || 0})} onFocus={e=>e.target.select()} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm font-black" />
                    </div>
                    <div className="w-20">
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Sell_Price</label>
                        <input type="number" value={currentPurchaseItem.unitPriceSell || ''} onChange={e=>setCurrentPurchaseItem({...currentPurchaseItem, unitPriceSell:parseFloat(e.target.value) || 0})} onFocus={e=>e.target.select()} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm font-black" />
                    </div>
                    <div className="w-16">
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase text-center">Qnty</label>
                        <input type="number" value={currentPurchaseItem.qtyBuying || ''} onChange={e=>setCurrentPurchaseItem({...currentPurchaseItem, qtyBuying:parseFloat(e.target.value) || 0})} onFocus={e=>e.target.select()} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm font-black text-center" />
                    </div>
                    <button onClick={addPurchaseItem} className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500 font-black shadow-lg text-sm uppercase">Add</button>
                </div>
            </div>
            <div className="overflow-x-auto border-2 border-slate-700 rounded-xl mb-6 shadow-xl">
              <table className="w-full text-left border-collapse text-sm text-slate-100">
                <thead className="bg-slate-700 text-white">
                  <tr>
                    <th className="p-3 uppercase text-xs">Medicine (Trade + Generic)</th>
                    <th className="p-3 text-center uppercase text-xs">মেয়াদ (Expiry)</th>
                    <th className="p-3 text-right uppercase text-xs">Buy P.</th>
                    <th className="p-3 text-right uppercase text-xs">Sell P.</th>
                    <th className="p-3 text-right uppercase text-xs">Qty</th>
                    <th className="p-3 text-right uppercase text-xs">Total</th>
                    <th className="p-3 text-center uppercase text-xs">X</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseFormData.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-700 bg-slate-850">
                      <td className="p-3 font-black text-white">
                        <div>{item.tradeName} <span className="text-xs font-bold text-slate-500">({item.strength})</span></div>
                        <div className="text-[10px] text-slate-400 italic font-bold uppercase">{item.genericName}</div>
                      </td>
                      <td className="p-3 text-center">
                        {item.expiryDate ? (
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-amber-300 border border-amber-500/40">
                            {item.expiryDate}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">উল্লেখ নেই</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-300 font-bold">{item.unitPriceBuy.toFixed(2)}</td>
                      <td className="p-3 text-right text-slate-300 font-bold">{item.unitPriceSell.toFixed(2)}</td>
                      <td className="p-3 text-right font-black text-white">{item.qtyBuying}</td>
                      <td className="p-3 text-right font-black text-emerald-400 text-base">৳{item.lineTotalBuy.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button onClick={()=>removePurchaseItem(i)} className="text-red-500 font-black hover:text-white bg-slate-900 w-8 h-8 rounded-full">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-700"><label className="block text-xs font-black text-slate-500 mb-2 uppercase">Bill Created By</label><select value={purchaseFormData.billCreatedBy} onChange={e=>setPurchaseFormData({...purchaseFormData, billCreatedBy:e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-black"><option value="Admin">Admin</option>{employees.map(e=><option key={e.emp_id} value={e.emp_name}>{e.emp_name}</option>)}</select></div>
                <div className="bg-slate-900 p-6 rounded-2xl border-2 border-slate-700 space-y-4 shadow-2xl">
                    <div className="flex justify-between items-center text-slate-400 font-black text-xs uppercase"><span>Sub Total:</span> <span className="text-white text-xl">৳{purchaseFormData.totalAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-slate-400 font-black text-xs uppercase"><span>Discount:</span> <input type="number" value={purchaseFormData.discount} onChange={e=>setPurchaseFormData({...purchaseFormData, discount:parseFloat(e.target.value)||0})} className="w-28 bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-right text-white font-black focus:border-blue-500 outline-none"/></div>
                    <div className="flex justify-between items-center text-sky-400 font-black border-t-2 border-slate-800 pt-3 text-2xl uppercase"><span>Net Bill:</span> <span>৳{purchaseFormData.netPayable.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-emerald-400 font-black text-xs uppercase"><span>Paid Amount:</span> <input type="number" value={purchaseFormData.paidAmount || 0} onChange={e=>setPurchaseFormData({...purchaseFormData, paidAmount:parseFloat(e.target.value)||0})} className="w-28 bg-slate-800 border border-slate-600 rounded p-2 text-right text-white font-black text-xl" onFocus={e=>e.target.select()}/></div>
                    <div className="flex justify-between items-center text-red-500 font-black text-2xl uppercase"><span>Due Amount:</span> <span>৳{purchaseFormData.dueAmount.toFixed(2)}</span></div>
                </div>
            </div>
            <div className="mt-8 flex justify-end gap-4"><button onClick={()=>{setBuyViewMode('list'); setEditingPurchaseId(null); setIsOpeningStock(false); setErrors({});}} className="px-8 py-3 bg-slate-700 text-white rounded-lg font-black hover:bg-slate-600 transition-all">Discard</button><button onClick={handleSavePurchase} className="px-16 py-3 bg-blue-600 text-white rounded-lg font-black shadow-2xl hover:bg-blue-500 transform active:scale-95 transition-all uppercase tracking-widest">Post Invoice</button></div>

            {/* Recent Saved Invoices List directly under the purchase entry form */}
            {safeInvoices.length > 0 && (
              <div className="mt-12 pt-8 border-t border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <FileTextIcon className="w-5 h-5 text-sky-400" />
                      সংরক্ষিত ক্রয় ইনভয়েসসমূহ (Saved Invoices)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">💡 যেকোনো ইনভয়েসের উপর <b>ডাবল-ক্লিক (Double-Click)</b> করুন অথবা <b>ভাউচার</b> বাটনে ক্লিক করে ভাউচার দেখুন ও প্রিন্ট করুন।</p>
                  </div>
                  <button
                    onClick={() => { setBuyViewMode('list'); setEditingPurchaseId(null); }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white rounded-xl transition-all self-start sm:self-auto shrink-0 border border-slate-600"
                  >
                    সকল ইনভয়েস তালিকা দেখুন →
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-xl max-h-96">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-700 text-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 uppercase text-xs font-bold">ইনভয়েস নং</th>
                        <th className="p-3 uppercase text-xs font-bold">তারিখ</th>
                        <th className="p-3 uppercase text-xs font-bold">সাপ্লায়ার</th>
                        <th className="p-3 text-center uppercase text-xs font-bold">আইটেম সংখ্যা</th>
                        <th className="p-3 text-right uppercase text-xs font-bold">মোট বিল</th>
                        <th className="p-3 text-right uppercase text-xs font-bold">পরিশোধ</th>
                        <th className="p-3 text-right uppercase text-xs font-bold">বকেয়া</th>
                        <th className="p-3 text-center uppercase text-xs font-bold">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {safeInvoices.slice(0, 10).map(inv => (
                        <tr
                          key={inv.invoiceId}
                          onDoubleClick={() => setViewingPurchaseInvoice(inv)}
                          title="ডাবল ক্লিক করে সম্পূর্ণ ভাউচার দেখুন ও প্রিন্ট করুন"
                          className="bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer group"
                        >
                          <td className="p-3 font-mono text-sky-400 group-hover:text-white font-bold">{inv.invoiceId}</td>
                          <td className="p-3 text-slate-200 font-bold">{inv.invoiceDate}</td>
                          <td className="p-3 text-white font-black">{inv.source}</td>
                          <td className="p-3 text-center text-sky-400 font-bold">{Array.isArray(inv.items) ? inv.items.length : 0} টি</td>
                          <td className="p-3 text-right font-black text-sky-400">৳{(inv.netPayable || 0).toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-emerald-400">৳{Number(inv.paidAmount || 0).toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-rose-400">৳{Number(inv.dueAmount || 0).toFixed(2)}</td>
                          <td className="p-3 text-center space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => setViewingPurchaseInvoice(inv)}
                              className="bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white px-2.5 py-1 rounded text-xs font-bold transition-all border border-blue-500/40 inline-flex items-center gap-1"
                              title="ইনভয়েস ভাউচার দেখুন ও প্রিন্ট করুন"
                            >
                              <EyeIcon className="w-3.5 h-3.5" /> ভাউচার
                            </button>
                            <button
                              onClick={() => handlePrintPurchase(inv)}
                              className="text-emerald-400 hover:text-white text-xs font-bold underline inline-flex items-center gap-1"
                            >
                              <PrinterIcon className="w-3.5 h-3.5" /> প্রিন্ট
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
    );
  };

  const renderDuePaidTab = () => {
    const dueInvoices = safeInvoices.filter(i => i && (Number(i.dueAmount) || 0) > 0.5);
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-red-500 uppercase tracking-tighter border-b border-red-900/50 pb-2 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span> Pending Supplier Payments (Due)</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-2xl"><table className="w-full text-left border-collapse"><thead className="bg-slate-700 text-slate-100"><tr><th className="p-4 uppercase text-xs font-black">Inv-Date</th><th className="p-4 uppercase text-xs font-black">Supplier Name</th><th className="p-4 uppercase text-xs font-black text-right">Total Bill</th><th className="p-4 uppercase text-xs font-black text-right">Paid</th><th className="p-4 uppercase text-xs font-black text-right text-red-400">Current Due</th><th className="p-4 uppercase text-xs font-black text-center">Action</th></tr></thead><tbody className="divide-y divide-slate-700">{dueInvoices.map(inv => (<tr key={inv.invoiceId} className="bg-slate-800 hover:bg-slate-750 transition-colors"><td className="p-4 text-slate-300 font-bold">{inv.invoiceDate}</td><td className="p-4 text-white font-black text-base">{inv.source}</td><td className="p-4 text-right text-slate-300 font-bold">{(inv.netPayable || 0).toFixed(2)}</td><td className="p-4 text-right text-emerald-400 font-black">৳{Number(inv.paidAmount || 0).toFixed(2)}</td><td className="p-4 text-right text-red-500 font-black text-2xl">৳{Number(inv.dueAmount || 0).toFixed(2)}</td><td className="p-4 text-center"><button onClick={()=>{setPaymentData({invoiceId: inv.invoiceId, supplierName: inv.source, currentDue: inv.dueAmount || 0, payAmount: ''}); setShowPaymentModal(true);}} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-black shadow-lg transition-all active:scale-95 uppercase text-xs tracking-widest">Pay Now</button></td></tr>))}</tbody></table>{dueInvoices.length === 0 && <div className="p-20 text-center text-slate-500 font-black text-2xl italic uppercase opacity-30">Clear! No Pending Supplier Dues.</div>}</div>
        </div>
    );
  };

  const renderSellTab = () => {
    const filteredOutdoor = safeSalesInvoices.filter(inv => {
        if (!inv) return false;
        const matchesName = (inv.customerName || '').toLowerCase().includes(sellSearchName.toLowerCase());
        const dateToUse = inv.invoiceDate || (inv as any).invoice_date || (inv as any).date || '';
        const matchesDate = !sellSearchDate || dateToUse === sellSearchDate;
        const parts = dateToUse.split('-');
        let matchesMonth = true;
        let matchesYear = true;
        if (parts.length >= 2) {
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            matchesMonth = sellSearchMonth === 'all' || (m - 1) === parseInt(sellSearchMonth);
            matchesYear = isNaN(y) ? true : y === parseInt(sellSearchYear);
        }
        return matchesName && matchesDate && matchesMonth && matchesYear;
    });

    const filteredIndoor = safeIndoorInvoices.filter(inv => {
        if (!inv) return false;
        const items = Array.isArray(inv.items) ? inv.items : [];
        const isMed = items.some(it => it && (it.service_type === 'Medicine' || it.service_type === 'ঔষধ' || (it.service_type || '').toLowerCase().includes('med')));
        if (!isMed) return false;
        const matchesName = (inv.patient_name || '').toLowerCase().includes(sellSearchName.toLowerCase());
        const dateToUse = inv.invoice_date || inv.admission_date || (inv as any).date || '';
        if (!dateToUse || typeof dateToUse !== 'string') return false;
        const matchesDate = !sellSearchDate || dateToUse === sellSearchDate;
        const parts = dateToUse.split('-');
        if (parts.length < 2) return false;
        const [y, m] = parts.map(Number);
        const matchesMonth = sellSearchMonth === 'all' || (m - 1) === parseInt(sellSearchMonth);
        const matchesYear = isNaN(y) ? true : y === parseInt(sellSearchYear);
        return matchesName && matchesDate && matchesMonth && matchesYear;
    });

    const totalOutdoor = filteredOutdoor.filter(inv => inv.status !== 'Cancelled' && inv.status !== 'Returned').reduce((sum, inv) => sum + (Number(inv.netPayable) || 0), 0);
    const totalIndoor = filteredIndoor.filter(inv => inv && inv.status !== 'Cancelled' && inv.status !== 'Returned').reduce((sum, inv) => {
        const items = Array.isArray(inv.items) ? inv.items : [];
        return sum + items.filter(it => it && (it.service_type === 'Medicine' || it.service_type === 'ঔষধ' || (it.service_type || '').toLowerCase().includes('med'))).reduce((s, it) => s + (Number(it.payable_amount) || Number(it.line_total) || 0), 0);
    }, 0);

    if(sellViewMode === 'list') return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-700 mb-2">
                <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Customer Name</label>
                    <input type="text" value={sellSearchName} onChange={e => setSellSearchName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm" placeholder="Search name..." />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Date</label>
                    <input type="date" value={sellSearchDate} onChange={e => setSellSearchDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Month</label>
                    <select value={sellSearchMonth} onChange={e => setSellSearchMonth(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm">
                        <option value="all">All Months</option>
                        {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Year</label>
                    <select value={sellSearchYear} onChange={e => setSellSearchYear(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm">
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Outdoor Total</span>
                        <span className="text-lg font-black text-emerald-400">৳ {totalOutdoor.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Indoor Total</span>
                        <span className="text-lg font-black text-purple-400">৳ {totalIndoor.toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Grand Total Sales</span>
                    <span className="text-2xl font-black text-blue-400">৳ {(totalOutdoor + totalIndoor).toLocaleString()}</span>
                </div>
            </div>

            <div className="flex bg-[#20293a] p-1 rounded-lg border border-[#374151]">
                <button onClick={() => setSellSubTab('outdoor')} className={`flex-1 py-2 rounded-md font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 ${sellSubTab === 'outdoor' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                    Outdoor Medicine Sales
                    <span className="bg-black/20 px-2 py-0.5 rounded text-[10px]">৳{totalOutdoor.toLocaleString()}</span>
                </button>
                <button onClick={() => setSellSubTab('indoor')} className={`flex-1 py-2 rounded-md font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 ${sellSubTab === 'indoor' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                    Indoor Medicine Management
                    <span className="bg-black/20 px-2 py-0.5 rounded text-[10px]">৳{totalIndoor.toLocaleString()}</span>
                </button>
            </div>

            {sellSubTab === 'outdoor' ? (
                <>
                    <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-700 pb-3">
                        <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 
                            Direct Outdoor Sales (৳{totalOutdoor.toLocaleString()})
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openLumpSumSalesModal()}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs border border-emerald-400"
                                title="পূর্বের ইনভয়েস না থাকলে নির্দিষ্ট মাসের এককালীন মোট ফার্মেসি বিক্রয় লিখুন"
                            >
                                <PlusIcon className="w-4 h-4 text-emerald-200" />
                                <span>এককালীন মাসিক বিক্রয়</span>
                            </button>
                            <button
                                onClick={() => {
                                    const monthName = sellSearchMonth === 'all' ? 'সকল মাস' : (monthOptions.find(m => m.value.toString() === sellSearchMonth)?.name || '');
                                    handlePrintSalesMonthlyReport(filteredOutdoor, `${monthName}, ${sellSearchYear}${sellSearchName ? ` (${sellSearchName})` : ''}`);
                                }}
                                className="bg-slate-700 hover:bg-slate-600 text-emerald-300 hover:text-white px-5 py-2 rounded-lg font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 text-xs border border-slate-600"
                                title="ফিল্টারকৃত মাসের বিক্রয় রিপোর্ট প্রিন্ট করুন"
                            >
                                <PrinterIcon className="w-4 h-4 text-emerald-400" />
                                <span>মাসিক রিপোর্ট প্রিন্ট ({filteredOutdoor.length})</span>
                            </button>
                            <button 
                                onClick={() => {
                                    const newId = `SL-${Date.now()}`; 
                                    setSalesFormData({invoiceId: newId, invoiceDate: new Date().toISOString().split('T')[0], customerName: '', customerMobile: '', customerAge: '', customerGender: '', refDoctorName: '', items: [], totalAmount: 0, discount: 0, netPayable: 0, paidAmount: 0, dueAmount: 0, billCreatedBy: 'Admin', status: 'Saved', createdDate: ''}); 
                                    setSellViewMode('add'); 
                                    setErrors({}); 
                                    setEditingInvoiceId(null);
                                }} 
                                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-500 font-black shadow-2xl transition-all flex items-center gap-1.5 text-xs"
                            >
                                <PlusIcon className="w-4 h-4" /> + New Sale
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-700 shadow-2xl">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-slate-700 text-slate-100">
                                <tr>
                                    <th className="p-4 font-black text-center w-12 text-xs"># ক্রমিক</th>
                                    <th className="p-4 font-black text-xs">ID & Date</th>
                                    <th className="p-4 font-black text-xs">Customer Name</th>
                                    <th className="p-4 font-black text-center text-xs">আইটেম সংখ্যা</th>
                                    <th className="p-4 text-right font-black text-xs">Net Amount</th>
                                    <th className="p-4 text-right font-black text-xs">পরিশোধ / বকেয়া</th>
                                    <th className="p-4 text-center font-black text-xs">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOutdoor.map((inv, idx) => (
                                    <tr 
                                        key={inv.invoiceId} 
                                        onClick={() => handlePrintSale(inv)} 
                                        title="ক্লিক করে বিক্রয় ভাউচার দেখুন ও প্রিন্ট করুন"
                                        className={`bg-slate-800 border-b border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer group ${inv.status === 'Cancelled' ? 'opacity-40 grayscale' : ''}`}
                                    >
                                        <td className="p-4 text-slate-400 font-bold text-center text-xs">
                                            {idx + 1}
                                        </td>
                                        <td className="p-4 text-slate-300 font-mono text-xs group-hover:text-emerald-400 transition-colors underline">
                                            <div>{inv.invoiceId}</div>
                                            <div className="text-[10px] text-slate-500 font-bold">{inv.invoiceDate}</div>
                                        </td>
                                        <td className="p-4 text-white font-black">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span>{inv.customerName}</span>
                                                {isLumpSumSale(inv) && (
                                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                        🏷️ এককালীন বিক্রয়
                                                    </span>
                                                )}
                                                {inv.status === 'Cancelled' && <span className="text-[10px] bg-red-600 text-white px-1 rounded ml-2">CANCELLED</span>}
                                            </div>
                                            {inv.customerMobile && <div className="text-[11px] text-slate-400 font-mono">{inv.customerMobile}</div>}
                                        </td>
                                        <td className="p-4 text-center font-bold text-slate-300 text-xs">
                                            {Array.isArray(inv.items) ? inv.items.length : 0} টি
                                        </td>
                                        <td className="p-4 text-emerald-400 text-right font-black">
                                            ৳{inv.status === 'Cancelled' ? '0.00' : inv.netPayable.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right text-xs">
                                            <div className="text-emerald-400 font-bold">আদায়: ৳{Number(inv.paidAmount || 0).toFixed(2)}</div>
                                            {Number(inv.dueAmount || 0) > 0 && <div className="text-rose-400 font-bold">বকেয়া: ৳{Number(inv.dueAmount || 0).toFixed(2)}</div>}
                                        </td>
                                        <td className="p-4 text-center space-x-2 whitespace-nowrap" onClick={e=>e.stopPropagation()}>
                                            <button onClick={() => handlePrintSale(inv)} className="text-sky-400 hover:text-white font-black uppercase text-[10px] border border-sky-800 px-2.5 py-1 rounded transition-colors">Voucher</button>
                                            {isLumpSumSale(inv) ? (
                                                <button onClick={() => openEditLumpSumSales(inv)} className="text-emerald-400 hover:text-white font-black uppercase text-[10px] border border-emerald-800 px-2.5 py-1 rounded transition-colors">এডিট</button>
                                            ) : (
                                                <button onClick={() => startEditSale(inv)} className="text-amber-400 hover:text-white font-black uppercase text-[10px] border border-amber-800 px-2.5 py-1 rounded transition-colors">Correct</button>
                                            )}
                                            <button onClick={() => handleReturnSale(inv)} className="bg-amber-900/40 text-amber-300 hover:bg-amber-600 hover:text-white font-black uppercase text-[10px] border border-amber-800 px-2.5 py-1 rounded transition-all">Return</button>
                                            <button onClick={() => handleDeleteSaleWithConfirmation(inv)} className="bg-rose-900/60 text-rose-300 hover:bg-rose-600 hover:text-white font-black uppercase text-[10px] border border-rose-800 px-2.5 py-1 rounded transition-all inline-flex items-center gap-1 shadow-sm">
                                                <Trash2 className="w-3 h-3" /> ডিলিট
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredOutdoor.length === 0 && <div className="p-16 text-center text-slate-600 italic">No outdoor sales records found.</div>}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex justify-between items-center border-b border-slate-700 pb-3"><h2 className="text-xl font-bold text-purple-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Indoor Medicine Billing Records (৳{totalIndoor.toLocaleString()})</h2></div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-700 shadow-2xl"><table className="w-full text-left border-collapse text-sm"><thead className="bg-slate-700 text-slate-100"><tr><th className="p-4 font-black">Invoice ID</th><th className="p-4 font-black">Patient Name</th><th className="p-4 font-black">Date</th><th className="p-4 text-right font-black">Medicine Bill</th><th className="p-4 text-center font-black">Details</th></tr></thead><tbody>{filteredIndoor.map(inv => { const medTotal = inv.items.filter(it => it.service_type === 'Medicine').reduce((s, it) => s + it.payable_amount, 0); return (<tr key={inv.daily_id} className={`bg-slate-800 border-b border-slate-700 hover:bg-slate-750 transition-colors ${inv.status === 'Cancelled' ? 'opacity-40 grayscale' : ''}`}><td className="p-4 text-slate-300 font-mono text-xs">{inv.daily_id}</td><td className="p-4 text-white font-black">{inv.patient_name} {inv.status === 'Cancelled' && <span className="text-[10px] bg-red-600 text-white px-1 rounded ml-2">CANCELLED</span>}</td><td className="p-4 text-slate-100">{inv.invoice_date}</td><td className="p-4 text-purple-400 text-right font-black">৳{inv.status === 'Cancelled' ? '0.00' : medTotal.toFixed(2)}</td><td className="p-4 text-center"><span className="text-slate-500 text-xs italic">{inv.status === 'Cancelled' ? 'Cancelled' : 'Billed to IPD'}</span></td></tr>); })}</tbody></table>{filteredIndoor.length === 0 && <div className="p-16 text-center text-slate-600 italic">No indoor medicine billing records found.</div>}</div>
                </>
            )}
        </div>
    );
    return (
        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-black text-emerald-400 mb-8 border-b border-slate-700 pb-2">{sellViewMode === 'edit' ? 'Correction: Adjust Outdoor Sale' : 'Direct Outdoor Sale Form'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                <div><label className="block text-xs font-black text-slate-400 mb-1 uppercase">Invoice ID</label><input type="text" value={salesFormData.invoiceId} disabled className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-500 font-bold"/></div>
                <div><label className="block text-xs font-black text-slate-400 mb-1 uppercase">Sale Date</label><input type="date" value={salesFormData.invoiceDate} onChange={e=>setSalesFormData({...salesFormData, invoiceDate:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-black shadow-inner focus:border-emerald-500 outline-none"/></div>
                <div><label className="block text-xs font-black text-slate-400 mb-1 uppercase">Customer Name</label><input type="text" value={salesFormData.customerName} onChange={e=>setSalesFormData({...salesFormData, customerName:e.target.value})} className={`w-full bg-slate-900 border rounded-xl p-3 text-white font-black ${errors.customerName?'border-red-500':'border-slate-700 focus:border-emerald-500 outline-none shadow-inner'}`}/></div>
                <div><label className="block text-xs font-black text-slate-400 mb-1 uppercase">Mobile No.</label><input type="text" value={salesFormData.customerMobile} onChange={e=>setSalesFormData({...salesFormData, customerMobile:e.target.value})} className={`w-full bg-slate-900 border rounded-xl p-3 text-white font-black shadow-inner ${errors.customerMobile?'border-red-500':'border-slate-700'}`}/></div>
                <div><label className="block text-xs font-black text-slate-400 mb-1 uppercase">Referrer</label><input type="text" value={salesFormData.refDoctorName} onChange={e=>setSalesFormData({...salesFormData, refDoctorName:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-bold shadow-inner" placeholder="Optional"/></div>
            </div>
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700 mb-8 shadow-inner ring-1 ring-emerald-500/10">
                <h3 className="text-xs font-black text-emerald-300 mb-4 uppercase tracking-[0.3em] flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-300 rounded-full"></span> Stock Check & Add</h3>
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[350px] relative">
                        <label className="block text-xs font-black text-slate-500 mb-1 uppercase ml-1">Search & Select Medicine (Trade + Generic)</label>
                        <input type="text" value={searchTerm} onChange={e=>handleSearchChange(e.target.value, 'sell')} onFocus={() => handleSearchChange('', 'sell')} onBlur={() => setTimeout(()=>setShowSuggestions(false), 200)} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4 text-white font-black placeholder-slate-800 shadow-lg focus:ring-2 focus:ring-emerald-500 outline-none text-lg" placeholder="Search Brand/Generic..." />
                        {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute z-[100] w-full bg-slate-800 border-2 border-slate-500 mt-2 max-h-80 overflow-y-auto rounded-2xl shadow-2xl divide-y divide-slate-700">
                            {suggestions.map(m=><li key={m.id} onMouseDown={()=>selectMedicineForSale(m)} className="p-4 hover:bg-emerald-900/30 cursor-pointer text-white flex justify-between items-center transition-colors"><div className="flex flex-col"><span className="font-black text-white text-lg">{m.tradeName} <span className="text-sky-400 font-bold">({m.strength})</span></span><span className="text-xs text-slate-400 font-bold italic">{m.genericName}</span></div><span className={`text-xs px-3 py-1 rounded-full font-black ${m.stock < 10 ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>STOCK: {m.stock}</span></li>)}
                        </ul>
                        )}
                    </div>
                    <div className="w-28"><label className="block text-xs font-black text-slate-500 mb-1 uppercase text-center">Unit P.</label><input type="number" value={currentSalesItem.unitPriceSell} onChange={e=>setCurrentSalesItem({...currentSalesItem, unitPriceSell:parseFloat(e.target.value)})} onFocus={e=>e.target.select()} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4 text-white font-black text-right" /></div>
                    <div className="w-24"><label className="block text-xs font-black text-slate-500 mb-1 uppercase text-center">Qty</label><input type="number" value={currentSalesItem.qtySelling} onChange={e=>setCurrentSalesItem({...currentSalesItem, qtySelling:parseFloat(e.target.value)})} onFocus={e=>e.target.select()} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4 text-white font-black text-center" /></div>
                    <button onClick={addSalesItem} className="bg-emerald-600 text-white px-10 py-4 rounded-xl hover:bg-emerald-500 font-black shadow-2xl transform active:scale-95 transition-all">Add Item</button>
                </div>
            </div>
            <div className="overflow-x-auto border-2 border-slate-700 rounded-2xl mb-8 shadow-2xl"><table className="w-full text-left border-collapse text-sm"><thead className="bg-slate-700 text-white"><tr><th className="p-4 uppercase text-xs font-black">X</th><th className="p-4 uppercase text-xs font-black">Medicine Info</th><th className="p-4 text-right uppercase text-xs font-black">Price</th><th className="p-4 text-center uppercase text-xs font-black">Qty</th><th className="p-4 text-right uppercase text-xs font-black">Line Total</th></tr></thead><tbody>{salesFormData.items.map((item, i) => (<tr key={i} className="border-b border-slate-700 bg-slate-800/50 hover:bg-slate-700 transition-colors"><td className="p-4 text-center"><button onClick={()=>handleRemoveSalesItemWithConfirm(i)} className="text-red-500 font-black bg-slate-900 w-10 h-10 rounded-full flex items-center justify-center border border-red-900 hover:bg-red-600 hover:text-white transition-all shadow" title="আইটেমটি বিক্রয় ড্রাফট থেকে মুছুন">×</button></td><td className="p-4"><div className="font-black text-white text-lg">{item.tradeName} <span className="text-sm font-bold text-sky-400">({item.strength})</span></div><div className="text-xs text-slate-400 italic font-bold">{item.genericName}</div></td><td className="p-4 text-right text-slate-300 font-bold">{item.unitPriceSell.toFixed(2)}</td><td className="p-4 text-center font-black text-white text-2xl">{item.qtySelling}</td><td className="p-4 text-right font-black text-emerald-400 text-2xl">৳{item.lineTotalSell.toFixed(2)}</td></tr>))}</tbody></table></div>
            <div className="flex flex-col md:flex-row justify-end gap-6">
                <div className="bg-slate-900 p-8 rounded-3xl border-2 border-slate-700 space-y-5 w-full md:w-[450px] shadow-2xl">
                    <div className="flex justify-between items-center text-slate-500 font-black uppercase text-xs tracking-widest"><span>Sub-Total Gross:</span> <span className="text-white text-2xl">৳{salesFormData.totalAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-slate-500 font-black uppercase text-xs tracking-widest"><span>Less Discount:</span> <input type="number" value={salesFormData.discount} onChange={e=>setSalesFormData({...salesFormData, discount:parseFloat(e.target.value)||0})} className="w-32 bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-right text-white font-black text-lg focus:border-blue-500 outline-none"/></div>
                    <div className="flex justify-between items-center text-sky-400 font-black border-t-2 border-slate-800 pt-5 text-3xl uppercase tracking-tighter"><span>NET BILL:</span> <span>৳{salesFormData.netPayable.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-emerald-400 font-black uppercase text-xs tracking-widest"><span>Cash Received:</span> <input type="number" value={salesFormData.paidAmount} onChange={e=>setSalesFormData({...salesFormData, paidAmount:parseFloat(e.target.value)||0})} className="w-32 bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-right text-white font-black text-2xl focus:border-emerald-500 outline-none"/></div>
                    <div className="flex justify-between items-center text-red-500 font-black text-3xl uppercase tracking-tighter"><span>DUE AMOUNT:</span> <span>৳{salesFormData.dueAmount.toFixed(2)}</span></div>
                </div>
            </div>
          <div className="mt-10 flex justify-end gap-5">
            <button 
              onClick={()=>{setSellViewMode('list'); setErrors({}); setEditingInvoiceId(null);}} 
              className="px-10 py-5 bg-slate-700 text-white rounded-2xl font-black hover:bg-slate-600 shadow-xl transition-all uppercase tracking-widest"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveSales} 
              disabled={loading}
              className={`px-20 py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl transform transition-all text-xl uppercase tracking-widest ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-500 active:scale-95'}`}
            >
              {loading ? 'Processing...' : (sellViewMode === 'edit' ? 'Update Corrections' : 'Complete Sale')}
            </button>
          </div>
        </div>
    );
  };

  const renderStoreTab = () => {
      return (
          <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-700 pb-3">
                  <div>
                    <h2 className="text-2xl font-black text-purple-400 flex items-center gap-2 uppercase tracking-tighter">
                      <span className="w-3.5 h-3.5 bg-purple-500 rounded-full animate-pulse"></span>
                      লাইভ মেডিসিন স্টক ও মেয়াদ ট্র্যাকিং (Live Stock Inventory)
                    </h2>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      ওষুধের স্টক, মেয়াদ উত্তীর্ণের সংকেত এবং ইনভেন্টরি এসেট পর্যবেক্ষণ
                    </p>
                  </div>
                  <button 
                    onClick={handlePrintStore} 
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 text-sm"
                  >
                    <FileTextIcon className="w-4 h-4"/> প্রিন্ট স্টক তালিকা (Print)
                  </button>
              </div>

              {/* Live Inventory & Expiry Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 shadow-xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">মোট ওষুধ প্রজাতি</span>
                      <span className="text-2xl font-black text-white">{storeStats.totalItems} টি</span>
                  </div>
                  <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 shadow-xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">মোট ইনভেন্টরি এসেট</span>
                      <span className="text-2xl font-black text-emerald-400">৳ {storeStats.totalAssetValue.toLocaleString()}</span>
                  </div>
                  <div 
                    onClick={() => setStoreFilterStatus('expired')} 
                    className={`p-4 rounded-2xl border shadow-xl cursor-pointer transition-all ${
                      storeFilterStatus === 'expired' 
                        ? 'bg-rose-950/80 border-rose-500 ring-2 ring-rose-500' 
                        : 'bg-rose-950/40 border-rose-900/60 hover:bg-rose-950/60'
                    }`}
                  >
                      <span className="text-[10px] font-black text-rose-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        🔴 মেয়াদোত্তীর্ণ ওষুধ
                      </span>
                      <span className="text-2xl font-black text-rose-400 flex items-center gap-2">
                        {storeStats.expiredCount} টি
                        {storeStats.expiredCount > 0 && <span className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded-full animate-bounce">সতর্কতা!</span>}
                      </span>
                  </div>
                  <div 
                    onClick={() => setStoreFilterStatus('expiring')} 
                    className={`p-4 rounded-2xl border shadow-xl cursor-pointer transition-all ${
                      storeFilterStatus === 'expiring' 
                        ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500' 
                        : 'bg-amber-950/40 border-amber-900/60 hover:bg-amber-950/60'
                    }`}
                  >
                      <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block mb-1">
                        🟡 মেয়াদ শেষ হতে চলেছে (&lt;3 মাস)
                      </span>
                      <span className="text-2xl font-black text-amber-400">
                        {storeStats.expiringCount} টি
                      </span>
                  </div>
                  <div 
                    onClick={() => setStoreFilterStatus('low_stock')} 
                    className={`p-4 rounded-2xl border shadow-xl cursor-pointer transition-all ${
                      storeFilterStatus === 'low_stock' 
                        ? 'bg-orange-950/80 border-orange-500 ring-2 ring-orange-500' 
                        : 'bg-orange-950/40 border-orange-900/60 hover:bg-orange-950/60'
                    }`}
                  >
                      <span className="text-[10px] font-black text-orange-300 uppercase tracking-wider block mb-1">
                        ⚠️ স্টক স্বল্পতা (&lt;10 পিস)
                      </span>
                      <span className="text-2xl font-black text-orange-400">
                        {storeStats.lowStockCount} টি
                      </span>
                  </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 p-4 rounded-2xl border border-slate-700 shadow-lg">
                  <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setStoreFilterStatus('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                          storeFilterStatus === 'all'
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                        }`}
                      >
                        সকল ওষুধ ({storeStats.totalItems})
                      </button>
                      <button
                        onClick={() => setStoreFilterStatus('expired')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                          storeFilterStatus === 'expired'
                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50 ring-2 ring-rose-400'
                            : 'bg-slate-800 text-rose-400 hover:text-white border border-rose-900/60'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        🔴 মেয়াদ উত্তীর্ণ ({storeStats.expiredCount})
                      </button>
                      <button
                        onClick={() => setStoreFilterStatus('expiring')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                          storeFilterStatus === 'expiring'
                            ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-400'
                            : 'bg-slate-800 text-amber-400 hover:text-white border border-amber-900/60'
                        }`}
                      >
                        🟡 মেয়াদ শেষ হবে শীঘ্রই ({storeStats.expiringCount})
                      </button>
                      <button
                        onClick={() => setStoreFilterStatus('low_stock')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                          storeFilterStatus === 'low_stock'
                            ? 'bg-orange-600 text-white shadow-lg'
                            : 'bg-slate-800 text-orange-400 hover:text-white border border-slate-700'
                        }`}
                      >
                        ⚠️ লো স্টক ({storeStats.lowStockCount})
                      </button>
                  </div>

                  <div className="relative w-full sm:w-80">
                      <input
                        type="text"
                        placeholder="ব্র্যান্ড বা জেনেরিক দিয়ে খুঁজুন..."
                        value={storeSearch}
                        onChange={e => setStoreSearch(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 outline-none shadow-inner font-bold"
                      />
                      {storeSearch && (
                        <button
                          onClick={() => setStoreSearch('')}
                          className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                  </div>
              </div>

              {/* Live Inventory Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-700 shadow-2xl">
                  <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-700 text-slate-100">
                          <tr>
                              <th className="p-4 uppercase text-xs font-black tracking-wider">Brand Name</th>
                              <th className="p-4 uppercase text-xs font-black tracking-wider">Generic Formula</th>
                              <th className="p-4 uppercase text-xs font-black tracking-wider">Form</th>
                              <th className="p-4 text-center uppercase text-xs font-black tracking-wider">মেয়াদ (Expiry Status)</th>
                              <th className="p-4 text-right uppercase text-xs font-black tracking-wider">Buy P.</th>
                              <th className="p-4 text-right uppercase text-xs font-black tracking-wider">Sell P.</th>
                              <th className="p-4 text-center uppercase text-xs font-black tracking-wider">Stock</th>
                              <th className="p-4 text-right uppercase text-xs font-black tracking-wider">Asset Value</th>
                              <th className="p-4 text-center uppercase text-xs font-black tracking-wider">Adjust</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/60">
                          {filteredStoreMedicines.map((m, i) => {
                              if (!m) return null;
                              const isExp = m.expInfo.status === 'expired';
                              const isExpiring = m.expInfo.status === 'expiring';
                              return (
                                  <tr 
                                    key={m.id || i} 
                                    className={`transition-colors ${m.expInfo.rowClass}`}
                                  >
                                      <td className="p-4 font-black text-white text-base">
                                          <div className="flex items-center gap-2">
                                            {isExp && <span className="text-rose-500 font-black text-base" title="মেয়াদোত্তীর্ণ!">🔴</span>}
                                            {isExpiring && <span className="text-amber-400 font-black text-base" title="শীঘ্রই মেয়াদোত্তীর্ণ!">🟡</span>}
                                            <span>{m.tradeName}</span>
                                            <span className="text-xs font-bold text-slate-400">({m.strength})</span>
                                          </div>
                                      </td>
                                      <td className="p-4 text-sky-400 text-sm font-bold italic">{m.genericName || '-'}</td>
                                      <td className="p-4 text-slate-300 text-xs font-bold uppercase">{m.formulation}</td>
                                      <td className="p-4 text-center whitespace-nowrap">
                                          <div className="flex flex-col items-center gap-1">
                                            <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold inline-block shadow-sm ${m.expInfo.badgeClass}`}>
                                              {m.expiryDate || 'অনুল্লিখিত'}
                                            </span>
                                            <span className={`text-[10px] font-black ${
                                              isExp ? 'text-rose-400 animate-pulse' : isExpiring ? 'text-amber-400' : 'text-slate-500'
                                            }`}>
                                              {m.expInfo.daysText}
                                            </span>
                                          </div>
                                      </td>
                                      <td className="p-4 text-right text-slate-300 font-bold">৳{(m.unitPriceBuy || 0).toFixed(2)}</td>
                                      <td className="p-4 text-right text-white font-black">৳{Number(m.unitPriceSell || 0).toFixed(2)}</td>
                                      <td className="p-4 text-center font-black text-xl">
                                          <span className={`px-2.5 py-1 rounded-lg ${
                                            (m.stock || 0) <= 0 
                                              ? 'bg-rose-950 text-rose-400 border border-rose-800' 
                                              : (m.stock || 0) < 10 
                                              ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse' 
                                              : 'text-emerald-400'
                                          }`}>
                                            {m.stock}
                                          </span>
                                      </td>
                                      <td className="p-4 text-right text-slate-300 font-bold">
                                        ৳{((m.stock || 0) * (m.unitPriceBuy || 0)).toFixed(2)}
                                      </td>
                                      <td className="p-4 text-center">
                                          <button 
                                            onClick={() => { 
                                              setAdjustmentData({ 
                                                medicineId: m.id, 
                                                tradeName: m.tradeName, 
                                                genericName: m.genericName, 
                                                strength: m.strength, 
                                                formulation: m.formulation, 
                                                currentStock: m.stock, 
                                                adjustmentType: 'add', 
                                                adjustmentQty: '', 
                                                newSellingPrice: (m.unitPriceSell || 0).toString() 
                                              }); 
                                              setShowAdjustmentModal(true); 
                                            }} 
                                            className="bg-slate-900 hover:bg-purple-900/60 text-purple-400 hover:text-white p-2.5 rounded-xl border border-purple-900/50 transition-all shadow-md active:scale-95"
                                            title="স্টক সংশোধন"
                                          >
                                              <RefreshIcon className="w-4 h-4"/>
                                          </button>
                                      </td>
                                  </tr>
                              ); 
                          })}
                      </tbody>
                  </table>
                  {filteredStoreMedicines.length === 0 && (
                      <div className="p-16 text-center text-slate-500 font-black text-lg uppercase tracking-wider">
                        কোনো ওষুধের রেকর্ড পাওয়া যায়নি।
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const renderMedicineChartTab = () => {
      const cleanSearch = (drugSearch || '').toLowerCase();
      const filteredDrugs = (Array.isArray(clinicalDrugs) ? clinicalDrugs : []).filter(d => d && ((d.brandName || '').toLowerCase().includes(cleanSearch) || (d.genericName || '').toLowerCase().includes(cleanSearch)));
      return (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
                  <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3 border-b border-slate-700 pb-3 uppercase tracking-tighter"><FileTextIcon className="w-8 h-8 text-blue-400" /> {isEditingDrug ? 'Edit Monograph' : 'Drug Formulary Entry'}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <div><label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Trade Name</label><input className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl p-3 text-white font-black focus:border-blue-500 outline-none" value={clinicalDrugForm.brandName} onChange={e=>setClinicalDrugForm({...clinicalDrugForm, brandName:e.target.value})}/></div>
                      <div><label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Generic Name</label><input className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl p-3 text-white font-black focus:border-blue-500 outline-none" value={clinicalDrugForm.genericName} onChange={e=>setClinicalDrugForm({...clinicalDrugForm, genericName:e.target.value})}/></div>
                      <div><label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Preg. Category</label><select className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl p-3 text-white font-black focus:border-blue-500 outline-none" value={clinicalDrugForm.pregnancyCategory} onChange={e=>setClinicalDrugForm({...clinicalDrugForm, pregnancyCategory:e.target.value as any})}><option>A</option><option>B</option><option>C</option><option>D</option><option>X</option><option>N/A</option></select></div>
                      <div><label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">Strength</label><input className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl p-3 text-white font-black focus:border-blue-500 outline-none" value={clinicalDrugForm.strength} onChange={e=>setClinicalDrugForm({...clinicalDrugForm, strength: e.target.value})}/></div>
                  </div>
                  <div className="flex justify-end gap-4"><button onClick={() => { setIsEditingDrug(false); setClinicalDrugForm({ id: '', brandName: '', genericName: '', strength: '', formulation: 'Tab', company: '', pregnancyCategory: 'B', indications: [], sideEffects: [], adultDose: '' }); }} className="px-8 py-3 bg-slate-700 text-white rounded-xl font-bold transition-all">Reset</button><button onClick={handleSaveClinicalDrug} className="px-16 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-500 shadow-xl transition-all uppercase tracking-widest">{isEditingDrug ? 'Update' : 'Save Drug'}</button></div>
              </div>
              <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
                <div className="mb-6 flex justify-between items-center border-b border-slate-700 pb-3"><h3 className="text-xl font-black text-white uppercase tracking-tighter">Pharmacy Database</h3><div className="relative w-72"><input type="text" placeholder="Filter Brands..." value={drugSearch} onChange={e=>setDrugSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-full px-5 py-2 text-sm text-white focus:border-blue-500 outline-none"/></div></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-300 border-collapse"><thead className="bg-slate-700 text-slate-100"><tr><th className="p-4 uppercase text-xs font-black tracking-widest">Brand Name</th><th className="p-4 uppercase text-xs font-black tracking-widest">Generic</th><th className="p-4 uppercase text-xs font-black text-center tracking-widest">Preg Cat</th><th className="p-4 uppercase text-xs font-black text-center tracking-widest">Action</th></tr></thead><tbody>{filteredDrugs.map(d => (<tr key={d.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"><td className="p-4 font-black text-white text-base">{d.brandName} <span className="text-xs font-bold text-slate-500">{d.strength}</span></td><td className="p-4 italic text-sky-400 font-bold">{d.genericName}</td><td className="p-4 text-center"><span className="px-3 py-1 rounded-full text-[10px] font-black shadow-inner bg-emerald-600 text-white">{d.pregnancyCategory}</span></td><td className="p-4 text-center space-x-3"><button onClick={()=>{setClinicalDrugForm(d); setIsEditingDrug(true); window.scrollTo({top:0, behavior:'smooth'});}} className="text-blue-400 hover:text-white font-bold underline">Edit</button><button onClick={()=>{if(confirm("Delete?")) setClinicalDrugs(prev=>prev.filter(x=>x.id!==d.id))}} className="text-red-500 hover:text-white font-bold underline">Del</button></td></tr>))}</tbody></table></div>
              </div>
          </div>
      );
  };

  const renderHishabTab = () => {
    const filteredPurchases = safeInvoices.filter(inv => {
        if (!inv || !inv.invoiceDate || inv.status === 'Cancelled' || inv.status === 'Initial' || inv.status === 'Deleted') return false;
        const parts = (inv.invoiceDate || '').split('-');
        if (parts.length < 2) return false;
        const [y, m] = parts.map(Number);
        return (m - 1) === selectedMonth && y === selectedYear;
    });
    const filteredSales = safeSalesInvoices.filter(inv => {
        if (!inv || !inv.invoiceDate || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return false;
        const parts = (inv.invoiceDate || '').split('-');
        if (parts.length < 2) return false;
        const [y, m] = parts.map(Number);
        return (m - 1) === selectedMonth && y === selectedYear;
    });
    const buyTotals = filteredPurchases.reduce((acc, inv) => { 
        acc.val += (Number(inv.netPayable) || 0); 
        acc.paid += (Number(inv.paidAmount) || 0); 
        return acc; 
    }, { val: 0, paid: 0 });
    
    const indoorSalesTotal = safeIndoorInvoices.filter(inv => {
        if (!inv) return false;
        const dateToUse = inv.invoice_date || inv.admission_date || (inv as any).date || '';
        if (!dateToUse || typeof dateToUse !== 'string' || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return false;
        const parts = dateToUse.split('-');
        if (parts.length < 2) return false;
        const [y, m] = parts.map(Number);
        return (m - 1) === selectedMonth && y === selectedYear;
    }).reduce((sum, inv) => {
        const items = Array.isArray(inv.items) ? inv.items : [];
        return sum + items.filter(it => it && (it.service_type === 'Medicine' || it.service_type === 'ঔষধ' || (it.service_type || '').toLowerCase().includes('med'))).reduce((s, it) => s + (Number(it.payable_amount) || Number(it.line_total) || 0), 0);
    }, 0);

    const saleTotals = { total: filteredSales.reduce((sum, inv) => sum + (Number(inv.netPayable) || 0), 0) + indoorSalesTotal };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl">
                <div>
                  <h3 className="text-2xl font-black text-white font-bengali tracking-tighter uppercase flex items-center gap-3">
                    <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                    ঔষধ লেজার বিশ্লেষণ ও মাসিক হিসাব (Medicine Ledger & Accounts)
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    ইনভয়েস বা এককালীন এন্ট্রি অনুযায়ী মাসিক ক্রয়, বিক্রয় ও নিট মুনাফা বিশ্লেষণ
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => openLumpSumPurchaseModal(selectedMonth, selectedYear)}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95 text-xs border border-amber-500"
                      title="উক্ত মাসের এককালীন মোট ঔষধ ক্রয় লিখে রাখুন"
                    >
                      <PlusIcon className="w-4 h-4 text-amber-200" /> + এককালীন ক্রয়
                    </button>
                    <button 
                      onClick={() => openLumpSumSalesModal(selectedMonth, selectedYear)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95 text-xs border border-emerald-400"
                      title="উক্ত মাসের এককালীন মোট ঔষধ বিক্রয় লিখে রাখুন"
                    >
                      <PlusIcon className="w-4 h-4 text-emerald-200" /> + এককালীন বিক্রয়
                    </button>
                    <button onClick={handlePrintHishab} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 text-xs">
                      <FileTextIcon className="w-4 h-4"/> মাসিক হিসাব প্রিন্ট (A4)
                    </button>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-900 border-2 border-slate-700 rounded-xl px-3 py-2 text-white font-black text-xs">
                      {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                    </select>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-900 border-2 border-slate-700 rounded-xl px-3 py-2 text-white font-black text-xs">
                      {[2022, 2023, 2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700 flex flex-col items-center shadow-lg">
                    <span className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">মোট ক্রয় (Total Buy)</span>
                    <span className="text-3xl font-black text-rose-400">৳ {buyTotals.val.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1">পরিশোধ: ৳{buyTotals.paid.toLocaleString()}</span>
                </div>
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700 flex flex-col items-center shadow-lg">
                    <span className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">মোট বিক্রয় (Total Sell)</span>
                    <span className="text-3xl font-black text-emerald-400">৳ {saleTotals.total.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1">
                      {indoorSalesTotal > 0 ? `আউটডোর: ৳${(saleTotals.total - indoorSalesTotal).toLocaleString()} | ইনডোর: ৳${indoorSalesTotal.toLocaleString()}` : 'আউটডোর ও ফার্মেসি সেল'}
                    </span>
                </div>
                <div className={`bg-slate-900 p-6 rounded-2xl border-2 flex flex-col items-center shadow-lg ${saleTotals.total - buyTotals.val >= 0 ? 'border-emerald-500/50' : 'border-rose-500/50'}`}>
                    <span className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">নিট লাভ / ব্যালেন্স (Net Profit)</span>
                    <span className={`text-3xl font-black ${saleTotals.total - buyTotals.val >= 0 ? 'text-blue-400' : 'text-rose-500'}`}>
                        ৳ {(saleTotals.total - buyTotals.val).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold mt-1">
                      {saleTotals.total - buyTotals.val >= 0 ? 'উদ্বৃত্ত / লাভ' : 'ঘাটতি / ব্যয় বেশি'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b-2 border-blue-900/50 pb-2">
                      <h4 className="text-lg font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
                        <span>📦</span> ক্রয় খতিয়ান (Stock Purchase Ledger)
                      </h4>
                      <button
                        onClick={() => openLumpSumPurchaseModal(selectedMonth, selectedYear)}
                        className="text-amber-400 hover:text-white text-xs font-bold underline"
                      >
                        + এককালীন ক্রয়
                      </button>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border-2 border-slate-700 shadow-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-700 text-slate-100">
                          <tr>
                            <th className="p-3.5 border-r border-slate-600">তারিখ</th>
                            <th className="p-3.5 border-r border-slate-600">সরবরাহকারী</th>
                            <th className="p-3.5 text-right">বিল (৳)</th>
                            <th className="p-3.5 text-right">পরিশোধ</th>
                            <th className="p-3.5 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700">
                          {filteredPurchases.map((inv) => (
                            <tr key={inv.invoiceId} className="hover:bg-slate-750">
                              <td className="p-3.5 border-r border-slate-700 text-slate-400 font-mono">{inv.invoiceDate}</td>
                              <td className="p-3.5 border-r border-slate-700 font-black text-white">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{inv.source}</span>
                                  {isLumpSumPurchase(inv) && (
                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black px-1.5 py-0.5 rounded">
                                      এককালীন
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3.5 text-right font-black text-slate-200">৳{(inv.netPayable || 0).toLocaleString()}</td>
                              <td className="p-3.5 text-emerald-400 font-black text-right">৳{Number(inv.paidAmount || 0).toLocaleString()}</td>
                              <td className="p-3.5 text-center flex justify-center gap-3">
                                {isLumpSumPurchase(inv) ? (
                                  <>
                                    <button
                                      onClick={() => openEditLumpSumPurchase(inv)}
                                      className="text-amber-400 hover:text-white underline font-bold"
                                    >
                                      এডিট
                                    </button>
                                    <button
                                      onClick={() => setViewingPurchaseInvoice(inv)}
                                      className="text-sky-400 hover:text-white underline font-bold"
                                    >
                                      প্রিন্ট
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setViewingPurchaseInvoice(inv)}
                                    className="text-sky-400 hover:text-white underline font-bold"
                                  >
                                    ভিউ
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {filteredPurchases.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                এই মাসে কোনো ক্রয় রেকর্ড পাওয়া যায়নি।
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white font-black">
                          <tr>
                            <td colSpan={2} className="p-3.5 text-right text-xs">মাসিক মোট ক্রয়:</td>
                            <td className="p-3.5 text-right text-rose-400">৳{buyTotals.val.toLocaleString()}</td>
                            <td className="p-3.5 text-right text-emerald-400">৳{buyTotals.paid.toLocaleString()}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b-2 border-emerald-900/50 pb-2">
                      <h4 className="text-lg font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <span>💰</span> বিক্রয় খতিয়ান (Sales Journal)
                      </h4>
                      <button
                        onClick={() => openLumpSumSalesModal(selectedMonth, selectedYear)}
                        className="text-emerald-400 hover:text-white text-xs font-bold underline"
                      >
                        + এককালীন বিক্রয়
                      </button>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border-2 border-slate-700 shadow-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-700 text-slate-100">
                          <tr>
                            <th className="p-3.5 border-r border-slate-600">তারিখ</th>
                            <th className="p-3.5 border-r border-slate-600">খাত / বিবরণ</th>
                            <th className="p-3.5 text-right">বিক্রয় টাকা (৳)</th>
                            <th className="p-3.5 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700">
                          {filteredSales.map((inv) => (
                            <tr key={inv.invoiceId} className="hover:bg-slate-750">
                              <td className="p-3.5 border-r border-slate-700 text-slate-400 font-mono">{inv.invoiceDate}</td>
                              <td className="p-3.5 border-r border-slate-700 text-slate-100 font-bold">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{inv.customerName}</span>
                                  {isLumpSumSale(inv) && (
                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-1.5 py-0.5 rounded">
                                      এককালীন
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3.5 text-right font-black text-emerald-400">৳{(inv.netPayable || 0).toLocaleString()}</td>
                              <td className="p-3.5 text-center flex justify-center gap-3">
                                {isLumpSumSale(inv) ? (
                                  <>
                                    <button
                                      onClick={() => openEditLumpSumSales(inv)}
                                      className="text-emerald-400 hover:text-white underline font-bold"
                                    >
                                      এডিট
                                    </button>
                                    <button
                                      onClick={() => handlePrintSale(inv)}
                                      className="text-sky-400 hover:text-white underline font-bold"
                                    >
                                      প্রিন্ট
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handlePrintSale(inv)}
                                    className="text-sky-400 hover:text-white underline font-bold"
                                  >
                                    ভাউচার
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {indoorSalesTotal > 0 && (
                            <tr className="bg-purple-950/40">
                              <td className="p-3.5 border-r border-slate-700 text-slate-400 font-mono">-</td>
                              <td className="p-3.5 border-r border-slate-700 font-bold text-purple-300">
                                ইনডোর মোট ঔষধ বিল
                              </td>
                              <td className="p-3.5 text-right font-black text-purple-300">৳{indoorSalesTotal.toLocaleString()}</td>
                              <td className="p-3.5 text-center text-slate-500 text-[10px]">ইনডোর</td>
                            </tr>
                          )}
                          {filteredSales.length === 0 && indoorSalesTotal === 0 && (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                                এই মাসে কোনো বিক্রয় রেকর্ড পাওয়া যায়নি।
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white font-black">
                          <tr>
                            <td colSpan={2} className="p-3.5 text-right text-xs">মাসিক মোট বিক্রয় রেভিনিউ:</td>
                            <td className="p-3.5 text-right text-emerald-400">৳{saleTotals.total.toLocaleString()}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="w-full bg-slate-900 text-slate-100 flex flex-col relative font-sans pb-32">
      {successMessage && <div className="fixed top-24 right-8 z-[150] bg-green-600 border-2 border-green-400 text-white px-10 py-5 rounded-2xl shadow-2xl font-black text-xl animate-fade-in-down">✅ {successMessage}</div>}
      
      {/* MANUAL STOCK ADJUSTMENT MODAL */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-slate-600 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-lg animate-scale-in">
            <h3 className="text-3xl font-black text-white mb-2 uppercase text-center tracking-tighter">Manual Stock Adjustment</h3>
            <p className="text-center text-slate-400 text-sm mb-6">Medicine: <span className="text-purple-400 font-black">{adjustmentData.tradeName} ({adjustmentData.strength})</span></p>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700 flex flex-col items-center">
                  <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Generic</span>
                  <span className="text-white font-bold text-sm italic">{adjustmentData.genericName}</span>
                </div>
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700 flex flex-col items-center">
                  <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Current Stock</span>
                  <span className="text-emerald-400 font-black text-2xl">{adjustmentData.currentStock}</span>
                </div>
              </div>

              <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-700">
                <button 
                  onClick={() => setAdjustmentData({...adjustmentData, adjustmentType: 'add'})}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${adjustmentData.adjustmentType === 'add' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  <PlusIcon className="w-4 h-4"/> Add Stock
                </button>
                <button 
                  onClick={() => setAdjustmentData({...adjustmentData, adjustmentType: 'subtract'})}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${adjustmentData.adjustmentType === 'subtract' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  <TrendingDownIcon className="w-4 h-4"/> Subtract Stock
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase ml-2 tracking-widest">Adjustment Qty</label>
                  <input 
                    type="number" 
                    value={adjustmentData.adjustmentQty} 
                    onChange={e => setAdjustmentData({...adjustmentData, adjustmentQty: e.target.value})} 
                    className="w-full bg-slate-900 border-2 border-slate-700 focus:border-purple-500 rounded-2xl p-4 text-white font-black text-2xl outline-none text-center" 
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase ml-2 tracking-widest">New Selling Price</label>
                  <input 
                    type="number" 
                    value={adjustmentData.newSellingPrice} 
                    onChange={e => setAdjustmentData({...adjustmentData, newSellingPrice: e.target.value})} 
                    className="w-full bg-slate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl p-4 text-white font-black text-2xl outline-none text-center" 
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700 text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Note: Purchase Price for this adjustment is ৳0.00</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowAdjustmentModal(false)} 
                  className="flex-1 py-4 bg-slate-700 text-white rounded-2xl font-black hover:bg-slate-600 transition-all uppercase text-xs tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleManualAdjustment} 
                  className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-500 shadow-2xl transition-all uppercase text-xs tracking-widest"
                >
                  Confirm Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-800 border-2 border-slate-600 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-scale-in">
                <h3 className="text-3xl font-black text-white mb-2 uppercase text-center tracking-tighter">Supplier Due Payment</h3>
                <p className="text-center text-slate-400 text-sm mb-8">Paying to: <span className="text-sky-400 font-black">{paymentData.supplierName}</span></p>
                <div className="space-y-6">
                    <div className="bg-slate-900 p-5 rounded-3xl border border-slate-700 flex justify-between items-center shadow-inner"><span className="text-slate-500 font-black uppercase text-xs tracking-widest">Current Debt</span><span className="text-red-500 font-black text-4xl">৳{paymentData.currentDue.toFixed(2)}</span></div>
                    <div><label className="block text-xs font-black text-slate-500 mb-1 uppercase ml-2 tracking-widest">Payment Amount</label><input type="number" value={paymentData.payAmount} onChange={e=>setPaymentData({...paymentData, payAmount: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-3xl p-5 text-white font-black text-4xl outline-none text-center shadow-2xl" placeholder="0.00" autoFocus/></div>
                </div>
                <div className="grid grid-cols-2 gap-5 mt-10"><button onClick={()=>setShowPaymentModal(false)} className="py-5 bg-slate-700 text-white rounded-3xl font-black hover:bg-slate-600 transition-all uppercase tracking-widest">Cancel</button><button onClick={handleProcessDuePayment} className="py-5 bg-emerald-600 text-white rounded-3xl font-black hover:bg-emerald-500 shadow-2xl transition-all uppercase tracking-widest">Confirm Pay</button></div>
            </div>
        </div>
      )}

      {/* HEADER WITH ADDRESS */}
      <header className="bg-slate-800 shadow-2xl border-b border-slate-700 z-20 relative pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto py-6 px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex flex-col">
                    <h1 className="text-2xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-200 to-blue-400 leading-tight tracking-tighter uppercase drop-shadow-lg">Niramoy Clinic & Diagnostic</h1>
                    <div className="flex items-center gap-2 text-slate-400 text-sm md:text-base font-bold mt-1 ml-1">
                        <MapPinIcon className="w-5 h-5 text-sky-500" />
                        <span>এনায়েতপুর মন্ডলপাড়া, এনায়েতপুর, সিরাজগঞ্জ</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/60 px-8 py-4 rounded-full border border-slate-600/50 shadow-inner backdrop-blur-md">
                    <PhoneIcon className="w-6 h-6 text-amber-400" />
                    <span className="text-xl font-black tracking-widest font-mono text-white">01730 923007</span>
                </div>
            </div>
        </div>
      </header>
      
      <div className="container mx-auto px-6 pt-8 pb-4 z-10"><button onClick={onBack} className="flex items-center text-slate-500 hover:text-white transition-all group font-black uppercase text-sm tracking-widest"><div className="p-2 rounded-full group-hover:bg-slate-800 transition-all mr-2"><BackIcon className="w-6 h-6" /></div>Back to Home</button></div>
      
      <div className="flex justify-center items-center z-10 relative mb-8"><div className="flex items-center bg-slate-800 px-16 py-6 rounded-[3rem] border-2 border-rose-500/40 shadow-2xl scale-105"><MedicineIcon className="w-12 h-12 text-rose-500 mr-5 drop-shadow-xl" /><h2 className="text-2xl md:text-4xl font-black text-rose-500 font-bengali uppercase tracking-tighter">মেডিসিন ডিপার্টমেন্ট / Medicine Department</h2></div></div>
      
      <div className="container mx-auto px-6 pb-12 z-10">
        <div className="flex flex-nowrap overflow-x-auto gap-4 mb-10 p-4 bg-slate-800/40 rounded-[2rem] border border-slate-700/50 shadow-3xl backdrop-blur-2xl custom-scrollbar">
          <MenuButton label="Medicine_Buy" isActive={activeTab === 'buy'} onClick={() => { setActiveTab('buy'); setBuyViewMode('list'); }} />
          <MenuButton label="Due Paid" isActive={activeTab === 'due_paid'} onClick={() => setActiveTab('due_paid')} />
          <MenuButton label="Medicine_Sell" isActive={activeTab === 'sell'} onClick={() => { setActiveTab('sell'); setSellViewMode('list'); }} />
          <MenuButton 
            label="Medicine_Store" 
            badge={storeStats.expiredCount > 0 ? `${storeStats.expiredCount} Exp` : undefined}
            isActive={activeTab === 'store'} 
            onClick={() => setActiveTab('store')} 
          />
          <MenuButton label="Medicine_Chart" isActive={activeTab === 'chart'} onClick={() => setActiveTab('chart')} />
          <MenuButton label="Medicine_Hishab" isActive={activeTab === 'hishab'} onClick={() => setActiveTab('hishab')} />
        </div>
        
        <div className="bg-slate-800/80 p-10 rounded-[3rem] border border-slate-700 shadow-[0_40px_120px_rgba(0,0,0,0.6)] min-h-[650px] transition-all duration-700 backdrop-blur-sm">
          {activeTab === 'chart' && renderMedicineChartTab()}
          {activeTab === 'buy' && renderBuyTab()}
          {activeTab === 'sell' && renderSellTab()}
          {activeTab === 'store' && renderStoreTab()}
          {activeTab === 'due_paid' && renderDuePaidTab()}
          {activeTab === 'hishab' && renderHishabTab()}
        </div>
      </div>
      {/* PURCHASE INVOICE DETAIL & PRINT MODAL */}
      {viewingPurchaseInvoice && (
        <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-slate-800 px-6 py-5 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/20 text-sky-400 rounded-xl border border-blue-500/30">
                  <FileTextIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">ক্রয় ইনভয়েস ভাউচার (Purchase Voucher)</h3>
                    <span className="bg-sky-500/20 text-sky-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-sky-500/30">
                      {viewingPurchaseInvoice.invoiceId}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${viewingPurchaseInvoice.status === 'Initial' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {viewingPurchaseInvoice.status || 'Posted'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">নিরাময় ক্লিনিক অ্যান্ড ডায়াগনস্টিক — এনায়েতপুর, সিরাজগঞ্জ</p>
                </div>
              </div>
              <button
                onClick={() => setViewingPurchaseInvoice(null)}
                className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-xl transition-all"
                title="বন্ধ করুন"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Sub-info banner */}
            <div className="bg-slate-850 px-6 py-4 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 uppercase font-black tracking-wider block">ক্রয় তারিখ</span>
                <span className="text-white font-bold text-sm">{viewingPurchaseInvoice.invoiceDate}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-black tracking-wider block">সরবরাহকারী (Supplier)</span>
                <span className="text-sky-300 font-bold text-sm">{viewingPurchaseInvoice.source}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-black tracking-wider block">প্রস্তুতকারক</span>
                <span className="text-slate-300 font-bold text-sm">{viewingPurchaseInvoice.billCreatedBy || 'Admin'}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-black tracking-wider block">মোট আইটেম</span>
                <span className="text-emerald-400 font-bold text-sm">{Array.isArray(viewingPurchaseInvoice.items) ? viewingPurchaseInvoice.items.length : 0} টি ঔষধ</span>
              </div>
            </div>

            {/* Invoice Items Table */}
            <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-800 text-slate-300 uppercase sticky top-0">
                  <tr>
                    <th className="p-3 font-black text-center w-10">#</th>
                    <th className="p-3 font-black">ঔষধের নাম ও শক্তি</th>
                    <th className="p-3 font-black">জেনেরিক</th>
                    <th className="p-3 font-black text-center">ফরম</th>
                    <th className="p-3 font-black text-center">মেয়াদ (Expiry)</th>
                    <th className="p-3 font-black text-center">পরিমাণ</th>
                    <th className="p-3 font-black text-right">ক্রয়মূল্য</th>
                    <th className="p-3 font-black text-right">বিক্রয়মূল্য</th>
                    <th className="p-3 font-black text-right">মোট (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(viewingPurchaseInvoice.items || []).map((item, idx) => {
                    const expInfo = getExpiryInfo(item.expiryDate);
                    return (
                      <tr key={idx} className="hover:bg-slate-800/60 transition-colors">
                        <td className="p-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                        <td className="p-3 font-bold text-white text-sm">
                          {item.tradeName} <span className="text-xs text-slate-400 font-normal">({item.strength})</span>
                        </td>
                        <td className="p-3 text-sky-400 italic">{item.genericName || '-'}</td>
                        <td className="p-3 text-center text-slate-400 uppercase font-mono">{item.formulation || '-'}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {item.expiryDate ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] font-mono inline-block ${expInfo.badgeClass}`}>
                              {item.expiryDate} {expInfo.status === 'expired' ? '⚠️' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">উল্লেখ নেই</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-black text-white text-sm">{item.qtyBuying}</td>
                        <td className="p-3 text-right text-slate-300 font-bold">৳{Number(item.unitPriceBuy || 0).toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-400 font-bold">৳{Number(item.unitPriceSell || 0).toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-emerald-400 text-sm">
                          ৳{Number(item.lineTotalBuy || (item.qtyBuying * item.unitPriceBuy) || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="mt-6 flex justify-end">
                <div className="w-80 bg-slate-800/90 rounded-2xl border border-slate-700 p-4 space-y-2.5 text-xs shadow-inner">
                  <div className="flex justify-between items-center text-slate-300 font-bold">
                    <span>মোট বিল (Sub Total):</span>
                    <span className="text-white text-sm font-black">৳{(viewingPurchaseInvoice.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  {Number(viewingPurchaseInvoice.discount || 0) > 0 && (
                    <div className="flex justify-between items-center text-emerald-400 font-bold">
                      <span>ছাড় (Discount):</span>
                      <span>- ৳{Number(viewingPurchaseInvoice.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sky-400 font-black border-t border-slate-700 pt-2 text-base">
                    <span>সর্বমোট প্রদেয় (Net):</span>
                    <span>৳{(viewingPurchaseInvoice.netPayable || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 font-bold">
                    <span>পরিশোধিত (Paid):</span>
                    <span className="font-black text-sm">৳{Number(viewingPurchaseInvoice.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400 font-black text-sm border-t border-slate-700/60 pt-2">
                    <span>বকেয়া (Due):</span>
                    <span className="text-base font-black">৳{Number(viewingPurchaseInvoice.dueAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-850 px-6 py-4 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => {
                  const invToEdit = viewingPurchaseInvoice;
                  setViewingPurchaseInvoice(null);
                  setPurchaseFormData(invToEdit);
                  setBuyViewMode('edit');
                  setEditingPurchaseId(invToEdit.invoiceId);
                  setIsOpeningStock(invToEdit.status === 'Initial');
                  setActiveTab('buy');
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white rounded-xl font-bold text-xs transition-all border border-slate-700 flex items-center gap-1.5"
              >
                <EditIcon className="w-4 h-4" /> এডিট করুন
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingPurchaseInvoice(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition-all"
                >
                  বন্ধ করুন
                </button>
                <button
                  onClick={() => handlePrintPurchase(viewingPurchaseInvoice)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg flex items-center gap-2"
                >
                  <PrinterIcon className="w-4 h-4" /> রসিদ প্রিন্ট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: এককালীন মাসিক ওষুধ ক্রয় (Lump-sum Monthly Purchase) */}
      {showLumpSumPurchaseModal && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/50 w-full max-w-lg rounded-3xl p-6 shadow-2xl shadow-amber-950/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400"></div>
            
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-amber-400 flex items-center gap-2">
                  <span>📦</span>
                  {lumpSumPurchaseForm.editingInvoiceId ? 'এককালীন ওষুধ ক্রয় সংশোধন' : 'এককালীন মাসিক ওষুধ ক্রয় এন্ট্রি'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  বিগত মাসসমূহের বিস্তারিত বিল না থাকলে এককালীন মোট ক্রয়ের হিসাব যোগ করুন
                </p>
              </div>
              <button
                onClick={() => setShowLumpSumPurchaseModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">বছর (Year)</label>
                  <select
                    value={lumpSumPurchaseForm.year}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      const m = lumpSumPurchaseForm.month;
                      const mName = monthOptions[m]?.name || `Month ${m + 1}`;
                      setLumpSumPurchaseForm(prev => ({
                        ...prev,
                        year: y,
                        date: getLastDayOfMonth(y, m),
                        supplier: prev.supplier.startsWith('এককালীন ওষুধ ক্রয়') ? `এককালীন ওষুধ ক্রয় (${mName} ${y})` : prev.supplier
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-amber-500 outline-none"
                  >
                    {[2022, 2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">মাস (Month)</label>
                  <select
                    value={lumpSumPurchaseForm.month}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      const y = lumpSumPurchaseForm.year;
                      const mName = monthOptions[m]?.name || `Month ${m + 1}`;
                      setLumpSumPurchaseForm(prev => ({
                        ...prev,
                        month: m,
                        date: getLastDayOfMonth(y, m),
                        supplier: prev.supplier.startsWith('এককালীন ওষুধ ক্রয়') ? `এককালীন ওষুধ ক্রয় (${mName} ${y})` : prev.supplier
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-amber-500 outline-none"
                  >
                    {monthOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">রেকর্ড তারিখ (Date)</label>
                <input
                  type="date"
                  value={lumpSumPurchaseForm.date}
                  onChange={(e) => setLumpSumPurchaseForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">সরবরাহকারী / খাতের নাম</label>
                <input
                  type="text"
                  value={lumpSumPurchaseForm.supplier}
                  onChange={(e) => setLumpSumPurchaseForm(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="যেমন: এককালীন ওষুধ ক্রয় (জানুয়ারি ২০২৪) বা স্কয়ার / বেক্সিমকো"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">মোট ক্রয়ের পরিমাণ (৳) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lumpSumPurchaseForm.totalAmount}
                    onChange={(e) => {
                      const tot = e.target.value;
                      const totNum = parseBengaliOrFormattedNumber(tot);
                      const paidNum = parseBengaliOrFormattedNumber(lumpSumPurchaseForm.paidAmount);
                      const due = Math.max(0, totNum - paidNum);
                      setLumpSumPurchaseForm(prev => ({ ...prev, totalAmount: tot, dueAmount: due }));
                    }}
                    placeholder="মোট টাকা লিখুন"
                    className="w-full bg-slate-950 border-2 border-amber-500/80 rounded-xl px-3 py-2 text-amber-300 font-black text-base focus:border-amber-400 outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-300 mb-1">পরিশোধিত টাকা (৳)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lumpSumPurchaseForm.paidAmount}
                    onChange={(e) => {
                      const paid = e.target.value;
                      const paidNum = parseBengaliOrFormattedNumber(paid);
                      const totNum = parseBengaliOrFormattedNumber(lumpSumPurchaseForm.totalAmount);
                      const due = Math.max(0, totNum - paidNum);
                      setLumpSumPurchaseForm(prev => ({ ...prev, paidAmount: paid, dueAmount: due }));
                    }}
                    placeholder="পরিশোধ লিখুন"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-bold text-base focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">বকেয়া (Due):</span>
                <span className={`font-black text-sm ${lumpSumPurchaseForm.dueAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ৳{Number(lumpSumPurchaseForm.dueAmount || 0).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">মন্তব্য / নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={lumpSumPurchaseForm.notes}
                  onChange={(e) => setLumpSumPurchaseForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="যেমন: পুরাতন খাতার মোট ক্রয় হিসাব"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
              {lumpSumPurchaseForm.editingInvoiceId && (
                <button
                  type="button"
                  onClick={() => handleDeleteLumpSumPurchase(lumpSumPurchaseForm.editingInvoiceId, lumpSumPurchaseForm.date)}
                  disabled={loading}
                  className="px-4 py-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  মুছুন
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLumpSumPurchaseModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveLumpSumPurchase}
                disabled={loading}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-900/40 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: এককালীন মাসিক ওষুধ বিক্রয় (Lump-sum Monthly Sales) */}
      {showLumpSumSalesModal && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/50 w-full max-w-lg rounded-3xl p-6 shadow-2xl shadow-emerald-950/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-400"></div>
            
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-emerald-400 flex items-center gap-2">
                  <span>💰</span>
                  {lumpSumSalesForm.editingInvoiceId ? 'এককালীন বিক্রয় সংশোধন' : 'এককালীন মাসিক ফার্মেসি বিক্রয় এন্ট্রি'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  বিগত মাসসমূহের বিস্তারিত মেমো না থাকলে এককালীন মোট বিক্রয় আয় যোগ করুন
                </p>
              </div>
              <button
                onClick={() => setShowLumpSumSalesModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">বছর (Year)</label>
                  <select
                    value={lumpSumSalesForm.year}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      const m = lumpSumSalesForm.month;
                      const mName = monthOptions[m]?.name || `Month ${m + 1}`;
                      setLumpSumSalesForm(prev => ({
                        ...prev,
                        year: y,
                        date: getLastDayOfMonth(y, m),
                        customerName: prev.customerName.startsWith('এককালীন মোট ফার্মেসি বিক্রয়') ? `এককালীন মোট ফার্মেসি বিক্রয় (${mName} ${y})` : prev.customerName
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-emerald-500 outline-none"
                  >
                    {[2022, 2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">মাস (Month)</label>
                  <select
                    value={lumpSumSalesForm.month}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      const y = lumpSumSalesForm.year;
                      const mName = monthOptions[m]?.name || `Month ${m + 1}`;
                      setLumpSumSalesForm(prev => ({
                        ...prev,
                        month: m,
                        date: getLastDayOfMonth(y, m),
                        customerName: prev.customerName.startsWith('এককালীন মোট ফার্মেসি বিক্রয়') ? `এককালীন মোট ফার্মেসি বিক্রয় (${mName} ${y})` : prev.customerName
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-emerald-500 outline-none"
                  >
                    {monthOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">রেকর্ড তারিখ (Date)</label>
                <input
                  type="date"
                  value={lumpSumSalesForm.date}
                  onChange={(e) => setLumpSumSalesForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">গ্রাহক / বিবরণ</label>
                <input
                  type="text"
                  value={lumpSumSalesForm.customerName}
                  onChange={(e) => setLumpSumSalesForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="যেমন: এককালীন মোট ফার্মেসি বিক্রয় (জানুয়ারি ২০২৪)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-300 mb-1">মোট বিক্রয় রেভিনিউ (৳) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lumpSumSalesForm.totalAmount}
                    onChange={(e) => {
                      const tot = e.target.value;
                      const totNum = parseBengaliOrFormattedNumber(tot);
                      const paidNum = parseBengaliOrFormattedNumber(lumpSumSalesForm.paidAmount);
                      const due = Math.max(0, totNum - paidNum);
                      setLumpSumSalesForm(prev => ({ ...prev, totalAmount: tot, dueAmount: due }));
                    }}
                    placeholder="বিক্রয়ের মোট টাকা"
                    className="w-full bg-slate-950 border-2 border-emerald-500/80 rounded-xl px-3 py-2 text-emerald-300 font-black text-base focus:border-emerald-400 outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sky-300 mb-1">আদায়কৃত টাকা (৳)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lumpSumSalesForm.paidAmount}
                    onChange={(e) => {
                      const paid = e.target.value;
                      const paidNum = parseBengaliOrFormattedNumber(paid);
                      const totNum = parseBengaliOrFormattedNumber(lumpSumSalesForm.totalAmount);
                      const due = Math.max(0, totNum - paidNum);
                      setLumpSumSalesForm(prev => ({ ...prev, paidAmount: paid, dueAmount: due }));
                    }}
                    placeholder="নগদ আদায় লিখুন"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sky-300 font-bold text-base focus:border-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">বকেয়া (Due):</span>
                <span className={`font-black text-sm ${lumpSumSalesForm.dueAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  ৳{Number(lumpSumSalesForm.dueAmount || 0).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">মন্তব্য / নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={lumpSumSalesForm.notes}
                  onChange={(e) => setLumpSumSalesForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="যেমন: পুরাতন খাতার মোট বিক্রয় রেকর্ড"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
              {lumpSumSalesForm.editingInvoiceId && (
                <button
                  type="button"
                  onClick={() => handleDeleteLumpSumSales(lumpSumSalesForm.editingInvoiceId, lumpSumSalesForm.date)}
                  disabled={loading}
                  className="px-4 py-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  মুছুন
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLumpSumSalesModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveLumpSumSales}
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/40 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Blocking Loading / Progress & Success Overlay for Sales Deletion */}
      {deleteProgressState && (
        <div className="fixed inset-0 bg-black/90 z-[10001] flex items-center justify-center p-4 backdrop-blur-md select-none cursor-wait">
          <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {deleteProgressState.isDeleting ? (
              <>
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-pulse"></div>
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin"></div>
                  <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">ডিলিট ও ক্লাউড সিঙ্ক চলছে...</h3>
                  <p className="text-sm font-semibold text-slate-300">
                    {deleteProgressState.step || 'অনলাইন ডেটাবেজ থেকে ডাটা ডিলিট ও সিঙ্ক করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...'}
                  </p>
                  <div className="bg-rose-950/60 text-rose-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-rose-800/60 mt-2 flex items-center justify-center gap-2">
                    <span>⚠️</span>
                    <span>প্রক্রিয়া শেষ না হওয়া পর্যন্ত কোনো বাটনে ক্লিক বা পেজ পরিবর্তন করবেন না।</span>
                  </div>
                </div>
              </>
            ) : deleteProgressState.isSuccess ? (
              <>
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center animate-in zoom-in duration-300 shadow-xl shadow-emerald-950/50">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-emerald-400">সফলভাবে সম্পন্ন হয়েছে!</h3>
                  <p className="text-sm font-bold text-slate-200">{deleteProgressState.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteProgressState(null)}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
                >
                  ঠিক আছে (OK)
                </button>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-rose-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-rose-400">ডিলিট প্রক্রিয়া ব্যর্থ</h3>
                  <p className="text-sm text-slate-300">{deleteProgressState.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteProgressState(null)}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-slate-700"
                >
                  বন্ধ করুন
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 animate-pulse"></div>
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform duration-500">
                <AlertCircle className="w-10 h-10 text-rose-400 animate-pulse" />
              </div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{confirmModal.title}</h3>
              <p className="text-slate-400 font-medium text-lg leading-relaxed whitespace-pre-line">{confirmModal.message}</p>
              <div className="flex gap-4 w-full pt-4">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-slate-700 active:scale-95"
                >
                  No, Cancel
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-6 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-rose-900/40 transition-all active:scale-95 border border-rose-400/30"
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

const MenuButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; badge?: string }> = ({ label, isActive, onClick, badge }) => (
  <button onClick={onClick} className={`relative px-6 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-500 focus:outline-none flex-1 min-w-[160px] whitespace-nowrap flex items-center justify-center gap-2 ${isActive ? 'bg-blue-600 text-white shadow-2xl transform scale-105' : 'bg-slate-900/60 text-slate-500 hover:bg-slate-700 hover:text-slate-200'}`}>
    <span>{label}</span>
    {badge && (
      <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse shadow-md">
        {badge}
      </span>
    )}
  </button>
);

export default MedicinePage;