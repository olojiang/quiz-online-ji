"use client";
// Shared 评分 visuals: a star row (supports partial fill for averages) and a score distribution.

const STAR = "M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z";

export function StarRow({ value, max, size = 20, on = "#f59e0b", off = "#e5e7eb", className = "" }: { value: number | null; max: number; size?: number; on?: string; off?: string; className?: string }) {
  const v = value ?? 0;
  return (
    <span className={`inline-flex items-center ${className}`} aria-label={`${value ?? "-"} / ${max}`} role="img">
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" className="shrink-0" aria-hidden>
            <path d={STAR} fill={off} />
            {fill > 0 && (
              <>
                <defs><clipPath id={`sc-${i}-${Math.round(fill * 100)}`}><rect x="0" y="0" width={24 * fill} height="24" /></clipPath></defs>
                <path d={STAR} fill={on} clipPath={`url(#sc-${i}-${Math.round(fill * 100)})`} />
              </>
            )}
          </svg>
        );
      })}
    </span>
  );
}

/** Tap-to-rate input used on the guest page. */
export function StarInput({ value, max, onChange, disabled, color }: { value: number; max: number; onChange: (v: number) => void; disabled?: boolean; color: string }) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup">
      {Array.from({ length: max }, (_, i) => (
        <button key={i} type="button" disabled={disabled} role="radio" aria-checked={value === i + 1} aria-label={`${i + 1}`} onClick={() => onChange(i + 1)}
          className="p-0.5 disabled:cursor-default active:scale-90 transition-transform">
          <svg width={max > 7 ? 26 : 34} height={max > 7 ? 26 : 34} viewBox="0 0 24 24"><path d={STAR} fill={i < value ? color : "#e5e7eb"} /></svg>
        </button>
      ))}
    </div>
  );
}

export function ScoreInput({ value, max, onChange, disabled }: { value: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(max, 5)}, minmax(0, 1fr))` }} role="radiogroup">
      {Array.from({ length: max }, (_, i) => (
        <button key={i} type="button" disabled={disabled} role="radio" aria-checked={value === i + 1} onClick={() => onChange(i + 1)}
          className={`h-10 rounded-lg border text-sm font-medium tabular-nums transition ${value === i + 1 ? "bg-[color:var(--g-primary)] border-[color:var(--g-primary)] text-white" : "border-gray-200 text-gray-700"} disabled:cursor-default`}>
          {i + 1}
        </button>
      ))}
    </div>
  );
}

/** Horizontal distribution, highest score on top (like app-store ratings). */
export function DistRows({ dist, scale, barClass = "bg-amber-400", trackClass = "bg-gray-100", labelClass = "text-gray-500" }: { dist: number[]; scale: string; barClass?: string; trackClass?: string; labelClass?: string }) {
  const total = dist.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...dist);
  return (
    <div className="space-y-1">
      {dist.map((_, k) => dist.length - 1 - k).map((i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className={`w-9 text-right tabular-nums ${labelClass}`}>{i + 1}{scale === "star" ? "★" : ""}</span>
          <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${trackClass}`}><div className={`h-full rounded-full transition-all duration-700 ${barClass}`} style={{ width: `${(dist[i] / max) * 100}%` }} /></div>
          <span className={`w-14 tabular-nums ${labelClass}`}>{dist[i]}{total ? ` · ${Math.round((dist[i] / total) * 100)}%` : ""}</span>
        </div>
      ))}
    </div>
  );
}
