"use client";

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/dashboard" className="text-lg font-semibold">
          My App
        </Link>
        <button
          onClick={handleSignOut}
          className="text-red-600 hover:text-red-800"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}