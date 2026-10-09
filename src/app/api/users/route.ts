import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { ALL_ROLES, bad, canCreateEvents, forbidden, getUser, isSuper, json, readJson, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

// super admin: full list; event admins: lite list (to assign members)
export async function GET() {
  const u = await getUser();
  if (!u) return unauthorized();
  if (isSuper(u)) {
    const rows = await sql`SELECT id, email, name, roles, disabled, created_at FROM qoj_users ORDER BY id`;
    return json({ users: rows });
  }
  if (canCreateEvents(u)) {
    const rows = await sql`SELECT id, email, name, roles FROM qoj_users WHERE disabled = false ORDER BY id`;
    return json({ users: rows });
  }
  return forbidden();
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  if (!isSuper(u)) return forbidden("仅超级管理员可创建用户");
  const b = await readJson<{ email?: string; name?: string; password?: string; roles?: string[] }>(req);
  const email = (b.email || "").trim().toLowerCase();
  const name = (b.name || "").trim();
  const roles = (b.roles || []).filter((r) => (ALL_ROLES as string[]).includes(r));
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad("请输入有效的邮箱");
  if (!name) return bad("请输入姓名");
  if (!b.password || b.password.length < 8) return bad("初始密码至少 8 位");
  if (!roles.length) return bad("请至少选择一个角色");
  const exists = await sql`SELECT 1 FROM qoj_users WHERE email = ${email}`;
  if (exists.length) return bad("该邮箱已存在");
  const hash = await bcrypt.hash(b.password, 10);
  const rows = await sql`INSERT INTO qoj_users (email, password_hash, name, roles) VALUES (${email}, ${hash}, ${name}, ${roles}) RETURNING id, email, name, roles, disabled, created_at`;
  return json({ user: rows[0] });
}
