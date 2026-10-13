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

  const filteredPatients = useMemo(() => {
    const safePatients = (Array.isArray(patients) ? patients : []).filter(p => p && typeof p === 'object' && p.pt_id);
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
  }, [searchTerm, patients]);

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

    // Immediately update local state so invoice form gets the new patient without lag
    setPatients(newPatients);
    setSuccessMessage('পেশেন্ট সফলভাবে সেভ হয়েছে!');

    // Trigger parent selection callback immediately
    if (isEmbedded && onSaveAndSelect) {
      onSaveAndSelect(targetPtId, updatedPatient.pt_name);
    }

    // Persist to cloud in background / with blocking sync
    if (performBlockingSync) {
      try {
        await performBlockingSync({ patients: newPatients });
      } catch (err) {
        console.error("Patient save sync error:", err);
      }
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

  const inputBaseClasses = "block w-full border border-slate-700 rounded-md shadow-sm text-sm sm:text-base lg:text-lg font-semibold bg-slate-800 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-shadow";
  const labelBaseClasses = "block text-xs sm:text-sm font-bold text-slate-200 mb-1.5";
  const actionButtonClasses = "px-3 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold rounded-md flex justify-center items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all active:scale-95";

  return (
    <div className={`bg-slate-950 text-slate-200 rounded-xl px-3 sm:px-6 pb-6 pt-2 space-y-6 ${isEmbedded ? '!p-0 !space-y-0 !bg-transparent' : ''}`}>
        {/* Notifications */}
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
          
          <div className={`flex-1 order-1 xl:order-2 bg-slate-900 rounded-xl p-4 sm:p-6 ${isEmbedded ? 'border-2 border-blue-600/50 mt-1' : 'border border-slate-800 shadow-xl'}`}>
            
            {/* Embedded Mode Header Banner */}
            {isEmbedded && (
                <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">নতুন রোগী নিবন্ধন (New Patient)</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-blue-500/40">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase">Patient ID:</span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-blue-400">{formData.pt_id || 'Generating...'}</span>
                    </div>
                </div>
            )}

            {/* Inline Error Notice */}
            {errorMessage && (
                <div className="mb-4 bg-red-950/60 border border-red-500/80 text-red-200 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between">
                    <span>⚠️ {errorMessage}</span>
                    <button type="button" onClick={() => setErrorMessage('')} className="text-xs text-red-400 hover:text-white ml-2 underline">Dismiss</button>
                </div>
            )}
            
            {/* Header Area */}
            {!isEmbedded && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Patient Information</h2>
                    
                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-xs font-medium">
                        <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-slate-500 mr-2">Total Patients:</span>
                            <span className="text-blue-400">{(Array.isArray(patients) ? patients : []).length.toLocaleString()}</span>
                        </div>
                        {searchTerm && (
                            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                                <span className="text-slate-500 mr-2">Search Result:</span>
                                <span className="text-emerald-400">{filteredPatients.length.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Mobile-friendly Search Box (Full width on mobile) */}
            {!isEmbedded && (
                <div className="w-full mb-6 block lg:hidden space-y-3">
                    <div>
                        <label className={labelBaseClasses}>📷 Scan Barcode</label>
                        <input 
                            type="text" 
                            placeholder="Tap here and scan..." 
                            onChange={(e) => {
                                const val = e.target.value.trim();
                                if(val) {
                                    const found = patients.find(p => p.pt_id === val);
                                    if(found) {
                                        setFormData(found);
                                        setSelectedPatientId(found.pt_id);
                                        setIsEditing(false);
                                        e.target.value = '';
                                        window.scrollTo({top: 0, behavior: 'smooth'});
                                    }
                                }
                            }} 
                            className={`${inputBaseClasses} py-2.5 px-4 bg-blue-950/50 border-blue-500/50 placeholder-blue-300 text-blue-100`} 
                        />
                    </div>
                    <div>
                        <label className={labelBaseClasses}>Search Patient</label>
                        <input 
                            type="search" 
                            placeholder="Search Name / ID / Mobile / Area" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className={`${inputBaseClasses} py-2.5 px-4 bg-slate-950/50`} 
                        />
                    </div>
                </div>
            )}

            {/* Action Bar */}
            {!isEmbedded && (
                <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-950/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-400 text-sm hidden sm:inline">Pt. ID:</span>
                        <input type="text" disabled value={formData.pt_id} className="w-36 sm:w-44 border border-slate-800 rounded-md shadow-sm text-sm font-bold px-3 py-2 bg-slate-950/80 text-blue-400 cursor-not-allowed select-all" />
                    </div>
                    
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar min-w-[280px]">
                        <button type="button" onClick={handleGetNewId} className={`${actionButtonClasses} text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20`}>Add New</button>
                        <button type="submit" form="patient-form" className={`${actionButtonClasses} text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20`}>Save</button>
                        <button type="button" onClick={() => { if(selectedPatientId) { const p = patients.find(x => x.pt_id === selectedPatientId); if(p) { setFormData(p); setIsEditing(true); } } }} disabled={!selectedPatientId} className={`${actionButtonClasses} text-slate-900 bg-amber-400 hover:bg-amber-500 disabled:opacity-30 disabled:bg-slate-700 disabled:text-slate-500`}>Edit</button>
                        <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={!selectedPatientId} className={`${actionButtonClasses} text-white bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:bg-slate-700 disabled:text-slate-500`}>Delete</button>
                    </div>

                    <div className="hidden lg:flex w-auto gap-2">
                        <div className="relative w-64">
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
                                            e.target.value = ''; // clear after scan
                                        }
                                    }
                                }} 
                                className={`${inputBaseClasses} py-2 px-3 bg-blue-950/50 border-blue-500/50 placeholder-blue-300 text-blue-100 focus:ring-blue-400`} 
                                title="Click here and scan barcode"
                            />
                        </div>
                        <input 
                            type="search" 
                            placeholder="Search Name / ID / Mobile / Area" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className={`${inputBaseClasses} py-2 px-3 w-64`} 
                        />
                    </div>
                </div>
            )}
            
            <form id="patient-form" onSubmit={handleSavePatient}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-5">
                        <div>
                            <label className={labelBaseClasses}>Patient Name *</label>
                            <input type="text" name="pt_name" value={formData.pt_name} onChange={handleInputChange} required className={`${inputBaseClasses} py-2.5 px-3.5`} list="patientNamesOptions" placeholder="Full Name" />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="w-full sm:w-1/3">
                                <label className={labelBaseClasses}>Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleInputChange} className={`${inputBaseClasses} py-2.5 px-3`}>
                                    <option value="" className="bg-slate-900">Select</option>
                                    <option value="Male" className="bg-slate-900">Male</option>
                                    <option value="Female" className="bg-slate-900">Female</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className={labelBaseClasses}>Care Of</label>
                                <div className="flex items-center gap-2">
                                    <select name="co_pref" value={formData.co_pref} onChange={handleInputChange} className={`${inputBaseClasses} py-2.5 px-2 w-[85px] shrink-0`}>
                                        <option value="S/O" className="bg-slate-900">S/O</option>
                                        <option value="D/O" className="bg-slate-900">D/O</option>
                                        <option value="W/O" className="bg-slate-900">W/O</option>
                                    </select>
                                    <input type="text" name="co_name" value={formData.co_name} onChange={handleInputChange} className={`${inputBaseClasses} py-2.5 px-3 flex-1 min-w-0`} placeholder="Guardian Name" />
                                </div>
                            </div>
                        </div>
                        
                        <div>
                          <label className={labelBaseClasses}>Age (Y / M / D)</label>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <input type="number" min="0" max="150" name="ageY" placeholder="Years" value={formData.ageY} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-2.5 text-center`} />
                            <input type="number" min="0" max="11" name="ageM" placeholder="Months" value={formData.ageM} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-2.5 text-center`} />
                            <input type="number" min="0" max="30" name="ageD" placeholder="Days" value={formData.ageD} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-2.5 text-center`} />
                          </div>
                        </div>
                        
                        <div>
                          <label className={labelBaseClasses}>Date of Birth (YYYY / MM / DD)</label>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <input type="number" name="dobY" placeholder="YYYY" value={formData.dobY} onChange={handleInputChange} onFocus={e => e.target.select()} className={`${inputBaseClasses} py-2.5 text-center`} />
                            <select name="dobM" value={formData.dobM} onChange={handleInputChange} className={`${inputBaseClasses} py-2.5 px-1 sm:px-2`}>
                              <option value="" className="bg-slate-900">MM</option>
                              {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                            </select>
                            <select name="dobD" value={formData.dobD} onChange={handleInputChange} className={`${inputBaseClasses} py-2.5 px-1 sm:px-2`}>
                              <option value="" className="bg-slate-900">DD</option>
                              {Array.from({length: 31}, (_, i) => String(i + 1).padStart(2, '0')).map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                            </select>
                          </div>
                        </div>
                    </div>
                    
                    <div className="space-y-5">
                        <div>
                            <label className={labelBaseClasses}>Address / Village / Area</label>
                            <input type="text" name="address" value={formData.address} onChange={handleInputChange} className={`${inputBaseClasses} py-2.5 px-3.5`} list="addressOptions" placeholder="House / Area details" />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="w-full sm:w-1/2">
                                <label className={labelBaseClasses}>Thana / Upazila</label>
                                <input type="text" name="thana" value={formData.thana} onChange={handleInputChange} className={`${inputBaseClasses} py-2.5 px-3`} list="thanaOptions" placeholder="Thana" />
                            </div>
                            <div className="w-full sm:w-1/2">
                                <label className={labelBaseClasses}>District</label>
                                <input type="text" name="district" value={formData.district} onChange={handleInputChange} className={`${inputBaseClasses} py-2.5 px-3`} list="districtOptions" placeholder="District" />
                            </div>
                        </div>
                        
                        <div>
                            <label className={labelBaseClasses}>Mobile Number</label>
                            <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="01XXX-XXXXXX" className={`${inputBaseClasses} py-2.5 px-3.5 font-mono tracking-wider`} />
                            {mobileError && <p className="text-red-400 text-xs mt-1.5 font-medium">{mobileError}</p>}
                        </div>
                    </div>
                </div>
                
                {isEmbedded && (
                    <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-800/80">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-900/20">Save Patient</button>
                    </div>
                )}
            </form>
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
                        (Array.isArray(filteredPatients) ? filteredPatients : []).filter(p => p && p.pt_id).slice(0, 100).map((patient) => (
                          <tr
                            key={patient.pt_id}
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
                    (Array.isArray(filteredPatients) ? filteredPatients : []).filter(p => p && p.pt_id).slice(0, 50).map((patient) => (
                        <div 
                            key={patient.pt_id}
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
