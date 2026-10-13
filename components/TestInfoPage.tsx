
import React, { useState, useEffect, useMemo } from 'react';
import { Reagent, Test, emptyTest, testCategories, SubTest } from './DiagnosticData';
import { PlusIcon, SaveIcon, SearchIcon } from './Icons';
import SearchableSelect from './SearchableSelect';
import { dbService, normalizeTestItem } from '../dbService';

interface Props {
    reagents: Reagent[];
    tests: Test[];
    setTests: React.Dispatch<React.SetStateAction<Test[]>>;
    isEmbedded?: boolean;
    onClose?: () => void;
    onSaveAndSelect?: (id: string, name: string, testObj?: Test) => void;
    performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

const TestInfoPage: React.FC<Props> = ({ reagents, tests, setTests, isEmbedded = false, onClose, onSaveAndSelect, performBlockingSync }) => {
  const [formData, setFormData] = useState<Test>(emptyTest);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('All');
  const [successMessage, setSuccessMessage] = useState('');
  const [isReloading, setIsReloading] = useState(false);
  const [isRestoringNcdState, setIsRestoringNcdState] = useState(false);
  const [restoreProgressMsg, setRestoreProgressMsg] = useState('');

  const [tempSubTests, setTempSubTests] = useState<SubTest[]>([]);

  // Dynamically include any custom categories discovered from loaded tests
  const allCategories = useMemo(() => {
    const safeTests = Array.isArray(tests) ? tests : [];
    const customCats = safeTests.map(t => String(t?.category || '').trim()).filter(Boolean);
    const set = new Set(['All', ...testCategories, ...customCats]);
    return Array.from(set);
  }, [tests]);

  // Generate unique test ID
  const generateNewTestId = React.useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `TEST-${dateStr}-`;
    
    const safeTests = Array.isArray(tests) ? tests : [];
    let maxCounter = 0;
    safeTests.forEach(t => {
      const tid = String(t?.test_id || '');
      if (tid && tid.startsWith(prefix)) {
        const numPart = tid.replace(prefix, '');
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxCounter) {
          maxCounter = num;
        }
      }
    });
    
