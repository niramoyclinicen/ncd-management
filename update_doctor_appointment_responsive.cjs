const fs = require('fs');

let fileContent = fs.readFileSync('components/DoctorAppointmentPage.tsx', 'utf-8');

// Update common input classes
fileContent = fileContent.replace(
  'const commonInputClasses = "py-2 px-3 mt-1 block w-full border border-sky-800 rounded-md shadow-sm sm:text-sm bg-sky-900/50 text-sky-200 placeholder-sky-400 transition-colors duration-200 ease-in-out focus:bg-sky-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";',
  'const commonInputClasses = "py-3 md:py-2 px-3 mt-1 block w-full border border-sky-800 rounded-md shadow-sm sm:text-sm bg-sky-900/50 text-sky-200 placeholder-sky-400 transition-colors duration-200 ease-in-out focus:bg-sky-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";'
);

// Update action buttons (Save, Clear, Edit, etc)
const actionButtonsOriginal = `<div className="flex flex-wrap items-center gap-2">
                <button type="submit" form="appointment-form" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md">Save Appointment</button>
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-sky-200 bg-slate-600 rounded-md">Clear Form</button>
                <button type="button" onClick={handleEditAppointment} disabled={!isAppointmentSelected} className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-md disabled:opacity-50">Edit</button>
                <button type="button" onClick={handleCancelAppointment} disabled={!canCancel} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md disabled:opacity-50">Appointment Cancel</button>
                <button type="button" onClick={handleReturnAppointment} disabled={!canReturn} className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md disabled:opacity-50">Return / Refund</button>
                <button type="button" onClick={handlePrintAppointment} disabled={!isAppointmentSelected} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md disabled:opacity-50">Print Slip</button>
            </div>`;

const actionButtonsNew = `<div className="grid grid-cols-2 md:flex md:flex-wrap items-stretch md:items-center gap-2 w-full mt-4 md:mt-0">
                <button type="submit" form="appointment-form" className="w-full md:w-auto px-4 py-3 md:py-2 text-sm font-medium text-white bg-green-600 rounded-md">Save Appointment</button>
                <button type="button" onClick={resetForm} className="w-full md:w-auto px-4 py-3 md:py-2 text-sm font-medium text-sky-200 bg-slate-600 rounded-md">Clear Form</button>
                <button type="button" onClick={handleEditAppointment} disabled={!isAppointmentSelected} className="w-full md:w-auto px-4 py-3 md:py-2 text-sm font-medium text-white bg-yellow-500 rounded-md disabled:opacity-50">Edit</button>
                <button type="button" onClick={handlePrintAppointment} disabled={!isAppointmentSelected} className="w-full md:w-auto px-4 py-3 md:py-2 text-sm font-medium text-white bg-indigo-600 rounded-md disabled:opacity-50">Print Slip</button>
                <button type="button" onClick={handleCancelAppointment} disabled={!canCancel} className="w-full md:w-auto px-4 py-3 md:py-2 text-sm font-medium text-white bg-red-600 rounded-md disabled:opacity-50">Appt Cancel</button>
                <button type="button" onClick={handleReturnAppointment} disabled={!canReturn} className="w-full md:w-auto px-4 py-3 md:py-2 text-sm font-medium text-white bg-rose-600 rounded-md disabled:opacity-50">Refund</button>
            </div>`;

fileContent = fileContent.replace(actionButtonsOriginal, actionButtonsNew);


// Search Appt and Scanner Mode
const searchOriginal = `<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2"><label className="font-semibold text-sky-300 whitespace-nowrap">Search Appt:</label><input type="text" placeholder="Search Patient/Doctor Name or ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 py-2 px-3 border border-sky-800 bg-sky-900 text-sky-200 rounded-md sm:text-sm" /></div>
            <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-sky-500/30 shadow-inner">
                <div className="bg-sky-600 p-1.5 rounded-md text-white shadow-lg animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg></div>
                <label className="font-black text-xs text-sky-400 uppercase tracking-tighter whitespace-nowrap">Scanner Mode:</label>
                <input type="text" placeholder="Scan Patient ID or Previous Invoice..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeScan} className="flex-1 py-2 px-3 border-2 border-sky-500/50 bg-slate-950 text-white rounded-md sm:text-sm font-mono" autoComplete="off" />
            </div>
        </div>`;
