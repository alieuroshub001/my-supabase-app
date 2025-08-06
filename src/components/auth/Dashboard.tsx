"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  id: string;
  email?: string;
  created_at?: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch additional user data from profiles table if needed
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setUser({
        id: user.id,
        email: user.email,
        created_at: profile?.created_at,
      });
      setLoading(false);
    };

    fetchUser();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">User Information</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">ID:</span> {user?.id}
          </p>
          <p>
            <span className="font-medium">Email:</span> {user?.email}
          </p>
          <p>
            <span className="font-medium">Account Created:</span>{" "}
            {user?.created_at
              ? new Date(user.created_at).toLocaleString()
              : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}