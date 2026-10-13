import SearchableSelect from "../SearchableSelect";
import React, { useMemo, useState, useEffect } from 'react';
import { LabInvoice as Invoice, DueCollection, ExpenseItem, Employee, testCategories } from '../DiagnosticData';
import { Activity, BackIcon, FileTextIcon, SearchIcon, PrinterIcon, XIcon, PlusIcon } from '../Icons';
import { Settings } from 'lucide-react';
import { dbService, normalizeDate } from '../../dbService';

// --- Configuration & Data ---
const expenseCategories = [
    'House rent', 'Electricity bill', 'Stuff salary', 'Reagent buy', 'Marketing', 'Motorcycle', 'Doctor donation & Vehicle service',
    'Instruments buy/ repair', 'Diagnostic development', 'Maintenance', 'License cost', 
    'X-ray Film buy', 'Mobile buy/ Flexiload', 'Press Cost', 'Food/Meal Cost', 'Paper / Dish / Wifi Bill',
    'Electrical and Electronics',
    'Others',
];

const expenseCategoryBanglaMap: Record<string, string> = {
    'House rent': 'বাড়ী ভাড়া', 'Electricity bill': 'বিদ্যুৎ বিল', 'Stuff salary': 'স্টাফ স্যালারী',
    'Reagent buy': 'রিএজেন্ট ক্রয়', 'Marketing': 'মার্কেটিং', 'Motorcycle':'মোটর সাইকেল','Doctor donation & Vehicle service': 'ডাক্তার ডোনেশন', 'Instruments buy/ repair': 'যন্ত্রপাতি ক্রয়/মেরামত',
    'Diagnostic development': 'ডায়াগনস্টিক উন্নয়ন', 'Maintenance': 'রক্ষণাবেক্ষণ', 'License cost': 'লাইসেন্স খরচ', 
    'X-ray Film buy': 'এক্স-রে ফিল্ম ক্রয়', 'Mobile buy/ Flexiload': 'মোবাইল ক্রয়/ফ্লেক্সিলোড', 'Press Cost': 'প্রেস খরচ', 
    'Food/Meal Cost': 'খাবার খরচ', 'Paper / Dish / Wifi Bill': 'পেপার/ডিশ/ওয়াইফাই বিল',
    'Electrical and Electronics': 'ইলেকট্রিক্যাল ও ইলেকট্রনিক্স',
    'Others': 'অন্যান্য',
};

export const normalizeDiagExpenseCategory = (rawCat: string): string => {
    if (!rawCat) return 'Others';
    const s = String(rawCat).trim();
    if (s === 'House rent' || s === 'Rent' || s === 'বাড়ী ভাড়া' || s === 'ভাড়া') return 'House rent';
    if (s === 'Electricity bill' || s === 'বিদ্যুৎ বিল' || s === 'Meter 01' || s === 'Meter 02') return 'Electricity bill';
    if (s === 'Paper / Dish / Wifi Bill' || s === 'Bills' || s === 'বিদ্যুৎ+ পেপার+ ডিশ বিল' || s === 'Dish Bill' || s === 'Wifi Bill' || s === 'Newspaper') return 'Paper / Dish / Wifi Bill';
    if (s === 'Stuff salary' || s === 'Staff salary' || s === 'Salary' || s === 'স্টাফ স্যালারী' || s === 'স্টাফ বেতন' || s === 'বেতন') return 'Stuff salary';
    if (s === 'Reagent buy' || s === 'Reagent' || s === 'রিএজেন্ট ক্রয়' || s === 'রিএজেন্ট') return 'Reagent buy';
    if (s === 'Marketing' || s === 'মার্কেটিং') return 'Marketing';
    if (s === 'Motorcycle' || s === 'মোটর সাইকেল') return 'Motorcycle';
    if (s === 'Doctor donation & Vehicle service' || s === 'Doctor donation' || s === 'ডাক্তার ডোনেশন' || s === 'ডাঃ ডোনেশন+ যাতায়াত' || s === 'Donation') return 'Doctor donation & Vehicle service';
    if (s === 'Instruments buy/ repair' || s === 'Repair/Instruments' || s === 'Instruments' || s === 'ইন্সট্রুমেন্ট' || s === 'যন্ত্রপাতি ক্রয়/মেরামত' || s === 'যন্ত্রপাতি') return 'Instruments buy/ repair';
    if (s === 'Diagnostic development' || s === 'Clinic development' || s === 'Clinic_Dev' || s === 'ডায়াগনস্টিক উন্নয়ন' || s === 'ক্লিনিক উন্নয়ন') return 'Diagnostic development';
    if (s === 'Maintenance' || s === 'রক্ষণাবেক্ষণ') return 'Maintenance';
    if (s === 'License cost' || s === 'License/Official' || s === 'License' || s === 'লাইসেন্স খরচ' || s === 'লাইসেন্স') return 'License cost';
    if (s === 'X-ray Film buy' || s === 'X-Ray' || s === 'এক্স-রে ফিল্ম ক্রয়' || s === 'এক্স-রে') return 'X-ray Film buy';
    if (s === 'Mobile buy/ Flexiload' || s === 'Mobile' || s === 'মোবাইল ক্রয়/ফ্লেক্সিলোড' || s === 'মোবাইল খরচ' || s === 'মোবাইল') return 'Mobile buy/ Flexiload';
    if (s === 'Press Cost' || s === 'Press' || s === 'প্রেস খরচ' || s === 'প্রেস') return 'Press Cost';
    if (s === 'Food/Meal Cost' || s === 'Food/Refreshment' || s === 'Food' || s === 'খাবার খরচ' || s === 'খাবার' || s === 'নাস্তা') return 'Food/Meal Cost';
    if (s === 'Electrical and Electronics' || s === 'ইলেকট্রিক্যাল ও ইলেকট্রনিক্স') return 'Electrical and Electronics';
    
    if (expenseCategories.includes(s)) return s;
    const found = expenseCategories.find(c => c.toLowerCase() === s.toLowerCase() || (expenseCategoryBanglaMap[c] && expenseCategoryBanglaMap[c] === s));
    if (found) return found;
    return 'Others';
};

const subCategoryMap: Record<string, string[]> = {
    'House rent': ['Diagnostic Building Rent'],
    'Electricity bill': ['Meter 01', 'Meter 02'],
    'Reagent buy': ['Local Market', 'Company Delivery', 'Special Order'],
    'Marketing': ['Doctor Appayon', 'PC conference', 'PC Gift', 'Miking', 'Recording', 'Others'],
    'Motorcycle': ['Motorcycle buy', 'Motorcycle repair', 'Motorcycle License', 'Motorcycle Fuel'],
    'Doctor donation & Vehicle service': ['Weekly vehicle', 'Monthly Referral Pay', 'Festival Bonus'],
    'Instruments buy/ repair': ['Lab Equipment', 'IT/Computer', 'Furniture'],
    'Diagnostic development': ['New Test Marketing', 'Branding'],
    'Maintenance': ['AC Service', ' Fridge ', 'Generator Service', 'Clothing', 'Stationary', 'Cleaning'],
    'License cost': ['Trade License', 'Fire License', 'Labour welfare License','Narcotic License','DG Health', 'Environment', 'Atomic Energy'],
    'X-ray Film buy': ['12x15 Film', '10x12 Film', '8x10 Film'],
    'Mobile buy/ Flexiload': ['Office Mobile_buy', 'Marketing mobile Mobile_buy', 'MD mobile buy', 'Office Mobile_Flexiload', 'Marketing mobile_Flexiload', 'MD mobile_Flexiload'],
    'Press Cost': ['Pad Printing', 'Envelope Printing', 'Leaflet','Others'],
    'Food/Meal Cost': ['Staff Lunch','Doctor Lunch', 'Guest Entertainment', 'Tea/Snacks'],
    'Paper / Dish / Wifi Bill': ['Newspaper', 'Dish Bill', 'Wifi Bill'],
    'Electrical and Electronics': ['Light', 'Wire/Tar', 'Mistry Mojuri', 'Electrical Parts', 'Electronics Items', 'IPS', 'UPS', 'Battery', 'Voltage Stabilizer', 'Fan', 'X-ray View Box', 'Others'],
    'Others': ['Entertainment', 'Donation', 'Emergency']
};

const monthOptions = [
    { value: 0, name: 'January' }, { value: 1, name: 'February' }, { value: 2, name: 'March' },
    { value: 3, name: 'April' }, { value: 4, name: 'May' }, { value: 5, name: 'June' },
    { value: 6, name: 'July' }, { value: 7, name: 'August' }, { value: 8, name: 'September' },
    { value: 9, name: 'October' }, { value: 10, name: 'November' }, { value: 11, name: 'December' }
];

