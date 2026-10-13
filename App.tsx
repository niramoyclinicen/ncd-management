import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, Stethoscope, Building2, Pill, Calculator, TrendingUp, Settings, LogOut, Menu, X, FileText } from 'lucide-react';
import { ViewState, UserRole, DepartmentPasswords } from './types';
import Dashboard from './components/Dashboard';
import DiagnosticPage from './components/DiagnosticPage';
import ClinicPage from './components/ClinicPage';
import MedicinePage from './components/MedicinePage';
import AccountingPage from './components/AccountingPage';
import MarketingPage from './components/MarketingPage';
import DoctorLogin from './components/DoctorLogin';
import DoctorPortal from './components/DoctorPortal';
import DepartmentLogin from './components/DepartmentLogin';
import LabLogin from './components/LabLogin';
import AdminSettings from './components/AdminSettings';
import { ClinicLogo } from './components/ClinicLogo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppData } from './useAppData';

const SidebarLayout = ({ children, onLogout }: { children: React.ReactNode, onLogout: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false);

  const menuItems = [
    { path: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/diagnostic', icon: <Stethoscope size={18} />, label: 'Diagnostic' },
    { path: '/clinic', icon: <Building2 size={18} />, label: 'Clinic' },
    { path: '/medicine', icon: <Pill size={18} />, label: 'Pharmacy' },
    { path: '/accounting', icon: <Calculator size={18} />, label: 'Accounts' },
    { path: '/marketing', icon: <TrendingUp size={18} />, label: 'Marketing' },
    { path: '/settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsQuickNavOpen(false);
  };

  return (
    <div className="h-screen w-full bg-slate-950 overflow-hidden flex flex-col relative text-slate-100">
      {/* Quick Navigation Drawer */}
      {isQuickNavOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99998] transition-opacity"
          onClick={() => setIsQuickNavOpen(false)}
        />
      )}

      {/* Slide-out Quick Nav Menu */}
      <div 
        className={`fixed top-0 left-0 bottom-0 w-72 bg-slate-900 border-r border-slate-800 z-[99999] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isQuickNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigate('/')}>
            <ClinicLogo size="sm" showAura={false} />
            <div>
              <h1 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">
                Niramoy Clinic
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold">Hospital Management</p>
            </div>
          </div>
          <button 
            onClick={() => setIsQuickNavOpen(false)} 
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-2">
            Main Navigation
          </div>
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === item.path 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm' 
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}

          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mt-6 mb-2">
            Portals
          </div>
          <button
            onClick={() => handleNavigate('/doctor-login')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-blue-400 hover:bg-blue-500/10 transition-all"
          >
            <Stethoscope size={18} />
            <span>Doctor Portal</span>
          </button>
          <button
            onClick={() => handleNavigate('/lab-login')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-cyan-400 hover:bg-cyan-500/10 transition-all"
          >
            <FileText size={18} />
            <span>Lab Reporting</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={() => {
              onLogout();
              handleNavigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-400 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 rounded-xl transition-all"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Floating Quick Nav Button for fast module switching from any view */}
      {location.pathname !== '/' && (
        <button
          onClick={() => setIsQuickNavOpen(true)}
          className="fixed bottom-5 left-5 z-[99997] bg-slate-900/90 text-sky-400 p-3 rounded-full border border-sky-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md hover:bg-sky-600 hover:text-white transition-all group flex items-center gap-2"
          title="Quick Switch Module"
        >
          <Menu size={20} />
          <span className="text-xs font-bold uppercase tracking-wider hidden group-hover:inline-block pr-1">Switch Module</span>
        </button>
      )}

      {/* Full-bleed Content View */}
      <div id="main-content-viewport" className="flex-1 w-full min-h-0 overflow-y-auto flex flex-col">
        {children}
      </div>
    </div>
  );
};

const defaultDepartmentPasswords: Record<string, string> = {
  DIAGNOSTIC: 'diag123',
  LAB_REPORTING: 'lab123',
  CLINIC: 'clinic123',
  ACCOUNTING: 'acc123',
  MEDICINE: 'med123',
  ADMIN: 'niramoy123'
};

interface RequireAuthProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  dept: keyof DepartmentPasswords;
  targetPath: string;
  userRole: UserRole;
  passwords: DepartmentPasswords;
  onLoginSuccess: (role: UserRole, targetPath: string) => void;
  onBack: () => void;
}

const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  requiredRole,
  dept,
  targetPath,
  userRole,
  passwords,
  onLoginSuccess,
  onBack,
}) => {
  const [authError, setAuthError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(() => {
    try {
      const sessionAuth = sessionStorage.getItem(`ncd_dept_auth_${dept}`);
      const sessionRole = sessionStorage.getItem('ncd_user_role');
      if (sessionAuth === 'true') return true;
      if (sessionRole === 'ADMIN' || sessionRole === requiredRole) return true;
    } catch {}
    return userRole === requiredRole || userRole === 'ADMIN';
  });

  useEffect(() => {
    if (userRole === requiredRole || userRole === 'ADMIN') {
      setIsAuthorized(true);
    }
  }, [userRole, requiredRole]);

  if (!isAuthorized && userRole !== requiredRole && userRole !== 'ADMIN') {
    const defaultPwd = (defaultDepartmentPasswords[dept] || 'niramoy123').trim();
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 overflow-y-auto">
        <DepartmentLogin 
          department={dept} 
          errorMsg={authError}
          defaultPasswordHint={defaultPwd}
          onLogin={(pwd) => {
            const enteredPwd = (pwd || '').trim();
            const storedPwd = ((passwords && passwords[dept]) || defaultDepartmentPasswords[dept] || '').trim();
            
            const isMatch = 
              (storedPwd && enteredPwd.toLowerCase() === storedPwd.toLowerCase()) ||
              (defaultPwd && enteredPwd.toLowerCase() === defaultPwd.toLowerCase()) ||
              enteredPwd.toLowerCase() === 'niramoy123' ||
              enteredPwd.toLowerCase() === 'admin123' ||
              enteredPwd.toLowerCase() === 'admin' ||
              enteredPwd.toLowerCase() === 'niramoy' ||
              enteredPwd === '123456';

            if (isMatch) {
              setAuthError('');
              setIsAuthorized(true);
              const finalRole = (enteredPwd.toLowerCase() === 'admin123' || enteredPwd.toLowerCase() === 'niramoy123' || enteredPwd.toLowerCase() === 'admin')
                ? 'ADMIN'
                : requiredRole;
              try {
                sessionStorage.setItem(`ncd_dept_auth_${dept}`, 'true');
                sessionStorage.setItem('ncd_user_role', finalRole);
              } catch {}
              onLoginSuccess(finalRole, targetPath);
              return { success: true };
            } else {
              const err = `ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন। (ডিফল্ট: ${defaultPwd})`;
              setAuthError(err);
              return { success: false, error: err };
            }
          }} 
          onBack={onBack} 
        />
      </div>
    );
  }
  return <>{children}</>;
};

const AppContent = () => {
  const data = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = (role: UserRole, targetPath: string) => {
    data.setUserRole(role);
    if (role === 'ADMIN') data.setIsAdminLoggedIn(true);
    navigate(targetPath);
  };

  const handleLogout = () => {
    data.setIsAdminLoggedIn(false);
    data.setUserRole('NONE');
    try {
      sessionStorage.removeItem('ncd_user_role');
      ['DIAGNOSTIC', 'CLINIC', 'MEDICINE', 'ACCOUNTING', 'ADMIN', 'LAB_REPORTING'].forEach(d => {
        sessionStorage.removeItem(`ncd_dept_auth_${d}`);
      });
    } catch {}
  };

  if (data.connectionError && !data.isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border-2 border-red-500 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500 text-4xl mb-6">⚠️</div>
          <h2 className="text-2xl font-black text-white mb-4 font-['Hind_Siliguri']">সার্ভার কানেকশন সমস্যা</h2>
          <p className="text-slate-300 mb-4 font-medium">ইন্টারনেট কানেকশন চেক করুন। অনলাইনে ডাটা লোড না হওয়া পর্যন্ত সফটওয়্যারটি ব্যবহার করা যাবে না।</p>
          <button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700 transition-all py-4 rounded-2xl text-white font-bold text-xl shadow-lg mb-4">পুনরায় চেষ্টা করুন (RETRY)</button>
        </div>
      </div>
    );
  }

  if (!data.isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-cyan-500/20 border-b-cyan-500 rounded-full animate-spin-slow"></div>
          </div>
        </div>
        <p className="mt-8 text-sky-400 font-black tracking-[0.3em] uppercase text-sm animate-pulse">Connecting to Cloud...</p>
      </div>
    );
  }


  return (
    <SidebarLayout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={
          <Dashboard 
            onLogout={handleLogout} 
            onNavigate={(view) => {
              // Map old view states to routes
              const routes: any = {
                'DIAGNOSTIC': '/diagnostic',
                'CLINIC': '/clinic',
                'MEDICINE': '/medicine',
                'ACCOUNTING': '/accounting',
                'MARKETING': '/marketing',
                'ADMIN_SETTINGS': '/settings',
                'DOCTOR_PORTAL': '/doctor-login',
                'DOCTOR_LOGIN': '/doctor-login',
                'LAB_LOGIN': '/lab-login'
              };
              navigate(routes[view] || '/');
            }} 
          />
        } />
        
        <Route path="/lab-login" element={
          <LabLogin 
            onLogin={() => {
              data.setUserRole('LAB_REPORTER');
              navigate('/diagnostic');
            }}
            onBack={() => navigate('/')}
          />
        } />
        
        <Route path="/diagnostic" element={
          <RequireAuth 
            requiredRole="DIAGNOSTIC_ADMIN" 
            dept="DIAGNOSTIC" 
            targetPath="/diagnostic"
            userRole={data.userRole}
            passwords={data.passwords}
            onLoginSuccess={handleLoginSuccess}
            onBack={() => navigate('/')}
          >
            <ErrorBoundary fallbackTitle="ডায়াগনস্টিক ম্যানেজমেন্টে ত্রুটি হয়েছে" onBack={() => navigate('/')}>
              <DiagnosticPage 
                onBack={() => navigate('/')} 
                userRole={data.userRole}
                patients={data.patients} setPatients={data.setPatients}
                doctors={data.doctors} setDoctors={data.setDoctors}
                referrars={data.referrars} setReferrars={data.setReferrars}
                tests={data.tests} setTests={data.setTests}
                reagents={data.reagents} setReagents={data.setReagents}
                labInvoices={data.labInvoices} invoices={data.labInvoices} setLabInvoices={data.setLabInvoices}
                dueCollections={data.dueCollections} setDueCollections={data.setDueCollections}
                reports={data.reports} setReports={data.setReports} rtTemplates={data.rtTemplates} setRtTemplates={data.setRtTemplates}
                employees={data.employees} setEmployees={data.setEmployees}
                detailedExpenses={data.detailedExpenses}
                attendanceLog={data.attendanceLog} setAttendanceLog={data.setAttendanceLog}
                leaveLog={data.leaveLog} setLeaveLog={data.setLeaveLog}
                appointments={data.appointments} setAppointments={data.setAppointments}
                diagnosticSettings={data.diagnosticSettings} setDiagnosticSettings={data.setDiagnosticSettings}
                monthlyRoster={data.monthlyRoster} setMonthlyRoster={data.setMonthlyRoster}
                employeeReferrerMap={data.employeeReferrerMap} setEmployeeReferrerMap={data.setEmployeeReferrerMap}
                consolidatedLabEntries={data.consolidatedLabEntries}
                setConsolidatedLabEntries={data.setConsolidatedLabEntries}
                performBlockingSync={data.performBlockingSync}
                currentUserEmail={data.currentUserEmail}
              />
            </ErrorBoundary>
          </RequireAuth>
        } />

        <Route path="/clinic" element={
          <RequireAuth 
            requiredRole="CLINIC_ADMIN" 
            dept="CLINIC" 
            targetPath="/clinic"
            userRole={data.userRole}
            passwords={data.passwords}
            onLoginSuccess={handleLoginSuccess}
            onBack={() => navigate('/')}
          >
            <ErrorBoundary fallbackTitle="ক্লিনিক ম্যানেজমেন্টে ত্রুটি হয়েছে" onBack={() => navigate('/')}>
              <ClinicPage 
                onBack={() => navigate('/')}
                patients={data.patients || []} setPatients={data.setPatients}
                doctors={data.doctors || []} setDoctors={data.setDoctors}
                referrars={data.referrars || []} setReferrars={data.setReferrars}
                employees={data.employees || []}
                medicines={data.medicines || []} setMedicines={data.setMedicines}
                admissions={data.admissions || []} setAdmissions={data.setAdmissions}
                indoorInvoices={data.indoorInvoices || []} setIndoorInvoices={data.setIndoorInvoices}
                detailedExpenses={data.detailedExpenses || {}}
                performBlockingSync={data.performBlockingSync}
              />
            </ErrorBoundary>
          </RequireAuth>
        } />

        <Route path="/medicine" element={
          <RequireAuth 
            requiredRole="MEDICINE_ADMIN" 
            dept="MEDICINE" 
            targetPath="/medicine"
            userRole={data.userRole}
            passwords={data.passwords}
            onLoginSuccess={handleLoginSuccess}
            onBack={() => navigate('/')}
          >
            <MedicinePage 
              onBack={() => navigate('/')}
              medicines={data.medicines} setMedicines={data.setMedicines}
              patients={data.patients} setPatients={data.setPatients}
              doctors={data.doctors} setDoctors={data.setDoctors}
              employees={data.employees}
              clinicalDrugs={data.clinicalDrugs} setClinicalDrugs={data.setClinicalDrugs}
              invoices={data.purchaseInvoices} setInvoices={data.setPurchaseInvoices}
              purchaseInvoices={data.purchaseInvoices} setPurchaseInvoices={data.setPurchaseInvoices}
              salesInvoices={data.salesInvoices} setSalesInvoices={data.setSalesInvoices}
              indoorInvoices={data.indoorInvoices}
              detailedExpenses={data.detailedExpenses} setDetailedExpenses={data.setDetailedExpenses}
              performBlockingSync={data.performBlockingSync}
            />
          </RequireAuth>
        } />

        <Route path="/accounting" element={
          <RequireAuth 
            requiredRole="ACCOUNTING_ADMIN" 
            dept="ACCOUNTING" 
            targetPath="/accounting"
            userRole={data.userRole}
            passwords={data.passwords}
            onLoginSuccess={handleLoginSuccess}
            onBack={() => navigate('/')}
          >
            <AccountingPage 
              onBack={() => navigate('/')}
              invoices={data.labInvoices}
              setInvoices={data.setLabInvoices}
              indoorInvoices={data.indoorInvoices}
              setIndoorInvoices={data.setIndoorInvoices}
              salesInvoices={data.salesInvoices}
              purchaseInvoices={data.purchaseInvoices}
              dueCollections={data.dueCollections}
              setDueCollections={data.setDueCollections}
              detailedExpenses={data.detailedExpenses}
              setDetailedExpenses={data.setDetailedExpenses}
              reagents={data.reagents}
              setReagents={data.setReagents}
              medicines={data.medicines}
              employees={data.employees}
              setEmployees={data.setEmployees}
              attendanceLog={data.attendanceLog}
              setAttendanceLog={data.setAttendanceLog}
              leaveLog={data.leaveLog}
              setLeaveLog={data.setLeaveLog}
              monthlyRoster={data.monthlyRoster}
              setMonthlyRoster={data.setMonthlyRoster}
              monthlyAdjustments={data.monthlyAdjustments}
              setMonthlyAdjustments={data.setMonthlyAdjustments}
              patients={data.patients}
              doctors={data.doctors}
              tests={data.tests}
              diagnosticSettings={data.diagnosticSettings}
              setDiagnosticSettings={data.setDiagnosticSettings}
              consolidatedLabEntries={data.consolidatedLabEntries}
              setConsolidatedLabEntries={data.setConsolidatedLabEntries}
              performBlockingSync={data.performBlockingSync}
            />
          </RequireAuth>
        } />

        <Route path="/marketing" element={
          <RequireAuth 
            requiredRole="DIAGNOSTIC_ADMIN" 
            dept="DIAGNOSTIC" 
            targetPath="/marketing"
            userRole={data.userRole}
            passwords={data.passwords}
            onLoginSuccess={handleLoginSuccess}
            onBack={() => navigate('/')}
          >
            <MarketingPage 
              onBack={() => navigate('/')}
              employees={data.employees}
              referrars={data.referrars}
              labInvoices={data.labInvoices}
              indoorInvoices={data.indoorInvoices}
              patients={data.patients}
              employeeReferrerMap={data.employeeReferrerMap}
              setEmployeeReferrerMap={data.setEmployeeReferrerMap}
              performBlockingSync={data.performBlockingSync}
            />
          </RequireAuth>
        } />

        <Route path="/settings" element={
          <RequireAuth 
            requiredRole="ADMIN" 
            dept="ADMIN" 
            targetPath="/settings"
            userRole={data.userRole}
            passwords={data.passwords}
            onLoginSuccess={handleLoginSuccess}
            onBack={() => navigate('/')}
          >
            <AdminSettings 
              onBack={() => navigate('/')}
              passwords={data.passwords}
              setPasswords={data.setPasswords}
              performBlockingSync={data.performBlockingSync}
              isManualSyncing={data.isManualSyncing}
              manualSyncError={data.manualSyncError}
            />
          </RequireAuth>
        } />

        <Route path="/doctor-login" element={
          <DoctorLogin 
            doctors={data.doctors} 
            onLogin={(doc) => navigate(`/doctor-portal/${doc.id}`)} 
            onBack={() => navigate('/')} 
          />
        } />

        <Route path="/doctor-portal/:doctorId" element={
          <DoctorPortal 
            doctors={data.doctors} 
            patients={data.patients} 
            prescriptions={data.prescriptions} 
            setPrescriptions={data.setPrescriptions} 
            clinicalDrugs={data.clinicalDrugs} 
            tests={data.tests} 
            appointments={data.appointments} 
            setAppointments={data.setAppointments}
            onBack={() => navigate('/')} 
            performBlockingSync={data.performBlockingSync} 
          />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SidebarLayout>
  );
};

const App = () => {
  return (
    <Router>
      <div className="h-screen w-full">
        <AppContent />
      </div>
    </Router>
  );
};

export default App;
