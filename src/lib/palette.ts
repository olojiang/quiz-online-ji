// Theme palette derivation with WCAG contrast guarantees. No dependencies.
import { GUEST_THEMES, SCREEN_THEMES, isHex } from "./types";

type RGB = [number, number, number];
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]: RGB) {
  return "#" + [r, g, b].map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("");
}
function rgbToHsl([r, g, b]: RGB): RGB {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb([h, s, l]: RGB): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
export function lum(hex: string) {
  const c = hexToRgb(hex).map((x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}
/** Lower HSL lightness until `fg` reaches `ratio` on it (keeps hue & saturation → stays harmonious). */
export function darkenFor(bg: string, fg: string, ratio: number) {
  const [h, s, l0] = rgbToHsl(hexToRgb(bg));
  let l = l0, out = bg;
  while (contrast(out, fg) < ratio && l > 0.02) { l -= 0.01; out = rgbToHex(hslToRgb([h, s, l])); }
  return out;
}
/** Lower lightness by a fixed amount */
export function shade(hex: string, dl: number, ds = 0) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h, clamp(s + ds), clamp(l - dl)]));
}
export function withHue(hex: string, s: number, l: number) {
  const [h, s0] = rgbToHsl(hexToRgb(hex));
  // achromatic bases (gray/white/black) get a neutral slate instead of an arbitrary hue
  if (s0 < 0.08) return rgbToHex(hslToRgb([0.6, Math.min(s, 0.2), l]));
  return rgbToHex(hslToRgb([h, s, l]));
}
function rgba(hex: string, a: number) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

const WHITE = "#ffffff";

export function resolveColor(v: string | undefined, presets: Record<string, { color: string }>, fallback: string) {
  if (v && isHex(v)) return v.toLowerCase();
  return presets[v || ""]?.color || presets[fallback].color;
}

export interface ScreenPalette {
  bg: string; bg2: string; fg: string; muted: string; card: string; cardFg: string; cardMuted: string; border: string;
  track: string; bar: string; accent: string; featuredBg: string; featuredFg: string; featuredMuted: string; featuredAccent: string;
  badgeBg: string; badgeFg: string; mode: "dark" | "light";
  /** extras (curated presets set these; derived themes get neutral defaults) */
  title: string; titleGrad: string; head: string; cardLine: string; barGrad: string; qrRing: string; featOn: string;
  star: string; starOff: string; confetti: string[];
}

const DEFAULT_CONFETTI = ["#fcd34d", "#f472b6", "#60a5fa", "#34d399", "#f97316", "#a78bfa"];
const GOLD_GRAD = "linear-gradient(180deg, #f6e3ad 0%, #d9b968 48%, #b08a3e 100%)";

