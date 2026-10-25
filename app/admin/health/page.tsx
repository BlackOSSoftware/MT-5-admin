"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cpu,
  MemoryStick,
  RefreshCcw,
  ServerCog,
  TerminalSquare,
} from "lucide-react";
import { useHealthStatus } from "@/hooks/useHealthStatus";
import type { HealthLogEntry } from "@/types/health";
import GlobalLoader from "../components/ui/GlobalLoader";

const DEFAULT_HEALTH_ENDPOINT = "http://localhost:4000/api/v1/health";

const formatBytes = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const formatUptime = (seconds?: number) => {
  if (seconds === undefined || Number.isNaN(seconds)) return "--";
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  if (minutes || hours || days) parts.push(`${minutes}m`);
  parts.push(`${remainingSeconds}s`);
  return parts.join(" ");
};

const formatDateTime = (value?: string | number) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const normalizeLog = (entry: HealthLogEntry, index: number) => {
  if (typeof entry === "string") {
    return {
      id: `log-${index}`,
      level: "INFO",
      timestamp: "",
      message: entry,
    };
  }

  return {
    id: `log-${index}`,
    level: (entry.level ?? "INFO").toUpperCase(),
    timestamp: entry.timestamp ? formatDateTime(entry.timestamp) : "",
    message:
      entry.message ??
      (() => {
        try {
          return JSON.stringify(entry);
        } catch {
          return "Unable to parse log entry";
        }
      })(),
  };
};

export default function HealthPage() {
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } =
    useHealthStatus();

  const endpoint =
    process.env.NEXT_PUBLIC_HEALTH_API_URL || DEFAULT_HEALTH_ENDPOINT;

  const statusValue = (data?.status || "UNKNOWN").toUpperCase();
  const isHealthy = statusValue === "UP";

  const cpuStats = useMemo(() => {
    const source = data?.cpuLoad ?? [];
    return [source[0] ?? 0, source[1] ?? 0, source[2] ?? 0];
  }, [data?.cpuLoad]);

  const normalizedLogs = useMemo(
    () => (data?.last15Logs ?? []).map((entry, index) => normalizeLog(entry, index)),
    [data?.last15Logs]
  );

  return (
    <div className="container-pad space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            System Health
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Real-time health telemetry for backend service availability and resources
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2 break-all">
            Endpoint: {endpoint}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
              isHealthy
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                : "border-rose-500/40 bg-rose-500/10 text-rose-700"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-rose-500"}`}
            />
            {isHealthy ? "Service Online" : "Service Degraded"}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium hover:bg-[var(--hover-bg)] disabled:opacity-60"
          >
            <RefreshCcw size={15} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card-elevated min-h-[260px] flex items-center justify-center">
          <GlobalLoader />
        </div>
      ) : isError ? (
        <div className="card-elevated border border-rose-300/40 bg-rose-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-rose-600" size={20} />
            <div>
              <h2 className="text-base font-semibold text-rose-700">
                Failed to fetch health status
              </h2>
              <p className="text-sm text-rose-600 mt-1">
                {(error as Error)?.message || "Unable to load health data."}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card-elevated">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    Service Status
                  </p>
                  <p
                    className={`mt-2 text-2xl font-bold ${
                      isHealthy ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {statusValue}
                  </p>
                </div>
                <span
                  className={`rounded-lg p-2 ${
                    isHealthy
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-rose-500/10 text-rose-600"
                  }`}
                >
                  {isHealthy ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </span>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Last updated: {formatDateTime(dataUpdatedAt)}
              </p>
            </div>

            <div className="card-elevated">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    Uptime
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
                    {formatUptime(data?.uptime)}
                  </p>
                </div>
                <span className="rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] p-2">
                  <Clock3 size={18} />
                </span>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Started since process boot
              </p>
            </div>

            <div className="card-elevated">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    Process ID
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
                    {data?.pid ?? "--"}
                  </p>
                </div>
                <span className="rounded-lg bg-sky-500/10 text-sky-600 p-2">
                  <ServerCog size={18} />
                </span>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Runtime process identifier
              </p>
            </div>

            <div className="card-elevated">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    Last Check
                  </p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                    {formatDateTime(data?.timestamp)}
                  </p>
                </div>
                <span className="rounded-lg bg-amber-500/10 text-amber-600 p-2">
                  <Activity size={18} />
                </span>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Health ping timestamp
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="card-elevated">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Memory Metrics
                </h2>
                <MemoryStick size={18} className="text-[var(--primary)]" />
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">RSS</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    {formatBytes(data?.memory?.rss)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Resident memory in physical RAM
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">Heap Used</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    {formatBytes(data?.memory?.heapUsed)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    JavaScript heap currently consumed
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                  <p className="text-xs text-[var(--text-muted)]">Available RAM</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    {data?.memory?.availableRam || "--"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Remaining host memory reported by backend
                  </p>
                </div>
              </div>
            </div>

            <div className="card-elevated">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  CPU Load
                </h2>
                <Cpu size={18} className="text-[var(--primary)]" />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {cpuStats.map((value, index) => {
                  const safeValue = Number(value) || 0;
                  const barWidth = Math.min(100, Math.max(0, safeValue * 100));
                  const bucketLabel = index === 0 ? "1m" : index === 1 ? "5m" : "15m";

                  return (
                    <div
                      key={bucketLabel}
                      className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3"
                    >
                      <p className="text-xs text-[var(--text-muted)]">Load Avg ({bucketLabel})</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                        {safeValue.toFixed(2)}
                      </p>
                      <div className="mt-3 h-2 w-full rounded-full bg-[var(--hover-bg)] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            safeValue < 0.7
                              ? "bg-emerald-500"
                              : safeValue < 1
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card-elevated">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Recent Logs</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">Last 15 backend log entries</p>
              </div>
              <TerminalSquare size={18} className="text-[var(--primary)]" />
            </div>

            {normalizedLogs.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No recent logs available from the health endpoint.
              </div>
            ) : (
              <div className="mt-4 space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {normalizedLogs.map((log) => {
                  const level =
                    log.level === "ERROR" || log.level === "WARN"
                      ? "text-rose-600"
                      : log.level === "DEBUG"
                      ? "text-amber-600"
                      : "text-emerald-600";

                  return (
                    <div
                      key={log.id}
                      className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`font-semibold uppercase ${level}`}>{log.level}</span>
                        {log.timestamp ? (
                          <span className="text-[var(--text-muted)]">{log.timestamp}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[var(--foreground)] break-words">
                        {log.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
