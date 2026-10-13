
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Doctor, emptyDoctor } from './DiagnosticData';

interface DoctorInfoPageProps {
  doctors: Doctor[];
  setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
  isEmbedded?: boolean;
  onClose?: () => void;
  onSaveAndSelect?: (id: string, name: string) => void;
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

const DoctorInfoPage: React.FC<DoctorInfoPageProps> = ({ 
  doctors, setDoctors, isEmbedded = false, onClose, onSaveAndSelect, performBlockingSync 
}) => {
  const [formData, setFormData] = useState<Doctor>(emptyDoctor);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const filteredDoctors = useMemo(() => {
    if (!Array.isArray(doctors)) return [];
    if (isEmbedded) return doctors;
    return doctors.filter(doctor =>
      doctor && (
        (doctor.doctor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doctor.doctor_id || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, doctors, isEmbedded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'mobile') {
      setMobileError('');
      const digits = value.replace(/\D/g, '').slice(0, 11);
      let formatted = digits;
      if (digits.length >= 5) formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
      setFormData(prev => ({ ...prev, mobile: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleGetNewId = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const safeDoctors = Array.isArray(doctors) ? doctors : [];
    const prefix = `DR-${year}-${month}-${day}`;
    const todayDoctors = safeDoctors.filter(d => d && d.doctor_id && typeof d.doctor_id === 'string' && d.doctor_id.startsWith(prefix)).length;
    const newId = `${prefix}-${String(todayDoctors + 1).padStart(3, '0')}`;
    setFormData({ ...emptyDoctor, doctor_id: newId });
    setSelectedDoctorId(null);
    setIsEditing(false);
  }, [doctors]);

  useEffect(() => {
    if (isEmbedded && !isEditing && !formData.doctor_id) {
      const timer = setTimeout(() => handleGetNewId(), 0);
      return () => clearTimeout(timer);
    }
  }, [isEmbedded, isEditing, formData.doctor_id, handleGetNewId]);

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctor_id || !formData.doctor_name) return alert('ID and Name required.');
    
    let newDoctors;
    if (isEditing) {
      newDoctors = doctors.map(d => d.doctor_id === formData.doctor_id ? formData : d);
    } else {
      newDoctors = [formData, ...doctors];
    }

    if (performBlockingSync) {
      const success = await performBlockingSync({ doctors: newDoctors });
      if (!success) return;
    }

    setDoctors(newDoctors);
    setSuccessMessage('ডাটা সেভ হয়েছে');
    if (isEmbedded && onSaveAndSelect) onSaveAndSelect(formData.doctor_id, formData.doctor_name);
    setFormData(emptyDoctor);
    setSelectedDoctorId(null);
    setIsEditing(false);
    if (onClose && isEmbedded) onClose();
  };

  const inputBaseClasses = "py-2 px-3 mt-1 block w-full border border-sky-700/80 rounded-md shadow-sm text-base font-semibold bg-slate-850/90 text-white placeholder-slate-400 focus:bg-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400";
  const labelBaseClasses = "block text-sm font-bold text-sky-200";
  const actionButtonClasses = "px-4 py-2 text-sm font-bold rounded-md flex justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 transition-colors min-w-[100px]";

  return (
    <div className={`bg-slate-900 text-slate-100 rounded-xl px-4 sm:px-6 pb-6 pt-2 space-y-6 ${isEmbedded ? '!p-0 !space-y-0 !bg-transparent' : ''}`}>
        {successMessage && <div className="fixed bottom-5 right-5 z-[9999] bg-green-900/95 border border-green-500 text-green-100 px-6 py-3 rounded-lg shadow-2xl font-bold">{successMessage}</div>}
      
      <div className={`bg-sky-950/70 rounded-xl p-4 sm:p-6 ${isEmbedded ? 'border-2 border-blue-700 mt-4' : 'border border-sky-700/80'}`}>
        {!isEmbedded && <h2 className="text-2xl font-bold text-white mb-6 border-b border-sky-700/80 pb-4">Doctor Information</h2>}
        {!isEmbedded && (
          <div className="flex flex-wrap items-center gap-2 border-b border-sky-700/80 pb-4 mb-4">
              <label className="font-bold text-sky-200 whitespace-nowrap">Dr. Id:</label>
              <input type="text" disabled value={formData.doctor_id} className="w-48 border border-sky-700 rounded-md shadow-sm text-base font-mono font-bold px-3 py-2 bg-slate-900 text-sky-300 cursor-not-allowed" />
              <button type="button" onClick={handleGetNewId} className={`${actionButtonClasses} text-white bg-blue-600 hover:bg-blue-700`}>Add New</button>
              <button type="submit" form="doctor-form" className={`${actionButtonClasses} text-white bg-emerald-600 hover:bg-emerald-700`}>Save</button>
              <button type="button" onClick={() => { if(selectedDoctorId) { const d = doctors.find(x => x.doctor_id === selectedDoctorId); if(d) { setFormData(d); setIsEditing(true); } } }} disabled={!selectedDoctorId} className={`${actionButtonClasses} text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50`}>Edit</button>
              <button type="button" onClick={() => { if(selectedDoctorId && confirm('Delete?')) setDoctors(prev => prev.filter(x => x.doctor_id !== selectedDoctorId)); }} disabled={!selectedDoctorId} className={`${actionButtonClasses} text-white bg-red-600 hover:bg-red-700 disabled:opacity-50`}>Delete</button>
          </div>
        )}
        {!isEmbedded && (
          <div className="mb-6 flex items-center gap-2">
            <label className="font-bold text-sky-200 whitespace-nowrap">Search:</label>
            <input type="text" placeholder="Name or ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 py-2 px-3 border border-sky-700 bg-slate-900 text-white rounded-md text-base font-medium placeholder-slate-400" />
          </div>
        )}
        <form id="doctor-form" onSubmit={handleSaveDoctor}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <div><label className={labelBaseClasses}>Doctor Name</label><input type="text" name="doctor_name" value={formData.doctor_name} onChange={handleInputChange} required className={inputBaseClasses} /></div>
            <div><label className={labelBaseClasses}>Gender</label><select name="gender" value={formData.gender} onChange={handleInputChange} className={inputBaseClasses}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
            <div><label className={labelBaseClasses}>Degree (multi-line allowed)</label><textarea name="degree" value={formData.degree} onChange={handleInputChange} className={inputBaseClasses} placeholder="e.g. MBBS, FCPS\nMD (Medicine)" rows={2} /></div>
            <div><label className={labelBaseClasses}>Mobile</label><input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="01XXX-XXXXXX" className={inputBaseClasses} /></div>
            <div className="md:col-span-2 flex items-center gap-4 mt-2 bg-sky-900/30 p-4 rounded-lg border border-sky-800">
                <div className="flex-shrink-0">{formData.photo ? <img src={formData.photo} alt="Doc" className="w-24 h-24 rounded-full object-cover border-2 border-sky-500 shadow-md" /> : <div className="w-24 h-24 rounded-full bg-sky-800 flex items-center justify-center text-sky-400 border-2 border-dashed border-sky-600"><span className="text-xs">No Photo</span></div>}</div>
                <div className="flex-1"><label className={labelBaseClasses}>Upload Photo</label><input type="file" accept="image/*" onChange={handlePhotoUpload} ref={fileInputRef} className="mt-1 block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" /></div>
            </div>
          </div>
          {isEmbedded && (
            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-sky-800">
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-bold">Save</button>
              <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-600 text-white rounded font-bold">Cancel</button>
            </div>
          )}
        </form>
      </div>

      {!isEmbedded && (
        <div className="overflow-x-auto border border-slate-700 rounded-xl shadow-xl bg-slate-900">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider">Doctor Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider">Doctor Degree</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-sky-200 uppercase tracking-wider">Mobile</th>
                </tr>
              </thead>
              <tbody className="bg-slate-900 divide-y divide-slate-800">
                {filteredDoctors.map((doctor) => (
                  <tr key={doctor.doctor_id} onClick={() => { setFormData(doctor); setSelectedDoctorId(doctor.doctor_id); setIsEditing(false); }} className={`cursor-pointer transition-colors ${selectedDoctorId === doctor.doctor_id ? 'bg-blue-900/40 border-l-2 border-l-blue-400' : 'hover:bg-slate-800/80 even:bg-slate-900/70 odd:bg-slate-850/40 border-l-2 border-l-transparent'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-sky-300 font-mono font-bold">{doctor.doctor_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-bold">{doctor.doctor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-200 font-medium">{doctor.degree}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300">{doctor.gender}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-emerald-300 font-mono font-bold">{doctor.mobile}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

export default DoctorInfoPage;