/** Hand-tuned big-screen palettes for curated presets (keys from SCREEN_THEMES). */
const SCREEN_SPECS: Record<string, ScreenPalette> = {
  // 黑金 — near-black stage, champagne gold accents, warm ivory text
  blackgold: {
    mode: "dark", bg: "#0b0b0d", bg2: "#1d1a15", fg: "#f3ebd9", muted: "#cdb88a", card: "#18171a", cardFg: "#f3ebd9", cardMuted: "#bfae8a",
    border: "rgba(212,178,106,.28)", track: "rgba(212,178,106,.14)", bar: "#d4b26a", accent: "#d4b26a",
    featuredBg: "#f6efdf", featuredFg: "#17140e", featuredMuted: "#5c5243", featuredAccent: "#7a5a22",
    badgeBg: "#d4b26a", badgeFg: "#141210",
    title: "transparent", titleGrad: GOLD_GRAD, head: "#e2c47f", cardLine: "rgba(212,178,106,.26)",
    barGrad: "linear-gradient(90deg, #a8823a, #d4b26a 55%, #f1d998)", qrRing: "#c9a45c", featOn: "#fdf8ec",
    star: "#e2c47f", starOff: "rgba(243,235,217,.28)", confetti: ["#d4b26a", "#f3dfa6", "#b08a3e", "#fff4d6", "#8a6a2c", "#e9c77b"],
  },
  // 墨绿 — deep ink green, jade/sage accents, cream text
  inkgreen: {
    mode: "dark", bg: "#0c3326", bg2: "#17543f", fg: "#f4efe1", muted: "#c7dccd", card: "#0a2c21", cardFg: "#f4efe1", cardMuted: "#b5ccbd",
    border: "rgba(168,213,185,.24)", track: "rgba(168,213,185,.16)", bar: "#9fd0b2", accent: "#9fd0b2",
    featuredBg: "#f6f2e6", featuredFg: "#10241c", featuredMuted: "#4a5c53", featuredAccent: "#1b6a4e",
    badgeBg: "#a8d5b9", badgeFg: "#0c3326",
    title: "#f4efe1", titleGrad: "none", head: "#cfe6d8", cardLine: "rgba(168,213,185,.18)",
    barGrad: "linear-gradient(90deg, #5fa883, #a8d5b9)", qrRing: "#a8d5b9", featOn: "#ffffff",
    star: "#e6cf8f", starOff: "rgba(244,239,225,.3)", confetti: ["#8fc9a8", "#f4efe1", "#d9c38c", "#5fa883", "#cfe6d8", "#e8d9a8"],
  },
  // 暖橙 — warm amber glow with cream surfaces; dark cocoa text
  warmorange: {
    mode: "light", bg: "#e4712c", bg2: "#f6a85e", fg: "#2c1407", muted: "#4a230b", card: "#fff8ef", cardFg: "#3a2414", cardMuted: "#7d5133",
    border: "rgba(58,36,20,.16)", track: "rgba(196,86,26,.12)", bar: "#d9661f", accent: "#b9531a",
    featuredBg: "#fffdf8", featuredFg: "#2c1a0e", featuredMuted: "#7d5133", featuredAccent: "#b9531a",
    badgeBg: "#b9531a", badgeFg: "#fff8ef",
    title: "#2c1407", titleGrad: "none", head: "#2c1407", cardLine: "rgba(185,83,26,.14)",
    barGrad: "linear-gradient(90deg, #e8772e, #f4a259)", qrRing: "#fff3e3", featOn: "#ffffff",
    star: "#d9661f", starOff: "rgba(58,36,20,.22)", confetti: ["#fff4e6", "#fcd9a8", "#b9531a", "#ffe08a", "#7a3410", "#ffffff"],
  },
  // 黑白灰极简 — key "gray" kept (was the plain light-gray theme)
  gray: {
    mode: "light", bg: "#ececec", bg2: "#fafafa", fg: "#111111", muted: "#525252", card: "#ffffff", cardFg: "#111111", cardMuted: "#5c5c5c",
    border: "rgba(0,0,0,.12)", track: "rgba(0,0,0,.07)", bar: "#111111", accent: "#111111",
    featuredBg: "#111111", featuredFg: "#ffffff", featuredMuted: "#bdbdbd", featuredAccent: "#ffffff",
    badgeBg: "#111111", badgeFg: "#ffffff",
    title: "#0a0a0a", titleGrad: "none", head: "#111111", cardLine: "#e2e2e2",
    barGrad: "#111111", qrRing: "#111111", featOn: "#111111",
    star: "#111111", starOff: "rgba(0,0,0,.18)", confetti: ["#111111", "#555555", "#9a9a9a", "#cfcfcf", "#2b2b2b", "#777777"],
  },
};

/**
 * Big-screen palette. Text on the background is ≥ 3:1 (all screen text there is ≥ 24px = WCAG "large");
 * text on cards is ≥ 4.5:1 (AA normal) so even small labels pass.
 */
