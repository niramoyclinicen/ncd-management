import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Patient, Doctor, Referrar, LabInvoice, Appointment } from './DiagnosticData'; 
import { formatDateTime } from '../utils/dateUtils'; 
import SearchableSelect from './SearchableSelect';
import PatientInfoPage from './PatientInfoPage';
import DoctorInfoPage from './DoctorInfoPage';
import ReferrerInfoPage from './ReferrerInfoPage';
// Added imports for missing icons
import { Activity, MoneyIcon, UsersIcon, ChartIcon, SearchIcon, CalendarIcon, TrashIcon, RefreshIcon } from './Icons';

const emptyAppointment: Appointment = {
  appointment_id: '',
  patient_id: '',
  patient_name: '',
  doctor_id: '',
  doctor_name: '',
  referrar_id: '',
  referrar_name: '',
  appointment_date: '',
  appointment_time: '',
  reason: '',
  doctor_fee: 0,
  status: 'Scheduled',
  notes: '',
};

const appointmentReasons = [
  "General Checkup / সাধারণ চেকআপ",
  "Fever / জ্বর",
  "Cold & Cough / সর্দি ও কাশি",
  "Headache / মাথাব্যথা",
  "Abdominal Pain / পেটে ব্যথা",
  "Chest Pain / বুকে ব্যথা",
  "Breathing Trouble / শ্বাসকষ্ট",
  "Vomiting / বমি",
  "Loose Motion / পাতলা পায়খানা",
  "Weakness / দুর্বলতা",
  "Dizziness / মাথা ঘোরা",
  "Body Ache / শরীরে ব্যথা",
  "Joint Pain / গিরায় ব্যথা",
  "Back Pain / কোমরে ব্যথা",
  "Skin Rash / এলার্জি বা চর্মরোগ",
  "Injury/Cut / আঘাত বা কেটে যাওয়া",
  "Burn / পুড়ে যাওয়া",
  "High Blood Pressure / উচ্চ রক্তচাপ",
  "Diabetes Checkup / ডায়াবেটিস চেকআপ",
  "Pregnancy Checkup / গর্বকালীন সেবা",
  "Gynecology Problem / গাইনি সমস্যা",
  "Eye Problem / চোখের সমস্যা",
  "Ear Pain / কানে ব্যথা",
  "Throat Pain / গলায় ব্যথা",
  "Toothache / দাঁতে ব্যথা",
  "Urinary Problem / প্রস্রাবে সমস্যা",
  "Follow-up / ফলো-আপ",
  "Report Show / রিপোর্ট দেখানো",
  "Vaccination / টিকা",
  "Dressing / ড্রেসিং"
];

