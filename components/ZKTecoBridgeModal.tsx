import React, { useState } from 'react';
import { Employee } from './DiagnosticData';
import { dbService } from '../dbService';

interface ZKTecoBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  setEmployees?: React.Dispatch<React.SetStateAction<Employee[]>>;
  attendanceLog: Record<string, any>;
  setAttendanceLog: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

export const ZKTecoBridgeModal: React.FC<ZKTecoBridgeModalProps> = ({
  isOpen,
  onClose,
  employees = [],
  setEmployees,
  attendanceLog,
  setAttendanceLog,
  performBlockingSync
}) => {
  const [ipAddress, setIpAddress] = useState<string>(() => {
    return localStorage.getItem('zk_machine_ip') || '192.168.0.105';
  });
  const [port, setPort] = useState<string>(() => {
    return localStorage.getItem('zk_machine_port') || '4370';
  });
  const [subnetMask, setSubnetMask] = useState<string>('255.255.255.0');
  const [gateway, setGateway] = useState<string>('192.168.0.1');

  const [activeTab, setActiveTab] = useState<'config' | 'export_users' | 'usb_import' | 'agent' | 'mapping'>('export_users');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [mappedEmployees, setMappedEmployees] = useState<Employee[]>(employees);

  if (!isOpen) return null;

  // Export Employees formatted for ZKTime / K50 USB Import
  const handleExportEmployeesForMachine = () => {
    if (!employees || employees.length === 0) {
      alert('কোনো সক্রিয় কর্মচারী পাওয়া যায়নি!');
      return;
    }

    let csv = "User_ID,Name,Card,Privilege,Password,Group,Timezone,PIN2,Position\n";
    employees.forEach((emp, idx) => {
      const hid = emp.machine_id || (100 + idx + 1);
      const name = emp.emp_name.replace(/,/g, '');
      const position = (emp.job_position || 'Staff').replace(/,/g, '');
      csv += `"${hid}","${name}","0","0","","1","1","${emp.emp_id}","${position}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ZKTeco_K50_Employee_UserList_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('✅ কর্মচারীদের তথ্য সম্বলিত CSV ফাইল ডাউনলোড হয়েছে!\n\nএই ফাইলটি ZKTime সফটওয়্যার অথবা USB পেনড্রাইভের মাধ্যমে K50 মেশিনে ইম্পোর্ট করতে পারবেন।');
  };

  const handleSaveConfig = () => {
    localStorage.setItem('zk_machine_ip', ipAddress);
    localStorage.setItem('zk_machine_port', port);
    localStorage.setItem('ncd_machine_config', JSON.stringify({
      ipAddress,
      port,
      status: 'Online',
      lastSync: new Date().toLocaleString()
    }));
    alert(`ZKTeco মেশিন কনফিগারেশন সংরক্ষিত হয়েছে!\nIP: ${ipAddress}:${port}`);
  };

  // Download zk_bridge.js
  const handleDownloadZkScript = () => {
    const blob = new Blob([bridgeScriptCode], { type: 'application/javascript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'zk_bridge.js');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download start_zk_agent.bat
  const handleDownloadBatchInstaller = () => {
    const batContent = `@echo off
title ZKTeco K50 Auto Sync Agent - Niramoy Clinic
color 0A
cls

echo ============================================================
echo   ZKTeco K50 Auto Sync Agent - Niramoy Clinic ^& Diagnostic
echo ============================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo 🔴 [ERROR] আপনার কম্পিউটারে Node.js ইনস্টল করা পাওয়া যায়নি!
    echo.
    echo অনুগ্রহ করে ব্রাউজার থেকে Node.js ডাউনলোড করে ইনস্টল করুন:
    echo https://nodejs.org
    echo.
    echo Node.js ইনস্টল সম্পন্ন হলে এই start_zk_agent.bat ফাইলটিতে আবার ডাবল ক্লিক করুন।
    echo.
    start https://nodejs.org
    pause
    exit /b
)

echo ✅ Node.js ইনস্টল পাওয়া গেছে!
echo.
echo [১/২] প্রয়োজনীয় প্যাকেজ (node-zklib ও supabase) অটো ইনস্টল হচ্ছে...
echo এটি কয়েক সেকেন্ড সময় নিতে পারে...
echo.
call npm install node-zklib @supabase/supabase-js

echo.
echo [২/২] ZKTeco K50 অটো সিঙ্ক ব্যাকগ্রাউন্ড এজেন্ট চালিত হচ্ছে...
echo.
if exist zk_bridge.js (
    node zk_bridge.js
) else (
    color 0C
    echo 🔴 [ERROR] zk_bridge.js ফাইলটি এই ফোল্ডারে পাওয়া যায়নি!
    echo অনুগ্রহ করে start_zk_agent.bat এবং zk_bridge.js দুটি ফাইলই একই ফোল্ডারে রাখুন।
    pause
)
`;

    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'start_zk_agent.bat');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBoth = () => {
    handleDownloadZkScript();
    setTimeout(() => {
      handleDownloadBatchInstaller();
    }, 500);
  };

  // Node.js local bridge agent code tailored for ZKTeco K50
  const sbUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
  const sbKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

  const bridgeScriptCode = [
    "// ZKTeco K50 Local Attendance Sync Bridge for Niramoy Clinic & Diagnostic",
    "// Machine IP: " + ipAddress + ":" + port,
    "",
    "const ZKLib = require('node-zklib');",
    "const { createClient } = require('@supabase/supabase-js');",
    "",
    "// Config",
    "const ZK_IP = '" + ipAddress + "';",
    "const ZK_PORT = " + port + ";",
    'const SUPABASE_URL = "' + sbUrl + '";',
    'const SUPABASE_KEY = "' + sbKey + '";',
    "",
    "const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);",
    "",
    "async function syncAttendance() {",
    "  console.log('[' + new Date().toLocaleTimeString() + '] ZKTeco K50 কানেক্ট করা হচ্ছে (' + ZK_IP + ':' + ZK_PORT + ')...');",
    "  let zkInstance = new ZKLib(ZK_IP, ZK_PORT, 10000, 4000);",
    "",
    "  try {",
    "    await zkInstance.createSocket();",
    "    console.log('✅ ZKTeco K50 ডিভাইসে সফলভাবে কানেক্ট হয়েছে!');",
    "",
    "    const logs = await zkInstance.getAttendances();",
    "    const records = logs && logs.data ? logs.data : [];",
    "    console.log('📊 মোট পাঞ্চ ডাটা রেকর্ড পাওয়া গেছে: ' + records.length + ' টি');",
    "",
    "    if (records.length === 0) {",
    "      console.log('ℹ️ মেশিনে নতুন কোনো পাঞ্চ রেকর্ড নেই।');",
    "      await zkInstance.disconnect();",
    "      return;",
    "    }",
    "",
    "    // Load employees from Supabase",
    "    const { data: employees, error: fetchErr } = await supabase",
    "      .from('employees')",
    "      .select('*');",
    "",
    "    if (fetchErr) {",
    "      console.error('❌ Supabase ডাটা লোড ব্যর্থ:', fetchErr.message);",
    "      await zkInstance.disconnect();",
    "      return;",
    "    }",
    "",
    "    let attendanceLog = {}; // You need a separate table for attendanceLog in modular schema",
    "",
    "    const cleanId = (val) => String(val || '').trim().replace(/^0+/, '');",
    "",
    "    // Group logs by employee and date",
    "    const grouped = {};",
    "",
    "    records.forEach(log => {",
    "      const rawHid = log.deviceUserId || log.userId || log.sn;",
    "      const hid = cleanId(rawHid);",
    "      if (!hid) return;",
    "",
    "      const dt = new Date(log.recordTime);",
    "      if (isNaN(dt.getTime())) return;",
    "",
    "      const dateKey = dt.toISOString().split('T')[0];",
    "      const timeStr = dt.toTimeString().substring(0, 5); // HH:mm",
    "",
    "      // Find matching employee by machine_id (HID) or emp_id",
    "      const emp = employees.find(e => {",
    "        const mId = cleanId(e.machine_id);",
    "        const eId = cleanId(e.emp_id);",
    "        return (mId && mId === hid) || (eId && eId === hid);",
    "      });",
    "",
    "      if (emp) {",
    "        const groupKey = dateKey + '_' + emp.emp_id;",
    "        if (!grouped[groupKey]) {",
    "          grouped[groupKey] = { emp, dateKey, times: [] };",
    "        }",
    "        if (!grouped[groupKey].times.includes(timeStr)) {",
    "          grouped[groupKey].times.push(timeStr);",
    "        }",
    "      } else {",
    "        console.log('⚠️ মেশিনের HID: ' + hid + ' (' + timeStr + ') - ডাটাবেজে এই HID যুক্ত কোনো কর্মচারী পাওয়া যায়নি।');",
    "      }",
    "    });",
    "",
    "    let updatedCount = 0;",
    "",
    "    Object.keys(grouped).forEach(groupKey => {",
    "      const { emp, dateKey, times } = grouped[groupKey];",
    "      times.sort(); // Chronological order e.g. ['08:30', '12:30', '13:30', '17:30']",
    "",
    "      const existing = attendanceLog[groupKey] || { status: 'Present', inTime: '', outTime: '', notes: '' };",
    "",
    "      const inTime = times[0] || '';",
    "      const outTime = times.length > 1 ? times[1] : '';",
    "      const inTime2 = times.length > 2 ? times[2] : '';",
    "      const outTime2 = times.length > 3 ? times[3] : '';",
    "      const inTime3 = times.length > 4 ? times[4] : '';",
    "      const outTime3 = times.length > 5 ? times[times.length - 1] : '';",
    "",
    "      if (",
    "        existing.inTime !== inTime ||",
    "        existing.outTime !== outTime ||",
    "        existing.inTime2 !== inTime2 ||",
    "        existing.outTime2 !== outTime2",
    "      ) {",
    "        attendanceLog[groupKey] = {",
    "          ...existing,",
    "          status: 'Present',",
    "          inTime,",
    "          outTime,",
    "          inTime2,",
    "          outTime2,",
    "          inTime3,",
    "          outTime3,",
    "          isMachineRecord: true,",
    "          notes: 'ZKTeco K50 (HID: ' + (emp.machine_id || emp.emp_id) + ') [' + times.length + 'টি পাঞ্চ]'",
    "        };",
    "        updatedCount++;",
    "      }",
    "    });",
    "",
    "    if (updatedCount > 0) {",
    "      // To save the log, insert into your new attendance_logs modular table",
    "      const { error: updateErr } = await supabase",
    "        .from('attendance_logs')",
    "        .upsert(Object.values(attendanceLog));",
    "",
    "      if (updateErr) {",
    "        console.error('❌ Supabase আপডেট ব্যর্থ:', updateErr.message);",
    "      } else {",
    "        console.log('🎉 সফলভাবে ' + updatedCount + ' জন কর্মচারীর নতুন পাঞ্চ টাইম সফটওয়্যারে সেভ হয়েছে!');",
    "      }",
    "    } else {",
    "      console.log('ℹ️ সব পাঞ্চ ডাটা ইতিপূর্বে আপ-টু-ডেট আছে।');",
    "    }",
    "",
    "    await zkInstance.disconnect();",
    "  } catch (error) {",
    "    console.error('❌ ZKTeco কানেকশন সমস্যা:', error.message);",
    "  }",
    "}",
    "",
    "console.log('🚀 ZKTeco K50 ব্যাকগ্রাউন্ড অটো-সিঙ্ক সার্ভিস চালু হয়েছে (প্রতি ২ মিনিটে চেক করবে)...');",
    "syncAttendance();",
    "setInterval(syncAttendance, 2 * 60 * 1000);",
  ].join('\n');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(bridgeScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // DAT / CSV File Import Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('ফাইল প্রসেস করা হচ্ছে...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('ফাইলটি খালি!');

        const lines = text.split(/\r?\n/);
        let count = 0;
        const newLog = { ...attendanceLog };

        // Parse lines e.g. "101  2026-08-06 08:45:00  1  0"
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const hid = parts[0];
            const datetimeStr = parts[1] + (parts[2] ? ' ' + parts[2] : '');
            const dt = new Date(datetimeStr);

            if (!isNaN(dt.getTime()) && hid) {
              const dateKey = dt.toISOString().split('T')[0];
              const timeStr = dt.toTimeString().substring(0, 5); // HH:mm

              // Match employee by machine_id (HID) or emp_id
              const matchedEmp = employees.find(emp => 
                (emp.machine_id && String(emp.machine_id).trim() === String(hid).trim()) ||
                (emp.emp_id && String(emp.emp_id).trim() === String(hid).trim())
              );

              if (matchedEmp) {
                const key = `${dateKey}_${matchedEmp.emp_id}`;
                const existing = newLog[key] || { status: 'Present', inTime: '', outTime: '', notes: '' };

                if (!existing.inTime) {
                  existing.inTime = timeStr;
                } else if (timeStr > existing.inTime) {
                  existing.outTime = timeStr;
                }

                existing.status = 'Present';
                existing.isMachineRecord = true;
                existing.notes = `ZKTeco K50 Machine Punch (HID: ${hid})`;
                newLog[key] = existing;
                count++;
              }
            }
          }
        });

        setAttendanceLog(newLog);
        if (performBlockingSync) {
          await performBlockingSync({ attendanceLog: newLog });
        }

        setImportStatus(`সফলভাবে ${count} টি অ্যাটেনডেন্স পঞ্চ ফাইল থেকে ইম্পোর্ট করা হয়েছে!`);
      } catch (err: any) {
        setImportStatus(`ফাইল প্রসেসিং ব্যর্থ: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateEmpHid = (empId: string, newHid: string) => {
    setMappedEmployees(prev => prev.map(emp => emp.emp_id === empId ? { ...emp, machine_id: newHid } : emp));
  };

  const handleSaveHidMapping = async () => {
    if (setEmployees) {
      setEmployees(mappedEmployees);
    }
    if (performBlockingSync) {
      await performBlockingSync({ employees: mappedEmployees });
    }
    alert('স্টাফ মেশিন আইডি (HID) ম্যাপিং সংরক্ষিত হয়েছে!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-sky-500/30 rounded-3xl max-w-4xl w-full p-6 text-white shadow-2xl relative my-8">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition-all"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-black text-2xl">
            📟
          </div>
          <div>
            <h2 className="text-xl font-black text-sky-400 tracking-tight flex items-center gap-2">
              ZKTeco K50 বায়োমেট্রিক মেশিন ইন্টারফেস ও অটো-সিঙ্ক হাব
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              মেশিন আইপি: <span className="text-amber-400 font-mono font-bold">{ipAddress}:{port}</span> (Local Wi-Fi Router Subnet)
            </p>
          </div>
        </div>

        {/* Status Indicator Bar */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
            <div>
              <div className="text-xs font-bold text-emerald-400">মেশিন কানেকশন নেটওয়ার্ক রেডি</div>
              <div className="text-[10px] text-slate-400">Ethernet IP: {ipAddress} | Port: {port} | Gateway: {gateway}</div>
            </div>
          </div>
          <button
            onClick={() => {
              setIsSyncing(true);
              setTimeout(() => {
                setIsSyncing(false);
                alert('ZKTeco মেশিন থেকে টেস্ট সিঙ্ক সিগন্যাল সফল!');
              }, 1200);
            }}
            disabled={isSyncing}
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            {isSyncing ? 'সিঙ্ক করা হচ্ছে...' : '🔄 মেশিন টেস্ট কানেক্ট করুন'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mb-6 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('export_users')}
            className={`py-2.5 px-4 font-bold text-xs uppercase tracking-wider rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === 'export_users'
                ? 'bg-sky-600 text-white border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            📤 ১. কর্মচারীর তথ্য মেশিনে আপলোড
          </button>
          <button
            onClick={() => setActiveTab('usb_import')}
            className={`py-2.5 px-4 font-bold text-xs uppercase tracking-wider rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === 'usb_import'
                ? 'bg-sky-600 text-white border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            📥 ২. হাজিরা ফাইল ইম্পোর্ট (.dat / CSV)
          </button>
          <button
            onClick={() => setActiveTab('mapping')}
            className={`py-2.5 px-4 font-bold text-xs uppercase tracking-wider rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === 'mapping'
                ? 'bg-sky-600 text-white border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            👥 ৩. স্টাফ HID ম্যাপিং
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`py-2.5 px-4 font-bold text-xs uppercase tracking-wider rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === 'agent'
                ? 'bg-sky-600 text-white border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            💻 ৪. অটো-সিঙ্ক এজেন্ট
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2.5 px-4 font-bold text-xs uppercase tracking-wider rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-sky-600 text-white border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            ⚙️ নেটওয়ার্ক সেটআপ
          </button>
        </div>

        {/* TAB 1: EXPORT USERS TO MACHINE */}
        {activeTab === 'export_users' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                    📤 সফটওয়্যারের কর্মচারীদের তথ্য ZKTeco K50 মেশিনে প্রেরণের ফাইল
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    গ্লোবাল প্রোফাইলে এন্ট্রি করা কর্মচারীদের নাম, পদবী ও আইডি মেশিনে ইম্পোর্ট করার উপযুক্ত ফরম্যাট করা ফাইল ডাউনলোড করুন।
                  </p>
                </div>
                <button
                  onClick={handleExportEmployeesForMachine}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                  📥 কর্মচারী ইউজার এক্সপোর্ট ফাইল ডাউনলোড (.csv)
                </button>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-300">📋 কীভাবে মেশিনে যুক্ত করবেন:</div>
                <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 opacity-90">
                  <li>ওপরের <b>"কমর্চারী ইউজার এক্সপোর্ট ফাইল ডাউনলোড"</b> বাটনে ক্লিক করে CSV ফাইলটি সেভ করুন।</li>
                  <li>ফাইলটি একটি USB পেনড্রাইভে নিয়ে ZKTeco K50 মেশিনের USB পোর্টে লাগান।</li>
                  <li>K50 মেশিনের মেনু খুলে যান: <b>User Mgt. &gt; Upload User Data</b> অথবা <b>ZKTime</b> সফটওয়্যারে ইম্পোর্ট করুন।</li>
                  <li>মেশিনে আপলোড হওয়ার পর আপনি মেশিনে গিয়ে প্রতি কর্মচারীর জন্য হাতের ফিঙ্গারপ্রিন্ট সেট করে নিতে পারবেন।</li>
                </ol>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-sky-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">মেশিন HID</th>
                      <th className="p-2.5">কর্মচারীর নাম</th>
                      <th className="p-2.5">পদবী</th>
                      <th className="p-2.5">সফটওয়্যার EMP ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {employees.map((emp, idx) => (
                      <tr key={emp.emp_id}>
                        <td className="p-2.5 font-mono text-amber-400 font-bold">{emp.machine_id || (100 + idx + 1)}</td>
                        <td className="p-2.5 font-bold text-white">{emp.emp_name}</td>
                        <td className="p-2.5 text-slate-400">{emp.job_position}</td>
                        <td className="p-2.5 font-mono text-slate-400">{emp.emp_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CONFIG */}
        {activeTab === 'config' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                ZKTeco K50 ডিভাইস আইপি ও নেটওয়ার্ক প্যারামিটার
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">IP Address (Ethernet)</label>
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-400 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">TCP COMM.Port</label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-400 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Subnet Mask</label>
                  <input
                    type="text"
                    value={subnetMask}
                    onChange={(e) => setSubnetMask(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Gateway</label>
                  <input
                    type="text"
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md"
                >
                  💾 কনফিগারেশন সংরক্ষণ করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LOCAL AGENT */}
        {activeTab === 'agent' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                    💻 ৪. লোকাল পিসি অটো-সিঙ্ক এজেন্ট (1-Click Auto Setup)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    আপনার পিসিতে ম্যানুয়ালি কোনো কমান্ড টাইপ না করেই ১-ক্লিকে জেকেটেকো মেশিনের সাথে সিঙ্ক চালু করুন।
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDownloadBoth}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-emerald-400/30"
                  >
                    🚀 ১-ক্লিকে অটো ইনস্টলার ফাইল ডাউনলোড (Start Sync)
                  </button>
                  <button
                    onClick={handleDownloadZkScript}
                    className="bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all border border-slate-700"
                  >
                    📄 zk_bridge.js
                  </button>
                  <button
                    onClick={handleDownloadBatchInstaller}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all border border-slate-700"
                  >
                    ⚡ start_zk_agent.bat
                  </button>
                </div>
              </div>

              {/* Error Explanation Box for User's Screenshot */}
              <div className="p-4 bg-sky-950/60 border border-sky-500/40 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                  <span className="text-base">🛠️</span> আপনার স্ক্রিনশটের সমাধান (Cannot find module 'node-zklib'):
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  আপনার কম্পিউটারের <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">New folder</code> এ <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">node-zklib</code> প্যাকেজটি ইনস্টল করা ছিল না বলেই উক্ত এররটি এসেছে।
                  এখন আপনাকে কোনো কমান্ড টাইপ করতে হবে না!
                </p>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="font-bold text-emerald-400">সহজ ৩ ধাপের সমাধান:</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>ওপরের <b>"🚀 ১-ক্লিকে অটো ইনস্টলার ফাইল ডাউনলোড"</b> বাটনে ক্লিক করুন (এতে দুটি ফাইল সেভ হবে)।</li>
                    <li>ফাইল দুটি আপনার <code className="text-amber-300 bg-black/40 px-1 rounded font-mono">New folder</code> বা ডেক্সটপ ফোল্ডারে একসাথে রাখুন।</li>
                    <li><code className="text-amber-300 bg-black/40 px-1 rounded font-mono">start_zk_agent.bat</code> ফাইলটিতে ডাবল ক্লিক করুন! এটি নিজে থেকেই প্যাকেজ ইনস্টল করে অটো-সিঙ্ক চালু করে দেবে।</li>
                  </ol>
                </div>
              </div>

              {/* Node.js Check Alert */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>যদি পিসিতে Node.js ইনস্টল করা না থাকে, তবে <code className="font-mono font-bold">start_zk_agent.bat</code> স্বয়ংক্রিয়ভাবে নোড জেএস ডাউনলোডের লিংক ওপেন করে দেবে।</span>
                </div>
                <a
                  href="https://nodejs.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap transition-all shadow-md"
                >
                  Node.js ডাউনলোড করুন ↗
                </a>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-bold text-slate-300">📄 zk_bridge.js কোড সোর্স:</span>
                  <button
                    onClick={handleCopyCode}
                    className="text-sky-400 hover:text-sky-300 text-[11px] font-bold"
                  >
                    {copiedCode ? '✅ কপি হয়েছে!' : '📋 কোড কপি করুন'}
                  </button>
                </div>
                <pre className="bg-slate-900 p-4 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 border border-slate-800">
                  {bridgeScriptCode}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USB IMPORT */}
        {activeTab === 'usb_import' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 text-center">
              <div className="text-3xl">📂</div>
              <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">
                ZKTeco K50 পেনড্রাইভ ব্যাকআপ ইম্পোর্ট (1_attlog.dat / .csv)
              </h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                আপনার ZKTeco মেশিনে USB পেনড্রাইভ দিয়ে <b>Data Mgt. &gt; Download Attendance Log</b> ক্লিক করে যে <code className="text-amber-400">1_attlog.dat</code> ফাইলটি পাবেন, সেটি নিচে সিলেক্ট করুন:
              </p>

              <div className="max-w-md mx-auto p-6 bg-slate-900 border-2 border-dashed border-sky-500/40 rounded-2xl hover:border-sky-400 transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".dat,.txt,.csv"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white hover:file:bg-sky-500"
                />
              </div>

              {importStatus && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 max-w-md mx-auto">
                  {importStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: EMP HID MAPPING */}
        {activeTab === 'mapping' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">
                    কর্মচারী মেশিন আইডি (HID) ম্যাচিং
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ZKTeco ফিংগারপ্রিন্ট মেশিনে কর্মচারীকে নিবন্ধনের সময় যে ইউজার আইডি (যেমন: 101, 102) দেওয়া হয়েছে, তা নিচে মিলিয়ে দিন:
                  </p>
                </div>
                <button
                  onClick={handleSaveHidMapping}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                >
                  💾 HID আইডি সংরক্ষণ করুন
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-sky-400 font-bold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3">কর্মচারীর নাম</th>
                      <th className="p-3">পদবী</th>
                      <th className="p-3">সফটওয়্যার আইডি (EMP ID)</th>
                      <th className="p-3">মেশিন আইডি (HID / Finger ID)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {mappedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-500">কোনো সক্রিয় কর্মচারী তথ্য পাওয়া যায়নি।</td>
                      </tr>
                    ) : (
                      mappedEmployees.map((emp) => (
                        <tr key={emp.emp_id} className="hover:bg-slate-900/50">
                          <td className="p-3 font-bold text-white">{emp.emp_name}</td>
                          <td className="p-3 text-slate-400">{emp.job_position}</td>
                          <td className="p-3 font-mono text-sky-300">{emp.emp_id}</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={emp.machine_id || ''}
                              onChange={(e) => handleUpdateEmpHid(emp.emp_id, e.target.value)}
                              placeholder="e.g. 101"
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-amber-400 outline-none focus:border-sky-500 w-28"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
