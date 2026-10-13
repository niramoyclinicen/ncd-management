import React, { useState, useEffect, useRef, useMemo } from 'react';

interface Option {
  id: string;
  name: string;
  details?: string;
}

interface SearchableSelectProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (id: string, name: string) => void;
  onAddNew?: () => void;
  placeholder?: string;
  required?: boolean;
  theme?: 'light' | 'dark';
  inputHeightClass?: string;
  allowCustom?: boolean;
  onEnter?: (term: string) => void;
  onSearchChange?: (term: string) => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  onAddNew,
  onEnter,
  onSearchChange,
  placeholder = 'Select...',
  required = false,
  theme = 'light',
  inputHeightClass = '',
  allowCustom = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const safeOptions = useMemo(() => {
    return (Array.isArray(options) ? options : []).filter(opt => opt && typeof opt === 'object');
  }, [options]);

  const selectedOption = useMemo(() => {
    return safeOptions.find(
      opt => opt.id === value || String(opt.name).toLowerCase() === String(value || '').toLowerCase()
    );
  }, [safeOptions, value]);

  // Sync internal search term with external value
  useEffect(() => {
    if (!isTyping) {
      if (selectedOption) {
        setSearchTerm(selectedOption.name);
      } else if (allowCustom && value) {
        setSearchTerm(value);
      } else if (!value) {
        setSearchTerm('');
      }
    }
  }, [value, selectedOption, allowCustom, isTyping]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    // If user has not typed a custom search query (e.g. just opened dropdown or term matches selected name),
    // show all available options so the user can easily choose any item from the list.
    if (!isTyping || !searchTerm.trim()) {
      return safeOptions;
    }

    const query = searchTerm.trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);

    return safeOptions.filter(opt => {
      const name = String(opt.name || '').toLowerCase();
      const id = String(opt.id || '').toLowerCase();
      const details = String(opt.details || '').toLowerCase();

      // Check if all tokens match at least one attribute
      return tokens.every(token => name.includes(token) || id.includes(token) || details.includes(token));
    });
  }, [safeOptions, searchTerm, isTyping]);

  // Reset highlight index when filtered options change
  useEffect(() => {
    if (isOpen) {
      const idx = filteredOptions.findIndex(
        opt => opt.id === value || String(opt.name).toLowerCase() === String(value || '').toLowerCase()
      );
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, filteredOptions, value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        // Revert search term to selected value on blur if not custom
        if (selectedOption) {
          setSearchTerm(selectedOption.name);
        } else if (allowCustom && value) {
          setSearchTerm(value);
        } else if (!allowCustom && !value) {
          setSearchTerm('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, allowCustom, value]);

  const handleSelect = (option: Option) => {
    onChange(option.id, option.name);
    setSearchTerm(option.name);
    setIsTyping(false);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchTerm(newVal);
    setIsTyping(true);
    setIsOpen(true);
    if (onSearchChange) onSearchChange(newVal);
    if (allowCustom) {
      onChange(newVal, newVal);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    setIsTyping(false);
    onChange('', '');
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      } else if (onEnter) {
        onEnter(searchTerm);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsTyping(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll('li');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Adjust dropdown positioning
  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const handlePosition = () => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setDropdownDirection(spaceBelow < 280 && spaceAbove > spaceBelow ? 'up' : 'down');
      };

      handlePosition();
      window.addEventListener('scroll', handlePosition, true);
      window.addEventListener('resize', handlePosition);
      return () => {
        window.removeEventListener('scroll', handlePosition, true);
        window.removeEventListener('resize', handlePosition);
      };
    }
  }, [isOpen]);

  const labelColor = theme === 'dark' ? 'text-sky-300' : 'text-gray-700';
  const inputBg = theme === 'dark' ? 'bg-sky-900/50' : 'bg-white';
  const inputBorder = theme === 'dark' ? 'border-sky-800' : 'border-gray-300';
  const inputText = theme === 'dark' ? 'text-sky-100' : 'text-gray-900';
  const dropdownBg = theme === 'dark' ? 'bg-slate-900' : 'bg-white';
  const dropdownText = theme === 'dark' ? 'text-slate-100' : 'text-gray-900';
  const hoverColor = theme === 'dark' ? 'bg-sky-950/80 text-sky-200' : 'bg-blue-50 text-blue-900';

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className={`block text-sm font-semibold mb-1 ${labelColor}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type="text"
          className={`block w-full border rounded-md shadow-sm sm:text-sm pl-3 ${onAddNew ? 'pr-20' : 'pr-14'} py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${inputBg} ${inputBorder} ${inputText} ${inputHeightClass}`}
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={() => {
            setIsOpen(true);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          required={required}
          autoComplete="off"
        />

        {/* Action icons right side */}
        <div className="absolute right-2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-200 dark:hover:text-white rounded-full transition-colors"
              title="Clear"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* Toggle dropdown chevron */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(prev => !prev);
              if (!isOpen) setIsTyping(false);
            }}
            className="p-1 text-slate-400 hover:text-sky-300 transition-colors"
            title="Toggle dropdown"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Add New Button (Plus Icon) */}
          {onAddNew && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddNew();
                setIsOpen(false);
              }}
              className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-500 focus:outline-none shadow-sm transition-all active:scale-95 ml-0.5"
              title="Add New"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul
          ref={listRef}
          className={`absolute z-[9999] w-full rounded-xl shadow-2xl border ${inputBorder} ${dropdownBg} max-h-72 overflow-y-auto ${dropdownDirection === 'up' ? 'bottom-full mb-1.5' : 'mt-1.5'} ring-1 ring-black/20`}
        >
          {filteredOptions.map((option, idx) => {
            const isSelected = option.id === value || String(option.name).toLowerCase() === String(value || '').toLowerCase();
            const isHighlighted = idx === highlightedIndex;

            return (
              <li
                key={`${option.id}-${idx}`}
                className={`cursor-pointer select-none relative py-2.5 px-3.5 ${dropdownText} ${isHighlighted ? hoverColor : ''} ${isSelected ? 'bg-blue-600/20 font-bold' : ''} transition-colors border-b border-slate-100 dark:border-slate-800/40 last:border-b-0`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(option);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col overflow-hidden leading-tight">
                    <span className="font-bold truncate text-xs sm:text-sm flex items-center gap-1.5">
                      {option.name}
                      {isSelected && (
                        <span className="text-blue-400 text-xs font-black">✓</span>
                      )}
                    </span>
                    {option.details && (
                      <span className="text-[11px] opacity-75 font-medium truncate mt-0.5 text-slate-400 dark:text-sky-300/80">
                        {option.details}
                      </span>
                    )}
                  </div>
                  {option.id && option.id !== option.name && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                      {option.id}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isOpen && filteredOptions.length === 0 && (
        <ul className={`absolute z-[9999] w-full rounded-xl shadow-2xl border ${inputBorder} ${dropdownBg} ${dropdownDirection === 'up' ? 'bottom-full mb-1.5' : 'mt-1.5'} p-4 text-center`}>
          <li className={`${dropdownText} opacity-70 text-xs italic`}>
            {searchTerm ? `"${searchTerm}" দিয়ে কোনো ফলাফল পাওয়া যায়নি` : 'কোনো তথ্য পাওয়া যায়নি'}
          </li>
          {allowCustom && searchTerm && (
            <li className="mt-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(searchTerm, searchTerm);
                  setIsOpen(false);
                }}
                className="text-xs font-bold text-blue-400 hover:underline"
              >
                "{searchTerm}" হিসেবে ব্যবহার করুন
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;
