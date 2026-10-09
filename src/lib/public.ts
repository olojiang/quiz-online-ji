import { FEATURE_GROUPS } from "@/lib/features";
import { ensureSchema, sql } from "./db";
import { json } from "./auth";
import { resolveLink } from "./links";
import type { TokenKind } from "./util";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Resolve a hash link to its event, or produce the error response (410 for revoked links). */
export async function fromLink(hash: string, types: TokenKind[]) {
  await ensureSchema();
  const r = await resolveLink(hash, types);
  if (!r.ok) return { error: json({ error: r.error, revoked: !!r.revoked }, r.status) } as const;
  return { link: r.link, event: r.event } as const;
}

export async function qaOf(eventId: number) {
  const rows = await sql`SELECT * FROM qoj_interactions WHERE event_id = ${eventId} AND type = 'qa' LIMIT 1`;
  return rows[0] || null;
}

export function askState(ev: Row): { canAsk: boolean; notice: string | null } {
  if (ev.status === "ended") return { canAsk: false, notice: "活动已结束，提问已关闭" };
  if (ev.status === "upcoming" && !ev.allow_pre_questions) return { canAsk: false, notice: "活动尚未开始，会前提问暂未开放" };
  if (ev.status === "upcoming") return { canAsk: true, notice: "会前提问已开放，欢迎提前提交您的问题" };
  return { canAsk: true, notice: null };
}

export async function guestInteraction(ev: Row) {
  if (ev.current_interaction_id && ev.status !== "ended") {
    const rows = await sql`SELECT * FROM qoj_interactions WHERE id = ${ev.current_interaction_id}`;
    if (rows[0]) return rows[0];
  }
  return qaOf(ev.id);
}

/** Fields safe for guests. Never includes ids, codes or other links. */
export function publicEvent(ev: Row) {
  return {
    name: ev.name, status: ev.status, event_date: ev.event_date, description: ev.description || "",
    allow_pre_questions: ev.allow_pre_questions, groups: FEATURE_GROUPS ? ev.groups || [] : [], guest_theme: ev.guest_theme, min_length: ev.min_length,
  };
}

export function blockHit(ev: Row, text: string) {
  const lower = text.toLowerCase();
  return ((ev.blocklist || []) as string[]).find((w) => w && lower.includes(w.toLowerCase()));
}