interface DoctorAppointmentPageProps {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  doctors: Doctor[];
  setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
  referrars: Referrar[];
  setReferrars: React.Dispatch<React.SetStateAction<Referrar[]>>;
  invoices?: LabInvoice[];
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

const DoctorAppointmentPage: React.FC<DoctorAppointmentPageProps> = ({ 
  patients, setPatients, doctors, setDoctors, referrars, setReferrars, invoices = [], appointments, setAppointments, performBlockingSync
}) => {
  const [formData, setFormData] = useState<Appointment>(emptyAppointment);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New list filters
  const [listSearchDoctor, setListSearchDoctor] = useState('');
  const [listSearchPatient, setListSearchPatient] = useState('');
  const [listFilterDate, setListFilterDate] = useState('');
  const [listFilterMonth, setListFilterMonth] = useState('');

  const [barcodeInput, setBarcodeInput] = useState('');
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [showPatientSearchModal, setShowPatientSearchModal] = useState(false);
  const [patientSearchFilters, setPatientSearchFilters] = useState({ name: "", mobile: "", address: "", thana: "", age: "" });
  const [showNewDoctorForm, setShowNewDoctorForm] = useState(false);
  const [showNewReferrarForm, setShowNewReferrarForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const today = new Date();
  const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [selectedDateForDailyReport, setSelectedDateForDailyReport] = useState<string>(todayDateString);

  const [selectedDoctorDailyFeeTotal, setSelectedDoctorDailyFeeTotal] = useState<number>(0);
  const [selectedDoctorMonthlyFeeTotal, setSelectedDoctorMonthlyFeeTotal] = useState<number>(0);
  const [allDoctorsDailyFeeTotal, setAllDoctorsDailyFeeTotal] = useState<number>(0);
  const [allDoctorsMonthlyFeeTotal, setAllDoctorsMonthlyFeeTotal] = useState<number>(0);

  const commonInputClasses = "py-1.5 px-2.5 mt-0.5 block w-full border border-sky-800 rounded-md shadow-sm text-xs bg-sky-900/50 text-sky-200 placeholder-sky-400 transition-colors duration-200 ease-in-out focus:bg-sky-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const commonLabelClasses = "block text-xs font-semibold text-sky-300 mb-0.5";

  useEffect(() => {
    if (successMessage) {
        const timer = setTimeout(() => setSuccessMessage(''), 4000);
        return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Updated List Filtering Logic
  const filteredAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    return appointments.filter(appt => {
      if (!appt) return false;
      // 1. General Search Term (matches Pt Name, Doc Name, Ref Name, ID)
      const matchesSearch = searchTerm === '' || 
        (appt.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (appt.doctor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (appt.referrar_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (appt.appointment_id || '').toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Specific Doctor Search
      const matchesDoctor = listSearchDoctor === '' || 
        (appt.doctor_name || '').toLowerCase().includes(listSearchDoctor.toLowerCase());

      // 2b. Specific Patient Search
      const matchesPatient = listSearchPatient === '' ||
        (appt.patient_name || '').toLowerCase().includes(listSearchPatient.toLowerCase());

      // 3. Specific Date Filter
      const matchesDate = listFilterDate === '' || appt.appointment_date === listFilterDate;

      // 4. Specific Month Filter
      const matchesMonth = listFilterMonth === '' || (appt.appointment_date && appt.appointment_date.startsWith(listFilterMonth));

      return matchesSearch && matchesDoctor && matchesPatient && matchesDate && matchesMonth;
    });
  }, [searchTerm, listSearchDoctor, listSearchPatient, listFilterDate, listFilterMonth, appointments]);

  const totalFilteredFees = filteredAppointments
    .filter(appt => appt.status !== 'Cancelled' && appt.status !== 'Returned')
    .reduce((sum, appt) => sum + (appt.doctor_fee || 0), 0);

  useEffect(() => {
    const calculateTotals = () => {
      if (!Array.isArray(appointments)) return;
      let currentDoctorDailySum = 0;
      let currentDoctorMonthlySum = 0;
      let allDoctorsDailySum = 0;
      let allDoctorsMonthlySum = 0;

      const selDateObj = new Date(selectedDateForDailyReport);
      const selectedMonth = selDateObj.getMonth();
      const selectedYear = selDateObj.getFullYear();
      
      const selectedDoctorId = formData.doctor_id;

      appointments.forEach(appt => {
        if (!appt) return;
        const apptDateStr = appt.appointment_date || '';
        const apptDateObj = new Date(apptDateStr);

        if (apptDateStr === selectedDateForDailyReport && (appt.status === 'Completed' || appt.status === 'Scheduled')) {
            allDoctorsDailySum += (appt.doctor_fee || 0);
        }
        if (appt.return_date === selectedDateForDailyReport && appt.status === 'Returned') {
            allDoctorsDailySum -= (appt.doctor_fee || 0);
        }

        if (apptDateObj.getMonth() === selectedMonth && apptDateObj.getFullYear() === selectedYear && (appt.status === 'Completed' || appt.status === 'Scheduled')) {
            allDoctorsMonthlySum += (appt.doctor_fee || 0);
        }
        if (appt.return_date) {
            const retDate = new Date(appt.return_date);
            if (retDate.getMonth() === selectedMonth && retDate.getFullYear() === selectedYear && appt.status === 'Returned') {
                allDoctorsMonthlySum -= (appt.doctor_fee || 0);
            }
        }
        
        if (selectedDoctorId && appt.doctor_id === selectedDoctorId) {
            if (apptDateStr === selectedDateForDailyReport && (appt.status === 'Completed' || appt.status === 'Scheduled')) {
                currentDoctorDailySum += (appt.doctor_fee || 0);
            }
            if (appt.return_date === selectedDateForDailyReport && appt.status === 'Returned') {
                currentDoctorDailySum -= (appt.doctor_fee || 0);
            }
            if (apptDateObj.getMonth() === selectedMonth && apptDateObj.getFullYear() === selectedYear && (appt.status === 'Completed' || appt.status === 'Scheduled')) {
                currentDoctorMonthlySum += (appt.doctor_fee || 0);
            }
            if (appt.return_date) {
                const retDate = new Date(appt.return_date);
                if (retDate.getMonth() === selectedMonth && retDate.getFullYear() === selectedYear && appt.status === 'Returned') {
                    currentDoctorMonthlySum -= (appt.doctor_fee || 0);
                }
            }
        }
      });
      
      setSelectedDoctorDailyFeeTotal(currentDoctorDailySum);
      setSelectedDoctorMonthlyFeeTotal(currentDoctorMonthlySum);
      setAllDoctorsDailyFeeTotal(allDoctorsDailySum);
      setAllDoctorsMonthlyFeeTotal(allDoctorsMonthlySum);
    };

    calculateTotals();
  }, [appointments, formData.doctor_id, selectedDateForDailyReport]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFocusSelect = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleDoctorFeeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '') {
      setFormData(prev => ({ ...prev, doctor_fee: 0 }));
    }
  };

  const resetForm = () => {
    setFormData(emptyAppointment);
    setSelectedAppointmentId(null);
    setIsEditing(false);
    setShowNewPatientForm(false);
    setShowNewDoctorForm(false);
    setShowNewReferrarForm(false);
    setBarcodeInput('');
  };

  const handleGetNewId = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const apptsTodayCount = appointments.filter(a => a.appointment_id.startsWith(`APP-${year}-${month}-${day}`)).length;
    const newSerial = String(apptsTodayCount + 1).padStart(3, '0');
    const newId = `APP-${year}-${month}-${day}-${newSerial}`;
    setFormData({ ...emptyAppointment, appointment_id: newId, appointment_date: `${year}-${month}-${day}`, status: 'Scheduled' });
    setSelectedAppointmentId(null);
    setIsEditing(false);
  };

  const handlePatientSelect = (id: string, name: string) => {
    setFormData(prev => ({ ...prev, patient_id: id, patient_name: name }));
    setShowNewPatientForm(false);
    setShowPatientSearchModal(false);
    setPatientSearchFilters({ name: '', mobile: '', address: '', thana: '', age: '' });
  };

    const openAdvancedPatientSearch = (currentTerm: string) => {
     setPatientSearchFilters(prev => ({ ...prev, name: currentTerm }));
     setShowPatientSearchModal(true);
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

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = barcodeInput.trim();
      if (!code) return;
      let targetPatient = patients.find(p => p.pt_id === code);
      if (!targetPatient && invoices) {
        const matchingInvoice = invoices.find(inv => inv.invoice_id === code);
        if (matchingInvoice) {
          targetPatient = patients.find(p => p.pt_id === matchingInvoice.patient_id);
        }
      }
      if (targetPatient) {
        handlePatientSelect(targetPatient.pt_id, targetPatient.pt_name);
        setSuccessMessage(`পেশেন্ট "${targetPatient.pt_name}" সফলভাবে বারকোড দ্বারা সিলেক্ট করা হয়েছে।`);
        setBarcodeInput('');
      } else {
        alert("এই বারকোড দিয়ে কোনো রোগী বা ইনভয়েস পাওয়া যায়নি।");
      }
    }
  };

  const handleDoctorSelect = (id: string, name: string) => {
    setFormData(prev => ({ ...prev, doctor_id: id, doctor_name: name }));
    setShowNewDoctorForm(false);
  };

  const handleReferrarSelect = (id: string, name: string) => {
    setFormData(prev => ({ ...prev, referrar_id: id, referrar_name: name }));
    setShowNewReferrarForm(false);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.appointment_id || !formData.patient_id || !formData.doctor_id || !formData.appointment_date || !formData.appointment_time || !formData.reason || !formData.status) {
      alert('Error: Please fill in all required fields.');
      return;
    }
    
    let newAppointments;
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    if (isEditing) {
      newAppointments = safeAppointments.map(a => a.appointment_id === formData.appointment_id ? formData : a);
    } else {
      if (safeAppointments.some(a => a.appointment_id === formData.appointment_id)) {
        alert('Error: Appointment ID already exists. Please get a new ID.');
        return;
      }
      newAppointments = [formData, ...safeAppointments];
    }

    if (performBlockingSync) {
      const success = await performBlockingSync({ appointments: newAppointments });
      if (!success) return;
    }

    setAppointments(newAppointments);
    if (isEditing) setSuccessMessage('অ্যাপয়েন্টমেন্ট ডাটা সফলভাবে আপডেট করা হয়েছে!');
    else setSuccessMessage('নতুন অ্যাপয়েন্টমেন্ট সফলভাবে সেভ করা হয়েছে!');
    
    resetForm();
  };

  const handleEditAppointment = () => {
    if (!selectedAppointmentId) return alert("Please select an appointment.");
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    const appointmentToEdit = safeAppointments.find(a => a.appointment_id === selectedAppointmentId);
    if (appointmentToEdit) {
      setFormData(appointmentToEdit);
      setIsEditing(true);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointmentId) return alert("Please select an appointment.");
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    const appointmentToCancel = safeAppointments.find(a => a.appointment_id === selectedAppointmentId);
    if (appointmentToCancel && (appointmentToCancel.status === 'Scheduled' || appointmentToCancel.status === 'Completed')) {
      if (window.confirm(`Are you sure you want to cancel appointment ${appointmentToCancel.appointment_id}?`)) {
        const newAppointments = safeAppointments.map(a => a.appointment_id === selectedAppointmentId ? { ...a, status: 'Cancelled' } : a);
        
        if (performBlockingSync) {
          const success = await performBlockingSync({ appointments: newAppointments });
          if (!success) return;
        }

        setAppointments(newAppointments);
        resetForm();
        setSuccessMessage('অ্যাপয়েন্টমেন্টটি বাতিল করা হয়েছে।');
      }
    }
  };

  const handleReturnAppointment = async () => {
    if (!selectedAppointmentId) return alert("Please select an appointment.");
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    const appointmentToReturn = safeAppointments.find(a => a.appointment_id === selectedAppointmentId);
    if (appointmentToReturn && appointmentToReturn.status !== 'Returned' && appointmentToReturn.status !== 'Cancelled') {
      if (window.confirm(`আপনি কি এই অ্যাপয়েন্টমেন্টের (${appointmentToReturn.appointment_id}) ফি রিফান্ড করতে চান? এটি আজকের হিসাব থেকে মাইনাস হবে।`)) {
        const newAppointments = safeAppointments.map(a => a.appointment_id === selectedAppointmentId ? { ...a, status: 'Returned', return_date: todayDateString } : a);
        
        if (performBlockingSync) {
          const success = await performBlockingSync({ appointments: newAppointments });
          if (!success) return;
        }

        setAppointments(newAppointments);
        resetForm();
        setSuccessMessage('পেশেন্ট ফি সফলভাবে রিটার্ন করা হয়েছে।');
      }
    }
  };

  const handleRowClick = (appointment: Appointment) => {
    setFormData(appointment);
    setSelectedAppointmentId(appointment.appointment_id);
    setIsEditing(false);
  };

  const handlePrintList = () => {
    let reportTitle = 'APPOINTMENT LIST';
    
    let filterDetails = [];
    if (listSearchDoctor) filterDetails.push("Doctor: " + listSearchDoctor);
    if (listSearchPatient) filterDetails.push("Patient: " + listSearchPatient);
    if (listFilterDate) filterDetails.push("Date: " + listFilterDate);
    if (listFilterMonth) filterDetails.push("Month: " + listFilterMonth);
    const subtitle = filterDetails.length > 0 ? filterDetails.join(' | ') : 'All Appointments';

    const theadHtml = "<tr><th style='text-align:center; width:40px;'>SL</th><th>Date & Time</th><th>Patient Name</th><th>Consultant</th><th>Status</th><th style='text-align:right;'>Fee</th></tr>";

    let totalFees = 0;
    const safeList = Array.isArray(filteredAppointments) ? filteredAppointments : [];
    const contentHtml = safeList.map((appt, index) => {
        totalFees += (appt.doctor_fee || 0);
        return "<tr><td style='text-align:center'>" + (index + 1) + "</td><td><b>" + appt.appointment_date + "</b><br/>" + appt.appointment_time + "</td><td><b>" + appt.patient_name + "</b><br/>" + (appt.reason || '') + "</td><td>" + (appt.doctor_name || '') + "</td><td>" + appt.status + "</td><td style='text-align:right'>৳" + (appt.doctor_fee || 0).toFixed(2) + "</td></tr>";
    }).join('');

    const tfootHtml = "<tr><td colspan='5' style='text-align:right; font-weight:bold;'>Total (" + safeList.length + " Patients):</td><td style='text-align:right; font-weight:bold;'>৳" + totalFees.toFixed(2) + "</td></tr>";

    const printContent = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Appointment List Print</title><style>@page { size: A4 portrait; margin: 15mm; } body { font-family: sans-serif; background: #fff; color: #000; margin: 0; padding: 0; } .header { text-align: center; margin-bottom: 20px; } .header h1 { margin: 0; font-size: 24px; font-weight: bold; } .header p { margin: 5px 0; font-size: 12px; } .header h2 { margin: 10px 0 5px 0; font-size: 18px; text-decoration: underline; } table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; } th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; } th { background-color: #f0f0f0; font-weight: bold; } .footer { text-align: center; font-size: 10px; margin-top: 20px; color: #555; }</style></head><body><div class='header'><h1>Niramoy Clinic & Diagnostic</h1><p>Enayetpur, Sirajgonj | Mobile: 01730 923007</p><h2>" + reportTitle + "</h2><p style='font-weight:bold;'>" + subtitle + "</p></div><table><thead>" + theadHtml + "</thead><tbody>" + contentHtml + "</tbody><tfoot>" + tfootHtml + "</tfoot></table><div class='footer'>Printed on " + new Date().toLocaleString() + "</div><script>window.onload = function() { window.print(); window.close(); }</script></body></html>";

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(printContent);
        win.document.close();
    }
  };

  const handlePrintAppointment = () => {
    if (!selectedAppointmentId) return;
    const apptToPrint = appointments.find(a => a.appointment_id === selectedAppointmentId);
    if (!apptToPrint) return;
    const patient = patients.find(p => p.pt_id === apptToPrint.patient_id);
    const doctor = doctors.find(d => d.doctor_id === apptToPrint.doctor_id);

    const getSlipHtml = (type: string) => `
        <div class="content-box">
            <div class="header"><h1>Niramoy Clinic & Diagnostic</h1><p>Enayetpur, Sirajgonj | Mobile: 01730 923007</p><div class="header-line"></div><p style="font-weight: 900; font-size: 11px; text-decoration: underline; margin: 15px 0 0 0;">APPOINTMENT SLIP (${type})</p></div>
            <div class="content-row"><div class="token-box">TOKEN ID: ${apptToPrint.appointment_id.split('-').pop()}</div><div class="date-time"><b>Date:</b> ${apptToPrint.appointment_date} | <b>Time:</b> ${apptToPrint.appointment_time}</div></div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <table class="info-table" style="flex: 1;">
                    <tr><td class="label">Patient:</td><td class="val name-val">${apptToPrint.patient_name} ${apptToPrint.status === 'Returned' ? '(REFUNDED)' : ''}</td></tr>
                    <tr><td class="label">Age/Sex:</td><td class="val">${patient?.ageY}Y / ${patient?.gender}</td></tr>
                    <tr><td class="label">Reason:</td><td class="val">${apptToPrint.reason}</td></tr>
                    <tr><td class="label">Fee:</td><td class="val">${apptToPrint.status === 'Returned' ? '৳ 0.00 (Refunded)' : `BDT ${(apptToPrint.doctor_fee || 0).toFixed(2)}`}</td></tr>
                </table>
                <div style="margin-left: 10px; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                    ${apptToPrint.status === 'Returned' ? 
                        '<div style="font-size: 18px; font-weight: 900; color: #dc2626; border: 3px solid #dc2626; padding: 2px 8px; transform: rotate(-10deg); display: inline-block; opacity: 0.8; letter-spacing: 1px; margin-right: 15px;">REFUNDED</div>' : 
                        '<div style="font-size: 18px; font-weight: 900; color: #16a34a; border: 3px solid #16a34a; padding: 2px 8px; transform: rotate(-10deg); display: inline-block; opacity: 0.8; letter-spacing: 1px; margin-right: 15px;">PAID</div>'
                    }
                    <div style="text-align: right; min-width: 90px; padding-top: 5px;"><img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(apptToPrint.patient_id)}&scale=1&height=10&incltext=false" alt="BC" style="height: 35px; width: auto; max-width: 100%;"/><div style="font-size: 8px; font-family: monospace; margin-top: 2px; font-weight: bold;">${apptToPrint.patient_id}</div></div>
                </div>
            </div>
            <div class="doc-box"><div class="doc-name">Consultant: ${doctor?.doctor_name}</div><div class="doc-deg">${doctor?.degree}</div></div>
            <div class="footer">Printed on ${formatDateTime(new Date())}</div>
        </div>
    `;

    const printContent = `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page { size: 8.4in 5.8in; margin: 0; }body { margin: 0; padding: 0; background: white; font-family: sans-serif; }.page-container { width: 8.4in; height: 5.8in; display: flex; flex-direction: row; box-sizing: border-box; overflow: hidden; }.slip-column { width: 50%; height: 5.8in; box-sizing: border-box; padding: 0.4in 0.4in; position: relative; display: flex; flex-direction: column; }.slip-column:first-child { border-right: 1.5px dashed #444; }.content-box { height: 100%; display: flex; flex-direction: column; }.header { text-align: center; margin-bottom: 5px; }.header h1 { margin: 0; font-size: 20px; font-weight: 900; color: #000; text-transform: uppercase; }.header p { margin: 1px 0; font-size: 10px; font-weight: bold; }.header-line { width: 100%; height: 1.5px; background: black; margin-top: 8px; }.content-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; margin-top: 10px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }.token-box { font-size: 18px; font-weight: bold; border: 2.5px solid #000; padding: 3px 12px; border-radius: 4px; }.date-time { font-size: 11px; }.info-table { width: 100%; border-collapse: collapse; font-size: 12px; }.info-table td { padding: 4px 0; }.label { font-weight: bold; width: 60px; color: #333; text-transform: uppercase; font-size: 9px; vertical-align: top; }.val { font-weight: 800; color: #000; }.name-val { white-space: nowrap; font-size: 14px; text-transform: uppercase; }.doc-box { margin-top: auto; border-top: 1.2px dashed #999; padding-top: 8px; text-align: right; }.doc-name { font-size: 13px; font-weight: bold; }.doc-deg { font-size: 10px; color: #444; }.footer { position: absolute; bottom: 0.3in; left: 0.4in; right: 0.4in; text-align: center; font-size: 8px; color: #777; border-top: 1px solid #eee; padding-top: 2px; }</style></head><body><div class="page-container"><div class="slip-column">${getSlipHtml('Patient Copy')}</div><div class="slip-column">${getSlipHtml('Office Copy')}</div></div></body></html>
    `;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(printContent);
        win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 500);
    }
  };

