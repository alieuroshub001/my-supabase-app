"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUserWithProfile, createUserProfile, debugUserState } from "@/utils/profile/profileUtils";

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

type UserStats = {
  totalProjects: number;
  activeTasks: number;
  completedTasks: number;
  totalTimeLogged: number;
  unreadNotifications: number;
};

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsProfileCreation, setNeedsProfileCreation] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [autoCreatingProfile, setAutoCreatingProfile] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Force reload if ?refresh=1 is present to ensure session cookie is picked up
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('refresh') === '1') {
        url.searchParams.delete('refresh');
        window.location.replace(url.pathname + url.search);
      }
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user and check profile status
        const result = await getCurrentUserWithProfile();

        if (result.error && !result.user) {
          console.log('No authenticated user, redirecting to login');
          router.push("/login");
          return;
        }

        if (result.needsProfileCreation && result.user) {
          console.log('Profile missing for user:', result.user.id);
          setAutoCreatingProfile(true);
          
          // Wait a moment for database trigger to complete, then check again
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if profile was created by trigger
          const retryResult = await getCurrentUserWithProfile();
          if (retryResult.profile && !retryResult.needsProfileCreation) {
            console.log('Profile found after retry, created by database trigger');
            setProfile(retryResult.profile);
            setNeedsProfileCreation(false);
            setAutoCreatingProfile(false);
            setError(null);
            
            // Fetch stats after profile creation
            try {
              await fetchUserStats(result.user.id);
            } catch (statsError) {
              console.warn('Stats fetch failed after profile creation:', statsError);
            }
            return;
          }
          
          // Automatically create profile for first-time users
          try {
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
              console.log('Profile created successfully for first-time user:', result.user.id);
              setProfile(profileResult.profile);
              setNeedsProfileCreation(false);
              setAutoCreatingProfile(false);
              setError(null);
              
              // Fetch stats after profile creation
              try {
                await fetchUserStats(result.user.id);
              } catch (statsError) {
                console.warn('Stats fetch failed after profile creation:', statsError);
                // Don't fail profile creation if stats fail
              }
              return;
            } else {
              console.error('Failed to create profile automatically:', profileResult.error);
              setNeedsProfileCreation(true);
              setAutoCreatingProfile(false);
              setError("We're setting up your profile. Please wait a moment and try again.");
              return;
            }
          } catch (err) {
            console.error('Error creating profile automatically:', err);
            setNeedsProfileCreation(true);
            setAutoCreatingProfile(false);
            setError("We're setting up your profile. Please wait a moment and try again.");
            return;
          }
        }

        if (!result.profile) {
          setError("Unable to load your profile. Please try refreshing the page or contact support.");
          return;
        }

        setProfile(result.profile);

        // Fetch user statistics
        await fetchUserStats(result.user!.id);

        // Update last login session
        await supabase
          .from('user_sessions')
          .update({ is_active: true })
          .eq('user_id', result.user!.id)
          .eq('is_active', true);

      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const fetchUserStats = async (userId: string) => {
      try {
        // Initialize default stats
        const defaultStats = {
          totalProjects: 0,
          activeTasks: 0,
          completedTasks: 0,
          totalTimeLogged: 0,
          unreadNotifications: 0,
        };

        // Get project count with error handling
        let totalProjects = 0;
        try {
          const { data: projectsData, error: projectsError } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("user_id", userId);

          const { data: ownedProjectsData, error: ownedError } = await supabase
            .from("projects")
            .select("id")
            .eq("owner_id", userId);

          if (!projectsError && !ownedError) {
            totalProjects = (projectsData?.length || 0) + (ownedProjectsData?.length || 0);
          }
        } catch (err) {
          console.warn("Error fetching project stats:", err);
        }

        // Get task statistics with error handling
        let activeTasks = 0, completedTasks = 0;
        try {
          const { data: activeTasksData, error: activeError } = await supabase
            .from("tasks")
            .select("id")
            .eq("assignee_id", userId)
            .in("status", ["todo", "in_progress"]);

          const { data: completedTasksData, error: completedError } = await supabase
            .from("tasks")
            .select("id")
            .eq("assignee_id", userId)
            .eq("status", "done");

          if (!activeError) activeTasks = activeTasksData?.length || 0;
          if (!completedError) completedTasks = completedTasksData?.length || 0;
        } catch (err) {
          console.warn("Error fetching task stats:", err);
        }

        // Get total time logged with error handling
        let totalTimeLogged = 0;
        try {
          const { data: timeEntriesData, error: timeError } = await supabase
            .from("time_entries")
            .select("duration")
            .eq("user_id", userId);

          if (!timeError && timeEntriesData) {
            totalTimeLogged = timeEntriesData.reduce((total, entry) => {
              return total + (entry.duration || 0);
            }, 0) || 0;
            totalTimeLogged = Math.round((totalTimeLogged / 3600) * 100) / 100;
          }
        } catch (err) {
          console.warn("Error fetching time stats:", err);
        }

        // Get unread notifications with error handling
        let unreadNotifications = 0;
        try {
          const { data: notificationsData, error: notificationError } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("is_read", false);

          if (!notificationError) {
            unreadNotifications = notificationsData?.length || 0;
          }
        } catch (err) {
          console.warn("Error fetching notification stats:", err);
        }

        setStats({
          totalProjects,
          activeTasks,
          completedTasks,
          totalTimeLogged,
          unreadNotifications,
        });
      } catch (err) {
        console.error("Stats fetch error:", err);
        // Set default stats if everything fails
        setStats({
          totalProjects: 0,
          activeTasks: 0,
          completedTasks: 0,
          totalTimeLogged: 0,
          unreadNotifications: 0,
        });
      }
    };

    fetchUserData();
  }, [router, supabase]);

  const handleCreateProfile = async () => {
    try {
      setCreatingProfile(true);
      setAutoCreatingProfile(false);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("No authenticated user found");
        return;
      }

      // Create profile with basic information
      const result = await createUserProfile({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
        role: (user.user_metadata?.role as 'admin' | 'hr' | 'team' | 'client') || 'team',
        department: user.user_metadata?.department,
        job_title: user.user_metadata?.job_title,
        phone: user.user_metadata?.phone,
      });

      if (result.success && result.profile) {
        setProfile(result.profile);
        setNeedsProfileCreation(false);
        setError(null);
        
        // Fetch stats after profile creation
        try {
          await fetchUserStats(user.id);
        } catch (statsError) {
          console.warn('Stats fetch failed after profile creation:', statsError);
          // Don't fail profile creation if stats fail
        }
      } else {
        setError("Failed to create profile. Please try again or contact support.");
        console.error('Profile creation failed:', result.error);
      }

    } catch (err) {
      console.error("Profile creation error:", err);
      setError("An error occurred while creating your profile. Please try again.");
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_sessions')
          .update({ 
            logout_time: new Date().toISOString(),
            is_active: false 
          })
          .eq('user_id', user.id)
          .eq('is_active', true);
      }

      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
      router.push("/login");
    }
  };

  const handleDebug = async () => {
    await debugUserState();
  };

  // Helper functions remain the same
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'hr':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'client':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'team':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading || autoCreatingProfile) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {autoCreatingProfile ? "Setting up your profile..." : "Loading your dashboard..."}
          </p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome! Setting Up Your Profile</h2>
          <p className="text-gray-600 mb-6">
            We're setting up your profile with your account information. 
            This should only take a moment.
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
              {creatingProfile ? "Setting Up Profile..." : "Complete Setup"}
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
              Debug Info
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rest of the dashboard UI remains the same as your original code
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {profile.full_name}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your account today.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {stats && stats.unreadNotifications > 0 && (
              <div className="relative">
                <button className="p-2 text-gray-600 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM12 1c6.075 0 11 4.925 11 11v1m-11-12C5.925 1 1 5.925 1 12v1" />
                  </svg>
                </button>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.unreadNotifications}
                </span>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Projects</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalProjects}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.completedTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Hours Logged</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalTimeLogged}h</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-3 3 3 3v-6zm0 0v-6a2 2 0 00-2-2H9.236a2 2 0 00-1.789 1.106L3 24h9.764a2 2 0 001.789-1.106l1.895-3.789A2 2 0 0015 17z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Notifications</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.unreadNotifications}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                <p className="text-sm text-gray-600">Your account details and settings</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                    <p className="text-gray-900 font-medium">{profile.full_name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
                    <p className="text-gray-900">{profile.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(profile.role)}`}>
                      {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(profile.is_active)}`}>
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {profile.department && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Department</label>
                      <p className="text-gray-900">{profile.department}</p>
                    </div>
                  )}

                  {profile.job_title && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Job Title</label>
                      <p className="text-gray-900">{profile.job_title}</p>
                    </div>
                  )}

                  {profile.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
                      <p className="text-gray-900">{profile.phone}</p>
                    </div>
                  )}

                  {profile.hire_date && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Hire Date</label>
                      <p className="text-gray-900">{new Date(profile.hire_date).toLocaleDateString()}</p>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Member Since</label>
                    <p className="text-gray-900">{new Date(profile.created_at).toLocaleDateString()}</p>
                  </div>

                  {profile.skills && profile.skills.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-2">Skills</label>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.bio && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Bio</label>
                      <p className="text-gray-900">{profile.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full text-left px-4 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-blue-700 font-medium">Create New Project</span>
                  </div>
                </button>
                
                <button className="w-full text-left px-4 py-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-green-700 font-medium">Add New Task</span>
                  </div>
                </button>
                
                <button className="w-full text-left px-4 py-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-purple-700 font-medium">Start Time Tracking</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">User ID</span>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {profile.id.slice(0, 8)}...
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Timezone</span>
                  <span className="text-sm text-gray-900">
                    {profile.timezone || 'UTC'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-900">
                    {new Date(profile.updated_at).toLocaleDateString()}
                  </span>
                </div>

                <button className="w-full mt-4 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function fetchUserStats(id: string) {
  throw new Error("Function not implemented.");
}

