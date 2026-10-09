export function genCode(len = 6) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function fmtTime(d: string | Date) {
  const t = new Date(d);
  // display in Asia/Shanghai
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(t);
  const g = (k: string) => parts.find((p) => p.type === k)?.value || "";
  return `${g("month")}/${g("day")} ${g("hour")}:${g("minute")}`;
}

export const TOKEN_KINDS = ["guest", "screen", "report", "embed"] as const;
export type TokenKind = (typeof TOKEN_KINDS)[number];
