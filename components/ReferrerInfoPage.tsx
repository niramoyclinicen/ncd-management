import React, { useState, useEffect, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import { Referrar, emptyReferrar } from './DiagnosticData';
import MobileNumberInput from './MobileNumberInput';
import { 
    Search, MapPin, Users, Phone, PlusCircle, Edit3, Trash2, Filter,
    Info, User, GraduationCap, Building2, QrCode, Download, Printer,
    CheckCircle, X, Sparkles, RefreshCw, Copy, ExternalLink, FileSpreadsheet
} from 'lucide-react';

interface ReferrarInfoPageProps {
  referrars: Referrar[];
  setReferrars: React.Dispatch<React.SetStateAction<Referrar[]>>;
  isEmbedded?: boolean;
  onClose?: () => void;
  onSaveAndSelect?: (id: string, name: string) => void;
  performBlockingSync?: (overrides?: any) => Promise<boolean>;
}

export const ReferrarInfoPage: React.FC<ReferrarInfoPageProps> = ({ 
    referrars = [], 
    setReferrars, 
    isEmbedded = false, 
    onClose, 
    onSaveAndSelect,
    performBlockingSync
}) => {
    const [formData, setFormData] = useState<Referrar>(emptyReferrar);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    
    // Separate filter states as explicitly requested by user:
    // 1. এরিয়া ফিল্টার
    // 2. রেফারার নাম সার্চ
    // 3. মোবাইল নম্বর সার্চ
    const [nameSearch, setNameSearch] = useState('');
    const [mobileSearch, setMobileSearch] = useState('');
    const [areaFilter, setAreaFilter] = useState('All');
    
    const [mobileError, setMobileError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [copiedId, setCopiedId] = useState(false);

    // Doctor QR Code Modal state
    const [qrModalDoctor, setQrModalDoctor] = useState<Referrar | null>(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

    // ID Generator function - produces a clean standard ID
    const handleGetNewId = useCallback(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        const safeReferrars = Array.isArray(referrars) ? referrars : [];
        const prefix = `REF-${year}${month}${day}`;
        const referrarsTodayCount = safeReferrars.filter(r => r && r.ref_id && r.ref_id.startsWith(prefix)).length;
        const newSerial = String(referrarsTodayCount + 1).padStart(3, '0');
        
        const newId = `${prefix}-${newSerial}`;
        setFormData(prev => ({
            ...emptyReferrar,
            ref_id: newId
        }));
        setIsEditing(false);
        setMobileError('');
    }, [referrars]);

    useEffect(() => {
        if (!formData.ref_id) {
            handleGetNewId();
        }
    }, [formData.ref_id, handleGetNewId]);

    // Unique areas list for area filter dropdown
    const uniqueAreas = useMemo(() => {
        const areas = new Set<string>();
        const safeReferrars = Array.isArray(referrars) ? referrars : [];
        safeReferrars.forEach(r => {
            if (r && r.area && r.area.trim()) {
                areas.add(r.area.trim());
            }
        });
        return Array.from(areas).sort();
    }, [referrars]);

    // Filtered referrers matching name search, mobile search, and area filter
    const filteredReferrars = useMemo(() => {
        const safeReferrars = Array.isArray(referrars) ? referrars : [];
        return safeReferrars.filter(ref => {
            if (!ref) return false;

            // Name filter
            const matchesName = !nameSearch.trim() || 
                (ref.ref_name || '').toLowerCase().includes(nameSearch.trim().toLowerCase()) ||
                (ref.ref_degrees || '').toLowerCase().includes(nameSearch.trim().toLowerCase());

            // Mobile filter
            const cleanSearchMobile = mobileSearch.replace(/\D/g, '');
            const cleanRefMobile = (ref.ref_mobile || '').replace(/\D/g, '');
            const matchesMobile = !cleanSearchMobile || cleanRefMobile.includes(cleanSearchMobile);

            // Area filter
            const matchesArea = areaFilter === 'All' || (ref.area || '').trim() === areaFilter;

            return matchesName && matchesMobile && matchesArea;
        });
    }, [nameSearch, mobileSearch, areaFilter, referrars]);

    // Statistics for the summary bar (matches the uploaded sample image)
    const stats = useMemo(() => {
        const safeReferrars = Array.isArray(referrars) ? referrars : [];
        const total = safeReferrars.length;
        const withMobile = safeReferrars.filter(r => r.ref_mobile && r.ref_mobile.trim()).length;
        const males = safeReferrars.filter(r => r.ref_gender === 'Male' || r.ref_gender === 'পুরুষ').length;
        const females = safeReferrars.filter(r => r.ref_gender === 'Female' || r.ref_gender === 'মহিলা').length;
        return { total, withMobile, males, females, areaCount: uniqueAreas.length };
    }, [referrars, uniqueAreas]);

    // Handle form input changes with auto-formatting for mobile number
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'ref_mobile') {
            setMobileError('');
            const digits = value.replace(/\D/g, '').slice(0, 11);
            let formatted = digits;
            if (digits.length >= 5) formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
            setFormData(prev => ({ ...prev, ref_mobile: formatted }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Save referrer (new or edit)
    const handleSaveReferrar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.ref_id || !formData.ref_name.trim()) {
            alert('রেফারার আইডি এবং নাম আবশ্যক (Required)।');
            return;
        }

        const rawMobile = (formData.ref_mobile || '').replace(/\D/g, '');
        if (formData.ref_mobile && (rawMobile.length !== 11 || !rawMobile.startsWith('01'))) {
            setMobileError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712-345678)');
            return;
        }

        setIsSaving(true);
        setSuccessMessage('রেফারার সংরক্ষণ করা হচ্ছে...');
        let newReferrars: Referrar[];
        if (isEditing) {
            newReferrars = referrars.map(r => r.ref_id === formData.ref_id ? formData : r);
        } else {
            newReferrars = [formData, ...referrars];
        }

        if (performBlockingSync) {
            const success = await performBlockingSync({ referrars: newReferrars });
            if (!success) {
                setIsSaving(false);
                setSuccessMessage('সিঙ্ক ত্রুটি: ক্লাউডে সেভ হয়নি। আবার চেষ্টা করুন।');
                return;
            }
        }

        setReferrars(newReferrars);
        setIsSaving(false);
        setSuccessMessage('সফলভাবে রেফারার তথ্য সংরক্ষিত হয়েছে!');

        if (onSaveAndSelect) {
            onSaveAndSelect(formData.ref_id, formData.ref_name);
        }
        if (onClose) {
            setTimeout(() => onClose(), 600);
        } else {
            // Reset for next entry
            setTimeout(() => {
                handleGetNewId();
                setSuccessMessage('');
            }, 1800);
        }
    };

    // Delete a referrer
    const handleDeleteReferrar = async (ref: Referrar) => {
        if (!window.confirm(`আপনি কি "${ref.ref_name}" (ID: ${ref.ref_id})-কে মুছে ফেলতে নিশ্চিত?`)) {
            return;
        }
        const updated = referrars.filter(r => r.ref_id !== ref.ref_id);
        if (performBlockingSync) {
            await performBlockingSync({ referrars: updated });
        }
        setReferrars(updated);
        if (formData.ref_id === ref.ref_id) {
            handleGetNewId();
        }
    };

    // Open Doctor QR Code Modal
    const handleOpenDoctorQr = async (ref: Referrar) => {
        setQrModalDoctor(ref);
        try {
            // Encode clean vCard or profile payload
            const qrPayload = [
                `DOCTOR / REFERRER ID: ${ref.ref_id}`,
                `NAME: ${ref.ref_name}`,
                ref.ref_degrees ? `DEGREE: ${ref.ref_degrees}` : '',
                ref.ref_mobile ? `MOBILE: ${ref.ref_mobile}` : '',
                ref.area ? `AREA: ${ref.area}` : '',
                ref.address ? `CHAMBER: ${ref.address}` : '',
                `CLINIC: Niramoy Clinic & Diagnostic`
            ].filter(Boolean).join('\n');

            const url = await QRCode.toDataURL(qrPayload, {
                width: 320,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                }
            });
            setQrCodeDataUrl(url);
        } catch (err) {
            console.error('Failed to generate QR code:', err);
        }
    };

    // Download QR Code PNG
    const handleDownloadQr = () => {
        if (!qrCodeDataUrl || !qrModalDoctor) return;
        const link = document.createElement('a');
        link.download = `QR_${qrModalDoctor.ref_name.replace(/\s+/g, '_')}_${qrModalDoctor.ref_id}.png`;
        link.href = qrCodeDataUrl;
        link.click();
    };

    // Print QR Badge
    const handlePrintQrBadge = () => {
        if (!qrModalDoctor) return;
        const printWindow = window.open('', '_blank', 'width=600,height=700');
        if (!printWindow) {
            alert('পপআপ ব্লক করা হয়েছে। অনুগ্রহ করে ব্রাউজার সেটিংস থেকে পপআপ অ্যালাউ করুন।');
            return;
        }
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Doctor QR Badge - ${qrModalDoctor.ref_name}</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        padding: 30px;
                        background: #fff;
                        color: #1e293b;
                        display: flex;
                        justify-content: center;
                    }
                    .badge-card {
                        width: 380px;
                        border: 2px solid #0284c7;
                        border-radius: 16px;
                        padding: 24px;
                        text-align: center;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    .clinic-name {
                        font-size: 18px;
                        font-weight: 800;
                        color: #0369a1;
                        margin-bottom: 2px;
                        text-transform: uppercase;
                    }
                    .clinic-sub {
                        font-size: 11px;
                        color: #64748b;
                        margin-bottom: 16px;
                    }
                    .qr-image {
                        width: 200px;
                        height: 200px;
                        margin: 0 auto 16px auto;
                        display: block;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 8px;
                    }
                    .doc-name {
                        font-size: 17px;
                        font-weight: 700;
                        color: #0f172a;
                        margin-bottom: 4px;
                    }
                    .doc-degree {
                        font-size: 13px;
                        color: #0284c7;
                        font-weight: 600;
                        margin-bottom: 8px;
                    }
                    .id-pill {
                        display: inline-block;
                        background: #f0f9ff;
                        color: #0369a1;
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-family: monospace;
                        font-weight: 700;
                        font-size: 12px;
                        border: 1px solid #bae6fd;
                        margin-bottom: 8px;
                    }
                    .doc-meta {
                        font-size: 12px;
                        color: #475569;
                        margin-top: 4px;
                    }
                    @media print {
                        body { padding: 0; }
                        .badge-card { box-shadow: none; border-color: #000; }
                    }
                </style>
            </head>
            <body>
                <div class="badge-card">
                    <div class="clinic-name">Niramoy Clinic & Diagnostic</div>
                    <div class="clinic-sub">Referrer Doctor Digital Identity</div>
                    <img src="${qrCodeDataUrl}" class="qr-image" alt="Doctor QR Code" />
                    <div class="doc-name">${qrModalDoctor.ref_name}</div>
                    ${qrModalDoctor.ref_degrees ? `<div class="doc-degree">${qrModalDoctor.ref_degrees}</div>` : ''}
                    <div class="id-pill">ID: ${qrModalDoctor.ref_id}</div>
                    ${qrModalDoctor.ref_mobile ? `<div class="doc-meta">📞 ${qrModalDoctor.ref_mobile}</div>` : ''}
                    ${qrModalDoctor.area ? `<div class="doc-meta">📍 ${qrModalDoctor.area}</div>` : ''}
                    ${qrModalDoctor.address ? `<div class="doc-meta">🏥 ${qrModalDoctor.address}</div>` : ''}
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Copy Referral ID helper
    const handleCopyId = () => {
        if (!formData.ref_id) return;
        navigator.clipboard.writeText(formData.ref_id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    return (
        <div className={`space-y-6 ${isEmbedded ? 'p-2' : 'p-4 md:p-6 bg-slate-950 min-h-screen text-slate-100'}`}>
            
            {/* Success toast notification */}
            {successMessage && (
                <div className="fixed bottom-6 right-6 z-[99999] bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-semibold text-sm animate-fade-in-up">
                    <CheckCircle className="w-5 h-5 text-emerald-200" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* ==============================================================
                SECTION 1: REFERRER ENTRY FORM CARD
                ============================================================== */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden transition-all">
                
                {/* Form Top Header: Compact Referral ID row (not stretched across the whole screen) */}
                <div className="bg-slate-800/80 border-b border-slate-700/80 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                    
                    {/* Left: Section Title with mode indicator */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-900/40">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-white tracking-wide">
                                    রেফারার প্রোফাইল এন্ট্রি (Referrer Profile Entry)
                                </h2>
                                {isEditing ? (
                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                                        <Edit3 className="w-3 h-3" /> এডিটিং মোড
                                    </span>
                                ) : (
                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                        নতুন রেফারার
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">
                                ডাক্তার বা রেফারারের তথ্য পূরণ করে সংরক্ষণ করুন
                            </p>
                        </div>
                    </div>

                    {/* Right: COMPACT REFERRAL ID SECTION (প্রশস্ততার দিক দিয়ে সংকুচিত ও মার্জিত) */}
                    <div className="flex items-center gap-2 bg-slate-950/80 border border-sky-600/40 px-3 py-1.5 rounded-xl shadow-inner">
                        <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">
                            রেফারেল আইডি:
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm text-cyan-300 bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-800/50">
                                {formData.ref_id || 'ID Pending'}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyId}
                                title="কপি করুন"
                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                            >
                                {copiedId ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        {!isEmbedded && (
                            <button
                                type="button"
                                onClick={handleGetNewId}
                                title="নতুন আইডি জেনারেট করুন"
                                className="ml-1 text-[11px] font-bold bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <RefreshCw className="w-3 h-3" />
                                <span>নতুন আইডি</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Form Body: Exactly 2 rows on medium+ screens for the 6 fields as requested */}
                <form id="referrer-form" onSubmit={handleSaveReferrar} className="p-5 md:p-6 space-y-4">
                    
                    {/* ROW 1: Referrer Name, Degrees, Gender (৩টি ফিল্ড এক সারিতে) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* 1. Referrer Name */}
                        <div>
                            <label className="text-xs font-semibold text-sky-200 mb-1.5 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-sky-400" />
                                <span>রেফারার নাম (Referrer Name)</span>
                                <span className="text-red-400 font-bold">*</span>
                            </label>
                            <input 
                                type="text" 
                                name="ref_name" 
                                value={formData.ref_name} 
                                onChange={handleInputChange} 
                                required 
                                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 text-white placeholder-slate-500 font-medium text-sm transition-all outline-none"
                                placeholder="যেমন: ডাঃ মোঃ কামরুল হাসান" 
                            />
                        </div>

                        {/* 2. Degrees */}
                        <div>
                            <label className="text-xs font-semibold text-sky-200 mb-1.5 flex items-center gap-1.5">
                                <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                                <span>ডিগ্রী (Degrees)</span>
                            </label>
                            <input 
                                type="text" 
                                name="ref_degrees" 
                                value={formData.ref_degrees} 
                                onChange={handleInputChange} 
                                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 text-white placeholder-slate-500 font-medium text-sm transition-all outline-none"
                                placeholder="যেমন: MBBS, FCPS, MD" 
                            />
                        </div>

                        {/* 3. Gender */}
                        <div>
                            <label className="text-xs font-semibold text-sky-200 mb-1.5 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-sky-400" />
                                <span>জেন্ডার (Gender)</span>
                            </label>
                            <select 
                                name="ref_gender" 
                                value={formData.ref_gender} 
                                onChange={handleInputChange} 
                                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 text-white font-medium text-sm transition-all outline-none cursor-pointer"
                            >
                                <option value="" className="bg-slate-950 text-slate-400">সিলেক্ট করুন (Select Gender)</option>
                                <option value="Male" className="bg-slate-950 text-white">পুরুষ (Male)</option>
                                <option value="Female" className="bg-slate-950 text-white">মহিলা (Female)</option>
                                <option value="Other" className="bg-slate-950 text-white">অন্যান্য (Other)</option>
                            </select>
                        </div>
                    </div>

                    {/* ROW 2: Mobile Number, Area, Address/Chamber (৩টি ফিল্ড দ্বিতীয় সারিতে) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* 4. Mobile Number */}
                        <div>
                            <MobileNumberInput 
                                label="মোবাইল নম্বর (Mobile No)"
                                name="ref_mobile" 
                                value={formData.ref_mobile} 
                                onChange={handleInputChange} 
                                showIcon={true}
                                error={mobileError}
                                placeholder="01XXX-XXXXXX"
                                className={`w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border ${mobileError ? 'border-red-500 focus:border-red-400' : 'border-slate-700 hover:border-slate-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20'} text-white placeholder-slate-500 font-mono font-medium text-sm transition-all outline-none`}
                            />
                        </div>

                        {/* 5. Area / Upazilla */}
                        <div>
                            <label className="text-xs font-semibold text-sky-200 mb-1.5 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                                <span>এরিয়া / উপজেলা (Area)</span>
                            </label>
                            <input 
                                type="text" 
                                name="area" 
                                value={formData.area} 
                                onChange={handleInputChange} 
                                list="area-datalist"
                                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 text-white placeholder-slate-500 font-medium text-sm transition-all outline-none"
                                placeholder="যেমন: এনায়েতপুর, সিরাজগঞ্জ" 
                            />
                            <datalist id="area-datalist">
                                {uniqueAreas.map(a => <option key={a} value={a} />)}
                            </datalist>
                        </div>

                        {/* 6. Address / Chamber */}
                        <div>
                            <label className="text-xs font-semibold text-sky-200 mb-1.5 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                                <span>অ্যাড্রেস / চেম্বার (Chamber)</span>
                            </label>
                            <input 
                                type="text" 
                                name="address" 
                                value={formData.address} 
                                onChange={handleInputChange} 
                                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 text-white placeholder-slate-500 font-medium text-sm transition-all outline-none"
                                placeholder="যেমন: রুম নং-১০৫, খাজা ইউনুস আলী মোড়" 
                            />
                        </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                            <span>রেফারার আইডি স্বয়ংক্রিয়ভাবে কিউআর কোড এবং ভাউচারের সাথে সংযুক্ত হবে।</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            {isEditing && (
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        handleGetNewId();
                                        setIsEditing(false);
                                    }} 
                                    className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
                                >
                                    রিসেট / নতুন ফর্ম
                                </button>
                            )}

                            {onClose && (
                                <button 
                                    type="button" 
                                    onClick={onClose} 
                                    className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
                                >
                                    বন্ধ করুন (Close)
                                </button>
                            )}

                            <button 
                                type="submit" 
                                disabled={isSaving} 
                                className={`px-6 py-2.5 text-xs font-bold text-white uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-lg flex items-center gap-2 ${
                                    isEditing 
                                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-950/40' 
                                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/40'
                                } disabled:opacity-50`}
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>সংরক্ষণ হচ্ছে...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span>{isEditing ? 'আপডেট করুন (Update)' : 'সংরক্ষণ করুন (Save Profile)'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* ==============================================================
                SECTION 2: REFERRER LIST CONTAINER
                (Accurately designed matching user sample image: '23.png')
                ============================================================== */}
            {!isEmbedded && (
                <div className="bg-[#edf3f9] border border-[#cfdbe8] rounded-2xl shadow-lg p-4 md:p-5 text-slate-800">
                    
                    {/* Top Bar of the Container (Matching sample image: Green sheet icon + Title + Search inputs on right) */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#cbd5e1]/60">
                        
                        {/* Title and Subtitle */}
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs mt-0.5">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-[#0f172a] tracking-tight">
                                    সংরক্ষিত রেফারার তালিকা ও ডিরেক্টরি ({referrars.length} জন)
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    পূর্বের সকল সংরক্ষিত রেফারার প্রোফাইল দেখুন, ফিল্টার করুন এবং কিউআর কোড বা এডিট করুন।
                                </p>
                            </div>
                        </div>

                        {/* Search and Filter Controls: Area Filter + Name Search + Mobile Search */}
                        <div className="flex flex-wrap items-center gap-2">
                            
                            {/* 1. Area Dropdown Filter */}
                            <div className="relative">
                                <select 
                                    value={areaFilter} 
                                    onChange={(e) => setAreaFilter(e.target.value)} 
                                    className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl shadow-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 cursor-pointer pr-7"
                                >
                                    <option value="All">সকল এরিয়া ({uniqueAreas.length})</option>
                                    {uniqueAreas.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Referrer Name Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="রেফারারের নাম..." 
                                    value={nameSearch} 
                                    onChange={(e) => setNameSearch(e.target.value)} 
                                    className="w-36 md:w-44 pl-8 pr-3 py-2 bg-white border border-slate-300 text-slate-800 placeholder-slate-400 text-xs font-medium rounded-xl shadow-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                                />
                            </div>

                            {/* 3. Mobile Number Search */}
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="মোবাইল নম্বর..." 
                                    value={mobileSearch} 
                                    onChange={(e) => setMobileSearch(e.target.value)} 
                                    className="w-32 md:w-36 pl-8 pr-3 py-2 bg-white border border-slate-300 text-slate-800 placeholder-slate-400 text-xs font-medium rounded-xl shadow-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 font-mono"
                                />
                            </div>

                            {/* Clear search filters if active */}
                            {(nameSearch || mobileSearch || areaFilter !== 'All') && (
                                <button
                                    onClick={() => {
                                        setNameSearch('');
                                        setMobileSearch('');
                                        setAreaFilter('All');
                                    }}
                                    className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-2 rounded-xl transition-colors"
                                    title="ফিল্টার রিসেট করুন"
                                >
                                    রিসেট
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Summary Metrics Strip (Exactly as shown in sample image '23.png') */}
                    <div className="my-3 bg-white border border-slate-200/90 rounded-xl px-4 py-3 shadow-xs">
                        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-center gap-2 md:gap-0">
                            
                            <div className="px-3 py-1">
                                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    মোট রেফারার:
                                </span>
                                <span className="text-base font-extrabold text-slate-900 font-bangla-classic">
                                    {stats.total} জন
                                </span>
                            </div>

                            <div className="px-3 py-1">
                                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    মোট এলাকা / এরিয়া:
                                </span>
                                <span className="text-base font-extrabold text-sky-800 font-bangla-classic">
                                    {stats.areaCount} টি
                                </span>
                            </div>

                            <div className="px-3 py-1">
                                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    মোবাইলযুক্ত ডাক্তার:
                                </span>
                                <span className="text-base font-extrabold text-emerald-700 font-bangla-classic">
                                    {stats.withMobile} জন
                                </span>
                            </div>

                            <div className="px-3 py-1">
                                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    পুরুষ / মহিলা:
                                </span>
                                <span className="text-base font-extrabold text-indigo-700 font-bangla-classic">
                                    {stats.males} / {stats.females} জন
                                </span>
                            </div>

                        </div>
                    </div>

                    {/* Referrers Data Table (With exact soft blue-gray header and serial numbers) */}
                    <div className="overflow-x-auto border border-slate-300/80 rounded-xl bg-white shadow-xs">
                        <table className="min-w-full divide-y divide-slate-200 text-left">
                            
                            {/* Table Header: Soft steel-blue background from sample image */}
                            <thead className="bg-[#dce7f3] border-b border-[#cbd5e1]">
                                <tr>
                                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-800 uppercase tracking-wider w-12">
                                        ক্রমিক
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        রেফারেল আইডি
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        রেফারারের নাম ও ডিগ্রি
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        এরিয়া / উপজেলা
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        মোবাইল নম্বর
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        জেন্ডার
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        চেম্বার / ঠিকানা
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        কিউআর কোড
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        অ্যাকশন
                                    </th>
                                </tr>
                            </thead>

                            {/* Table Body */}
                            <tbody className="divide-y divide-slate-200/80 bg-white">
                                {filteredReferrars.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-slate-500 font-semibold text-sm">
                                            কোনো সংরক্ষিত রেফারার রেকর্ড পাওয়া যায়নি।
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReferrars.map((ref, idx) => (
                                        <tr 
                                            key={ref.ref_id} 
                                            className="hover:bg-[#eaf3fc] even:bg-[#f8fafc] odd:bg-white transition-colors cursor-pointer group"
                                            onClick={() => {
                                                setFormData(ref);
                                                setIsEditing(true);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                        >
                                            {/* 1. ক্রমিক (Serial Number) */}
                                            <td className="px-3 py-3 text-center text-xs font-bold text-slate-600 font-mono">
                                                {idx + 1}
                                            </td>

                                            {/* 2. রেফারেল আইডি */}
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/70">
                                                    {ref.ref_id}
                                                </span>
                                            </td>

                                            {/* 3. রেফারার নাম ও ডিগ্রি */}
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-900 text-sm group-hover:text-sky-700 transition-colors">
                                                    {ref.ref_name}
                                                </div>
                                                {ref.ref_degrees && (
                                                    <div className="text-[11px] text-slate-500 font-medium">
                                                        {ref.ref_degrees}
                                                    </div>
                                                )}
                                            </td>

                                            {/* 4. এরিয়া / এলাকা */}
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {ref.area ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                        <MapPin className="w-3 h-3 text-slate-400" />
                                                        <span>{ref.area}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>

                                            {/* 5. মোবাইল নম্বর */}
                                            <td className="px-3 py-3 whitespace-nowrap font-mono text-xs font-bold text-emerald-700">
                                                {ref.ref_mobile || <span className="text-slate-400 font-normal">-</span>}
                                            </td>

                                            {/* 6. জেন্ডার */}
                                            <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-600">
                                                {ref.ref_gender ? (
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                        ref.ref_gender === 'Male' || ref.ref_gender === 'পুরুষ' 
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    }`}>
                                                        {ref.ref_gender}
                                                    </span>
                                                ) : '-'}
                                            </td>

                                            {/* 7. চেম্বার / ঠিকানা */}
                                            <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={ref.address}>
                                                {ref.address || '-'}
                                            </td>

                                            {/* 8. কিউআর কোড বাটন */}
                                            <td className="px-3 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDoctorQr(ref)}
                                                    className="inline-flex items-center gap-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 hover:border-sky-400 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs transition-colors"
                                                    title="ডাক্তারের কিউআর কোড দেখুন ও ডাউনলোড করুন"
                                                >
                                                    <QrCode className="w-3.5 h-3.5 text-sky-600" />
                                                    <span>QR কোড</span>
                                                </button>
                                            </td>

                                            {/* 9. অ্যাকশন বাটন */}
                                            <td className="px-3 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(ref);
                                                            setIsEditing(true);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 hover:text-sky-800 border border-sky-200 transition-colors"
                                                        title="এডিট করুন"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleDeleteReferrar(ref)}
                                                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800 border border-red-200 transition-colors"
                                                        title="মুছে ফেলুন"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer / Counter */}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
                        <span>মোট প্রদর্শিত: {filteredReferrars.length} / {referrars.length} জন রেফারার</span>
                        <span>নিরাময় ক্লিনিক অ্যান্ড ডায়াগনস্টিক রেফারেল ম্যানেজমেন্ট</span>
                    </div>
                </div>
            )}

            {/* ==============================================================
                SECTION 3: DOCTOR QR CODE DIGITAL CARD MODAL
                ============================================================== */}
            {qrModalDoctor && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-300 relative">
                        
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <QrCode className="w-5 h-5 text-sky-200" />
                                <div>
                                    <h4 className="font-extrabold text-sm uppercase tracking-wide">
                                        ডাক্তার ডিজিটাল কিউআর কার্ড
                                    </h4>
                                    <p className="text-[11px] text-sky-100">
                                        Niramoy Clinic & Diagnostic Doctor Pass
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setQrModalDoctor(null);
                                    setQrCodeDataUrl('');
                                }}
                                className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content - Digital Pass */}
                        <div className="p-6 text-center space-y-4 bg-slate-50">
                            
                            {/* QR Code Container */}
                            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-sky-300 inline-block shadow-md mx-auto">
                                {qrCodeDataUrl ? (
                                    <img 
                                        src={qrCodeDataUrl} 
                                        alt="Doctor QR Code" 
                                        className="w-56 h-56 mx-auto object-contain" 
                                    />
                                ) : (
                                    <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                                        <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
                                    </div>
                                )}
                            </div>

                            {/* Doctor Details */}
                            <div className="space-y-1">
                                <div className="text-lg font-black text-slate-900">
                                    {qrModalDoctor.ref_name}
                                </div>
                                {qrModalDoctor.ref_degrees && (
                                    <div className="text-xs font-bold text-sky-700">
                                        {qrModalDoctor.ref_degrees}
                                    </div>
                                )}
                                <div className="inline-block mt-1 font-mono text-xs font-bold bg-sky-100 text-sky-800 px-3 py-1 rounded-full border border-sky-300">
                                    ID: {qrModalDoctor.ref_id}
                                </div>
                            </div>

                            {/* Extra details strip */}
                            <div className="bg-white rounded-xl p-3 border border-slate-200 text-xs text-slate-600 text-left space-y-1 font-medium">
                                {qrModalDoctor.ref_mobile && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>মোবাইল: <strong className="text-slate-800 font-mono">{qrModalDoctor.ref_mobile}</strong></span>
                                    </div>
                                )}
                                {qrModalDoctor.area && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                        <span>এরিয়া: <strong className="text-slate-800">{qrModalDoctor.area}</strong></span>
                                    </div>
                                )}
                                {qrModalDoctor.address && (
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                        <span>চেম্বার: <strong className="text-slate-800">{qrModalDoctor.address}</strong></span>
                                    </div>
                                )}
                            </div>

                            {/* Modal Action Buttons */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={handleDownloadQr}
                                    className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>কিউআর ডাউনলোড</span>
                                </button>
                                <button
                                    onClick={handlePrintQrBadge}
                                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>ব্যাজ প্রিন্ট</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default ReferrarInfoPage;
