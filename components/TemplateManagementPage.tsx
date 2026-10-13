import React, { useState, useEffect, useMemo } from 'react';
import { SettingsIcon, SaveIcon, PlusIcon, FileTextIcon, Activity } from './Icons';
import { RichTextEditor } from './RichTextEditor';

interface RichTextTemplate {
    id: string;
    testName?: string; // Legacy
    category: string;
    subCategory: string;
    templateName: string; 
    contentHtml: string;
}

const TemplateManagementPage: React.FC<any> = ({ onBack, tests = [], templates: _templates, setTemplates, performBlockingSync }) => {
    const templates = Array.isArray(_templates) ? _templates : [];
    

    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<RichTextTemplate>({
        id: '', category: '', subCategory: '', templateName: '', contentHtml: '<p><br></p>'
    });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
    const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState('All');

    useEffect(() => {
        try {
            localStorage.setItem('ncd_rt_templates_v1', JSON.stringify(templates));
        } catch (e) {
            console.error('Failed to save templates to localStorage:', e);
        }
    }, [templates]);

    const handleSave = () => {
        if (!currentTemplate.category || !currentTemplate.subCategory || !currentTemplate.templateName) {
            alert('Please provide Category, Sub Category, and Template Name.');
            return;
        }
        let updated = [...templates];
        if (currentTemplate.id) {
            updated = updated.map(t => t.id === currentTemplate.id ? currentTemplate : t);
        } else {
            updated.push({ ...currentTemplate, id: 'T-' + Date.now() });
        }
        setTemplates(updated);
            setIsEditing(false);
            if (performBlockingSync) performBlockingSync({ rtTemplates: updated });
    };

    const editTemplate = (t: RichTextTemplate) => {
        setCurrentTemplate(t);
        setIsEditing(true);
    };

    const resetForm = () => {
        setCurrentTemplate({ id: '', category: '', subCategory: '', templateName: '', contentHtml: '<p><br></p>' });
    };

    const uniqueCategories = useMemo(() => Array.from(new Set(templates.map(t => t.category))).filter(Boolean), [templates]);
    const uniqueSubCategories = useMemo(() => {
        if (selectedCategoryFilter === 'All') return [];
        return Array.from(new Set(templates.filter(t => t.category === selectedCategoryFilter).map(t => t.subCategory))).filter(Boolean);
    }, [templates, selectedCategoryFilter]);

    const filteredTemplates = templates.filter(t => 
        (selectedCategoryFilter === 'All' || t.category === selectedCategoryFilter) &&
        (selectedSubCategoryFilter === 'All' || t.subCategory === selectedSubCategoryFilter) &&
        ((t.templateName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
         (t.subCategory || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
         (t.category || '').toLowerCase().includes((searchTerm || '').toLowerCase()))
    );

    // Get unique categories and subcategories across the system for the dropdown/datalist
    const allKnownCategories = useMemo(() => Array.from(new Set([...uniqueCategories, 'Ultrasonography', 'Semen Analysis', 'X-Ray', 'Pathology'])), [uniqueCategories]);
    const allKnownSubCategories = useMemo(() => Array.from(new Set([...templates.filter(t => t.category === currentTemplate.category).map(t => t.subCategory), ...tests.map((t: any) => t.test_name)])).filter(Boolean), [templates, currentTemplate.category, tests]);

    return (
        <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden text-black font-sans min-h-0">
            <div className="bg-slate-900 p-4 shrink-0 flex justify-between items-center shadow-md z-10 text-white">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-xl transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-widest text-white">Rich Text Template Manager</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manage MS Word style templates</p>
                    </div>
                </div>
            </div>

            {isEditing ? (
                <div className="flex-1 flex overflow-hidden min-h-0">
                    <div className="w-[300px] shrink-0 bg-white border-r shadow-lg z-10 flex flex-col p-4">
                        <h3 className="font-black uppercase tracking-widest text-slate-800 mb-4">Template Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Category</label>
                                <input
                                    list="categories-list"
                                    value={currentTemplate.category}
                                    onChange={e => setCurrentTemplate(prev => ({...prev, category: e.target.value}))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                    placeholder="e.g. Ultrasonography"
                                />
                                <datalist id="categories-list">
                                    {allKnownCategories.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Sub Category</label>
                                <input
                                    list="subcategories-list"
                                    value={currentTemplate.subCategory}
                                    onChange={e => setCurrentTemplate(prev => ({...prev, subCategory: e.target.value}))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                    placeholder="e.g. Pregnancy"
                                />
                                <datalist id="subcategories-list">
                                    {allKnownSubCategories.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Template Name (File Name)</label>
                                <input
                                    value={currentTemplate.templateName}
                                    onChange={e => setCurrentTemplate(prev => ({...prev, templateName: e.target.value}))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                    placeholder="e.g. Normal Pregnancy"
                                />
                            </div>
                        </div>

                        <div className="mt-auto space-y-2 pt-4">
                            <button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"><SaveIcon size={14}/> Save Template</button>
                            <button onClick={() => setIsEditing(false)} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase py-3 rounded-xl shadow-sm transition-all">Cancel</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col p-4 bg-slate-200 overflow-hidden min-h-0">
                        <div className="bg-white flex-1 shadow-xl rounded-xl overflow-hidden flex flex-col">
                            <div className="bg-slate-800 text-white p-2 text-center text-[10px] font-black uppercase tracking-widest">Document Editor</div>
                            <div className="flex-1 relative min-h-0">
                                <RichTextEditor 
                                    value={currentTemplate.contentHtml} 
                                    onChange={(val: string) => setCurrentTemplate(prev => ({...prev, contentHtml: val}))} 
                                    minHeight="100%"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex overflow-hidden min-h-0">
                    <div className="w-[250px] shrink-0 bg-white border-r shadow-sm p-4 flex flex-col">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">Filters</h3>
                        
                        <div className="space-y-4">
                            <input
                                placeholder="Search templates..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                            />
                            
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Category</label>
                                <select 
                                    value={selectedCategoryFilter} 
                                    onChange={e => { setSelectedCategoryFilter(e.target.value); setSelectedSubCategoryFilter('All'); }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                                >
                                    <option value="All">All Categories</option>
                                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            
                            {selectedCategoryFilter !== 'All' && uniqueSubCategories.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Sub Category</label>
                                    <select 
                                        value={selectedSubCategoryFilter} 
                                        onChange={e => setSelectedSubCategoryFilter(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                                    >
                                        <option value="All">All Sub Categories</option>
                                        {uniqueSubCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTemplates.map(t => (
                                <div key={t.id} className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all border border-slate-200 group flex flex-col relative overflow-hidden">
                                    <div className="mb-4">
                                        <div className="flex gap-1 flex-wrap">
                                            <span className="text-[9px] font-black px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full uppercase tracking-widest">{t.category}</span>
                                            <span className="text-[9px] font-black px-2 py-1 bg-slate-100 text-slate-600 rounded-full uppercase tracking-widest">{t.subCategory}</span>
                                        </div>
                                        <h4 className="font-black text-slate-800 text-lg mt-3 leading-tight group-hover:text-blue-600 transition-colors">{t.templateName}</h4>
                                    </div>
                                    <div className="mt-auto flex gap-2 pt-4">
                                        <button onClick={() => editTemplate(t)} className="flex-1 py-2 bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-600 transition-all shadow-md">Edit</button>
                                        <button onClick={() => { if(confirm("Delete this template?")) { 
    const updated = templates.filter(x=>x.id!==t.id); 
    setTemplates(updated); 
    if(performBlockingSync) performBlockingSync({ rtTemplates: updated }); 
} }} className="px-3 py-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all font-black text-sm">×</button>
                                    </div>
                                </div>
                            ))}
                            
                            <div onClick={() => { resetForm(); setIsEditing(true); }} className="bg-transparent p-6 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-blue-400 transition-all group min-h-[160px]">
                                <div className="p-3 bg-white rounded-full shadow-md group-hover:bg-blue-600 transition-all"><PlusIcon className="text-slate-400 group-hover:text-white" size={24} /></div>
                                <p className="mt-3 text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-600">New Template</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateManagementPage;
