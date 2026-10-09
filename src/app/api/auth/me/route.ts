import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { bad, canCreateEvents, getUser, isSuper, json, readJson, unauthorized } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getUser();
  if (!u) return unauthorized();
  return json({ user: u, isSuper: isSuper(u), canCreateEvents: canCreateEvents(u) });
}

// 个人信息: update nickname and/or password (current password required for password change)
export async function PATCH(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const b = await readJson<{ name?: string; currentPassword?: string; newPassword?: string }>(req);
  if (b.name !== undefined) {
    const name = String(b.name).trim().slice(0, 40);
    if (!name) return bad("昵称不能为空");
    await sql`UPDATE qoj_users SET name = ${name} WHERE id = ${u.id}`;
  }
  if (b.newPassword !== undefined) {
    if (String(b.newPassword).length < 8) return bad("新密码至少 8 位");
    const rows = await sql`SELECT password_hash FROM qoj_users WHERE id = ${u.id}`;
    if (!(await bcrypt.compare(String(b.currentPassword || ""), rows[0].password_hash))) return bad("当前密码不正确");
    await sql`UPDATE qoj_users SET password_hash = ${await bcrypt.hash(String(b.newPassword), 10)} WHERE id = ${u.id}`;
  }
  const out = await sql`SELECT id, email, name, roles FROM qoj_users WHERE id = ${u.id}`;
  return json({ user: out[0] });
}
