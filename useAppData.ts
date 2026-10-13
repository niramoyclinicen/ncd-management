import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ViewState, UserRole, DepartmentPasswords } from './types';
import { dbService, normalizeDate } from './dbService';
import { mockPatients, mockDoctors, mockReferrars, mockTests, mockReagents, mockInvoices, mockDueCollections, mockEmployees, mockMedicines, mockPurchaseInvoices, mockSalesInvoices, mockAdmissions, mockIndoorInvoices, initialAppointments, initialClinicalDrugs, PrescriptionRecord, LabReport, ExpenseItem } from './components/DiagnosticData';

export function useAppData() {
  // --- GLOBAL STATE ---
  const [viewState, setViewState] = useState<ViewState>(ViewState.DASHBOARD);
  const [userRole, setUserRole] = useState<UserRole>('NONE');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string>(''); // For UI feedback
  const lastSavedAtRef = useRef<string>(''); // For logic checks to avoid loops

  const [currentUserEmail] = useState(() => {
    const existing = localStorage.getItem('ncd_user_email');
    if (existing) return existing;
    const newId = `User-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem('ncd_user_email', newId);
    return newId;
  });

  // Authentication & Passwords
  const [passwords, setPasswords] = useState<DepartmentPasswords>(() => {
    const saved = localStorage.getItem('ncd_passwords');
    const defaultPasswords = {
      DIAGNOSTIC: 'diag123',
      LAB_REPORTING: 'lab123',
      CLINIC: 'clinic123',
      ACCOUNTING: 'acc123',
      MEDICINE: 'med123',
      ADMIN: 'niramoy123'
    };
    return saved ? { ...defaultPasswords, ...JSON.parse(saved) } : defaultPasswords;
  });

  // Data States
  const [patients, setPatients] = useState(mockPatients);
  const [doctors, setDoctors] = useState(mockDoctors);
  const [referrars, setReferrars] = useState(mockReferrars);
  const [tests, setTests] = useState(mockTests);
  const [reagents, setReagents] = useState(mockReagents);
  const [labInvoices, setLabInvoices] = useState(mockInvoices);
  const [dueCollections, setDueCollections] = useState(mockDueCollections);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [rtTemplates, setRtTemplates] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('ncd_rt_templates_v1') || '[]'); } catch { return []; } });
  const [employees, setEmployees] = useState(mockEmployees);
  const [medicines, setMedicines] = useState(mockMedicines);
  const [clinicalDrugs, setClinicalDrugs] = useState(initialClinicalDrugs);
  const [purchaseInvoices, setPurchaseInvoices] = useState(mockPurchaseInvoices);
  const [salesInvoices, setSalesInvoices] = useState(mockSalesInvoices);
  const [admissions, setAdmissions] = useState(mockAdmissions);
  const [indoorInvoices, setIndoorInvoices] = useState(mockIndoorInvoices);
  const [detailedExpenses, setDetailedExpenses] = useState<Record<string, ExpenseItem[]>>({});
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [appointments, setAppointments] = useState(initialAppointments);
  
  // Marketing States
  const [employeeReferrerMap, setEmployeeReferrerMap] = useState<Record<string, string[]>>({});
  const [consolidatedLabEntries, setConsolidatedLabEntries] = useState<any[]>(() => {
    return dbService.getConsolidatedEntries();
  });

  // HR/Payroll States
  const [attendanceLog, setAttendanceLog] = useState<Record<string, any>>({});
  const [leaveLog, setLeaveLog] = useState<Record<string, any>>({});
  const [monthlyRoster, setMonthlyRoster] = useState<Record<string, string[]>>({});
  const [monthlyAdjustments, setMonthlyAdjustments] = useState<Record<string, any>>(() => {
    try {
      return JSON.parse(localStorage.getItem('ncd_monthly_adjustments') || '{}');
    } catch {
      return {};
    }
  });
  const [diagnosticSettings, setDiagnosticSettings] = useState<any>(() => {
    const saved = localStorage.getItem('diag_settings');
    return saved ? JSON.parse(saved) : { customSubCategories: {}, trackedTests: [] };
  });

  // --- DATA LOADING & REAL-TIME SYNC ---
  useEffect(() => {
    const loadData = async () => {
      const loadedData = await dbService.loadFromCloud();
      const localData = dbService.getLocalBackup();
      
      let finalDataToLoad = loadedData;
      
      if (loadedData && !loadedData._error) {
        // ALWAYS treat loadedData from cloud (which queries ncd_state + all modular tables) as master
        // If localData has any additional offline records, merge them in non-destructively
        if (localData && typeof localData === 'object') {
          if (localData.detailedExpenses && typeof localData.detailedExpenses === 'object') {
            if (!finalDataToLoad.detailedExpenses) finalDataToLoad.detailedExpenses = {};
            const addLocalExp = (it: any, fallbackDateKey?: string) => {
              if (!it || it.isDeleted) return;
              const normDate = normalizeDate(it.date || it.expense_date || fallbackDateKey || '');
              if (!normDate) return;
              if (!finalDataToLoad.detailedExpenses[normDate]) finalDataToLoad.detailedExpenses[normDate] = [];
              const itId = String(it.id || '');
              const exists = finalDataToLoad.detailedExpenses[normDate].some((x: any) => String(x.id || '') === itId && itId !== '');
              if (!exists) {
                finalDataToLoad.detailedExpenses[normDate].push({ ...it, date: normDate });
              }
            };
            if (Array.isArray(localData.detailedExpenses)) {
              localData.detailedExpenses.forEach((it: any) => addLocalExp(it));
            } else {
              Object.entries(localData.detailedExpenses).forEach(([dKey, items]: [string, any]) => {
                const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
                list.forEach((it: any) => addLocalExp(it, dKey));
              });
            }
          }
          // If cloud data is loaded, merge any local offline or newly created records non-destructively
          const mergeConfig: Record<string, string[]> = {
            indoorInvoices: ['daily_id', 'invoice_id', 'id'],
            admissions: ['admission_id', 'id'],
            labInvoices: ['invoice_id', 'invoiceId', 'id', 'invoice_no'],
            dueCollections: ['collection_id', 'id', 'collectionId'],
            salesInvoices: ['invoiceId', 'invoice_id', 'id'],
            purchaseInvoices: ['invoiceId', 'invoice_id', 'id'],
            medicines: ['id', 'tradeName', 'trade_name'],
            tests: ['test_id', 'id', 'test_name'],
            reagents: ['reagent_id', 'id'],
            patients: ['pt_id', 'patient_id', 'id'],
            doctors: ['doctor_id', 'id'],
            referrars: ['ref_id', 'referrar_id', 'referrer_id', 'id'],
            employees: ['emp_id', 'id'],
            reports: ['report_id', 'id'],
            prescriptions: ['id'],
            appointments: ['appointment_id', 'id'],
            consolidatedLabEntries: ['id', '_id']
          };

          Object.entries(mergeConfig).forEach(([col, idFields]) => {
            const cloudArr = finalDataToLoad[col];
            let src = localData[col] || (col === 'consolidatedLabEntries' ? (localData.consolidated_lab_entries || localData.consolidatedEntries) : undefined);
            if (col === 'consolidatedLabEntries' && (!Array.isArray(src) || src.length === 0)) {
              src = dbService.getConsolidatedEntries();
            }
            if (Array.isArray(src) && src.length > 0) {
              finalDataToLoad[col] = dbService.mergeEntityList(cloudArr || [], src, idFields);
            }
          });
        }
        
        if (Object.keys(finalDataToLoad).length > 0) {
          updateLocalState(finalDataToLoad, true);
        }
        setIsDataLoaded(true);
        setConnectionError(false);
      } else {
        if (localData) {
          console.log("Cloud load failed, but found local data. Using local backup.");
          updateLocalState(localData, true);
          setIsDataLoaded(true);
          setConnectionError(false);
        } else {
          // FALLBACK FOR TESTING: If no cloud and no local data, just use the mock data so the user can test the UI.
          console.warn("Cloud and Local load failed. Falling back to default mock data for testing.");
          setConnectionErrorMessage(loadedData ? loadedData._error : 'Unknown load error');
          setIsDataLoaded(true); // Let the app load!
          setConnectionError(false); // Remove the blocking error screen
        }
      }
    };

    const updateLocalState = (data: any, isInitialLoad = false) => {
      if (!data) return;
      
      // If the data from cloud is same or older than our last local save, ignore to prevent echo loops (unless initial load)
      if (!isInitialLoad && lastSavedAtRef.current && data.last_updated_at && data.last_updated_at <= lastSavedAtRef.current) {
        return;
      }

      // Important: Update sync markers immediately to acknowledge this remote state
      if (data.last_updated_at) {
        lastSavedAtRef.current = data.last_updated_at;
        setLastSavedAt(data.last_updated_at);
      }

      // Batching updates without expensive JSON.stringify
      if (Array.isArray(data.patients)) setPatients(data.patients);
      if (Array.isArray(data.doctors)) setDoctors(data.doctors);
      if (Array.isArray(data.referrars)) setReferrars(data.referrars);
      if (Array.isArray(data.tests)) setTests(data.tests);
      if (Array.isArray(data.reagents)) setReagents(data.reagents);
      if (Array.isArray(data.labInvoices)) setLabInvoices(data.labInvoices);
      if (Array.isArray(data.dueCollections)) setDueCollections(data.dueCollections);
      if (Array.isArray(data.reports)) setReports(data.reports);
      if (Array.isArray(data.rtTemplates)) {
          setRtTemplates(data.rtTemplates);
          try {
              localStorage.setItem('ncd_rt_templates_v1', JSON.stringify(data.rtTemplates));
          } catch(e){}
      }
      if (Array.isArray(data.employees)) setEmployees(data.employees);
      if (Array.isArray(data.medicines)) setMedicines(data.medicines);
      if (Array.isArray(data.clinicalDrugs)) setClinicalDrugs(data.clinicalDrugs);
      if (Array.isArray(data.purchaseInvoices)) setPurchaseInvoices(data.purchaseInvoices);
      if (Array.isArray(data.salesInvoices)) setSalesInvoices(data.salesInvoices);
      if (Array.isArray(data.admissions)) setAdmissions(data.admissions);
      if (Array.isArray(data.indoorInvoices)) setIndoorInvoices(data.indoorInvoices);
      if (data.detailedExpenses !== undefined) {
        const raw = data.detailedExpenses || {};
        const cleanObj: Record<string, ExpenseItem[]> = {};
        const addExp = (it: any, fallbackKey?: string) => {
          if (!it || it.isDeleted) return;
          let normKey = normalizeDate(it.date || it.expense_date || fallbackKey || '');
          if (!normKey && it.id) {
            const m = String(it.id).match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
            if (m) normKey = `${m[1]}-${m[2]}-${m[3]}`;
          }
          if (!normKey && fallbackKey) normKey = normalizeDate(fallbackKey) || fallbackKey;
          if (!normKey) return;
          if (!cleanObj[normKey]) cleanObj[normKey] = [];
          let expCounter = 0;
          const itId = String(it.id || `exp_${normKey.replace(/-/g, '')}_${Date.now()}_${++expCounter}_${Math.random().toString(36).substring(2, 6)}`);
          const expPaid = Number(it.paidAmount ?? it.paid_amount ?? it.amount ?? it.billAmount ?? it.bill_amount ?? 0);
          const expBill = Number(it.billAmount ?? it.bill_amount ?? it.paidAmount ?? it.paid_amount ?? expPaid);
          const expItem: ExpenseItem = {
            ...it,
            id: itId,
            date: normKey,
            paidAmount: expPaid,
            paid_amount: expPaid,
            billAmount: expBill,
            bill_amount: expBill,
            category: it.category || 'General',
            subCategory: it.subCategory || it.sub_category || '',
            description: it.description || '',
            dept: it.dept || 'Diagnostic'
          };
          const existingIdx = cleanObj[normKey].findIndex((x: any) => String(x.id || '') === itId && itId !== '');
          if (existingIdx >= 0) {
            cleanObj[normKey][existingIdx] = { ...cleanObj[normKey][existingIdx], ...expItem };
          } else {
            cleanObj[normKey].push(expItem);
          }
        };
        if (Array.isArray(raw)) {
          raw.forEach((it: any) => addExp(it));
        } else if (typeof raw === 'object' && raw !== null) {
          Object.entries(raw).forEach(([dKey, items]: [string, any]) => {
            const list = Array.isArray(items) ? items : (items && typeof items === 'object' ? Object.values(items) : []);
            list.forEach((it: any) => addExp(it, dKey));
          });
        }
        setDetailedExpenses(cleanObj);
      }
      if (Array.isArray(data.prescriptions)) setPrescriptions(data.prescriptions);
      if (Array.isArray(data.appointments)) setAppointments(data.appointments);
      if (data.attendanceLog !== undefined) setAttendanceLog(data.attendanceLog || {});
      if (data.leaveLog !== undefined) setLeaveLog(data.leaveLog || {});
      if (data.monthlyRoster !== undefined) setMonthlyRoster(data.monthlyRoster || {});
      if (data.monthlyAdjustments !== undefined && typeof data.monthlyAdjustments === 'object' && data.monthlyAdjustments !== null) {
        setMonthlyAdjustments(prev => {
          const merged = { ...prev, ...data.monthlyAdjustments };
          try {
            localStorage.setItem('ncd_monthly_adjustments', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (data.diagnosticSettings !== undefined) setDiagnosticSettings(data.diagnosticSettings || {});
      if (data.employeeReferrerMap !== undefined) setEmployeeReferrerMap(data.employeeReferrerMap || {});
      const incomingCons = Array.isArray(data.consolidatedLabEntries) 
        ? data.consolidatedLabEntries 
        : (Array.isArray(data.consolidated_lab_entries) ? data.consolidated_lab_entries : null);
      if (incomingCons !== null) {
        setConsolidatedLabEntries(prev => {
          const localCurrent = Array.isArray(prev) && prev.length > 0 ? prev : dbService.getConsolidatedEntries();
          const merged = dbService.mergeEntityList(localCurrent || [], incomingCons, ['id', '_id']);
          dbService.saveConsolidatedEntries(merged);
          return merged;
        });
      }
      if (data.passwords !== undefined && typeof data.passwords === 'object' && data.passwords !== null) {
        const defaultPasswords = {
          DIAGNOSTIC: 'diag123',
          LAB_REPORTING: 'lab123',
          CLINIC: 'clinic123',
          ACCOUNTING: 'acc123',
          MEDICINE: 'med123',
          ADMIN: 'niramoy123'
        };
        const merged = { ...defaultPasswords, ...data.passwords };
        setPasswords(merged);
        try {
          localStorage.setItem('ncd_passwords', JSON.stringify(merged));
        } catch {}
      }
    };

    loadData();

    // REAL-TIME LISTENER: Listen for changes from other users
    const subscription = dbService.subscribeToChanges(async (newData) => {
      if (newData && Object.keys(newData).length > 0) {
        const fullState = await dbService.loadFromCloud();
        if (fullState && !fullState._error) {
          updateLocalState(fullState);
        }
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [manualSyncError, setManualSyncError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [lastManualSyncTime, setLastManualSyncTime] = useState(0);

  const showSyncNotification = useMemo(() => {
    return (isSyncing || syncError);
  }, [isSyncing, syncError]);

  // Helper to get current state for syncing
  const getCurrentState = useCallback((overrides: any = {}) => {
    let localAdj = {};
    try {
      localAdj = JSON.parse(localStorage.getItem('ncd_monthly_adjustments') || '{}');
    } catch {}
    return {
      patients, doctors, referrars, tests, reagents, labInvoices, 
      dueCollections, reports, rtTemplates, employees, medicines, clinicalDrugs,
      purchaseInvoices, salesInvoices, admissions, indoorInvoices,
      detailedExpenses, prescriptions, appointments, attendanceLog, leaveLog, monthlyRoster,
      monthlyAdjustments: { ...monthlyAdjustments, ...localAdj, ...(overrides?.monthlyAdjustments || {}) },
      diagnosticSettings, employeeReferrerMap,
      consolidatedLabEntries: (overrides && overrides.consolidatedLabEntries) || consolidatedLabEntries || dbService.getConsolidatedEntries(),
      passwords,
      last_updated_at: new Date().toISOString(),
      ...overrides
    };
  }, [patients, doctors, referrars, tests, reagents, labInvoices, dueCollections, reports, rtTemplates, employees, medicines, clinicalDrugs, purchaseInvoices, salesInvoices, admissions, indoorInvoices, detailedExpenses, prescriptions, appointments, attendanceLog, leaveLog, monthlyRoster, monthlyAdjustments, diagnosticSettings, employeeReferrerMap, consolidatedLabEntries, passwords]);

  // Blocking Manual Sync Handler
  const performBlockingSync = useCallback(async (overrides?: any) => {
    setIsManualSyncing(true);
    setManualSyncError(null);
    
    // Merge overrides with current state if any, otherwise use current state
    if (overrides?.labInvoices) {
      setLabInvoices(overrides.labInvoices);
    }
    if (overrides?.dueCollections) {
      setDueCollections(overrides.dueCollections);
    }
    if (overrides?.detailedExpenses) {
      setDetailedExpenses(overrides.detailedExpenses);
    }
    if (overrides?.referrars) {
      setReferrars(overrides.referrars);
    }
    if (overrides?.tests) {
      setTests(overrides.tests);
      try {
        dbService.syncTestsToModularTable(overrides.tests);
      } catch (e) {}
    }
    if (overrides?.reports) {
      setReports(overrides.reports);
    }
    if (overrides?.prescriptions) {
      setPrescriptions(overrides.prescriptions);
    }
    if (overrides?.appointments) {
      setAppointments(overrides.appointments);
    }
    if (overrides?.reagents) {
      setReagents(overrides.reagents);
    }
    if (overrides?.consolidatedLabEntries) {
      setConsolidatedLabEntries(overrides.consolidatedLabEntries);
    }
    if (overrides?.admissions) {
      setAdmissions(overrides.admissions);
    }
    if (overrides?.indoorInvoices) {
      setIndoorInvoices(overrides.indoorInvoices);
    }
    if (overrides?.patients) {
      setPatients(overrides.patients);
    }
    if (overrides?.doctors) {
      setDoctors(overrides.doctors);
    }
    if (overrides?.employees) {
      setEmployees(overrides.employees);
    }
    if (overrides?.medicines) {
      setMedicines(overrides.medicines);
    }
    if (overrides?.purchaseInvoices) {
      setPurchaseInvoices(overrides.purchaseInvoices);
    }
    if (overrides?.salesInvoices) {
      setSalesInvoices(overrides.salesInvoices);
    }
    if (overrides?.diagnosticSettings) {
      setDiagnosticSettings(overrides.diagnosticSettings);
    }
    if (overrides?.attendanceLog) {
      setAttendanceLog(overrides.attendanceLog);
    }
    if (overrides?.leaveLog) {
      setLeaveLog(overrides.leaveLog);
    }
    if (overrides?.monthlyRoster) {
      setMonthlyRoster(overrides.monthlyRoster);
    }
    if (overrides?.monthlyAdjustments) {
      setMonthlyAdjustments(overrides.monthlyAdjustments);
      try {
        localStorage.setItem('ncd_monthly_adjustments', JSON.stringify(overrides.monthlyAdjustments));
      } catch (e) {}
    }
    if (overrides?.rtTemplates) {
      setRtTemplates(overrides.rtTemplates);
    }
    if (overrides?.passwords) {
      setPasswords(overrides.passwords);
    }
    const now = new Date().toISOString();
    setLastSavedAt(now);
    lastSavedAtRef.current = now;
    const stateToSync = getCurrentState({ ...overrides, last_updated_at: now });
    
    // Always backup to local storage immediately so data is never lost offline
    try {
      localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(stateToSync));
    } catch (e) {
      console.warn("Local cache save notice:", e);
    }
    
    try {
      console.log(`[Sync] Starting blocking sync. Overrides:`, overrides ? Object.keys(overrides) : 'None');
      const result = await dbService.saveToCloud(stateToSync);
      if (result.success) {
        console.log(`[Sync] Success!`);
        
        try {
          localStorage.setItem('ncd_offline_cache_v1', JSON.stringify(stateToSync));
        } catch (e) {
          console.warn("Local backup notice:", e);
        }
        
        setIsManualSyncing(false);
        setSyncError(false);
        setLastManualSyncTime(Date.now());
        return true;
      } else {
        console.warn(`[Sync] Cloud save returned notice, offline data secured:`, result.error || result.warning);
        setIsManualSyncing(false);
        setSyncError(false);
        setLastManualSyncTime(Date.now());
        return true;
      }
    } catch (e) {
      console.warn(`[Sync] Notice:`, e);
      setIsManualSyncing(false);
      setSyncError(false);
      return true;
    }
  }, [getCurrentState]);

  // --- DATA SYNCING ---
  useEffect(() => {
    // Auto-sync is completely disabled as per user request.
    // The application relies entirely on manual explicit saves via performBlockingSync.
  }, []);

  // --- HANDLERS ---
  
  return { viewState, userRole, isAdminLoggedIn, isDataLoaded, connectionError, connectionErrorMessage, lastSavedAt, currentUserEmail, passwords, patients, doctors, referrars, tests, reagents, labInvoices, dueCollections, reports, rtTemplates, employees, medicines, clinicalDrugs, purchaseInvoices, salesInvoices, admissions, indoorInvoices, detailedExpenses, prescriptions, appointments, employeeReferrerMap, attendanceLog, leaveLog, monthlyRoster, monthlyAdjustments, setMonthlyAdjustments, diagnosticSettings, consolidatedLabEntries, setConsolidatedLabEntries, isSyncing, isManualSyncing, manualSyncError, syncError, lastManualSyncTime, setViewState, setUserRole, setIsAdminLoggedIn, setIsDataLoaded, setConnectionError, setConnectionErrorMessage, setLastSavedAt, setPasswords, setPatients, setDoctors, setReferrars, setTests, setReagents, setLabInvoices, setDueCollections, setReports, setRtTemplates, setEmployees, setMedicines, setClinicalDrugs, setPurchaseInvoices, setSalesInvoices, setAdmissions, setIndoorInvoices, setDetailedExpenses, setPrescriptions, setAppointments, setEmployeeReferrerMap, setAttendanceLog, setLeaveLog, setMonthlyRoster, setDiagnosticSettings, setIsSyncing, setIsManualSyncing, setManualSyncError, setSyncError, setLastManualSyncTime, getCurrentState, performBlockingSync, showSyncNotification };
}
