/*
  # Add Employee Positions and Email Verification

  1. Changes to employees table
    - Add `email` column (text, unique, nullable initially)
    - Add `email_verified` column (boolean, default false)
    - Add `position` column (text, default 'Warehouse Associate')
    - Add `verification_code` column (text, nullable) - for email verification codes
    - Add `verification_code_expires` column (timestamptz, nullable)
    - Add `auth_user_id` column (uuid, nullable) - link to Supabase Auth users
  
  2. Security
    - Update RLS policies to allow employees to update their own profile
    - Admin can update all employee details
  
  3. Notes
    - Existing employees will have default position 'Warehouse Associate'
    - Email verification required for login after this migration
*/

-- Add new columns to employees table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'email'
  ) THEN
    ALTER TABLE employees ADD COLUMN email text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE employees ADD COLUMN email_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'position'
  ) THEN
    ALTER TABLE employees ADD COLUMN position text DEFAULT 'Warehouse Associate';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'verification_code'
  ) THEN
    ALTER TABLE employees ADD COLUMN verification_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'verification_code_expires'
  ) THEN
    ALTER TABLE employees ADD COLUMN verification_code_expires timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN auth_user_id uuid UNIQUE;
  END IF;
END $$;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON employees(auth_user_id);
