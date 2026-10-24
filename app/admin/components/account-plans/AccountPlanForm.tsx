"use client";

import { useState, type ReactNode } from "react";
import {
  Activity,
  BadgePercent,
  DollarSign,
  Gift,
  Layers,
  Percent,
  Scale,
} from "lucide-react";
import { AccountPlan, AccountPlanPayload } from "@/types/accountPlan";
import PremiumInput from "../ui/PremiumInput";
import Toggle from "../ui/Toggle";

type DraftNumber = number | "";

type AccountPlanDraft = Omit<
  AccountPlanPayload,
  | "spreadPips"
  | "commission"
  | "max_leverage"
  | "minDeposit"
  | "commission_per_lot"
  | "referral_reward_amount"
> & {
  spreadPips: DraftNumber;
  commission: DraftNumber;
  max_leverage: DraftNumber;
  minDeposit: DraftNumber;
  commission_per_lot: DraftNumber;
  referral_reward_amount: DraftNumber;
};

const DEFAULT_FORM: AccountPlanDraft = {
  name: "",
  spreadPips: "",
  commission: "",
  leverageNote: "Up to Unlimited",
  max_leverage: "",
  minLotSize: 0.01,
  minDeposit: "",
  guidance: "",
  is_demo_allowed: true,
  spread_type: "FLOATING",
  commission_per_lot: "",
  swap_enabled: true,
  referral_reward_amount: "",
  isActive: true,
};

function getInitialForm(initialData?: AccountPlan | null): AccountPlanDraft {
  if (!initialData) return DEFAULT_FORM;

  return {
    name: initialData.name,
    spreadPips: initialData.spreadPips,
    commission: initialData.commission,
    leverageNote: initialData.leverageNote,
    max_leverage: initialData.max_leverage ?? 0,
    minLotSize: initialData.minLotSize,
    minDeposit: initialData.minDeposit,
    guidance: initialData.guidance,
    is_demo_allowed: initialData.is_demo_allowed,
    spread_type: initialData.spread_type,
    commission_per_lot: initialData.commission_per_lot,
    swap_enabled: initialData.swap_enabled,
    referral_reward_amount: initialData.referral_reward_amount ?? 0,
    isActive: initialData.isActive,
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)]/40 p-3.5 sm:p-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

interface Props {
  initialData?: AccountPlan | null;
  onSubmit: (payload: AccountPlanPayload) => void;
  loading?: boolean;
}

export default function AccountPlanForm({
  initialData,
  onSubmit,
  loading,
}: Props) {
  const [form, setForm] = useState<AccountPlanDraft>(() =>
    getInitialForm(initialData)
  );
  const parseDraftNumber = (value: DraftNumber) =>
    value === "" ? 0 : Number(value);

  return (
    <div className="space-y-4">
      <Section
        title="Basic details"
        description="Plan identity and deposit entry requirements."
      >
        <PremiumInput
          label="Plan Name"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          icon={Layers}
          required
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PremiumInput
            label="Minimum Deposit"
            type="number"
            value={form.minDeposit}
            onChange={(v) =>
              setForm({ ...form, minDeposit: v === "" ? "" : Number(v) })
            }
            icon={DollarSign}
          />
          <PremiumInput
            label="Minimum Lot Size"
            type="number"
            value={form.minLotSize}
            onChange={(v) => setForm({ ...form, minLotSize: Number(v) })}
            icon={Scale}
          />
        </div>
      </Section>

      <Section
        title="Trading costs"
        description="Spread and commission charged on this plan."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PremiumInput
            label="Spread (Pips)"
            type="number"
            value={form.spreadPips}
            onChange={(v) =>
              setForm({ ...form, spreadPips: v === "" ? "" : Number(v) })
            }
            icon={Percent}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-muted)]">
              Spread Type
            </label>
            <select
              value={form.spread_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  spread_type: e.target.value as "FIXED" | "FLOATING",
                })
              }
              className="input w-full"
            >
              <option value="FLOATING">Floating</option>
              <option value="FIXED">Fixed</option>
            </select>
          </div>
          <PremiumInput
            label="Commission"
            type="number"
            value={form.commission}
            onChange={(v) =>
              setForm({ ...form, commission: v === "" ? "" : Number(v) })
            }
            icon={BadgePercent}
          />
          <PremiumInput
            label="Commission per Lot"
            type="number"
            value={form.commission_per_lot}
            onChange={(v) =>
              setForm({
                ...form,
                commission_per_lot: v === "" ? "" : Number(v),
              })
            }
          />
        </div>
      </Section>

      <Section
        title="Leverage & rewards"
        description="Risk limits and referral incentive for this plan."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PremiumInput
            label="Max Leverage (0 = Unlimited)"
            type="number"
            value={form.max_leverage}
            onChange={(v) =>
              setForm({ ...form, max_leverage: v === "" ? "" : Number(v) })
            }
            icon={Activity}
          />
          <PremiumInput
            label="Leverage Note"
            value={form.leverageNote}
            onChange={(v) => setForm({ ...form, leverageNote: v })}
          />
          <PremiumInput
            label="Referral Reward Amount"
            type="number"
            value={form.referral_reward_amount}
            onChange={(v) =>
              setForm({
                ...form,
                referral_reward_amount: v === "" ? "" : Number(v),
              })
            }
            icon={Gift}
          />
          <PremiumInput
            label="Guidance / Support Note"
            value={form.guidance}
            onChange={(v) => setForm({ ...form, guidance: v })}
          />
        </div>
      </Section>

      <Section
        title="Availability"
        description="Control demo access, overnight swap, and plan status."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Toggle
            label="Demo Account Allowed"
            value={form.is_demo_allowed}
            onChange={(v) => setForm({ ...form, is_demo_allowed: v })}
          />
          <Toggle
            label="Swap Enabled"
            value={form.swap_enabled}
            onChange={(v) => setForm({ ...form, swap_enabled: v })}
          />
          <Toggle
            label="Plan Active"
            value={form.isActive}
            onChange={(v) => setForm({ ...form, isActive: v })}
          />
        </div>
      </Section>

      <button
        type="button"
        disabled={loading || !form.name.trim()}
        onClick={() =>
          onSubmit({
            ...form,
            spreadPips: parseDraftNumber(form.spreadPips),
            commission: parseDraftNumber(form.commission),
            max_leverage: parseDraftNumber(form.max_leverage),
            minDeposit: parseDraftNumber(form.minDeposit),
            commission_per_lot: parseDraftNumber(form.commission_per_lot),
            referral_reward_amount: parseDraftNumber(
              form.referral_reward_amount
            ),
          })
        }
        className="btn btn-primary w-full disabled:opacity-60"
      >
        {loading ? "Saving..." : initialData ? "Save Changes" : "Create Plan"}
      </button>
    </div>
  );
}
