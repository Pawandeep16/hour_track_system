/*
  # Add Temporary Employee Support

  1. Changes to existing tables
    - Add `is_temp` column to `employees` table
      - Boolean field to indicate if employee is temporary
      - Default to false for regular employees
      - Used to generate different employee codes (TEMP_name vs EMP_name_code)

  2. Notes
    - Temporary employees will have IDs like: TEMP_john_doe
    - Regular employees will have IDs like: EMP_john_doe_1234
    - This allows easy filtering and identification of temp workers
*/

-- Add is_temp column to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'is_temp'
  ) THEN
    ALTER TABLE employees ADD COLUMN is_temp boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create index for better query performance when filtering by temp status
CREATE INDEX IF NOT EXISTS idx_employees_is_temp ON employees(is_temp);