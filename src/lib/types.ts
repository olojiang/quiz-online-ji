export type InteractionType = "qa" | "poll" | "quiz" | "open" | "rate" | "lottery";

export const TYPE_LABEL: Record<string, string> = {
  qa: "提问",
  poll: "选择题",
  quiz: "测验",
  open: "开放话题",
  rate: "评分",
  lottery: "抽奖",
};

export interface PollConfig { question: string; options: string[]; multi: boolean }
export interface QuizQuestion { text: string; options: string[]; correct: number[]; timeLimit: number }
export interface QuizConfig { questions: QuizQuestion[] }
export interface QuizState { phase?: "idle" | "question" | "reveal" | "finished"; currentQ?: number; startedAt?: number }
export interface OpenConfig { prompt: string }
export interface RateConfig { items: string[]; scale: "star" | "score"; max: number; allowComment: boolean; anonymous: boolean }
export interface RateState { closed?: boolean }
export interface LotteryPrize { name: string; count: number; desc: string }
export interface LotteryConfig { prizes: LotteryPrize[]; participatedOnly: boolean; allowRepeat: boolean; exclude: string[] }
/** phase: idle 待开始 → rolling 抽奖中 (大屏滚动) → revealed 已揭晓. prize = index being drawn; drawSeq increments on every reveal. */
export interface LotteryState { phase?: "idle" | "rolling" | "revealed"; prize?: number; drawSeq?: number; rollingAt?: number; revealedAt?: number }
export interface QAConfig { autoApprove?: boolean }

/** Theme presets. `color` is the base hue (custom/derived themes); `swatch` is the picker preview (CSS background).
 *  Keys are stored in qoj_events.screen_theme / guest_theme — never rename or remove a key (old events keep using it). */
export interface ThemePreset { label: string; color: string; swatch?: string }
const MONO_SWATCH = "linear-gradient(135deg, #ffffff 0 46%, #d4d4d4 46% 54%, #111111 54% 100%)";
const BLACKGOLD_SWATCH = "linear-gradient(135deg, #0e0e10 0 55%, #a8823a 55%, #f3dfa6 78%, #c9a45c 100%)";
const INKGREEN_SWATCH = "linear-gradient(135deg, #0f3d2e 0 55%, #5fa883 55%, #cfe6d8 100%)";
const WARMORANGE_SWATCH = "linear-gradient(135deg, #e8772e 0 55%, #f4a259 55%, #fff4e6 100%)";
export const SCREEN_THEMES: Record<string, ThemePreset> = {
  blue: { label: "蓝色", color: "#5b78fa" },
  orange: { label: "橙色", color: "#f98a16" },
  red: { label: "红色", color: "#f5222d" },
  // key "gray" kept for saved events; restyled as the 黑白灰极简 (monochrome minimal) theme
  gray: { label: "黑白灰", color: "#e8e8e8", swatch: MONO_SWATCH },
  green: { label: "绿色", color: "#389e0d" },
  purple: { label: "紫色", color: "#8c4ff0" },
  navy: { label: "深蓝", color: "#0f2257" },
  blackgold: { label: "黑金", color: "#0e0e10", swatch: BLACKGOLD_SWATCH },
  inkgreen: { label: "墨绿", color: "#134e3a", swatch: INKGREEN_SWATCH },
  warmorange: { label: "暖橙", color: "#e8772e", swatch: WARMORANGE_SWATCH },
};
export const GUEST_THEMES: Record<string, ThemePreset> = {
  blue: { label: "蓝色", color: "#5b78fa" },
  orange: { label: "橙色", color: "#f98a16" },
  red: { label: "红色", color: "#f5222d" },
  slate: { label: "灰蓝色", color: "#0f5a96" },
  green: { label: "绿色", color: "#52c41a" },
  purple: { label: "紫色", color: "#8c4ff0" },
  gray: { label: "黑白灰", color: "#111111", swatch: MONO_SWATCH },
  blackgold: { label: "黑金", color: "#0e0e10", swatch: BLACKGOLD_SWATCH },
  inkgreen: { label: "墨绿", color: "#134e3a", swatch: INKGREEN_SWATCH },
  warmorange: { label: "暖橙", color: "#e8772e", swatch: WARMORANGE_SWATCH },
};
export const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

export const STATUS_LABEL: Record<string, string> = { upcoming: "未开始", live: "进行中", ended: "已结束" };
