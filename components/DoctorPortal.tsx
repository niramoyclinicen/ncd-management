
import React, { useState, useMemo, useEffect } from 'react';
import { Doctor, Appointment, Patient, DrugMonograph, Test, PrescriptionRecord } from './DiagnosticData';
import { StethoscopeIcon, CalendarIcon, UsersIcon, Activity, FileTextIcon, PlusIcon } from './Icons';
import PrescriptionMaker from './PrescriptionMaker';

interface DoctorPortalProps {
  doctor: Doctor;
  appointments: Appointment[];
  patients: Patient[];
  prescriptions: PrescriptionRecord[];
  setPrescriptions: React.Dispatch<React.SetStateAction<PrescriptionRecord[]>>;
  onLogout: () => void;
  drugDatabase: DrugMonograph[]; 
  availableTests: Test[]; 
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

const DoctorPortal: React.FC<DoctorPortalProps> = ({ 
  doctor, appointments, patients, prescriptions, setPrescriptions, onLogout, 
  drugDatabase, availableTests, performBlockingSync 
}) => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [existingPrescriptionData, setExistingPrescriptionData] = useState<PrescriptionRecord | undefined>(undefined);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const myAppointments = useMemo(() => {
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    return safeAppointments.filter(a => a && a.doctor_id === doctor?.doctor_id);
  }, [appointments, doctor?.doctor_id]);

  const upcomingAppointments = myAppointments.filter(a => a && a.status === 'Scheduled');
  const pastAppointments = myAppointments.filter(a => a && (a.status === 'Completed' || a.status === 'Cancelled'));

  const displayAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const handleOpenPrescription = (appointment: Appointment) => {
    const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : [];
    const existing = [...safePrescriptions].reverse().find(p => p && p.appointmentId === appointment.appointment_id);
    setExistingPrescriptionData(existing);
    setSelectedAppointment(appointment);
    setShowPrescriptionModal(true);
  };

  const handleSavePrescription = async (data: PrescriptionRecord) => {
      const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : [];
      let newPrescriptions;
      const index = safePrescriptions.findIndex(p => p && p.id === data.id);
      if (index >= 0) {
          newPrescriptions = [...safePrescriptions];
          newPrescriptions[index] = data;
      } else {
          newPrescriptions = [data, ...safePrescriptions];
      }

      if (performBlockingSync) {
        const success = await performBlockingSync({ prescriptions: newPrescriptions });
        if (!success) return;
      }

      setPrescriptions(newPrescriptions);
      setShowPrescriptionModal(false);
      setSelectedAppointment(null);
      setExistingPrescriptionData(undefined);
      
      const safePatients = Array.isArray(patients) ? patients : [];
      const patientName = safePatients.find(p => p && p.pt_id === data.patientId)?.pt_name || "Patient";
      setSuccessMsg(`সফলভাবে "${patientName}" এর ডাটা সেভ করা হয়েছে! পুরানো রেকর্ডটি হিস্ট্রি ট্যাবে যুক্ত হয়েছে।`);
  };

