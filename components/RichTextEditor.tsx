import React, { useRef, useEffect, useState } from 'react';

export const RichTextToolbar = ({ onExec }: { onExec: (cmd: string, arg?: string) => void }) => {
    const btnClass = "px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-700 border border-slate-300 cursor-pointer flex items-center justify-center";
    return (
        <div className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-300 rounded shadow-sm no-print overflow-y-auto max-h-[60vh] custom-scrollbar">
            <div className="text-[10px] font-black uppercase text-slate-500 mb-1 text-center">Formatting</div>
            <div className="grid grid-cols-4 gap-1">
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('bold'); }} className={btnClass} title="Bold"><b>B</b></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('italic'); }} className={btnClass} title="Italic"><i>I</i></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('underline'); }} className={btnClass} title="Underline"><u>U</u></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('insertHTML', '&emsp;&emsp;'); }} className={btnClass} title="Tab Space">Tab</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('subscript'); }} className={btnClass} title="Subscript">X<sub>2</sub></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('superscript'); }} className={btnClass} title="Superscript">X<sup>2</sup></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('undo'); }} className={btnClass} title="Undo">↺</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('redo'); }} className={btnClass} title="Redo">↻</button>
            </div>
            
            <div className="flex gap-1 mt-1 items-center justify-between text-xs font-bold text-slate-600">
                <label className="flex items-center gap-1 cursor-pointer">
                    Color:
                    <input type="color" onChange={(e) => onExec('foreColor', e.target.value)} className="w-5 h-5 p-0 border-0 cursor-pointer" />
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                    Bg:
                    <input type="color" onChange={(e) => onExec('hiliteColor', e.target.value)} className="w-5 h-5 p-0 border-0 cursor-pointer" />
                </label>
            </div>

            <select onChange={(e) => onExec('fontSize', e.target.value)} className="border border-slate-300 rounded text-xs px-1 h-7 cursor-pointer outline-none w-full mt-1">
                <option value="">Size...</option>
                <option value="1">Smallest</option>
                <option value="2">Small</option>
                <option value="3">Normal</option>
                <option value="4">Large</option>
                <option value="5">Larger</option>
                <option value="6">Huge</option>
                <option value="7">Massive</option>
            </select>
            <select onChange={(e) => onExec('fontName', e.target.value)} className="border border-slate-300 rounded text-xs px-1 h-7 cursor-pointer outline-none w-full">
                <option value="">Font...</option>
                <option value="Cambria">Cambria</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
            </select>
            <div className="grid grid-cols-2 gap-1 mt-1">
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('justifyLeft'); }} className={btnClass}>Left</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('justifyCenter'); }} className={btnClass}>Center</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('justifyRight'); }} className={btnClass}>Right</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('justifyFull'); }} className={btnClass}>Justify</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('insertUnorderedList'); }} className={btnClass}>Bullet</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('insertOrderedList'); }} className={btnClass}>Number</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('outdent'); }} className={btnClass}>Outdent</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('indent'); }} className={btnClass}>Indent</button>
            </div>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('insertHorizontalRule'); }} className={`${btnClass} mt-1`} title="Horizontal Line">Insert Line</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); onExec('removeFormat'); }} className={`${btnClass} mt-1`} title="Clear Formatting">Clear Formatting</button>
        </div>
    );
};

