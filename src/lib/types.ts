export type InteractionType = "qa" | "poll" | "quiz" | "open" | "rate";

export const TYPE_LABEL: Record<string, string> = {
  qa: "提问",
  poll: "选择题",
  quiz: "测验",
  open: "开放话题",
  rate: "评分",
};

export interface PollConfig { question: string; options: string[]; multi: boolean }
export interface QuizQuestion { text: string; options: string[]; correct: number[]; timeLimit: number }
export interface QuizConfig { questions: QuizQuestion[] }
export interface QuizState { phase?: "idle" | "question" | "reveal" | "finished"; currentQ?: number; startedAt?: number }
export interface OpenConfig { prompt: string }
export interface RateConfig { items: string[]; scale: "star" | "score"; max: number; allowComment: boolean; anonymous: boolean }
export interface RateState { closed?: boolean }
export interface QAConfig { autoApprove?: boolean }

export const SCREEN_THEMES: Record<string, { label: string; color: string }> = {
  blue: { label: "蓝色", color: "#5b78fa" },
  orange: { label: "橙色", color: "#f98a16" },
  red: { label: "红色", color: "#f5222d" },
  gray: { label: "灰色", color: "#e8e8e8" },
  green: { label: "绿色", color: "#389e0d" },
  purple: { label: "紫色", color: "#8c4ff0" },
  navy: { label: "深蓝", color: "#0f2257" },
};
export const GUEST_THEMES: Record<string, { label: string; color: string }> = {
  blue: { label: "蓝色", color: "#5b78fa" },
  orange: { label: "橙色", color: "#f98a16" },
  red: { label: "红色", color: "#f5222d" },
  slate: { label: "灰蓝色", color: "#0f5a96" },
  green: { label: "绿色", color: "#52c41a" },
  purple: { label: "紫色", color: "#8c4ff0" },
};
export const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

export const STATUS_LABEL: Record<string, string> = { upcoming: "未开始", live: "进行中", ended: "已结束" };
