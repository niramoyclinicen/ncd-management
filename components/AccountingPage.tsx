import React, { useState } from 'react';
import {
  AccountingIcon,
  ClinicIcon,
  DiagnosticIcon,
  EmployeeInfoIcon,
  MedicineIcon,
  BackIcon,
  MapPinIcon,
  PhoneIcon
} from './Icons';
import { LabInvoice, DueCollection, ExpenseItem, Employee, PurchaseInvoice, SalesInvoice, Medicine, Reagent, IndoorInvoice, Patient, Doctor, Test } from './DiagnosticData';
import DiagnosticAccountsPage from './diagnostic/DiagnosticAccountsPage';
import EmployeeInfoPage from './EmployeeInfoPage';
import MedicineAccountsPage from './medicine/MedicineAccountsPage';
import ClinicAccountsPage from './clinic/ClinicAccountsPage';
import ConsolidatedAccountsPage from './ConsolidatedAccountsPage';

interface AccountingPageProps {
  onBack: () => void;
  invoices: LabInvoice[];
  setInvoices?: React.Dispatch<React.SetStateAction<LabInvoice[]>>;
  dueCollections: DueCollection[];
  setDueCollections?: React.Dispatch<React.SetStateAction<DueCollection[]>>;
  detailedExpenses: Record<string, ExpenseItem[]>;
  setDetailedExpenses: React.Dispatch<React.SetStateAction<Record<string, ExpenseItem[]>>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  purchaseInvoices: PurchaseInvoice[];
  salesInvoices: SalesInvoice[];
  indoorInvoices: IndoorInvoice[];
  setIndoorInvoices?: React.Dispatch<React.SetStateAction<IndoorInvoice[]>>;
  medicines: Medicine[];
  tests: Test[];
  reagents: Reagent[];
  setReagents: React.Dispatch<React.SetStateAction<Reagent[]>>;
  attendanceLog: Record<string, any>;
  setAttendanceLog: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  leaveLog: Record<string, any>;
  setLeaveLog: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  monthlyRoster: Record<string, string[]>;
  setMonthlyRoster: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  monthlyAdjustments?: Record<string, any>;
  setMonthlyAdjustments?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  patients: Patient[];
  doctors: Doctor[];
  diagnosticSettings: any;
  setDiagnosticSettings: React.Dispatch<React.SetStateAction<any>>;
  consolidatedLabEntries?: any[];
  setConsolidatedLabEntries?: React.Dispatch<React.SetStateAction<any[]>>;
  performBlockingSync: (overrides?: any) => Promise<boolean>;
}

interface AccountingButtonProps {
  label: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  isOval?: boolean;
  colorClass: string;
}

const AccountingButton: React.FC<AccountingButtonProps> = ({
  label,
  icon,
  onClick,
  isOval = false,
  colorClass
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }}
    className={`
      relative group flex flex-col items-center justify-center cursor-pointer select-none
      transition-all duration-300 transform hover:scale-105 hover:shadow-2xl active:scale-95
      border border-slate-600 bg-slate-800/95 backdrop-blur-md shadow-lg shadow-slate-950/40
      ${isOval
        ? 'w-72 sm:w-80 h-44 sm:h-48 rounded-[50%] z-30 shadow-[0_0_30px_rgba(0,0,0,0.6)] border-2'
        : 'w-full h-48 sm:h-52 rounded-2xl z-10 p-6 shadow-lg'
      }
      ${colorClass}
    `}
  >
    <div className="mb-4 p-4 rounded-full bg-slate-700/70 text-slate-100 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
       {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-10 h-10' })}
    </div>
    <div className="text-center group-hover:text-white transition-colors pointer-events-none">
        {label}
    </div>
  </button>
);

const BackgroundGraphic = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center opacity-[0.07]">
    <svg viewBox="0 0 500 500" className="absolute w-[120%] h-[120%] text-amber-500 animate-spin-slow" style={{ animationDuration: '80s' }}>
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <g transform="translate(250,250)">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
          <path
            key={angle}
            d="M0,0 C50,-100 150,-100 200,0 C150,100 50,100 0,0"
            fill="none"
            stroke="url(#grad1)"
            strokeWidth="1.5"
            transform={`rotate(${angle})`}
          />
        ))}
        <circle cx="0" cy="0" r="40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 5" />
        <circle cx="0" cy="0" r="100" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </g>
    </svg>
    <svg viewBox="0 0 500 500" className="absolute w-[80%] h-[80%] text-cyan-500 animate-spin-slow-reverse" style={{ animationDuration: '60s' }}>
      <g transform="translate(250,250)">
        {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((angle) => (
          <rect
            key={angle}
            x="-50" y="-50" width="100" height="100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            transform={`rotate(${angle})`}
            opacity="0.6"
          />
        ))}
      </g>
    </svg>
  </div>
);