export const RichTextEditor = ({ value, onChange, readOnly = false, minHeight = '300px', hideToolbar = false }: any) => {
    const editorRef = useRef<HTMLDivElement>(null);

    const [tabStops, setTabStops] = useState<number[]>([]);
    
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const exec = (cmd: string, arg?: string) => {
        document.execCommand(cmd, false, arg);
        if (editorRef.current) editorRef.current.focus();
        handleInput();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            
            const range = selection.getRangeAt(0);
            let rect = range.getBoundingClientRect();
            
            if (rect.width === 0 && rect.height === 0) {
               const span = document.createElement('span');
               span.innerHTML = '&#8203;';
               range.insertNode(span);
               rect = span.getBoundingClientRect();
               span.parentNode?.removeChild(span);
            }
            
            const editorRect = editorRef.current?.getBoundingClientRect();
            if (!editorRect) return;
            
            // p-6 means 24px padding
            const currentX = rect.left - editorRect.left - 24; 
            
            const nextTabStop = tabStops.find(t => t > currentX + 5);
            
            if (nextTabStop !== undefined) {
                const distance = nextTabStop - currentX;
                const spacer = `<span class="tab-spacer" style="display:inline-block; width:${Math.max(5, distance)}px;">&nbsp;</span>`;
                document.execCommand('insertHTML', false, spacer);
            } else {
                document.execCommand('insertHTML', false, '&emsp;&emsp;');
            }
        }
    };

    const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // subtract padding
        const x = e.clientX - rect.left - 24; 
        if (x < 0) return;
        
        setTabStops(prev => {
            const existingIdx = prev.findIndex(t => Math.abs(t - x) < 8);
            if (existingIdx !== -1) {
                const filtered = [...prev];
                filtered.splice(existingIdx, 1);
                return filtered;
            }
            return [...prev, x].sort((a,b) => a-b);
        });
    };

    const editorStyles = {
        fontFamily: 'inherit',
        lineHeight: '1.5',
    };

    if (readOnly) {
        return (
            <div 
                className="rich-text-content text-black w-full" 
                dangerouslySetInnerHTML={{ __html: value || '' }} 
                style={editorStyles}
            />
        );
    }

    const btnClass = "px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-700 border border-slate-300 cursor-pointer";

    return (
        <div className="flex flex-col border border-slate-300 rounded overflow-hidden bg-white print:border-none print:bg-transparent w-full">
            <style>{`
                .rich-text-content ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
                .rich-text-content ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
                .rich-text-content p { margin: 0.5rem 0; }
                .rich-text-content h1, .rich-text-content h2, .rich-text-content h3 { font-weight: bold; margin: 1rem 0 0.5rem; }
            `}</style>
            {!hideToolbar && (
                <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border-b border-slate-300 items-center no-print">
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} className={btnClass}><b>B</b></button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} className={btnClass}><i>I</i></button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} className={btnClass}><u>U</u></button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertHTML', '&emsp;&emsp;'); }} className={btnClass} title="Tab Space">Tab</button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    
                    <select onChange={(e) => exec('fontSize', e.target.value)} className="border border-slate-300 rounded text-xs px-1 h-6 cursor-pointer outline-none">
                        <option value="">Size...</option>
                        <option value="1">Smallest</option>
                        <option value="2">Small</option>
                        <option value="3">Normal</option>
                        <option value="4">Large</option>
                        <option value="5">Larger</option>
                        <option value="6">Huge</option>
                        <option value="7">Massive</option>
                    </select>
                    
                    <select onChange={(e) => exec('fontName', e.target.value)} className="border border-slate-300 rounded text-xs px-1 h-6 cursor-pointer outline-none">
                        <option value="">Font...</option>
                        <option value="Cambria">Cambria</option>
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                    </select>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('justifyLeft'); }} className={btnClass}>Left</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter'); }} className={btnClass}>Center</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('justifyRight'); }} className={btnClass}>Right</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('justifyFull'); }} className={btnClass}>Justify</button>
                    
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} className={btnClass}>Bullet</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }} className={btnClass}>Number</button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('outdent'); }} className={btnClass}>Outdent</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('indent'); }} className={btnClass}>Indent</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('removeFormat'); }} className={btnClass} title="Clear Formatting">Clear</button>
                </div>
            )}
            
            <div 
                className="h-5 bg-slate-100 border-b border-slate-300 flex items-end relative cursor-crosshair no-print shrink-0" 
                onClick={handleRulerClick}
                title="Click to add/remove a Tab Stop"
            >
                {/* Ruler ticks */}
                <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, transparent 95%, #000 100%)', backgroundSize: '50px 100%' }}></div>
                {/* 24px padding indicator */}
                <div className="absolute left-[24px] top-0 bottom-0 border-l border-slate-400 pointer-events-none"></div>
                
                {/* Tab stops */}
                {tabStops.map(t => (
                    <div 
                        key={t} 
                        className="absolute bottom-0 w-2 h-2 pointer-events-none" 
                        style={{ left: `${t + 24}px`, transform: 'translateX(-50%)' }}
                    >
                        <svg viewBox="0 0 10 10" className="w-full h-full fill-indigo-600"><path d="M0,10 L5,0 L10,10 Z"/></svg>
                    </div>
                ))}
            </div>
            
            <div 
                ref={editorRef}
                className="flex-1 p-6 overflow-y-auto print:overflow-visible print:p-0 outline-none rich-text-content text-black cursor-text"
                contentEditable
                onInput={handleInput}
                onBlur={handleInput}
                onKeyDown={handleKeyDown}
                style={{ ...editorStyles, minHeight }}
            />
        </div>
    );
};
