import React, { useState, useEffect, useMemo } from 'react';
import { Patient, emptyPatient } from './DiagnosticData'; 
import { formatDateTime } from '../utils/dateUtils'; 

interface PatientInfoPageProps {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  isEmbedded?: boolean; 
  onClose?: () => void; 
  onSaveAndSelect?: (id: string, name: string) => void; 
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

// --- Robust ID Generation Helper ---
const generateUniquePatientId = (existingPatients: Patient[] = []): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `${year}-${month}-${day}`;
  
  const safePatients = Array.isArray(existingPatients) ? existingPatients : [];
  let maxCounter = 0;
  safePatients.forEach(p => {
    if (p && p.pt_id && typeof p.pt_id === 'string' && p.pt_id.startsWith(datePrefix)) {
      const match = p.pt_id.match(/\((\d+)\)$/);
      if (match && match[1]) {
        const count = parseInt(match[1], 10);
        if (!isNaN(count) && count > maxCounter) {
          maxCounter = count;
        }
      }
    }
  });
  return `${datePrefix}(${String(maxCounter + 1).padStart(5, '0')})`;
};

// --- Address Distribution Chart ---
const AddressPieChart: React.FC<{ patients: Patient[], onAreaClick?: (area: string) => void }> = ({ patients, onAreaClick }) => {
    const addressCounts = useMemo(() => {
        const safePatients = Array.isArray(patients) ? patients : [];
        const counts: Record<string, number> = {};
        safePatients.forEach(p => {
            if (!p) return;
            const addr = p.address ? p.address.trim() : 'Unknown';
            counts[addr] = (counts[addr] || 0) + 1;
        });
        return counts;
    }, [patients]);

    const total = Array.isArray(patients) ? patients.length : 0;
    
    // Group small areas into "Others" if too many
    const sortedData = Object.entries(addressCounts)
        .map(([name, value]) => ({ name, value: Number(value) }))
        .sort((a, b) => b.value - a.value);
        
    const topAreas = sortedData.slice(0, 7);
    const others = sortedData.slice(7).reduce((acc, curr) => acc + curr.value, 0);
    
    const displayData = others > 0 
        ? [...topAreas, { name: 'Others', value: others }]
        : topAreas;

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
        '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316'
    ];

    const slices = useMemo(() => {
        return displayData.map((item, index) => {
            const percent = item.value / (total || 1);
            const startPercent = displayData.slice(0, index).reduce((sum, it) => sum + (it.value / (total || 1)), 0);
            const endPercent = startPercent + percent;
            
            const startX = Math.cos(2 * Math.PI * startPercent);
            const startY = Math.sin(2 * Math.PI * startPercent);
            const endX = Math.cos(2 * Math.PI * endPercent);
            const endY = Math.sin(2 * Math.PI * endPercent);
            
            const largeArcFlag = percent > 0.5 ? 1 : 0;
            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
            return { pathData, color: colors[index % colors.length], ...item, percent };
        });
    }, [displayData, total]);

    if (total === 0) return <div className="text-center text-slate-500 py-10">No Area Data</div>;

    return (
        <div className="flex flex-col items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800 h-full shadow-xl">
            <div className="w-full mb-4">
                <h3 className="text-lg font-bold text-white text-center">Area Distribution</h3>
                <p className="text-xs text-slate-400 text-center">Top areas by patient count</p>
            </div>
            <div className="relative w-40 h-40 mb-6">
                <svg viewBox="-1.1 -1.1 2.2 2.2" className="transform -rotate-90 w-full h-full drop-shadow-md">
                    <circle cx="0" cy="0" r="1.0" fill="transparent" />
                    {slices.map((slice, i) => (
                        <path 
                            key={i} 
                            d={slice.pathData} 
                            fill={slice.color} 
                            className="hover:opacity-80 transition-opacity cursor-pointer" 
                            onClick={() => onAreaClick && slice.name !== 'Others' && onAreaClick(slice.name)}
                        >
                            <title>{`${slice.name}: ${slice.value} (${(slice.percent * 100).toFixed(1)}%)`}</title>
                        </path>
                    ))}
                    {/* Inner hole for donut chart look */}
                    <circle cx="0" cy="0" r="0.6" fill="#0f172a" />
                    <circle cx="0" cy="0" r="0.65" className="fill-slate-900" />
                    <text x="0" y="-0.05" textAnchor="middle" dominantBaseline="middle" className="fill-white font-bold" fontSize="0.35">
                        {total}
                    </text>
                    <text x="0" y="0.25" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 font-bold" fontSize="0.12">
                        PATIENTS
                    </text>
                </svg>
            </div>
            <div className="w-full overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                <table className="w-full text-xs text-left">
                    <thead className="text-slate-500 sticky top-0 bg-slate-900">
                        <tr>
                            <th className="py-2 font-medium">Area</th>
                            <th className="py-2 font-medium text-right">Count</th>
                            <th className="py-2 font-medium text-right">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {slices.map((slice, i) => (
                            <tr key={i} className="hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => onAreaClick && slice.name !== 'Others' && onAreaClick(slice.name)}>
                                <td className="py-2 flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }}></div>
                                    <span className="truncate max-w-[90px] text-slate-300" title={slice.name}>{slice.name}</span>
                                </td>
                                <td className="py-2 text-right font-medium text-white">{slice.value}</td>
                                <td className="py-2 text-right text-slate-400">{(slice.percent * 100).toFixed(0)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PatientInfoPage: React.FC<PatientInfoPageProps> = ({ 
  patients, setPatients, isEmbedded = false, onClose, onSaveAndSelect, performBlockingSync 
}) => {
  const [formData, setFormData] = useState<Patient>(() => {
    const initialId = generateUniquePatientId(patients);
    return {
      ...emptyPatient,
      pt_id: initialId,
      date_modified: formatDateTime(new Date())
    };
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- ID GENERATION LOGIC ---
  const handleGetNewId = React.useCallback(() => {
    const newId = generateUniquePatientId(patients);
    setFormData({
      ...emptyPatient,
      pt_id: newId,
      date_modified: formatDateTime(new Date())
    });
    setSelectedPatientId(null);
    setIsEditing(false);
    setMobileError('');
    setErrorMessage('');
  }, [patients]);

  const safePatients = useMemo(() => {
    const map = new Map<string, Patient>();
    (Array.isArray(patients) ? patients : []).forEach(p => {
      if (p && p.pt_id) map.set(p.pt_id, p);
    });
    return Array.from(map.values());
  }, [patients]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return safePatients;
    
    const term = searchTerm.toLowerCase().trim();
    return safePatients.filter(patient =>
      patient && (
        (patient.pt_name || '').toLowerCase().includes(term) ||
        (patient.pt_id || '').toLowerCase().includes(term) ||
        (patient.mobile || '').includes(term) ||
        (patient.address || '').toLowerCase().includes(term) ||
        (patient.thana || '').toLowerCase().includes(term) ||
        (patient.district || '').toLowerCase().includes(term)
      )
    );
  }, [searchTerm, safePatients]);

  const uniqueNames = useMemo(() => Array.from(new Set((Array.isArray(patients) ? patients : []).filter(p => p && typeof p === 'object').map(p => p?.pt_name).filter(Boolean))).slice(0, 100), [patients]);
  const uniqueAddresses = useMemo(() => Array.from(new Set((Array.isArray(patients) ? patients : []).filter(p => p && typeof p === 'object').map(p => p?.address).filter(Boolean))).slice(0, 50), [patients]);
  const uniqueThanas = useMemo(() => Array.from(new Set((Array.isArray(patients) ? patients : []).filter(p => p && typeof p === 'object').map(p => p?.thana).filter(Boolean))).slice(0, 50), [patients]);
  const uniqueDistricts = useMemo(() => Array.from(new Set((Array.isArray(patients) ? patients : []).filter(p => p && typeof p === 'object').map(p => p?.district).filter(Boolean))).slice(0, 50), [patients]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000); 
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000); 
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Ensure ID is present if empty without resetting typed inputs
  useEffect(() => {
    if (!formData.pt_id) {
      setFormData(prev => ({
        ...prev,
        pt_id: generateUniquePatientId(patients),
        date_modified: formatDateTime(new Date())
      }));
    }
  }, [patients, formData.pt_id]);

  // --- AGE CALCULATION LOGIC ---
  const calculateAge = (dobY: string, dobM: string, dobD: string) => {
    const y = parseInt(dobY, 10);
    const m = parseInt(dobM, 10) || 1;
    const d = parseInt(dobD, 10) || 1;
    
    if (!y || isNaN(y) || y < 1900) return { ageY: '', ageM: '', ageD: '' };
    
    // Prevent future dates
    const today = new Date();
    const birthDate = new Date(y, m - 1, d);
    if (birthDate > today) return { ageY: '0', ageM: '0', ageD: '0' };
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return { 
      ageY: String(Math.max(0, years)), 
      ageM: String(Math.max(0, months)), 
      ageD: String(Math.max(0, days)) 
    };
  };

  // --- DOB CALCULATION LOGIC ---
  const calculateDOB = (ageY: string, ageM: string, ageD: string) => {
    const years = parseInt(ageY, 10) || 0;
    const months = parseInt(ageM, 10) || 0;
    const days = parseInt(ageD, 10) || 0;
    
    if (years === 0 && months === 0 && days === 0) return { dobY: '', dobM: '', dobD: '' };
    if (years < 0 || months < 0 || days < 0) return { dobY: '', dobM: '', dobD: '' };
    
    const today = new Date();
    const dob = new Date();
    
    dob.setFullYear(today.getFullYear() - years);
    dob.setMonth(today.getMonth() - months);
    dob.setDate(today.getDate() - days);
    
    return { 
        dobY: String(dob.getFullYear()), 
        dobM: String(dob.getMonth() + 1).padStart(2, '0'), 
        dobD: String(dob.getDate()).padStart(2, '0') 
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let updatedData = { ...formData, [name]: value };

    if (['pt_name', 'address', 'thana', 'district', 'co_name'].includes(name) && value.length > 0) {
      const titleCased = value.replace(/(?:^|\s)\S/g, match => match.toUpperCase());
      updatedData = { ...updatedData, [name]: titleCased };
    }

    if (['dobY', 'dobM', 'dobD'].includes(name)) {
      if (name === 'dobY' && value.length === 4) {
        const { ageY, ageM, ageD } = calculateAge(value, formData.dobM, formData.dobD);
        updatedData = { ...updatedData, ageY, ageM, ageD };
      } else if (name !== 'dobY' && formData.dobY.length === 4) {
        const { ageY, ageM, ageD } = calculateAge(formData.dobY, name === 'dobM' ? value : formData.dobM, name === 'dobD' ? value : formData.dobD);
        updatedData = { ...updatedData, ageY, ageM, ageD };
      }
    } else if (['ageY', 'ageM', 'ageD'].includes(name)) {
      const { dobY, dobM, dobD } = calculateDOB(
        name === 'ageY' ? value : formData.ageY, 
        name === 'ageM' ? value : formData.ageM, 
        name === 'ageD' ? value : formData.ageD
      );
      updatedData = { ...updatedData, dobY, dobM, dobD };
    }

    if (name === 'mobile') {
      setMobileError(''); 
      const digits = value.replace(/\D/g, '').slice(0, 11);
      let formatted = digits;
      if (digits.length >= 5) formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
      setFormData({ ...updatedData, mobile: formatted });
    } else {
      setFormData(updatedData);
    }
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = (formData.pt_name || '').trim();
    if (!trimmedName) {
      setErrorMessage('রোগীর নাম দেওয়া আবশ্যক (Patient Name is required).');
      return;
    }

    const safePatients = Array.isArray(patients) ? patients : [];
    let targetPtId = (formData.pt_id || '').trim();
    
    // Ensure unique valid ID
    if (!targetPtId || (!isEditing && safePatients.some(p => p && p.pt_id === targetPtId))) {
      targetPtId = generateUniquePatientId(safePatients);
    }
    
    // Validation
    const ageYNum = parseInt(formData.ageY, 10) || 0;
    if (ageYNum < 0) {
      setErrorMessage('Age cannot be negative.');
      return;
    }
    
    const currentDateTime = formatDateTime(new Date()); 
    const updatedPatient: Patient = { 
      ...formData, 
      pt_id: targetPtId,
      pt_name: trimmedName,
      date_modified: currentDateTime 
    };
    
    let newPatients: Patient[];
    if (isEditing && selectedPatientId) {
      newPatients = safePatients.map(p => (p && p.pt_id === selectedPatientId) ? updatedPatient : p);
    } else {
      newPatients = [updatedPatient, ...safePatients.filter(p => p && p.pt_id !== targetPtId)];
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Persist to cloud with blocking sync first to ensure data is safely stored in Supabase
    let cloudSuccess = true;
    let syncErrorDetail = '';
    try {
      if (performBlockingSync) {
        const res = await performBlockingSync({ patients: newPatients });
        if (res === false) {
          cloudSuccess = false;
        }
      } else {
        cloudSuccess = await dbService.syncPatientsToModularTable(newPatients);
      }
    } catch (err: any) {
      console.error("Patient save sync error:", err);
      cloudSuccess = false;
      syncErrorDetail = err?.message || '';
    } finally {
      setIsSaving(false);
    }

    if (!cloudSuccess) {
      setErrorMessage(
        `❌ সুপাবেজ ক্লাউড ডাটাবেজে রোগীর তথ্য সেভ হতে ব্যর্থ হয়েছে! ${syncErrorDetail ? `(${syncErrorDetail})` : ''} দয়া করে ইন্টারনেট ও Supabase কানেকশন চেক করে আবার চেষ্টা করুন।`
      );
      // Keep form intact so user doesn't lose inputs; do not silently fake success
      return;
    }

    // Immediately update local state on verified cloud success
    setPatients(newPatients);
    setSuccessMessage(`✓ রোগী "${trimmedName}" (ID: ${targetPtId}) সফলভাবে ক্লাউড ডাটাবেজে (Supabase) সংরক্ষিত হয়েছে!`);

    // Trigger parent selection callback
    if (isEmbedded && onSaveAndSelect) {
      onSaveAndSelect(targetPtId, updatedPatient.pt_name);
    }

    const nextId = generateUniquePatientId(newPatients);
    setFormData({ ...emptyPatient, pt_id: nextId, date_modified: formatDateTime(new Date()) });
    setSelectedPatientId(null);
    setIsEditing(false);
    if (onClose && isEmbedded) {
      onClose();
    }
  };
  
  const handleDelete = async () => {
      if (!selectedPatientId) return;
      const safePatients = Array.isArray(patients) ? patients : [];
      const newPatients = safePatients.filter(x => x.pt_id !== selectedPatientId);
      
      if (performBlockingSync) {
          const success = await performBlockingSync({ patients: newPatients });
          if (!success) {
              setErrorMessage('Failed to delete patient from database.');
              setShowDeleteConfirm(false);
              return;
          }
      }
      
      setPatients(newPatients);
      setFormData(emptyPatient);
      setSelectedPatientId(null);
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setSuccessMessage('Patient deleted successfully.');
  };

  const [showNameDropdown, setShowNameDropdown] = useState(false);

  const inputBaseClasses = "py-2 px-3 mt-1 block w-full border border-sky-400/80 rounded-md shadow-sm text-sm font-semibold bg-[#0a192f] text-white placeholder-sky-200/50 focus:bg-slate-900 focus:ring-2 focus:ring-blue-400 focus:border-blue-400";
  const labelBaseClasses = "block text-sm font-bold text-sky-200";
  const actionButtonClasses = "px-4 py-2 text-sm font-bold rounded-md flex justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 transition-colors min-w-[100px]";

  return (
    <div className={`bg-slate-900 text-slate-100 rounded-xl px-4 sm:px-6 pb-6 pt-2 space-y-6 ${isEmbedded ? '!p-0 !space-y-0 !bg-transparent' : ''}`}>
        {/* Notifications */}
        {isSaving && (
            <div className="fixed top-5 right-5 z-[999999] bg-cyan-700/95 backdrop-blur-md border border-cyan-400 text-white px-6 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="font-black text-sm tracking-wide">ডাটা সেভ হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন...</span>
            </div>
        )}
        {successMessage && (
            <div className="fixed bottom-5 right-5 z-[999999] bg-green-600/95 backdrop-blur-sm border border-green-500 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center transition-transform animate-fade-in-up">
                <span className="font-semibold">{successMessage}</span>
            </div>
        )}
        {errorMessage && (
            <div className="fixed bottom-5 right-5 z-[999999] bg-red-600/95 backdrop-blur-sm border border-red-500 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center transition-transform animate-fade-in-up">
                <span className="font-semibold">{errorMessage}</span>
            </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-2">Delete Patient?</h3>
                    <p className="text-slate-400 text-sm mb-4">
                        Are you sure you want to permanently delete this patient?
                    </p>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mb-6">
                        <div className="font-mono text-xs text-blue-400 mb-1">{formData.pt_id}</div>
                        <div className="font-bold text-slate-200">{formData.pt_name}</div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-lg font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors">Cancel</button>
                        <button onClick={handleDelete} className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20">Yes, Delete</button>
                    </div>
                </div>
            </div>
        )}
      
      <div className="flex flex-col xl:flex-row gap-6">
          {!isEmbedded && (Array.isArray(patients) ? patients : []).length > 0 && (
              <div className="w-full xl:w-1/4 min-w-[260px] order-2 xl:order-1">
                  <AddressPieChart patients={patients} onAreaClick={(area) => setSearchTerm(area)} />
              </div>
          )}
          
          <div className={`flex-1 order-1 xl:order-2 bg-sky-950/70 rounded-xl p-4 sm:p-6 ${isEmbedded ? '!p-0 !bg-transparent !border-0 !shadow-none' : 'border border-sky-700/80 shadow-xl'}`}>
            
            {/* Inline Error Notice */}
            {errorMessage && (
                <div className="mb-4 bg-red-950/60 border border-red-500/80 text-red-200 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between">
                    <span>⚠️ {errorMessage}</span>
                    <button type="button" onClick={() => setErrorMessage('')} className="text-xs text-red-400 hover:text-white ml-2 underline">Dismiss</button>
                </div>
            )}
            
            {/* Header Area with Title on Left and Scan/Search on Right */}
            {!isEmbedded && (
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-sky-700/80">
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight shrink-0">Patient Information</h2>
                    
                    <div className="flex-1"></div>

                    <div className="flex items-center gap-3">
                        <input 
                            type="text" 
                            placeholder="📷 Scan Barcode..." 
                            onChange={(e) => {
                                const val = e.target.value.trim();
                                if(val) {
                                    const found = patients.find(p => p.pt_id === val);
                                    if(found) {
                                        setFormData(found);
                                        setSelectedPatientId(found.pt_id);
                                        setIsEditing(false);
                                        e.target.value = '';
                                    }
                                }
                            }} 
                            className="py-1.5 px-3 bg-blue-950/50 border border-blue-500/50 rounded-md text-xs text-blue-100 placeholder-blue-300 w-44" 
                            title="Click here and scan barcode"
                        />
                        <input 
                            type="search" 
                            placeholder="Search Name / ID / Mobile..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="py-1.5 px-3 bg-sky-950/80 border border-sky-700/60 rounded-md text-xs text-white placeholder-slate-400 w-56" 
                        />
                    </div>
                </div>
            )}

            {/* Action Bar */}
            {!isEmbedded && (
                <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-950/40 p-3 rounded-xl border border-sky-700/40">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-400 text-sm hidden sm:inline">Pt. ID:</span>
                        <input type="text" disabled value={formData.pt_id} className="w-36 sm:w-44 border border-sky-700/60 rounded-md shadow-sm text-sm font-bold px-3 py-1.5 bg-slate-950 text-sky-300 cursor-not-allowed select-all" />
                    </div>
                    
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar min-w-[280px]">
                        <button type="button" onClick={handleGetNewId} disabled={isSaving} className={`${actionButtonClasses} text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20 disabled:opacity-50`}>Add New</button>
                        <button type="submit" form="patient-form" disabled={isSaving} className={`${actionButtonClasses} text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5`}>
                          {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                          <span>{isSaving ? 'সেভ হচ্ছে...' : 'Save'}</span>
                        </button>
                        <button type="button" onClick={() => { if(selectedPatientId) { const p = patients.find(x => x.pt_id === selectedPatientId); if(p) { setFormData(p); setIsEditing(true); } } }} disabled={!selectedPatientId} className={`${actionButtonClasses} text-slate-900 bg-amber-400 hover:bg-amber-500 disabled:opacity-30 disabled:bg-slate-700 disabled:text-slate-500`}>Edit</button>
                        <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={!selectedPatientId} className={`${actionButtonClasses} text-white bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:bg-slate-700 disabled:text-slate-500`}>Delete</button>
                    </div>
                </div>
            )}
            
            {isEmbedded ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left Column: Patient Information Entry Box (Matching Main Patient Info Form) */}
                    <div className="lg:col-span-5 bg-slate-900/95 p-4 sm:p-5 rounded-2xl border border-slate-700 shadow-2xl flex flex-col justify-between">
                        <form id="patient-form" onSubmit={handleSavePatient}>
                            {/* Top ID Bar with "Add New" button */}
                            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Patient ID:</span>
                                    <span className="font-mono text-sm font-black text-sky-300 bg-slate-950 px-2.5 py-1 rounded border border-sky-800/60 shadow-inner">
                                        {formData.pt_id || 'Generating...'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGetNewId}
                                    className="px-3 py-1 bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold rounded shadow transition-all flex items-center gap-1"
                                    title="Generate new unique patient ID"
                                >
                                    <span>+ নতুন রোগী (New)</span>
                                </button>
                            </div>

                            <div className="space-y-3.5">
                                {/* Patient Name (Live Search indicator) */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-sky-200">Patient Name *</label>
                                        <span className="text-[10px] text-emerald-400 font-medium">টাইপ করলে ডানে সার্চ হবে</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        name="pt_name" 
                                        value={formData.pt_name} 
                                        onChange={handleInputChange} 
                                        required 
                                        autoComplete="off"
                                        className={`${inputBaseClasses} py-2 px-3`} 
                                        placeholder="রোগীর নাম লিখুন..." 
                                    />
                                </div>
                                
                                {/* Gender & Care Of */}
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-4">
                                        <label className="text-xs font-bold text-sky-200 mb-1 block">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-2`}>
                                            <option value="" className="bg-slate-900">Select</option>
                                            <option value="Male" className="bg-slate-900">Male</option>
                                            <option value="Female" className="bg-slate-900">Female</option>
                                        </select>
                                    </div>
                                    <div className="col-span-8">
                                        <label className="text-xs font-bold text-sky-200 mb-1 block">Care Of (Guardian)</label>
                                        <div className="flex items-center gap-1.5">
                                            <select name="co_pref" value={formData.co_pref} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-1.5 w-[72px] shrink-0`}>
                                                <option value="S/O" className="bg-slate-900">S/O</option>
                                                <option value="D/O" className="bg-slate-900">D/O</option>
                                                <option value="W/O" className="bg-slate-900">W/O</option>
                                            </select>
                                            <input type="text" name="co_name" value={formData.co_name} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-2.5 flex-1 min-w-0`} placeholder="অভিভাবকের নাম" />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Age (Y / M / D) */}
                                <div>
                                  <label className="text-xs font-bold text-sky-200 mb-1 block">Age (বছর / মাস / দিন)</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    <input type="number" min="0" max="150" name="ageY" placeholder="Years" value={formData.ageY} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-1.5 text-center font-bold text-sky-300`} />
                                    <input type="number" min="0" max="11" name="ageM" placeholder="Months" value={formData.ageM} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-1.5 text-center text-slate-300`} />
                                    <input type="number" min="0" max="30" name="ageD" placeholder="Days" value={formData.ageD} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-1.5 text-center text-slate-300`} />
                                  </div>
                                </div>

                                {/* Address / Village / Area (Live Search) */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-sky-200">Address / Village / Area (গ্রাম / এলাকা)</label>
                                        <span className="text-[10px] text-sky-400">গ্রাম লিখলে ডানে ফিল্টার হবে</span>
                                    </div>
                                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-3`} list="addressOptions" placeholder="গ্রাম / মহল্লা / রোড নম্বর..." />
                                </div>
                                
                                {/* Thana & District (Live Search) */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-sky-200 mb-1 block">Thana / Upazila (থানা)</label>
                                        <input type="text" name="thana" value={formData.thana} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-3`} list="thanaOptions" placeholder="থানা" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-sky-200 mb-1 block">District (জেলা)</label>
                                        <input type="text" name="district" value={formData.district} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-3`} list="districtOptions" placeholder="জেলা" />
                                    </div>
                                </div>
                                
                                {/* Mobile Number & Relation (Live Search) */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-sky-200">Mobile Number & Relation</label>
                                        <span className="text-[10px] text-emerald-400 font-mono">01XXX-XXXXXX</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select 
                                            name="relation" 
                                            value={formData.relation || 'Self'} 
                                            onChange={handleInputChange} 
                                            className={`${inputBaseClasses} py-2 px-2 w-[100px] shrink-0 text-xs`}
                                        >
                                            <option value="Self" className="bg-slate-900">Self (নিজের)</option>
                                            <option value="Husband" className="bg-slate-900">Husband</option>
                                            <option value="Father" className="bg-slate-900">Father</option>
                                            <option value="Mother" className="bg-slate-900">Mother</option>
                                            <option value="Guardian" className="bg-slate-900">Guardian</option>
                                        </select>
                                        <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="01XXXXXXXXX" className={`${inputBaseClasses} py-2 px-3 flex-1 font-mono tracking-wider text-emerald-300 font-bold`} />
                                    </div>
                                    {mobileError && <p className="text-red-400 text-xs mt-1 font-medium">{mobileError}</p>}
                                </div>

                                {/* Form Action Buttons */}
                                <div className="flex flex-wrap items-center justify-between gap-2 mt-5 pt-4 border-t border-slate-800">
                                    <div className="flex gap-2">
                                        <button 
                                            type="button" 
                                            onClick={handleGetNewId} 
                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-all"
                                        >
                                            Clear / New
                                        </button>
                                        {selectedPatientId && onSaveAndSelect && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const p = patients.find(x => x.pt_id === selectedPatientId);
                                                    if (p) onSaveAndSelect(p.pt_id, p.pt_name);
                                                }}
                                                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow transition-all"
                                            >
                                                ইনভয়েসে নিন ✓
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button 
                                            type="button" 
                                            onClick={onClose} 
                                            disabled={isSaving} 
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-700"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={isSaving} 
                                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-1.5"
                                        >
                                            {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                            <span>{isSaving ? 'সেভ হচ্ছে...' : 'Save Patient (সেভ)'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Excel Sheet-like Patient Spreadsheet Table with Eye-protective Grey Theme */}
                    <div className="lg:col-span-7 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[640px]">
                        {/* Excel Table Header Bar */}
                        <div className="bg-slate-850 px-4 py-2.5 border-b border-slate-700 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                                <span className="text-xs font-black text-slate-200 uppercase tracking-wider font-mono">
                                    EXCEL PATIENT DATABASE ({filteredPatients.length} Entries)
                                </span>
                            </div>
                            <span className="text-[11px] text-sky-400 font-medium">
                                রো-তে ক্লিক করলে ফর্ম ও ইনভয়েসে লোড হবে
                            </span>
                        </div>

                        {/* Excel Grid Table with Eye-Protective Grey cells */}
                        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar bg-slate-900">
                            <table className="w-full text-xs text-left border-collapse border border-slate-700 font-sans">
                                <thead className="bg-slate-800 text-slate-200 font-bold sticky top-0 border-b-2 border-slate-600 shadow-sm z-10 select-none">
                                    <tr className="divide-x divide-slate-700">
                                        <th className="px-2.5 py-2 text-center w-10 text-[10px] text-slate-400">#</th>
                                        <th className="px-2.5 py-2 text-sky-300 whitespace-nowrap">Pt. ID</th>
                                        <th className="px-3 py-2 text-white whitespace-nowrap min-w-[130px]">Patient Name</th>
                                        <th className="px-2.5 py-2 text-amber-300 whitespace-nowrap">Age/Sex</th>
                                        <th className="px-2.5 py-2 text-slate-300 whitespace-nowrap">Care Of</th>
                                        <th className="px-2.5 py-2 text-emerald-300 whitespace-nowrap font-mono">Mobile</th>
                                        <th className="px-3 py-2 text-slate-300 whitespace-nowrap min-w-[120px]">Village / Address</th>
                                        <th className="px-2.5 py-2 text-slate-300 whitespace-nowrap">Thana / District</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-slate-900 text-slate-200">
                                    {filteredPatients.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium bg-slate-900/90">
                                                <p className="text-sm font-semibold text-slate-300">কোনো রোগী পাওয়া যায়নি!</p>
                                                <p className="text-xs text-slate-500 mt-1">বামপাশের ফর্মে নতুন তথ্য পূরণ করে "Save Patient" বাটনে ক্লিক করুন।</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPatients.slice(0, 150).map((pat, pIdx) => {
                                            const isSelected = selectedPatientId === pat.pt_id;
                                            return (
                                                <tr 
                                                    key={pat.pt_id || pIdx}
                                                    onClick={() => {
                                                        setFormData(pat);
                                                        setSelectedPatientId(pat.pt_id);
                                                        setIsEditing(false);
                                                    }}
                                                    onDoubleClick={() => {
                                                        setFormData(pat);
                                                        setSelectedPatientId(pat.pt_id);
                                                        if (onSaveAndSelect) {
                                                            onSaveAndSelect(pat.pt_id, pat.pt_name);
                                                        }
                                                    }}
                                                    className={`divide-x divide-slate-800 cursor-pointer transition-colors border-b border-slate-800 select-none ${
                                                        isSelected 
                                                            ? 'bg-blue-950/70 border-l-4 border-l-sky-400 font-semibold' 
                                                            : 'hover:bg-slate-800/80 even:bg-slate-900 odd:bg-slate-850/40'
                                                    }`}
                                                    title="ডাবল ক্লিক করলে ইনভয়েসে চলে যাবে"
                                                >
                                                    <td className="px-2.5 py-2 text-center text-[10px] text-slate-500 font-mono">
                                                        {pIdx + 1}
                                                    </td>
                                                    <td className="px-2.5 py-2 font-mono text-cyan-300 font-bold whitespace-nowrap">
                                                        {pat.pt_id}
                                                    </td>
                                                    <td className="px-3 py-2 text-white font-bold whitespace-nowrap">
                                                        {pat.pt_name}
                                                    </td>
                                                    <td className="px-2.5 py-2 text-slate-200 whitespace-nowrap">
                                                        {pat.gender ? `${pat.gender}, ` : ''}
                                                        <span className="text-amber-300 font-bold">{pat.ageY ? `${pat.ageY}Y` : ''}</span>
                                                    </td>
                                                    <td className="px-2.5 py-2 text-slate-300 whitespace-nowrap text-xs">
                                                        {pat.co_name ? `${pat.co_pref || 'S/O'} ${pat.co_name}` : '—'}
                                                    </td>
                                                    <td className="px-2.5 py-2 text-emerald-300 font-mono font-bold whitespace-nowrap">
                                                        {pat.mobile || '—'}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-300 truncate max-w-[140px]" title={pat.address}>
                                                        {pat.address || '—'}
                                                    </td>
                                                    <td className="px-2.5 py-2 text-slate-300 whitespace-nowrap text-xs">
                                                        {pat.thana || ''}
                                                        {pat.district ? `, ${pat.district}` : ''}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Excel Status Bar Footer */}
                        <div className="bg-slate-850 px-4 py-2 border-t border-slate-700 flex justify-between items-center text-[11px] text-slate-400 shrink-0">
                            <span>মোট রেকর্ড: <strong className="text-white">{filteredPatients.length}</strong></span>
                            {selectedPatientId && (
                                <span className="text-emerald-400 font-medium">
                                    নির্বাচিত: <strong className="font-mono">{selectedPatientId}</strong>
                                </span>
                            )}
                            <span className="text-slate-400">ডাবল-ক্লিক = ইনভয়েসে ট্রান্সফার</span>
                        </div>
                    </div>
                </div>
            ) : (
                <form id="patient-form" onSubmit={handleSavePatient}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                        <div className="space-y-4">
                            {/* Excel-style Instant Match Patient Name Input */}
                            <div className="relative">
                                <label className={labelBaseClasses}>Patient Name * (টাইপ করলেই অফ-হোয়াইট টেবিল শো হবে)</label>
                                <input 
                                    type="text" 
                                    name="pt_name" 
                                    value={formData.pt_name} 
                                    onChange={(e) => {
                                        handleInputChange(e);
                                        setShowNameDropdown(true);
                                    }}
                                    onFocus={() => setShowNameDropdown(true)}
                                    required 
                                    autoComplete="off"
                                    className={`${inputBaseClasses} py-2 px-3`} 
                                    placeholder="নাম লিখে খুঁজুন বা নতুন নাম দিন..." 
                                />
                                
                                {showNameDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowNameDropdown(false)} />
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-[#faf9f6] border-2 border-sky-500 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto custom-scrollbar text-slate-900">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-200 text-slate-700 font-bold sticky top-0 border-b border-slate-300">
                                                    <tr>
                                                        <th className="p-2">ID</th>
                                                        <th className="p-2">Name</th>
                                                        <th className="p-2">Age</th>
                                                        <th className="p-2">Gender</th>
                                                        <th className="p-2">Care Of</th>
                                                        <th className="p-2">Mobile</th>
                                                        <th className="p-2">Address</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 font-medium">
                                                    {safePatients
                                                      .filter(p => p && p.pt_name && (!formData.pt_name || p.pt_name.toLowerCase().includes(formData.pt_name.toLowerCase()) || p.pt_id?.toLowerCase().includes(formData.pt_name.toLowerCase()) || p.mobile?.includes(formData.pt_name)))
                                                      .slice(0, 20)
                                                      .map((pat, pIdx) => (
                                                        <tr 
                                                            key={`${pat.pt_id || pIdx}-${pIdx}`}
                                                            onClick={() => {
                                                                setFormData(pat);
                                                                setSelectedPatientId(pat.pt_id);
                                                                setIsEditing(false);
                                                                setShowNameDropdown(false);
                                                            }}
                                                            className="hover:bg-sky-100 cursor-pointer transition-colors"
                                                        >
                                                            <td className="p-2 font-mono text-blue-800 font-bold">{pat.pt_id}</td>
                                                            <td className="p-2 font-bold text-slate-900">{pat.pt_name}</td>
                                                            <td className="p-2 text-slate-700">{pat.ageY ? `${pat.ageY}Y` : ''}</td>
                                                            <td className="p-2 text-slate-700">{pat.gender || ''}</td>
                                                            <td className="p-2 text-slate-700">{pat.co_name ? `${pat.co_pref || 'S/O'} ${pat.co_name}` : ''}</td>
                                                            <td className="p-2 font-mono text-emerald-800 font-semibold">{pat.mobile}</td>
                                                            <td className="p-2 text-slate-600 truncate max-w-[120px]">{pat.address}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="w-full sm:w-1/3">
                                    <label className={labelBaseClasses}>Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-2.5`}>
                                        <option value="" className="bg-slate-900">Select</option>
                                        <option value="Male" className="bg-slate-900">Male</option>
                                        <option value="Female" className="bg-slate-900">Female</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className={labelBaseClasses}>Care Of</label>
                                    <div className="flex items-center gap-2">
                                        <select name="co_pref" value={formData.co_pref} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-2 w-[85px] shrink-0`}>
                                            <option value="S/O" className="bg-slate-900">S/O</option>
                                            <option value="D/O" className="bg-slate-900">D/O</option>
                                            <option value="W/O" className="bg-slate-900">W/O</option>
                                        </select>
                                        <input type="text" name="co_name" value={formData.co_name} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-3 flex-1 min-w-0`} placeholder="Guardian Name" />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                              <label className={labelBaseClasses}>Age (Y / M / D)</label>
                              <div className="grid grid-cols-3 gap-2">
                                <input type="number" min="0" max="150" name="ageY" placeholder="Years" value={formData.ageY} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-2 text-center`} />
                                <input type="number" min="0" max="11" name="ageM" placeholder="Months" value={formData.ageM} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-2 text-center`} />
                                <input type="number" min="0" max="30" name="ageD" placeholder="Days" value={formData.ageD} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-2 text-center`} />
                              </div>
                            </div>
                            
                            <div>
                              <label className={labelBaseClasses}>Date of Birth (YYYY / MM / DD)</label>
                              <div className="grid grid-cols-3 gap-2">
                                <input type="number" name="dobY" placeholder="YYYY" value={formData.dobY} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-2 text-center`} />
                                <select name="dobM" value={formData.dobM} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-1`}>
                                  <option value="" className="bg-slate-900">MM</option>
                                  {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                                </select>
                                <select name="dobD" value={formData.dobD} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-1`}>
                                  <option value="" className="bg-slate-900">DD</option>
                                  {Array.from({length: 31}, (_, i) => String(i + 1).padStart(2, '0')).map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                                </select>
                              </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className={labelBaseClasses}>Address / Village / Area</label>
                                <input type="text" name="address" value={formData.address} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-3`} list="addressOptions" placeholder="House / Area details" />
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="w-full sm:w-1/2">
                                    <label className={labelBaseClasses}>Thana / Upazila</label>
                                    <input type="text" name="thana" value={formData.thana} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-3`} list="thanaOptions" placeholder="Thana" />
                                </div>
                                <div className="w-full sm:w-1/2">
                                    <label className={labelBaseClasses}>District</label>
                                    <input type="text" name="district" value={formData.district} onChange={handleInputChange} className={`${inputBaseClasses} py-2 px-3`} list="districtOptions" placeholder="District" />
                                </div>
                            </div>
                            
                            <div>
                                <label className={labelBaseClasses}>Mobile Number & Relation</label>
                                <div className="flex items-center gap-2">
                                    <select 
                                        name="relation" 
                                        value={formData.relation || 'Self'} 
                                        onChange={handleInputChange} 
                                        className={`${inputBaseClasses} py-2 px-2 w-[115px] shrink-0`}
                                    >
                                        <option value="Self" className="bg-slate-900">Self (নিজের)</option>
                                        <option value="Husband" className="bg-slate-900">Husband (স্বামী)</option>
                                        <option value="Father" className="bg-slate-900">Father (পিতা)</option>
                                        <option value="Mother" className="bg-slate-900">Mother (মাতা)</option>
                                        <option value="Guardian" className="bg-slate-900">Guardian (অভিভাবক)</option>
                                    </select>
                                    <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="01XXX-XXXXXX" className={`${inputBaseClasses} py-2 px-3 flex-1 font-mono tracking-wider`} />
                                </div>
                                {mobileError && <p className="text-red-400 text-xs mt-1.5 font-medium">{mobileError}</p>}
                            </div>
                        </div>
                    </div>
                </form>
            )}
          </div>
      </div>

      {!isEmbedded && (
        <div className="border border-slate-700 rounded-xl shadow-xl bg-slate-900 overflow-hidden mt-2">
            {/* Desktop Table (Hidden on smaller screens) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider whitespace-nowrap">Barcode</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider whitespace-nowrap">Pt_ID</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider whitespace-nowrap">Name</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider whitespace-nowrap">Gender/Age</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider whitespace-nowrap">Mobile</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider whitespace-nowrap">Address</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider whitespace-nowrap">Thana/District</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900 divide-y divide-slate-800">
                    {filteredPatients.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm font-semibold">No patients found.</td></tr>
                    ) : (
                        (Array.isArray(filteredPatients) ? filteredPatients : []).filter(p => p && p.pt_id).slice(0, 100).map((patient, pIdx) => (
                          <tr
                            key={`${patient.pt_id || pIdx}-${pIdx}`}
                            onClick={() => { setFormData(patient); setSelectedPatientId(patient.pt_id); setIsEditing(false); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                            className={`cursor-pointer transition-colors ${selectedPatientId === patient.pt_id ? 'bg-blue-900/40 border-l-2 border-l-blue-400' : 'hover:bg-slate-800/80 even:bg-slate-900/70 odd:bg-slate-850/40 border-l-2 border-l-transparent'}`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                                <img 
                                    src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(patient.pt_id)}&scale=1&height=5&incltext=false`} 
                                    alt="Barcode" 
                                    className="h-6 invert opacity-85 contrast-125 mix-blend-screen" 
                                />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-sky-300 font-mono tracking-tight font-bold">{patient.pt_id}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-bold">{patient.pt_name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-200">
                                {patient.gender && <span>{patient.gender}, </span>}
                                <span className="font-bold text-amber-300">{patient.ageY}Y</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-emerald-300 font-mono font-bold">{patient.mobile}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-200 font-medium truncate max-w-[150px]">{patient.address}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-300 font-medium">
                                {patient.thana}
                                {patient.district && <span className="text-slate-400">, {patient.district}</span>}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
                {filteredPatients.length > 100 && (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-950/70 border-t border-slate-700 font-medium">
                        Showing first 100 results. Please refine your search.
                    </div>
                )}
            </div>
            
            {/* Mobile List View (Cards) */}
            <div className="md:hidden divide-y divide-slate-800 bg-slate-900">
                {filteredPatients.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm font-medium">No patients found.</div>
                ) : (
                    (Array.isArray(filteredPatients) ? filteredPatients : []).filter(p => p && p.pt_id).slice(0, 50).map((patient, pIdx) => (
                        <div 
                            key={`${patient.pt_id || pIdx}-${pIdx}`}
                            onClick={() => { setFormData(patient); setSelectedPatientId(patient.pt_id); setIsEditing(false); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                            className={`p-4 cursor-pointer transition-colors ${selectedPatientId === patient.pt_id ? 'bg-blue-900/40 border-l-4 border-l-blue-400' : 'hover:bg-slate-800/80 border-l-4 border-l-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-1.5 gap-2">
                                <h4 className="text-base font-bold text-white leading-tight">{patient.pt_name}</h4>
                                <div className="text-xs font-mono font-bold text-sky-300 shrink-0 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-700/60">{patient.pt_id}</div>
                            </div>
                            
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-xs font-bold text-slate-200 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                                    {patient.gender ? `${patient.gender}, ` : ''}{patient.ageY}Y
                                </div>
                                <div className="text-sm font-mono text-emerald-300 font-bold">
                                    {patient.mobile}
                                </div>
                            </div>
                            
                            <div className="text-[13px] text-slate-300 flex flex-wrap gap-x-1.5 leading-snug mt-2 pt-2 border-t border-slate-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 mt-0.5 text-sky-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span>{patient.address}</span>
                                {patient.thana && <span>• {patient.thana}</span>}
                                {patient.district && <span className="opacity-80">• {patient.district}</span>}
                            </div>
                        </div>
                    ))
                )}
                {filteredPatients.length > 50 && (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-950/70 border-t border-slate-700 font-medium">
                        Showing first 50 results. Use search for more.
                    </div>
                )}
            </div>
          </div>
      )}

      {/* Hidden Datalists for Auto-completion */}
      <datalist id="patientNamesOptions">{uniqueNames.map((name, i) => <option key={i} value={name} />)}</datalist>
      <datalist id="addressOptions">{uniqueAddresses.map((addr, i) => <option key={i} value={addr} />)}</datalist>
      <datalist id="thanaOptions">{uniqueThanas.map((thana, i) => <option key={i} value={thana} />)}</datalist>
      <datalist id="districtOptions">{uniqueDistricts.map((dist, i) => <option key={i} value={dist} />)}</datalist>
    </div>
  );
};

export default PatientInfoPage;
