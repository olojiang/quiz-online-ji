import { FEATURE_GROUPS } from "@/lib/features";
import { ensureSchema, sql } from "@/lib/db";
import { bad, canCreateEvents, eventPerms, forbidden, getUser, isSuper, json, readJson, unauthorized } from "@/lib/auth";
import { genCode } from "@/lib/util";
import { createLink } from "@/lib/links";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getUser();
  if (!u) return unauthorized();
  await ensureSchema();
  const rows = isSuper(u)
    ? await sql`SELECT e.*, u.name AS owner_name, (SELECT count(*)::int FROM qoj_interactions i WHERE i.event_id = e.id) AS interaction_count,
        (SELECT count(*)::int FROM qoj_participants p WHERE p.event_id = e.id) AS participant_count
        FROM qoj_events e JOIN qoj_users u ON u.id = e.user_id ORDER BY e.created_at DESC`
    : await sql`SELECT e.*, u.name AS owner_name, (SELECT count(*)::int FROM qoj_interactions i WHERE i.event_id = e.id) AS interaction_count,
        (SELECT count(*)::int FROM qoj_participants p WHERE p.event_id = e.id) AS participant_count
        FROM qoj_events e JOIN qoj_users u ON u.id = e.user_id
        WHERE e.user_id = ${u.id} OR e.id IN (SELECT event_id FROM qoj_event_members WHERE user_id = ${u.id})
        ORDER BY e.created_at DESC`;
  const events = [];
  for (const e of rows) events.push({ ...e, perms: await eventPerms(u, e) });
  return json({ events });
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  if (!canCreateEvents(u)) return forbidden("只有活动管理员可以创建活动");
  const b = await readJson<{ name?: string; date?: string; groups?: string[] }>(req);
  const name = (b.name || "").trim();
  if (!name) return bad("请输入活动名称");
  if (name.length > 100) return bad("活动名称过长");
  const date = b.date || null;
  const groups = (FEATURE_GROUPS ? b.groups || [] : []).map((g) => String(g).trim()).filter(Boolean).slice(0, 50);
  for (let i = 0; i < 5; i++) {
    const code = genCode();
    try {
      const rows = await sql`INSERT INTO qoj_events (user_id, name, event_date, code, groups) VALUES (${u.id}, ${name}, ${date}, ${code}, ${groups}) RETURNING *`;
      const ev = rows[0];
      // every event comes with its Q&A interaction so pre-event questions work out of the box
      const qa = await sql`INSERT INTO qoj_interactions (event_id, type, title, config) VALUES (${ev.id}, 'qa', '提问', ${JSON.stringify({ autoApprove: false })}::jsonb) RETURNING id`;
      await sql`UPDATE qoj_events SET current_interaction_id = ${qa[0].id} WHERE id = ${ev.id}`;
      await createLink(ev.id, "guest", u.id);
      await createLink(ev.id, "screen", u.id);
      return json({ event: { ...ev, current_interaction_id: qa[0].id } });
    } catch (e) {
      if (!String(e).includes("unique")) throw e;
    }
  }
  return json({ error: "生成活动码失败，请重试" }, 500);
}