const AccountingPage: React.FC<AccountingPageProps> = ({
  onBack, invoices = [], setInvoices, dueCollections = [], setDueCollections, detailedExpenses = {}, setDetailedExpenses, employees = [], setEmployees, reagents = [],
  purchaseInvoices = [], salesInvoices = [], indoorInvoices = [], setIndoorInvoices, medicines = [], tests = [], setReagents,
  attendanceLog = {}, setAttendanceLog, leaveLog = {}, setLeaveLog,
  monthlyRoster = {}, setMonthlyRoster, monthlyAdjustments, setMonthlyAdjustments, patients = [], doctors = [],
  diagnosticSettings = {}, setDiagnosticSettings, performBlockingSync,
  consolidatedLabEntries = [], setConsolidatedLabEntries
}) => {
  const [activeView, setActiveView] = useState<'main' | 'diagnostic' | 'clinic_accounts' | 'employee_info' | 'medicine_accounts' | 'consolidated'>('main');

  if (activeView === 'diagnostic') {
    return (
        <DiagnosticAccountsPage
            onBack={() => setActiveView('main')}
            invoices={invoices}
            dueCollections={dueCollections}
            employees={employees}
            detailedExpenses={detailedExpenses}
            setDetailedExpenses={setDetailedExpenses}
            setReagents={setReagents}
            reagents={reagents}
            availableTests={tests}
            monthlyRoster={monthlyRoster}
            patients={patients}
            doctors={doctors}
            diagnosticSettings={diagnosticSettings}
            setDiagnosticSettings={setDiagnosticSettings}
            performBlockingSync={performBlockingSync}
            attendanceLog={attendanceLog}
            leaveLog={leaveLog}
            consolidatedLabEntries={consolidatedLabEntries}
        />
    );
  }

  if (activeView === 'clinic_accounts') {
    return (
        <ClinicAccountsPage
            onBack={() => setActiveView('main')}
            invoices={indoorInvoices}
            dueCollections={dueCollections}
            employees={employees}
            detailedExpenses={detailedExpenses}
            setDetailedExpenses={setDetailedExpenses}
            performBlockingSync={performBlockingSync}
            attendanceLog={attendanceLog}
            leaveLog={leaveLog}
            monthlyRoster={monthlyRoster}
        />
    );
  }

  if (activeView === 'employee_info') {
    return (
        <EmployeeInfoPage
            employees={employees || []}
            setEmployees={setEmployees}
            detailedExpenses={detailedExpenses || {}}
            onBack={() => setActiveView('main')}
            attendanceLog={attendanceLog || {}}
            setAttendanceLog={setAttendanceLog}
            leaveLog={leaveLog || {}}
            setLeaveLog={setLeaveLog}
            monthlyRoster={monthlyRoster || {}}
            setMonthlyRoster={setMonthlyRoster}
            performBlockingSync={performBlockingSync}
        />
    );
  }

  if (activeView === 'medicine_accounts') {
    return (
        <MedicineAccountsPage
            onBack={() => setActiveView('main')}
            purchaseInvoices={purchaseInvoices}
            salesInvoices={salesInvoices}
            indoorInvoices={indoorInvoices}
        />
    );
  }

  if (activeView === 'consolidated') {
    return (
        <ConsolidatedAccountsPage
            onBack={() => setActiveView('main')}
            labInvoices={invoices}
            setLabInvoices={setInvoices}
            dueCollections={dueCollections}
            setDueCollections={setDueCollections}
            detailedExpenses={detailedExpenses}
            setDetailedExpenses={setDetailedExpenses}
            employees={employees}
            purchaseInvoices={purchaseInvoices}
            salesInvoices={salesInvoices}
            indoorInvoices={indoorInvoices}
            setIndoorInvoices={setIndoorInvoices}
            medicines={medicines}
            consolidatedLabEntries={consolidatedLabEntries}
            setConsolidatedLabEntries={setConsolidatedLabEntries}
            monthlyAdjustments={monthlyAdjustments}
            setMonthlyAdjustments={setMonthlyAdjustments}
            performBlockingSync={performBlockingSync}
        />
    );
  }

  return (
    <div className="w-full bg-slate-900 text-slate-100 flex flex-col relative pb-32">
        <BackgroundGraphic />
        <header className="bg-slate-800 shadow-xl border-b border-slate-700 z-20 relative pt-14 md:pt-0">
          <div className="max-w-7xl mx-auto py-6 px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4">
               <div className="flex flex-col items-start">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-100 leading-tight">
                    Niramoy Clinic & Diagnostic
                  </h1>
                  <span className="text-xs md:text-sm font-medium text-cyan-500 uppercase tracking-widest mt-1">
                    Clinic Management Software
                  </span>
               </div>
               <div className="flex flex-col items-start md:items-center text-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Address</span>
                  <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-600/50">
                      <MapPinIcon className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold">Enayetpur, Sirajgonj</span>
                  </div>
               </div>
               <div className="flex flex-col items-start md:items-end text-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Contact</span>
                  <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-600/50">
                      <PhoneIcon className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold tracking-widest font-mono text-white">01730 923007</span>
                  </div>
               </div>
            </div>
          </div>
        </header>

       <div className="container mx-auto px-4 sm:px-6 pt-6 pb-2 z-10">
         <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white transition-colors group">
           <div className="p-2 rounded-full group-hover:bg-slate-800 transition-colors">
             <BackIcon className="w-5 h-5" />
           </div>
           <span className="ml-2 font-medium">Back to Dashboard</span>
         </button>
       </div>

       <div className="flex justify-center items-center z-10 relative mt-4 mb-4">
           <div className="flex items-center bg-slate-800 px-10 py-3 rounded-full border border-amber-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <AccountingIcon className="w-6 h-6 md:w-8 md:h-8 text-amber-400 mr-3 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
              <h2 className="text-lg md:text-2xl font-bold text-amber-400 font-bengali whitespace-nowrap drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                একাউন্টিং / Accounting
              </h2>
           </div>
       </div>

       <div className="flex-1 flex items-center justify-center relative w-full px-4 sm:px-8 pb-16 z-10">
          <div className="relative w-full max-w-5xl flex items-center justify-center min-h-[460px]">
              <div className="flex absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
                 <AccountingButton
                    label={
                        <>
                           <span className="block text-xl font-bold text-amber-200 font-bengali">সকল হিসাব একত্রে</span>
                           <span className="block text-sm font-semibold text-amber-300 mt-1">Consolidated Report</span>
                        </>
                    }
                    icon={<AccountingIcon />}
                    colorClass="hover:border-amber-400 hover:shadow-amber-500/20 bg-slate-900 border-slate-600"
                    isOval={true}
                    onClick={() => setActiveView('consolidated')}
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-32 w-full z-10">
                 <div className="flex justify-center md:justify-end">
                     <AccountingButton
                        label={
                            <>
                              <span className="block text-xl font-bold text-cyan-200 font-bengali">ডায়াগনষ্টিক হিসাব</span>
                              <span className="block text-sm font-semibold text-cyan-300 mt-1">Diagnostic Accounts</span>
                            </>
                        }
                        icon={<DiagnosticIcon />}
                        colorClass="hover:border-cyan-400 hover:shadow-cyan-500/20 border-slate-600"
                        onClick={() => setActiveView('diagnostic')}
                     />
                 </div>

                 <div className="flex justify-center md:justify-start">
                     <AccountingButton
                        label={
                            <>
                              <span className="block text-xl font-bold text-emerald-200 font-bengali">ক্লিনিক হিসাব</span>
                              <span className="block text-sm font-semibold text-emerald-300 mt-1">Clinic Accounts</span>
                            </>
                        }
                        icon={<ClinicIcon />}
                        colorClass="hover:border-emerald-400 hover:shadow-emerald-500/20 border-slate-600"
                        onClick={() => setActiveView('clinic_accounts')}
                     />
                 </div>

                 <div className="flex justify-center md:justify-end">
                     <AccountingButton
                        label={
                            <>
                              <span className="block text-xl font-bold text-rose-200 font-bengali">মেডিসিন হিসাব</span>
                              <span className="block text-sm font-semibold text-rose-300 mt-1">Medicine Accounts</span>
                            </>
                        }
                        icon={<MedicineIcon />}
                        colorClass="hover:border-rose-400 hover:shadow-rose-500/20 border-slate-600"
                        onClick={() => setActiveView('medicine_accounts')}
                     />
                 </div>

                 <div className="flex justify-center md:justify-start">
                     <AccountingButton
                        label={
                            <>
                              <span className="block text-xl font-bold text-violet-200 font-bengali">কর্মচারী বেতন</span>
                              <span className="block text-sm font-semibold text-violet-300 mt-1">Employee Salary</span>
                            </>
                        }
                        icon={<EmployeeInfoIcon />}
                        colorClass="hover:border-violet-400 hover:shadow-violet-500/20 border-slate-600"
                        onClick={() => setActiveView('employee_info')}
                     />
                 </div>
              </div>
          </div>
       </div>
    </div>
  );
};

export default AccountingPage;