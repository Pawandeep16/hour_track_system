/*
  # Hour Tracking System Database Schema

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Department name (e.g., "Parcel", "Last Mile")
      - `created_at` (timestamp)
    
    - `tasks`
      - `id` (uuid, primary key)
      - `department_id` (uuid, foreign key to departments)
      - `name` (text) - Task name (e.g., "Morning Loadout", "Sorting")
      - `created_at` (timestamp)
    
    - `employees`
      - `id` (uuid, primary key)
      - `name` (text) - Employee name
      - `employee_code` (text, unique) - Auto-generated unique identifier
      - `created_at` (timestamp)
    
    - `time_entries`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `department_id` (uuid, foreign key to departments)
      - `task_id` (uuid, foreign key to tasks)
      - `start_time` (timestamptz) - When task started
      - `end_time` (timestamptz, nullable) - When task ended
      - `duration_minutes` (integer, nullable) - Calculated duration
      - `entry_date` (date) - Date of the entry
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since this is an employee tracking system without individual auth)

  3. Initial Data
    - Insert default departments: Parcel and Last Mile
    - Insert default tasks for each department
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to departments"
  ON departments FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to departments"
  ON departments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to departments"
  ON departments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from departments"
  ON departments FOR DELETE
  USING (true);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to tasks"
  ON tasks FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to tasks"
  ON tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to tasks"
  ON tasks FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from tasks"
  ON tasks FOR DELETE
  USING (true);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  employee_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to employees"
  ON employees FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to employees"
  ON employees FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to employees"
  ON employees FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from employees"
  ON employees FOR DELETE
  USING (true);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes integer,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to time_entries"
  ON time_entries FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to time_entries"
  ON time_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to time_entries"
  ON time_entries FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from time_entries"
  ON time_entries FOR DELETE
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_department ON time_entries(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department_id);

-- Insert default departments
INSERT INTO departments (name) VALUES ('Parcel'), ('Last Mile')
ON CONFLICT (name) DO NOTHING;

-- Insert default tasks for Parcel department
INSERT INTO tasks (department_id, name)
SELECT id, 'Morning Loadout' FROM departments WHERE name = 'Parcel'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (department_id, name)
SELECT id, 'Sorting' FROM departments WHERE name = 'Parcel'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (department_id, name)
SELECT id, 'Box Sorting' FROM departments WHERE name = 'Parcel'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (department_id, name)
SELECT id, 'Extended Zone Sorting' FROM departments WHERE name = 'Parcel'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (department_id, name)
SELECT id, 'Fulfillment' FROM departments WHERE name = 'Parcel'
ON CONFLICT DO NOTHING;

-- Insert default tasks for Last Mile department
INSERT INTO tasks (department_id, name)
SELECT id, 'Morning Loadout' FROM departments WHERE name = 'Last Mile'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (department_id, name)
SELECT id, 'Delivery' FROM departments WHERE name = 'Last Mile'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (department_id, name)
SELECT id, 'Route Planning' FROM departments WHERE name = 'Last Mile'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (department_id, name)
SELECT id, 'Vehicle Check' FROM departments WHERE name = 'Last Mile'
ON CONFLICT DO NOTHING;