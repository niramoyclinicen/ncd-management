
import React, { useState } from 'react';
import { BackIcon, TestTubeIcon } from './Icons';

interface LabLoginProps {
  onLogin: (password: string) => void;
  onBack: () => void;
}

const LabLogin: React.FC<LabLoginProps> = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'lab123') { // Simple default password for lab reporters
      onLogin(password);
    } else {
      setError('ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border-2 border-blue-900/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-cyan-500"></div>
        
        <button onClick={onBack} className="text-slate-500 hover:text-white mb-8 flex items-center gap-2 transition-colors font-bold uppercase text-xs tracking-widest">
          <BackIcon className="w-4 h-4" /> Back to Dashboard
        </button>
        
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30 shadow-inner">
            <TestTubeIcon className="w-12 h-12 text-blue-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Lab Reporter Access</h2>
          <p className="text-slate-500 mt-2 text-sm font-bold uppercase tracking-widest">ল্যাব রিপোর্ট এক্সেস করতে পাসওয়ার্ড দিন</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-2xl mb-8 text-sm text-center font-bold animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-2">Access Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 py-4 text-white text-xl text-center focus:outline-none focus:border-blue-500 transition-all shadow-inner"
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] transform transition-all active:scale-95 uppercase tracking-widest text-sm"
          >
            Authorize Entry
          </button>
        </form>
      </div>
    </div>
  );
};

export default LabLogin;
