# Troubleshooting Signup Database Error

This guide will help you fix the "AuthApiError: Database error saving new user" issue step by step.

## 🔍 **Root Cause**

The error occurs because:
1. The database trigger `handle_new_user()` was looking for `user_metadata` but the signup form passes data through `raw_user_meta_data`
2. RLS (Row Level Security) policies were not properly configured
3. Missing permissions for the trigger function

## 🛠️ **Step-by-Step Fix**

### **Step 1: Run the Fixed Database Script**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `fix_database_trigger.sql`
4. Click **Run** to execute the script

This will:
- ✅ Fix the trigger to handle both `raw_user_meta_data` and `user_metadata`
- ✅ Update RLS policies for proper permissions
- ✅ Add error handling and logging
- ✅ Create debugging helper functions

### **Step 2: Verify the Fix**

After running the SQL script, test the trigger:

```sql
-- Test the trigger function
SELECT test_profile_creation('test@example.com', 'Test User', 'team');
```

You should see: `"Profile created successfully for test@example.com"`

### **Step 3: Use the Fixed Signup Component**

The project now uses `SignupFormFixed` component which:
- ✅ Properly passes metadata through the `data` field
- ✅ Removes complex fallback logic (handled by trigger)
- ✅ Adds better error logging

### **Step 4: Test Signup Flow**

1. Go to `/signup` in your application
2. Fill out the form with test data
3. Submit the form
4. Check for any console errors

## 🔧 **Debugging Tools**

### **Check Recent Users and Metadata**
```sql
SELECT * FROM debug_auth_users();
```

This shows:
- Recent auth.users entries
- Their metadata (both raw and processed)
- Whether they have profiles created

### **Check Profile Creation**
```sql
-- Check if profiles are being created
SELECT 
  au.email,
  au.created_at as auth_created,
  p.created_at as profile_created,
  p.full_name,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 5;
```

### **Check Database Logs**
In Supabase Dashboard:
1. Go to **Logs** → **Database**
2. Look for entries containing "Error in handle_new_user trigger"
3. Check for specific error details

## 🚨 **Common Issues & Solutions**

### **Issue 1: "permission denied for table profiles"**

**Solution:** Run these SQL commands:
```sql
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
```

### **Issue 2: "function handle_new_user() does not exist"**

**Solution:** The trigger wasn't created properly. Re-run the `fix_database_trigger.sql` script.

### **Issue 3: "invalid input syntax for type user_role"**

**Solution:** Check that the role value is one of: 'admin', 'hr', 'team', 'client'

### **Issue 4: RLS Policy Violations**

**Solution:** Run this to check and fix RLS policies:
```sql
-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- If no policies exist, re-run the fix script
```

## 📋 **Verification Checklist**

After applying the fix, verify:

- [ ] ✅ Database trigger `handle_new_user` exists and is active
- [ ] ✅ RLS policies are properly configured for `profiles` table
- [ ] ✅ RLS policies are properly configured for `leave_balances` table
- [ ] ✅ Proper permissions granted to `authenticated` role
- [ ] ✅ Signup form uses the fixed component
- [ ] ✅ Test signup creates both user and profile
- [ ] ✅ Leave balances are automatically created

## 🧪 **Test Cases**

### **Test 1: Basic Signup**
```
Email: test1@example.com
Name: Test User One
Role: team
Department: Engineering
```

### **Test 2: Admin Signup**
```
Email: admin@example.com
Name: Admin User
Role: admin
Department: Management
```

### **Test 3: Minimal Data Signup**
```
Email: minimal@example.com
Name: Min User
Role: team
(Leave other fields empty)
```

## 📊 **Expected Database State After Signup**

After successful signup, you should see:

### **In `auth.users` table:**
```sql
SELECT id, email, raw_user_meta_data, email_confirmed_at 
FROM auth.users 
WHERE email = 'your-test-email@example.com';
```

### **In `profiles` table:**
```sql
SELECT id, email, full_name, role, department, job_title, is_active
FROM profiles 
WHERE email = 'your-test-email@example.com';
```

### **In `leave_balances` table:**
```sql
SELECT user_id, leave_type, total_days, remaining_days
FROM leave_balances 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'your-test-email@example.com');
```

## 🔄 **If Problems Persist**

### **Option 1: Manual Profile Creation**
If the trigger still fails, you can create profiles manually:

```sql
-- Replace with actual user ID from auth.users
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'role', 'team')::user_role,
  true
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL AND au.email_confirmed_at IS NOT NULL;
```

### **Option 2: Reset and Recreate**
If completely stuck:

1. Drop and recreate the trigger:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
```

2. Re-run the entire `fix_database_trigger.sql` script

3. Test with a new email address

### **Option 3: Disable Trigger Temporarily**
For testing without the trigger:

```sql
-- Disable trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Use manual profile creation in your app
-- (The CRUD operations will handle this)
```

## 📞 **Getting Help**

If you're still having issues:

1. **Check the browser console** for detailed error messages
2. **Check Supabase logs** in the dashboard
3. **Run the debug functions** to see what's happening
4. **Test with a fresh email** to avoid conflicts

The key is that user data should now be properly stored in the `profiles` table automatically when users sign up! 🎉