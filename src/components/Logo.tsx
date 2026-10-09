/** Quiz Online Ji mark: speech bubble with a "Q" whose tail is a spark. Self-contained SVG, no external assets. */
export function LogoMark({ size = 32, white = false }: { size?: number; white?: boolean }) {
  const id = "qoj-g";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={id} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <path d="M14 6h36a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10H30l-11 9a1.6 1.6 0 0 1-2.6-1.3V50H14A10 10 0 0 1 4 40V16A10 10 0 0 1 14 6z" fill={white ? "rgba(255,255,255,0.18)" : `url(#${id})`} stroke={white ? "rgba(255,255,255,0.9)" : "none"} strokeWidth={white ? 2 : 0} />
      <circle cx="31" cy="27" r="11" fill="none" stroke="#fff" strokeWidth="5" />
      <path d="M36 32l7.5 7.5" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="48.5" cy="15.5" r="3" fill="#fde68a" />
    </svg>
  );
}

export function AppLogo({ size = 30, white = false, text = false, className = "" }: { size?: number; white?: boolean; text?: boolean | string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <LogoMark size={size} white={white} />
      {text && <span>{typeof text === "string" ? text : "Quiz Online Ji"}</span>}
    </span>
  );
}
