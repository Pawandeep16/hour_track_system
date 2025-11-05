import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Task {
  id: string;
  department_id: string;
  name: string;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  employee_code: string;
  is_temp: boolean;
  security_pin: string | null;
  pin_set_at: string | null;
  email: string | null;
  email_verified: boolean;
  position: string;
  verification_code: string | null;
  verification_code_expires: string | null;
  auth_user_id: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  department_id: string;
  task_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  entry_date: string;
  created_at: string;
}

export interface BreakEntry {
  id: string;
  employee_id: string;
  break_type: 'paid' | 'unpaid';
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  entry_date: string;
  created_at: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  created_at: string;
}
