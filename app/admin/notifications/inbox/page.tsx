"use client";

import Link from "next/link";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import {
  useAdminInbox,
  useMarkAdminInboxRead,
  useMarkAllAdminInboxRead,
} from "@/hooks/notification/useAdminInbox";
import GlobalLoader from "../../components/ui/GlobalLoader";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminNotificationInboxPage() {
  const { data, isLoading } = useAdminInbox(true);
  const markRead = useMarkAdminInboxRead();
  const markAll = useMarkAllAdminInboxRead();

  const list = data?.list ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  if (isLoading) {
    return (
      <div className="container-pad flex min-h-[400px] items-center justify-center">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <div className="container-pad mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
            <Bell size={14} className="text-[var(--primary)]" />
            Inbox
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Notifications
          </h1>
          <p className="mt-1 text-[var(--text-muted)]">
            {unreadCount > 0
              ? `${unreadCount} unread — open one to clear it`
              : "You're all caught up"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/notifications/notification"
            className="btn btn-ghost px-4 py-2 text-sm font-semibold"
          >
            Manage sends
          </Link>
          <button
            type="button"
            disabled={unreadCount === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
            className="btn btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--hover-bg)]">
              <Inbox className="text-[var(--text-muted)]" size={28} />
            </div>
            <p className="text-lg font-semibold text-[var(--foreground)]">
              No unread notifications
            </p>
            <p className="max-w-sm text-sm text-[var(--text-muted)]">
              New broadcasts and user pushes will appear here. Once you open
              them, they leave this inbox.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--card-border)]">
            {list.map((n) => {
              const audience =
                n.user_id && typeof n.user_id === "object" && n.user_id.email
                  ? n.user_id.email
                  : "All users";
              const type = String(n.data?.type || "GENERAL");
              return (
                <li key={n._id}>
                  <button
                    type="button"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(n._id)}
                    className="group flex w-full gap-4 px-5 py-4 text-left transition hover:bg-[var(--hover-bg)]"
                  >
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--primary)] shadow-[0_0_0_4px] shadow-[var(--primary)]/15" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-[var(--foreground)]">
                          {n.title}
                        </p>
                        <span className="rounded-md bg-[var(--hover-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                          {type}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                        {n.message}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
                        <span>{formatWhen(n.createdAt)}</span>
                        <span>·</span>
                        <span>{audience}</span>
                        <span className="font-semibold text-[var(--primary)] opacity-0 transition group-hover:opacity-100">
                          Click to clear
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
