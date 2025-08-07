"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUserWithProfile, createUserProfile, debugUserState } from "@/utils/profile/profileUtils";
import { getDashboardRoute } from "@/utils/auth/routeProtection.shared";

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  department?: string;
  role: 'admin' | 'hr' | 'team' | 'client';
  job_title?: string;
  hire_date?: string;
  is_active: boolean;
  timezone?: string;
  bio?: string;
  skills?: string[];
  emergency_contact?: any;
  address?: any;
  created_at: string;
  updated_at: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needsProfileCreation, setNeedsProfileCreation] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  // Handle redirect to role-specific dashboard
  useEffect(() => {
    if (profile && !isRedirecting) {
      const dashboardRoute = getDashboardRoute(profile.role);
      
      console.log('Dashboard redirect check:', {
        currentPath: window.location.pathname,
        targetRoute: dashboardRoute,
        profileRole: profile.role
      });
      
      // Check if we're already on the correct route
      if (window.location.pathname !== dashboardRoute) {
        setIsRedirecting(true);
        
        console.log('Redirecting to:', dashboardRoute);
        
        // Small delay to ensure state is updated before redirect
        setTimeout(() => {
          router.replace(dashboardRoute);
        }, 500);
      } else {
        console.log('Already on correct route');
      }
    }
  }, [profile, router, isRedirecting]);

  // Handle redirect to login if no user (only after loading is complete)
  useEffect(() => {
    if (!loading && !profile && !needsProfileCreation && !error && !isRedirecting) {
      // Only redirect if we're not already redirecting and have completed loading
      router.replace('/login');
    }
  }, [loading, profile, needsProfileCreation, error, router, isRedirecting]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Add a small delay to ensure session is established
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = await getCurrentUserWithProfile();
      console.log('Dashboard fetchUserData result:', result);
      
      // Debug: Check if user exists in auth.users
      if (result.user) {
        console.log('User found:', {
          id: result.user.id,
          email: result.user.email,
          metadata: result.user.user_metadata
        });
      } else {
        console.log('No user found in result');
      }

      if (result.error && !result.needsProfileCreation) {
        console.error('Error fetching user data:', result.error);
        setError(typeof result.error === 'string' ? result.error : "An error occurred");
        return;
      }

      if (!result.user) {
        console.log('No user found, redirecting to login');
        router.replace('/login');
        return;
      }

      if (result.needsProfileCreation && result.user) {
        console.log('Profile creation needed for user:', result.user.id);
        setNeedsProfileCreation(true);
        setError("Your profile is missing. This might be due to an incomplete signup process.");
        return;
      }

      if (!result.profile) {
        console.error('No profile found and could not create one');
        setError("Unable to load your profile. Please try again.");
        return;
      }

      console.log('Profile loaded successfully:', result.profile);
      setProfile(result.profile);
      setNeedsProfileCreation(false);

    } catch (err) {
      console.error('Unexpected error in fetchUserData:', err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    try {
      setCreatingProfile(true);
      setError(null);

      const result = await getCurrentUserWithProfile();
      
      if (!result.user) {
        setError("No user found. Please log in again.");
        return;
      }

      const profileResult = await createUserProfile({
        id: result.user.id,
        email: result.user.email!,
        full_name: result.user.user_metadata?.full_name || result.user.email!.split('@')[0],
        role: (result.user.user_metadata?.role as 'admin' | 'hr' | 'team' | 'client') || 'team',
        department: result.user.user_metadata?.department,
        job_title: result.user.user_metadata?.job_title,
        phone: result.user.user_metadata?.phone,
      });

      if (profileResult.success && profileResult.profile) {
        console.log('Profile created successfully:', profileResult.profile);
        setProfile(profileResult.profile);
        setNeedsProfileCreation(false);
        setError(null);
      } else {
        setError(typeof profileResult.error === 'string' ? profileResult.error : "Failed to create profile. Please try again.");
      }
    } catch (err) {
      console.error('Error creating profile:', err);
      setError("An error occurred while creating your profile. Please try again.");
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDebug = async () => {
    console.log('=== Dashboard Debug ===');
    console.log('Current state:', {
      loading,
      error,
      profile: !!profile,
      needsProfileCreation,
      creatingProfile,
      isRedirecting
    });
    await debugUserState();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (needsProfileCreation) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-yellow-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Setup Required</h2>
          <p className="text-gray-600 mb-6">
            Your account exists but your profile wasn't created properly during signup. 
            We'll create it now with your basic information.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleCreateProfile}
              disabled={creatingProfile}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creatingProfile ? "Creating Profile..." : "Create My Profile"}
            </button>
            
            <button
              onClick={handleDebug}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
            >
              Debug Info (Console)
            </button>
            
            <button
              onClick={handleSignOut}
              className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={handleDebug}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
            >
              Debug Info (Console)
            </button>
            <button
              onClick={handleSignOut}
              className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while redirecting
  return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your {profile?.role} dashboard...</p>
      </div>
    </div>
  );
}

