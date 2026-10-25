"use client";

import { Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useClickSoundSettings } from "./ClickSoundProvider";
import { useAdminMe } from "@/hooks/useAdmin";
import {
  applyDocumentTitle,
  resolveBrandName,
  resolveBrandSubtitle,
  type BrandSource,
} from "@/utils/brand";

export default function Topbar() {
  const { enabled: clickSoundEnabled, toggle: toggleClickSound } =
    useClickSoundSettings();
  const { data: me } = useAdminMe();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.theme === "dark" ? "dark" : "light";
  });

  const brand = useMemo(() => {
    let memberships: BrandSource["memberships"] = [];
    try {
      memberships = JSON.parse(localStorage.getItem("memberships") || "[]");
    } catch {
      memberships = [];
    }
    const platformRole =
      (me as { platformRole?: string } | undefined)?.platformRole ||
      localStorage.getItem("platformRole");

    return {
      name: resolveBrandName({
        platformRole,
        name: (me as { name?: string } | undefined)?.name,
        brokerDisplayName: (me as { brokerDisplayName?: string } | undefined)
          ?.brokerDisplayName,
        memberships,
      }),
      subtitle: resolveBrandSubtitle({ platformRole }),
    };
  }, [me]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
    localStorage.theme = theme;
  }, [theme]);

  useEffect(() => {
    applyDocumentTitle(brand.name);
    localStorage.setItem("brandName", brand.name);
  }, [brand.name]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const parts = brand.name.split(/\s+/).filter(Boolean);
  const line1 = parts[0] || "Admin";
  const line2 = parts.slice(1).join(" ") || brand.subtitle;

  return (
    <header className="w-full sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="ml-12 lg:ml-0 flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-8 w-[2px] shrink-0 rounded-full bg-[var(--primary)]/80"
          />
          <div className="min-w-0 leading-none">
            <p className="truncate text-sm font-bold tracking-wide text-[var(--foreground)]">
              {line1}
            </p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)] sm:text-[11px]">
              {line2}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full flex items-center justify-center 
            border border-[var(--input-border)] bg-[var(--input-bg)] 
            hover:scale-105 transition-transform shadow-sm sm:h-10 sm:w-10"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
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

type BrandSourceMemberships = Array<{
  broker?: { displayName?: string; code?: string } | null;
}>;