    const nextCount = maxCounter > 0 ? maxCounter + 1 : safeTests.length + 1;
    return `${prefix}${String(nextCount).padStart(3, '0')}`;
  }, [tests]);

  useEffect(() => {
    if (!isEditing && !formData.test_id) {
      const newId = generateNewTestId();
      setFormData(prev => ({ ...prev, test_id: newId }));
    }
  }, [isEditing, formData.test_id, generateNewTestId]);

  useEffect(() => {
    if (successMessage) {
        const timer = setTimeout(() => setSuccessMessage(''), 4000);
        return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const filteredTests = useMemo(() => {
    if (!Array.isArray(tests)) return [];
    return tests.filter(test => {
      if (!test) return false;
      const testName = String(test.test_name || '').toLowerCase();
      const testId = String(test.test_id || '').toLowerCase();
      const cleanSearch = (searchTerm || '').trim().toLowerCase();
      const matchesSearch = !cleanSearch || testName.includes(cleanSearch) || testId.includes(cleanSearch);
      
      const testCat = String(test.category || '').trim();
      const matchesCategory = selectedFilterCategory === 'All' || 
        testCat.toLowerCase() === selectedFilterCategory.toLowerCase() ||
        (selectedFilterCategory === 'Others' && !testCategories.some(c => c.toLowerCase() === testCat.toLowerCase()));
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, tests, selectedFilterCategory]);

  const getCategoryCount = (cat: string) => {
    const safeTests = Array.isArray(tests) ? tests : [];
    if (cat === 'All') return safeTests.length;
    return safeTests.filter(t => {
      if (!t) return false;
      const testCat = String(t.category || '').trim();
      if (cat === 'Others') {
        return testCat.toLowerCase() === 'others' || !testCategories.some(c => c.toLowerCase() === testCat.toLowerCase());
      }
      return testCat.toLowerCase() === cat.toLowerCase();
    }).length;
  };

  const handleReloadFromCloud = async () => {
    setIsReloading(true);
    try {
      const directTests = await dbService.loadTestsDirectly();
      if (directTests && directTests.length > 0) {
        setTests(directTests);
        if (performBlockingSync) {
          await performBlockingSync({ tests: directTests });
        }
        setSuccessMessage(`সফলভাবে ক্লাউড ডাটাবেজ (test/tests টেবিল) থেকে ${directTests.length}টি টেস্ট লোড হয়েছে!`);
      } else {
        const fullCloud = await dbService.loadFromCloud();
        if (fullCloud && Array.isArray(fullCloud.tests) && fullCloud.tests.length > 0) {
          setTests(fullCloud.tests);
          if (performBlockingSync) {
            await performBlockingSync({ tests: fullCloud.tests });
          }
          setSuccessMessage(`সফলভাবে ক্লাউড থেকে ${fullCloud.tests.length}টি টেস্ট লোড হয়েছে!`);
        } else {
          alert("ডাটাবেজ থেকে কোনো টেস্ট পাওয়া যায়নি। অনুগ্রহ করে আপনার Supabase ক্লাউডে 'test' বা 'tests' টেবিলটি আছে কিনা এবং সেটিংস এ কানেকশন ঠিক আছে কিনা যাচাই করুন।");
        }
      }
    } catch (e: any) {
      console.error("Reload tests error:", e);
      alert("টেস্ট ডাটা লোড করতে ব্যর্থ: " + (e?.message || e));
    } finally {
      setIsReloading(false);
    }
  };

  const handleRestoreFromNcdState = async () => {
    if (!window.confirm("আপনি কি পুরাতন ncd_state টেবিল (জানুয়ারি-জুলাই ২০২৬) থেকে টেস্টের আসল কমিশন ও সার্ভিস প্রাইজ নতুন পৃথক টেবিলে রিস্টোর করতে চান?")) {
      return;
    }
    setIsRestoringNcdState(true);
    setRestoreProgressMsg('শুরু হচ্ছে...');
    try {
      const res = await dbService.migrateTestsFromNcdStateToModular((msg, pct) => {
        setRestoreProgressMsg(`${msg} (${pct}%)`);
      });

      if (res.success) {
        if (Array.isArray(res.tests) && res.tests.length > 0) {
          setTests(res.tests);
        }
        if (performBlockingSync) {
          await performBlockingSync({ tests: res.tests });
        }
        setSuccessMessage(`✓ ${res.message}`);
      } else {
        alert(res.message);
      }
    } catch (e: any) {
      console.error("Restore from ncd_state error:", e);
      alert("রিস্টোর ব্যর্থ: " + (e?.message || e));
    } finally {
      setIsRestoringNcdState(false);
      setRestoreProgressMsg('');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setTempSubTests(formData.sub_tests || []);
    }, 0);
    return () => clearTimeout(timer);
  }, [formData.test_id, formData.sub_tests]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? 0 : parseFloat(value) || 0 }));
    } else if (name === 'is_group_test') {
      setFormData(prev => ({ ...prev, is_group_test: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addSubTestRow = () => {
    const newSub: SubTest = { id: Date.now().toString(), name: '', unit: '', normal_range: '' };
    setTempSubTests([...tempSubTests, newSub]);
  };

  const updateSubTest = (id: string, field: keyof SubTest, val: string) => {
    setTempSubTests(tempSubTests.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const removeSubTest = (id: string) => {
    setTempSubTests(tempSubTests.filter(s => s.id !== id));
  };

  const reagentOptions = reagents.map(r => ({
    id: r.reagent_name,
    name: r.reagent_name,
    details: r.unit
  }));

  const resetForm = () => {
    const newId = generateNewTestId();
    setFormData({ ...emptyTest, test_id: newId });
    setSelectedTestId(null);
    setIsEditing(false);
    setTempSubTests([]);
  };

  const handleGetNewId = () => {
    const newId = generateNewTestId();
    setFormData(prev => ({ ...prev, test_id: newId }));
    setIsEditing(false);
    setSelectedTestId(null);
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalId = formData.test_id?.trim() || generateNewTestId();
    const testName = formData.test_name?.trim();
    const category = formData.category?.trim();

    if (!testName || !category) {
      alert("অনুগ্রহ করে টেস্টের নাম এবং ক্যাটাগরি পূরণ করুন।");
      return;
    }

    const finalTest: Test = { 
      ...formData, 
      test_id: finalId,
      test_name: testName,
      category: category,
      price: Number(formData.price) || 0,
      test_commission: Number(formData.test_commission) || 0,
      usg_exam_charge: Number(formData.usg_exam_charge) || 0,
      extra_lab_fee: Number(formData.extra_lab_fee) || 0,
      sub_tests: formData.is_group_test ? tempSubTests : [] 
    };
    
    let newTests: Test[];
    if (isEditing) {
      newTests = tests.map(t => t.test_id === finalTest.test_id ? finalTest : t);
    } else {
      newTests = [finalTest, ...tests];
    }

    if (performBlockingSync) {
      const success = await performBlockingSync({ tests: newTests });
      if (!success) return;
    }

    setTests(newTests);
    
    if (isEmbedded && onSaveAndSelect) {
      onSaveAndSelect(finalTest.test_id, finalTest.test_name, finalTest);
    }

    setSuccessMessage('টেস্ট ডাটা সফলভাবে সেভ করা হয়েছে!');
    
    if (isEmbedded && onClose) {
      setTimeout(() => onClose(), 800); 
    } else {
      resetForm();
    }
  };

  const handleRowClick = (test: Test) => {
    setFormData(test);
    setSelectedTestId(test.test_id);
    setIsEditing(true);
  };

  const handleDeleteTest = async () => {
    if (!formData.test_id) return;
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${formData.test_name || formData.test_id}" টেস্টটি তালিকা থেকে মুছে ফেলতে চান?`)) return;
    const newTests = tests.filter(t => String(t.test_id) !== String(formData.test_id));
    setTests(newTests);
    if (performBlockingSync) {
      await performBlockingSync({ tests: newTests });
    }
    setSuccessMessage('টেস্টটি সফলভাবে মুছে ফেলা হয়েছে!');
    resetForm();
  };

  const inputBaseClasses = "py-2 px-3 mt-1 block w-full border border-sky-800 rounded-md shadow-sm sm:text-sm bg-sky-900/50 text-sky-200 placeholder-sky-400 focus:bg-sky-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";
  const labelBaseClasses = "block text-xs font-black text-sky-400 uppercase tracking-widest ml-1";

  return (
    <div className="bg-slate-900 text-slate-200 rounded-xl p-4 sm:p-6 space-y-8 relative">
        {/* Updated Success Message - Positioned at bottom, high z-index, 3s auto-hide */}
        {successMessage && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 border-2 border-white text-white px-12 py-5 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.7)] animate-fade-in-up font-black flex items-center gap-4 text-lg">
                <div className="bg-white text-emerald-600 rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg">✓</div>
                {successMessage}
            </div>
        )}
        
        <div className="bg-sky-950 rounded-[2.5rem] p-8 border border-sky-800 shadow-2xl">
            <h2 className="text-3xl font-black text-sky-100 mb-8 border-b border-sky-800 pb-4 uppercase tracking-tighter">Diagnostic Test Configuration</h2>
            
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-800 pb-6 mb-8">
                <div className="flex items-center gap-3">
                    <label className="font-black text-xs text-sky-500 uppercase tracking-widest">Master ID:</label>
                    <input type="text" disabled value={formData.test_id} className="w-44 border border-sky-800 rounded-xl shadow-inner px-4 py-2 bg-slate-900 text-sky-400 font-mono text-sm cursor-not-allowed" placeholder="AUTO-ID" />
                    <button type="button" onClick={handleGetNewId} className="px-5 py-2.5 text-xs font-black text-white bg-blue-600 rounded-xl hover:bg-blue-500 shadow-lg active:scale-95 transition-all uppercase tracking-widest">Get New ID</button>
                </div>
                <div className="flex items-center gap-3">
                    <button type="submit" form="test-form" className="px-10 py-2.5 text-xs font-black text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 shadow-xl active:scale-95 transition-all uppercase tracking-widest">Save Test</button>
                    {isEditing && (
                      <button 
                        type="button" 
                        onClick={handleDeleteTest}
                        className="px-6 py-2.5 text-xs font-black text-white bg-rose-700 hover:bg-rose-600 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest"
                      >
                        Delete
                      </button>
                    )}
                    <button type="button" onClick={resetForm} className="px-6 py-2.5 text-xs font-black text-sky-200 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all uppercase tracking-widest">
                        {isEmbedded ? 'Discard & Close' : 'Cancel'}
                    </button>
                    {isEmbedded && (
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-6 py-2.5 text-xs font-black text-white bg-rose-600 rounded-xl hover:bg-rose-500 shadow-lg transition-all uppercase tracking-widest"
                        >
                            Quick Close
                        </button>
                    )}
                </div>
            </div>

            <form id="test-form" onSubmit={handleSaveTest} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-2">
                        <label className={labelBaseClasses}>Test Name / Group Name</label>
                        <input type="text" name="test_name" value={formData.test_name} onChange={handleInputChange} required className={inputBaseClasses} placeholder="e.g. Lipid Profile or CBC"/>
                    </div>
                    <div>
                        <label className={labelBaseClasses}>Category</label>
                        <select name="category" value={formData.category} onChange={handleInputChange} required className={inputBaseClasses}>
                            <option value="" disabled hidden>Select Category</option>
                            {allCategories.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center justify-center bg-slate-900/50 rounded-2xl border border-sky-800 p-2 mt-4">
                        <input id="is_group" name="is_group_test" type="checkbox" checked={formData.is_group_test} onChange={handleInputChange} className="h-5 w-5 text-blue-600 bg-slate-800 border-sky-700 rounded focus:ring-blue-500" />
                        <label htmlFor="is_group" className="ml-3 text-sm font-black text-sky-200 uppercase tracking-widest cursor-pointer">Group / Panel Test?</label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className={labelBaseClasses}>Service Price (BDT)</label>
                        <input type="number" name="price" value={formData.price} onChange={handleInputChange} required min="0" className={inputBaseClasses} />
                    </div>
                    <div>
                        <label className={labelBaseClasses}>Commission (PC)</label>
                        <input type="number" name="test_commission" value={formData.test_commission} onChange={handleInputChange} min="0" className={inputBaseClasses} />
                    </div>
                    <div>
                        <label className={labelBaseClasses}>USG Exam Charge (সোনোগ্রাফার ফি)</label>
                        <input type="number" name="usg_exam_charge" value={formData.usg_exam_charge} onChange={handleInputChange} min="0" className={inputBaseClasses} placeholder="ফি পরিমাণ লিখুন"/>
                    </div>
                    <div>
                        <label className={labelBaseClasses}>Extra Lab Fee (প্যাথলজি এক্সট্রা ফি)</label>
                        <input type="number" name="extra_lab_fee" value={formData.extra_lab_fee || 0} onChange={handleInputChange} min="0" className={inputBaseClasses} placeholder="ফি পরিমাণ লিখুন"/>
                    </div>

                    <div className="md:col-span-2 bg-slate-900 border border-emerald-900/30 p-5 rounded-2xl">
                        <label className="text-xs font-black uppercase text-slate-500 mb-4 block">Reagents / X-Ray Films Required Per Test</label>
                        <div className="space-y-3">
                            {(formData.reagents_required || []).map((req, idx) => (
                                <div key={idx} className="flex gap-3 items-center">
                                    <div className="flex-1">
                                        <SearchableSelect 
                                            label=""
                                            options={reagentOptions}
                                            value={req.reagent_id} 
                                            onChange={id => {
                                                const newReq = [...(formData.reagents_required || [])];
                                                newReq[idx].reagent_id = id;
                                                setFormData({ ...formData, reagents_required: newReq });
                                            }}
                                            placeholder="-- Select Reagent / Film --"
                                            theme="dark"
                                        />
                                    </div>
                                    <input 
                                        type="number" 
                                        placeholder="Qty" 
                                        value={req.quantity_per_test || ''} 
                                        onChange={e => {
                                            const newReq = [...(formData.reagents_required || [])];
                                            newReq[idx].quantity_per_test = parseFloat(e.target.value) || 0;
                                            setFormData({ ...formData, reagents_required: newReq });
                                        }}
                                        className="w-24 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm text-center outline-none focus:border-emerald-500" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const newReq = [...(formData.reagents_required || [])];
                                            newReq.splice(idx, 1);
                                            setFormData({ ...formData, reagents_required: newReq });
                                        }}
                                        className="text-rose-500 font-bold px-2 hover:text-rose-400"
                                    >×</button>
                                </div>
                            ))}
                            <button 
                                type="button" 
                                onClick={() => setFormData({ ...formData, reagents_required: [...(formData.reagents_required || []), { reagent_id: '', quantity_per_test: 1 }] })}
                                className="text-emerald-500 text-xs font-black uppercase hover:text-emerald-400 transition-colors"
                            >+ Add Resource Configuration</button>
                        </div>
                    </div>

                    {!formData.is_group_test && (
                        <>
                            <div>
                                <label className={labelBaseClasses}>Normal Range</label>
                                <input type="text" name="normal_range" value={formData.normal_range} onChange={handleInputChange} className={inputBaseClasses} placeholder="e.g. 70 - 110"/>
                            </div>
                        </>
                    )}
                </div>

                {formData.is_group_test && (
                    <div className="bg-slate-900/50 rounded-[2rem] p-6 border-2 border-dashed border-sky-800 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-sky-300 uppercase tracking-tighter font-bengali">সাব-টেস্ট তালিকা (Parameters for Group Report)</h3>
                            <button type="button" onClick={addSubTestRow} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-all"><PlusIcon size={14}/> Add Parameter</button>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-sky-900 shadow-inner">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-800 text-[10px] uppercase font-black text-sky-500 tracking-widest">
                                    <tr><th className="p-3">Parameter Name</th><th className="p-3">Unit</th><th className="p-3">Normal Range</th><th className="p-3 text-center w-20">Remove</th></tr>
                                </thead>
                                <tbody className="divide-y divide-sky-900/30">
                                    {tempSubTests.map((sub) => (
                                        <tr key={sub.id} className="bg-slate-950/20">
                                            <td className="p-2"><input value={sub.name} onChange={e=>updateSubTest(sub.id, 'name', e.target.value)} className="w-full bg-slate-900 border border-sky-900 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="e.g. S. Cholesterol" /></td>
                                            <td className="p-2"><input value={sub.unit} onChange={e=>updateSubTest(sub.id, 'unit', e.target.value)} className="w-full bg-slate-900 border border-sky-900 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="mg/dL" /></td>
                                            <td className="p-2"><input value={sub.normal_range} onChange={e=>updateSubTest(sub.id, 'normal_range', e.target.value)} className="w-full bg-slate-900 border border-sky-900 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="< 200" /></td>
                                            <td className="p-2 text-center"><button type="button" onClick={()=>removeSubTest(sub.id)} className="text-red-500 font-bold">×</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </form>
        </div>
      
        <div className="bg-slate-800 rounded-[2.5rem] border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 bg-slate-900/80 border-b border-slate-700 flex flex-col gap-6">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Test Master Library</h3>
                        <span className="bg-sky-900/60 border border-sky-600/40 text-sky-300 text-xs px-3 py-1 rounded-full font-bold">
                            মোট: {Array.isArray(tests) ? tests.length : 0}টি টেস্ট
                        </span>
                        <button
                            type="button"
                            onClick={handleReloadFromCloud}
                            disabled={isReloading || isRestoringNcdState}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95 disabled:opacity-50"
                            title="ক্লাউড ডাটাবেজ (test/tests টেবিল) থেকে টেস্ট লোড করুন"
                        >
                            <span className={isReloading ? "animate-spin" : ""}>🔄</span> {isReloading ? 'লোড হচ্ছে...' : 'Reload from Cloud'}
                        </button>
                        <button
                            type="button"
                            onClick={handleRestoreFromNcdState}
                            disabled={isRestoringNcdState || isReloading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95 disabled:opacity-50"
                            title="পুরাতন ncd_state টেবিল (জানুয়ারি-জুলাই ২০২৬) থেকে টেস্ট ও আসল কমিশন রিস্টোর করুন"
                        >
                            <span className={isRestoringNcdState ? "animate-spin" : ""}>💎</span> {isRestoringNcdState ? (restoreProgressMsg || 'রিস্টোর চলছে...') : 'ncd_state থেকে কমিশন ও টেস্ট রিস্টোর'}
                        </button>
                    </div>
                    <div className="relative w-80">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input type="text" placeholder="Quick search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-full py-2.5 pl-12 pr-6 text-sm text-white focus:border-blue-500 outline-none shadow-inner font-medium"/>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {allCategories.map(cat => (
                        <button key={cat} onClick={() => setSelectedFilterCategory(cat)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectedFilterCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'}`}>
                            {cat} <span className={`px-2 py-0.5 rounded-full text-[9px] ${selectedFilterCategory === cat ? 'bg-blue-400 text-blue-900' : 'bg-slate-900 text-slate-600'}`}>{getCategoryCount(cat)}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-700/50 text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]">
                        <tr><th className="px-8 py-5 text-left">Master ID</th><th className="px-8 py-5 text-left">Investigation</th><th className="px-8 py-5 text-left">Dept</th><th className="px-8 py-5 text-center">Protocol</th><th className="px-8 py-5 text-right">Price</th><th className="px-8 py-5 text-right">PC</th><th className="px-8 py-5 text-right">USG Fee</th><th className="px-8 py-5 text-right">Lab Fee</th></tr>
                    </thead>
                    <tbody className="bg-slate-800 divide-y divide-slate-700/50">
                        {filteredTests.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <span className="text-3xl">🧪</span>
                                        <p className="text-base font-bold text-slate-300">কোনো টেস্ট পাওয়া যায়নি</p>
                                        <p className="text-xs text-slate-500 max-w-md">
                                            আপনার Supabase ক্লাউড ডাটাবেজে <code className="text-sky-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">test</code> বা <code className="text-sky-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">tests</code> টেবিলে ডাটা থাকলে নিচের বাটনে ক্লিক করে সাথে সাথে লোড করুন।
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleReloadFromCloud}
                                            disabled={isReloading}
                                            className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95"
                                        >
                                            {isReloading ? 'ডাটা লোড হচ্ছে...' : '🔄 এখনই ডাটাবেজ থেকে লোড করুন'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredTests.map((test) => (
                            <tr key={test.test_id} onClick={() => handleRowClick(test)} className={`cursor-pointer hover:bg-blue-900/20 transition-all group ${selectedTestId === test.test_id ? 'bg-blue-900/40' : ''}`}>
                                <td className="px-8 py-5 text-xs text-sky-400 font-mono">{test.test_id}</td>
                                <td className="px-8 py-5"><div className="text-sm text-slate-200 font-black">{test.test_name}</div></td>
                                <td className="px-8 py-5 text-xs text-slate-400 font-bold">{test.category}</td>
                                <td className="px-8 py-5 text-center"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border ${test.is_group_test ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 'bg-blue-900/30 text-blue-400 border-blue-800'}`}>{test.is_group_test ? 'Group' : 'Single'}</span></td>
                                <td className="px-8 py-5 text-lg text-white font-black text-right">৳{Number(test.price || 0).toFixed(2)}</td>
                                <td className="px-8 py-5 text-sm text-slate-400 text-right font-bold">৳{Number(test.test_commission || 0).toFixed(2)}</td>
                                <td className="px-8 py-5 text-sm text-amber-400 text-right font-bold">৳{Number(test.usg_exam_charge || 0).toFixed(2)}</td>
                                <td className="px-8 py-5 text-sm text-emerald-400 text-right font-bold">৳{Number(test.extra_lab_fee || 0).toFixed(2)}</td>
                            </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default TestInfoPage;
