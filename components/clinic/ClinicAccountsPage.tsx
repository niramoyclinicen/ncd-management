
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExpenseItem, Employee, DueCollection, IndoorInvoice } from '../DiagnosticData';
import { ClinicIcon, Activity, BackIcon, FileTextIcon, PrinterIcon, SearchIcon, AlertCircle, EditIcon } from '../Icons';
import { dbService, normalizeDate } from '../../dbService';

// --- Clinic Specific Categories ---
const clinicExpenseCategories = [
    'Stuff salary', 'Generator', 'Motorcycle', 'Marketing', 'Clinic development', 
    'House rent', 'Stationery', 'Food/Refreshment', 
    'Doctor donation', 'Instruments/Repair', 'Electric bill', 'Electrical & Electronics', 'Press', 'License/Official', 
    'Bank/NGO Installment', 'Mobile', 'Interest/Loan', 'Others', 'Old Loan Repay'
];

const expenseCategoryBanglaMap: Record<string, string> = {
    'Stuff salary': 'স্টাফ স্যালারী', 'Generator': 'জেনারেটর', 'Motorcycle': 'মোটর সাইকেল',
    'Marketing': 'মার্কেটিং', 'Clinic development': 'ক্লিনিক উন্নয়ন',
    'House rent': 'বাড়ী ভাড়া',
    'Stationery': 'স্টেশনারী', 'Food/Refreshment': 'আপ্যায়ন/খাবার', 'Doctor donation': 'ডাক্তার ডোনেশন',
    'Instruments/Repair': 'ইন্সট্রুমেন্ট বাই / রিপায়ার', 'Electric bill': 'বিদ্যুৎ বিল', 'Electrical & Electronics': 'ইলেকট্রিক্যাল এন্ড ইলেকট্রনিক্স', 'Press': 'প্রেস/ছাপা খরচ', 'License/Official': 'লাইসেন্স/অফিসিয়াল',
    'Bank/NGO Installment': 'ব্যাংক/এনজিও কিস্তি', 'Mobile': 'মোবাইল খরচ', 'Interest/Loan': 'কিস্তি/সুদ',
    'Others': 'অন্যান্য', 'Old Loan Repay': 'পূর্বের ঋণ পরিশোধ'
};

const expenseSubCategoryMap: Record<string, string[]> = {
    'Stuff salary': [], // Populated from employees
    'House rent': ['Main Building', 'Annex Building', 'Staff Quarter'],
    'Marketing': ['Social Media', 'Newspaper', 'Local Campaign', 'Doctor Referral'],
    'Generator': ['Fuel', 'Maintenance', 'Repair'],
    'Motorcycle': ['Fuel', 'Maintenance', 'Repair'],
    'Clinic development': ['Construction', 'Interior', 'Equipment'],
    'Stationery': ['Office', 'Medical', 'Printing'],
    'Food/Refreshment': ['Staff Food', 'Guest Refreshment', 'Patient Food'],
    'Doctor donation': ['Regular', 'Special Event'],
    'Instruments/Repair': ['Medical Equipment', 'Electrical', 'Plumbing'],
    'Electric bill': ['Current Month Bill', 'Arrears'],
    'Electrical & Electronics': ['Bulb', 'Fan', 'Switch', 'AC', 'Wiring'],
    'Press': ['Leaflet', 'Poster', 'Banner'],
    'License/Official': ['Trade License', 'Health License', 'Tax'],
    'Bank/NGO Installment': ['Bank Loan', 'NGO Loan'],
    'Mobile': ['Bill', 'Recharge'],
    'Interest/Loan': ['Bank Interest', 'Private Loan Interest'],
    'Old Loan Repay': ['Bank', 'Private'],
    'Others': ['Misc']
};

const monthOptions = [
    { value: 0, name: 'January' }, { value: 1, name: 'February' }, { value: 2, name: 'March' },
    { value: 3, name: 'April' }, { value: 4, name: 'May' }, { value: 5, name: 'June' },
    { value: 6, name: 'July' }, { value: 7, name: 'August' }, { value: 8, name: 'September' },
    { value: 9, name: 'October' }, { value: 10, name: 'November' }, { value: 11, name: 'December' }
];

