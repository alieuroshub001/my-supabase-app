"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import AuthDebugger from "@/components/debug/AuthDebugger";

export default function DebugPage() {
  const [testResult, setTestResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testProfileCreation = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setTestResult("No authenticated user found");
        return;
      }

      // Try to create a profile manually
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Test User',
          role: user.user_metadata?.role || 'team',
          is_active: true,
        })
        .select()
        .single();

      if (profileError) {
        if (profileError.code === '23505') { // Unique constraint violation
          setTestResult("Profile already exists for this user");
        } else {
          setTestResult(`Profile creation failed: ${profileError.message}`);
        }
      } else {
        setTestResult(`Profile created successfully: ${JSON.stringify(profile, null, 2)}`);
      }
    } catch (error: any) {
      setTestResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testAuthFlow = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      // Test session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Test user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Test profile
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

      setTestResult(JSON.stringify({
        session: !!session,
        sessionError: sessionError?.message,
        user: !!user,
        userError: userError?.message,
        profile: !!profile,
        profileError: profileError?.message,
        userDetails: user ? { id: user.id, email: user.email } : null,
        profileDetails: profile ? { id: profile.id, role: profile.role } : null
      }, null, 2));
    } catch (error: any) {
      setTestResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Authentication Debug Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Test Functions</h2>
              
              <div className="space-y-4">
                <button
                  onClick={testAuthFlow}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Testing...' : 'Test Auth Flow'}
                </button>
                
                <button
                  onClick={testProfileCreation}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Testing...' : 'Test Profile Creation'}
                </button>
              </div>
              
              {testResult && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Test Result:</h3>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <AuthDebugger />
          </div>
        </div>
      </div>
    </div>
  );
}