const searchNew = `<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2"><label className="font-semibold text-sky-300 whitespace-nowrap mb-1 sm:mb-0">Search Appt:</label><input type="text" placeholder="Search Patient/Doctor Name or ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full flex-1 py-3 sm:py-2 px-3 border border-sky-800 bg-sky-900 text-sky-200 rounded-md sm:text-sm" /></div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-800 p-3 sm:p-2 rounded-lg border border-sky-500/30 shadow-inner">
                <div className="hidden sm:flex bg-sky-600 p-1.5 rounded-md text-white shadow-lg animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg></div>
                <label className="font-black text-xs text-sky-400 uppercase tracking-tighter whitespace-nowrap mb-1 sm:mb-0">Scanner Mode:</label>
                <input type="text" placeholder="Scan Patient ID or Previous Invoice..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeScan} className="w-full flex-1 py-3 sm:py-2 px-3 border-2 border-sky-500/50 bg-slate-950 text-white rounded-md sm:text-sm font-mono" autoComplete="off" />
            </div>
        </div>`;
fileContent = fileContent.replace(searchOriginal, searchNew);

// Top level header block in Doctor Appointment area
const headerOriginal = `<div className="flex flex-wrap items-center justify-start gap-4 border-b border-sky-800 pb-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
                <label htmlFor="appointment_id" className="font-semibold text-sky-300 whitespace-nowrap">Appt. Id:</label>
                <input type="text" id="appointment_id" name="appointment_id" disabled value={formData.appointment_id} className="w-48 border border-sky-800 rounded-md shadow-sm sm:text-sm px-3 py-2 bg-sky-900 text-sky-400 cursor-not-allowed" />
                <button type="button" onClick={handleGetNewId} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Get New Appt. ID</button>
            </div>`;
const headerNew = `<div className="flex flex-col md:flex-row md:items-center md:justify-start gap-4 border-b border-sky-800 pb-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label htmlFor="appointment_id" className="font-semibold text-sky-300 whitespace-nowrap mb-1 sm:mb-0">Appt. Id:</label>
                <div className="flex gap-2">
                    <input type="text" id="appointment_id" name="appointment_id" disabled value={formData.appointment_id} className="flex-1 sm:w-48 border border-sky-800 rounded-md shadow-sm text-sm px-3 py-3 sm:py-2 bg-sky-900 text-sky-400 cursor-not-allowed" />
                    <button type="button" onClick={handleGetNewId} className="px-3 py-3 sm:py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 whitespace-nowrap">Get New</button>
                </div>
            </div>`;
fileContent = fileContent.replace(headerOriginal, headerNew);


// Table responsive changes
const tableOriginal = `<table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">SL</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Schedule</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient Details</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Doctor</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Fee</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {filteredAppointments.length > 0 ? filteredAppointments.map((appt, index) => (
                        <tr 
                            key={appt.appointment_id} 
                            className={\`hover:bg-slate-800/40 cursor-pointer transition-colors \${selectedAppointmentId === appt.appointment_id ? 'bg-blue-900/20 border-l-4 border-blue-500' : ''}\`} 
                            onClick={() => handleRowClick(appt)}
                        >
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-sky-400">{appt.appointment_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-slate-200">{appt.appointment_date}</div>
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{appt.appointment_time}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-black text-white uppercase">{appt.patient_name}</div>
                                <div className="text-[10px] text-slate-400 italic">Reason: {appt.reason}</div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-300">Dr. {appt.doctor_name}</td>
                            <td className="px-6 py-4 text-right font-black text-slate-100">৳ {(appt.doctor_fee || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                {/* Fix: Line 562 - Fixed the unintentional comparison by removing 'appt.status ===' prefix for the fallback class string */}
                                <span className={\`px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-inner \${appt.status === 'Completed' ? 'bg-emerald-900/40 text-emerald-400' : appt.status === 'Scheduled' ? 'bg-blue-900/40 text-blue-400' : appt.status === 'Returned' ? 'bg-amber-900/40 text-amber-500' : 'bg-rose-900/40 text-rose-400'}\`}>
                                    {appt.status}
                                </span>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No appointments found matching filters</td></tr>
                    )}
                </tbody>
            </table>`;

