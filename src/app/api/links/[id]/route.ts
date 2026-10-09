import { sql } from "@/lib/db";
import { forbidden, json, loadEvent, notFound, readJson, getUser, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await getUser())) return unauthorized();
  const rows = await sql`SELECT * FROM qoj_links WHERE id = ${Number((await params).id)}`;
  const link = rows[0];
  if (!link) return notFound("链接不存在");
  const r = await loadEvent(link.event_id);
  if ("error" in r) return r.error;
  if (!r.perms.manage) return forbidden("只有活动管理员可以管理链接");
  const b = await readJson<{ revoke?: boolean; restore?: boolean; label?: string }>(req);
  if (b.revoke) await sql`UPDATE qoj_links SET revoked_at = now() WHERE id = ${link.id} AND revoked_at IS NULL`;
  if (b.restore) await sql`UPDATE qoj_links SET revoked_at = NULL WHERE id = ${link.id}`;
  if (b.label !== undefined) await sql`UPDATE qoj_links SET label = ${String(b.label).trim().slice(0, 60)} WHERE id = ${link.id}`;
  const out = await sql`SELECT * FROM qoj_links WHERE id = ${link.id}`;
  return json({ link: out[0] });
}
