
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Patient, Doctor, Employee, LabInvoice, LabInvoiceItem, emptyLabInvoice, Referrar, Reagent, Test, testCategories, DiagnosticSubPage } from './DiagnosticData';
import { formatDateTime } from '../utils/dateUtils';
import { dbService } from '../dbService';
import SearchableSelect from './SearchableSelect';
import PatientInfoPage from './PatientInfoPage';
import DoctorInfoPage from './DoctorInfoPage';
import ReferrerInfoPage from './ReferrerInfoPage';
import TestInfoPage from './TestInfoPage';
import { TrashIcon, DnaIcon, Activity, FileTextIcon } from './Icons';

interface LabInvoicingPageProps {
  patients?: Patient[];
  setPatients?: React.Dispatch<React.SetStateAction<Patient[]>>;
  doctors?: Doctor[];
  setDoctors?: React.Dispatch<React.SetStateAction<Doctor[]>>;
  referrars?: Referrar[];
  setReferrars?: React.Dispatch<React.SetStateAction<Referrar[]>>;
  tests?: Test[];
  reagents?: Reagent[];
  setReagents?: React.Dispatch<React.SetStateAction<Reagent[]>>;
  setTests?: React.Dispatch<React.SetStateAction<Test[]>>; // To update test availability
  employees?: Employee[];
  onNavigateSubPage?: (page: DiagnosticSubPage) => void;
  invoices?: LabInvoice[];
  setInvoices?: React.Dispatch<React.SetStateAction<LabInvoice[]>>;
  monthlyRoster?: Record<string, string[]>;
  initialInvoiceId?: string | null;
  onClearInitialInvoice?: () => void;
  performBlockingSync?: (stateOverride?: any) => Promise<boolean>;
  readOnly?: boolean;
}

const monthOptions = [
    { value: "01", name: 'January' }, { value: "02", name: 'February' }, { value: "03", name: 'March' },
    { value: "04", name: 'April' }, { value: "05", name: 'May' }, { value: "06", name: 'June' },
    { value: "07", name: 'July' }, { value: "08", name: 'August' }, { value: "09", name: 'September' },
    { value: "10", name: 'October' }, { value: "11", name: 'November' }, { value: "12", name: 'December' }
];

