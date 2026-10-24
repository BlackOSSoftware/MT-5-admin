"use client";

import { Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { useClickSoundSettings } from "./ClickSoundProvider";

export default function Topbar() {
  const { enabled: clickSoundEnabled, toggle: toggleClickSound } =
    useClickSoundSettings();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.theme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <header className="w-full sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">

        {/* Branding */}
        <div className="ml-12 lg:ml-0 flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-8 w-[2px] shrink-0 rounded-full bg-[var(--primary)]/80"
          />
          <div className="min-w-0 leading-none">
            <p className="truncate text-sm font-bold tracking-wide text-[var(--foreground)]">
              oceana
            </p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)] sm:text-[11px]">
              profx
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">

          {/* Search Box */}
          {/* <div className="relative w-40 sm:w-52 md:w-60">
            <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-70 text-[var(--primary)]" />
            <input
              type="text"
              placeholder="Search markets, users, logs..."
              className="pl-9 pr-4 py-2 text-sm rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)]
              w-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
            />
          </div> */}

          {/*Theme Toggle Button — ADDED HERE */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full flex items-center justify-center 
            border border-[var(--input-border)] bg-[var(--input-bg)] 
            hover:scale-105 transition-transform shadow-sm sm:h-10 sm:w-10"
          >
            {theme === "light" ? <Moon size={18}  /> : <Sun size={18} />}
          </button>

          <button
            type="button"
            onClick={toggleClickSound}
            title={`Click sound: ${clickSoundEnabled ? "On" : "Off"}`}
            aria-label={`Click sound ${clickSoundEnabled ? "on" : "off"}`}
            className="h-9 w-9 rounded-full flex items-center justify-center 
            border border-[var(--input-border)] bg-[var(--input-bg)] 
            hover:scale-105 transition-transform shadow-sm sm:h-10 sm:w-10"
          >
            {clickSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

        </div>

      </div>
    </header>
  );
}
