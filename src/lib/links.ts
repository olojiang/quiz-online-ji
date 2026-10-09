import { sql } from "./db";
import { TokenKind } from "./util";
import { genToken } from "./token";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function createLink(eventId: number, type: TokenKind, userId: number | null, label = "") {
  for (let i = 0; i < 5; i++) {
    try {
      const rows = await sql`INSERT INTO qoj_links (event_id, type, hash, label, created_by) VALUES (${eventId}, ${type}, ${genToken(10)}, ${label.slice(0, 60)}, ${userId}) RETURNING *`;
      return rows[0];
    } catch (e) { if (!String(e).includes("unique")) throw e; }
  }
  throw new Error("生成链接失败");
}

/** The link shown by default for a type: newest active unlabeled one, else newest active. */
export async function primaryLink(eventId: number, type: TokenKind) {
  const rows = await sql`SELECT * FROM qoj_links WHERE event_id = ${eventId} AND type = ${type} AND revoked_at IS NULL
    ORDER BY (label = '') DESC, created_at DESC LIMIT 1`;
  return rows[0] || null;
}

export type Resolved = { ok: true; link: Row; event: Row } | { ok: false; status: number; error: string; revoked?: boolean };

export async function resolveLink(hash: string, types: TokenKind[]): Promise<Resolved> {
  if (!/^[0-9A-Za-z]{6,32}$/.test(hash)) return { ok: false, status: 404, error: "链接不存在" };
  const rows = await sql`SELECT * FROM qoj_links WHERE hash = ${hash}`;
  const link = rows[0];
  if (!link || !types.includes(link.type)) return { ok: false, status: 404, error: "链接不存在" };
  if (link.revoked_at) return { ok: false, status: 410, error: "链接已失效", revoked: true };
  const evs = await sql`SELECT * FROM qoj_events WHERE id = ${link.event_id}`;
  if (!evs[0]) return { ok: false, status: 404, error: "活动不存在" };
  return { ok: true, link, event: evs[0] };
}

export async function countVisit(linkId: number) {
  await sql`UPDATE qoj_links SET visits = visits + 1 WHERE id = ${linkId}`;
}
