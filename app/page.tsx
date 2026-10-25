"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLogin from "./Components/LoginCard";
import "./globals.css";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.title = "Admin Login";

    const hasCookie = document.cookie
      .split("; ")
      .some((row) => row.startsWith("accessToken="));
    const hasToken = Boolean(localStorage.getItem("token"));

    if (hasCookie || hasToken) {
      router.replace("/admin");
      return;
    }
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