export function screenPalette(v: string | undefined): ScreenPalette {
  const key = v && !isHex(v) ? v : "";
  if (SCREEN_SPECS[key]) return SCREEN_SPECS[key];
  return { ...derivedScreen(v), ...EXTRAS_FOR_DERIVED };
}
type DerivedScreen = Omit<ScreenPalette, "title" | "titleGrad" | "head" | "cardLine" | "barGrad" | "qrRing" | "featOn" | "star" | "starOff" | "confetti">;
const EXTRAS_FOR_DERIVED = { title: "currentColor", titleGrad: "none", head: "currentColor", cardLine: "transparent", qrRing: "transparent", featOn: "#ffffff", confetti: DEFAULT_CONFETTI };
function derivedScreen(v: string | undefined): DerivedScreen & { barGrad: string; star: string; starOff: string } {
  const base = resolveColor(v, SCREEN_THEMES, "orange");
  const light = contrast(base, "#111827") > contrast(base, WHITE) && lum(base) > 0.45;
  if (light) {
    const fg = darkenFor(withHue(base, 0.25, 0.2), base, 7);
    const card = mix(base, WHITE, 0.65);
    const cardFg = darkenFor(withHue(base, 0.25, 0.18), card, 7);
    const muted = darkenFor(withHue(base, 0.12, 0.38), base, 4.5);
    const accent = darkenFor(withHue(base, 0.55, 0.45), card, 4.5);
    return {
      mode: "light", bg: base, bg2: mix(base, WHITE, 0.25), fg, muted, card, cardFg, cardMuted: darkenFor(withHue(base, 0.12, 0.4), card, 4.5),
      border: rgba(fg, 0.12), track: rgba(fg, 0.1), bar: accent, accent,
      featuredBg: WHITE, featuredFg: "#111827", featuredMuted: "#4b5563", featuredAccent: accent,
      badgeBg: accent, badgeFg: WHITE, barGrad: accent, star: accent, starOff: "rgba(0,0,0,0.32)",
    };
  }
  const bg = darkenFor(base, WHITE, 3.1);
  // very dark backgrounds get a slightly lifted card instead of an even darker one
  const card = lum(bg) < 0.04 && contrast(mix(bg, WHITE, 0.1), WHITE) >= 7 ? mix(bg, WHITE, 0.1) : darkenFor(shade(bg, 0.14, -0.3), WHITE, 7);
  const cardMuted = mix(WHITE, card, 0.22);
  const featuredAccent = darkenFor(base, WHITE, 4.5);
  return {
    mode: "dark", bg, bg2: darkenFor(shade(bg, -0.06), WHITE, 3), fg: WHITE, muted: WHITE, card, cardFg: WHITE,
    cardMuted: contrast(cardMuted, card) >= 4.5 ? cardMuted : "#e5e7eb",
    border: "rgba(255,255,255,0.18)", track: "rgba(255,255,255,0.22)", bar: WHITE, accent: WHITE,
    featuredBg: WHITE, featuredFg: "#111827", featuredMuted: "#4b5563", featuredAccent,
    badgeBg: WHITE, badgeFg: featuredAccent, barGrad: WHITE, star: "#fcd34d", starOff: "rgba(255,255,255,0.45)",
  };
}

export function screenVars(v: string | undefined) {
  const p = screenPalette(v);
  return {
    "--s-bg": p.bg, "--s-bg2": p.bg2, "--s-fg": p.fg, "--s-muted": p.muted, "--s-card": p.card, "--s-card-fg": p.cardFg,
    "--s-card-muted": p.cardMuted, "--s-border": p.border, "--s-track": p.track, "--s-bar": p.bar, "--s-accent": p.accent,
    "--s-feat-bg": p.featuredBg, "--s-feat-fg": p.featuredFg, "--s-feat-muted": p.featuredMuted, "--s-feat-accent": p.featuredAccent,
    "--s-badge-bg": p.badgeBg, "--s-badge-fg": p.badgeFg,
    "--s-title": p.title, "--s-title-grad": p.titleGrad, "--s-head": p.head, "--s-card-line": p.cardLine, "--s-bar-grad": p.barGrad,
    "--s-qr-ring": p.qrRing, "--s-feat-on": p.featOn,
    ...Object.fromEntries(p.confetti.map((c, i) => [`--s-cf${i}`, c])),
  } as Record<string, string>;
}

