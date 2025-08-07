import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Supabase Auth Demo",
  description: "Authentication with Supabase and Next.js",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await (await supabase).auth.getUser();

  if (error) {
    console.error('Supabase getUser error:', error);
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        {user && <Navbar />}
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}