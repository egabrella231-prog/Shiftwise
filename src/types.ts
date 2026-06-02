export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  plan: 'starter' | 'business' | 'enterprise';
  created_at: string;
}

export interface UserProfile {
  id: string;
  company_id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'employee';
  phone?: string;
}

export interface Employee {
  id: string;
  company_id: string;
  name: string;
  badge: string;
  role: 'Guard' | 'Supervisor' | 'Team Leader' | 'Control Room' | 'Armed Response' | 'K9 Handler';
  site_id: string; // references Site id
  hourly_rate: number; // in NAD
  photo_url?: string;
  phone?: string;
  id_number?: string;
  created_at: string;
}

export interface Site {
  id: string;
  company_id: string;
  name: string;
  location?: string;
}

export interface PayrollSettings {
  company_id: string;
  night_allowance: number; // NAD extra per hour worked at night
  ot_rate: number; // e.g. 1.5 or 2
  ot_threshold: number; // OT starts after N hours/month
  ph_bonus: number; // flat NAD extra per public holiday worked
}

// Roster document in Firestore:
// id = `employeeId_month` (e.g. `emp123_2026-06`)
export interface Roster {
  id: string;
  employee_id: string;
  company_id: string;
  month: string; // format: "YYYY-MM" (e.g., "2026-06")
  shifts: { [day: string]: 'D' | 'N' | 'O' | 'X' | 'PH' };
  updated_at: string;
}

export type ShiftType = 'D' | 'N' | 'O' | 'X' | 'PH';

export interface ShiftDefinition {
  code: ShiftType;
  name: string;
  hours: number;
}

export const SHIFT_DEFINITIONS: { [key in ShiftType]: ShiftDefinition } = {
  D: { code: 'D', name: 'Day shift 06:00–18:00', hours: 12 },
  N: { code: 'N', name: 'Night shift 18:00–06:00', hours: 12 },
  O: { code: 'O', name: 'Off duty', hours: 0 },
  X: { code: 'X', name: 'Leave / Sick', hours: 0 },
  PH: { code: 'PH', name: 'Public Holiday (Worked)', hours: 12 }
};