export interface GuestPalette {
  primary: string; on: string; hover: string; text: string; soft: string; softBorder: string; page: string; headerMuted: string;
  /** desktop-only framing: backdrop behind the centred card (top band → base), card edge, muted text on the backdrop */
  backdropTop: string; backdrop: string; frameBorder: string; backdropMuted: string;
  /** header gradient end (deeper, same hue) and a light glow tint for decorative shapes */
  primary2: string; glow: string;
  /** extras: hero title colour / gradient, hairline under the hero, highlight in the hero, star colour, desktop frame shadow, win banner */
  title: string; titleGrad: string; heroLine: string; heroShine: string; star: string; frameShadow: string; winGrad: string; iconFg: string;
  /** guest avatar background override ("initial" = keep the per-name colourful gradient) */
  avatar: string;
}

const FRAME_SHADOW = "0 1px 2px rgba(16,24,40,.05), 0 12px 32px -8px rgba(16,24,40,.14), 0 32px 64px -24px rgba(16,24,40,.12)";
const WIN_GRAD = "linear-gradient(135deg, #f59e0b 0%, #f97316 45%, #e11d48 100%)";
const GUEST_EXTRAS = { title: "currentColor", titleGrad: "none", heroLine: "transparent", heroShine: "rgba(255,255,255,.22)", frameShadow: FRAME_SHADOW, winGrad: WIN_GRAD, iconFg: "#ffffff", avatar: "initial" };

/** Hand-tuned guest palettes for curated presets (keys from GUEST_THEMES). Body stays light (white cards) for readability. */
const GUEST_SPECS: Record<string, GuestPalette> = {
  blackgold: {
    primary: "#141416", on: "#f3ebd9", hover: "#26252a", text: "#7a5a22", soft: "#f7f0df", softBorder: "#e3cf9f", page: "#f6f3ec", headerMuted: "#d9c290",
    primary2: "#050506", glow: "#6b5530", backdropTop: "#221e18", backdrop: "#111113", frameBorder: "rgba(212,178,106,.35)", backdropMuted: "#cdb88a",
    title: "transparent", titleGrad: GOLD_GRAD, heroLine: "rgba(212,178,106,.55)", heroShine: "rgba(230,200,130,.16)", star: "#a8823a",
    frameShadow: "0 0 0 1px rgba(212,178,106,.18), 0 24px 60px -18px rgba(0,0,0,.7)", winGrad: "linear-gradient(135deg, #1a1712 0%, #3a2f1a 45%, #8a6a2c 100%)", iconFg: "#e2c47f", avatar: "linear-gradient(135deg, #3a3326, #121214)",
  },
  inkgreen: {
    primary: "#134e3a", on: "#f4efe1", hover: "#0f3d2e", text: "#1b6a4e", soft: "#e8f2ec", softBorder: "#a8d5b9", page: "#f5f4ee", headerMuted: "#c7dccd",
    primary2: "#0b3024", glow: "#8fc9a8", backdropTop: "#c9ddd0", backdrop: "#e7ebe4", frameBorder: "rgba(19,78,58,.16)", backdropMuted: "#3f5a4d",
    title: "currentColor", titleGrad: "none", heroLine: "rgba(168,213,185,.35)", heroShine: "rgba(207,230,216,.18)", star: "#1b6a4e",
    frameShadow: FRAME_SHADOW, winGrad: "linear-gradient(135deg, #0f3d2e 0%, #1b6a4e 55%, #5fa883 100%)", iconFg: "#f4efe1", avatar: "initial",
  },
  warmorange: {
    primary: "#b9531a", on: "#ffffff", hover: "#a24714", text: "#a8490f", soft: "#fdeee0", softBorder: "#f6c9a0", page: "#fbf6ef", headerMuted: "#fff8f0",
    primary2: "#cc6224", glow: "#ffd3a6", backdropTop: "#f8c99c", backdrop: "#f6ebdd", frameBorder: "rgba(185,83,26,.16)", backdropMuted: "#7d4a24",
    title: "currentColor", titleGrad: "none", heroLine: "transparent", heroShine: "rgba(255,240,220,.3)", star: "#d9661f",
    frameShadow: "0 1px 2px rgba(80,40,10,.05), 0 12px 32px -8px rgba(120,60,20,.16), 0 32px 64px -24px rgba(120,60,20,.14)", winGrad: "linear-gradient(135deg, #f4a259 0%, #e8772e 50%, #b9531a 100%)", iconFg: "#ffffff", avatar: "initial",
  },
  gray: {
    primary: "#111111", on: "#ffffff", hover: "#2b2b2b", text: "#111111", soft: "#f1f1f1", softBorder: "#cfcfcf", page: "#fafafa", headerMuted: "#c4c4c4",
    primary2: "#262626", glow: "#ffffff", backdropTop: "#f4f4f4", backdrop: "#ebebeb", frameBorder: "rgba(0,0,0,.10)", backdropMuted: "#525252",
    title: "currentColor", titleGrad: "none", heroLine: "transparent", heroShine: "rgba(255,255,255,.06)", star: "#111111",
    frameShadow: "0 1px 2px rgba(0,0,0,.04)", winGrad: "linear-gradient(135deg, #111111 0%, #3a3a3a 100%)", iconFg: "#ffffff", avatar: "linear-gradient(135deg, #4a4a4a, #111111)",
  },
};

