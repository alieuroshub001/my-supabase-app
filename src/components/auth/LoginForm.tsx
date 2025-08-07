"use client";

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      try {
        // Get user profile to determine role-based redirection
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name, is_active')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          // Still redirect to dashboard if profile fetch fails
          router.push("/dashboard");
          return;
        }

        // Check if user account is active
        if (profile && !profile.is_active) {
          setError("Your account has been deactivated. Please contact your administrator.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Role-based redirection
        switch (profile?.role) {
          case 'admin':
            router.push("/admin/dashboard");
            break;
          case 'hr':
            router.push("/hr/dashboard");
            break;
          case 'client':
            router.push("/client/dashboard");
            break;
          case 'team':
          default:
            router.push("/dashboard");
            break;
        }

        // Log successful login
        await supabase.from('user_sessions').insert({
          user_id: data.user.id,
          login_time: new Date().toISOString(),
          ip_address: null, // You can get this from a service if needed
          user_agent: navigator.userAgent,
        });

      } catch (err) {
        console.error('Login process error:', err);
        router.push("/dashboard");
      }
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      alert("Password reset link sent to your email!");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
        <p className="text-gray-600 mt-2">Sign in to your account</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200 flex items-start">
          <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-1 font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
            placeholder="Enter your email"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block mb-1 font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 text-sm text-gray-700">
              Remember me
            </label>
          </div>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">New to our platform?</span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link 
            href="/signup" 
            className="inline-flex items-center justify-center w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Create an Account
          </Link>
        </div>
      </div>

      {/* Role Information */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Account Types:</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>Admin:</strong> Full system access</div>
          <div><strong>HR:</strong> Employee management</div>
          <div><strong>Team:</strong> Project collaboration</div>
          <div><strong>Client:</strong> Project viewing</div>
        </div>
      </div>
    </div>
  );
}