export default function GlobalLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">

      {/* LOGO TEXT */}
      <div className="text-2xl font-extrabold tracking-wider">
        <span className="text-[var(--foreground)]">Admin</span>
      </div>

      {/* MARKET WAVE */}
      <div className="flex items-end gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="
              w-1.5
              rounded-full
              bg-gradient-to-t
              from-[var(--primary)]
              to-[var(--accent)]
              animate-pulse
            "
            style={{
              height: `${16 + i * 6}px`,
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>

      {/* SUB TEXT */}
      <p className="text-xs text-[var(--text-muted)] tracking-wide">
        Processing market data…
      </p>
    </div>
  );
}
