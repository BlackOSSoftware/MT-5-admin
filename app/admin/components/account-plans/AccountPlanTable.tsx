"use client";

import {
  FlaskConical,
  Pencil,
  RefreshCw,
  Scale,
  Trash2,
  Wallet,
} from "lucide-react";
import { AccountPlan } from "@/types/accountPlan";

interface Props {
  data: AccountPlan[];
  onEdit: (plan: AccountPlan) => void;
  onDelete: (id: string) => void;
}

function formatMoney(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}`;
}

function planInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-[var(--foreground)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function FlagChip({
  on,
  onLabel,
  offLabel,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${
        on
          ? "bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/25"
          : "bg-[var(--input-bg)] text-[var(--text-muted)] ring-1 ring-[var(--card-border)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          on ? "bg-emerald-500" : "bg-[var(--text-muted)]/50"
        }`}
      />
      {on ? onLabel : offLabel}
    </span>
  );
}

function PlanRow({
  plan,
  index,
  onEdit,
  onDelete,
}: {
  plan: AccountPlan;
  index: number;
  onEdit: (plan: AccountPlan) => void;
  onDelete: (id: string) => void;
}) {
  const accent = plan.isActive
    ? "from-emerald-500 to-teal-400"
    : "from-rose-400 to-orange-300";

  const avatarTone = plan.isActive
    ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/25"
    : "bg-rose-500/10 text-rose-700 ring-rose-500/20";

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/35 hover:shadow-[0_18px_40px_-28px_rgba(14,165,233,0.55)]"
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accent}`}
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 p-4 pl-5 sm:p-5 sm:pl-6 lg:flex-row lg:items-center lg:gap-6">
        {/* Identity */}
        <div className="flex min-w-0 flex-1 items-start gap-3 lg:max-w-[280px]">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold tracking-wide ring-1 ${avatarTone}`}
          >
            {planInitials(plan.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-[var(--foreground)]">
                {plan.name}
              </h3>
              <span className="rounded-full bg-[var(--input-bg)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--text-muted)] ring-1 ring-[var(--card-border)]">
                #{String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
              {plan.guidance?.trim() || "No guidance note for this plan."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  plan.isActive
                    ? "bg-emerald-500/12 text-emerald-700"
                    : "bg-rose-500/12 text-rose-700"
                }`}
              >
                {plan.isActive ? "Active" : "Inactive"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                <Scale size={10} />
                {plan.max_leverage ? `1:${plan.max_leverage}` : "Unlimited"}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics band */}
        <div className="grid flex-[1.6] grid-cols-2 gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)]/55 p-3 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-[var(--card-border)] sm:p-0 sm:py-3">
          <div className="sm:px-4">
            <Metric
              label="Min Deposit"
              value={formatMoney(plan.minDeposit)}
              hint={`Lot ${plan.minLotSize}`}
            />
          </div>
          <div className="sm:px-4">
            <Metric
              label="Spread"
              value={`${plan.spreadPips}`}
              hint={plan.spread_type === "FIXED" ? "Fixed pips" : "Floating"}
            />
          </div>
          <div className="sm:px-4">
            <Metric
              label="Commission"
              value={`${plan.commission}`}
              hint={`${plan.commission_per_lot} / lot`}
            />
          </div>
          <div className="sm:px-4">
            <Metric
              label="Referral"
              value={formatMoney(plan.referral_reward_amount)}
              hint={plan.swap_enabled ? "Swap on" : "Swap off"}
            />
          </div>
        </div>

        {/* Flags + actions */}
        <div className="flex shrink-0 flex-col gap-3 lg:w-[200px] lg:items-end">
          <div className="flex flex-wrap gap-1.5 lg:justify-end">
            <FlagChip
              on={plan.is_demo_allowed}
              onLabel="Demo ready"
              offLabel="Live only"
            />
            <FlagChip
              on={plan.swap_enabled}
              onLabel="Swap"
              offLabel="No swap"
            />
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => onEdit(plan)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3 text-xs font-semibold text-[var(--card-bg)] transition hover:opacity-90"
            >
              <Pencil size={13} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(plan._id)}
              aria-label={`Delete ${plan.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/35 bg-rose-500/10 text-rose-700 transition hover:bg-rose-500/20"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle footer strip for mobile context */}
      <div className="flex items-center gap-4 border-t border-[var(--card-border)] bg-[var(--input-bg)]/40 px-4 py-2 text-[11px] text-[var(--text-muted)] sm:hidden">
        <span className="inline-flex items-center gap-1">
          <Wallet size={11} />
          {formatMoney(plan.minDeposit)}
        </span>
        <span className="inline-flex items-center gap-1">
          <FlaskConical size={11} />
          {plan.is_demo_allowed ? "Demo" : "Live"}
        </span>
        <span className="inline-flex items-center gap-1">
          <RefreshCw size={11} />
          {plan.swap_enabled ? "Swap" : "Flat"}
        </span>
      </div>
    </article>
  );
}

export default function AccountPlanTable({ data, onEdit, onDelete }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Plan catalog
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {data.length} plan{data.length === 1 ? "" : "s"} configured
        </p>
      </div>

      <div className="space-y-3">
        {data.map((plan, index) => (
          <PlanRow
            key={plan._id}
            plan={plan}
            index={index}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
