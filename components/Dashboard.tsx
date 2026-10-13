import React from 'react';
import DashboardButton from './DashboardButton';
import { 
  DiagnosticIcon, ClinicIcon, MedicineIcon, AccountingIcon, MapPinIcon, 
  StethoscopeIcon, SyringeIcon, WheelchairIcon, PhoneIcon, UsersIcon, FileTextIcon, SettingsIcon,
  TrendingUpIcon
} from './Icons';
import { ViewState } from '../types';
import { ClinicLogo } from './ClinicLogo';

interface DashboardProps {
  onLogout: () => void;
  onNavigate: (view: ViewState) => void;
}

const HexCell = ({ content, isCenter = false, hexStyle }: { content: React.ReactNode, isCenter?: boolean, hexStyle: React.CSSProperties }) => (
  <div 
    className={`
      relative flex justify-center items-center
      ${isCenter 
        ? 'bg-gradient-to-br from-blue-600 to-cyan-600 shadow-[0_0_25px_rgba(34,211,238,0.6)] z-20 border border-white/20' 
        : 'bg-cyan-900/30 border border-cyan-400/50 backdrop-blur-md hover:bg-cyan-500/20 hover:scale-110 hover:shadow-[0_0_15px_rgba(0,200,255,0.4)] hover:z-20'
      }
    `}
    style={{
      ...hexStyle,
      width: isCenter ? '70px' : '60px',
      height: isCenter ? '70px' : '60px',
    }}
  >
    <div className={isCenter ? 'text-white drop-shadow-md animate-pulse' : 'text-cyan-400 drop-shadow'}>
      {content}
    </div>
  </div>
);

const MedicalHexLogo = ({ isMobile = false }: { isMobile?: boolean }) => {
  const hexStyle: React.CSSProperties = {
    width: '60px',
    height: '60px',
    clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: '0.3s',
  };
  return (
    <div className={`relative w-20 h-20 md:w-20 md:h-20 lg:w-44 lg:h-44 flex items-center justify-center ${isMobile ? 'origin-center scale-[0.6]' : 'origin-center scale-[0.54] md:scale-[0.56] lg:scale-100'} transition-all duration-300`}>
      <div className="absolute bottom-2 w-32 h-16 bg-[radial-gradient(circle,rgba(0,150,255,0.4),transparent)] rounded-[100%_100%_40%_40%] blur-xl animate-pulse" /> 
      
      <svg viewBox="0 0 100 60" className="absolute bottom-8 w-40 h-24 opacity-80 pointer-events-none z-0">
          <defs>
            <linearGradient id="wirehand" x1="0" y1="1" x2="0" y2="0">
               <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
               <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.5" />
               <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path d="M10,60 Q30,50 50,45 Q70,50 90,60" fill="url(#wirehand)" />
          <path d="M10,60 Q20,30 30,20 Q40,30 50,45" fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
          <path d="M90,60 Q80,30 70,20 Q60,30 50,45" fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
      </svg>

      <div className="relative w-48 h-48 z-10">
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
           <HexCell content={<span className="text-2xl font-bold font-sans tracking-tight">NcD</span>} isCenter hexStyle={hexStyle} />
        </div>
        <div style={{ position: 'absolute', top: '12%', left: '50%', transform: 'translate(-50%, -50%)' }}>
           <HexCell content={<StethoscopeIcon className="w-7 h-7" />} hexStyle={hexStyle} />
        </div>
        <div style={{ position: 'absolute', top: '31%', left: '83%', transform: 'translate(-50%, -50%)' }}>
           <HexCell content={<MedicineIcon className="w-7 h-7" />} hexStyle={hexStyle} />
        </div>
        <div style={{ position: 'absolute', top: '69%', left: '83%', transform: 'translate(-50%, -50%)' }}>
           <HexCell content={<WheelchairIcon className="w-7 h-7" />} hexStyle={hexStyle} />
        </div>
        <div style={{ position: 'absolute', top: '88%', left: '50%', transform: 'translate(-50%, -50%)' }}>
           <HexCell content={<ClinicIcon className="w-7 h-7" />} hexStyle={hexStyle} />
        </div>
        <div style={{ position: 'absolute', top: '69%', left: '17%', transform: 'translate(-50%, -50%)' }}>
           <HexCell content={<SyringeIcon className="w-7 h-7" />} hexStyle={hexStyle} />
        </div>
        <div style={{ position: 'absolute', top: '31%', left: '17%', transform: 'translate(-50%, -50%)' }}>
           <HexCell content={<DiagnosticIcon className="w-7 h-7" />} hexStyle={hexStyle} />
        </div>
      </div>
    </div>
  );
};

