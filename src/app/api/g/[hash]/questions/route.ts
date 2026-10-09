import { FEATURE_GROUPS } from "@/lib/features";
import { sql } from "@/lib/db";
import { json, readJson } from "@/lib/auth";
import { askState, blockHit, fromLink, qaOf } from "@/lib/public";

type Ctx = { params: Promise<{ hash: string }> };
const norm = (s: string) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");

export async function POST(req: Request, { params }: Ctx) {
  const r = await fromLink((await params).hash, ["guest", "embed"]);
  if ("error" in r) return r.error;
  const ev = r.event;
  const st = askState(ev);
  if (!st.canAsk) return json({ error: st.notice }, 403);
  const qa = await qaOf(ev.id);
  if (!qa) return json({ error: "该活动未开启提问" }, 400);
  const b = await readJson<{ pid?: string; name?: string; group?: string; text?: string }>(req);
  const pid = String(b.pid || "").slice(0, 64);
  const name = String(b.name || "").trim().slice(0, 40);
  const group = FEATURE_GROUPS ? String(b.group || "").trim().slice(0, 40) : "";
  const text = String(b.text || "").trim().slice(0, 500);
  if (!pid) return json({ error: "缺少参与者标识，请刷新页面" }, 400);
  if (!name) return json({ error: "请填写姓名" }, 400);
  if (FEATURE_GROUPS) {
    if (!group) return json({ error: "请填写组别" }, 400);
    const groups: string[] = ev.groups || [];
    if (groups.length && !groups.includes(group)) return json({ error: "请选择有效的组别" }, 400);
  }
  if (!text) return json({ error: "请输入问题内容" }, 400);

  const recent = await sql`SELECT count(*)::int AS n FROM qoj_questions WHERE interaction_id = ${qa.id} AND participant_id = ${pid} AND created_at > now() - interval '60 seconds'`;
  if (recent[0].n >= (ev.rate_limit || 3)) return json({ error: "提问太频繁了，请稍后再试" }, 429);

  const reasons: string[] = [];
  if ([...text].length < (ev.min_length || 1)) reasons.push("内容过短");
  if (blockHit(ev, text)) reasons.push("包含敏感词");
  const n = norm(text);
  if (n) {
    const others = await sql`SELECT text FROM qoj_questions WHERE interaction_id = ${qa.id} AND status <> 'rejected' ORDER BY created_at DESC LIMIT 500`;
    if (others.some((o) => norm(o.text) === n)) reasons.push("疑似重复");
  }
  if (/(https?:\/\/|www\.)/i.test(text)) reasons.push("包含链接");
  const flag = reasons.length ? reasons.join("、") : null;
  const status = !flag && qa.config?.autoApprove ? "approved" : "pending";
  const rows = await sql`INSERT INTO qoj_questions (interaction_id, participant_id, nickname, group_name, text, status, flag_reason)
    VALUES (${qa.id}, ${pid}, ${name}, ${group}, ${text}, ${status}, ${flag}) RETURNING id, status`;
  await sql`INSERT INTO qoj_participants (event_id, participant_id, nickname, group_name, link_id) VALUES (${ev.id}, ${pid}, ${name}, ${group}, ${r.link.id})
    ON CONFLICT (event_id, participant_id) DO UPDATE SET last_seen = now(), nickname = EXCLUDED.nickname,
      group_name = CASE WHEN EXCLUDED.group_name <> '' THEN EXCLUDED.group_name ELSE qoj_participants.group_name END`;
  await sql`INSERT INTO qoj_visits (event_id, participant_id, minute) VALUES (${ev.id}, ${pid}, date_trunc('minute', now())) ON CONFLICT DO NOTHING`;
  return json({ question: rows[0], message: status === "approved" ? "提问成功" : "提交成功，等待审核后展示" });
}
