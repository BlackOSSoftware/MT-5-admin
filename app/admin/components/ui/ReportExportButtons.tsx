"use client";

import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";

export default function ReportExportButtons({
  onCsv,
  onPdf,
  loading = false,
  disabled = false,
}: {
  onCsv: () => void;
  onPdf: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onCsv}
        disabled={isDisabled}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--hover-bg)] disabled:opacity-50"
        title="Download report as CSV"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileSpreadsheet size={14} className="text-emerald-600" />
        )}
        CSV
      </button>
      <button
        type="button"
        onClick={onPdf}
        disabled={isDisabled}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--hover-bg)] disabled:opacity-50"
        title="Generate PDF report (opens print dialog)"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileDown size={14} className="text-rose-600" />
        )}
        PDF
      </button>
    </div>
  );
}