const MiniMedicalHexLogo = () => {
  const hexClip = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';
  return (
    <div className="relative flex items-center justify-center shrink-0 w-9 h-9 group">
      <div className="absolute -inset-1 rounded-full bg-cyan-400/30 blur-sm pointer-events-none animate-pulse" />
      <div 
        className="w-9 h-9 bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400 shadow-[0_0_16px_rgba(34,211,238,0.9)] flex items-center justify-center border border-white/60 transition-transform duration-300 group-active:scale-95"
        style={{ clipPath: hexClip }}
      >
        <span className="text-[11px] font-black text-white tracking-tight font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">NcD</span>
      </div>
    </div>
  );
};

// Tablet-Exclusive Circular / Round Shape Logo (Perfect 1:1 Aspect Ratio, Zero Elongation)
const TabletMedicalRoundLogo = () => {
  return (
    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center group transition-transform duration-300">
      {/* Outer Glow Aura */}
      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-500/30 via-blue-500/30 to-teal-400/30 blur-md pointer-events-none" />
      
      {/* Outer Circular Frame with high-contrast gradient and cyan border */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 border-2 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.45)] flex items-center justify-center overflow-hidden">
        {/* Subtle radial sheen */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.25),transparent_70%)] animate-pulse" />
      </div>

      {/* Rotating Dashed Orbital Border */}
      <div 
        className="absolute -inset-0.5 rounded-full border border-dashed border-cyan-400/40 pointer-events-none animate-spin-slow" 
        style={{ animationDuration: '45s' }} 
      />

      {/* 6 Circular Medical Satellite Bubbles in a Mathematically Perfect Circle around the center (Radius = 36%) */}
      {/* 0° Top */}
      <div 
        className="absolute z-20 w-4 h-4 rounded-full bg-slate-900/90 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_6px_rgba(6,182,212,0.4)]"
        style={{ top: '14%', left: '50%', transform: 'translate(-50%, -50%)' }}
        title="Stethoscope"
      >
        <StethoscopeIcon className="w-2.5 h-2.5 text-cyan-300" />
      </div>

      {/* 60° Top-Right */}
      <div 
        className="absolute z-20 w-4 h-4 rounded-full bg-slate-900/90 border border-emerald-400/60 flex items-center justify-center shadow-[0_0_6px_rgba(16,185,129,0.4)]"
        style={{ top: '32%', left: '81%', transform: 'translate(-50%, -50%)' }}
        title="Medicine"
      >
        <MedicineIcon className="w-2.5 h-2.5 text-emerald-300" />
      </div>

      {/* 120° Bottom-Right */}
      <div 
        className="absolute z-20 w-4 h-4 rounded-full bg-slate-900/90 border border-sky-400/60 flex items-center justify-center shadow-[0_0_6px_rgba(56,189,248,0.4)]"
        style={{ top: '68%', left: '81%', transform: 'translate(-50%, -50%)' }}
        title="Wheelchair"
      >
        <WheelchairIcon className="w-2.5 h-2.5 text-sky-300" />
      </div>

      {/* 180° Bottom */}
      <div 
        className="absolute z-20 w-4 h-4 rounded-full bg-slate-900/90 border border-teal-400/60 flex items-center justify-center shadow-[0_0_6px_rgba(20,184,166,0.4)]"
        style={{ top: '86%', left: '50%', transform: 'translate(-50%, -50%)' }}
        title="Clinic"
      >
        <ClinicIcon className="w-2.5 h-2.5 text-teal-300" />
      </div>

      {/* 240° Bottom-Left */}
      <div 
        className="absolute z-20 w-4 h-4 rounded-full bg-slate-900/90 border border-indigo-400/60 flex items-center justify-center shadow-[0_0_6px_rgba(129,140,248,0.4)]"
        style={{ top: '68%', left: '19%', transform: 'translate(-50%, -50%)' }}
        title="Syringe"
      >
        <SyringeIcon className="w-2.5 h-2.5 text-indigo-300" />
      </div>

      {/* 300° Top-Left */}
      <div 
        className="absolute z-20 w-4 h-4 rounded-full bg-slate-900/90 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_6px_rgba(6,182,212,0.4)]"
        style={{ top: '32%', left: '19%', transform: 'translate(-50%, -50%)' }}
        title="Diagnostic"
      >
        <DiagnosticIcon className="w-2.5 h-2.5 text-cyan-300" />
      </div>

      {/* Center "NcD" Circular Core */}
      <div className="relative z-30 w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.85)] border-2 border-white/80 group-hover:scale-105 transition-transform duration-300">
        <span className="text-[11px] md:text-[12px] font-black text-white font-sans tracking-tight drop-shadow-sm">
          NcD
        </span>
      </div>
    </div>
  );
};

