
import React, { useState, useEffect, useRef } from 'react';
import { UrineRMEResults, normalUrineRMEResults } from './DiagnosticData';

const SectionHeader = ({ title }: { title: string }) => (
    <div className="bg-slate-100 border-b border-black p-1.5 text-center font-black text-[11px] uppercase tracking-[0.3em] text-slate-900 shadow-inner">{title}</div>
);

const InputRow = ({ label, field, options, isLast, autoFormat, val, onChange, disabled }: any) => {
    return (
      <div className={`flex items-center hover:bg-slate-50 transition-colors ${!isLast ? 'border-b border-black' : ''}`}>
        <div className="w-[140px] p-1.5 border-r border-black font-black text-[10px] text-slate-800 uppercase shrink-0">{label}</div>
        <div className="flex-1 p-0.5">
          {options ? (
            <select 
              value={val || ''} 
              onChange={e => onChange(field, e.target.value)} 
              disabled={disabled} 
              className="w-full bg-transparent p-1 text-xs font-black text-slate-900 border-none outline-none focus:ring-1 focus:ring-blue-500 rounded no-print"
            >
              <option value="">Select...</option>
              {options.map((o:any) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input 
              value={val || ''} 
              onChange={e => onChange(field, e.target.value)}
              onBlur={e => autoFormat ? onChange(field, e.target.value, true) : null}
              onFocus={e => e.currentTarget.select()} 
              disabled={disabled} 
              className="w-full bg-transparent p-1 text-xs font-black text-slate-900 border-none focus:ring-1 focus:ring-blue-500 outline-none no-print" 
              placeholder={autoFormat ? "e.g. 24" : "..."}
            />
          )}
          <span className="hidden print:block text-xs font-black pl-2 leading-none">{val || 'Nil'}</span>
        </div>
      </div>
    );
};

const UrineRMEInputPage: React.FC<any> = ({ results: initialResults, onSaveOverride, disabled, isEmbedded }) => {
  const [localResults, setLocalResults] = useState<UrineRMEResults>(initialResults || normalUrineRMEResults);
  const [prevInitialResults, setPrevInitialResults] = useState(initialResults);
  const typingTimeoutRef = useRef<any>(null);

  if (initialResults !== prevInitialResults) {
      setLocalResults(initialResults || normalUrineRMEResults);
      setPrevInitialResults(initialResults);
  }

  const formatCellValue = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 2) return `0${digits[0]}-0${digits[1]}`;
    if (digits.length === 3) return `0${digits[0]}-${digits[1]}${digits[2]}`;
    if (digits.length === 4) return `${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
    return val;
  };

  const updateField = (f: keyof UrineRMEResults, v: string, shouldFormat: boolean = false) => {
    let finalValue = v;
    if (shouldFormat) finalValue = formatCellValue(v);
    
    const updated = { ...localResults, [f]: finalValue };
    setLocalResults(updated);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
        if (onSaveOverride && isEmbedded) onSaveOverride(updated, true);
        typingTimeoutRef.current = null;
    }, 800);
  };

  const renderInputRow = (label: string, field: keyof UrineRMEResults, options: string[] | null = null, isLast: boolean = false, autoFormat: boolean = false) => (
      <InputRow 
        label={label} 
        field={field} 
        options={options} 
        isLast={isLast} 
        autoFormat={autoFormat} 
        val={localResults[field]} 
        onChange={updateField} 
        disabled={disabled} 
      />
  );

  return (
    <div className={`flex flex-col ${isEmbedded ? 'flex-1 min-h-0 bg-transparent' : 'h-full bg-slate-100 overflow-hidden'} font-sans text-black`}>
      <div className={`flex-1 ${isEmbedded ? '' : 'overflow-y-auto p-1 flex justify-center custom-scrollbar bg-slate-200/50'}`}>
        <div className={`${isEmbedded ? 'w-full' : 'bg-white w-full max-w-[820px] shadow-2xl p-12'} flex flex-col font-serif relative`}>
            <h1 className="text-xl text-center font-black underline uppercase tracking-[0.2em] mb-4 text-black">Urine Routine Examination (Urine R/M/E)</h1>
            <div className="flex-1">
              <div className="flex flex-col bg-white">
                <div className="border-2 border-black rounded-xl overflow-hidden mb-2">
                  <SectionHeader title="Physical Examination" />
                  <div className="grid grid-cols-2 divide-x border-black">
                    <div className="flex flex-col">
                      {renderInputRow("Quantity", "quantity", ['Sufficient', '5ml', '10ml', '20ml', '30ml'])}
                      {renderInputRow("Colour", "colour", ['Straw', 'Pale Straw', 'Amber', 'Yellow', 'Reddish'])}
                      {renderInputRow("Appearance", "appearance", ['Clear', 'Slightly Hazy', 'Hazy', 'Turbid'], true)}
                    </div>
                    <div className="flex flex-col">
                      {renderInputRow("Sediment", "sediment", ['Nil', 'Present', 'Trace'])}
                      {renderInputRow("Sp. Gravity", "specificGravity", ['1.010', '1.015', '1.020', '1.025'], true)}
                    </div>
                  </div>
                </div>
                <div className="border-2 border-black rounded-xl overflow-hidden mb-2">
                  <SectionHeader title="Chemical Examination" />
                  <div className="grid grid-cols-2 divide-x border-black">
                    <div className="flex flex-col">
                      {renderInputRow("Reaction", "reaction", ['Acidic', 'Neutral', 'Alkaline'])}
                      {renderInputRow("Albumin", "albumin", ['Nil', 'Trace', '+', '++', '+++', '++++'])}
                      {renderInputRow("Sugar", "sugar", ['Nil', 'Trace', '+', '++', '+++', '++++'], true)}
                    </div>
                    <div className="flex flex-col">
                      {renderInputRow("Bile Salt", "bileSalt", ['Nil', 'Present'])}
                      {renderInputRow("Bile Pigment", "bilePigment", ['Nil', 'Present'])}
                      {renderInputRow("Ketones", "ketones", ['Nil', 'Trace', '+', '++', '+++'], true)}
                    </div>
                  </div>
                </div>
                <div className="border-2 border-black rounded-xl overflow-hidden mb-2">
                  <SectionHeader title="Microscopic Examination" />
                  <div className="grid grid-cols-2 divide-x border-black">
                    <div className="flex flex-col">
                      {renderInputRow("Epithelial Cells", "epithelialCells", null, false, true)}
                      {renderInputRow("Pus Cells", "pusCells", null, false, true)}
                      {renderInputRow("R.B.C", "rbc", null, false, true)}
                      {renderInputRow("Bacteria", "bacteria", ['Nil', 'Present', 'Few', 'Plenty'])}
                      {renderInputRow("Spermatozoa", "sperm", ['Nil', 'Present'], true)}
                    </div>
                    <div className="flex flex-col">
                      {renderInputRow("Casts", "casts", ['Nil', 'Granular', 'Hyaline', 'Pus Cast'])}
                      {renderInputRow("Crystals", "crystals", null, false, true)}
                      {renderInputRow("Amorphous Phos", "amorphousPhosphate")}
                      {renderInputRow("Calcium Oxalate", "calciumOxalate")}
                      {renderInputRow("Uric Acid", "uricAcid", null, true)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t-2 border-black mb-2">
                  <h4 className="text-[13px] font-black uppercase underline mb-3 italic tracking-tighter text-black">Impression / Notes:</h4>
                  <textarea 
                    value={localResults.others || ''} 
                    onChange={e => updateField('others', e.target.value)} 
                    className="w-full bg-blue-50/20 p-1 font-black text-[18px] leading-snug outline-none border-2 border-slate-200 rounded-2xl italic text-slate-950 no-print" 
                    rows={2} 
                    placeholder="Type any other findings..." 
                  />
                  <p className="hidden print:block text-[18px] font-black italic whitespace-pre-wrap text-black">{localResults.others || 'Urine routine examination reveals normal findings.'}</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UrineRMEInputPage;
