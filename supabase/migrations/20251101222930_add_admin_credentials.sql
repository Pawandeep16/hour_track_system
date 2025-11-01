/*
  # Add Admin Credentials Table

  1. New Tables
    - `admin_credentials`
      - `id` (uuid, primary key)
      - `username` (text, unique) - Admin username
      - `password` (text) - Admin password (in production, this should be hashed)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on admin_credentials table
    - Add policies for public read access (needed for login verification)

  3. Initial Data
    - Insert default admin credentials (username: admin, password: admin123)
*/

-- Create admin_credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to admin_credentials"
  ON admin_credentials FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to admin_credentials"
  ON admin_credentials FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to admin_credentials"
  ON admin_credentials FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Insert default admin credentials
INSERT INTO admin_credentials (username, password) 
VALUES ('admin', 'admin123')
ON CONFLICT (username) DO NOTHING;