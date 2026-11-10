"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, ShieldCheck, UserRound, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAdminNotifications } from "@/hooks/notification/useGetAdminNotifications";
import {
  useBroadcastNotification,
  useSendUserNotification,
} from "@/hooks/notification/useBroadcastNotification";
import Pagination from "../../components/ui/pagination";
import {
  Notification,
  NotificationAudience,
  NotificationType,
  searchUsersForNotifyService,
} from "@/services/notification/notification.services";
import GlobalLoader from "../../components/ui/GlobalLoader";
import DragScroll from "../../components/ui/DragScroll";

function audienceLabel(item: Notification) {
  const u = item.user_id;
  if (u && typeof u === "object" && u.email) return u.email;
  if (typeof u === "string" && u) return "Specific user";
  if (item.audience === "ADMINS") return item.brokerId ? "Broker admins" : "All admins";
  if (item.audience === "USERS") return item.brokerId ? "Broker users" : "All users";
  return "All users";
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useGetAdminNotifications({
    page,
    limit,
    q: debounced,
  });

  const list = data?.list ?? [];

  const rows = useMemo(
    () =>
      list.map((item) => ({
        id: item._id,
        title: item.title,
        message: item.message,
        type: String(item.data?.type || "GENERAL"),
        isActive: item.isActive && new Date(item.expireAt) > new Date(),
        audience: audienceLabel(item),
        expireAt: new Date(item.expireAt).toLocaleDateString(),
        createdAt: new Date(item.createdAt).toLocaleString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })),
    [list]
  );

  if (isLoading) {
    return (
      <div className="container-pad flex items-center justify-center min-h-[400px]">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <div className="container-pad space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Notifications
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Broadcast to everyone or send to a particular user
          </p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="btn btn-primary px-6 py-2.5 inline-flex items-center gap-2 shadow-lg hover:shadow-xl whitespace-nowrap"
        >
          <Plus size={18} />
          New Notification
        </button>
      </div>

      <div className="card-elevated max-w-md">
        <div className="relative">
          <svg
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input w-full pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--glow)] rounded-lg"
          />
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <DragScroll className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--text-muted)]/40 scrollbar-track-transparent">
          <table className="table table-fixed min-w-[1200px] w-full">
            <thead>
              <tr>
                <th className="w-[180px]">Title</th>
                <th className="w-[280px]">Message</th>
                <th className="w-[160px]">Audience</th>
                <th className="w-[110px]">Type</th>
                <th className="w-[110px]">Status</th>
                <th className="w-[120px]">Expires</th>
                <th className="w-[180px]">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="font-semibold text-[var(--foreground)]">
                      No notifications found
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Create a broadcast or send to a specific user
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((n) => (
                  <tr key={n.id} className="hover:bg-[var(--hover-bg)]">
                    <td className="font-medium text-[var(--foreground)] truncate">
                      {n.title}
                    </td>
                    <td className="max-w-[280px]">
                      <span className="text-[var(--text-muted)] block truncate">
                        {n.message}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-medium text-[var(--foreground)] truncate block">
                        {n.audience}
                      </span>
                    </td>
                    <td>
                      <span className="pill text-xs font-medium">{n.type}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={`pill text-xs font-medium inline-flex items-center gap-1 ${
                          n.isActive ? "pill-success" : "pill-muted"
                        }`}
                      >
                        {n.isActive ? "Active" : "Expired"}
                      </span>
                    </td>
                    <td className="text-[var(--text-muted)] text-sm">
                      {n.expireAt}
                    </td>
                    <td className="text-[var(--text-muted)] whitespace-nowrap text-sm">
                      {n.createdAt}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DragScroll>
      </div>

      {data?.pagination && (
        <div className="card pt-0 pb-4 px-0">
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            limit={data.pagination.limit}
            onPageChange={setPage}
            onLimitChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
          />
        </div>
      )}

      {openModal && (
        <SendNotificationModal onClose={() => setOpenModal(false)} />
      )}
    </div>
  );
}

function SendNotificationModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState<NotificationAudience>("USERS");
  const [targetUser, setTargetUser] = useState(false);
  const [isSuperAdmin] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("platformRole") === "SUPER_ADMIN",
  );
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "GENERAL" as NotificationType,
  });
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<
    Array<{ _id: string; email: string; name?: string }>
  >([]);
  const [selectedUser, setSelectedUser] = useState<{
    _id: string;
    email: string;
    name?: string;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const broadcastMutation = useBroadcastNotification();
  const sendUserMutation = useSendUserNotification();

  useEffect(() => {
    if (!targetUser) return;
    const q = userQuery.trim();
    if (q.length < 2) {
      setUserResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await searchUsersForNotifyService(q);
        if (!cancelled) setUserResults(rows);
      } catch {
        if (!cancelled) setUserResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [userQuery, targetUser]);

  const canSend =
    formData.title.trim() &&
    formData.message.trim() &&
    (!targetUser || !!selectedUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;

    setIsSending(true);
    const payload = {
      title: formData.title.trim(),
      message: formData.message.trim(),
      expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      data: { type: formData.type },
      ...(isSuperAdmin ? { audience } : {}),
    };

    try {
      if (targetUser && selectedUser) {
        await sendUserMutation.mutateAsync({
          ...payload,
          userId: selectedUser._id,
          email: selectedUser.email,
        });
      } else {
        await broadcastMutation.mutateAsync(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      onClose();
      setFormData({ title: "", message: "", type: "GENERAL" });
    } catch (error) {
      console.error("Send failed:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="card-elevated w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-6 pb-4 border-b border-[var(--card-border)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Send Notification
            </h2>
            <button
              onClick={onClose}
              className="btn btn-ghost p-1.5 hover:bg-[var(--hover-bg)] rounded-lg"
              disabled={isSending}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {isSuperAdmin && <div className="grid grid-cols-2 gap-2">
            {(["USERS", "ADMINS"] as const).map((key) => (
              <button key={key} type="button" onClick={() => setAudience(key)} disabled={isSending} className={`rounded-xl border p-3 text-sm font-semibold ${audience === key ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--card-border)]"}`}>
                {key === "USERS" ? <Users size={16} className="inline mr-2" /> : <ShieldCheck size={16} className="inline mr-2" />}
                {key === "USERS" ? "All users" : "Admins only"}
              </button>
            ))}
          </div>}
          <button type="button" onClick={() => { setTargetUser(!targetUser); setSelectedUser(null); }} disabled={isSending} className="text-sm text-[var(--primary)] inline-flex items-center gap-2">
            <UserRound size={16} /> {targetUser ? "Send to all instead" : "Send to a particular user"}
          </button>
          {targetUser && (
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Find user *
              </label>
              {selectedUser ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--hover-bg)] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {selectedUser.name || "User"}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {selectedUser.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--primary)]"
                    onClick={() => setSelectedUser(null)}
                    disabled={isSending}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search by email or name…"
                    className="input w-full py-2.5 px-3 text-sm focus:ring-2 focus:ring-[var(--glow)]"
                    disabled={isSending}
                  />
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[var(--card-border)]">
                    {searching ? (
                      <p className="px-3 py-3 text-xs text-[var(--text-muted)]">
                        Searching…
                      </p>
                    ) : userQuery.trim().length < 2 ? (
                      <p className="px-3 py-3 text-xs text-[var(--text-muted)]">
                        Type at least 2 characters
                      </p>
                    ) : userResults.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-[var(--text-muted)]">
                        No users found
                      </p>
                    ) : (
                      userResults.map((u) => (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setUserQuery("");
                            setUserResults([]);
                          }}
                          className="flex w-full flex-col items-start gap-0.5 border-b border-[var(--card-border)] px-3 py-2.5 text-left last:border-b-0 hover:bg-[var(--hover-bg)]"
                        >
                          <span className="text-sm font-semibold text-[var(--foreground)]">
                            {u.name || "User"}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {u.email}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Title *
            </label>
            <input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter notification title"
              className="input w-full py-2.5 px-3 text-sm focus:ring-2 focus:ring-[var(--glow)]"
              disabled={isSending}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              placeholder="Enter notification message"
              rows={4}
              className="input w-full py-2.5 px-3 text-sm resize-vertical focus:ring-2 focus:ring-[var(--glow)]"
              disabled={isSending}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as NotificationType,
                })
              }
              className="input w-full py-2.5 px-3 text-sm focus:ring-2 focus:ring-[var(--glow)]"
              disabled={isSending}
            >
              <option value="GENERAL">General</option>
              <option value="INFORMATION">Information</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="HOLIDAY">Holiday</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1 py-2.5 font-semibold"
              disabled={isSending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !canSend}
              className="btn btn-primary flex-1 py-2.5 font-semibold relative flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : targetUser ? (
                "Send to user"
              ) : (
                "Broadcast"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
