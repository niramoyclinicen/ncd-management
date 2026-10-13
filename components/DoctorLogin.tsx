
import React, { useState } from 'react';
import { Doctor } from './DiagnosticData';
import { BackIcon, StethoscopeIcon } from './Icons';

interface DoctorLoginProps {
  doctors: Doctor[];
  onLogin: (doctor: Doctor) => void;
  onBack: () => void;
}

const DoctorLogin: React.FC<DoctorLoginProps> = ({ doctors, onLogin, onBack }) => {
  // Pre-filled with mock data for testing purposes
  const [name, setName] = useState('Dr. A. Rahman');
  const [email, setEmail] = useState('rahman@gmail.com');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const doctor = doctors.find(
      (d) => 
        d.doctor_name.toLowerCase().trim() === name.toLowerCase().trim() && 
        d.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (doctor) {
      onLogin(doctor);
    } else {
      setError('Invalid Name or Email. Please check your credentials or contact Admin.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <button onClick={onBack} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2 transition-colors">
          <BackIcon className="w-5 h-5" /> Back to Home
        </button>
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-500/50">
            <StethoscopeIcon className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-white">Doctor Portal</h2>
          <p className="text-slate-400 mt-2 text-sm">Log in to manage your appointments and prescriptions.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">Doctor Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="e.g. Dr. A. Rahman"
              required
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email ID</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="e.g. rahman@gmail.com"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg transform transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500"
          >
            Login to Portal
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-slate-500">
          <p>Default credentials pre-filled for testing.</p>
        </div>
      </div>
    </div>
  );
};

export default DoctorLogin;
