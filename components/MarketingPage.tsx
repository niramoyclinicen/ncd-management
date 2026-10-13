
import React, { useState, useMemo, useEffect } from 'react';
import { 
  UsersIcon, SearchIcon, ChartIcon, MapPinIcon, BackIcon, DiagnosticIcon, 
  ClinicIcon, PhoneIcon, Activity, TrendingUpIcon, PieChartIcon, MoneyIcon, SaveIcon, PlusIcon, ClipboardIcon, BarChart3
} from './Icons';
// Importing IndoorInvoice from its correct source: DiagnosticData.ts
import { Referrar, LabInvoice, Patient, Employee, MarketingTarget, CommissionPayment, FieldVisitLog, IndoorInvoice } from './DiagnosticData';
import ContributionReportPage from './ContributionReportPage';

interface MarketingPageProps {
  onBack: () => void;
  referrars: Referrar[];
  labInvoices: LabInvoice[];
  indoorInvoices: IndoorInvoice[];
  patients: Patient[];
  employees: Employee[];
  employeeReferrerMap: Record<string, string[]>;
  setEmployeeReferrerMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

const monthOptions = [
  { value: 0, name: 'January' }, { value: 1, name: 'February' }, { value: 2, name: 'March' },
  { value: 3, name: 'April' }, { value: 4, name: 'May' }, { value: 5, name: 'June' },
  { value: 6, name: 'July' }, { value: 7, name: 'August' }, { value: 8, name: 'September' },
  { value: 9, name: 'October' }, { value: 10, name: 'November' }, { value: 11, name: 'December' }
];

const MarketingPage: React.FC<MarketingPageProps> = ({ 
  onBack, referrars, labInvoices, indoorInvoices, patients, employees,
  employeeReferrerMap, setEmployeeReferrerMap, performBlockingSync
}) => {
  const [activeTab, setActiveTab] = useState<'marketing_management' | 'analytics' | 'commission' | 'targets' | 'visits'>('marketing_management');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [setupView, setSetupView] = useState<'mapping' | 'targets'>('mapping');
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [showAllStaff, setShowAllStaff] = useState(false);

  // --- PERSISTED STATE ---
  const [targets, setTargets] = useState<MarketingTarget[]>(() => JSON.parse(localStorage.getItem('ncd_mkt_targets_v2') || '[]'));
  const [payments, setPayments] = useState<CommissionPayment[]>(() => JSON.parse(localStorage.getItem('ncd_mkt_payments') || '[]'));
  const [visits, setVisits] = useState<FieldVisitLog[]>(() => JSON.parse(localStorage.getItem('ncd_mkt_visits') || '[]'));

  useEffect(() => localStorage.setItem('ncd_mkt_targets_v2', JSON.stringify(targets)), [targets]);
  useEffect(() => localStorage.setItem('ncd_mkt_payments', JSON.stringify(payments)), [payments]);
  useEffect(() => localStorage.setItem('ncd_mkt_visits', JSON.stringify(visits)), [visits]);

  // UI state for forms
  const [newTarget, setNewTarget] = useState<Partial<MarketingTarget>>({ staff_id: '', month: new Date().getMonth(), year: new Date().getFullYear(), pt_count_target: 100, revenue_target: 50000 });
  const [newPayment, setNewPayment] = useState<Partial<CommissionPayment>>({ ref_id: '', amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash' });
  const [newVisit, setNewVisit] = useState<Partial<FieldVisitLog>>({ staff_id: '', date: new Date().toISOString().split('T')[0], location: '', objective: '', outcomes: '' });

  const marketingStaff = useMemo(() => {
    let filtered = employees;
    if (!showAllStaff) {
        filtered = employees.filter(e => e.job_position.toLowerCase().includes('marketing'));
    }
    if (selectedArea !== 'All') {
        filtered = filtered.filter(e => e.address?.toLowerCase().includes(selectedArea.toLowerCase()));
    }
    return filtered;
  }, [employees, showAllStaff, selectedArea]);

  const areas = useMemo(() => {
    const uniqueAreas = new Set(employees.map(e => e.address).filter(Boolean));
    return ['All', ...Array.from(uniqueAreas)];
  }, [employees]);

  const [selectedManagerId, setSelectedManagerId] = useState<string>('');

  // --- ANALYTICS CALCULATIONS ---
  const managerStats = useMemo(() => {
    if (!selectedManagerId) return null;
    const assignedRefIds = employeeReferrerMap[selectedManagerId] || [];
    const managerInvoices = labInvoices.filter(inv => assignedRefIds.includes(inv.referrar_id || ''));
    
    const totalPatients = managerInvoices.length;
    const totalBill = managerInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = managerInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
    const totalCommission = managerInvoices.reduce((sum, inv) => sum + inv.special_commission, 0);
    
    return { totalPatients, totalBill, totalPaid, totalCommission };
  }, [selectedManagerId, employeeReferrerMap, labInvoices]);

  const areaStats = useMemo(() => {
    const data: Record<string, { count: number, collection: number }> = {};
    const allInvoices = [...labInvoices.map(i => ({...i, dept: 'Diag'})), ...indoorInvoices.map(i => ({...i, dept: 'Clinic'}))];
    
    allInvoices.forEach(inv => {
      if (inv.referrar_id) {
        const ref = referrars.find(r => r.ref_id === inv.referrar_id);
        const area = ref?.area || 'Unknown';
        if (!data[area]) data[area] = { count: 0, collection: 0 };
        data[area].count += 1;
        data[area].collection += ('paid_amount' in inv ? inv.paid_amount : 0);
      }
    });
    return Object.entries(data).map(([area, s]) => ({ area, ...s })).sort((a,b) => b.count - a.count);
  }, [labInvoices, indoorInvoices, referrars]);

  const referrerLedger = useMemo(() => {
    return referrars.map(ref => {
      const generated = labInvoices.filter(i => i.referrar_id === ref.ref_id).reduce((s, i) => s + i.special_commission, 0);
      const paid = payments.filter(p => p.ref_id === ref.ref_id).reduce((s, p) => s + p.amount, 0);
      return { ...ref, generated, paid, balance: generated - paid };
    });
  }, [referrars, labInvoices, payments]);

  // --- RENDERERS ---
  const renderAnalytics = () => (
    <div className="space-y-8 animate-fade-in">
        {/* Manager Selection for Detailed Output */}
        <div className="bg-slate-900/80 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Detailed Manager Performance</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Select a marketing manager to view detailed output data</p>
                </div>
                <div className="w-full md:w-72">
                    <select 
                        value={selectedManagerId} 
                        onChange={e => setSelectedManagerId(e.target.value)}
                        className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-white font-black outline-none focus:border-cyan-500 shadow-xl"
                    >
                        <option value="">Select Manager...</option>
                        {employees.filter(e => Object.keys(employeeReferrerMap).includes(e.emp_id)).map(e => (
                            <option key={e.emp_id} value={e.emp_id}>{e.emp_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedManagerId && managerStats && (
                <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Patients</p>
                        <p className="text-3xl font-black text-blue-400">{managerStats.totalPatients}</p>
                        <p className="text-[10px] text-slate-600 font-bold mt-2 uppercase">From { (employeeReferrerMap[selectedManagerId] || []).length } Referrers</p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Revenue</p>
                        <p className="text-3xl font-black text-emerald-400">৳{managerStats.totalBill.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-600 font-bold mt-2 uppercase">৳{managerStats.totalPaid.toLocaleString()} Collected</p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Avg Revenue/Pt</p>
                        <p className="text-3xl font-black text-cyan-400">৳{managerStats.totalPatients > 0 ? Math.round(managerStats.totalBill / managerStats.totalPatients).toLocaleString() : 0}</p>
                        <p className="text-[10px] text-slate-600 font-bold mt-2 uppercase">Per Patient Average</p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Comm. Liability</p>
                        <p className="text-3xl font-black text-amber-400">৳{managerStats.totalCommission.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-600 font-bold mt-2 uppercase">{managerStats.totalBill > 0 ? ((managerStats.totalCommission / managerStats.totalBill) * 100).toFixed(1) : 0}% of Revenue</p>
                    </div>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-800">
                <h4 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-2"><MapPinIcon size={18}/> Area-wise Business Distribution</h4>
                <div className="space-y-4">
                    {areaStats.map((s, i) => (
                        <div key={i} className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
                            <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center font-black text-white text-lg">{i+1}</div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-white uppercase">{s.area}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{s.count} Patients brought so far</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-emerald-400">৳{s.collection.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-800">
                <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUpIcon size={18}/> Top 5 Referrer Performance</h4>
                <div className="h-64 flex items-end justify-between gap-2 px-4 pb-10">
                    {referrerLedger.slice(0, 5).map((r, i) => {
                        const max = Math.max(...referrerLedger.map(x => x.generated), 1);
                        const height = (r.generated / max) * 100;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative">
                                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-all bg-slate-800 text-white text-[10px] p-2 rounded-lg font-black whitespace-nowrap shadow-2xl">৳{r.generated.toLocaleString()}</div>
                                <div className="w-full bg-cyan-600/20 rounded-t-xl group-hover:bg-cyan-500 transition-all relative overflow-hidden" style={{ height: `${height}%` }}>
                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10"></div>
                                </div>
                                <span className="text-[9px] font-black text-slate-500 uppercase rotate-45 mt-4 origin-left truncate w-20">{r.ref_name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
  );

  const renderCommissionLedger = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-slate-900/80 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
            <h3 className="text-xl font-black text-emerald-400 uppercase mb-6 flex items-center gap-3"><MoneyIcon size={24}/> Pay Referrer Commission</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">Referrer Name</label>
                    <select value={newPayment.ref_id} onChange={e=>setNewPayment({...newPayment, ref_id: e.target.value})} className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-white font-bold outline-none focus:border-emerald-500">
                        <option value="">Select PC...</option>
                        {referrars.map(r => <option key={r.ref_id} value={r.ref_id}>{r.ref_name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">Amount</label>
                    <input type="number" value={newPayment.amount} onChange={e=>setNewPayment({...newPayment, amount: parseFloat(e.target.value)})} className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-white font-black outline-none focus:border-emerald-500"/>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">Method</label>
                    <select value={newPayment.method} onChange={e=>setNewPayment({...newPayment, method: e.target.value})} className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-white font-bold">
                        <option>Cash</option><option>bKash</option><option>Bank</option>
                    </select>
                </div>
                <button onClick={()=>{setPayments([{...newPayment, payment_id: `CP-${Date.now()}`} as CommissionPayment, ...payments]); setSuccessMessage("Payment Logged!");}} className="bg-emerald-600 text-white font-black uppercase text-xs p-4 rounded-xl shadow-xl hover:bg-emerald-500 transition-all">Submit Pay</button>
            </div>
        </div>

        <div className="overflow-x-auto rounded-[2rem] border border-slate-800 shadow-2xl bg-slate-900/50">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">
                    <tr><th className="p-5">Referrer</th><th className="p-5">Generated Comm.</th><th className="p-5">Paid Total</th><th className="p-5 text-right">Net Balance</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {referrerLedger.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-5">
                                <p className="font-black text-white text-sm uppercase">{r.ref_name}</p>
                                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">{r.area || 'General Area'}</p>
                            </td>
                            <td className="p-5 font-bold text-slate-300">৳{r.generated.toLocaleString()}</td>
                            <td className="p-5 font-bold text-emerald-400">৳{r.paid.toLocaleString()}</td>
                            <td className="p-5 text-right font-black text-rose-500 text-xl">৳{r.balance.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const handleToggleReferrer = async (staffId: string, refId: string) => {
    const currentRefs = employeeReferrerMap[staffId] || [];
    const isAssigned = currentRefs.includes(refId);
    let newRefs: string[];
    
    if (isAssigned) {
        newRefs = currentRefs.filter(id => id !== refId);
    } else {
        newRefs = [...currentRefs, refId];
    }

    const newMapping = { ...employeeReferrerMap, [staffId]: newRefs };
    
    if (performBlockingSync) {
        const success = await performBlockingSync({ employeeReferrerMap: newMapping });
        if (success) {
            setEmployeeReferrerMap(newMapping);
            setSuccessMessage("Referrer Assignment Updated!");
        }
    } else {
        setEmployeeReferrerMap(newMapping);
        setSuccessMessage("Referrer Assignment Updated (Local Only)!");
    }
  };

  const renderTargetSystem = () => (
    <div className="space-y-8 animate-fade-in">
        <div className="flex justify-center mb-8">
            <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex shadow-2xl">
                <button 
                    onClick={() => setSetupView('mapping')}
                    className={`px-8 py-3 rounded-xl font-black text-xs uppercase transition-all ${setupView === 'mapping' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Referrer Mapping
                </button>
                <button 
                    onClick={() => setSetupView('targets')}
                    className={`px-8 py-3 rounded-xl font-black text-xs uppercase transition-all ${setupView === 'targets' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Set Targets
                </button>
            </div>
        </div>

        {setupView === 'mapping' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800">
                        <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <UsersIcon size={18}/> Select Marketing Staff
                        </h3>
                        
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center justify-between px-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Filter by Area</label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={showAllStaff} 
                                        onChange={e => setShowAllStaff(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Show All Staff</span>
                                </label>
                            </div>
                            <select 
                                value={selectedArea} 
                                onChange={e => setSelectedArea(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-bold outline-none focus:border-blue-500"
                            >
                                {areas.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {marketingStaff.map(s => (
                                <button
                                    key={s.emp_id}
                                    onClick={() => setNewTarget({ ...newTarget, staff_id: s.emp_id })}
                                    className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${newTarget.staff_id === s.emp_id ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-900/20' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}
                                >
                                    <div className="text-left">
                                        <p className={`font-black uppercase text-xs ${newTarget.staff_id === s.emp_id ? 'text-blue-400' : 'text-white'}`}>{s.emp_name}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{s.job_position} • {s.address || 'No Area'}</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${newTarget.staff_id === s.emp_id ? 'border-blue-400 bg-blue-400 text-slate-900' : 'border-slate-700 group-hover:border-slate-500'}`}>
                                        {newTarget.staff_id === s.emp_id && <SaveIcon size={12} />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    {newTarget.staff_id ? (
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                        Assign Referrers to {employees.find(e => e.emp_id === newTarget.staff_id)?.emp_name}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                                        {(employeeReferrerMap[newTarget.staff_id!] || []).length} Referrers Assigned
                                    </p>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search Referrers..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white text-xs font-bold outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {referrars
                                    .filter(r => r.ref_name.toLowerCase().includes(searchTerm.toLowerCase()) || r.area?.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(r => {
                                        const isAssignedToCurrent = (employeeReferrerMap[newTarget.staff_id!] || []).includes(r.ref_id);
                                        const assignedToOther = Object.entries(employeeReferrerMap).find(([sid, refs]) => sid !== newTarget.staff_id && refs.includes(r.ref_id));
                                        
                                        return (
                                            <button
                                                key={r.ref_id}
                                                onClick={() => !assignedToOther && handleToggleReferrer(newTarget.staff_id!, r.ref_id)}
                                                disabled={!!assignedToOther}
                                                className={`p-4 rounded-2xl border transition-all flex items-center justify-between text-left group ${isAssignedToCurrent ? 'bg-emerald-600/20 border-emerald-500' : assignedToOther ? 'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}
                                            >
                                                <div>
                                                    <p className={`font-black uppercase text-xs ${isAssignedToCurrent ? 'text-emerald-400' : 'text-white'}`}>{r.ref_name}</p>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{r.area || 'General Area'}</p>
                                                    {assignedToOther && (
                                                        <p className="text-[8px] text-rose-400 font-black uppercase mt-1">
                                                            Assigned to: {employees.find(e => e.emp_id === assignedToOther[0])?.emp_name}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isAssignedToCurrent ? 'border-emerald-400 bg-emerald-400 text-slate-900' : 'border-slate-700'}`}>
                                                    {isAssignedToCurrent && <SaveIcon size={10} />}
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-slate-800 text-slate-700">
                            <UsersIcon size={64} className="mb-4 opacity-20" />
                            <p className="text-xl font-black uppercase tracking-widest opacity-20">Select a staff member to start mapping</p>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 h-fit">
                    <h3 className="text-lg font-black text-blue-400 uppercase mb-6 flex items-center gap-3"><PlusIcon size={20}/> Set New Target</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 ml-2">Marketing Officer</label>
                            <select value={newTarget.staff_id} onChange={e=>setNewTarget({...newTarget, staff_id: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">
                                <option value="">Select Staff...</option>
                                {marketingStaff.map(s => <option key={s.emp_id} value={s.emp_id}>{s.emp_name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1 ml-2">Patient Count</label><input type="number" value={newTarget.pt_count_target} onChange={e=>setNewTarget({...newTarget, pt_count_target: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-black"/></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1 ml-2">Revenue (৳)</label><input type="number" value={newTarget.revenue_target} onChange={e=>setNewTarget({...newTarget, revenue_target: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-black"/></div>
                        </div>
                        <button onClick={()=>{setTargets([...targets, {...newTarget, id: `TG-${Date.now()}`} as MarketingTarget]); setSuccessMessage("Target Set!");}} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl text-white font-black uppercase text-xs shadow-xl active:scale-95 transition-all mt-4">Assign Goal</button>
                    </div>
                </div>
                <div className="lg:col-span-8 bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800">
                    <h3 className="text-lg font-black text-white uppercase mb-8 flex items-center gap-3"><Activity size={20}/> Monthly Performance Radar</h3>
                    <div className="space-y-8">
                        {targets.map(tg => {
                            const staff = employees.find(e => e.emp_id === tg.staff_id);
                            const assignedRefIds = employeeReferrerMap[tg.staff_id] || [];
                            
                            // Real data calculation
                            const currentPts = labInvoices.filter(inv => assignedRefIds.includes(inv.referrar_id || '')).length;
                            const currentRevenue = labInvoices.filter(inv => assignedRefIds.includes(inv.referrar_id || '')).reduce((sum, inv) => sum + inv.paid_amount, 0);
                            
                            const progress = (currentPts / tg.pt_count_target) * 100;
                            const revProgress = (currentRevenue / tg.revenue_target) * 100;

                            return (
                                <div key={tg.id} className="bg-slate-800/40 p-6 rounded-[2rem] border border-slate-700/50 group hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 font-black">{staff?.emp_name?.charAt(0)}</div>
                                            <div>
                                                <p className="text-white font-black uppercase text-sm">{staff?.emp_name}</p>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{monthOptions[tg.month].name} {tg.year} Goal</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-blue-400">{Math.round(progress)}% Pt | {Math.round(revProgress)}% Rev</p>
                                            <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">{currentPts} / {tg.pt_count_target} Patients</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-[8px] font-black uppercase mb-1">
                                                <span className="text-slate-500">Patient Count</span>
                                                <span className="text-blue-400">{currentPts} / {tg.pt_count_target}</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                                                <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-400" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[8px] font-black uppercase mb-1">
                                                <span className="text-slate-500">Revenue Collection</span>
                                                <span className="text-emerald-400">৳{currentRevenue.toLocaleString()} / ৳{tg.revenue_target.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                                                <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-400" style={{ width: `${Math.min(revProgress, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {targets.length === 0 && <div className="py-20 text-center text-slate-700 italic font-black uppercase opacity-20 text-xl tracking-[0.2em]">No Targets Defined Yet</div>}
                    </div>
                </div>
            </div>
        )}
    </div>
  );

  const renderVisitLogs = () => (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
            <h3 className="text-xl font-black text-indigo-400 uppercase mb-6 flex items-center gap-3"><ClipboardIcon size={24}/> Log Field Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1 ml-2">Marketing Person</label><select value={newVisit.staff_id} onChange={e=>setNewVisit({...newVisit, staff_id: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">{marketingStaff.map(s => <option key={s.emp_id} value={s.emp_id}>{s.emp_name}</option>)}</select></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1 ml-2">Location / Area</label><input value={newVisit.location} onChange={e=>setNewVisit({...newVisit, location: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" placeholder="e.g. Village Market"/></div>
                <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-500 uppercase block mb-1 ml-2">Objective & Result</label><input value={newVisit.objective} onChange={e=>setNewVisit({...newVisit, objective: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" placeholder="e.g. Visited Dr. Rahim to discuss USG referral fee"/></div>
                <button onClick={()=>{setVisits([{...newVisit, visit_id: `VT-${Date.now()}`} as FieldVisitLog, ...visits]); setSuccessMessage("Visit Logged!");}} className="md:col-span-4 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-white font-black uppercase text-xs">Save Field Report</button>
            </div>
        </div>

        <div className="space-y-4">
            {visits.map(v => {
                const staff = employees.find(e => e.emp_id === v.staff_id);
                return (
                    <div key={v.visit_id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex gap-6 items-start hover:bg-slate-800/30 transition-all">
                        <div className="bg-slate-800 p-4 rounded-2xl flex flex-col items-center min-w-[80px] border border-slate-700 shadow-inner">
                            <span className="text-xl font-black text-white">{v.date.split('-')[2]}</span>
                            <span className="text-[10px] font-black text-indigo-400 uppercase">{monthOptions[parseInt(v.date.split('-')[1])-1].name.substring(0,3)}</span>
                        </div>
                        <div className="flex-1">
                            <h5 className="font-black text-indigo-100 uppercase tracking-tighter text-lg">{staff?.emp_name} @ {v.location}</h5>
                            <p className="text-slate-400 mt-2 text-sm leading-relaxed">{v.objective}</p>
                            {v.outcomes && <p className="text-emerald-500/80 text-xs font-bold mt-2 italic flex items-center gap-1"><Activity size={12}/> Result: {v.outcomes}</p>}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );

  return (
    <div className="w-full bg-slate-950 text-slate-100 flex flex-col font-sans pb-32">
      {successMessage && <div className="fixed top-24 right-8 z-[150] bg-emerald-600 border-2 border-emerald-400 text-white px-10 py-4 rounded-2xl shadow-2xl font-black text-lg animate-fade-in-down">✅ {successMessage}</div>}
      
      <header className="bg-slate-900 border-b border-slate-800 p-6 sticky top-0 pt-16 md:pt-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all border border-slate-700">
              <BackIcon className="w-6 h-6 text-cyan-400" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300 uppercase tracking-tighter">Marketing Intelligence</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1">Institutional Growth & Referrer Ops</p>
            </div>
          </div>
          
          <div className="flex bg-slate-800 p-1.5 rounded-[1.5rem] border border-slate-700 shadow-inner">
            <button onClick={() => setActiveTab('marketing_management')} className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === 'marketing_management' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Marketing Management</button>
            <button onClick={() => setActiveTab('analytics')} className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === 'analytics' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500'}`}>Analytics</button>
            <button onClick={() => setActiveTab('commission')} className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === 'commission' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>Commission</button>
            <button onClick={() => setActiveTab('targets')} className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === 'targets' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Targets</button>
            <button onClick={() => setActiveTab('visits')} className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === 'visits' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Visit Logs</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10">
        {activeTab === 'marketing_management' && (
          <ContributionReportPage 
            employees={employees}
            referrars={referrars}
            invoices={labInvoices}
            employeeReferrerMap={employeeReferrerMap}
            setEmployeeReferrerMap={setEmployeeReferrerMap}
          />
        )}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'commission' && renderCommissionLedger()}
        {activeTab === 'targets' && renderTargetSystem()}
        {activeTab === 'visits' && renderVisitLogs()}
      </main>

      <footer className="p-10 bg-slate-900 border-t border-slate-800 text-center mt-20 relative overflow-hidden">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] relative z-10">NCD Intelligence Module • Growth Dashboard v2.0</p>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent blur-sm"></div>
      </footer>
    </div>
  );
};

export default MarketingPage;
