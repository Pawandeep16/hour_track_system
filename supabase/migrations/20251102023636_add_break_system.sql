/*
  # Add Break System to Time Tracking

  1. Changes
    - Add `break_entries` table to track breaks separately from time entries
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `break_type` (text) - 'paid' or 'unpaid'
      - `start_time` (timestamptz) - When break started
      - `end_time` (timestamptz, nullable) - When break ended
      - `duration_minutes` (integer, nullable) - Calculated duration
      - `entry_date` (date) - Date of the break
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on break_entries table
    - Add policies for public access

  3. Notes
    - Paid breaks are limited to 30 minutes
    - Unpaid breaks are limited to 3 minutes
    - Breaks are tracked separately from regular time entries
*/

-- Create break_entries table
CREATE TABLE IF NOT EXISTS break_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  break_type text NOT NULL CHECK (break_type IN ('paid', 'unpaid')),
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes integer,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE break_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to break_entries"
  ON break_entries FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to break_entries"
  ON break_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to break_entries"
  ON break_entries FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from break_entries"
  ON break_entries FOR DELETE
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_break_entries_employee ON break_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_break_entries_date ON break_entries(entry_date);