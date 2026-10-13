
import React, { useMemo, useState, useEffect } from 'react';
import { LabInvoice, DueCollection, ExpenseItem, Employee, PurchaseInvoice, SalesInvoice, Medicine } from './DiagnosticData';
import { IndoorInvoice } from './ClinicPage';
import { BackIcon, FileTextIcon, UsersIcon, WalletIcon, MoneyIcon, TrendingDownIcon, ChartIcon, PlusIcon, Activity, TrashIcon, SaveIcon, PrinterIcon, ClinicIcon, EditIcon, XIcon, Plus } from './Icons';
import { dbService, normalizeDate } from '../dbService';

interface ConsolidatedAccountsPageProps {
  onBack: () => void;
  labInvoices: LabInvoice[];
  setLabInvoices?: React.Dispatch<React.SetStateAction<LabInvoice[]>>;
  dueCollections: DueCollection[];
  setDueCollections?: React.Dispatch<React.SetStateAction<DueCollection[]>>;
  detailedExpenses: Record<string, ExpenseItem[]>;
  setDetailedExpenses?: React.Dispatch<React.SetStateAction<Record<string, ExpenseItem[]>>>;
  employees: Employee[];
  purchaseInvoices: PurchaseInvoice[];
  salesInvoices: SalesInvoice[];
  indoorInvoices: IndoorInvoice[];
  setIndoorInvoices?: React.Dispatch<React.SetStateAction<IndoorInvoice[]>>;
  medicines?: Medicine[];
  consolidatedLabEntries?: any[];
  setConsolidatedLabEntries?: React.Dispatch<React.SetStateAction<any[]>>;
  monthlyAdjustments?: Record<string, any>;
  setMonthlyAdjustments?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

interface CompanyCollection {
    id: string;
    date: string;
    companyName: string;
    amount: number;
}

interface Shareholder {
    id: number;
    name: string;
    shares: number;
    description: string;
    address?: string;
    phone?: string;
    joinDate?: string;
    isDeleted?: boolean;
    deletedAt?: string;
    updatedAt?: string;
}

interface ShareholderLog {
    id: string;
    shareholderId: number;
    action: 'ADD' | 'UPDATE' | 'DELETE';
    details: string;
    timestamp: string;
}

interface LoanRecord {
    id: string;
    source: string;
    amount: number;
    date: string;
    type: string;
}

interface RepaymentRecord {
    id: string;
    loanId: string;
    amount: number;
    date: string;
    type: 'Installment' | 'One-time';
}

interface FuturePlan {
    id: string;
    title: string;
    description: string;
    estimatedCost: number;
    targetDate: string;
    status: 'Pending' | 'In Progress' | 'Completed';
}

const initialShareholders: Shareholder[] = [
    { id: 1, name: 'মোছাঃ জান্নাতী শেখ', shares: 4.5, description: '৪ ১/২ (সাড়ে চার)টি' },
    { id: 2, name: 'মোছাঃ মরিয়ম খাতুন', shares: 2, description: '২টি' },
    { id: 3, name: 'মোঃ কামরুল ইসলাম', shares: 1, description: '১টি' },
    { id: 4, name: 'মোঃ আব্দুল মন্ডল', shares: 1, description: '১টি' },
    { id: 5, name: 'মোঃ আব্দুল হাই', shares: 1, description: '১টি' },
    { id: 6, name: 'মোঃ আব্দুল্লাহ্ সরকার', shares: 2, description: '২টি' },
    { id: 7, name: 'মোঃ আয়নুল হক', shares: 1, description: '১টি' },
    { id: 8, name: 'মোঃ সোলাইমান সরকার (লিমন)', shares: 1, description: '১টি' },
    { id: 9, name: 'মোঃ ফজলুর রহমান (ফজলু)', shares: 1, description: '১টি' },
    { id: 10, name: 'মোঃ কমলা খাতুন', shares: 1.5, description: '১ ১/২ (দেড়)টি' },
    { id: 11, name: 'মোঃ আব্দুল হাই (বিএসসি)', shares: 0.5, description: '১/২ (অর্ধেক)টি' },
    { id: 12, name: 'মোঃ মোফাজ্জল হোসেন', shares: 1, description: '১টি' },
    { id: 13, name: 'মোঃ শহিদুল ইসলাম', shares: 1, description: '১টি' },
    { id: 14, name: 'হাজী মোঃ বাবুল আহমেদ বাবু', shares: 1, description: '১টি' },
    { id: 15, name: 'হাজী মোঃ আব্দুল রাজ্জাক', shares: 1, description: '১টি' },
    { id: 16, name: 'মোঃ বিপ্লব হোসেন রজব', shares: 1, description: '১টি' },
    { id: 17, name: 'মোছাঃ রেখা খাতুন', shares: 1, description: '১টি' },
    { id: 18, name: 'অন্যান্য/সংরক্ষিত', shares: 0.5, description: '১/২টি' }
];

const monthOptions = [
    { value: 0, name: 'January', bnName: 'জানুয়ারি' },
    { value: 1, name: 'February', bnName: 'ফেব্রুয়ারি' },
    { value: 2, name: 'March', bnName: 'মার্চ' },
    { value: 3, name: 'April', bnName: 'এপ্রিল' },
    { value: 4, name: 'May', bnName: 'মে' },
    { value: 5, name: 'June', bnName: 'জুন' },
    { value: 6, name: 'July', bnName: 'জুলাই' },
    { value: 7, name: 'August', bnName: 'আগস্ট' },
    { value: 8, name: 'September', bnName: 'সেপ্টেম্বর' },
    { value: 9, name: 'October', bnName: 'অক্টোবর' },
    { value: 10, name: 'November', bnName: 'নভেম্বর' },
    { value: 11, name: 'December', bnName: 'ডিসেম্বর' }
];

const expenseMapSequence = [
    { key: 'Stuff salary', label: 'স্টাফ বেতন' },
    { key: 'Generator', label: 'জেনারেটর' },
    { key: 'Motorcycle', label: 'মোটর সাইকেল' },
    { key: 'Marketing', label: 'মার্কেটিং' },
    { key: 'Clinic_Dev', label: 'ক্লিনিক উন্নয়ন' },
    { key: 'Bills', label: 'বিদ্যুৎ+ পেপার+ ডিশ বিল' },
    { key: 'Reagent buy', label: 'রিএজেন্ট' },
    { key: 'X-Ray', label: 'এক্স-রে' },
    { key: 'House rent', label: 'বাড়ী ভাড়া' },
    { key: 'Stationery', label: 'স্টেশনারী' },
    { key: 'Food', label: 'খাবার' },
    { key: 'Doctor donation', label: 'ডাঃ ডোনেশন+ যাতায়াত' },
    { key: 'Instruments', label: 'ইন্সট্রুমেন্ট' },
    { key: 'Press', label: 'প্রেস' },
    { key: 'License', label: 'লাইসেন্স' },
    { key: 'Installment', label: 'কিস্তি' },
    { key: 'Mobile', label: 'মোবাইল খরচ' },
    { key: 'Maintenance', label: 'রক্ষণাবেক্ষণ' },
    { key: 'Electrical and Electronics', label: 'ইলেকট্রিক্যাল ও ইলেকট্রনিক্স' },
    { key: 'Others', label: 'অন্যান্য খরচ' },
    { key: 'Old Loan Repay', label: 'পূর্বের ঋণ পরিশোধ' }
];

const diagExpenseCategories = [
    'House rent', 'Electricity bill', 'Stuff salary', 'Reagent buy', 'Marketing', 'Motorcycle', 'Doctor donation & Vehicle service',
    'Instruments buy/ repair', 'Diagnostic development', 'Maintenance', 'License cost',
    'X-ray Film buy', 'Mobile buy/ Flexiload', 'Press Cost', 'Food/Meal Cost', 'Paper / Dish / Wifi Bill',
    'Electrical and Electronics',
    'Others',
];

const clinicExpenseCategories = [
    'Stuff salary', 'Generator', 'Motorcycle', 'Marketing', 'Clinic development',
    'House rent', 'Stationery', 'Food/Refreshment',
    'Doctor donation', 'Repair/Instruments', 'Press', 'License/Official',
    'Bank/NGO Installment', 'Mobile', 'Interest/Loan', 'Others', 'Old Loan Repay'
];

function safeNum(val: any): number {
    if (typeof val === 'number' && !isNaN(val)) return val;
    return 0;
}

function normalizeDateStr(d: any): string {
    return normalizeDate(d);
}

function isSameDay(d1: any, d2: any): boolean {
    if (!d1 || !d2) return false;
    const n1 = normalizeDate(d1);
    const n2 = normalizeDate(d2);
    return Boolean(n1 && n2 && n1 === n2);
}

function getLabInvDate(inv: any): string {
    if (!inv) return '';
    return inv.invoice_date || inv.date || inv.invoiceDate || inv.created_date || inv.created_at || '';
}

function isDiagDue(dc: any): boolean {
    if (!dc) return false;
    const invId = (dc.invoice_id || '').toUpperCase();
    return !invId.startsWith('IND') && !invId.startsWith('CLIN');
}

function getExpAmount(e: any): number {
    if (!e) return 0;
    const v = e.paidAmount ?? e.paid_amount ?? e.billAmount ?? e.bill_amount ?? e.amount ?? e.cost ?? 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
}

function getConsolidatedNet(e: any): number {
    if (!e) return 0;
    const gross = Number(e.grossAmount ?? e.gross_amount ?? e.total_amount ?? e.totalAmount) || 0;
    const discount = Number(e.discountAmount ?? e.discount_amount ?? e.discount) || 0;
    const net = Number(e.netPayable ?? e.net_payable ?? e.net_amount ?? e.netAmount) || Math.max(0, gross - discount);
    let cash = Number(e.cashCollected ?? e.cash_collected ?? e.paid_amount ?? e.paidAmount ?? e.amount) || 0;
    const due = Number(e.dueAmount ?? e.due_amount) || 0;
    if (cash === 0 && due === 0 && net > 0) {
        cash = net;
    }
    const docPC = Number(e.doctorCommissionPaid ?? e.doctor_commission_paid ?? e.commission_paid ?? e.commissionPaid) || 0;
    const usgFee = Number(e.usgDoctorFeePaid ?? e.usg_doctor_fee_paid ?? e.usg_exam_charge) || 0;
    return Math.max(0, cash - docPC - usgFee);
}

const ConsolidatedAccountsPage: React.FC<ConsolidatedAccountsPageProps> = ({
  onBack, labInvoices, setLabInvoices, dueCollections, setDueCollections, detailedExpenses, setDetailedExpenses, employees, purchaseInvoices, salesInvoices, indoorInvoices, setIndoorInvoices, medicines = [], consolidatedLabEntries, setConsolidatedLabEntries, monthlyAdjustments: propMonthlyAdjustments, setMonthlyAdjustments: propSetMonthlyAdjustments, performBlockingSync
}) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<'monthly_expense_sheet' | 'daily_collection' | 'daily_expense' | 'accounts' | 'shareholders' | 'money_mgmt' | 'final_status' | 'future_plans' | 'shareholder_mgmt' | 'company_collection'>('accounts');
    const [deptFilter, setDeptFilter] = useState<'All' | 'Diagnostic' | 'Clinic'>('All');

    const isSelectedMonth = (dateStr: any) => {
        if (!dateStr) return false;
        try {
            const norm = normalizeDate(dateStr);
            if (!norm) return false;
            const parts = norm.split('-');
            if (parts.length < 2) return false;
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            if (isNaN(y) || isNaN(m)) return false;
            return m - 1 === selectedMonth && y === selectedYear;
        } catch(e) { return false; }
    };

    const isBeforeSelectedMonth = (dateStr: any) => {
        if (!dateStr) return false;
        try {
            const norm = normalizeDate(dateStr);
            if (!norm) return false;
            const parts = norm.split('-');
            if (parts.length < 2) return false;
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            if (isNaN(y) || isNaN(m)) return false;
            return y < selectedYear || (y === selectedYear && m - 1 < selectedMonth);
        } catch(e) { return false; }
    };

    const getNetDiagCash = (inv: LabInvoice) => {
        if (!inv) return 0;
        const items = Array.isArray(inv.items) ? inv.items : [];
        const usgFee = items.reduce((s, it) => s + ((Number(it?.usg_exam_charge) || 0) * (Number(it?.quantity) || 1)), 0);
        const labFee = items.reduce((s, it) => s + ((Number(it?.extra_lab_fee) || 0) * (Number(it?.quantity) || 1)), 0);
        const commPaid = Number(inv.commission_paid ?? (inv as any).commissionPaid) || 0;
        let totalPaid = Number(inv.paid_amount ?? (inv as any).paidAmount) || 0;
        const totalAmt = Number(inv.total_amount ?? (inv as any).totalAmount) || 0;
        const discAmt = Number(inv.discount_amount ?? (inv as any).discountAmount) || 0;
        const currentDue = Number(inv.due_amount ?? (inv as any).dueAmount) || 0;

        if (totalPaid === 0 && currentDue <= 0 && totalAmt > 0) {
            totalPaid = Math.max(0, totalAmt - discAmt);
        }

        const subsequentDues = (dueCollections || []).filter(dc => dc && dc.invoice_id === inv.invoice_id).reduce((s, dc) => s + (Number(dc.amount_collected) || 0), 0);
        
        let initialPaid = totalPaid;
        if (subsequentDues > 0) {
            if (totalPaid > subsequentDues && (totalPaid - subsequentDues + currentDue + discAmt >= totalAmt - 1)) {
                initialPaid = Math.max(0, totalPaid - subsequentDues);
            } else if (totalPaid >= subsequentDues && totalPaid === totalAmt - discAmt && currentDue <= 0.5) {
                initialPaid = Math.max(0, totalPaid - subsequentDues);
            } else if (totalPaid < subsequentDues) {
                initialPaid = 0;
            } else {
                initialPaid = totalPaid;
            }
        }
        return Math.max(0, initialPaid - usgFee - labFee - commPaid);
    };

    const [consolidatedEntries, setConsolidatedEntries] = useState<any[]>(() => {
        return (consolidatedLabEntries && consolidatedLabEntries.length > 0)
            ? consolidatedLabEntries
            : dbService.getConsolidatedEntries();
    });

    useEffect(() => {
        if (consolidatedLabEntries && consolidatedLabEntries.length > 0) {
            setConsolidatedEntries(consolidatedLabEntries);
        } else {
            setConsolidatedEntries(dbService.getConsolidatedEntries());
        }
    }, [consolidatedLabEntries]);

