
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Referrar, LabInvoice as Invoice, MarketingTarget } from './DiagnosticData';
import { UsersIcon, TrendingUpIcon, SettingsIcon, BarChart3, MapPinIcon, Target, Calendar, Filter, Search, ChevronRight, DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface ContributionReportPageProps {
  employees: Employee[];
  referrars: Referrar[];
  invoices: Invoice[];
  employeeReferrerMap: Record<string, string[]>;
  setEmployeeReferrerMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

type TimeFilter = 'today' | 'week' | 'month' | 'custom';

const timeFilters: { id: TimeFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

// --- Sub-Component: Marketing Setup (Linking Manager to Referrers) ---
const MarketingSetup: React.FC<{
    employees: Employee[];
    referrars: Referrar[];
    mapping: Record<string, string[]>;
    setMapping: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
    targets: MarketingTarget[];
    setTargets: React.Dispatch<React.SetStateAction<MarketingTarget[]>>;
}> = ({ employees, referrars, mapping, setMapping, targets, setTargets }) => {
    const [selectedManagerId, setSelectedManagerId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [areaFilter, setAreaFilter] = useState('');
    const [empSearchTerm, setEmpSearchTerm] = useState('');
    const [empAreaFilter, setEmpAreaFilter] = useState('');
    const [showAllEmployees, setShowAllEmployees] = useState(false);
    const [setupView, setSetupView] = useState<'mapping' | 'targets'>('mapping');

    // Filter active employees. 
    const activeEmployees = useMemo(() => {
        if (!Array.isArray(employees)) return [];
        let list = employees.filter(e => e && e.status === 'Active');
        if (!showAllEmployees) {
            list = list.filter(e => 
                (e.job_position && e.job_position.toLowerCase().includes('marketing')) || 
                (e.department && e.department.toLowerCase().includes('marketing'))
            );
        }
        return list;
    }, [employees, showAllEmployees]);

    const filteredEmployees = useMemo(() => {
        return activeEmployees.filter(emp => {
            const matchesSearch = emp.emp_name.toLowerCase().includes(empSearchTerm.toLowerCase()) || 
                                 emp.emp_id.toLowerCase().includes(empSearchTerm.toLowerCase());
            const matchesArea = !empAreaFilter || (emp.address && emp.address.toLowerCase().includes(empAreaFilter.toLowerCase()));
            return matchesSearch && matchesArea;
        });
    }, [activeEmployees, empSearchTerm, empAreaFilter]);

    const areas = useMemo(() => {
        const uniqueAreas = Array.from(new Set(referrars.map(r => r.area).filter(Boolean)));
        return uniqueAreas.sort();
    }, [referrars]);

    const handleToggleReferrer = (refId: string) => {
        if (!selectedManagerId) return;
        
        setMapping(prev => {
            const currentList = prev[selectedManagerId] || [];
            const isAssigned = currentList.includes(refId);
            
            let newList;
            if (isAssigned) {
                newList = currentList.filter(id => id !== refId);
            } else {
                newList = [...currentList, refId];
            }
            
            return { ...prev, [selectedManagerId]: newList };
        });
    };

    const assignedReferrerIds = selectedManagerId ? (mapping[selectedManagerId] || []) : [];

    const filteredReferrars = referrars.filter(r => {
        const matchesSearch = r.ref_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             r.ref_id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesArea = !areaFilter || r.area === areaFilter;
        return matchesSearch && matchesArea;
    });

    const currentTarget = targets.find(t => t.staff_id === selectedManagerId && t.month === new Date().getMonth() && t.year === new Date().getFullYear());

    const handleUpdateTarget = (field: 'pt_count_target' | 'revenue_target', value: number) => {
        if (!selectedManagerId) return;
        const month = new Date().getMonth();
        const year = new Date().getFullYear();
        
        setTargets(prev => {
            const existingIdx = prev.findIndex(t => t.staff_id === selectedManagerId && t.month === month && t.year === year);
            if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = { ...updated[existingIdx], [field]: value };
                return updated;
            } else {
                return [...prev, {
                    id: `TG-${Date.now()}`,
                    staff_id: selectedManagerId,
                    month,
                    year,
                    pt_count_target: field === 'pt_count_target' ? value : 0,
                    revenue_target: field === 'revenue_target' ? value : 0
                }];
            }
        });
    };

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-blue-400" />
                    Marketing Team Configuration
                </h3>
                <div className="flex bg-slate-900 rounded-lg p-1">
                    <button 
                        onClick={() => setSetupView('mapping')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${setupView === 'mapping' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                    >
                        Referrer Mapping
                    </button>
                    <button 
                        onClick={() => setSetupView('targets')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${setupView === 'targets' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                    >
                        Set Targets
                    </button>
                </div>
            </div>
            
            <div className="mb-6 space-y-4">
                <div className="flex justify-between items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Select Marketing Manager</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="relative sm:col-span-1">
                                <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Search Employee..." 
                                    value={empSearchTerm}
                                    onChange={e => setEmpSearchTerm(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md pl-8 pr-2 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="relative sm:col-span-1">
                                <MapPinIcon className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
                                <select 
                                    value={empAreaFilter}
                                    onChange={e => setEmpAreaFilter(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md pl-8 pr-2 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">All Areas (Emp)</option>
                                    {areas.map(area => <option key={area} value={area}>{area}</option>)}
                                </select>
                            </div>
                            <div className="sm:col-span-1 flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="showAllEmp"
                                    checked={showAllEmployees}
                                    onChange={e => setShowAllEmployees(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-500 text-blue-600 bg-slate-800 focus:ring-blue-500"
                                />
                                <label htmlFor="showAllEmp" className="text-xs text-slate-400 cursor-pointer">Show All Staff</label>
                            </div>
                        </div>
                    </div>
                </div>

                <select 
                    value={selectedManagerId} 
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                >
                    <option value="">-- Select Manager ({filteredEmployees.length} found) --</option>
                    {filteredEmployees.map(emp => (
                        <option key={emp.emp_id} value={emp.emp_id}>{emp.emp_name} ({emp.job_position || emp.department})</option>
                    ))}
                </select>
            </div>

            {selectedManagerId ? (
                setupView === 'mapping' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-slate-300">Assign Referrers</span>
                            <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                                {assignedReferrerIds.length} Assigned
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Search Name/ID..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded pl-8 pr-2 py-2 text-sm text-white"
                                />
                            </div>
                            <div className="relative">
                                <MapPinIcon className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
                                <select 
                                    value={areaFilter}
                                    onChange={e => setAreaFilter(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded pl-8 pr-2 py-2 text-sm text-white outline-none"
                                >
                                    <option value="">All Areas</option>
                                    {areas.map(area => <option key={area} value={area}>{area}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-900/50 rounded-lg border border-slate-700 p-2 space-y-1">
                            {filteredReferrars.length > 0 ? filteredReferrars.map(ref => {
                                const isChecked = assignedReferrerIds.includes(ref.ref_id);
                                const assignedToOther = Object.entries(mapping).find(([mgrId, refs]) => mgrId !== selectedManagerId && (refs as string[]).includes(ref.ref_id));
                                const otherManagerName = assignedToOther ? employees.find(e => e.emp_id === assignedToOther[0])?.emp_name : null;

                                return (
                                    <div 
                                        key={ref.ref_id} 
                                        onClick={() => !otherManagerName && handleToggleReferrer(ref.ref_id)}
                                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                            otherManagerName ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'
                                        } ${isChecked ? 'bg-blue-900/30 border border-blue-500/30' : ''}`}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked} 
                                            readOnly
                                            disabled={!!otherManagerName}
                                            className="h-4 w-4 rounded border-gray-500 text-blue-600 bg-slate-800 focus:ring-blue-500"
                                        />
                                        <div className="ml-3 flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className={`text-sm font-medium ${isChecked ? 'text-blue-300' : 'text-slate-300'}`}>
                                                    {ref.ref_name}
                                                </p>
                                                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{ref.area || 'No Area'}</span>
                                            </div>
                                            <p className="text-xs text-slate-500">{ref.ref_degrees}</p>
                                            {otherManagerName && (
                                                <p className="text-[10px] text-amber-500">Assigned to: {otherManagerName}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="p-8 text-center text-slate-600 italic text-sm">No referrers found matching your criteria.</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                            <h4 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Monthly Targets (Current Month)
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Patient Count Target</label>
                                    <input 
                                        type="number" 
                                        value={currentTarget?.pt_count_target || 0}
                                        onChange={e => handleUpdateTarget('pt_count_target', parseInt(e.target.value) || 0)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white font-bold"
                                        placeholder="e.g. 100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Revenue Target (BDT)</label>
                                    <input 
                                        type="number" 
                                        value={currentTarget?.revenue_target || 0}
                                        onChange={e => handleUpdateTarget('revenue_target', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white font-bold"
                                        placeholder="e.g. 50000"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-4 italic">Targets are used to track performance in the Analytics Dashboard.</p>
                        </div>
                    </div>
                )
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm italic">
                    Select a manager to configure team and targets.
                </div>
            )}
        </div>
    );
};

// --- Sub-Component: Bar Chart (Reused) ---
const BarChart: React.FC<{ title: string; data: { name: string; value: number }[]; color: string; unit?: string }> = ({ title, data, color, unit = '' }) => {
    const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  
    return (
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md flex flex-col h-full">
        <h4 className="text-lg font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-700">{title}</h4>
        {data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
             <p>No data available for this period.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {data.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs sm:text-sm text-slate-300 font-medium">
                    <span className="truncate pr-2" title={item.name}>{item.name}</span>
                    <span className="font-bold text-slate-100">
                        {unit === 'BDT' ? item.value.toLocaleString('en-IN') : item.value} {unit === 'BDT' ? '৳' : ''}
                    </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
                        style={{ width: `${(item.value / maxValue) * 100}%` }}
                    ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
};

// --- Sub-Component: Marketing Dashboard ---
const MarketingDashboard: React.FC<{
    employees: Employee[];
    referrars: Referrar[];
    invoices: Invoice[];
    mapping: Record<string, string[]>;
    targets: MarketingTarget[];
}> = ({ employees, referrars, invoices, mapping, targets }) => {
    const [selectedManagerId, setSelectedManagerId] = useState<string>('');
    const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('month');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    // Filter Active Managers who have referrers assigned
    const managersWithTeam = employees.filter(e => mapping[e.emp_id] && mapping[e.emp_id].length > 0);

    const getFilteredInvoices = () => {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        switch (selectedFilter) {
            case 'today':
                startDate.setHours(0,0,0,0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'custom':
                if (customRange.start) startDate = new Date(customRange.start);
                if (customRange.end) endDate = new Date(customRange.end);
                break;
        }

        startDate.setHours(0,0,0,0);
        endDate.setHours(23,59,59,999);

        return invoices.filter(inv => {
            const invDate = new Date(inv.invoice_date);
            return invDate >= startDate && invDate <= endDate && inv.status !== 'Cancelled';
        });
    };

    const filteredInvoices = getFilteredInvoices();
    const assignedRefs = useMemo(() => selectedManagerId ? (mapping[selectedManagerId] || []) : [], [selectedManagerId, mapping]);
    const currentTarget = useMemo(() => targets.find(t => t.staff_id === selectedManagerId && t.month === new Date().getMonth() && t.year === new Date().getFullYear()), [selectedManagerId, targets]);

    // Calculate Stats
    const stats = useMemo(() => {
        let totalPatients = 0;
        let totalBill = 0;
        let totalPaid = 0;
        let totalDue = 0;
        let totalCommission = 0;
        
        const referrerBreakdown: Record<string, { id: string, patients: number, bill: number, paid: number, due: number, commission: number, area: string }> = {};
        const areaBreakdown: Record<string, { patients: number, bill: number }> = {};

        // Initialize assigned referrers
        assignedRefs.forEach(refId => {
            const ref = referrars.find(r => r.ref_id === refId);
            const refName = ref?.ref_name || refId;
            referrerBreakdown[refName] = { id: refId, patients: 0, bill: 0, paid: 0, due: 0, commission: 0, area: ref?.area || 'Unknown' };
        });

        filteredInvoices.forEach(inv => {
            if (inv.referrar_id && assignedRefs.includes(inv.referrar_id)) {
                totalPatients++;
                totalBill += inv.total_amount;
                totalPaid += inv.paid_amount;
                totalDue += inv.due_amount;
                totalCommission += (inv.special_commission || 0);

                const ref = referrars.find(r => r.ref_id === inv.referrar_id);
                const refName = inv.referrar_name || ref?.ref_name || 'Unknown';
                const area = ref?.area || 'Unknown';

                if (!referrerBreakdown[refName]) {
                    referrerBreakdown[refName] = { id: inv.referrar_id, patients: 0, bill: 0, paid: 0, due: 0, commission: 0, area };
                }
                
                referrerBreakdown[refName].patients += 1;
                referrerBreakdown[refName].bill += inv.total_amount;
                referrerBreakdown[refName].paid += inv.paid_amount;
                referrerBreakdown[refName].due += inv.due_amount;
                referrerBreakdown[refName].commission += (inv.special_commission || 0);

                if (!areaBreakdown[area]) areaBreakdown[area] = { patients: 0, bill: 0 };
                areaBreakdown[area].patients += 1;
                areaBreakdown[area].bill += inv.total_amount;
            }
        });

        const sortedByBill = Object.entries(referrerBreakdown)
            .map(([name, data]) => ({ 
                name, 
                value: data.bill, 
                avgBill: data.patients > 0 ? data.bill / data.patients : 0,
                commPercent: data.bill > 0 ? (data.commission / data.bill) * 100 : 0,
                ...data 
            }))
            .sort((a, b) => b.value - a.value);

        const areaStats = Object.entries(areaBreakdown)
            .map(([name, data]) => ({ name, value: data.bill, patients: data.patients }))
            .sort((a, b) => b.value - a.value);

        return { totalPatients, totalBill, totalPaid, totalDue, totalCommission, sortedByBill, areaStats };
    }, [filteredInvoices, assignedRefs, referrars]);

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Control Bar */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
                <div className="w-full lg:w-1/4">
                    <label className="block text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Marketing Manager</label>
                    <select 
                        value={selectedManagerId} 
                        onChange={(e) => setSelectedManagerId(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">-- Select Manager --</option>
                        {managersWithTeam.map(emp => (
                            <option key={emp.emp_id} value={emp.emp_id}>{emp.emp_name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                    {selectedFilter === 'custom' && (
                        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                            <input 
                                type="date" 
                                value={customRange.start} 
                                onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bg-transparent text-xs text-white p-1 outline-none"
                            />
                            <span className="text-slate-600">-</span>
                            <input 
                                type="date" 
                                value={customRange.end} 
                                onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                className="bg-transparent text-xs text-white p-1 outline-none"
                            />
                        </div>
                    )}
                    <div className="flex bg-slate-900 rounded-lg p-1 overflow-x-auto max-w-full">
                        {timeFilters.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setSelectedFilter(filter.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                                    selectedFilter === filter.id
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {selectedManagerId ? (
                <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                    {/* Manager Performance Summary */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <UsersIcon className="w-24 h-24" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">
                                    {employees.find(e => e.emp_id === selectedManagerId)?.emp_name}
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <MapPinIcon className="w-3 h-3" />
                                    {employees.find(e => e.emp_id === selectedManagerId)?.address || 'No Area Assigned'}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <div className="bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold">Assigned Referrers</p>
                                        <p className="text-lg font-black text-blue-400">{assignedRefs.length}</p>
                                    </div>
                                    <div className="bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold">Avg. Revenue/Pt</p>
                                        <p className="text-lg font-black text-emerald-400">
                                            ৳{stats.totalPatients > 0 ? Math.round(stats.totalBill / stats.totalPatients).toLocaleString() : 0}
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold">Overall Comm. %</p>
                                        <p className="text-lg font-black text-amber-400">
                                            {stats.totalBill > 0 ? ((stats.totalCommission / stats.totalBill) * 100).toFixed(1) : 0}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {currentTarget && (
                                <div className="w-full md:w-1/3 space-y-3">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                                            <span className="text-slate-400">Patient Target</span>
                                            <span className="text-blue-400">{stats.totalPatients} / {currentTarget.pt_count_target}</span>
                                        </div>
                                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500 rounded-full" 
                                                style={{ width: `${Math.min((stats.totalPatients / currentTarget.pt_count_target) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                                            <span className="text-slate-400">Revenue Target</span>
                                            <span className="text-emerald-400">৳{stats.totalBill.toLocaleString()} / ৳{currentTarget.revenue_target.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 rounded-full" 
                                                style={{ width: `${Math.min((stats.totalBill / currentTarget.revenue_target) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Patients</p>
                            <div className="flex items-end justify-between">
                                <h4 className="text-2xl font-black text-white">{stats.totalPatients}</h4>
                                {currentTarget && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stats.totalPatients >= currentTarget.pt_count_target ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'}`}>
                                        {Math.round((stats.totalPatients / currentTarget.pt_count_target) * 100)}% of Target
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Bill</p>
                            <h4 className="text-2xl font-black text-blue-400">৳{stats.totalBill.toLocaleString()}</h4>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Paid</p>
                            <h4 className="text-2xl font-black text-emerald-400">৳{stats.totalPaid.toLocaleString()}</h4>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Commission</p>
                            <h4 className="text-2xl font-black text-amber-400">৳{stats.totalCommission.toLocaleString()}</h4>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Area Performance */}
                        <div className="lg:col-span-1">
                            <BarChart 
                                title="Area-wise Distribution" 
                                data={stats.areaStats.map(a => ({ name: a.name, value: a.value }))} 
                                color="bg-cyan-500" 
                                unit="BDT" 
                            />
                        </div>
                        {/* Referrer Performance */}
                        <div className="lg:col-span-2">
                            <BarChart 
                                title="Top Referrers by Revenue" 
                                data={stats.sortedByBill.slice(0, 10).map(r => ({ name: r.name, value: r.value }))} 
                                color="bg-blue-500" 
                                unit="BDT" 
                            />
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Detailed Referrer Output</h4>
                            <span className="text-[10px] text-slate-500 font-bold">{stats.sortedByBill.length} Referrers Active</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-900/50 text-slate-500 uppercase font-bold border-b border-slate-700">
                                    <tr>
                                        <th className="p-3">Referrer</th>
                                        <th className="p-3">Area</th>
                                        <th className="p-3 text-center">Patients</th>
                                        <th className="p-3 text-right">Bill</th>
                                        <th className="p-3 text-right">Avg/Pt</th>
                                        <th className="p-3 text-right">Paid</th>
                                        <th className="p-3 text-right">Due</th>
                                        <th className="p-3 text-right text-amber-400">Comm.</th>
                                        <th className="p-3 text-right text-slate-400">%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {stats.sortedByBill.map((r, i) => (
                                        <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="p-3">
                                                <p className="font-bold text-slate-200">{r.name}</p>
                                                <p className="text-[9px] text-slate-500">{r.id}</p>
                                            </td>
                                            <td className="p-3 text-slate-400">{r.area}</td>
                                            <td className="p-3 text-center font-bold">{r.patients}</td>
                                            <td className="p-3 text-right font-medium">৳{r.bill.toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-400">৳{Math.round(r.avgBill).toLocaleString()}</td>
                                            <td className="p-3 text-right text-emerald-400 font-medium">৳{r.paid.toLocaleString()}</td>
                                            <td className="p-3 text-right text-rose-400 font-medium">৳{r.due.toLocaleString()}</td>
                                            <td className="p-3 text-right text-amber-400 font-bold">৳{r.commission.toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-500 font-bold">{r.commPercent.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                    <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg">Select a Marketing Manager to view detailed analytics.</p>
                    <p className="text-sm">Assign referrers in the "Team Setup" tab to see their performance here.</p>
                </div>
            )}
        </div>
    );
};

// --- Main Page ---
const ContributionReportPage: React.FC<ContributionReportPageProps> = ({
  employees,
  referrars,
  invoices,
  employeeReferrerMap,
  setEmployeeReferrerMap,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup'>('dashboard');
  const [targets, setTargets] = useState<MarketingTarget[]>(() => {
      const saved = localStorage.getItem('ncd_mkt_targets_v2');
      return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
      localStorage.setItem('ncd_mkt_targets_v2', JSON.stringify(targets));
  }, [targets]);

  return (
    <div className="bg-slate-900 text-slate-200 rounded-xl p-4 sm:p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 shrink-0">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-cyan-400" />
            Marketing Management
        </h2>
        <div className="flex bg-slate-800 rounded-lg p-1">
            <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                    activeTab === 'dashboard' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
            >
                Analytics Dashboard
            </button>
            <button
                onClick={() => setActiveTab('setup')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                    activeTab === 'setup' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
            >
                Team Setup
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
          {activeTab === 'setup' ? (
              <MarketingSetup 
                  employees={employees} 
                  referrars={referrars} 
                  mapping={employeeReferrerMap} 
                  setMapping={setEmployeeReferrerMap} 
                  targets={targets}
                  setTargets={setTargets}
              />
          ) : (
              <MarketingDashboard 
                  employees={employees} 
                  referrars={referrars} 
                  invoices={invoices} 
                  mapping={employeeReferrerMap} 
                  targets={targets}
              />
          )}
      </div>
    </div>
  );
};

export default ContributionReportPage;
