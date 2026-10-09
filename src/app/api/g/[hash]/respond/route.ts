import { FEATURE_GROUPS } from "@/lib/features";
import { sql } from "@/lib/db";
import { json, readJson } from "@/lib/auth";
import { blockHit, fromLink } from "@/lib/public";
import type { PollConfig, QuizConfig, QuizState, RateConfig } from "@/lib/types";

type Ctx = { params: Promise<{ hash: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const r = await fromLink((await params).hash, ["guest", "embed"]);
  if ("error" in r) return r.error;
  const ev = r.event;
  if (ev.status === "ended") return json({ error: "活动已结束" }, 403);
  const b = await readJson<{ pid?: string; name?: string; interactionId?: number; answer?: number[]; text?: string; group?: string; scores?: number[]; comment?: string }>(req);
  const pid = String(b.pid || "").slice(0, 64);
  const name = String(b.name || "").trim().slice(0, 40);
  if (!pid || !name) return json({ error: "请先填写姓名" }, 400);
  if (Number(b.interactionId) !== ev.current_interaction_id) return json({ error: "该互动当前未开放" }, 400);
  const rows = await sql`SELECT * FROM qoj_interactions WHERE id = ${ev.current_interaction_id}`;
  const it = rows[0];
  if (!it) return json({ error: "互动不存在" }, 404);
  const visit = () => sql`INSERT INTO qoj_visits (event_id, participant_id, minute) VALUES (${ev.id}, ${pid}, date_trunc('minute', now())) ON CONFLICT DO NOTHING`;

  if (it.type === "poll") {
    const cfg = it.config as PollConfig;
    let ans = (Array.isArray(b.answer) ? b.answer : []).map(Number).filter((n) => n >= 0 && n < cfg.options.length);
    ans = [...new Set(ans)];
    if (!ans.length) return json({ error: "请选择选项" }, 400);
    if (!cfg.multi && ans.length > 1) ans = ans.slice(0, 1);
    await sql`INSERT INTO qoj_responses (interaction_id, participant_id, nickname, question_index, answer) VALUES (${it.id}, ${pid}, ${name}, 0, ${JSON.stringify(ans)}::jsonb)
      ON CONFLICT (interaction_id, participant_id, question_index) WHERE question_index >= 0 DO UPDATE SET answer = EXCLUDED.answer, created_at = now()`;
    await visit();
    return json({ ok: true });
  }
  if (it.type === "quiz") {
    const cfg = it.config as QuizConfig;
    const st = (it.state || {}) as QuizState;
    if (st.phase !== "question") return json({ error: "当前不在答题时间" }, 400);
    const qi = st.currentQ ?? 0;
    const q = cfg.questions[qi];
    const elapsed = Date.now() - (st.startedAt || 0);
    if (elapsed > q.timeLimit * 1000 + 1500) return json({ error: "答题时间已结束" }, 400);
    const ans = [...new Set((Array.isArray(b.answer) ? b.answer : []).map(Number).filter((n) => n >= 0 && n < q.options.length))].sort();
    if (!ans.length) return json({ error: "请选择答案" }, 400);
    const correctSet = [...q.correct].sort();
    const correct = ans.length === correctSet.length && ans.every((v, i) => v === correctSet[i]);
    const ratio = Math.min(1, Math.max(0, elapsed / (q.timeLimit * 1000)));
    const score = correct ? Math.round(1000 * (1 - ratio / 2)) : 0;
    const ins = await sql`INSERT INTO qoj_responses (interaction_id, participant_id, nickname, question_index, answer, correct, score)
      VALUES (${it.id}, ${pid}, ${name}, ${qi}, ${JSON.stringify(ans)}::jsonb, ${correct}, ${score})
      ON CONFLICT (interaction_id, participant_id, question_index) WHERE question_index >= 0 DO NOTHING RETURNING id`;
    if (!ins.length) return json({ error: "本题已作答" }, 400);
    await visit();
    return json({ ok: true });
  }
  if (it.type === "rate") {
    const cfg = it.config as RateConfig;
    if (it.state?.closed) return json({ error: "评分已结束" }, 400);
    // same identity the guest joined with (姓名, plus 组别 when FEATURE_GROUPS is on)
    const group = FEATURE_GROUPS ? String(b.group || "").trim().slice(0, 40) : "";
    if (FEATURE_GROUPS && !group) return json({ error: "请先填写组别" }, 400);
    const raw = Array.isArray(b.scores) ? b.scores : [];
    const scores = cfg.items.map((_, i) => Math.round(Number(raw[i])));
    if (scores.some((v) => !Number.isInteger(v) || v < 1 || v > cfg.max)) return json({ error: "请为每个评分项打分" }, 400);
    let comment = "";
    if (cfg.allowComment) {
      comment = String(b.comment || "").trim().slice(0, 300);
      if (comment && blockHit(ev, comment)) return json({ error: "内容包含不当词语" }, 400);
    }
    await sql`INSERT INTO qoj_participants (event_id, participant_id, nickname, group_name) VALUES (${ev.id}, ${pid}, ${name}, ${group})
      ON CONFLICT (event_id, participant_id) DO UPDATE SET last_seen = now(), nickname = EXCLUDED.nickname,
        group_name = CASE WHEN EXCLUDED.group_name <> '' THEN EXCLUDED.group_name ELSE qoj_participants.group_name END`;
    await sql`INSERT INTO qoj_responses (interaction_id, participant_id, nickname, question_index, answer) VALUES (${it.id}, ${pid}, ${name}, 0, ${JSON.stringify({ scores, comment, group })}::jsonb)
      ON CONFLICT (interaction_id, participant_id, question_index) WHERE question_index >= 0 DO UPDATE SET answer = EXCLUDED.answer, nickname = EXCLUDED.nickname, created_at = now()`;
    await visit();
    return json({ ok: true });
  }
  if (it.type === "open") {
    const text = String(b.text || "").trim().slice(0, 300);
    if (!text) return json({ error: "请输入内容" }, 400);
    if (blockHit(ev, text)) return json({ error: "内容包含不当词语" }, 400);
    const recent = await sql`SELECT count(*)::int AS n FROM qoj_responses WHERE interaction_id = ${it.id} AND participant_id = ${pid} AND created_at > now() - interval '60 seconds'`;
    if (recent[0].n >= 5) return json({ error: "提交太频繁了，请稍后再试" }, 429);
    await sql`INSERT INTO qoj_responses (interaction_id, participant_id, nickname, question_index, answer) VALUES (${it.id}, ${pid}, ${name}, -1, ${JSON.stringify({ text })}::jsonb)`;
    await visit();
    return json({ ok: true });
  }
  return json({ error: "该互动不需要作答" }, 400);
}
