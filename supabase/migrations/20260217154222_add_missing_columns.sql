/*
  # Add Missing Columns

  1. Changes
    - Add color column to departments table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'color'
  ) THEN
    ALTER TABLE departments ADD COLUMN color text DEFAULT '#3B82F6';
  END IF;
END $$;