"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Globe,
  Mail,
  MessageSquareMore,
  Phone,
  RefreshCcw,
  User2,
  XCircle,
} from "lucide-react";
import { useInquiry, useUpdateInquiryStatus } from "@/hooks/useInquiry";
import { Inquiry } from "@/types/inquiry";
import Pagination from "../components/ui/pagination";
import GlobalLoader from "../components/ui/GlobalLoader";
import { Toast } from "../components/ui/Toast";
import DragScroll from "../components/ui/DragScroll";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

function StatusBadge({ status }: { status?: string }) {
  const s = String(status || "OPEN").toUpperCase();
  if (s === "CLOSED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
        <XCircle size={11} /> Closed
      </span>
    );
  }
  if (s === "REVIEWED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <CheckCircle2 size={11} /> Reviewed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      <Clock3 size={11} /> Open
    </span>
  );
}

export default function InquiryPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [toastMessage, setToastMessage] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const { data, isLoading, isError, error, refetch, isFetching } = useInquiry(
    page,
    limit,
    statusFilter || undefined
  );
  const updateStatus = useUpdateInquiryStatus();

  const inquiries = useMemo(() => data?.data ?? [], [data?.data]);

  const metrics = useMemo(() => {
    const firstDate = inquiries[0]?.createdAt;
    const lastDate = inquiries[inquiries.length - 1]?.createdAt;
    const open = inquiries.filter(
      (i) => String(i.status || "OPEN").toUpperCase() === "OPEN"
    ).length;
    const reviewed = inquiries.filter(
      (i) => String(i.status).toUpperCase() === "REVIEWED"
    ).length;
    const closed = inquiries.filter(
      (i) => String(i.status).toUpperCase() === "CLOSED"
    ).length;
    return {
      total: data?.total ?? 0,
      page: data?.page ?? page,
      totalPages: data?.totalPages ?? 1,
      latest: firstDate ? formatDate(firstDate) : "--",
      oldest: lastDate ? formatDate(lastDate) : "--",
      open,
      reviewed,
      closed,
    };
  }, [data?.page, data?.total, data?.totalPages, inquiries, page]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleCopy = async (value: string, label: "Email" | "Phone") => {
    if (!value || value === "--") return;
    try {
      await navigator.clipboard.writeText(value);
      setToastMessage(`${label} copied`);
    } catch {
      setToastMessage("Copy failed");
    }
  };

  const runStatus = async (
    item: Inquiry,
    status: "REVIEWED" | "CLOSED"
  ) => {
    try {
      await updateStatus.mutateAsync({
        id: item._id,
        status,
        adminNote: noteDrafts[item._id] || item.adminNote || "",
      });
      setToastMessage(
        status === "CLOSED" ? "Ticket closed" : "Ticket marked reviewed"
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setToastMessage(
        e?.response?.data?.message || e?.message || "Failed to update ticket"
      );
    }
  };

  return (
    <div className="container-pad space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            Inquiry / Tickets
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Review user tickets, mark as reviewed, and close them. Users see the same status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="CLOSED">Closed</option>
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium hover:bg-[var(--hover-bg)] disabled:opacity-60"
          >
            <RefreshCcw size={16} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Total Tickets
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            {metrics.total}
          </p>
        </div>
        <div className="card-elevated">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Open (this page)
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{metrics.open}</p>
        </div>
        <div className="card-elevated">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Reviewed (this page)
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">
            {metrics.reviewed}
          </p>
        </div>
        <div className="card-elevated">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Closed (this page)
          </p>
          <p className="mt-1 text-2xl font-semibold text-rose-600">{metrics.closed}</p>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        {isLoading ? (
          <div className="min-h-[260px] flex items-center justify-center">
            <GlobalLoader />
          </div>
        ) : isError ? (
          <div className="p-6">
            <div className="rounded-lg border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
              {(error as Error)?.message || "Failed to load inquiries."}
            </div>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-base font-medium text-[var(--foreground)]">
              No tickets found
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              New ticket records will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-3">
              {inquiries.map((item: Inquiry) => (
                <TicketCard
                  key={item._id}
                  item={item}
                  note={noteDrafts[item._id] ?? item.adminNote ?? ""}
                  onNoteChange={(v) =>
                    setNoteDrafts((prev) => ({ ...prev, [item._id]: v }))
                  }
                  onCopy={handleCopy}
                  onReview={() => runStatus(item, "REVIEWED")}
                  onClose={() => runStatus(item, "CLOSED")}
                  busy={updateStatus.isPending}
                />
              ))}
            </div>

            <DragScroll className="hidden md:block overflow-x-auto">
              <table className="table min-w-[1320px] w-full">
                <thead>
                  <tr>
                    <th>
                      <span className="inline-flex items-center gap-1.5">
                        <User2 size={14} /> User
                      </span>
                    </th>
                    <th>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquareMore size={14} /> Title
                      </span>
                    </th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>
                      <span className="inline-flex items-center gap-1.5">
                        <Globe size={14} /> IP
                      </span>
                    </th>
                    <th>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} /> Date
                      </span>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((item: Inquiry) => {
                    const status = String(item.status || "OPEN").toUpperCase();
                    const isClosed = status === "CLOSED";
                    const isReviewed = status === "REVIEWED" || isClosed;
                    return (
                      <tr key={item._id} className="border-t border-[var(--card-border)]">
                        <td>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-[var(--foreground)]">
                              {item.name}
                            </p>
                            <p className="font-mono text-[10px] text-[var(--text-muted)]">
                              {item.ticketId ||
                                `TKT-${String(item._id).slice(-8).toUpperCase()}`}
                            </p>
                            <div className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1.5">
                              <Mail size={12} /> {item.email || "--"}
                              <button
                                type="button"
                                onClick={() => handleCopy(item.email || "", "Email")}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                                aria-label="Copy email"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                            <div className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1.5">
                              <Phone size={12} /> {item.phone || "--"}
                              <button
                                type="button"
                                onClick={() => handleCopy(item.phone || "", "Phone")}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                                aria-label="Copy phone"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="inline-flex items-center rounded-full border border-[var(--card-border)] bg-[var(--input-bg)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]">
                            {item.title || "--"}
                          </span>
                        </td>
                        <td>
                          <p className="max-w-[280px] text-sm text-[var(--foreground)] leading-relaxed line-clamp-2">
                            {item.description || "--"}
                          </p>
                          <textarea
                            value={noteDrafts[item._id] ?? item.adminNote ?? ""}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({
                                ...prev,
                                [item._id]: e.target.value,
                              }))
                            }
                            placeholder="Optional support note for user"
                            rows={2}
                            disabled={isClosed}
                            className="mt-2 w-full max-w-[280px] rounded-md border border-[var(--card-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs outline-none disabled:opacity-60"
                          />
                        </td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>
                          <span className="font-mono text-xs rounded-md border border-[var(--card-border)] bg-[var(--input-bg)] px-2 py-1 inline-block">
                            {item.ip || "--"}
                          </span>
                        </td>
                        <td className="text-sm whitespace-nowrap">
                          <div>{formatDate(item.createdAt)}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {formatTime(item.createdAt)}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1.5 min-w-[120px]">
                            <button
                              type="button"
                              disabled={isReviewed || updateStatus.isPending}
                              onClick={() => runStatus(item, "REVIEWED")}
                              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              Mark Reviewed
                            </button>
                            <button
                              type="button"
                              disabled={isClosed || updateStatus.isPending}
                              onClick={() => runStatus(item, "CLOSED")}
                              className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-500/20 disabled:opacity-50"
                            >
                              Close Ticket
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DragScroll>
          </>
        )}
      </div>

      <Pagination
        page={data?.page ?? page}
        totalPages={data?.totalPages ?? 1}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
      />
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}

function TicketCard({
  item,
  note,
  onNoteChange,
  onCopy,
  onReview,
  onClose,
  busy,
}: {
  item: Inquiry;
  note: string;
  onNoteChange: (v: string) => void;
  onCopy: (value: string, label: "Email" | "Phone") => void;
  onReview: () => void;
  onClose: () => void;
  busy: boolean;
}) {
  const status = String(item.status || "OPEN").toUpperCase();
  const isClosed = status === "CLOSED";
  const isReviewed = status === "REVIEWED" || isClosed;

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--foreground)]">{item.name}</p>
          <p className="text-xs text-[var(--text-muted)]">{item.title}</p>
          <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
            {item.ticketId || `TKT-${String(item._id).slice(-8).toUpperCase()}`}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="grid grid-cols-1 gap-1.5 text-xs">
        <div className="inline-flex items-center justify-between gap-2 text-[var(--text-muted)]">
          <p className="inline-flex items-center gap-1.5">
            <Mail size={12} /> {item.email || "--"}
          </p>
          <button
            type="button"
            onClick={() => onCopy(item.email || "", "Email")}
            className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]"
          >
            <Copy size={11} />
          </button>
        </div>
        <div className="inline-flex items-center justify-between gap-2 text-[var(--text-muted)]">
          <p className="inline-flex items-center gap-1.5">
            <Phone size={12} /> {item.phone || "--"}
          </p>
          <button
            type="button"
            onClick={() => onCopy(item.phone || "", "Phone")}
            className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]"
          >
            <Copy size={11} />
          </button>
        </div>
        <p className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          <Globe size={12} /> {item.ip || "--"}
        </p>
        <p className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          <CalendarDays size={12} /> {formatDate(item.createdAt)} •{" "}
          {formatTime(item.createdAt)}
        </p>
      </div>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
          <MessageSquareMore size={12} /> Description
        </p>
        <p className="mt-1 text-xs text-[var(--foreground)] leading-relaxed">
          {item.description || "--"}
        </p>
      </div>

      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Optional support note for user"
        rows={2}
        disabled={isClosed}
        className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-2 text-xs outline-none disabled:opacity-60"
      />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isReviewed || busy}
          onClick={onReview}
          className="flex-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50"
        >
          Mark Reviewed
        </button>
        <button
          type="button"
          disabled={isClosed || busy}
          onClick={onClose}
          className="flex-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50"
        >
          Close Ticket
        </button>
      </div>
    </div>
  );
}
