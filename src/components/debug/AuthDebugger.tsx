"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

export default function AuthDebugger() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      // Check auth state
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Check profile if user exists
      let profile = null;
      let profileError = null;
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        profile = data;
        profileError = error;
      }

      // Check all profiles
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .limit(5);

      setDebugInfo({
        user: user ? { id: user.id, email: user.email, metadata: user.user_metadata } : null,
        userError,
        session: session ? { access_token: !!session.access_token, expires_at: session.expires_at } : null,
        sessionError,
        profile: profile ? { id: profile.id, email: profile.email, role: profile.role } : null,
        profileError,
        allProfiles,
        allProfilesError,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setDebugInfo({ error: error.message, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDebug();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Authentication Debug Info</h3>
      
      <button
        onClick={runDebug}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Refreshing...' : 'Refresh Debug Info'}
      </button>

      {debugInfo && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold mb-2">User</h4>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(debugInfo.user, null, 2)}
            </pre>
            {debugInfo.userError && (
              <div className="mt-2 text-red-600">
                Error: {debugInfo.userError.message}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold mb-2">Session</h4>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(debugInfo.session, null, 2)}
            </pre>
            {debugInfo.sessionError && (
              <div className="mt-2 text-red-600">
                Error: {debugInfo.sessionError.message}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold mb-2">Profile</h4>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(debugInfo.profile, null, 2)}
            </pre>
            {debugInfo.profileError && (
              <div className="mt-2 text-red-600">
                Error: {debugInfo.profileError.message}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold mb-2">All Profiles (First 5)</h4>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(debugInfo.allProfiles, null, 2)}
            </pre>
            {debugInfo.allProfilesError && (
              <div className="mt-2 text-red-600">
                Error: {debugInfo.allProfilesError.message}
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Last updated: {debugInfo.timestamp}
          </div>
        </div>
      )}
    </div>
  );
}