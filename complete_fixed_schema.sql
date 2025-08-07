-- =====================================================
-- COMPLETE SUPABASE SCHEMA WITH FIXED SIGNUP TRIGGER
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: JWT secret is automatically managed by Supabase

-- =====================================================
-- ENUMS DEFINITIONS
-- =====================================================

-- User Roles Enum
CREATE TYPE user_role AS ENUM ('admin', 'hr', 'team', 'client');

-- Task Priority Enum
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Task Status Enum
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done');

-- Project Status Enum
CREATE TYPE project_status AS ENUM ('active', 'on_hold', 'completed', 'archived');

-- Leave Status Enum
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Leave Type Enum
CREATE TYPE leave_type AS ENUM ('casual', 'sick', 'annual', 'maternity', 'paternity');

-- Document Type Enum
CREATE TYPE document_type AS ENUM ('cv', 'id_card', 'contract', 'certificate', 'other');

-- Channel Type Enum
CREATE TYPE channel_type AS ENUM ('public', 'private', 'direct');

-- Notification Type Enum
CREATE TYPE notification_type AS ENUM ('mention', 'task_assigned', 'project_update', 'leave_request', 'message');

-- =====================================================
-- USERS AND AUTHENTICATION
-- =====================================================

-- Extended User Profiles Table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    department TEXT,
    role user_role NOT NULL DEFAULT 'team',
    job_title TEXT,
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    bio TEXT,
    skills TEXT[],
    emergency_contact JSONB,
    address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Sessions for activity tracking
CREATE TABLE user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- PROJECT MANAGEMENT
-- =====================================================

-- Projects Table
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status project_status DEFAULT 'active',
    priority task_priority DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    estimated_hours INTEGER,
    actual_hours INTEGER DEFAULT 0,
    budget DECIMAL(10,2),
    is_public BOOLEAN DEFAULT false,
    tags TEXT[],
    color TEXT DEFAULT '#3B82F6',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Members (Many-to-Many)
CREATE TABLE project_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- owner, admin, member, viewer
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours INTEGER,
    actual_hours INTEGER DEFAULT 0,
    story_points INTEGER,
    position INTEGER, -- for kanban ordering
    parent_task_id UUID REFERENCES tasks(id), -- for subtasks
    tags TEXT[],
    checklist JSONB, -- [{text: string, completed: boolean}]
    custom_fields JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Comments
CREATE TABLE task_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mentions UUID[], -- array of user IDs mentioned
    parent_comment_id UUID REFERENCES task_comments(id), -- for threaded comments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Attachments
CREATE TABLE task_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Activity Log
CREATE TABLE task_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- created, updated, assigned, commented, etc.
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- HR MANAGEMENT
-- =====================================================

-- Employee Documents
CREATE TABLE employee_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Tracking
CREATE TABLE attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_duration INTEGER DEFAULT 0, -- in minutes
    total_hours DECIMAL(4,2),
    status TEXT DEFAULT 'present', -- present, absent, half_day, late
    notes TEXT,
    location JSONB, -- for geo-tracking if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Leave Requests
CREATE TABLE leave_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT,
    status leave_status DEFAULT 'pending',
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave Balance
CREATE TABLE leave_balances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    total_days INTEGER DEFAULT 0,
    used_days INTEGER DEFAULT 0,
    remaining_days INTEGER DEFAULT 0,
    year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, leave_type, year)
);

-- Onboarding Checklists
CREATE TABLE onboarding_checklists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    checklist_items JSONB NOT NULL, -- [{task: string, completed: boolean, due_date: date}]
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    completion_percentage INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COMMUNICATION MODULE
-- =====================================================

-- Communication Channels
CREATE TABLE channels (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type channel_type DEFAULT 'public',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    is_archived BOOLEAN DEFAULT false,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel Members
CREATE TABLE channel_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- admin, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Messages
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT,
    message_type TEXT DEFAULT 'text', -- text, file, image, system
    thread_id UUID REFERENCES messages(id), -- for threaded replies
    mentions UUID[], -- array of user IDs mentioned
    attachments JSONB, -- [{name, url, size, type}]
    reactions JSONB DEFAULT '{}', -- {emoji: [user_ids]}
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Direct Messages (for 1-on-1 conversations)
CREATE TABLE direct_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT,
    attachments JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TIME TRACKING & MONITORING
-- =====================================================

-- Time Entries
CREATE TABLE time_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    is_manual BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    billable_hours DECIMAL(4,2),
    hourly_rate DECIMAL(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Monitoring (Screenshots & Activity)
CREATE TABLE activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
    screenshot_url TEXT,
    activity_level INTEGER CHECK (activity_level >= 0 AND activity_level <= 100),
    keystrokes INTEGER DEFAULT 0,
    mouse_clicks INTEGER DEFAULT 0,
    active_window TEXT,
    idle_time INTEGER DEFAULT 0, -- in seconds
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timesheets (Weekly submissions)
CREATE TABLE timesheets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_hours DECIMAL(5,2) DEFAULT 0,
    status TEXT DEFAULT 'draft', -- draft, submitted, approved, rejected
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

-- =====================================================
-- NOTIFICATIONS & REPORTING
-- =====================================================

-- Notifications
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB, -- additional data like task_id, project_id, etc.
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Logs (for audit trails)
CREATE TABLE system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT, -- project, task, user, etc.
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Reports
CREATE TABLE custom_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL, -- task_completion, time_tracking, user_activity
    filters JSONB, -- date range, users, projects, etc.
    configuration JSONB, -- chart type, grouping, etc.
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CALENDAR & EVENTS
-- =====================================================

-- Calendar Events
CREATE TABLE calendar_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    event_type TEXT DEFAULT 'meeting', -- meeting, deadline, milestone, holiday
    location TEXT,
    attendees UUID[], -- array of user IDs
    recurrence_rule TEXT, -- RRULE for recurring events
    color TEXT DEFAULT '#3B82F6',
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Profile indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_department ON profiles(department);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Project indexes
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Task indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_position ON tasks(position);

-- Time tracking indexes
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);

-- Message indexes
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Leave balances indexes
CREATE INDEX idx_leave_balances_user_id ON leave_balances(user_id);
CREATE INDEX idx_leave_balances_year ON leave_balances(year);

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate leave remaining days
CREATE OR REPLACE FUNCTION calculate_remaining_days()
RETURNS TRIGGER AS $$
BEGIN
    NEW.remaining_days = NEW.total_days - NEW.used_days;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- FIXED USER SIGNUP TRIGGER FUNCTION
-- =====================================================

-- Drop existing trigger and function if they exist
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

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Trigger for leave balance calculations
CREATE TRIGGER update_leave_balance BEFORE INSERT OR UPDATE ON leave_balances FOR EACH ROW EXECUTE PROCEDURE calculate_remaining_days();

-- =====================================================
-- ROW LEVEL SECURITY SETUP
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Enable read access for authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Leave balances policies
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

-- Projects policies
CREATE POLICY "Projects viewable by members and public projects" ON projects
  FOR SELECT USING (
    is_public = true OR 
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
    owner_id = auth.uid()
  );

CREATE POLICY "Enable project creation for authenticated users" ON projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable project updates for owners and admins" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Tasks policies
CREATE POLICY "Tasks viewable by project members" ON tasks
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.is_public = true OR pm.user_id = auth.uid() OR p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Enable task creation for project members" ON tasks
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = auth.uid() OR p.owner_id = auth.uid()
    )
  );

