"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useClickSoundSettings } from "./ClickSoundProvider";
import { applyDocumentTitle } from "@/utils/brand";
import adminService from "@/services/admin.service";
import {
  useAdminInbox,
  useAdminInboxCount,
  useMarkAdminInboxRead,
  useMarkAllAdminInboxRead,
} from "@/hooks/notification/useAdminInbox";

export default function Topbar() {
  const router = useRouter();
  const { enabled: clickSoundEnabled, toggle: toggleClickSound } =
    useClickSoundSettings();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.theme === "dark" ? "dark" : "light";
  });
  const [me, setMe] = useState<{
    name?: string;
    email?: string;
    platformRole?: string;
    brokerDisplayName?: string;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const { data: unreadCount = 0 } = useAdminInboxCount();
  const { data: inbox } = useAdminInbox(open);
  const markRead = useMarkAdminInboxRead();
  const markAll = useMarkAllAdminInboxRead();

  const brandName = "Admin";
  const preview = (inbox?.list ?? []).slice(0, 6);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getMe()
      .then((data: typeof me) => {
        if (!cancelled && data) setMe(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
    applyDocumentTitle(brandName);
    localStorage.setItem("brandName", brandName);
  }, [brandName]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const line1 = me?.name || me?.email || brandName;
  const line2 = me?.platformRole === "SUPER_ADMIN"
    ? "SUPER ADMIN"
    : me?.brokerDisplayName
      ? `${me.brokerDisplayName.toUpperCase()} · ADMIN`
      : "ADMIN";
  const badge =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : "";

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
          <div className="relative" ref={panelRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              title="Notifications"
              aria-label="Notifications"
              className="relative h-9 w-9 rounded-full flex items-center justify-center 
              border border-[var(--input-border)] bg-[var(--input-bg)] 
              hover:scale-105 transition-transform shadow-sm sm:h-10 sm:w-10"
            >
              <Bell size={18} />
              {badge ? (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[var(--primary)] px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                  {badge}
                </span>
              ) : null}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      Notifications
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {unreadCount > 0
                        ? `${unreadCount} unread`
                        : "No unread items"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={unreadCount === 0 || markAll.isPending}
                    onClick={() => markAll.mutate()}
                    className="text-xs font-semibold text-[var(--primary)] disabled:opacity-40"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-[360px] overflow-y-auto">
                  {preview.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                      You&apos;re all caught up
                    </div>
                  ) : (
                    preview.map((n) => (
                      <button
                        key={n._id}
                        type="button"
                        className="flex w-full gap-3 border-b border-[var(--card-border)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--hover-bg)]"
                        onClick={async () => {
                          await markRead.mutateAsync(n._id);
                        }}
                      >
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                            {n.title}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--text-muted)]">
                            {n.message}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-[var(--card-border)] px-4 py-3">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-[var(--primary)]/10 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/15"
                    onClick={() => {
                      setOpen(false);
                      router.push("/admin/notifications/inbox");
                    }}
                  >
                    Open notification inbox
                  </button>
                  <Link
                    href="/admin/notifications/notification"
                    onClick={() => setOpen(false)}
                    className="mt-2 block text-center text-xs font-medium text-[var(--text-muted)] hover:text-[var(--foreground)]"
                  >
                    Manage broadcasts
                  </Link>
                </div>
              </div>
            )}
          </div>

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
