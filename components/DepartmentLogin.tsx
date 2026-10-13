
import React, { useState, useEffect } from 'react';
import { BackIcon, TestTubeIcon, DiagnosticIcon, ClinicIcon, MedicineIcon, AccountingIcon, SettingsIcon } from './Icons';
import { Eye, EyeOff } from 'lucide-react';

interface DepartmentLoginProps {
  department: string;
  onLogin: (password: string) => { success: boolean; error?: string } | boolean | void;
  onBack: () => void;
  errorMsg?: string;
  defaultPasswordHint?: string;
}

const DepartmentLogin: React.FC<DepartmentLoginProps> = ({ 
  department, 
  onLogin, 
  onBack, 
  errorMsg,
  defaultPasswordHint 
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(errorMsg || '');

  useEffect(() => {
    if (errorMsg) {
      setError(errorMsg);
    }
  }, [errorMsg]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanPwd = password.trim();
    if (!cleanPwd) {
      setError('পাসওয়ার্ড লিখুন');
      return;
    }
    const result = onLogin(cleanPwd);
    if (typeof result === 'object' && result !== null && !result.success) {
      setError(result.error || 'ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন।');
    } else if (result === false) {
      setError('ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন।');
    }
  };

  const getIcon = () => {
    switch (department) {
      case 'DIAGNOSTIC': return <DiagnosticIcon className="w-12 h-12 text-cyan-400" />;
      case 'LAB_REPORTING': return <TestTubeIcon className="w-12 h-12 text-blue-400" />;
      case 'CLINIC': return <ClinicIcon className="w-12 h-12 text-emerald-400" />;
      case 'MEDICINE': return <MedicineIcon className="w-12 h-12 text-rose-400" />;
      case 'ACCOUNTING': return <AccountingIcon className="w-12 h-12 text-amber-400" />;
      default: return <SettingsIcon className="w-12 h-12 text-slate-400" />;
    }
  };

  const getTitle = () => {
    if (department === 'ADMIN') return "Admin Settings Access";
    return `${department.replace('_', ' ')} Access`;
  };

  const getColor = () => {
    switch (department) {
      case 'DIAGNOSTIC': return 'from-cyan-600 to-blue-600';
      case 'LAB_REPORTING': return 'from-blue-600 to-cyan-500';
      case 'CLINIC': return 'from-emerald-600 to-teal-500';
      case 'MEDICINE': return 'from-rose-600 to-pink-500';
      case 'ACCOUNTING': return 'from-amber-600 to-orange-500';
      default: return 'from-slate-600 to-slate-500';
    }
  };

  const defaultHint = defaultPasswordHint || {
    DIAGNOSTIC: 'diag123',
    LAB_REPORTING: 'lab123',
    CLINIC: 'clinic123',
    ACCOUNTING: 'acc123',
    MEDICINE: 'med123',
    ADMIN: 'niramoy123'
  }[department] || 'niramoy123';

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border-2 border-slate-800 relative overflow-hidden my-auto">
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${getColor()}`}></div>
        
        <button 
          type="button" 
          onClick={onBack} 
          className="text-slate-500 hover:text-white mb-8 flex items-center gap-2 transition-colors font-bold uppercase text-xs tracking-widest cursor-pointer"
        >
          <BackIcon className="w-4 h-4" /> Back to Dashboard
        </button>
        
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-inner">
            {getIcon()}
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{getTitle()}</h2>
          <p className="text-slate-400 mt-2 text-sm font-bold uppercase tracking-widest">প্রবেশ করতে পাসওয়ার্ড দিন</p>
        </div>

        {error && (
          <div className="bg-rose-500/15 border-2 border-rose-500/60 text-rose-300 p-4 rounded-2xl mb-6 text-sm text-center font-bold shadow-lg animate-shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Secure Password</label>
              <span className="text-[11px] font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/60">
                ডিফল্ট: <span className="font-mono">{defaultHint}</span>
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 py-4 pr-14 text-white text-xl text-center focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 transition-all shadow-inner font-mono tracking-wider"
                placeholder="পাসওয়ার্ড লিখুন..."
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            onClick={(e) => {
              handleSubmit(e);
            }}
            className={`w-full bg-gradient-to-r ${getColor()} hover:brightness-110 text-white font-black py-4 rounded-2xl shadow-xl transform transition-all active:scale-95 uppercase tracking-widest text-sm cursor-pointer border-t border-white/20`}
          >
            Verify & Entry
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          জরুরি প্রয়োজনে অ্যাডমিন মাস্টার কি: <span className="font-mono text-slate-400 font-bold">niramoy123</span>
        </div>
      </div>
    </div>
  );
};

export default DepartmentLogin;