const tableNew = `
            {/* Desktop Table */}
            <table className="hidden md:table min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">SL</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Schedule</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient Details</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Doctor</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Fee</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {filteredAppointments.length > 0 ? filteredAppointments.map((appt, index) => (
                        <tr 
                            key={appt.appointment_id} 
                            className={\`hover:bg-slate-800/40 cursor-pointer transition-colors \${selectedAppointmentId === appt.appointment_id ? 'bg-blue-900/20 border-l-4 border-blue-500' : ''}\`} 
                            onClick={() => handleRowClick(appt)}
                        >
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-sky-400">{appt.appointment_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-slate-200">{appt.appointment_date}</div>
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{appt.appointment_time}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-black text-white uppercase">{appt.patient_name}</div>
                                <div className="text-[10px] text-slate-400 italic">Reason: {appt.reason}</div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-300">Dr. {appt.doctor_name}</td>
                            <td className="px-6 py-4 text-right font-black text-slate-100">৳ {(appt.doctor_fee || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={\`px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-inner \${appt.status === 'Completed' ? 'bg-emerald-900/40 text-emerald-400' : appt.status === 'Scheduled' ? 'bg-blue-900/40 text-blue-400' : appt.status === 'Returned' ? 'bg-amber-900/40 text-amber-500' : 'bg-rose-900/40 text-rose-400'}\`}>
                                    {appt.status}
                                </span>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No appointments found matching filters</td></tr>
                    )}
                </tbody>
            </table>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-800/50">
                {filteredAppointments.length > 0 ? filteredAppointments.map((appt, index) => (
                    <div 
                        key={appt.appointment_id}
                        className={\`p-4 cursor-pointer transition-colors \${selectedAppointmentId === appt.appointment_id ? 'bg-blue-900/20 border-l-4 border-blue-500' : 'hover:bg-slate-800/40 border-l-4 border-transparent'}\`}
                        onClick={() => handleRowClick(appt)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-xs font-mono text-sky-400 mr-2">{appt.appointment_id}</span>
                                <span className={\`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow-inner \${appt.status === 'Completed' ? 'bg-emerald-900/40 text-emerald-400' : appt.status === 'Scheduled' ? 'bg-blue-900/40 text-blue-400' : appt.status === 'Returned' ? 'bg-amber-900/40 text-amber-500' : 'bg-rose-900/40 text-rose-400'}\`}>
                                    {appt.status}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-slate-200">{appt.appointment_date}</div>
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{appt.appointment_time}</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-sm font-black text-white uppercase">{appt.patient_name}</div>
                                <div className="text-xs font-medium text-slate-300">Dr. {appt.doctor_name}</div>
                            </div>
                            <div className="text-lg font-black text-slate-100">৳ {(appt.doctor_fee || 0).toFixed(2)}</div>
                        </div>
                    </div>
                )) : (
                    <div className="px-6 py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No appointments found matching filters</div>
                )}
            </div>`;
            
fileContent = fileContent.replace(tableOriginal, tableNew);

// Top-level Table Wrapper responsiveness
fileContent = fileContent.replace(
    '<div className="overflow-x-auto border border-slate-700 rounded-2xl shadow-inner bg-slate-950/20">',
    '<div className="md:overflow-x-auto border border-slate-700 rounded-2xl shadow-inner bg-slate-950/20">'
);

fs.writeFileSync('components/DoctorAppointmentPage.tsx', fileContent);
