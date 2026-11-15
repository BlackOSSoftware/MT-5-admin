"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Check,
  Clock3,
  Eye,
  GitBranch,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "@/app/admin/components/ui/pagination";
import DragScroll from "@/app/admin/components/ui/DragScroll";
import {
  useAdminIbRequests,
  useRespondAdminIbRequest,
} from "@/hooks/referrals/useAdminIbRequests";
import type { AdminIbRequestItem } from "@/services/adminIbRequests.service";

const STATUS_TABS = ["", "PENDING", "APPROVED", "REJECTED"] as const;
const TYPE_TABS = ["", "SUB_IB", "ADMIN"] as const;

function fmtDate(value?: string | null) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(value?: string | null) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return `${d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function StatusPill({ status }: { status?: string }) {
  const key = String(status || "").toUpperCase();
  const cls =
    key === "APPROVED"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
      : key === "REJECTED"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-700"
        : "border-amber-500/40 bg-amber-500/10 text-amber-700";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {status || "--"}
    </span>
  );
}

function TypePill({ type }: { type?: string }) {
  const isAdmin = String(type || "").toUpperCase() === "ADMIN";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        isAdmin
          ? "border-violet-500/40 bg-violet-500/10 text-violet-700"
          : "border-sky-500/40 bg-sky-500/10 text-sky-700"
      }`}
    >
      {isAdmin ? <ShieldCheck size={11} /> : <GitBranch size={11} />}
      {isAdmin ? "Direct → Admin" : "Sub-IB"}
    </span>
  );
}

export default function IbRequestsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [selected, setSelected] = useState<AdminIbRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const query = useAdminIbRequests({
    status: status || undefined,
    type: type || undefined,
    q: q || undefined,
    page,
    limit,
  });
  const respond = useRespondAdminIbRequest();

  const items = query.data?.items ?? [];
  const totalPages = query.data?.pagination?.totalPages || 1;
  const total = query.data?.pagination?.total ?? 0;
  const counts = query.data?.statusCounts;

  const applySearch = useCallback(() => {
    setQ(qDraft.trim());
    setPage(1);
  }, [qDraft]);

  const closeModal = useCallback(() => {
    setSelected(null);
    setRejectReason("");
  }, []);

  const handleApprove = useCallback(async () => {
    if (!selected) return;
    try {
      await respond.mutateAsync({ requestId: selected.id, action: "APPROVE" });
      toast.success("IB request approved — dashboard access enabled");
      closeModal();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Unable to approve request";
      toast.error(msg);
    }
  }, [selected, respond, closeModal]);

  const handleReject = useCallback(async () => {
    if (!selected) return;
    try {
      await respond.mutateAsync({
        requestId: selected.id,
        action: "REJECT",
        reason: rejectReason.trim(),
      });
      toast.success("IB request rejected");
      closeModal();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Unable to reject request";
      toast.error(msg);
    }
  }, [selected, rejectReason, respond, closeModal]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container-pad space-y-6 min-h-screen"
    >
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <GitBranch size={22} className="text-[var(--primary)]" />
            IB Access Requests
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Review and approve/reject IB dashboard access requests from clients.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700">
            Pending {counts?.PENDING ?? 0}
          </span>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700">
            Approved {counts?.APPROVED ?? 0}
          </span>
          <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-medium text-rose-700">
            Rejected {counts?.REJECTED ?? 0}
          </span>
        </div>
      </div>

      {/* FILTERS */}
      <div className="card-elevated space-y-4 !p-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                status === s
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--hover-bg)] text-[var(--text-muted)] hover:bg-[var(--card-border)]"
              }`}
            >
              {s || "All"}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-[var(--card-border)]" />
          {TYPE_TABS.map((t) => (
            <button
              key={t || "all-types"}
              type="button"
              onClick={() => {
                setType(t);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                type === t
                  ? "bg-[var(--foreground)] text-[var(--card-bg)]"
                  : "bg-[var(--hover-bg)] text-[var(--text-muted)] hover:bg-[var(--card-border)]"
              }`}
            >
              {t === "" ? "All Types" : t === "ADMIN" ? "Direct (Admin)" : "Sub-IB"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="Search by name, email or phone..."
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
          <button
            type="button"
            onClick={applySearch}
            className="btn btn-primary !py-2 text-xs"
          >
            Search
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="card-elevated !p-0">
        <DragScroll className="overflow-x-auto">
          <table className="table w-full text-[13px]">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Routed To</th>
                <th>Note</th>
                <th>Requested</th>
                <th>Responded By</th>
                <th>Status</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                      Loading requests...
                    </div>
                  </td>
                </tr>
              ) : query.isError ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <AlertCircle className="mx-auto mb-2 h-10 w-10 text-orange-500" />
                    <p className="text-sm text-[var(--text-muted)]">
                      Unable to load IB requests
                    </p>
                    <button
                      type="button"
                      onClick={() => query.refetch()}
                      className="btn btn-ghost mx-auto mt-2"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Users className="mx-auto mb-2 h-10 w-10 opacity-40" />
                    <p className="text-sm text-[var(--text-muted)]">
                      No IB requests found
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--hover-bg)]/50">
                    <td>
                      <div className="font-medium text-[var(--foreground)]">
                        {r.requester?.name || "--"}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {r.requester?.email || "--"}
                        {r.requester?.phone ? ` · ${r.requester.phone}` : ""}
                      </div>
                    </td>
                    <td>
                      <TypePill type={r.type} />
                    </td>
                    <td>
                      {r.ib ? (
                        <>
                          <div className="text-xs font-medium">
                            {r.ib.name || "--"}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {r.ib.email || ""}
                          </div>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600">
                          <ShieldCheck size={12} /> Admin Team
                        </span>
                      )}
                    </td>
                    <td className="max-w-[180px] truncate text-xs text-[var(--text-muted)]">
                      {r.note || "--"}
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {fmtDateTime(r.createdAt)}
                    </td>
                    <td className="text-xs">
                      {r.respondedBy?.name || r.respondedBy?.email || "--"}
                    </td>
                    <td>
                      <StatusPill status={r.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/users/users/view/${r.requester?.id}`}
                          className="rounded-md border border-[var(--card-border)] p-1.5 hover:bg-[var(--hover-bg)]"
                          title="View user"
                        >
                          <Eye size={14} />
                        </Link>
                        {r.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(r);
                                setRejectReason("");
                              }}
                              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20"
                            >
                              Review
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DragScroll>
        <div className="flex items-center justify-between border-t border-[var(--card-border)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <span>
            {total} request{total === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={() => setPage(1)}
      />

      {/* REVIEW MODAL */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold">IB Access Request</h3>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {selected.requester?.name} · {selected.requester?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-1.5 hover:bg-[var(--hover-bg)]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-4 space-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Type</span>
                  <TypePill type={selected.type} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Routed To</span>
                  <span className="font-medium">
                    {selected.ib?.name || "Admin Team"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Requested</span>
                  <span>{fmtDateTime(selected.createdAt)}</span>
                </div>
                {selected.note ? (
                  <div>
                    <span className="text-[var(--text-muted)]">Note</span>
                    <p className="mt-1 rounded-lg bg-[var(--card-bg)] p-2">
                      {selected.note}
                    </p>
                  </div>
                ) : null}
              </div>

              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Rejection reason (optional — required only for reject)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Reason shown to the user..."
                className="mb-4 w-full rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-2.5 text-sm outline-none focus:border-[var(--primary)]"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={respond.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/20 disabled:opacity-50"
                >
                  <X size={14} /> Reject
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={respond.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check size={14} />
                  {respond.isPending ? "Saving..." : "Approve"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