/**
 * Guest (mobile) palette: header/buttons keep the theme hue but are darkened until white text ≥ 4.5:1;
 * `text` is the hue as a text/icon colour on white (≥ 4.5:1); `soft` is a tint for selected states.
 */
export function guestPalette(v: string | undefined): GuestPalette {
  if (v && !isHex(v) && GUEST_SPECS[v]) return GUEST_SPECS[v];
  return { ...derivedGuest(v), ...GUEST_EXTRAS, star: derivedGuest(v).primary };
}
function derivedGuest(v: string | undefined) {
  const base = resolveColor(v, GUEST_THEMES, "blue");
  const primary = darkenFor(base, WHITE, 4.5);
  const soft = mix(base, WHITE, 0.9);
  // text/icon colour must pass AA on both white and the soft tint used for selected states
  const text = darkenFor(base, soft, 4.6);
  return {
    primary, on: WHITE, hover: shade(primary, 0.07), text,
    soft, softBorder: mix(base, WHITE, 0.55), page: mix(base, "#f5f6f8", 0.96),
    headerMuted: mix(WHITE, primary, 0.12),
    primary2: shade(primary, 0.09, -0.06),
    glow: mix(base, WHITE, 0.45),
    backdropTop: mix(base, WHITE, 0.72),
    backdrop: mix(base, "#e8ebf0", 0.87),
    frameBorder: rgba(primary, 0.16),
    backdropMuted: darkenFor(withHue(base, 0.14, 0.42), mix(base, "#e8ebf0", 0.87), 4.6),
  };
}
export function guestVars(v: string | undefined) {
  const p = guestPalette(v);
  return { "--g-primary": p.primary, "--g-on": p.on, "--g-hover": p.hover, "--g-text": p.text, "--g-soft": p.soft, "--g-soft-border": p.softBorder, "--g-page": p.page, "--g-header-muted": p.headerMuted,
    "--g-backdrop-top": p.backdropTop, "--g-backdrop": p.backdrop, "--g-frame-border": p.frameBorder, "--g-backdrop-muted": p.backdropMuted,
    "--g-primary-2": p.primary2, "--g-glow": p.glow,
    "--g-title": p.title, "--g-title-grad": p.titleGrad, "--g-hero-line": p.heroLine, "--g-hero-shine": p.heroShine, "--g-star": p.star,
    "--g-frame-shadow": p.frameShadow, "--g-win-grad": p.winGrad, "--g-icon-fg": p.iconFg, "--g-avatar": p.avatar } as Record<string, string>;
}