const HistoryModal: React.FC<{ item: ExpenseItem, onClose: () => void }> = ({ item, onClose }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <h3 className="font-black text-emerald-400 uppercase text-sm">Edit History: {item.category}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
                {(!item.editHistory || item.editHistory.length === 0) ? (
                    <p className="text-center text-slate-500 italic py-8">No edit history found.</p>
                ) : (
                    item.editHistory.map((log, i) => (
                        <div key={i} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-xs">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-bold uppercase">
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                                <span className="text-emerald-500">{log.field}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[9px] text-slate-500 uppercase">Old Value</p><p className="text-rose-400 font-bold">{String(log.oldValue)}</p></div>
                                <div><p className="text-[9px] text-slate-500 uppercase">New Value</p><p className="text-emerald-400 font-bold">{String(log.newValue)}</p></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="p-4 bg-slate-800/50 border-t border-slate-700 text-right">
                <button onClick={onClose} className="bg-slate-700 px-6 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-600">Close</button>
            </div>
        </div>
    </div>
);

const StaffSalaryHelperCard: React.FC<{
    employeeName: string;
    employees: any[];
    selectedDate: string;
    allDetailedExpenses: Record<string, any[]>;
    attendanceLog?: Record<string, any>;
    leaveLog?: Record<string, any>;
    currentInputPaid: number;
    currentExpenseId?: any;
}> = ({
    employeeName,
    employees,
    selectedDate,
    allDetailedExpenses,
    attendanceLog = {},
    leaveLog = {},
    currentInputPaid,
    currentExpenseId
}) => {
    const selectedEmp = useMemo(() => {
        if (!employeeName) return null;
        return (employees || []).find((e: any) => 
            (e.emp_name && e.emp_name.trim().toLowerCase() === employeeName.trim().toLowerCase()) ||
            (e.name && e.name.trim().toLowerCase() === employeeName.trim().toLowerCase()) ||
            (e.emp_id && String(e.emp_id).trim() === employeeName.trim())
        );
    }, [employeeName, employees]);

    const { entryYear, entryMonthIndex, monthName, daysInMonth } = useMemo(() => {
        const d = selectedDate || new Date().toISOString().split('T')[0];
        const [y, m] = d.split('-').map(Number);
        const yVal = y || new Date().getFullYear();
        const mIdx = (m !== undefined && !isNaN(m)) ? (m - 1) : new Date().getMonth();
        return {
            entryYear: yVal,
            entryMonthIndex: mIdx,
            monthName: monthOptions[mIdx]?.name || 'Current Month',
            daysInMonth: new Date(yVal, mIdx + 1, 0).getDate()
        };
    }, [selectedDate]);

    // Attendance calculation
    const absentCount = useMemo(() => {
        if (!selectedEmp) return 0;
        let count = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dStr = `${entryYear}-${String(entryMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (attendanceLog[`${dStr}_${selectedEmp.emp_id}`]?.status === 'Absent') {
                count++;
            }
        }
        return count;
    }, [daysInMonth, entryYear, entryMonthIndex, attendanceLog, selectedEmp]);

    // Leave & agreed salary
    const { agreedSalary, bonus, overtime, totalDeduction, netPayable } = useMemo(() => {
        if (!selectedEmp) {
            return { agreedSalary: 0, bonus: 0, overtime: 0, totalDeduction: 0, netPayable: 0 };
        }
        const leaveKey = `${entryMonthIndex}_${entryYear}_${selectedEmp.emp_id}`;
        const leaveRecord = leaveLog[leaveKey] || { leaveDays: 0, deductionAmount: 0, bonus: 0, overtime: 0 };
        const baseSal = leaveRecord.agreedSalary !== undefined ? leaveRecord.agreedSalary : (selectedEmp.salary || 0);
        const perDaySal = baseSal / 30;
        const totalAbsentDays = absentCount + (leaveRecord.leaveDays || 0);
        const lDeduct = totalAbsentDays * perDaySal;
        const mDeduct = leaveRecord.deductionAmount || 0;
        const totDeduct = lDeduct + mDeduct;
        const b = leaveRecord.bonus || 0;
        const ot = leaveRecord.overtime || 0;
        const net = Math.max(0, baseSal + b + ot - totDeduct);
        return {
            agreedSalary: baseSal,
            bonus: b,
            overtime: ot,
            totalDeduction: totDeduct,
            netPayable: net
        };
    }, [entryMonthIndex, entryYear, selectedEmp, leaveLog, absentCount]);

    // Payment history for this month
    const { paymentsHistory, previousPaidTotal } = useMemo(() => {
        if (!selectedEmp) {
            return { paymentsHistory: [], previousPaidTotal: 0 };
        }
        const list: Array<{ date: string; amount: number; dept?: string; description?: string; id?: any }> = [];
        let total = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dStr = `${entryYear}-${String(entryMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayExpenses = (allDetailedExpenses && allDetailedExpenses[dStr]) || [];
            dayExpenses.forEach((ex: any) => {
                if (ex.isDeleted) return;
                const isMatch = ex.category === 'Stuff salary' && (
                    (ex.subCategory && ex.subCategory.trim().toLowerCase() === selectedEmp.emp_name.trim().toLowerCase()) ||
                    (ex.description && ex.description.includes(selectedEmp.emp_name))
                );
                if (isMatch) {
                    if (currentExpenseId && String(ex.id) === String(currentExpenseId)) {
                        return;
                    }
                    const amt = Number(ex.paidAmount) || 0;
                    if (amt > 0) {
                        list.push({
                            date: dStr,
                            amount: amt,
                            dept: ex.dept || 'Clinic',
                            description: ex.description || '',
                            id: ex.id
                        });
                        total += amt;
                    }
                }
            });
        }
        return { paymentsHistory: list, previousPaidTotal: total };
    }, [daysInMonth, entryYear, entryMonthIndex, allDetailedExpenses, selectedEmp, currentExpenseId]);

    if (!selectedEmp) {
        return null;
    }

    const numInputPaid = Number(currentInputPaid) || 0;
    const dueBeforeThisEntry = netPayable - previousPaidTotal;
    const totalPaidWithCurrent = previousPaidTotal + numInputPaid;
    const remainingDueAfterCurrent = netPayable - totalPaidWithCurrent;
    const isOverpaid = totalPaidWithCurrent > netPayable;
    const overpaidAmount = isOverpaid ? (totalPaidWithCurrent - netPayable) : 0;

    return (
        <div className="rounded-2xl bg-slate-950/95 border-2 border-emerald-500/50 p-4 space-y-3.5 shadow-2xl text-left my-2">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-black text-white text-sm uppercase tracking-wide">
                        {selectedEmp.emp_name}
                    </span>
                    <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                        ID: #{selectedEmp.emp_id} {selectedEmp.machine_id ? `| HID: ${selectedEmp.machine_id}` : ''}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                        {selectedEmp.job_position || selectedEmp.designation || 'Staff'} {selectedEmp.department ? `(${selectedEmp.department})` : ''}
                    </span>
                </div>
                <div className="text-xs font-black text-emerald-300 bg-emerald-950/70 border border-emerald-600/50 px-3 py-1 rounded-xl">
                    বেতন বিবরণী: {monthName} {entryYear}
                </div>
            </div>

            {/* 3 Metric Summary Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">চলতি মাসের নিট বেতন</div>
                    <div className="text-base font-black text-indigo-300 mt-0.5">৳{Math.round(netPayable).toLocaleString()}</div>
                    <div className="text-[9.5px] text-slate-400 mt-1">
                        মূল বেতন: ৳{agreedSalary.toLocaleString()}
                        {(bonus + overtime) > 0 && ` | বোনাস/OT: +৳${(bonus + overtime).toLocaleString()}`}
                        {totalDeduction > 0 && ` | কর্তন: -৳${Math.round(totalDeduction).toLocaleString()}`}
                    </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">পূর্বে মোট পরিশোধিত</div>
                    <div className="text-base font-black text-emerald-400 mt-0.5">৳{previousPaidTotal.toLocaleString()}</div>
                    <div className="text-[9.5px] text-slate-400 mt-1">
                        {paymentsHistory.length > 0 ? `${paymentsHistory.length} টি ভাউচারে পরিশোধ করা হয়েছে` : 'এখনও কোনো পেমেন্ট নেওয়া হয়নি'}
                    </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">বর্তমান অবশিষ্ট পাওনা</div>
                    <div className={`text-base font-black mt-0.5 ${dueBeforeThisEntry > 0 ? 'text-amber-400' : dueBeforeThisEntry === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ৳{Math.round(dueBeforeThisEntry).toLocaleString()}
                    </div>
                    <div className="text-[9.5px] text-slate-400 mt-1">
                        {dueBeforeThisEntry > 0 ? 'বকেয়া পাওনা রয়েছে' : dueBeforeThisEntry === 0 ? 'সম্পূর্ণ পরিশোধিত' : 'অতিরিক্ত পরিশোধিত'}
                    </div>
                </div>
            </div>

            {/* Payment history list */}
            <div className="bg-slate-900/70 border border-slate-800/80 p-3 rounded-xl">
                <div className="text-[10px] font-black uppercase text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>চলতি মাসের পেমেন্ট ইতিহাস (Payment History):</span>
                    <span className="font-mono text-emerald-400 text-xs font-black">মোট: ৳{previousPaidTotal.toLocaleString()}</span>
                </div>
                {paymentsHistory.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-1">
                        এই মাসে এ পর্যন্ত কোনো টাকা প্রদান করা হয়নি।
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {paymentsHistory.map((p, pIdx) => (
                            <span key={pIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono shadow-sm">
                                <span className="text-amber-400 font-bold">📅 {p.date}</span>: 
                                <span className="text-emerald-400 font-black">৳{p.amount.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 font-sans">({p.dept || 'Clinic'}{p.description ? ` - ${p.description}` : ''})</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Real-time Dynamic Feedback & Red Warning Alert */}
            {isOverpaid ? (
                <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-100 p-3.5 rounded-xl text-xs font-bold flex items-start gap-3 shadow-lg animate-pulse">
                    <span className="text-2xl leading-none">⚠️</span>
                    <div className="space-y-1">
                        <div className="font-black text-rose-300 uppercase text-xs tracking-wider">
                            সতর্কবার্তা: নির্ধারিত পাওনা বেতনের চেয়ে অতিরিক্ত টাকা প্রদান করা হচ্ছে!
                        </div>
                        <div className="text-xs text-rose-100 leading-relaxed">
                            চলতি মাসে কর্মচারীর নির্ধারিত মোট পাওনা বেতন <span className="font-mono font-black text-white">৳{Math.round(netPayable).toLocaleString()}</span> টাকা। 
                            পূর্বে পরিশোধিত ৳{previousPaidTotal.toLocaleString()} + বর্তমান এন্ট্রি ৳{numInputPaid.toLocaleString()} = মোট ৳{totalPaidWithCurrent.toLocaleString()} টাকা প্রদান করা হচ্ছে। 
                            ফলস্বরূপ, কর্মচারীকে <span className="underline font-black text-white bg-rose-900/60 px-1.5 py-0.5 rounded">৳{overpaidAmount.toLocaleString()} টাকা অতিরিক্ত (Overpayment)</span> দেওয়া হচ্ছে, যা আগামী মাসের বেতন থেকে অগ্রিম (Advance) হিসেবে সমন্বয় করা হবে।
                        </div>
                    </div>
                </div>
            ) : numInputPaid > 0 ? (
                <div className="bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 p-3 rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-md">
                    <span className="flex items-center gap-2">
                        <span className="text-base text-emerald-400">✓</span> 
                        <span>এই ভাউচারে ৳{numInputPaid.toLocaleString()} টাকা পরিশোধের পর অবশিষ্ট পাওনা থাকবে:</span>
                    </span>
                    <span className="font-black text-sm text-emerald-400 font-mono bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        ৳{Math.round(remainingDueAfterCurrent).toLocaleString()}
                    </span>
                </div>
            ) : null}
        </div>
    );
};

const DailyExpenseForm: React.FC<any> = ({ 
    selectedDate, 
    onDateChange, 
    onSave, 
    onPrint, 
    employees, 
    editingItem, 
    setEditingItem,
    allDetailedExpenses = {},
    attendanceLog = {},
    leaveLog = {}
}) => {
    const [items, setItems] = useState<ExpenseItem[]>([]);
    const [historyItem, setHistoryItem] = useState<ExpenseItem | null>(null);
    const [customSubCategories, setCustomSubCategories] = useState<Record<string, string[]>>(() => {
        const saved = localStorage.getItem('clinic_custom_subcategories');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        localStorage.setItem('clinic_custom_subcategories', JSON.stringify(customSubCategories));
    }, [customSubCategories]);

    useEffect(() => {
        if (editingItem && editingItem.date === selectedDate) {
            setItems([{ ...editingItem }]);
        } else {
            setItems([{ 
                id: Date.now(), 
                category: clinicExpenseCategories[0], 
                subCategory: '', 
                description: '', 
                billAmount: 0, 
                paidAmount: 0, 
                dept: 'Clinic' 
            }]);
        }
    }, [selectedDate, editingItem]);
    
    const handleItemChange = (id: number, field: keyof ExpenseItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const oldValue = item[field];
                if (oldValue === value) return item;

                const history = item.editHistory || [];
                const newLog = {
                    timestamp: new Date().toISOString(),
                    field,
                    oldValue,
                    newValue: value
                };

                return { 
                    ...item, 
                    [field]: value, 
                    isEdited: true, 
                    lastEditedAt: new Date().toISOString(),
                    editHistory: [...history, newLog]
                };
            }
            return item;
        }));
    };

    const removeItem = (id: number) => {
        setItems(prev => {
            const updated = prev.filter(i => i.id !== id);
            if (updated.length === 0) {
                return [{ 
                    id: Date.now(), 
                    category: clinicExpenseCategories[0], 
                    subCategory: '', 
                    description: '', 
                    billAmount: 0, 
                    paidAmount: 0, 
                    dept: 'Clinic' 
                }];
            }
            return updated;
        });
    };

    const totals = items.reduce((acc, item) => { 
        acc.cost += Number(item.billAmount) || 0; 
        acc.paid += Number(item.paidAmount) || 0; 
        return acc; 
    }, { cost: 0, paid: 0 });

    const inputClass = "w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

    const subCategories = useMemo(() => {
        const map = { ...expenseSubCategoryMap };
        Object.keys(customSubCategories).forEach(cat => {
            if (map[cat]) {
                map[cat] = [...new Set([...map[cat], ...customSubCategories[cat]])];
            } else {
                map[cat] = customSubCategories[cat];
            }
        });
        map['Stuff salary'] = (Array.isArray(employees) ? employees : []).map((e: any) => e?.emp_name || e?.name || 'Unknown');
        return map;
    }, [employees, customSubCategories]);

    const addSubCategory = (category: string) => {
        const newSub = prompt(`নতুন সাব-ক্যাটাগরি লিখুন (${expenseCategoryBanglaMap[category] || category}):`);
        if (newSub && newSub.trim()) {
            setCustomSubCategories(prev => ({
                ...prev,
                [category]: [...(prev[category] || []), newSub.trim()]
            }));
        }
    };

    const deleteSubCategory = (category: string, sub: string) => {
        if (!window.confirm(`আপনি কি "${sub}" সাব-ক্যাটাগরি মুছে ফেলতে চান?`)) return;
        setCustomSubCategories(prev => {
            const updated = { ...prev };
            if (updated[category]) {
                updated[category] = updated[category].filter(s => s !== sub);
            }
            return updated;
        });
    };

    const handleSave = () => {
        if (items.every(it => !it.subCategory && !it.description && it.paidAmount <= 0)) {
            alert("দয়া করে অন্তত একটি খরচের হিসাব সঠিকভাবে লিখুন।");
            return;
        }
        const validItems = items.filter(it => it.subCategory || it.description || it.paidAmount > 0);
        onSave(selectedDate, validItems);
    };

    return (
        <div className="bg-emerald-950/40 rounded-xl p-6 border border-emerald-800/50 shadow-xl no-print">
            {historyItem && <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}
            <div className="flex justify-between items-center mb-6 border-b border-emerald-800/50 pb-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-emerald-100 flex items-center gap-2">
                        <Activity className="w-5 h-5" /> 
                        {editingItem ? 'ক্লিনিক খরচ এডিট করুন (Edit Clinic Expense)' : 'Clinic Daily Expense'}
                    </h3>
                    <button onClick={onPrint} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                        <PrinterIcon size={14}/> Print Daily Ledger
                    </button>
                </div>
                <input type="date" value={selectedDate} onChange={e => { onDateChange(e.target.value); if(editingItem) setEditingItem(null); }} className="bg-slate-800 border border-slate-700 rounded p-2 text-white" />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-xs text-emerald-400 uppercase tracking-widest">
                            <th className="pb-3">Category</th>
                            <th className="pb-3">Sub-Category</th>
                            <th className="pb-3">Details</th>
                            <th className="pb-3 text-right">Bill</th>
                            <th className="pb-3 text-right">Paid</th>
                            <th className="pb-3 text-center">History</th>
                            <th className="pb-3 text-center">X</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <React.Fragment key={item.id}>
                                <tr className="border-t border-emerald-900/30">
                                    <td className="py-2 pr-2">
                                        <select 
                                            value={item.category} 
                                            onChange={e => { 
                                                handleItemChange(item.id, 'category', e.target.value); 
                                                handleItemChange(item.id, 'subCategory', ''); 
                                            }} 
                                            className={inputClass}
                                        >
                                            {clinicExpenseCategories.map(c => (
                                                <option key={c} value={c}>{expenseCategoryBanglaMap[c] || c}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="py-2 pr-2">
                                        <div className="relative w-full flex items-center">
                                            {(subCategories[item.category] && subCategories[item.category].length > 0) ? (
                                                <div className="relative flex-1 w-full">
                                                    <select 
                                                        value={item.subCategory} 
                                                        onChange={e => handleItemChange(item.id, 'subCategory', e.target.value)} 
                                                        className={`${inputClass} pr-12`}
                                                    >
                                                        <option value="">Select...</option>
                                                        {subCategories[item.category].map(sc => (
                                                            <option key={sc} value={sc}>{sc}</option>
                                                        ))}
                                                    </select>
                                                    {item.subCategory && customSubCategories[item.category]?.includes(item.subCategory) && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => deleteSubCategory(item.category, item.subCategory)}
                                                            className="absolute right-8 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center transition-opacity z-10 shadow-lg"
                                                            title="Delete this sub-category"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative flex-1 w-full">
                                                    <input 
                                                        value={item.subCategory} 
                                                        onChange={e => handleItemChange(item.id, 'subCategory', e.target.value)} 
                                                        className={`${inputClass} pr-10`} 
                                                        placeholder="Sub-category..." 
                                                    />
                                                </div>
                                            )}
                                            <button 
                                                type="button"
                                                onClick={() => addSubCategory(item.category)} 
                                                className="absolute right-1 text-emerald-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-6 h-6 rounded flex items-center justify-center font-bold text-sm transition-all border border-slate-600 focus:outline-none"
                                                title="Add New Sub-category"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-2 pr-2">
                                        <input 
                                            value={item.description} 
                                            onChange={e => handleItemChange(item.id, 'description', e.target.value)} 
                                            className={inputClass} 
                                            placeholder="Details..."
                                        />
                                    </td>
                                    <td className="py-2 pr-2">
                                        <input 
                                            type="number" 
                                            value={item.billAmount || ''} 
                                            onChange={e => handleItemChange(item.id, 'billAmount', parseFloat(e.target.value) || 0)} 
                                            className={`${inputClass} text-right`} 
                                        />
                                    </td>
                                    <td className="py-2 pr-2">
                                        <input 
                                            type="number" 
                                            value={item.paidAmount || ''} 
                                            onChange={e => handleItemChange(item.id, 'paidAmount', parseFloat(e.target.value) || 0)} 
                                            className={`${inputClass} text-right`} 
                                        />
                                    </td>
                                    <td className="py-2 text-center">
                                        <button 
                                            type="button"
                                            onClick={() => setHistoryItem(item)} 
                                            className={`text-[10px] font-black uppercase px-2 py-1 rounded ${item.isEdited ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                                        >
                                            History
                                        </button>
                                    </td>
                                    <td className="py-2 text-center">
                                        <button 
                                            type="button"
                                            onClick={() => removeItem(item.id)} 
                                            className="text-red-400 font-bold text-lg hover:text-red-300 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </td>
                                </tr>
                                {item.category === 'Stuff salary' && item.subCategory && (
                                    <tr className="bg-slate-950/80">
                                        <td colSpan={7} className="px-2 py-1">
                                            <StaffSalaryHelperCard 
                                                employeeName={item.subCategory}
                                                employees={employees}
                                                selectedDate={selectedDate}
                                                allDetailedExpenses={allDetailedExpenses}
                                                attendanceLog={attendanceLog}
                                                leaveLog={leaveLog}
                                                currentInputPaid={item.paidAmount || 0}
                                                currentExpenseId={item.id}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-between items-center mt-6">
                <div className="flex gap-2">
                    {!editingItem && (
                        <button 
                            type="button"
                            onClick={() => setItems([...items, { id: Date.now(), category: clinicExpenseCategories[0], subCategory: '', description: '', billAmount: 0, paidAmount: 0, dept: 'Clinic' }])} 
                            className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-500 transition-colors shadow"
                        >
                            + Add Row
                        </button>
                    )}
                    {editingItem && (
                        <button 
                            type="button"
                            onClick={() => setEditingItem(null)} 
                            className="bg-slate-700 text-slate-300 px-4 py-2 rounded font-bold hover:bg-slate-600 transition-colors border border-slate-600"
                        >
                            Cancel Edit (বাতিল করুন)
                        </button>
                    )}
                </div>
                <div className="flex gap-6 items-center">
                    <div className="text-slate-400">Total Paid: <span className="text-emerald-400 font-bold text-lg">৳{totals.paid.toLocaleString()}</span></div>
                    <button 
                        type="button"
                        onClick={handleSave} 
                        className="bg-green-600 hover:bg-green-500 text-white px-8 py-2 rounded font-black shadow-lg transition-colors"
                    >
                        {editingItem ? 'UPDATE DATA' : 'SAVE DATA'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ClinicAccountsPage: React.FC<any> = ({ 
  onBack, invoices, dueCollections, employees, detailedExpenses, setDetailedExpenses, performBlockingSync,
  attendanceLog = {}, leaveLog = {}
}) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState<'detailed' | 'summary' | 'collection' | 'daily_summary' | 'monthly_expense'>('detailed');
    const handleDateChange = (newDate: string) => {
        setSelectedDate(newDate);
        const dateObj = new Date(newDate);
        if (!isNaN(dateObj.getTime())) {
            setSelectedMonth(dateObj.getMonth());
            setSelectedYear(dateObj.getFullYear());
            if (viewMode === 'detailed') {
                setExpDateSearch(newDate);
            }
        }
    };

    const [isTodayFilter, setIsTodayFilter] = useState(false);
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [invoiceDateSearch, setInvoiceDateSearch] = useState('');
    const [invoiceMonthSearch, setInvoiceMonthSearch] = useState<number | ''>('');
    const [invoiceYearSearch, setInvoiceYearSearch] = useState<number | ''>('');
    const [pcFilter, setPcFilter] = useState<'all' | 'with_pc' | 'without_pc'>('all');
    const [hideCancelledInCollection, setHideCancelledInCollection] = useState(true);

    const navigate = useNavigate();
    const [expSearch, setExpSearch] = useState('');
    const [expDateSearch, setExpDateSearch] = useState(selectedDate);
    const [expMonthSearch, setExpMonthSearch] = useState<number | ''>('');
    const [expYearSearch, setExpYearSearch] = useState<number | ''>('');
    const [expCategorySearch, setExpCategorySearch] = useState('');
    
    const [ledgerHistoryItem, setLedgerHistoryItem] = useState<ExpenseItem | null>(null);
    const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);

    // Printable Invoice Modal from Collection Report Double-Click
    const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
    const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);

    const handleOpenInvoicePreview = (inv: any) => {
        if (!inv) return;
        const fullInv = (Array.isArray(invoices) ? invoices : []).find((i: any) => i && i.daily_id === inv.daily_id) || inv;
        setPreviewInvoice(fullInv);
        setShowInvoicePreviewModal(true);
    };

    const handleEditInvoiceFromAccounts = (inv: any) => {
        if (!inv || !inv.daily_id) return;
        localStorage.setItem('ncd_pending_edit_invoice_id', inv.daily_id);
        setShowInvoicePreviewModal(false);
        navigate('/clinic');
    };

    const handlePrintFromPreview = (inv: any) => {
        if (!inv) return;
        const win = window.open('', '_blank');
        if (!win) return;
        const styles = `
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; padding: 20px; line-height: 1.4; }
                .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
                .h1 { font-size: 26px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                .sub { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
                .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-top: 8px; }
                .info-grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 12px; }
                .info-col { line-height: 1.7; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                th { background: #0284c7; color: #ffffff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
                td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
                tr:nth-child(even) td { background: #f8fafc; }
                .total-container { display: flex; justify-content: flex-end; margin-top: 10px; }
                .total-box { width: 280px; font-size: 13px; }
                .total-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #cbd5e1; }
                .total-row.grand { font-size: 16px; font-weight: 900; color: #0369a1; border-top: 2px solid #0284c7; border-bottom: 2px solid #0284c7; padding: 6px 0; margin-top: 4px; }
                .signature-area { margin-top: 50px; display: flex; justify-content: space-between; padding: 0 40px; font-size: 12px; font-weight: bold; }
                .status-stamp { color: #dc2626; text-align: center; border: 2px dashed #dc2626; padding: 8px; margin: 15px 0; font-weight: bold; border-radius: 6px; }
            </style>
        `;
        const html = `
            <html>
            <head>
                <title>Invoice #${inv.daily_id}</title>
                ${styles}
            </head>
            <body>
                <div class="header">
                    <div class="h1">Niramoy Clinic & Diagnostic</div>
                    <div class="sub">Enayetpur, Sirajgonj | Mobile: 01730 923007</div>
                    <div class="badge">Inpatient Bill Invoice</div>
                </div>
                <div class="info-grid">
                    <div class="info-col">
                        <div><strong>Patient Name:</strong> ${inv.patient_name || '-'}</div>
                        <div><strong>Patient ID:</strong> ${inv.patient_id || '-'}</div>
                        <div><strong>Admission ID:</strong> ${inv.admission_id || '-'}</div>
                        <div><strong>Indication / Service:</strong> ${inv.indication || inv.subCategory || '-'}</div>
                    </div>
                    <div class="info-col" style="text-align: right;">
                        <div><strong>Invoice No:</strong> #${inv.daily_id || '-'}</div>
                        <div><strong>Date:</strong> ${inv.invoice_date || inv.admission_date || '-'}</div>
                        <div><strong>Consultant:</strong> ${inv.doctor_name || 'N/A'}</div>
                        <div><strong>Status:</strong> <span style="text-transform: uppercase; font-weight: bold;">${inv.status || 'Active'}</span></div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 35px; text-align: center;">SL</th>
                            <th>Service / Charge Item</th>
                            <th>Provider / Doctor</th>
                            <th style="text-align: right;">Charge (৳)</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Total (৳)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [{ service_type: inv.subCategory || 'Clinic Service', payable_amount: inv.total_bill, service_charge: inv.total_bill, quantity: 1 }]).map((it: any, i: number) => `
                            <tr>
                                <td style="text-align: center; color: #64748b;">${i + 1}</td>
                                <td><strong>${it.service_type || it.name || 'Service'}</strong></td>
                                <td>${it.service_provider || '-'}</td>
                                <td style="text-align: right;">${Number(it.service_charge || 0).toFixed(2)}</td>
                                <td style="text-align: center;">${it.quantity || 1}</td>
                                <td style="text-align: right; font-weight: bold;">${Number(it.payable_amount || (it.service_charge * (it.quantity || 1)) || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total-container">
                    <div class="total-box">
                        <div class="total-row"><span>Gross Total:</span> <span>৳${Number(inv.total_bill || 0).toFixed(2)}</span></div>
                        <div class="total-row"><span>Discount:</span> <span>৳${(Number(inv.total_discount || 0) + Number(inv.special_discount_amount || 0)).toFixed(2)}</span></div>
                        <div class="total-row grand"><span>Net Payable:</span> <span>৳${Number(inv.net_payable || (inv.total_bill - (inv.total_discount || 0))).toFixed(2)}</span></div>
                        <div class="total-row" style="color: #16a34a; font-weight: bold;"><span>Paid Amount:</span> <span>৳${Number(inv.paid_amount || 0).toFixed(2)}</span></div>
                        <div class="total-row" style="color: #dc2626; font-weight: bold;"><span>Due Balance:</span> <span>৳${Number(inv.due_bill || 0).toFixed(2)}</span></div>
                        ${((Number(inv.special_commission) || 0) + (Number(inv.commission_paid) || 0)) > 0 ? `
                        <div class="total-row" style="color: #b45309; font-weight: bold; border-top: 1px dashed #cbd5e1; padding-top: 4px; margin-top: 4px;">
                            <span>PC (Commission):</span> <span>৳${Number((Number(inv.special_commission) || 0) + (Number(inv.commission_paid) || 0)).toFixed(2)}</span>
                        </div>` : ''}
                    </div>
                </div>
                ${inv.status === 'Returned' ? '<div class="status-stamp">INVOICE RETURNED / REFUNDED</div>' : ''}
                <div class="signature-area">
                    <div style="text-align: center; border-top: 1px solid #94a3b8; width: 140px; padding-top: 4px;">Accountant</div>
                    <div style="text-align: center; border-top: 1px solid #94a3b8; width: 140px; padding-top: 4px;">Authorized Sign</div>
                </div>
            </body>
            </html>
        `;
        win.document.write(html);
        win.document.close();
        win.print();
    };

    const [successMsg, setSuccessMsg] = useState('');
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

    useEffect(() => { if(successMsg) setTimeout(() => setSuccessMsg(''), 3000); }, [successMsg]);

    const handleSave = (date: string, items: ExpenseItem[]) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirm Save',
            message: 'আপনি কি এই খরচগুলো সেভ করতে চান?',
            onConfirm: () => executeSave(date, items)
        });
    };

    const executeSave = async (date: string, items: ExpenseItem[]) => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const safePrev = detailedExpenses || {};
        const existingItems = safePrev[date] || [];
        
        // Keep Diagnostic items, and other existing clinic items we aren't overwriting
        const otherDeptItems = existingItems.filter((it: any) => it.dept !== 'Clinic');
        const prevClinicItems = existingItems.filter((it: any) => it.dept === 'Clinic');

        const incomingItems = (items || []).map(it => ({ 
            ...it, 
            dept: 'Clinic' as const,
            date: date
        }));

        let finalClinicItems = [];
        if (editingItem) {
            finalClinicItems = prevClinicItems.map(prev => {
                if (prev.id === editingItem.id) {
                    const match = incomingItems.find(curr => curr.id === prev.id) || incomingItems[0];
                    return { ...prev, ...match, dept: 'Clinic' as const, date };
                }
                return prev;
            });
        } else {
            finalClinicItems = [...prevClinicItems, ...incomingItems];
        }

        const newState = { ...safePrev, [date]: [...otherDeptItems, ...finalClinicItems] };
        
        const success = await performBlockingSync({ detailedExpenses: newState });

        if (success) {
            setDetailedExpenses(newState);
            setEditingItem(null);
            setSuccessMsg("Clinic Expense Saved! Syncing to cloud...");
        }
    };

    const handleLedgerDelete = (date: string, itemId: any) => {
        if (window.confirm("আপনি কি নিশ্চিত যে এই খরচের রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?")) {
            executeLedgerDelete(date, itemId);
        }
    };

    const executeLedgerDelete = async (date: string, itemId: any) => {
        try {
            const targetIdStr = String(itemId).trim();
            const safePrev = detailedExpenses || {};
            const newState: Record<string, ExpenseItem[]> = {};

            Object.entries(safePrev).forEach(([d, items]) => {
                if (Array.isArray(items)) {
                    newState[d] = items.filter((it: any) => String(it.id).trim() !== targetIdStr);
                } else {
                    newState[d] = items;
                }
            });

            // Optimistically update React state immediately
            setDetailedExpenses(newState);
            setSuccessMsg("খরচটি সফলভাবে ডিলিট করা হয়েছে।");
            setTimeout(() => setSuccessMsg(""), 4000);

            // Remove from Supabase separate modular table
            dbService.deleteExpense(date, targetIdStr).catch(e => console.warn("Supabase deleteExpense notice:", e));

            const success = await performBlockingSync({ detailedExpenses: newState });
            if (!success) {
                console.warn("[ClinicAccounts] Sync completed with local fallback");
            }
        } catch (err) {
            console.error("[ClinicAccounts] Critical error deleting expense:", err);
            alert("সিস্টেম এরর হয়েছে। দয়া করে পেজটি রিফ্রেশ দিন।");
        }
    };

    // --- Helper function for keyword matching ---
    const matchesKeyword = (source: string, words: string[]) => {
        if(!source) return false;
        const lower = source.toLowerCase();
        return words.some(w => lower.includes(w.toLowerCase()));
    };

    // --- Core logic to categorize an invoice (Mapping Category Breakdown) ---
    const categorizeInvoiceData = React.useCallback((inv: any) => {
        if (!inv || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') {
            return { admFee: 0, oxygen: 0, conservative: 0, nvd: 0, dc: 0, lscs_ot: 0, gb_ot: 0, others_ot: 0, dressing: 0, others: 0, pcAmount: 0, clinicNet: 0 };
        }

        const items = Array.isArray(inv.items) ? inv.items : [];
        const isDoc = (it: any) => {
            const t = (it?.service_type || '').toLowerCase();
            const p = (it?.service_provider || '').toLowerCase();
            return [
                'surgeon', 'anaesthetist', 'obstetrician', 'midwife', 
                'doctor round fee', 'doctor prescription fee', 'discharge writing fee',
                'assistant_1', 'assistant_2', 'staff', 'medicine'
            ].some(d => t.includes(d)) || p.startsWith('dr') || p.includes('doctor');
        };

        const incomeItems = items.filter((it: any) => {
            if (!it) return false;
            // Explicit user toggle has absolute priority:
            if (it.isClinicFund === true) return true;
            if (it.isClinicFund === false) return false;
            // Fallback for legacy items where isClinicFund is undefined:
            return !isDoc(it);
        });

        const totalRevenue = incomeItems.length > 0
            ? incomeItems.reduce((s, it) => s + (it.payable_amount || 0), 0)
            : (items.length === 0 ? Number(inv.total_bill || 0) : 0);
        
        // FIX: Subtract due collections from clinicNet to prevent double-counting when Due Collection is added later
        const allDues = (dueCollections || []).filter((dc: any) => dc.invoice_id === inv.invoice_id).reduce((s: any, dc: any) => s + (dc.amount_collected || 0), 0);
        const pcAmount = (inv.special_commission || 0) + (inv.commission_paid || 0);
        const rawClinicNet = totalRevenue - (inv.special_discount_amount || 0) - pcAmount - allDues;
        const clinicNet = inv.status === 'Returned' ? -Math.abs(rawClinicNet) : Math.max(0, rawClinicNet);

        // Ratio to distribute deductions (commission + discount + dues) proportionally across categories
        const ratio = totalRevenue > 0 ? clinicNet / totalRevenue : 0;

        let admFee = 0, oxygen = 0, dressing = 0, conservative = 0, nvd = 0, dc = 0, lscs_ot = 0, gb_ot = 0, others_ot = 0, others = 0;

        incomeItems.forEach((it: any) => {
            const typeLower = (it.service_type || '').toLowerCase();
            const amt = it.payable_amount * ratio;
            const subCat = (inv.subCategory || '').toUpperCase();
            const mainCat = inv.serviceCategory;

            // Rule 1: Key Item Keywords (Admission, O2, Dressing)
            if (matchesKeyword(typeLower, ['admission fee', 'ভর্তি ফি'])) {
                admFee += amt;
            } else if (matchesKeyword(typeLower, ['oxygen', 'o2', 'nebulizer', 'nebulization'])) {
                oxygen += amt;
            } else if (matchesKeyword(typeLower, ['dressing'])) {
                dressing += amt;
            } 
            // Rule 2: Priority Sub-Category Logic
            else if (subCat === 'LSCS_OT') {
                lscs_ot += amt;
            } else if (subCat === 'GB_OT') {
                gb_ot += amt;
            } else if (subCat === 'NVD') {
                nvd += amt;
            } else if (subCat === 'D&C') {
                dc += amt;
            } 
            // Rule 3: Category Logic
            else if (mainCat === 'Operation') {
                others_ot += amt;
            } else if (mainCat === 'Conservative treatment') {
                conservative += amt;
            } 
            // Rule 4: Others (Misc)
            else {
                others += amt;
            }
        });

        return { admFee, oxygen, conservative, nvd, dc, lscs_ot, gb_ot, others_ot, dressing, others, pcAmount, clinicNet };
    }, [dueCollections]);

    const summaryData = useMemo(() => {
        const safeInvoices = Array.isArray(invoices) ? invoices : [];
        const monthInvoices = safeInvoices.filter((inv:any) => {
            if (!inv) return false;
            const dateToUse = inv.admission_date || inv.invoice_date || inv.date || '';
            const norm = normalizeDate(dateToUse);
            if (!norm) return false;
            const [y, m] = norm.split('-').map(Number);
            return (m - 1) === selectedMonth && y === selectedYear;
        });
        
        const safeDueCollections = Array.isArray(dueCollections) ? dueCollections : [];
        const monthDueRecov = safeDueCollections.filter((dc:any) => {
            if (!dc) return false;
            const isClinic = dc.invoice_id && !dc.invoice_id.startsWith('INV-');
            const norm = normalizeDate(dc.collection_date || dc.date || '');
            if (!norm) return false;
            const [y, m] = norm.split('-').map(Number);
            return (m - 1) === selectedMonth && y === selectedYear && isClinic;
        }).reduce((sum:any, dc:any) => sum + (dc.amount_collected || 0), 0);

        const collectionByCategory = monthInvoices.reduce((acc, inv) => {
            const catData = categorizeInvoiceData(inv);
            acc.admFee += catData.admFee;
            acc.oxygen += catData.oxygen;
            acc.conservative += catData.conservative;
            acc.nvd += catData.nvd;
            acc.dc += catData.dc;
            acc.lscs_ot += catData.lscs_ot;
            acc.gb_ot += catData.gb_ot;
            acc.others_ot += catData.others_ot;
            acc.dressing += catData.dressing;
            acc.others += catData.others;
            acc.totalPC += catData.pcAmount;
            return acc;
        }, { admFee: 0, oxygen: 0, conservative: 0, nvd: 0, dc: 0, lscs_ot: 0, gb_ot: 0, others_ot: 0, dressing: 0, others: 0, totalPC: 0 });

        const totalClinicNetOnly = monthInvoices.reduce((sum:any, inv:any) => {
            if (inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return sum;
            const catData = categorizeInvoiceData(inv);
            return sum + catData.clinicNet;
        }, 0);

        const totalCollectionIncludingDue = totalClinicNetOnly + monthDueRecov;

        const expensesByCategory: Record<string, number> = {};
        clinicExpenseCategories.forEach(cat => expensesByCategory[cat] = 0);
        const addSummaryExp = (it: any, fallbackDate?: string) => {
            if (!it || it.isDeleted) return;
            const norm = normalizeDate(it.date || fallbackDate || '');
            if (!norm) return;
            const [y, m] = norm.split('-').map(Number);
            if (m - 1 === selectedMonth && y === selectedYear) {
                if (it.dept === 'Clinic' || (!it.dept && clinicExpenseCategories.includes(it.category))) {
                    expensesByCategory[it.category] = (expensesByCategory[it.category] || 0) + (it.paidAmount || 0);
                }
            }
        };
        if (Array.isArray(detailedExpenses)) {
            detailedExpenses.forEach(it => addSummaryExp(it));
        } else if (detailedExpenses && typeof detailedExpenses === 'object') {
            Object.entries(detailedExpenses).forEach(([date, items]: any) => {
                const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
                list.forEach((it: any) => addSummaryExp(it, date));
            });
        }
        const totalExpense = Object.values(expensesByCategory).reduce((s, v) => s + v, 0);
        return { totalCollection: totalCollectionIncludingDue, collectionByCategory, monthDueRecov, expensesByCategory, totalExpense, balance: totalCollectionIncludingDue - totalExpense };
    }, [selectedMonth, selectedYear, invoices, dueCollections, detailedExpenses, categorizeInvoiceData]);

    const clinicExpenseJournalData = useMemo(() => {
        const allClinicExpenses: any[] = [];
        const addJournalExp = (it: any, fallbackDate?: string) => {
            if (!it || it.isDeleted) return;
            const norm = normalizeDate(it.date || fallbackDate || '');
            if (!norm) return;
            if (it.dept === 'Clinic' || (!it.dept && clinicExpenseCategories.includes(it.category))) {
                allClinicExpenses.push({ ...it, date: norm });
            }
        };
        if (Array.isArray(detailedExpenses)) {
            detailedExpenses.forEach(it => addJournalExp(it));
        } else if (detailedExpenses && typeof detailedExpenses === 'object') {
            Object.entries(detailedExpenses).forEach(([date, items]: any) => {
                const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
                list.forEach((it: any) => addJournalExp(it, date));
            });
        }

        const filtered = allClinicExpenses.filter(ex => {
            if (!ex || !ex.date) return false;
            const matchesSearch = !expSearch || (ex.description || '').toLowerCase().includes(expSearch.toLowerCase()) || (ex.subCategory || '').toLowerCase().includes(expSearch.toLowerCase());
            const matchesDate = !expDateSearch || ex.date === expDateSearch;
            const norm = normalizeDate(ex.date);
            if (!norm) return false;
            const [y, m] = norm.split('-').map(Number);
            const matchesMonth = expMonthSearch === '' || (m - 1) === expMonthSearch;
            const matchesYear = expYearSearch === '' || y === expYearSearch;
            const matchesCategory = !expCategorySearch || ex.category === expCategorySearch;
            return matchesSearch && matchesDate && matchesMonth && matchesYear && matchesCategory;
        }).sort((a, b) => b.date.localeCompare(a.date));

        const totalPaid = filtered.filter(ex => !ex.isDeleted).reduce((s, ex) => s + ex.paidAmount, 0);
        const totalBill = filtered.filter(ex => !ex.isDeleted).reduce((s, ex) => s + ex.billAmount, 0);

        return { filtered, totals: { totalPaid, totalBill } };
    }, [detailedExpenses, expSearch, expDateSearch, expMonthSearch, expYearSearch, expCategorySearch]);

    const clinicMonthlyExpenseSheetData = useMemo(() => {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const rows = [];
        const columnTotals: Record<string, number> = {};
        clinicExpenseCategories.forEach(cat => columnTotals[cat] = 0);

        const expMap = new Map<string, any[]>();
        const addExp = (it: any, fallbackDate?: string) => {
            if (!it || it.isDeleted) return;
            const norm = normalizeDate(it.date || fallbackDate || '');
            if (!norm) return;
            if (!expMap.has(norm)) expMap.set(norm, []);
            expMap.get(norm)!.push(it);
        };
        if (Array.isArray(detailedExpenses)) {
            detailedExpenses.forEach(it => addExp(it));
        } else if (detailedExpenses && typeof detailedExpenses === 'object') {
            Object.entries(detailedExpenses).forEach(([date, items]: any) => {
                const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
                list.forEach((it: any) => addExp(it, date));
            });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dailyExps = (expMap.get(dateStr) || []).filter((it: any) => it && !it.isDeleted && (it.dept === 'Clinic' || (!it.dept && clinicExpenseCategories.includes(it.category))));
            
            const rowCategories: Record<string, number> = {};
            clinicExpenseCategories.forEach(cat => rowCategories[cat] = 0);
            
            let dayTotal = 0;
            dailyExps.forEach((exp: any) => {
                if (exp && clinicExpenseCategories.includes(exp.category)) {
                    rowCategories[exp.category] += (exp.paidAmount || 0);
                    columnTotals[exp.category] += (exp.paidAmount || 0);
                    dayTotal += (exp.paidAmount || 0);
                } else if (exp) {
                    rowCategories['Others'] = (rowCategories['Others'] || 0) + (exp.paidAmount || 0);
                    columnTotals['Others'] = (columnTotals['Others'] || 0) + (exp.paidAmount || 0);
                    dayTotal += (exp.paidAmount || 0);
                }
            });

            rows.push({
                date: dateStr,
                categories: rowCategories,
                total: dayTotal
            });
        }

        const grandTotal = Object.values(columnTotals).reduce((a, b) => a + b, 0);
        return { rows, columnTotals, grandTotal };
    }, [selectedMonth, selectedYear, detailedExpenses]);

    const dailySummaryData = useMemo(() => {
        const safeInvoices = Array.isArray(invoices) ? invoices : [];
        const dayInvoices = safeInvoices.filter((inv: any) => {
            const raw = inv.admission_date || inv.invoice_date || '';
            const norm = normalizeDate(raw);
            return norm === selectedDate || raw === selectedDate;
        });
        
        const safeDueCollections = Array.isArray(dueCollections) ? dueCollections : [];
        const dayDueRecov = safeDueCollections.filter((dc: any) => {
            const isClinic = dc && dc.invoice_id && !dc.invoice_id.startsWith('INV-');
            const raw = dc.collection_date || dc.date || '';
            const norm = normalizeDate(raw);
            return (norm === selectedDate || raw === selectedDate) && isClinic;
        }).reduce((sum: any, dc: any) => sum + (dc.amount_collected || 0), 0);

        const collectionByCategory = dayInvoices.reduce((acc, inv) => {
            const st = String(inv.status || '').toLowerCase().trim();
            if (st === 'cancelled' || st === 'returned' || st === 'deleted' || inv.isDeleted) return acc;
            const catData = categorizeInvoiceData(inv);
            acc.admFee += catData.admFee;
            acc.oxygen += catData.oxygen;
            acc.conservative += catData.conservative;
            acc.nvd += catData.nvd;
            acc.dc += catData.dc;
            acc.lscs_ot += catData.lscs_ot;
            acc.gb_ot += catData.gb_ot;
            acc.others_ot += catData.others_ot;
            acc.dressing += catData.dressing;
            acc.others += catData.others;
            acc.totalPC += catData.pcAmount;
            return acc;
        }, { admFee: 0, oxygen: 0, conservative: 0, nvd: 0, dc: 0, lscs_ot: 0, gb_ot: 0, others_ot: 0, dressing: 0, others: 0, totalPC: 0 });

        const totalClinicNetOnly = dayInvoices.reduce((sum: any, inv: any) => {
             const st = String(inv.status || '').toLowerCase().trim();
             if (st === 'cancelled' || st === 'returned' || st === 'deleted' || inv.isDeleted) return sum;
             const catData = categorizeInvoiceData(inv);
             return sum + catData.clinicNet;
        }, 0);

        const totalCollection = totalClinicNetOnly + dayDueRecov;
        const expensesByCategory: Record<string, number> = {};
        clinicExpenseCategories.forEach(cat => expensesByCategory[cat] = 0);
        
        let totalExpense = 0;
        const addDayExp = (it: any, fallbackDate?: string) => {
            if (!it || it.isDeleted) return;
            const norm = normalizeDate(it.date || fallbackDate || '');
            if (norm === selectedDate || fallbackDate === selectedDate) {
                if (it.dept === 'Clinic' || (!it.dept && clinicExpenseCategories.includes(it.category))) {
                    const amt = it.paidAmount || 0;
                    expensesByCategory[it.category] = (expensesByCategory[it.category] || 0) + amt;
                    totalExpense += amt;
                }
            }
        };
        if (Array.isArray(detailedExpenses)) {
            detailedExpenses.forEach(it => addDayExp(it));
        } else if (detailedExpenses && typeof detailedExpenses === 'object') {
            Object.entries(detailedExpenses).forEach(([d, items]: any) => {
                const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
                list.forEach((it: any) => addDayExp(it, d));
            });
        }

        return { totalCollection, collectionByCategory, dayDueRecov, totalExpense, expensesByCategory, balance: totalCollection - totalExpense };
    }, [selectedDate, invoices, dueCollections, detailedExpenses, categorizeInvoiceData]);

    const totalWithPcInPeriod = useMemo(() => {
        const safeInvoices = Array.isArray(invoices) ? invoices : [];
        return safeInvoices.filter((inv: any) => {
            if (!inv || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return false;
            const dateToUse = inv.admission_date || inv.invoice_date || '';
            const norm = normalizeDate(dateToUse);
            if (isTodayFilter) {
                if (norm !== selectedDate && dateToUse !== selectedDate) return false;
            } else {
                if (!norm) return false;
                const [y, m] = norm.split('-').map(Number);
                if ((m - 1) !== selectedMonth || y !== selectedYear) return false;
            }
            return ((Number(inv.special_commission) || 0) + (Number(inv.commission_paid) || 0)) > 0;
        }).length;
    }, [invoices, isTodayFilter, selectedDate, selectedMonth, selectedYear]);

    const collectionReportData = useMemo(() => {
        const safeInvoices = Array.isArray(invoices) ? invoices : [];
        const rawFiltered = safeInvoices.filter((inv: any) => {
            if (!inv) return false;
            if (hideCancelledInCollection) {
                const st = String(inv.status || '').toLowerCase().trim();
                if (st === 'cancelled' || st === 'deleted' || st === 'returned' || inv.isDeleted) return false;
            }
            const dateToUse = inv.admission_date || inv.invoice_date || '';
            const norm = normalizeDate(dateToUse);
            if (isTodayFilter) return norm === selectedDate || dateToUse === selectedDate;
            if (!norm) return false;
            const [y, m] = norm.split('-').map(Number);
            return (m - 1) === selectedMonth && y === selectedYear;
        });

        const mapped = rawFiltered.map((inv: any) => {
            const st = String(inv.status || '').toLowerCase().trim();
            const isInactive = st === 'cancelled' || st === 'deleted' || st === 'returned' || inv.isDeleted;
            const catData = isInactive
                ? { admFee: 0, lscs_ot: 0, gb_ot: 0, others_ot: 0, nvd: 0, dc: 0, conservative: 0, oxygen: 0, dressing: 0, others: 0, pcAmount: 0, clinicNet: 0 }
                : categorizeInvoiceData(inv);
            return {
                ...inv,
                admFeeCol: catData.admFee,
                lscsOtCol: catData.lscs_ot,
                gbCol: catData.gb_ot,
                othersOtCol: catData.others_ot,
                nvdCol: catData.nvd,
                dcCol: catData.dc,
                consCol: catData.conservative,
                o2NebCol: catData.oxygen,
                dressCol: catData.dressing,
                othersCol: catData.others,
                pcCol: catData.pcAmount,
                netClinicCol: catData.clinicNet
            };
        });

        // 1. PC filter (All vs With PC vs Without PC)
        const pcFiltered = mapped.filter((inv: any) => {
            if (pcFilter === 'with_pc') return inv.pcCol > 0;
            if (pcFilter === 'without_pc') return inv.pcCol === 0;
            return true;
        });

        // 2. Comprehensive Search:
        // Patient Name, Patient ID, Admission ID, Invoice Daily ID,
        // Operation Name, SubCategory, Indication, Items, Service Providers, Referrers,
        // and PC search ("pc", "পিসি", "has pc", "with pc", or exact PC amount like "500")
        const query = invoiceSearch.trim().toLowerCase();
        if (!query) return pcFiltered;

        return pcFiltered.filter((inv: any) => {
            // Check PC query keywords
            if (query === 'pc' || query === 'পিসি' || query === 'has pc' || query === 'with pc' || query === 'has_pc') {
                return inv.pcCol > 0;
            }
            if (query === 'no pc' || query === 'without pc') {
                return inv.pcCol === 0;
            }
            if (query.startsWith('pc:') || query.startsWith('pc ')) {
                const targetAmt = parseFloat(query.replace(/^pc[:\s]+/, ''));
                if (!isNaN(targetAmt)) return inv.pcCol === targetAmt;
            }

            // Numeric check for PC amount
            if (/^\d+$/.test(query) && inv.pcCol === Number(query)) {
                return true;
            }

            // Patient Name & ID
            if ((inv.patient_name || '').toLowerCase().includes(query)) return true;
            if ((inv.patient_id && String(inv.patient_id).toLowerCase().includes(query))) return true;

            // Admission ID & Daily ID
            if ((inv.admission_id && String(inv.admission_id).toLowerCase().includes(query))) return true;
            if ((inv.daily_id && String(inv.daily_id).toLowerCase().includes(query))) return true;

            // Operation / Procedure / SubCategory / Indication / Service
            if ((inv.subCategory || '').toLowerCase().includes(query)) return true;
            if ((inv.indication || '').toLowerCase().includes(query)) return true;
            if ((inv.serviceCategory || '').toLowerCase().includes(query)) return true;
            if ((inv.ot_details || '').toLowerCase().includes(query)) return true;

            // Referrer Name & Doctor Name
            if ((inv.referrar_name || '').toLowerCase().includes(query)) return true;
            if ((inv.doctor_name || '').toLowerCase().includes(query)) return true;

            // Service items
            if (Array.isArray(inv.items) && inv.items.some((it: any) => 
                (it.service_type || '').toLowerCase().includes(query) ||
                (it.name || '').toLowerCase().includes(query) ||
                (it.service_provider || '').toLowerCase().includes(query)
            )) {
                return true;
            }

            return false;
        });
    }, [invoices, isTodayFilter, selectedDate, selectedMonth, selectedYear, invoiceSearch, pcFilter, hideCancelledInCollection, categorizeInvoiceData]);

    const indoorJournalData = useMemo(() => {
        const safeInvoices = Array.isArray(invoices) ? invoices : [];
        const filtered = safeInvoices.filter((inv: any) => {
            const dateToUse = inv.admission_date || inv.invoice_date || '';
            const normDate = normalizeDate(dateToUse);
            
            const matchesName = (inv.patient_name || '').toLowerCase().includes(invoiceSearch.toLowerCase()) || 
                               (inv.admission_id && inv.admission_id.toLowerCase().includes(invoiceSearch.toLowerCase()));
            
            const matchesDate = invoiceDateSearch ? (normDate === invoiceDateSearch || dateToUse === invoiceDateSearch) : true;
            
            let matchesMonth = true;
            let matchesYear = true;
            if (normDate) {
                const [y, m] = normDate.split('-').map(Number);
                matchesMonth = invoiceMonthSearch !== '' ? (m - 1) === invoiceMonthSearch : true;
                matchesYear = invoiceYearSearch !== '' ? y === invoiceYearSearch : true;
            } else {
                matchesMonth = invoiceMonthSearch === '';
                matchesYear = invoiceYearSearch === '';
            }
            
            // If no specific search criteria, default to selectedDate
            if (!invoiceSearch && !invoiceDateSearch && invoiceMonthSearch === '' && invoiceYearSearch === '') {
                return normDate === selectedDate || dateToUse === selectedDate;
            }

            return matchesName && matchesDate && matchesMonth && matchesYear;
        });

        const totals = filtered.reduce((acc, inv) => {
            const st = String(inv.status || '').toLowerCase().trim();
            if (!inv.isDeleted && st !== 'cancelled' && st !== 'returned' && st !== 'deleted') {
                acc.totalBill += inv.total_bill || 0;
                acc.totalPaid += inv.paid_amount || 0;
                acc.totalDue += inv.due_bill || 0;
            }
            return acc;
        }, { totalBill: 0, totalPaid: 0, totalDue: 0 });

        return { filtered, totals };
    }, [invoices, invoiceSearch, invoiceDateSearch, invoiceMonthSearch, invoiceYearSearch, selectedDate]);
    const reportTotals = useMemo(() => {
        return collectionReportData.reduce((acc, curr) => {
            const st = String(curr.status || '').toLowerCase().trim();
            if (!curr.isDeleted && st !== 'cancelled' && st !== 'returned' && st !== 'deleted') {
                acc.admFee += curr.admFeeCol;
                if (curr.admFeeCol > 0) acc.admFeeCount++;

                acc.lscs_ot += curr.lscsOtCol;
                if (curr.lscsOtCol > 0) acc.lscs_otCount++;

                acc.gb += curr.gbCol;
                if (curr.gbCol > 0) acc.gbCount++;

                acc.others_ot += curr.othersOtCol;
                if (curr.othersOtCol > 0) acc.others_otCount++;

                acc.nvd += curr.nvdCol;
                if (curr.nvdCol > 0) acc.nvdCount++;

                acc.dc += curr.dcCol;
                if (curr.dcCol > 0) acc.dcCount++;

                acc.cons += curr.consCol;
                if (curr.consCol > 0) acc.consCount++;

                acc.o2neb += curr.o2NebCol;
                if (curr.o2NebCol > 0) acc.o2nebCount++;

                acc.dress += curr.dressCol;
                if (curr.dressCol > 0) acc.dressCount++;

                acc.others += curr.othersCol;
                if (curr.othersCol > 0) acc.othersCount++;

                acc.pc += curr.pcCol;
                acc.netClinic += curr.netClinicCol;
                acc.paidTotal += curr.paid_amount;
            }
            return acc;
        }, { 
            admFee: 0, admFeeCount: 0,
            lscs_ot: 0, lscs_otCount: 0,
            gb: 0, gbCount: 0,
            others_ot: 0, others_otCount: 0,
            nvd: 0, nvdCount: 0,
            dc: 0, dcCount: 0,
            cons: 0, consCount: 0,
            o2neb: 0, o2nebCount: 0,
            dress: 0, dressCount: 0,
            others: 0, othersCount: 0,
            pc: 0, netClinic: 0, paidTotal: 0 
        });
    }, [collectionReportData]);

    const handlePrintCollectionReport = () => {
        const win = window.open('', '_blank');
        if (!win) return;
        const title = isTodayFilter ? `Today's Collection Report - ${selectedDate}` : `Monthly Collection Report - ${monthOptions[selectedMonth].name} ${selectedYear}`;
        
        const html = `
            <html>
                <head>
                    <title>${title}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @page { size: A4 landscape; margin: 8mm; } 
                        body { background: white; font-family: 'Segoe UI', serif; color: black; font-size: 7.5pt; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #000; padding: 2px 4px; text-align: left; }
                        th { background: #f3f4f6; font-weight: bold; text-transform: uppercase; font-size: 7pt; }
                        .text-right { text-align: right; }
                        .font-black { font-weight: 900; }
                    </style>
                </head>
                <body class="p-2">
                    <div class="text-center mb-4 border-b-2 border-black pb-2">
                        <h1 class="text-xl font-black uppercase text-blue-900 leading-none">Niramoy Clinic & Diagnostic</h1>
                        <p class="text-[8pt] font-bold">Patient Collection Report (Clinic Accounts) - ${title}</p>
                    </div>
                    <table>
                        <thead>
                            <tr class="bg-gray-100 font-black">
                                <th colspan="15" class="text-right uppercase">Top Summary:</th>
                                <th class="text-right">৳${reportTotals.paidTotal.toLocaleString()}</th>
                                <th class="text-right bg-rose-50">৳${reportTotals.pc.toLocaleString()}</th>
                                <th class="text-right bg-emerald-100 text-emerald-900 font-black">৳${reportTotals.netClinic.toLocaleString()}</th>
                                <th></th>
                            </tr>
                            <tr>
                                <th>SL</th>
                                <th>Adm. ID</th>
                                <th>Date</th>
                                <th>Patient Name</th>
                                <th>Service Taken</th>
                                <th class="text-right">Admission</th>
                                <th class="text-right">LSCS_OT</th>
                                <th class="text-right">GB_OT</th>
                                <th class="text-right">Others_OT</th>
                                <th class="text-right">NVD</th>
                                <th class="text-right">D&C</th>
                                <th class="text-right">Cons.</th>
                                <th class="text-right">O2/Neb</th>
                                <th class="text-right">Dress</th>
                                <th class="text-right">Misc</th>
                                <th class="text-right">Paid Total</th>
                                <th class="text-right bg-rose-50">PC (Comm)</th>
                                <th class="text-right bg-emerald-50">Clinic Net</th>
                                <th class="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${collectionReportData.map((inv, idx) => `
                                <tr class="${inv.status === 'Cancelled' || inv.status === 'Deleted' ? 'opacity-30 line-through' : inv.status === 'Returned' ? 'bg-red-50' : ''}">
                                    <td>${idx + 1}</td>
                                    <td>${inv.admission_id}</td>
                                    <td>${inv.admission_date || inv.invoice_date}</td>
                                    <td class="font-bold">${inv.patient_name}</td>
                                    <td>${inv.subCategory || '-'}</td>
                                    <td class="text-right">৳${inv.admFeeCol.toLocaleString()}</td>
                                    <td class="text-right">৳${inv.lscsOtCol.toLocaleString()}</td>
                                    <td class="text-right">৳${inv.gbCol.toLocaleString()}</td>
                                    <td class="text-right">৳${inv.othersOtCol.toLocaleString()}</td>
                                    <td class="text-right">৳${inv.nvdCol.toLocaleString()}</td>
                                    <td class="text-right">৳${inv.dcCol.toLocaleString()}</td>
                                    <td class="text-right">৳${inv.consCol.toLocaleString()}</td>
                                    <td class="text-right">৳${inv.o2NebCol.toLocaleString()}</td>
                                    <td class="text-right">৳${inv.dressCol.toLocaleString()}</td>
                                    <td class="text-right">৳${inv.othersCol.toLocaleString()}</td>
                                    <td class="text-right font-bold">৳${(inv.status === 'Cancelled' || inv.status === 'Returned') ? '0' : inv.paid_amount.toLocaleString()}</td>
                                    <td class="text-right bg-rose-50 text-rose-800">৳${inv.pcCol.toLocaleString()}</td>
                                    <td class="text-right font-black bg-emerald-50 text-emerald-800">৳${inv.netClinicCol.toLocaleString()}</td>
                                    <td class="text-center text-[6pt] font-black">${inv.status}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="bg-gray-100 font-black">
                            <tr>
                                <td colspan="5" class="text-right">Grand Totals (Active Only):</td>
                                <td class="text-right">
                                    <div>৳${reportTotals.admFee.toLocaleString()}</div>
                                    <div class="text-[6pt] text-gray-500">Qty: ${reportTotals.admFeeCount}</div>
                                </td>
                                <td class="text-right">
                                    <div>৳${reportTotals.lscs_ot.toLocaleString()}</div>
                                    <div class="text-[6pt] text-gray-500">Qty: ${reportTotals.lscs_otCount}</div>
                                </td>
                                <td class="text-right">
                                    <div>৳${reportTotals.gb.toLocaleString()}</div>
                                    <div class="text-[6pt] text-gray-500">Qty: ${reportTotals.gbCount}</div>
                                </td>
                                <td class="text-right">
                                    <div>৳${reportTotals.others_ot.toLocaleString()}</div>
                                    <div class="text-[6pt] text-gray-500">Qty: ${reportTotals.others_otCount}</div>
                                </td>
                                <td class="text-right">
                                    <div>৳${reportTotals.nvd.toLocaleString()}</div>
                                    <div class="text-[6pt] text-gray-500">Qty: ${reportTotals.nvdCount}</div>
                                </td>
                                <td class="text-right">
                                    <div>৳${reportTotals.dc.toLocaleString()}</div>
                                    <div class="text-[6pt] text-gray-500">Qty: ${reportTotals.dcCount}</div>
                                </td>
                                <td class="text-right">
                                    <div>৳${reportTotals.cons.toLocaleString()}</div>
                                    <div class="text-[6pt] text-gray-500">Qty: ${reportTotals.consCount}</div>
                                </td>
                                <td class="text-right">
                                    <div>৳${reportTotals.o2neb.toLocaleString()}</div>
                                    <div class="text-[6pt] text-gray-500">Qty: ${reportTotals.o2nebCount}</div>
                                </td>
                                <td class="text-right">
                                    <div>৳${reportTotals.dress.toLocaleString()}</div>
                                    <div class="text-[6pt] text-gray-500">Qty: ${reportTotals.dressCount}</div>
                                </td>
                                <td class="text-right">
                                    <div>৳${reportTotals.others.toLocaleString()}</div>
                                    <div class="text-[6pt] text-gray-500">Qty: ${reportTotals.othersCount}</div>
                                </td>
                                <td class="text-right">৳${reportTotals.paidTotal.toLocaleString()}</td>
                                <td class="text-right text-rose-700">৳${reportTotals.pc.toLocaleString()}</td>
                                <td class="text-right text-emerald-700">৳${reportTotals.netClinic.toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </body>
            </html>
        `;
        win.document.write(html); win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 750);
    };

    const handlePrintDailyJournal = () => {
        const win = window.open('', '_blank');
        if(!win) return;
        const date = selectedDate;
        const expenses = detailedExpenses[date] || [];
        const dayInvoices = invoices.filter((inv: any) => (inv.admission_date || inv.invoice_date) === date);
        const totalExp = expenses.reduce((s, i) => s + i.paidAmount, 0);
        const totalInvPaid = dayInvoices.filter(i => i.status !== 'Cancelled' && i.status !== 'Returned').reduce((s, i) => s + i.paid_amount, 0);

        const html = `
            <html>
                <head>
                    <title>Daily Journal - ${date}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @page { size: A4; margin: 8mm; } 
                        body { background: white; font-family: 'Segoe UI', Tahoma, sans-serif; color: black; font-size: 10pt; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                        th { background: #f3f4f6; font-weight: bold; text-transform: uppercase; font-size: 9pt; }
                        .text-right { text-align: right; }
                        .font-black { font-weight: 900; }
                    </style>
                </head>
                <body class="p-4">
                    <div class="text-center mb-6 border-b-2 border-black pb-3">
                        <h1 class="text-2xl font-black uppercase text-blue-900 leading-none">Niramoy Clinic & Diagnostic</h1>
                        <p class="text-xs font-bold mt-1">Daily Transaction Ledger - Date: ${date}</p>
                    </div>

                    <h3 class="text-sm font-black uppercase mb-2 border-l-4 border-rose-600 pl-2">Section I: Daily Operating Expenses</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30%">Category</th>
                                <th style="width: 50%">Details / Description</th>
                                <th style="width: 20%" class="text-right">Paid Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenses.length > 0 ? expenses.map(ex => `
                                <tr>
                                    <td class="font-bold">${expenseCategoryBanglaMap[ex.category] || ex.category}</td>
                                    <td>${ex.subCategory ? `<b>${ex.subCategory}:</b> ` : ''}${ex.description || '-'}</td>
                                    <td class="text-right font-black">৳${ex.paidAmount.toLocaleString()}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="3" class="text-center italic py-4 text-gray-500">No expenses recorded for this day.</td></tr>'}
                        </tbody>
                        <tfoot class="bg-gray-50">
                            <tr>
                                <td colspan="2" class="text-right font-black uppercase">Total Expense:</td>
                                <td class="text-right font-black text-lg">৳${totalExp.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <h3 class="text-sm font-black uppercase mb-2 border-l-4 border-emerald-600 pl-2">Section II: Patient Billing Log</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 20%">Invoice ID</th>
                                <th style="width: 30%">Patient Name</th>
                                <th style="width: 15%">Status</th>
                                <th style="width: 15%" class="text-right">Total Bill</th>
                                <th style="width: 20%" class="text-right">Paid Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dayInvoices.length > 0 ? dayInvoices.map(inv => `
                                <tr class="${inv.status === 'Cancelled' ? 'opacity-30 line-through' : ''}">
                                    <td class="font-mono text-xs">${inv.daily_id}</td>
                                    <td class="font-bold uppercase">${inv.patient_name}</td>
                                    <td class="text-[8pt] font-black uppercase">${inv.status}</td>
                                    <td class="text-right font-medium">৳${inv.total_bill.toLocaleString()}</td>
                                    <td class="text-right font-black text-emerald-700">৳${(inv.status === 'Cancelled' || inv.status === 'Returned') ? '0' : inv.paid_amount.toLocaleString()}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="text-center italic py-4 text-gray-500">No patient invoices for this day.</td></tr>'}
                        </tbody>
                        <tfoot class="bg-gray-50">
                            <tr>
                                <td colspan="4" class="text-right font-black uppercase">Total Billing (Active Cash):</td>
                                <td class="text-right font-black text-lg text-emerald-800">৳${totalInvPaid.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="mt-20 flex justify-between px-10 text-[8.5pt] font-bold uppercase text-gray-500">
                        <div class="text-center w-40 border-t border-black pt-1">Accountant</div>
                        <div class="text-center w-56 border-t border-black pt-1">Managing Director / MD</div>
                    </div>
                </body>
            </html>
        `;
        win.document.write(html); win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 750);
    };

    const handlePrintMonthlyExpenseSheet = () => {
        const win = window.open('', '_blank');
        if(!win) return;
        const monthName = monthOptions[selectedMonth].name;
        const { rows, columnTotals, grandTotal } = clinicMonthlyExpenseSheetData;

        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Clinic Expense Sheet - ${monthName} ${selectedYear}</title>
                    <style>
                        @page { 
                            size: A4 landscape; 
                            margin: 2mm; 
                        }
                        body { 
                            font-family: 'Arial Narrow', sans-serif; 
                            background: white; 
                            color: black; 
                            margin: 0; 
                            padding: 0; 
                            width: 100%;
                        }
                        .header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                            border-bottom: 1px solid black;
                            margin-bottom: 2px;
                            padding-bottom: 1px;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 11pt;
                            color: #1e3a8a;
                            text-transform: uppercase;
                        }
                        .header p {
                            margin: 0;
                            font-size: 7pt;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            table-layout: fixed; 
                        }
                        th, td { 
                            border: 1px solid black; 
                            padding: 1px; 
                            text-align: center; 
                            font-size: 7.2pt; 
                            word-wrap: break-word; 
                            line-height: 1;
                            height: 11.5pt;
                        }
                        th { 
                            background: #f3f4f6; 
                            font-weight: bold; 
                            text-transform: uppercase; 
                            font-size: 6.5pt; 
                        }
                        .total-row {
                            background: #f3f4f6;
                            font-weight: bold;
                        }
                        .grand-total {
                            color: #047857;
                            background: #ecfdf5;
                            font-size: 8.5pt;
                        }
                        .footer {
                            margin-top: 3mm;
                            display: flex;
                            justify-content: space-between;
                            padding: 0 60px;
                            font-size: 7.5pt;
                            font-weight: bold;
                            text-transform: uppercase;
                            color: #6b7280;
                        }
                        .sig-box {
                            width: 150px;
                            border-top: 1px solid black;
                            text-align: center;
                            padding-top: 2px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Niramoy Clinic & Diagnostic</h1>
                        <p>Monthly Clinic Expense Ledger - ${monthName} ${selectedYear}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 35px">Date</th>
                                ${clinicExpenseCategories.map(cat => {
                                    if (cat === 'Old Loan Repay') {
                                        return `<th title="${cat}" style="width: 40px">${expenseCategoryBanglaMap[cat] || cat}</th>`;
                                    }
                                    return `<th title="${cat}">${expenseCategoryBanglaMap[cat] || cat}</th>`;
                                }).join('')}
                                <th style="width: 75px; background: #e5e7eb">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(row => `
                                <tr>
                                    <td style="font-weight: bold">${row.date.split('-')[2]} ${monthName.substring(0,3)}</td>
                                    ${clinicExpenseCategories.map(cat => `<td>${row.categories[cat] > 0 ? row.categories[cat].toLocaleString() : '-'}</td>`).join('')}
                                    <td style="font-weight: 900; background: #f9fafb">${row.total > 0 ? row.total.toLocaleString() : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="total-row">
                            <tr>
                                <td style="text-transform: uppercase">TOTAL:</td>
                                ${clinicExpenseCategories.map(cat => `<td>${columnTotals[cat] > 0 ? columnTotals[cat].toLocaleString() : '-'}</td>`).join('')}
                                <td class="grand-total">${grandTotal.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="footer">
                        <div class="sig-box">Accountant</div>
                        <div class="sig-box">Managing Director</div>
                    </div>
                </body>
            </html>
        `;
        win.document.write(html); win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 500);
    };

    const handlePrintSummary = () => {
        const win = window.open('', '_blank');
        if(!win) return;
        const title = viewMode === 'daily_summary' ? `Clinic Daily Summary - ${selectedDate}` : `Clinic Monthly Summary - ${monthOptions[selectedMonth].name} ${selectedYear}`;
        const currentData = viewMode === 'daily_summary' ? dailySummaryData : summaryData;
        const dueRecov = viewMode === 'daily_summary' ? (currentData as any).dayDueRecov : (currentData as any).monthDueRecov;

        const html = `
            <html>
                <head>
                    <title>${title}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @page { size: A4; margin: 8mm; } 
                        body { background: white; font-family: 'Segoe UI', serif; color: black; font-size: 9.5pt; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                        th, td { border: 1.5px solid #000; padding: 4px 8px; text-align: left; }
                        th { background: #f3f4f6; font-weight: bold; text-transform: uppercase; font-size: 8.5pt; }
                        .text-right { text-align: right; }
                        .font-black { font-weight: 900; }
                        .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 4px; margin-bottom: 12px; }
                    </style>
                </head>
                <body class="p-4">
                    <div class="header">
                        <h1 class="text-xl font-black uppercase text-blue-900 leading-none">Niramoy Clinic & Diagnostic</h1>
                        <p class="text-[8pt] font-bold">Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
                        <h2 class="mt-2 text-lg font-bold underline uppercase tracking-widest bg-gray-50 py-1 border border-black">${title}</h2>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <h3 class="font-bold border-b border-black mb-2 uppercase text-[8pt] tracking-widest text-gray-600">I. Revenue Analysis (Income)</h3>
                            <table class="text-[8.5pt]">
                                <thead><tr class="bg-gray-100"><th>Category</th><th className="text-right">Amount</th></tr></thead>
                                <tbody>
                                    <tr><td>Admission Fee</td><td class="text-right">৳${currentData.collectionByCategory.admFee.toLocaleString()}</td></tr>
                                    <tr><td>Oxygen / Nebulization</td><td class="text-right">৳${currentData.collectionByCategory.oxygen.toLocaleString()}</td></tr>
                                    <tr><td>Conservative Treatment</td><td class="text-right">৳${currentData.collectionByCategory.conservative.toLocaleString()}</td></tr>
                                    <tr><td>Normal Delivery (NVD)</td><td class="text-right">৳${currentData.collectionByCategory.nvd.toLocaleString()}</td></tr>
                                    <tr><td>D&C / Minor Surgery</td><td class="text-right">৳${currentData.collectionByCategory.dc.toLocaleString()}</td></tr>
                                    <tr><td>LSCS_OT / Major Surgery</td><td class="text-right">৳${currentData.collectionByCategory.lscs_ot.toLocaleString()}</td></tr>
                                    <tr><td>GB (Gallbladder) OT</td><td class="text-right">৳${currentData.collectionByCategory.gb_ot.toLocaleString()}</td></tr>
                                    <tr><td>Others OT / Services</td><td class="text-right">৳${currentData.collectionByCategory.others_ot.toLocaleString()}</td></tr>
                                    <tr><td>Dressing</td><td class="text-right">৳${currentData.collectionByCategory.dressing.toLocaleString()}</td></tr>
                                    <tr><td>Miscellaneous (Others)</td><td class="text-right">৳${currentData.collectionByCategory.others.toLocaleString()}</td></tr>
                                    <tr class="italic text-gray-600"><td>Due Recovery (বকেয়া আদায়)</td><td class="text-right">৳${dueRecov.toLocaleString()}</td></tr>
                                </tbody>
                                <tfoot class="bg-blue-50 font-black">
                                    <tr><td>Total Revenue (Gross - Comm)</td><td class="text-right text-lg">৳${currentData.totalCollection.toLocaleString()}</td></tr>
                                </tfoot>
                            </table>
                        </div>
                        <div>
                            <h3 class="font-bold border-b border-black mb-2 uppercase text-[8pt] tracking-widest text-gray-600">II. Operating Cost (Expenses)</h3>
                            <table class="text-[8.5pt]">
                                <thead><tr class="bg-gray-100"><th>Expense Item</th><th class="text-right">Amount</th></tr></thead>
                                <tbody>
                                    ${clinicExpenseCategories.map(cat => `
                                        <tr><td>${expenseCategoryBanglaMap[cat] || cat}</td><td class="text-right">৳${(currentData.expensesByCategory[cat] || 0).toLocaleString()}</td></tr>
                                    `).join('')}
                                </tbody>
                                <tfoot class="bg-red-50 font-black">
                                    <tr><td>Total Expense (B)</td><td class="text-right text-lg">৳${currentData.totalExpense.toLocaleString()}</td></tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    
                    <div class="mt-4 p-4 border-2 border-black bg-gray-50 flex justify-between items-center rounded-xl shadow-sm">
                        <span class="text-lg font-black uppercase text-blue-900">Net Profitability (A - B)</span>
                        <span class="text-3xl font-black ${currentData.balance >= 0 ? 'text-green-700' : 'text-red-600'}">৳${currentData.balance.toLocaleString()}</span>
                    </div>

                    <div class="mt-8 flex justify-between px-8 text-[8pt] font-bold uppercase text-gray-500">
                        <div class="text-center w-40 border-t border-black pt-1">Accountant</div>
                        <div class="text-center w-56 border-t border-black pt-1">Authorized Managing Director</div>
                    </div>
                </body>
            </html>
        `;
        win.document.write(html); win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 750);
    };

    return (
        <div className="bg-slate-900 min-h-screen text-slate-200 flex flex-col font-sans">
            <header className="bg-slate-800 border-b border-slate-700 p-6 sticky top-0 z-20 no-print flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-all"><BackIcon className="w-5 h-5" /></button>
                    <h1 className="text-2xl font-black text-emerald-400 uppercase tracking-tighter">Clinic Accounts Console</h1>
                </div>
                <div className="flex bg-slate-900 rounded-lg p-1 overflow-x-auto max-w-full">
                    <button onClick={() => setViewMode('detailed')} className={`px-6 py-2 rounded-md font-bold text-xs uppercase transition-all whitespace-nowrap ${viewMode === 'detailed' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>Daily Journal</button>
                    <button onClick={() => setViewMode('collection')} className={`px-6 py-2 rounded-md font-bold text-xs uppercase transition-all whitespace-nowrap ${viewMode === 'collection' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>Collection Report</button>
                    <button onClick={() => setViewMode('monthly_expense')} className={`px-6 py-2 rounded-md font-bold text-xs uppercase transition-all whitespace-nowrap ${viewMode === 'monthly_expense' ? 'bg-rose-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>Monthly Clinic Expense Sheet</button>
                    <button onClick={() => setViewMode('daily_summary')} className={`px-6 py-2 rounded-md font-bold text-xs uppercase transition-all whitespace-nowrap ${viewMode === 'daily_summary' ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>Daily Summary</button>
                    <button onClick={() => setViewMode('summary')} className={`px-6 py-2 rounded-md font-bold text-xs uppercase transition-all whitespace-nowrap ${viewMode === 'summary' ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>Monthly Summary</button>
                </div>
            </header>

            <main className="flex-1 w-full px-3 sm:px-5 lg:px-6 py-6 space-y-8 max-w-[98%] 2xl:max-w-[1800px] mx-auto">
                {viewMode === 'detailed' && (
                    <div className="w-full space-y-8 animate-fade-in">
                        {ledgerHistoryItem && <HistoryModal item={ledgerHistoryItem} onClose={() => setLedgerHistoryItem(null)} />}
                        <DailyExpenseForm 
                            key={`clinic-daily-expense-${selectedDate}-${editingItem?.id || 'new'}`}
                            selectedDate={selectedDate} 
                            onDateChange={handleDateChange} 
                            onSave={handleSave} 
                            onPrint={handlePrintDailyJournal}
                            employees={employees} 
                            editingItem={editingItem}
                            setEditingItem={setEditingItem}
                            allDetailedExpenses={detailedExpenses}
                            attendanceLog={attendanceLog}
                            leaveLog={leaveLog}
                        />
                        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl">
                            <h3 className="text-xl font-black text-sky-400 uppercase mb-6 flex flex-wrap justify-between items-center gap-4">
                                <span className="flex items-center gap-2">
                                    <FileTextIcon className="w-6 h-6 text-emerald-400" />
                                    Clinic Expense Ledger Journal
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <input type="text" placeholder="Search Expense..." value={expSearch} onChange={e=>setExpSearch(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-full px-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500 w-44"/>
                                    <select value={expCategorySearch} onChange={e=>setExpCategorySearch(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-full px-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500">
                                        <option value="">Category</option>
                                        {clinicExpenseCategories.map(c => <option key={c} value={c}>{expenseCategoryBanglaMap[c] || c}</option>)}
                                    </select>
                                    <input type="date" value={expDateSearch} onChange={e=>setExpDateSearch(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-full px-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500 w-40"/>
                                    <select value={expMonthSearch} onChange={e=>setExpMonthSearch(e.target.value === '' ? '' : parseInt(e.target.value))} className="bg-slate-950 border border-slate-700 rounded-full px-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500">
                                        <option value="">Month</option>
                                        {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                    </select>
                                    <select value={expYearSearch} onChange={e=>setExpYearSearch(e.target.value === '' ? '' : parseInt(e.target.value))} className="bg-slate-950 border border-slate-700 rounded-full px-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500">
                                        <option value="">Year</option>
                                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    {(expSearch || expDateSearch || expMonthSearch !== '' || expYearSearch !== '' || expCategorySearch) && (
                                        <button onClick={() => { setExpSearch(''); setExpDateSearch(''); setExpMonthSearch(''); setExpYearSearch(''); setExpCategorySearch(''); }} className="text-rose-400 text-xs font-black uppercase hover:underline ml-1">Clear</button>
                                    )}
                                </div>
                            </h3>
                            <div className="overflow-x-auto rounded-2xl border border-slate-700">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-black tracking-wider">
                                        <tr className="bg-slate-900 border-b border-slate-700 shadow-md">
                                            <th colSpan={5} className="p-3 text-right text-slate-300 uppercase tracking-widest text-xs font-bold">Filtered Totals:</th>
                                            <th className="p-3 text-right text-sky-300 font-mono text-base font-bold">৳{clinicExpenseJournalData.totals.totalBill.toLocaleString()}</th>
                                            <th className="p-3 text-right text-emerald-300 font-mono text-base font-black">৳{clinicExpenseJournalData.totals.totalPaid.toLocaleString()}</th>
                                            <th></th>
                                        </tr>
                                        <tr className="border-b border-slate-800">
                                            <th className="p-3.5">SL</th>
                                            <th className="p-3.5">Date</th>
                                            <th className="p-3.5">Category</th>
                                            <th className="p-3.5">Sub-Category</th>
                                            <th className="p-3.5">Description</th>
                                            <th className="p-3.5 text-right">Bill Amount</th>
                                            <th className="p-3.5 text-right text-emerald-300">Paid Amount</th>
                                            <th className="p-3.5 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {clinicExpenseJournalData.filtered.map((ex:any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                                                <td className="p-3.5 text-slate-500 text-xs font-mono">{idx + 1}</td>
                                                <td className="p-3.5 text-xs font-mono text-slate-300">{ex.date}</td>
                                                <td className="p-3.5 font-bold text-emerald-300 text-sm">{expenseCategoryBanglaMap[ex.category] || ex.category}</td>
                                                <td className="p-3.5 text-sky-300 font-bold uppercase text-xs">{ex.subCategory || '-'}</td>
                                                <td className="p-3.5 text-slate-200 text-sm">{ex.description || '-'}</td>
                                                <td className="p-3.5 text-right font-mono text-slate-300 text-sm">৳{ex.billAmount.toLocaleString()}</td>
                                                <td className="p-3.5 text-right text-emerald-400 font-mono font-black text-base">৳{ex.paidAmount.toLocaleString()}</td>
                                                <td className="p-3.5 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedDate(ex.date);
                                                                setEditingItem(ex);
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                            className="p-2 bg-sky-600/20 text-sky-400 rounded-lg hover:bg-sky-600 hover:text-white transition-all"
                                                            title="Edit"
                                                        >
                                                            <FileTextIcon size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => setLedgerHistoryItem(ex)}
                                                            className={`px-2.5 py-1.5 rounded-lg transition-all text-xs font-black uppercase ${ex.isEdited ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                                            title="History"
                                                        >
                                                            H
                                                        </button>
                                                        {!ex.isDeleted && (
                                                            <button 
                                                                onClick={() => handleLedgerDelete(ex.date, ex.id)}
                                                                className="p-1.5 bg-rose-600/20 text-rose-400 rounded hover:bg-rose-600 hover:text-white transition-all"
                                                                title="Delete"
                                                            >
                                                                <BackIcon size={14} className="rotate-45" />
                                                            </button>
                                                        )}
                                                        {ex.isDeleted && (
                                                            <span className="text-[10px] font-black text-rose-500 uppercase bg-rose-500/10 px-2 py-1 rounded">Deleted</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {clinicExpenseJournalData.filtered.length === 0 && (
                                            <tr><td colSpan={8} className="p-10 text-center text-slate-600 italic">No clinic expenses found for the selected filters.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'collection' && (
                    <div className="animate-fade-in space-y-6 w-full">
                        <div className="bg-slate-800 p-4 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl flex flex-col gap-6 w-full">
                            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-700 pb-4 no-print">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Patient Collection Report</h3>
                                    <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-700">
                                        <button onClick={() => setIsTodayFilter(true)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${isTodayFilter && selectedDate === new Date().toISOString().split('T')[0] ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Today's Collection</button>
                                        <button onClick={() => setIsTodayFilter(false)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${!isTodayFilter ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Monthly View</button>
                                    </div>
                                    
                                    {/* Top Summary Cards (Collection, PC, and Clinic Net) */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex flex-col items-start bg-emerald-900/25 border border-emerald-500/40 px-3.5 py-1 rounded-2xl shadow-sm">
                                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Total Collection</span>
                                            <span className="text-sm font-black text-emerald-300">৳{reportTotals.paidTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex flex-col items-start bg-rose-900/25 border border-rose-500/40 px-3.5 py-1 rounded-2xl shadow-sm">
                                            <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Total PC</span>
                                            <span className="text-sm font-black text-rose-300">৳{reportTotals.pc.toLocaleString()}</span>
                                        </div>
                                        <div className="flex flex-col items-start bg-sky-900/35 border-2 border-sky-400/60 px-4 py-1 rounded-2xl shadow-md ring-2 ring-sky-500/20">
                                            <span className="text-[8px] font-black text-sky-300 uppercase tracking-widest flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                                                Clinic Net (হসপিটাল নিট)
                                            </span>
                                            <span className="text-base font-black text-sky-200">৳{reportTotals.netClinic.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Cancelled/Deleted toggle button */}
                                    <button
                                        type="button"
                                        onClick={() => setHideCancelledInCollection(prev => !prev)}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${hideCancelledInCollection ? 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-700' : 'bg-amber-900/30 text-amber-300 border-amber-500/50'}`}
                                        title="বাতিল ও ডিলিট ইনভয়েস দেখানো বা লুকানোর অপশন"
                                    >
                                        {hideCancelledInCollection ? '👁️ বাতিল/ডিলিট লুকানো আছে' : '👁️ বাতিল/ডিলিট দেখানো হচ্ছে'}
                                    </button>

                                    <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-2xl border border-slate-700">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Custom Date:</label>
                                        <input 
                                            type="date" 
                                            value={selectedDate} 
                                            onChange={(e) => {
                                                setSelectedDate(e.target.value);
                                                setIsTodayFilter(true);
                                            }} 
                                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={handlePrintCollectionReport}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95"
                                    >
                                        <PrinterIcon size={14}/> Print A4 Landscape
                                    </button>
                                    {!isTodayFilter && (
                                        <div className="flex gap-2 mx-2">
                                            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-900 border border-slate-700 p-2 rounded text-white text-xs font-bold">{monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                                            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-900 border border-slate-700 p-2 rounded text-white text-xs font-bold">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
                                        </div>
                                    )}

                                    {/* PC Filter Toggle Buttons */}
                                    <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700 shadow-inner">
                                        <button 
                                            type="button" 
                                            onClick={() => setPcFilter('all')} 
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${pcFilter === 'all' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            সকল (All)
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setPcFilter(prev => prev === 'with_pc' ? 'all' : 'with_pc')} 
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${pcFilter === 'with_pc' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50 ring-1 ring-rose-300' : 'text-rose-300 hover:bg-slate-800'}`}
                                            title="যেসব ইনভয়েসে পিসি দেওয়া হয়েছে সেগুলো ফিল্টার করতে ক্লিক করুন"
                                        >
                                            <span className={`w-2 h-2 rounded-full ${pcFilter === 'with_pc' ? 'bg-white animate-ping' : 'bg-rose-400'}`}></span>
                                            শুধু PC ({totalWithPcInPeriod})
                                        </button>
                                    </div>

                                    {/* Enhanced Search Input */}
                                    <div className="relative w-64 md:w-72">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="রোগীর নাম, আইডি, অপারেশন বা 'PC'..." 
                                            value={invoiceSearch} 
                                            onChange={e => setInvoiceSearch(e.target.value)} 
                                            className="w-full bg-slate-950 border border-slate-700 rounded-full pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 outline-none" 
                                        />
                                        {invoiceSearch && (
                                            <button 
                                                type="button" 
                                                onClick={() => setInvoiceSearch('')} 
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white font-bold text-xs"
                                                title="Clear search"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Active Filter Indicators */}
                            {(pcFilter === 'with_pc' || invoiceSearch) && (
                                <div className="flex flex-wrap items-center gap-2 mb-3 px-1 text-xs">
                                    <span className="text-slate-400 font-medium text-[11px]">ফিল্টার অ্যাক্টিভ:</span>
                                    {pcFilter === 'with_pc' && (
                                        <span className="bg-rose-950 text-rose-300 border border-rose-700/60 px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                                            শুধু পিসি (PC) যুক্ত রোগী
                                            <button type="button" onClick={() => setPcFilter('all')} className="hover:text-white font-bold ml-0.5">✕</button>
                                        </span>
                                    )}
                                    {invoiceSearch && (
                                        <span className="bg-blue-950 text-sky-300 border border-blue-700/60 px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                                            সার্চ: "{invoiceSearch}"
                                            <button type="button" onClick={() => setInvoiceSearch('')} className="hover:text-white font-bold ml-0.5">✕</button>
                                        </span>
                                    )}
                                    <span className="text-slate-400 text-[10px] ml-auto font-bold">
                                        মোট পাওয়া গেছে: <strong className="text-emerald-400 font-mono text-xs">{collectionReportData.length}</strong> টি রেকর্ড
                                    </span>
                                </div>
                            )}

                            <div className="overflow-x-auto min-h-[650px] border border-slate-700 rounded-xl bg-slate-950/20 shadow-inner w-full">
                                <table className="w-full text-left text-[11px] border-collapse min-w-[1500px]">
                                    <thead className="bg-slate-900 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700 sticky top-0 z-20 shadow-md">
                                        {/* Top Column Summary Row - Perfectly aligned directly above the columns */}
                                        <tr className="bg-slate-950/95 text-slate-400 border-b border-slate-800">
                                            <th colSpan={15} className="p-2 text-right uppercase tracking-widest text-[9px] font-black text-slate-400">
                                                কলাম সামারি (Top Summary) :
                                            </th>
                                            <th className="p-2 text-right bg-emerald-950/70 text-emerald-300 font-black font-mono text-xs border-r border-slate-800/60" title="মোট কালেকশন">
                                                <span className="text-[7px] block text-emerald-500 font-sans uppercase">Total Paid</span>
                                                ৳{reportTotals.paidTotal.toLocaleString()}
                                            </th>
                                            <th className="p-2 text-right bg-rose-950/70 text-rose-300 font-black font-mono text-xs border-r border-slate-800/60" title="মোট পিসি কমিশন">
                                                <span className="text-[7px] block text-rose-500 font-sans uppercase">Total PC</span>
                                                ৳{reportTotals.pc.toLocaleString()}
                                            </th>
                                            {/* Exact width and boundary alignment strictly for Clinic Net column */}
                                            <th className="p-2 text-right bg-sky-950 text-sky-200 font-black border-l-2 border-r-2 border-sky-400/90 shadow-md ring-1 ring-sky-500/40" title="মোট ক্লিনিক নিট (হসপিটাল নিট)">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] font-sans font-black text-sky-400 uppercase tracking-tight flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                                                        Net Total
                                                    </span>
                                                    <span className="text-sm font-mono font-black text-sky-200">
                                                        ৳{reportTotals.netClinic.toLocaleString()}
                                                    </span>
                                                </div>
                                            </th>
                                            <th colSpan={2} className="bg-slate-950/95"></th>
                                        </tr>

                                        {/* Standard Column Headers */}
                                        <tr className="bg-slate-900/90 border-b border-slate-700">
                                            <th className="p-2 whitespace-nowrap">SL</th>
                                            <th className="p-2 whitespace-nowrap">Adm. ID</th>
                                            <th className="p-2 whitespace-nowrap">Date</th>
                                            <th className="p-2 whitespace-nowrap">Patient Name</th>
                                            <th className="p-2 whitespace-nowrap">Service Taken</th>
                                            <th className="p-2 text-right">Admission</th>
                                            <th className="p-2 text-right">LSCS_OT</th>
                                            <th className="p-2 text-right">GB_OT</th>
                                            <th className="p-2 text-right">Others_OT</th>
                                            <th className="p-2 text-right">NVD</th>
                                            <th className="p-2 text-right">D&C</th>
                                            <th className="p-2 text-right">Cons.</th>
                                            <th className="p-2 text-right">O2/Neb</th>
                                            <th className="p-2 text-right">Dress</th>
                                            <th className="p-2 text-right">Misc</th>
                                            <th className="p-2 text-right bg-emerald-900/10 text-emerald-100 font-black">Paid Total</th>
                                            <th className="p-2 text-right bg-rose-900/10 text-rose-300 font-black border-l-2 border-rose-800/30">PC (Comm)</th>
                                            <th className="p-2 text-right bg-blue-900/20 text-sky-200 font-black border-l-2 border-r-2 border-blue-500/40">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sky-300">Clinic Net</span>
                                                    <span className="text-[10px] font-mono text-sky-300 font-bold bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-500/40 mt-0.5 whitespace-nowrap">
                                                        ৳{reportTotals.netClinic.toLocaleString()}
                                                    </span>
                                                </div>
                                            </th>
                                            <th className="p-2 text-center">Status</th>
                                            <th className="p-2 text-center whitespace-nowrap">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {collectionReportData.length > 0 ? collectionReportData.map((inv: any, idx: number) => (
                                            <tr 
                                                key={inv.daily_id} 
                                                onDoubleClick={() => handleOpenInvoicePreview(inv)}
                                                title="ডাবল ক্লিক করুন ইনভয়েস দেখতে ও প্রিন্ট/এডিট করতে"
                                                className={`cursor-pointer hover:bg-slate-700/50 hover:text-white transition-all ${inv.status === 'Cancelled' || inv.status === 'Deleted' ? 'opacity-30 line-through grayscale' : inv.status === 'Returned' ? 'bg-rose-900/10' : ''}`}
                                            >
                                                <td className="p-2 border-r border-slate-800/50 text-slate-500 font-mono">{idx + 1}</td>
                                                <td className="p-2 font-mono text-sky-400 font-bold border-r border-slate-800/50">{inv.admission_id}</td>
                                                <td className="p-2 border-r border-slate-800/50 whitespace-nowrap">{inv.admission_date || inv.invoice_date}</td>
                                                <td className="p-2 font-black text-slate-100 border-r border-slate-800/50 uppercase whitespace-nowrap">{inv.patient_name}</td>
                                                <td className="p-2 text-sky-400 font-bold border-r border-slate-800/50 truncate max-w-[120px]" title={inv.subCategory}>{inv.subCategory || '-'}</td>
                                                <td className="p-2 text-right border-r border-slate-800/50">৳{inv.admFeeCol.toLocaleString()}</td>
                                                <td className="p-2 text-right border-r border-slate-800/50">৳{inv.lscsOtCol.toLocaleString()}</td>
                                                <td className="p-2 text-right border-r border-slate-800/50">৳{inv.gbCol.toLocaleString()}</td>
                                                <td className="p-2 text-right border-r border-slate-800/50">৳{inv.othersOtCol.toLocaleString()}</td>
                                                <td className="p-2 text-right border-r border-slate-800/50">৳{inv.nvdCol.toLocaleString()}</td>
                                                <td className="p-2 text-right border-r border-slate-800/50">৳{inv.dcCol.toLocaleString()}</td>
                                                <td className="p-2 text-right border-r border-slate-800/50">৳{inv.consCol.toLocaleString()}</td>
                                                <td className="p-2 text-right border-r border-slate-800/50">৳{inv.o2NebCol.toLocaleString()}</td>
                                                <td className="p-2 text-right border-r border-slate-800/50">৳{inv.dressCol.toLocaleString()}</td>
                                                <td className="p-2 text-right border-r border-slate-800/50">৳{inv.othersCol.toLocaleString()}</td>
                                                <td className="p-2 text-right font-black text-emerald-400 bg-emerald-900/10">৳ {(inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') ? '0' : inv.paid_amount.toLocaleString()}</td>
                                                <td className="p-2 text-right font-black bg-rose-900/10 border-l-2 border-rose-800/30">
                                                    {inv.pcCol > 0 ? (
                                                        <span className="inline-block px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-mono font-black text-[11px] shadow-sm">
                                                            ৳ {inv.pcCol.toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 font-mono">৳ 0</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right font-black text-sky-300 bg-blue-900/10 border-l-2 border-blue-800/30">৳ {(inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') ? '0' : inv.netClinicCol.toLocaleString()}</td>
                                                <td className="p-2 text-center"><span className="text-[7px] font-black uppercase px-1 rounded bg-slate-900">{inv.status}</span></td>
                                                <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                                                    <button 
                                                        onClick={() => handleOpenInvoicePreview(inv)}
                                                        className="px-2.5 py-1 bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                        ইনভয়েস / এডিট
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={20} className="p-20 text-center text-slate-600 italic font-black uppercase opacity-30 text-xl tracking-[0.2em]">No Collection Records Found</td></tr>
                                        )}
                                    </tbody>
                                    {collectionReportData.length > 0 && (
                                        <tfoot className="bg-slate-900 text-slate-200 font-black border-t-2 border-slate-700 sticky bottom-0">
                                            <tr>
                                                <td colSpan={5} className="p-2 text-right uppercase tracking-widest text-[10px]">Grand Summary Totals (Active Only):</td>
                                                <td className="p-2 text-right">
                                                    <div className="text-emerald-400">৳{reportTotals.admFee.toLocaleString()}</div>
                                                    <div className="text-[8px] text-slate-500 font-bold leading-tight">Qty: {reportTotals.admFeeCount}</div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="text-emerald-400">৳{reportTotals.lscs_ot.toLocaleString()}</div>
                                                    <div className="text-[8px] text-slate-500 font-bold leading-tight">Qty: {reportTotals.lscs_otCount}</div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="text-emerald-400">৳{reportTotals.gb.toLocaleString()}</div>
                                                    <div className="text-[8px] text-slate-500 font-bold leading-tight">Qty: {reportTotals.gbCount}</div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="text-emerald-400">৳{reportTotals.others_ot.toLocaleString()}</div>
                                                    <div className="text-[8px] text-slate-500 font-bold leading-tight">Qty: {reportTotals.others_otCount}</div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="text-emerald-400">৳{reportTotals.nvd.toLocaleString()}</div>
                                                    <div className="text-[8px] text-slate-500 font-bold leading-tight">Qty: {reportTotals.nvdCount}</div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="text-emerald-400">৳{reportTotals.dc.toLocaleString()}</div>
                                                    <div className="text-[8px] text-slate-500 font-bold leading-tight">Qty: {reportTotals.dcCount}</div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="text-emerald-400">৳{reportTotals.cons.toLocaleString()}</div>
                                                    <div className="text-[8px] text-slate-500 font-bold leading-tight">Qty: {reportTotals.consCount}</div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="text-emerald-400">৳{reportTotals.o2neb.toLocaleString()}</div>
                                                    <div className="text-[8px] text-slate-500 font-bold leading-tight">Qty: {reportTotals.o2nebCount}</div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="text-emerald-400">৳{reportTotals.dress.toLocaleString()}</div>
                                                    <div className="text-[8px] text-slate-500 font-bold leading-tight">Qty: {reportTotals.dressCount}</div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="text-emerald-400">৳{reportTotals.others.toLocaleString()}</div>
                                                    <div className="text-[8px] text-slate-500 font-bold leading-tight">Qty: {reportTotals.othersCount}</div>
                                                </td>
                                                <td className="p-2 text-right text-emerald-400 text-base">৳ {reportTotals.paidTotal.toLocaleString()}</td>
                                                <td className="p-2 text-right text-rose-400 text-base">৳ {reportTotals.pc.toLocaleString()}</td>
                                                <td className="p-2 text-right text-sky-400 text-xl underline decoration-double">৳ {reportTotals.netClinic.toLocaleString()}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'monthly_expense' && (
                    <div className="w-full space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl no-print">
                            <h2 className="text-xl font-black text-white uppercase">Monthly Clinic Expense Sheet: {monthOptions[selectedMonth].name} {selectedYear}</h2>
                            <div className="flex gap-4">
                                <button onClick={handlePrintMonthlyExpenseSheet} className="bg-rose-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95"><PrinterIcon size={14}/> Print A4 Landscape</button>
                                <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-900 border border-slate-700 p-2 rounded text-white text-xs font-bold">{monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-900 border border-slate-700 p-2 rounded text-white text-xs font-bold">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                                    <tr>
                                        <th className="p-2 border border-slate-200 w-20">Date</th>
                                        {clinicExpenseCategories.map(cat => (
                                            <th key={cat} className={`p-2 border border-slate-200 text-center ${cat === 'Old Loan Repay' ? 'w-16 break-normal' : ''}`}>{expenseCategoryBanglaMap[cat] || cat}</th>
                                        ))}
                                        <th className="p-2 border border-slate-200 text-right bg-slate-100 min-w-[120px]">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[11px]">
                                    {clinicMonthlyExpenseSheetData.rows.map((row) => (
                                        <tr key={row.date} className="hover:bg-slate-50 transition-colors border-b border-slate-100 h-[32px]">
                                            <td className="p-1 border border-slate-200 font-bold text-slate-700">{row.date.split('-')[2]} {monthOptions[selectedMonth].name.substring(0,3)}</td>
                                            {clinicExpenseCategories.map(cat => (
                                                <td key={cat} className="p-1 border border-slate-200 text-center text-slate-600">
                                                    {row.categories[cat] > 0 ? row.categories[cat].toLocaleString() : '-'}
                                                </td>
                                            ))}
                                            <td className="p-1 border border-slate-200 text-right font-black text-rose-600 bg-rose-50/30">
                                                {row.total > 0 ? row.total.toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-900 text-white font-black border-t-2 border-slate-700">
                                    <tr>
                                        <td className="p-4 border border-slate-700 uppercase text-[10px]">Total:</td>
                                        {clinicExpenseCategories.map(cat => (
                                            <td key={cat} className="p-4 border border-slate-700 text-center">
                                                {clinicMonthlyExpenseSheetData.columnTotals[cat].toLocaleString()}
                                            </td>
                                        ))}
                                        <td className="p-4 border border-slate-700 text-right text-xl text-emerald-400">
                                            {clinicMonthlyExpenseSheetData.grandTotal.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {viewMode === 'daily_summary' && (
                    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl no-print">
                            <h2 className="text-xl font-black text-white uppercase flex items-center gap-3">
                                <Activity className="text-amber-500" /> Daily Summary: {selectedDate}
                            </h2>
                            <div className="flex gap-4">
                                <button onClick={handlePrintSummary} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95"><PrinterIcon size={14}/> Print Report</button>
                                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-bold focus:ring-1 focus:ring-amber-500 outline-none" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
                                <h3 className="text-emerald-400 font-black uppercase text-sm mb-4 border-b border-slate-700 pb-2">Daily Income (Clinic Fund Only)</h3>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Admission Fee:</span> <span className="font-black">৳{dailySummaryData.collectionByCategory.admFee.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Oxygen / Nebulization:</span> <span className="font-black">৳{dailySummaryData.collectionByCategory.oxygen.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Conservative Treatment:</span> <span className="font-black">৳{dailySummaryData.collectionByCategory.conservative.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Normal Delivery (NVD):</span> <span className="font-black">৳{dailySummaryData.collectionByCategory.nvd.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>D&C / Minor Surgery:</span> <span className="font-black">৳{dailySummaryData.collectionByCategory.dc.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>LSCS_OT / Major Surgery:</span> <span className="font-black">৳{dailySummaryData.collectionByCategory.lscs_ot.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>GB (Gallbladder) OT:</span> <span className="font-black">৳{dailySummaryData.collectionByCategory.gb_ot.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Others OT / Services:</span> <span className="font-black">৳{dailySummaryData.collectionByCategory.others_ot.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Dressing:</span> <span className="font-black">৳{dailySummaryData.collectionByCategory.dressing.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Miscellaneous (Others):</span> <span className="font-black">৳{dailySummaryData.collectionByCategory.others.toLocaleString()}</span></div>
                                    <div className="flex justify-between italic text-slate-400 pb-1"><span>Due Recovery (বকেয়া আদায়):</span> <span className="font-black">৳{dailySummaryData.dayDueRecov.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-xl border-t-2 border-emerald-500/50 pt-3 text-white font-black"><span>Total Net Revenue:</span> <span>৳{dailySummaryData.totalCollection.toLocaleString()}</span></div>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
                                <h3 className="text-rose-400 font-black uppercase text-sm mb-4 border-b border-slate-700 pb-2">Daily Operating Cost (B)</h3>
                                <div className="space-y-2 text-xs pr-2">
                                    {clinicExpenseCategories.map(cat => (
                                        <div key={cat} className="flex justify-between border-b border-slate-700/30 pb-1"><span>{expenseCategoryBanglaMap[cat] || cat}:</span> <span className="font-black">৳{(dailySummaryData.expensesByCategory[cat] || 0).toLocaleString()}</span></div>
                                    ))}
                                </div>
                                <div className="flex justify-between text-lg border-t-2 border-rose-500/50 pt-3 text-white font-black mt-2"><span>Total Expense:</span> <span>৳{dailySummaryData.totalExpense.toLocaleString()}</span></div>
                            </div>
                        </div>
                        <div className="flex justify-center mt-4 no-print">
                            <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-6 rounded-3xl text-center shadow-2xl border-2 border-amber-500/20">
                                <p className="text-slate-400 text-xs font-black uppercase mb-2">Daily Net Profit/Loss (A - B)</p>
                                <h4 className={`text-5xl font-black ${dailySummaryData.balance >= 0 ? 'text-green-400' : 'text-rose-500'}`}>৳{dailySummaryData.balance.toLocaleString()}</h4>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'summary' && (
                    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl no-print">
                            <h2 className="text-xl font-black text-white uppercase">Monthly Summary: {monthOptions[selectedMonth].name} {selectedYear}</h2>
                            <div className="flex gap-4">
                                <button onClick={handlePrintSummary} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95"><PrinterIcon size={14}/> Print Report</button>
                                <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-900 border border-slate-700 p-2 rounded text-white text-xs font-bold">{monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-900 border border-slate-700 p-2 rounded text-white text-xs font-bold">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
                                <h3 className="text-blue-400 font-black uppercase text-sm mb-4 border-b border-slate-700 pb-2">Monthly Income (Clinic Fund Only)</h3>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Admission Fee:</span> <span className="font-black">৳{summaryData.collectionByCategory.admFee.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Oxygen / Nebulization:</span> <span className="font-black">৳{summaryData.collectionByCategory.oxygen.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Conservative Treatment:</span> <span className="font-black">৳{summaryData.collectionByCategory.conservative.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Normal Delivery (NVD):</span> <span className="font-black">৳{summaryData.collectionByCategory.nvd.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>D&C / Minor Surgery:</span> <span className="font-black">৳{summaryData.collectionByCategory.dc.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>LSCS_OT / Major Surgery:</span> <span className="font-black">৳{summaryData.collectionByCategory.lscs_ot.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>GB (Gallbladder) OT:</span> <span className="font-black">৳{summaryData.collectionByCategory.gb_ot.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Others OT / Services:</span> <span className="font-black">৳{summaryData.collectionByCategory.others_ot.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Dressing:</span> <span className="font-black">৳{summaryData.collectionByCategory.dressing.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-b border-slate-700/30 pb-1"><span>Miscellaneous (Others):</span> <span className="font-black">৳{summaryData.collectionByCategory.others.toLocaleString()}</span></div>
                                    <div className="flex justify-between italic text-slate-400 pb-1"><span>Due Recovery (বকেয়া আদায়):</span> <span className="font-black">৳{summaryData.monthDueRecov.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-xl border-t-2 border-blue-500/50 pt-3 text-white font-black"><span>Total Net Revenue:</span> <span>৳{summaryData.totalCollection.toLocaleString()}</span></div>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
                                <h3 className="text-rose-400 font-black uppercase text-sm mb-4 border-b border-slate-700 pb-2">Monthly Operating Cost (B)</h3>
                                <div className="space-y-2 text-xs pr-2">
                                    {clinicExpenseCategories.map(cat => (
                                        <div key={cat} className="flex justify-between border-b border-slate-700/30 pb-1"><span>{expenseCategoryBanglaMap[cat] || cat}:</span> <span className="font-black">৳{(summaryData.expensesByCategory[cat] || 0).toLocaleString()}</span></div>
                                    ))}
                                </div>
                                <div className="flex justify-between text-lg border-t-2 border-rose-500/50 pt-3 text-white font-black mt-2"><span>Total Expense:</span> <span>৳{summaryData.totalExpense.toLocaleString()}</span></div>
                            </div>
                        </div>
                        <div className="flex justify-center mt-4 no-print">
                            <div className="bg-gradient-to-br from-indigo-700 to-slate-900 p-6 rounded-3xl text-center shadow-2xl border-2 border-white/10">
                                <p className="text-slate-400 text-xs font-black uppercase mb-2">Monthly Net Profit (A - B)</p>
                                <h4 className={`text-5xl font-black ${summaryData.balance >= 0 ? 'text-green-400' : 'text-rose-500'}`}>৳{summaryData.balance.toLocaleString()}</h4>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 animate-pulse"></div>
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                                <AlertCircle className="w-10 h-10 text-emerald-400 animate-pulse" />
                            </div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{confirmModal.title}</h3>
                            <p className="text-slate-400 font-medium text-lg leading-relaxed">{confirmModal.message}</p>
                            <div className="flex gap-4 w-full pt-4">
                                <button 
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-slate-700 active:scale-95"
                                >
                                    No, Cancel
                                </button>
                                <button 
                                    onClick={confirmModal.onConfirm}
                                    className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-900/40 transition-all active:scale-95 border border-emerald-400/30"
                                >
                                    Yes, Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Printable White-Page Invoice Modal with Print & Edit Actions */}
            {showInvoicePreviewModal && previewInvoice && (
                <div className="fixed inset-0 bg-black/80 z-[11000] flex items-center justify-center p-4 md:p-8 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                        {/* Top Action Header Bar */}
                        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl text-cyan-400 border border-blue-500/20">
                                    <FileTextIcon size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-base flex items-center gap-2">
                                        ইনভয়েস প্রিভিউ &amp; প্রিন্ট
                                        <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded-full uppercase font-mono">
                                            #{previewInvoice.daily_id}
                                        </span>
                                    </h3>
                                    <p className="text-slate-400 text-xs font-medium">ডাবল-ক্লিক প্রিভিউ: এখান থেকেই সরাসরি প্রিন্ট অথবা এডিট করা যাবে</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    onClick={() => handlePrintFromPreview(previewInvoice)}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all active:scale-95 border border-blue-400/30"
                                >
                                    <PrinterIcon size={15} /> প্রিন্ট করুন
                                </button>
                                <button
                                    onClick={() => handleEditInvoiceFromAccounts(previewInvoice)}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95 border border-emerald-400/30"
                                >
                                    <EditIcon size={15} /> এডিট করুন (ক্লিনিক ডিপার্টমেন্ট)
                                </button>
                                <button
                                    onClick={() => setShowInvoicePreviewModal(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                                    title="Close"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* White Paper Invoice Sheet Container */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900 flex justify-center">
                            <div className="bg-white text-slate-800 w-full max-w-3xl rounded-xl shadow-2xl p-8 border border-slate-200 font-sans">
                                {/* Hospital Header */}
                                <div className="text-center border-b-2 border-sky-600 pb-4 mb-6">
                                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Niramoy Clinic &amp; Diagnostic</h1>
                                    <p className="text-xs text-slate-600 font-medium mt-1">Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Govt. Reg No: HSM76710</p>
                                    <div className="mt-3 inline-block bg-sky-100 text-sky-800 text-[11px] font-black uppercase px-4 py-1 rounded-full border border-sky-200">
                                        INPATIENT / CLINIC BILL INVOICE
                                    </div>
                                </div>

                                {/* Patient & Invoice Details Grid */}
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
                                    <div className="space-y-1.5">
                                        <div><span className="text-slate-500 font-bold">রোগীর নাম:</span> <strong className="text-slate-900 uppercase text-sm font-black">{previewInvoice.patient_name || '-'}</strong></div>
                                        <div><span className="text-slate-500 font-bold">Patient ID:</span> <span className="font-mono font-bold text-slate-800">{previewInvoice.patient_id || '-'}</span></div>
                                        <div><span className="text-slate-500 font-bold">Admission ID:</span> <span className="font-mono font-bold text-sky-700">{previewInvoice.admission_id || '-'}</span></div>
                                        <div><span className="text-slate-500 font-bold">সার্ভিস / Indication:</span> <span className="font-bold text-slate-800">{previewInvoice.indication || previewInvoice.subCategory || '-'}</span></div>
                                    </div>
                                    <div className="space-y-1.5 text-right">
                                        <div><span className="text-slate-500 font-bold">ইনভয়েস নং:</span> <strong className="font-mono font-black text-sm text-sky-800">#{previewInvoice.daily_id}</strong></div>
                                        <div><span className="text-slate-500 font-bold">বিলিং তারিখ:</span> <span className="font-bold text-slate-800">{previewInvoice.invoice_date || previewInvoice.admission_date || '-'}</span></div>
                                        <div><span className="text-slate-500 font-bold">কনসালট্যান্ট:</span> <span className="font-bold text-slate-800">{previewInvoice.doctor_name || 'N/A'}</span></div>
                                        <div>
                                            <span className="text-slate-500 font-bold">স্ট্যাটাস:</span> 
                                            <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-black uppercase ${previewInvoice.status === 'Returned' ? 'bg-rose-100 text-rose-700 border border-rose-300' : previewInvoice.status === 'Cancelled' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                                                {previewInvoice.status || 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Items / Service Breakdown Table */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-sky-600 text-white font-black text-[11px] uppercase">
                                            <tr>
                                                <th className="p-2.5 text-center w-10">SL</th>
                                                <th className="p-2.5">Service / Charge Item</th>
                                                <th className="p-2.5">Provider / Doctor</th>
                                                <th className="p-2.5 text-right">Rate (৳)</th>
                                                <th className="p-2.5 text-center">Qty</th>
                                                <th className="p-2.5 text-right">Total (৳)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {(Array.isArray(previewInvoice.items) && previewInvoice.items.length > 0 ? previewInvoice.items : [{ service_type: previewInvoice.subCategory || 'Clinic Service', payable_amount: previewInvoice.total_bill, service_charge: previewInvoice.total_bill, quantity: 1 }]).map((it: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="p-2.5 text-center text-slate-400 font-mono">{i + 1}</td>
                                                    <td className="p-2.5 font-bold text-slate-800">{it.service_type || it.name || 'Service'}</td>
                                                    <td className="p-2.5 text-slate-600">{it.service_provider || '-'}</td>
                                                    <td className="p-2.5 text-right font-mono font-medium">৳{Number(it.service_charge || 0).toFixed(2)}</td>
                                                    <td className="p-2.5 text-center font-mono font-bold">{it.quantity || 1}</td>
                                                    <td className="p-2.5 text-right font-mono font-black text-slate-900">৳{Number(it.payable_amount || (it.service_charge * (it.quantity || 1)) || 0).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Financial Summary Totals Box */}
                                <div className="flex justify-end mb-8">
                                    <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Gross Total:</span>
                                            <span className="font-mono font-bold">৳{Number(previewInvoice.total_bill || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Total Discount:</span>
                                            <span className="font-mono font-bold text-rose-600">-৳{(Number(previewInvoice.total_discount || 0) + Number(previewInvoice.special_discount_amount || 0)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-black text-sky-800 border-t border-b border-sky-300 py-1.5">
                                            <span>Net Payable:</span>
                                            <span className="font-mono">৳{Number(previewInvoice.net_payable || (previewInvoice.total_bill - (previewInvoice.total_discount || 0))).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-700 font-bold">
                                            <span>Paid Amount:</span>
                                            <span className="font-mono font-black">৳{Number(previewInvoice.paid_amount || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-rose-600 font-bold">
                                            <span>Due Balance:</span>
                                            <span className="font-mono font-black">৳{Number(previewInvoice.due_bill || 0).toFixed(2)}</span>
                                        </div>
                                        {((Number(previewInvoice.special_commission) || 0) + (Number(previewInvoice.commission_paid) || 0)) > 0 && (
                                            <div className="flex justify-between text-amber-700 font-bold border-t border-dashed border-slate-300 pt-1">
                                                <span>PC (Commission):</span>
                                                <span className="font-mono font-black">৳{Number((Number(previewInvoice.special_commission) || 0) + (Number(previewInvoice.commission_paid) || 0)).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {previewInvoice.status === 'Returned' && (
                                    <div className="text-center py-2 px-4 bg-rose-50 border-2 border-dashed border-rose-400 text-rose-700 font-black rounded-lg mb-6 text-sm">
                                        INVOICE RETURNED / REFUNDED
                                    </div>
                                )}

                                {/* Signatures */}
                                <div className="flex justify-between items-center pt-8 border-t border-slate-300 text-xs font-bold text-slate-600 px-4">
                                    <div className="text-center">
                                        <div className="w-32 border-t border-slate-700 mb-1"></div>
                                        Accountant
                                    </div>
                                    <div className="text-center">
                                        <div className="w-32 border-t border-slate-700 mb-1"></div>
                                        Authorized Signature
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                            <span className="text-slate-500 text-xs font-medium">
                                💡 টিপস: আপনি সরাসরি <strong className="text-cyan-400">এডিট করুন</strong> বাটনে ক্লিক করে ক্লিনিক ডিপার্টমেন্টে গিয়ে এই বিলটি সংশোধন করতে পারবেন।
                            </span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleEditInvoiceFromAccounts(previewInvoice)}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all"
                                >
                                    <EditIcon size={16} /> এডিট করুন
                                </button>
                                <button
                                    onClick={() => handlePrintFromPreview(previewInvoice)}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all"
                                >
                                    <PrinterIcon size={16} /> প্রিন্ট করুন
                                </button>
                                <button
                                    onClick={() => setShowInvoicePreviewModal(false)}
                                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-all"
                                >
                                    বন্ধ করুন
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

class ClinicAccountsErrorBoundary extends React.Component<{ onBack?: () => void; children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ClinicAccountsPage Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold">
              ⚠️
            </div>
            <h2 className="text-2xl font-bold text-white">ক্লিনিক হিসাব রেন্ডারিং সমস্যা</h2>
            <p className="text-slate-300 text-sm">
              সাময়িক একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা মূল অ্যাকাউন্টিং পেজে ফিরে যান।
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-950 rounded-xl text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg transition-all"
              >
                আবার চেষ্টা করুন
              </button>
              {this.props.onBack && (
                <button
                  onClick={this.props.onBack}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-all"
                >
                  ফিরে যান
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ClinicAccountsPageWrapped: React.FC<any> = (props) => {
  return (
    <ClinicAccountsErrorBoundary onBack={props.onBack}>
      <ClinicAccountsPage {...props} />
    </ClinicAccountsErrorBoundary>
  );
};

export default ClinicAccountsPageWrapped;
export { ClinicAccountsPage };
