"use client";
import { useT } from "@/components/i18n";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/* ---------------- API helper ---------------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const err = new Error((data as { error?: string })?.error || `请求失败 (${res.status})`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

/* ---------------- Icons (inline, no external assets) ---------------- */
const P: Record<string, string> = {
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z",
  pin: "M12 3v4M7 7h10M8 7l-1 7h10l-1-7M12 14v7",
  top: "M5 4h14M12 20V8M7 13l5-5 5 5",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  like: "M7 10v10H4V10zM7 10l4-7c1.2 0 2.5 1 2.2 2.6L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7",
  comment: "M4 5h16v11H9l-5 4z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  filter: "M4 5h16l-6 8v6l-4-2v-4z",
  archive: "M4 5h16v4H4zM5 9v10h14V9M10 13h4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  phone: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2",
  screen: "M3 4h18v12H3zM8 20h8M12 16v4M9 9l2 2 4-4",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  copy: "M8 8h12v12H8zM4 16V4h12",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  window: "M4 4h16v16H4zM4 9h16",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  hi: "M4 5h16v14H4zM8.5 9v6M8.5 12h3M11.5 9v6M15 9v6",
  play: "M8 5v14l11-7z",
  pause: "M8 5v14M16 5v14",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6",
  user: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM4 21a8 8 0 0 1 16 0",
  back: "M15 5l-7 7 7 7",
  chevron: "M6 9l6 6 6-6",
  left: "M15 6l-6 6 6 6",
  right: "M9 6l6 6-6 6",
  first: "M17 6l-6 6 6 6M7 6v12",
  last: "M7 6l6 6-6 6M17 6v12",
  zoomIn: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M8 11h6M11 8v6",
  zoomOut: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M8 11h6",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z",
  qa: "M4 5h16v11H9l-5 4zM9 10h6",
  poll: "M4 6h3M4 12h3M4 18h3M10 6h10M10 12h10M10 18h10",
  quiz: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6",
  open: "M4 5h16v11H9l-5 4zM10 8l-1 6M14 8l-1 6M8.5 10h6M8 12.5h6",
  cloud: "M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18z",
  rate: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z",
  danmu: "M4 5h16v14H4zM7 9h7M7 12h10M7 15h5",
  lottery: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  flag: "M5 21V4h11l-1.5 4L16 12H5",
  stop: "M7 7h10v10H7z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  feature: "M3 5h18v12H3zM7 21h10M10 9l5 2.5-5 2.5z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01",
};
export type IconName = keyof typeof P;
export function Icon({ name, className = "w-4 h-4", strokeWidth = 1.8 }: { name: IconName | string; className?: string; strokeWidth?: number }) {
  const filled = name === "play";
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={name === "more" ? 3 : strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name] || ""} />
    </svg>
  );
}

/* ---------------- Toast + Confirm ---------------- */
type Toast = { id: number; msg: string; kind: "success" | "error" | "info" };
type ConfirmOpts = { title: string; message?: string; confirmText?: string; danger?: boolean };
const UICtx = createContext<{
  toast: (msg: string, kind?: Toast["kind"]) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
}>({ toast: () => {}, confirm: async () => false });

export function UIProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [conf, setConf] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const toast = useCallback((msg: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 2800);
  }, []);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setConf({ ...o, resolve })), []);
  const close = (v: boolean) => { conf?.resolve(v); setConf(null); };
  return (
    <UICtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((tt) => (
          <div key={tt.id} className={`animate-toast pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm shadow-lg border ${tt.kind === "error" ? "bg-red-50 border-red-200 text-red-700" : tt.kind === "info" ? "bg-white border-gray-200 text-gray-700" : "bg-white border-emerald-200 text-gray-800"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${tt.kind === "error" ? "bg-red-500" : tt.kind === "info" ? "bg-brand-500" : "bg-emerald-500"} text-white`}>
              <Icon name={tt.kind === "error" ? "x" : tt.kind === "info" ? "info" : "check"} className="w-3 h-3" strokeWidth={3} />
            </span>
            {t(tt.msg)}
          </div>
        ))}
      </div>
      {conf && (
        <Modal onClose={() => close(false)} width="max-w-sm">
          <div className="p-6">
            <h3 className="text-base font-semibold text-gray-900">{conf.title}</h3>
            {conf.message && <p className="mt-2 text-sm text-gray-500 leading-relaxed">{conf.message}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => close(false)}>{t("取消")}</button>
              <button className={`btn ${conf.danger ? "btn-danger" : "btn-primary"}`} onClick={() => close(true)} autoFocus>{conf.confirmText || t("确定")}</button>
            </div>
          </div>
        </Modal>
      )}
    </UICtx.Provider>
  );
}
export const useUI = () => useContext(UICtx);

