/*
  # Add Employee PIN Security System

  1. Changes
    - Add `security_pin` column to employees table
      - 4-digit PIN for employee authentication
      - NULL by default (no PIN set)
    - Add `pin_set_at` column to employees table
      - Timestamp when PIN was set
      - Helps track when employee last updated their PIN
  
  2. Security
    - Existing RLS policies remain unchanged
    - PINs stored as text (consider hashing in production)
  
  3. Notes
    - First-time login will prompt employees to set PIN
    - PIN is mandatory after initial setup
    - Admin can reset employee PINs
*/

-- Add security PIN columns to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'security_pin'
  ) THEN
    ALTER TABLE employees ADD COLUMN security_pin text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'pin_set_at'
  ) THEN
    ALTER TABLE employees ADD COLUMN pin_set_at timestamptz;
  END IF;
END $$;