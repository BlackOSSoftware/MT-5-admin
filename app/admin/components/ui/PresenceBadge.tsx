"use client";

type Props = {
  online?: boolean;
  lastSeenAt?: string | null;
  size?: "sm" | "md";
};

function formatLastSeen(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PresenceBadge({
  online = false,
  lastSeenAt,
  size = "sm",
}: Props) {
  const lastSeen = formatLastSeen(lastSeenAt);
  const padding = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide ${padding} ${
        online
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
          : "border-slate-400/40 bg-slate-500/10 text-slate-600"
      }`}
      title={
        online
          ? "User is online"
          : lastSeen
            ? `Last seen ${lastSeen}`
            : "User is offline"
      }
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]" : "bg-slate-400"
        }`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}
