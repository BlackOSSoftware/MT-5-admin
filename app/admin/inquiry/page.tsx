"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Copy,
  Globe,
  Mail,
  MessageSquareMore,
  Phone,
  RefreshCcw,
  User2,
} from "lucide-react";
import { useInquiry } from "@/hooks/useInquiry";
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

export default function InquiryPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [toastMessage, setToastMessage] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useInquiry(
    page,
    limit
  );

  const inquiries = useMemo(() => data?.data ?? [], [data?.data]);

  const metrics = useMemo(() => {
    const firstDate = inquiries[0]?.createdAt;
    const lastDate = inquiries[inquiries.length - 1]?.createdAt;
    return {
      total: data?.total ?? 0,
      page: data?.page ?? page,
      totalPages: data?.totalPages ?? 1,
      latest: firstDate ? formatDate(firstDate) : "--",
      oldest: lastDate ? formatDate(lastDate) : "--",
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

  return (
    <div className="container-pad space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            Inquiry Management
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Track user inquiry details with contact info, IP address, and timestamps.
          </p>
        </div>

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Total Inquiries
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            {metrics.total}
          </p>
        </div>
        <div className="card-elevated">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Current Page
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            {metrics.page}
          </p>
        </div>
        <div className="card-elevated">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Latest Inquiry
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            {metrics.latest}
          </p>
        </div>
        <div className="card-elevated">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Oldest On Page
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            {metrics.oldest}
          </p>
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
              No inquiries found
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              New inquiry records will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-3">
              {inquiries.map((item: Inquiry) => (
                <div
                  key={item._id}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{item.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{item.title}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("en-GB")
                        : "Inquiry"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    <div className="inline-flex items-center justify-between gap-2 text-[var(--text-muted)]">
                      <p className="inline-flex items-center gap-1.5">
                        <Mail size={12} /> {item.email || "--"}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.email || "", "Email")}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                        aria-label="Copy email"
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
                        onClick={() => handleCopy(item.phone || "", "Phone")}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                        aria-label="Copy phone"
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
                </div>
              ))}
            </div>

            <DragScroll className="hidden md:block overflow-x-auto">
              <table className="table min-w-[1180px] w-full">
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
                    <th>
                      <span className="inline-flex items-center gap-1.5">
                        <Globe size={14} /> IP Address
                      </span>
                    </th>
                    <th>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} /> Date
                      </span>
                    </th>
                    <th>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={14} /> Time
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((item: Inquiry) => (
                    <tr key={item._id} className="border-t border-[var(--card-border)]">
                      <td>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[var(--foreground)]">{item.name}</p>
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
                        <p className="max-w-[360px] text-sm text-[var(--foreground)] leading-relaxed line-clamp-2">
                          {item.description || "--"}
                        </p>
                      </td>
                      <td>
                        <span className="font-mono text-xs rounded-md border border-[var(--card-border)] bg-[var(--input-bg)] px-2 py-1 inline-block">
                          {item.ip || "--"}
                        </span>
                      </td>
                      <td className="text-sm">{formatDate(item.createdAt)}</td>
                      <td className="text-sm">{formatTime(item.createdAt)}</td>
                    </tr>
                  ))}
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
