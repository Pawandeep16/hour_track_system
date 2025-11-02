/*
  # Add Shift Management System

  1. New Tables
    - `shifts`
      - `id` (uuid, primary key)
      - `name` (text) - Shift name (e.g., "Day Shift", "Night Shift", "Afternoon Shift")
      - `start_time` (time) - Shift start time (e.g., "06:00:00")
      - `end_time` (time) - Shift end time (e.g., "14:00:00")
      - `color` (text) - Color code for shift badge (e.g., "#3b82f6")
      - `created_at` (timestamp)

  2. Changes to existing tables
    - Add `shift_id` column to `time_entries` table
      - This will be auto-assigned based on the start time of the first task

  3. Security
    - Enable RLS on shifts table
    - Add policies for public access

  4. Initial Data
    - Insert default shifts:
      - Day Shift: 06:00 - 14:00 (Blue)
      - Afternoon Shift: 14:00 - 22:00 (Orange)
      - Night Shift: 22:00 - 06:00 (Purple)
*/

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to shifts"
  ON shifts FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to shifts"
  ON shifts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to shifts"
  ON shifts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from shifts"
  ON shifts FOR DELETE
  USING (true);

-- Add shift_id to time_entries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries' AND column_name = 'shift_id'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_time_entries_shift ON time_entries(shift_id);

-- Insert default shifts
INSERT INTO shifts (name, start_time, end_time, color) VALUES
  ('Day Shift', '06:00:00', '14:00:00', '#3b82f6'),
  ('Afternoon Shift', '14:00:00', '22:00:00', '#f97316'),
  ('Night Shift', '22:00:00', '06:00:00', '#a855f7')
ON CONFLICT DO NOTHING;