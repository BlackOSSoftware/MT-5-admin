"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, RefreshCcw, Shield, UserPlus, X } from "lucide-react";
import {
  createAdmin,
  listAdmins,
  listPermissions,
  updateMembership,
  type PlatformAdmin,
} from "@/services/platform/platform.services";
import GlobalLoader from "../components/ui/GlobalLoader";

const PERM_LABELS: Record<string, string> = {
  "users.read": "View users",
  "users.create": "Create users",
  "users.update": "Update users",
  "kyc.review": "Review KYC",
  "finance.deposit.approve": "Approve deposits",
  "finance.deposit.reject": "Reject deposits",
  "finance.withdrawal.approve": "Approve withdrawals",
  "finance.withdrawal.reject": "Reject withdrawals",
  "finance.payment_methods.manage": "Manage payment methods",
  "plans.manage": "Manage account plans",
  "trading.positions.read": "View positions",
  "trading.intervene": "Trade intervention",
  "settings.bonus": "Bonus settings",
  "settings.referral": "Referral settings",
  "admins.manage": "Manage staff",
  "reports.export": "Export reports",
};

function permLabel(key: string) {
  return PERM_LABELS[key] || key;
}

function statusClass(status: string) {
  if (status === "ACTIVE")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  if (status === "SUSPENDED")
    return "border-amber-500/30 bg-amber-500/10 text-amber-600";
  return "border-slate-400/30 bg-slate-400/10 text-slate-600";
}

export default function AdminsPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PlatformAdmin[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<PlatformAdmin | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [aRes, pRes] = await Promise.all([listAdmins(), listPermissions()]);
      setRows(aRes.data || []);
      setPermissions(pRes.data || []);
    } catch (e: unknown) {
      const ax = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setErr(ax?.response?.data?.message || ax.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("platformRole") !== "SUPER_ADMIN") {
      router.replace("/admin");
      return;
    }
    setAllowed(true);
    refresh();
  }, [router, refresh]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    return { total: rows.length, active, suspended: rows.length - active };
  }, [rows]);

  if (!allowed) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
        Checking access…
      </div>
    );
  }

  if (loading && !rows.length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Admins
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create and manage admins. Each admin only sees their own data.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm hover:bg-[var(--hover-bg)]"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
          >
            <Plus size={16} />
            Add Admin
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total admins", value: stats.total, icon: Shield },
          { label: "Active", value: stats.active, icon: UserPlus },
          { label: "Suspended", value: stats.suspended, icon: Pencil },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-1)]"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[var(--text-muted)]">
              {s.label}
              <s.icon size={16} className="opacity-60" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {toast}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-1)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--hover-bg)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rights</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row._id}
                  className="border-t border-[var(--card-border)]"
                >
                  <td className="px-4 py-3 font-medium">
                    {row.user?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {row.user?.email || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-[var(--card-border)] px-2 py-0.5 text-xs">
                      {(row.permissions || []).length} permissions
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditRow(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs hover:bg-[var(--hover-bg)]"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-[var(--text-muted)]"
                  >
                    No admins yet. Click Add Admin to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <CreateAdminModal
          permissions={permissions}
          onClose={() => setCreateOpen(false)}
          onDone={async (message) => {
            setCreateOpen(false);
            showToast(message);
            await refresh();
          }}
        />
      )}

      {editRow && (
        <EditAdminModal
          row={editRow}
          permissions={permissions}
          onClose={() => setEditRow(null)}
          onDone={async (message) => {
            setEditRow(null);
            showToast(message);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function PermissionGrid({
  permissions,
  selected,
  onChange,
}: {
  permissions: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const allSelected =
    permissions.length > 0 && selected.length === permissions.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Access rights</label>
        <button
          type="button"
          className="text-xs font-medium text-[var(--primary)]"
          onClick={() => onChange(allSelected ? [] : [...permissions])}
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        If none are selected, full access is granted.
      </p>
      <div className="grid max-h-52 gap-2 overflow-auto rounded-xl border border-[var(--card-border)] p-3 sm:grid-cols-2">
        {permissions.map((p) => (
          <label
            key={p}
            className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--hover-bg)]"
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={selected.includes(p)}
              onChange={() =>
                onChange(
                  selected.includes(p)
                    ? selected.filter((x) => x !== p)
                    : [...selected, p]
                )
              }
            />
            <span className="font-medium">{permLabel(p)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CreateAdminModal({
  permissions,
  onClose,
  onDone,
}: {
  permissions: string[];
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([
    ...permissions,
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await createAdmin({
        email: email.trim().toLowerCase(),
        name: name.trim() || undefined,
        password: password || undefined,
        permissions: selectedPerms.length ? selectedPerms : undefined,
      });
      const temp = res.data?.temporaryPassword;
      await onDone(
        temp
          ? `Admin created. Temporary password: ${temp}`
          : `Admin created for ${email.trim().toLowerCase()}`
      );
    } catch (ex: unknown) {
      const ax = ex as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(ax?.response?.data?.message || ax.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title="Add admin"
      subtitle="New admin gets their own isolated data space automatically."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm"
            placeholder="Admin name"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm"
            placeholder="admin@company.com"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm"
            placeholder="Leave empty to auto-generate"
          />
        </div>

        <PermissionGrid
          permissions={permissions}
          selected={selectedPerms}
          onChange={setSelectedPerms}
        />

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm hover:bg-[var(--hover-bg)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create admin"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditAdminModal({
  row,
  permissions,
  onClose,
  onDone,
}: {
  row: PlatformAdmin;
  permissions: string[];
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [selectedPerms, setSelectedPerms] = useState<string[]>(
    row.permissions || []
  );
  const [status, setStatus] = useState(row.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateMembership(row._id, {
        permissions: selectedPerms,
        status,
      });
      await onDone(`Updated ${row.user?.email || "admin"}`);
    } catch (ex: unknown) {
      const ax = ex as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(ax?.response?.data?.message || ax.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title="Edit admin"
      subtitle={row.user?.email || undefined}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm"
          >
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        <PermissionGrid
          permissions={permissions}
          selected={selectedPerms}
          onChange={setSelectedPerms}
        />

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm hover:bg-[var(--hover-bg)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