const BackgroundRose = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-10">
    <svg viewBox="0 0 500 500" className="w-[150%] h-[150%] text-rose-500 animate-spin-slow-reverse" style={{ animationDuration: '60s' }}>
      <g transform="translate(250,250)">
        <path d="M0,0 C50,-50 100,-50 150,0 C100,50 50,50 0,0" fill="currentColor" transform="rotate(0) translate(20,0)" />
        <path d="M0,0 C50,-50 100,-50 150,0 C100,50 50,50 0,0" fill="currentColor" transform="rotate(60) translate(20,0)" />
        <path d="M0,0 C50,-50 100,-50 150,0 C100,50 50,50 0,0" fill="currentColor" transform="rotate(120) translate(20,0)" />
        <path d="M0,0 C50,-50 100,-50 150,0 C100,50 50,50 0,0" fill="currentColor" transform="rotate(180) translate(20,0)" />
        <path d="M0,0 C50,-50 100,-50 150,0 C100,50 50,50 0,0" fill="currentColor" transform="rotate(240) translate(20,0)" />
        <path d="M0,0 C50,-50 100,-50 150,0 C100,50 50,50 0,0" fill="currentColor" transform="rotate(300) translate(20,0)" />
        <circle cx="0" cy="0" r="30" fill="currentColor" opacity="0.5" />
      </g>
    </svg>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onLogout, onNavigate }) => {
  return (
    <div className="h-full max-h-full w-full flex flex-col relative overflow-hidden bg-slate-950">
      
      {/* Background Layer */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <div className="absolute inset-0 bg-slate-950" />
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-900/40 via-transparent to-transparent blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900/40 via-transparent to-transparent blur-3xl" />
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/30 via-transparent to-transparent blur-3xl" />
          <BackgroundRose />
      </div>

      {/* DESKTOP & TABLET VIEW - Responsive Single Cohesive Screen, All Elements Visible at Once */}
      <div className="hidden md:flex flex-1 flex-col w-full max-w-7xl mx-auto px-5 md:px-7 lg:px-8 pt-5 md:pt-6 lg:pt-7 pb-3 md:pb-4 z-10 h-full max-h-full overflow-y-auto md:overflow-y-visible lg:overflow-hidden justify-between">
          
          {/* HEADER - Compact horizontal row with 3-line stacked info, comfortably padded from top */}
          <header className="flex-none flex flex-row items-center justify-between gap-3 md:gap-4 lg:gap-6 w-full animate-fade-in-down pt-1 pb-1">
              <div className="flex-shrink-0 hover:scale-105 transition-transform duration-500 origin-left flex items-center">
                 {/* Unified Prestigious Logo across Desktop and Tablet, automatically reflects Admin custom logo if set */}
                 <ClinicLogo size="xl" className="hidden lg:flex" />
                 <ClinicLogo size="lg" className="hidden md:flex lg:hidden" />
              </div>
              <div className="flex flex-col items-end justify-center text-right">
                  {/* Line 1: Clinic Name in English */}
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-[2.35rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-blue-500 drop-shadow-[0_0_15px_rgba(56,189,248,0.6)] font-sans tracking-tight leading-tight">
                      Niramoy Clinic & Diagnostic
                  </h1>

                  {/* Bangla Clinic Name */}
                  <div className="font-bangla-display text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 text-sm sm:text-base md:text-lg lg:text-xl font-bold tracking-wide mt-1 drop-shadow-[0_2px_12px_rgba(20,184,166,0.35)]">
                      নিরাময় ক্লিনিক অ্যান্ড ডায়াগনস্টিক
                  </div>

                  {/* Line 2: Address */}
                  <div className="flex items-center gap-1.5 text-teal-100 text-[11px] sm:text-xs md:text-sm lg:text-base font-medium tracking-wide mt-1.5">
                    <MapPinIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-400 shrink-0" />
                    <span>এনায়েতপুর মন্ডলপাড়া, সিরাজগঞ্জ</span>
                  </div>

                  {/* Line 3: Mobile Number */}
                  <div className="flex items-center mt-1.5">
                    <a 
                      href="tel:01730923007" 
                      className="inline-flex items-center gap-1.5 text-cyan-300 font-bold tracking-wider hover:text-cyan-200 transition-colors text-xs sm:text-sm md:text-sm lg:text-base px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 hover:border-cyan-300"
                    >
                      <PhoneIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
                      <span>01730-923007</span>
                    </a>
                  </div>

                  <div className="w-full max-w-xl h-[1px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent mt-1.5 opacity-70 ml-auto" />
              </div>
          </header>

          {/* GRID SECTION - Spacious, comfortable distance from header and balanced layout */}
          <main className="flex-none flex flex-col items-center justify-center w-full max-w-6xl mx-auto relative my-auto px-2 lg:px-4">
              
              {/* 2x2 Grid Container with Dead-Center Floating Marketing Management Badge */}
              <div className="relative w-full px-1 sm:px-2 md:px-4">
                
                {/* 2x2 Grid with generous vertical gap between top and bottom boxes to clear the center badge */}
                <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-20 xl:gap-x-24 gap-y-10 sm:gap-y-12 md:gap-y-14 lg:gap-y-16 xl:gap-y-20 w-full relative z-10">
                  <DashboardButton 
                    label={
                        <>
                            <span className="block text-base sm:text-xl lg:text-2xl font-extrabold text-white mb-0.5 tracking-normal transition-colors duration-300 group-hover:text-cyan-200">ডায়াগনস্টিক ম্যানেজমেন্ট</span>
                            <span className="block text-[9px] sm:text-xs lg:text-sm font-bold text-cyan-400 mt-0.5 lg:mt-1 tracking-wider uppercase transition-colors duration-300 group-hover:text-cyan-300">Diagnostic Management</span>
                        </>
                    } 
                    icon={<DiagnosticIcon />} 
                    onClick={() => onNavigate(ViewState.DIAGNOSTIC)} 
                    glowGradient="from-cyan-500 via-sky-500 to-blue-600"
                    borderColor="border-slate-700/80 group-hover:border-cyan-400"
                    iconBgColor="group-hover:bg-cyan-500/20 group-hover:border-cyan-400/60 group-hover:text-cyan-300"
                    delay="100ms"
                  />
                  <DashboardButton 
                    label={
                        <>
                            <span className="block text-base sm:text-xl lg:text-2xl font-extrabold text-white mb-0.5 tracking-normal transition-colors duration-300 group-hover:text-emerald-200">ক্লিনিক ম্যানেজমেন্ট</span>
                            <span className="block text-[9px] sm:text-xs lg:text-sm font-bold text-emerald-400 mt-0.5 lg:mt-1 tracking-wider uppercase transition-colors duration-300 group-hover:text-emerald-300">Clinic Management</span>
                        </>
                    } 
                    icon={<ClinicIcon />} 
                    onClick={() => onNavigate(ViewState.CLINIC)} 
                    glowGradient="from-emerald-500 via-teal-500 to-green-600"
                    borderColor="border-slate-700/80 group-hover:border-emerald-400"
                    iconBgColor="group-hover:bg-emerald-500/20 group-hover:border-emerald-400/60 group-hover:text-emerald-300"
                    delay="200ms"
                  />
                  <DashboardButton 
                    label={
                        <>
                            <span className="block text-base sm:text-xl lg:text-2xl font-extrabold text-white mb-0.5 tracking-normal transition-colors duration-300 group-hover:text-rose-200">মেডিসিন ম্যানেজমেন্ট</span>
                            <span className="block text-[9px] sm:text-xs lg:text-sm font-bold text-rose-400 mt-0.5 lg:mt-1 tracking-wider uppercase transition-colors duration-300 group-hover:text-rose-300">Medicine Management</span>
                        </>
                    } 
                    icon={<MedicineIcon />} 
                    onClick={() => onNavigate(ViewState.MEDICINE)} 
                    glowGradient="from-rose-500 via-pink-500 to-red-600"
                    borderColor="border-slate-700/80 group-hover:border-rose-400"
                    iconBgColor="group-hover:bg-rose-500/20 group-hover:border-rose-400/60 group-hover:text-rose-300"
                    delay="300ms"
                  />
                  <DashboardButton 
                    label={
                        <>
                            <span className="block text-base sm:text-xl lg:text-2xl font-extrabold text-white mb-0.5 tracking-normal transition-colors duration-300 group-hover:text-amber-200">অ্যাকাউন্টিং ম্যানেজমেন্ট</span>
                            <span className="block text-[9px] sm:text-xs lg:text-sm font-bold text-amber-400 mt-0.5 lg:mt-1 tracking-wider uppercase transition-colors duration-300 group-hover:text-amber-300">Accounting Management</span>
                        </>
                    } 
                    icon={<AccountingIcon />} 
                    onClick={() => onNavigate(ViewState.ACCOUNTING)} 
                    glowGradient="from-amber-500 via-orange-500 to-yellow-600"
                    borderColor="border-slate-700/80 group-hover:border-amber-400"
                    iconBgColor="group-hover:bg-amber-500/20 group-hover:border-amber-400/60 group-hover:text-amber-300"
                    delay="400ms"
                  />
                </div>

                {/* Exact Dead-Center Badge placed right in the intersection of the 4 boxes */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                  <button 
                    onClick={() => onNavigate(ViewState.MARKETING)}
                    className="pointer-events-auto group relative flex items-center justify-center gap-2 sm:gap-3 md:gap-3 lg:gap-5 px-3.5 py-1.5 sm:px-5 sm:py-2.5 md:px-5 md:py-2 lg:px-11 lg:py-5 rounded-full border-2 border-purple-400/90 hover:border-purple-300 bg-gradient-to-r from-slate-950/95 via-purple-950/95 to-slate-950/95 backdrop-blur-2xl shadow-[0_0_35px_rgba(168,85,247,0.8),0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_0_55px_rgba(168,85,247,1),0_15px_40px_rgba(0,0,0,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                    title="মার্কেটিং ম্যানেজমেন্ট (Marketing Management)"
                  >
                    <div className="p-1.5 sm:p-2 md:p-2.5 lg:p-3.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-400/60 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300 shadow-inner">
                      <TrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 lg:w-7 lg:h-7" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs sm:text-sm md:text-lg lg:text-2xl font-extrabold text-white tracking-wide drop-shadow-md group-hover:text-purple-200 transition-colors whitespace-nowrap">
                        মার্কেটিং ম্যানেজমেন্ট
                      </span>
                      <span className="block text-[7.5px] sm:text-[9px] md:text-[11px] lg:text-sm font-bold text-purple-300 tracking-wider uppercase whitespace-nowrap">
                        Marketing Management
                      </span>
                    </div>
                    <div className="hidden sm:flex items-center pl-1 text-purple-400 group-hover:translate-x-1 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>

              </div>
          </main>

          {/* FOOTER BAR - Symmetrically spaced exactly like the header-to-grid distance */}
          <footer className="flex-none flex flex-col items-center justify-center mt-8 sm:mt-10 md:mt-14 lg:mt-auto pt-1 pb-2 z-20 w-full relative">
              
              <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 md:gap-3 lg:gap-5 w-full px-2">
                {/* Doctor Portal */}
                <button 
                  onClick={() => onNavigate(ViewState.DOCTOR_LOGIN)} 
                  className="group relative px-3 py-1.5 sm:px-3.5 sm:py-1.5 md:px-3.5 md:py-1.5 lg:px-6 lg:py-2.5 rounded-full bg-slate-900/90 border border-blue-500/40 text-blue-300 font-bold transition-all duration-300 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-950/80 hover:to-blue-900/60 hover:text-white hover:shadow-[0_4px_25px_rgba(59,130,246,0.35)] hover:scale-105 active:scale-95 backdrop-blur-md cursor-pointer"
                >
                  <span className="relative z-10 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base whitespace-nowrap">
                    <span className="p-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/30 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-inner">
                      <StethoscopeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span>Doctor Portal</span>
                  </span>
                </button>
                
                {/* Lab Reporting */}
                <button 
                  onClick={() => onNavigate(ViewState.LAB_LOGIN)} 
                  className="group relative px-3 py-1.5 sm:px-3.5 sm:py-1.5 md:px-3.5 md:py-1.5 lg:px-6 lg:py-2.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-300 font-bold transition-all duration-300 hover:border-cyan-400 hover:bg-gradient-to-r hover:from-cyan-950/80 hover:to-cyan-900/60 hover:text-white hover:shadow-[0_4px_25px_rgba(6,182,212,0.35)] hover:scale-105 active:scale-95 backdrop-blur-md cursor-pointer"
                >
                  <span className="relative z-10 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base whitespace-nowrap">
                    <span className="p-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300 shadow-inner">
                      <FileTextIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span>Lab Reporting</span>
                  </span>
                </button>

                {/* Settings */}
                <button 
                  onClick={() => onNavigate(ViewState.ADMIN_SETTINGS)} 
                  className="group relative px-3 py-1.5 sm:px-3.5 sm:py-1.5 md:px-3.5 md:py-1.5 lg:px-6 lg:py-2.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-300 font-bold transition-all duration-300 hover:border-purple-400/70 hover:bg-gradient-to-r hover:from-purple-950/80 hover:to-slate-900/80 hover:text-purple-200 hover:shadow-[0_4px_25px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95 backdrop-blur-md cursor-pointer"
                >
                  <span className="relative z-10 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base whitespace-nowrap">
                    <span className="p-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 group-hover:bg-purple-500/30 group-hover:text-purple-300 group-hover:rotate-90 transition-all duration-500 shadow-inner">
                      <SettingsIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span>Settings</span>
                  </span>
                </button>

                {/* Admin Logout */}
                <button 
                  onClick={onLogout} 
                  className="group relative px-3 py-1.5 sm:px-3.5 sm:py-1.5 md:px-3.5 md:py-1.5 lg:px-6 lg:py-2.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-300 font-bold transition-all duration-300 hover:border-rose-500/70 hover:bg-gradient-to-r hover:from-rose-950/80 hover:to-slate-900/80 hover:text-rose-200 hover:shadow-[0_4px_25px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95 backdrop-blur-md cursor-pointer"
                >
                  <span className="relative z-10 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base whitespace-nowrap">
                    <span className="p-1 rounded-full bg-slate-800 text-rose-400 border border-slate-700/60 group-hover:bg-rose-500/30 group-hover:text-rose-300 group-hover:-translate-x-0.5 transition-all duration-300 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                    </span>
                    <span>Admin Logout</span>
                  </span>
                </button>
              </div>

              <div className="mt-1 md:mt-1.5 lg:mt-2 text-center text-slate-500/60 text-[10px] md:text-xs font-medium tracking-wide">
                 &copy; 2024 NiramoyClinic. All rights reserved.
              </div>
          </footer>
      </div>

      {/* DEDICATED MOBILE VIEW (< md screens: Smartphones) - Responsive, Touch-Friendly, Full Feature & Visual Polish */}
      <div className="flex md:hidden flex-1 flex-col w-full max-w-md mx-auto px-3.5 py-3 xs:px-4 xs:py-3.5 z-10 justify-between min-h-full overflow-y-auto scrollbar-none">
        
        {/* MOBILE HEADER - 3-Line Stacked Structure with Glowing Compact Logo */}
        <header className="flex-none flex flex-col items-center justify-center w-full animate-fade-in-down pt-0.5 pb-1">
          {/* Minimized Logo on top with glowing halo - unified with desktop and admin settings */}
          <div className="mb-1 flex items-center justify-center">
            <ClinicLogo size="md" />
          </div>

          {/* Line 1: Clinic Name in English */}
          <h1 className="text-[1.28rem] xs:text-[1.42rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-100 to-blue-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)] font-sans tracking-tight text-center leading-tight">
            Niramoy Clinic & Diagnostic
          </h1>
          
          {/* Bangla Clinic Name */}
          <div className="font-bangla-display text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 text-[13.5px] xs:text-[14.5px] font-bold tracking-wide text-center mt-1 drop-shadow-[0_2px_10px_rgba(20,184,166,0.35)]">
            নিরাময় ক্লিনিক অ্যান্ড ডায়াগনস্টিক
          </div>

          {/* Line 2: Address with MapPin */}
          <div className="flex items-center justify-center gap-1.5 text-teal-200/90 text-[11.5px] xs:text-xs font-medium mt-1">
            <MapPinIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>এনায়েতপুর মন্ডলপাড়া, সিরাজগঞ্জ</span>
          </div>

          {/* Line 3: Direct Tap-To-Call Phone Pill */}
          <div className="flex items-center justify-center mt-1">
            <a 
              href="tel:01730923007" 
              className="inline-flex items-center gap-1.5 text-cyan-300 font-bold tracking-wider px-3.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 hover:border-cyan-300 active:border-cyan-300 active:scale-95 transition-all duration-300 text-xs shadow-[0_0_12px_rgba(6,182,212,0.35)]"
            >
              <PhoneIcon className="w-3 h-3 text-cyan-400 shrink-0 animate-pulse" />
              <span>01730-923007</span>
            </a>
          </div>

          <div className="w-28 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent mx-auto mt-1.5 opacity-80" />
        </header>

        {/* MOBILE CORE 5 MANAGEMENT MODULES - 2x2 with centered floating Marketing Badge */}
        <main className="flex-1 flex flex-col justify-center items-center w-full py-2 xs:py-2.5 sm:py-3 my-auto animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="relative w-full max-w-sm mx-auto flex items-center justify-center">
            
            {/* 2x2 Management Grid with generous vertical gap for the center badge */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 xs:gap-y-10 sm:gap-y-12 w-full">
              {/* Diagnostic Management */}
              <DashboardButton 
                label={
                  <>
                    <span className="block text-[12.5px] xs:text-[13.5px] font-extrabold text-white mb-0.5 tracking-normal transition-colors duration-300 group-hover:text-cyan-200 group-active:text-cyan-200">
                      ডায়াগনস্টিক ম্যানেজমেন্ট
                    </span>
                    <span className="block text-[8px] xs:text-[8.5px] font-bold text-cyan-400 mt-0.5 tracking-wider uppercase transition-colors duration-300 group-hover:text-cyan-300 group-active:text-cyan-300">
                      Diagnostic Management
                    </span>
                  </>
                } 
                icon={<DiagnosticIcon />} 
                onClick={() => onNavigate(ViewState.DIAGNOSTIC)} 
                glowGradient="from-sky-500 via-cyan-500 to-blue-600"
                borderColor="border-slate-700/80 group-hover:border-cyan-400 group-active:border-cyan-400"
                iconBgColor="group-hover:bg-cyan-500/20 group-hover:border-cyan-400/60 group-hover:text-cyan-300 group-active:bg-cyan-500/20 group-active:border-cyan-400/60 group-active:text-cyan-300"
                delay="100ms"
              />

              {/* Clinic Management */}
              <DashboardButton 
                label={
                  <>
                    <span className="block text-[12.5px] xs:text-[13.5px] font-extrabold text-white mb-0.5 tracking-normal transition-colors duration-300 group-hover:text-emerald-200 group-active:text-emerald-200">
                      ক্লিনিক ম্যানেজমেন্ট
                    </span>
                    <span className="block text-[8px] xs:text-[8.5px] font-bold text-emerald-400 mt-0.5 tracking-wider uppercase transition-colors duration-300 group-hover:text-emerald-300 group-active:text-emerald-300">
                      Clinic Management
                    </span>
                  </>
                } 
                icon={<ClinicIcon />} 
                onClick={() => onNavigate(ViewState.CLINIC)} 
                glowGradient="from-emerald-500 via-teal-500 to-green-600"
                borderColor="border-slate-700/80 group-hover:border-emerald-400 group-active:border-emerald-400"
                iconBgColor="group-hover:bg-emerald-500/20 group-hover:border-emerald-400/60 group-hover:text-emerald-300 group-active:bg-emerald-500/20 group-active:border-emerald-400/60 group-active:text-emerald-300"
                delay="200ms"
              />

              {/* Medicine Management */}
              <DashboardButton 
                label={
                  <>
                    <span className="block text-[12.5px] xs:text-[13.5px] font-extrabold text-white mb-0.5 tracking-normal transition-colors duration-300 group-hover:text-rose-200 group-active:text-rose-200">
                      মেডিসিন ম্যানেজমেন্ট
                    </span>
                    <span className="block text-[8px] xs:text-[8.5px] font-bold text-rose-400 mt-0.5 tracking-wider uppercase transition-colors duration-300 group-hover:text-rose-300 group-active:text-rose-300">
                      Medicine Management
                    </span>
                  </>
                } 
                icon={<MedicineIcon />} 
                onClick={() => onNavigate(ViewState.MEDICINE)} 
                glowGradient="from-rose-500 via-pink-500 to-red-600"
                borderColor="border-slate-700/80 group-hover:border-rose-400 group-active:border-rose-400"
                iconBgColor="group-hover:bg-rose-500/20 group-hover:border-rose-400/60 group-hover:text-rose-300 group-active:bg-rose-500/20 group-active:border-rose-400/60 group-active:text-rose-300"
                delay="300ms"
              />

              {/* Accounting Management */}
              <DashboardButton 
                label={
                  <>
                    <span className="block text-[12.5px] xs:text-[13.5px] font-extrabold text-white mb-0.5 tracking-normal transition-colors duration-300 group-hover:text-amber-200 group-active:text-amber-200">
                      অ্যাকাউন্টিং ম্যানেজমেন্ট
                    </span>
                    <span className="block text-[8px] xs:text-[8.5px] font-bold text-amber-400 mt-0.5 tracking-wider uppercase transition-colors duration-300 group-hover:text-amber-300 group-active:text-amber-300">
                      Accounting Management
                    </span>
                  </>
                } 
                icon={<AccountingIcon />} 
                onClick={() => onNavigate(ViewState.ACCOUNTING)} 
                glowGradient="from-amber-500 via-orange-500 to-yellow-600"
                borderColor="border-slate-700/80 group-hover:border-amber-400 group-active:border-amber-400"
                iconBgColor="group-hover:bg-amber-500/20 group-hover:border-amber-400/60 group-hover:text-amber-300 group-active:bg-amber-500/20 group-active:border-amber-400/60 group-active:text-amber-300"
                delay="400ms"
              />
            </div>

            {/* Exact Dead-Center Badge placed right in the intersection of the 4 boxes */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
              <button 
                onClick={() => onNavigate(ViewState.MARKETING)}
                className="pointer-events-auto group relative flex items-center justify-center gap-2 sm:gap-2.5 px-4 py-2 xs:px-5 xs:py-2.5 rounded-full border-2 border-purple-400/90 hover:border-purple-300 active:border-purple-300 bg-gradient-to-r from-slate-950/95 via-purple-950/95 to-slate-950/95 backdrop-blur-2xl shadow-[0_0_35px_rgba(168,85,247,0.8),0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_0_55px_rgba(168,85,247,1),0_15px_40px_rgba(0,0,0,0.8)] active:shadow-[0_0_55px_rgba(168,85,247,1),0_15px_40px_rgba(0,0,0,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                title="মার্কেটিং ম্যানেজমেন্ট (Marketing Management)"
              >
                <div className="p-1.5 xs:p-2 rounded-full bg-purple-500/30 text-purple-300 border border-purple-400/60 group-hover:scale-110 group-active:scale-110 group-hover:bg-purple-500 group-hover:text-white group-active:bg-purple-500 group-active:text-white transition-all duration-300 shadow-inner">
                  <TrendingUpIcon className="w-4 h-4 xs:w-4.5 xs:h-4.5" />
                </div>
                <div className="text-left">
                  <span className="block text-xs xs:text-sm font-extrabold text-white tracking-wide drop-shadow-md group-hover:text-purple-200 group-active:text-purple-200 transition-colors whitespace-nowrap">
                    মার্কেটিং ম্যানেজমেন্ট
                  </span>
                  <span className="block text-[8px] xs:text-[9px] font-bold text-purple-300 tracking-wider uppercase whitespace-nowrap">
                    Marketing Management
                  </span>
                </div>
                <div className="flex items-center text-purple-400 group-hover:translate-x-1 group-active:translate-x-1 transition-transform pl-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

          </div>
        </main>

        {/* MOBILE QUICK PORTALS & SYSTEM - Refined 44px+ Touch-Friendly Buttons */}
        <footer className="flex-none w-full pt-2 pb-1 z-20 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-[1px] bg-gradient-to-r from-transparent to-slate-800 flex-1" />
            <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400/90 px-1">
              Quick Portals & System
            </span>
            <div className="h-[1px] bg-gradient-to-l from-transparent to-slate-800 flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full">
            {/* Doctor Portal */}
            <button 
              onClick={() => onNavigate(ViewState.DOCTOR_LOGIN)} 
              className="group relative flex items-center justify-center gap-2 min-h-[44px] py-2 px-2.5 rounded-xl bg-slate-900/90 border border-blue-500/40 text-blue-300 font-bold transition-all duration-300 hover:border-blue-400 active:border-blue-400 hover:bg-gradient-to-r hover:from-blue-950/80 hover:to-blue-900/60 active:bg-blue-950/80 hover:text-white active:text-white hover:shadow-[0_4px_20px_rgba(59,130,246,0.35)] active:shadow-[0_4px_15px_rgba(59,130,246,0.35)] active:scale-95 backdrop-blur-md cursor-pointer"
            >
              <span className="p-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/30 group-active:bg-blue-500 group-active:text-white transition-all duration-300 shadow-inner">
                <StethoscopeIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11.5px] xs:text-xs font-bold whitespace-nowrap">Doctor Portal</span>
            </button>

            {/* Lab Reporting */}
            <button 
              onClick={() => onNavigate(ViewState.LAB_LOGIN)} 
              className="group relative flex items-center justify-center gap-2 min-h-[44px] py-2 px-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 font-bold transition-all duration-300 hover:border-cyan-400 active:border-cyan-400 hover:bg-gradient-to-r hover:from-cyan-950/80 hover:to-cyan-900/60 active:bg-cyan-950/80 hover:text-white active:text-white hover:shadow-[0_4px_20px_rgba(6,182,212,0.35)] active:shadow-[0_4px_15px_rgba(6,182,212,0.35)] active:scale-95 backdrop-blur-md cursor-pointer"
            >
              <span className="p-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 group-active:bg-cyan-500 group-active:text-white transition-all duration-300 shadow-inner">
                <FileTextIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11.5px] xs:text-xs font-bold whitespace-nowrap">Lab Reporting</span>
            </button>

            {/* Settings */}
            <button 
              onClick={() => onNavigate(ViewState.ADMIN_SETTINGS)} 
              className="group relative flex items-center justify-center gap-2 min-h-[44px] py-2 px-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 font-bold transition-all duration-300 hover:border-purple-400/70 active:border-purple-400/70 hover:bg-gradient-to-r hover:from-purple-950/80 hover:to-slate-900/80 active:bg-purple-950/80 hover:text-purple-200 active:text-purple-200 hover:shadow-[0_4px_20px_rgba(168,85,247,0.3)] active:shadow-[0_4px_15px_rgba(168,85,247,0.3)] active:scale-95 backdrop-blur-md cursor-pointer"
            >
              <span className="p-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 group-active:bg-purple-500/30 group-active:text-purple-300 transition-all duration-300 shadow-inner">
                <SettingsIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11.5px] xs:text-xs font-bold whitespace-nowrap">Settings</span>
            </button>

            {/* Admin Logout */}
            <button 
              onClick={onLogout} 
              className="group relative flex items-center justify-center gap-2 min-h-[44px] py-2 px-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 font-bold transition-all duration-300 hover:border-rose-500/70 active:border-rose-500/70 hover:bg-gradient-to-r hover:from-rose-950/80 hover:to-slate-900/80 active:bg-rose-950/80 hover:text-rose-200 active:text-rose-200 hover:shadow-[0_4px_20px_rgba(244,63,94,0.3)] active:shadow-[0_4px_15px_rgba(244,63,94,0.3)] active:scale-95 backdrop-blur-md cursor-pointer"
            >
              <span className="p-1 rounded-full bg-slate-800 text-rose-400 border border-slate-700/60 group-active:bg-rose-500/30 group-active:text-rose-300 transition-all duration-300 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </span>
              <span className="text-[11.5px] xs:text-xs font-bold whitespace-nowrap">Admin Logout</span>
            </button>
          </div>

          <div className="mt-2 text-center text-slate-500/60 text-[9.5px] font-medium tracking-wide">
            Niramoy Clinic & Diagnostic • All rights reserved
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
