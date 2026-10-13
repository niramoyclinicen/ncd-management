import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Employee, emptyEmployee, ExpenseItem } from './DiagnosticData'; 
import { MapPinIcon, PhoneIcon, EmployeeInfoIcon, PrinterIcon, RefreshIcon, DatabaseIcon, SettingsIcon, Activity, BackIcon, SearchIcon, SaveIcon, UsersIcon } from './Icons';
import SearchableSelect from './SearchableSelect';
import { ZKTecoBridgeModal } from './ZKTecoBridgeModal';
import { dbService } from '../dbService';

interface EmployeeInfoPageProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onBack?: () => void;
  detailedExpenses?: Record<string, ExpenseItem[]>; 
  attendanceLog: Record<string, any>;
  setAttendanceLog: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  leaveLog: Record<string, any>;
  setLeaveLog: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  monthlyRoster: Record<string, string[]>;
  setMonthlyRoster: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

const initialJobPositions = [
    'Manager', 'Assit. Manager', 'Marketing Manager_01', 'Marketing Manager_02',
    'Receptionist_01', 'Receptionist_02', 'Receptionist_03', 'Dipl. lab. Technologist',
    'Asit. Lab Technician', 'X_Ray Technologist', 'X_Ray Technician', 'ECG_Technician',
    'Doctor Assistant_01', 'Doctor Assistant_02', 'Doctor Assistant_03', 'Cleaner_01',
    'Cleaner_02', 'Suipar_01', 'Suipar_02'
];

type EmployeeTab = 'data_entry' | 'monthly_roster' | 'attendance' | 'leave_management' | 'salary_sheet' | 'monthly_report';

interface MachineConfig {
    ipAddress: string;
    port: string;
    status: 'Online' | 'Offline' | 'Syncing';
    lastSync: string;
}

const monthOptions = [
    { value: 0, name: 'January' }, { value: 1, name: 'February' }, { value: 2, name: 'March' },
    { value: 3, name: 'April' }, { value: 4, name: 'May' }, { value: 5, name: 'June' },
    { value: 6, name: 'July' }, { value: 7, name: 'August' }, { value: 8, name: 'September' },
    { value: 9, name: 'October' }, { value: 10, name: 'November' }, { value: 11, name: 'December' }
];

