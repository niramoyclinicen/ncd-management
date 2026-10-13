
import React, { useState, useEffect, useRef } from 'react';
import { SaveIcon, FileTextIcon } from './Icons';
import { CBCResults, emptyCBCResults } from './DiagnosticData';

const TableRow = ({ label, field, unit, range, val, isAlert, onChange, disabled }: any) => {
    return (
        <tr className="h-9">
            <td className="p-2 border-2 border-black font-black uppercase text-[11px] w-[45%]">{label}</td>
            <td className="p-0.5 border-2 border-black w-[25%] text-center">
                <input 
                    value={val} 
                    onChange={e => onChange(field, e.target.value)} 
                    onFocus={e => e.currentTarget.select()} 
                    disabled={disabled} 
                    className={`w-full border-none p-1.5 rounded-md text-center font-black no-print text-sm outline-none placeholder:text-slate-300 ${isAlert ? 'bg-red-50 text-red-600' : 'bg-blue-50/50 text-slate-900'}`} 
                    placeholder="..."
                />
                <span className={`hidden print:block font-black text-sm ${isAlert ? 'text-red-600' : ''}`}>{val || '---'}</span>
            </td>
            <td className="p-2 border-2 border-black text-center font-black text-[10px] uppercase w-[10%]">{unit}</td>
            <td className="p-2 border-2 border-black text-[10px] text-slate-700 font-bold italic w-[20%]">{range}</td>
        </tr>
    );
};

const CBCInputPage: React.FC<any> = ({ results: initialResults, onSaveOverride, disabled, isEmbedded, checkRange }) => {
    const [localResults, setLocalResults] = useState<CBCResults>(initialResults || emptyCBCResults);
    const [impression, setImpression] = useState(initialResults?.impression || '');
    const [prevInitialResults, setPrevInitialResults] = useState(initialResults);
    const typingTimeoutRef = useRef<any | null>(null);

    if (initialResults !== prevInitialResults) {
        setLocalResults(initialResults || emptyCBCResults);
        setImpression(initialResults?.impression || '');
        setPrevInitialResults(initialResults);
    }
    
    const updateField = (f: keyof CBCResults, v: string) => {
        const updated = { ...localResults, [f]: v, impression };
        setLocalResults(updated);
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (onSaveOverride && isEmbedded) {
                onSaveOverride(updated, true);
            }
            typingTimeoutRef.current = null;
        }, 800);
    };

    const handleImpressionChange = (val: string) => {
        setImpression(val);
        const updated = { ...localResults, impression: val };
        if (onSaveOverride && isEmbedded) onSaveOverride(updated, true);
    };

    const renderRow = (label: string, field: keyof CBCResults, unit: string, range: string) => {
        const val = localResults[field] || '';
        const isAlert = checkRange && checkRange(val, range);
        return (
            <TableRow 
                key={field} 
                label={label} 
                field={field} 
                unit={unit} 
                range={range} 
                val={val} 
                isAlert={isAlert} 
                onChange={updateField} 
                disabled={disabled} 
            />
        );
    };

    return (
        <div className={`flex flex-col ${isEmbedded ? 'flex-1 min-h-0 bg-transparent' : 'h-full bg-slate-100 overflow-hidden'} font-sans text-black`}>
            <div className={`flex-1 ${isEmbedded ? '' : 'overflow-y-auto p-4 flex justify-center custom-scrollbar bg-slate-200/50'}`}>
                <div className={`${isEmbedded ? 'w-full' : 'bg-white w-full max-w-[820px] shadow-2xl p-12'} flex flex-col font-serif relative`}>
                    <h1 className="text-xl text-center font-black underline uppercase tracking-[0.2em] mb-8 text-black">Complete Blood Count (CBC)</h1>
                    <div className="flex-1">
                        <table className="w-full border-collapse border-2 border-black">
                            <thead className="bg-slate-100">
                                <tr className="border-b-2 border-black">
                                    <th className="p-2 border-2 border-black text-left text-[10px] font-black uppercase">Investigation Name</th>
                                    <th className="p-2 border-2 border-black text-center text-[10px] font-black uppercase">Result</th>
                                    <th className="p-2 border-2 border-black text-center text-[10px] font-black uppercase">Unit</th>
                                    <th className="p-2 border-2 border-black text-left text-[10px] font-black uppercase">Normal Range</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderRow("Hemoglobin (Hb)", "hemoglobin", "g/dL", "12.0 - 16.0")}
                                {renderRow("ESR (Westergren)", "esr", "mm/hr", "00 - 20")}
                                {renderRow("Total WBC Count", "wbc", "/cmm", "4,000 - 11,000")}
                                <tr className="bg-slate-50 h-7">
                                    <td colSpan={4} className="p-1.5 border-2 border-black font-black text-[9px] uppercase text-slate-700 tracking-widest text-center italic">
                                        Differential WBC Count
                                    </td>
                                </tr>
                                {renderRow("Neutrophils", "neutrophils", "%", "40 - 75")}
                                {renderRow("Lymphocytes", "lymphocytes", "%", "20 - 45")}
                                {renderRow("Monocytes", "monocytes", "%", "02 - 10")}
                                {renderRow("Eosinophils", "eosinophils", "%", "01 - 06")}
                                {renderRow("Basophils", "basophils", "%", "00 - 01")}
                                <tr className="bg-slate-50 h-7">
                                    <td colSpan={4} className="p-1.5 border-2 border-black font-black text-[9px] uppercase text-slate-700 tracking-widest text-center italic">
                                        Platelet Status
                                    </td>
                                </tr>
                                {renderRow("Platelet Count", "platelets", "/cmm", "150,000 - 450,000")}
                            </tbody>
                        </table>
                        <div className="mt-8 border-t-2 border-black pt-4">
                            <h4 className="text-[12px] font-black uppercase underline mb-2 italic">Impression / Note:</h4>
                            <textarea 
                                value={impression}
                                onChange={e => handleImpressionChange(e.target.value)}
                                className="w-full bg-slate-50 border-none p-2 font-black italic text-sm outline-none resize-none no-print min-h-[60px]"
                                placeholder="Write impression here..."
                            />
                            <p className="hidden print:block text-[14px] font-black italic whitespace-pre-wrap leading-tight text-black">
                                {impression || 'Peripheral blood film reveals normal cellular morphology. No abnormal cells seen.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CBCInputPage;
