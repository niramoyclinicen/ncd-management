import React, { useState, useEffect } from 'react';
import { dbService } from '../dbService';

export interface ClinicLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  logoUrl?: string;
  className?: string;
  showAura?: boolean;
  variant?: 'default' | 'print' | 'minimal';
}

/**
 * Universal Medical Ring Logo Component for Niramoy Clinic & Diagnostic.
 * Features:
 * 1. Prestigious Circular Ring Architecture across Computer, Tablet, and Mobile.
 * 2. High-Tech Concentric Orbitals, Medical Cross, Lifeline Pulse, and Crisp NcD Typography.
 * 3. Seamless Auto-Integration: If custom logo is uploaded via Admin, it is centered & framed inside the ring.
 * 4. Print Mode Optimization: Ultra-crisp vector seal for official medical pads & test reports without ink bleeding.
 * 5. Single Source of Truth: Zero duplicate data stored in reports; reads dynamically from central clinic profile.
 */
export const ClinicLogo: React.FC<ClinicLogoProps> = ({
  size = 'md',
  logoUrl,
  className = '',
  showAura = true,
  variant = 'default',
}) => {
  const [imgError, setImgError] = useState(false);
  const [profileLogo, setProfileLogo] = useState<string>(() => {
    try {
      return dbService.getClinicProfile().logoUrl || '';
    } catch {
      return '';
    }
  });

  // Listen for real-time logo updates from Admin Settings
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const latest = dbService.getClinicProfile().logoUrl || '';
        setProfileLogo(latest);
        setImgError(false);
      } catch {}
    };

    window.addEventListener('ncd_clinic_profile_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ncd_clinic_profile_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const activeLogoUrl = logoUrl !== undefined ? logoUrl : profileLogo;

  // Size specifications
  const sizeMap = {
    xs: { dim: 'w-7 h-7', px: 28, stroke: 1.5, text: 'text-[8.5px]', cross: 12 },
    sm: { dim: 'w-9 h-9', px: 36, stroke: 1.8, text: 'text-[11px]', cross: 15 },
    md: { dim: 'w-12 h-12', px: 48, stroke: 2, text: 'text-sm', cross: 20 },
    lg: { dim: 'w-16 h-16', px: 64, stroke: 2.2, text: 'text-lg', cross: 26 },
    xl: { dim: 'w-20 h-20', px: 80, stroke: 2.5, text: 'text-xl', cross: 34 },
  };

  const current = sizeMap[size] || sizeMap.md;

  // PRINT VARIANT: Crisp Medical Seal for A4 Paper Reports / Invoices / Lab Pads
  if (variant === 'print') {
    if (activeLogoUrl && !imgError) {
      return (
        <div className={`relative flex items-center justify-center shrink-0 rounded-full border border-teal-700 bg-white p-1 overflow-hidden ${current.dim} ${className}`}>
          <img
            src={activeLogoUrl}
            alt="NCD Logo"
            className="w-full h-full object-contain rounded-full"
            onError={() => setImgError(true)}
          />
        </div>
      );
    }

    return (
      <div className={`relative flex items-center justify-center shrink-0 ${current.dim} ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full text-teal-800">
          {/* Outer Ring */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
          
          {/* Medical Cross */}
          <rect x="44" y="24" width="12" height="34" rx="2" fill="currentColor" opacity="0.85" />
          <rect x="33" y="35" width="34" height="12" rx="2" fill="currentColor" opacity="0.85" />
          
          {/* Center EKG Line */}
          <path d="M 22 58 L 38 58 L 44 48 L 52 68 L 58 54 L 64 58 L 78 58" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Text Seal */}
          <text x="50" y="86" textAnchor="middle" fontSize="13" fontWeight="900" fill="currentColor" letterSpacing="0.05em">
            NCD
          </text>
        </svg>
      </div>
    );
  }

  // CUSTOM UPLOADED LOGO: Framed in the Sleek Concentric Ring Bezel
  if (activeLogoUrl && !imgError) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${current.dim} ${className} group`}>
        {showAura && (
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-teal-400 opacity-60 blur-md pointer-events-none group-hover:opacity-90 group-hover:scale-105 transition-all duration-300" />
        )}
        <div className="relative w-full h-full rounded-full bg-gradient-to-b from-slate-900 via-slate-950 to-cyan-950 p-[2.5px] border-2 border-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 group-hover:border-cyan-300 group-hover:shadow-[0_0_28px_rgba(34,211,238,0.7)] overflow-hidden flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-slate-900/90 flex items-center justify-center p-1 overflow-hidden backdrop-blur-sm">
            <img
              src={activeLogoUrl}
              alt="Niramoy Clinic Official Logo"
              className="w-full h-full object-contain rounded-full transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT MEDICAL RING EMBLEM (Concentric Glowing Rings, Lifeline Pulse, Medical Cross & NcD)
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${current.dim} ${className} group`}>
      {/* Outer Glow Aura */}
      {showAura && (
        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-blue-600 via-cyan-400 to-teal-400 opacity-60 blur-md pointer-events-none group-hover:opacity-95 group-hover:scale-110 transition-all duration-500 animate-pulse-slow" />
      )}

      {/* Main Circular Ring Emblem */}
      <div className="relative w-full h-full rounded-full bg-gradient-to-b from-slate-900 via-cyan-950 to-slate-950 p-[2px] border-2 border-cyan-400/80 shadow-[0_0_22px_rgba(6,182,212,0.55)] transition-all duration-500 group-hover:border-cyan-300 group-hover:shadow-[0_0_32px_rgba(34,211,238,0.85)] flex items-center justify-center overflow-hidden">
        
        {/* Vector Medical Ring Graphic */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="ringGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
            <linearGradient id="crossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Deep Core Circular Background */}
          <circle cx="50" cy="50" r="47" fill="#040b17" />
          
          {/* Subtle Radar/Concentric Grid */}
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#ringGlowGrad)" strokeWidth="1.2" opacity="0.8" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#0e7490" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.7" />
          
          {/* Orbital Dot Accents */}
          <circle cx="50" cy="6" r="2.2" fill="#38bdf8" />
          <circle cx="94" cy="50" r="2.2" fill="#22d3ee" />
          <circle cx="50" cy="94" r="2.2" fill="#14b8a6" />
          <circle cx="6" cy="50" r="2.2" fill="#38bdf8" />

          {/* Medical Cross Graphic */}
          <g filter="url(#softGlow)" opacity="0.95">
            <rect x="44" y="20" width="12" height="34" rx="3" fill="url(#crossGrad)" />
            <rect x="33" y="31" width="34" height="12" rx="3" fill="url(#crossGrad)" />
          </g>

          {/* EKG Lifeline Pulse Through Cross Center */}
          <path
            d="M 18 53 L 34 53 L 40 44 L 47 62 L 53 47 L 58 56 L 64 53 L 82 53"
            fill="none"
            stroke="#a5f3fc"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#softGlow)"
          />
          <circle cx="53" cy="47" r="1.8" fill="#ffffff" />

          {/* Bottom Monogram "NcD" */}
          <text
            x="50"
            y="85"
            textAnchor="middle"
            fill="#e0f2fe"
            fontSize="14.5"
            fontWeight="900"
            letterSpacing="0.08em"
            fontFamily="sans-serif"
            style={{ filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.9))' }}
          >
            NcD
          </text>
        </svg>
      </div>
    </div>
  );
};

export default ClinicLogo;