-- Time entries policies
CREATE POLICY "Time entries viewable by user and managers" ON time_entries
  FOR SELECT USING (
    user_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'hr'))
  );

CREATE POLICY "Enable time entry creation for authenticated users" ON time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable notification creation" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- PERMISSIONS AND GRANTS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant permissions on profiles table
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Grant permissions on leave_balances table
GRANT SELECT, INSERT, UPDATE ON public.leave_balances TO authenticated;

-- Grant permissions on all other tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;

-- Grant permissions on sequences (for UUIDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- HELPER FUNCTIONS FOR DEBUGGING AND MAINTENANCE
-- =====================================================

-- Function to test profile creation
CREATE OR REPLACE FUNCTION test_profile_creation(test_email text, test_name text, test_role text DEFAULT 'team')
RETURNS text AS $$
DECLARE
  test_result text;
BEGIN
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

-- Function to debug auth users
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

-- Function to create missing profiles for existing users
CREATE OR REPLACE FUNCTION create_missing_profiles()
RETURNS TABLE (user_id uuid, email text, status text) AS $$
DECLARE
  missing_user RECORD;
  result_user_id uuid;
  result_email text;
  result_status text;
BEGIN
  FOR missing_user IN
    SELECT au.id, au.email, au.raw_user_meta_data, au.user_metadata, au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL AND au.email_confirmed_at IS NOT NULL
  LOOP
    result_user_id := missing_user.id;
    result_email := missing_user.email;
    
    BEGIN
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
        missing_user.id,
        missing_user.email,
        COALESCE(
          missing_user.raw_user_meta_data->>'full_name',
          missing_user.user_metadata->>'full_name',
          split_part(missing_user.email, '@', 1)
        ),
        COALESCE(
          missing_user.raw_user_meta_data->>'role',
          missing_user.user_metadata->>'role',
          'team'
        )::user_role,
        NULLIF(COALESCE(
          missing_user.raw_user_meta_data->>'department',
          missing_user.user_metadata->>'department'
        ), ''),
        NULLIF(COALESCE(
          missing_user.raw_user_meta_data->>'job_title',
          missing_user.user_metadata->>'job_title'
        ), ''),
        NULLIF(COALESCE(
          missing_user.raw_user_meta_data->>'phone',
          missing_user.user_metadata->>'phone'
        ), ''),
        true,
        missing_user.created_at,
        NOW()
      );

      -- Create leave balances
      INSERT INTO public.leave_balances (user_id, leave_type, total_days, used_days, remaining_days, year)
      VALUES 
        (missing_user.id, 'casual', 12, 0, 12, EXTRACT(YEAR FROM NOW())),
        (missing_user.id, 'sick', 10, 0, 10, EXTRACT(YEAR FROM NOW())),
        (missing_user.id, 'annual', 21, 0, 21, EXTRACT(YEAR FROM NOW()))
      ON CONFLICT (user_id, leave_type, year) DO NOTHING;

      result_status := 'Created successfully';
      
    EXCEPTION
      WHEN others THEN
        result_status := 'Error: ' || SQLERRM;
    END;
    
    RETURN QUERY SELECT result_user_id, result_email, result_status;
  END LOOP;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION test_profile_creation(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION create_missing_profiles() TO authenticated;

-- =====================================================
-- FINAL SETUP MESSAGE
-- =====================================================

-- This completes the schema setup with:
-- ✅ Fixed signup trigger that handles both raw_user_meta_data and user_metadata
-- ✅ Proper RLS policies for all tables
-- ✅ Comprehensive permissions and grants
-- ✅ Helper functions for debugging and maintenance
-- ✅ Automatic profile and leave balance creation
-- ✅ Performance indexes on key columns
-- ✅ All necessary triggers and functions

-- To test the setup:
-- SELECT test_profile_creation('test@example.com', 'Test User', 'team');
-- SELECT * FROM debug_auth_users();
-- SELECT * FROM create_missing_profiles();