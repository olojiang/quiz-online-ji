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
}

/**
 * Big-screen palette. Text on the background is ≥ 3:1 (all screen text there is ≥ 24px = WCAG "large");
 * text on cards is ≥ 4.5:1 (AA normal) so even small labels pass.
 */
export function screenPalette(v: string | undefined): ScreenPalette {
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
      badgeBg: accent, badgeFg: WHITE,
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
    badgeBg: WHITE, badgeFg: featuredAccent,
  };
}

export function screenVars(v: string | undefined) {
  const p = screenPalette(v);
  return {
    "--s-bg": p.bg, "--s-bg2": p.bg2, "--s-fg": p.fg, "--s-muted": p.muted, "--s-card": p.card, "--s-card-fg": p.cardFg,
    "--s-card-muted": p.cardMuted, "--s-border": p.border, "--s-track": p.track, "--s-bar": p.bar, "--s-accent": p.accent,
    "--s-feat-bg": p.featuredBg, "--s-feat-fg": p.featuredFg, "--s-feat-muted": p.featuredMuted, "--s-feat-accent": p.featuredAccent,
    "--s-badge-bg": p.badgeBg, "--s-badge-fg": p.badgeFg,
  } as Record<string, string>;
}

export interface GuestPalette {
  primary: string; on: string; hover: string; text: string; soft: string; softBorder: string; page: string; headerMuted: string;
  /** desktop-only framing: backdrop behind the centred card (top band → base), card edge, muted text on the backdrop */
  backdropTop: string; backdrop: string; frameBorder: string; backdropMuted: string;
  /** header gradient end (deeper, same hue) and a light glow tint for decorative shapes */
  primary2: string; glow: string;
}

/**
 * Guest (mobile) palette: header/buttons keep the theme hue but are darkened until white text ≥ 4.5:1;
 * `text` is the hue as a text/icon colour on white (≥ 4.5:1); `soft` is a tint for selected states.
 */
export function guestPalette(v: string | undefined): GuestPalette {
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
    "--g-primary-2": p.primary2, "--g-glow": p.glow } as Record<string, string>;
}