  const isAppointmentSelected = selectedAppointmentId !== null;
  const selectedAppointmentStatus = appointments.find(a => a.appointment_id === selectedAppointmentId)?.status;
  const canCancel = isAppointmentSelected && (selectedAppointmentStatus === 'Scheduled' || selectedAppointmentStatus === 'Completed');
  const canReturn = isAppointmentSelected && selectedAppointmentStatus !== 'Returned' && selectedAppointmentStatus !== 'Cancelled';

  return (
    <div className="bg-slate-900 text-slate-200 rounded-xl p-3 sm:p-4 space-y-4 relative">
      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div className="bg-emerald-600 border-2 border-white text-white px-10 py-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in-up flex flex-col items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 text-2xl font-black shadow-lg">✓</div>
             <span className="text-xl font-black uppercase tracking-widest">{successMessage}</span>
          </div>
        </div>
      )}

      {/* FORM AND CONTROLS SECTION */}
      <div className="bg-sky-950 rounded-xl p-3 sm:p-4 border border-sky-800">
        <h2 className="text-lg sm:text-xl font-bold text-sky-100 mb-3 border-b border-sky-800 pb-2">Doctor Appointment</h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 border-b border-sky-800 pb-3 mb-3">
            {/* Appt ID & Get New */}
            <div className="flex items-center gap-1.5">
                <label htmlFor="appointment_id" className="font-semibold text-xs text-sky-300 whitespace-nowrap">Appt. Id:</label>
                <input type="text" id="appointment_id" name="appointment_id" disabled value={formData.appointment_id} className="w-28 sm:w-32 border border-sky-800 rounded-md shadow-sm text-xs px-2.5 py-1.5 bg-sky-900 text-sky-400 cursor-not-allowed font-mono" />
                <button type="button" onClick={handleGetNewId} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md whitespace-nowrap transition-colors shadow-sm">Get New</button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
                <button type="submit" form="appointment-form" className="px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-500 rounded-md whitespace-nowrap transition-colors shadow-sm">Save Appnm't</button>
                <button type="button" onClick={resetForm} className="px-2.5 py-1.5 text-xs font-semibold text-sky-200 bg-slate-700 hover:bg-slate-600 rounded-md whitespace-nowrap transition-colors">Clear Form</button>
                <button type="button" onClick={handleEditAppointment} disabled={!isAppointmentSelected} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-yellow-600 hover:bg-yellow-500 rounded-md disabled:opacity-50 whitespace-nowrap transition-colors">Edit</button>
                <button type="button" onClick={handlePrintAppointment} disabled={!isAppointmentSelected} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md disabled:opacity-50 whitespace-nowrap transition-colors">Print Slip</button>
                <button type="button" onClick={handleCancelAppointment} disabled={!canCancel} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-md disabled:opacity-50 whitespace-nowrap transition-colors">Appt Cancel</button>
                <button type="button" onClick={handleReturnAppointment} disabled={!canReturn} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-md disabled:opacity-50 whitespace-nowrap transition-colors">Refund</button>
            </div>

            {/* Search Appt & Scanner Mode on the same row */}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
                <div className="flex items-center gap-1.5 bg-sky-900/90 border border-sky-700 rounded-md px-2 py-1 shadow-inner">
                    <label className="text-[11px] font-bold text-sky-300 whitespace-nowrap">Search Appt:</label>
                    <input type="text" placeholder="Patient/Doctor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-28 sm:w-36 lg:w-44 bg-transparent text-xs text-sky-100 placeholder-sky-400/60 outline-none" />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 border border-sky-500/50 rounded-md px-2 py-1 shadow-inner">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                    <label className="font-black text-[10px] text-sky-300 uppercase tracking-tighter whitespace-nowrap">Scanner Mode:</label>
                    <input type="text" placeholder="Scan Barcode / ID..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeScan} className="w-28 sm:w-36 lg:w-44 bg-transparent text-xs text-white placeholder-slate-500 outline-none font-mono" autoComplete="off" />
                </div>
            </div>
        </div>
        <form id="appointment-form" onSubmit={handleSaveAppointment} className="mb-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2.5">
            <div>
              <SearchableSelect 
                theme="dark" 
                label="Patient" 
                options={(Array.isArray(patients) ? patients : []).map(p => ({ id: p.pt_id, name: p.pt_name, details: `${p.gender}, ${p.ageY}Y, Add: ${p.address}, Mob: ${p.mobile}` }))} 
                value={formData.patient_id} 
                onChange={handlePatientSelect} 
                onAddNew={() => openAdvancedPatientSearch('')} 
                onEnter={(term) => openAdvancedPatientSearch(term)}
                placeholder="Search or add patient" 
                required 
              />
            </div>
            <div><SearchableSelect theme="dark" label="Select Doctor" options={(Array.isArray(doctors) ? doctors : []).map(d => ({ id: d.doctor_id, name: d.doctor_name, details: d.degree }))} value={formData.doctor_id || ''} onChange={handleDoctorSelect} onAddNew={() => setShowNewDoctorForm(true)} placeholder="Search or add doctor" required /></div>
            <div><SearchableSelect theme="dark" label="Referrar (Optional)" options={(Array.isArray(referrars) ? referrars : []).map(r => ({ id: r.ref_id, name: r.ref_name, details: r.ref_degrees }))} value={formData.referrar_id || ''} onChange={handleReferrarSelect} onAddNew={() => setShowNewReferrarForm(true)} placeholder="Search or add referrar" /></div>
            <div><label className={commonLabelClasses}>Appointment Date</label><input type="date" name="appointment_date" value={formData.appointment_date} onChange={handleInputChange} required className={commonInputClasses} /></div>
            <div><label className={commonLabelClasses}>Appointment Time</label><input type="time" name="appointment_time" value={formData.appointment_time} onChange={handleInputChange} required className={commonInputClasses} /></div>
            <div><label className={commonLabelClasses}>Doctor Fee (BDT)</label><input type="number" name="doctor_fee" value={formData.doctor_fee} onChange={handleInputChange} onFocus={handleFocusSelect} onBlur={handleDoctorFeeBlur} required min="0" className={commonInputClasses} /></div>
            <div className="lg:col-span-1"><label className={commonLabelClasses}>Reason</label><input list="reasonOptions" name="reason" value={formData.reason} onChange={handleInputChange} required className={commonInputClasses} placeholder="Select reason..." /><datalist id="reasonOptions">{(Array.isArray(appointmentReasons) ? appointmentReasons : []).map(r => <option key={r} value={r} />)}</datalist></div>
            <div className="lg:col-span-1"><label className={commonLabelClasses}>Status</label><select name="status" value={formData.status} onChange={handleInputChange} required className={commonInputClasses}><option value="Scheduled">Scheduled</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option><option value="Returned">Returned</option></select></div>
            <div className="lg:col-span-1"><label className={commonLabelClasses}>Notes (Optional)</label><input type="text" name="notes" value={formData.notes} onChange={handleInputChange} className={commonInputClasses} placeholder="Any additional notes..." /></div>
            </div>
        </form>
      </div>

      {/* --- MOVED: DOCTOR FEE REPORTS (SUMMARY BOXES) NOW APPEAR HERE --- */}
      <div className="pt-0">
        <h3 className="text-base sm:text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
            <Activity className="text-blue-500 w-5 h-5" /> Collection Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-sky-900/60 rounded-xl p-3.5 sm:p-4 border border-sky-700 shadow-xl backdrop-blur-sm group hover:border-sky-500 transition-all">
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-black text-sky-300 uppercase tracking-widest leading-tight truncate">{formData.doctor_name || 'Selected Doctor'}'s Daily Fee</h4>
                <div className="p-1.5 bg-sky-500/20 rounded-lg"><MoneyIcon size={14} className="text-sky-400" /></div>
            </div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date:</label>
                <input type="date" value={selectedDateForDailyReport} onChange={(e) => setSelectedDateForDailyReport(e.target.value)} className="w-28 py-0.5 px-2 border border-sky-700 rounded text-[10px] font-bold bg-sky-950 text-sky-200 outline-none focus:ring-1 focus:ring-sky-400" />
            </div>
            {formData.doctor_id ? ( <p className="text-2xl font-black text-white drop-shadow-md">৳ {(selectedDoctorDailyFeeTotal || 0).toFixed(2)}</p> ) : ( <p className="text-xs text-sky-400 italic font-bold">Select a Doctor Above</p> )}
          </div>

          <div className="bg-emerald-900/60 rounded-xl p-3.5 sm:p-4 border border-emerald-700 shadow-xl backdrop-blur-sm group hover:border-emerald-500 transition-all">
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-black text-emerald-300 uppercase tracking-widest leading-tight truncate">{formData.doctor_name || 'Selected Doctor'}'s Monthly</h4>
                <div className="p-1.5 bg-emerald-500/20 rounded-lg"><Activity size={14} className="text-emerald-400" /></div>
            </div>
            <p className="text-[10px] text-slate-400 mb-2 uppercase font-bold tracking-widest">
                Cycle: {new Date(selectedDateForDailyReport).toLocaleString('default', { month: 'short', year: 'numeric' })}
            </p>
            {formData.doctor_id ? ( <p className="text-2xl font-black text-white drop-shadow-md">৳ {(selectedDoctorMonthlyFeeTotal || 0).toFixed(2)}</p> ) : ( <p className="text-xs text-emerald-400 italic font-bold">Select a Doctor Above</p> )}
          </div>

          <div className="bg-purple-900/60 rounded-xl p-3.5 sm:p-4 border border-purple-700 shadow-xl backdrop-blur-sm group hover:border-purple-500 transition-all">
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-black text-purple-300 uppercase tracking-widest leading-tight">All Doctors Daily Fee</h4>
                <div className="p-1.5 bg-purple-500/20 rounded-lg"><UsersIcon size={14} className="text-purple-400" /></div>
            </div>
            <p className="text-[10px] text-slate-400 mb-2 uppercase font-bold tracking-widest">Date: {selectedDateForDailyReport}</p>
            <p className="text-2xl font-black text-white drop-shadow-md">৳ {(allDoctorsDailyFeeTotal || 0).toFixed(2)}</p>
          </div>

          <div className="bg-amber-900/60 rounded-xl p-3.5 sm:p-4 border border-amber-700 shadow-xl backdrop-blur-sm group hover:border-amber-500 transition-all">
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-widest leading-tight">All Doctors Monthly Fee</h4>
                <div className="p-1.5 bg-amber-500/20 rounded-lg"><ChartIcon size={14} className="text-amber-400" /></div>
            </div>
            <p className="text-[10px] text-slate-400 mb-2 uppercase font-bold tracking-widest">
                Cycle: {new Date(selectedDateForDailyReport).toLocaleString('default', { month: 'short', year: 'numeric' })}
            </p>
            <p className="text-2xl font-black text-white drop-shadow-md">৳ {(allDoctorsMonthlyFeeTotal || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* APPOINTMENT LIST TABLE SECTION */}
      <div className="mt-6 border-t border-slate-700 pt-5">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                <UsersIcon className="text-indigo-400" /> Appointment Journal
            </h3>
            
            {/* NEW LIST FILTER CONTROLS */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700 shadow-inner no-print">
                <div className="flex items-center gap-2">
                    <SearchIcon size={16} className="text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Filter by Doctor..." 
                        value={listSearchDoctor} 
                        onChange={(e) => setListSearchDoctor(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-blue-500 w-32"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <SearchIcon size={16} className="text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Filter by Patient..." 
                        value={listSearchPatient} 
                        onChange={(e) => setListSearchPatient(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-blue-500 w-32"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-slate-500" />
                    <input 
                        type="date" 
                        value={listFilterDate} 
                        onChange={(e) => { setListFilterDate(e.target.value); setListFilterMonth(''); }}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-blue-500"
                        title="Filter by Specific Date"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-slate-500" />
                    <input 
                        type="month" 
                        value={listFilterMonth} 
                        onChange={(e) => { setListFilterMonth(e.target.value); setListFilterDate(''); }}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-blue-500"
                        title="Filter by Entire Month"
                    />
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/40 border border-indigo-700/50 rounded-lg shadow-inner">
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Total:</span>
                    <span className="text-xs font-black text-white">{filteredAppointments.length}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/40 border border-emerald-700/50 rounded-lg shadow-inner">
                    <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Total Fee:</span>
                    <span className="text-xs font-black text-white">৳ {(totalFilteredFees || 0).toFixed(2)}</span>
                </div>
                <button 
                    onClick={handlePrintList}
                    className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors text-xs font-bold shadow-lg shadow-sky-900/20"
                    title="Print Appointment List"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print List
                </button>
                <button 
                    onClick={() => { setListSearchDoctor(''); setListSearchPatient(''); setListFilterDate(''); setListFilterMonth(''); }}
                    className="p-1.5 bg-slate-700 hover:bg-rose-600 text-white rounded-lg transition-colors"
                    title="Clear List Filters"
                >
                    <TrashIcon size={16} />
                </button>
            </div>
        </div>

        <div className="overflow-x-auto border border-slate-700 rounded-2xl shadow-inner bg-slate-950/20">
            <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">SL</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Schedule</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient Details</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Doctor</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Fee</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {(Array.isArray(filteredAppointments) ? filteredAppointments : []).length > 0 ? (Array.isArray(filteredAppointments) ? filteredAppointments : []).map((appt, index) => (
                        <tr 
                            key={appt.appointment_id} 
                            className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${selectedAppointmentId === appt.appointment_id ? 'bg-blue-900/20 border-l-4 border-blue-500' : ''}`} 
                            onClick={() => handleRowClick(appt)}
                        >
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-sky-400">{appt.appointment_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-slate-200">{appt.appointment_date}</div>
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{appt.appointment_time}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-black text-white uppercase">{appt.patient_name}</div>
                                <div className="text-[10px] text-slate-400 italic">Reason: {appt.reason}</div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-300">Dr. {appt.doctor_name}</td>
                            <td className="px-6 py-4 text-right font-black text-slate-100">৳ {(appt.doctor_fee || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                {/* Fix: Line 562 - Fixed the unintentional comparison by removing 'appt.status ===' prefix for the fallback class string */}
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-inner ${appt.status === 'Completed' ? 'bg-emerald-900/40 text-emerald-400' : appt.status === 'Scheduled' ? 'bg-blue-900/40 text-blue-400' : appt.status === 'Returned' ? 'bg-amber-900/40 text-amber-500' : 'bg-rose-900/40 text-rose-400'}`}>
                                    {appt.status}
                                </span>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={7} className="p-20 text-center text-slate-700 italic font-black uppercase opacity-20 text-2xl tracking-[0.3em]">No Appointment Data</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* EMBEDDED MODALS */}
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
                  onClick={() => {
                    setShowNewPatientForm(true);
                    setShowPatientSearchModal(false);
                    setPatientSearchFilters({ name: '', mobile: '', address: '', thana: '', age: '' });
                  }}
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
                    value={patientSearchFilters.name}
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
                  value={patientSearchFilters.age}
                  onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, age: e.target.value }))}
                  className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mobile Number</label>
                <input 
                  type="text" 
                  placeholder="017..."
                  value={patientSearchFilters.mobile}
                  onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, mobile: e.target.value }))}
                  className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Address / Village</label>
                <input 
                  type="text" 
                  placeholder="Address..."
                  value={patientSearchFilters.address}
                  onChange={(e) => setPatientSearchFilters(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upazila / Thana</label>
                <input 
                  type="text" 
                  placeholder="Thana..."
                  value={patientSearchFilters.thana}
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
              {(Array.isArray(filteredPatients) ? filteredPatients : []).length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {(Array.isArray(filteredPatients) ? filteredPatients : []).map(p => (
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

      {showNewPatientForm && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"><div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-slate-700 bg-slate-900 relative shadow-[0_0_100px_rgba(0,0,0,0.8)]"><button onClick={() => setShowNewPatientForm(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white z-10 p-2 bg-slate-800 rounded-full">&times;</button><div className="p-2"><PatientInfoPage patients={patients} setPatients={setPatients} isEmbedded onClose={() => setShowNewPatientForm(false)} onSaveAndSelect={handlePatientSelect} performBlockingSync={performBlockingSync} /></div></div></div>}
      {showNewDoctorForm && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"><div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-slate-700 bg-slate-900 relative shadow-[0_0_100px_rgba(0,0,0,0.8)]"><button onClick={() => setShowNewDoctorForm(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white z-10 p-2 bg-slate-800 rounded-full">&times;</button><div className="p-2"><DoctorInfoPage doctors={doctors} setDoctors={setDoctors} isEmbedded onClose={() => setShowNewDoctorForm(false)} onSaveAndSelect={handleDoctorSelect} performBlockingSync={performBlockingSync} /></div></div></div>}
      {showNewReferrarForm && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"><div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-slate-700 bg-slate-900 relative shadow-[0_0_100px_rgba(0,0,0,0.8)]"><button onClick={() => setShowNewReferrarForm(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white z-10 p-2 bg-slate-800 rounded-full">&times;</button><div className="p-2"><ReferrerInfoPage referrars={referrars} setReferrars={setReferrars} isEmbedded onClose={() => setShowNewReferrarForm(false)} onSaveAndSelect={handleReferrarSelect} performBlockingSync={performBlockingSync} /></div></div></div>}
    </div>
  );
};

export default DoctorAppointmentPage;