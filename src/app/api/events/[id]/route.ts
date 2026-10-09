import { FEATURE_GROUPS } from "@/lib/features";
import { sql } from "@/lib/db";
import { primaryLink } from "@/lib/links";
import { bad, forbidden, json, loadEvent, readJson } from "@/lib/auth";
import { GUEST_THEMES, SCREEN_THEMES, isHex } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  const interactions = await sql`SELECT i.*,
      (SELECT count(*)::int FROM qoj_questions q WHERE q.interaction_id = i.id AND q.status = 'pending' AND q.archived = false) AS pending_count
    FROM qoj_interactions i WHERE i.event_id = ${r.event.id} ORDER BY i.created_at`;
  const p = await sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE last_seen > now() - interval '30 seconds')::int AS online
    FROM qoj_participants WHERE event_id = ${r.event.id}`;
  const links = {
    guest: (await primaryLink(r.event.id, "guest"))?.hash || null,
    embed: (await primaryLink(r.event.id, "embed"))?.hash || null,
    screen: r.perms.present || r.perms.manage ? (await primaryLink(r.event.id, "screen"))?.hash || null : null,
    report: r.perms.manage ? (await primaryLink(r.event.id, "report"))?.hash || null : null,
  };
  return json({ event: r.event, interactions, perms: r.perms, participants: p[0], links, me: { id: r.user.id, name: r.user.name } });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  const b = await readJson<Record<string, unknown>>(req);
  const id = r.event.id;
  const manageFields = ["name", "date", "status", "allow_pre_questions", "screen_theme", "guest_theme", "description", "groups", "blocklist", "min_length", "rate_limit"];
  const presentFields = ["screen_channel", "current_interaction_id"];
  for (const k of Object.keys(b)) {
    // 主持人 may start / end / reopen the event (live ⇄ ended); only 活动管理员 / 超级管理员 may set it back to 未开始
    if (k === "status" && !r.perms.manage) {
      if (!r.perms.present) return forbidden("只有活动管理员或主持人可以更改活动状态");
      if (!["live", "ended"].includes(String(b.status))) return forbidden("主持人只能开始、结束或重新开放活动");
      continue;
    }
    if (manageFields.includes(k) && !r.perms.manage) return forbidden("只有活动管理员可以修改活动设置");
    if (presentFields.includes(k) && !r.perms.present) return forbidden("只有主持人可以控制投屏");
  }
  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (!name) return bad("请输入活动名称");
    await sql`UPDATE qoj_events SET name = ${name} WHERE id = ${id}`;
  }
  if (b.date !== undefined) await sql`UPDATE qoj_events SET event_date = ${b.date ? String(b.date) : null} WHERE id = ${id}`;
  if (b.status !== undefined) {
    if (!["upcoming", "live", "ended"].includes(String(b.status))) return bad("无效的状态");
    await sql`UPDATE qoj_events SET status = ${String(b.status)} WHERE id = ${id}`;
  }
  if (b.allow_pre_questions !== undefined) await sql`UPDATE qoj_events SET allow_pre_questions = ${!!b.allow_pre_questions} WHERE id = ${id}`;
  if (b.screen_theme !== undefined) {
    if (!SCREEN_THEMES[String(b.screen_theme)] && !isHex(String(b.screen_theme))) return bad("无效的投屏主题");
    await sql`UPDATE qoj_events SET screen_theme = ${String(b.screen_theme)} WHERE id = ${id}`;
  }
  if (b.guest_theme !== undefined) {
    if (!GUEST_THEMES[String(b.guest_theme)] && !isHex(String(b.guest_theme))) return bad("无效的嘉宾端主题");
    await sql`UPDATE qoj_events SET guest_theme = ${String(b.guest_theme)} WHERE id = ${id}`;
  }
  if (b.description !== undefined) await sql`UPDATE qoj_events SET description = ${String(b.description).slice(0, 1000)} WHERE id = ${id}`;
  if (FEATURE_GROUPS && b.groups !== undefined) {
    const groups = (Array.isArray(b.groups) ? b.groups : []).map((g) => String(g).trim()).filter(Boolean).slice(0, 50);
    await sql`UPDATE qoj_events SET groups = ${groups} WHERE id = ${id}`;
  }
  if (b.blocklist !== undefined) {
    const list = (Array.isArray(b.blocklist) ? b.blocklist : []).map((g) => String(g).trim()).filter(Boolean).slice(0, 500);
    await sql`UPDATE qoj_events SET blocklist = ${list} WHERE id = ${id}`;
  }
  if (b.min_length !== undefined) {
    const n = Math.max(1, Math.min(50, Number(b.min_length) || 1));
    await sql`UPDATE qoj_events SET min_length = ${n} WHERE id = ${id}`;
  }
  if (b.rate_limit !== undefined) {
    const n = Math.max(1, Math.min(30, Number(b.rate_limit) || 3));
    await sql`UPDATE qoj_events SET rate_limit = ${n} WHERE id = ${id}`;
  }
  if (b.screen_channel !== undefined) {
    if (!["welcome", "interaction"].includes(String(b.screen_channel))) return bad("无效的频道");
    await sql`UPDATE qoj_events SET screen_channel = ${String(b.screen_channel)} WHERE id = ${id}`;
  }
  if (b.current_interaction_id !== undefined) {
    const iid = b.current_interaction_id === null ? null : Number(b.current_interaction_id);
    if (iid !== null) {
      const ok = await sql`SELECT 1 FROM qoj_interactions WHERE id = ${iid} AND event_id = ${id}`;
      if (!ok.length) return bad("互动不存在");
    }
    await sql`UPDATE qoj_events SET current_interaction_id = ${iid} WHERE id = ${id}`;
  }
  const rows = await sql`SELECT * FROM qoj_events WHERE id = ${id}`;
  return json({ event: rows[0] });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  if (!r.perms.manage) return forbidden("只有活动管理员可以删除活动");
  await sql`DELETE FROM qoj_events WHERE id = ${r.event.id}`;
  return json({ ok: true });
}