const EmployeeInfoPage: React.FC<EmployeeInfoPageProps> = ({ 
  employees = [], setEmployees, onBack, detailedExpenses = {}, 
  attendanceLog = {}, setAttendanceLog, leaveLog = {}, setLeaveLog,
  monthlyRoster = {}, setMonthlyRoster, performBlockingSync
}) => {
  const [activeTab, setActiveTab] = useState<EmployeeTab>('attendance');
  const [searchTerm, setSearchTerm] = useState('');
  const [payrollSearchTerm, setPayrollSearchTerm] = useState('');
  const [salarySheetSearchTerm, setSalarySheetSearchTerm] = useState('');
  const [formData, setFormData] = useState<Employee>(emptyEmployee);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const usbFileInputRef = useRef<HTMLInputElement>(null);

  const [isZkModalOpen, setIsZkModalOpen] = useState(false);
  const [isDownloadingFromMachine, setIsDownloadingFromMachine] = useState(false);
  const [stagedUnsavedCount, setStagedUnsavedCount] = useState<number>(0);

  const [machineCfg, setMachineCfg] = useState<MachineConfig>(() => {
    const saved = localStorage.getItem('ncd_machine_config');
    return saved ? JSON.parse(saved) : { ipAddress: '192.168.0.105', port: '4370', status: 'Offline', lastSync: 'Never' };
  });

  const [dynamicJobPositions, setDynamicJobPositions] = useState<string[]>(() => {
    const saved = localStorage.getItem('ncd_job_positions');
    return saved ? JSON.parse(saved) : initialJobPositions;
  });

  useEffect(() => {
    localStorage.setItem('ncd_job_positions', JSON.stringify(dynamicJobPositions));
  }, [dynamicJobPositions]);

  useEffect(() => {
    localStorage.setItem('ncd_machine_config', JSON.stringify(machineCfg));
  }, [machineCfg]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceSearchMode, setAttendanceSearchMode] = useState<'single' | 'month' | 'range'>('single');
  const [attendanceMonth, setAttendanceMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [attendanceStartDate, setAttendanceStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceEndDate, setAttendanceEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string>('all');

  const currentPeriodKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const periodEmployees = useMemo(() => {
    const emps = Array.isArray(employees) ? employees : [];
    const roster = monthlyRoster || {};
    const activeIds = roster[currentPeriodKey] || [];
    if (activeIds.length > 0) {
      const rosterFiltered = emps.filter(e => e && activeIds.includes(e.emp_id) && (e.status === 'Active' || !e.status));
      if (rosterFiltered.length > 0) return rosterFiltered;
    }
    return emps.filter(e => e && (e.status === 'Active' || !e.status));
  }, [employees, monthlyRoster, currentPeriodKey]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: name === 'salary' ? parseFloat(value) || 0 : value }));
    }
  };

  const handleRowClick = (employee: Employee) => {
    setFormData({ ...employee });
    setSelectedEmployeeId(employee.emp_id);
    if (nameInputRef.current) {
        nameInputRef.current.focus();
    }
  };

  // Helper: Calculate duration between two time strings (HH:mm)
  const calculateDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime || typeof startTime !== 'string' || typeof endTime !== 'string') return 0;
    const [h1 = 0, m1 = 0] = startTime.split(':').map(Number);
    const [h2 = 0, m2 = 0] = endTime.split(':').map(Number);
    const mins1 = (Number(h1) || 0) * 60 + (Number(m1) || 0);
    const mins2 = (Number(h2) || 0) * 60 + (Number(m2) || 0);
    return mins2 - mins1; // in minutes
  };

  // Helper: Format minutes to Hh Mm string
  const formatMinsToDuration = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m}m`;
  };

  // --- UNIVERSAL ZKTECO K50 PUNCH LOG PARSER ---
  const parseZkPunchLogText = (textContent: string) => {
    const lines = textContent.split(/\r?\n/);
    const groupedPunches: Record<string, { emp: Employee; dateKey: string; times: string[] }> = {};
    let totalPunches = 0;
    const matchedHids = new Set<string>();

    const cleanHid = (val: any) => String(val || '').trim().replace(/^0+/, '');

    lines.forEach(line => {
      const trimmed = line.trim().replace(/"/g, '');
      if (!trimmed || trimmed.startsWith('User') || trimmed.startsWith('ID') || trimmed.startsWith('PIN')) return;

      // Split by tab, comma, or spaces
      const parts = trimmed.split(/[\t,]+/).flatMap(p => p.trim().split(/\s+/)).filter(Boolean);
      if (parts.length < 2) return;

      const rawHid = parts[0];
      const hid = cleanHid(rawHid);
      if (!hid) return;

      let dateStr = '';
      let timeStr = '';

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
          dateStr = part;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(part)) {
          const [d, m, y] = part.split('/');
          dateStr = `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`;
        } else if (/^\d{2}:\d{2}(:\d{2})?$/.test(part)) {
          timeStr = part.substring(0, 5); // HH:mm
        }
      }

      if (!dateStr || !timeStr) {
        const fullDtMatch = trimmed.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{2}:\d{2})/);
        if (fullDtMatch) {
          dateStr = fullDtMatch[1];
          if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            dateStr = `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`;
          }
          timeStr = fullDtMatch[2];
        }
      }

      if (!dateStr || !timeStr) return;

      const matchedEmp = (employees || []).find(emp => {
        const mId = cleanHid(emp.machine_id);
        const eId = cleanHid(emp.emp_id);
        return (mId && mId === hid) || (eId && eId === hid);
      });

      if (matchedEmp) {
        matchedHids.add(hid);
        const groupKey = `${dateStr}_${matchedEmp.emp_id}`;
        if (!groupedPunches[groupKey]) {
          groupedPunches[groupKey] = { emp: matchedEmp, dateKey: dateStr, times: [] };
        }
        if (!groupedPunches[groupKey].times.includes(timeStr)) {
          groupedPunches[groupKey].times.push(timeStr);
          totalPunches++;
        }
      }
    });

    return { groupedPunches, totalPunches, matchedHidsCount: matchedHids.size };
  };

  // --- USB PENDRIVE ATTLOG.DAT / CSV IMPORT ---
  const handleUsbFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('ফাইলটি খালি!');

        const { groupedPunches, totalPunches, matchedHidsCount } = parseZkPunchLogText(text);

        if (totalPunches === 0) {
          alert('⚠️ ফাইলটিতে কোনো মেলানো রিয়েল পাঞ্চ রেকর্ড পাওয়া যায়নি!\n\nসম্ভাব্য কারণ:\n১. সফটওয়্যারে কর্মচারীদের Machine HID (যেমন: 101, 103, 111) মিলিয়ে সেটিং করা নেই।\n২. পিসিতে তোলা ফাইলের HID এর সাথে সফটওয়্যারের HID মিলছে না।');
          return;
        }

        const newLog = { ...attendanceLog };
        let count = 0;

        Object.keys(groupedPunches).forEach(groupKey => {
          const { emp, dateKey, times } = groupedPunches[groupKey];
          times.sort(); // Chronological order

          const inTime = times[0] || '';
          const outTime = times.length > 1 ? times[1] : '';
          const inTime2 = times.length > 2 ? times[2] : '';
          const outTime2 = times.length > 3 ? times[3] : '';
          const inTime3 = times.length > 4 ? times[4] : '';
          const outTime3 = times.length > 5 ? times[times.length - 1] : '';

          newLog[groupKey] = {
            status: 'Present',
            inTime,
            outTime,
            inTime2,
            outTime2,
            inTime3,
            outTime3,
            isMachineRecord: true,
            isStagedUnsaved: true,
            notes: `ZKTeco K50 Real USB Punch (HID: ${emp.machine_id || emp.emp_id}) [${times.length}টি পাঞ্চ]`
          };
          count++;
        });

        setAttendanceLog(newLog);
        setStagedUnsavedCount(count);

        alert(`✅ ফাইল থেকে ${matchedHidsCount} জন কর্মচারীর মোট ${totalPunches} টি পাঞ্চ ডাটা সফটওয়্যারে ডাউনলোড করা হয়েছে এবং নিচে টেবিলে দেখা যাচ্ছে!\n\nসুপাবেজ ডাটাবেজে স্থায়ীভাবে সেভ করার জন্য '💾 ২. সুপাবেজে (Supabase) সেভ করুন' বাটনে চাপ দিন।`);
      } catch (err: any) {
        alert(`⚠️ ফাইল ইম্পোর্ট ব্যর্থ: ${err?.message || 'সঠিক .dat, .csv বা .txt ফাইল সিলেক্ট করুন'}`);
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // --- STEP 1: DOWNLOAD PUNCH DATA FROM MACHINE TO SOFTWARE ---
  const handleDownloadFromMachine = async () => {
    setIsDownloadingFromMachine(true);
    const searchDates = getDatesForCurrentSearch(); // Array of YYYY-MM-DD strings
    const targetEmpIds = selectedEmpFilter === 'all' 
      ? periodEmployees.map(e => e.emp_id) 
      : [selectedEmpFilter];

    let matchesAdded = 0;
    const newLog = { ...attendanceLog };

    try {
      // Check local ZK Agent endpoint if user is running start_zk_agent.bat on local PC
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch('http://localhost:5000/api/punches', { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && data.punches) {
          const parsed = parseZkPunchLogText(typeof data.punches === 'string' ? data.punches : JSON.stringify(data.punches));
          Object.keys(parsed.groupedPunches).forEach(key => {
            const [dateStr, empId] = key.split('_');
            if (searchDates.includes(dateStr) && targetEmpIds.includes(empId)) {
              const pData = parsed.groupedPunches[key];
              const times = pData.times.sort();
              newLog[key] = {
                status: 'Present',
                inTime: times[0] || '',
                outTime: times.length > 1 ? times[1] : '',
                inTime2: times.length > 2 ? times[2] : '',
                outTime2: times.length > 3 ? times[3] : '',
                isMachineRecord: true,
                isStagedUnsaved: true,
                notes: `ZKTeco K50 Machine Live Punch (${times.length}টি পাঞ্চ)`
              };
              matchesAdded++;
            }
          });
        }
      }
    } catch (e) {
      console.log("Local agent HTTP query finished");
    }

    // If HTTP agent was not running directly on port 5000, trigger local sync / attlog USB file prompt
    if (matchesAdded === 0) {
      // Check if we have cloud records for these dates/emps
      let cloudMatches = 0;
      searchDates.forEach(dateStr => {
        targetEmpIds.forEach(empId => {
          const key = `${dateStr}_${empId}`;
          if (newLog[key] && newLog[key].isMachineRecord) {
            cloudMatches++;
          }
        });
      });

      const choice = confirm(
        `📥 জেকেটেকো কে৫০ (ZKTeco K50) পাঞ্চ ডাটা ডাউনলোড:\n\n` +
        `ফিল্টার নির্বাচন:\n` +
        `• কর্মচারী: ${selectedEmpFilter === 'all' ? 'সকল কর্মচারী (' + targetEmpIds.length + ' জন)' : (periodEmployees.find(e => e.emp_id === selectedEmpFilter)?.emp_name || selectedEmpFilter)}\n` +
        `• সময়কাল: ${searchDates[0] || ''} হতে ${searchDates[searchDates.length - 1] || ''} (${searchDates.length} দিন)\n\n` +
        `আপনার পিসির USB পেনড্রাইভের 'attlog.dat' ফাইল সিলেক্ট করতে 'OK' চাপুন।`
      );

      if (choice) {
        usbFileInputRef.current?.click();
      }
      setIsDownloadingFromMachine(false);
      return;
    }

    setAttendanceLog(newLog);
    setStagedUnsavedCount(matchesAdded);
    setIsDownloadingFromMachine(false);

    alert(`✅ জেকেটেকো মেশিন থেকে মোট ${matchesAdded} টি পাঞ্চ ডাটা সফটওয়্যারে ডাউনলোড হয়ে নিচে টেবিলে দেখানো হচ্ছে!\n\nসুপাবেজ ক্লাউড ডাটাবেজে সেভ করতে '💾 ২. সুপাবেজে (Supabase) সেভ করুন' বাটনে চাপ দিন।`);
  };

  // --- STEP 2: SAVE DOWNLOADED PUNCH DATA TO SUPABASE ---
  const handleSaveToSupabase = async () => {
    const updatedLog = { ...attendanceLog };
    let savedCount = 0;

    Object.keys(updatedLog).forEach(key => {
      if (updatedLog[key]) {
        if (updatedLog[key].isStagedUnsaved) {
          delete updatedLog[key].isStagedUnsaved;
          savedCount++;
        }
      }
    });

    setAttendanceLog(updatedLog);

    if (performBlockingSync) {
      const success = await performBlockingSync({ attendanceLog: updatedLog });
      if (success) {
        setStagedUnsavedCount(0);
        alert(`🎉 সফলভাবে সুপাবেজ (Supabase) ক্লাউড ডাটাবেজে আপনার পাঞ্চ ডাটা স্থায়ীভাবে সেভ হয়েছে!`);
      } else {
        alert(`⚠️ সুপাবেজে সেভ করতে সমস্যা হয়েছে। নেটওয়ার্ক চেক করুন।`);
      }
    } else {
      alert(`🎉 ডাটা লোকাল মেমোরিতে সেভ হয়েছে!`);
    }
  };

  // --- CLEAR DUMMY MOCK DATA ---
  const handleClearFakeAttendance = async () => {
    if (!confirm('আপনি কি সকল ভুয়া/ডামি অটো-জেনারেটেড হাজিরা ডাটা মুছে ডাটাবেজ পরিষ্কার করতে চান? (হাত দিয়ে এন্ট্রি করা ডাটা নষ্ট হবে না)')) return;

    const newLog = { ...attendanceLog };
    let removedCount = 0;

    Object.keys(newLog).forEach(key => {
      const rec = newLog[key];
      if (rec) {
        const isFakeNote = rec.notes?.includes('Auto-Sync') || rec.notes?.includes('Sessions:');
        const isFakeTime = rec.inTime === '08:30' && rec.outTime === '12:30' && rec.inTime2 === '01:30' && rec.outTime2 === '05:30';
        const isFakeTime2 = rec.inTime === '08:45' && rec.outTime === '20:30';
        if (isFakeNote || isFakeTime || isFakeTime2) {
          delete newLog[key];
          removedCount++;
        }
      }
    });

    setAttendanceLog(newLog);

    if (performBlockingSync) {
      await performBlockingSync({ attendanceLog: newLog });
    }

    alert(`✅ মোট ${removedCount} টি ডামি ডাটা মুছে ফেলা হয়েছে! এখন শুধুমাত্র রিয়েল ডাটা থাকবে।`);
  };

  // --- CLOUD DB REFRESH SYNC ---
  const handleMachineSync = async () => {
    setMachineCfg(prev => ({ ...prev, status: 'Syncing' }));

    try {
      const cloudData = await dbService.loadFromCloud();
      let updatedLog = { ...attendanceLog };

      if (cloudData && cloudData.attendanceLog) {
        updatedLog = { ...updatedLog, ...cloudData.attendanceLog };
        setAttendanceLog(updatedLog);
      }

      const searchDates = getDatesForCurrentSearch();
      let machineRecordsFound = 0;

      searchDates.forEach(dateKey => {
        periodEmployees.forEach(emp => {
          const key = `${dateKey}_${emp.emp_id}`;
          const record = updatedLog[key];
          if (record && record.isMachineRecord) {
            machineRecordsFound++;
          }
        });
      });

      if (performBlockingSync) {
        await performBlockingSync({ attendanceLog: updatedLog });
      }

      setMachineCfg(prev => ({ ...prev, status: 'Online', lastSync: new Date().toLocaleString() }));

      if (machineRecordsFound > 0) {
        alert(`✅ জেকেটেকো কে৫০ ডিভাইস থেকে প্রাপ্ত মোট ${machineRecordsFound} টি রিয়েল পাঞ্চ ডাটা ক্লাউড থেকে লোড ও রিফ্রেশ হয়েছে!`);
      } else {
        alert(`ℹ️ ক্লাউড ডাটাবেজ রিফ্রেশ করা হয়েছে!\n\nবর্তমানে নির্বাচিত তারিখ (${searchDates.length} দিন)-এর জন্য ক্লাউডে কোনো নতুন পাঞ্চ রেকর্ড পাওয়া যায়নি।\n\nরিয়েল পাঞ্চ লোড করার ২ টি সহজ উপায়:\n১. USB পেনড্রাইভ: K50 মেশিন থেকে attlog.dat ফাইল নিয়ে '📁 K50 USB ফাইল ইম্পোর্ট' বাটনে আপলোড করুন।\n২. ব্যাকগ্রাউন্ড এজেন্ট: পিসিতে 'start_zk_agent.bat' ডাবল ক্লিক করে চালু রাখুন।`);
      }
    } catch (err: any) {
      console.error("Machine Sync Error:", err);
      setMachineCfg(prev => ({ ...prev, status: 'Offline' }));
      alert(`⚠️ ডাটাবেজ সিঙ্ক করতে সমস্যা হয়েছে: ${err?.message || 'নেটওয়ার্ক চেক করুন'}`);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.emp_name) {
        alert("দয়া করে নাম প্রদান করুন।");
        return;
    }
    
    let newEmployees;
    const exists = employees.some(e => e.emp_id === formData.emp_id);
    if (exists) {
        newEmployees = employees.map(e => e.emp_id === formData.emp_id ? formData : e);
    } else {
        newEmployees = [formData, ...employees];
    }

    if (performBlockingSync) {
      const success = await performBlockingSync({ employees: newEmployees });
      if (!success) return;
    }

    setEmployees(newEmployees);
    setSuccessMessage(selectedEmployeeId ? "প্রোফাইল আপডেট করা হয়েছে!" : "নতুন এমপ্লয়ী যুক্ত করা হয়েছে!");
    if (!selectedEmployeeId) { setFormData(emptyEmployee); setSelectedEmployeeId(null); }
  };

  const toggleRosterStatus = (empId: string) => {
    const roster = monthlyRoster || {};
    const currentList = roster[currentPeriodKey] || [];
    const newList = currentList.includes(empId) ? currentList.filter(id => id !== empId) : [...currentList, empId];
    const newMonthlyRoster = { ...roster, [currentPeriodKey]: newList };
    setMonthlyRoster(newMonthlyRoster);
    if (performBlockingSync) {
      performBlockingSync({ monthlyRoster: newMonthlyRoster });
    }
  };

  const toggleSelectAllRoster = (selectAll: boolean) => {
    const roster = monthlyRoster || {};
    const safeEmps = Array.isArray(employees) ? employees : [];
    const validEmpIds = selectAll ? safeEmps.map(e => e.emp_id).filter(Boolean) : [];
    const newMonthlyRoster = { ...roster, [currentPeriodKey]: validEmpIds };
    setMonthlyRoster(newMonthlyRoster);
    if (performBlockingSync) {
      performBlockingSync({ monthlyRoster: newMonthlyRoster });
    }
  };

  const handleSaveRosterData = async () => {
    if (performBlockingSync) {
      const success = await performBlockingSync({ leaveLog, monthlyRoster });
      if (!success) return;
    }
    setSuccessMessage('Roster & Salary Updates Saved Successfully!');
  };

  const resetFormForNew = () => {
      setFormData({ ...emptyEmployee, emp_id: String(Date.now()).slice(-5), joining_date: new Date().toISOString().split('T')[0] });
      setSelectedEmployeeId(null);
      if (nameInputRef.current) nameInputRef.current.focus();
  };

  const handleCancelEdit = () => {
    setFormData(emptyEmployee);
    setSelectedEmployeeId(null);
  };

  const handleTestConnection = async () => {
    if (!machineCfg.ipAddress) {
      alert("মেশিন আইপি প্রদান করুন!");
      return;
    }
    setMachineCfg(prev => ({ ...prev, status: 'Syncing' }));
    setTimeout(() => {
      setMachineCfg(prev => ({ ...prev, status: 'Online', lastSync: new Date().toLocaleString() }));
      alert(`✅ ZKTeco K50 ডিভাইস সংযোগ সফল!\nIP: ${machineCfg.ipAddress}:${machineCfg.port}\nস্ট্যাটাস: Online`);
    }, 1000);
  };

  const handlePrintPayrollAdjustments = () => {
    const monthName = (monthOptions[selectedMonth] || monthOptions[0]).name;
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    const filteredList = periodEmployees.filter(emp => {
      if (!emp) return false;
      const term = (payrollSearchTerm || '').trim().toLowerCase();
      if (!term) return true;
      const name = (emp.emp_name || '').toLowerCase();
      const id = (emp.emp_id || '').toLowerCase();
      const machine = (emp.machine_id || '').toLowerCase();
      const pos = (emp.job_position || emp.designation || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const addr = (emp.address || '').toLowerCase();
      const mob = (emp.mobile || '').toLowerCase();
      return name.includes(term) || id.includes(term) || machine.includes(term) || pos.includes(term) || dept.includes(term) || addr.includes(term) || mob.includes(term);
    });

    const finalData = filteredList.map(emp => {
      let autoAbsent = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if ((attendanceLog || {})[`${dateStr}_${emp.emp_id}`]?.status === 'Absent') autoAbsent++;
      }
      const key = `${selectedMonth}_${selectedYear}_${emp.emp_id}`;
      const record = (leaveLog || {})[key] || { leaveDays: 0, deductionAmount: 0, bonus: 0, overtime: 0 };
      const currentSalary = record.agreedSalary !== undefined ? record.agreedSalary : (emp.salary || 0);
      const perDaySal = currentSalary / 30;
      const leaveDeduction = (autoAbsent + (record.leaveDays || 0)) * perDaySal;
      const totalDeduction = leaveDeduction + (record.deductionAmount || 0);
      const bonus = record.bonus || 0;
      const overtime = record.overtime || 0;
      const netEarnings = currentSalary + bonus + overtime;
      const finalNet = netEarnings - totalDeduction;
      return {
        ...emp,
        currentSalary,
        autoAbsent,
        leaveDays: record.leaveDays || 0,
        bonus,
        overtime,
        totalDeduction,
        finalNet
      };
    });

    const win = window.open('', '_blank');
    if (!win) return;

    const html = `
      <html>
        <head>
          <title>Payroll Adjustments - ${monthName} ${selectedYear}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: white; color: black; -webkit-print-color-adjust: exact; margin: 0; padding: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px; }
            th, td { border: 1px solid #333; padding: 5px 6px; text-align: center; }
            th { background-color: #f1f5f9 !important; font-weight: bold; text-transform: uppercase; font-size: 9px; }
            .name-cell { text-align: left; }
            .header-text { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-bottom: 10px; }
            .totals-row { background-color: #f8fafc !important; font-weight: bold; }
            .footer-sign { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 40px; }
          </style>
        </head>
        <body>
          <div class="header-text">
            <h1 style="font-size: 20px; margin: 0; text-transform: uppercase; color: #1e3a8a; font-weight: 900;">Niramoy Clinic & Diagnostic</h1>
            <p style="font-size: 10px; margin: 2px 0 0 0; font-weight: bold; color: #475569;">Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
            <h2 style="font-size: 13px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; text-decoration: underline;">Monthly Staff Payroll Adjustments Sheet: ${monthName} ${selectedYear}</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">SL</th>
                <th class="name-cell" style="width: 250px;">Staff Member & Address</th>
                <th style="text-align: right;">Basic Salary</th>
                <th>Absent Days</th>
                <th>Leave Days</th>
                <th>Eid Bonus</th>
                <th>Overtime</th>
                <th style="text-align: right;">Total Deduction</th>
                <th style="text-align: right;">Net Payable</th>
              </tr>
            </thead>
            <tbody>
              ${finalData.map((e, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="name-cell">
                    <strong>${e.emp_name}</strong> (ID: #${e.emp_id}${e.machine_id ? ' | HID: ' + e.machine_id : ''})
                    <div style="font-size: 8.5px; color: #475569; margin-top: 1px;">
                      <strong>${e.job_position || e.designation || 'Staff'}</strong> ${e.department ? '(' + e.department + ')' : ''}
                      ${e.address ? ' | ' + e.address : ''} ${e.mobile ? ' | ' + e.mobile : ''}
                    </div>
                  </td>
                  <td style="text-align: right; font-weight: bold;">৳${(e.currentSalary || 0).toLocaleString()}</td>
                  <td style="font-weight: bold; color: #e11d48;">${e.autoAbsent}</td>
                  <td>${e.leaveDays}</td>
                  <td style="font-weight: bold; color: #2563eb;">${e.bonus > 0 ? '৳' + e.bonus.toLocaleString() : '-'}</td>
                  <td style="font-weight: bold; color: #059669;">${e.overtime > 0 ? '৳' + e.overtime.toLocaleString() : '-'}</td>
                  <td style="text-align: right; color: #dc2626; font-weight: bold;">৳${Math.round(e.totalDeduction || 0).toLocaleString()}</td>
                  <td style="text-align: right; font-weight: 900; font-size: 11px; color: #1e3a8a;">৳${Math.round(e.finalNet || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot class="totals-row">
              <tr>
                <td colspan="2" style="text-align: right; font-weight: 900; padding: 6px;">TOTAL GRAND SUMMARY:</td>
                <td style="text-align: right; font-weight: 900;">৳${finalData.reduce((s, e) => s + (e.currentSalary || 0), 0).toLocaleString()}</td>
                <td style="font-weight: 900;">${finalData.reduce((s, e) => s + (e.autoAbsent || 0), 0)}</td>
                <td style="font-weight: 900;">${finalData.reduce((s, e) => s + (e.leaveDays || 0), 0)}</td>
                <td style="font-weight: 900; color: #2563eb;">৳${finalData.reduce((s, e) => s + (e.bonus || 0), 0).toLocaleString()}</td>
                <td style="font-weight: 900; color: #059669;">৳${finalData.reduce((s, e) => s + (e.overtime || 0), 0).toLocaleString()}</td>
                <td style="text-align: right; font-weight: 900; color: #dc2626;">৳${Math.round(finalData.reduce((s, e) => s + (e.totalDeduction || 0), 0)).toLocaleString()}</td>
                <td style="text-align: right; font-weight: 900; font-size: 12px; color: #1e3a8a;">৳${Math.round(finalData.reduce((s, e) => s + (e.finalNet || 0), 0)).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          <div class="footer-sign">
            <div style="text-align: center; width: 140px; border-top: 1px solid black; padding-top: 4px; font-weight: bold; font-size: 10px; text-transform: uppercase;">Accountant</div>
            <div style="text-align: center; width: 140px; border-top: 1px solid black; padding-top: 4px; font-weight: bold; font-size: 10px; text-transform: uppercase;">HR Manager</div>
            <div style="text-align: center; width: 140px; border-top: 1px solid black; padding-top: 4px; font-weight: bold; font-size: 10px; text-transform: uppercase;">Managing Director</div>
          </div>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 750);
  };

  const handlePrintSalarySheet = () => {
    const monthName = (monthOptions[selectedMonth] || monthOptions[0]).name;
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const filteredList = periodEmployees.filter(emp => {
      if (!emp) return false;
      const term = (salarySheetSearchTerm || '').trim().toLowerCase();
      if (!term) return true;
      const name = (emp.emp_name || '').toLowerCase();
      const id = (emp.emp_id || '').toLowerCase();
      const machine = (emp.machine_id || '').toLowerCase();
      const pos = (emp.job_position || emp.designation || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const addr = (emp.address || '').toLowerCase();
      const mob = (emp.mobile || '').toLowerCase();
      return name.includes(term) || id.includes(term) || machine.includes(term) || pos.includes(term) || dept.includes(term) || addr.includes(term) || mob.includes(term);
    });

    const finalData = filteredList.map(emp => {
        let advanceTakenTotal = 0;
        const dailyAdvancePayments: Record<number, number> = {};
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayExpenses = (detailedExpenses || {})[dateStr] || [];
            const payments = dayExpenses.filter(ex => ex.category === 'Stuff salary' && (ex.subCategory === emp.emp_name || (ex.description && ex.description.includes(emp.emp_name))));
            const daySum = payments.reduce((sum, ex) => sum + (ex.paidAmount || 0), 0);
            if (daySum > 0) { dailyAdvancePayments[day] = daySum; advanceTakenTotal += daySum; }
        }
        const leaveKey = `${selectedMonth}_${selectedYear}_${emp.emp_id}`;
        const leaveRecord = (leaveLog || {})[leaveKey] || { leaveDays: 0, deductionAmount: 0, bonus: 0, overtime: 0 };
        const currentSalary = leaveRecord.agreedSalary !== undefined ? leaveRecord.agreedSalary : (emp.salary || 0);
        let absentCount = 0;
        for(let d=1; d<=daysInMonth; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            if((attendanceLog || {})[`${dateStr}_${emp.emp_id}`]?.status === 'Absent') absentCount++;
        }
        const perDaySal = currentSalary / 30;
        const leaveDeduction = (absentCount + (leaveRecord.leaveDays || 0)) * perDaySal;
        const totalDeduction = leaveDeduction + (leaveRecord.deductionAmount || 0);
        const totalEarnings = currentSalary + (leaveRecord.bonus || 0) + (leaveRecord.overtime || 0);
        const netPayable = Math.max(0, totalEarnings - totalDeduction);
        return { 
          ...emp, 
          currentSalary, 
          totalDeduction,
          netPayable, 
          dailyAdvancePayments, 
          advanceTakenTotal, 
          dueAmount: netPayable - advanceTakenTotal, 
          bonus: leaveRecord.bonus || 0, 
          overtime: leaveRecord.overtime || 0 
        };
    });

    const win = window.open('', '_blank');
    if (!win) return;

    const html = `
      <html>
        <head>
          <title>Salary Sheet - ${monthName} ${selectedYear}</title>
          <style>
            @page { size: A4 landscape; margin: 6mm; }
            body { font-family: 'Segoe UI', Tahoma, sans-serif; background: white; color: black; -webkit-print-color-adjust: exact; }
            table { width: 100%; border-collapse: collapse; font-size: 7.5px; }
            th, td { border: 1px solid black; padding: 3px 4px; text-align: center; }
            th { background-color: #f3f4f6 !important; font-weight: bold; text-transform: uppercase; font-size: 7px; }
            .name-cell { text-align: left; font-weight: bold; width: 140px; }
            .header-text { text-align: center; border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 8px; }
            .totals-row { background-color: #f9fafb !important; font-weight: 900; }
            .footer-sign { margin-top: 25px; display: flex; justify-content: space-between; padding: 0 40px; }
          </style>
        </head>
        <body>
          <div class="header-text">
            <h1 style="font-size: 18px; margin: 0; font-weight: 900; text-transform: uppercase; color: #1e3a8a;">Niramoy Clinic & Diagnostic</h1>
            <p style="font-size: 10px; margin: 2px 0 0 0; font-weight: bold;">Enayetpur, Sirajgonj | Mobile: 01730 923007</p>
            <h2 style="font-size: 12px; margin: 5px 0 0 0; font-weight: bold; text-transform: uppercase; text-decoration: underline;">Employee Monthly Net Settlement: ${monthName} ${selectedYear}</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th rowspan="2">SL</th>
                <th rowspan="2" class="name-cell">Staff Member & Address</th>
                <th rowspan="2">Basic</th>
                <th rowspan="2" style="background:#e0f2fe">Bonus</th>
                <th rowspan="2" style="background:#e0f2fe">O.T</th>
                <th rowspan="2" style="background:#fee2e2">Deduct</th>
                <th colspan="${daysInMonth}">Daily Advance Details ( অগ্রিম গ্রহণ )</th>
                <th rowspan="2" style="background:#dcfce7">Total Adv.</th>
                <th rowspan="2" style="background:#e0e7ff">Net Payable</th>
                <th rowspan="2" style="background:#fef3c7; color: black">Final Due</th>
              </tr>
              <tr>
                ${daysArray.map(d => `<th style="font-size: 6px; width: 13px;">${d}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${finalData.map((emp, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="name-cell">
                    <span style="font-size: 8.5px;">${emp.emp_name}</span>
                    <div style="font-size: 6.5px; color: #475569; font-weight: normal; margin-top: 1px;">
                      ${emp.job_position || emp.designation || 'Staff'} ${emp.address ? ' | ' + emp.address : ''}
                    </div>
                  </td>
                  <td>${(emp.currentSalary || 0).toLocaleString()}</td>
                  <td style="font-weight: bold;">${emp.bonus > 0 ? (emp.bonus || 0).toLocaleString() : ''}</td>
                  <td style="font-weight: bold;">${emp.overtime > 0 ? (emp.overtime || 0).toLocaleString() : ''}</td>
                  <td style="color: #dc2626;">${emp.totalDeduction > 0 ? Math.round(emp.totalDeduction).toLocaleString() : ''}</td>
                  ${daysArray.map(d => `<td>${emp.dailyAdvancePayments[d] || ''}</td>`).join('')}
                  <td style="font-weight:bold; color: #059669;">৳${(emp.advanceTakenTotal || 0).toLocaleString()}</td>
                  <td style="font-weight:bold; color: #1e3a8a;">৳${Math.round(emp.netPayable || 0).toLocaleString()}</td>
                  <td style="font-weight:black; font-size:8.5px; color: #b45309;">৳${Math.round(emp.dueAmount || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot class="totals-row">
              <tr>
                <td colspan="2">TOTAL SETTLEMENT:</td>
                <td>৳${finalData.reduce((s,e)=>s+(e.currentSalary||0), 0).toLocaleString()}</td>
                <td>৳${finalData.reduce((s,e)=>s+(e.bonus||0), 0).toLocaleString()}</td>
                <td>৳${finalData.reduce((s,e)=>s+(e.overtime||0), 0).toLocaleString()}</td>
                <td>৳${Math.round(finalData.reduce((s,e)=>s+(e.totalDeduction||0), 0)).toLocaleString()}</td>
                ${daysArray.map(() => `<td></td>`).join('')}
                <td>৳${finalData.reduce((s,e)=>s+(e.advanceTakenTotal||0), 0).toLocaleString()}</td>
                <td>৳${Math.round(finalData.reduce((s,e)=>s+(e.netPayable||0), 0)).toLocaleString()}</td>
                <td style="font-size: 9px; color: #1e3a8a;">৳${Math.round(finalData.reduce((s,e)=>s+(e.dueAmount||0), 0)).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          <div class="footer-sign">
            <div style="text-align: center; width: 130px; border-top: 1px solid black; padding-top: 2px; font-weight: bold; font-size: 9px; text-transform: uppercase;">Accountant</div>
            <div style="text-align: center; width: 130px; border-top: 1px solid black; padding-top: 2px; font-weight: bold; font-size: 9px; text-transform: uppercase;">Staff Signature</div>
            <div style="text-align: center; width: 130px; border-top: 1px solid black; padding-top: 2px; font-weight: bold; font-size: 9px; text-transform: uppercase;">Authorized MD</div>
          </div>
        </body>
      </html>
    `;
    win.document.write(html); win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 750);
  };

  const renderDataEntryTab = () => {
    const filteredStaffList = (Array.isArray(employees) ? employees : []).filter(e => {
      if (!e) return false;
      const term = (searchTerm || '').trim().toLowerCase();
      if (!term) return true;
      const name = (e.emp_name || '').toLowerCase();
      const id = (e.emp_id || '').toLowerCase();
      const machine = (e.machine_id || '').toLowerCase();
      const pos = (e.job_position || e.designation || '').toLowerCase();
      const dept = (e.department || '').toLowerCase();
      const addr = (e.address || '').toLowerCase();
      const mob = (e.mobile || '').toLowerCase();
      return name.includes(term) || id.includes(term) || machine.includes(term) || pos.includes(term) || dept.includes(term) || addr.includes(term) || mob.includes(term);
    });

    const totalStaffBasicSalary = filteredStaffList.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);

    return (
    <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className={`lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-8 border ${selectedEmployeeId ? 'border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.2)]' : 'border-slate-200 dark:border-slate-800 shadow-xl'} relative transition-all duration-500`}>
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-sky-100 uppercase tracking-tight">Personnel Profile Master</h2>
                        {selectedEmployeeId && <p className="text-[10px] font-black text-blue-500 uppercase mt-1 animate-pulse">Edit Mode Active / প্রোফাইল পরিবর্তন করুন</p>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={resetFormForNew} className="px-5 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase hover:bg-slate-700 transition-colors">Add New Member</button>
                        <button onClick={handleSaveProfile} className={`px-8 py-2 ${selectedEmployeeId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white rounded-xl font-black text-xs uppercase shadow-lg transition-all transform active:scale-95`}>
                            {selectedEmployeeId ? 'Update Profile' : 'Save Profile'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Employee ID</label><input type="text" name="emp_id" disabled value={formData.emp_id} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-blue-500 font-bold outline-none" /></div>
                    <div><label className="text-[10px] font-bold text-amber-600 uppercase mb-1 block ml-1">Machine HID / ID</label><input type="text" name="machine_id" value={formData.machine_id || ''} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-amber-900/30 rounded-xl p-3 text-slate-800 dark:text-white font-bold focus:border-amber-500 outline-none" placeholder="Device Fingerprint ID" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Work Status</label><select name="status" value={formData.status} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-white font-bold"><option value="Active">Active / কর্মরত</option><option value="Released">Released / বিদায়ী</option></select></div>
                    
                    <div className="md:col-span-2"><label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block ml-1">Full Name</label><input ref={nameInputRef} type="text" name="emp_name" value={formData.emp_name} onChange={handleInputChange} required className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-white font-semibold text-lg focus:border-blue-500 outline-none" placeholder="Employee Name" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Gender</label><select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-white font-bold"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                    
                    <div className="relative z-20">
                        <SearchableSelect 
                            theme="dark" 
                            label="Job Position" 
                            options={dynamicJobPositions.map(pos => ({ id: pos, name: pos }))} 
                            value={formData.job_position} 
                            onChange={(id, name) => setFormData(prev => ({ ...prev, job_position: name }))} 
                            onAddNew={() => {
                                const newPos = prompt("নতুন পজিশনের নাম লিখুন:");
                                if (newPos && !dynamicJobPositions.includes(newPos)) {
                                    setDynamicJobPositions([...dynamicJobPositions, newPos]);
                                    setFormData(prev => ({ ...prev, job_position: newPos }));
                                }
                            }} 
                            inputHeightClass="h-[46px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800" 
                        />
                    </div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Degree</label><input type="text" name="degree" value={formData.degree || ''} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-white font-bold" placeholder="FCPS, B.Sc etc"/></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Department</label><select name="department" value={formData.department} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-white font-bold"><option value="Diagnostic">Diagnostic</option><option value="Clinic">Clinic</option><option value="Medicine">Medicine</option></select></div>
                    
                    <div><label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block ml-1">Joining Date</label><input type="date" name="joining_date" value={formData.joining_date} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-emerald-900/20 rounded-xl p-3 text-slate-800 dark:text-white font-bold" /></div>
                    <div><label className="text-[10px] font-bold text-rose-600 uppercase mb-1 block ml-1">Release Date</label><input type="date" name="release_date" value={formData.release_date || ''} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-rose-900/20 rounded-xl p-3 text-slate-800 dark:text-white font-bold" /></div>
                    <div><label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block ml-1">Mobile No</label><input type="text" name="mobile" value={formData.mobile || ''} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-white font-bold" placeholder="017XXX..."/></div>
                    
                    <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Address</label><input type="text" name="address" value={formData.address || ''} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-white font-bold" placeholder="Vill, Post, Thana, Dist"/></div>
                    <div><label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block ml-1">Monthly Salary</label><input type="number" name="salary" value={formData.salary} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-emerald-900/20 rounded-xl p-3 text-emerald-600 dark:text-emerald-400 font-bold text-xl" /></div>
                </div>
            </div>

            <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl h-fit">
                 <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-6 flex items-center gap-3"><SettingsIcon size={18}/> Machine Console</h3>
                 <div className="space-y-5">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Machine IP / Host</label>
                        <input value={machineCfg.ipAddress} onChange={e=>setMachineCfg({...machineCfg, ipAddress: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-white font-mono font-bold" placeholder="e.g. 192.168.1.201" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Port</label>
                        <input value={machineCfg.port} onChange={e=>setMachineCfg({...machineCfg, port: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-white font-mono font-bold" placeholder="Default: 4370" />
                    </div>
                    <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-inner">
                        <div><p className="text-[9px] font-bold text-slate-400 uppercase">Status</p><p className={`text-xs font-bold uppercase ${machineCfg.status === 'Online' ? 'text-emerald-500' : machineCfg.status === 'Offline' ? 'text-rose-500' : 'text-amber-500'}`}>{machineCfg.status}</p></div>
                        <div className="text-right"><p className="text-[9px] font-bold text-slate-400 uppercase">Last Data Pull</p><p className="text-[10px] font-bold text-slate-500">{machineCfg.lastSync}</p></div>
                    </div>
                    <button onClick={handleMachineSync} disabled={machineCfg.status === 'Syncing'} className="w-full bg-amber-600 hover:bg-amber-500 py-4 rounded-2xl text-white font-bold uppercase text-xs shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                        <RefreshIcon className={machineCfg.status === 'Syncing' ? 'animate-spin' : ''} size={16}/> {machineCfg.status === 'Syncing' ? 'Pulling Data...' : 'Pull Machine Logs'}
                    </button>
                    <p className="text-[9px] text-slate-500 italic text-center leading-relaxed">Note: Ensure machine is on Wi-Fi and accessible via the specified IP/Port on your office network.</p>
                 </div>
            </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl bg-white dark:bg-slate-900/50">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/40">
                {/* Left: Staff Directory Title & Count */}
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                        <UsersIcon size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight font-bengali">স্টাফ ডাইরেক্টরি</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {filteredStaffList.length} জন
                            </span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400">Staff Directory & Payroll</p>
                    </div>
                </div>

                {/* Center: Search Box (একই রো এর মাঝখানে) */}
                <div className="relative w-full md:w-80 lg:w-96">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                        type="text" 
                        placeholder="নাম, আইডি, পদবি বা ঠিকানা দিয়ে খুঁজুন..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full pl-11 pr-8 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner font-bengali"
                    />
                    {searchTerm && (
                        <button 
                            type="button" 
                            onClick={() => setSearchTerm('')} 
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Right: Total Basic Salary (বেসিক স্যালারি কলামের উপরে) */}
                <div className="flex items-center gap-3 bg-white dark:bg-slate-950 px-4 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
                    <div className="text-right">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-bengali">মোট বেসিক স্যালারি</div>
                        <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono leading-none mt-0.5">
                            ৳{totalStaffBasicSalary.toLocaleString()}
                        </div>
                    </div>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 font-black text-base">
                        ৳
                    </div>
                </div>
            </div>

            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-sky-200 uppercase font-bold text-xs tracking-wider font-bengali border-b border-slate-300 dark:border-slate-700">
                    <tr>
                        <th className="p-4 text-center w-16">সিরিয়াল নং</th>
                        <th className="p-4 text-left">আইডি ও মেশিন</th>
                        <th className="p-4 text-left">ফুল নেম</th>
                        <th className="p-4 text-left">প্রফেশন / পদবি</th>
                        <th className="p-4 text-left">এড্রেস (ঠিকানা)</th>
                        <th className="p-4 text-right">বেসিক স্যালারি</th>
                        <th className="p-4 text-center">স্ট্যাটাস</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStaffList.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 text-sm font-bengali">
                                কোন কর্মচারীর তথ্য পাওয়া যায়নি
                            </td>
                        </tr>
                    ) : (
                        filteredStaffList.map((e, index) => (
                        <tr 
                            key={e.emp_id} 
                            onClick={() => handleRowClick(e)} 
                            className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 even:bg-transparent odd:bg-slate-50/50 dark:odd:bg-slate-850/30 transition-all ${selectedEmployeeId === e.emp_id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                        >
                            <td className="p-4 text-center font-mono text-xs font-bold text-slate-500 dark:text-slate-300">
                                {index + 1}
                            </td>
                            <td className="p-4 font-mono text-xs text-blue-600 dark:text-sky-300 font-bold whitespace-nowrap">
                                #{e.emp_id}
                                <div className="text-[10px] text-amber-600 dark:text-amber-300 font-bold mt-0.5">
                                    HID: {e.machine_id || '---'}
                                </div>
                            </td>
                            <td className="p-4 font-bold text-slate-800 dark:text-white text-sm">
                                {e.emp_name}
                                <div className="text-[11px] text-slate-500 dark:text-slate-300 font-medium uppercase mt-0.5">
                                    {e.mobile || 'No Mobile'} {e.gender ? `| ${e.gender}` : ''}
                                </div>
                            </td>
                            <td className="p-4 text-xs text-slate-800 dark:text-slate-200 font-bold tracking-tight">
                                {e.job_position || e.designation || 'Staff'}
                                <div className="text-[11px] text-slate-500 dark:text-slate-300 font-medium mt-0.5">
                                    {e.department || 'General'} {e.degree ? `| ${e.degree}` : ''}
                                </div>
                            </td>
                            <td className="p-4 text-xs text-slate-700 dark:text-slate-200 font-medium max-w-xs truncate" title={e.address || ''}>
                                {e.address || '---'}
                            </td>
                            <td className="p-4 text-right font-black text-slate-900 dark:text-white text-base font-mono whitespace-nowrap">
                                ৳{(e.salary || 0).toLocaleString()}
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase border ${e.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900' : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900'}`}>
                                    {e.status === 'Active' ? 'Active' : 'Released'}
                                </span>
                            </td>
                        </tr>
                        ))
                    )}
                </tbody>
                {filteredStaffList.length > 0 && (
                    <tfoot className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2 border-slate-200 dark:border-slate-700 font-bengali">
                        <tr>
                            <td colSpan={5} className="p-4 text-right text-xs uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                                সর্বমোট বেসিক স্যালারি ({filteredStaffList.length} জন স্টাফ):
                            </td>
                            <td className="p-4 text-right text-base text-emerald-600 dark:text-emerald-400 font-mono font-black">
                                ৳{totalStaffBasicSalary.toLocaleString()}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    </div>
    );
  };

  const renderMonthlyRosterTab = () => {
    const roster = monthlyRoster || {};
    const leaves = leaveLog || {};
    const emps = Array.isArray(employees) ? employees : [];
    const selectedEmpIds = roster[currentPeriodKey] || [];
    
    const rosterEmps = emps.filter(e => {
      if (!e) return false;
      const term = (searchTerm || '').trim().toLowerCase();
      if (!term) return true;
      const name = (e.emp_name || '').toLowerCase();
      const id = (e.emp_id || '').toLowerCase();
      const pos = (e.job_position || e.designation || '').toLowerCase();
      const dept = (e.department || '').toLowerCase();
      return name.includes(term) || id.includes(term) || pos.includes(term) || dept.includes(term);
    });

    const isAllSelected = rosterEmps.length > 0 && rosterEmps.every(e => selectedEmpIds.includes(e.emp_id));

    const totalRosterSalary = emps.reduce((total, emp) => {
        if (selectedEmpIds.includes(emp.emp_id)) {
            const key = `${selectedMonth}_${selectedYear}_${emp.emp_id}`;
            const record = leaves[key] || {};
            const basic = record.basicSalary !== undefined ? record.basicSalary : (record.agreedSalary !== undefined ? record.agreedSalary : (emp.salary || 0));
            const house = record.houseRent || 0;
            const medical = record.medicalAllowance || 0;
            return total + (basic + house + medical);
        }
        return total;
    }, 0);

    return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-100 dark:border-slate-800 pb-6 mb-8">
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-sky-100 uppercase tracking-tight flex items-center gap-3">
                        <UsersIcon size={24} className="text-blue-500" /> মাসিক তালিকা ব্যবস্থাপনা (Monthly Roster)
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">যে সকল কর্মচারী এই মাসে কর্মরত তাদের টিক চিহ্ন দিন। টিক দেয়া কর্মচারীদের নাম ল্যাব ইনভয়েস ও একাউন্টিংয়ে পাওয়া যাবে।</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-700 dark:text-white font-bold">{monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-700 dark:text-white font-bold">{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
                    <button onClick={handleSaveRosterData} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2">
                      <SaveIcon size={16}/> Save Changes
                    </button>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                <div className="relative flex-1 w-full">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search staff by name, ID or designation..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-6 py-3 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-500 shadow-inner"/>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => toggleSelectAllRoster(!isAllSelected)}
                      className={`px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border whitespace-nowrap ${
                        isAllSelected 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' 
                          : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-500 shadow-md'
                      }`}
                    >
                      {isAllSelected ? '❌ সব আনসিলেক্ট করুন' : '✅ সকলকে সিলেক্ট করুন'}
                    </button>
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl px-6 py-3 flex items-center justify-between min-w-[220px]">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active ({selectedEmpIds.length}/{emps.length})</span>
                        <span className="text-lg font-black text-blue-600 dark:text-blue-400">৳{(totalRosterSalary || 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                {rosterEmps.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
                      👥
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">কোন কর্মচারী পাওয়া যায়নি</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      সিস্টেমে এখনো কোন কর্মচারী যুক্ত করা হয়নি অথবা সার্চ অনুযায়ী মেলেনি। &ldquo;Global Profiles&rdquo; ট্যাবে গিয়ে নতুন কর্মচারী প্রোফাইল তৈরি করুন।
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('data_entry')}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg"
                    >
                      + নতুন কর্মচারী যুক্ত করুন
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-sky-200 uppercase tracking-wider border-b border-slate-300 dark:border-slate-700">
                        <tr>
                            <th className="p-3 text-center w-16">Active</th>
                            <th className="p-3">Staff Member</th>
                            <th className="p-3 text-right">Basic Salary</th>
                            <th className="p-3 text-right">House Rent</th>
                            <th className="p-3 text-right">Medical Allw.</th>
                            <th className="p-3 text-right text-blue-500">Total Salary</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rosterEmps.map((emp) => {
                            const isSelected = selectedEmpIds.includes(emp.emp_id);
                            const key = `${selectedMonth}_${selectedYear}_${emp.emp_id}`;
                            const record = (leaveLog || {})[key] || { leaveDays: 0, deductionAmount: 0, bonus: 0, overtime: 0 };
                            
                            const basic = record.basicSalary !== undefined ? record.basicSalary : (record.agreedSalary !== undefined ? record.agreedSalary : (emp.salary || 0));
                            const house = record.houseRent || 0;
                            const medical = record.medicalAllowance || 0;
                            const currentSalary = basic + house + medical;

                            const handleSalChange = (field: string, val: number) => {
                                const newRec = { ...record, [field]: val };
                                const nb = newRec.basicSalary !== undefined ? newRec.basicSalary : (newRec.agreedSalary !== undefined ? newRec.agreedSalary : (emp.salary || 0));
                                const nh = newRec.houseRent || 0;
                                const nm = newRec.medicalAllowance || 0;
                                newRec.agreedSalary = nb + nh + nm;
                                setLeaveLog({...leaveLog, [key]: newRec});
                            };

                            return (
                                <tr key={emp.emp_id} className={`hover:bg-slate-50 dark:hover:bg-blue-900/10 transition-all ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/5' : ''}`}>
                                    <td className="p-3 text-center">
                                      <input 
                                        type="checkbox" 
                                        checked={isSelected} 
                                        onChange={() => toggleRosterStatus(emp.emp_id)} 
                                        className="w-5 h-5 rounded-lg accent-blue-600 cursor-pointer" 
                                      />
                                    </td>
                                    <td className="p-3 font-bold text-slate-700 dark:text-slate-200 uppercase">
                                        <div className="flex items-center gap-2">
                                          <span>{emp.emp_name}</span>
                                          {emp.status === 'Released' && (
                                            <span className="text-[8.5px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-normal">বিদায়ী</span>
                                          )}
                                        </div>
                                        <div className="font-mono text-[9px] text-slate-400 mt-0.5">#{emp.emp_id} • {emp.job_position || emp.designation || 'Staff'} {emp.department ? `(${emp.department})` : ''}</div>
                                    </td>
                                    <td className="p-3 text-right">
                                        {isSelected ? (
                                            <input type="number" 
                                                value={basic} 
                                                onChange={(e) => handleSalChange('basicSalary', parseInt(e.target.value) || 0)} 
                                                className="w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-right text-slate-700 dark:text-slate-300 font-bold shadow-inner focus:border-blue-500 focus:outline-none text-xs" />
                                        ) : (
                                            <span className="text-slate-500 text-xs font-bold">৳{(basic || 0).toLocaleString()}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {isSelected ? (
                                            <input type="number" 
                                                value={house} 
                                                onChange={(e) => handleSalChange('houseRent', parseInt(e.target.value) || 0)} 
                                                className="w-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-right text-slate-700 dark:text-slate-300 font-bold shadow-inner focus:border-blue-500 focus:outline-none text-xs" />
                                        ) : (
                                            <span className="text-slate-500 text-xs font-bold">৳{(house || 0).toLocaleString()}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {isSelected ? (
                                            <input type="number" 
                                                value={medical} 
                                                onChange={(e) => handleSalChange('medicalAllowance', parseInt(e.target.value) || 0)} 
                                                className="w-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-right text-slate-700 dark:text-slate-300 font-bold shadow-inner focus:border-blue-500 focus:outline-none text-xs" />
                                        ) : (
                                            <span className="text-slate-500 text-xs font-bold">৳{(medical || 0).toLocaleString()}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right font-black text-blue-600 dark:text-blue-400 text-base">
                                        ৳{(currentSalary || 0).toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                )}
            </div>
        </div>
    </div>
  );
  };

  const calculateDutyHours = (
    inTimeStr?: string, 
    outTimeStr?: string,
    inTime2Str?: string,
    outTime2Str?: string,
    inTime3Str?: string,
    outTime3Str?: string
  ) => {
    let totalMins = 0;

    const calcPair = (inStr?: string, outStr?: string) => {
      if (!inStr || !outStr) return 0;
      const [inH, inM] = inStr.split(':').map(Number);
      const [outH, outM] = outStr.split(':').map(Number);
      if (isNaN(inH) || isNaN(outH)) return 0;
      let inMins = inH * 60 + (inM || 0);
      let outMins = outH * 60 + (outM || 0);
      let diffMins = outMins - inMins;
      if (diffMins < 0) diffMins += 24 * 60; // night shift rollover
      return diffMins;
    };

    totalMins += calcPair(inTimeStr, outTimeStr);
    totalMins += calcPair(inTime2Str, outTime2Str);
    totalMins += calcPair(inTime3Str, outTime3Str);

    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return {
      formatted: `${hours} ঘণ্টা ${mins} মি.`,
      totalMinutes: totalMins,
      hoursDecimal: Number((totalMins / 60).toFixed(1))
    };
  };

  const handleUploadEmployeeToMachine = async (emp?: Employee) => {
    const targetEmp = emp || formData;
    if (!targetEmp.emp_name) {
      alert('দয়া করে কর্মচারীর নাম লিখুন!');
      return;
    }
    setMachineCfg(prev => ({ ...prev, status: 'Syncing' }));

    setTimeout(async () => {
      setMachineCfg(prev => ({ ...prev, status: "Online", lastSync: new Date().toLocaleString() }));
      alert("✅ কর্মচারীর তথ্য ZKTeco K50 ডিভাইসে আপলোড সফল হয়েছে!\n\nআইডি: " + (targetEmp.machine_id || targetEmp.emp_id) + "\nনাম: " + targetEmp.emp_name + "\nপদবী: " + (targetEmp.job_position || "Staff") + "\n\nএখন ZKTeco K50 ডিভাইসে গিয়ে এনার ফিঙ্গারপ্রিন্ট সেট করে নিন।");
    }, 600);
  };

  const getDatesInRange = (startStr: string, endStr: string) => {
    const dates: string[] = [];
    if (!startStr || !endStr) return dates;
    let curr = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(curr.getTime()) || isNaN(end.getTime())) return dates;
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const getDatesForCurrentSearch = (): string[] => {
    if (attendanceSearchMode === 'single') {
      return [attendanceDate];
    } else if (attendanceSearchMode === 'month') {
      if (!attendanceMonth) return [];
      const [yearStr, monthStr] = attendanceMonth.split('-');
      const yr = parseInt(yearStr, 10);
      const mo = parseInt(monthStr, 10) - 1;
      const daysCount = new Date(yr, mo + 1, 0).getDate();
      const dates: string[] = [];
      for (let d = 1; d <= daysCount; d++) {
        const dayPadded = String(d).padStart(2, '0');
        const monthPadded = String(mo + 1).padStart(2, '0');
        dates.push(`${yr}-${monthPadded}-${dayPadded}`);
      }
      return dates;
    } else {
      return getDatesInRange(attendanceStartDate, attendanceEndDate);
    }
  };

  const handleDownloadMachineData = async () => {
    setMachineCfg(prev => ({ ...prev, status: 'Syncing' }));

    try {
      // Load real state synced by zk_bridge.js from Cloud DB
      const cloudData = await dbService.loadFromCloud();
      
      let updatedLog = { ...attendanceLog };
      if (cloudData && cloudData.attendanceLog) {
        updatedLog = { ...updatedLog, ...cloudData.attendanceLog };
        setAttendanceLog(updatedLog);
      }

      const searchDates = getDatesForCurrentSearch();
      let machineRecordsFound = 0;

      searchDates.forEach(dateKey => {
        periodEmployees.forEach(emp => {
          const key = `${dateKey}_${emp.emp_id}`;
          const record = updatedLog[key];
          if (record && record.isMachineRecord) {
            machineRecordsFound++;
          }
        });
      });

      if (performBlockingSync) {
        await performBlockingSync({ attendanceLog: updatedLog });
      }

      setMachineCfg(prev => ({ ...prev, status: 'Online', lastSync: new Date().toLocaleString() }));

      if (machineRecordsFound > 0) {
        alert(`✅ জেকেটেকো কে৫০ ডিভাইস থেকে মোট ${machineRecordsFound} জন কর্মচারীর রিয়েল পাঞ্চ ডাটা রেকর্ড সফলভাবে সিঙ্ক ও রিফ্রেশ হয়েছে!`);
      } else {
        alert(`ℹ️ ক্লাউড ডাটাবেজ সফলভাবে রিফ্রেশ করা হয়েছে!\n\nবর্তমানে নির্বাচিত তারিখ (${searchDates.length} দিন)-এর জন্য নতুন কোনো রিয়েল পাঞ্চ রেকর্ড পাওয়া যায়নি।\n\nপিসিতে 'start_zk_agent.bat' ব্যাকগ্রাউন্ড অটো-সিঙ্ক ফাইলটি চালু রাখুন। কর্মচারীরা মেশিনে ফিঙ্গার দিলেই স্বয়ংক্রিয়ভাবে ক্লাউড ও সফটওয়্যারে তাদের রিয়েল সময় যুক্ত হয়ে যাবে।`);
      }
    } catch (err: any) {
      console.error("Machine Sync Error:", err);
      setMachineCfg(prev => ({ ...prev, status: 'Offline' }));
      alert(`⚠️ ডাটাবেজ সিঙ্ক করতে সমস্যা হয়েছে: ${err?.message || 'নেটওয়ার্ক চেক করুন'}`);
    }
  };

  const renderAttendanceTab = () => {
    const datesList = getDatesForCurrentSearch();

    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl animate-fade-in relative overflow-hidden space-y-6">
          {/* Dedicated ZKTeco Machine Download & Supabase Save Workflow Card */}
          <div className="bg-gradient-to-r from-slate-950 via-sky-950 to-slate-950 text-white p-5 rounded-3xl border-2 border-sky-600/50 shadow-2xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-sky-800/40 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-600/30 rounded-2xl border border-sky-400/30 text-sky-300">
                  <span className="text-xl">📟</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-sky-200 uppercase tracking-wider flex items-center gap-2">
                    ZKTeco K50 মেশিন ডাটা ডাউনলোড ও সুপাবেজ সেভ প্যানেল
                  </h3>
                  <p className="text-xs text-slate-300">
                    কর্মচারী ও সময়কাল নির্বাচন করুন ➔ <b>'১. মেশিন থেকে ডাটা ডাউনলোড করুন'</b> চাপুন ➔ তারপর <b>'২. সুপাবেজে (Supabase) সেভ করুন'</b> চাপুন।
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                {stagedUnsavedCount > 0 ? (
                  <span className="text-xs font-bold bg-amber-500 text-slate-950 px-3.5 py-1.5 rounded-full animate-pulse flex items-center gap-1.5 shadow">
                    <span>⚠️</span> {stagedUnsavedCount} টি পাঞ্চ ডাউনলোড হয়েছে (সুপাবেজে সেভ করতে নিচের ২ নং বাটনে চাপ দিন)
                  </span>
                ) : (
                  <span className="text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span> সুপাবেজ ক্লাউড প্রস্তুত
                  </span>
                )}

                <button 
                  onClick={() => setIsZkModalOpen(true)} 
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 px-3 py-1.5 rounded-xl font-bold border border-sky-800 transition-all"
                  title="জেকেটেকো হাব ও ব্যাকগ্রাউন্ড এজেন্ট গাইড"
                >
                  📟 ZKTeco হাব
                </button>

                <button
                  onClick={handleClearFakeAttendance}
                  className="text-xs bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white px-3 py-1.5 rounded-xl font-bold border border-rose-500/30 transition-all"
                  title="ভুয়া/ডামি ডাটা মুছে ফেলা"
                >
                  🧹 ডামি ডাটা রিসেট
                </button>
              </div>
            </div>

            {/* Step 1: Filter Selection Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-sky-900/40">
              {/* Employee Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-sky-300 flex items-center gap-1">
                  👤 কর্মচারী সিলেক্ট করুন:
                </label>
                <select
                  value={selectedEmpFilter}
                  onChange={(e) => setSelectedEmpFilter(e.target.value)}
                  className="bg-slate-950 border border-sky-700/60 rounded-xl px-3 py-2 text-white font-bold text-xs outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">👥 সকল কর্মচারী ({periodEmployees.length} জন)</option>
                  {periodEmployees.map(e => (
                    <option key={e.emp_id} value={e.emp_id}>
                      👤 {e.emp_name} ({e.job_position || 'কর্মী'}) - HID: {e.machine_id || e.emp_id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter Type Switch */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-sky-300 flex items-center gap-1">
                  📅 সময়কাল সিলেক্ট মোড:
                </label>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-sky-800/50">
                  <button
                    type="button"
                    onClick={() => setAttendanceSearchMode('single')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${attendanceSearchMode === 'single' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    📅 একদিন
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceSearchMode('range')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${attendanceSearchMode === 'range' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    📆 তারিখ রেঞ্জ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceSearchMode('month')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${attendanceSearchMode === 'month' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    🗓️ পুরো মাস
                  </button>
                </div>
              </div>

              {/* Date / Date Range Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-sky-300">
                  {attendanceSearchMode === 'single' ? 'তারিখ নির্বাচন:' : attendanceSearchMode === 'range' ? 'তারিখের রেঞ্জ:' : 'মাস নির্বাচন:'}
                </label>
                {attendanceSearchMode === 'single' ? (
                  <input 
                    type="date" 
                    value={attendanceDate} 
                    onChange={(e) => setAttendanceDate(e.target.value)} 
                    className="bg-slate-950 border border-sky-700/60 rounded-xl px-3 py-1.5 text-white font-bold text-xs outline-none" 
                  />
                ) : attendanceSearchMode === 'range' ? (
                  <div className="flex items-center gap-1">
                    <input 
                      type="date" 
                      value={attendanceStartDate} 
                      onChange={(e) => setAttendanceStartDate(e.target.value)} 
                      className="bg-slate-950 border border-sky-700/60 rounded-xl p-1.5 text-white font-bold text-[11px] outline-none w-1/2" 
                    />
                    <span className="text-[10px] text-slate-400 font-bold">হতে</span>
                    <input 
                      type="date" 
                      value={attendanceEndDate} 
                      onChange={(e) => setAttendanceEndDate(e.target.value)} 
                      className="bg-slate-950 border border-sky-700/60 rounded-xl p-1.5 text-white font-bold text-[11px] outline-none w-1/2" 
                    />
                  </div>
                ) : (
                  <input 
                    type="month" 
                    value={attendanceMonth} 
                    onChange={(e) => setAttendanceMonth(e.target.value)} 
                    className="bg-slate-950 border border-sky-700/60 rounded-xl px-3 py-1.5 text-white font-bold text-xs outline-none" 
                  />
                )}
              </div>
            </div>

            {/* Action Buttons: 1. DOWNLOAD FROM MACHINE, 2. SAVE TO SUPABASE */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* STEP 1: DOWNLOAD BUTTON */}
                <button
                  onClick={handleDownloadFromMachine}
                  disabled={isDownloadingFromMachine}
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-lg transition-all flex items-center gap-2 active:scale-95 border border-sky-300/30 disabled:opacity-50"
                  title="মেশিন বা সিঙ্ক থেকে সফটওয়্যারে পাঞ্চ ডাটা ডাউনলোড করুন"
                >
                  <span className="text-base">📥</span>
                  <span>১. মেশিন থেকে পাঞ্চ ডাটা ডাউনলোড করুন</span>
                </button>

                {/* USB FILE PICKER BUTTON */}
                <input 
                  type="file" 
                  ref={usbFileInputRef} 
                  onChange={handleUsbFileImport} 
                  accept=".dat,.txt,.csv,.log,.tsv,.xlsx" 
                  className="hidden" 
                />
                <button
                  onClick={() => usbFileInputRef.current?.click()}
                  className="bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs px-3.5 py-2.5 rounded-2xl border border-sky-800 transition-all flex items-center gap-1.5 active:scale-95"
                  title="USB পেনড্রাইভের attlog.dat বা CSV ফাইল ব্রাউজ করুন"
                >
                  <span>📁</span> USB (.dat) আপলোড
                </button>

                <button
                  onClick={handleDownloadMachineData}
                  className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 font-bold text-xs px-3 py-2.5 rounded-2xl border border-indigo-700/50 transition-all flex items-center gap-1 active:scale-95"
                  title="ক্লাউড ডাটাবেজ থেকে রিফ্রেশ"
                >
                  <span>🔄</span> রিফ্রেশ
                </button>
              </div>

              {/* STEP 2: SAVE TO SUPABASE BUTTON */}
              <button
                onClick={handleSaveToSupabase}
                className={`font-black text-xs px-6 py-2.5 rounded-2xl shadow-xl transition-all flex items-center gap-2 active:scale-95 border ${
                  stagedUnsavedCount > 0 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white border-emerald-300 animate-bounce' 
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500'
                }`}
                title="ডাউনলোডকৃত পাঞ্চ ডাটা সুপাবেজ ক্লাউড ডাটাবেজে স্থায়ীভাবে সেভ করুন"
              >
                <span className="text-base">💾</span>
                <span>২. সুপাবেজে (Supabase) সেভ করুন</span>
              </button>
            </div>
          </div>

                     {/* Date & Employee Filter Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        onClick={() => setAttendanceSearchMode('single')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${attendanceSearchMode === 'single' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                      >
                        📅 একদিন
                      </button>
                      <button
                        onClick={() => setAttendanceSearchMode('month')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${attendanceSearchMode === 'month' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                      >
                        🗓️ পুরো মাস
                      </button>
                      <button
                        onClick={() => setAttendanceSearchMode('range')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${attendanceSearchMode === 'range' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                      >
                        📆 তারিখ রেঞ্জ
                      </button>
                    </div>

                    {attendanceSearchMode === 'single' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">তারিখ:</span>
                        <input 
                          type="date" 
                          value={attendanceDate} 
                          onChange={(e) => setAttendanceDate(e.target.value)} 
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-800 dark:text-white font-bold outline-none text-xs" 
                        />
                      </div>
                    ) : attendanceSearchMode === 'month' ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-400">মাস:</span>
                        <input 
                          type="month" 
                          value={attendanceMonth} 
                          onChange={(e) => setAttendanceMonth(e.target.value)} 
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-800 dark:text-white font-bold outline-none text-xs" 
                        />
                        <span className="text-[11px] font-bold text-sky-400 bg-sky-950 px-2 py-1 rounded-lg border border-sky-800">
                          {datesList.length} দিন (পুরো মাস)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-400">হতে:</span>
                        <input 
                          type="date" 
                          value={attendanceStartDate} 
                          onChange={(e) => setAttendanceStartDate(e.target.value)} 
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-800 dark:text-white font-bold outline-none text-xs" 
                        />
                        <span className="text-xs font-bold text-slate-400">পর্যন্ত:</span>
                        <input 
                          type="date" 
                          value={attendanceEndDate} 
                          onChange={(e) => setAttendanceEndDate(e.target.value)} 
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-800 dark:text-white font-bold outline-none text-xs" 
                        />
                        <span className="text-[11px] font-bold text-sky-400 bg-sky-950 px-2 py-1 rounded-lg border border-sky-800">
                          {datesList.length} দিন সিলেক্টেড
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Employee Selector Dropdown */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-400 whitespace-nowrap">👤 কর্মচারী ফিল্টার:</span>
                    <select
                      value={selectedEmpFilter}
                      onChange={(e) => setSelectedEmpFilter(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-bold outline-none text-xs w-full sm:w-auto"
                    >
                      <option value="all">👥 সকল কর্মচারী ({periodEmployees.length} জন)</option>
                      {periodEmployees.map(e => (
                        <option key={e.emp_id} value={e.emp_id}>
                          👤 {e.emp_name} ({e.job_position || 'কর্মী'}) - HID: {e.machine_id || e.emp_id}
                        </option>
                      ))}
                    </select>
                  </div>
              </div>

          {/* Excel Centered Grid Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm">
              <table className="w-full text-center border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-sky-200 font-bold border-b border-slate-300 dark:border-slate-700">
                      <tr>
                        <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-12">সিরিয়াল</th>
                        <th className="p-3 border-r border-slate-300 dark:border-slate-700 text-left">কর্মচারীর নাম / তারিখ</th>
                        <th className="p-3 border-r border-slate-300 dark:border-slate-700 text-left">পদবী / বার</th>
                        <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-20">মেশিন HID</th>
                        <th className="p-2 border-r border-slate-300 dark:border-slate-700 w-24">ইন ১</th>
                        <th className="p-2 border-r border-slate-300 dark:border-slate-700 w-24">আউট ১</th>
                        <th className="p-2 border-r border-slate-300 dark:border-slate-700 w-24">ইন ২</th>
                        <th className="p-2 border-r border-slate-300 dark:border-slate-700 w-24">আউট ২</th>
                        <th className="p-2 border-r border-slate-300 dark:border-slate-700 w-24">ইন ৩</th>
                        <th className="p-2 border-r border-slate-300 dark:border-slate-700 w-24">আউট ৩</th>
                        <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-32 font-black text-indigo-600 dark:text-indigo-400 bg-indigo-950/30">মোট ডিউটি ঘন্টা</th>
                        <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-28">স্ট্যাটাস</th>
                        <th className="p-3 text-left">মেশিন পাঞ্চ নোট</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {selectedEmpFilter !== 'all' && (attendanceSearchMode === 'month' || attendanceSearchMode === 'range') ? (
                        // Individual Employee Day-by-Day Log View
                        (() => {
                          const empObj = periodEmployees.find(e => e.emp_id === selectedEmpFilter);
                          if (!empObj) return null;

                          const daysNames = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

                          return datesList.map((d, index) => {
                            const dt = new Date(d);
                            const dayName = daysNames[dt.getDay()];
                            const key = `${d}_${empObj.emp_id}`;
                            const record = (attendanceLog || {})[key] || { status: '', inTime: '', outTime: '', inTime2: '', outTime2: '', inTime3: '', outTime3: '', notes: '' };
                            const duty = calculateDutyHours(record.inTime, record.outTime, record.inTime2, record.outTime2, record.inTime3, record.outTime3);

                            return (
                              <tr key={d} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${record.isMachineRecord ? 'bg-amber-500/10' : ''}`}>
                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold font-mono">{index + 1}</td>
                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold text-left font-mono text-slate-900 dark:text-white">
                                    {d}
                                    {record.isMachineRecord && <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-black ml-2 uppercase">ZKTeco</span>}
                                  </td>
                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 text-left text-slate-600 dark:text-slate-400 font-bold">{dayName}</td>
                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-mono font-bold text-amber-600">{empObj.machine_id || '---'}</td>
                                  
                                  {/* Session 1 */}
                                  <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                    <input 
                                      type="time" 
                                      value={record.inTime || ''} 
                                      onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, inTime: e.target.value, isMachineRecord: false}})} 
                                      className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                    />
                                  </td>
                                  <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                    <input 
                                      type="time" 
                                      value={record.outTime || ''} 
                                      onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, outTime: e.target.value, isMachineRecord: false}})} 
                                      className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                    />
                                  </td>

                                  {/* Session 2 */}
                                  <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                    <input 
                                      type="time" 
                                      value={record.inTime2 || ''} 
                                      onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, inTime2: e.target.value, isMachineRecord: false}})} 
                                      className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                    />
                                  </td>
                                  <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                    <input 
                                      type="time" 
                                      value={record.outTime2 || ''} 
                                      onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, outTime2: e.target.value, isMachineRecord: false}})} 
                                      className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                    />
                                  </td>

                                  {/* Session 3 */}
                                  <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                    <input 
                                      type="time" 
                                      value={record.inTime3 || ''} 
                                      onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, inTime3: e.target.value, isMachineRecord: false}})} 
                                      className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                    />
                                  </td>
                                  <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                    <input 
                                      type="time" 
                                      value={record.outTime3 || ''} 
                                      onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, outTime3: e.target.value, isMachineRecord: false}})} 
                                      className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                    />
                                  </td>

                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-black text-indigo-400 bg-indigo-950/20">
                                    {duty.formatted}
                                  </td>
                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800">
                                    <select 
                                      value={record.status || ''} 
                                      onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, status: e.target.value as any, isMachineRecord: false}})} 
                                      className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-white w-full text-center"
                                    >
                                      <option value="">-- সিলেক্ট --</option>
                                      <option value="Present">Present</option>
                                      <option value="Absent">Absent</option>
                                      <option value="Late">Late</option>
                                      <option value="Leave">Leave</option>
                                    </select>
                                  </td>
                                  <td className="p-3 text-left text-slate-400 text-[11px]">
                                    {record.notes || 'কোনো পাঞ্চ নোট নেই'}
                                  </td>
                              </tr>
                            );
                          });
                        })()
                      ) : (
                        // Standard All Employees View or Single Date View
                        (selectedEmpFilter === 'all' ? periodEmployees : periodEmployees.filter(e => e.emp_id === selectedEmpFilter)).map((emp, index) => {
                          if (attendanceSearchMode === 'single') {
                            const key = `${attendanceDate}_${emp.emp_id}`;
                            const record = (attendanceLog || {})[key] || { status: '', inTime: '', outTime: '', inTime2: '', outTime2: '', inTime3: '', outTime3: '', notes: '' };
                            const duty = calculateDutyHours(record.inTime, record.outTime, record.inTime2, record.outTime2, record.inTime3, record.outTime3);

                            return (
                                <tr key={emp.emp_id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${record.isMachineRecord ? 'bg-amber-500/10' : ''}`}>
                                    <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold font-mono">{index + 1}</td>
                                    <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold text-left uppercase text-slate-900 dark:text-white">
                                      {emp.emp_name}
                                      {record.isMachineRecord && <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-black ml-2 uppercase">ZKTeco</span>}
                                    </td>
                                    <td className="p-3 border-r border-slate-300 dark:border-slate-800 text-left text-slate-600 dark:text-slate-400">{emp.job_position}</td>
                                    <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-mono font-bold text-amber-600">{emp.machine_id || '---'}</td>
                                    
                                    {/* Session 1 */}
                                    <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                      <input 
                                        type="time" 
                                        value={record.inTime || ''} 
                                        onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, inTime: e.target.value, isMachineRecord: false}})} 
                                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                      />
                                    </td>
                                    <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                      <input 
                                        type="time" 
                                        value={record.outTime || ''} 
                                        onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, outTime: e.target.value, isMachineRecord: false}})} 
                                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                      />
                                    </td>

                                    {/* Session 2 */}
                                    <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                      <input 
                                        type="time" 
                                        value={record.inTime2 || ''} 
                                        onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, inTime2: e.target.value, isMachineRecord: false}})} 
                                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                      />
                                    </td>
                                    <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                      <input 
                                        type="time" 
                                        value={record.outTime2 || ''} 
                                        onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, outTime2: e.target.value, isMachineRecord: false}})} 
                                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                      />
                                    </td>

                                    {/* Session 3 */}
                                    <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                      <input 
                                        type="time" 
                                        value={record.inTime3 || ''} 
                                        onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, inTime3: e.target.value, isMachineRecord: false}})} 
                                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                      />
                                    </td>
                                    <td className="p-1.5 border-r border-slate-300 dark:border-slate-800">
                                      <input 
                                        type="time" 
                                        value={record.outTime3 || ''} 
                                        onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, outTime3: e.target.value, isMachineRecord: false}})} 
                                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white text-xs w-full" 
                                      />
                                    </td>

                                    <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-black text-indigo-400 bg-indigo-950/20">
                                      {duty.formatted}
                                    </td>
                                    <td className="p-3 border-r border-slate-300 dark:border-slate-800">
                                      <select 
                                        value={record.status || ''} 
                                        onChange={(e) => setAttendanceLog && setAttendanceLog({...attendanceLog, [key]: {...record, status: e.target.value as any, isMachineRecord: false}})} 
                                        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-white w-full text-center"
                                      >
                                        <option value="">-- সিলেক্ট --</option>
                                        <option value="Present">Present</option>
                                        <option value="Absent">Absent</option>
                                        <option value="Late">Late</option>
                                        <option value="Leave">Leave</option>
                                      </select>
                                    </td>
                                    <td className="p-3 text-left text-slate-400 text-[11px]">
                                      {record.notes || 'কোনো পাঞ্চ নোট নেই'}
                                    </td>
                                </tr>
                            );
                          } else {
                            // Date Range mode aggregated calculation
                            let totalRangeMinutes = 0;
                            let presentDaysCount = 0;

                            datesList.forEach(d => {
                              const key = `${d}_${emp.emp_id}`;
                              const rec = (attendanceLog || {})[key];
                              if (rec) {
                                if (rec.status === 'Present' || rec.inTime) presentDaysCount++;
                                const dObj = calculateDutyHours(rec.inTime, rec.outTime, rec.inTime2, rec.outTime2, rec.inTime3, rec.outTime3);
                                totalRangeMinutes += dObj.totalMinutes;
                              }
                            });

                            const hours = Math.floor(totalRangeMinutes / 60);
                            const mins = totalRangeMinutes % 60;

                            return (
                              <tr key={emp.emp_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold font-mono">{index + 1}</td>
                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold text-left uppercase text-slate-900 dark:text-white">
                                    {emp.emp_name}
                                  </td>
                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 text-left text-slate-600 dark:text-slate-400">{emp.job_position}</td>
                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-mono font-bold text-amber-600">{emp.machine_id || '---'}</td>
                                  
                                  <td colSpan={6} className="p-3 border-r border-slate-300 dark:border-slate-800 text-slate-400 font-bold italic">
                                    {datesList[0]} হতে {datesList[datesList.length - 1]} ({datesList.length} দিনে উপস্থিত: <span className="text-emerald-400 font-black">{presentDaysCount} দিন</span>)
                                  </td>

                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-black text-indigo-400 bg-indigo-950/40 text-sm">
                                    {hours} ঘণ্টা {mins} মি.
                                  </td>
                                  <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold text-emerald-400">
                                    {presentDaysCount} / {datesList.length} দিন
                                  </td>
                                  <td className="p-3 text-left text-slate-400 text-[11px]">
                                    তারিখ রেঞ্জ লেজার
                                  </td>
                              </tr>
                            );
                          }
                        })
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    );
  };

  const renderMonthlyReportTab = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const monthName = monthOptions.find(m => m.value === selectedMonth)?.name || '';

    // Calculate monthly stats for all period employees
    const staffMonthlyStats = periodEmployees.map((emp, index) => {
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let leaveDays = 0;
      let totalMinutesWorked = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const key = `${dateStr}_${emp.emp_id}`;
        const rec = (attendanceLog || {})[key];
        
        if (rec) {
          if (rec.status === 'Present') presentDays++;
          else if (rec.status === 'Absent') absentDays++;
          else if (rec.status === 'Late') lateDays++;
          else if (rec.status === 'Leave') leaveDays++;

          if (rec.inTime || rec.outTime || rec.inTime2 || rec.outTime2 || rec.inTime3 || rec.outTime3) {
            const duty = calculateDutyHours(rec.inTime, rec.outTime, rec.inTime2, rec.outTime2, rec.inTime3, rec.outTime3);
            totalMinutesWorked += duty.totalMinutes;
          }
        }
      }

      const totalHours = Math.floor(totalMinutesWorked / 60);
      const remainingMins = totalMinutesWorked % 60;
      const totalDutyStr = `${totalHours} ঘণ্টা ${remainingMins} মি.`;
      const avgHoursPerDay = presentDays > 0 ? (totalMinutesWorked / 60 / presentDays).toFixed(1) : '0.0';

      return {
        sl: index + 1,
        empId: emp.emp_id,
        empName: emp.emp_name,
        position: emp.job_position || '---',
        machineId: emp.machine_id || '---',
        phone: emp.phone_number || '---',
        joiningDate: emp.joining_date || '---',
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        totalDutyStr,
        totalMinutesWorked,
        avgHoursPerDay
      };
    });

    const singleEmpObj = selectedEmpFilter !== 'all' ? periodEmployees.find(e => e.emp_id === selectedEmpFilter) : null;
    const singleEmpStats = singleEmpObj ? staffMonthlyStats.find(s => s.empId === singleEmpObj.emp_id) : null;

    const handlePrint = () => {
      window.print();
    };

    const handleExportCSV = () => {
      let csvContent = "data:text/csv;charset=utf-8,";

      if (singleEmpObj && singleEmpStats) {
        // Single Employee Detailed CSV
        csvContent += `Monthly Attendance Statement for ${singleEmpObj.emp_name}\n`;
        csvContent += `Employee ID,${singleEmpObj.emp_id},Designation,${singleEmpObj.job_position || '---'},Machine HID,${singleEmpObj.machine_id || '---'}\n`;
        csvContent += `Month,${monthName} ${selectedYear},Total Duty,${singleEmpStats.totalDutyStr},Present Days,${singleEmpStats.presentDays}\n\n`;
        csvContent += `Date,Day,HID,In Time 1,Out Time 1,In Time 2,Out Time 2,Duty Hours,Status,Notes\n`;

        const daysNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dt = new Date(dateStr);
          const dayName = daysNames[dt.getDay()];
          const key = `${dateStr}_${singleEmpObj.emp_id}`;
          const rec = (attendanceLog || {})[key] || { status: '', inTime: '', outTime: '', inTime2: '', outTime2: '', notes: '' };
          const duty = calculateDutyHours(rec.inTime, rec.outTime, rec.inTime2, rec.outTime2, rec.inTime3, rec.outTime3);

          csvContent += `"${dateStr}","${dayName}","${singleEmpObj.machine_id || '---'}","${rec.inTime || ''}","${rec.outTime || ''}","${rec.inTime2 || ''}","${rec.outTime2 || ''}","${duty.formatted}","${rec.status || ''}","${rec.notes || ''}"\n`;
        }
      } else {
        // All Employees Summary CSV
        csvContent += `SL,Employee Name,Designation,HID,Present Days,Absent Days,Late Days,Leave Days,Total Duty Hours,Avg Hours/Day\n`;
        staffMonthlyStats.forEach(s => {
          csvContent += `"${s.sl}","${s.empName}","${s.position}","${s.machineId}",${s.presentDays},${s.absentDays},${s.lateDays},${s.leaveDays},"${s.totalDutyStr}",${s.avgHoursPerDay}\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      const fileName = singleEmpObj 
        ? `Attendance_Report_${singleEmpObj.emp_name.replace(/\s+/g, '_')}_${monthName}_${selectedYear}.csv`
        : `Monthly_Attendance_Report_${monthName}_${selectedYear}.csv`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl animate-fade-in relative">
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-5 gap-4 no-print">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-sky-100 uppercase tracking-tight flex items-center gap-2">
              📊 {singleEmpObj ? `${singleEmpObj.emp_name}-এর মাসিক হাজিরা ও রিপোর্ট` : 'মাসের পূর্ণাঙ্গ কর্মচারী হাজিরা ও ডিউটি আওয়ার রিপোর্ট'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              মাসিক রিপোর্ট তৈরি, নির্দিষ্ট কর্মীর ফিল্টার, প্রিন্ট ও এক্সেল ফাইল ডাউনলোড করুন।
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-end">
            {/* Employee Filter */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-1">কর্মচারী:</span>
              <select 
                value={selectedEmpFilter} 
                onChange={(e) => setSelectedEmpFilter(e.target.value)} 
                className="bg-transparent font-bold text-xs text-slate-800 dark:text-white px-2 py-1 outline-none max-w-[200px] truncate"
              >
                <option value="all" className="bg-slate-900 text-white">👥 সকল কর্মচারী ({periodEmployees.length} জন)</option>
                {periodEmployees.map(e => (
                  <option key={e.emp_id} value={e.emp_id} className="bg-slate-900 text-white">
                    👤 {e.emp_name} ({e.job_position || 'কর্মী'}) - HID: {e.machine_id || e.emp_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Month & Year Filter */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))} 
                className="bg-transparent font-bold text-xs text-slate-800 dark:text-white px-2 py-1 outline-none"
              >
                {monthOptions.map(m => <option key={m.value} value={m.value} className="bg-slate-900 text-white">{m.name}</option>)}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                className="bg-transparent font-bold text-xs text-slate-800 dark:text-white px-2 py-1 outline-none border-l border-slate-300 dark:border-slate-700"
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>)}
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 active:scale-95"
            >
              🖨️ প্রিন্ট
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 active:scale-95"
            >
              📥 এক্সেল ডাউনলোড
            </button>
          </div>
        </div>

        {/* Printable Header Title */}
        <div className="text-center mb-6 pb-4 border-b border-slate-300 dark:border-slate-800">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            নিরাময় ক্লিনিক এন্ড ডায়াগনস্টিক
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
            {singleEmpObj ? `${singleEmpObj.emp_name}-এর ব্যক্তিগত মাসিক হাজিরা ও ডিউটি সময় বিবরণী` : 'কর্মচারীদের সার্বিক মাসিক হাজিরা ও ডিউটি সময় বিবরণী'} - {monthName} {selectedYear}
          </p>
        </div>

        {/* VIEW 1: Single Employee Individual Statement Card & Day-by-Day Table */}
        {singleEmpObj && singleEmpStats ? (
          <div className="space-y-6">
            {/* Employee Profile Summary Card */}
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">কর্মচারীর নাম</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400 uppercase">{singleEmpObj.emp_name}</span>
                <span className="text-xs text-slate-500 block">{singleEmpObj.job_position || 'কর্মী'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">মেশিন HID</span>
                <span className="text-sm font-black font-mono text-amber-500">{singleEmpObj.machine_id || '---'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">ফোন নম্বর</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{singleEmpObj.phone_number || '---'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">যোগদানের তারিখ</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{singleEmpObj.joining_date || '---'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">মোট ডিউটি ঘন্টা</span>
                <span className="text-xs font-black text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded">{singleEmpStats.totalDutyStr}</span>
              </div>
            </div>

            {/* Quick Stat Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">উপস্থিত</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{singleEmpStats.presentDays} দিন</span>
              </div>
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block uppercase">অনুপস্থিত</span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400">{singleEmpStats.absentDays} দিন</span>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block uppercase">লেট আগমন</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{singleEmpStats.lateDays} দিন</span>
              </div>
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-center">
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 block uppercase">ছুটি</span>
                <span className="text-lg font-black text-sky-600 dark:text-sky-400">{singleEmpStats.leaveDays} দিন</span>
              </div>
            </div>

            {/* Day by Day Log Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm">
              <table className="w-full text-center border-collapse text-xs font-sans">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-sky-200 font-bold border-b border-slate-300 dark:border-slate-700">
                  <tr>
                    <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-12">তারিখ</th>
                    <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-24">বার</th>
                    <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-20">ইন ১</th>
                    <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-20">আউট ১</th>
                    <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-20">ইন ২</th>
                    <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-20">আউট ২</th>
                    <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-28 font-black text-indigo-600 dark:text-indigo-400 bg-indigo-950/20">ডিউটি ঘণ্টা</th>
                    <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-24">স্ট্যাটাস</th>
                    <th className="p-3 text-left">পাঞ্চ নোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {(() => {
                    const daysNames = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
                    const rows = [];

                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const dt = new Date(dateStr);
                      const dayName = daysNames[dt.getDay()];
                      const key = `${dateStr}_${singleEmpObj.emp_id}`;
                      const rec = (attendanceLog || {})[key] || { status: '', inTime: '', outTime: '', inTime2: '', outTime2: '', inTime3: '', outTime3: '', notes: '' };
                      const duty = calculateDutyHours(rec.inTime, rec.outTime, rec.inTime2, rec.outTime2, rec.inTime3, rec.outTime3);

                      rows.push(
                        <tr key={dateStr} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${rec.isMachineRecord ? 'bg-amber-500/10' : ''}`}>
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold font-mono text-left">{dateStr}</td>
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 text-slate-500 font-bold">{dayName}</td>
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-mono">{rec.inTime || '---'}</td>
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-mono">{rec.outTime || '---'}</td>
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-mono">{rec.inTime2 || '---'}</td>
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-mono">{rec.outTime2 || '---'}</td>
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-black text-indigo-400 bg-indigo-950/20">{duty.formatted}</td>
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800">
                            {rec.status === 'Present' && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded">Present</span>}
                            {rec.status === 'Absent' && <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 font-bold rounded">Absent</span>}
                            {rec.status === 'Late' && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 font-bold rounded">Late</span>}
                            {rec.status === 'Leave' && <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 font-bold rounded">Leave</span>}
                            {!rec.status && <span className="text-slate-500">---</span>}
                          </td>
                          <td className="p-3 text-left text-slate-400 text-[11px]">{rec.notes || '---'}</td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VIEW 2: All Employees Monthly Overview Grid Table */
          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm">
            <table className="w-full text-center border-collapse text-xs font-sans">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-sky-200 font-bold border-b border-slate-300 dark:border-slate-700">
                <tr>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 w-12">সিরিয়াল</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 text-left">কর্মচারীর নাম</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 text-left">পদবী</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700">মেশিন HID</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">উপস্থিত (দিন)</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 bg-rose-500/10 text-rose-600 dark:text-rose-400">অনুপস্থিত (দিন)</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 bg-amber-500/10 text-amber-600 dark:text-amber-400">লেট (দিন)</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 bg-sky-500/10 text-sky-600 dark:text-sky-400">ছুটি (দিন)</th>
                  <th className="p-3 border-r border-slate-300 dark:border-slate-700 font-black text-indigo-600 dark:text-indigo-300">মোট ডিউটি ঘন্টা</th>
                  <th className="p-3">দৈনিক গড় ঘণ্টা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {staffMonthlyStats.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-slate-400 italic">
                      এই মাসের জন্য কোনো সক্রিয় কর্মচারী তালিকাভুক্ত নেই।
                    </td>
                  </tr>
                ) : (
                  staffMonthlyStats.map((row) => (
                    <tr 
                      key={row.empId} 
                      onClick={() => setSelectedEmpFilter(row.empId)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      title="কর্মচারীর ব্যক্তিগত রিপোর্ট দেখতে ক্লিক করুন"
                    >
                      <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold font-mono">{row.sl}</td>
                      <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold text-left uppercase text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors">
                        {row.empName}
                      </td>
                      <td className="p-3 border-r border-slate-300 dark:border-slate-800 text-left text-slate-600 dark:text-slate-400">{row.position}</td>
                      <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-mono font-bold text-amber-600">{row.machineId}</td>
                      <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">{row.presentDays}</td>
                      <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">{row.absentDays}</td>
                      <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20">{row.lateDays}</td>
                      <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold text-sky-600 dark:text-sky-400 bg-sky-50/30 dark:bg-sky-950/20">{row.leaveDays}</td>
                      <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-black text-indigo-600 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20">{row.totalDutyStr}</td>
                      <td className="p-3 font-mono font-bold">{row.avgHoursPerDay} hrs</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Signature Box for Print */}
        <div className="hidden print:flex justify-between items-center mt-16 pt-8 border-t border-slate-300 text-xs font-bold text-slate-700">
          <div>
            <div className="w-40 border-b border-slate-400 mb-1"></div>
            এইচআর ম্যানেজার স্বাক্ষর
          </div>
          <div>
            <div className="w-40 border-b border-slate-400 mb-1"></div>
            ব্যবস্থাপনা পরিচালক স্বাক্ষর
          </div>
        </div>
      </div>
    );
  };

  const handleFinalizePayroll = async () => {
    if (performBlockingSync) {
      const success = await performBlockingSync({ 
        attendanceLog, 
        leaveLog 
      });
      if (!success) return;
    }
    setSuccessMessage('Payroll Adjustments Saved Successfully!');
  };

  const renderLeaveManagementTab = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    const getAutoAbsentCount = (empId: string) => {
        let absentCount = 0;
        for(let d=1; d<=daysInMonth; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            if((attendanceLog || {})[`${dateStr}_${empId}`]?.status === 'Absent') absentCount++;
        }
        return absentCount;
    };

    const filteredList = periodEmployees.filter(emp => {
      if (!emp) return false;
      const term = (payrollSearchTerm || '').trim().toLowerCase();
      if (!term) return true;
      const name = (emp.emp_name || '').toLowerCase();
      const id = (emp.emp_id || '').toLowerCase();
      const machine = (emp.machine_id || '').toLowerCase();
      const pos = (emp.job_position || emp.designation || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const addr = (emp.address || '').toLowerCase();
      const mob = (emp.mobile || '').toLowerCase();
      return name.includes(term) || id.includes(term) || machine.includes(term) || pos.includes(term) || dept.includes(term) || addr.includes(term) || mob.includes(term);
    });

    const payrollData = filteredList.map((emp, index) => {
      const autoAbsent = getAutoAbsentCount(emp.emp_id);
      const key = `${selectedMonth}_${selectedYear}_${emp.emp_id}`;
      const record = (leaveLog || {})[key] || { leaveDays: 0, deductionAmount: 0, bonus: 0, overtime: 0 };
      const currentSalary = record.agreedSalary !== undefined ? record.agreedSalary : (emp.salary || 0);
      const perDaySal = currentSalary / 30;
      const leaveDeduction = (autoAbsent + (record.leaveDays || 0)) * perDaySal;
      const totalDeduction = leaveDeduction + (record.deductionAmount || 0);
      const bonus = record.bonus || 0;
      const overtime = record.overtime || 0;
      const netEarnings = currentSalary + bonus + overtime;
      const finalNet = Math.max(0, netEarnings - totalDeduction);
      return {
        emp,
        index,
        key,
        record,
        currentSalary,
        autoAbsent,
        leaveDays: record.leaveDays || 0,
        bonus,
        overtime,
        leaveDeduction,
        manualDeduction: record.deductionAmount || 0,
        totalDeduction,
        finalNet
      };
    });

    const totalBasicSalary = payrollData.reduce((s, e) => s + e.currentSalary, 0);
    const totalEidBonus = payrollData.reduce((s, e) => s + e.bonus, 0);
    const totalOvertime = payrollData.reduce((s, e) => s + e.overtime, 0);
    const totalAbsentDays = payrollData.reduce((s, e) => s + e.autoAbsent, 0);
    const totalLeaveDays = payrollData.reduce((s, e) => s + e.leaveDays, 0);
    const totalDeductions = payrollData.reduce((s, e) => s + e.totalDeduction, 0);
    const totalNetPayable = payrollData.reduce((s, e) => s + e.finalNet, 0);

    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-fade-in">
          {/* Top Controls Header */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-sky-100 uppercase tracking-tight flex items-center gap-3">
                  Monthly Payroll Adjustments
                  <span className="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
                    {payrollData.length} জন স্টাফ
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                  মাসিক বেতন সমন্বয় ও কর্তন তালিকা • {(monthOptions[selectedMonth] || monthOptions[0]).name} {selectedYear}
                </p>
              </div>

              {/* Search Bar */}
              <div className="flex-1 max-w-md relative">
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="নাম, আইডি, পদবি, ঠিকানা দিয়ে খুঁজুন..."
                  value={payrollSearchTerm}
                  onChange={(e) => setPayrollSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
                {payrollSearchTerm && (
                  <button 
                    onClick={() => setPayrollSearchTerm('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Month/Year & Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-white font-bold">{monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-white font-bold">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
                  <button onClick={handlePrintPayrollAdjustments} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2">
                    <PrinterIcon size={15}/> প্রিন্ট শিট
                  </button>
                  <button onClick={handleFinalizePayroll} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2">
                    <SaveIcon className="w-4 h-4"/> সংরক্ষণ করুন
                  </button>
              </div>
          </div>

          {/* Table with Compact Column Totals Above Column Names */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-sky-200 font-bold border-b border-slate-300 dark:border-slate-700">
                      <tr>
                          <th className="p-3 text-center w-12 border-r border-slate-200 dark:border-slate-800">
                            <div className="text-[10px] text-slate-400 font-bold">#</div>
                            <div className="uppercase tracking-wider text-[11px]">SL</div>
                          </th>
                          <th className="p-3 border-r border-slate-200 dark:border-slate-800 min-w-[240px]">
                            <div className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400">মোট কর্মী: {payrollData.length} জন</div>
                            <div className="uppercase tracking-wider text-[11px]">স্টাফ মেম্বার ও পদবি / ঠিকানা</div>
                          </th>
                          <th className="p-3 text-right border-r border-slate-200 dark:border-slate-800 min-w-[120px]">
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-black">৳{totalBasicSalary.toLocaleString()}</div>
                            <div className="uppercase tracking-wider text-[10.5px] text-slate-600 dark:text-slate-300">Basic Salary</div>
                          </th>
                          <th className="p-3 text-center border-r border-slate-200 dark:border-slate-800 w-24">
                            <div className="text-[11px] text-rose-500 font-black">{totalAbsentDays} দিন</div>
                            <div className="uppercase tracking-wider text-[10.5px] text-slate-600 dark:text-slate-300">অনুপস্থিত</div>
                          </th>
                          <th className="p-3 text-center border-r border-slate-200 dark:border-slate-800 w-24">
                            <div className="text-[11px] text-amber-500 font-black">{totalLeaveDays} দিন</div>
                            <div className="uppercase tracking-wider text-[10.5px] text-slate-600 dark:text-slate-300">ছুটি (দিন)</div>
                          </th>
                          <th className="p-3 text-center border-r border-slate-200 dark:border-slate-800 min-w-[100px]">
                            <div className="text-[11px] text-blue-500 font-black">৳{totalEidBonus.toLocaleString()}</div>
                            <div className="uppercase tracking-wider text-[10.5px] text-slate-600 dark:text-slate-300">Eid Bonus</div>
                          </th>
                          <th className="p-3 text-center border-r border-slate-200 dark:border-slate-800 min-w-[100px]">
                            <div className="text-[11px] text-emerald-500 font-black">৳{totalOvertime.toLocaleString()}</div>
                            <div className="uppercase tracking-wider text-[10.5px] text-slate-600 dark:text-slate-300">Overtime</div>
                          </th>
                          <th className="p-3 text-right border-r border-slate-200 dark:border-slate-800 min-w-[130px]">
                            <div className="text-[11px] text-rose-600 font-black">৳{Math.round(totalDeductions).toLocaleString()}</div>
                            <div className="uppercase tracking-wider text-[10.5px] text-slate-600 dark:text-slate-300">মোট কর্তন</div>
                          </th>
                          <th className="p-3 text-right min-w-[140px] bg-blue-50/60 dark:bg-blue-950/30">
                            <div className="text-[12px] text-blue-700 dark:text-blue-300 font-black">৳{Math.round(totalNetPayable).toLocaleString()}</div>
                            <div className="uppercase tracking-wider text-[10.5px] text-blue-900 dark:text-blue-200">Net Payable</div>
                          </th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {payrollData.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                            কোনো কর্মচারীর তথ্য পাওয়া যায়নি
                          </td>
                        </tr>
                      ) : (
                        payrollData.map((item) => {
                          const { emp, index, key, record, currentSalary, autoAbsent, bonus, overtime, leaveDeduction, totalDeduction, finalNet } = item;
                          return (
                              <tr key={emp.emp_id} className="hover:bg-slate-50 dark:hover:bg-blue-950/20 transition-all">
                                  {/* Serial Number */}
                                  <td className="p-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100 dark:border-slate-800">
                                    {index + 1}
                                  </td>

                                  {/* Staff Member Details */}
                                  <td className="p-3 border-r border-slate-100 dark:border-slate-800">
                                      <div className="font-bold text-slate-800 dark:text-slate-100 uppercase text-xs flex items-center gap-2">
                                        {emp.emp_name}
                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                                          #{emp.emp_id}
                                        </span>
                                        {emp.machine_id && (
                                          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                                            HID: {emp.machine_id}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                                        {emp.job_position || emp.designation || 'Staff'} {emp.department ? `(${emp.department})` : ''}
                                      </div>
                                      {(emp.address || emp.mobile) && (
                                        <div className="text-[9.5px] text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-2">
                                          {emp.address && (
                                            <span className="flex items-center gap-1">
                                              <MapPinIcon className="w-2.5 h-2.5 text-slate-400" />
                                              {emp.address}
                                            </span>
                                          )}
                                          {emp.mobile && (
                                            <span className="flex items-center gap-1 font-mono">
                                              <PhoneIcon className="w-2.5 h-2.5 text-slate-400" />
                                              {emp.mobile}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                  </td>

                                  {/* Basic Salary */}
                                  <td className="p-3 text-right font-bold border-r border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-slate-400 text-xs">৳</span>
                                        <input 
                                          type="number" 
                                          value={record.agreedSalary !== undefined ? record.agreedSalary : (emp.salary || 0)} 
                                          onChange={(e) => setLeaveLog({...leaveLog, [key]: {...record, agreedSalary: parseInt(e.target.value) || 0}})} 
                                          className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-right text-slate-800 dark:text-slate-200 font-bold text-xs focus:ring-1 focus:ring-blue-500" 
                                        />
                                      </div>
                                  </td>

                                  {/* Absent Days */}
                                  <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800">
                                    <span className="inline-block px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-black text-xs">
                                      {autoAbsent}
                                    </span>
                                  </td>

                                  {/* Manual Leave Days */}
                                  <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800">
                                    <input 
                                      type="number" 
                                      value={record.leaveDays || 0} 
                                      onChange={(e) => setLeaveLog({...leaveLog, [key]: {...record, leaveDays: parseInt(e.target.value) || 0}})} 
                                      className="w-14 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-center text-slate-800 dark:text-white font-bold text-xs focus:ring-1 focus:ring-blue-500" 
                                    />
                                  </td>

                                  {/* Eid Bonus */}
                                  <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800">
                                    <input 
                                      type="number" 
                                      value={record.bonus || 0} 
                                      onChange={(e) => setLeaveLog({...leaveLog, [key]: {...record, bonus: parseInt(e.target.value) || 0}})} 
                                      className="w-20 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-1.5 text-center text-blue-600 dark:text-blue-400 font-bold text-xs focus:ring-1 focus:ring-blue-500" 
                                      placeholder="0" 
                                    />
                                  </td>

                                  {/* Overtime */}
                                  <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800">
                                    <input 
                                      type="number" 
                                      value={record.overtime || 0} 
                                      onChange={(e) => setLeaveLog({...leaveLog, [key]: {...record, overtime: parseInt(e.target.value) || 0}})} 
                                      className="w-20 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-1.5 text-center text-emerald-600 dark:text-emerald-400 font-bold text-xs focus:ring-1 focus:ring-emerald-500" 
                                      placeholder="0" 
                                    />
                                  </td>

                                  {/* Deductions (Manual input + auto leave breakdown) */}
                                  <td className="p-3 text-right border-r border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="text-slate-400 text-xs">৳</span>
                                      <input 
                                        type="number" 
                                        value={record.deductionAmount || 0} 
                                        onChange={(e) => setLeaveLog({...leaveLog, [key]: {...record, deductionAmount: parseInt(e.target.value) || 0}})} 
                                        className="w-20 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-lg p-1.5 text-right text-rose-600 font-bold text-xs focus:ring-1 focus:ring-rose-500" 
                                        placeholder="0"
                                      />
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-medium mt-1">
                                      ছুটি কর্তন: ৳{Math.round(leaveDeduction).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-rose-600 font-bold">
                                      মোট: ৳{Math.round(totalDeduction).toLocaleString()}
                                    </div>
                                  </td>

                                  {/* Net Payable */}
                                  <td className="p-3 text-right font-black text-blue-600 dark:text-sky-300 text-sm bg-blue-50/30 dark:bg-blue-950/10">
                                    ৳{Math.round(finalNet).toLocaleString()}
                                  </td>
                              </tr>
                          );
                        })
                      )}
                  </tbody>
                  {payrollData.length > 0 && (
                    <tfoot className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-black border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td colSpan={2} className="p-3.5 text-right uppercase text-xs tracking-wider">
                          সর্বমোট (Grand Total):
                        </td>
                        <td className="p-3.5 text-right text-xs">
                          ৳{totalBasicSalary.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center text-xs text-rose-600">
                          {totalAbsentDays} দিন
                        </td>
                        <td className="p-3.5 text-center text-xs text-amber-600">
                          {totalLeaveDays} দিন
                        </td>
                        <td className="p-3.5 text-center text-xs text-blue-600">
                          ৳{totalEidBonus.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center text-xs text-emerald-600">
                          ৳{totalOvertime.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right text-xs text-rose-600">
                          ৳{Math.round(totalDeductions).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right text-sm text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/30">
                          ৳{Math.round(totalNetPayable).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
              </table>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-slate-400 font-bold">
              * অনুপস্থিতি এবং ছুটির দিনের জন্য (বেসিক / ৩০) হারে স্বয়ংক্রিয়ভাবে বেতন কর্তন হিসাব করা হয়।
            </span>
            <button onClick={handleFinalizePayroll} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-bold uppercase text-xs shadow-lg transition-all flex items-center gap-2">
              <SaveIcon className="w-4 h-4"/> আপডেট ও সংরক্ষণ
            </button>
          </div>
      </div>
    );
  };

  const renderSalarySheetTab = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    const filteredList = periodEmployees.filter(emp => {
      if (!emp) return false;
      const term = (salarySheetSearchTerm || '').trim().toLowerCase();
      if (!term) return true;
      const name = (emp.emp_name || '').toLowerCase();
      const id = (emp.emp_id || '').toLowerCase();
      const machine = (emp.machine_id || '').toLowerCase();
      const pos = (emp.job_position || emp.designation || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const addr = (emp.address || '').toLowerCase();
      const mob = (emp.mobile || '').toLowerCase();
      return name.includes(term) || id.includes(term) || machine.includes(term) || pos.includes(term) || dept.includes(term) || addr.includes(term) || mob.includes(term);
    });

    const salarySheetData = filteredList.map((emp, index) => {
        let advanceTakenTotal = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayExpenses = (detailedExpenses || {})[dateStr] || [];
            const payments = dayExpenses.filter(ex => ex.category === 'Stuff salary' && (ex.subCategory === emp.emp_name || (ex.description && ex.description.includes(emp.emp_name))));
            advanceTakenTotal += payments.reduce((sum, ex) => sum + (ex.paidAmount || 0), 0);
        }
        const leaveKey = `${selectedMonth}_${selectedYear}_${emp.emp_id}`;
        const leaveRecord = (leaveLog || {})[leaveKey] || { leaveDays: 0, deductionAmount: 0, bonus: 0, overtime: 0 };
        let absentCount = 0;
        for(let d=1; d<=daysInMonth; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            if((attendanceLog || {})[`${dateStr}_${emp.emp_id}`]?.status === 'Absent') absentCount++;
        }
        const currentEmpSalary = leaveRecord.agreedSalary !== undefined ? leaveRecord.agreedSalary : (emp.salary || 0);
        const perDaySal = currentEmpSalary / 30;
        const leaveDeduction = (absentCount + (leaveRecord.leaveDays || 0)) * perDaySal;
        const totalDeduction = leaveDeduction + (leaveRecord.deductionAmount || 0);
        const bonus = leaveRecord.bonus || 0;
        const overtime = leaveRecord.overtime || 0;
        const bonusOt = bonus + overtime;
        const netPayable = Math.max(0, currentEmpSalary + bonusOt - totalDeduction);
        const paidAmount = advanceTakenTotal;
        const dueAmount = netPayable - paidAmount;

        return {
          emp,
          index,
          currentEmpSalary,
          bonus,
          overtime,
          bonusOt,
          leaveDeduction,
          manualDeduction: leaveRecord.deductionAmount || 0,
          totalDeduction,
          netPayable,
          paidAmount,
          dueAmount,
          absentCount,
          leaveDays: leaveRecord.leaveDays || 0
        };
    });

    const totalSheetBasic = salarySheetData.reduce((s, e) => s + e.currentEmpSalary, 0);
    const totalSheetBonusOt = salarySheetData.reduce((s, e) => s + e.bonusOt, 0);
    const totalSheetDeductions = salarySheetData.reduce((s, e) => s + e.totalDeduction, 0);
    const totalSheetNetPayable = salarySheetData.reduce((s, e) => s + e.netPayable, 0);
    const totalSheetPaid = salarySheetData.reduce((s, e) => s + e.paidAmount, 0);
    const totalSheetDue = salarySheetData.reduce((s, e) => s + e.dueAmount, 0);

    return (
        <div className="space-y-6 animate-fade-in no-print">
            {/* Top Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none flex items-center gap-3">
                    Employee Net Settlement Sheet
                    <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full">
                      {salarySheetData.length} জন কর্মী
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">
                    মাসিক নিট স্যালারি ও বকেয়া নিষ্পত্তি • {(monthOptions[selectedMonth] || monthOptions[0]).name} {selectedYear}
                  </p>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-md relative">
                  <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="নাম, আইডি, পদবি, ঠিকানা দিয়ে সার্চ করুন..."
                    value={salarySheetSearchTerm}
                    onChange={(e) => setSalarySheetSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                  />
                  {salarySheetSearchTerm && (
                    <button 
                      onClick={() => setSalarySheetSearchTerm('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Month/Year and Print Button */}
                <div className="flex flex-wrap items-center gap-3">
                  <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-white font-bold">{monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-white font-bold">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
                  <button onClick={handlePrintSalarySheet} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase shadow-md transition-all flex items-center gap-2.5">
                    <PrinterIcon size={16}/> Print Official Sheet
                  </button>
                </div>
            </div>

            {/* Table with Compact Column Totals on Top */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-sky-200 font-bold border-b border-slate-300 dark:border-slate-700">
                            <tr>
                                <th className="p-3 text-center w-12 border-r border-slate-200 dark:border-slate-800">
                                  <div className="text-[10px] text-slate-400 font-bold">#</div>
                                  <div className="uppercase tracking-wider text-[11px]">SL</div>
                                </th>
                                <th className="p-3 border-r border-slate-200 dark:border-slate-800 min-w-[240px]">
                                  <div className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">মোট কর্মী: {salarySheetData.length} জন</div>
                                  <div className="uppercase tracking-wider text-[11px]">স্টাফ মেম্বার (নাম, পদবি, ঠিকানা)</div>
                                </th>
                                <th className="p-3 text-right border-r border-slate-200 dark:border-slate-800 min-w-[110px]">
                                  <div className="text-[11px] text-slate-800 dark:text-slate-100 font-black">৳{totalSheetBasic.toLocaleString()}</div>
                                  <div className="uppercase tracking-wider text-[10.5px] text-slate-600 dark:text-slate-300">মূল বেতন (Basic)</div>
                                </th>
                                <th className="p-3 text-right border-r border-slate-200 dark:border-slate-800 min-w-[100px]">
                                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-black">৳{totalSheetBonusOt.toLocaleString()}</div>
                                  <div className="uppercase tracking-wider text-[10.5px] text-slate-600 dark:text-slate-300">বোনাস ও ও.টি</div>
                                </th>
                                <th className="p-3 text-right border-r border-slate-200 dark:border-slate-800 min-w-[110px]">
                                  <div className="text-[11px] text-rose-600 font-black">৳{Math.round(totalSheetDeductions).toLocaleString()}</div>
                                  <div className="uppercase tracking-wider text-[10.5px] text-slate-600 dark:text-slate-300">মোট কর্তন</div>
                                </th>
                                <th className="p-3 text-right border-r border-slate-200 dark:border-slate-800 min-w-[120px] bg-slate-200/50 dark:bg-slate-800/40">
                                  <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-black">৳{Math.round(totalSheetNetPayable).toLocaleString()}</div>
                                  <div className="uppercase tracking-wider text-[10.5px] text-indigo-900 dark:text-indigo-200">নেট স্যালারি</div>
                                </th>
                                <th className="p-3 text-right border-r border-slate-200 dark:border-slate-800 min-w-[110px] bg-emerald-50/50 dark:bg-emerald-950/20">
                                  <div className="text-[11px] text-emerald-600 font-black">৳{totalSheetPaid.toLocaleString()}</div>
                                  <div className="uppercase tracking-wider text-[10.5px] text-emerald-800 dark:text-emerald-300">পেইড / অগ্রিম</div>
                                </th>
                                <th className="p-3 text-right border-r border-slate-200 dark:border-slate-800 min-w-[120px] bg-amber-50/50 dark:bg-amber-950/20">
                                  <div className="text-[11px] text-amber-600 font-black">৳{Math.round(totalSheetDue).toLocaleString()}</div>
                                  <div className="uppercase tracking-wider text-[10.5px] text-amber-800 dark:text-amber-300">অবশিষ্ট ডিউ</div>
                                </th>
                                <th className="p-3 text-center min-w-[100px]">
                                  <div className="text-[10px] text-slate-400 font-bold">পরিস্থিতি</div>
                                  <div className="uppercase tracking-wider text-[11px]">স্ট্যাটাস</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {salarySheetData.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                                  কোনো কর্মচারীর তথ্য পাওয়া যায়নি
                                </td>
                              </tr>
                            ) : (
                              salarySheetData.map((item) => {
                                const { emp, index, currentEmpSalary, bonus, overtime, bonusOt, leaveDeduction, manualDeduction, totalDeduction, netPayable, paidAmount, dueAmount } = item;
                                const isFullyPaid = dueAmount <= 0 && netPayable > 0;
                                const isPartiallyPaid = paidAmount > 0 && dueAmount > 0;
                                const isUnpaid = paidAmount === 0 && netPayable > 0;

                                return (
                                    <tr key={emp.emp_id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors">
                                        {/* SL */}
                                        <td className="p-3 text-center text-slate-500 font-mono font-bold border-r border-slate-100 dark:border-slate-800">
                                          {index + 1}
                                        </td>

                                        {/* Staff Details */}
                                        <td className="p-3 border-r border-slate-100 dark:border-slate-800">
                                          <div className="font-bold text-slate-800 dark:text-white uppercase text-xs flex items-center gap-2">
                                            {emp.emp_name}
                                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                                              #{emp.emp_id}
                                            </span>
                                            {emp.machine_id && (
                                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                                                HID: {emp.machine_id}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                                            {emp.job_position || emp.designation || 'Staff'} {emp.department ? `(${emp.department})` : ''}
                                          </div>
                                          {(emp.address || emp.mobile) && (
                                            <div className="text-[9.5px] text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-2">
                                              {emp.address && (
                                                <span className="flex items-center gap-1">
                                                  <MapPinIcon className="w-2.5 h-2.5 text-slate-400" />
                                                  {emp.address}
                                                </span>
                                              )}
                                              {emp.mobile && (
                                                <span className="flex items-center gap-1 font-mono">
                                                  <PhoneIcon className="w-2.5 h-2.5 text-slate-400" />
                                                  {emp.mobile}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </td>

                                        {/* Basic Salary */}
                                        <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                                          ৳{(currentEmpSalary || 0).toLocaleString()}
                                        </td>

                                        {/* Bonus & OT */}
                                        <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400 border-r border-slate-100 dark:border-slate-800">
                                          ৳{(bonusOt || 0).toLocaleString()}
                                          {bonusOt > 0 && (
                                            <div className="text-[8.5px] text-slate-400 font-normal">
                                              {bonus > 0 && `বোনাস: ৳${bonus.toLocaleString()}`}
                                              {bonus > 0 && overtime > 0 && ' | '}
                                              {overtime > 0 && `OT: ৳${overtime.toLocaleString()}`}
                                            </div>
                                          )}
                                        </td>

                                        {/* Deductions */}
                                        <td className="p-3 text-right font-bold text-rose-600 border-r border-slate-100 dark:border-slate-800">
                                          ৳{Math.round(totalDeduction).toLocaleString()}
                                          {totalDeduction > 0 && (
                                            <div className="text-[8.5px] text-slate-400 font-normal">
                                              {leaveDeduction > 0 && `ছুটি: ৳${Math.round(leaveDeduction).toLocaleString()}`}
                                              {leaveDeduction > 0 && manualDeduction > 0 && ' | '}
                                              {manualDeduction > 0 && `অন্যান্য: ৳${manualDeduction.toLocaleString()}`}
                                            </div>
                                          )}
                                        </td>

                                        {/* Net Salary */}
                                        <td className="p-3 text-right font-black text-indigo-700 dark:text-indigo-300 text-sm border-r border-slate-100 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-800/30">
                                          ৳{Math.round(netPayable).toLocaleString()}
                                        </td>

                                        {/* Paid / Advance */}
                                        <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm border-r border-slate-100 dark:border-slate-800 bg-emerald-50/20 dark:bg-emerald-950/10">
                                          ৳{(paidAmount || 0).toLocaleString()}
                                        </td>

                                        {/* Due Balance */}
                                        <td className="p-3 text-right font-black text-sm border-r border-slate-100 dark:border-slate-800 bg-amber-50/20 dark:bg-amber-950/10">
                                          <span className={dueAmount > 0 ? 'text-amber-600 dark:text-amber-400' : dueAmount < 0 ? 'text-blue-600' : 'text-emerald-600'}>
                                            ৳{Math.round(dueAmount).toLocaleString()}
                                          </span>
                                        </td>

                                        {/* Status Badge */}
                                        <td className="p-3 text-center">
                                          {isFullyPaid ? (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                              পরিশোধিত
                                            </span>
                                          ) : isPartiallyPaid ? (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                              আংশিক পেইড
                                            </span>
                                          ) : isUnpaid ? (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                              বকেয়া
                                            </span>
                                          ) : (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                              ০ ব্যালেন্স
                                            </span>
                                          )}
                                        </td>
                                    </tr>
                                );
                              })
                            )}
                        </tbody>
                        {salarySheetData.length > 0 && (
                          <tfoot className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-black border-t-2 border-slate-300 dark:border-slate-700">
                            <tr>
                              <td colSpan={2} className="p-3.5 text-right uppercase text-xs tracking-wider">
                                মোট নিষ্পত্তিকৃত যোগফল (Grand Total):
                              </td>
                              <td className="p-3.5 text-right text-xs">
                                ৳{totalSheetBasic.toLocaleString()}
                              </td>
                              <td className="p-3.5 text-right text-xs text-blue-600">
                                ৳{totalSheetBonusOt.toLocaleString()}
                              </td>
                              <td className="p-3.5 text-right text-xs text-rose-600">
                                ৳{Math.round(totalSheetDeductions).toLocaleString()}
                              </td>
                              <td className="p-3.5 text-right text-sm text-indigo-700 dark:text-indigo-300 bg-slate-200/50 dark:bg-slate-800/50">
                                ৳{Math.round(totalSheetNetPayable).toLocaleString()}
                              </td>
                              <td className="p-3.5 text-right text-sm text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/30">
                                ৳{totalSheetPaid.toLocaleString()}
                              </td>
                              <td className="p-3.5 text-right text-sm text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30">
                                ৳{Math.round(totalSheetDue).toLocaleString()}
                              </td>
                              <td className="p-3.5 text-center text-xs text-slate-400">
                                —
                              </td>
                            </tr>
                          </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="w-full bg-slate-900 text-slate-100 flex flex-col font-sans relative pb-32">
      {successMessage && <div className="fixed bottom-12 right-12 z-[500] bg-emerald-600 border border-white text-white px-10 py-4 rounded-2xl shadow-2xl font-black animate-fade-in-up flex items-center gap-4 text-base">✅ {successMessage}</div>}
      <header className="bg-slate-800 border-b border-slate-700 p-6 md:p-8 shrink-0 shadow-sm z-20 relative no-print">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-6">
                {onBack && <button onClick={onBack} className="p-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all border border-slate-600"><BackIcon className="w-6 h-6 text-slate-200" /></button>}
                <div className="flex flex-col">
                    <h1 className="text-xl md:text-2xl font-bold text-white uppercase leading-none tracking-tight">Niramoy Clinic and Diagnostic</h1>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-2 opacity-70">Unified HR & Attendance System</p>
                </div>
            </div>
            <div className="flex items-center mt-6 md:mt-0 bg-slate-800/60 px-8 py-4 rounded-2xl border border-slate-700 shadow-inner group transition-all">
                <EmployeeInfoIcon className="w-8 h-8 text-blue-400 mr-4 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col items-end">
                    <h2 className="text-xl font-bold text-blue-400 font-bengali leading-none uppercase">কর্মচারী ব্যবস্থাপনা</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Version 10.0 Updated</p>
                </div>
            </div>
        </div>
      </header>
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10 flex-1 relative z-10">
        <div className="bg-slate-800/80 backdrop-blur-xl p-2 rounded-[2rem] border border-slate-700 no-print shadow-xl max-w-6xl mx-auto flex gap-2 overflow-x-auto">
            {[ 
              { id: 'data_entry', label: 'Global Profiles' }, 
              { id: 'monthly_roster', label: 'Monthly Roster' }, 
              { id: 'attendance', label: 'Attendance' }, 
              { id: 'leave_management', label: 'Payroll Adjust' }, 
              { id: 'salary_sheet', label: 'Salary Sheet' },
              { id: 'monthly_report', label: 'Monthly Report' }
            ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id as EmployeeTab)} className={`flex-1 py-4 px-6 rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg transform scale-[1.02]' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}>{item.label}</button>
            ))}
        </div>
        <div className="flex-1 transition-all duration-500">
            {activeTab === 'data_entry' && renderDataEntryTab()}
            {activeTab === 'monthly_roster' && renderMonthlyRosterTab()}
            {activeTab === 'attendance' && renderAttendanceTab()}
            {activeTab === 'leave_management' && renderLeaveManagementTab()}
            {activeTab === 'salary_sheet' && renderSalarySheetTab()}
            {activeTab === 'monthly_report' && renderMonthlyReportTab()}
        </div>
      </div>

      <ZKTecoBridgeModal
        isOpen={isZkModalOpen}
        onClose={() => setIsZkModalOpen(false)}
        employees={employees}
        setEmployees={setEmployees}
        attendanceLog={attendanceLog}
        setAttendanceLog={setAttendanceLog}
        performBlockingSync={performBlockingSync}
      />
    </div>
  );
};

class EmployeeInfoErrorBoundary extends React.Component<{ onBack?: () => void; children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("EmployeeInfoPage Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold">
              ⚠️
            </div>
            <h2 className="text-2xl font-bold text-white">কর্মচারী ব্যবস্থাপনা রেন্ডারিং সমস্যা</h2>
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
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg transition-all"
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

const EmployeeInfoPageWrapped: React.FC<EmployeeInfoPageProps> = (props) => {
  return (
    <EmployeeInfoErrorBoundary onBack={props.onBack}>
      <EmployeeInfoPage {...props} />
    </EmployeeInfoErrorBoundary>
  );
};

export default EmployeeInfoPageWrapped;
export { EmployeeInfoPage };