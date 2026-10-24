"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useAdminMe } from "@/hooks/useAdmin";
import { useChangeAdminUserPassword } from "@/hooks/useChangeAdminUserPassword";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import { Toast } from "@/app/admin/components/ui/Toast";

type AdminIdentity = {
  _id?: string;
  id?: string;
  email?: string;
  name?: string;
  user?: {
    _id?: string;
    id?: string;
    email?: string;
    name?: string;
  };
  data?: {
    _id?: string;
    id?: string;
    email?: string;
    name?: string;
    user?: {
      _id?: string;
      id?: string;
      email?: string;
      name?: string;
    };
  };
};

function resolveAdminId(payload?: AdminIdentity): string {
  const candidates = [
    payload?._id,
    payload?.id,
    payload?.user?._id,
    payload?.user?.id,
    payload?.data?._id,
    payload?.data?.id,
    payload?.data?.user?._id,
    payload?.data?.user?.id,
  ];

  return candidates.find((value) => typeof value === "string" && value.trim()) || "";
}

function resolveAdminLabel(payload?: AdminIdentity): string {
  const candidates = [
    payload?.email,
    payload?.name,
    payload?.user?.email,
    payload?.user?.name,
    payload?.data?.email,
    payload?.data?.name,
    payload?.data?.user?.email,
    payload?.data?.user?.name,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) || "";
}

export default function ChangeLoginPasswordPage() {
  const { data: me, isLoading: meLoading } = useAdminMe();
  const changePasswordMutation = useChangeAdminUserPassword();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const adminId = useMemo(() => resolveAdminId(me as AdminIdentity | undefined), [me]);
  const adminLabel = useMemo(
    () => resolveAdminLabel(me as AdminIdentity | undefined),
    [me]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const password = newPassword.trim();
    const confirmation = confirmPassword.trim();

    if (!adminId) {
      setError("Unable to resolve admin identity. Please re-login.");
      return;
    }

    if (!password || !confirmation) {
      setError("Both password fields are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    changePasswordMutation.mutate(
      { userId: adminId, newPassword: password },
      {
        onSuccess: (response) => {
          const message = response?.message || "Password reset successfully.";
          setToast(message);
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (apiError) => {
          const err = apiError as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          setError(
            err?.response?.data?.message || err?.message || "Failed to reset password."
          );
        },
      }
    );
  };

  return (
    <div className="container-pad max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Reset Admin Password
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Uses the same reset API flow as user password reset.
          </p>
        </div>
      </div>

      {meLoading ? (
        <div className="card-elevated min-h-[220px] flex items-center justify-center">
          <GlobalLoader />
        </div>
      ) : (
        <div className="card-elevated space-y-5">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-3 text-xs text-[var(--text-muted)]">
            Signed in as:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {adminLabel || "--"}
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                New Password
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
                <KeyRound size={16} className="text-[var(--text-muted)]" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="text-[var(--text-muted)] hover:text-[var(--foreground)]"
                  aria-label="Toggle new password visibility"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Confirm Password
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
                <KeyRound size={16} className="text-[var(--text-muted)]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="text-[var(--text-muted)] hover:text-[var(--foreground)]"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={changePasswordMutation.isPending || !adminId}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {changePasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}
