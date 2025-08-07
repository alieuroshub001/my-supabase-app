"use client";

import { createClient } from "@/utils/supabase/client";
import { userCrud } from "@/utils/database/userCrud";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type UserRole = 'admin' | 'hr' | 'team' | 'client';

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("team");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate required fields
    if (!fullName.trim()) {
      setError("Full name is required");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Sign up the user with proper user_metadata
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
            role: role,
            department: department.trim() || null,
            job_title: jobTitle.trim() || null,
            phone: phone.trim() || null,
          },
        },
      });

      if (signupError) {
        console.error('Signup error:', signupError);
        setError(signupError.message);
        setLoading(false);
        return;
      }

      // Check if user already exists
      if (data.user && !data.user.identities?.length) {
        setError("An account with this email address already exists");
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log('User created successfully:', data.user.id);
        console.log('User metadata:', data.user.user_metadata);

        // Step 2: For confirmed users (in development), create profile manually as fallback
        if (data.user.email_confirmed_at) {
          console.log('Email already confirmed, creating profile manually...');
          await createProfileManually(data.user);
        } else {
          console.log('Email confirmation required, profile will be created after confirmation via database trigger');
        }

        setSuccess(true);
      }

    } catch (err) {
      console.error('Signup process error:', err);
      setError('An unexpected error occurred during signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createProfileManually = async (user: any) => {
    try {
      // Wait a moment for any database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Checking if profile exists for user:', user.id);
      
      // Check if profile already exists using CRUD operations
      const { data: existingProfile, error: checkError } = await userCrud.getUserProfile(user.id);

      if (existingProfile) {
        console.log('Profile already exists for user:', user.id);
        return;
      }

      if (checkError && checkError.code === 'PGRST116') {
        console.log('Profile not found, creating manually using CRUD operations...');
        
        // Create profile manually using CRUD operations
        const { data: profileData, error: profileError } = await userCrud.createProfile({
          id: user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role: role,
          department: department.trim() || null,
          job_title: jobTitle.trim() || null,
          phone: phone.trim() || null,
          is_active: true,
        });

        if (profileError) {
          console.error('Manual profile creation failed:', profileError);
          // Try to create a basic profile as fallback using direct supabase call
          const { error: basicProfileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: email.trim().toLowerCase(),
              full_name: fullName.trim(),
              role: 'team',
              is_active: true,
            });
          
          if (basicProfileError) {
            console.error('Basic profile creation also failed:', basicProfileError);
          } else {
            console.log('Basic profile created as fallback');
          }
        } else {
          console.log('Profile created successfully using CRUD operations:', profileData);
        }
      } else if (checkError) {
        console.error('Error checking for existing profile:', checkError);
      }
    } catch (err) {
      console.error('Error in createProfileManually:', err);
      // Don't fail the signup process
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
        <div className="mb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Account Created Successfully!</h2>
        <p className="mb-4 text-gray-600">
          We&apos;ve sent a confirmation link to <strong>{email}</strong>.
          Please check your email and click the link to activate your account.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-blue-800">
            <strong>Next Steps:</strong>
          </p>
          <ol className="text-sm text-blue-700 mt-2 text-left list-decimal list-inside space-y-1">
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the confirmation link</li>
            <li>Return to login with your credentials</li>
          </ol>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Login
          </button>
          <button
            onClick={() => {
              setSuccess(false);
              setEmail("");
              setPassword("");
              setFullName("");
              setDepartment("");
              setJobTitle("");
              setPhone("");
            }}
            className="w-full bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Create Another Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-600 mt-2">Join our platform today</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-200 flex items-start">
          <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block mb-1 font-medium text-gray-700">
            Full Name *
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
            placeholder="Enter your full name"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="email" className="block mb-1 font-medium text-gray-700">
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
            placeholder="Enter your email address"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block mb-1 font-medium text-gray-700">
            Password *
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
            minLength={6}
            placeholder="Enter your password (min. 6 characters)"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="role" className="block mb-1 font-medium text-gray-700">
            Role *
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
            disabled={loading}
          >
            <option value="team">Team Member</option>
            <option value="client">Client</option>
            <option value="hr">HR Manager</option>
            <option value="admin">Administrator</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select your role in the organization
          </p>
        </div>

        <div>
          <label htmlFor="department" className="block mb-1 font-medium text-gray-700">
            Department
          </label>
          <input
            id="department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="e.g., Engineering, Marketing, Sales"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="jobTitle" className="block mb-1 font-medium text-gray-700">
            Job Title
          </label>
          <input
            id="jobTitle"
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="e.g., Software Developer, Project Manager"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block mb-1 font-medium text-gray-700">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter your phone number"
            disabled={loading}
          />
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
              Creating Account...
            </span>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Already have an account?</span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Sign In Instead
          </Link>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        * Required fields
      </p>
    </div>
  );
}