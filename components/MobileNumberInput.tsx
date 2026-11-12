import React, { useRef, useId } from 'react';
import { Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { extractMobileDigits, formatMobileNumber, getMobileMaskSlots } from '../utils/phoneUtils';

export interface MobileNumberInputProps {
  id?: string;
  name?: string;
  value: string | undefined | null;
  onChange: (e: any) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  label?: string;
  labelClassName?: string;
  error?: string;
  showHelperBadge?: boolean;
  showIcon?: boolean;
  compact?: boolean;
  theme?: 'dark' | 'light' | 'auto';
}

export const MobileNumberInput: React.FC<MobileNumberInputProps> = ({
  id,
  name = 'mobile',
  value = '',
  onChange,
  onBlur,
  onFocus,
  placeholder = '01XXX-XXXXXX',
  className = '',
  containerClassName = '',
  disabled = false,
  required = false,
  autoFocus = false,
  label,
  labelClassName = '',
  error,
  showHelperBadge = true,
  showIcon = false,
  compact = false,
  theme = 'auto'
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  const rawValue = value || '';
  const info = getMobileMaskSlots(rawValue);
  const displayValue = formatMobileNumber(rawValue);

  // Handle direct text change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digits = extractMobileDigits(rawVal);
    const formatted = formatMobileNumber(digits);

    if (typeof onChange === 'function') {
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name: name || e.target?.name || 'mobile',
          value: formatted
        }
      };
      onChange(syntheticEvent);
    }
  };

  // Keyboard controls: smooth backspace across hyphen
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const input = inputRef.current;
      if (input) {
        const { selectionStart, selectionEnd } = input;
        // If cursor is right after hyphen (position 6 in '01XXX-')
        if (selectionStart === selectionEnd && selectionStart === 6 && displayValue.charAt(5) === '-') {
          e.preventDefault();
          // Remove the digit before the hyphen (the 5th digit)
          const digits = extractMobileDigits(displayValue);
          const newDigits = digits.slice(0, 4);
          const formatted = formatMobileNumber(newDigits);
          if (typeof onChange === 'function') {
            onChange({
              target: {
                name: name || 'mobile',
                value: formatted
              }
            } as any);
          }
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(4, 4);
            }
          }, 0);
        }
      }
    }
  };

  // Live status badge showing remaining digits or completion
  const renderStatusBadge = () => {
    if (!showHelperBadge) return null;

    if (info.digitsCount === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-slate-400 bg-slate-900/60 dark:bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-700/50 shadow-xs">
          <span className="text-slate-300 font-semibold">01XXX-XXXXXX</span>
          <span className="text-slate-500 font-sans text-[9px]">• বাকি ১১</span>
        </span>
      );
    }

    if (!info.isValidPrefix && info.digitsCount >= 2) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 rounded-md animate-pulse">
          <AlertCircle size={10} className="text-amber-400 shrink-0" />
          <span>01 দিয়ে শুরু করুন</span>
        </span>
      );
    }

    if (info.isComplete) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 px-2 py-0.5 rounded-md shadow-[0_0_8px_rgba(16,185,129,0.25)]">
          <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
          <span>১১/১১ সম্পূর্ণ ✓</span>
        </span>
      );
    }

    // In-progress: show masked preview with remaining slot count
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-sky-200 bg-sky-950/80 border border-sky-500/50 px-2 py-0.5 rounded-md shadow-xs">
        <span className="text-sky-300 tracking-wider font-bold">{info.masked}</span>
        <span className="text-amber-400 font-sans font-bold text-[9px] bg-amber-950/90 px-1 py-0.2 rounded border border-amber-600/40">
          বাকি {info.remainingCount}টি
        </span>
      </span>
    );
  };

  return (
    <div className={`w-full flex flex-col ${containerClassName}`}>
      {/* Top Header Row: Label on Left, Status Badge on Right */}
      {(label || showHelperBadge) && (
        <div className="flex items-center justify-between gap-1.5 mb-1">
          {label ? (
            <label 
              htmlFor={inputId} 
              className={`text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1 truncate ${labelClassName}`}
            >
              {showIcon && <Phone size={11} className="text-sky-400 shrink-0" />}
              <span>{label}</span>
              {required && <span className="text-rose-400 font-black ml-0.5">*</span>}
            </label>
          ) : <div />}
          <div className="ml-auto shrink-0">
            {renderStatusBadge()}
          </div>
        </div>
      )}

      {/* Input Field with responsive icon and styling */}
      <div className="relative flex items-center w-full">
        {showIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Phone size={14} className={info.isComplete ? 'text-emerald-400' : 'text-slate-400'} />
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          maxLength={12} // 11 digits + 1 hyphen = 12 characters
          className={`font-mono tracking-wider transition-all duration-150 outline-none ${
            info.isComplete 
              ? 'border-emerald-500/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/30' 
              : info.digitsCount > 0 
                ? 'focus:border-sky-400 focus:ring-1 focus:ring-sky-500/30' 
                : ''
          } ${showIcon ? 'pl-9' : ''} ${className}`}
        />
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-rose-400 text-[10px] font-medium mt-1 flex items-center gap-1">
          <AlertCircle size={10} className="shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default MobileNumberInput;
