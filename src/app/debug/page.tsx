"use client";

import { useState } from "react";
import { debugUserState, createUserProfile } from "@/utils/profile/profileUtils";
import { createClient } from "@/utils/supabase/client";

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    try {
      const result = await debugUserState();
      setDebugInfo(result);
      console.log('Debug result:', result);
    } catch (error) {
      console.error('Debug error:', error);
      setDebugInfo({ error: error });
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      setDebugInfo({ user, error });
      console.log('Auth check:', { user, error });
    } catch (error) {
      console.error('Auth check error:', error);
      setDebugInfo({ error: error });
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!user) {
        setDebugInfo({ error: "No authenticated user" });
        return;
      }

      const result = await createUserProfile({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
        role: (user.user_metadata?.role as 'admin' | 'hr' | 'team' | 'client') || 'team',
        department: user.user_metadata?.department,
        job_title: user.user_metadata?.job_title,
        phone: user.user_metadata?.phone,
      });

      setDebugInfo({ result, user });
      console.log('Profile creation result:', result);
    } catch (error) {
      console.error('Profile creation error:', error);
      setDebugInfo({ error: error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug Page</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={runDebug}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Full Debug"}
          </button>
          
          <button
            onClick={checkAuth}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 ml-4"
          >
            {loading ? "Checking..." : "Check Auth Only"}
          </button>
          
          <button
            onClick={createProfile}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 ml-4"
          >
            {loading ? "Creating..." : "Create Profile"}
          </button>
        </div>

        {debugInfo && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}