    const [dynamicShareholders, setDynamicShareholders] = useState<Shareholder[]>(() => {
        const saved = localStorage.getItem('ncd_shareholders');
        if (saved) return JSON.parse(saved);
        // Add default values for original data if field is missing
        return initialShareholders.map(s => ({
            ...s,
            address: 'Enayetpur, Sirajganj',
            phone: 'N/A',
            joinDate: '2024-01-01'
        }));
    });
    const [shareholderLogs, setShareholderLogs] = useState<ShareholderLog[]>(() => JSON.parse(localStorage.getItem('ncd_shareholder_logs') || '[]'));
    const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);
    const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);

    const [loans, setLoans] = useState<LoanRecord[]>(() => JSON.parse(localStorage.getItem('ncd_loans') || '[]'));
    const [repayments, setRepayments] = useState<RepaymentRecord[]>(() => JSON.parse(localStorage.getItem('ncd_loan_repayments') || '[]'));
    const [futurePlans, setFuturePlans] = useState<FuturePlan[]>(() => JSON.parse(localStorage.getItem('ncd_future_plans') || '[]'));
    const [companyCollections, setCompanyCollections] = useState<CompanyCollection[]>(() => JSON.parse(localStorage.getItem('ncd_company_collections') || '[]'));

    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // --- Daily Collection Detail Modal & Source Deletion States ---
    const [selectedDetailDate, setSelectedDetailDate] = useState<{ dateStr: string; displayDate: string } | null>(null);
    const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Calculate source items for the selected day in Daily Collection
    const dateSources = useMemo(() => {
        if (!selectedDetailDate) return [];
        const targetDate = selectedDetailDate.dateStr;
        const items: Array<{
            id: string;
            originalId: string;
            type: 'LAB_INVOICE' | 'CONSOLIDATED_ENTRY' | 'INDOOR_INVOICE' | 'DUE_COLLECTION';
            categoryLabel: string;
            refNo: string;
            details: string;
            amount: number;
            originalItem: any;
        }> = [];

        // 1. Diagnostic Lab Invoices
        (labInvoices || []).forEach(inv => {
            if (!inv || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted' || inv.isDeleted) return;
            const invDate = getLabInvDate(inv);
            if (isSameDay(invDate, targetDate)) {
                const netCash = getNetDiagCash(inv);
                const testsStr = Array.isArray(inv.items) ? inv.items.map((it: any) => it.testName || it.test_name || it.name).filter(Boolean).join(', ') : '';
                items.push({
                    id: `lab_${inv.invoice_id || inv.daily_id}`,
                    originalId: String(inv.invoice_id || inv.daily_id),
                    type: 'LAB_INVOICE',
                    categoryLabel: 'ডায়াগনস্টিক ইনভয়েস',
                    refNo: String(inv.daily_id || inv.invoice_id || ''),
                    details: `রোগী: ${inv.patient_name || inv.patient_id || 'N/A'} ${testsStr ? `(${testsStr})` : ''}`,
                    amount: netCash,
                    originalItem: inv
                });
            }
        });

        // 2. Consolidated Lab Entries
        (consolidatedEntries || []).forEach(e => {
            if (!e) return;
            const rawDate = e.date || e.created_at || e.createdAt || e.entry_date || e.invoice_date || e.collection_date || '';
            const normE = normalizeDateStr(rawDate);
            let matches = isSameDay(rawDate, targetDate) || normE === targetDate;
            if (!normE && e.id) {
                const m = String(e.id).match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
                if (m && `${m[1]}-${m[2]}-${m[3]}` === targetDate) matches = true;
            }
            const dayNum = parseInt(targetDate.split('-')[2] || '1', 10);
            const isMonthly = (e.entryType === 'monthly' || e.shift === 'Monthly' || !normE || normE.split('-').length < 3);
            if (dayNum === 1 && isMonthly) {
                const parts = targetDate.split('-');
                const ey = Number(parts[0]);
                const em = Number(parts[1]) - 1;
                if (e.month !== undefined && e.year !== undefined && !isNaN(Number(e.month)) && !isNaN(Number(e.year))) {
                    matches = Number(e.year) === ey && (Number(e.month) === em || Number(e.month) === em + 1);
                }
            }
            if (matches) {
                const net = getConsolidatedNet(e);
                items.push({
                    id: `cons_${e.id || Date.now()}`,
                    originalId: String(e.id || ''),
                    type: 'CONSOLIDATED_ENTRY',
                    categoryLabel: 'কনসোলিডেটেড ল্যাব এন্ট্রি',
                    refNo: String(e.id || 'N/A'),
                    details: `শিফট/ধরণ: ${e.shift || e.entryType || 'সাধারণ'} ${e.notes ? `| ${e.notes}` : ''}`,
                    amount: net,
                    originalItem: e
                });
            }
        });

        // 3. Clinic Indoor Invoices
        (indoorInvoices || []).forEach(inv => {
            if (!inv || inv.isDeleted) return;
            const st = String(inv.status || '').toLowerCase().trim();
            if (st === 'cancelled' || st === 'returned' || st === 'deleted') return;
            const dateToUse = inv.admission_date || inv.invoice_date;
            if (isSameDay(dateToUse, targetDate)) {
                const itemsList = Array.isArray(inv.items) ? inv.items : [];
                const fundedRevenue = itemsList.filter(it => it && it.isClinicFund).reduce((ss, ii) => ss + (Number(ii.payable_amount) || 0), 0);
                const pcAmount = (Number(inv.commission_paid) || 0) + (Number(inv.special_commission) || 0);
                const specialDiscount = Number(inv.special_discount_amount) || 0;
                const netAmount = fundedRevenue - pcAmount - specialDiscount;
                items.push({
                    id: `clinic_${inv.invoice_id || inv.id}`,
                    originalId: String(inv.invoice_id || inv.id),
                    type: 'INDOOR_INVOICE',
                    categoryLabel: 'ক্লিনিক ইনডোর ইনভয়েস',
                    refNo: String(inv.daily_id || inv.invoice_id || ''),
                    details: `রোগী: ${inv.patient_name || 'N/A'} (বেড: ${inv.bed_number || 'N/A'})`,
                    amount: netAmount,
                    originalItem: inv
                });
            }
        });

        // 4. Due Collections
        (dueCollections || []).forEach(dc => {
            if (!dc || !isSameDay(dc.collection_date, targetDate)) return;
            const amt = Number(dc.amount_collected) || 0;
            const isDiag = isDiagDue(dc);
            items.push({
                id: `due_${dc.collection_id || dc.id}`,
                originalId: String(dc.collection_id || dc.id),
                type: 'DUE_COLLECTION',
                categoryLabel: isDiag ? 'ডায়াগনস্টিক বকেয়া আদায়' : 'ক্লিনিক বকেয়া আদায়',
                refNo: String(dc.collection_id || dc.invoice_id || ''),
                details: `ইনভয়েস #: ${dc.invoice_id || 'N/A'} (আদায়কারী: ${dc.collected_by || 'Admin'})`,
                amount: amt,
                originalItem: dc
            });
        });

        return items;
    }, [selectedDetailDate, labInvoices, consolidatedEntries, indoorInvoices, dueCollections]);

    const toggleSelectSource = (id: string) => {
        setSelectedSourceIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllSources = () => {
        if (selectedSourceIds.size === dateSources.length) {
            setSelectedSourceIds(new Set());
        } else {
            setSelectedSourceIds(new Set(dateSources.map(s => s.id)));
        }
    };

    const handleExecuteDeleteSources = async () => {
        setShowDeleteConfirm(false);
        setIsDeleting(true);

        try {
            const selectedList = dateSources.filter(s => selectedSourceIds.has(s.id));
            if (selectedList.length === 0) {
                setIsDeleting(false);
                return;
            }

            const labIdsToDelete = new Set(selectedList.filter(s => s.type === 'LAB_INVOICE').map(s => s.originalId));
            const consIdsToDelete = new Set(selectedList.filter(s => s.type === 'CONSOLIDATED_ENTRY').map(s => s.originalId));
            const indoorIdsToDelete = new Set(selectedList.filter(s => s.type === 'INDOOR_INVOICE').map(s => s.originalId));
            const dueIdsToDelete = new Set(selectedList.filter(s => s.type === 'DUE_COLLECTION').map(s => s.originalId));

            // Direct database deletions to guarantee persistence in Supabase
            const deletePromises: Promise<any>[] = [];
            labIdsToDelete.forEach(id => {
                deletePromises.push(dbService.deleteLabInvoiceDirectly({ invoice_id: id, id }));
            });
            consIdsToDelete.forEach(id => {
                deletePromises.push(dbService.deleteConsolidatedEntryDirectly(id));
            });
            indoorIdsToDelete.forEach(id => {
                deletePromises.push(dbService.deleteIndoorInvoiceDirectly({ daily_id: id, invoice_id: id, id }));
            });
            dueIdsToDelete.forEach(id => {
                deletePromises.push(dbService.deleteDueCollectionDirectly(id));
            });
            try {
                await Promise.allSettled(deletePromises);
            } catch (pErr) {
                console.warn("Direct source deletion error:", pErr);
            }

            // 1. Update labInvoices
            const updatedLabs = (labInvoices || []).filter(inv => {
                const idStr = String(inv.invoice_id || inv.daily_id || (inv as any).id);
                return !labIdsToDelete.has(idStr);
            });
            if (setLabInvoices) {
                setLabInvoices(updatedLabs);
            }

            // 2. Update consolidatedEntries
            const updatedCons = (consolidatedEntries || []).filter(e => !consIdsToDelete.has(String(e.id)));
            setConsolidatedEntries(updatedCons);
            if (setConsolidatedLabEntries) {
                setConsolidatedLabEntries(updatedCons);
            }
            dbService.saveConsolidatedEntries(updatedCons);

            // 3. Update indoorInvoices
            const updatedIndoor = (indoorInvoices || []).filter(inv => {
                const idStr = String(inv.daily_id || inv.invoice_id || (inv as any).id);
                return !indoorIdsToDelete.has(idStr);
            });
            if (setIndoorInvoices) {
                setIndoorInvoices(updatedIndoor);
            }

            // 4. Update dueCollections
            const updatedDues = (dueCollections || []).filter(dc => {
                const idStr = String(dc.collection_id || dc.id);
                return !dueIdsToDelete.has(idStr);
            });
            if (setDueCollections) {
                setDueCollections(updatedDues);
            }

            const syncPayload = {
                labInvoices: updatedLabs,
                consolidatedLabEntries: updatedCons,
                indoorInvoices: updatedIndoor,
                dueCollections: updatedDues
            };

            if (performBlockingSync) {
                await performBlockingSync(syncPayload);
            } else {
                await dbService.saveToCloud(syncPayload);
            }

            setSelectedSourceIds(new Set());
            setToastMessage(`সফলভাবে ${selectedList.length} টি কালেকশন সোর্স ডিলিট করা হয়েছে!`);
        } catch (err) {
            console.error('Delete sources error:', err);
            setToastMessage('ডিলিট করার সময় ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        } finally {
            setIsDeleting(false);
        }
    };

    const convertBnToEn = (str: any): string => {
        if (str === null || str === undefined) return '';
        const bnToEnMap: Record<string, string> = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
        return String(str).replace(/[০-৯]/g, ch => bnToEnMap[ch] || ch);
    };

    const convertEnToBn = (str: any): string => {
        if (str === null || str === undefined) return '';
        const enToBnMap: Record<string, string> = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        return String(str).replace(/[0-9]/g, ch => enToBnMap[ch] || ch);
    };

    const getSafeAdj = (item: any): { profitDist: number; houseRent: number; loanInstallment: number } => {
        const parseVal = (v: any): number => {
            if (v === null || v === undefined) return 0;
            if (typeof v === 'number') return isNaN(v) ? 0 : v;
            if (typeof v === 'string') {
                const clean = convertBnToEn(v).replace(/,/g, '').trim();
                const num = parseFloat(clean);
                return isNaN(num) ? 0 : num;
            }
            return 0;
        };

        if (typeof item === 'number' || typeof item === 'string') {
            return { profitDist: parseVal(item), houseRent: 0, loanInstallment: 0 };
        }
        if (item && typeof item === 'object') {
            const pd = parseVal(item.profitDist ?? item.profit_dist ?? item.profit ?? item.amount ?? item.value ?? item.dist ?? item.dividend ?? item.profit_distribution ?? item.profitDistribution ?? item.distribution ?? item.netProfit ?? item.net_profit);
            const hr = parseVal(item.houseRent ?? item.house_rent ?? item.rent);
            const li = parseVal(item.loanInstallment ?? item.loan_installment ?? item.installment);
            return {
                profitDist: pd,
                houseRent: hr,
                loanInstallment: li,
            };
        }
        return { profitDist: 0, houseRent: 0, loanInstallment: 0 };
    };

    const getSafeAdjForMonth = (year: number, month: number, adjustmentsObj: Record<string, any>): { profitDist: number; houseRent: number; loanInstallment: number } => {
        if (!adjustmentsObj || typeof adjustmentsObj !== 'object') return { profitDist: 0, houseRent: 0, loanInstallment: 0 };

        const mPadded1 = String(month + 1).padStart(2, '0');
        const mPadded0 = String(month).padStart(2, '0');
        const mNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const mShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const mBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
        const mBnAlt = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

        const yBn = convertEnToBn(year);
        const mBnNum1 = convertEnToBn(month + 1);
        const mBnNum1Padded = convertEnToBn(mPadded1);
        const mBnNum0 = convertEnToBn(month);
        const mBnNum0Padded = convertEnToBn(mPadded0);

        const candidateKeys = [
            `${year}-${month}`,
            `${year}-${month + 1}`,
            `${year}-${mPadded1}`,
            `${year}-${mPadded0}`,
            `${month + 1}-${year}`,
            `${mPadded1}-${year}`,
            `${month}-${year}`,
            `${mPadded0}-${year}`,
            `${year}_${month}`,
            `${year}_${month + 1}`,
            `${year}_${mPadded1}`,
            `${year}_${mPadded0}`,
            `${mNames[month]}-${year}`,
            `${mShort[month]}-${year}`,
            `${mNames[month]}_${year}`,
            `${mShort[month]}_${year}`,
            `${mBn[month]}-${year}`,
            `${mBnAlt[month]}-${year}`,
            `${year}-${mNames[month]}`,
            `${year}-${mShort[month]}`,
            `${mBn[month]}_${year}`,
            `${mBnAlt[month]}_${year}`,
            `${year}_${mBn[month]}`,
            `${year}_${mBnAlt[month]}`,
            `${yBn}-${mBnNum1}`,
            `${yBn}-${mBnNum1Padded}`,
            `${yBn}-${mBnNum0}`,
            `${yBn}-${mBnNum0Padded}`,
            `${yBn}_${mBnNum1}`,
            `${yBn}_${mBnNum1Padded}`,
            `${yBn}_${mBnNum0}`,
            `${yBn}_${mBnNum0Padded}`,
            `${mBn[month]}-${yBn}`,
            `${mBnAlt[month]}-${yBn}`,
            `monthly_${year}_${month + 1}`,
            `monthly_${year}_${mPadded1}`,
            `adj_${year}_${month + 1}`,
            `adj_${year}_${mPadded1}`,
        ];

        // 1. Pass 1: explicit candidate keys for non-zero values
        for (const k of candidateKeys) {
            if (adjustmentsObj[k] !== undefined && adjustmentsObj[k] !== null) {
                const parsed = getSafeAdj(adjustmentsObj[k]);
                if (parsed.profitDist > 0 || parsed.houseRent > 0 || parsed.loanInstallment > 0) {
                    return parsed;
                }
            }
        }

        // 2. Pass 2: fuzzy scan of adjustmentsObj keys matching year and month name/number
        for (const [k, v] of Object.entries(adjustmentsObj)) {
            if (!v) continue;
            const parsed = getSafeAdj(v);
            if (parsed.profitDist <= 0 && parsed.houseRent <= 0 && parsed.loanInstallment <= 0) continue;

            const kNorm = convertBnToEn(k).toLowerCase();
            if (kNorm.includes(String(year))) {
                if (
                    kNorm.includes(mNames[month]) ||
                    kNorm.includes(mShort[month]) ||
                    kNorm.includes(mBn[month]) ||
                    kNorm.includes(mBnAlt[month]) ||
                    kNorm.includes(`-${month + 1}-`) ||
                    kNorm.endsWith(`-${month + 1}`) ||
                    kNorm.startsWith(`${month + 1}-`) ||
                    kNorm.includes(`_${month + 1}_`) ||
                    kNorm.endsWith(`_${month + 1}`) ||
                    kNorm.startsWith(`${month + 1}_`) ||
                    kNorm.includes(`-${mPadded1}-`) ||
                    kNorm.endsWith(`-${mPadded1}`) ||
                    kNorm.startsWith(`${mPadded1}-`) ||
                    kNorm.includes(`_${mPadded1}_`) ||
                    kNorm.endsWith(`_${mPadded1}`) ||
                    kNorm.startsWith(`${mPadded1}_`) ||
                    kNorm.includes(`-${month}-`) ||
                    kNorm.endsWith(`-${month}`) ||
                    kNorm.startsWith(`${month}-`) ||
                    kNorm.includes(`_${month}_`) ||
                    kNorm.endsWith(`_${month}`) ||
                    kNorm.startsWith(`${month}_`)
                ) {
                    return parsed;
                }
            }
        }

        // 3. Pass 3: return first defined explicit key if any
        for (const k of candidateKeys) {
            if (adjustmentsObj[k] !== undefined && adjustmentsObj[k] !== null) {
                return getSafeAdj(adjustmentsObj[k]);
            }
        }

        return { profitDist: 0, houseRent: 0, loanInstallment: 0 };
    };

    const [monthlyAdjustments, setMonthlyAdjustments] = useState<Record<string, { profitDist: number; houseRent: number; loanInstallment: number }>>(() => {
        try {
            const saved = localStorage.getItem('ncd_monthly_adjustments');
            const initialObj = propMonthlyAdjustments && Object.keys(propMonthlyAdjustments).length > 0
                ? propMonthlyAdjustments
                : (saved ? JSON.parse(saved) : {});
            if (initialObj && typeof initialObj === 'object') {
                const cleaned: Record<string, { profitDist: number; houseRent: number; loanInstallment: number }> = {};
                Object.entries(initialObj).forEach(([k, v]) => {
                    cleaned[k] = getSafeAdj(v);
                });
                return cleaned;
            }
        } catch (e) {
            console.error('Failed to parse ncd_monthly_adjustments', e);
        }
        return {};
    });

    useEffect(() => {
        if (propMonthlyAdjustments && typeof propMonthlyAdjustments === 'object' && Object.keys(propMonthlyAdjustments).length > 0) {
            setMonthlyAdjustments(prev => {
                const cleaned: Record<string, { profitDist: number; houseRent: number; loanInstallment: number }> = { ...prev };
                Object.entries(propMonthlyAdjustments).forEach(([k, v]) => {
                    const parsed = getSafeAdj(v);
                    const prevParsed = getSafeAdj(prev[k]);
                    if (parsed.profitDist > 0 || parsed.houseRent > 0 || parsed.loanInstallment > 0) {
                        cleaned[k] = parsed;
                    } else if (prevParsed.profitDist > 0 || prevParsed.houseRent > 0 || prevParsed.loanInstallment > 0) {
                        cleaned[k] = prevParsed;
                    } else {
                        cleaned[k] = parsed;
                    }
                });
                try {
                    localStorage.setItem('ncd_monthly_adjustments', JSON.stringify(cleaned));
                } catch (e) {}
                return cleaned;
            });
        }
    }, [propMonthlyAdjustments]);

    const currentMonthKey = `${selectedYear}-${selectedMonth}`;
    const adj = getSafeAdjForMonth(selectedYear, selectedMonth, monthlyAdjustments);

    const updateAdjustment = (field: 'profitDist' | 'houseRent' | 'loanInstallment', val: number) => {
        const safeVal = isNaN(val) ? 0 : Math.max(0, val);
        const current = getSafeAdjForMonth(selectedYear, selectedMonth, monthlyAdjustments);
        
        const mPadded1 = String(selectedMonth + 1).padStart(2, '0');
        const mPadded0 = String(selectedMonth).padStart(2, '0');
        const k1 = `${selectedYear}-${selectedMonth}`;
        const k2 = `${selectedYear}-${selectedMonth + 1}`;
        const k3 = `${selectedYear}-${mPadded1}`;
        const k4 = `${selectedYear}-${mPadded0}`;

        const updatedItem = {
            ...current,
            [field]: safeVal
        };

        const updatedObj = {
            ...monthlyAdjustments,
            [k1]: updatedItem,
            [k2]: updatedItem,
            [k3]: updatedItem,
            [k4]: updatedItem
        };
        setMonthlyAdjustments(updatedObj);
        if (propSetMonthlyAdjustments) {
            propSetMonthlyAdjustments(updatedObj);
        }
        try {
            localStorage.setItem('ncd_monthly_adjustments', JSON.stringify(updatedObj));
        } catch (e) {}
    };

    const [profitShareReportType, setProfitShareReportType] = useState<'monthly' | 'yearly' | 'custom'>('monthly');
    const [profitShareYearStr, setProfitShareYearStr] = useState<string>(new Date().getFullYear().toString());
    const [profitShareStartDate, setProfitShareStartDate] = useState<string>('');
    const [profitShareEndDate, setProfitShareEndDate] = useState<string>('');

    let profitShareTitle = `${monthOptions[selectedMonth].name} ${selectedYear}`;
    let profitShareKey = currentMonthKey;
    if (profitShareReportType === 'yearly') {
        profitShareTitle = `Yearly Report - ${profitShareYearStr}`;
        profitShareKey = `yearly-${profitShareYearStr}`;
    } else if (profitShareReportType === 'custom') {
        profitShareTitle = `Custom Report (${profitShareStartDate} to ${profitShareEndDate})`;
        profitShareKey = `custom-${profitShareStartDate}_${profitShareEndDate}`;
    }

    const profitShareAdj = useMemo(() => {
        if (profitShareReportType === 'monthly') {
            return getSafeAdjForMonth(selectedYear, selectedMonth, monthlyAdjustments);
        } else if (profitShareReportType === 'yearly') {
            let total = 0;
            const yNum = Number(profitShareYearStr) || selectedYear;
            for (let i = 0; i < 12; i++) {
                total += (getSafeAdjForMonth(yNum, i, monthlyAdjustments).profitDist || 0);
            }
            return { profitDist: total, houseRent: 0, loanInstallment: 0 };
        } else if (profitShareReportType === 'custom') {
            let total = 0;
            if (profitShareStartDate && profitShareEndDate) {
                const s = new Date(profitShareStartDate);
                const e = new Date(profitShareEndDate);
                Object.keys(monthlyAdjustments).forEach(k => {
                    const match = k.match(/^(\d{4})-(\d{1,2})$/);
                    if (match) {
                        const y = parseInt(match[1]);
                        const m = parseInt(match[2]);
                        const mDate = new Date(y, m, 15);
                        if (mDate >= s && mDate <= e) {
                            total += (getSafeAdj(monthlyAdjustments[k]).profitDist || 0);
                        }
                    }
                });
            }
            return { profitDist: total, houseRent: 0, loanInstallment: 0 };
        }
        return { profitDist: 0, houseRent: 0, loanInstallment: 0 };
    }, [profitShareReportType, currentMonthKey, selectedYear, selectedMonth, profitShareYearStr, profitShareStartDate, profitShareEndDate, monthlyAdjustments]);

    const updateProfitShareAdjustment = (field: 'profitDist', val: number) => {
        const safeVal = isNaN(val) ? 0 : Math.max(0, val);
        setMonthlyAdjustments(prev => {
            const current = getSafeAdj(prev[profitShareKey]);
            const updated = {
                ...prev,
                [profitShareKey]: {
                    ...current,
                    [field]: safeVal
                }
            };
            try {
                localStorage.setItem('ncd_monthly_adjustments', JSON.stringify(updated));
            } catch (e) {}
            return updated;
        });
    };

    const profitShareTotalShares = dynamicShareholders.reduce((sum, s) => sum + s.shares, 0);
    const profitSharePerShare = profitShareTotalShares > 0 ? profitShareAdj.profitDist / profitShareTotalShares : 0;

    const [newPlan, setNewPlan] = useState<Partial<FuturePlan>>({ title: '', estimatedCost: 0, status: 'Pending', targetDate: '' });
    const [newCompanyEntry, setNewCompanyEntry] = useState({ companyName: '', amount: 0, date: new Date().toISOString().split('T')[0] });
    const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

    const handleCleanDuplicateExpenses = async () => {
        const confirmClean = window.confirm("আপনি কি সমস্ত খরচের হিসাব (Detailed Expenses) থেকে ডুপ্লিকেট/ডাবল এন্ট্রি স্বয়ংক্রিয়ভাবে ক্লিন করে সুপাবেজ ক্লাউডে আপডেট করতে চান?");
        if (!confirmClean) return;

        setIsCleaningDuplicates(true);
        try {
            const result = await dbService.cleanDuplicateExpenses();
            if (result?.success) {
                alert(`সফলভাবে ডুপ্লিকেট খরচ ক্লিন করা হয়েছে! মোট ${result.cleanedCount} টি ডাবল এন্ট্রি সরানো হয়েছে।`);
                if (window.location.hash) {
                    window.location.reload();
                } else {
                    window.location.href = window.location.origin + '/#/accounting';
                }
            } else {
                alert("ক্লিন সম্পন্ন: " + (result?.message || 'কোন ডুপ্লিকেট এন্ট্রি পাওয়া যায়নি।'));
            }
        } catch (e: any) {
            alert("ডুপ্লিকেট ক্লিন করতে সমস্যা: " + e.message);
        } finally {
            setIsCleaningDuplicates(false);
        }
    };

    useEffect(() => {
        localStorage.setItem('ncd_shareholders', JSON.stringify(dynamicShareholders));
        localStorage.setItem('ncd_loans', JSON.stringify(loans));
        localStorage.setItem('ncd_loan_repayments', JSON.stringify(repayments));
        localStorage.setItem('ncd_future_plans', JSON.stringify(futurePlans));
        localStorage.setItem('ncd_company_collections', JSON.stringify(companyCollections));
        localStorage.setItem('ncd_monthly_adjustments', JSON.stringify(monthlyAdjustments));
        localStorage.setItem('ncd_shareholder_logs', JSON.stringify(shareholderLogs));
    }, [dynamicShareholders, loans, repayments, futurePlans, companyCollections, monthlyAdjustments, shareholderLogs]);

    const addLog = (shareholderId: number, action: 'ADD' | 'UPDATE' | 'DELETE', details: string) => {
        const newLog: ShareholderLog = {
            id: `LOG-${Date.now()}`,
            shareholderId,
            action,
            details,
            timestamp: new Date().toISOString()
        };
        setShareholderLogs(prev => [newLog, ...prev]);
    };

    const handleAddOrUpdatePartner = (partner: Partial<Shareholder>) => {
        if (!partner.name || !partner.shares) return alert("নাম এবং শেয়ার সংখ্যা দিন।");

        if (editingShareholder) {
            if (!confirm("আপনি কি এই তথ্যগুলো পরিবর্তন করতে চান?")) return;
            const updated = dynamicShareholders.map(s => s.id === editingShareholder.id ? { ...s, ...partner, updatedAt: new Date().toISOString() } as Shareholder : s);
            setDynamicShareholders(updated);
            addLog(editingShareholder.id, 'UPDATE', `Updated partner: ${partner.name}`);
            setEditingShareholder(null);
        } else {
            const newId = dynamicShareholders.length > 0 ? Math.max(...dynamicShareholders.map(s => s.id)) + 1 : 1;
            const newPartner: Shareholder = {
                id: newId,
                name: partner.name!,
                shares: partner.shares!,
                description: partner.description || `${partner.shares}টি`,
                address: partner.address || '',
                phone: partner.phone || '',
                joinDate: partner.joinDate || new Date().toISOString().split('T')[0],
            };
            setDynamicShareholders([...dynamicShareholders, newPartner]);
            addLog(newId, 'ADD', `Added new partner: ${partner.name}`);
        }
        setIsAddPartnerModalOpen(false);
    };

    const handleDeletePartner = (id: number) => {
        const partner = dynamicShareholders.find(s => s.id === id);
        if (!partner) return;
        if (confirm(`আপনি কি নিশ্চিত যে আপনি "${partner.name}"-কে তালিকা থেকে মুছে ফেলতে চান?`)) {
            setDynamicShareholders(dynamicShareholders.filter(s => s.id !== id));
            addLog(id, 'DELETE', `Deleted partner: ${partner.name}`);
        }
    };

    const addFuturePlan = () => {
        if (!newPlan.title) return alert("শিরোনাম দিন।");
        const plan: FuturePlan = {
            id: `FP-${Date.now()}`,
            title: newPlan.title,
            description: '',
            estimatedCost: newPlan.estimatedCost || 0,
            targetDate: newPlan.targetDate || new Date().toISOString().split('T')[0],
            status: 'Pending'
        };
        setFuturePlans([plan, ...futurePlans]);
        setNewPlan({ title: '', estimatedCost: 0, status: 'Pending', targetDate: '' });
    };

    const addCompanyCollection = () => {
        if (!newCompanyEntry.companyName || newCompanyEntry.amount <= 0) return alert("কোম্পানির নাম এবং সঠিক পরিমাণ দিন।");
        const entry: CompanyCollection = {
            id: `CC-${Date.now()}`,
            companyName: newCompanyEntry.companyName,
            amount: newCompanyEntry.amount,
            date: newCompanyEntry.date
        };
        setCompanyCollections([entry, ...companyCollections]);
        setNewCompanyEntry({ companyName: '', amount: 0, date: new Date().toISOString().split('T')[0] });
    };

    const deletePlan = (id: string) => { if(confirm("পরিকল্পনাটি মুছে ফেলতে চান?")) setFuturePlans(futurePlans.filter(p => p.id !== id)); };
    const updatePlan = (id: string, field: keyof FuturePlan, val: any) => { setFuturePlans(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p)); };

    const allFlatExpenses = useMemo(() => {
        const list: any[] = [];
        const pushExp = (it: any, fallbackDate?: string) => {
            if (!it || it.isDeleted) return;
            let normDate = normalizeDate(it.date || it.expense_date || it.created_at || fallbackDate || '');
            if (!normDate && it.id) {
                const m = String(it.id).match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
                if (m) normDate = `${m[1]}-${m[2]}-${m[3]}`;
            }
            if (!normDate && fallbackDate) normDate = normalizeDate(fallbackDate);
            if (!normDate) normDate = new Date().toISOString().split('T')[0];
            list.push({ ...it, date: normDate });
        };

        if (Array.isArray(detailedExpenses)) {
            detailedExpenses.forEach(it => pushExp(it));
        } else if (detailedExpenses && typeof detailedExpenses === 'object') {
            Object.entries(detailedExpenses).forEach(([k, v]) => {
                if (Array.isArray(v)) {
                    v.forEach(it => pushExp(it, k));
                } else if (v && typeof v === 'object') {
                    if ((v as any).category || (v as any).amount !== undefined || (v as any).paidAmount !== undefined || (v as any).paid_amount !== undefined) {
                        pushExp(v, k);
                    } else {
                        Object.values(v).forEach(sub => pushExp(sub, k));
                    }
                }
            });
        }
        return list;
    }, [detailedExpenses]);

    const expenseSheetData = useMemo(() => { try {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const rows = [];
        const normalizedExpsMap = new Map<string, any[]>();
        allFlatExpenses.forEach(exp => {
            const normKey = exp.date;
            if (!normKey) return;
            if (!normalizedExpsMap.has(normKey)) {
                normalizedExpsMap.set(normKey, []);
            }
            normalizedExpsMap.get(normKey)!.push(exp);
        });

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const expsForDay = normalizedExpsMap.get(dateStr) || [];
            
            const dailyExps = expsForDay.filter((ex: any) => {
                if (!ex || ex.isDeleted) return false;
                if (deptFilter === 'All') return true;
                if (deptFilter === 'Diagnostic') {
                    return ex.dept === 'Diagnostic' || (!ex.dept && diagExpenseCategories.includes(ex.category));
                }
                if (deptFilter === 'Clinic') {
                    return ex.dept === 'Clinic' || (!ex.dept && clinicExpenseCategories.includes(ex.category));
                }
                return false;
            });
            const categorySums: Record<string, number> = {};
            expenseMapSequence.forEach(e => categorySums[e.key] = 0);
            dailyExps.forEach(exp => {
                let catName = String(exp.category || '').trim();

                // Mapping Diagnostic & Clinic categories to Consolidated keys (English & Bengali aliases)
                if (catName === 'Clinic development' || catName === 'Diagnostic development' || catName === 'ক্লিনিক উন্নয়ন' || catName === 'ডায়াগনস্টিক উন্নয়ন' || catName === 'Clinic_Dev') catName = 'Clinic_Dev';
                else if (catName === 'Electricity bill' || catName === 'Paper / Dish / Wifi Bill' || catName === 'Bills' || catName === 'বিদ্যুৎ বিল' || catName === 'বিদ্যুৎ+ পেপার+ ডিশ বিল' || catName === 'Dish Bill' || catName === 'Wifi Bill') catName = 'Bills';
                else if (catName === 'Doctor donation & Vehicle service' || catName === 'Doctor donation' || catName === 'ডাক্তার ডোনেশন' || catName === 'ডাঃ ডোনেশন+ যাতায়াত' || catName === 'Donation') catName = 'Doctor donation';
                else if (catName === 'Instruments buy/ repair' || catName === 'Repair/Instruments' || catName === 'Instruments' || catName === 'ইন্সট্রুমেন্ট' || catName === 'যন্ত্রপাতি') {
                    if (exp.subCategory === 'Stationary' || exp.subCategory === 'Stationery' || exp.sub_category === 'Stationary' || exp.sub_category === 'Stationery') catName = 'Stationery';
                    else catName = 'Instruments';
                }
                else if (catName === 'Maintenance' || catName === 'রক্ষণাবেক্ষণ') catName = 'Maintenance';
                else if (catName === 'License cost' || catName === 'License/Official' || catName === 'License' || catName === 'লাইসেন্স') catName = 'License';
                else if (catName === 'X-ray Film buy' || catName === 'X-Ray' || catName === 'এক্স-রে') catName = 'X-Ray';
                else if (catName === 'Mobile buy/ Flexiload' || catName === 'Mobile' || catName === 'মোবাইল খরচ' || catName === 'মোবাইল') catName = 'Mobile';
                else if (catName === 'Press Cost' || catName === 'Press' || catName === 'প্রেস') catName = 'Press';
                else if (catName === 'Food/Meal Cost' || catName === 'Food/Refreshment' || catName === 'Food' || catName === 'খাবার' || catName === 'নাস্তা') catName = 'Food';
                else if (catName === 'Bank/NGO Installment' || catName === 'Interest/Loan' || catName === 'Installment' || catName === 'কিস্তি') catName = 'Installment';
                else if (catName === 'Stationery' || catName === 'Stationary' || catName === 'স্টেশনারী') catName = 'Stationery';
                else if (catName === 'Stuff salary' || catName === 'Staff salary' || catName === 'Salary' || catName === 'স্টাফ বেতন' || catName === 'বেতন') catName = 'Stuff salary';
                else if (catName === 'Generator' || catName === 'জেনারেটর') catName = 'Generator';
                else if (catName === 'Marketing' || catName === 'মার্কেটিং') catName = 'Marketing';
                else if (catName === 'Motorcycle' || catName === 'মোটর সাইকেল') catName = 'Motorcycle';
                else if (catName === 'Reagent buy' || catName === 'Reagent' || catName === 'রিএজেন্ট') catName = 'Reagent buy';
                else if (catName === 'House rent' || catName === 'Rent' || catName === 'বাড়ী ভাড়া' || catName === 'ভাড়া') catName = 'House rent';
                else if (catName === 'Electrical and Electronics' || catName === 'ইলেকট্রিক্যাল ও ইলেকট্রনিক্স') catName = 'Electrical and Electronics';
                else if (catName === 'Old Loan Repay' || catName === 'পূর্বের ঋণ পরিশোধ') catName = 'Old Loan Repay';

                const matched = expenseMapSequence.find(e => e.key === catName || e.label === catName || e.key.toLowerCase() === catName.toLowerCase());
                const paidVal = getExpAmount(exp);
                if (matched) categorySums[matched.key] += paidVal;
                else categorySums['Others'] += paidVal;
            });
            const totalDay = Object.values(categorySums).reduce((a, b) => a + b, 0);
            rows.push({ date: dateStr, categories: categorySums, total: totalDay });
        }
        const columnTotals: Record<string, number> = {};
        expenseMapSequence.forEach(e => { columnTotals[e.key] = rows.reduce((sum, row) => sum + row.categories[e.key], 0); });
        const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
        return { rows, columnTotals, grandTotal }; } catch(e) { console.error('expenseSheetData error:', e); return { rows: [], columnTotals: {}, grandTotal: 0 }; } }, [allFlatExpenses, selectedMonth, selectedYear, deptFilter]);

    const dailyCollectionData = useMemo(() => { try {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const rawRows = [];
        let diagUpto = 0;
        let clinicUpto = 0;
        let lastDayWithData = -1;

        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = String(d).padStart(2, '0');
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${dayStr}`;

            const diagInvToday = (labInvoices || []).filter(inv => {
                if (!inv || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return false;
                const invDate = getLabInvDate(inv);
                return isSameDay(invDate, dateStr);
            }).reduce((s, inv) => s + getNetDiagCash(inv), 0);
            
            const isEntryForDay = (e: any) => {
                if (!e) return false;
                const rawDate = e.date || e.created_at || e.createdAt || e.entry_date || e.invoice_date || e.collection_date || '';
                const normE = normalizeDateStr(rawDate);
                if (normE && normE === dateStr) return true;
                if (isSameDay(rawDate, dateStr)) return true;
                if (!normE && e.id) {
                    const m = String(e.id).match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
                    if (m && `${m[1]}-${m[2]}-${m[3]}` === dateStr) return true;
                }
                const isMonthlyEntry = (e.entryType === 'monthly' || e.shift === 'Monthly' || !normE || normE.split('-').length < 3);
                if (d === 1 && isMonthlyEntry) {
                    if (e.month !== undefined && e.year !== undefined && !isNaN(Number(e.month)) && !isNaN(Number(e.year))) {
                        const em = Number(e.month);
                        const ey = Number(e.year);
                        return ey === selectedYear && (em === selectedMonth || em === selectedMonth + 1);
                    }
                    if (normE) {
                        const parts = normE.split('-');
                        const ey = Number(parts[0]);
                        const em = Number(parts[1]);
                        return ey === selectedYear && (em === selectedMonth + 1 || em === selectedMonth);
                    }
                    return isSelectedMonth(rawDate);
                }
                return false;
            };
            const diagConsolidatedToday = (consolidatedEntries || []).filter(isEntryForDay).reduce((s, e) => s + getConsolidatedNet(e), 0);
            const diagToday = diagInvToday + diagConsolidatedToday;

            const diagDue = dueCollections.filter(dc => {
                if (!dc || !isSameDay(dc.collection_date, dateStr) || !isDiagDue(dc)) return false;
                return true;
            }).reduce((s, dc) => s + (Number(dc.amount_collected) || 0), 0);
            const diagTotal = diagToday + diagDue;
            diagUpto += diagTotal;

            const clinicToday = indoorInvoices.filter(inv => {
                if (!inv || inv.isDeleted) return false;
                const st = String(inv.status || '').toLowerCase().trim();
                if (st === 'cancelled' || st === 'returned' || st === 'deleted') return false;
                const dateToUse = inv.admission_date || inv.invoice_date;
                return isSameDay(dateToUse, dateStr);
            }).reduce((s, inv) => {
                const items = Array.isArray(inv.items) ? inv.items : [];
                const fundedRevenue = items.filter(it => it && it.isClinicFund).reduce((ss, ii) => ss + (Number(ii.payable_amount) || 0), 0);
                const pcAmount = (Number(inv.commission_paid) || 0) + (Number(inv.special_commission) || 0);
                const specialDiscount = Number(inv.special_discount_amount) || 0;
                return s + (fundedRevenue - pcAmount - specialDiscount);
            }, 0);
            const clinicDue = dueCollections.filter(dc => {
                if (!dc || !isSameDay(dc.collection_date, dateStr) || (dc.invoice_id || '').startsWith('INV')) return false;
                const inv = indoorInvoices.find(i => i.invoice_id === dc.invoice_id);
                return !inv || !isSameDay(inv.admission_date || inv.invoice_date || '', dc.collection_date);
            }).reduce((s, dc) => s + (Number(dc.amount_collected) || 0), 0);
            const clinicTotal = clinicToday + clinicDue;
            clinicUpto += clinicTotal;

            if (diagTotal > 0 || clinicTotal > 0) {
                lastDayWithData = d - 1;
            }

            const shortMonth = monthOptions[selectedMonth].name.substring(0, 3);
            const displayDate = `${dayStr}-${shortMonth}`;
            rawRows.push({
                date: displayDate,
                fullDate: dateStr,
                diag: { today: diagToday, due: diagDue, total: diagTotal, upto: diagUpto },
                clinic: { today: clinicToday, due: clinicDue, total: clinicTotal, upto: clinicUpto }
            });
        }

        // Hide upto values after the last day with data
        return rawRows.map((row, idx) => {
            if (idx > lastDayWithData) {
                return { ...row, diag: { ...row.diag, upto: null }, clinic: { ...row.clinic, upto: null } };
            }
            return row;
        }); } catch(e) { console.error('dailyCollectionData error:', e); return []; } }, [labInvoices, indoorInvoices, dueCollections, detailedExpenses, consolidatedEntries, selectedMonth, selectedYear]);

    const dailyExpenseReportData = useMemo(() => { try {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const rawRows = [];
        let diagUpto = 0;
        let clinicUpto = 0;
        let lastDayWithData = -1;

        // Normalized date map for lookup (supports array and object detailedExpenses)
        const normalizedExpsMap = new Map<string, any[]>();
        const addExpToMap = (ex: any, rawDateKey?: string) => {
            if (!ex || ex.isDeleted) return;
            let normKey = normalizeDate(ex.date || ex.expense_date || ex.created_at || rawDateKey || '');
            if (!normKey && ex.id) {
                const m = String(ex.id).match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
                if (m) normKey = `${m[1]}-${m[2]}-${m[3]}`;
            }
            if (!normKey && rawDateKey) normKey = normalizeDate(rawDateKey);
            if (!normKey) return;
            if (!normalizedExpsMap.has(normKey)) {
                normalizedExpsMap.set(normKey, []);
            }
            normalizedExpsMap.get(normKey)!.push({ ...ex, date: normKey });
        };

        if (Array.isArray(detailedExpenses)) {
            detailedExpenses.forEach(ex => addExpToMap(ex));
        } else if (detailedExpenses && typeof detailedExpenses === 'object') {
            Object.entries(detailedExpenses).forEach(([rawDateKey, items]: [string, any]) => {
                const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
                list.forEach(ex => addExpToMap(ex, rawDateKey));
            });
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dailyExps = normalizedExpsMap.get(dateStr) || (detailedExpenses && typeof detailedExpenses === 'object' && !Array.isArray(detailedExpenses) ? detailedExpenses[dateStr] : []) || [];

            let diagToday = 0;
            let clinicToday = 0;

            dailyExps.forEach(ex => {
                if (!ex || ex.isDeleted) return;
                let cat = ex.category;
                if (cat === 'House rent') cat = 'House rent';

                const isClinic = ex.dept === 'Clinic' || (!ex.dept && clinicExpenseCategories.includes(cat) && !diagExpenseCategories.includes(cat));
                // default to diag if not clinic explicitly
                const amt = getExpAmount(ex);

                if (isClinic) {
                    clinicToday += amt;
                } else {
                    diagToday += amt;
                }
            });

            diagUpto += diagToday;
            clinicUpto += clinicToday;

            if (diagToday > 0 || clinicToday > 0) {
                lastDayWithData = d - 1;
            }

            const shortMonth = monthOptions[selectedMonth].name.substring(0, 3);
            const displayDate = `${String(d).padStart(2, '0')}-${shortMonth}`;
            rawRows.push({
                date: displayDate,
                diag: { today: diagToday, upto: diagUpto },
                clinic: { today: clinicToday, upto: clinicUpto },
                total: diagToday + clinicToday
            });
        }

        return rawRows.map((row, idx) => {
            if (idx > lastDayWithData) {
                return { ...row, diag: { ...row.diag, upto: null }, clinic: { ...row.clinic, upto: null } };
            }
            return row;
        });
    } catch(e) { console.error('dailyExpenseReportData error:', e); return []; } }, [detailedExpenses, selectedMonth, selectedYear]);



    const statusReportData = useMemo(() => { try {
        return dailyCollectionData.map((collRow, idx) => {
            const expRow = dailyExpenseReportData[idx] || { diag: { today: 0 }, clinic: { today: 0 }, total: 0 };

            const diagColl = collRow.diag?.total || 0;
            const clinicColl = collRow.clinic?.total || 0;
            const totalColl = diagColl + clinicColl;

            const diagExp = expRow.diag?.today || 0;
            const clinicExp = expRow.clinic?.today || 0;
            const totalExp = expRow.total || 0;

            let balance = null;
            if (totalColl > 0 || totalExp > 0 || diagColl > 0 || clinicColl > 0 || diagExp > 0 || clinicExp > 0) {
                balance = totalColl - totalExp;
            }

            return {
                date: collRow.date,
                diagColl,
                clinicColl,
                totalColl,
                diagExp,
                clinicExp,
                totalExp,
                balance
            };
        });
    } catch (e) { console.error('statusReportData error:', e); return []; } }, [dailyCollectionData, dailyExpenseReportData]);

    const summary = useMemo(() => { try {
        const getInvDate = (inv: any) => {
            if (!inv) return '';
            return inv.invoiceDate || inv.invoice_date || inv.date || inv.createdDate || inv.created_date || '';
        };

        const getInvNet = (inv: any) => {
            if (!inv) return 0;
            const net = Number(inv.netPayable ?? inv.net_payable);
            if (!isNaN(net) && net > 0) return net;
            const paid = Number(inv.paidAmount ?? inv.paid_amount);
            if (!isNaN(paid) && paid > 0) return paid;
            const tot = Number(inv.totalAmount ?? inv.total_amount ?? inv.total_bill ?? 0);
            const disc = Number(inv.discount ?? inv.discount_amount ?? inv.total_discount ?? 0);
            if (tot > 0) return Math.max(0, tot - disc);
            if (Array.isArray(inv.items) && inv.items.length > 0) {
                const calculated = inv.items.reduce((sum: number, it: any) => {
                    const line = Number(it.lineTotalBuy ?? it.lineTotalSell ?? it.payable_amount ?? it.line_total);
                    if (!isNaN(line) && line > 0) return sum + line;
                    const price = Number(it.unitPriceBuy ?? it.unitPriceSell ?? it.price ?? 0);
                    const qty = Number(it.qtyBuying ?? it.qtySelling ?? it.quantity ?? 1);
                    return sum + (price * qty);
                }, 0);
                if (calculated > 0) return Math.max(0, calculated - disc);
            }
            if (!isNaN(net)) return net;
            return 0;
        };

        const calcNetPrev = () => {
            const isEntrySelectedMonth = (e: any) => {
                if (!e) return false;
                if (e.month !== undefined && e.year !== undefined && !isNaN(Number(e.month)) && !isNaN(Number(e.year))) {
                    const em = Number(e.month);
                    const ey = Number(e.year);
                    return ey === selectedYear && (em === selectedMonth || em === selectedMonth + 1);
                }
                const rawDate = e.date || e.created_at || '';
                const normE = normalizeDateStr(rawDate);
                if (normE) {
                    const parts = normE.split('-');
                    const ey = Number(parts[0]);
                    const em = Number(parts[1]);
                    return ey === selectedYear && em === selectedMonth + 1;
                }
                return isSelectedMonth(rawDate);
            };

            const isEntryBeforeSelectedMonth = (e: any) => {
                if (!e) return false;
                if (e.month !== undefined && e.year !== undefined && !isNaN(Number(e.month)) && !isNaN(Number(e.year))) {
                    const y = Number(e.year);
                    const m = Number(e.month);
                    return y < selectedYear || (y === selectedYear && m < selectedMonth);
                }
                return isBeforeSelectedMonth(e.date || e.created_at);
            };

            const prevLab = (labInvoices || []).filter(inv => {
                if (!inv || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return false;
                const invDate = getLabInvDate(inv);
                return isBeforeSelectedMonth(invDate);
            }).reduce((s, i) => s + getNetDiagCash(i), 0);
            const prevConsolidatedLab = (consolidatedEntries || []).filter(isEntryBeforeSelectedMonth).reduce((s, e) => s + getConsolidatedNet(e), 0);
            const prevLabDue = dueCollections.filter(dc => {
                if (!dc || !isBeforeSelectedMonth(dc.collection_date) || !isDiagDue(dc)) return false;
                return true;
            }).reduce((s, dc) => s + dc.amount_collected, 0);

            const prevClinic = indoorInvoices.filter(inv => {
                if (!inv || inv.isDeleted) return false;
                const st = String(inv.status || '').toLowerCase().trim();
                if (st === 'cancelled' || st === 'returned' || st === 'deleted') return false;
                const dateToUse = inv.admission_date || inv.invoice_date;
                return isBeforeSelectedMonth(dateToUse);
            }).reduce((acc, inv) => {
                const items = Array.isArray(inv.items) ? inv.items : [];
                const netIncomeForInv = items.filter((it: any) => it && it.isClinicFund).reduce((s: number, i: any) => s + (i.payable_amount || 0), 0);
                const pcAmount = (inv.commission_paid || 0) + (inv.special_commission || 0);
                const specialDiscount = inv.special_discount_amount || 0;
                return acc + (netIncomeForInv - pcAmount - specialDiscount);
            }, 0);

            const prevClinicDue = dueCollections.filter(dc => {
                if (!dc || !isBeforeSelectedMonth(dc.collection_date) || (dc.invoice_id || '').startsWith('INV')) return false;
                const inv = indoorInvoices.find(i => i.invoice_id === dc.invoice_id);
                return !inv || !isSameDay(inv.admission_date || inv.invoice_date, dc.collection_date);
            }).reduce((s, dc) => s + dc.amount_collected, 0);

            const safeSalesInvoices = Array.isArray(salesInvoices) ? salesInvoices : [];
            const prevMedSalesOutdoor = safeSalesInvoices.filter(inv => inv && isBeforeSelectedMonth(getInvDate(inv)) && inv.status !== 'Cancelled' && inv.status !== 'Returned' && inv.status !== 'Deleted').reduce((s, i) => s + getInvNet(i), 0);
            const safeIndoorInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
            const prevMedSalesIndoor = safeIndoorInvoices.filter(inv => {
                if (!inv || inv.isDeleted) return false;
                const st = String(inv.status || '').toLowerCase().trim();
                if (st === 'cancelled' || st === 'returned' || st === 'deleted') return false;
                const dateToUse = inv.admission_date || inv.invoice_date || (inv as any).date || (inv as any).created_date;
                return isBeforeSelectedMonth(dateToUse);
            }).reduce((s, inv) => {
                const items = Array.isArray(inv.items) ? inv.items : [];
                return s + items.filter(it => it && (it.service_type === 'Medicine' || it.service_type === 'ঔষধ' || (it.service_type || '').toLowerCase().includes('med'))).reduce((ss, it) => ss + (Number(it.payable_amount) || Number(it.line_total) || ((Number(it.service_charge || 0)) * (Number(it.quantity || 1))) || 0), 0);
            }, 0);
            const prevMedSales = prevMedSalesOutdoor + prevMedSalesIndoor;

            const safePurchaseInvoices = Array.isArray(purchaseInvoices) ? purchaseInvoices : [];
            const prevMedPurch = safePurchaseInvoices.filter(inv => inv && isBeforeSelectedMonth(getInvDate(inv)) && inv.status !== 'Initial' && inv.status !== 'Cancelled' && inv.status !== 'Deleted').reduce((s, i) => s + getInvNet(i), 0);
            const prevCompany = companyCollections.filter(c => c && isBeforeSelectedMonth(c.date)).reduce((s, c) => s + c.amount, 0);
            let prevExp = 0;
            allFlatExpenses.forEach(it => {
                if (isBeforeSelectedMonth(it.date)) {
                    prevExp += getExpAmount(it);
                }
            });

            // Subtract all previous manual adjustments (profit distributions and house rent)
            let prevAdjustments = 0;
            Object.entries(monthlyAdjustments).forEach(([key, val]) => {
                const match = key.match(/^(\d{4})-(\d{1,2})$/);
                if (match) {
                    const y = parseInt(match[1], 10);
                    const m = parseInt(match[2], 10);
                    if (y < selectedYear || (y === selectedYear && m < selectedMonth)) {
                        const valObj = getSafeAdj(val);
                        prevAdjustments += valObj.profitDist + valObj.houseRent;
                    }
                }
            });

            const net = (prevLab + prevConsolidatedLab + prevLabDue + prevClinic + prevClinicDue + prevMedSales + prevCompany) - (prevExp + prevMedPurch + prevAdjustments);
            return net;
        };

        const prevJer = calcNetPrev();
        
        // Directly synchronize Accounts Sheet Diagnostic and Clinic totals with Daily Collection table totals to ensure 100% data consistency
        const diagCurrent = dailyCollectionData.reduce((s, row) => s + (Number(row.diag?.today) || 0), 0);
        const diagDue = dailyCollectionData.reduce((s, row) => s + (Number(row.diag?.due) || 0), 0);
        const clinicCurrent = dailyCollectionData.reduce((s, row) => s + (Number(row.clinic?.today) || 0), 0);
        const clinicDue = dailyCollectionData.reduce((s, row) => s + (Number(row.clinic?.due) || 0), 0);

        let totalMonthlyOperatingExpenses = allFlatExpenses
            .filter(it => isSelectedMonth(it.date))
            .reduce((s, it) => s + getExpAmount(it), 0);

        const safeSalesInvoices = Array.isArray(salesInvoices) ? salesInvoices : [];
        const medSalesOutdoor = safeSalesInvoices.filter(inv => inv && isSelectedMonth(getInvDate(inv)) && inv.status !== 'Cancelled' && inv.status !== 'Returned' && inv.status !== 'Deleted').reduce((s, i) => s + getInvNet(i), 0);
        const safeIndoorInvoices = Array.isArray(indoorInvoices) ? indoorInvoices : [];
        const medSalesIndoor = safeIndoorInvoices.filter(inv => {
            if (!inv || inv.isDeleted) return false;
            const st = String(inv.status || '').toLowerCase().trim();
            if (st === 'cancelled' || st === 'returned' || st === 'deleted') return false;
            const dateToUse = inv.admission_date || inv.invoice_date || (inv as any).date || (inv as any).created_date;
            return isSelectedMonth(dateToUse);
        }).reduce((s, inv) => {
            const items = Array.isArray(inv.items) ? inv.items : [];
            return s + items.filter(it => it && (it.service_type === 'Medicine' || it.service_type === 'ঔষধ' || (it.service_type || '').toLowerCase().includes('med'))).reduce((ss, it) => ss + (Number(it.payable_amount) || Number(it.line_total) || ((Number(it.service_charge || 0)) * (Number(it.quantity || 1))) || 0), 0);
        }, 0);
        const medSalesCurrent = medSalesOutdoor + medSalesIndoor;

        const safePurchaseInvoices = Array.isArray(purchaseInvoices) ? purchaseInvoices : [];
        const medPurchCurrent = safePurchaseInvoices.filter(inv => inv && isSelectedMonth(getInvDate(inv)) && inv.status !== 'Initial' && inv.status !== 'Cancelled' && inv.status !== 'Deleted').reduce((s, i) => s + getInvNet(i), 0);
        const companyCurrent = companyCollections.filter(c => c && isSelectedMonth(c.date)).reduce((s, c) => s + (Number(c.amount) || 0), 0);

        const totalDiag = diagCurrent + diagDue;
        const totalClinic = clinicCurrent + clinicDue;
        const totalMedNet = medSalesCurrent - medPurchCurrent;

        const grandTotalCollection = totalDiag + totalClinic + totalMedNet + companyCurrent + prevJer - (safeNum(adj.houseRent));

        const groupedExp: Record<string, number> = {};
        expenseMapSequence.forEach(e => groupedExp[e.key] = 0);
        allFlatExpenses
            .filter(it => isSelectedMonth(it.date))
            .forEach(it => {
                let catName = String(it.category || '').trim();

                // Mapping Diagnostic & Clinic categories to Consolidated keys (English & Bengali aliases)
                if (catName === 'Clinic development' || catName === 'Diagnostic development' || catName === 'ক্লিনিক উন্নয়ন' || catName === 'ডায়াগনস্টিক উন্নয়ন' || catName === 'Clinic_Dev') catName = 'Clinic_Dev';
                else if (catName === 'Electricity bill' || catName === 'Paper / Dish / Wifi Bill' || catName === 'Bills' || catName === 'বিদ্যুৎ বিল' || catName === 'বিদ্যুৎ+ পেপার+ ডিশ বিল' || catName === 'Dish Bill' || catName === 'Wifi Bill') catName = 'Bills';
                else if (catName === 'Doctor donation & Vehicle service' || catName === 'Doctor donation' || catName === 'ডাক্তার ডোনেশন' || catName === 'ডাঃ ডোনেশন+ যাতায়াত' || catName === 'Donation') catName = 'Doctor donation';
                else if (catName === 'Instruments buy/ repair' || catName === 'Repair/Instruments' || catName === 'Instruments' || catName === 'ইন্সট্রুমেন্ট' || catName === 'যন্ত্রপাতি') {
                    if (it.subCategory === 'Stationary' || it.subCategory === 'Stationery' || it.sub_category === 'Stationary' || it.sub_category === 'Stationery') catName = 'Stationery';
                    else catName = 'Instruments';
                }
                else if (catName === 'Maintenance' || catName === 'রক্ষণাবেক্ষণ') catName = 'Maintenance';
                else if (catName === 'License cost' || catName === 'License/Official' || catName === 'License' || catName === 'লাইসেন্স') catName = 'License';
                else if (catName === 'X-ray Film buy' || catName === 'X-Ray' || catName === 'এক্স-রে') catName = 'X-Ray';
                else if (catName === 'Mobile buy/ Flexiload' || catName === 'Mobile' || catName === 'মোবাইল খরচ' || catName === 'মোবাইল') catName = 'Mobile';
                else if (catName === 'Press Cost' || catName === 'Press' || catName === 'প্রেস') catName = 'Press';
                else if (catName === 'Food/Meal Cost' || catName === 'Food/Refreshment' || catName === 'Food' || catName === 'খাবার' || catName === 'নাস্তা') catName = 'Food';
                else if (catName === 'Bank/NGO Installment' || catName === 'Interest/Loan' || catName === 'Installment' || catName === 'কিস্তি') catName = 'Installment';
                else if (catName === 'Stationery' || catName === 'Stationary' || catName === 'স্টেশনারী') catName = 'Stationery';
                else if (catName === 'Stuff salary' || catName === 'Staff salary' || catName === 'Salary' || catName === 'স্টাফ বেতন' || catName === 'বেতন') catName = 'Stuff salary';
                else if (catName === 'Generator' || catName === 'জেনারেটর') catName = 'Generator';
                else if (catName === 'Marketing' || catName === 'মার্কেটিং') catName = 'Marketing';
                else if (catName === 'Motorcycle' || catName === 'মোটর সাইকেল') catName = 'Motorcycle';
                else if (catName === 'Reagent buy' || catName === 'Reagent' || catName === 'রিএজেন্ট') catName = 'Reagent buy';
                else if (catName === 'House rent' || catName === 'Rent' || catName === 'বাড়ী ভাড়া' || catName === 'ভাড়া') catName = 'House rent';
                else if (catName === 'Electrical and Electronics' || catName === 'ইলেকট্রিক্যাল ও ইলেকট্রনিক্স') catName = 'Electrical and Electronics';
                else if (catName === 'Old Loan Repay' || catName === 'পূর্বের ঋণ পরিশোধ') catName = 'Old Loan Repay';

                const mapping = expenseMapSequence.find(e => e.key === catName || e.label === catName || e.key.toLowerCase() === catName.toLowerCase());
                const key = mapping ? mapping.key : 'Others';
                groupedExp[key] += getExpAmount(it);
            });
        const monthlyLoanRepayments = repayments.filter(r => isSelectedMonth(r.date)).reduce((s, r) => s + r.amount, 0);
        const totalExpenseTableOnly = Object.values(groupedExp).reduce((s, v) => s + (v as number), 0) + monthlyLoanRepayments + (safeNum(adj.loanInstallment));
        const netProfit = grandTotalCollection - totalExpenseTableOnly;
        const finalClosingJer = netProfit - (safeNum(adj.profitDist));
        const totalShares = dynamicShareholders.reduce((s, h) => s + h.shares, 0);
        const profitPerShare = totalShares > 0 ? (safeNum(adj.profitDist)) / totalShares : 0;

        return { prevJer: safeNum(prevJer), diagCurrent: safeNum(diagCurrent), diagDue: safeNum(diagDue), totalDiag: safeNum(totalDiag), clinicCurrent: safeNum(clinicCurrent), clinicDue: safeNum(clinicDue), totalClinic: safeNum(totalClinic), medSalesCurrent: safeNum(medSalesCurrent), medPurchCurrent: safeNum(medPurchCurrent), totalMedNet: safeNum(totalMedNet), companyCurrent: safeNum(companyCurrent), grandTotalCollection: safeNum(grandTotalCollection), groupedExp, totalExpense: safeNum(totalExpenseTableOnly), netProfit: safeNum(netProfit), finalClosingJer: safeNum(finalClosingJer), profitPerShare: safeNum(profitPerShare), totalShares: safeNum(totalShares) }; } catch(e) { console.error('summary error:', e); return { prevJer: 0, diagCurrent: 0, diagDue: 0, totalDiag: 0, clinicCurrent: 0, clinicDue: 0, totalClinic: 0, medSalesCurrent: 0, medPurchCurrent: 0, totalMedNet: 0, companyCurrent: 0, grandTotalCollection: 0, groupedExp: {}, totalExpense: 0, netProfit: 0, finalClosingJer: 0, profitPerShare: 0, totalShares: 0 }; } }, [labInvoices, dueCollections, indoorInvoices, salesInvoices, purchaseInvoices, companyCollections, detailedExpenses, consolidatedEntries, selectedMonth, selectedYear, monthlyAdjustments, dynamicShareholders, repayments, adj.houseRent, adj.loanInstallment, adj.profitDist]);

    const handlePrintSpecific = (elementId: string) => {
        const content = document.getElementById(elementId);
        if (!content) return;
        const win = window.open('', '', `width=${screen.availWidth},height=${screen.availHeight}`);
        if(!win) return;
        const isLandscape = elementId === 'section-monthly-expense';
        const isPartnerList = elementId === 'print-shareholder-list';
        const isProfitShare = elementId === 'section-profit-share';
        const isAccounts = elementId === 'section-accounts';
        const isDailyCollection = elementId === 'section-daily-collection';
        const isDailyExpense = elementId === 'section-daily-expense';
        const html = `<html><head><title>Print Report</title><script src="https://cdn.tailwindcss.com"></script><style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@400;600;700;800;900&family=Tiro+Bangla&display=swap');
            @page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: ${isPartnerList ? '8mm' : (isProfitShare ? '4mm' : (isLandscape ? '5mm' : (isAccounts ? '6mm 7mm 6mm 7mm' : (isDailyCollection || isDailyExpense ? '5mm 5mm 5mm 5mm' : '15mm'))))} ; }
            html, body { background: white; font-family: 'SolaimanLipi', 'Kalpurush', 'Noto Serif Bengali', 'Hind Siliguri', 'Inter', sans-serif; padding: 0; margin: 0; color: black; box-sizing: border-box; -webkit-print-color-adjust: exact; width: 100%; height: auto !important; min-height: 0 !important; }
            main { width: 100% !important; max-width: none !important; margin: 0 !important; padding: ${isLandscape ? '0.5mm' : (isAccounts ? '0mm' : (isProfitShare ? '1mm' : (isDailyCollection || isDailyExpense ? '1mm' : '5mm')))} 0 !important; border: none !important; box-shadow: none !important; height: auto !important; min-height: 0 !important; display: flex; flex-direction: column; }
            .print-table { width: 100% !important; border-collapse: collapse !important; border: 2px solid #000 !important; table-layout: fixed; margin-bottom: 0 !important; }
            th, td { border: 1.5px solid #000 !important; padding: ${isPartnerList ? '2px 4px' : (isAccounts ? '2px 3px' : (isDailyCollection || isDailyExpense ? '2px 1.5px' : '2px 1.5px'))}; text-align: center; overflow: visible; font-size: ${isPartnerList ? '10.5pt' : (isLandscape ? '8.75pt' : (isAccounts ? '10pt' : (isDailyCollection || isDailyExpense ? '8pt' : '9.5pt')))}; line-height: 1.25; word-break: normal; }
            .no-print { display: none !important; }
            .font-bengali { font-family: 'SolaimanLipi', 'Kalpurush', 'Noto Serif Bengali', 'Hind Siliguri', sans-serif !important; }
            .font-mono { font-family: 'JetBrains Mono', monospace !important; }
            h1 { font-size: ${isLandscape ? '14pt' : (isAccounts ? '20pt' : '18pt')} !important; margin: 0 !important; font-weight: 900 !important; line-height: 1.1; }
            p { font-size: ${isLandscape ? '9.5pt' : (isAccounts ? '10.5pt' : '10pt')} !important; margin: 0 !important; line-height: 1.2; }
            .print-border-b { border-bottom: 2px solid black !important; }
            ${isAccounts ? `
              .accounts-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 16px !important; }
              @media print {
                @page { size: A4 portrait; margin: 6mm 7mm 6mm 7mm; }
                body { padding: 0 !important; margin: 0 !important; }
                main { padding: 0 !important; margin: 0 !important; }
                .accounts-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 16px !important; }
              }
            ` : ''}
            ${isDailyCollection ? `
              @media print {
                @page { size: A4 portrait; margin: 5mm 5mm 5mm 5mm; }
                body { padding: 0 !important; margin: 0 !important; }
                main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                table { width: 100% !important; table-layout: fixed !important; }
                th, td { font-size: 8pt !important; padding: 2px 1.5px !important; }
                .date-col { width: 8.5% !important; white-space: nowrap !important; font-weight: bold !important; }
              }
            ` : ''}
            ${isPartnerList ? 'table tbody tr { height: 54px !important; page-break-inside: avoid; }' : ''}
        </style></head><body>${content.innerHTML}<script>setTimeout(() => { window.print(); window.close(); }, 850);</script></body></html>`;
        win.document.write(html); win.document.close();
    };

    const commonTableCellClass = "p-1 border border-black font-bold text-[10.5pt] font-['SolaimanLipi','Kalpurush','Noto_Serif_Bengali','Hind_Siliguri',sans-serif] h-8 text-left pl-2";
    const commonAmtCellClass = "px-2 py-0.5 border border-black text-right font-black text-[10.5pt] w-[115px] min-w-[110px] h-8 font-['JetBrains_Mono'] whitespace-nowrap";

    const collectionTableCellClass = "p-1 border border-black font-bold text-[10.5pt] font-['SolaimanLipi','Kalpurush','Noto_Serif_Bengali','Hind_Siliguri',sans-serif] h-8 text-left pl-2";
    const collectionAmtCellClass = "px-2 py-0.5 border border-black text-right font-black text-[10.5pt] w-[120px] min-w-[110px] h-8 font-['JetBrains_Mono'] whitespace-nowrap";

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-['Inter']">
            <header className="bg-slate-800 p-4 border-b border-slate-700 sticky top-0 z-[100] no-print flex flex-col md:flex-row justify-between items-center text-white gap-4 pt-16 md:pt-4 shadow-xl">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 bg-slate-700/90 hover:bg-slate-600 rounded-full text-yellow-400 hover:text-yellow-300 transition-all shadow-md active:scale-95 flex items-center justify-center"
                        title="Back"
                    >
                        <BackIcon className="w-5 h-5 text-yellow-400" />
                    </button>
                    <span className="hidden sm:inline-block text-xs font-bold text-slate-300 uppercase tracking-widest">
                        কনসোলিডেটেড রিপোর্ট
                    </span>
                </div>
                <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700 overflow-x-auto max-w-full">
                    <button onClick={() => setActiveTab('monthly_expense_sheet')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'monthly_expense_sheet' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Monthly Expense Sheet</button>
                    <button onClick={() => setActiveTab('daily_collection')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'daily_collection' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Daily Collection</button>
                    <button onClick={() => setActiveTab('daily_expense')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'daily_expense' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Daily Expense</button>
                    <button onClick={() => setActiveTab('accounts')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'accounts' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Accounts Sheet</button>
                    <button onClick={() => setActiveTab('company_collection')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'company_collection' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Company Collection</button>
                    <button onClick={() => setActiveTab('shareholders')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'shareholders' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Profit Share</button>
                    <button onClick={() => setActiveTab('final_status')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'final_status' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Status</button>
                    <button onClick={() => setActiveTab('money_mgmt')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'money_mgmt' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Money Mgmt</button>
                    <button onClick={() => setActiveTab('future_plans')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'future_plans' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Future Plans</button>
                    <button onClick={() => setActiveTab('shareholder_mgmt')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'shareholder_mgmt' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Partner Mgmt</button>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700 shadow-inner">
                    <span className="text-[11px] font-bold text-amber-400 whitespace-nowrap">📅 মাস/বছর:</span>
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(parseInt(e.target.value))}
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs font-bold focus:ring-2 focus:ring-amber-400 outline-none"
                    >
                        {monthOptions.map(m => (
                            <option key={m.value} value={m.value}>
                                {m.bnName} ({m.name})
                            </option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs font-bold focus:ring-2 focus:ring-amber-400 outline-none font-mono"
                    >
                        {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-200">

                {/* 1. Monthly Expense Sheet */}
                {activeTab === 'monthly_expense_sheet' && (
                    <div id="section-monthly-expense" className="animate-fade-in w-full">
                        <main className="relative p-2 print:p-0 w-full max-w-[98%] lg:max-w-[none] mx-auto bg-white text-black shadow-2xl flex flex-col border border-gray-300 font-['Inter'] overflow-x-auto min-h-0">
                            <button
                                onClick={() => handlePrintSpecific('section-monthly-expense')}
                                className="no-print absolute top-1.5 right-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg shadow-lg hover:bg-emerald-500 transition-all flex items-center gap-2 active:scale-95 z-[60]"
                            >
                                <PrinterIcon size={14} />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Print Landscape</span>
                            </button>
                            <div className="flex justify-between items-center mb-1 border-b-2 border-black pb-0.5 shrink-0 px-1 print:mb-0.5 print:pb-0.5">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-black uppercase text-blue-900 leading-none m-0 p-0 print:text-lg">Niramoy Clinic & Diagnostic</h1>
                                    <span className="h-4 w-0.5 bg-black"></span>
                                    <p className="text-[10pt] font-black uppercase tracking-tight text-slate-800 m-0 p-0 font-['Hind_Siliguri'] print:text-[8pt]">মাসিক খরচের হিসাব : {monthOptions[selectedMonth].name} {selectedYear}</p>
                                </div>
                                <div className="no-print flex items-center gap-2">
                                    <div className="flex items-center bg-slate-100 p-1 rounded border border-slate-300 gap-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mr-1 ml-0.5">Filter:</span>
                                        <button onClick={() => setDeptFilter('All')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${deptFilter === 'All' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>All</button>
                                        <button onClick={() => setDeptFilter('Diagnostic')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${deptFilter === 'Diagnostic' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>Diagnostic</button>
                                        <button onClick={() => setDeptFilter('Clinic')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${deptFilter === 'Clinic' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600'}`}>Clinic</button>
                                    </div>
                                    <div className="text-[11px] font-bold px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-700 font-mono">
                                        মোট খরচ: <span className="text-emerald-700 font-black">৳{safeNum(expenseSheetData.grandTotal).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <table className="print-table w-full text-[8.75pt] border-collapse border-2 border-black table-fixed leading-none">
                                <thead className="shrink-0 bg-gray-100">
                                    <tr className="bg-gray-100 h-[36px] print:h-[6mm]">
                                        <th className="border-2 border-black p-0 w-[45px] text-[8.5pt]">Date</th>
                                        {expenseMapSequence.map(e => <th key={e.key} className="border-2 border-black p-0 font-black text-[8pt] uppercase leading-tight break-all font-['Hind_Siliguri']">{e.label}</th>)}
                                        <th className="border-2 border-black p-0 bg-gray-200 font-black w-[70px] text-[8.5pt]">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenseSheetData.rows.map(row => (
                                        <tr key={row.date} className="hover:bg-blue-50 transition-colors h-[32px] print:h-[5.3mm]">
                                            <td className="border border-black p-0 text-center font-['JetBrains_Mono'] font-bold text-[8.5pt] whitespace-nowrap bg-gray-50">{row.date.split('-')[2]} {monthOptions[parseInt(row.date.split('-')[1])-1].name.substring(0,3)}</td>
                                            {expenseMapSequence.map(e => <td key={e.key} className="border border-black p-0.5 text-center font-medium text-[9pt]">{row.categories[e.key] > 0 ? safeNum(row.categories[e.key]).toLocaleString() : '-'}</td>)}
                                            <td className="border border-black p-0.5 px-1 text-left font-black bg-gray-50 text-[9.5pt]">{row.total > 0 ? safeNum(row.total).toLocaleString() : '-'}</td>
                                        </tr>
                                    ))}
                                    {/* Padding Empty Rows if needed to fill the month */}
                                    {expenseSheetData.rows.length < 31 && Array.from({length: 31 - expenseSheetData.rows.length}).map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-[32px] print:h-[5.3mm]">
                                            <td className="border border-black bg-gray-50"></td>
                                            {expenseMapSequence.map(e => <td key={e.key} className="border border-black"></td>)}
                                            <td className="border border-black bg-gray-50"></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-100 font-black h-[36px] print:h-[6mm]">
                                    <tr>
                                        <td className="border-2 border-black p-0 text-center text-[7.5pt] uppercase">TOTAL:</td>
                                        {expenseMapSequence.map(e => <td key={e.key} className="border-2 border-black p-0 text-center text-blue-900 text-[8pt]">{expenseSheetData.columnTotals[e.key] > 0 ? safeNum(expenseSheetData.columnTotals[e.key]).toLocaleString() : '-'}</td>)}
                                        <td className="border-2 border-black p-0 px-1 text-left text-emerald-700 bg-emerald-50 font-black text-[9pt]">{safeNum(expenseSheetData.grandTotal).toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </main>
                    </div>
                )}

                {/* 2. Daily Collection */}
                {activeTab === 'daily_collection' && (
                    <div id="section-daily-collection" className="relative animate-fade-in">
                        <button onClick={() => handlePrintSpecific('section-daily-collection')} className="no-print absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded-full shadow-lg flex items-center gap-2"><PrinterIcon size={18} /> <span className="text-xs font-bold">Print</span></button>
                        <main className="p-4 sm:p-6 max-w-[1200px] mx-auto w-full bg-white text-black shadow-2xl flex flex-col border border-gray-300 font-['Inter'] print:m-0 print:border-none print:shadow-none min-h-0 print:min-h-0">
                            <div className="flex flex-col items-center mb-2 border-b-2 border-black pb-1 shrink-0 print:mb-1">
                                <h1 className="text-xl font-black uppercase text-blue-900 leading-none">Niramoy Clinic & Diagnostic</h1>
                                <h3 className="text-[10pt] font-bold uppercase tracking-widest mt-1">Collection Breakdown - {monthOptions[selectedMonth].name} {selectedYear}</h3>
                                <div className="no-print mt-2 bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-2">
                                    <span>💡 যেকোনো তারিখের কালেকশন লাইনে ডাবল-ক্লিক (Double Click) করুন — সেদিনের কালেকশন সোর্স বিস্তারিত দেখতে ও ডিলিট করতে।</span>
                                </div>
                            </div>
                            <table className="w-full border-collapse border-2 border-black text-[8pt] print:text-[8pt] table-fixed tracking-tighter">
                                <thead>
                                    <tr className="bg-gray-50 h-6 print:h-[5mm]">
                                        <th className="date-col border-2 border-black p-1 w-[8%] whitespace-nowrap" rowSpan={2}>Date</th>
                                        <th className="border-2 border-black p-1" colSpan={4}>Diagnostic</th>
                                        <th className="border-2 border-black p-1" colSpan={4}>Clinic</th>
                                        <th className="border-2 border-black p-1 bg-slate-50 w-[8%] text-[7px]" rowSpan={2}>Total Collection</th>
                                    </tr>
                                    <tr className="bg-gray-50 uppercase text-[7px] font-black h-5 print:h-[4mm]">
                                        <th className="border-2 border-black p-1 w-[10%]">Today</th>
                                        <th className="border-2 border-black p-1 w-[7%]">Due</th>
                                        <th className="border-2 border-black p-1 w-[11%]">Total</th>
                                        <th className="border-2 border-black p-1 bg-blue-50 w-[14%]">Upto</th>
                                        <th className="border-2 border-black p-1 w-[10%]">Today</th>
                                        <th className="border-2 border-black p-1 w-[7%]">Due</th>
                                        <th className="border-2 border-black p-1 w-[11%]">Total</th>
                                        <th className="border-2 border-black p-1 bg-emerald-50 w-[14%]">Upto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyCollectionData.map((row, idx) => (
                                        <tr 
                                            key={idx} 
                                            onDoubleClick={() => {
                                                if (row.fullDate) {
                                                    setSelectedDetailDate({ dateStr: row.fullDate, displayDate: row.date });
                                                    setSelectedSourceIds(new Set());
                                                }
                                            }}
                                            className="h-6 hover:bg-amber-100/80 cursor-pointer transition-colors print:h-[5.5mm] select-none"
                                            title="ডাবল ক্লিক করে সেদিনের কালেকশন বিস্তারিত দেখুন ও ডিলিট করুন"
                                        >
                                            <td className="date-col border border-black p-0.5 sm:p-1 font-['JetBrains_Mono'] font-bold text-center whitespace-nowrap text-[8pt]">{row.date}</td>
                                            <td className="border border-black p-1 text-right">{row.diag.today > 0 ? safeNum(row.diag.today).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right">{row.diag.due > 0 ? safeNum(row.diag.due).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right font-black">{row.diag.total > 0 ? safeNum(row.diag.total).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right font-black bg-blue-50/50">{row.diag.upto !== null ? safeNum(row.diag.upto).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right">{row.clinic.today > 0 ? safeNum(row.clinic.today).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right">{row.clinic.due > 0 ? safeNum(row.clinic.due).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right font-black">{row.clinic.total > 0 ? safeNum(row.clinic.total).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right font-black bg-emerald-50/50">{row.clinic.upto !== null ? safeNum(row.clinic.upto).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right font-black bg-slate-50 italic">{(row.diag.total + row.clinic.total) > 0 ? (row.diag.total + row.clinic.total).toLocaleString() : ''}</td>
                                        </tr>
                                    ))}
                                    <tr className="h-6 print:h-[5.5mm] bg-gray-100 font-black uppercase text-[8pt] border-t-[3px] border-black">
                                        <td className="date-col border border-black p-0.5 sm:p-1 text-center font-bold">Total</td>
                                        <td className="border border-black p-1 text-right">{dailyCollectionData.reduce((s, r) => s + r.diag.today, 0).toLocaleString()}</td>
                                        <td className="border border-black p-1 text-right">{dailyCollectionData.reduce((s, r) => s + r.diag.due, 0).toLocaleString()}</td>
                                        <td className="border border-black p-1 text-right">{dailyCollectionData.reduce((s, r) => s + r.diag.total, 0).toLocaleString()}</td>
                                        <td className="border border-black p-1 text-right bg-blue-50"></td>
                                        <td className="border border-black p-1 text-right">{dailyCollectionData.reduce((s, r) => s + r.clinic.today, 0).toLocaleString()}</td>
                                        <td className="border border-black p-1 text-right">{dailyCollectionData.reduce((s, r) => s + r.clinic.due, 0).toLocaleString()}</td>
                                        <td className="border border-black p-1 text-right">{dailyCollectionData.reduce((s, r) => s + r.clinic.total, 0).toLocaleString()}</td>
                                        <td className="border border-black p-1 text-right bg-emerald-50"></td>
                                        <td className="border border-black p-1 text-right bg-slate-200">{dailyCollectionData.reduce((s, r) => s + r.diag.total + r.clinic.total, 0).toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </main>
                    </div>
                )}

                {/* 3. Daily Expense */}
                {activeTab === 'daily_expense' && (
                    <div id="section-daily-expense" className="relative animate-fade-in">
                        <button onClick={() => handlePrintSpecific('section-daily-expense')} className="no-print absolute top-2 right-2 p-2 bg-rose-600 text-white rounded-full shadow-lg flex items-center gap-2"><PrinterIcon size={18} /> <span className="text-xs font-bold">Print</span></button>
                        <main className="p-6 max-w-[1200px] mx-auto w-full bg-white text-black shadow-2xl flex flex-col border border-gray-300">
                            <h1 className="text-[16pt] font-black uppercase text-center mb-4">Expense detail - {monthOptions[selectedMonth].name} {selectedYear}</h1>
                            <table className="w-full border-collapse border-2 border-black text-[9pt]">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="border-2 border-black p-2 w-[100px]" rowSpan={2}>Date</th>
                                        <th className="border-2 border-black p-2" colSpan={2}>Diagnostic Expense</th>
                                        <th className="border-2 border-black p-2" colSpan={2}>Clinic Expense</th>
                                        <th className="border-2 border-black p-2 w-[100px]" rowSpan={2}>Daily Total</th>
                                    </tr>
                                    <tr className="bg-gray-50 uppercase text-[8px] font-black">
                                        <th className="border-2 border-black p-1">Today</th><th className="border-2 border-black p-1 bg-blue-50">Upto</th>
                                        <th className="border-2 border-black p-1">Today</th><th className="border-2 border-black p-1 bg-emerald-50">Upto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyExpenseReportData.map((row, idx) => (
                                        <tr key={idx} className="h-7 hover:bg-slate-50 transition-colors print:h-[6mm]">
                                            <td className="border border-black p-1 font-['JetBrains_Mono'] font-bold">{row.date}</td>
                                            <td className="border border-black p-1 text-right">{row.diag.today > 0 ? safeNum(row.diag.today).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right font-black bg-blue-50/50">{row.diag.upto !== null ? safeNum(row.diag.upto).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right">{row.clinic.today > 0 ? safeNum(row.clinic.today).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right font-black bg-emerald-50/50">{row.clinic.upto !== null ? safeNum(row.clinic.upto).toLocaleString() : ''}</td>
                                            <td className="border border-black p-1 text-right font-black bg-slate-100">{row.total > 0 ? safeNum(row.total).toLocaleString() : ''}</td>
                                        </tr>
                                    ))}
                                    <tr className="h-6 print:h-[5.5mm] bg-gray-100 font-black uppercase text-[8pt] border-t-[3px] border-black">
                                        <td className="border border-black p-1 text-center font-bold">Total</td>
                                        <td className="border border-black p-1 text-right">{dailyExpenseReportData.reduce((s, r) => s + r.diag.today, 0).toLocaleString()}</td>
                                        <td className="border border-black p-1 text-right bg-blue-50 font-black">{dailyExpenseReportData.reduce((s, r) => s + r.diag.today, 0).toLocaleString()}</td>
                                        <td className="border border-black p-1 text-right">{dailyExpenseReportData.reduce((s, r) => s + r.clinic.today, 0).toLocaleString()}</td>
                                        <td className="border border-black p-1 text-right bg-emerald-50 font-black">{dailyExpenseReportData.reduce((s, r) => s + r.clinic.today, 0).toLocaleString()}</td>
                                        <td className="border border-black p-1 text-right bg-slate-200">{dailyExpenseReportData.reduce((s, r) => s + r.total, 0).toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </main>
                    </div>
                )}

                {/* 4. Accounts Sheet */}
                {activeTab === 'accounts' && (
                    <div id="section-accounts" className="relative animate-fade-in pb-20">
                        <button onClick={() => handlePrintSpecific('section-accounts')} className="no-print absolute top-2 right-2 p-2 bg-blue-600 text-white rounded-full shadow-lg z-20"><FileTextIcon className="w-5 h-5" /></button>
                        <main className="p-4 sm:p-6 max-w-[950px] mx-auto w-full bg-white text-black shadow-xl flex flex-col border border-gray-300 font-['Hind_Siliguri','SolaimanLipi','Noto_Serif_Bengali',sans-serif] print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-none">
                            <div className="flex justify-between items-end mb-6 border-b-2 border-black pb-3.5 shrink-0">
                                <div>
                                    <h1 className="text-2xl sm:text-[28px] font-black text-blue-900 tracking-wide font-['Hind_Siliguri','Noto_Serif_Bengali','Inter',sans-serif]">নিরাময় ক্লিনিক এন্ড ডায়াগনস্টিক</h1>
                                    <p className="text-[13px] font-bold text-slate-700 mt-1 font-['Hind_Siliguri','SolaimanLipi',sans-serif]">এনায়েতপুর, সিরাজগঞ্জ | মোবাইল: 01730 923007</p>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-sm sm:text-base font-bold underline uppercase tracking-wider bg-gray-50 px-4 py-1.5 border border-black font-['Hind_Siliguri','SolaimanLipi',sans-serif]">অ্যাকাউন্টস শিট : {monthOptions[selectedMonth]?.bnName || monthOptions[selectedMonth]?.name}, {selectedYear}</h3>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start flex-1 min-w-0 accounts-grid mt-1">
                                <div className="flex flex-col min-w-0 w-full space-y-3">
                                    <div className="space-y-3 w-full">
                                        <div className="bg-gray-100 text-slate-900 border-2 border-black py-1.5 px-3 text-center font-black text-[15px] sm:text-base font-['Hind_Siliguri','SolaimanLipi',sans-serif] uppercase shadow-sm relative overflow-hidden tracking-wide h-9 flex items-center justify-center">
                                            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:10px_10px]"></div>
                                            কালেকশন এর হিসাব
                                        </div>
                                        <div className="space-y-3 w-full">
                                            <div className="space-y-1">
                                                <div className="text-[13.5px] font-black font-['Hind_Siliguri','SolaimanLipi',sans-serif] text-slate-900 underline mb-1 h-6 flex items-center">ক) ডায়াগনস্টিক হইতে :</div>
                                                <table className="w-full border border-black border-collapse table-fixed">
                                                    <colgroup>
                                                        <col style={{ width: '28px' }} />
                                                        <col />
                                                        <col style={{ width: '120px' }} />
                                                    </colgroup>
                                                    <tbody>
                                                        <tr className="h-8"><td className="p-0.5 border border-black text-center text-xs font-bold">১</td><td className={collectionTableCellClass}>বর্তমান মাসের ক্যাশ</td><td className={collectionAmtCellClass}>{safeNum(summary.diagCurrent).toLocaleString()}</td></tr>
                                                        <tr className="h-8"><td className="p-0.5 border border-black text-center text-xs font-bold">২</td><td className={collectionTableCellClass}>বকেয়া আদায়</td><td className={collectionAmtCellClass}>{safeNum(summary.diagDue).toLocaleString()}</td></tr>
                                                        <tr className="bg-gray-50 font-black h-8"><td colSpan={2} className="p-0.5 text-right text-xs font-bold pr-2">ডায়াগনস্টিক মোট :</td><td className={collectionAmtCellClass}>{safeNum(summary.totalDiag).toLocaleString()}</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[13.5px] font-black font-['Hind_Siliguri','SolaimanLipi',sans-serif] text-slate-900 underline mb-1 h-6 flex items-center">খ) ক্লিনিক হইতে :</div>
                                                <table className="w-full border border-black border-collapse table-fixed">
                                                    <colgroup>
                                                        <col style={{ width: '28px' }} />
                                                        <col />
                                                        <col style={{ width: '120px' }} />
                                                    </colgroup>
                                                    <tbody>
                                                        <tr className="h-8"><td className="p-0.5 border border-black text-center text-xs font-bold">১</td><td className={collectionTableCellClass}>বর্তমান মাসের ক্যাশ</td><td className={collectionAmtCellClass}>{safeNum(summary.clinicCurrent).toLocaleString()}</td></tr>
                                                        <tr className="h-8"><td className="p-0.5 border border-black text-center text-xs font-bold">২</td><td className={collectionTableCellClass}>বকেয়া আদায়</td><td className={collectionAmtCellClass}>{safeNum(summary.clinicDue).toLocaleString()}</td></tr>
                                                        <tr className="bg-gray-100 font-black h-8"><td colSpan={2} className="p-0.5 text-right text-xs font-bold pr-2">ক্লিনিক মোট :</td><td className={collectionAmtCellClass}>{safeNum(summary.totalClinic).toLocaleString()}</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[13.5px] font-black font-['Hind_Siliguri','SolaimanLipi',sans-serif] text-slate-900 underline mb-1 h-6 flex items-center">গ) ঔষধ হইতে (নিট মুনাফা) :</div>
                                                <table className="w-full border border-black border-collapse table-fixed">
                                                    <colgroup>
                                                        <col style={{ width: '28px' }} />
                                                        <col />
                                                        <col style={{ width: '120px' }} />
                                                    </colgroup>
                                                    <tbody>
                                                        <tr className="h-8"><td className="p-0.5 border border-black text-center text-xs font-bold">১</td><td className={collectionTableCellClass}>মোট ঔষধ বিক্রয়</td><td className={collectionAmtCellClass}>{safeNum(summary.medSalesCurrent).toLocaleString()}</td></tr>
                                                        <tr className="h-8"><td className="p-0.5 border border-black text-center text-xs font-bold">২</td><td className={collectionTableCellClass}>মোট ঔষধ ক্রয়</td><td className={`${collectionAmtCellClass} text-slate-900`}>{safeNum(summary.medPurchCurrent).toLocaleString()}</td></tr>
                                                        <tr className="bg-gray-100 font-black h-8"><td colSpan={2} className="p-0.5 text-right text-xs font-bold pr-2">নিট ঔষধ মুনাফা :</td><td className={collectionAmtCellClass}>{safeNum(summary.totalMedNet).toLocaleString()}</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[13.5px] font-black font-['Hind_Siliguri','SolaimanLipi',sans-serif] text-slate-900 underline mb-1 h-6 flex items-center">ঘ) কোম্পানি হইতে প্রাপ্তি :</div>
                                                <table className="w-full border border-black border-collapse table-fixed">
                                                    <colgroup>
                                                        <col style={{ width: '28px' }} />
                                                        <col />
                                                        <col style={{ width: '120px' }} />
                                                    </colgroup>
                                                    <tbody>
                                                        <tr className="bg-gray-50 font-black h-8"><td colSpan={2} className="p-0.5 text-right text-xs font-bold pr-2">কোম্পানি মোট :</td><td className={collectionAmtCellClass}>{safeNum(summary.companyCurrent).toLocaleString()}</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-auto border-t-2 border-black pt-2 w-full">
                                        <table className="w-full border-2 border-black border-collapse table-fixed">
                                            <colgroup>
                                                <col style={{ width: '28px' }} />
                                                <col />
                                                <col style={{ width: '120px' }} />
                                            </colgroup>
                                            <tbody>
                                                <tr className="bg-gray-50 h-8.5">
                                                    <td colSpan={2} className={`${collectionTableCellClass} !text-left !p-1.5`}>
                                                        <div className="flex justify-between items-center w-full">
                                                            <span className="whitespace-nowrap font-bold text-slate-800 text-xs">বাড়ী ভাড়া কর্তন</span>
                                                            <div className="no-print flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="0"
                                                                    value={adj.houseRent === 0 ? '' : adj.houseRent}
                                                                    onChange={e => {
                                                                        const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                                        updateAdjustment('houseRent', isNaN(v) ? 0 : v);
                                                                    }}
                                                                    className="w-20 sm:w-24 px-1.5 py-0.5 text-right border border-gray-400 bg-white rounded text-xs font-bold font-['JetBrains_Mono'] focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm shrink-0"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowSaveConfirm(true)}
                                                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors shadow-sm active:scale-95 flex items-center shrink-0"
                                                                    title="Save"
                                                                >
                                                                    <SaveIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`${collectionAmtCellClass} text-slate-900`}>{safeNum(adj.houseRent).toLocaleString()}</td>
                                                </tr>
                                                <tr className="bg-slate-100 text-slate-900 font-black h-8.5 border-y-2 border-black">
                                                    <td colSpan={2} className="p-1 text-right text-xs uppercase tracking-tight pr-2">
                                                        এই মাসের কালেকশন =
                                                    </td>
                                                    <td className={`${collectionAmtCellClass} text-xs font-black border-l-2 border-black`}>{safeNum(summary.grandTotalCollection - summary.prevJer).toLocaleString()}</td>
                                                </tr>
                                                <tr className="bg-blue-50/30 h-8.5"><td colSpan={2} className={`${collectionTableCellClass} text-blue-900 italic text-xs`}>পূর্বের জের (CF)</td><td className={`${collectionAmtCellClass} ${summary.prevJer < 0 ? 'text-rose-600' : 'text-blue-900'} underline decoration-double`}>{safeNum(summary.prevJer).toLocaleString()}</td></tr>
                                                <tr className="bg-gray-100 text-slate-900 font-black h-9 border-y-[3px] border-black shadow-inner relative">
                                                    <td colSpan={2} className="p-1 text-right text-[12.5px] uppercase tracking-tight relative z-10 pr-2">
                                                        <span className="absolute left-1.5 top-0.5 text-[8px] opacity-20">TOTAL A</span>
                                                        সর্বমোট কালেকশন (A) =
                                                    </td>
                                                    <td className={`${collectionAmtCellClass} text-sm font-black border-l-2 border-black relative z-10`}>{safeNum(summary.grandTotalCollection).toLocaleString()}</td>
                                                </tr>

                                                <tr className="bg-rose-50/30 h-8.5"><td colSpan={2} className={`${collectionTableCellClass} text-slate-900 text-xs`}>মোট খরচ (B)</td><td className={`${collectionAmtCellClass} text-slate-900`}>{safeNum(summary.totalExpense).toLocaleString()}</td></tr>
                                                <tr className="bg-amber-50/40 h-8.5">
                                                    <td colSpan={2} className={`${collectionTableCellClass} !text-left !p-1.5 text-amber-900`}>
                                                        <div className="flex justify-between items-center w-full">
                                                            <span className="whitespace-nowrap font-bold text-amber-950 text-xs">লভ্যাংশ বন্টন</span>
                                                            <div className="no-print flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="0"
                                                                    value={adj.profitDist === 0 ? '' : adj.profitDist}
                                                                    onChange={e => {
                                                                        const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                                        updateAdjustment('profitDist', isNaN(v) ? 0 : v);
                                                                    }}
                                                                    className="w-20 sm:w-24 px-1.5 py-0.5 text-right border border-amber-400 bg-white rounded text-xs font-bold text-amber-950 font-['JetBrains_Mono'] focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm shrink-0"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowSaveConfirm(true)}
                                                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors shadow-sm active:scale-95 flex items-center shrink-0"
                                                                    title="Save"
                                                                >
                                                                    <SaveIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`${collectionAmtCellClass} text-slate-900`}>{safeNum(adj.profitDist).toLocaleString()}</td>
                                                </tr>
                                                <tr className="bg-emerald-50 text-emerald-900 font-black h-9 border-y-[3px] border-emerald-900 shadow-inner relative">
                                                    <td colSpan={2} className="p-1 text-right text-[13px] uppercase tracking-tight relative z-10 pr-2">
                                                        <span className="absolute left-1.5 top-0.5 text-[8px] opacity-20 uppercase">Balance</span>
                                                        অবশিষ্ট বা জের =
                                                    </td>
                                                    <td className={`${collectionAmtCellClass} text-sm font-black border-l-2 border-emerald-900 relative z-10`}>{safeNum(summary.finalClosingJer).toLocaleString()}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="flex flex-col min-w-0 w-full space-y-3">
                                    <div className="space-y-3 w-full flex-1 flex flex-col">
                                        <div className="bg-gray-100 text-slate-900 border-2 border-black py-1.5 px-3 text-center font-black text-[15px] sm:text-base font-['Hind_Siliguri','SolaimanLipi',sans-serif] uppercase shadow-sm relative overflow-hidden tracking-wide h-9 flex items-center justify-center">
                                            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:10px_10px]"></div>
                                            খরচের হিসাব
                                        </div>
                                        <div className="space-y-1 flex-1 flex flex-col">
                                            <div className="text-[13.5px] font-black font-['Hind_Siliguri','SolaimanLipi',sans-serif] underline mb-1 h-6 flex items-center invisible select-none" aria-hidden="true">
                                                খরচের বিবরণ :
                                            </div>
                                            <table className="w-full border-2 border-black flex-1 border-collapse table-fixed h-full">
                                                <colgroup>
                                                    <col style={{ width: '28px' }} />
                                                    <col />
                                                    <col style={{ width: '115px' }} />
                                                </colgroup>
                                                <thead><tr className="bg-gray-50 h-8"><th className="p-1 border border-black w-[28px] text-xs">ক্র.</th><th className="p-1 border border-black text-left text-xs pl-2">বিবরণ</th><th className="p-1 border border-black w-[115px] text-xs">টাকা</th></tr></thead>
                                                <tbody>
                                                    {expenseMapSequence.map((item, idx) => (
                                                        <tr key={item.key} className="h-8"><td className="py-0.5 px-0.5 border border-black text-center text-xs font-bold w-[28px]">{idx + 1}</td><td className={`${commonTableCellClass} !text-left text-[10.5pt] !p-1 truncate`}>{item.label}</td><td className={`${commonAmtCellClass} !p-1 text-[10.5pt] w-[115px]`}>{(summary.groupedExp[item.key] || 0).toLocaleString()}</td></tr>
                                                    ))}
                                                    <tr className="bg-gray-100 text-slate-900 font-black h-9 border-y-[3px] border-black relative">
                                                        <td colSpan={2} className="p-1 text-right text-[12.5px] uppercase tracking-tight relative z-10 pr-2">
                                                            <span className="absolute left-1.5 top-0.5 text-[8px] opacity-20 uppercase">Total Exp</span>
                                                            মোট খরচ (B) =
                                                        </td>
                                                        <td className="p-1 text-right text-sm font-black font-['JetBrains_Mono'] border-l-2 border-black relative z-10 w-[115px] pr-2">{safeNum(summary.totalExpense).toLocaleString()}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                )}

                {/* 8. Final Status (SINGLE PAGE A4 COMPACT) */}
                {activeTab === 'final_status' && (
                    <div id="section-status" className="relative animate-fade-in h-full">
                        <button onClick={() => handlePrintSpecific('section-status')} className="no-print absolute top-2 right-2 p-2 bg-amber-600 text-white rounded-full shadow-lg flex items-center gap-2"><PrinterIcon size={18} /><span className="text-xs font-bold">Print A4 Portrait</span></button>
                        <main className="p-4 sm:p-5 max-w-[210mm] mx-auto w-full bg-white text-black shadow-2xl flex flex-col border border-gray-300 font-['Inter'] min-h-0 print:min-h-0">

                            {/* COMPACT HEADER */}
                            <div className="flex justify-between items-start mb-1 border-b-2 border-black pb-0.5 shrink-0">
                                <div className="text-left flex-1">
                                    <h1 className="text-xl font-black text-blue-900 uppercase tracking-tighter leading-none mb-1">Niramoy Clinic & Diagnostic</h1>
                                    <h2 className="text-xs font-black underline uppercase tracking-widest font-['Hind_Siliguri']">মাসিক চূড়ান্ত রিপোর্ট (Closing Status) : {monthOptions[selectedMonth].name}, {selectedYear}</h2>
                                </div>
                                <div className="w-[250px] border border-black text-[8pt] font-bold">
                                    <div className="flex justify-between border-b border-black p-0.5"><span className="text-blue-900">সর্বমোট জমা (Total Gross Cash) :</span> <span className="border-l border-black pl-2 w-16 text-right">{safeNum(summary.grandTotalCollection).toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-black p-0.5"><span className="text-rose-900">সর্বমোট খরচ (Total Operating Cost) :</span> <span className="border-l border-black pl-2 w-16 text-right text-rose-600">{safeNum(summary.totalExpense).toLocaleString()}</span></div>
                                    <div className="flex justify-between p-0.5 bg-gray-50"><span className="text-blue-700 font-black">Nit Balance :</span> <span className="border-l border-black pl-2 w-16 text-right font-black text-blue-700">{(summary.grandTotalCollection - summary.totalExpense).toLocaleString()}</span></div>
                                </div>
                            </div>

                            {/* MAIN TABLE (TIGHTENED FOR SINGLE PAGE) */}
                            <table className="w-full border-collapse border-2 border-black text-[8.2pt] font-['Inter']">
                                <thead>
                                    <tr className="h-6.5 print:h-[7mm]">
                                        <th className="border-2 border-black w-[80px]"></th>
                                        <th className="border-2 border-black text-purple-700 font-black uppercase text-xs py-0.5 font-['Inter']" colSpan={3}>Collection</th>
                                        <th className="border-2 border-black text-fuchsia-700 font-black uppercase text-xs py-0.5 font-['Inter']" colSpan={3}>Expense</th>
                                        <th className="border-2 border-black text-fuchsia-600 font-black uppercase text-xs py-0.5 font-['Inter']">Balance</th>
                                    </tr>
                                    <tr className="bg-gray-100 uppercase text-[7.8pt] font-black h-6.5 print:h-[7mm]">
                                        <th className="border-2 border-black text-blue-700">Date</th>
                                        <th className="border-2 border-black text-blue-700">Diagnostic</th>
                                        <th className="border-2 border-black text-blue-700">Clinic</th>
                                        <th className="border-2 border-black text-blue-700">Total collection</th>
                                        <th className="border-2 border-black text-blue-700">Diagnostic</th>
                                        <th className="border-2 border-black text-blue-700">Clinic</th>
                                        <th className="border-2 border-black text-blue-700">Total Expense</th>
                                        <th className="border-2 border-black text-blue-700"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statusReportData.map((row, idx) => (
                                        <tr key={idx} className="h-[25.5px] hover:bg-slate-50 transition-colors leading-tight print:h-[6mm]">
                                            <td className="border-2 border-black text-center font-['JetBrains_Mono'] font-bold text-[7.5pt]">{row.date}</td>
                                            <td className="border-2 border-black text-center">{row.diagColl > 0 ? safeNum(row.diagColl).toLocaleString() : ''}</td>
                                            <td className="border-2 border-black text-center">{row.clinicColl > 0 ? safeNum(row.clinicColl).toLocaleString() : ''}</td>
                                            <td className="border-2 border-black text-center font-black bg-slate-50">{row.totalColl > 0 ? safeNum(row.totalColl).toLocaleString() : ''}</td>
                                            <td className="border-2 border-black text-center">{row.diagExp > 0 ? safeNum(row.diagExp).toLocaleString() : ''}</td>
                                            <td className="border-2 border-black text-center">{row.clinicExp > 0 ? safeNum(row.clinicExp).toLocaleString() : ''}</td>
                                            <td className="border-2 border-black text-center font-black bg-slate-50">{row.totalExp > 0 ? safeNum(row.totalExp).toLocaleString() : ''}</td>
                                            <td className="border-2 border-black text-center font-black text-slate-900 bg-gray-50">{row.balance !== null ? safeNum(row.balance).toLocaleString() : ''}</td>
                                        </tr>
                                    ))}
                                    {/* Calculated padding empty rows */}
                                    {statusReportData.length < 31 && Array.from({length: 31 - statusReportData.length}).map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-[25.5px] print:h-[6mm]">
                                            <td className="border-2 border-black"></td><td className="border-2 border-black"></td><td className="border-2 border-black"></td><td className="border-2 border-black"></td><td className="border-2 border-black"></td><td className="border-2 border-black"></td><td className="border-2 border-black"></td><td className="border-2 border-black"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="mt-3 pt-2 flex justify-between px-10 text-gray-500 font-bold uppercase text-[7.8pt] shrink-0 no-print">
                                <div className="text-center w-36 border-t border-black pt-1">Accountant</div>
                                <div className="text-center w-36 border-t border-black pt-1">Authorized MD</div>
                            </div>
                        </main>
                    </div>
                )}

                {/* RESTORED & PERSISTED: Money Management (Loans) */}
                {activeTab === 'money_mgmt' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in no-print">
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
                                <h3 className="text-lg font-black text-emerald-600 uppercase mb-4 flex items-center gap-2"><MoneyIcon size={20}/> Add New Loan Source</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="Source (e.g. Bank Asia)" className="p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold" id="loan_src"/>
                                    <input type="number" placeholder="Amount" className="p-3 bg-slate-50 border border-slate-300 rounded-xl font-black" id="loan_amt"/>
                                </div>
                                <button onClick={() => {
                                    const src = (document.getElementById('loan_src') as HTMLInputElement).value;
                                    const amt = parseFloat((document.getElementById('loan_amt') as HTMLInputElement).value);
                                    if(src && amt) setLoans([...loans, {id:`L-${Date.now()}`, source:src, amount:amt, date:new Date().toISOString().split('T')[0], type:'Capital'}]);
                                }} className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs">Add Loan</button>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
                                <h3 className="text-lg font-black text-slate-800 uppercase mb-4">Loan Master List</h3>
                                {loans.map(l => (
                                    <div key={l.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-3 flex justify-between items-center group">
                                        <div><p className="font-black text-slate-800 uppercase text-sm">{l.source}</p><p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Loan ID: {l.id} | Date: {l.date}</p></div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-rose-600">৳{safeNum(l.amount).toLocaleString()}</p>
                                            <button onClick={() => setLoans(loans.filter(x=>x.id!==l.id))} className="opacity-0 group-hover:opacity-100 text-rose-500 p-1"><TrashIcon size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
                                <h3 className="text-lg font-black text-blue-600 uppercase mb-4 flex items-center gap-2"><TrendingDownIcon size={20}/> Log Monthly Repayments</h3>
                                <div className="space-y-4">
                                    <select className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold" id="rep_loan_id">
                                        <option value="">Select Loan...</option>
                                        {loans.map(l => <option key={l.id} value={l.id}>{l.source} (৳{l.amount})</option>)}
                                    </select>
                                    <input type="number" placeholder="Repayment Amount" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-black" id="rep_amt"/>
                                    <button onClick={() => {
                                        const lid = (document.getElementById('rep_loan_id') as HTMLSelectElement).value;
                                        const ramt = parseFloat((document.getElementById('rep_amt') as HTMLInputElement).value);
                                        if(lid && ramt) setRepayments([...repayments, {id:`R-${Date.now()}`, loanId:lid, amount:ramt, date:new Date().toISOString().split('T')[0], type:'Installment'}]);
                                    }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs">Submit Repayment</button>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-2xl">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Manual Month-end Adjustment</h4>
                                <div className="flex justify-between items-center"><span className="text-sm font-bold">Manual Installment:</span><input type="number" value={adj.loanInstallment || ''} onChange={e=>updateAdjustment('loanInstallment', parseFloat(e.target.value)||0)} className="w-32 bg-slate-800 border-none rounded p-2 text-right font-black text-amber-400" /></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* RESTORED & PERSISTED: Future Plans */}
                {activeTab === 'future_plans' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in no-print">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-200">
                             <h3 className="text-xl font-black text-indigo-600 mb-6 font-['Hind_Siliguri'] border-b pb-4 flex items-center gap-3"><PlusIcon size={24}/> ভবিষ্যৎ পরিকল্পনা ও লক্ষ্যমাত্রা</h3>
                             <div className="grid grid-cols-2 gap-6">
                                 <div><label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">পরিকল্পনার শিরোনাম</label><input value={newPlan.title} onChange={e=>setNewPlan({...newPlan, title: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-bold" placeholder="যেমন: নতুন USG মেশিন ক্রয়"/></div>
                                 <div><label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">সম্ভাব্য খরচ</label><input type="number" value={newPlan.estimatedCost} onChange={e=>setNewPlan({...newPlan, estimatedCost: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-black" /></div>
                             </div>
                             <button onClick={addFuturePlan} className="mt-6 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">নতুন পরিকল্পনা যুক্ত করুন</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {futurePlans.map(p => (
                                <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl flex flex-col justify-between group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{p.status}</div>
                                        <button onClick={() => deletePlan(p.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 p-2"><TrashIcon size={18}/></button>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-800 uppercase leading-tight mb-2">{p.title}</h4>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-100"><span className="text-sm font-black text-indigo-600 uppercase">৳{safeNum(p.estimatedCost).toLocaleString()}</span><select value={p.status} onChange={e=>updatePlan(p.id, 'status', e.target.value as any)} className="bg-slate-50 border-none text-[10px] font-black rounded-lg uppercase tracking-widest outline-none"><option>Pending</option><option>In Progress</option><option>Completed</option></select></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 10. Partner Management */}
                {activeTab === 'shareholder_mgmt' && (
                    <div id="section-shareholder-mgmt" className="max-w-6xl mx-auto space-y-4 animate-fade-in no-print">
                        <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter font-['Hind_Siliguri']">অংশীদার ব্যবস্থাপনা (Partner List)</h3>
                            <div className="flex gap-3">
                                <button onClick={() => {
                                    setEditingShareholder(null);
                                    setIsAddPartnerModalOpen(true);
                                }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-black uppercase text-[11px] shadow-lg transition-all active:scale-95 flex items-center gap-2 font-['Inter']">
                                    <PlusIcon size={14} /> নতুন অংশীদার
                                </button>
                                <button
                                    onClick={() => handlePrintSpecific('print-shareholder-list')}
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-500 transition-all flex items-center gap-2 active:scale-95 font-['Inter']"
                                >
                                    <PrinterIcon size={14} />
                                    <span className="text-[11px] font-black uppercase">Print List</span>
                                </button>
                            </div>
                        </div>

                        {/* Search & Stats - Compact one line */}
                        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
                            <div className="flex-1 flex items-center justify-center gap-2 bg-blue-50 py-2 px-3 rounded-xl border border-blue-100">
                                <p className="text-base font-bold text-blue-600 uppercase tracking-tight">মোট অংশীদার:</p>
                                <p className="text-base font-black text-blue-700">{dynamicShareholders.filter(s => !s.isDeleted).length} জন</p>
                            </div>
                            <div className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-100">
                                <p className="text-base font-bold text-emerald-600 uppercase tracking-tight">মোট শেয়ার:</p>
                                <p className="text-base font-black text-emerald-700">{dynamicShareholders.filter(s => !s.isDeleted).reduce((sum, s) => sum + s.shares, 0).toLocaleString()} টি</p>
                            </div>
                            <div className="flex-1 flex items-center justify-center gap-2 bg-slate-50 py-2 px-3 rounded-xl border border-slate-200">
                                <p className="text-base font-bold text-slate-600 uppercase tracking-tight">সক্রিয় পিরিয়ড:</p>
                                <p className="text-base font-black text-slate-800">{monthOptions[selectedMonth].name} {selectedYear}</p>
                            </div>
                        </div>

                        {/* Partner Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xl bg-white">
                            <div id="print-shareholder-list" className="bg-white">
                                <div className="hidden print:block mb-9 border-b-2 border-black pb-5 text-center">
                                    <h1 className="text-2xl font-black uppercase text-blue-900 mb-2">Niramoy Clinic & Diagnostic</h1>
                                    <p className="text-xs font-bold uppercase text-slate-600 mb-3">Partner List Summary - {monthOptions[selectedMonth].name} {selectedYear}</p>
                                    <div className="flex justify-center gap-10 text-[10px] font-black">
                                        <span>Total Partners: {dynamicShareholders.filter(s => !s.isDeleted).length}</span>
                                        <span>Total Shares: {dynamicShareholders.filter(s => !s.isDeleted).reduce((sum, s) => sum + s.shares, 0)}</span>
                                    </div>
                                </div>

                                <table className="print-table w-full text-left border-collapse border-slate-200 table-fixed border">
                                    <thead className="bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest print:bg-gray-100 print:text-black">
                                        <tr>
                                            <th className="p-3 border border-slate-700 text-center w-24 text-base">SL</th>
                                            <th className="p-3 border border-slate-700 text-base w-[400px]">নাম (Name)</th>
                                            <th className="p-3 border border-slate-700 text-base text-center w-40">শেয়ার ({dynamicShareholders.filter(s => !s.isDeleted).reduce((sum, s) => sum + s.shares, 0)})</th>
                                            <th className="p-3 border border-slate-700 text-base w-[230px]">বিবরণ (কথায়)</th>
                                            <th className="p-3 border border-slate-700 text-base w-40 hidden print:table-cell">স্বাক্ষর (Signature)</th>
                                            <th className="p-3 border border-slate-700 print:hidden text-center w-72 text-base">অ্যাকশন</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 font-['Hind_Siliguri']">
                                        {dynamicShareholders
                                            .filter(s => !s.isDeleted)
                                            .filter(s => {
                                                // Simplified month filtering: if joinDate is present, only show if joinDate <= current month
                                                if (!s.joinDate) return true;
                                                const join = new Date(s.joinDate);
                                                const current = new Date(selectedYear, selectedMonth + 1, 0);
                                                return join <= current;
                                            })
                                            .map((s, i) => (
                                            <tr key={s.id} className="hover:bg-blue-50/50 transition-colors h-14 group">
                                                <td className="p-1 px-3 border border-slate-300 text-center font-bold text-slate-700 text-lg">{i+1}</td>
                                                <td className="p-1 px-3 border border-slate-300 group-hover:pl-4 transition-all pr-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800 uppercase text-lg leading-tight">{s.name}</span>
                                                        <div className="flex gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0">
                                                            <span>Phone: {s.phone || 'N/A'}</span>
                                                            <span className="h-2 w-px bg-slate-200"></span>
                                                            <span>Joined: {s.joinDate || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-1 border border-slate-300 text-center">
                                                    <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-700 rounded-md font-black text-lg shadow-sm">{s.shares}</span>
                                                </td>
                                                <td className="p-1 px-3 border border-slate-300 text-slate-700 font-bold text-lg">{s.description}</td>
                                                <td className="p-1 border border-slate-300 hidden print:table-cell"></td>
                                                <td className="p-1 border border-slate-300 text-center print:hidden">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingShareholder(s);
                                                                setIsAddPartnerModalOpen(true);
                                                            }}
                                                            className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                                            title="Edit"
                                                        >
                                                            <EditIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                        <div className="w-px h-4 bg-slate-300"></div>
                                                        <button
                                                            onClick={() => handleDeletePartner(s.id)}
                                                            className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-black border-t-2 border-slate-200">
                                        <tr className="h-10">
                                            <td className="p-2 border border-slate-200 text-center text-sm">{dynamicShareholders.filter(s => !s.isDeleted).length}</td>
                                            <td className="p-2 border border-slate-200 text-right text-xs uppercase text-slate-500">Total Shares Summary:</td>
                                            <td className="p-2 border border-slate-200 text-center text-blue-700 text-lg bg-blue-50/50">
                                                {dynamicShareholders.filter(s => !s.isDeleted).reduce((sum, s) => sum + s.shares, 0)}
                                            </td>
                                            <td className="p-2 border border-slate-200" colSpan={3}></td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {/* Print version footer */}
                                <div className="hidden print:flex justify-between mt-20 px-10 text-[10px] uppercase font-black">
                                    <div className="text-center w-40 border-t border-black pt-2">Authorized Signature</div>
                                    <div className="text-center w-40 border-t border-black pt-2">Date: {new Date().toLocaleDateString()}</div>
                                    <div className="text-center w-40 border-t border-black pt-2">Managing Director</div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Logs Section */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl no-print">
                            <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2 border-b pb-2">
                                <Activity className="w-4 h-4 text-blue-500" /> সাম্প্রতিক পরিবর্তন লগ (Recent Activity)
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {shareholderLogs.length === 0 ? (
                                    <p className="text-center text-xs text-slate-400 py-10 font-bold uppercase italic">No recent activity recorded.</p>
                                ) : (
                                    shareholderLogs.map(log => (
                                        <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${log.action === 'ADD' ? 'bg-emerald-50 text-emerald-600' : log.action === 'UPDATE' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {log.action === 'ADD' ? <PlusIcon size={14}/> : log.action === 'UPDATE' ? <EditIcon size={14}/> : <TrashIcon size={14}/>}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-700">{log.details}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold font-mono">{new Date(log.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-200 text-slate-500 uppercase tracking-tighter">ID: {log.shareholderId}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Add/Edit Partner Modal */}
                {isAddPartnerModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-fade-in-up">
                            <div className="p-8 bg-slate-800 text-white relative">
                                <h3 className="text-2xl font-black uppercase tracking-tighter font-['Hind_Siliguri'] flex items-center gap-3">
                                    {editingShareholder ? <EditIcon className="w-7 h-7 text-indigo-400"/> : <PlusIcon className="w-7 h-7 text-emerald-400"/>}
                                    {editingShareholder ? 'অংশীদার তথ্য পরিবর্তন' : 'নতুন অংশীদার যুক্ত করুন'}
                                </h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Please fill out all required information</p>
                                <button type="button" onClick={() => setIsAddPartnerModalOpen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-all"><XIcon size={24}/></button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                handleAddOrUpdatePartner({
                                    name: formData.get('name') as string,
                                    shares: parseFloat(formData.get('shares') as string),
                                    description: formData.get('description') as string,
                                    address: formData.get('address') as string,
                                    phone: formData.get('phone') as string,
                                    joinDate: formData.get('joinDate') as string,
                                });
                            }} className="p-8 space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase ml-2 mb-1 block">পূর্ণ নাম (Full Name)*</label>
                                        <input
                                            name="name"
                                            required
                                            defaultValue={editingShareholder?.name || ''}
                                            placeholder="অংশীদারের পুরো নাম লিখুন..."
                                            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 uppercase ml-2 mb-1 block">শেয়ার সংখ্যা (Shares Ratio)*</label>
                                        <input
                                            name="shares"
                                            type="number"
                                            step="0.01"
                                            required
                                            defaultValue={editingShareholder?.shares || ''}
                                            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 uppercase ml-2 mb-1 block">মোবাইল নাম্বার (Phone)</label>
                                        <input
                                            name="phone"
                                            type="tel"
                                            defaultValue={editingShareholder?.phone || ''}
                                            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase ml-2 mb-1 block">ঠিকানা (Address)</label>
                                        <input
                                            name="address"
                                            defaultValue={editingShareholder?.address || ''}
                                            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 uppercase ml-2 mb-1 block">যোগদানের তারিখ (Join Date)</label>
                                        <input
                                            name="joinDate"
                                            type="date"
                                            defaultValue={editingShareholder?.joinDate || new Date().toISOString().split('T')[0]}
                                            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-black font-mono text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 uppercase ml-2 mb-1 block">বিবরণ (Description)</label>
                                        <input
                                            name="description"
                                            defaultValue={editingShareholder?.description || ''}
                                            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddPartnerModalOpen(false)}
                                        className="flex-1 py-4 text-slate-500 font-black uppercase text-sm hover:bg-slate-100 rounded-2xl transition-all"
                                    >
                                        বাতিল (Cancel)
                                    </button>
                                    <button
                                        type="submit"
                                        className={`flex-1 py-4 ${editingShareholder ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-black uppercase text-sm rounded-2xl shadow-xl transition-all active:scale-95`}
                                    >
                                        {editingShareholder ? 'পরিবর্তন সেভ করুন' : 'অংশীদার সেভ করুন'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* RESTORED & PERSISTED: Company Collection */}
                {activeTab === 'company_collection' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in no-print">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-200">
                             <h3 className="text-xl font-black text-cyan-600 mb-6 font-['Hind_Siliguri'] border-b pb-4 flex items-center gap-3"><ClinicIcon className="w-6 h-6" /> কোম্পানি কালেকশন ডাটা এন্ট্রি</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <div><label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">কোম্পানি</label><input value={newCompanyEntry.companyName} onChange={e=>setNewCompanyEntry({...newCompanyEntry, companyName: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold" placeholder="কোম্পানির নাম..."/></div>
                                 <div><label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">টাকার পরিমাণ (৳)</label><input type="number" value={newCompanyEntry.amount} onChange={e=>setNewCompanyEntry({...newCompanyEntry, amount: parseFloat(e.target.value) || 0})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-black" /></div>
                                 <div><label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">তারিখ</label><input type="date" value={newCompanyEntry.date} onChange={e=>setNewCompanyEntry({...newCompanyEntry, date: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-black" /></div>
                             </div>
                             <button onClick={addCompanyCollection} className="mt-6 w-full py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl transition-all">কালেকশন সেভ করুন</button>
                        </div>
                    </div>
                )}

                {/* 6. Profit Share (RESTORED) */}
                {activeTab === 'shareholders' && (
                    <div id="section-profit-share" className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 relative">
                            <button onClick={() => handlePrintSpecific('section-profit-share')} className="no-print absolute top-8 right-8 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-all"><PrinterIcon size={20}/></button>
                            <div className="no-print flex gap-4 items-center justify-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 w-fit mx-auto">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-bold text-slate-700">Report Type:</label>
                                    <select value={profitShareReportType} onChange={e => setProfitShareReportType(e.target.value as any)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white">
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                        <option value="custom">Custom Date Range</option>
                                    </select>
                                </div>
                                {profitShareReportType === 'yearly' && (
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-bold text-slate-700">Year:</label>
                                        <select value={profitShareYearStr} onChange={e => setProfitShareYearStr(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white">
                                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                )}
                                {profitShareReportType === 'custom' && (
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={profitShareStartDate} onChange={e => setProfitShareStartDate(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white" />
                                        <span className="text-slate-400 font-bold">to</span>
                                        <input type="date" value={profitShareEndDate} onChange={e => setProfitShareEndDate(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white" />
                                    </div>
                                )}
                                {profitShareReportType !== 'monthly' && (
                                    <button onClick={() => {
                                        setProfitShareReportType('monthly');
                                        setProfitShareStartDate('');
                                        setProfitShareEndDate('');
                                        setProfitShareYearStr(new Date().getFullYear().toString());
                                    }} className="px-4 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 text-sm">
                                        Clear / Reset
                                    </button>
                                )}
                            </div>

                            <div className="text-center mb-8 border-b pb-6 print:mb-8 print:pb-2">
                                <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter leading-none mb-2 print:text-2xl">Niramoy Clinic & Diagnostic</h1>
                                <h2 className="text-xl font-black text-slate-700 font-['Hind_Siliguri'] print:text-base">অংশীদারদের লভ্যাংশ বন্টন রিপোর্ট</h2>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2 print:text-xs print:mt-1">{profitShareTitle}</p>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-8 print:gap-1 print:mb-8 print:mt-0">
                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-center print:bg-white print:rounded-none print:border-black print:p-1 print:flex print:items-center print:justify-between print:px-3">
                                    <p className="text-[13px] font-black text-slate-500 uppercase mb-1 font-['Hind_Siliguri'] print:text-[8pt] print:mb-0 print:text-black">মোট নিট মুনাফা</p>
                                    <p className="text-2xl font-black text-slate-800 print:text-[10pt]">{safeNum(profitShareAdj.profitDist).toLocaleString()}</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 text-center print:bg-white print:rounded-none print:border-black print:p-1 print:flex print:items-center print:justify-between print:px-3">
                                    <p className="text-[13px] font-black text-blue-500 uppercase mb-1 font-['Hind_Siliguri'] print:text-[8pt] print:mb-0 print:text-black">বন্টনযোগ্য লভ্যাংশ</p>
                                    <div className="flex items-center justify-center gap-2">
                                        {profitShareReportType === 'monthly' ? (
                                            <>
                                                <span className="text-lg font-black text-blue-900 no-print">৳</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={profitShareAdj.profitDist === 0 ? '' : profitShareAdj.profitDist}
                                                    onChange={e => {
                                                        const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                        updateProfitShareAdjustment('profitDist', isNaN(v) ? 0 : v);
                                                    }}
                                                    className="w-36 sm:w-44 bg-white/90 border-2 border-blue-400 rounded-xl px-3 py-1 text-center text-xl sm:text-2xl font-black text-blue-900 outline-none focus:ring-2 focus:ring-blue-500 no-print shadow-sm font-['JetBrains_Mono']"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSaveConfirm(true)}
                                                    className="no-print p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-md active:scale-95 flex items-center gap-1"
                                                    title="Save"
                                                >
                                                    <SaveIcon className="w-4 h-4" />
                                                </button>
                                                <span className="text-2xl font-black text-blue-900 print:inline-block hidden print:text-[10pt]">{safeNum(profitShareAdj.profitDist).toLocaleString()}</span>
                                            </>
                                        ) : (
                                            <span className="text-2xl font-black text-blue-900">{safeNum(profitShareAdj.profitDist).toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 text-center print:bg-white print:rounded-none print:border-black print:p-1 print:flex print:items-center print:justify-between print:px-3">
                                    <p className="text-[13px] font-black text-indigo-500 uppercase mb-1 font-['Hind_Siliguri'] print:text-[8pt] print:mb-0 print:text-black">মোট শেয়ার সংখ্যা</p>
                                    <p className="text-2xl font-black text-indigo-900 print:text-[10pt]">{profitShareTotalShares}</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 text-center print:bg-white print:rounded-none print:border-black print:p-1 print:flex print:items-center print:justify-between print:px-3">
                                    <p className="text-[13px] font-black text-emerald-500 uppercase mb-1 font-['Hind_Siliguri'] print:text-[8pt] print:mb-0 print:text-black">প্রতি শেয়ারে লভ্যাংশ</p>
                                    <p className="text-2xl font-black text-emerald-900 print:text-[10pt]">{profitSharePerShare.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-[2rem] border border-slate-200 shadow-xl bg-white print:border-black print:rounded-none">
                                <table className="w-full text-left border-collapse print:border-black border-x border-slate-200">
                                    <thead className="bg-slate-800 text-white font-black uppercase text-[11px] tracking-widest print:bg-gray-100 print:text-black">
                                        <tr>
                                            <th className="p-4 w-12 text-center border-b border-r border-slate-700/30 print:border-black print:w-16 print:p-1.5">SL</th>
                                            <th className="p-4 border-b border-r border-slate-700/30 print:border-black print:p-1.5 print:px-3">অংশীদারের নাম</th>
                                            <th className="p-4 text-center border-b border-r border-slate-700/30 print:border-black print:p-1.5">শেয়ার</th>
                                            <th className="p-4 text-right border-b border-r border-slate-700/30 print:border-black print:p-1.5 print:px-3">লভ্যাংশ (৳)</th>
                                            <th className="p-4 text-center border-b print:border-black w-32 print:p-1.5">সিগনেচার</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 print:divide-black">
                                        {dynamicShareholders.filter(s => !s.isDeleted).map((s, i) => (
                                            <tr key={s.id} className="hover:bg-blue-50 transition-colors h-12 print:h-9">
                                                <td className="p-4 text-center font-bold text-slate-400 border-b border-r border-slate-100 print:border-black print:text-black print:p-1 text-xs">{i+1}</td>
                                                <td className="p-4 font-black text-slate-800 uppercase font-['Hind_Siliguri'] border-b border-r border-slate-100 print:border-black print:p-1 print:px-3 text-sm">{s.name}</td>
                                                <td className="p-4 text-center font-black text-blue-600 border-b border-r border-slate-100 print:border-black print:p-1 text-sm">{s.shares}</td>
                                                <td className="p-4 text-right font-black text-emerald-600 border-b border-r border-slate-100 print:border-black print:p-1 print:px-3 text-sm">{(s.shares * profitSharePerShare).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                                <td className="p-4 border-b print:border-black print:p-1"></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-black border-t-2 border-slate-200 print:border-black">
                                        <tr className="h-12 print:h-9">
                                            <td colSpan={2} className="p-4 text-right uppercase text-slate-500 border-r border-slate-200 print:border-black print:text-black font-['Hind_Siliguri'] print:p-1 print:px-3 text-sm">সর্বমোট বন্টন:</td>
                                            <td className="p-4 text-center text-blue-900 border-r border-slate-200 print:border-black print:text-black print:p-1 text-sm">{profitShareTotalShares}</td>
                                            <td className="p-4 text-right text-emerald-700 text-lg border-r border-slate-200 print:border-black print:text-black print:p-1 print:px-3 text-sm">{safeNum(profitShareAdj.profitDist).toLocaleString()}</td>
                                            <td className="p-4 print:p-1"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="mt-12 pt-8 flex justify-between px-10 text-slate-400 font-black uppercase text-[10px] tracking-widest print:mt-12 print:pt-4 print:text-black">
                                <div className="text-center w-48 border-t border-slate-200 pt-2">Accountant Signature</div>
                                <div className="text-center w-48 border-t border-slate-200 pt-2">Managing Director</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Save Confirmation Modal */}
            {showSaveConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] no-print p-4">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full border border-slate-200 animate-fade-in-up">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <SaveIcon size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 text-center mb-2 font-['Hind_Siliguri']">সেভ নিশ্চিত করুন</h3>
                        <p className="text-slate-500 text-center mb-8 font-medium">আপনি কি এই ডাটা সেভ করতে চান?</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowSaveConfirm(false)}
                                className="flex-1 py-3 text-slate-500 font-black uppercase text-xs hover:bg-slate-100 rounded-2xl transition-all"
                            >
                                না
                            </button>
                            <button
                                onClick={async () => {
                                    setShowSaveConfirm(false);
                                    if (performBlockingSync) {
                                        await performBlockingSync({ monthlyAdjustments });
                                    } else {
                                        await dbService.saveToCloud({ monthlyAdjustments });
                                    }
                                    setSaveSuccess(true);
                                    setTimeout(() => setSaveSuccess(false), 3000);
                                }}
                                className="flex-1 py-3 bg-emerald-600 text-white font-black uppercase text-xs rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                            >
                                হ্যাঁ, সেভ করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {saveSuccess && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-[1001] flex items-center gap-3 animate-fade-in-up border border-slate-700">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <SaveIcon size={14} className="text-white" />
                    </div>
                    <span className="font-bold text-sm font-['Hind_Siliguri']">সফলভাবে সেভ হয়েছে!</span>
                </div>
            )}

            {/* Daily Collection Detail Breakdown Modal */}
            {selectedDetailDate && (
                <div className="fixed inset-0 z-[9990] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print">
                    <div className="bg-slate-900 border-2 border-slate-700 text-white rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
                        {/* Modal Header */}
                        <div className="bg-slate-800 p-4 sm:p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-600/30 text-indigo-400 rounded-2xl border border-indigo-500/40">
                                    <FileTextIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-white font-['Hind_Siliguri']">
                                        📅 কালেকশন সোর্স বিস্তারিত - {selectedDetailDate.displayDate}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-mono">
                                        তারিখ: {selectedDetailDate.dateStr} | মোট সোর্স এন্ট্রি: {dateSources.length} টি
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedDetailDate(null);
                                    setSelectedSourceIds(new Set());
                                }}
                                className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-full transition-colors"
                            >
                                <XIcon size={20} />
                            </button>
                        </div>

                        {/* Overview Stats Bar */}
                        <div className="p-4 bg-slate-950 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="bg-blue-950/40 border border-blue-500/30 p-3 rounded-2xl">
                                <span className="text-[10px] font-extrabold uppercase text-blue-400 block mb-1">ডায়াগনস্টিক কালেকশন</span>
                                <span className="text-base font-black text-blue-300 font-mono">
                                    ৳{dateSources.filter(s => s.type === 'LAB_INVOICE' || (s.type === 'DUE_COLLECTION' && s.categoryLabel.includes('ডায়াগনস্টিক')) || s.type === 'CONSOLIDATED_ENTRY').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-2xl">
                                <span className="text-[10px] font-extrabold uppercase text-emerald-400 block mb-1">ক্লিনিক কালেকশন</span>
                                <span className="text-base font-black text-emerald-300 font-mono">
                                    ৳{dateSources.filter(s => s.type === 'INDOOR_INVOICE' || (s.type === 'DUE_COLLECTION' && s.categoryLabel.includes('ক্লিনিক'))).reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-2xl">
                                <span className="text-[10px] font-extrabold uppercase text-amber-400 block mb-1">সর্বমোট কালেকশন</span>
                                <span className="text-base font-black text-amber-300 font-mono">
                                    ৳{dateSources.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-2xl">
                                <span className="text-[10px] font-extrabold uppercase text-rose-400 block mb-1">নির্বাচিত সোর্স মোট</span>
                                <span className="text-base font-black text-rose-300 font-mono">
                                    ৳{dateSources.filter(s => selectedSourceIds.has(s.id)).reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} ({selectedSourceIds.size} টি)
                                </span>
                            </div>
                        </div>

                        {/* Action controls */}
                        <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 shrink-0">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-300 hover:text-white">
                                <input
                                    type="checkbox"
                                    checked={dateSources.length > 0 && selectedSourceIds.size === dateSources.length}
                                    onChange={toggleSelectAllSources}
                                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                                />
                                <span>সবগুলো নির্বাচন করুন ({selectedSourceIds.size}/{dateSources.length})</span>
                            </label>

                            <button
                                onClick={() => {
                                    if (selectedSourceIds.size === 0) {
                                        setToastMessage('ডিলিট করার জন্য অন্তত একটি সোর্স নির্বাচন করুন!');
                                        return;
                                    }
                                    setShowDeleteConfirm(true);
                                }}
                                disabled={selectedSourceIds.size === 0}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95"
                            >
                                <TrashIcon size={14} />
                                <span>নির্বাচিত সোর্স ডিলিট করুন ({selectedSourceIds.size})</span>
                            </button>
                        </div>

                        {/* Source Items Table */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {dateSources.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 font-bold font-['Hind_Siliguri']">
                                    এই তারিখে কোনো পৃথক কালেকশন সোর্স ডাটা পাওয়া যায়নি।
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-800 text-slate-300 font-black uppercase tracking-wider border-b border-slate-700">
                                                <th className="p-3 text-center w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSourceIds.size === dateSources.length}
                                                        onChange={toggleSelectAllSources}
                                                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                                                    />
                                                </th>
                                                <th className="p-3 w-12 text-center">SL</th>
                                                <th className="p-3">সোর্স ক্যাটাগরি</th>
                                                <th className="p-3">রেফারেন্স / আইডি</th>
                                                <th className="p-3">বিস্তারিত বিবরণ</th>
                                                <th className="p-3 text-right">পরিমাণ (৳)</th>
                                                <th className="p-3 text-center w-24">অ্যাকশন</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60">
                                            {dateSources.map((item, idx) => {
                                                const isSelected = selectedSourceIds.has(item.id);
                                                return (
                                                    <tr 
                                                        key={item.id} 
                                                        className={`transition-colors hover:bg-slate-800/80 ${isSelected ? 'bg-indigo-950/40' : 'odd:bg-slate-900/40'}`}
                                                    >
                                                        <td className="p-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectSource(item.id)}
                                                                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                                                        <td className="p-3">
                                                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                                item.type === 'LAB_INVOICE' ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40' :
                                                                item.type === 'CONSOLIDATED_ENTRY' ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-500/40' :
                                                                item.type === 'INDOOR_INVOICE' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40' :
                                                                'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                                                            }`}>
                                                                {item.categoryLabel}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-mono font-black text-slate-200">#{item.refNo}</td>
                                                        <td className="p-3 text-slate-300 font-medium max-w-xs truncate">{item.details}</td>
                                                        <td className="p-3 text-right font-black font-mono text-emerald-400 text-sm">৳{item.amount.toLocaleString()}</td>
                                                        <td className="p-3 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedSourceIds(new Set([item.id]));
                                                                    setShowDeleteConfirm(true);
                                                                }}
                                                                className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg border border-rose-500/30 transition-all active:scale-95"
                                                                title="এই সোর্স ডিলিট করুন"
                                                            >
                                                                <TrashIcon size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end shrink-0">
                            <button
                                onClick={() => {
                                    setSelectedDetailDate(null);
                                    setSelectedSourceIds(new Set());
                                }}
                                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition-colors"
                            >
                                বন্ধ করুন (Close)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
                    <div className="bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white space-y-4 animate-scale-in">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                                <TrashIcon size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-rose-400 font-['Hind_Siliguri']">সোর্স ডাটা ডিলিট কনফার্মেশন</h3>
                                <p className="text-xs text-slate-400">সতর্কতা: এটি স্থায়ীভাবে সিস্টেম থেকে মুছে যাবে</p>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-200 leading-relaxed font-['Hind_Siliguri']">
                            আপনি কি নিশ্চিত যে নির্বাচিত <span className="text-amber-400 font-black font-mono text-base px-1">{selectedSourceIds.size}</span> টি কালেকশন সোর্স ডাটা ডিলিট করতে চান?
                        </p>
                        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400 font-bold">
                            ⚠️ ডিলিট করার পর সংশ্লিষ্ট ডেইলি কালেকশন ও অ্যাকাউন্টস রিপোর্ট সাথে সাথেই স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                            >
                                না, বাতিল
                            </button>
                            <button
                                onClick={handleExecuteDeleteSources}
                                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2 active:scale-95"
                            >
                                <TrashIcon size={14} />
                                হ্যাঁ, ডিলিট করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Screen-Wide Blocking Overlay during Delete */}
            {isDeleting && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none cursor-wait no-print">
                    <div className="bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-8 max-w-md w-full shadow-[0_0_60px_rgba(244,63,94,0.35)] animate-pulse flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-1"></div>
                        <h3 className="text-xl font-black text-rose-400 font-['Hind_Siliguri']">ডাটা প্রসেসিং ও ডিলিট করা হচ্ছে...</h3>
                        <p className="text-xs sm:text-sm font-bold text-slate-200 leading-relaxed font-['Hind_Siliguri']">
                            অনুগ্রহ করে অপেক্ষা করুন। ডিলিটের সময় অন্য কোনো কাজ করা যাবে না।
                        </p>
                        <div className="text-[11px] font-mono text-amber-400 bg-slate-950 px-4 py-1.5 rounded-full border border-slate-800 font-bold">
                            🔒 INTERACTION LOCKED DURING DELETE
                        </div>
                    </div>
                </div>
            )}

            {/* Dynamic Toast Message */}
            {toastMessage && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl z-[10000] flex items-center gap-3 animate-fade-in-up border border-indigo-500/40 text-xs sm:text-sm font-bold font-['Hind_Siliguri'] no-print">
                    <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center font-black">
                        ✓
                    </div>
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
};


class AccountsErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any, errorInfo: any}> {
    constructor(props: any) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
    static getDerivedStateFromError(error: any) { return { hasError: true }; }
    componentDidCatch(error: any, errorInfo: any) { this.setState({ error, errorInfo }); console.error(error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return <div className="p-10 text-red-600 bg-red-50 w-full h-full overflow-auto font-mono z-50 fixed inset-0"><h2>Error in Accounts Page! Please screenshot this:</h2><pre className="text-xs mt-4 whitespace-pre-wrap font-bold">{String(this.state.error)}</pre><pre className="text-xs mt-4 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre><button onClick={()=>window.location.reload()} className="mt-4 p-2 bg-red-600 text-white rounded">Reload</button></div>;
        }
        return this.props.children;
    }
}

const WrappedConsolidatedAccountsPage = (props: any) => (
    <AccountsErrorBoundary>
        <ConsolidatedAccountsPage {...props} />
    </AccountsErrorBoundary>
);

export default WrappedConsolidatedAccountsPage;

