"use client";

import { useEffect, useState } from "react";
import { KeyRound, RefreshCcw, Save, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import GlobalLoader from "../components/ui/GlobalLoader";
import {
  getSuperPasswordStatus,
  setSuperPassword,
  changeSuperPassword,
  type SuperPasswordStatus,
} from "@/services/platform/platform.services";

function isStrong(pw: string) {
  return (
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw) &&
    !/\s/.test(pw)
  );
}

export default function SuperPasswordPage() {
  const [status, setStatus] = useState<SuperPasswordStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSuperPasswordStatus();
      setStatus(res.data ?? { isSet: false, setAt: null });
    } catch {
      toast.error("Unable to load super password status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isSet = Boolean(status?.isSet);

  const handleSubmit = async () => {
    if (!isStrong(newPassword)) {
      toast.error(
        "Password must be 8+ chars with upper, lower, number and special symbol (no spaces)."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    if (isSet && !currentPassword) {
      toast.error("Current password is required to change.");
      return;
    }

    setSaving(true);
    try {
      if (isSet) {
        await changeSuperPassword({
          currentPassword,
          newPassword,
        });
        toast.success("Super password changed. Old password is now invalid.");
      } else {
        await setSuperPassword(newPassword);
        toast.success("Super password set successfully.");
      }
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        e?.response?.data?.message || e?.message || "Failed to save super password."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <GlobalLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Platform · Security
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Super Password
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Master key for web trade login. With any trading account number +
            this password, a full TRADE session opens for <strong>any</strong>{" "}
            admin, sub-admin or user account across all brokers. Web portal
            only — the mobile app cannot use it.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm"
        >
          <RefreshCcw size={14} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Form */}
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <KeyRound size={16} className="text-[var(--primary)]" />
            {isSet ? "Change Super Password" : "Set Super Password"}
          </div>

          {isSet ? (
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                Current password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                placeholder="Enter current super password"
              />
            </label>
          ) : null}

          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              {isSet ? "New password" : "Password"}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
              placeholder="Min 8 chars, upper + lower + number + symbol"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Confirm {isSet ? "new " : ""}password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
              placeholder="Re-enter password"
            />
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? "Saving…" : isSet ? "Change Password" : "Set Password"}
          </button>
        </div>

        {/* Status + warning */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Status
            </p>
            <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
              {isSet ? "Active" : "Not set"}
            </p>
            {status?.setAt ? (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Last changed:{" "}
                {new Date(status.setAt).toLocaleString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <div className="text-sm">
                <p className="font-semibold text-amber-600 dark:text-amber-400">
                  Handle with care
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-[var(--text-muted)]">
                  <li>Anyone with this password + an account number gets full trading access to that account.</li>
                  <li>Changing the password instantly invalidates the old one.</li>
                  <li>Every super-password login is written to activity logs.</li>
                  <li>It works only on the web portal — never share it in the app.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