const LabInvoicingPage: React.FC<LabInvoicingPageProps> = ({
  patients = [],
  setPatients = () => {},
  doctors = [],
  setDoctors = () => {},
  referrars = [],
  setReferrars = () => {},
  tests = [],
  reagents = [],
  setReagents = () => {},
  setTests = () => {},
  employees = [],
  onNavigateSubPage = () => {},
  invoices = [],
  setInvoices = () => {},
  monthlyRoster = {},
  initialInvoiceId,
  onClearInitialInvoice,
  performBlockingSync,
  readOnly = false
}) => {
  const [formData, setFormData] = useState<LabInvoice>(emptyLabInvoice);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const handledInitialId = useRef<string | null>(null);

  // In-App Invoice Deletion States
  const [invoiceToDelete, setInvoiceToDelete] = useState<LabInvoice | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialInvoiceId && handledInitialId.current !== initialInvoiceId) {
      const safeInvs = Array.isArray(invoices) ? invoices : [];
      const inv = safeInvs.find(i => i && i.invoice_id === initialInvoiceId);
      if (inv) {
        handledInitialId.current = initialInvoiceId;
        setTimeout(() => {
          setFormData(inv);
          setSelectedInvoiceId(inv.invoice_id);
          setIsEditing(false);
          if (onClearInitialInvoice) onClearInitialInvoice();
        }, 0);
      }
    }
  }, [initialInvoiceId, invoices, onClearInitialInvoice]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedTestCategory, setSelectedTestCategory] = useState('All');
  const [applyPC, setApplyPC] = useState(false); // State for Apply PC checkbox
  const [showMobileHistory, setShowMobileHistory] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingFilmSelections, setPendingFilmSelections] = useState<{test_id: string, test_name: string, film_reagent_id: string}[] | null>(null);
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
  const [errors, setErrors] = useState<Record<string, boolean>>({}); // State for validation errors

  // Table Filter States
  const [tableFilterDate, setTableFilterDate] = useState('');
  const [tableFilterMonth, setTableFilterMonth] = useState('');
  const [tableFilterYear, setTableFilterYear] = useState('');
  const [tableFilterDoctorId, setTableFilterDoctorId] = useState('');
  const [tableFilterReferrarId, setTableFilterReferrarId] = useState('');
  const [tableFilterPatientName, setTableFilterPatientName] = useState('');
  const [tableFilterDueOnly, setTableFilterDueOnly] = useState(false);

  // Local state for the "Paid Amount (BDT)" input to allow free typing
  const [displayPaidAmount, setDisplayPaidAmount] = useState<string>('');
  const [displayDiscountPercentage, setDisplayDiscountPercentage] = useState<string>('');
  const [displayDiscountAmount, setDisplayDiscountAmount] = useState<string>('');

  const today = useMemo(() => new Date(), []);
  const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [reportDate, setReportDate] = useState<string>(todayDateString);

  // State for embedded forms
  const [showPatientSearchModal, setShowPatientSearchModal] = useState(false);
  const [patientSearchFilters, setPatientSearchFilters] = useState({
    name: '',
    mobile: '',
    address: '',
    thana: '',
    age: ''
  });
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [showNewDoctorForm, setShowNewDoctorForm] = useState(false);
  const [showNewReferrarForm, setShowNewReferrarForm] = useState(false);
  const [showNewTestForm, setShowNewTestForm] = useState(false);

  // Common styling for inputs, selects, and textareas
  const commonInputClasses = "py-2 px-3 mt-1 block w-full border border-sky-800 rounded-md shadow-sm sm:text-sm bg-sky-900/50 text-sky-200 placeholder-sky-400 transition-colors duration-200 ease-in-out focus:bg-sky-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const commonLabelClasses = "block text-sm font-semibold text-sky-300";
  const totalsInputClasses = "w-28 bg-slate-700 border border-slate-600 rounded p-1 text-right text-white font-bold focus:ring-1 focus:ring-blue-500 outline-none";

  // Derive currentPeriodKey from the invoice date dynamically
  const currentPeriodKey = useMemo(() => {
    return (formData.invoice_date || todayDateString).substring(0, 7); // "YYYY-MM" format
  }, [formData.invoice_date, todayDateString]);

  const employeeOptions = useMemo(() => {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const activeList = safeEmployees.filter(emp => emp && emp.status !== 'Released');
    const listToUse = activeList.length > 0 ? activeList : safeEmployees;

    const opts = listToUse.map(emp => {
      const detailsArr = [];
      if (emp.emp_id) detailsArr.push(`ID: ${emp.emp_id}`);
      if (emp.job_position || emp.designation) detailsArr.push(emp.job_position || emp.designation);
      if (emp.department) detailsArr.push(`Dept: ${emp.department}`);
      if (emp.mobile) detailsArr.push(`📞 ${emp.mobile}`);
      const empName = emp.emp_name || (emp as any).name || (emp as any).employee_name || '';
      return {
        id: empName || emp.emp_id || 'Staff',
        name: empName || 'Staff',
        details: detailsArr.join(' | ')
      };
    });

    if (!opts.some(o => (o?.name || '').toLowerCase() === 'admin')) {
      opts.unshift({
        id: 'Admin',
        name: 'Admin',
        details: 'System Administrator / Admin'
      });
    }

    return opts;
  }, [employees]);

  const activeEmployees = useMemo(() => {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const safeRoster = monthlyRoster || {};
    const activeIds = safeRoster[currentPeriodKey];
    if (Array.isArray(activeIds) && activeIds.length > 0) {
      const rosterFiltered = safeEmployees.filter(emp => emp && activeIds.includes(emp.emp_id) && emp.status !== 'Released');
      if (rosterFiltered.length > 0) return rosterFiltered;
    }
    return safeEmployees.filter(emp => emp && emp.status !== 'Released');
  }, [employees, monthlyRoster, currentPeriodKey]);
  
  useEffect(() => {
    if (successMessage) {
        const timer = setTimeout(() => setSuccessMessage(''), 4000); 
        return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const todayInvoiceCount = useMemo(() => {
    const safeInvs = Array.isArray(invoices) ? invoices : [];
    const repParts = getNormalizedDateParts(todayDateString);
    return safeInvs.filter(inv => {
      if (!inv || inv.status === 'Cancelled') return false;
      const invParts = getNormalizedDateParts(inv.invoice_date || (inv as any).date);
      return invParts.isoDate === repParts.isoDate || inv.invoice_date === todayDateString;
    }).length;
  }, [invoices, todayDateString]);

  const monthlyInvoiceCount = useMemo(() => {
    const safeInvs = Array.isArray(invoices) ? invoices : [];
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    return safeInvs.filter(inv => {
      if (!inv || inv.status === 'Cancelled') return false;
      const invParts = getNormalizedDateParts(inv.invoice_date || (inv as any).date);
      return invParts.m === currentMonth && invParts.y === currentYear;
    }).length;
  }, [invoices, today]);

  // Effect to synchronize `displayPaidAmount` with `formData.paid_amount`
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayPaidAmount((formData.paid_amount || 0).toFixed(2));
    }, 0);
    return () => clearTimeout(timer);
  }, [formData.paid_amount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayDiscountPercentage((formData.discount_percentage || 0).toFixed(2));
    }, 0);
    return () => clearTimeout(timer);
  }, [formData.discount_percentage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayDiscountAmount((formData.discount_amount || 0).toFixed(2));
    }, 0);
    return () => clearTimeout(timer);
  }, [formData.discount_amount]);

  // Calculation Logic
  const totals = useMemo(() => {
    if (!formData || !Array.isArray(formData.items)) return { totalAmount: 0, netPayable: 0, dueAmount: 0, status: 'Paid' as const, tComm100: 0, commAfterDisc: 0, payableComm: 0, commDue: 0 };
    const totalAmount = formData.items.reduce((sum, item) => {
      if (!item) return sum;
      return sum + (item.price || 0) * (item.quantity || 0);
    }, 0);
    const netPayable = totalAmount - (formData.discount_amount || 0);
    const dueAmount = netPayable - (formData.paid_amount || 0);
    const status: LabInvoice['status'] = formData.status === 'Returned' ? 'Returned' : (dueAmount > 0.005 ? 'Due' : 'Paid');

    const tComm100 = applyPC ? formData.items.reduce((sum, item) => {
      if (!item) return sum;
      return sum + ((item.test_commission || 0) * (item.quantity || 0));
    }, 0) : 0;
    const commAfterDisc = applyPC ? tComm100 - (formData.discount_amount || 0) : 0;
    const payableComm = applyPC ? (commAfterDisc + (formData.special_commission || 0)) - dueAmount : 0;
    const commDue = applyPC ? payableComm - (formData.commission_paid || 0) : 0;

    return { totalAmount, netPayable, dueAmount, status, tComm100, commAfterDisc, payableComm, commDue };
  }, [formData, applyPC]);
  
  // Helper for resilient date parsing and matching across all date formats
  function getNormalizedDateParts(rawDate: any) {
    if (!rawDate) return { y: 0, m: 0, d: 0, isoDate: '' };
    const str = String(rawDate).trim();
    const dateOnly = str.split(/[T ]/)[0];
    if (dateOnly.includes('-')) {
      const parts = dateOnly.split('-');
      if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        return { y, m, d, isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
      } else if (parts[2]?.length === 4) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        return { y, m, d, isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
      }
    } else if (dateOnly.includes('/')) {
      const parts = dateOnly.split('/');
      if (parts[2]?.length === 4) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        return { y, m, d, isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
      }
    }
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = dt.getMonth() + 1;
      const d = dt.getDate();
      return { y, m, d, isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
    }
    return { y: 0, m: 0, d: 0, isoDate: dateOnly };
  }

  // Filter invoices when search term or invoices state changes
  const filteredInvoices = useMemo(() => {
    const safeInvs = Array.isArray(invoices) ? invoices : [];
    const cleanSearch = (searchTerm || '').toLowerCase();
    const cleanFilterPatient = (tableFilterPatientName || '').toLowerCase();

    return safeInvs.filter(invoice => {
      if (!invoice) return false;
      if (invoice.status === 'Deleted' || (invoice as any).isDeleted || (invoice as any).is_deleted) return false;
      const matchesSearch = !cleanSearch ||
        (invoice.invoice_id || '').toLowerCase().includes(cleanSearch) ||
        (invoice.patient_name || '').toLowerCase().includes(cleanSearch) ||
        (invoice.doctor_name || '').toLowerCase().includes(cleanSearch) ||
        (invoice.referrar_name || '').toLowerCase().includes(cleanSearch);

      const invDateStr = invoice.invoice_date || (invoice as any).date || (invoice as any).invoiceDate || '';
      const invDateParts = getNormalizedDateParts(invDateStr);
      const matchesDate = !tableFilterDate || invDateParts.isoDate === tableFilterDate || invDateStr === tableFilterDate;
      
      const matchesMonth = !tableFilterMonth || String(invDateParts.m).padStart(2, '0') === tableFilterMonth;
      const matchesYear = !tableFilterYear || String(invDateParts.y) === tableFilterYear;
      
      const matchesDoctor = !tableFilterDoctorId || invoice.doctor_id === tableFilterDoctorId;
      const matchesReferrar = !tableFilterReferrarId || invoice.referrar_id === tableFilterReferrarId;
      const matchesPatient = !cleanFilterPatient || (invoice.patient_name || '').toLowerCase().includes(cleanFilterPatient);
      const matchesDue = !tableFilterDueOnly || ((Number(invoice.due_amount) || 0) > 0 && invoice.status !== 'Cancelled' && invoice.status !== 'Returned');

      return matchesSearch && matchesDate && matchesMonth && matchesYear && matchesDoctor && matchesReferrar && matchesPatient && matchesDue;
    });
  }, [searchTerm, tableFilterDate, tableFilterMonth, tableFilterYear, tableFilterDoctorId, tableFilterReferrarId, tableFilterPatientName, tableFilterDueOnly, invoices]);


  const allAvailableTestCategories = useMemo(() => {
    const safeTests = Array.isArray(tests) ? tests : [];
    const customCats = safeTests.map(t => String(t?.category || '').trim()).filter(Boolean);
    const set = new Set(['All', ...testCategories, ...customCats]);
    return Array.from(set);
  }, [tests]);

  const filteredTestsForSelect = useMemo(() => {
    const safeTests = Array.isArray(tests) ? tests : [];
    if (selectedTestCategory === 'All') {
      return safeTests;
    }
    const selCatLower = selectedTestCategory.toLowerCase();
    return safeTests.filter(test => {
      if (!test) return false;
      const tCat = String(test.category || '').trim().toLowerCase();
      if (selCatLower === 'others') {
        return tCat === 'others' || !testCategories.some(c => c.toLowerCase() === tCat);
      }
      return tCat === selCatLower;
    });
  }, [tests, selectedTestCategory]);

  const getTestAvailability = (test: Test, currentReagents?: Reagent[]): boolean => {
    if (!test || !Array.isArray(test.reagents_required) || test.reagents_required.length === 0) {
      return true; // No reagents required, always available
    }
    const safeReagentsList = Array.isArray(currentReagents) ? currentReagents : (Array.isArray(reagents) ? reagents : []);
    return test.reagents_required.every(req => {
      if (!req) return true;
      const reagent = safeReagentsList.find(r => r && r.reagent_id === req.reagent_id);
      if (!reagent || !reagent.availability) {
        return false;
      }
      return (reagent.quantity || 0) >= (req.quantity_per_test || 0);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: number | string = value;
    if (type === 'number') {
        parsedValue = parseFloat(value) || 0;
    }
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };
  
  const handleApplyPCChange = (isChecked: boolean) => {
    setApplyPC(isChecked);
  };

  const handleFocusSelect = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayPaidAmount(e.target.value);
  };

  const handlePaidAmountInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handlePaidAmountInputBlur = () => {
    let valueToParse = displayPaidAmount.trim();
    if (valueToParse === '') valueToParse = '0';
    const parsedValue = parseFloat(valueToParse);
    
    if (!isNaN(parsedValue)) {
        const formattedValue = parsedValue.toFixed(2);
        setDisplayPaidAmount(formattedValue);
        setFormData(prev => ({ ...prev, paid_amount: parseFloat(formattedValue) }));
    } else {
        setDisplayPaidAmount('0.00');
        setFormData(prev => ({ ...prev, paid_amount: 0.00 }));
    }
  };

  const handleDiscountPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayDiscountPercentage(e.target.value);
  };

  const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayDiscountAmount(e.target.value);
  };

  const handleDiscountPercentageBlur = () => {
    let value = displayDiscountPercentage.trim();
    if (value === '') value = '0';
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue)) {
      const calculatedAmount = parseFloat((totals.totalAmount * (parsedValue / 100)).toFixed(2));
      setFormData(prev => ({ ...prev, discount_percentage: parsedValue, discount_amount: calculatedAmount }));
      setDisplayDiscountPercentage(parsedValue.toFixed(2));
      setDisplayDiscountAmount(calculatedAmount.toFixed(2));
    } else {
      setDisplayDiscountPercentage(formData.discount_percentage.toFixed(2));
    }
  };

  const handleDiscountAmountBlur = () => {
    let value = displayDiscountAmount.trim();
    if (value === '') value = '0';
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue)) {
      const calculatedPercentage = totals.totalAmount > 0 ? parseFloat(((parsedValue / totals.totalAmount) * 100).toFixed(2)) : 0;
      setFormData(prev => ({ ...prev, discount_amount: parsedValue, discount_percentage: calculatedPercentage }));
      setDisplayDiscountAmount(parsedValue.toFixed(2));
      setDisplayDiscountPercentage(calculatedPercentage.toFixed(2));
    } else {
      setDisplayDiscountAmount(formData.discount_amount.toFixed(2));
    }
  };

  const resetForm = () => {
    setFormData({ ...emptyLabInvoice, invoice_date: formatDateTime(new Date()).split(' ')[0], paid_amount: 0.00 });
    setDisplayPaidAmount('0.00');
    setSelectedInvoiceId(null);
    setIsEditing(false);
    setShowNewPatientForm(false);
    setShowNewDoctorForm(false);
    setShowNewReferrarForm(false);
    setShowNewTestForm(false);
    setApplyPC(false);
    setBarcodeInput('');
    setErrors({});
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    const targetItem = invoiceToDelete;
    setIsDeletingInvoice(true);
    setInvoiceToDelete(null); // Close confirm prompt immediately to show blocking overlay
    const targetInvoiceId = String(targetItem.invoice_id || (targetItem as any).invoiceId || (targetItem as any).id || '').trim();
    const targetId = String((targetItem as any).id || '').trim();
    const targetNo = String((targetItem as any).invoice_no || '').trim();

    const isTarget = (inv: any) => {
      if (!inv) return false;
      const iId = String(inv.invoice_id || (inv as any).invoiceId || (inv as any).id || (inv as any).invoice_no || '').trim();
      const rawId = String((inv as any).id || '').trim();
      if (targetInvoiceId && (iId === targetInvoiceId || rawId === targetInvoiceId)) return true;
      if (targetId && (iId === targetId || rawId === targetId)) return true;
      if (targetNo && (iId === targetNo || rawId === targetNo)) return true;
      return false;
    };

    try {
      await dbService.deleteLabInvoiceDirectly(targetItem);
      const safeInvs = Array.isArray(invoices) ? invoices : [];
      const updated = safeInvs.filter(inv => !isTarget(inv));
      setInvoices(updated);
      if (selectedInvoiceId && (selectedInvoiceId === targetInvoiceId || selectedInvoiceId === targetId || selectedInvoiceId === targetNo)) {
        resetForm();
      }
      if (performBlockingSync) {
        await performBlockingSync({ labInvoices: updated });
      }
      setDeleteSuccessMsg(`ইনভয়েস #${targetInvoiceId || targetId} ডাটাবেজ এবং অনলাইন থেকে সফলভাবে স্থায়ীভাবে মুছে ফেলা হয়েছে!`);
    } catch (err) {
      console.error("Delete invoice error:", err);
      alert('ইনভয়েসটি মুছতে সমস্যা হয়েছে! দয়া করে ইন্টারনেট কানেকশন চেক করুন।');
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const handleGetNewId = () => {
    // Convert current selected date or today to parts
    const baseDate = formData.invoice_date ? new Date(formData.invoice_date) : new Date();
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');
    
    // Date string for filtering invoices by ID prefix
    const datePrefix = `INV-${year}-${month}-${day}`;
    
    // Find how many invoices already exist for this SPECIFIC selected date
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const invoicesTodayCount = safeInvoices.filter(inv => inv && inv.invoice_id && inv.invoice_id.startsWith(datePrefix)).length;
    const newSerial = String(invoicesTodayCount + 1).padStart(3, '0');
    const newId = `${datePrefix}-${newSerial}`;
    
    // Preserve the current date if it was manually selected
    const preservedDate = formData.invoice_date || `${year}-${month}-${day}`;
    
    resetForm();
    setFormData(prev => ({
      ...prev,
      invoice_id: newId,
      invoice_date: preservedDate,
      date_created: formatDateTime(new Date()),
      last_modified: formatDateTime(new Date()),
    }));
  };

  const filteredPatients = useMemo(() => {
    const safePatients = Array.isArray(patients) ? patients : [];
    const filterName = (patientSearchFilters?.name || '').toLowerCase();
    const filterMobile = (patientSearchFilters?.mobile || '').toLowerCase();
    const filterAddress = (patientSearchFilters?.address || '').toLowerCase();
    const filterThana = (patientSearchFilters?.thana || '').toLowerCase();
    const filterAge = String(patientSearchFilters?.age || '');

    return safePatients.filter(p => {
      if (!p) return false;
      const pAge = String(p.ageY || '');
      return (p.pt_name || '').toLowerCase().includes(filterName) &&
             (p.mobile || '').toLowerCase().includes(filterMobile) &&
             (p.address || '').toLowerCase().includes(filterAddress) &&
             (p.thana || '').toLowerCase().includes(filterThana) &&
             (pAge.includes(filterAge));
    });
  }, [patients, patientSearchFilters]);

  const handlePatientSelect = (id: string, name: string) => {
    setFormData(prev => ({ ...prev, patient_id: id, patient_name: name }));
    if (errors.patient_id) setErrors(prev => ({ ...prev, patient_id: false }));
    setShowPatientSearchModal(false);
    setShowNewPatientForm(false);
    // Reset search filters for next time
    setPatientSearchFilters({
      name: '',
      mobile: '',
      address: '',
      thana: '',
      age: ''
    });
  };

  const openAdvancedPatientSearch = (currentTerm: string) => {
     setPatientSearchFilters(prev => ({ ...prev, name: currentTerm }));
     setShowPatientSearchModal(true);
  };

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = barcodeInput.trim();
      if (!code) return;

      // 1. Search by Patient ID
      const safePatients = Array.isArray(patients) ? patients : [];
      const safeInvoices = Array.isArray(invoices) ? invoices : [];
      let targetPatient = safePatients.find(p => p && p.pt_id === code);
      
      // 2. If not found, search by Invoice ID
      if (!targetPatient) {
        const matchingInvoice = safeInvoices.find(inv => inv && inv.invoice_id === code);
        if (matchingInvoice) {
          targetPatient = safePatients.find(p => p && p.pt_id === matchingInvoice.patient_id);
        }
      }

      if (targetPatient) {
        handlePatientSelect(targetPatient.pt_id, targetPatient.pt_name);
        setSuccessMessage(`পেশেন্ট "${targetPatient.pt_name}" সফলভাবে বারকোড দ্বারা সিলেক্ট করা হয়েছে।`);
        setBarcodeInput('');
      } else {
        alert("এই বারকোড দিয়ে কোনো রোগী বা ইনভয়েস পাওয়া যায়নি।");
      }
    }
  };

  const handleDoctorSelect = (id: string, name: string) => {
    setFormData(prev => ({ ...prev, doctor_id: id, doctor_name: name }));
    if (errors.doctor_id) setErrors(prev => ({ ...prev, doctor_id: false }));
    setShowNewDoctorForm(false);
  };

  const handleReferrarSelect = (id: string, name: string) => {
    setFormData(prev => ({ ...prev, referrar_id: id, referrar_name: name }));
    if (id) {
      setApplyPC(true);
    }
    if (errors.referrar_id) setErrors(prev => ({ ...prev, referrar_id: false }));
    setShowNewReferrarForm(false);
  };

  const handleEmployeeSelect = (field: 'bill_created_by' | 'bill_paid_by', id: string, name: string) => {
    setFormData(prev => ({ ...prev, [field]: name }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleTestSelect = (testId: string, testName?: string, newlyCreatedTest?: Test) => {
    const selectedTest = newlyCreatedTest || tests.find(t => t.test_id === testId);
    if (selectedTest) {
      if (!getTestAvailability(selectedTest, reagents)) {
        alert(`Test "${selectedTest.test_name}" is currently unavailable due to insufficient reagent stock.`);
        return;
      }
      const existingItem = (formData.items || []).find(item => item && item.test_id === testId);
      if (existingItem) {
        setFormData(prev => ({
          ...prev,
          items: (prev.items || []).map(item => {
            if (item.test_id === testId) {
              const newQty = (item.quantity || 1) + 1;
              return {
                ...item,
                quantity: newQty,
                subtotal: (item.price || 0) * newQty
              };
            }
            return item;
          })
        }));
        if (errors.items) setErrors(prev => ({...prev, items: false}));
        setShowNewTestForm(false);
        return;
      }
      const newItem: LabInvoiceItem = {
        test_id: selectedTest.test_id,
        test_name: selectedTest.test_name,
        price: selectedTest.price,
        quantity: 1,
        test_commission: selectedTest.test_commission,
        usg_exam_charge: selectedTest.usg_exam_charge,
        extra_lab_fee: selectedTest.extra_lab_fee || 0,
        subtotal: selectedTest.price * 1,
      };
      setFormData(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
      if (errors.items) setErrors(prev => ({...prev, items: false}));
      setShowNewTestForm(false);
    }
  };

  const handleItemQuantityChange = (testId: string, newQty: number) => {
    const qty = Math.max(1, isNaN(newQty) ? 1 : newQty);
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item => {
        if (item.test_id === testId) {
          return {
            ...item,
            quantity: qty,
            subtotal: (item.price || 0) * qty
          };
        }
        return item;
      })
    }));
  };

  const handleRemoveItem = (testId: string) => {
    setFormData(prev => ({ ...prev, items: (prev.items || []).filter(item => item && item.test_id !== testId) }));
  };
  
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: Record<string, boolean> = {};
    if (!formData.invoice_id) validationErrors.invoice_id = true;
    if (!formData.invoice_date) validationErrors.invoice_date = true;
    if (!formData.patient_id) validationErrors.patient_id = true;
    if (!formData.doctor_id) validationErrors.doctor_id = true;
    if (!formData.referrar_id) validationErrors.referrar_id = true;
    if (!formData.items || formData.items.length === 0) validationErrors.items = true;
    if (!formData.bill_created_by) validationErrors.bill_created_by = true;
    if (!formData.bill_paid_by) validationErrors.bill_paid_by = true;

    if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        alert('অনুগ্রহ করে সবগুলি প্রয়োজনীয় ঘর পূরণ করুন: তারিখ, পেশেন্ট, ডাক্তার, রেফারার, টেস্ট আইটেম, বিল ক্রিটেড বাই এবং বিল পেইড বাই।');
        return;
    }
    if (totals.dueAmount < -0.001) {
        alert('Paid amount cannot be greater than Net Payable.');
        return;
    }

    if (!isEditing) {
        const safeTestsList = Array.isArray(tests) ? tests : [];
        const safeReagentsList = Array.isArray(reagents) ? reagents : [];
        const xrayTestsInInvoice = (formData.items || []).filter(item => {
            const testObj = safeTestsList.find(t => t && t.test_id === item.test_id);
            return testObj && testObj.test_category === 'X-Ray';
        });

        if (xrayTestsInInvoice.length > 0) {
            const xrayFilmsAvailable = safeReagentsList.filter(r => r && (r.linked_category === 'X-Ray' || (r.reagent_name || '').toLowerCase().includes('film') || (r.reagent_name || '').toLowerCase().includes('x-ray')));
            if (xrayFilmsAvailable.length > 1) {
                setPendingFilmSelections(xrayTestsInInvoice.map(t => ({ test_id: t.test_id, test_name: t.test_name, film_reagent_id: xrayFilmsAvailable[0]?.reagent_id || '' })));
                return; // wait for modal
            }
        }
    }

    setConfirmModal({
        isOpen: true,
        title: 'Confirm Save',
        message: 'আপনি কি এই ল্যাব ইনভয়েসটি সেভ করতে চান?',
        onConfirm: () => executeSave()
    });
  };

  const executeSave = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setLoading(true);
    try {
      const currentDateTime = formatDateTime(new Date());
      const invoiceToSave = { 
        ...formData, 
        last_modified: currentDateTime,
        total_amount: totals.totalAmount,
        net_payable: totals.netPayable,
        due_amount: totals.dueAmount,
        status: totals.status
      };

      const safeInvoices = Array.isArray(invoices) ? invoices : [];

      // Duplicate check in local buffer first
      if (!isEditing && safeInvoices.some(inv => inv && inv.invoice_id === invoiceToSave.invoice_id)) {
        alert('সতর্কতা: এই ইনভয়েস আইডিটি ইতিমধ্যে ব্যবহৃত হয়েছে। দয়া করে নতুন আইডি নিন।');
        setLoading(false);
        return;
      }

      const newInvoices = isEditing 
        ? safeInvoices.map(inv => (inv && inv.invoice_id === invoiceToSave.invoice_id) ? invoiceToSave : inv)
        : [invoiceToSave, ...safeInvoices];

      let updatedReagents = [...reagents];
      let reagentsChanged = false;
      
      if (!isEditing) {
          const xrayFilmsAvailable = (Array.isArray(reagents) ? reagents : []).filter(r => r && (r.linked_category === 'X-Ray' || (r.reagent_name || '').toLowerCase().includes('film') || (r.reagent_name || '').toLowerCase().includes('x-ray')));
          formData.items.forEach(item => {
              const testObj = tests.find(t => t.test_id === item.test_id);
              if (testObj) {
                  if (testObj.test_category === 'X-Ray') {
                      let selectedFilmId = pendingFilmSelections?.find(p => p.test_id === item.test_id)?.film_reagent_id;
                      if (!selectedFilmId && xrayFilmsAvailable.length === 1) {
                          selectedFilmId = xrayFilmsAvailable[0].reagent_id;
                      }
                      if (selectedFilmId) {
                          item.deducted_film_id = selectedFilmId;
                          const rIdx = updatedReagents.findIndex(r => r.reagent_id === selectedFilmId);
                          if (rIdx !== -1) {
                              updatedReagents[rIdx] = { ...updatedReagents[rIdx], quantity: (updatedReagents[rIdx].quantity || 0) - (item.quantity || 1) };
                              reagentsChanged = true;
                          }
                      }
                  } else {
                      const rIdx = updatedReagents.findIndex(r => r.linked_test === testObj.test_name);
                      if (rIdx !== -1) {
                          updatedReagents[rIdx] = { ...updatedReagents[rIdx], quantity: (updatedReagents[rIdx].quantity || 0) - (item.quantity || 1) };
                          reagentsChanged = true;
                      }
                  }
              }
          });
      }

      // 1. Direct database save respecting July 2026 (ncd_state) vs August 2026+ (lab_invoices)
      try {
        await dbService.saveLabInvoiceDirectly(invoiceToSave);
      } catch (directErr) {
        console.warn("Direct lab invoice save warning:", directErr);
      }

      // 2. If performBlockingSync is available, use it to ensure cloud save
      if (performBlockingSync) {
        try {
          const syncPayload: any = { labInvoices: newInvoices };
          if (reagentsChanged) syncPayload.reagents = updatedReagents;
          const success = await performBlockingSync(syncPayload);
          
          if (success) {
            setInvoices(newInvoices);
            if (reagentsChanged && setReagents) setReagents(updatedReagents);
            setSuccessMessage('ডাটা সফলভাবে সেভ হয়েছে');
            resetForm();
            setPendingFilmSelections(null);
          } else {
            console.error("Cloud save failed reported by performBlockingSync");
            alert("ইন্টারনেট সংযোগ সমস্যা বা সার্ভার ত্রুটির কারণে ডাটা সেভ হয়নি। আবার চেষ্টা করুন।");
          }
        } catch (err) {
          console.error("Critical error in performBlockingSync:", err);
          alert("ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে। ডাটা সেভ করা যায়নি।");
        }
      } else {
        alert("সিস্টেম ত্রুটি: ক্লাউড সিঙ্ক উপলব্ধ নেই।");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("ডাটা সেভ করার সময় একটি ত্রুটি হয়েছে।");
    } finally {
      setLoading(false);
    }
  };


  const handleEditInvoice = () => {
    if (!selectedInvoiceId) return alert("Please select an invoice.");
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const invoiceToEdit = safeInvoices.find(inv => inv && inv.invoice_id === selectedInvoiceId);
    if (invoiceToEdit) {
      setFormData(invoiceToEdit);
      setIsEditing(true);
      setErrors({});
    }
  };

  const handleCancelInvoice = () => {
    if (!selectedInvoiceId) return alert("Please select an invoice.");
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const invoiceToCancel = safeInvoices.find(inv => inv && inv.invoice_id === selectedInvoiceId);
    if (invoiceToCancel && invoiceToCancel.status !== 'Cancelled') {
      setConfirmModal({
        isOpen: true,
        title: 'Confirm Cancel',
        message: `আপনি কি পেশেন্ট "${invoiceToCancel.patient_name}" এর ইনভয়েসটি (${invoiceToCancel.invoice_id}) বাতিল করতে চান? বাতিল করলে বিয়োগকৃত এক্সরে ফিল্মের স্টক স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে ব্যাক হয়ে যাবে।`,
        onConfirm: async () => {
          let updatedReagents = [...reagents];
          let reagentsChanged = false;

          if (invoiceToCancel.items && Array.isArray(invoiceToCancel.items)) {
            const xrayFilmsAvailable = (Array.isArray(reagents) ? reagents : []).filter(r => r && (r.linked_category === 'X-Ray' || (r.reagent_name || '').toLowerCase().includes('film') || (r.reagent_name || '').toLowerCase().includes('x-ray')));
            invoiceToCancel.items.forEach((item: any) => {
              const testObj = tests.find(t => t.test_id === item.test_id);
              if (testObj) {
                if (testObj.test_category === 'X-Ray') {
                  const targetFilm = xrayFilmsAvailable.find(r => r.reagent_id === item.deducted_film_id) || (xrayFilmsAvailable.length === 1 ? xrayFilmsAvailable[0] : null) || xrayFilmsAvailable[0];
                  if (targetFilm) {
                    const rIdx = updatedReagents.findIndex(r => r.reagent_id === targetFilm.reagent_id);
                    if (rIdx !== -1) {
                      updatedReagents[rIdx] = {
                        ...updatedReagents[rIdx],
                        quantity: (updatedReagents[rIdx].quantity || 0) + (item.quantity || 1)
                      };
                      reagentsChanged = true;
                    }
                  }
                } else {
                  const rIdx = updatedReagents.findIndex(r => r.linked_test === testObj.test_name);
                  if (rIdx !== -1) {
                    updatedReagents[rIdx] = {
                      ...updatedReagents[rIdx],
                      quantity: (updatedReagents[rIdx].quantity || 0) + (item.quantity || 1)
                    };
                    reagentsChanged = true;
                  }
                }
              }
            });
          }

          const newInvoices = safeInvoices.map(inv => inv.invoice_id === selectedInvoiceId ? { ...inv, status: 'Cancelled' } : inv);
          
          if (performBlockingSync) {
            const syncPayload: any = { labInvoices: newInvoices };
            if (reagentsChanged) syncPayload.reagents = updatedReagents;
            const success = await performBlockingSync(syncPayload);
            if (success) {
              setInvoices(newInvoices);
              if (reagentsChanged && setReagents) setReagents(updatedReagents);
              resetForm();
              setSuccessMessage('ইনভয়েস বাতিল হয়েছে এবং ফিল্ম স্টক ব্যাক হয়েছে!');
            } else {
              alert("ক্যান্সেল অপারেশন সম্পূর্ণ করা যায়নি। আবার চেষ্টা করুন।");
            }
          } else {
            setInvoices(newInvoices);
            if (reagentsChanged && setReagents) setReagents(updatedReagents);
            resetForm();
            setSuccessMessage('ইনভয়েস বাতিল হয়েছে এবং ফিল্ম স্টক ব্যাক হয়েছে!');
          }
        }
      });
    }
  };

  const handleRowClick = (invoice: LabInvoice) => {
    setFormData(invoice);
    setSelectedInvoiceId(invoice.invoice_id);
    setIsEditing(false);
    setErrors({});
  };

  const handleReturnInvoice = () => {
    if (!selectedInvoiceId) return alert("Please select an invoice.");
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const invoiceToReturn = safeInvoices.find(inv => inv && inv.invoice_id === selectedInvoiceId);
    if (invoiceToReturn && invoiceToReturn.status !== 'Returned') {
      setConfirmModal({
        isOpen: true,
        title: 'Confirm Return',
        message: `আপনি কি এই ইনভয়েসের (${invoiceToReturn.invoice_id}) টাকা রিফান্ড বা রিটার্ন করতে চান? এটি আজকের হিসাব থেকে মাইনাস হবে।`,
        onConfirm: () => {
          setInvoices(prevInvoices => prevInvoices.map(inv => inv.invoice_id === selectedInvoiceId ? { ...inv, status: 'Returned', return_date: todayDateString } : inv));
          resetForm();
          setSuccessMessage('Invoice marked as Returned/Refunded.');
        }
      });
    }
  };

  const handlePrintInvoice = (idToPrint?: string) => {
    const targetId = typeof idToPrint === "string" ? idToPrint : selectedInvoiceId;
    if (!targetId) return;
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const safePatients = Array.isArray(patients) ? patients : [];
    const safeDoctors = Array.isArray(doctors) ? doctors : [];
    const inv = safeInvoices.find(i => i && i.invoice_id === targetId);
    if (!inv) return;
    const patient = safePatients.find(p => p && p.pt_id === inv.patient_id);
    const doctor = safeDoctors.find(d => d && d.doctor_id === inv.doctor_id);

    const itemsHtml = (Array.isArray(inv.items) ? inv.items : []).map((item, idx) => `
      <tr>
        <td style="border: 1px solid #000; padding: 4px; text-align: left;">${idx + 1}. ${item.test_name}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: right;">${(item.price || 0).toFixed(2)}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.quantity || 1}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    const getSlipHtml = (copyType: string, isLast: boolean) => `
        <div class="slip-column" style="width: 148.5mm; height: 210mm; padding: 12mm 15mm; box-sizing: border-box; display: flex; flex-direction: column; ${!isLast ? 'border-right: 1.5px dashed #666;' : ''} overflow: hidden; position: relative;">
            <div class="header" style="text-align: center; margin-bottom: 8px;">
                <h1 style="margin:0; font-size: 22px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1;">Niramoy Clinic & Diagnostic</h1>
                <p style="margin:2px 0; font-size: 11px; font-weight: bold;">Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
                <p style="margin:0; font-size: 9px; font-weight: bold; color: #555;">Govt. License: HSM41671</p>
                <div class="copy-label" style="display: inline-block; border: 1.5px solid #000; padding: 2px 10px; margin-top: 5px; font-size: 10px; font-weight: 900; text-transform: uppercase;">${copyType}</div>
            </div>

            <table style="width:100%; border-collapse: collapse; margin-bottom: 5px; margin-top: 8px; font-size: 11px; border: 1px solid #000;">
                <tr>
                    <td style="border: 1px solid #000; padding: 4px; width: 40%;"><b>Invoice ID:</b> ${inv.invoice_id}</td>
                    <td style="border: 1px solid #000; padding: 4px; width: 35%;"><b>Date:</b> ${inv.invoice_date}</td>
                    <td rowspan="2" style="border: 1px solid #000; padding: 4px; width: 25%; text-align: center; vertical-align: middle; background: #fff;">
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <img 
                                src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(inv.patient_id)}&scale=1&height=8&incltext=false" 
                                alt="BC" 
                                style="height: 35px; width: auto; max-width: 100%;"
                            />
                            <div style="font-size: 8px; font-family: monospace; margin-top: 2px; font-weight: bold;">${inv.patient_id}</div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 4px;"><b>Patient Name:</b> ${patient?.pt_name || 'N/A'}</td>
                    <td style="border: 1px solid #000; padding: 4px;"><b>Age/Sex:</b> ${patient?.ageY}Y / ${patient?.gender}</td>
                </tr>
                <tr>
                    <td colspan="3" style="border: 1px solid #000; padding: 4px;"><b>Consultant:</b> ${doctor?.doctor_name || 'Self/Walk-in'} ${doctor?.degree ? `(${doctor.degree})` : ''}</td>
                </tr>
                <tr>
                    <td colspan="3" style="border: 1px solid #000; padding: 4px;"><b>Address:</b> ${patient?.address || 'N/A'} | <b>Mob:</b> ${patient?.mobile || 'N/A'}</td>
                </tr>
            </table>

            <div style="height: 15px;"></div>
            
            <div style="text-align: center; font-weight: 900; font-size: 14px; text-decoration: underline; margin-bottom: 5px; font-family: 'Arial', sans-serif;">Test Invoice</div>

            <div class="table-container" style="display: block; overflow: hidden; position: relative;">
                <table style="width:100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                        <tr style="background:#f3f3f3;">
                            <th style="border: 1px solid #000; padding: 4px; text-align: left;">Test Name</th>
                            <th style="border: 1px solid #000; padding: 4px; text-align: right;">Price</th>
                            <th style="border: 1px solid #000; padding: 4px; text-align: center;">Qty</th>
                            <th style="border: 1px solid #000; padding: 4px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="footer-summary" style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px;">
                    <div class="payment-stamp" style="padding-left: 10px; padding-top: 10px;">
                        ${inv.due_amount > 0 ? 
                            '<div style="font-size: 32px; font-weight: 900; color: #dc2626; border: 4px solid #dc2626; padding: 4px 16px; transform: rotate(-15deg); display: inline-block; opacity: 0.8; letter-spacing: 2px;">DUE</div>' : 
                            '<div style="font-size: 32px; font-weight: 900; color: #16a34a; border: 4px solid #16a34a; padding: 4px 16px; transform: rotate(-15deg); display: inline-block; opacity: 0.8; letter-spacing: 2px;">PAID</div>'
                        }
                    </div>
                    <div class="totals" style="width: 160px; font-size: 11px;">
                        <div style="display: flex; justify-content: space-between; line-height: 1.1;"><span>Total:</span> <span>${inv.total_amount.toFixed(2)}</span></div>
                        <div style="display: flex; justify-content: space-between; line-height: 1.1;"><span>Discount:</span> <span>${inv.discount_amount.toFixed(2)}</span></div>
                        <div style="display: flex; justify-content: space-between; line-height: 1.2; font-weight: 900; border-top: 1.2px solid #000; padding-top: 2px; margin-top: 2px;"><span>Net Payable:</span> <span>${inv.net_payable.toFixed(2)}</span></div>
                        <div style="display: flex; justify-content: space-between; line-height: 1.1;"><span>Paid:</span> <span>${inv.paid_amount.toFixed(2)}</span></div>
                        <div style="display: flex; justify-content: space-between; line-height: 1.1;"><span>Due:</span> <span style="font-weight:900; color: #d00;">${inv.due_amount.toFixed(2)}</span></div>
                        ${inv.status === 'Returned' ? '<div style="color: #d00; text-align: center; border: 1.5px solid #d00; margin-top: 5px; font-weight: 900; padding: 2px;">RETURNED / REFUNDED</div>' : ''}
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 11px; border-top: 1px solid #eee; padding-top: 5px;">
                    <b>Expected Report Delivery:</b> ${inv.expected_delivery_time || 'As per schedule'}
                </div>
            </div>

            <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 10px;">
                <div class="signature" style="width: 100px; border-top: 1.2px solid #000; text-align: center; font-size: 10px; font-weight: bold; padding-top: 3px;">Authorized Sign</div>
                <div style="text-align:center; font-size: 8px; color: #666;">System Printed at ${formatDateTime(new Date())}</div>
            </div>
        </div>
    `;

    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page { size: A4 landscape; margin: 0; }
                * { box-sizing: border-box; }
                html, body { 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    width: 297mm; 
                    height: 210mm;
                    overflow: hidden !important; 
                    background: white; 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .page-container { 
                    width: 297mm; 
                    height: 210mm; 
                    display: flex; 
                    flex-direction: row; 
                    margin: 0; 
                    padding: 0;
                }
            </style>
        </head>
        <body>
            <div class="page-container">${getSlipHtml('Patient Copy', false)}${getSlipHtml('Office Copy', true)}</div>
        </body>
        </html>
    `;

    // Use iframe for embedded printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (win) {
        win.document.open();
        win.document.write(printContent);
        win.document.close();
        win.focus();
        setTimeout(() => {
            win.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    }
  };

  const dailyReport = useMemo(() => {
    const safeInvs = Array.isArray(invoices) ? invoices : [];
    const repParts = getNormalizedDateParts(reportDate);
    const collections = safeInvs.filter(inv => {
      if (!inv || inv.status === 'Cancelled' || inv.status === 'Deleted' || (inv as any).isDeleted || (inv as any).is_deleted) return false;
      const invParts = getNormalizedDateParts(inv.invoice_date);
      return invParts.isoDate === repParts.isoDate || inv.invoice_date === reportDate;
    });
    const refunds = safeInvs.filter(inv => {
      if (!inv || inv.status !== 'Returned' || (inv as any).isDeleted || (inv as any).is_deleted) return false;
      const retParts = getNormalizedDateParts(inv.return_date);
      return retParts.isoDate === repParts.isoDate || inv.return_date === reportDate;
    });
    
    const summary = collections.reduce((acc, inv) => {
      const tot = Number(inv.total_amount) || 0;
      const disc = Number(inv.discount_amount) || 0;
      const net = Number(inv.net_payable) || Math.max(0, tot - disc);
      const paid = Number(inv.paid_amount) || 0;
      const due = Number(inv.due_amount) || Math.max(0, net - paid);
      acc.totalBill += tot;
      acc.totalDiscount += disc;
      acc.netPayable += net;
      acc.paidAmount += paid;
      acc.dueAmount += due;
      return acc;
    }, { totalBill: 0, totalDiscount: 0, netPayable: 0, paidAmount: 0, dueAmount: 0 });

    const totalRefunded = refunds.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);
    summary.paidAmount -= totalRefunded; // Deduct refunds from today's cash

    return summary;
  }, [invoices, reportDate]);

  const yearlyReport = useMemo(() => {
    const safeInvs = Array.isArray(invoices) ? invoices : [];
    const currentYear = today.getFullYear();

    const collections = safeInvs.filter(inv => {
      if (!inv || !inv.invoice_date || inv.status === 'Cancelled' || inv.status === 'Deleted' || (inv as any).isDeleted || (inv as any).is_deleted) return false;
      const invParts = getNormalizedDateParts(inv.invoice_date);
      return invParts.y === currentYear;
    });

    const refunds = safeInvs.filter(inv => {
      if (!inv || !inv.return_date || inv.status !== 'Returned' || (inv as any).isDeleted || (inv as any).is_deleted) return false;
      const retParts = getNormalizedDateParts(inv.return_date);
      return retParts.y === currentYear;
    });

    const summary = collections.reduce((acc, inv) => {
      const tot = Number(inv.total_amount) || 0;
      const disc = Number(inv.discount_amount) || 0;
      const net = Number(inv.net_payable) || Math.max(0, tot - disc);
      const paid = Number(inv.paid_amount) || 0;
      const due = Number(inv.due_amount) || Math.max(0, net - paid);
      acc.totalBill += tot;
      acc.totalDiscount += disc;
      acc.netPayable += net;
      acc.paidAmount += paid;
      acc.dueAmount += due;
      return acc;
    }, { totalBill: 0, totalDiscount: 0, netPayable: 0, paidAmount: 0, dueAmount: 0 });

    const totalRefunded = refunds.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);
    summary.paidAmount -= totalRefunded;

    return summary;
  }, [invoices, today]);

  const monthlyReport = useMemo(() => {
    const safeInvs = Array.isArray(invoices) ? invoices : [];
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();

    const collections = safeInvs.filter(inv => {
      if (!inv || !inv.invoice_date || inv.status === 'Cancelled' || inv.status === 'Deleted' || (inv as any).isDeleted || (inv as any).is_deleted) return false;
      const invParts = getNormalizedDateParts(inv.invoice_date);
      return invParts.m === currentMonth && invParts.y === currentYear;
    });

    const refunds = safeInvs.filter(inv => {
      if (!inv || !inv.return_date || inv.status !== 'Returned' || (inv as any).isDeleted || (inv as any).is_deleted) return false;
      const retParts = getNormalizedDateParts(inv.return_date);
      return retParts.m === currentMonth && retParts.y === currentYear;
    });

    const summary = collections.reduce((acc, inv) => {
      const tot = Number(inv.total_amount) || 0;
      const disc = Number(inv.discount_amount) || 0;
      const net = Number(inv.net_payable) || Math.max(0, tot - disc);
      const paid = Number(inv.paid_amount) || 0;
      const due = Number(inv.due_amount) || Math.max(0, net - paid);
      acc.totalBill += tot;
      acc.totalDiscount += disc;
      acc.netPayable += net;
      acc.paidAmount += paid;
      acc.dueAmount += due;
      return acc;
    }, { totalBill: 0, totalDiscount: 0, netPayable: 0, paidAmount: 0, dueAmount: 0 });

    const totalRefunded = refunds.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);
    summary.paidAmount -= totalRefunded;

    return summary;
  }, [invoices, today]);

  const tableTotals = useMemo(() => {
    if (!Array.isArray(filteredInvoices)) return { total: 0, discount: 0, paid: 0, due: 0, usgFee: 0, pc: 0, income: 0 };
    return filteredInvoices.reduce((acc, inv) => {
      if (inv.status === 'Cancelled' || inv.status === 'Deleted' || (inv as any).isDeleted || (inv as any).is_deleted) return acc;
      acc.total += (Number(inv.total_amount) || 0);
      acc.discount += (Number(inv.discount_amount) || 0);
      acc.paid += (Number(inv.paid_amount) || 0);
      acc.due += (Number(inv.due_amount) || 0);
      
      const items = Array.isArray(inv.items) ? inv.items : [];
      const usgFee = items.reduce((s, it) => s + ((Number(it?.usg_exam_charge) || 0) * (Number(it?.quantity) || 1)), 0);
      const labFee = items.reduce((s, it) => s + ((Number(it?.extra_lab_fee) || 0) * (Number(it?.quantity) || 1)), 0);
      const commPaid = Number(inv.commission_paid ?? (inv as any).commissionPaid) || 0;
      
      acc.usgFee += usgFee;
      acc.pc += commPaid;

      if (inv.status !== 'Returned') {
        const paidAmt = Number(inv.paid_amount) || 0;
        const netIncome = Math.max(0, paidAmt - usgFee - labFee - commPaid);
        acc.income += netIncome;
      }
      return acc;
    }, { total: 0, discount: 0, paid: 0, due: 0, usgFee: 0, pc: 0, income: 0 });
  }, [filteredInvoices]);

  const resetTableFilters = () => {
    setTableFilterDate('');
    setTableFilterMonth('');
    setTableFilterYear('');
    setTableFilterDoctorId('');
    setTableFilterReferrarId('');
    setTableFilterPatientName('');
    setTableFilterDueOnly(false);
  };

  return (
    <>
    <div className="bg-slate-800 rounded-xl shadow-md p-4 sm:p-6 text-slate-300">
        {/* IMPROVED SUCCESS MESSAGE UI */}
        {successMessage && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
                <div className="bg-emerald-600 border-2 border-white text-white px-10 py-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in-up flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 text-2xl font-black shadow-lg">✓</div>
                    <span className="text-xl font-black uppercase tracking-widest">{successMessage}</span>
                    <button onClick={() => setSuccessMessage('')} className="pointer-events-auto mt-2 text-emerald-200 text-xs underline font-bold">dismiss</button>
                </div>
            </div>
        )}

        {pendingFilmSelections && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex justify-center items-center" aria-modal="true" role="dialog">
                <div className="bg-slate-800 border-2 border-slate-700 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[1001] w-full max-w-lg animate-zoom-in">
                    <h3 className="text-2xl font-black text-white mb-6">Select X-Ray Film</h3>
                    <p className="text-slate-300 text-sm mb-6">Please select which film size to deduct for the following X-Ray tests:</p>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {pendingFilmSelections.map((sel, idx) => (
                            <div key={sel.test_id} className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                                <div className="text-emerald-400 font-bold mb-2">{sel.test_name}</div>
                                <select 
                                    value={sel.film_reagent_id || ''}
                                    onChange={e => {
                                        const newSels = [...pendingFilmSelections];
                                        newSels[idx].film_reagent_id = e.target.value;
                                        setPendingFilmSelections(newSels);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500"
                                >
                                    {(Array.isArray(reagents) ? reagents : []).filter(r => r && (r.linked_category === 'X-Ray' || (r.reagent_name || '').toLowerCase().includes('film') || (r.reagent_name || '').toLowerCase().includes('x-ray'))).map(r => (
                                        <option key={r.reagent_id} value={r.reagent_id}>{r.reagent_name}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-8">
                        <button onClick={() => setPendingFilmSelections(null)} className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors">Cancel</button>
                        <button onClick={() => {
                            setPendingFilmSelections(null);
                            setConfirmModal({
                                isOpen: true,
                                title: 'Confirm Save',
                                message: 'আপনি কি এই ল্যাব ইনভয়েসটি সেভ করতে চান?',
                                onConfirm: () => executeSave()
                            });
                        }} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/50">Continue to Save</button>
                    </div>
                </div>
            </div>
        )}

        {confirmModal.isOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex justify-center items-center" aria-modal="true" role="dialog">
                <div className="bg-slate-800 border-2 border-slate-700 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[1001] w-full max-w-md animate-zoom-in">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-700 shadow-inner">
                            <DnaIcon className="w-8 h-8 text-blue-500 animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 uppercase tracking-tighter">
                            {confirmModal.title}
                        </h3>
                        <p className="text-slate-400 font-bold leading-relaxed">
                            {confirmModal.message}
                        </p>
                        <div className="mt-4 flex w-full gap-3">
                            <button 
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                                className="flex-1 px-6 py-3.5 text-sm font-black text-slate-300 bg-slate-900 rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 uppercase tracking-widest active:scale-95"
                            >
                                No
                            </button>
                            <button 
                                onClick={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }} 
                                className="flex-1 px-6 py-3.5 text-sm font-black text-white bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl hover:from-blue-500 hover:to-indigo-600 transition-all shadow-[0_10px_20px_rgba(37,99,235,0.3)] uppercase tracking-widest active:scale-95"
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        <div className="hidden md:block border-b border-slate-700 pb-2 mb-4">
            <div className="flex flex-row items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label htmlFor="invoice_id" className="font-bold text-slate-400 whitespace-nowrap text-[10px] uppercase tracking-tighter">Invoice Id:</label>
                        <input type="text" id="invoice_id" name="invoice_id" disabled value={formData.invoice_id || ''} className="w-28 border border-slate-700 rounded-md shadow-inner text-[10px] px-2 py-1 bg-slate-800 text-slate-400 font-mono" />
                    </div>
                    
                    <div className="flex items-center gap-2.5 pl-3 border-l border-slate-700/50">
                        <button type="button" onClick={handleGetNewId} disabled={readOnly} className="min-w-[100px] px-4 py-1.5 text-[10px] font-black text-white bg-blue-600 rounded-md hover:bg-blue-500 uppercase tracking-tighter shadow-md disabled:opacity-50 transition-all border border-blue-400/20 active:scale-95">Get New ID</button>
                        <button type="submit" form="invoice-form" disabled={readOnly} className="min-w-[110px] px-4 py-1.5 text-[10px] font-black text-white bg-emerald-600 rounded-md hover:bg-emerald-500 uppercase tracking-tighter shadow-md disabled:opacity-50 transition-all border border-emerald-400/20 active:scale-95">Save Invoice</button>
                        <button type="button" onClick={resetForm} disabled={readOnly} className="min-w-[90px] px-4 py-1.5 text-[10px] font-black text-slate-200 bg-slate-700 rounded-md hover:bg-slate-600 uppercase tracking-tighter shadow-md disabled:opacity-50 transition-all border border-slate-600/50 active:scale-95">Clear Form</button>
                        <button type="button" onClick={handleEditInvoice} disabled={!selectedInvoiceId || readOnly} className="min-w-[90px] px-4 py-1.5 text-[10px] font-black text-white bg-amber-500 rounded-md hover:bg-amber-400 uppercase tracking-tighter shadow-md disabled:opacity-50 transition-all border border-amber-400/20 active:scale-95">Edit Invoice</button>
                        <button type="button" onClick={handleCancelInvoice} disabled={!selectedInvoiceId || (Array.isArray(invoices) ? invoices : []).find(inv => inv && inv.invoice_id === selectedInvoiceId)?.status === 'Cancelled' || readOnly} className="min-w-[110px] px-4 py-1.5 text-[10px] font-black text-white bg-rose-600 rounded-md hover:bg-rose-700 uppercase tracking-tighter shadow-md disabled:opacity-50 transition-all border border-rose-400/20 active:scale-95">Cancel Invoice</button>
                        <button type="button" onClick={handleReturnInvoice} disabled={!selectedInvoiceId || (Array.isArray(invoices) ? invoices : []).find(inv => inv && inv.invoice_id === selectedInvoiceId)?.status === 'Returned' || readOnly} className="min-w-[110px] px-4 py-1.5 text-[10px] font-black text-white bg-pink-700 rounded-md hover:bg-pink-600 uppercase tracking-tighter shadow-md disabled:opacity-50 transition-all border border-pink-400/20 active:scale-95">Return Invoice</button>
                        <button type="button" onClick={handlePrintInvoice} disabled={!selectedInvoiceId} className="min-w-[100px] px-4 py-1.5 text-[10px] font-black text-white bg-indigo-600 rounded-md hover:bg-indigo-500 uppercase tracking-tighter shadow-md transition-all border border-indigo-400/20 active:scale-95">Print Invoice</button>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-sky-950/20 p-1 rounded-lg border border-sky-400/20">
                    <div className="bg-sky-500 p-1 rounded-md text-white shadow-[0_0_10px_rgba(14,165,233,0.3)]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>
                    </div>
                    <label htmlFor="barcode_scanner_inv" className="font-black text-[9px] text-sky-400 uppercase tracking-widest whitespace-nowrap">Scanner Mode:</label>
                    <input
                        type="text"
                        id="barcode_scanner_inv"
                        placeholder="Scan..."
                        value={barcodeInput || ''}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={handleBarcodeScan}
                        className="w-32 py-1 px-2 border border-sky-500/30 bg-slate-950 text-white rounded text-[10px] font-mono focus:ring-1 focus:ring-sky-400 focus:outline-none placeholder:text-slate-700"
                        autoComplete="off"
                    />
                </div>
            </div>
        </div>

      {showPatientSearchModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl max-h-[95vh] rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-white/5 bg-slate-950/40 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="19" cy="11" r="2"/><path d="M19 8v1"/><path d="M19 13v1"/></svg>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Advanced Patient Search</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Search by Name, mobile, address or Upazila</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <button 
                  onClick={() => setShowNewPatientForm(true)}
                  className="flex items-center gap-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-900/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New Patient
                </button>
                <button 
                  onClick={() => {
                    setShowPatientSearchModal(false);
                    setPatientSearchFilters({ name: '', mobile: '', address: '', thana: '', age: '' });
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-xl transition-all duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Modal Content - SEARCH FILTERS */}
            <div className="px-8 py-5 bg-slate-950/20 grid grid-cols-1 md:grid-cols-5 gap-6 border-b border-white/5 shrink-0">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Search Name</label>
                <div className="relative group">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input 
                    type="text" 
                    placeholder="Khushi..."
                    value={patientSearchFilters.name || ''}
                    onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Age</label>
                <input 
                  type="text" 
                  placeholder="Age..."
                  value={patientSearchFilters.age || ''}
                  onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, age: e.target.value }))}
                  className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mobile Number</label>
                <input 
                  type="text" 
                  placeholder="017..."
                  value={patientSearchFilters.mobile || ''}
                  onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, mobile: e.target.value }))}
                  className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Address / Village</label>
                <input 
                  type="text" 
                  placeholder="Address..."
                  value={patientSearchFilters.address || ''}
                  onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upazila / Thana</label>
                <input 
                  type="text" 
                  placeholder="Thana..."
                  value={patientSearchFilters.thana || ''}
                  onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, thana: e.target.value }))}
                  className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            {/* List Header */}
            <div className="bg-slate-950 px-10 py-3 border-b border-white/5 grid grid-cols-12 gap-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0">
              <div className="col-span-1">ID</div>
              <div className="col-span-3">Patient Name</div>
              <div className="col-span-2">Age/Sex</div>
              <div className="col-span-2">Mobile</div>
              <div className="col-span-2">Address / Thana</div>
              <div className="col-span-2 text-right">Selection</div>
            </div>

            {/* Scrolling List */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar bg-slate-900/20">
              {filteredPatients.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {filteredPatients.map(p => (
                    <div 
                      key={p.pt_id}
                      onClick={() => handlePatientSelect(p.pt_id, p.pt_name)}
                      onDoubleClick={() => handlePatientSelect(p.pt_id, p.pt_name)}
                      className="px-6 py-4 bg-slate-800/20 hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/50 rounded-2xl grid grid-cols-12 gap-5 items-center cursor-pointer transition-all group active:scale-[0.99]"
                    >
                      <div className="col-span-1 font-mono text-xs text-slate-600">{p.pt_id}</div>
                      <div className="col-span-3">
                        <p className="text-base font-black text-slate-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{p.pt_name}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="px-2 py-1 bg-slate-800 rounded-md text-[10px] font-black text-slate-400 uppercase">{p.ageY}Y | {p.gender}</span>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm font-mono text-white/80">{p.mobile || '---'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-white/60 truncate leading-tight">{p.address}{p.thana ? `\n${p.thana}` : ''}</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <button className="px-5 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Select</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-700">
                   <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 opacity-30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="17" y2="14"/><line x1="14" y1="11" x2="20" y2="11"/></svg>
                   </div>
                  <p className="text-2xl font-black uppercase tracking-tighter opacity-50 mb-2">Patient Not Found</p>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-30 max-w-xs text-center leading-relaxed">The searched record does not exist in our database. You can add a new one.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-10 py-5 bg-slate-950/60 border-t border-white/5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Records: {patients.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filter Results: {filteredPatients.length}</span>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                 <button 
                    onClick={() => {
                      setShowPatientSearchModal(false);
                      setPatientSearchFilters({ name: '', mobile: '', address: '', thana: '', age: '' });
                    }}
                    className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                    Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewPatientForm && (
        <div className="fixed inset-0 z-[90000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 border-2 border-emerald-500/30 w-full max-w-5xl rounded-[3rem] shadow-[0_0_150px_rgba(16,185,129,0.3)] overflow-hidden flex flex-col max-h-[95vh]">
             <div className="p-8 border-b border-white/5 bg-slate-950/40 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-950/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Register New Patient</h2>
                    <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest leading-none mt-1">Add comprehensive details for medical records</p>
                  </div>
                </div>
                <button onClick={() => setShowNewPatientForm(false)} className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-red-600 text-white rounded-xl transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-4">
                <PatientInfoPage 
                    patients={patients} 
                    setPatients={setPatients} 
                    isEmbedded={true} 
                    onClose={() => setShowNewPatientForm(false)} 
                    onSaveAndSelect={(id, name) => {
                        handlePatientSelect(id, name);
                        setShowNewPatientForm(false);
                    }}
                    performBlockingSync={performBlockingSync}
                />
             </div>
          </div>
        </div>
      )}

      {showNewDoctorForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-slate-600 bg-slate-900 relative">
                <button onClick={() => setShowNewDoctorForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10">&times;</button>
                <div className="p-2"><DoctorInfoPage doctors={doctors} setDoctors={setDoctors} isEmbedded onClose={() => setShowNewDoctorForm(false)} onSaveAndSelect={handleDoctorSelect} performBlockingSync={performBlockingSync} /></div>
            </div>
        </div>
      )}

      {showNewReferrarForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-slate-600 bg-slate-900 relative">
                <button onClick={() => setShowNewReferrarForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10">&times;</button>
                <div className="p-2"><ReferrerInfoPage referrars={referrars} setReferrars={setReferrars} isEmbedded onClose={() => setShowNewReferrarForm(false)} onSaveAndSelect={handleReferrarSelect} performBlockingSync={performBlockingSync} /></div>
            </div>
        </div>
      )}

      {showNewTestForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowNewTestForm(false)}>
            <div className="w-full max-w-5xl max-h-[95vh] overflow-hidden rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-slate-700 bg-slate-900 relative flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Visual Header for Modal */}
                <div className="flex justify-between items-center px-10 py-6 border-b border-white/5 bg-slate-950/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                           <DnaIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Master Test Configuration</h2>
                            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">Add or Modify Diagnostic Tests System-wide</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowNewTestForm(false)} 
                        className="w-14 h-14 flex items-center justify-center rounded-2xl bg-red-950/30 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white transition-all duration-300 shadow-lg group"
                        title="Close Dialog"
                    >
                        <span className="text-3xl font-light transform transition-transform group-hover:rotate-90">&times;</span>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                    <TestInfoPage 
                        reagents={reagents} 
                        tests={tests} 
                        setTests={setTests} 
                        isEmbedded 
                        onClose={() => setShowNewTestForm(false)} 
                        onSaveAndSelect={handleTestSelect} 
                        performBlockingSync={performBlockingSync}
                    />
                </div>
            </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE UNIFIED SINGLE LAB INVOICE INTERFACE (Single Screen, Compact) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-2.5 pb-16">
        
        {/* Sticky Live Status Header (ID + Net + Due + Quick Actions) */}
        <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border border-cyan-800/70 rounded-xl p-2 shadow-xl flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase">আইডি:</span>
              <span className="text-xs font-mono font-black text-cyan-300 truncate">
                {formData.invoice_id ? `#${formData.invoice_id}` : 'নতুন'}
              </span>
              {selectedInvoiceId && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/30">
                  {isEditing ? 'এডিটিং' : 'লোড করা'}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-300 font-medium">
              নেট: <span className="text-cyan-300 font-bold font-mono">৳{(totals.netPayable || 0).toFixed(0)}</span> • 
              বকেয়া: <span className={`font-bold font-mono ${(totals.dueAmount || 0) > 0.005 ? 'text-rose-400' : 'text-emerald-400'}`}>৳{(totals.dueAmount || 0).toFixed(0)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleGetNewId}
              disabled={readOnly}
              className="px-2 py-1 bg-blue-700/80 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold border border-blue-400/30 active:scale-95 cursor-pointer"
              title="নতুন আইডি নিন"
            >
              + আইডি
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={readOnly}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700 active:scale-95 cursor-pointer"
              title="ক্লিয়ার"
            >
              🔄 ক্লিয়ার
            </button>
            <button
              type="button"
              onClick={() => handleSaveInvoice()}
              disabled={readOnly}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1 shadow-md shadow-emerald-950 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              💾 সেভ
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION 1: PATIENT & DOCTOR INFO (Compact) */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">👤</span>
              <h3 className="font-bold text-white text-xs">রোগী ও ডাক্তারের তথ্য</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              আজকের বিল: <span className="text-cyan-300 font-bold">{todayInvoiceCount}</span>
            </span>
          </div>

          {/* Date & Delivery Time in 2 cols */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-300 block mb-0.5">ইনভয়েস তারিখ</label>
              <input 
                type="date" 
                name="invoice_date" 
                value={formData.invoice_date || ''} 
                onChange={handleInputChange} 
                required 
                className="w-full bg-slate-950 border border-slate-700 rounded-lg h-8.5 px-2 text-xs text-white font-mono outline-none focus:border-cyan-400" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-300 block mb-0.5">ডেলিভারি সময়</label>
              <input 
                type="text" 
                name="expected_delivery_time" 
                value={formData.expected_delivery_time || ''} 
                onChange={handleInputChange} 
                placeholder="উদা: 5 PM"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg h-8.5 px-2 text-xs text-white outline-none focus:border-cyan-400" 
              />
            </div>
          </div>

          {/* Patient Search */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-300">রোগী নির্বাচন</label>
              <button
                type="button"
                onClick={() => setShowNewPatientForm(true)}
                className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300"
              >
                + নতুন রোগী
              </button>
            </div>
            <SearchableSelect
              theme="dark"
              label=""
              options={(Array.isArray(patients) ? patients : []).map(p => ({ 
                id: p.pt_id, 
                name: p.pt_name, 
                details: `ID: ${p.pt_id} | ${p.gender}, ${p.ageY}Y | ${p.mobile}` 
              }))}
              value={formData.patient_id || ''}
              onChange={handlePatientSelect}
              onAddNew={() => openAdvancedPatientSearch('')}
              onEnter={(term) => openAdvancedPatientSearch(term)}
              placeholder="রোগীর নাম বা মোবাইল দিয়ে সার্চ..."
              required
              inputHeightClass="h-8.5"
            />
            {formData.patient_id && (
              <div className="bg-sky-950/60 p-1.5 rounded-lg border border-sky-800/40 text-[10px] text-sky-200 flex items-center justify-between">
                <span className="font-bold truncate">
                  {(Array.isArray(patients) ? patients : []).find(p => p && p.pt_id === formData.patient_id)?.pt_name}
                </span>
                <span className="opacity-75 font-mono shrink-0 ml-1">
                  {(Array.isArray(patients) ? patients : []).find(p => p && p.pt_id === formData.patient_id)?.mobile || ''}
                </span>
              </div>
            )}
          </div>

          {/* Doctor and Referrer in 2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-300">ডাক্তার</label>
                <button
                  type="button"
                  onClick={() => setShowNewDoctorForm(true)}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300"
                >
                  + নতুন
                </button>
              </div>
              <SearchableSelect
                theme="dark"
                label=""
                options={(Array.isArray(doctors) ? doctors : []).map(d => ({ 
                  id: d.doctor_id, 
                  name: d.doctor_name, 
                  details: `${d.degree}${d.speciality ? ` - ${d.speciality}` : ''}` 
                }))}
                value={formData.doctor_id || ''}
                onChange={handleDoctorSelect}
                onAddNew={() => setShowNewDoctorForm(true)}
                placeholder="ডাক্তার সার্চ করুন..."
                inputHeightClass="h-8.5"
                required
              />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-300">রেফারার</label>
                <button
                  type="button"
                  onClick={() => setShowNewReferrarForm(true)}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300"
                >
                  + নতুন
                </button>
              </div>
              <SearchableSelect
                theme="dark"
                label=""
                options={(Array.isArray(referrars) ? referrars : []).map(r => ({ 
                  id: r.ref_id, 
                  name: r.ref_name, 
                  details: `${r.ref_degrees || ''}${r.area ? ` | ${r.area}` : ''}` 
                }))}
                value={formData.referrar_id || ''}
                onChange={handleReferrarSelect}
                onAddNew={() => setShowNewReferrarForm(true)}
                placeholder="রেফারার সার্চ করুন..."
                inputHeightClass="h-8.5"
                required
              />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION 2: TEST SELECTION & ITEMS LIST (Compact) */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🔬</span>
              <h3 className="font-bold text-white text-xs">টেস্টসমূহ ({formData.items?.length || 0}টি)</h3>
            </div>
            <div className="flex items-center gap-1">
              <input 
                type="checkbox" 
                id="mobile_apply_pc" 
                checked={applyPC} 
                onChange={(e) => handleApplyPCChange(e.target.checked)} 
                className="h-3.5 w-3.5 text-blue-600 rounded bg-slate-700 cursor-pointer" 
              />
              <label htmlFor="mobile_apply_pc" className="text-[10px] font-bold text-sky-300 cursor-pointer">Apply PC</label>
            </div>
          </div>

          {/* Category Horizontal Scrolling Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
            {allAvailableTestCategories.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedTestCategory(category)}
                className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTestCategory === category
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Test Search Input */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-300">টেস্ট সার্চ করে অ্যাড করুন</label>
              <button
                type="button"
                onClick={() => setShowNewTestForm(true)}
                className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300"
              >
                + নতুন টেস্ট
              </button>
            </div>
            <SearchableSelect
              theme="dark"
              label=""
              options={(Array.isArray(filteredTestsForSelect) ? filteredTestsForSelect : []).map(t => ({ 
                id: String(t.test_id || ''), 
                name: String(t.test_name || t.test_id || ''), 
                details: `${t.category || 'General'} • ৳${(Number(t.price) || 0).toFixed(0)} • PC: ৳${(Number(t.test_commission) || 0).toFixed(0)}` 
              }))}
              value=""
              onChange={handleTestSelect}
              onAddNew={() => setShowNewTestForm(true)}
              placeholder="টেস্ট নাম সার্চ করুন..."
              inputHeightClass="h-8.5"
            />
          </div>

          {/* Selected Items List */}
          {(!formData.items || formData.items.length === 0) ? (
            <div className="text-center py-4 bg-slate-950/60 rounded-lg border border-dashed border-slate-800 p-2">
              <p className="text-[11px] text-slate-400">কোনো টেস্ট যোগ করা হয়নি। উপরের সার্চবার থেকে টেস্ট যোগ করুন।</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {(Array.isArray(formData.items) ? formData.items : []).map((item, idx) => (
                <div key={item.test_id} className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 shadow-sm flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                      <span className="font-bold text-white text-xs truncate">{item.test_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>রেট: ৳{(item.price || 0).toFixed(0)}</span>
                      {applyPC && <span className="text-emerald-400 font-bold">• PC: ৳{(item.test_commission || 0).toFixed(0)}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Stepper */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleItemQuantityChange(item.test_id, (item.quantity || 1) - 1)}
                        className="w-6 h-6 rounded bg-slate-800 text-sky-400 font-bold text-xs flex items-center justify-center border border-slate-700 active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-xs text-white">
                        {item.quantity || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleItemQuantityChange(item.test_id, (item.quantity || 1) + 1)}
                        className="w-6 h-6 rounded bg-slate-800 text-sky-400 font-bold text-xs flex items-center justify-center border border-slate-700 active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-mono font-bold text-xs text-cyan-300 w-12 text-right">
                      ৳{((item.price || 0) * (item.quantity || 1)).toFixed(0)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.test_id)}
                      className="w-6 h-6 rounded bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 text-xs font-bold border border-rose-800/40 flex items-center justify-center cursor-pointer"
                      title="বাদ দিন"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION 3: VOUCHER, BILL & PAYMENT (Compact) */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">💰</span>
              <h3 className="font-bold text-white text-xs">ভাউচার ও পেমেন্ট হিসাব</h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {/* Gross Bill */}
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">মোট গ্রস বিল:</span>
              <span className="font-mono font-bold text-sm text-white">৳{(totals.totalAmount || 0).toFixed(2)}</span>
            </div>

            {/* Discount Inputs in 2 cols */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">ডিসকাউন্ট (%)</label>
                <input 
                  type="text" 
                  value={displayDiscountPercentage} 
                  onChange={handleDiscountPercentageChange} 
                  onBlur={handleDiscountPercentageBlur} 
                  onFocus={handleFocusSelect} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg h-8 px-2 text-right font-mono font-bold text-white text-xs outline-none focus:border-cyan-400" 
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">ডিসকাউন্ট (টাকা)</label>
                <input 
                  type="text" 
                  value={displayDiscountAmount} 
                  onChange={handleDiscountAmountChange} 
                  onBlur={handleDiscountAmountBlur} 
                  onFocus={handleFocusSelect} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg h-8 px-2 text-right font-mono font-bold text-white text-xs outline-none focus:border-cyan-400" 
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Net Payable */}
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
              <span className="font-bold text-white">সর্বমোট প্রদেয় (Net):</span>
              <span className="text-cyan-300 text-sm font-black font-mono">৳{(totals.netPayable || 0).toFixed(2)}</span>
            </div>

            {/* Paid & Due in 2 cols */}
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800 items-end">
              <div>
                <label className="text-[10px] font-bold text-emerald-400 block mb-0.5">জমা টাকা (Paid)</label>
                <input 
                  type="text" 
                  value={displayPaidAmount} 
                  onChange={handlePaidAmountChange} 
                  onFocus={handlePaidAmountInputFocus} 
                  onBlur={handlePaidAmountInputBlur} 
                  className="w-full bg-slate-950 border-2 border-emerald-500/60 rounded-lg h-8.5 px-2 text-right font-mono font-black text-emerald-300 text-sm outline-none focus:border-emerald-400" 
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-0.5">বকেয়া (Due)</label>
                <div className={`h-8.5 px-2 flex items-center justify-end font-mono font-black text-sm rounded-lg border ${
                  totals.dueAmount > 0.005 
                    ? 'bg-rose-950/70 text-rose-300 border-rose-800/60' 
                    : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                }`}>
                  ৳{(totals.dueAmount || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Bill Created By & Payment Method */}
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-400 block">বিল প্রস্তুতকারী</label>
                <SearchableSelect 
                  theme="dark" 
                  label="" 
                  options={employeeOptions} 
                  value={formData.bill_created_by || ''} 
                  onChange={(id, name) => handleEmployeeSelect('bill_created_by', id, name)} 
                  onAddNew={() => onNavigateSubPage && onNavigateSubPage('employee_info' as DiagnosticSubPage)} 
                  placeholder="কর্মচারী..." 
                  required
                  allowCustom={true}
                  inputHeightClass="h-8.5" 
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-400 block">পেমেন্ট মেথড</label>
                <select 
                  name="payment_method" 
                  value={formData.payment_method} 
                  onChange={handleInputChange} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg h-8.5 px-2 text-xs text-white outline-none"
                >
                  <option value="Cash">Cash (ক্যাশ)</option>
                  <option value="Card">Card</option>
                  <option value="Mobile Banking">Mobile Banking</option>
                </select>
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">নোট (ঐচ্ছিক)</label>
              <input 
                type="text" 
                name="notes" 
                value={formData.notes || ''} 
                onChange={handleInputChange} 
                placeholder="যেকোনো মন্তব্য..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg h-8 px-2 text-xs text-white outline-none"
              />
            </div>

            {/* Commission breakdown if Apply PC is checked */}
            {applyPC && (
              <div className="mt-1 pt-1.5 border-t border-slate-800 text-[10px] text-slate-300 space-y-1 bg-slate-950/60 p-2 rounded-lg">
                <div className="flex justify-between">
                  <span>মোট কমিশন:</span>
                  <span className="font-mono">৳{(totals.tComm100 || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sky-400">
                  <span>প্রদেয় কমিশন:</span>
                  <span className="font-mono">৳{(totals.payableComm || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* STICKY FLOATING QUICK ACTION BAR (Right Above Bottom Nav) */}
        {/* ------------------------------------------------------------- */}
        <div className="sticky bottom-14 z-30 bg-slate-950/95 backdrop-blur-md border border-cyan-800/80 rounded-xl p-2 shadow-2xl flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => handleSaveInvoice()}
            disabled={readOnly}
            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <span>💾 সেভ করুন</span>
          </button>

          <button
            type="button"
            onClick={handlePrintInvoice}
            disabled={!selectedInvoiceId}
            className="py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 shadow-md disabled:opacity-40 active:scale-95 cursor-pointer"
          >
            <span>🖨️ প্রিন্ট</span>
          </button>

          <button
            type="button"
            onClick={handleGetNewId}
            disabled={readOnly}
            className="py-2.5 px-2 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg text-[11px] flex items-center justify-center active:scale-95 cursor-pointer"
            title="নতুন আইডি"
          >
            <span>+ আইডি</span>
          </button>

          <button
            type="button"
            onClick={resetForm}
            disabled={readOnly}
            className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[11px] flex items-center justify-center active:scale-95 cursor-pointer"
            title="ক্লিয়ার"
          >
            <span>🔄 ক্লিয়ার</span>
          </button>

          {selectedInvoiceId && (
            <button
              type="button"
              onClick={handleEditInvoice}
              disabled={readOnly}
              className="py-2.5 px-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[11px] flex items-center justify-center active:scale-95 cursor-pointer"
              title="এডিট মোড"
            >
              <span>✏️ এডিট</span>
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION 4: RECENT INVOICES SEARCH & HISTORY (Collapsible) */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-sm">
          <button
            type="button"
            onClick={() => setShowMobileHistory(!showMobileHistory)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">📋</span>
              <h4 className="font-bold text-white text-xs">সাম্প্রতিক ইনভয়েস তালিকা</h4>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                ({(Array.isArray(filteredInvoices) ? filteredInvoices : []).length}টি)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-bold">
              {showMobileHistory ? '▲ লুকান' : '▼ দেখুন'}
            </span>
          </button>

          {showMobileHistory && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              {/* Filter Controls */}
              <div className="grid grid-cols-2 gap-1.5">
                <input 
                  type="text" 
                  placeholder="রোগীর নাম..." 
                  value={tableFilterPatientName} 
                  onChange={(e) => setTableFilterPatientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white placeholder-slate-500 outline-none"
                />
                <input 
                  type="date" 
                  value={tableFilterDate} 
                  onChange={(e) => setTableFilterDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTableFilterDueOnly(!tableFilterDueOnly)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                    tableFilterDueOnly 
                      ? 'bg-rose-950 border-rose-500 text-rose-300' 
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {tableFilterDueOnly ? '✓ শুধু বকেয়া' : 'বকেয়া ফিল্টার'}
                </button>
                {(tableFilterPatientName || tableFilterDate || tableFilterDueOnly) && (
                  <button
                    type="button"
                    onClick={resetTableFilters}
                    className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold"
                  >
                    রিসেট
                  </button>
                )}
              </div>

              {/* Invoices List Cards */}
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {(Array.isArray(filteredInvoices) ? filteredInvoices : []).slice(0, 30).map((inv) => (
                  <div
                    key={inv.invoice_id}
                    onClick={() => {
                      setFormData(inv);
                      setSelectedInvoiceId(inv.invoice_id);
                      setIsEditing(false);
                      // Scroll to top to see invoice immediately
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      selectedInvoiceId === inv.invoice_id
                        ? 'bg-cyan-950/80 border-cyan-500 shadow-md'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono font-bold text-xs text-cyan-300">#{inv.invoice_id}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{inv.invoice_date || (inv as any).date}</span>
                    </div>
                    <div className="font-bold text-white text-xs truncate">{inv.patient_name}</div>
                    <div className="flex items-center justify-between text-[10px] mt-1">
                      <span className="text-slate-300 font-mono">মোট: ৳{Number(inv.total_amount || 0).toFixed(0)}</span>
                      <span className="text-emerald-400 font-mono">জমা: ৳{Number(inv.paid_amount || 0).toFixed(0)}</span>
                      <span className={`font-mono font-bold px-1 rounded ${
                        Number(inv.due_amount || 0) > 0.005 ? 'bg-rose-950/80 text-rose-300' : 'bg-emerald-950/80 text-emerald-300'
                      }`}>
                        {Number(inv.due_amount || 0) > 0.005 ? `বকেয়া: ৳${Number(inv.due_amount || 0).toFixed(0)}` : 'পরিশোধিত'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW (Visible on screens >= 768px, 100% Preserved Desktop Layout) */}
      {/* ========================================================================= */}
      <div className="hidden md:block">
    <div className="bg-sky-950 text-sky-200 p-6 rounded-xl mb-8 border border-sky-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-sky-800 pb-4">
        <h2 className="text-2xl font-bold text-sky-100">Lab Invoice</h2>
        <div className="flex flex-wrap gap-3">
            <div className="bg-sky-900/50 px-3 py-1.5 rounded-lg border border-sky-700 flex items-center gap-2">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Today Invoices:</span>
                <span className="text-sm font-black text-white">{todayInvoiceCount}</span>
            </div>
            <div className="bg-indigo-900/50 px-3 py-1.5 rounded-lg border border-indigo-700 flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Monthly Invoices:</span>
                <span className="text-sm font-black text-white">{monthlyInvoiceCount}</span>
            </div>
      </div>
    </div>
      <form id="invoice-form" onSubmit={handleSaveInvoice}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-4 gap-y-5 items-start">
          <div className="lg:col-span-1">
            <label htmlFor="invoice_date" className={commonLabelClasses}>Date</label>
            <input type="date" id="invoice_date" name="invoice_date" value={formData.invoice_date || ''} onChange={handleInputChange} required className={`${commonInputClasses} h-10 px-1 text-[10px] ${errors.invoice_date ? 'border-red-500 ring-2 ring-red-500' : ''}`} />
          </div>
          <div className={`lg:col-span-4 rounded-md ${errors.patient_id ? 'ring-2 ring-red-500' : ''}`}>
             <SearchableSelect
                theme="dark"
                label="Patient"
                options={(Array.isArray(patients) ? patients : []).map(p => ({ id: p.pt_id, name: p.pt_name, details: `ID: ${p.pt_id} | ${p.gender}, ${p.ageY}Y | ${p.address} | ${p.mobile}` }))}
                value={formData.patient_id || ''}
                onChange={handlePatientSelect}
                onAddNew={() => openAdvancedPatientSearch('')}
                onEnter={(term) => openAdvancedPatientSearch(term)}
                placeholder="Search or add new patient"
                required
                inputHeightClass="h-10"
                />
              {formData.patient_id && (
                <p className="mt-1 text-[10px] text-sky-400 font-bold truncate leading-tight">
                  {(Array.isArray(patients) ? patients : []).find(p => p && p.pt_id === formData.patient_id)?.pt_name}, 
                  <span className="ml-1 opacity-70 font-medium">
                    {(Array.isArray(patients) ? patients : []).find(p => p && p.pt_id === formData.patient_id)?.gender} ({(Array.isArray(patients) ? patients : []).find(p => p && p.pt_id === formData.patient_id)?.ageY}Y), 
                    Loc: {(Array.isArray(patients) ? patients : []).find(p => p && p.pt_id === formData.patient_id)?.address}
                  </span>
                </p>
              )}
          </div>
          <div className={`lg:col-span-3 rounded-md ${errors.doctor_id ? 'ring-2 ring-red-500' : ''}`}>
            <SearchableSelect
              theme="dark"
              label="Consulting Doctor"
              options={(Array.isArray(doctors) ? doctors : []).map(d => ({ id: d.doctor_id, name: d.doctor_name, details: `${d.degree}${d.speciality ? ` - ${d.speciality}` : ''}` }))}
              value={formData.doctor_id || ''}
              onChange={handleDoctorSelect}
              onAddNew={() => setShowNewDoctorForm(true)}
              placeholder="Search or add new doctor"
              inputHeightClass="h-10"
              required
            />
            {formData.doctor_id && (
              <p className="mt-1 text-[10px] text-sky-500 font-bold truncate leading-tight">
                {(Array.isArray(doctors) ? doctors : []).find(d => d && d.doctor_id === formData.doctor_id)?.doctor_name}
                <span className="ml-1 opacity-70 font-medium">({(Array.isArray(doctors) ? doctors : []).find(d => d && d.doctor_id === formData.doctor_id)?.degree})</span>
              </p>
            )}
          </div>
          <div className={`lg:col-span-3 rounded-md ${errors.referrar_id ? 'ring-2 ring-red-500' : ''}`}>
            <SearchableSelect
              theme="dark"
              label="Referrar"
              options={(Array.isArray(referrars) ? referrars : []).map(r => ({ id: r.ref_id, name: r.ref_name, details: `${r.ref_degrees}${r.area ? ` | ${r.area}` : ''}${r.address ? ` | ${r.address}` : ''}` }))}
              value={formData.referrar_id || ''}
              onChange={handleReferrarSelect}
              onAddNew={() => setShowNewReferrarForm(true)}
              placeholder="Search or add new referrar"
              inputHeightClass="h-10"
              required
            />
            {formData.referrar_id && (
              <p className="mt-1 text-[10px] text-sky-500 font-bold truncate leading-tight">
                {(Array.isArray(referrars) ? referrars : []).find(r => r && r.ref_id === formData.referrar_id)?.ref_name}
                <span className="ml-1 opacity-70 font-medium">({(Array.isArray(referrars) ? referrars : []).find(r => r && r.ref_id === formData.referrar_id)?.ref_degrees})</span>
              </p>
            )}
          </div>
          <div className="lg:col-span-1">
            <label htmlFor="expected_delivery_time" className={commonLabelClasses}>Deliv.</label>
            <input type="text" id="expected_delivery_time" name="expected_delivery_time" value={formData.expected_delivery_time || ''} onChange={handleInputChange} className={`${commonInputClasses} h-10 px-1 text-xs`} placeholder="5 PM" />
          </div>
        </div>

        <div className="mt-5 border-t border-sky-800 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-y-2 mb-2">
                <h3 className="text-base font-semibold text-sky-200">Add Test Items</h3>
                <div className="flex flex-wrap gap-2">
                    {allAvailableTestCategories.map(category => (
                        <button key={category} type="button" onClick={() => setSelectedTestCategory(category)} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${selectedTestCategory === category ? 'bg-blue-600 text-white shadow' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{category}</button>
                    ))}
                </div>
            </div>
             <div className="bg-slate-100 p-2 rounded-xl border border-gray-300 shadow-inner">
                <SearchableSelect
                  theme="light" label=""
                  options={(Array.isArray(filteredTestsForSelect) ? filteredTestsForSelect : []).map(t => ({ 
                    id: String(t.test_id || ''), 
                    name: String(t.test_name || t.test_id || ''), 
                    details: `${t.category || 'General'} • প্রাইস: ৳${(Number(t.price) || 0).toFixed(2)} • PC: ৳${(Number(t.test_commission) || 0).toFixed(2)} ${!getTestAvailability(t, reagents) ? '(স্টক অপ্রতুল)' : ''}` 
                  }))}
                  value="" 
                  onChange={handleTestSelect}
                  onAddNew={() => setShowNewTestForm(true)}
                  placeholder="টেস্ট সার্চ করুন (নাম বা কোড)..."
                  inputHeightClass="h-10"
                />
            </div>
        </div>

        <div className={`bg-slate-900/40 p-4 rounded-xl mt-6 border ${errors.items ? 'border-red-500 ring-2 ring-red-500' : 'border-sky-900/50'}`}>
          <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-sky-200">Invoice Items</h3>
              <div className="flex items-center">
                <input type="checkbox" id="apply_pc" name="apply_pc" checked={applyPC} onChange={(e) => handleApplyPCChange(e.target.checked)} className="h-4 w-4 text-blue-600 border-slate-500 rounded focus:ring-blue-500 bg-slate-700" />
                <label htmlFor="apply_pc" className="ml-2 text-sm font-medium text-sky-300">Apply PC (পিসি কমিশন কার্যকর)</label>
              </div>
          </div>
          {(!formData.items || formData.items.length === 0) ? (
            <div className="text-center py-8 bg-slate-800 rounded-lg border border-slate-700"><p className="text-slate-500">No tests added yet.</p></div>
          ) : (
            <div className="overflow-x-auto border border-slate-700 rounded-lg bg-sky-950">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase">SL</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase">Test Name</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase">Service price</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase">Commission / PC</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase">Quantity</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase">Subtotal (BDT)</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900 divide-y divide-slate-700">
                  {(Array.isArray(formData.items) ? formData.items : []).map((item, idx) => (
                    <tr key={item.test_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200 font-medium">{item.test_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 text-right">{(item.price || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={`font-mono font-bold ${applyPC ? 'text-emerald-400' : 'text-slate-400'}`}>
                          ৳{(item.test_commission || 0).toFixed(2)}
                        </span>
                        {!applyPC && Number(item.test_commission || 0) > 0 && (
                          <span className="block text-[10px] text-amber-500/90 font-medium">Apply PC বন্ধ</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleItemQuantityChange(item.test_id, (item.quantity || 1) - 1)}
                            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-black text-base flex items-center justify-center transition-colors border border-slate-700 active:scale-95"
                            title="পরিমাণ কমান"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={(e) => handleItemQuantityChange(item.test_id, parseInt(e.target.value) || 1)}
                            className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center text-sm font-bold text-amber-400 focus:outline-none focus:border-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleItemQuantityChange(item.test_id, (item.quantity || 1) + 1)}
                            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-black text-base flex items-center justify-center transition-colors border border-slate-700 active:scale-95"
                            title="পরিমাণ বাড়ান"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200 font-medium text-right">{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium"><button type="button" onClick={() => handleRemoveItem(item.test_id)} className="text-red-400 hover:text-red-300 transition-colors">Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mt-6 border-t border-sky-800 pt-6">
          <div className="space-y-4">
             <div><label htmlFor="notes" className={commonLabelClasses}>Notes (Optional)</label><textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleInputChange} className={commonInputClasses}></textarea></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div className={`rounded-md ${errors.bill_created_by ? 'ring-2 ring-red-500' : ''}`}>
                  <SearchableSelect 
                    theme="dark" 
                    label="Bill Created By" 
                    options={employeeOptions} 
                    value={formData.bill_created_by || ''} 
                    onChange={(id, name) => handleEmployeeSelect('bill_created_by', id, name)} 
                    onAddNew={() => onNavigateSubPage('employee_info' as DiagnosticSubPage)} 
                    placeholder="Search Employee / Admin" 
                    required
                    allowCustom={true}
                    inputHeightClass="h-10" 
                  />
                </div>
                <div className={`rounded-md ${errors.bill_paid_by ? 'ring-2 ring-red-500' : ''}`}>
                  <SearchableSelect 
                    theme="dark" 
                    label="Bill Paid By" 
                    options={employeeOptions} 
                    value={formData.bill_paid_by || ''} 
                    onChange={(id, name) => handleEmployeeSelect('bill_paid_by', id, name)} 
                    onAddNew={() => onNavigateSubPage('employee_info' as DiagnosticSubPage)} 
                    placeholder="Search Employee / Admin" 
                    required
                    allowCustom={true}
                    inputHeightClass="h-10" 
                  />
                </div>
              </div>
             <div><label htmlFor="payment_method" className={commonLabelClasses}>Payment Method</label><select id="payment_method" name="payment_method" value={formData.payment_method} onChange={handleInputChange} className={commonInputClasses}><option value="Cash">Cash</option><option value="Card">Card</option><option value="Mobile Banking">Mobile Banking</option></select></div>
          </div>
          <div className="space-y-2 bg-slate-800 p-4 rounded-lg border border-slate-700 text-slate-300">
            <div className="flex justify-between items-center text-md font-medium"><span>Total Amount:</span><span>{(totals.totalAmount || 0).toFixed(2)} BDT</span></div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-2"><label htmlFor="discount_percentage" className="text-sm font-medium">Discount (%):</label><input type="text" id="discount_percentage" name="discount_percentage" value={displayDiscountPercentage} onChange={handleDiscountPercentageChange} onBlur={handleDiscountPercentageBlur} onFocus={handleFocusSelect} className={totalsInputClasses} /></div>
                <div className="flex items-center gap-2 justify-end flex-grow"><label htmlFor="discount_amount" className="text-sm font-medium">Discount Amount:</label><input type="text" id="discount_amount" name="discount_amount" value={displayDiscountAmount} onChange={handleDiscountAmountChange} onBlur={handleDiscountAmountBlur} onFocus={handleFocusSelect} className={totalsInputClasses} /></div>
            </div>
            <div className="flex justify-between items-center text-xl font-bold text-slate-100 mt-2 pt-2 border-t border-slate-600"><span>Net Payable:</span><span className="text-blue-400">{(totals.netPayable || 0).toFixed(2)} BDT</span></div>
             <div className="flex justify-between items-center mt-4"><label htmlFor="paid_amount" className="text-sm font-medium">Paid Amount (BDT):</label><input type="text" id="paid_amount" name="paid_amount" value={displayPaidAmount} onChange={handlePaidAmountChange} onFocus={handlePaidAmountInputFocus} onBlur={handlePaidAmountInputBlur} className={totalsInputClasses} /></div>
            <div className="flex justify-between items-center text-lg font-semibold mt-1"><span>Due Amount:</span><span className={`${totals.dueAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>{(totals.dueAmount || 0).toFixed(2)} BDT</span></div>
            {applyPC && (
                <div className="mt-4 pt-4 border-t border-slate-600 space-y-2">
                    <div className="flex justify-between items-center text-sm"><span>Commission (If 100% paid):</span><input type="text" readOnly value={(totals.tComm100 || 0).toFixed(2)} className={`${totalsInputClasses} !bg-slate-800 border-0`} /></div>
                    <div className="flex justify-between items-center text-sm"><span>Commission (After Discount):</span><input type="text" readOnly value={(totals.commAfterDisc || 0).toFixed(2)} className={`${totalsInputClasses} !bg-slate-800 border-0`} /></div>
                    <div className="flex justify-between items-center text-sm"><label htmlFor="special_commission" className="font-medium">special commission:</label><input type="number" id="special_commission" name="special_commission" value={formData.special_commission} onChange={handleInputChange} onFocus={handleFocusSelect} className={totalsInputClasses} placeholder="Enter amount" /></div>
                    <div className="flex justify-between items-center text-sm"><span>Payable Commission:</span><input type="text" id="payable_commission" readOnly value={(totals.payableComm || 0).toFixed(2)} className={`${totalsInputClasses} !bg-slate-800 border-0 transition-colors duration-500 ${totals.payableComm < 0 ? 'text-red-400 font-bold' : ''}`} /></div>
                    <div className="flex justify-between items-center text-sm"><label htmlFor="commission_paid" className="font-medium">Commission Paid:</label><input type="number" id="commission_paid" name="commission_paid" value={formData.commission_paid} onChange={handleInputChange} onFocus={handleFocusSelect} className={totalsInputClasses} placeholder="Enter amount" /></div>
                    <div className="flex justify-between items-center text-sm"><span>Commission Due:</span><input type="text" readOnly value={(totals.commDue || 0).toFixed(2)} className={`${totalsInputClasses} !bg-slate-800 border-0 font-bold transition-colors duration-500 ${totals.commDue < 0 ? 'text-red-400' : 'text-green-400'}`} /></div>
                </div>
            )}
          </div>
        </div>
      </form>
    </div>


      <div className="mt-8 pt-6 border-t border-slate-700">
        <h3 className="text-xl font-bold text-slate-100 mb-4 text-center">Daily, Monthly & Yearly Hishab</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white text-gray-800 rounded-lg p-5 shadow-md border border-gray-200">
            <div className="flex justify-center items-center mb-3"><input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="py-1 px-2 border border-gray-300 rounded-md shadow-sm sm:text-sm bg-gray-50 text-gray-900" /></div>
            <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Total Bill:</span> <span className="font-bold">{Number(dailyReport.totalBill || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Total Discount:</span> <span className="font-bold">{Number(dailyReport.totalDiscount || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Net Payable:</span> <span className="font-bold">{Number(dailyReport.netPayable || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-green-600">Paid Amount:</span> <span className="font-bold text-green-600">{Number(dailyReport.paidAmount || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-red-600">Due Amount:</span> <span className="font-bold text-red-600">{Number(dailyReport.dueAmount || 0).toFixed(2)}</span></div>
            </div>
          </div>
          <div className="bg-white text-gray-800 rounded-lg p-5 shadow-md border border-gray-200">
            <p className="text-base font-semibold text-gray-700 mb-3 text-center">For {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Total Bill:</span> <span className="font-bold">{Number(monthlyReport.totalBill || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Total Discount:</span> <span className="font-bold">{Number(monthlyReport.totalDiscount || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Net Payable:</span> <span className="font-bold">{Number(monthlyReport.netPayable || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-green-600">Paid Amount:</span> <span className="font-bold text-green-600">{Number(monthlyReport.paidAmount || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-red-600">Due Amount:</span> <span className="font-bold text-red-600">{Number(monthlyReport.dueAmount || 0).toFixed(2)}</span></div>
            </div>
          </div>
          <div className="bg-white text-gray-800 rounded-lg p-5 shadow-md border border-gray-200">
            <p className="text-base font-semibold text-gray-700 mb-3 text-center">For {new Date().getFullYear()}</p>
            <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Total Bill:</span> <span className="font-bold">{Number(yearlyReport.totalBill || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Total Discount:</span> <span className="font-bold">{Number(yearlyReport.totalDiscount || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Net Payable:</span> <span className="font-bold">{Number(yearlyReport.netPayable || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-green-600">Paid Amount:</span> <span className="font-bold text-green-600">{Number(yearlyReport.paidAmount || 0).toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-red-600">Due Amount:</span> <span className="font-bold text-red-600">{Number(yearlyReport.dueAmount || 0).toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* All Invoices Table Section with Distinct High-Contrast Styling */}
      <div className="mt-8 p-6 rounded-2xl bg-gradient-to-b from-[#0b1329] via-[#0d1730] to-[#080d1e] border-2 border-cyan-900/50 shadow-2xl shadow-black/60">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-cyan-900/40 pb-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-950/80 rounded-xl text-cyan-400 border border-cyan-700/60 shadow-inner">
                    <FileTextIcon size={20} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                        All Invoices
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-900/80 text-cyan-300 border border-cyan-600/60 font-mono font-bold">
                          {(Array.isArray(filteredInvoices) ? filteredInvoices : []).length} Invoices
                        </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">ল্যাব ইনভয়েস হিস্ট্রি তালিকা — ক্লিক করে বিস্তারিত দেখুন বা সংশোধন করুন</p>
                </div>
            </div>
            
            {/* TABLE FILTER CONTROLS */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 bg-[#0e1a38] p-2.5 rounded-xl border border-cyan-900/60 shadow-inner no-print w-full md:w-auto">
                <div className="w-36">
                    <input 
                        type="text" 
                        placeholder="Search Patient..." 
                        value={tableFilterPatientName} 
                        onChange={(e) => setTableFilterPatientName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-semibold outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    />
                </div>
                <div className="w-36">
                    <select 
                        value={tableFilterDoctorId} 
                        onChange={(e) => setTableFilterDoctorId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    >
                        <option value="">Filter Doctor...</option>
                        {(Array.isArray(doctors) ? doctors : []).map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.doctor_name}</option>)}
                    </select>
                </div>
                <div className="w-36">
                    <select 
                        value={tableFilterReferrarId} 
                        onChange={(e) => setTableFilterReferrarId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    >
                        <option value="">Filter Referrer...</option>
                        {(Array.isArray(referrars) ? referrars : []).map(r => {
                          const refId = r.ref_id || (r as any).referrar_id || '';
                          const refName = r.ref_name || (r as any).referrar_name || '';
                          return <option key={refId} value={refId}>{refName}</option>;
                        })}
                    </select>
                </div>
                <div className="flex items-center gap-1.5">
                    <input 
                        type="date" 
                        value={tableFilterDate} 
                        onChange={(e) => { setTableFilterDate(e.target.value); setTableFilterMonth(''); setTableFilterYear(''); }}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                        title="Filter by Specific Date"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <select 
                        value={tableFilterMonth} 
                        onChange={(e) => { setTableFilterMonth(e.target.value); setTableFilterDate(''); }}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    >
                        <option value="">Month...</option>
                        {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-1.5">
                    <select 
                        value={tableFilterYear} 
                        onChange={(e) => { setTableFilterYear(e.target.value); setTableFilterDate(''); }}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    >
                        <option value="">Year...</option>
                        {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <button 
                  onClick={() => setTableFilterDueOnly(!tableFilterDueOnly)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${tableFilterDueOnly ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.5)]' : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-rose-500 hover:text-rose-400'}`}
                >
                    <div className={`w-2 h-2 rounded-full ${tableFilterDueOnly ? 'bg-white animate-pulse' : 'bg-rose-500'}`}></div>
                    Dues Invoices
                </button>
                <button 
                    onClick={resetTableFilters}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500 rounded-lg flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all"
                    title="Clear All Table Filters"
                >
                    <TrashIcon size={12} />
                    Clear
                </button>
            </div>
        </div>

        {/* Eye-Protective Table Canvas */}
        <div className="overflow-x-auto rounded-xl border border-cyan-900/60 shadow-xl bg-[#080e1e]">
          <table className="min-w-full divide-y divide-slate-700/70 font-sans">
            <thead>
              {/* COLUMN-WISE TOTALS SUMMARY ROW */}
              <tr className="bg-[#050a16] border-b-2 border-cyan-900/80 text-xs no-print">
                <th colSpan={6} className="px-3 py-2.5 text-right text-[11px] font-black text-cyan-300 uppercase tracking-widest">
                    Summary Totals:
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-mono font-black text-slate-100 bg-[#0a1329] border-l border-slate-800">
                    {Number(tableTotals.total || 0).toFixed(2)}
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-mono font-black text-amber-300 bg-amber-950/30 border-l border-slate-800">
                    {Number(tableTotals.discount || 0).toFixed(2)}
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-mono font-black text-emerald-400 bg-emerald-950/30 border-l border-slate-800">
                    {Number(tableTotals.paid || 0).toFixed(2)}
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-mono font-black text-rose-400 bg-rose-900/30 border-l border-slate-800">
                    {Number(tableTotals.due || 0).toFixed(2)}
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-mono font-black text-sky-300 bg-sky-950/40 border-l border-slate-800">
                    {Number(tableTotals.usgFee || 0).toFixed(2)}
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-mono font-black text-purple-300 bg-purple-950/40 border-l border-slate-800">
                    {Number(tableTotals.pc || 0).toFixed(2)}
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-mono font-black text-cyan-300 bg-cyan-950/50 border-l border-slate-800">
                    {Number(tableTotals.income || 0).toFixed(2)}
                </th>
                <th colSpan={3} className="px-3 py-2.5 text-left text-xs font-black text-cyan-300 border-l border-slate-800 bg-[#0a1329]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1.5">Net Realized Income:</span>
                    <span className="font-mono text-emerald-400 font-bold">{Number(tableTotals.income || 0).toFixed(2)}</span>
                </th>
              </tr>
              {/* MAIN COLUMN HEADERS */}
              <tr className="bg-[#0d1935] border-b border-cyan-900 text-slate-200">
                <th scope="col" className="px-2.5 py-3 text-center text-[11px] font-black text-cyan-400 uppercase tracking-wider w-10">SL</th>
                <th scope="col" className="px-3 py-3 text-left text-[11px] font-black text-cyan-400 uppercase tracking-wider">Invoice ID</th>
                <th scope="col" className="px-3 py-3 text-left text-[11px] font-black text-cyan-400 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-3 py-3 text-left text-[11px] font-black text-cyan-400 uppercase tracking-wider">Patient Name</th>
                <th scope="col" className="px-3 py-3 text-left text-[11px] font-black text-cyan-400 uppercase tracking-wider">Doctor</th>
                <th scope="col" className="px-3 py-3 text-left text-[11px] font-black text-cyan-400 uppercase tracking-wider">Referrar</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-black text-cyan-400 uppercase tracking-wider">Total</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-black text-amber-400 uppercase tracking-wider">Discount</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-black text-emerald-400 uppercase tracking-wider">Paid</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-black text-rose-400 uppercase tracking-wider">Due</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-black text-sky-300 uppercase tracking-wider">Usg_Fee</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-black text-purple-300 uppercase tracking-wider">PC</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-black text-cyan-300 uppercase tracking-wider bg-cyan-950/40">Net_Income</th>
                <th scope="col" className="px-3 py-3 text-center text-[11px] font-black text-cyan-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Last Modified</th>
                <th scope="col" className="px-3 py-3 text-center text-[11px] font-black text-rose-400 uppercase tracking-wider w-16">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-950/60">
              {(Array.isArray(filteredInvoices) ? filteredInvoices : []).map((invoice, index) => {
                const isSelected = selectedInvoiceId === invoice.invoice_id;
                const isEven = index % 2 === 0;
                
                const invItems = Array.isArray(invoice.items) ? invoice.items : [];
                const invUsgFee = invItems.reduce((s, it) => s + ((Number(it?.usg_exam_charge) || 0) * (Number(it?.quantity) || 1)), 0);
                const invLabFee = invItems.reduce((s, it) => s + ((Number(it?.extra_lab_fee) || 0) * (Number(it?.quantity) || 1)), 0);
                const invCommPaid = Number(invoice.commission_paid ?? (invoice as any).commissionPaid) || 0;
                const invDiscount = Number(invoice.discount_amount) || 0;
                const invPaidAmt = Number(invoice.paid_amount) || 0;
                const rowNetIncome = (invoice.status === 'Cancelled' || invoice.status === 'Returned') ? 0 : Math.max(0, invPaidAmt - invUsgFee - invLabFee - invCommPaid);

                return (
                  <tr 
                    key={invoice.invoice_id} 
                    onClick={() => handleRowClick(invoice)} 
                    className={`
                      cursor-pointer transition-all duration-150 ease-in-out select-none
                      ${isSelected 
                        ? 'bg-cyan-950/90 border-l-4 border-l-cyan-400 shadow-md text-white' 
                        : isEven 
                          ? 'bg-[#0a1224] text-slate-200 hover:bg-[#132247] hover:text-white' 
                          : 'bg-[#0e172e] text-slate-200 hover:bg-[#132247] hover:text-white'
                      }
                      hover:shadow-md hover:translate-x-0.5
                    `} 
                    aria-selected={isSelected} 
                    tabIndex={0} 
                    onKeyDown={(e) => e.key === 'Enter' && handleRowClick(invoice)}
                  >
                    <td className="px-2.5 py-2.5 whitespace-nowrap text-xs text-slate-400 font-mono font-bold text-center">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-mono font-black text-xs text-sky-400 bg-sky-950/90 px-2 py-0.5 rounded border border-sky-800/60 shadow-sm inline-block">
                        #{invoice.invoice_id}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-300 font-medium">
                      {invoice.invoice_date || (invoice as any).date || (invoice as any).invoiceDate || '-'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-black text-xs text-slate-100 uppercase tracking-tight">
                          {invoice.patient_name}
                        </span>
                        <span className="text-[10px] text-slate-400 normal-case font-medium">
                          {(() => {
                            const p = patients.find(pt => pt.pt_id === invoice.patient_id);
                            return p ? `${p.gender || ''} ${p.ageY ? `${p.ageY}Y` : ''} ${p.address ? `| ${p.address}` : ''}` : 'N/A';
                          })()}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-sky-200 font-medium">
                      {invoice.doctor_name || 'Self/Walk-in'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-400 italic">
                      {invoice.referrar_name || '-'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-100 text-right font-mono font-bold">
                      {Number(invoice.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-right font-mono font-bold text-amber-300">
                      {invDiscount.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-right font-mono font-black text-emerald-400">
                      {Number(invoice.paid_amount || 0).toFixed(2)}
                    </td>
                    <td className={`px-3 py-2.5 whitespace-nowrap text-xs text-right font-mono font-black ${Number(invoice.due_amount) > 0.01 ? 'text-rose-400' : 'text-slate-500'}`}>
                      {Number(invoice.due_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-right font-mono font-bold text-sky-300">
                      {invUsgFee.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-right font-mono font-bold text-purple-300">
                      {invCommPaid.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-right font-mono font-black text-cyan-300 bg-cyan-950/30">
                      {rowNetIncome.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-center">
                      <span className={`
                        px-2.5 py-0.5 inline-flex text-[10px] leading-4 font-black uppercase rounded-full border shadow-sm
                        ${invoice.status === 'Paid' 
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' 
                          : invoice.status === 'Due' 
                            ? 'bg-rose-950/80 text-rose-300 border-rose-700/60' 
                            : invoice.status === 'Returned' 
                              ? 'bg-blue-950/80 text-blue-300 border-blue-700/60' 
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                        }
                      `}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[10px] text-slate-400 font-mono">
                      {invoice.last_modified}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvoiceToDelete(invoice);
                        }}
                        className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all shadow border border-rose-500/30 cursor-pointer inline-flex items-center justify-center"
                        title="ইনভয়েসটি মুছে ফেলুন (Delete Invoice)"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                    <td colSpan={16} className="px-6 py-16 text-center text-slate-500 italic uppercase font-black tracking-widest opacity-40 text-sm">
                        কোন ইনভয়েস রেকর্ড পাওয়া যায়নি (No Invoices Found)
                    </td>
                </tr>
              )}
            </tbody>
            {filteredInvoices.length > 0 && (
              <tfoot className="bg-slate-950 border-t-2 border-slate-700">
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-right text-xs font-black text-slate-300 uppercase tracking-wider">
                    Total Summary:
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-100 text-right font-mono font-black border-l border-slate-800">
                    {Number(tableTotals.total || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-amber-300 text-right font-mono font-black border-l border-slate-800">
                    {Number(tableTotals.discount || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-emerald-400 text-right font-mono font-black border-l border-slate-800">
                    {Number(tableTotals.paid || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-rose-400 text-right font-mono font-black border-l border-slate-800">
                    {Number(tableTotals.due || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-sky-300 text-right font-mono font-black border-l border-slate-800">
                    {Number(tableTotals.usgFee || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-purple-300 text-right font-mono font-black border-l border-slate-800">
                    {Number(tableTotals.pc || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-cyan-300 text-right font-mono font-black border-l border-slate-800 bg-cyan-950/40">
                    {Number(tableTotals.income || 0).toFixed(2)}
                  </td>
                  <td colSpan={3} className="px-3 py-3 border-l border-slate-800"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      </div>
    </div>
    {loading && (
        <div className="fixed inset-0 z-[10002] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center text-white">
            <div className="relative mb-8">
                <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-10 h-10 text-blue-500 animate-pulse" />
                </div>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-[0.2em] mb-2 font-['Hind_Siliguri']">ডাটা সেভ হচ্ছে...</h2>
            <p className="text-blue-400 font-bold uppercase tracking-widest text-xs animate-pulse">Save operation in progress</p>
        </div>
    )}

    {/* In-App Confirmation Modal: Delete Lab Invoice */}
    {invoiceToDelete && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in pointer-events-auto">
        <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-3xl">
            ⚠️
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight font-['Hind_Siliguri']">
              ইনভয়েস মুছে ফেলার নিশ্চয়তা
            </h3>
            <p className="text-xs text-slate-300 font-bold mt-1">
              আপনি কি নিশ্চিত যে এই ল্যাব ইনভয়েসটি স্থায়ীভাবে ডাটাবেজ ও অনলাইন থেকে মুছে ফেলতে চান?
            </p>
          </div>
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>ইনভয়েস আইডি:</span>
              <span className="text-sky-400 font-bold">#{invoiceToDelete.invoice_id}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>তারিখ:</span>
              <span className="text-white font-bold">{invoiceToDelete.invoice_date || (invoiceToDelete as any).date}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>রোগীর নাম:</span>
              <span className="text-white font-bold">{invoiceToDelete.patient_name}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>মোট বিল:</span>
              <span className="text-white font-bold">৳{Number(invoiceToDelete.total_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>পরিশোধিত:</span>
              <span className="text-emerald-400 font-bold">৳{Number(invoiceToDelete.paid_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>বকেয়া:</span>
              <span className="text-rose-400 font-bold">৳{Number(invoiceToDelete.due_amount || 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={isDeletingInvoice}
              onClick={() => setInvoiceToDelete(null)}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
            >
              বাতিল করুন
            </button>
            <button
              type="button"
              disabled={isDeletingInvoice}
              onClick={handleConfirmDeleteInvoice}
              className="py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-rose-900/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDeletingInvoice ? 'মুছে ফেলা হচ্ছে...' : '🗑️ হ্যাঁ, মুছে ফেলুন'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* Full-Screen Blocking Loading Overlay During Delete Operation */}
    {isDeletingInvoice && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[1000003] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none cursor-wait pointer-events-auto">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-rose-500 text-3xl font-black">
            🗑️
          </div>
        </div>
        <h3 className="text-2xl font-black text-white mb-3 font-['Hind_Siliguri'] tracking-wide">
          অনলাইনে ইনভয়েস মুছে ফেলা হচ্ছে...
        </h3>
        <p className="text-slate-300 font-medium text-sm max-w-md">
          ক্লাউড ডাটাবেজ আপডেট সম্পন্ন না হওয়া পর্যন্ত অন্য কোনো কাজ করা যাবে না। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।
        </p>
      </div>,
      document.body
    )}

    {/* Success Notification Modal */}
    {deleteSuccessMsg && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[1000002] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in pointer-events-auto">
        <div className="bg-slate-900 border-2 border-emerald-500 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <h3 className="text-xl font-black text-white font-['Hind_Siliguri']">ইনভয়েস মুছে ফেলা সফল হয়েছে</h3>
          <p className="text-sm font-bold text-emerald-300">
            {deleteSuccessMsg}
          </p>
          <button
            type="button"
            onClick={() => setDeleteSuccessMsg(null)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            ঠিক আছে (OK)
          </button>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

export default LabInvoicingPage;
