import { sql } from "@/lib/db";
import { forbidden, json, loadInteraction, readJson } from "@/lib/auth";
import { validateInteraction } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const r = await loadInteraction(Number((await params).id));
  if ("error" in r) return r.error;
  const b = await readJson<{ title?: string; config?: Record<string, unknown>; autoApprove?: boolean }>(req);
  const it = r.interaction;
  if (typeof b.autoApprove === "boolean") {
    if (!r.perms.moderate) return forbidden("只有审核员可以切换自动审核");
    if (it.type !== "qa") return json({ error: "仅提问互动支持自动审核" }, 400);
    await sql`UPDATE qoj_interactions SET config = config || ${JSON.stringify({ autoApprove: b.autoApprove })}::jsonb WHERE id = ${it.id}`;
  }
  if (b.title !== undefined || b.config !== undefined) {
    if (!r.perms.manage) return forbidden("只有活动管理员可以编辑互动");
    const cfg = { ...(it.config || {}), ...(b.config || {}) };
    const v = validateInteraction(it.type, b.title ?? it.title, cfg);
    if ("error" in v) return json({ error: v.error }, 400);
    if (it.type === "qa") v.config.autoApprove = !!it.config?.autoApprove;
    if (it.type === "lottery") {
      const won = await sql`SELECT prize_index, count(*) FILTER (WHERE NOT voided)::int AS n, count(*)::int AS total FROM qoj_lottery_winners WHERE interaction_id = ${it.id} GROUP BY prize_index`;
      if (won.length) {
        if (v.config.prizes.length !== (it.config?.prizes || []).length) return json({ error: "已有抽奖记录，不能增删奖项；如需调整请先「重置」" }, 400);
        for (const w of won) {
          const p = v.config.prizes[w.prize_index];
          if (p && p.count < w.n) return json({ error: `「${p.name}」已抽出 ${w.n} 人，名额不能少于 ${w.n}` }, 400);
        }
      }
    }
    await sql`UPDATE qoj_interactions SET title = ${v.title}, config = ${JSON.stringify(v.config)}::jsonb WHERE id = ${it.id}`;
    if (it.type === "lottery") {
      // keep the recorded prize name in step with a renamed prize
      const names = (v.config.prizes as { name: string }[]).map((p) => p.name);
      const idx = names.map((_, i) => i);
      await sql`UPDATE qoj_lottery_winners w SET prize_name = n.name FROM unnest(${idx}::int[], ${names}::text[]) AS n(i, name) WHERE w.interaction_id = ${it.id} AND w.prize_index = n.i AND w.prize_name <> n.name`;
    }
  }
  const rows = await sql`SELECT * FROM qoj_interactions WHERE id = ${it.id}`;
  return json({ interaction: rows[0] });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const r = await loadInteraction(Number((await params).id));
  if ("error" in r) return r.error;
  if (!r.perms.manage) return forbidden("只有活动管理员可以删除互动");
  await sql`UPDATE qoj_events SET current_interaction_id = NULL WHERE id = ${r.event.id} AND current_interaction_id = ${r.interaction.id}`;
  await sql`DELETE FROM qoj_interactions WHERE id = ${r.interaction.id}`;
  return json({ ok: true });
}
