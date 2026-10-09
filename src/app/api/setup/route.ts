import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { bad, json, readJson, setAuthCookie, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();
  const r = await sql`SELECT count(*)::int AS n FROM qoj_users`;
  return json({ needed: r[0].n === 0 });
}

export async function POST(req: Request) {
  await ensureSchema();
  const b = await readJson<{ email?: string; password?: string; name?: string }>(req);
  const email = (b.email || "").trim().toLowerCase();
  const name = (b.name || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad("请输入有效的邮箱");
  if (!b.password || b.password.length < 8) return bad("密码至少 8 位");
  if (!name) return bad("请输入姓名");
  const hash = await bcrypt.hash(b.password, 10);
  // atomic: only insert when table is empty
  const rows = await sql`INSERT INTO qoj_users (email, password_hash, name, roles)
    SELECT ${email}, ${hash}, ${name}, ARRAY['super_admin','event_admin']::text[]
    WHERE NOT EXISTS (SELECT 1 FROM qoj_users) RETURNING id`;
  if (!rows[0]) return json({ error: "系统已初始化，请直接登录" }, 409);
  const res = NextResponse.json({ ok: true });
  setAuthCookie(res, await signToken(rows[0].id));
  return res;
}
