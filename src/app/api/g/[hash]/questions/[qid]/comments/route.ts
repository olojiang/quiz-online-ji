import { sql } from "@/lib/db";
import { json, readJson } from "@/lib/auth";
import { blockHit, fromLink } from "@/lib/public";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ hash: string; qid: string }> };

async function load(p: { hash: string; qid: string }): Promise<{ error: Response } | { link: Record<string, any>; event: Record<string, any>; qid: number }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = await fromLink(p.hash, ["guest", "embed"]);
  if ("error" in r) return { error: r.error as Response };
  const q = await sql`SELECT q.id FROM qoj_questions q JOIN qoj_interactions i ON i.id = q.interaction_id
    WHERE q.id = ${Number(p.qid)} AND i.event_id = ${r.event.id} AND q.status = 'approved' AND q.archived = false`;
  if (!q[0]) return { error: json({ error: "问题不存在或未展示" }, 404) } as const;
  return { link: r.link, event: r.event, qid: q[0].id as number };
}

export async function GET(_req: Request, { params }: Ctx) {
  const r = await load(await params);
  if ("error" in r) return r.error;
  const rows = await sql`SELECT id, nickname, text, created_at FROM qoj_comments WHERE question_id = ${r.qid} ORDER BY created_at ASC LIMIT 200`;
  return json({ comments: rows });
}

export async function POST(req: Request, { params }: Ctx) {
  const r = await load(await params);
  if ("error" in r) return r.error;
  if (r.event.status === "ended") return json({ error: "活动已结束" }, 403);
  const b = await readJson<{ pid?: string; name?: string; text?: string }>(req);
  const text = String(b.text || "").trim().slice(0, 300);
  const name = String(b.name || "").trim().slice(0, 40);
  const pid = String(b.pid || "").slice(0, 64);
  if (!pid || !name) return json({ error: "请先填写姓名" }, 400);
  if (!text) return json({ error: "请输入评论内容" }, 400);
  if (blockHit(r.event, text)) return json({ error: "评论包含不当内容" }, 400);
  const recent = await sql`SELECT count(*)::int AS n FROM qoj_comments WHERE participant_id = ${pid} AND created_at > now() - interval '60 seconds'`;
  if (recent[0].n >= 6) return json({ error: "评论太频繁了，请稍后再试" }, 429);
  const rows = await sql`INSERT INTO qoj_comments (question_id, participant_id, nickname, text) VALUES (${r.qid}, ${pid}, ${name}, ${text}) RETURNING id, nickname, text, created_at`;
  await sql`INSERT INTO qoj_visits (event_id, participant_id, minute) VALUES (${r.event.id}, ${pid}, date_trunc('minute', now())) ON CONFLICT DO NOTHING`;
  return json({ comment: rows[0] });
}