const InvoiceViewModal: React.FC<{ inv: any, patients: any[], doctors: any[], onClose: () => void }> = ({ inv, patients, doctors, onClose }) => {
    const patient = patients.find(p => p.pt_id === inv.patient_id);
    const doctor = doctors.find(d => d.doctor_id === inv.doctor_id);

    const handlePrint = () => {
        const itemsHtml = inv.items.map((item: any, idx: number) => `
            <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: left;">${idx + 1}. ${item.test_name}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${item.price.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        const getSlipHtml = (copyType: string, isLast: boolean) => `
            <div class="slip-column" style="width: 148.5mm; height: 210mm; padding: 12mm 15mm; box-sizing: border-box; display: flex; flex-direction: column; ${!isLast ? 'border-right: 1.5px dashed #666;' : ''} overflow: hidden; position: relative;">
                <div class="header" style="text-align: center; margin-bottom: 5px;">
                    <h1 style="margin:0; font-size: 16px; font-weight: 900; color: #000; text-transform: uppercase;">Niramoy Clinic & Diagnostic</h1>
                    <p style="margin:2px 0; font-size: 10px; font-weight: bold;">Enayetpur, Sirajgonj | Mobile: 01730 923007 | License: HSM41671</p>
                    <div class="copy-label" style="display: inline-block; border: 1.5px solid #000; padding: 2px 10px; margin-top: 3px; font-size: 9px; font-weight: 900; text-transform: uppercase;">${copyType}</div>
                </div>

                <table style="width:100%; border-collapse: collapse; margin-bottom: 5px; margin-top: 8px; font-size: 11px; border: 1px solid #000;">
                    <tr>
                        <td style="border: 1px solid #000; padding: 4px; width: 40%;"><b>Invoice ID:</b> ${inv.invoice_id}</td>
                        <td style="border: 1px solid #000; padding: 4px; width: 35%;"><b>Date:</b> ${inv.invoice_date}</td>
                        <td rowspan="2" style="border: 1px solid #000; padding: 4px; width: 25%; text-align: center; vertical-align: middle; background: #fff;">
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <img 
                                    src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(inv.patient_id)}&scale=1&height=8&incltext=false" 
                                    alt="BC" 
                                    style="height: 35px; width: auto; max-width: 100%;"
                                />
                                <div style="font-size: 8px; font-family: monospace; margin-top: 2px; font-weight: bold;">${inv.patient_id}</div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 4px;"><b>Patient Name:</b> ${patient?.pt_name || 'N/A'}</td>
                        <td style="border: 1px solid #000; padding: 4px;"><b>Age/Sex:</b> ${patient?.ageY || 'N/A'}Y / ${patient?.gender || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: 1px solid #000; padding: 4px;"><b>Consultant:</b> ${doctor?.doctor_name || 'Self/Walk-in'} ${doctor?.degree ? `(${doctor.degree})` : ''}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: 1px solid #000; padding: 4px;"><b>Address:</b> ${patient?.address || 'N/A'} | <b>Mob:</b> ${patient?.mobile || 'N/A'}</td>
                    </tr>
                </table>

                <div style="height: 15px;"></div>
                
                <div style="text-align: center; font-weight: 900; font-size: 11px; text-decoration: underline; margin-bottom: 3px; font-family: 'Arial', sans-serif; text-transform: uppercase;">Test Invoice</div>

                <div class="table-container" style="display: block; overflow: hidden;">
                    <table style="width:100%; border-collapse: collapse; font-size: 11px;">
                        <thead>
                            <tr style="background:#f3f3f3;">
                                <th style="border: 1px solid #000; padding: 4px; text-align: left;">Test Name</th>
                                <th style="border: 1px solid #000; padding: 4px; text-align: right;">Price</th>
                                <th style="border: 1px solid #000; padding: 4px; text-align: center;">Qty</th>
                                <th style="border: 1px solid #000; padding: 4px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>

                    <div class="footer-summary" style="display: flex; justify-content: flex-end; margin-top: 10px;">
                        <div class="totals" style="width: 160px; font-size: 11px;">
                            <div style="display: flex; justify-content: space-between; line-height: 1.1;"><span>Total:</span> <span>${inv.total_amount.toFixed(2)}</span></div>
                            <div style="display: flex; justify-content: space-between; line-height: 1.1;"><span>Discount:</span> <span>${inv.discount_amount.toFixed(2)}</span></div>
                            <div style="display: flex; justify-content: space-between; line-height: 1.2; font-weight: 900; border-top: 1.2px solid #000; padding-top: 2px; margin-top: 2px;"><span>Net Payable:</span> <span>${inv.net_payable.toFixed(2)}</span></div>
                            <div style="display: flex; justify-content: space-between; line-height: 1.1;"><span>Paid:</span> <span>${inv.paid_amount.toFixed(2)}</span></div>
                            <div style="display: flex; justify-content: space-between; line-height: 1.1;"><span>Due:</span> <span style="font-weight:900; color: #d00;">${inv.due_amount.toFixed(2)}</span></div>
                            ${inv.status === 'Returned' ? '<div style="color: #d00; text-align: center; border: 1.5px solid #d00; margin-top: 5px; font-weight: 900; padding: 2px;">RETURNED / REFUNDED</div>' : ''}
                        </div>
                    </div>

                    <div style="margin-top: 10px; font-size: 11px; border-top: 1px solid #eee; padding-top: 5px;">
                        <b>Expected Report Delivery:</b> ${inv.expected_delivery_time || 'As per schedule'}
                    </div>
                </div>

                <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 10px;">
                    <div class="signature" style="width: 100px; border-top: 1.2px solid #000; text-align: center; font-size: 10px; font-weight: bold; padding-top: 3px;">Authorized Sign</div>
                    <div style="text-align:center; font-size: 8px; color: #666;">System Printed at ${new Date().toLocaleString()}</div>
                </div>
            </div>
        `;

        const printWin = window.open('', '_blank');
        if (printWin) {
            printWin.document.write(`
                <html>
                <head>
                    <style>
                        @page { size: A4 landscape; margin: 0; }
                        * { box-sizing: border-box; }
                        html, body { margin: 0; padding: 0; }
                        .print-container { display: flex; width: 297mm; height: 210mm; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    <div class="print-container">
                        ${getSlipHtml('Office Copy', false)}
                        ${getSlipHtml('Patient Copy', true)}
                    </div>
                </body>
                </html>
            `);
            printWin.document.close();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-zoom-in">
                <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white no-print">
                    <div className="flex items-center gap-4">
                        <FileTextIcon className="text-blue-400 w-8 h-8" />
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter">View Invoice Record</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Read Only Mode - Non Editable</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-2xl font-black uppercase text-xs transition-all shadow-lg flex items-center gap-2">
                           <PrinterIcon size={16} /> Print Invoice
                        </button>
                        <button onClick={onClose} className="p-3 bg-slate-800 hover:bg-red-600 rounded-2xl transition-all text-white">
                            <XIcon size={24} />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-12 bg-gray-100 flex justify-center">
                    <div className="bg-white shadow-2xl p-12 w-[148.5mm] border border-gray-300 transform scale-110 origin-top mb-12">
                         {/* Header */}
                         <div className="text-center mb-6 pb-4 border-b-2 border-slate-900 border-double flex flex-col items-center justify-center">
                            <h1 className="text-xl font-black text-blue-900 uppercase whitespace-nowrap">Niramoy Clinic & Diagnostic</h1>
                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-700 italic">
                                <span>Enayetpur, Sirajgonj | Mobile: 01730 923007</span>
                                <span className="hidden sm:inline">|</span>
                                <span className="text-[10px] font-black text-gray-500 not-italic uppercase tracking-widest">License: HSM41671</span>
                            </div>
                        </div>

                        {/* Info Header Table */}
                        <div className="border border-slate-300 rounded shadow-sm mb-6 bg-slate-300 gap-px grid grid-cols-4 overflow-hidden">
                            {/* Row 1 */}
                            <div className="col-span-2 bg-white flex items-center">
                                <div className="bg-slate-50 px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase w-24 border-r border-slate-200 h-full flex items-center">Patient Name</div>
                                <div className="px-2 font-black text-xs uppercase text-slate-800 truncate">{patient?.pt_name || 'N/A'}</div>
                            </div>
                            <div className="bg-white flex items-center">
                                <div className="bg-slate-50 px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase w-16 border-r border-slate-200 h-full flex items-center">Age/Sex</div>
                                <div className="px-2 font-bold text-[11px] text-slate-700">{patient?.ageY || 'N/A'}Y / {patient?.gender || 'N/A'}</div>
                            </div>
                            <div className="bg-white flex items-center">
                                <div className="bg-slate-50 px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase w-16 border-r border-slate-200 h-full flex items-center">Mobile</div>
                                <div className="px-2 font-mono font-bold text-[11px] text-slate-700">{patient?.mobile || 'N/A'}</div>
                            </div>

                            {/* Row 2 */}
                            <div className="col-span-2 bg-white flex items-center">
                                <div className="bg-slate-50 px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase w-24 border-r border-slate-200 h-full flex items-center">Ref. Doctor</div>
                                <div className="px-2 font-bold text-[11px] text-blue-800 truncate">{doctor?.doctor_name || 'Self/Walk-in'} {doctor?.degree ? `(${doctor.degree})` : ''}</div>
                            </div>
                            <div className="bg-white flex items-center">
                                <div className="bg-slate-50 px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase w-16 border-r border-slate-200 h-full flex items-center">Inv ID</div>
                                <div className="px-2 font-mono font-black text-[11px] text-blue-600 truncate">{inv.invoice_id}</div>
                            </div>
                            <div className="bg-white flex items-center">
                                <div className="bg-slate-50 px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase w-16 border-r border-slate-200 h-full flex items-center">Date</div>
                                <div className="px-2 font-bold text-[11px] text-slate-700 truncate">{inv.invoice_date}</div>
                            </div>
                        </div>

                        {/* Test Items Table */}
                        <div className="mb-6 min-h-[200px]">
                            <h3 className="text-center font-black text-sm text-slate-800 mb-2 uppercase tracking-wide">Test Invoice</h3>
                            <table className="w-full border-collapse">
                                <thead className="bg-slate-100 border-y-2 border-slate-900">
                                    <tr>
                                        <th className="py-1 px-3 text-left border-r border-slate-300 tracking-tighter uppercase font-black text-xs">Test Name</th>
                                        <th className="py-1 px-3 text-right border-r border-slate-300 tracking-tighter uppercase font-black text-xs">Price</th>
                                        <th className="py-1 px-3 text-center border-r border-slate-300 tracking-tighter uppercase font-black text-xs">Qty</th>
                                        <th className="py-1 px-3 text-right tracking-tighter uppercase font-black text-xs">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inv.items.map((it: any, i: number) => (
                                        <tr key={i} className="border-b border-gray-200">
                                            <td className="py-1 px-3 text-sm font-bold text-slate-800">{it.test_name}</td>
                                            <td className="py-1 px-3 text-right text-sm">{it.price.toLocaleString()}</td>
                                            <td className="py-1 px-3 text-center text-sm">{it.quantity}</td>
                                            <td className="py-1 px-3 text-right font-bold text-slate-900 leading-none">{it.subtotal.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals Section */}
                        <div className="flex justify-between items-start pt-6 border-t-2 border-slate-200">
                            <div className="text-xs italic text-gray-500 w-1/2">
                                <p className="mb-2"><b>Delivery:</b> {inv.expected_delivery_time || 'Check Schedule'}</p>
                                <p>This is an electronically generated document. No signature required for validation.</p>
                            </div>
                            <div className="w-48 space-y-2">
                                <div className="flex justify-between text-sm py-1"><span>Sub Total:</span> <span className="font-bold">{inv.total_amount.toLocaleString()}</span></div>
                                <div className="flex justify-between text-sm py-1 border-b border-gray-100"><span>Discount:</span> <span className="text-rose-600 font-bold">-{inv.discount_amount.toLocaleString()}</span></div>
                                <div className="flex justify-between text-base font-black py-2 border-b-2 border-slate-900"><span>Net Payable:</span> <span className="text-slate-900 uppercase">{inv.net_payable.toLocaleString()}</span></div>
                                <div className="flex justify-between text-sm py-1"><span>Paid:</span> <span className="text-emerald-600 font-bold">{inv.paid_amount.toLocaleString()}</span></div>
                                <div className="flex justify-between text-lg font-black py-2 bg-slate-50 border-double border-b-4 border-slate-900 px-1 mt-2">
                                    <span className={inv.due_amount > 0 ? "text-rose-600" : "text-emerald-700"}>{inv.due_amount > 0 ? 'Due:' : 'Paid:'}</span>
                                    <span className={inv.due_amount > 0 ? "text-rose-600" : "text-emerald-700"}>{inv.due_amount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-20 flex justify-between">
                            <div className="w-32 border-t-2 border-slate-900 pt-2 text-center text-[10px] font-black uppercase">Prepared By</div>
                            <div className="w-32 border-t-2 border-slate-900 pt-2 text-center text-[10px] font-black uppercase">Authorized</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BatchPurchaseModal: React.FC<{
    onClose: () => void,
    onSave: (date: string, items: any[], discount: number, paid: number, existingItem?: any) => void,
    reagents: any[],
    availableTests: any[],
    initialData?: any
}> = ({ onClose, onSave, reagents, availableTests, initialData }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [rows, setRows] = useState(() => {
        if (initialData?.metadata?.items && Array.isArray(initialData.metadata.items)) {
            // Keep identical item structure so we can edit quantities
            return initialData.metadata.items;
        }
        return [{ 
            id: Date.now(), 
            reagentId: '', 
            isNew: false,
            newReagentName: '',
            newCompany: '',
            newUnit: 'Bottle',
            newCapacity: '',
            linkedTest: '',
            linkedCategory: '',
            usageStartDate: new Date().toISOString().split('T')[0],
            qty: 1, 
            unitPrice: 0 
        }];
    });
    const [discount, setDiscount] = useState(initialData?.metadata?.discount || 0);
    const [paid, setPaid] = useState(initialData?.paidAmount || 0);

    const handleAddRow = () => setRows([...rows, { 
        id: Date.now(), 
        reagentId: '', 
        isNew: false,
        newReagentName: '',
        newCompany: '',
        newUnit: 'Bottle',
        newCapacity: '',
        linkedTest: '',
        linkedCategory: '',
            usageStartDate: new Date().toISOString().split('T')[0],
        qty: 1, 
        unitPrice: 0 
    }]);
    const handleRemoveRow = (id: number) => setRows(rows.filter(r => r.id !== id));
    
    const updateRow = (id: number, field: string, value: any) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const subTotal = rows.reduce((acc, r) => acc + (r.qty * r.unitPrice), 0);
    const netPayable = subTotal - discount;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-zoom-in">
                <div className="bg-slate-800 p-6 flex justify-between items-center border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-black text-sky-400 uppercase tracking-tighter flex items-center gap-2">
                            <FileTextIcon size={24}/> Batch Purchase Entry (Reagent / Film)
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-1">Add multiple items into a single invoice</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-700 hover:bg-rose-600 rounded-xl transition-all text-white"><XIcon size={20} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Invoice / Purchase Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-sky-500"/>
                        </div>
                    </div>

                    <div className="space-y-4 mb-4">
                        {rows.map((row, i) => {
                            const isFilm = row.isNew 
                                ? (row.newReagentName.toLowerCase().includes('film') || row.newReagentName.toLowerCase().includes('x-ray'))
                                : (() => {
                                    const rg = reagents.find((r:any) => r.reagent_id === row.reagentId);
                                    return rg ? (rg.reagent_name.toLowerCase().includes('film') || rg.reagent_name.toLowerCase().includes('x-ray')) : false;
                                })();
                                
                            return (
                                <div key={row.id} className="bg-slate-950 border border-slate-700 rounded-xl p-4 flex flex-col gap-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] font-black text-slate-500 uppercase">Item Selection</label>
                                                <label className="flex items-center gap-1 cursor-pointer text-emerald-400 font-bold text-xs border border-emerald-500/30 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
                                                    <input type="checkbox" checked={row.isNew} onChange={e => updateRow(row.id, 'isNew', e.target.checked)} className="rounded bg-slate-900 border-slate-700" />
                                                    📝 Enter New Reagent Manually
                                                </label>
                                            </div>
                                            {!row.isNew ? (
                                                <SearchableSelect 
                                                    label=""
                                                    options={reagents.map((rg:any) => ({ id: rg.reagent_id, name: rg.reagent_name, details: rg.company }))}
                                                    value={row.reagentId}
                                                    onChange={(id, name) => {
                                                        const exists = reagents.find((r:any) => r.reagent_id === id);
                                                        if (!exists) {
                                                            // Custom name entered
                                                            updateRow(row.id, 'isNew', true);
                                                            updateRow(row.id, 'newReagentName', name);
                                                            updateRow(row.id, 'reagentId', '');
                                                        } else {
                                                            updateRow(row.id, 'reagentId', id);
                                                            updateRow(row.id, 'isNew', false);
                                                        }
                                                    }}
                                                    placeholder="Type Reagent Name to Search or Create New..."
                                                    theme="dark"
                                                    allowCustom={true}
                                                />
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    <input type="text" placeholder="Reagent Generic Name" value={row.newReagentName} onChange={e => updateRow(row.id, 'newReagentName', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs outline-none focus:border-sky-500" />
                                                    <input type="text" placeholder="Company Name" value={row.newCompany} onChange={e => updateRow(row.id, 'newCompany', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs outline-none focus:border-sky-500" />
                                                    <select value={row.newUnit} onChange={e => updateRow(row.id, 'newUnit', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs outline-none focus:border-sky-500">
                                                        <option value="Bottle">Bottle</option>
                                                        <option value="Box">Box</option>
                                                        <option value="Piece">Piece</option>
                                                        <option value="Vial">Vial</option>
                                                        <option value="Kit">Kit</option>
                                                        <option value="Pack">Pack</option>
                                                    </select>
                                                    <input type="number" placeholder="Tests Per Unit" value={row.newCapacity} onChange={e => updateRow(row.id, 'newCapacity', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs outline-none focus:border-sky-500" title="How many tests per unit" />
                                                </div>
                                            )}
                                            
                                            {(row.reagentId || row.isNew) && (
                                                <div className="mt-3 flex gap-4">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Link with Test or Category</label>
                                                        {isFilm ? (
                                                            <select value={row.linkedCategory || 'X-Ray'} onChange={e => updateRow(row.id, 'linkedCategory', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-sky-400 font-bold outline-none">
                                                                <option value="">-- Link to Category --</option>
                                                                {testCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                                                            </select>
                                                        ) : (
                                                            <select value={row.linkedTest || ''} onChange={e => updateRow(row.id, 'linkedTest', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-sky-400 font-bold outline-none">
                                                                <option value="">-- Link to Test Name --</option>
                                                                {(availableTests || []).map((t: any) => <option key={t.test_id} value={t.test_name}>{t.test_name}</option>)}
                                                            </select>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Count Start Date (কাউন্ট শুরুর তারিখ)</label>
                                                        <input 
                                                            type="date" 
                                                            value={row.usageStartDate || date} 
                                                            onChange={e => updateRow(row.id, 'usageStartDate', e.target.value)} 
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-emerald-400 font-bold outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-24">
                                            <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block text-center">Qty</label>
                                            <input type="number" min="1" value={row.qty} onChange={e => updateRow(row.id, 'qty', parseFloat(e.target.value)||0)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none text-center text-xs"/>
                                        </div>
                                        <div className="w-28">
                                            <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block text-right">Unit Price</label>
                                            <input type="number" min="0" value={row.unitPrice} onChange={e => updateRow(row.id, 'unitPrice', parseFloat(e.target.value)||0)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none text-right text-xs"/>
                                        </div>
                                        <div className="w-28 text-right flex flex-col justify-center">
                                            <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Total</label>
                                            <div className="font-black text-white text-sm py-2 mt-4">
                                                {(row.qty * row.unitPrice).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="w-10 flex flex-col justify-center items-center">
                                            <label className="text-[10px] font-black text-transparent uppercase mb-1 block">X</label>
                                            <button onClick={() => handleRemoveRow(row.id)} className="text-rose-500 hover:text-rose-400 p-2 bg-rose-500/10 rounded-lg mt-5"><XIcon size={16}/></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <button onClick={handleAddRow} className="bg-slate-800 hover:bg-slate-700 text-sky-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all mb-8">+ Add Row</button>

                    <div className="flex justify-end pt-6 border-t border-slate-700">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-sm text-slate-300"><span>Sub Total:</span><span className="font-bold">{subTotal.toLocaleString()}</span></div>
                            <div className="flex justify-between text-sm text-slate-300 items-center">
                                <span>Discount:</span>
                                <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value)||0)} className="w-24 bg-slate-950 border border-slate-700 rounded p-1 text-right text-white"/>
                            </div>
                            <div className="flex justify-between text-base text-white font-black py-2 border-t border-slate-700"><span>Net Payable:</span><span>{netPayable.toLocaleString()}</span></div>
                            <div className="flex justify-between text-sm text-slate-300 items-center">
                                <span>Paid Amount:</span>
                                <input type="number" value={paid} onChange={e => setPaid(parseFloat(e.target.value)||0)} className="w-24 bg-slate-950 border border-slate-700 rounded p-1 text-right text-white"/>
                            </div>
                            <div className="flex justify-between text-base font-black pt-2 border-t border-slate-700">
                                <span>Due:</span>
                                <span className={(netPayable - paid) > 0 ? "text-rose-400" : "text-emerald-400"}>{(netPayable - paid).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 border-t border-slate-700 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-black text-xs uppercase text-slate-300 hover:bg-slate-700 transition-all">Cancel</button>
                    <button onClick={() => {
                        const validRows = rows.filter(r => r.qty > 0 && r.unitPrice > 0 && (r.reagentId || (r.isNew && r.newReagentName)));
                        if(validRows.length === 0) return alert('Please enter valid items. Ensure Reagent name is specified.');
                        onSave(date, validRows, discount, paid);
                    }} className="bg-sky-600 hover:bg-sky-500 text-white px-8 py-2.5 rounded-xl font-black text-xs uppercase shadow-xl transition-all flex items-center gap-2">Save Invoice & Update Stock</button>
                </div>
            </div>
        </div>
    );
};
const SummaryBox = ({ title, items, totalLabel, totalValue, colorClass }: any) => (
    <div className={`bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg flex flex-col h-full`}>
        <h4 className={`text-lg font-black ${colorClass} mb-4 uppercase border-b border-slate-700 pb-2 text-white`}>{title}</h4>
        <div className="space-y-3 flex-1">
            {items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-base border-b border-slate-700/30 pb-3 text-slate-200">
                        <span className="font-bold">{it.label}:</span>
                        <span className="font-black text-white">{it.value.toLocaleString()}</span>
                    </div>
            ))}
        </div>
        <div className={`mt-4 pt-3 border-t-2 border-slate-700 flex justify-between items-center`}>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{totalLabel}</span>
            <span className={`text-2xl font-black ${colorClass}`}>{totalValue.toLocaleString()} ৳</span>
        </div>
    </div>
);

const HistoryModal: React.FC<{ item: ExpenseItem, onClose: () => void }> = ({ item, onClose }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <h3 className="font-black text-sky-400 uppercase text-sm">Edit History: {item.category}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
                {(!item.editHistory || item.editHistory.length === 0) ? (
                    <p className="text-center text-slate-500 italic py-8 text-slate-500">No edit history found.</p>
                ) : (
                    item.editHistory.map((log, i) => (
                        <div key={i} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-xs">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-bold uppercase">
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                                <span className="text-sky-500">{log.field}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[9px] text-slate-500 uppercase">Old Value</p><p className="text-rose-400 font-bold">{String(log.oldValue)}</p></div>
                                <div><p className="text-[9px] text-slate-500 uppercase">New Value</p><p className="text-emerald-400 font-bold">{String(log.newValue)}</p></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="p-4 bg-slate-800/50 border-t border-slate-700 text-right">
                <button onClick={onClose} className="bg-slate-700 px-6 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-600 text-white">Close</button>
            </div>
        </div>
    </div>
);

const StaffSalaryHelperCard: React.FC<{
    employeeName: string;
    employees: any[];
    selectedDate: string;
    allDetailedExpenses: Record<string, any[]>;
    attendanceLog?: Record<string, any>;
    leaveLog?: Record<string, any>;
    currentInputPaid: number;
    currentExpenseId?: any;
}> = ({
    employeeName,
    employees,
    selectedDate,
    allDetailedExpenses,
    attendanceLog = {},
    leaveLog = {},
    currentInputPaid,
    currentExpenseId
}) => {
    const selectedEmp = useMemo(() => {
        if (!employeeName) return null;
        return (employees || []).find((e: any) => 
            (e.emp_name && e.emp_name.trim().toLowerCase() === employeeName.trim().toLowerCase()) ||
            (e.name && e.name.trim().toLowerCase() === employeeName.trim().toLowerCase()) ||
            (e.emp_id && String(e.emp_id).trim() === employeeName.trim())
        );
    }, [employeeName, employees]);

    const { entryYear, entryMonthIndex, monthName, daysInMonth } = useMemo(() => {
        const d = selectedDate || new Date().toISOString().split('T')[0];
        const [y, m] = d.split('-').map(Number);
        const yVal = y || new Date().getFullYear();
        const mIdx = (m !== undefined && !isNaN(m)) ? (m - 1) : new Date().getMonth();
        return {
            entryYear: yVal,
            entryMonthIndex: mIdx,
            monthName: monthOptions[mIdx]?.name || 'Current Month',
            daysInMonth: new Date(yVal, mIdx + 1, 0).getDate()
        };
    }, [selectedDate]);

    // Attendance calculation
    const absentCount = useMemo(() => {
        if (!selectedEmp) return 0;
        let count = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dStr = `${entryYear}-${String(entryMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (attendanceLog[`${dStr}_${selectedEmp.emp_id}`]?.status === 'Absent') {
                count++;
            }
        }
        return count;
    }, [daysInMonth, entryYear, entryMonthIndex, attendanceLog, selectedEmp]);

    // Leave & agreed salary
    const { agreedSalary, bonus, overtime, totalDeduction, netPayable } = useMemo(() => {
        if (!selectedEmp) {
            return { agreedSalary: 0, bonus: 0, overtime: 0, totalDeduction: 0, netPayable: 0 };
        }
        const leaveKey = `${entryMonthIndex}_${entryYear}_${selectedEmp.emp_id}`;
        const leaveRecord = leaveLog[leaveKey] || { leaveDays: 0, deductionAmount: 0, bonus: 0, overtime: 0 };
        const baseSal = leaveRecord.agreedSalary !== undefined ? leaveRecord.agreedSalary : (selectedEmp.salary || 0);
        const perDaySal = baseSal / 30;
        const totalAbsentDays = absentCount + (leaveRecord.leaveDays || 0);
        const lDeduct = totalAbsentDays * perDaySal;
        const mDeduct = leaveRecord.deductionAmount || 0;
        const totDeduct = lDeduct + mDeduct;
        const b = leaveRecord.bonus || 0;
        const ot = leaveRecord.overtime || 0;
        const net = Math.max(0, baseSal + b + ot - totDeduct);
        return {
            agreedSalary: baseSal,
            bonus: b,
            overtime: ot,
            totalDeduction: totDeduct,
            netPayable: net
        };
    }, [entryMonthIndex, entryYear, selectedEmp, leaveLog, absentCount]);

    // Payment history for this month
    const { paymentsHistory, previousPaidTotal } = useMemo(() => {
        if (!selectedEmp) {
            return { paymentsHistory: [], previousPaidTotal: 0 };
        }
        const list: Array<{ date: string; amount: number; dept?: string; description?: string; id?: any }> = [];
        let total = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dStr = `${entryYear}-${String(entryMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayExpenses = allDetailedExpenses[dStr] || [];
            dayExpenses.forEach((ex: any) => {
                if (ex.isDeleted) return;
                const isMatch = ex.category === 'Stuff salary' && (
                    (ex.subCategory && ex.subCategory.trim().toLowerCase() === selectedEmp.emp_name.trim().toLowerCase()) ||
                    (ex.description && ex.description.includes(selectedEmp.emp_name))
                );
                if (isMatch) {
                    if (currentExpenseId && String(ex.id) === String(currentExpenseId)) {
                        return;
                    }
                    const amt = Number(ex.paidAmount) || 0;
                    if (amt > 0) {
                        list.push({
                            date: dStr,
                            amount: amt,
                            dept: ex.dept || 'Accounts',
                            description: ex.description || '',
                            id: ex.id
                        });
                        total += amt;
                    }
                }
            });
        }
        return { paymentsHistory: list, previousPaidTotal: total };
    }, [daysInMonth, entryYear, entryMonthIndex, allDetailedExpenses, selectedEmp, currentExpenseId]);

    if (!selectedEmp) {
        return null;
    }

    const numInputPaid = Number(currentInputPaid) || 0;
    const dueBeforeThisEntry = netPayable - previousPaidTotal;
    const totalPaidWithCurrent = previousPaidTotal + numInputPaid;
    const remainingDueAfterCurrent = netPayable - totalPaidWithCurrent;
    const isOverpaid = totalPaidWithCurrent > netPayable;
    const overpaidAmount = isOverpaid ? (totalPaidWithCurrent - netPayable) : 0;

    return (
        <div className="rounded-2xl bg-slate-950/95 border-2 border-amber-500/50 p-4 space-y-3.5 shadow-2xl text-left my-2">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                    <span className="font-black text-white text-sm uppercase tracking-wide">
                        {selectedEmp.emp_name}
                    </span>
                    <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                        ID: #{selectedEmp.emp_id} {selectedEmp.machine_id ? `| HID: ${selectedEmp.machine_id}` : ''}
                    </span>
                    <span className="text-xs text-sky-400 font-bold">
                        {selectedEmp.job_position || selectedEmp.designation || 'Staff'} {selectedEmp.department ? `(${selectedEmp.department})` : ''}
                    </span>
                </div>
                <div className="text-xs font-black text-amber-300 bg-amber-950/70 border border-amber-600/50 px-3 py-1 rounded-xl">
                    বেতন বিবরণী: {monthName} {entryYear}
                </div>
            </div>

            {/* 3 Metric Summary Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">চলতি মাসের নিট বেতন</div>
                    <div className="text-base font-black text-indigo-300 mt-0.5">{Math.round(netPayable).toLocaleString()}</div>
                    <div className="text-[9.5px] text-slate-400 mt-1">
                        মূল বেতন: {agreedSalary.toLocaleString()}
                        {(bonus + overtime) > 0 && ` | বোনাস/OT: +৳${(bonus + overtime).toLocaleString()}`}
                        {totalDeduction > 0 && ` | কর্তন: -৳${Math.round(totalDeduction).toLocaleString()}`}
                    </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">পূর্বে মোট পরিশোধিত</div>
                    <div className="text-base font-black text-emerald-400 mt-0.5">{previousPaidTotal.toLocaleString()}</div>
                    <div className="text-[9.5px] text-slate-400 mt-1">
                        {paymentsHistory.length > 0 ? `${paymentsHistory.length} টি ভাউচারে পরিশোধ করা হয়েছে` : 'এখনও কোনো পেমেন্ট নেওয়া হয়নি'}
                    </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">বর্তমান অবশিষ্ট পাওনা</div>
                    <div className={`text-base font-black mt-0.5 ${dueBeforeThisEntry > 0 ? 'text-amber-400' : dueBeforeThisEntry === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {Math.round(dueBeforeThisEntry).toLocaleString()}
                    </div>
                    <div className="text-[9.5px] text-slate-400 mt-1">
                        {dueBeforeThisEntry > 0 ? 'বকেয়া পাওনা রয়েছে' : dueBeforeThisEntry === 0 ? 'সম্পূর্ণ পরিশোধিত' : 'অতিরিক্ত পরিশোধিত'}
                    </div>
                </div>
            </div>

            {/* Payment history list */}
            <div className="bg-slate-900/70 border border-slate-800/80 p-3 rounded-xl">
                <div className="text-[10px] font-black uppercase text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>চলতি মাসের পেমেন্ট ইতিহাস (Payment History):</span>
                    <span className="font-mono text-emerald-400 text-xs font-black">মোট: {previousPaidTotal.toLocaleString()}</span>
                </div>
                {paymentsHistory.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-1">
                        এই মাসে এ পর্যন্ত কোনো টাকা প্রদান করা হয়নি।
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {paymentsHistory.map((p, pIdx) => (
                            <span key={pIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono shadow-sm">
                                <span className="text-amber-400 font-bold">📅 {p.date}</span>: 
                                <span className="text-emerald-400 font-black">{p.amount.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 font-sans">({p.dept || 'Accounts'}{p.description ? ` - ${p.description}` : ''})</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Real-time Dynamic Feedback & Red Warning Alert */}
            {isOverpaid ? (
                <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-100 p-3.5 rounded-xl text-xs font-bold flex items-start gap-3 shadow-lg animate-pulse">
                    <span className="text-2xl leading-none">⚠️</span>
                    <div className="space-y-1">
                        <div className="font-black text-rose-300 uppercase text-xs tracking-wider">
                            সতর্কবার্তা: নির্ধারিত পাওনা বেতনের চেয়ে অতিরিক্ত টাকা প্রদান করা হচ্ছে!
                        </div>
                        <div className="text-xs text-rose-100 leading-relaxed">
                            চলতি মাসে কর্মচারীর নির্ধারিত মোট পাওনা বেতন <span className="font-mono font-black text-white">{Math.round(netPayable).toLocaleString()}</span> টাকা। 
                            পূর্বে পরিশোধিত {previousPaidTotal.toLocaleString()} + বর্তমান এন্ট্রি {numInputPaid.toLocaleString()} = মোট {totalPaidWithCurrent.toLocaleString()} টাকা প্রদান করা হচ্ছে। 
                            ফলস্বরূপ, কর্মচারীকে <span className="underline font-black text-white bg-rose-900/60 px-1.5 py-0.5 rounded">{overpaidAmount.toLocaleString()} টাকা অতিরিক্ত (Overpayment)</span> দেওয়া হচ্ছে, যা আগামী মাসের বেতন থেকে অগ্রিম (Advance) হিসেবে সমন্বয় করা হবে।
                        </div>
                    </div>
                </div>
            ) : numInputPaid > 0 ? (
                <div className="bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 p-3 rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-md">
                    <span className="flex items-center gap-2">
                        <span className="text-base text-emerald-400">✓</span> 
                        <span>এই ভাউচারে {numInputPaid.toLocaleString()} টাকা পরিশোধের পর অবশিষ্ট পাওনা থাকবে:</span>
                    </span>
                    <span className="font-black text-sm text-emerald-400 font-mono bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        {Math.round(remainingDueAfterCurrent).toLocaleString()}
                    </span>
                </div>
            ) : null}
        </div>
    );
};

const DailyExpenseForm: React.FC<any> = ({ 
    selectedDate, onDateChange, allDetailedExpenses, setDetailedExpenses, onSave, onDelete, onEdit, 
    employees, monthlyRoster, editingItem, diagnosticSettings, setDiagnosticSettings, performBlockingSync, reagents, setReagents,
    setSuccessMessage, availableTests, attendanceLog = {}, leaveLog = {}, isSaving
}) => {
    const [items, setItems] = useState<ExpenseItem[]>([]);
    const [localDate, setLocalDate] = useState(selectedDate);

    // Sync local date with prop if prop changes from outside
    useEffect(() => {
        setLocalDate(selectedDate);
        setSearchDate(selectedDate);
        const d = new Date(selectedDate);
        if (!isNaN(d.getTime())) {
            setSearchMonth(d.getMonth());
            setSearchYear(d.getFullYear());
        }
    }, [selectedDate]);

    // Initialize items: Empty row or the specific item being edited
    useEffect(() => {
        if (editingItem && editingItem.date === selectedDate) {
            setItems([{ ...editingItem }]);
        } else {
            setItems([{
                id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, 
                category: expenseCategories[0], 
                subCategory: '', 
                description: '', 
                billAmount: 0, 
                paidAmount: 0, 
                dept: 'Diagnostic'
            }]);
        }
    }, [selectedDate, editingItem]);

    const [savedSearchTerm, setSavedSearchTerm] = useState('');
    const [savedCategoryFilter, setSavedCategoryFilter] = useState('All');
    const [searchDate, setSearchDate] = useState(selectedDate);
    const [searchMonth, setSearchMonth] = useState(new Date().getMonth());
    const [searchYear, setSearchYear] = useState(new Date().getFullYear());
    const [searchMode, setSearchMode] = useState<'date' | 'month' | 'year' | 'all'>('date');
    const [historyItem, setHistoryItem] = useState<ExpenseItem | null>(null);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

    const handleCleanDuplicates = async () => {
        if (!window.confirm("আপনি কি সমস্ত ডুপ্লিকেট/ডাবল খরচের হিসাব স্বয়ংক্রিয়ভাবে ক্লিন করতে চান? এতে শুধু ডুপ্লিকেটগুলো মুছে মূল ডাটা অপরিবর্তিত থাকবে।")) return;
        try {
            setIsCleaningDuplicates(true);
            const res = await dbService.cleanDuplicateExpenses();
            if (res?.success) {
                if (res.newExpenses && setDetailedExpenses) {
                    setDetailedExpenses(res.newExpenses);
                }
                setSuccessMessage(`মোট ${res.cleanedCount} টি ডুপ্লিকেট খরচ ক্লিন করা হয়েছে!`);
                setTimeout(() => setSuccessMessage(''), 5000);
            } else {
                setSuccessMessage("কোনো ডুপ্লিকেট খরচ পাওয়া যায়নি।");
                setTimeout(() => setSuccessMessage(''), 4000);
            }
        } catch (err: any) {
            alert("ডুপ্লিকেট ক্লিন করতে ত্রুটি: " + (err?.message || err));
        } finally {
            setIsCleaningDuplicates(false);
        }
    };

    const handleDateChange = (newDate: string) => {
        onDateChange(newDate);
        setSearchDate(newDate);
    };

    const periodKey = selectedDate ? selectedDate.substring(0, 7) : new Date().toISOString().substring(0, 7); // YYYY-MM
    const activeEmpIds = (monthlyRoster && monthlyRoster[periodKey]) || [];
    const filteredEmployees = (employees || []).filter((e: any) => activeEmpIds.length > 0 ? activeEmpIds.includes(e.emp_id) : (e.status === 'Active' || !e.status));

    const handleItemChange = (id: any, field: keyof ExpenseItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (String(item.id) === String(id)) {
                const oldValue = item[field];
                if (oldValue === value) return item;

                const history = item.editHistory || [];
                const newLog = {
                    timestamp: new Date().toISOString(),
                    field,
                    oldValue,
                    newValue: value
                };

                return { 
                    ...item, 
                    [field]: value, 
                    isEdited: true, 
                    lastEditedAt: new Date().toISOString(),
                    editHistory: [...history, newLog]
                };
            }
            return item;
        }));
    };

    const addItem = () => setItems(prev => [...prev, { 
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, 
        category: expenseCategories[0], 
        subCategory: '', 
        description: '', 
        billAmount: 0, 
        paidAmount: 0, 
        dept: 'Diagnostic' 
    }]);
    const removeItem = (id: any) => setItems(prev => prev.filter(i => String(i.id) !== String(id)));

    const [editingBatchItem, setEditingBatchItem] = useState<any>(null);

    const handleEditSavedItem = (savedItem: any) => {
        onDateChange(savedItem.date);
        if (savedItem.metadata?.isBatchPurchase) {
            setEditingBatchItem(savedItem);
            setShowBatchModal(true);
        } else {
            onEdit(savedItem);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSaveBatch = async (batchDate: string, batchItems: any[], discount: number, paid: number, existingItem?: any) => {
        setIsSaving(true);
        const subTotal = batchItems.reduce((acc, r) => acc + (Number(r.qty) * Number(r.unitPrice)), 0);
        const netPayable = subTotal - discount;

        const updatedReagents = [...reagents];
        
        // Revert old stock if editing an existing batch purchase
        if (existingItem && existingItem.metadata?.isBatchPurchase && Array.isArray(existingItem.metadata.items)) {
            existingItem.metadata.items.forEach((oldB: any) => {
                const rIdx = updatedReagents.findIndex(rg => rg.reagent_id === oldB.reagentId);
                if (rIdx !== -1) {
                    updatedReagents[rIdx] = {
                        ...updatedReagents[rIdx],
                        quantity: Math.max(0, (updatedReagents[rIdx].quantity || 0) - (Number(oldB.qty) || 0))
                    };
                }
            });
        }
        
        batchItems.forEach((b, idx) => {
            if (b.isNew) {
                const nameToMatch = (b.newReagentName || '').trim();
                const existingIdx = updatedReagents.findIndex(rg => rg.reagent_name.trim().toLowerCase() === nameToMatch.toLowerCase());
                if (existingIdx !== -1) {
                    b.reagentId = updatedReagents[existingIdx].reagent_id;
                    updatedReagents[existingIdx] = {
                        ...updatedReagents[existingIdx],
                        quantity: (updatedReagents[existingIdx].quantity || 0) + (Number(b.qty) || 0),
                        company: b.newCompany || updatedReagents[existingIdx].company,
                        linked_test: b.linkedTest || updatedReagents[existingIdx].linked_test,
                        linked_category: b.linkedCategory || updatedReagents[existingIdx].linked_category,
                        usage_start_date: b.usageStartDate || updatedReagents[existingIdx].usage_start_date
                    };
                } else {
                    const newId = `rg_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`;
                    b.reagentId = newId; 
                    updatedReagents.push({
                        reagent_id: newId,
                        reagent_name: nameToMatch || 'New Reagent',
                        quantity: Number(b.qty) || 0,
                        unit: b.newUnit || 'Bottle',
                        availability: true,
                        company: b.newCompany || '',
                        capacity_per_unit: b.newCapacity || '',
                        linked_test: b.linkedTest || '',
                        linked_category: b.linkedCategory || '',
                        usage_start_date: b.usageStartDate || ''
                    });
                }
            } else {
                const rIdx = updatedReagents.findIndex(rg => rg.reagent_id === b.reagentId);
                if (rIdx !== -1) {
                    updatedReagents[rIdx] = {
                        ...updatedReagents[rIdx],
                        quantity: (updatedReagents[rIdx].quantity || 0) + (Number(b.qty) || 0),
                        linked_test: b.linkedTest || updatedReagents[rIdx].linked_test,
                        linked_category: b.linkedCategory || updatedReagents[rIdx].linked_category,
                        usage_start_date: b.usageStartDate || updatedReagents[rIdx].usage_start_date
                    };
                }
            }
        });

        const descriptionList = batchItems.map(b => {
            const r = updatedReagents.find((rg:any) => rg.reagent_id === b.reagentId);
            return `${r?.reagent_name || 'Unknown'} (${b.qty})`;
        }).join(', ');
        
        const newExpense: ExpenseItem = {
            id: existingItem ? existingItem.id : Date.now(),
            category: 'Reagent buy',
            subCategory: 'Batch Purchase',
            description: descriptionList,
            billAmount: netPayable,
            paidAmount: paid,
            dept: 'Diagnostic',
            metadata: { isBatchPurchase: true, discount, items: batchItems },
            editHistory: existingItem ? [...(existingItem.editHistory || []), { timestamp: new Date().toISOString(), field: 'UPDATED', oldValue: 'Batch Edited', newValue: 'Batch Edited' }] : []
        };

        const currentExpenses = allDetailedExpenses[batchDate] || [];
        const updatedDateExpenses = [...currentExpenses];
        
        if (existingItem && existingItem.date === batchDate) {
            const idx = updatedDateExpenses.findIndex(it => it.id === existingItem.id);
            if (idx !== -1) updatedDateExpenses[idx] = newExpense;
        } else if (existingItem && existingItem.date !== batchDate) {
            // Remove from old date, add to new date
            const oldDateExpenses = allDetailedExpenses[existingItem.date] || [];
            // allDetailedExpenses[existingItem.date] = oldDateExpenses.filter(it => it.id !== existingItem.id); // Fixed immutability
            updatedDateExpenses.push(newExpense);
        } else {
            updatedDateExpenses.push(newExpense);
        }

        const newDetailedExpenses = {
            ...allDetailedExpenses,
            [batchDate]: updatedDateExpenses
        };

        // 1. Direct modular database save FIRST (Online check)
        let saveResult: any = { success: false, error: 'Connection error' };
        try {
            saveResult = await dbService.saveExpensesDirectly(batchDate, updatedDateExpenses, newDetailedExpenses);
        } catch (e: any) {
            console.warn("Batch purchase direct save notice:", e);
            saveResult = { success: false, error: e?.message };
        }

        if (!saveResult.success) {
            alert("অনলাইনে ব্যাচ পারচেজ সেভ হয়নি! " + (saveResult.error || "দয়া করে ইন্টারনেট ও ডাটাবেজ কানেকশন চেক করুন।"));
            setIsSaving(false);
            return;
        }

        // 2. Sync full state
        if (performBlockingSync) {
            try {
                await performBlockingSync({ 
                    detailedExpenses: newDetailedExpenses,
                    reagents: updatedReagents
                });
            } catch (e) {
                console.warn("Batch purchase blocking sync notice:", e);
            }
        }

        // 3. Update local React state and show success message ONLY after confirmed online save
        if (setDetailedExpenses) setDetailedExpenses(newDetailedExpenses);
        if (setReagents) setReagents(updatedReagents);
        setShowBatchModal(false);
        setSuccessMessage('Batch purchase saved & stock updated online!');
        setTimeout(() => setSuccessMessage(''), 3000);
        setIsSaving(false);
    };

    const handleSave = () => {
        const targetDate = (localDate && localDate.length === 10) ? localDate : selectedDate;
        if (items.every(it => it.paidAmount <= 0 && !it.subCategory && !it.description)) {
            alert("দয়া করে অন্তত একটি খরচের হিসাব সঠিকভাবে লিখুন।");
            return;
        }

        const validItems = items.filter(it => it.paidAmount > 0 || it.subCategory || it.description);
        onDateChange(targetDate);
        setSearchDate(targetDate);
        const d = new Date(targetDate);
        if (!isNaN(d.getTime())) {
            setSearchMonth(d.getMonth());
            setSearchYear(d.getFullYear());
        }
        onSave(targetDate, validItems);

        // Reset items to a single clean row after saving new entries
        if (!editingItem) {
            setItems([{
                id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, 
                category: expenseCategories[0], 
                subCategory: '', 
                description: '', 
                billAmount: 0, 
                paidAmount: 0, 
                dept: 'Diagnostic'
            }]);
        }
    };

    const handleDeleteSavedItem = (savedItem: any) => {
        onDelete(savedItem.date, savedItem.id);
    };

    const totalPaid = items.reduce((acc, item) => acc + (Number(item.paidAmount) || 0), 0);
    
    // Normalizer function for accurate Bengali and English search matching
    const normalizeSearchText = (str: any): string => {
        if (str === null || str === undefined) return '';
        let s = String(str).normalize('NFC').toLowerCase();
        
        // Bengali digits to English digits
        const bnDigits: Record<string, string> = {
            '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
            '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
        };
        s = s.replace(/[০-৯]/g, d => bnDigits[d] || d);
        
        // Remove zero-width & formatting characters
        s = s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
        
        // Normalize decomposed Bengali characters
        s = s.replace(/\u09A1\u09BC/g, 'ড়');
        s = s.replace(/\u09A2\u09BC/g, 'ঢ়');
        s = s.replace(/\u09AF\u09BC/g, 'য়');
        s = s.replace(/\u09B0\u09BC/g, 'র');
        
        // Phonetic / spelling tolerance in Bengali
        s = s.replace(/[ড়ঢ়]/g, 'র');
        s = s.replace(/[ীি]/g, 'ি');
        s = s.replace(/[ূু]/g, 'ু');
        s = s.replace(/[শষস]/g, 'স');
        s = s.replace(/[ণন]/g, 'ন');
        s = s.replace(/ৎ/g, 'ত');
        s = s.replace(/ং/g, 'ঙ');
        s = s.replace(/ঃ/g, '');
        s = s.replace(/ঁ/g, '');
        s = s.replace(/্য/g, '');
        s = s.replace(/য়/g, 'য');
        
        // Remove extra spaces and punctuation
        return s.replace(/[\s\-_/\\,.:;()]+/g, '').trim();
    };

    // Helper to map any category variation / Bangla / English to standard category name
    const getCanonicalCategory = (rawCat: string): string => {
        if (!rawCat) return '';
        const clean = String(rawCat).trim();
        if (expenseCategories.includes(clean)) return clean;
        
        for (const [eng, bng] of Object.entries(expenseCategoryBanglaMap)) {
            if (bng === clean || normalizeSearchText(bng) === normalizeSearchText(clean)) {
                return eng;
            }
            if (normalizeSearchText(eng) === normalizeSearchText(clean)) {
                return eng;
            }
        }

        const lower = clean.toLowerCase();
        if (lower.includes('house') || lower.includes('rent') || lower.includes('বাড়ি') || lower.includes('বাড়ি') || lower.includes('ভাড়া') || lower.includes('ভাড়া')) {
            return 'House rent';
        }
        if (lower.includes('stuff') || lower.includes('staff') || lower.includes('salary') || lower.includes('স্টাফ') || lower.includes('স্যালারি') || lower.includes('বেতন')) {
            return 'Stuff salary';
        }
        if (lower.includes('motor') || lower.includes('bike') || lower.includes('মোটর') || lower.includes('সাইকেল') || lower.includes('বাইক')) {
            return 'Motorcycle';
        }
        if (lower.includes('electr') || lower.includes('বিদ্যুৎ') || lower.includes('কারেন্ট')) {
            return 'Electricity bill';
        }
        if (lower.includes('reagent') || lower.includes('রিএজেন্ট')) {
            return 'Reagent buy';
        }
        if (lower.includes('x-ray') || lower.includes('film') || lower.includes('ফিল্ম')) {
            return 'X-ray Film buy';
        }
        if (lower.includes('marketing') || lower.includes('মার্কেটিং')) {
            return 'Marketing';
        }
        if (lower.includes('doctor') || lower.includes('donation') || lower.includes('vehicle') || lower.includes('ডাক্তার') || lower.includes('ডোনেশন')) {
            return 'Doctor donation & Vehicle service';
        }
        if (lower.includes('instrument') || lower.includes('যন্ত্রপাতি')) {
            return 'Instruments buy/ repair';
        }
        if (lower.includes('development') || lower.includes('উন্নয়ন') || lower.includes('উন্নয়ন')) {
            return 'Diagnostic development';
        }
        if (lower.includes('maintenance') || lower.includes('রক্ষণাবেক্ষণ')) {
            return 'Maintenance';
        }
        if (lower.includes('license') || lower.includes('লাইসেন্স')) {
            return 'License cost';
        }
        if (lower.includes('mobile') || lower.includes('flexi') || lower.includes('মোবাইল') || lower.includes('ফ্লেক্সি')) {
            return 'Mobile buy/ Flexiload';
        }
        if (lower.includes('press') || lower.includes('প্রেস')) {
            return 'Press Cost';
        }
        if (lower.includes('food') || lower.includes('meal') || lower.includes('খাবার') || lower.includes('লাঞ্চ')) {
            return 'Food/Meal Cost';
        }
        if (lower.includes('paper') || lower.includes('dish') || lower.includes('wifi') || lower.includes('ওয়াইফাই') || lower.includes('ডিশ') || lower.includes('পেপার')) {
            return 'Paper / Dish / Wifi Bill';
        }
        if (lower.includes('electronic') || lower.includes('ইলেকট্রনিক্স') || lower.includes('ইলেকট্রিক্যাল')) {
            return 'Electrical and Electronics';
        }

        return clean;
    };
    
    const filteredSavedItems = useMemo(() => {
        const allItems: any[] = [];
        Object.entries(allDetailedExpenses || {}).forEach(([date, items]: [string, any]) => {
            const norm = normalizeDate(date);
            const [y, m] = (norm || date).split('-').map(Number);
            
            let matchesTime = false;
            if (searchMode === 'date') matchesTime = (norm || date) === searchDate;
            else if (searchMode === 'month') matchesTime = (m - 1 === searchMonth && y === searchYear);
            else if (searchMode === 'year') matchesTime = y === searchYear;
            else if (searchMode === 'all') matchesTime = true;

            if (matchesTime && Array.isArray(items)) {
                items.filter((it: any) => !it.isDeleted && (it.dept === 'Diagnostic' || (!it.dept && expenseCategories.includes(it.category)))).forEach((it: any) => {
                    allItems.push({ ...it, date });
                });
            }
        });

        return allItems.filter((it: any) => {
            const cat = it.category || '';
            const itemCanonicalCat = getCanonicalCategory(cat);

            // 1. Strict Category Dropdown Filter
            if (savedCategoryFilter !== 'All') {
                const filterCanonicalCat = getCanonicalCategory(savedCategoryFilter);
                if (itemCanonicalCat !== filterCanonicalCat) {
                    return false;
                }
            }

            // 2. Comprehensive Search Query Filter
            if (savedSearchTerm && savedSearchTerm.trim()) {
                const rawTokens = savedSearchTerm.trim().split(/\s+/).filter(Boolean);
                
                const bngCat = expenseCategoryBanglaMap[cat] || expenseCategoryBanglaMap[itemCanonicalCat] || '';
                const subCat = it.subCategory || '';
                const desc = it.description || '';
                const dateStr = it.date || '';
                const paidStr = String(it.paidAmount || '');
                const billStr = String(it.billAmount || '');
                const deptStr = it.dept || '';

                const itemFields = [
                    cat,
                    itemCanonicalCat,
                    bngCat,
                    subCat,
                    desc,
                    dateStr,
                    paidStr,
                    billStr,
                    deptStr
                ];

                const combinedNormalized = itemFields.map(f => normalizeSearchText(f)).join('###');
                const combinedRaw = itemFields.map(f => String(f).toLowerCase()).join(' ');

                const matchesAllTokens = rawTokens.every(token => {
                    const normToken = normalizeSearchText(token);
                    const rawToken = token.toLowerCase();
                    
                    return (
                        (rawToken && combinedRaw.includes(rawToken)) ||
                        (normToken && combinedNormalized.includes(normToken))
                    );
                });

                if (!matchesAllTokens) return false;
            }
            
            return true;
        }).sort((a, b) => {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            return timeB - timeA;
        });
    }, [allDetailedExpenses, searchDate, searchMonth, searchYear, searchMode, savedSearchTerm, savedCategoryFilter]);

    const totalFilteredSavedAmount = useMemo(() => {
        return filteredSavedItems.reduce((acc, it) => acc + (Number(it.paidAmount) || 0), 0);
    }, [filteredSavedItems]);

    const descriptionSuggestions = useMemo(() => {
        const suggestions: Record<string, Set<string>> = {};
        Object.values(allDetailedExpenses || {}).forEach((dayItems: any) => {
            if (Array.isArray(dayItems)) {
                dayItems.forEach((item: any) => {
                    if (item.subCategory && item.description) {
                        const key = `${item.category}|${item.subCategory}`;
                        if (!suggestions[key]) suggestions[key] = new Set();
                        
                        // Capitalize and unique check (case insensitive)
                        const desc = item.description.trim().replace(/\s+/g, ' ');
                        if (desc) {
                            const titleCaseDesc = desc.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
                            
                            // Check if a similar description already exists (case-insensitive check)
                            const currentDescList = Array.from(suggestions[key]);
                            if (!currentDescList.some(s => s.toLowerCase() === titleCaseDesc.toLowerCase())) {
                                suggestions[key].add(titleCaseDesc);
                            }
                        }
                    }
                });
            }
        });
        return suggestions;
    }, [allDetailedExpenses]);

    const [showSubCatSettings, setShowSubCatSettings] = useState(false);
    const [editingCategory, setEditingCategory] = useState('');
    const customSubCategories = diagnosticSettings?.customSubCategories || {};

    const getSubCategories = (category: string) => {
        let defaultSubs = subCategoryMap[category] || [];
        if (category === 'Reagent buy' || category === 'X-ray Film buy') {
            const reagentNames = (reagents || []).map((r: any) => r.reagent_name).filter(Boolean);
            defaultSubs = [...defaultSubs, ...reagentNames];
        }
        
        const customSubs = customSubCategories[category] || [];
        return Array.from(new Set([...defaultSubs, ...customSubs]));
    };

    const handleAddCustomSubCat = async (category: string, newSub: string) => {
        if (!newSub.trim()) return;
        const newSettings = {
            ...diagnosticSettings,
            customSubCategories: {
                ...customSubCategories,
                [category]: Array.from(new Set([...(customSubCategories[category] || []), newSub.trim()]))
            }
        };
        setDiagnosticSettings(newSettings);
        // Sync to cloud
        await performBlockingSync({ diagnosticSettings: newSettings });
    };

    const handleRemoveCustomSubCat = async (category: string, subToRemove: string) => {
        const newSettings = {
            ...diagnosticSettings,
            customSubCategories: {
                ...customSubCategories,
                [category]: (customSubCategories[category] || []).filter((s: string) => s !== subToRemove)
            }
        };
        setDiagnosticSettings(newSettings);
        // Sync to cloud
        await performBlockingSync({ diagnosticSettings: newSettings });
    };

    return (
        <div className="space-y-10">
            <div className="bg-sky-950/40 rounded-[2rem] p-8 border border-sky-800 shadow-xl no-print relative">
                {historyItem && <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}
                
                {/* Custom Sub-Category Settings Modal */}
                {showSubCatSettings && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-zoom-in">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                                <div>
                                    <h3 className="font-black text-sky-400 uppercase text-sm tracking-widest">Manage Items</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{editingCategory}</p>
                                </div>
                                <button onClick={() => setShowSubCatSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                                    <XIcon size={20} />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Add New Item</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                id="new-sub-input"
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-sky-500 outline-none"
                                                placeholder="Enter item name..."
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = (e.target as HTMLInputElement).value;
                                                        handleAddCustomSubCat(editingCategory, val);
                                                        (e.target as HTMLInputElement).value = '';
                                                    }
                                                }}
                                            />
                                            <button 
                                                onClick={() => {
                                                    const input = document.getElementById('new-sub-input') as HTMLInputElement;
                                                    handleAddCustomSubCat(editingCategory, input.value);
                                                    input.value = '';
                                                }}
                                                className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase transition-colors"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Your Custom Items</label>
                                        <div className="max-h-[200px] overflow-y-auto space-y-2 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                                            {(!customSubCategories[editingCategory] || customSubCategories[editingCategory].length === 0) ? (
                                                <p className="text-center text-slate-600 text-[10px] py-4 italic">No custom items added yet.</p>
                                            ) : (
                                                customSubCategories[editingCategory].map((sub, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-slate-800 px-3 py-2 rounded-xl text-xs border border-slate-700/50">
                                                        <span className="text-slate-200 font-bold">{sub}</span>
                                                        <button onClick={() => handleRemoveCustomSubCat(editingCategory, sub)} className="text-rose-500 hover:text-rose-400 transition-colors">
                                                            <XIcon size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <p className="text-[9px] text-slate-600 mt-2 italic font-medium">* System categories cannot be removed.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-800/30 border-t border-slate-800 text-center">
                                <button onClick={() => setShowSubCatSettings(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Close Editor</button>
                            </div>
                        </div>
                    </div>
                )}

                
                {showBatchModal && (
                    <BatchPurchaseModal 
                        onClose={() => {
                            setShowBatchModal(false);
                            setEditingBatchItem(null);
                        }}
                        onSave={(date, items, discount, paid, existingItem) => {
                            handleSaveBatch(date, items, discount, paid, existingItem);
                            setEditingBatchItem(null);
                        }}
                        reagents={reagents}
                        availableTests={availableTests}
                        initialData={editingBatchItem}
                    />
                )}
                {/* Blocking Loader for Save */}
                {isSaving && (
                    <div className="absolute inset-0 z-[200] bg-slate-900/60 backdrop-blur-[2px] rounded-[2rem] flex flex-col items-center justify-center text-white">
                        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="font-black uppercase tracking-widest text-[12px] animate-pulse">ডাটা সেভ হচ্ছে...</p>
                    </div>
                )}

                <div className="flex justify-between items-center mb-6 border-b border-sky-800 pb-4">
                    <h3 className="text-xl font-black text-sky-100 flex items-center gap-3"><Activity className="w-6 h-6 text-sky-400" /> Daily Expense Entry</h3>
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setEditingBatchItem(null); setShowBatchModal(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2">
                            <PlusIcon size={16}/> Batch Reagent/Film Buy
                        </button>
                        <input 
                        type="date" 
                        value={localDate} 
                        onChange={(e) => {
                            const val = e.target.value;
                            setLocalDate(val);
                            if (val && val.length === 10) {
                                onDateChange(val);
                                setSearchDate(val);
                                const d = new Date(val);
                                if (!isNaN(d.getTime())) {
                                    setSearchMonth(d.getMonth());
                                    setSearchYear(d.getFullYear());
                                }
                            }
                        }}
                        onBlur={(e) => {
                            const val = e.target.value;
                            if (val && val.length === 10) {
                                onDateChange(val);
                                setSearchDate(val);
                                const d = new Date(val);
                                if (!isNaN(d.getTime())) {
                                    setSearchMonth(d.getMonth());
                                    setSearchYear(d.getFullYear());
                                }
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                if (target.value && target.value.length === 10) {
                                    onDateChange(target.value);
                                    setSearchDate(target.value);
                                    const d = new Date(target.value);
                                    if (!isNaN(d.getTime())) {
                                        setSearchMonth(d.getMonth());
                                        setSearchYear(d.getFullYear());
                                    }
                                }
                            }
                        }}
                        className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm font-black focus:ring-2 focus:ring-sky-500 focus:outline-none" 
                    />
                </div></div>
                <div className="overflow-x-auto min-h-[150px]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs bg-slate-800 text-sky-200 uppercase font-bold tracking-wider border-b border-slate-700">
                                <th className="py-3 px-3">বিভাগ (Category)</th>
                                <th className="py-3 px-3">কর্মচারী / বিবরণ (Employee / Details)</th>
                                <th className="py-3 px-3">বর্ণনা (Description)</th>
                                <th className="py-3 px-3 text-right">পরিশোধিত টাকা (Paid Amount)</th>
                                <th className="py-3 px-3 text-center">X</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {items.map(item => (
                                <React.Fragment key={item.id}>
                                    <tr>
                                        <td className="py-3 pr-2">
                                            <select value={item.category} onChange={e => handleItemChange(item.id, 'category', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm font-black outline-none focus:border-blue-500">
                                                {expenseCategories.map(cat => <option key={cat} value={cat}>{expenseCategoryBanglaMap[cat] ? `${expenseCategoryBanglaMap[cat]} (${cat})` : cat}</option>)}
                                            </select>
                                        </td>
                                        <td className="py-3 pr-2">
                                            {item.category === 'Stuff salary' ? (
                                                <select 
                                                    value={item.subCategory} 
                                                    onChange={e => handleItemChange(item.id, 'subCategory', e.target.value)} 
                                                    className="w-full bg-slate-800 border-2 border-amber-600/50 rounded-xl p-2.5 text-white text-sm font-black outline-none focus:border-amber-500"
                                                >
                                                    <option value="">-- Select Employee --</option>
                                                    {filteredEmployees.map((e:any) => <option key={e.emp_id} value={e.emp_name}>{e.emp_name}</option>)}
                                                </select>
                                            ) : (
                                                <div className="relative group">
                                                    <input 
                                                        list={`list-${item.id}`} 
                                                        value={item.subCategory} 
                                                        onChange={e => handleItemChange(item.id, 'subCategory', e.target.value)} 
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 pr-10 text-white text-sm font-black outline-none focus:border-blue-500" 
                                                        placeholder="Sub-category..." 
                                                    />
                                                    <datalist id={`list-${item.id}`}>
                                                        {getSubCategories(item.category).map((sub, i) => <option key={i} value={sub} />)}
                                                    </datalist>
                                                    <button 
                                                        type="button"
                                                        onClick={() => { setEditingCategory(item.category); setShowSubCatSettings(true); }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition-colors bg-slate-900/50 p-1 rounded" 
                                                        title="Manage sub-categories"
                                                    >
                                                        <Settings size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 pr-2">
                                            <input 
                                                list={`desc-list-${item.id}`}
                                                value={item.description} 
                                                onChange={e => handleItemChange(item.id, 'description', e.target.value)} 
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm font-bold" 
                                                placeholder="Additional details..." 
                                            />
                                            <datalist id={`desc-list-${item.id}`}>
                                                {Array.from(descriptionSuggestions[`${item.category}|${item.subCategory}`] || []).map((desc, i) => (
                                                    <option key={i} value={desc} />
                                                ))}
                                            </datalist>
                                            {(item.category === 'Reagent buy' || item.category === 'X-ray Film buy') && (
                                                <div className="flex flex-col gap-1.5 mt-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            placeholder="Box/Pcs"
                                                            value={item.metadata?.numberOfBoxes || ''}
                                                            onChange={e => handleItemChange(item.id, 'metadata', { ...item.metadata, numberOfBoxes: parseFloat(e.target.value) || 0 })}
                                                            className="w-16 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs font-black text-white text-center focus:border-blue-500 outline-none"
                                                            title="Number of Boxes/Pieces"
                                                        />
                                                        <span className="text-slate-500 font-bold text-xs">×</span>
                                                        <input
                                                            type="number"
                                                            placeholder="Qty/Box"
                                                            value={item.metadata?.quantityPerBox || ''}
                                                            onChange={e => handleItemChange(item.id, 'metadata', { ...item.metadata, quantityPerBox: parseFloat(e.target.value) || 0 })}
                                                            className="w-16 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs font-black text-white text-center focus:border-blue-500 outline-none"
                                                            title="Quantity per Box"
                                                        />
                                                        <div className="ml-auto text-right">
                                                            <div className="text-[9px] text-slate-500 font-black uppercase">Total Add</div>
                                                            <div className="text-emerald-400 font-black text-sm">
                                                                +{(item.metadata?.numberOfBoxes || 0) * (item.metadata?.quantityPerBox || 0)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800">
                                                        <label className="text-[10px] font-black text-amber-400 uppercase whitespace-nowrap">
                                                            Count Start Date (কাউন্ট শুরুর তারিখ):
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={item.metadata?.usageStartDate || selectedDate}
                                                            onChange={e => handleItemChange(item.id, 'metadata', { ...item.metadata, usageStartDate: e.target.value })}
                                                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500 w-full"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {item.category === 'Reagent buy' && (
                                                <div className="mt-2">
                                                    <select 
                                                        value={item.metadata?.linkedTest || ''} 
                                                        onChange={e => handleItemChange(item.id, 'metadata', { ...item.metadata, linkedTest: e.target.value })}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-sky-400 font-bold outline-none focus:border-sky-500"
                                                    >
                                                        <option value="">-- Link to Test Name --</option>
                                                        {(availableTests || []).map((t: any) => (
                                                            <option key={t.test_id} value={t.test_name}>{t.test_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            {item.category === 'X-ray Film buy' && (
                                                <div className="mt-2">
                                                    <select 
                                                        value={item.metadata?.linkedCategory || 'X-Ray'} 
                                                        onChange={e => handleItemChange(item.id, 'metadata', { ...item.metadata, linkedCategory: e.target.value })}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-sky-400 font-bold outline-none focus:border-sky-500"
                                                    >
                                                        <option value="">-- Link to Test Category --</option>
                                                        {testCategories.map((c: string) => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 pr-2"><input type="number" value={item.paidAmount} onChange={e => handleItemChange(item.id, 'paidAmount', parseFloat(e.target.value) || 0)} className="w-28 bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-base font-black text-right outline-none focus:border-emerald-500" onFocus={e => e.target.select()} /></td>
                                        <td className="py-3 text-center"><button onClick={() => removeItem(item.id)} className="text-red-500 font-bold text-2xl hover:text-red-400">×</button></td>
                                    </tr>
                                    {item.category === 'Stuff salary' && item.subCategory && (
                                        <tr className="bg-slate-950/80">
                                            <td colSpan={5} className="px-2 py-1">
                                                <StaffSalaryHelperCard 
                                                    employeeName={item.subCategory}
                                                    employees={employees}
                                                    selectedDate={localDate || selectedDate}
                                                    allDetailedExpenses={allDetailedExpenses}
                                                    attendanceLog={attendanceLog}
                                                    leaveLog={leaveLog}
                                                    currentInputPaid={item.paidAmount || 0}
                                                    currentExpenseId={item.id}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-8 flex justify-between items-center border-t border-sky-900/50 pt-6">
                    <button onClick={addItem} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all">+ Add Item Row</button>
                    <div className="flex items-center gap-8">
                        <div className="text-slate-400 font-black uppercase text-xs tracking-widest">Total Paid: <span className="text-emerald-400 text-3xl font-black ml-2">{totalPaid.toLocaleString()}</span></div>
                        <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white px-12 py-3 rounded-2xl font-black shadow-2xl uppercase text-[11px] tracking-widest transition-all">Save Daily Ledger</button>
                    </div>
                </div>
            </div>

            {/* Saved Expenses List */}
            <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-xl">
                <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-800 pb-4 gap-4">
                    <h3 className="text-xl font-black text-white flex items-center gap-3"><FileTextIcon className="w-6 h-6 text-blue-400" /> Saved Expenses Explorer</h3>
                    
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                            <button onClick={() => setSearchMode('date')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${searchMode === 'date' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Date</button>
                            <button onClick={() => setSearchMode('month')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${searchMode === 'month' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Month</button>
                            <button onClick={() => setSearchMode('year')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${searchMode === 'year' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Year</button>
                            <button onClick={() => setSearchMode('all')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${searchMode === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>All</button>
                        </div>

                        {searchMode === 'date' && (
                            <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl p-2 text-white text-xs font-bold outline-none focus:border-blue-500" />
                        )}
                        {searchMode === 'month' && (
                            <div className="flex gap-2">
                                <select value={searchMonth} onChange={e => setSearchMonth(parseInt(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-xl p-2 text-white text-xs font-bold outline-none focus:border-blue-500">
                                    {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                </select>
                                <select value={searchYear} onChange={e => setSearchYear(parseInt(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-xl p-2 text-white text-xs font-bold outline-none focus:border-blue-500">
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        )}
                        {searchMode === 'year' && (
                            <select value={searchYear} onChange={e => setSearchYear(parseInt(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-xl p-2 text-white text-xs font-bold outline-none focus:border-blue-500">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}

                        <select 
                            value={savedCategoryFilter} 
                            onChange={e => {
                                setSavedCategoryFilter(e.target.value);
                                setSavedSearchTerm(''); // Clear search term when category filter changes to prevent conflicts
                            }} 
                            className="bg-slate-800 border border-slate-700 rounded-xl p-2 text-white text-xs font-bold outline-none focus:border-blue-500"
                        >
                            <option value="All">সব ক্যাটাগরি (All Categories)</option>
                            {expenseCategories.map(cat => <option key={cat} value={cat}>{expenseCategoryBanglaMap[cat] || cat} ({cat})</option>)}
                        </select>

                        <div className="relative w-72">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input 
                                list="saved-categories-search"
                                type="text" 
                                placeholder="খুঁজুন (Category, Sub-cat, details, ৳)..." 
                                value={savedSearchTerm} 
                                onChange={e => setSavedSearchTerm(e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-8 py-2 text-xs text-white outline-none focus:border-blue-500" 
                            />
                            {savedSearchTerm && (
                                <button 
                                    onClick={() => setSavedSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                            <datalist id="saved-categories-search">
                                {expenseCategories.map(cat => (
                                    <React.Fragment key={cat}>
                                        <option value={expenseCategoryBanglaMap[cat] || cat}>
                                            {cat}
                                        </option>
                                        <option value={cat}>
                                            {expenseCategoryBanglaMap[cat] || cat}
                                        </option>
                                    </React.Fragment>
                                ))}
                            </datalist>
                        </div>

                        <button
                            onClick={handleCleanDuplicates}
                            disabled={isCleaningDuplicates}
                            className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                            title="ক্লিন ডুপ্লিকেট খরচ"
                        >
                            {isCleaningDuplicates ? "ক্লিন হচ্ছে..." : "⚡ ডুপ্লিকেট ক্লিন"}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto border border-slate-700 rounded-xl bg-slate-900 shadow-xl">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="text-xs bg-slate-800 text-sky-200 uppercase font-bold tracking-wider border-b border-slate-700">
                                <th className="py-3.5 px-3 w-12">SL</th>
                                <th className="py-3.5 px-3">তারিখ (Date)</th>
                                <th className="py-3.5 px-3">বিভাগ (Category)</th>
                                <th className="py-3.5 px-3">উপ-বিভাগ (Sub-Category)</th>
                                <th className="py-3.5 px-3">বিবরণ (Description)</th>
                                <th className="py-3.5 px-3 text-right">পরিমাণ (Amount)</th>
                                <th className="py-3.5 px-3 text-center">অবস্থা (Status)</th>
                                <th className="py-3.5 px-3 text-center">অ্যাকশন (Action)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredSavedItems.length > 0 ? filteredSavedItems.map((it: any, idx: number) => (
                                <tr key={it.id} className="hover:bg-slate-800/80 even:bg-slate-900/70 odd:bg-slate-850/40 transition-colors">
                                    <td className="py-3.5 px-3 text-slate-300 font-mono font-bold">{idx + 1}</td>
                                    <td className="py-3.5 px-3 text-slate-200 font-bold">{it.date}</td>
                                    <td className="py-3.5 px-3">
                                        <div className="font-extrabold text-white text-xs mb-0.5">
                                            {expenseCategoryBanglaMap[it.category] || it.category}
                                        </div>
                                        <div className="text-[10px] text-sky-300 font-medium">
                                            {it.category}
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-3 text-slate-200 font-medium">{it.subCategory}</td>
                                    <td className="py-3.5 px-3 text-slate-300">{it.description}</td>
                                    <td className="py-3.5 px-3 text-right font-black text-white text-sm">{Number(it.paidAmount || it.paid_amount || it.amount || 0).toLocaleString()}</td>
                                    <td className="py-3.5 px-3 text-center">
                                        {it.isEdited ? (
                                            <span className="bg-amber-900/30 text-amber-300 px-2 py-1 rounded text-[10px] font-bold uppercase border border-amber-500/40" title={`Edited at ${it.lastEditedAt}`}>Edited</span>
                                        ) : (
                                            <span className="bg-emerald-900/30 text-emerald-300 px-2 py-1 rounded text-[10px] font-bold uppercase border border-emerald-500/40">Original</span>
                                        )}
                                    </td>
                                    <td className="py-4 text-center space-x-2">
                                        <button 
                                            onClick={() => setHistoryItem(it)} 
                                            className="text-emerald-400 hover:text-emerald-300 font-black uppercase text-[10px] tracking-widest border border-emerald-500/30 px-3 py-1 rounded-lg hover:bg-emerald-600/10 transition-all"
                                        >
                                            History
                                        </button>
                                        <button 
                                            onClick={() => handleEditSavedItem(it)} 
                                            className="text-blue-400 hover:text-blue-300 font-black uppercase text-[10px] tracking-widest border border-blue-500/30 px-3 py-1 rounded-lg hover:bg-blue-600/10 transition-all"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteSavedItem(it)} 
                                            className="text-rose-400 hover:text-rose-300 font-black uppercase text-[10px] tracking-widest border border-rose-500/30 px-3 py-1 rounded-lg hover:bg-rose-600/10 transition-all"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="py-10 text-center text-slate-600 font-bold italic">No saved expenses found for the selected criteria.</td>
                                </tr>
                            )}
                        </tbody>
                        {filteredSavedItems.length > 0 && (
                            <tfoot className="bg-slate-950 border-t-2 border-slate-800 text-white font-black">
                                <tr>
                                    <td colSpan={5} className="py-4 text-right uppercase tracking-widest text-slate-500 pr-4">Total Filtered Amount:</td>
                                    <td className="py-4 text-right text-emerald-400 text-lg pr-2">{totalFilteredSavedAmount.toLocaleString()}</td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

const DiagnosticAccountsPage: React.FC<any> = ({ 
    onBack, invoices, dueCollections, employees, detailedExpenses, setDetailedExpenses, monthlyRoster,
    patients, doctors, diagnosticSettings, setDiagnosticSettings, performBlockingSync, availableTests = [], reagents = [], setReagents,
    attendanceLog = {}, leaveLog = {}, consolidatedLabEntries
}) => {
    const [consolidatedEntries, setConsolidatedEntries] = useState<any[]>(() => {
        return (consolidatedLabEntries && consolidatedLabEntries.length > 0)
            ? consolidatedLabEntries
            : dbService.getConsolidatedEntries();
    });

    useEffect(() => {
        if (consolidatedLabEntries && consolidatedLabEntries.length > 0) {
            setConsolidatedEntries(consolidatedLabEntries);
        } else {
            setConsolidatedEntries(dbService.getConsolidatedEntries());
        }
    }, [consolidatedLabEntries]);

    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const handleDateChange = (newDate: string) => {
        setSelectedDate(newDate);
        const dateObj = new Date(newDate);
        if (!isNaN(dateObj.getTime())) {
            setSelectedMonth(dateObj.getMonth());
            setSelectedYear(dateObj.getFullYear());
        }
    };

    const [activeTab, setActiveTab] = useState<'entry' | 'diagnostic_expense' | 'daily' | 'monthly' | 'yearly' | 'detail' | 'due'>('entry');
    
    // Detailed Collection States
    const [detailViewMode, setDetailViewMode] = useState<'today' | 'month' | 'year' | 'date'>('today');
    const [detailSearch, setDetailSearch] = useState('');
    const [detailFilterCategory, setDetailFilterCategory] = useState('All');
    const [viewingInvoice, setViewingInvoice] = useState<any>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    
    const [dueSearch, setDueSearch] = useState('');
    const [dueViewMode, setDueViewMode] = useState<'all' | 'date' | 'month' | 'year'>('all');
    const [successMessage, setSuccessMessage] = useState('');
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const [editingItem, setEditingItem] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [trackedTests, setTrackedTests] = useState<string[]>(() => {
        const defaultTests = [
            'CBC', 'Lipid Profile', 'Blood Sugar', 'HBsAg', 'Urine R/E', 
            'S. Creatinine', 'Widal Test', 'TSH', 'S. Bilirubin', 'VDRL', 
            'HbA1c', 'SGPT', 'CRP', 'Dengue NS1', 'Blood Grouping', 'Serum Uric Acid',
            'X-Ray Chest PA', 'ECG'
        ];
        const saved = localStorage.getItem('diagnostic_tracked_tests');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length < 18) {
                return [...parsed, ...defaultTests.slice(parsed.length, 18)];
            }
            return parsed;
        }
        return defaultTests;
    });
    const [isEditingTracked, setIsEditingTracked] = useState(false);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
    const [dropdownSearch, setDropdownSearch] = useState<string>('');

    useEffect(() => {
        localStorage.setItem('diagnostic_tracked_tests', JSON.stringify(trackedTests));
    }, [trackedTests]);

    useEffect(() => {
        if (successMessage) { const t = setTimeout(() => setSuccessMessage(''), 3000); return () => clearTimeout(t); }
    }, [successMessage]);

    const handleSaveExpense = (date: string, items: ExpenseItem[]) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirm Save',
            message: 'আপনি কি এই খরচের ডাটাগুলো সেভ করতে চান?',
            onConfirm: () => executeSaveExpense(date, items)
        });
    };

    const executeSaveExpense = async (date: string, items: ExpenseItem[]) => {
        setIsSaving(true);
        try {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            
            const safePrev = detailedExpenses || {};
            const existingItems = safePrev[date] || [];
            
            // Separate items into those that stay (other depts AND existing diagnostic that aren't being overwritten)
            const otherDeptItems = existingItems.filter((it: any) => it.dept !== 'Diagnostic');
            const prevDiagItems = existingItems.filter((it: any) => it.dept === 'Diagnostic');

            const incomingItems = (items || []).map((it, idx) => ({ 
                ...it, 
                id: it.id ? String(it.id) : `exp_${date.replace(/-/g, '')}_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                dept: 'Diagnostic' as const,
                date: date
            }));

            // Logic: 
            // If editingItem exists, find and replace IT specifically in the list.
            // If not editingItem, APPEND new items to existing diagnostic items.
            let finalDiagItems: ExpenseItem[] = [];
            if (editingItem) {
                const editIdStr = String(editingItem.id).trim();
                let replaced = false;
                finalDiagItems = prevDiagItems.map(prev => {
                    if (String(prev.id).trim() === editIdStr) {
                        replaced = true;
                        return incomingItems[0] || prev;
                    }
                    return prev;
                });
                if (!replaced && incomingItems.length > 0) {
                    finalDiagItems.push(...incomingItems);
                }
            } else {
                const existingIdSet = new Set(prevDiagItems.map(it => String(it.id).trim()));
                const nonDupIncoming = incomingItems.filter(it => !existingIdSet.has(String(it.id).trim()));
                finalDiagItems = [...prevDiagItems, ...nonDupIncoming];
            }
            
            const newState = { ...safePrev, [date]: [...otherDeptItems, ...finalDiagItems] };
            
            // If there are reagent buys or film buys, update the Reagent's linked_test, linked_category, usage_start_date, and stock quantity
            const updatedReagents = [...reagents];
            let reagentsModified = false;
            incomingItems.forEach((it, idx) => {
                if (it.category === 'Reagent buy' || it.category === 'X-ray Film buy') {
                    const genericSubCats = ['Local Market', 'Company Delivery', 'Special Order', 'Batch Purchase'];
                    
                    let reagentName = '';
                    let companyName = it.metadata?.company || '';

                    // 1. Explicitly provided reagentName in metadata
                    if (it.metadata?.reagentName && it.metadata.reagentName.trim()) {
                        reagentName = it.metadata.reagentName.trim();
                    }

                    // 2. Check if subCategory matches an existing reagent name
                    if (!reagentName && it.subCategory && it.subCategory.trim()) {
                        const subCatTrim = it.subCategory.trim();
                        const matchBySubCat = updatedReagents.find(rg => rg.reagent_name.trim().toLowerCase() === subCatTrim.toLowerCase() || rg.reagent_id === subCatTrim);
                        if (matchBySubCat) {
                            reagentName = matchBySubCat.reagent_name;
                            if (!companyName && it.description && it.description.trim()) {
                                companyName = it.description.trim();
                            }
                        }
                    }

                    // 3. Check if description matches an existing reagent name
                    if (!reagentName && it.description && it.description.trim()) {
                        const descTrim = it.description.trim();
                        const matchByDesc = updatedReagents.find(rg => rg.reagent_name.trim().toLowerCase() === descTrim.toLowerCase());
                        if (matchByDesc) {
                            reagentName = matchByDesc.reagent_name;
                            if (!companyName && it.subCategory && !genericSubCats.includes(it.subCategory.trim())) {
                                companyName = it.subCategory.trim();
                            }
                        }
                    }

                    // 4. If neither matched an existing reagent:
                    if (!reagentName) {
                        const subCatTrim = (it.subCategory || '').trim();
                        const descTrim = (it.description || '').trim();

                        if (descTrim && subCatTrim && !genericSubCats.includes(subCatTrim) && descTrim !== subCatTrim) {
                            reagentName = descTrim;
                            if (!companyName) companyName = subCatTrim;
                        } else if (subCatTrim && !genericSubCats.includes(subCatTrim)) {
                            reagentName = subCatTrim;
                            if (!companyName && descTrim) companyName = descTrim;
                        } else if (descTrim) {
                            reagentName = descTrim;
                        } else if (subCatTrim) {
                            reagentName = subCatTrim;
                        }
                    }

                    if (!reagentName) return;

                    let qtyToAdd = (Number(it.metadata?.numberOfBoxes) || 0) * (Number(it.metadata?.quantityPerBox) || 0);
                    if (qtyToAdd <= 0) qtyToAdd = 1;

                    // Search for existing reagent by exact name match or id
                    const rIdx = updatedReagents.findIndex(rg => 
                        rg.reagent_name.trim().toLowerCase() === reagentName.toLowerCase() ||
                        (it.subCategory && rg.reagent_id === it.subCategory.trim())
                    );

                    if (rIdx !== -1) {
                        updatedReagents[rIdx] = {
                            ...updatedReagents[rIdx],
                            quantity: (updatedReagents[rIdx].quantity || 0) + qtyToAdd,
                            company: companyName || updatedReagents[rIdx].company || '',
                            linked_test: it.metadata?.linkedTest || updatedReagents[rIdx].linked_test,
                            linked_category: it.metadata?.linkedCategory || updatedReagents[rIdx].linked_category,
                            usage_start_date: it.metadata?.usageStartDate || updatedReagents[rIdx].usage_start_date || date
                        };
                        reagentsModified = true;
                    } else {
                        const newId = `rg_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
                        updatedReagents.push({
                            reagent_id: newId,
                            reagent_name: reagentName,
                            quantity: qtyToAdd,
                            unit: 'Box/Pcs',
                            availability: true,
                            company: companyName || '',
                            linked_test: it.metadata?.linkedTest || '',
                            linked_category: it.metadata?.linkedCategory || '',
                            usage_start_date: it.metadata?.usageStartDate || date
                        });
                        reagentsModified = true;
                    }
                }
            });

            console.log(`[DiagnosticAccounts] Saving/Appending ${incomingItems.length} items for ${date}`);

            // Keep selected date and viewing month/year synchronized
            setSelectedDate(date);
            const dateObj = new Date(date);
            if (!isNaN(dateObj.getTime())) {
                setSelectedMonth(dateObj.getMonth());
                setSelectedYear(dateObj.getFullYear());
            }

            // 1. Direct save to Supabase modular table & ncd_state dual persistence FIRST (Online check)
            let saveResult: any = { success: false, error: 'Connection error' };
            try {
                saveResult = await dbService.saveExpensesDirectly(date, finalDiagItems, newState);
            } catch (e: any) {
                console.warn("[DiagnosticAccounts] Direct expense save notice:", e);
                saveResult = { success: false, error: e?.message };
            }

            if (!saveResult.success) {
                alert("অনলাইনে ডাটা সেভ হয়নি! " + (saveResult.error || "দয়া করে ইন্টারনেট ও ডাটাবেজ কানেকশন চেক করুন।"));
                setIsSaving(false);
                return;
            }

            // 2. Sync full state in background
            const syncPayload: any = { detailedExpenses: newState };
            if (reagentsModified) {
                syncPayload.reagents = updatedReagents;
            }
            if (performBlockingSync) {
                try {
                    await performBlockingSync(syncPayload);
                } catch (e) {
                    console.warn("[DiagnosticAccounts] Background blocking sync notice:", e);
                }
            }

            // 3. Optimistically update local React state and show success message ONLY after confirmed online save
            setDetailedExpenses(newState);
            if (reagentsModified && setReagents) {
                setReagents(updatedReagents);
            }
            setEditingItem(null);
            setSuccessMessage("খরচের ডাটা সফলভাবে সেভ হয়েছে।");
            setTimeout(() => setSuccessMessage(''), 4000);
            setIsSaving(false);
        } catch (err) {
            console.error("[DiagnosticAccounts] Critical error saving expense:", err);
            setIsSaving(false);
            alert("সিস্টেম এরর হয়েছে। দয়া করে পেজটি রিফ্রেশ দিন।");
        }
    };

    const handleDeleteExpense = (date: string, id: any) => {
        setConfirmModal({
            isOpen: true,
            title: 'খরচ ডিলিট নিশ্চিতকরণ',
            message: 'আপনি কি নিশ্চিত যে এই খরচের রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?',
            onConfirm: () => executeDeleteExpense(date, id)
        });
    };

    const executeDeleteExpense = async (date: string, id: any) => {
        try {
            const targetIdStr = String(id).trim();
            const safeDetailedExpenses = detailedExpenses || {};
            const newDetailedExpenses: Record<string, ExpenseItem[]> = {};
            
            const updatedReagents = [...reagents];
            let reagentsModified = false;
            let removedCount = 0;

            // Remove from all date keys in detailedExpenses to guarantee removal
            Object.entries(safeDetailedExpenses).forEach(([d, items]) => {
                if (Array.isArray(items)) {
                    newDetailedExpenses[d] = items.filter((it: any) => {
                        const itIdStr = String(it.id).trim();
                        const isMatch = itIdStr === targetIdStr || (d === date && itIdStr === targetIdStr);
                        if (isMatch) {
                            removedCount++;
                            // IF it's a batch purchase, revert stock
                            if (it.metadata?.isBatchPurchase && Array.isArray(it.metadata.items)) {
                                it.metadata.items.forEach((b: any) => {
                                    const rIdx = updatedReagents.findIndex(rg => rg.reagent_id === b.reagentId);
                                    if (rIdx !== -1) {
                                        updatedReagents[rIdx] = {
                                            ...updatedReagents[rIdx],
                                            quantity: Math.max(0, (updatedReagents[rIdx].quantity || 0) - (b.qty || 0))
                                        };
                                        reagentsModified = true;
                                    }
                                });
                            }
                            return false;
                        }
                        return true;
                    });
                } else {
                    newDetailedExpenses[d] = items;
                }
            });

            console.log(`[DiagnosticAccounts] Deleting item ${id} for ${date}, removed: ${removedCount}`);

            // Optimistically update React state immediately
            setDetailedExpenses(newDetailedExpenses);
            if (reagentsModified) setReagents(updatedReagents);
            setSuccessMessage("খরচটি সফলভাবে ডিলিট করা হয়েছে।");
            setTimeout(() => setSuccessMessage(''), 4000);

            // Remove from Supabase separate modular table
            dbService.deleteExpense(date, targetIdStr).catch(e => console.warn("Supabase deleteExpense notice:", e));

            const syncPayload: any = { detailedExpenses: newDetailedExpenses };
            if (reagentsModified) {
                syncPayload.reagents = updatedReagents;
            }

            const success = await performBlockingSync(syncPayload);
            if (!success) {
                console.warn("[DiagnosticAccounts] Cloud sync failed during delete, local state retained");
            }
        } catch (err) {
            console.error("[DiagnosticAccounts] Critical error deleting expense:", err);
            alert("সিস্টেম এরর হয়েছে। দয়া করে পেজটি রিফ্রেশ দিন।");
        }
    };

    const diagnosticExpenseSheetData = useMemo(() => {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const rows = [];
        const categories = expenseCategories;

        const expMap = new Map<string, any[]>();
        const addExp = (it: any, fallbackDate?: string) => {
            if (!it || it.isDeleted) return;
            const norm = normalizeDate(it.date || fallbackDate || '');
            if (!norm) return;
            if (!expMap.has(norm)) expMap.set(norm, []);
            expMap.get(norm)!.push(it);
        };
        if (Array.isArray(detailedExpenses)) {
            detailedExpenses.forEach(it => addExp(it));
        } else if (detailedExpenses && typeof detailedExpenses === 'object') {
            Object.entries(detailedExpenses).forEach(([date, items]: any) => {
                const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
                list.forEach((it: any) => addExp(it, date));
            });
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dailyExps = (expMap.get(dateStr) || []).filter((it: any) => !it.isDeleted && (it.dept === 'Diagnostic' || !it.dept || it.dept === 'Hospital'));
            
            const categorySums: Record<string, number> = {};
            categories.forEach(cat => categorySums[cat] = 0);
            
            dailyExps.forEach(exp => {
                const amt = Number(exp.paidAmount ?? exp.paid_amount ?? exp.amount ?? 0);
                const normCat = normalizeDiagExpenseCategory(exp.category);
                categorySums[normCat] = (categorySums[normCat] || 0) + amt;
            });
            
            const totalDay = Object.values(categorySums).reduce((a, b) => a + b, 0);
            rows.push({ date: dateStr, categories: categorySums, total: totalDay });
        }

        const columnTotals: Record<string, number> = {};
        categories.forEach(cat => {
            columnTotals[cat] = rows.reduce((sum, row) => sum + row.categories[cat], 0);
        });
        const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

        return { rows, columnTotals, grandTotal };
    }, [detailedExpenses, selectedMonth, selectedYear]);

    const diagnosticMonthlyExpenseSheetData = useMemo(() => {
        const expensesByCategory: Record<string, number> = {};
        expenseCategories.forEach(cat => expensesByCategory[cat] = 0);
        
        const addMonthlyExp = (it: any, fallbackDate?: string) => {
            if (!it || it.isDeleted) return;
            const norm = normalizeDate(it.date || fallbackDate || '');
            if (!norm) return;
            const [y, m] = norm.split('-').map(Number);
            if (m - 1 === selectedMonth && y === selectedYear) {
                if (!it.isDeleted && (it.dept === 'Diagnostic' || !it.dept || it.dept === 'Hospital')) {
                    const amt = Number(it.paidAmount ?? it.paid_amount ?? it.amount ?? 0);
                    const normCat = normalizeDiagExpenseCategory(it.category);
                    expensesByCategory[normCat] = (expensesByCategory[normCat] || 0) + amt;
                }
            }
        };

        if (Array.isArray(detailedExpenses)) {
            detailedExpenses.forEach(it => addMonthlyExp(it));
        } else if (detailedExpenses && typeof detailedExpenses === 'object') {
            Object.entries(detailedExpenses).forEach(([date, items]: any) => {
                const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
                list.forEach((it: any) => addMonthlyExp(it, date));
            });
        }

        const totalExpense = Object.values(expensesByCategory).reduce((s, v) => s + v, 0);
        return { expensesByCategory, totalExpense };
    }, [selectedMonth, selectedYear, detailedExpenses]);

    const getTestCategoryGroup = (testName: string) => {
        const test = availableTests.find((t: any) => t.test_name === testName);
        if (test && test.category) {
            const cat = test.category;
            if (cat === 'Hormone') return 'Hormone';
            if (cat === 'Ultrasonography (USG)' || cat === 'USG') return 'USG';
            if (cat === 'X-Ray') return 'X-Ray';
            if (cat === 'ECG') return 'ECG';
            if (['Hematology', 'Biochemistry', 'Clinical Pathology', 'Microbiology', 'Immunology', 'Serology', 'Pathology'].includes(cat)) return 'Pathology';
            return 'Others';
        }
        
        const name = (testName || '').toLowerCase();
        if (name.includes('usg') || name.includes('ultra')) return 'USG';
        if (name.includes('x-ray') || name.includes('xray')) return 'X-Ray';
        if (name.includes('ecg')) return 'ECG';
        if (name.includes('hormone')) return 'Hormone';
        if (name.includes('blood') || name.includes('urine') || name.includes('stool') || name.includes('cbc') || name.includes('test')) return 'Pathology';
        return 'Others';
    };

    const detailTableData = useMemo(() => {
        const filtered = (invoices || []).filter((inv: any) => {
            const rawDate = inv.invoice_date || inv.date || inv.invoiceDate || inv.created_at || '';
            const normDate = normalizeDate(rawDate);
            if (detailViewMode === 'today') return normDate === todayStr || rawDate === todayStr;
            if (detailViewMode === 'date') return normDate === selectedDate || rawDate === selectedDate;
            
            if (!normDate) return true;
            const [y, m] = normDate.split('-').map(Number);
            if (detailViewMode === 'month') return (m - 1) === selectedMonth && y === selectedYear;
            if (detailViewMode === 'year') return y === selectedYear;
            
            return true;
        }).filter((inv: any) => {
            const doc = (doctors || []).find((d: any) => d.doctor_id === inv.doctor_id);
            const docName = doc ? (doc.doctor_name || '') : '';
            const query = detailSearch.toLowerCase();
            const matchesSearch = (inv.patient_name || '').toLowerCase().includes(query) || 
                                 (inv.invoice_id || '').toLowerCase().includes(query) ||
                                 (inv.referrar_name || '').toLowerCase().includes(query) ||
                                 docName.toLowerCase().includes(query) ||
                                 (inv.items || []).some((it: any) => (it.test_name || '').toLowerCase().includes(query));
            
            if (detailFilterCategory === 'All') return matchesSearch;
            if (detailFilterCategory === 'Due Recovery') return matchesSearch && inv.due_amount > 0;

            const matchesCat = (inv.items || []).some((it: any) => {
                const catGroup = getTestCategoryGroup(it.test_name);
                return catGroup === detailFilterCategory;
            });
            return matchesSearch && matchesCat;
        });

        return filtered.map((inv: any) => {
            const isReturned = inv.status === 'Returned' || inv.status === 'Cancelled';
            
            // Logic Change: Only show what was written in the 'Commission Paid' box
            const totalPC = isReturned ? 0 : (inv.commission_paid || 0);
            const invItems = Array.isArray(inv.items) ? inv.items : [];
            
            const usgFee = isReturned ? 0 : invItems.reduce((s: number, i: any) => s + ((i.usg_exam_charge || 0) * (i.quantity || 1)), 0);
            const paid = isReturned ? 0 : (inv.paid_amount || 0);
            const bill = isReturned ? 0 : (inv.total_amount || 0);
            const disc = isReturned ? 0 : (inv.discount_amount || 0);
            const due = isReturned ? 0 : Math.max(0, bill - disc - paid);
            const lastModified = inv.updated_at || inv.created_at || inv.invoice_date || '-';
            
            return { 
                ...inv, 
                fixedPC: 0, // No longer used as primary source
                specialPC: totalPC, 
                totalPC, 
                usgFee, 
                paidVal: paid, 
                billVal: bill,
                discVal: disc,
                dueVal: due,
                lastModified,
                netProfit: paid - (totalPC + usgFee) 
            };
        });
    }, [invoices, detailSearch, selectedMonth, selectedYear, detailViewMode, selectedDate, detailFilterCategory, todayStr, doctors, getTestCategoryGroup]);

    const reportSummary = useMemo(() => {
        return detailTableData.reduce((acc, curr) => {
            if (curr.status !== 'Cancelled' && curr.status !== 'Returned') {
                acc.totalBill += curr.billVal;
                acc.totalDiscount += curr.discVal;
                acc.paidAmount += curr.paidVal;
                acc.totalDue += curr.dueVal;
                acc.fixedPC += curr.fixedPC;
                acc.specialPC += curr.specialPC;
                acc.totalPC += curr.totalPC;
                acc.usgFee += curr.usgFee;
                acc.netInstProfit += curr.netProfit;
                acc.count++;
            }
            return acc;
        }, { totalBill: 0, totalDiscount: 0, paidAmount: 0, totalDue: 0, fixedPC: 0, specialPC: 0, totalPC: 0, usgFee: 0, netInstProfit: 0, count: 0 });
    }, [detailTableData]);

    const searchSuggestions = useMemo(() => {
        const set = new Set<string>();
        (doctors || []).forEach((d: any) => { if (d.doctor_name) set.add(d.doctor_name); });
        (invoices || []).forEach((inv: any) => {
            if (inv.patient_name) set.add(inv.patient_name);
            if (inv.referrar_name) set.add(inv.referrar_name);
            (inv.items || []).forEach((it: any) => {
                if (it.test_name) set.add(it.test_name);
            });
        });
        return Array.from(set);
    }, [invoices, doctors]);

    const diagStats = useMemo(() => {
        const baseFiltered = (invoices || []).filter((inv: any) => {
            const rawDate = inv.invoice_date || inv.date || inv.invoiceDate || inv.created_at || '';
            const normDate = normalizeDate(rawDate);
            if (detailViewMode === 'today') return normDate === todayStr || rawDate === todayStr;
            if (detailViewMode === 'date') return normDate === selectedDate || rawDate === selectedDate;
            
            if (!normDate) return true;
            const [y, m] = normDate.split('-').map(Number);
            if (detailViewMode === 'month') return (m - 1) === selectedMonth && y === selectedYear;
            if (detailViewMode === 'year') return y === selectedYear;
            return true;
        }).filter((inv: any) => {
            const doc = (doctors || []).find((d: any) => d.doctor_id === inv.doctor_id);
            const docName = doc ? (doc.doctor_name || '') : '';
            const query = detailSearch.toLowerCase();
            return (inv.patient_name || '').toLowerCase().includes(query) || 
                   (inv.invoice_id || '').toLowerCase().includes(query) ||
                   (inv.referrar_name || '').toLowerCase().includes(query) ||
                   docName.toLowerCase().includes(query) ||
                   (inv.items || []).some((it: any) => (it.test_name || '').toLowerCase().includes(query));
        });

        const categoryCounts: Record<string, number> = { All: baseFiltered.length };
        const customTestCounts: Record<string, number> = {};
        trackedTests.forEach(t => customTestCounts[t] = 0);

        ['Pathology', 'USG', 'X-Ray', 'ECG', 'Hormone', 'Others'].forEach(cat => {
            categoryCounts[cat] = baseFiltered.filter(inv => {
                let match = false;
                (inv.items || []).forEach((it: any) => {
                    if (getTestCategoryGroup(it.test_name) === cat) match = true;
                });
                return match;
            }).length;
        });

        // Calculate Custom Tracked Tests from baseFiltered Invoices
        baseFiltered.forEach(inv => {
            (inv.items || []).forEach((it: any) => {
                const name = (it.test_name || '').toLowerCase();
                trackedTests.forEach(tracked => {
                    if (tracked && name.includes(tracked.toLowerCase())) {
                        customTestCounts[tracked] += it.quantity;
                    }
                });
            });
        });

        return { categoryCounts, customTestCounts };
    }, [invoices, detailSearch, selectedMonth, selectedYear, detailViewMode, selectedDate, todayStr, trackedTests, doctors, getTestCategoryGroup]);

    const categoryCounts = diagStats.categoryCounts;
    const customTestCounts = diagStats.customTestCounts;

    const stats = useMemo(() => {
        const parseDateParts = (raw: any) => {
            if (!raw && raw !== 0) return { y: 0, m: 0, d: 0, isoDate: '' };
            const norm = normalizeDate(raw);
            if (norm) {
                const parts = norm.split('-').map(Number);
                return { y: parts[0] || 0, m: parts[1] || 0, d: parts[2] || 0, isoDate: norm };
            }
            const str = String(raw).trim();
            const dateOnly = str.split(/[T ]/)[0];
            return { y: 0, m: 0, d: 0, isoDate: dateOnly };
        };

        const getRangeStats = (rangeType: 'daily' | 'monthly' | 'yearly') => {
            // First find relevant consolidated entries for this range
            const relevantConsolidated = (consolidatedEntries || []).filter((e: any) => {
                if (!e) return false;
                const rawDate = e.date || e.created_at || e.createdAt || e.entry_date || e.invoice_date || '';
                const dParts = parseDateParts(rawDate);
                const hasValidDate = dParts.y > 0 && dParts.m > 0;

                if (rangeType === 'daily') {
                    if (dParts.isoDate === selectedDate || rawDate === selectedDate) return true;
                    if (!dParts.isoDate && e.id) {
                        const m = String(e.id).match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
                        if (m && `${m[1]}-${m[2]}-${m[3]}` === selectedDate) return true;
                    }
                    return false;
                }
                if (rangeType === 'monthly') {
                    if (hasValidDate && (dParts.m - 1) === selectedMonth && dParts.y === selectedYear) {
                        return true;
                    }
                    if (e.month !== undefined && e.year !== undefined && !isNaN(Number(e.month)) && !isNaN(Number(e.year))) {
                        const em = Number(e.month);
                        const ey = Number(e.year);
                        return ey === selectedYear && (em === selectedMonth || em === selectedMonth + 1);
                    }
                    if (!hasValidDate && e.id) {
                        const m = String(e.id).match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
                        if (m) {
                            const ey = Number(m[1]);
                            const em = Number(m[2]);
                            return ey === selectedYear && em === selectedMonth + 1;
                        }
                    }
                    return false;
                }
                if (hasValidDate && dParts.y === selectedYear) return true;
                if (e.year !== undefined && Number(e.year) === selectedYear) return true;
                return false;
            });

            // If consolidated entries exist for this period, take precedence and skip individual invoices to prevent double counting
            const hasConsolidatedForPeriod = relevantConsolidated.length > 0;

            const relevantInvoices = hasConsolidatedForPeriod ? [] : (invoices || []).filter((inv: any) => {
                if (!inv || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return false;
                const rawDate = inv.invoice_date || inv.date || inv.invoiceDate || inv.created_date || inv.created_at || '';
                const dParts = parseDateParts(rawDate);
                if (rangeType === 'daily') return dParts.isoDate === selectedDate || rawDate === selectedDate;
                if (rangeType === 'monthly') return (dParts.m - 1) === selectedMonth && dParts.y === selectedYear;
                return dParts.y === selectedYear;
            });
            const relevantDueColls = (dueCollections || []).filter((dc: any) => {
                if (!dc) return false;
                const isDiag = !dc.invoice_id || !dc.invoice_id.toUpperCase().startsWith('IND');
                const rawDate = dc.collection_date || dc.date || dc.created_at || '';
                const dParts = parseDateParts(rawDate);
                if (rangeType === 'daily') return (dParts.isoDate === selectedDate || rawDate === selectedDate) && isDiag;
                if (rangeType === 'monthly') return (dParts.m - 1) === selectedMonth && dParts.y === selectedYear && isDiag;
                return dParts.y === selectedYear && isDiag;
            });

            const coll = { pathology: 0, hormone: 0, usg: 0, xray: 0, ecg: 0, others: 0, dueRecov: 0 };
            
            relevantInvoices.forEach((inv: any) => {
                const allDuesForInv = (dueCollections || []).filter((dc: any) => dc.invoice_id === inv.invoice_id).reduce((s: any, c: any) => s + (Number(c.amount_collected) || 0), 0);
                const totalAmt = Number(inv.total_amount ?? inv.totalAmount) || 0;
                const discAmt = Number(inv.discount_amount ?? inv.discountAmount) || 0;
                const currentDue = Number(inv.due_amount ?? inv.dueAmount) || 0;
                const rawPaid = Number(inv.paid_amount ?? inv.paidAmount) || 0;

                let initialPaid = rawPaid;
                if (initialPaid === 0 && currentDue <= 0 && totalAmt > 0) {
                    initialPaid = Math.max(0, totalAmt - discAmt);
                }
                if (allDuesForInv > 0) {
                    if (rawPaid > allDuesForInv && (rawPaid - allDuesForInv + currentDue + discAmt >= totalAmt - 1)) {
                        initialPaid = Math.max(0, rawPaid - allDuesForInv);
                    } else if (rawPaid >= allDuesForInv && rawPaid === totalAmt - discAmt && currentDue <= 0.5) {
                        initialPaid = Math.max(0, rawPaid - allDuesForInv);
                    } else if (rawPaid < allDuesForInv) {
                        initialPaid = 0;
                    } else {
                        initialPaid = rawPaid;
                    }
                }
                const totAmount = totalAmt || (initialPaid > 0 ? initialPaid : 0);
                const ratio = totAmount > 0 ? (initialPaid / totAmount) : 0;
                
                // Calculate actual commission factor based on "Commission Paid" box
                const actualCommPaid = Number(inv.commission_paid ?? (inv as any).commissionPaid) || 0;
                const commFactor = initialPaid > 0 ? Math.min(1, actualCommPaid / initialPaid) : 0;

                const items = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : null;
                if (items) {
                    items.forEach((item: any) => {
                        const testName = (item.test_name || '').toLowerCase();
                        const itemGross = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                        
                        // Subtract USG Fee, Lab Fee, and the actual commission paid (distributed proportionally)
                        const itemNetPaid = Math.max(0, (itemGross * ratio) * (1 - commFactor)
                                          - ((Number(item.usg_exam_charge) || 0) * (Number(item.quantity) || 1))
                                          - ((Number(item.extra_lab_fee) || 0) * (Number(item.quantity) || 1)));

                        if (testName.includes('usg') || testName.includes('ultra')) coll.usg += itemNetPaid;
                        else if (testName.includes('x-ray') || testName.includes('xray')) coll.xray += itemNetPaid;
                        else if (testName.includes('ecg')) coll.ecg += itemNetPaid;
                        else if (testName.includes('hormone') || testName.includes('tsh') || testName.includes('t3') || testName.includes('t4')) coll.hormone += itemNetPaid;
                        else coll.pathology += itemNetPaid;
                    });
                } else if (initialPaid > 0) {
                    const netFallback = Math.max(0, initialPaid - actualCommPaid);
                    coll.pathology += netFallback;
                }
            });

            relevantConsolidated.forEach((e: any) => {
                const b = e.breakdown || {};
                const grossSum = Number(e.grossAmount ?? e.gross_amount ?? e.total_amount ?? e.totalAmount) || 0;
                const discount = Number(e.discountAmount ?? e.discount_amount ?? e.discount) || 0;
                const net = Number(e.netPayable ?? e.net_payable ?? e.net_amount ?? e.netAmount) || Math.max(0, grossSum - discount);
                let cash = Number(e.cashCollected ?? e.cash_collected ?? e.paid_amount ?? e.paidAmount ?? e.amount) || 0;
                const due = Number(e.dueAmount ?? e.due_amount) || 0;
                if (cash === 0 && due === 0 && net > 0) {
                    cash = net;
                }
                const bGross = (Number(b.pathology) || 0) + (Number(b.usg) || 0) + (Number(b.xray) || 0) + (Number(b.ecg) || 0) + (Number(b.hormone) || 0) + (Number(b.others) || 0);
                const effectiveGross = grossSum > 0 ? grossSum : bGross;
                const docPC = Number(e.doctorCommissionPaid ?? e.doctor_commission_paid ?? e.commission_paid ?? e.commissionPaid) || 0;
                const usgFee = Number(e.usgDoctorFeePaid ?? e.usg_doctor_fee_paid ?? e.usg_exam_charge) || 0;
                const netCenterCash = Math.max(0, cash - docPC - usgFee);

                if (effectiveGross > 0 && netCenterCash > 0) {
                    const ratio = netCenterCash / effectiveGross;
                    coll.pathology += (Number(b.pathology) || 0) * ratio;
                    coll.usg += (Number(b.usg) || 0) * ratio;
                    coll.xray += (Number(b.xray) || 0) * ratio;
                    coll.ecg += (Number(b.ecg) || 0) * ratio;
                    coll.hormone += (Number(b.hormone) || 0) * ratio;
                    coll.others += (Number(b.others) || 0) * ratio;
                } else if (netCenterCash > 0) {
                    coll.others += netCenterCash;
                }
            });
            
            coll.dueRecov = relevantDueColls.reduce((s: any, c: any) => s + (Number(c.amount_collected) || 0), 0);

            const exp = { total: 0 };
            const expenseMap: Record<string, number> = {};
            expenseCategories.forEach(c => expenseMap[c] = 0);

            if (rangeType === 'daily') {
                const addDailyExp = (it: any, fallbackDate?: string) => {
                    if (!it || it.isDeleted) return;
                    const norm = normalizeDate(it.date || fallbackDate || '');
                    if (norm === selectedDate || fallbackDate === selectedDate) {
                        if (it.dept === 'Diagnostic' || !it.dept || it.dept === 'Hospital') {
                            const amt = Number(it.paidAmount ?? it.paid_amount ?? it.amount ?? 0);
                            const normCat = normalizeDiagExpenseCategory(it.category);
                            expenseMap[normCat] = (expenseMap[normCat] || 0) + amt;
                            exp.total += amt;
                        }
                    }
                };
                if (Array.isArray(detailedExpenses)) {
                    detailedExpenses.forEach(it => addDailyExp(it));
                } else if (detailedExpenses && typeof detailedExpenses === 'object') {
                    Object.entries(detailedExpenses).forEach(([d, items]: any) => {
                        const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
                        list.forEach((it: any) => addDailyExp(it, d));
                    });
                }
            } else {
                const addPeriodExp = (it: any, fallbackDate?: string) => {
                    if (!it || it.isDeleted) return;
                    const norm = normalizeDate(it.date || fallbackDate || '');
                    if (!norm) return;
                    const dParts = parseDateParts(norm);
                    const isMatch = (rangeType === 'monthly' && (dParts.m - 1) === selectedMonth && dParts.y === selectedYear) || 
                                    (rangeType === 'yearly' && dParts.y === selectedYear);
                    if (isMatch && (it.dept === 'Diagnostic' || !it.dept || it.dept === 'Hospital')) {
                        const amt = Number(it.paidAmount ?? it.paid_amount ?? it.amount ?? 0);
                        const normCat = normalizeDiagExpenseCategory(it.category);
                        expenseMap[normCat] = (expenseMap[normCat] || 0) + amt;
                        exp.total += amt;
                    }
                };
                if (Array.isArray(detailedExpenses)) {
                    detailedExpenses.forEach(it => addPeriodExp(it));
                } else if (detailedExpenses && typeof detailedExpenses === 'object') {
                    Object.entries(detailedExpenses).forEach(([d, items]: any) => {
                        const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
                        list.forEach((it: any) => addPeriodExp(it, d));
                    });
                }
            }

            const totalColl = Object.values(coll).reduce((s, v) => s + v, 0);
            const totalCollExclDue = Math.max(0, totalColl - coll.dueRecov);
            return { coll, exp, totalColl, totalCollExclDue, expenseMap, balance: totalColl - exp.total };
        };

        return { daily: getRangeStats('daily'), monthly: getRangeStats('monthly'), yearly: getRangeStats('yearly') };
    }, [invoices, dueCollections, detailedExpenses, consolidatedEntries, selectedDate, selectedMonth, selectedYear]);

    const handlePrintDiagnosticExpenseSheet = () => {
        const win = window.open('', '_blank');
        if(!win) return;
        const monthName = monthOptions[selectedMonth].name;
        const { rows, columnTotals, grandTotal } = diagnosticExpenseSheetData;

        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Diagnostic Expense Sheet - ${monthName} ${selectedYear}</title>
                    <style>
                        @page { 
                            size: A4 landscape; 
                            margin: 2mm; 
                        }
                        body { 
                            font-family: 'Arial Narrow', sans-serif; 
                            background: white; 
                            color: black; 
                            margin: 0; 
                            padding: 0; 
                            width: 100%;
                        }
                        .header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                            border-bottom: 1px solid black;
                            margin-bottom: 0px;
                            padding-bottom: 0px;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 10pt;
                            color: #1e3a8a;
                            text-transform: uppercase;
                        }
                        .header p {
                            margin: 0;
                            font-size: 7pt;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            table-layout: fixed; 
                        }
                        th, td { 
                            border: 1px solid black; 
                            padding: 1px 2px; 
                            text-align: center; 
                            font-size: 7.5pt; 
                            word-wrap: break-word; 
                            line-height: 1.0; 
                            height: 13.5pt;
                        }
                        th { 
                            background: #f3f4f6; 
                            font-weight: bold; 
                            text-transform: uppercase; 
                            font-size: 6.5pt; 
                        }
                        .total-row {
                            background: #f3f4f6;
                            font-weight: bold;
                        }
                        .grand-total {
                            color: #047857;
                            background: #ecfdf5;
                            font-size: 8pt;
                        }
                        .footer {
                            margin-top: 0.5mm;
                            display: flex;
                            justify-content: space-between;
                            padding: 0 60px;
                            font-size: 7.5pt;
                            font-weight: bold;
                            text-transform: uppercase;
                            color: #6b7280;
                        }
                        .sig-box {
                            width: 150px;
                            border-top: 1px solid black;
                            text-align: center;
                            padding-top: 1px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Niramoy Clinic & Diagnostic</h1>
                        <p>Monthly Diagnostic Expense Ledger - ${monthName} ${selectedYear}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 35px">Date</th>
                                ${expenseCategories.map(cat => `<th title="${cat}">${expenseCategoryBanglaMap[cat] || cat}</th>`).join('')}
                                <th style="width: 50px; background: #e5e7eb">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(row => `
                                <tr>
                                    <td style="font-weight: bold">${row.date.split('-')[2]} ${monthName.substring(0,3)}</td>
                                    ${expenseCategories.map(cat => `<td>${row.categories[cat] > 0 ? row.categories[cat].toLocaleString() : '-'}</td>`).join('')}
                                    <td style="font-weight: 900; background: #f9fafb">${row.total > 0 ? row.total.toLocaleString() : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="total-row">
                            <tr>
                                <td style="text-transform: uppercase">TOTAL:</td>
                                ${expenseCategories.map(cat => `<td>${columnTotals[cat] > 0 ? columnTotals[cat].toLocaleString() : '-'}</td>`).join('')}
                                <td class="grand-total">${grandTotal.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="footer">
                        <div class="sig-box">Accountant</div>
                        <div class="sig-box">Managing Director</div>
                    </div>
                </body>
            </html>
        `;
        win.document.write(html); win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 500);
    };

    const handlePrintDueList = () => {
        const win = window.open('', '_blank');
        if (!win) return;
        const html = `
            <html>
                <head>
                    <title>Outstanding Patient Dues</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
                        .header { text-align: center; margin-bottom: 40px; border-bottom: 4px solid #0f172a; padding-bottom: 20px; }
                        .header h1 { margin: 0; font-size: 32px; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
                        .header p { margin: 5px 0; color: #64748b; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #0f172a; color: white; text-align: left; padding: 12px; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
                        td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                        tr:nth-child(even) { background: #f8fafc; }
                        .text-right { text-align: right; }
                        .total-row { background: #f1f5f9 !important; font-weight: 900; font-size: 16px; }
                        .footer { margin-top: 60px; display: flex; justify-content: space-between; }
                        .sig-box { border-top: 2px solid #0f172a; width: 200px; text-align: center; padding-top: 10px; font-weight: bold; font-size: 12px; }
                        .date-info { font-size: 12px; color: #64748b; margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Outstanding Patient Dues</h1>
                        <p>Diagnostic Accounts Console</p>
                    </div>
                    <div class="date-info">
                        Report Type: ${dueViewMode.toUpperCase()} | 
                        Generated on: ${new Date().toLocaleString()}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>SL</th>
                                <th>Date</th>
                                <th>Patient Name</th>
                                <th class="text-right">Total Bill</th>
                                <th class="text-right">Due Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dueList.map((inv, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td>${inv.invoice_date}</td>
                                    <td>${inv.patient_name}</td>
                                    <td class="text-right">${inv.total_amount.toLocaleString()}</td>
                                    <td class="text-right">৳${inv.due_amount.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td colspan="4" class="text-right">Total Outstanding Due:</td>
                                <td class="text-right">৳${dueList.reduce((s, i) => s + i.due_amount, 0).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="footer">
                        <div class="sig-box">Accountant</div>
                        <div class="sig-box">Managing Director</div>
                    </div>
                </body>
            </html>
        `;
        win.document.write(html); win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 500);
    };

    const dueList = (invoices || []).filter((inv: any) => {
        if (!inv || (inv.due_amount || 0) <= 1) return false;
        
        let matchesTime = true;
        const invDate = inv.invoice_date || '';
        if (dueViewMode === 'date') matchesTime = invDate === selectedDate;
        else if (dueViewMode === 'month') {
            const d = new Date(invDate);
            matchesTime = !isNaN(d.getTime()) && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        }
        else if (dueViewMode === 'year') {
            const d = new Date(invDate);
            matchesTime = !isNaN(d.getTime()) && d.getFullYear() === selectedYear;
        }
        
        const matchesSearch = (inv.patient_name || '').toLowerCase().includes(dueSearch.toLowerCase()) || 
                             (inv.invoice_id || '').toLowerCase().includes(dueSearch.toLowerCase());
        
        return matchesTime && matchesSearch;
    }).sort((a,b) => {
        const timeA = a.invoice_date ? new Date(a.invoice_date).getTime() : 0;
        const timeB = b.invoice_date ? new Date(b.invoice_date).getTime() : 0;
        return timeB - timeA;
    });

    const handlePrintTestSummary = () => {
        const testCounts: Record<string, { count: number, price: number }> = {};
        let totalCount = 0;
        let totalRevenue = 0;

        detailTableData.forEach((inv: any) => {
            if (inv.status === 'Cancelled' || inv.status === 'Returned') return;
            (inv.items || []).forEach((it: any) => {
                const name = it.test_name;
                if (!testCounts[name]) {
                    testCounts[name] = { count: 0, price: it.price };
                }
                testCounts[name].count += it.quantity;
                totalCount += it.quantity;
                totalRevenue += (it.price * it.quantity);
            });
        });

        const categorized: Record<string, { name: string, count: number, total: number }[]> = {};
        Object.keys(testCounts).forEach(name => {
            const cat = getTestCategoryGroup(name);
            if (!categorized[cat]) categorized[cat] = [];
            categorized[cat].push({
                name,
                count: testCounts[name].count,
                total: testCounts[name].count * testCounts[name].price
            });
        });

        Object.keys(categorized).forEach(cat => {
            categorized[cat].sort((a, b) => b.count - a.count);
        });

        const periodLabel = detailViewMode === 'today' ? 'Today (' + todayStr + ')' : 
                            detailViewMode === 'date' ? selectedDate : 
                            detailViewMode === 'month' ? monthOptions[selectedMonth].name + ' ' + selectedYear : 
                            'Year ' + selectedYear;

        let html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                <h2 style="text-align: center; text-transform: uppercase; margin-bottom: 5px;">Niramoy Clinic & Diagnostic</h2>
                <h3 style="text-align: center; margin-top: 0; color: #444;">Diagnostic Test Summary Report</h3>
                <p style="text-align: center; font-size: 14px; margin-bottom: 20px;">
                    <b>Period:</b> ${periodLabel}
                </p>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Test Name</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 100px;">Quantity</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 150px;">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const categoryOrder = ['Pathology', 'USG', 'X-Ray', 'ECG', 'Hormone', 'Others'];
        categoryOrder.forEach(cat => {
            if (categorized[cat] && categorized[cat].length > 0) {
                const catTotalCount = categorized[cat].reduce((sum, item) => sum + item.count, 0);
                const catTotalAmt = categorized[cat].reduce((sum, item) => sum + item.total, 0);
                
                html += `
                    <tr>
                        <td colspan="3" style="border: 1px solid #000; padding: 8px; background-color: #e9ecef; font-weight: bold; font-size: 15px;">
                            ${cat} (${catTotalCount} Tests)
                        </td>
                    </tr>
                `;
                
                categorized[cat].forEach(item => {
                    html += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 6px 8px; padding-left: 20px;">${item.name}</td>
                            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${item.count}</td>
                            <td style="border: 1px solid #000; padding: 6px 8px; text-align: right;">${item.total.toLocaleString()}</td>
                        </tr>
                    `;
                });
                
                html += `
                    <tr>
                        <td style="border: 1px solid #000; padding: 6px 8px; text-align: right; font-weight: bold; font-size: 12px; color: #333;">Subtotal (${cat}):</td>
                        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold;">${catTotalCount}</td>
                        <td style="border: 1px solid #000; padding: 6px 8px; text-align: right; font-weight: bold;">${catTotalAmt.toLocaleString()}</td>
                    </tr>
                `;
            }
        });

        html += `
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #d1d5db; font-weight: bold; font-size: 16px;">
                            <td style="border: 1px solid #000; padding: 12px; text-align: right;">GRAND TOTAL:</td>
                            <td style="border: 1px solid #000; padding: 12px; text-align: center;">${totalCount}</td>
                            <td style="border: 1px solid #000; padding: 12px; text-align: right;">৳${totalRevenue.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="border-top: 1px solid #000; padding-top: 5px; width: 200px; text-align: center; font-size: 14px; font-weight: bold;">Prepared By</div>
                    <div style="text-align: right; font-size: 12px; color: #666;">
                        Printed at ${new Date().toLocaleString()}
                    </div>
                </div>
            </div>
        `;

        const printWin = window.open('', '_blank');
        if (printWin) {
            printWin.document.write(`
                <html>
                <head>
                    <title>Test Summary Report</title>
                    <style>
                        @media print {
                            @page { margin: 15mm; }
                            body { -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    ${html}
                </body>
                </html>
            `);
            printWin.document.close();
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            <header className="bg-slate-900 border-b border-slate-800 p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl no-print">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all"><BackIcon className="w-6 h-6 text-slate-300" /></button>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Diagnostic Accounts Console</h2>
                </div>
                <div className="flex bg-slate-800 rounded-2xl p-1 shadow-inner border border-slate-700 overflow-x-auto max-w-full">
                    {[
                        { id: 'entry', label: 'Data Entry' }, 
                        { id: 'diagnostic_expense', label: 'Diagnostic Expense Sheet' },
                        { id: 'daily', label: 'Daily Hishab' }, 
                        { id: 'monthly', label: 'Monthly Hishab' }, 
                        { id: 'yearly', label: 'Yearly Hishab' },
                        { id: 'detail', label: 'Collection Detail' },
                        { id: 'due', label: 'Due List' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{tab.label}</button>
                    ))}
                </div>
            </header>

            {successMessage && (
                <div className="fixed top-24 right-8 z-50 animate-bounce">
                    <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-2xl flex items-center gap-3 border border-emerald-400">
                        <Activity className="w-5 h-5" />
                        {successMessage}
                    </div>
                </div>
            )}

            <main className="flex-1 p-3 sm:p-5 lg:p-6 space-y-8 w-full max-w-[98%] 2xl:max-w-[1800px] mx-auto">
                {activeTab === 'entry' && (
                    <div className="animate-fade-in space-y-10">
                        <DailyExpenseForm 
                            key="diagnostic-daily-expense-entry-form" 
                            selectedDate={selectedDate} 
                            onDateChange={handleDateChange} 
                            allDetailedExpenses={detailedExpenses}
                            setDetailedExpenses={setDetailedExpenses} 
                            onSave={handleSaveExpense} 
                            onDelete={handleDeleteExpense}
                            onEdit={setEditingItem}
                            editingItem={editingItem}
                            employees={employees} 
                            monthlyRoster={monthlyRoster}
                            diagnosticSettings={diagnosticSettings}
                            setDiagnosticSettings={setDiagnosticSettings}
                            performBlockingSync={performBlockingSync}
                            setSuccessMessage={setSuccessMessage}
                            reagents={reagents}
                            setReagents={setReagents}
                            availableTests={availableTests}
                            attendanceLog={attendanceLog}
                            leaveLog={leaveLog}
                            isSaving={isSaving}
                        />
                    </div>
                )}

                {activeTab === 'diagnostic_expense' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl no-print">
                             <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                                Monthly Diagnostic Expense Sheet: {monthOptions[selectedMonth].name} {selectedYear}
                             </h2>
                             <div className="flex gap-4">
                                <button onClick={handlePrintDiagnosticExpenseSheet} className="bg-rose-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95"><PrinterIcon size={14}/> Print Landscape</button>
                                <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-800 border-none rounded-xl p-3 text-white font-black text-sm">{monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-800 border-none rounded-xl p-3 text-white font-black text-sm">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
                             </div>
                        </div>

                        <div className="bg-white p-4 rounded-[1.5rem] border border-slate-300 shadow-2xl overflow-x-auto">
                            <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                                <thead className="bg-slate-100 text-slate-800 text-[9px] uppercase font-black tracking-widest border-b-2 border-slate-300">
                                    <tr>
                                        <th className="p-2 border border-slate-300 w-[60px]">Date</th>
                                        {expenseCategories.map(cat => (
                                            <th key={cat} className="p-2 border border-slate-300 text-center leading-tight break-words" title={cat}>
                                                {expenseCategoryBanglaMap[cat] || cat}
                                            </th>
                                        ))}
                                        <th className="p-2 border border-slate-300 text-right bg-slate-200 w-[100px]">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[11px]">
                                    {diagnosticExpenseSheetData.rows.map(row => (
                                        <tr key={row.date} className="hover:bg-blue-50 transition-colors border-b border-slate-200 h-[32px]">
                                            <td className="p-1 border border-slate-300 text-center font-mono font-bold bg-slate-50">
                                                {row.date.split('-')[2]} {monthOptions[selectedMonth].name.substring(0,3)}
                                            </td>
                                            {expenseCategories.map(cat => (
                                                <td key={cat} className="p-1 border border-slate-300 text-center font-medium">
                                                    {row.categories[cat] > 0 ? row.categories[cat].toLocaleString() : '-'}
                                                </td>
                                            ))}
                                            <td className="p-1 border border-slate-300 text-right font-black bg-slate-50 text-slate-900">
                                                {row.total > 0 ? row.total.toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-400">
                                    <tr>
                                        <td className="p-3 border border-slate-300 text-center uppercase text-[10px]">TOTAL:</td>
                                        {expenseCategories.map(cat => (
                                            <td key={cat} className="p-3 border border-slate-300 text-center text-blue-700">
                                                {diagnosticExpenseSheetData.columnTotals[cat] > 0 ? diagnosticExpenseSheetData.columnTotals[cat].toLocaleString() : '-'}
                                            </td>
                                        ))}
                                        <td className="p-3 border border-slate-300 text-right text-lg text-emerald-700 bg-emerald-50">
                                            {diagnosticExpenseSheetData.grandTotal.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {(activeTab === 'daily' || activeTab === 'monthly' || activeTab === 'yearly') && (
                    <div className="animate-fade-in space-y-10">
                        <div className="flex justify-between items-center bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl">
                             <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                                {activeTab === 'daily' ? `Daily Summary (Net): ${selectedDate}` : activeTab === 'monthly' ? `Monthly (Net): ${monthOptions[selectedMonth].name} ${selectedYear}` : `Yearly (Net): ${selectedYear}`}
                             </h2>
                             <div className="flex gap-4">
                                {activeTab === 'daily' ? (
                                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-black text-sm" />
                                ) : (
                                    <>
                                        {activeTab === 'monthly' && (
                                            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-800 border-none rounded-xl p-3 text-white font-black text-sm">{monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                                        )}
                                        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-800 border-none rounded-xl p-3 text-white font-black text-sm">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
                                    </>
                                )}
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <SummaryBox title="Net Collection (নিট কালেকশন)" colorClass="text-blue-400" totalLabel="Total Collection (Excl. Due Recovery)" totalValue={activeTab === 'daily' ? stats.daily.totalCollExclDue : activeTab === 'monthly' ? stats.monthly.totalCollExclDue : stats.yearly.totalCollExclDue} 
                                items={[
                                    { label: 'Pathology (Net)', value: activeTab === 'daily' ? stats.daily.coll.pathology : activeTab === 'monthly' ? stats.monthly.coll.pathology : stats.yearly.coll.pathology }, 
                                    { label: 'Hormone (Net)', value: activeTab === 'daily' ? stats.daily.coll.hormone : activeTab === 'monthly' ? stats.monthly.coll.hormone : stats.yearly.coll.hormone }, 
                                    { label: 'USG (Net)', value: activeTab === 'daily' ? stats.daily.coll.usg : activeTab === 'monthly' ? stats.monthly.coll.usg : stats.yearly.coll.usg }, 
                                    { label: 'X-Ray (Net)', value: activeTab === 'daily' ? stats.daily.coll.xray : activeTab === 'monthly' ? stats.monthly.coll.xray : stats.yearly.coll.xray }, 
                                    { label: 'ECG (Net)', value: activeTab === 'daily' ? stats.daily.coll.ecg : activeTab === 'monthly' ? stats.monthly.coll.ecg : stats.yearly.coll.ecg }, 
                                    { label: 'Due Recovery', value: activeTab === 'daily' ? stats.daily.coll.dueRecov : activeTab === 'monthly' ? stats.monthly.coll.dueRecov : stats.yearly.coll.dueRecov },
                                    { label: 'Grand Total (Incl. Due)', value: activeTab === 'daily' ? stats.daily.totalColl : activeTab === 'monthly' ? stats.monthly.totalColl : stats.yearly.totalColl }
                                ]} 
                            />
                            <SummaryBox title="Expenses (অন্যান্য খরচ)" colorClass="text-rose-400" totalLabel="Total Expense" totalValue={activeTab === 'daily' ? stats.daily.exp.total : activeTab === 'monthly' ? stats.monthly.exp.total : stats.yearly.exp.total} 
                                items={expenseCategories.map(cat => ({ 
                                    label: expenseCategoryBanglaMap[cat], 
                                    value: activeTab === 'daily' ? (stats.daily.expenseMap[cat] || 0) : activeTab === 'monthly' ? (stats.monthly.expenseMap[cat] || 0) : (stats.yearly.expenseMap[cat] || 0) 
                                }))} 
                            />
                        </div>

                        <div className="flex justify-center pt-8 no-print">
                            <div className="bg-slate-900 p-12 rounded-[4rem] border border-slate-800 shadow-2xl text-center">
                                <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-3">Net Balance (A - B)</p>
                                <h4 className={`text-6xl font-black ${ (activeTab === 'daily' ? stats.daily.balance : activeTab === 'monthly' ? stats.monthly.balance : stats.yearly.balance) >= 0 ? 'text-green-400' : 'text-rose-500' }`}>
                                    ৳ { (activeTab === 'daily' ? stats.daily.balance : activeTab === 'monthly' ? stats.monthly.balance : stats.yearly.balance).toLocaleString() }
                                </h4>
                                <p className="text-slate-600 text-[10px] mt-4 font-bold uppercase tracking-widest italic">* সকল পেমেন্টকৃত কমিশন ও ইউএসজি ফি কালেকশন থেকে বিয়োগ করা হয়েছে</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'detail' && (
                    <div className="animate-fade-in space-y-4">
                        <div className="bg-slate-800/80 p-6 rounded-[2rem] border border-slate-700 shadow-2xl flex flex-col gap-4">
                            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-700 pb-3 no-print">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Collection Record Detail</h3>
                                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 overflow-hidden shadow-inner">
                                        <button onClick={() => setDetailViewMode('today')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${detailViewMode === 'today' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}>Today</button>
                                        <button onClick={() => setDetailViewMode('month')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${detailViewMode === 'month' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}>Monthly</button>
                                        <button onClick={() => setDetailViewMode('year')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${detailViewMode === 'year' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}>Yearly</button>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 bg-slate-900 p-1 rounded-2xl border border-slate-700 shadow-inner">
                                        <input 
                                            type="date" 
                                            value={selectedDate} 
                                            onChange={(e) => {
                                                setSelectedDate(e.target.value);
                                                setDetailViewMode('date');
                                            }} 
                                            className="bg-slate-950 border-none rounded-xl px-4 py-2 text-white text-xs font-black outline-none focus:ring-1 focus:ring-blue-500" 
                                        />
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${detailViewMode === 'date' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Selected</span>
                                    </div>
                                    {detailViewMode === 'month' && (
                                        <div className="flex gap-2">
                                            <select value={selectedMonth} onChange={e=>setSelectedMonth(parseInt(e.target.value))} className="bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold">{monthOptions.map(m=><option key={m.value} value={m.value}>{m.name}</option>)}</select>
                                            <select value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value))} className="bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold">{[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}</select>
                                        </div>
                                    )}
                                    {detailViewMode === 'year' && (
                                        <select value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value))} className="bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold">{[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}</select>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={handlePrintTestSummary} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2">
                                        <PrinterIcon size={16} /> Test Summary
                                    </button>
                                    <button onClick={() => window.print()} className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2">
                                        <PrinterIcon size={16} /> Print List
                                    </button>
                                    <div className="relative w-80">
                                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="Search Patient, Doctor, Referrer or Test..." 
                                            value={detailSearch} 
                                            onChange={e => setDetailSearch(e.target.value)} 
                                            list="detail-search-suggestions"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-full pl-12 pr-6 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500" 
                                        />
                                        <datalist id="detail-search-suggestions">
                                            {searchSuggestions.map((suggestion, idx) => (
                                                <option key={idx} value={suggestion} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-4 no-print border-b border-slate-700 pb-3">
                                <div className="flex flex-wrap gap-2 items-center">
                                    {['All', 'Pathology', 'USG', 'X-Ray', 'ECG', 'Hormone', 'Others'].map(cat => (
                                        <button key={cat} onClick={()=>setDetailFilterCategory(cat)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${detailFilterCategory === cat ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'}`}>
                                            {cat === 'Others' ? 'Others' : cat} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] ${detailFilterCategory === cat ? 'bg-white/20' : 'bg-slate-800'}`}>{categoryCounts[cat] || 0}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50 w-full">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                            Tracked Tests Overview
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pb-1 items-center relative">
                                        {openDropdownIndex !== null && (
                                            <div 
                                                className="fixed inset-0 z-40 bg-transparent cursor-default no-print" 
                                                onClick={() => setOpenDropdownIndex(null)} 
                                            />
                                        )}
                                        {trackedTests.map((test, i) => (
                                            <div 
                                                key={i} 
                                                className={`bg-slate-950 px-3 py-1.5 rounded-lg border flex-shrink-0 relative min-w-[140px] transition-all cursor-pointer hover:border-sky-500/50 hover:bg-slate-900 ${openDropdownIndex === i ? 'border-sky-500 ring-1 ring-sky-500/30 z-50' : 'border-slate-800 z-10'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (openDropdownIndex === i) {
                                                        setOpenDropdownIndex(null);
                                                    } else {
                                                        setOpenDropdownIndex(i);
                                                        setDropdownSearch(''); // Reset search on open
                                                    }
                                                }}
                                            >
                                                {openDropdownIndex === i ? (
                                                    <div className="flex flex-col w-full relative">
                                                        <input 
                                                            type="text" 
                                                            value={dropdownSearch} 
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => setDropdownSearch(e.target.value)}
                                                            className="w-full bg-transparent border-none text-[10px] text-white p-0 outline-none font-bold placeholder:text-slate-600 mb-1" 
                                                            placeholder="Search to switch..."
                                                        />
                                                        {(() => {
                                                            const otherSelected = trackedTests.filter((_, idx) => idx !== i && _ !== '');
                                                            const filteredSuggestions = availableTests.filter((t: any) => {
                                                                const isDuplicate = otherSelected.some(
                                                                    (sel) => sel && sel.toLowerCase().trim() === t.test_name.toLowerCase().trim()
                                                                );
                                                                if (isDuplicate) return false;
                                                                if (dropdownSearch) {
                                                                    return t.test_name.toLowerCase().includes(dropdownSearch.toLowerCase());
                                                                }
                                                                return true;
                                                            });

                                                            return (
                                                                <div 
                                                                    className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-xl max-h-48 overflow-y-auto z-50 shadow-2xl py-1 divide-y divide-slate-800 no-scrollbar min-w-[200px]"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {filteredSuggestions.length > 0 ? (
                                                                        filteredSuggestions.map((t: any) => (
                                                                            <div
                                                                                key={t.test_id}
                                                                                className="px-3 py-2 hover:bg-sky-600/20 text-white text-[10px] font-bold cursor-pointer transition-all flex justify-between items-center"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const n = [...trackedTests];
                                                                                    n[i] = t.test_name;
                                                                                    setTrackedTests(n);
                                                                                    setOpenDropdownIndex(null);
                                                                                }}
                                                                            >
                                                                                <span className="truncate max-w-[130px]">{t.test_name}</span>
                                                                                <span className="text-[8px] text-slate-500 font-normal ml-1">{t.price}</span>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-3 py-2 text-slate-500 text-[10px] font-bold italic">
                                                                            No matching tests
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between gap-3 min-w-[120px]">
                                                        <div className="flex items-center gap-2 max-w-[100px] overflow-hidden">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase truncate" title={test}>{test || 'Select Test'}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <p className="text-sm font-black text-indigo-400 leading-none">{test ? (customTestCounts[test] || 0) : 0}</p>
                                                            <span className="text-slate-600 text-[8px]">▼</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-slate-800 text-sky-200 font-bold uppercase tracking-wider border-b border-slate-700">
                                        <tr className="bg-slate-900 text-white font-black border-b border-slate-700 shadow-lg">
                                            <td colSpan={5} className="px-4 py-3 text-right text-xs text-slate-300 uppercase tracking-wider bg-slate-900 font-bold">Grand Summary Totals:</td>
                                            <td className="px-4 py-3 text-right text-base text-sky-300 bg-slate-850 font-bold font-mono">{reportSummary.totalBill.toLocaleString()}</td>
                                             <td className="px-4 py-3 text-right text-base text-purple-300 bg-slate-900 font-bold font-mono">{reportSummary.totalDiscount.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-base text-emerald-300 bg-slate-900 font-bold font-mono">{reportSummary.paidAmount.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-base text-rose-300 bg-slate-850 font-bold font-mono">{reportSummary.totalDue.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-base text-sky-300 bg-slate-900 font-bold font-mono">{reportSummary.usgFee.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-base text-amber-300 bg-slate-850 font-bold font-mono">{reportSummary.totalPC.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right bg-blue-600 text-white text-xl shadow-inner font-black font-mono">{reportSummary.netInstProfit.toLocaleString()}</td>
                                            <td className="px-4 py-3 bg-slate-900"></td>
                                            <td className="px-4 py-3 bg-slate-900"></td>
                                        </tr>
                                        <tr className="bg-slate-800 text-sky-200 text-xs">
                                            <th className="px-4 py-3">SL</th>
                                            <th className="px-4 py-3">Invoice ID</th>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Patient Name</th>
                                            <th className="px-4 py-3">Referrer</th>
                                            <th className="px-4 py-3 text-right">Total</th>
                                             <th className="px-4 py-3 text-right text-purple-300">Discount</th>
                                            <th className="px-4 py-3 text-right text-emerald-300">Paid</th>
                                            <th className="px-4 py-3 text-right text-rose-300">Due</th>
                                            <th className="px-4 py-3 text-right text-sky-300">Usg_Fee</th>
                                            <th className="px-4 py-3 text-right text-amber-300">PC</th>
                                            <th className="px-4 py-3 text-right bg-blue-900/50 text-white font-black">Net_Income</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3 text-center">Last Modified</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {detailTableData.map((inv, idx) => (
                                            <tr 
                                                key={inv.invoice_id} 
                                                onDoubleClick={() => { setViewingInvoice(inv); setShowInvoiceModal(true); }}
                                                onContextMenu={(e) => { e.preventDefault(); setViewingInvoice(inv); setShowInvoiceModal(true); }}
                                                className={`hover:bg-slate-800/90 even:bg-slate-900/70 odd:bg-slate-850/40 transition-colors cursor-pointer ${inv.status==='Returned'?'opacity-50 grayscale bg-red-900/10':''}`}
                                                title="Double Click or Right Click to view invoice"
                                            >
                                                <td className="p-3.5 text-slate-400 font-bold font-mono text-xs">{idx+1}</td>
                                                <td className="p-3.5 font-mono text-cyan-300 font-bold text-xs">{inv.invoice_id}</td>
                                                <td className="p-3.5 font-mono text-slate-300 font-bold text-xs">{inv.invoice_date}</td>
                                                <td className="p-3.5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold uppercase text-white text-sm tracking-tight">{inv.patient_name}</span>
                                                        <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                            {(() => {
                                                                const p = patients.find((pt: any) => pt.pt_id === inv.patient_id);
                                                                return p ? `${p.ageY}Y, ${p.address}, ${p.mobile}` : 'Details N/A';
                                                            })()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3.5 text-slate-200 font-medium text-xs truncate max-w-[150px]">{inv.referrar_name || 'Self'}</td>
                                                <td className="p-3.5 text-right font-medium text-slate-100 font-mono text-sm">{inv.billVal.toLocaleString()}</td>
                                                 <td className="p-3.5 text-right font-medium text-purple-300 font-mono text-sm">{inv.discVal.toLocaleString()}</td>
                                                <td className="p-3.5 text-right font-black text-emerald-300 font-mono text-sm">{inv.paidVal.toLocaleString()}</td>
                                                <td className="p-3.5 text-right font-bold text-rose-300 font-mono text-sm">{inv.dueVal.toLocaleString()}</td>
                                                <td className="p-3.5 text-right text-sky-300 font-bold font-mono text-sm">{inv.usgFee.toLocaleString()}</td>
                                                <td className="p-3.5 text-right text-amber-300 font-bold font-mono text-sm">{inv.totalPC.toLocaleString()}</td>
                                                <td className="p-3.5 text-right font-black text-emerald-400 bg-blue-950/40 text-base font-mono border-l border-slate-800">{inv.netProfit.toLocaleString()}</td>
                                                <td className="p-3.5 text-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${inv.status === 'Returned' ? 'bg-rose-900 text-rose-200' : inv.status === 'Cancelled' ? 'bg-amber-900 text-amber-200' : 'bg-emerald-900 text-emerald-200'}`}>
                                                        {inv.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">{inv.lastModified}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-950 border-t-4 border-slate-700 text-xs font-black text-white">
                                        <tr className="h-16">
                                            <td colSpan={5} className="p-4 text-right uppercase tracking-widest text-slate-400 text-xs">Grand Summary Totals:</td>
                                            <td className="p-4 text-right text-sky-300 font-mono text-base">{reportSummary.totalBill.toLocaleString()}</td>
                                             <td className="p-4 text-right text-purple-300 font-mono text-base">{reportSummary.totalDiscount.toLocaleString()}</td>
                                            <td className="p-4 text-right text-emerald-400 font-mono text-base">{reportSummary.paidAmount.toLocaleString()}</td>
                                            <td className="p-4 text-right text-rose-400 font-mono text-base">{reportSummary.totalDue.toLocaleString()}</td>
                                            <td className="p-4 text-right text-sky-400 font-mono text-base">{reportSummary.usgFee.toLocaleString()}</td>
                                            <td className="p-4 text-right text-amber-400 font-mono text-base">{reportSummary.totalPC.toLocaleString()}</td>
                                            <td className="p-4 text-right text-white bg-blue-600 rounded-br-2xl text-xl font-mono">{reportSummary.netInstProfit.toLocaleString()}</td>
                                            <td className="p-4 bg-slate-950"></td>
                                            <td className="p-4 bg-slate-950 rounded-br-2xl"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'due' && (
                    <div className="animate-fade-in space-y-10">
                        <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden">
                            <div className="p-8 bg-slate-900 border-b border-slate-800 flex flex-col lg:flex-row justify-between items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Outstanding Patient Dues</h3>
                                    <button onClick={handlePrintDueList} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-lg flex items-center gap-2 text-xs font-black uppercase">
                                        <PrinterIcon className="w-4 h-4" /> Print
                                    </button>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 shadow-inner">
                                        {(['all', 'date', 'month', 'year'] as const).map(mode => (
                                            <button key={mode} onClick={() => setDueViewMode(mode)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dueViewMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{mode}</button>
                                        ))}
                                    </div>

                                    {dueViewMode === 'date' && <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-black text-white outline-none focus:ring-2 focus:ring-blue-500" />}
                                    {dueViewMode === 'month' && (
                                        <div className="flex gap-2">
                                            <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-black text-white outline-none focus:ring-2 focus:ring-blue-500">
                                                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                            </select>
                                            <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-black text-white outline-none focus:ring-2 focus:ring-blue-500">
                                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {dueViewMode === 'year' && (
                                        <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-black text-white outline-none focus:ring-2 focus:ring-blue-500">
                                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    )}

                                    <div className="relative">
                                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input value={dueSearch} onChange={e=>setDueSearch(e.target.value)} placeholder="Search Patient..." className="pl-12 pr-4 py-3 w-64 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-black text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" />
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto border border-slate-700 rounded-2xl bg-slate-900 shadow-xl">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-800 text-sky-200 font-bold uppercase tracking-wider border-b border-slate-700">
                                        <tr className="bg-slate-900/90 text-white font-bold border-b border-slate-700 no-print">
                                            <td colSpan={3} className="p-4 text-right text-xs text-slate-300 uppercase tracking-wider">Summary Totals:</td>
                                            <td className="p-4 text-right text-sky-300 font-bold">{dueList.reduce((s,i)=>s+i.total_amount, 0).toLocaleString()}</td>
                                            <td className="p-4 text-right text-rose-400 font-black text-sm">{dueList.reduce((s,i)=>s+i.due_amount, 0).toLocaleString()}</td>
                                        </tr>
                                        <tr className="bg-slate-800 text-sky-200">
                                            <th className="p-4 w-16">SL</th>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Patient Name</th>
                                            <th className="p-4 text-right">Total Bill</th>
                                            <th className="p-4 text-right text-rose-300">Due Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {dueList.map((inv, idx) => (
                                            <tr key={idx} className="hover:bg-slate-800/80 even:bg-slate-900/70 odd:bg-slate-850/40 transition-colors">
                                                <td className="p-4 text-slate-300 font-bold">{idx + 1}</td>
                                                <td className="p-4 text-slate-200 font-bold">{inv.invoice_date}</td>
                                                <td className="p-4 font-bold text-white uppercase text-sm">{inv.patient_name}</td>
                                                <td className="p-4 text-right text-white font-bold">{inv.total_amount.toLocaleString()}</td>
                                                <td className="p-4 text-right font-black text-rose-400 text-lg">{inv.due_amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-950 text-white font-black text-sm border-t-4 border-slate-800">
                                        <tr>
                                            <td colSpan={4} className="p-8 text-right uppercase tracking-widest text-slate-500">Total Outstanding Due:</td>
                                            <td className="p-8 text-right text-yellow-400 text-4xl">৳ {dueList.reduce((s,i)=>s+i.due_amount, 0).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {showInvoiceModal && viewingInvoice && (
                <InvoiceViewModal 
                    inv={viewingInvoice} 
                    patients={patients} 
                    doctors={doctors}
                    onClose={() => { setShowInvoiceModal(false); setViewingInvoice(null); }} 
                />
            )}

            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[1001] w-full max-w-md animate-zoom-in">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-700 shadow-inner">
                                <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 uppercase tracking-tighter">
                                {confirmModal.title}
                            </h3>
                            <p className="text-slate-400 font-bold leading-relaxed">
                                {confirmModal.message}
                            </p>
                            <div className="mt-4 flex w-full gap-3">
                                <button 
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                                    className="flex-1 px-6 py-3.5 text-sm font-black text-slate-300 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 uppercase tracking-widest active:scale-95"
                                >
                                    No
                                </button>
                                <button 
                                    onClick={() => { confirmModal.onConfirm(); }} 
                                    className="flex-1 px-6 py-3.5 text-sm font-black text-white bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl hover:from-emerald-500 hover:to-teal-600 transition-all shadow-[0_10px_20px_rgba(16,185,129,0.3)] uppercase tracking-widest active:scale-95"
                                >
                                    Yes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

class DiagnosticAccountsErrorBoundary extends React.Component<{ onBack?: () => void; children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("DiagnosticAccountsPage Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold">
              ⚠️
            </div>
            <h2 className="text-2xl font-bold text-white">ডায়াগনস্টিক হিসাব রেন্ডারিং সমস্যা</h2>
            <p className="text-slate-300 text-sm">
              সাময়িক একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা মূল অ্যাকাউন্টিং পেজে ফিরে যান।
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-950 rounded-xl text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg transition-all"
              >
                আবার চেষ্টা করুন
              </button>
              {this.props.onBack && (
                <button
                  onClick={this.props.onBack}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-all"
                >
                  ফিরে যান
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const DiagnosticAccountsPageWrapped: React.FC<any> = (props) => {
  return (
    <DiagnosticAccountsErrorBoundary onBack={props.onBack}>
      <DiagnosticAccountsPage {...props} />
    </DiagnosticAccountsErrorBoundary>
  );
};

export default DiagnosticAccountsPageWrapped;
export { DiagnosticAccountsPage };