  const getPatientRxCount = (patientId: string) => {
    const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : [];
    return safePrescriptions.filter(p => p && p.patientId === patientId).length;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col relative font-sans">
      {/* SUCCESS TOAST */}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-emerald-600 border-2 border-white text-white px-10 py-5 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] font-black text-xl flex items-center gap-4 animate-fade-in-down">
            <div className="bg-white text-emerald-600 rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg">✓</div>
            {successMsg}
        </div>
      )}

      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 pt-16 md:pt-0 z-20 shadow-2xl shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white border-2 border-blue-400 overflow-hidden shadow-xl transform hover:rotate-3 transition-transform">
                {doctor.photo ? <img src={doctor.photo} alt={doctor.doctor_name} className="w-full h-full object-cover" /> : <StethoscopeIcon size={32} />}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-none tracking-tight">DR. {doctor.doctor_name}</h1>
              <p className="text-xs text-blue-400 font-black uppercase tracking-widest mt-1 opacity-80">{doctor.degree}</p>
            </div>
          </div>
          <button onClick={onLogout} className="px-8 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 border-b-4 border-rose-800">Logout</button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all text-blue-400"><CalendarIcon size={160} /></div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Total Queue</p>
            <h3 className="text-6xl font-black text-white">{upcomingAppointments.length}</h3>
          </div>
          <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all text-emerald-400"><UsersIcon size={160} /></div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">My Patients</p>
            <h3 className="text-6xl font-black text-white">{myAppointments.length}</h3>
          </div>
          <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all text-blue-400"><Activity size={160} /></div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Records Saved</p>
            <h3 className="text-6xl font-black text-blue-400">{prescriptions.length}</h3>
          </div>
        </div>

        <div className="bg-slate-800 rounded-[3rem] border border-slate-700 shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between bg-slate-900/80 px-10 py-6 border-b border-slate-700 backdrop-blur-md">
             <div className="flex bg-slate-800 p-1.5 rounded-3xl border border-slate-700 shadow-inner">
                <button onClick={() => setActiveTab('upcoming')} className={`px-10 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'upcoming' ? 'bg-blue-600 text-white shadow-2xl' : 'text-slate-500 hover:text-slate-300'}`}>Patient Queue</button>
                <button onClick={() => setActiveTab('history')} className={`px-10 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-2xl' : 'text-slate-500 hover:text-slate-300'}`}>Visit History</button>
             </div>
             <div className="hidden md:block"><p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">NCD Medical Management System</p></div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-700/20 text-[11px] uppercase font-black text-slate-500 tracking-[0.2em] border-b border-slate-700">
                <tr>
                  <th className="px-10 py-6">Date / Time</th>
                  <th className="px-10 py-6">Patient Name</th>
                  <th className="px-10 py-6">Complaint / Reason</th>
                  <th className="px-10 py-6 text-center">Previous Records</th>
                  <th className="px-10 py-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {displayAppointments.length > 0 ? (
                  displayAppointments.map((appt) => {
                    const patient = patients.find(p => p.pt_id === appt.patient_id);
                    const rxCount = getPatientRxCount(appt.patient_id);
                    return (
                      <tr key={appt.appointment_id} className="hover:bg-slate-700/30 transition-all cursor-default group">
                        <td className="px-10 py-6">
                          <div className="font-black text-white text-lg leading-none">{appt.appointment_time}</div>
                          <div className="text-[11px] font-bold text-slate-500 mt-2 uppercase tracking-widest">{appt.appointment_date}</div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="font-black text-xl text-blue-100 uppercase tracking-tight group-hover:text-blue-400 transition-colors">{appt.patient_name}</div>
                          <div className="text-[12px] font-bold text-slate-400 mt-1">
                            {patient ? `${patient.gender}, ${patient.ageY}Y | ID: ${patient.pt_id}` : `ID: ${appt.patient_id}`}
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className="inline-block bg-slate-900/50 border border-slate-700 px-5 py-2 rounded-2xl text-xs font-bold text-slate-300 shadow-inner group-hover:border-blue-500/50 transition-colors">
                            {appt.reason}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-center">
                           <div className="flex flex-col items-center">
                             <span className="text-3xl font-black text-white leading-none drop-shadow-lg">{rxCount}</span>
                             <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-2">Stored Rx</span>
                           </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <button 
                            onClick={() => handleOpenPrescription(appt)}
                            className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase shadow-2xl transform active:scale-95 transition-all flex items-center gap-3 mx-auto border-b-4 border-emerald-900"
                          >
                            <StethoscopeIcon size={18} />
                            {rxCount > 0 ? 'Review & New Rx' : 'Begin Consultation'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-10 py-48 text-center">
                      <div className="opacity-10 flex flex-col items-center">
                        <FileTextIcon size={120} className="mb-6" />
                        <p className="text-5xl font-black uppercase tracking-[0.4em]">No Records</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showPrescriptionModal && selectedAppointment && (
        <PrescriptionMaker
          appointmentId={selectedAppointment.appointment_id}
          patient={patients.find(p => p.pt_id === selectedAppointment.patient_id) || { ...selectedAppointment, pt_name: selectedAppointment.patient_name } as any}
          doctor={doctor}
          drugDatabase={drugDatabase} 
          availableTests={availableTests} 
          existingData={existingPrescriptionData}
          allPrescriptions={prescriptions}
          onSave={handleSavePrescription} 
          onClose={() => {
            setShowPrescriptionModal(false);
            setSelectedAppointment(null);
            setExistingPrescriptionData(undefined);
          }}
        />
      )}
    </div>
  );
};

export default DoctorPortal;
