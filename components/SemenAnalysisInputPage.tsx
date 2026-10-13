
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SaveIcon, Activity, FileTextIcon } from './Icons';
import { Patient, LabInvoice, Doctor, Employee, SemenResults, normalSemenResults } from './DiagnosticData';

const SemenAnalysisInputPage: React.FC<any> = ({ results: initialResults, onSaveOverride, disabled, patient, invoice, doctors, employees, technologistId, consultantId, isEmbedded }) => {
    const [localResults, setLocalResults] = useState<SemenResults>(initialResults || normalSemenResults);
    const [prevInitialResults, setPrevInitialResults] = useState(initialResults);
    const typingTimeoutRef = useRef<any>(null);

    if (initialResults !== prevInitialResults) {
        setLocalResults(initialResults || normalSemenResults);
        setPrevInitialResults(initialResults);
    }

    const updateField = (f: keyof SemenResults, v: string) => {
        const updated = { ...localResults, [f]: v };
        setLocalResults(updated);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (onSaveOverride && isEmbedded) {
                onSaveOverride(updated);
            }
            typingTimeoutRef.current = null;
        }, 800);
    };

    const inputClass = "w-full border-b-2 border-slate-200 p-2 focus:border-blue-500 text-lg font-black text-slate-900 bg-blue-50/30 outline-none transition-all rounded-xl no-print";
    const labelClass = "text-slate-700 font-black w-1/2 text-xs uppercase tracking-tight";

    return (
        <div className={`flex flex-col ${isEmbedded ? 'flex-1 min-h-0 bg-transparent' : 'h-full bg-slate-100 overflow-hidden'} font-sans text-black`}>
            <div className={`flex-1 ${isEmbedded ? '' : 'overflow-y-auto p-4 flex justify-center custom-scrollbar bg-slate-200/50'}`}>
                <div className={`${isEmbedded ? 'w-full' : 'bg-white w-full max-w-[820px] shadow-2xl p-12'} flex flex-col font-serif relative`}>
                    <h1 className="text-2xl text-center font-black underline uppercase tracking-[0.3em] mb-12 text-black">Semen Analysis Report</h1>
                    <div className="flex-1 px-4 space-y-12">
                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-slate-400 pl-3">Physical Examination</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4"><span className={labelClass}>Volume (ml)</span><input value={localResults.volume || ''} onChange={e=>updateField('volume', e.target.value)} className={inputClass} /><span className="hidden print:block text-xl font-black">{localResults.volume || '---'}</span></div>
                                    <div className="flex items-center gap-4"><span className={labelClass}>Color</span><input value={localResults.color || ''} onChange={e=>updateField('color', e.target.value)} className={inputClass} /><span className="hidden print:block text-xl font-black">{localResults.color || '---'}</span></div>
                                    <div className="flex items-center gap-4"><span className={labelClass}>Liquefaction Time</span><input value={localResults.liquefactionTime || ''} onChange={e=>updateField('liquefactionTime', e.target.value)} className={inputClass} /><span className="hidden print:block text-xl font-black">{localResults.liquefactionTime || '---'}</span></div>
                                    <div className="flex items-center gap-4"><span className={labelClass}>Viscosity</span><input value={localResults.viscosity || ''} onChange={e=>updateField('viscosity', e.target.value)} className={inputClass} /><span className="hidden print:block text-xl font-black">{localResults.viscosity || '---'}</span></div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest border-l-4 border-blue-400 pl-3">Microscopic Examination</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4"><span className={labelClass}>Total Count (m/ml)</span><input value={localResults.totalCount || ''} onChange={e=>updateField('totalCount', e.target.value)} className={inputClass} /><span className="hidden print:block text-xl font-black">{localResults.totalCount || '---'}</span></div>
                                    <div className="flex items-center gap-4"><span className={labelClass}>Active (%)</span><input value={localResults.motilityActive || ''} onChange={e=>updateField('motilityActive', e.target.value)} className={inputClass} /><span className="hidden print:block text-xl font-black">{localResults.motilityActive || '---'}</span></div>
                                    <div className="flex items-center gap-4"><span className={labelClass}>Sluggish (%)</span><input value={localResults.motilitySluggish || ''} onChange={e=>updateField('motilitySluggish', e.target.value)} className={inputClass} /><span className="hidden print:block text-xl font-black">{localResults.motilitySluggish || '---'}</span></div>
                                    <div className="flex items-center gap-4"><span className={labelClass}>Pus Cells</span><input value={localResults.pusCells || ''} onChange={e=>updateField('pusCells', e.target.value)} className={inputClass} /><span className="hidden print:block text-xl font-black">{localResults.pusCells || '---'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SemenAnalysisInputPage;
