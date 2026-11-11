"use client";

type PaginationProps = {
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export default function Pagination({
  page,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  return (
    <div
      className="
        mt-4 sm:mt-6
        flex flex-row items-center justify-between gap-2
        rounded-2xl
        border border-[var(--card-border)]
        bg-[var(--card-bg)]
        p-3 sm:p-4
      "
    >
      {/* LEFT - LIMIT */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          Rows
        </span>

        <div className="relative">
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="
              appearance-none rounded-lg px-2.5 py-1.5 pr-8 text-xs sm:text-sm font-medium
              bg-[var(--input-bg)]
              border border-[var(--input-border)]
              focus:outline-none
              focus:ring-2 focus:ring-[var(--primary)]/30
            "
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            ▾
          </span>
        </div>
      </div>

      {/* RIGHT - PAGINATION */}
      <div className="flex flex-row items-center gap-2 sm:flex-row">
        {/* PAGE INFO */}
        <span className="hidden sm:inline text-[10px] sm:text-xs text-[var(--text-muted)]">
          Page <span className="font-semibold">{page}</span> of{" "}
          <span className="font-semibold">{totalPages}</span>
        </span>

        {/* CONTROLS */}
        <div className="flex items-center gap-1">
          <PageBtn
            disabled={page === 1}
            onClick={() => onPageChange(1)}
            label="First"
            className="hidden sm:inline-flex"
          >
            {"<<"}
          </PageBtn>

          <PageBtn
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            label="Previous"
          >
            {"<"}
          </PageBtn>

          {/* CURRENT PAGE */}
          <div
            className="
              mx-1 min-w-[28px]
              rounded-md
              bg-[var(--primary)]
              px-2 py-1
              text-center text-[10px] sm:text-sm font-semibold
              text-white
            "
          >
            {page}
          </div>

          <PageBtn
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            label="Next"
          >
            {">"}
          </PageBtn>

          <PageBtn
            disabled={page === totalPages}
            onClick={() => onPageChange(totalPages)}
            label="Last"
            className="hidden sm:inline-flex"
          >
            {">>"}
          </PageBtn>
        </div>
      </div>
    </div>
  );
}

/* ================= BUTTON ================= */

function PageBtn({
  children,
  disabled,
  onClick,
  label,
  className,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`
        min-w-[24px] sm:min-w-[36px]
        rounded-md px-1.5 py-1 sm:px-3 sm:py-2
        text-[10px] sm:text-sm font-medium
        bg-[var(--input-bg)]
        border border-[var(--input-border)]
        transition
        hover:bg-[var(--hover-bg)]
        active:scale-95
        disabled:opacity-40
        disabled:cursor-not-allowed
        ${className ?? ""}
      `}
    >
      {children}
    </button>
  );
}
