import { sql } from "@/lib/db";
import { forbidden, json, loadEvent, readJson } from "@/lib/auth";
import { validateInteraction } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  if (!r.perms.manage) return forbidden("只有活动管理员可以创建互动");
  const b = await readJson<{ type?: string; title?: string; config?: unknown }>(req);
  const v = validateInteraction(String(b.type), b.title, b.config);
  if ("error" in v) return json({ error: v.error }, 400);
  if (b.type === "qa") {
    const ex = await sql`SELECT 1 FROM qoj_interactions WHERE event_id = ${r.event.id} AND type = 'qa'`;
    if (ex.length) return json({ error: "每个活动只允许创建一个提问互动" }, 400);
  }
  const rows = await sql`INSERT INTO qoj_interactions (event_id, type, title, config) VALUES (${r.event.id}, ${String(b.type)}, ${v.title}, ${JSON.stringify(v.config)}::jsonb) RETURNING *`;
  return json({ interaction: rows[0] });
}
