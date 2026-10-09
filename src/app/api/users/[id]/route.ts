import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { ALL_ROLES, bad, forbidden, getUser, isSuper, json, notFound, readJson, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const u = await getUser();
  if (!u) return unauthorized();
  if (!isSuper(u)) return forbidden("仅超级管理员可管理用户");
  const id = Number((await params).id);
  const t = await sql`SELECT id FROM qoj_users WHERE id = ${id}`;
  if (!t[0]) return notFound("用户不存在");
  const b = await readJson<{ name?: string; roles?: string[]; disabled?: boolean; password?: string }>(req);
  if (b.roles) {
    const roles = b.roles.filter((r) => (ALL_ROLES as string[]).includes(r));
    if (!roles.length) return bad("请至少选择一个角色");
    if (id === u.id && !roles.includes("super_admin")) return bad("不能移除自己的超级管理员角色");
    await sql`UPDATE qoj_users SET roles = ${roles} WHERE id = ${id}`;
  }
  if (typeof b.disabled === "boolean") {
    if (id === u.id) return bad("不能停用自己");
    await sql`UPDATE qoj_users SET disabled = ${b.disabled} WHERE id = ${id}`;
  }
  if (b.name !== undefined) {
    if (!b.name.trim()) return bad("姓名不能为空");
    await sql`UPDATE qoj_users SET name = ${b.name.trim()} WHERE id = ${id}`;
  }
  if (b.password !== undefined) {
    if (b.password.length < 8) return bad("密码至少 8 位");
    await sql`UPDATE qoj_users SET password_hash = ${await bcrypt.hash(b.password, 10)} WHERE id = ${id}`;
  }
  const rows = await sql`SELECT id, email, name, roles, disabled, created_at FROM qoj_users WHERE id = ${id}`;
  return json({ user: rows[0] });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const u = await getUser();
  if (!u) return unauthorized();
  if (!isSuper(u)) return forbidden("仅超级管理员可删除用户");
  const id = Number((await params).id);
  if (id === u.id) {
    // allow the last remaining user (self) to delete only when they are the only user — used to reset the system
    const n = await sql`SELECT count(*)::int AS n FROM qoj_users`;
    if (n[0].n > 1) return bad("不能删除自己");
  }
  const owned = await sql`SELECT count(*)::int AS n FROM qoj_events WHERE user_id = ${id}`;
  if (owned[0].n > 0 && id !== u.id) return bad("该用户名下仍有活动，请先删除或停用该用户");
  await sql`DELETE FROM qoj_users WHERE id = ${id}`;
  return json({ ok: true });
}
