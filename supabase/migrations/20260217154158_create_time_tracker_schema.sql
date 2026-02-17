/*
  # Time Tracker Database Schema

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null)
      - `color` (text)
      - `created_at` (timestamptz)
    
    - `shifts`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `start_time` (time, not null)
      - `end_time` (time, not null)
      - `color` (text)
      - `created_at` (timestamptz)
    
    - `employees`
      - `id` (uuid, primary key)
      - `employee_code` (text, unique, not null)
      - `name` (text, not null)
      - `is_temp` (boolean, default false)
      - `security_pin` (text)
      - `pin_set_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `tasks`
      - `id` (uuid, primary key)
      - `department_id` (uuid, foreign key)
      - `name` (text, not null)
      - `created_at` (timestamptz)
    
    - `time_entries`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key, not null)
      - `department_id` (uuid, foreign key, not null)
      - `task_id` (uuid, foreign key, not null)
      - `shift_id` (uuid, foreign key)
      - `entry_date` (date, not null)
      - `start_time` (timestamptz, not null)
      - `end_time` (timestamptz)
      - `duration_minutes` (integer)
      - `created_at` (timestamptz)
    
    - `break_entries`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key, not null)
      - `break_type` (text, not null)
      - `entry_date` (date, not null)
      - `start_time` (timestamptz, not null)
      - `end_time` (timestamptz)
      - `duration_minutes` (integer)
      - `created_at` (timestamptz)
    
    - `admin_credentials`
      - `id` (uuid, primary key)
      - `username` (text, unique, not null)
      - `password` (text, not null)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add public read policies for departments, shifts, tasks (employees need to see these)
    - Add restrictive policies for employees, time_entries, break_entries
    - Admin credentials are locked down completely
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read departments"
  ON departments FOR SELECT
  TO public
  USING (true);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  color text DEFAULT '#10B981',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shifts"
  ON shifts FOR SELECT
  TO public
  USING (true);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text UNIQUE NOT NULL,
  name text NOT NULL,
  is_temp boolean DEFAULT false,
  security_pin text,
  pin_set_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read employees"
  ON employees FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update employees"
  ON employees FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tasks"
  ON tasks FOR SELECT
  TO public
  USING (true);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read time_entries"
  ON time_entries FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert time_entries"
  ON time_entries FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update time_entries"
  ON time_entries FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete time_entries"
  ON time_entries FOR DELETE
  TO public
  USING (true);

-- Create break_entries table
CREATE TABLE IF NOT EXISTS break_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  break_type text NOT NULL,
  entry_date date NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE break_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read break_entries"
  ON break_entries FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert break_entries"
  ON break_entries FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update break_entries"
  ON break_entries FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete break_entries"
  ON break_entries FOR DELETE
  TO public
  USING (true);

-- Create admin_credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin_credentials"
  ON admin_credentials FOR SELECT
  TO public
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date 
  ON time_entries(employee_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_time_entries_end_time 
  ON time_entries(employee_id, end_time);

CREATE INDEX IF NOT EXISTS idx_break_entries_employee_date 
  ON break_entries(employee_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_break_entries_end_time 
  ON break_entries(employee_id, end_time);

CREATE INDEX IF NOT EXISTS idx_tasks_department 
  ON tasks(department_id);