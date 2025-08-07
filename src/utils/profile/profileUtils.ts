// utils/profileUtils.ts - Add this file to help with profile management

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'hr' | 'team' | 'client';
  department?: string;
  job_title?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Function to check if a user has a profile
export const checkUserProfile = async (userId: string) => {
  const supabase = createClient();
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return {
      hasProfile: !error && !!profile,
      profile,
      error
    };
  } catch (err) {
    console.error('Error checking user profile:', err);
    return {
      hasProfile: false,
      profile: null,
      error: err
    };
  }
};

// Function to create a profile manually
export const createUserProfile = async (userData: {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'hr' | 'team' | 'client';
  department?: string;
  job_title?: string;
  phone?: string;
}) => {
  const supabase = createClient();

  try {
    // First check if profile already exists (in case of race conditions)
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.id)
      .single();

    if (existingProfile && !checkError) {
      console.log('Profile already exists for user:', userData.id);
      return {
        success: true,
        profile: existingProfile,
        error: null
      };
    }

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        department: userData.department || null,
        job_title: userData.job_title || null,
        phone: userData.phone || null,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    // Create initial leave balances
    const currentYear = new Date().getFullYear();
    const { error: leaveError } = await supabase
      .from('leave_balances')
      .insert([
        { user_id: userData.id, leave_type: 'casual', total_days: 12, used_days: 0, remaining_days: 12, year: currentYear },
        { user_id: userData.id, leave_type: 'sick', total_days: 10, used_days: 0, remaining_days: 10, year: currentYear },
        { user_id: userData.id, leave_type: 'annual', total_days: 21, used_days: 0, remaining_days: 21, year: currentYear }
      ]);

    if (leaveError) {
      console.error('Failed to create leave balances:', leaveError);
      // Don't fail the entire process for leave balance errors
    }

    return {
      success: true,
      profile,
      error: null
    };

  } catch (err) {
    console.error('Error creating user profile:', err);
    return {
      success: false,
      profile: null,
      error: err
    };
  }
};

// Function to get current user and ensure profile exists
export const getCurrentUserWithProfile = async () => {
  const supabase = createClient();

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        user: null,
        profile: null,
        error: userError || new Error('No authenticated user')
      };
    }

    // Check if profile exists
    const profileResult = await checkUserProfile(user.id);

    if (!profileResult.hasProfile) {
      console.warn('User exists but profile is missing. User ID:', user.id);
      return {
        user,
        profile: null,
        error: new Error('Profile not found'),
        needsProfileCreation: true
      };
    }

    return {
      user,
      profile: profileResult.profile,
      error: null,
      needsProfileCreation: false
    };

  } catch (err) {
    console.error('Error getting current user with profile:', err);
    return {
      user: null,
      profile: null,
      error: err,
      needsProfileCreation: false
    };
  }
};

// Function to debug auth and profile state
export const debugUserState = async () => {
  const supabase = createClient();

  try {
    console.log('=== DEBUGGING USER STATE ===');
    
    // Check auth state
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Auth user:', user);
    console.log('Auth error:', userError);

    if (!user) {
      console.log('No authenticated user found');
      return;
    }

    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session:', session);
    console.log('Session error:', sessionError);

    // Check profile
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id);
    
    console.log('Profile query result:', profiles);
    console.log('Profile error:', profileError);

    // Check all auth users (admin only)
    const { data: allUsers, error: allUsersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at');
    
    console.log('All profiles:', allUsers);
    console.log('All profiles error:', allUsersError);

    console.log('=== END DEBUG ===');

    return {
      user,
      session,
      profiles,
      allUsers,
      errors: {
        userError,
        sessionError,
        profileError,
        allUsersError
      }
    };

  } catch (err) {
    console.error('Error in debugUserState:', err);
    return { error: err };
  }
};

// Hook for checking profile status
export const useProfileStatus = () => {
  const [profileStatus, setProfileStatus] = useState({
    loading: true,
    hasProfile: false,
    profile: null as UserProfile | null,
    error: null as any,
    needsProfileCreation: false
  });

  const checkProfile = async () => {
    setProfileStatus((prev: any) => ({ ...prev, loading: true }));
    
    const result = await getCurrentUserWithProfile();
    
    setProfileStatus({
      loading: false,
      hasProfile: !!result.profile,
      profile: result.profile,
      error: result.error,
      needsProfileCreation: result.needsProfileCreation || false
    });

    return result;
  };

  useEffect(() => {
    checkProfile();
  }, []);

  return {
    ...profileStatus,
    refetch: checkProfile
  };
};