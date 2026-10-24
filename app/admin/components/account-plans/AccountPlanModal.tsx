"use client";

import { X } from "lucide-react";
import AccountPlanForm from "./AccountPlanForm";
import { AccountPlan, AccountPlanPayload } from "@/types/accountPlan";

interface Props {
  open: boolean;
  onClose: () => void;
  initialData?: AccountPlan | null;
  onSubmit: (payload: AccountPlanPayload) => void;
  loading?: boolean;
}

export default function AccountPlanModal({
  open,
  onClose,
  initialData,
  onSubmit,
  loading,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {initialData ? "Edit Account Plan" : "Create Account Plan"}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Set pricing, leverage, and availability rules for this plan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--card-border)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AccountPlanForm
            key={initialData?._id ?? "new"}
            initialData={initialData}
            onSubmit={onSubmit}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
