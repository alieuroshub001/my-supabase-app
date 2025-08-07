-- =====================================================
-- FIX FOR SUPABASE SIGNUP DATABASE ERROR
-- =====================================================

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the corrected trigger function that handles both raw_user_meta_data and user_metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  user_full_name text;
  user_department text;
  user_job_title text;
  user_phone text;
BEGIN
  -- Extract metadata from both raw_user_meta_data and user_metadata fields
  -- raw_user_meta_data is used during signup, user_metadata is used later
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role', 
    NEW.user_metadata->>'role', 
    'team'
  );
  
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.user_metadata->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  user_department := COALESCE(
    NEW.raw_user_meta_data->>'department',
    NEW.user_metadata->>'department'
  );
  
  user_job_title := COALESCE(
    NEW.raw_user_meta_data->>'job_title',
    NEW.user_metadata->>'job_title'
  );
  
  user_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.user_metadata->>'phone'
  );

  -- Insert into profiles table with proper error handling
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    department,
    job_title,
    phone,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_role::user_role,
    NULLIF(user_department, ''),
    NULLIF(user_job_title, ''),
    NULLIF(user_phone, ''),
    true,
    NOW(),
    NOW()
  );

  -- Initialize leave balances for the new user
  INSERT INTO public.leave_balances (user_id, leave_type, total_days, used_days, remaining_days, year)
  VALUES 
    (NEW.id, 'casual', 12, 0, 12, EXTRACT(YEAR FROM NOW())),
    (NEW.id, 'sick', 10, 0, 10, EXTRACT(YEAR FROM NOW())),
    (NEW.id, 'annual', 21, 0, 21, EXTRACT(YEAR FROM NOW()))
  ON CONFLICT (user_id, leave_type, year) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error details for debugging
    RAISE LOG 'Error in handle_new_user trigger for user % (email: %): %', NEW.id, NEW.email, SQLERRM;
    
    -- Try to create a minimal profile to prevent complete failure
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, role, is_active)
      VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1), 'team'::user_role, true)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN others THEN
        -- If even the basic profile creation fails, log it but don't fail the auth
        RAISE LOG 'Failed to create basic profile for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- =====================================================
-- FIX RLS POLICIES FOR PROFILES TABLE
-- =====================================================

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create corrected RLS policies
CREATE POLICY "Enable read access for authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =====================================================
-- FIX RLS POLICIES FOR LEAVE BALANCES
-- =====================================================

-- Enable RLS on leave_balances if not already enabled
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own leave balances" ON leave_balances;
DROP POLICY IF EXISTS "Users can insert their own leave balances" ON leave_balances;
DROP POLICY IF EXISTS "Users can update their own leave balances" ON leave_balances;

-- Create RLS policies for leave_balances
CREATE POLICY "Enable read access for own leave balances" ON leave_balances
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'hr')
  ));

CREATE POLICY "Enable insert for leave balances" ON leave_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'hr')
  ));

CREATE POLICY "Enable update for leave balances" ON leave_balances
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'hr')
  ));

-- =====================================================
-- GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant permissions on profiles table
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Grant permissions on leave_balances table
GRANT SELECT, INSERT, UPDATE ON public.leave_balances TO authenticated;

-- Grant permissions on sequences (for UUIDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- TEST THE TRIGGER (Optional - for debugging)
-- =====================================================

-- Function to test if the trigger works correctly
CREATE OR REPLACE FUNCTION test_profile_creation(test_email text, test_name text, test_role text DEFAULT 'team')
RETURNS text AS $$
DECLARE
  test_result text;
BEGIN
  -- This function can be used to test profile creation logic
  -- without going through the actual auth signup process
  
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      is_active
    ) VALUES (
      gen_random_uuid(),
      test_email,
      test_name,
      test_role::user_role,
      true
    );
    
    test_result := 'Profile created successfully for ' || test_email;
    
  EXCEPTION
    WHEN others THEN
      test_result := 'Error creating profile: ' || SQLERRM;
  END;
  
  RETURN test_result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- =====================================================
-- DEBUGGING HELPER FUNCTION
-- =====================================================

-- Function to check what's in the auth.users table for debugging
CREATE OR REPLACE FUNCTION debug_auth_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  raw_meta jsonb,
  user_meta jsonb,
  confirmed_at timestamptz,
  has_profile boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data,
    au.user_metadata,
    au.email_confirmed_at,
    (p.id IS NOT NULL) as has_profile
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  ORDER BY au.created_at DESC
  LIMIT 10;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION test_profile_creation(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_auth_users() TO authenticated;