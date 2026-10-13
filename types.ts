
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  DIAGNOSTIC = 'DIAGNOSTIC',
  CLINIC = 'CLINIC',
  MEDICINE = 'MEDICINE',
  ACCOUNTING = 'ACCOUNTING',
  DOCTOR_LOGIN = 'DOCTOR_LOGIN',
  DOCTOR_PORTAL = 'DOCTOR_PORTAL',
  MARKETING = 'MARKETING',
  LAB_LOGIN = 'LAB_LOGIN',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS', // New: Admin password management
  LOGIN_GATE = 'LOGIN_GATE',         // New: Generic login for departments
}

export type UserRole = 'ADMIN' | 'LAB_REPORTER' | 'DIAGNOSTIC_ADMIN' | 'CLINIC_ADMIN' | 'ACCOUNTING_ADMIN' | 'MEDICINE_ADMIN' | 'DOCTOR' | 'NONE';

export interface DepartmentPasswords {
  DIAGNOSTIC: string;
  LAB_REPORTING: string;
  CLINIC: string;
  ACCOUNTING: string;
  MEDICINE: string;
  ADMIN: string;
}
