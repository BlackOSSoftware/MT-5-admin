"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLogin from "./Components/LoginCard";
import "./globals.css";

function hasAccessCookie(): boolean {
  return document.cookie
    .split("; ")
    .some((row) => row.startsWith("accessToken="));
}

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.title = "Admin Login";

    const token = localStorage.getItem("token");

    // Middleware only trusts the cookie. Sync orphan localStorage token
    // so we don't loop: / → /admin → / (no cookie) → Loading forever.
    if (token && !hasAccessCookie()) {
      document.cookie = `accessToken=${token}; path=/;`;
    }

    if (hasAccessCookie()) {
      router.replace("/admin");
      // Safety: if navigation never settles, still show login instead of hanging.
      const fallback = window.setTimeout(() => setReady(true), 4000);
      return () => window.clearTimeout(fallback);
    }

    // No valid cookie — clear stale token and show login.
    if (token) localStorage.removeItem("token");
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--text-muted)] bg-[var(--background)]">
        Loading…
      </div>
    );
  }

  return <AdminLogin />;
}
