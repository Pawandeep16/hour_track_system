/*
  # Add Profile Image Support

  1. Changes to employees table
    - Add `profile_image_url` column (text, nullable) - URL to profile image
  
  2. Notes
    - Profile images can be uploaded by employees
    - Images will be stored as URLs
*/

-- Add profile image column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE employees ADD COLUMN profile_image_url text;
  END IF;
END $$;
