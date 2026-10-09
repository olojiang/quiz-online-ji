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
    await sql`UPDATE qoj_interactions SET title = ${v.title}, config = ${JSON.stringify(v.config)}::jsonb WHERE id = ${it.id}`;
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