/* ---------------- Modal ---------------- */
export function Modal({ children, onClose, width = "max-w-lg", title }: { children: React.ReactNode; onClose: () => void; width?: string; title?: React.ReactNode }) {
  const t = useT();
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-[2px] p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`animate-pop w-full ${width} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-auto scrollbar-thin`}>
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <button className="text-gray-400 hover:text-gray-600 rounded-md p-1" onClick={onClose} aria-label={t("关闭")}><Icon name="x" className="w-5 h-5" /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------------- Misc ---------------- */
export function Spinner({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
}
export function PageLoader({ text = "加载中…" }: { text?: string }) {
  return <div className="flex flex-col items-center justify-center gap-3 py-24 text-gray-400"><Spinner className="w-7 h-7 text-brand-500" /><span className="text-sm">{text}</span></div>;
}
export function EmptyState({ icon = "info", title, desc, action }: { icon?: string; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mb-4"><Icon name={icon} className="w-7 h-7" /></div>
      <div className="text-[15px] font-medium text-gray-800">{title}</div>
      {desc && <div className="mt-1.5 text-sm text-gray-500 max-w-sm leading-relaxed">{desc}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
const AV_COLORS = ["#7c3aed", "#4f46e5", "#2563eb", "#0369a1", "#0f766e", "#047857", "#b45309", "#c2410c", "#be185d", "#9333ea"];
export function Avatar({ name, size = 36, bg: bgOverride, fg }: { name: string; size?: number; bg?: string; fg?: string }) {
  const t = useT();
  let h = 0;
  for (const c of name || "?") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bg = bgOverride || AV_COLORS[h % AV_COLORS.length];
  return (
    <div className="shrink-0 rounded-full flex items-center justify-center text-white font-semibold" style={{ width: size, height: size, background: bg, color: fg || "#fff", fontSize: size * 0.42 }}>
      {(name || "?").trim().slice(0, 1).toUpperCase()}
    </div>
  );
}
export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-brand-600" : "bg-gray-300"}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

export function Dropdown({ trigger, children, align = "right", width = "w-72" }: { trigger: (open: boolean) => React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; width?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div className={`animate-pop absolute z-50 mt-2 ${width} ${align === "right" ? "right-0" : "left-0"} rounded-xl bg-white shadow-xl border border-gray-100 py-2`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
export function MenuItem({ icon, title, desc, onClick, active, right, danger }: { icon?: string; title: string; desc?: string; onClick?: () => void; active?: boolean; right?: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50 ${active ? "text-brand-600" : danger ? "text-red-600" : "text-gray-800"}`}>
      {icon && <Icon name={icon} className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "text-brand-600" : danger ? "text-red-500" : "text-gray-400"}`} />}
      <span className="flex-1 min-w-0">
        <span className="block text-sm">{title}</span>
        {desc && <span className="block text-xs text-gray-400 mt-0.5">{desc}</span>}
      </span>
      {right}
    </button>
  );
}

export function QR({ text, size = 200, className = "" }: { text: string; size?: number; className?: string }) {
  const t = useT();
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!text) return;
    QRCode.toDataURL(text, { width: size * 2, margin: 1, errorCorrectionLevel: "M" }).then(setSrc).catch(() => setSrc(""));
  }, [text, size]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="二维码" width={size} height={size} className={className} style={{ width: size, height: size }} /> : <div style={{ width: size, height: size }} className={`bg-gray-100 animate-pulse rounded ${className}`} />;
}

export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  }
}

export function usePoll<T>(fn: () => Promise<T>, ms: number, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<(Error & { status?: number }) | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(async () => {
    try { setData(await fnRef.current()); setError(null); } catch (e) { setError(e as Error); }
  }, []);
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!alive) return;
      if (document.visibilityState !== "hidden") await reload();
      if (alive) t = setTimeout(tick, ms);
    };
    tick();
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, reload, setData };
}

export const ROLE_LABEL: Record<string, string> = { super_admin: "超级管理员", event_admin: "活动管理员", moderator: "审核员", presenter: "主持人/投屏操作员" };
export const STATUS_STYLE: Record<string, string> = { upcoming: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", live: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", ended: "bg-gray-100 text-gray-500 ring-1 ring-gray-200" };
