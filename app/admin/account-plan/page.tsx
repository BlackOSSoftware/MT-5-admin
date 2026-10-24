"use client";

import { useMemo, useState } from "react";
import {
  BadgePercent,
  CheckCircle2,
  FlaskConical,
  Layers3,
  Plus,
  XCircle,
} from "lucide-react";
import {
  useAccountPlans,
  useCreateAccountPlan,
  useUpdateAccountPlan,
  useDeleteAccountPlan,
} from "@/hooks/useAccountPlans";
import { AccountPlan, AccountPlanPayload } from "@/types/accountPlan";
import AccountPlanTable from "../components/account-plans/AccountPlanTable";
import AccountPlanModal from "../components/account-plans/AccountPlanModal";
import GlobalLoader from "../components/ui/GlobalLoader";

export default function AccountPlansPage() {
  const { data = [], isLoading } = useAccountPlans();
  const createPlan = useCreateAccountPlan();
  const deletePlan = useDeleteAccountPlan();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccountPlan | null>(null);
  const [toast, setToast] = useState("");

  const updatePlan = useUpdateAccountPlan(editing?._id || "");

  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter((plan) => plan.isActive).length;
    const demo = data.filter((plan) => plan.is_demo_allowed).length;
    const inactive = total - active;
    return { total, active, demo, inactive };
  }, [data]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2000);
  };

  const submit = (payload: AccountPlanPayload) => {
    if (editing) {
      updatePlan.mutate(payload, {
        onSuccess: () => {
          setModalOpen(false);
          setEditing(null);
          showToast("Plan updated.");
        },
      });
    } else {
      createPlan.mutate(payload, {
        onSuccess: () => {
          setModalOpen(false);
          showToast("Plan created.");
        },
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete account plan "${name}"?`)) return;
    deletePlan.mutate(id, {
      onSuccess: () => showToast("Plan deleted."),
    });
  };

  return (
    <div className="container-pad max-w-full space-y-5 text-[var(--foreground)]">
      <header className="relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              Trading products
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
              Account Plans
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              Configure deposits, spreads, commissions, leverage, and demo
              access for every account tier.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(14,165,233,0.8)] hover:bg-[var(--primary-dark)]"
          >
            <Plus size={16} />
            Add Plan
          </button>
        </div>

        <div className="relative grid grid-cols-2 border-t border-[var(--card-border)] lg:grid-cols-4">
          {[
            {
              label: "Total",
              value: stats.total,
              icon: <Layers3 size={14} />,
            },
            {
              label: "Active",
              value: stats.active,
              icon: <CheckCircle2 size={14} />,
            },
            {
              label: "Demo",
              value: stats.demo,
              icon: <FlaskConical size={14} />,
            },
            {
              label: "Inactive",
              value: stats.inactive,
              icon: <XCircle size={14} />,
            },
          ].map((item, idx) => (
            <div
              key={item.label}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 ${
                idx > 0 ? "border-l border-[var(--card-border)]" : ""
              } ${idx === 2 ? "border-t border-[var(--card-border)] lg:border-t-0" : ""} ${
                idx === 3 ? "border-t border-[var(--card-border)] lg:border-t-0" : ""
              }`}
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {item.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {item.value}
                </p>
              </div>
              <span className="text-[var(--text-muted)]">{item.icon}</span>
            </div>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-10">
          <GlobalLoader />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20">
            <BadgePercent size={22} />
          </div>
          <h2 className="text-base font-semibold">No account plans yet</h2>
          <p className="max-w-md text-sm text-[var(--text-muted)]">
            Create your first plan to control pricing, leverage, and trading
            rules for live and demo accounts.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={15} />
            Create Plan
          </button>
        </div>
      ) : (
        <AccountPlanTable
          data={data}
          onEdit={(plan) => {
            setEditing(plan);
            setModalOpen(true);
          }}
          onDelete={(id) => {
            const plan = data.find((item) => item._id === id);
            handleDelete(id, plan?.name || "this plan");
          }}
        />
      )}

      <AccountPlanModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        initialData={editing}
        onSubmit={submit}
        loading={createPlan.isPending || updatePlan.isPending}
      />

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
