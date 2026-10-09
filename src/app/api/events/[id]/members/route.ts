import { sql } from "@/lib/db";
import { bad, forbidden, json, loadEvent, readJson } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  const members = await sql`SELECT m.user_id, m.role, u.name, u.email, u.disabled FROM qoj_event_members m JOIN qoj_users u ON u.id = m.user_id
    WHERE m.event_id = ${r.event.id} ORDER BY u.name, m.role`;
  const owner = await sql`SELECT id, name, email FROM qoj_users WHERE id = ${r.event.user_id}`;
  return json({ members, owner: owner[0] || null });
}

export async function POST(req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  if (!r.perms.manage) return forbidden("只有活动管理员可以分配成员");
  const b = await readJson<{ user_id?: number; role?: string }>(req);
  if (!["moderator", "presenter"].includes(String(b.role))) return bad("角色只能是 审核员 或 主持人");
  const u = await sql`SELECT id FROM qoj_users WHERE id = ${Number(b.user_id)} AND disabled = false`;
  if (!u[0]) return bad("用户不存在或已停用");
  await sql`INSERT INTO qoj_event_members (event_id, user_id, role) VALUES (${r.event.id}, ${u[0].id}, ${String(b.role)}) ON CONFLICT DO NOTHING`;
  return json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  if (!r.perms.manage) return forbidden("只有活动管理员可以移除成员");
  const url = new URL(req.url);
  await sql`DELETE FROM qoj_event_members WHERE event_id = ${r.event.id} AND user_id = ${Number(url.searchParams.get("user_id"))} AND role = ${url.searchParams.get("role") || ""}`;
  return json({ ok: true });
}
