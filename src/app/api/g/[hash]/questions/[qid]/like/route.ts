import { sql } from "@/lib/db";
import { json, readJson } from "@/lib/auth";
import { fromLink } from "@/lib/public";

type Ctx = { params: Promise<{ hash: string; qid: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const p = await params;
  const r = await fromLink(p.hash, ["guest", "embed"]);
  if ("error" in r) return r.error;
  if (r.event.status === "ended") return json({ error: "活动已结束" }, 403);
  const qid = Number(p.qid);
  const { pid: rawPid } = await readJson<{ pid?: string }>(req);
  const pid = String(rawPid || "").slice(0, 64);
  if (!pid) return json({ error: "缺少参与者标识" }, 400);
  const q = await sql`SELECT q.id FROM qoj_questions q JOIN qoj_interactions i ON i.id = q.interaction_id
    WHERE q.id = ${qid} AND i.event_id = ${r.event.id} AND q.status = 'approved' AND q.archived = false`;
  if (!q[0]) return json({ error: "问题不存在或未展示" }, 404);
  const ins = await sql`INSERT INTO qoj_question_likes (question_id, participant_id) VALUES (${qid}, ${pid}) ON CONFLICT DO NOTHING RETURNING question_id`;
  if (ins.length) await sql`UPDATE qoj_questions SET likes = likes + 1 WHERE id = ${qid}`;
  else {
    await sql`DELETE FROM qoj_question_likes WHERE question_id = ${qid} AND participant_id = ${pid}`;
    await sql`UPDATE qoj_questions SET likes = GREATEST(likes - 1, 0) WHERE id = ${qid}`;
  }
  await sql`INSERT INTO qoj_visits (event_id, participant_id, minute) VALUES (${r.event.id}, ${pid}, date_trunc('minute', now())) ON CONFLICT DO NOTHING`;
  const out = await sql`SELECT likes FROM qoj_questions WHERE id = ${qid}`;
  return json({ liked: ins.length > 0, likes: out[0].likes });
}
