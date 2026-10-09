import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { bad, json, readJson, setAuthCookie, signToken } from "@/lib/auth";

// Public self-registration: new accounts become 活动管理员 for the events they create.
export async function POST(req: Request) {
  await ensureSchema();
  const n = await sql`SELECT count(*)::int AS n FROM qoj_users`;
  if (n[0].n === 0) return json({ error: "系统尚未初始化，请先通过 /setup 创建超级管理员" }, 409);
  const b = await readJson<{ email?: string; password?: string; name?: string }>(req);
  const email = (b.email || "").trim().toLowerCase();
  const name = (b.name || "").trim().slice(0, 40);
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad("请输入有效的邮箱");
  if (!name) return bad("请输入昵称");
  if (!b.password || b.password.length < 8) return bad("密码至少 8 位");
  const ex = await sql`SELECT 1 FROM qoj_users WHERE email = ${email}`;
  if (ex.length) return bad("该邮箱已注册，请直接登录");
  const hash = await bcrypt.hash(b.password, 10);
  const rows = await sql`INSERT INTO qoj_users (email, password_hash, name, roles) VALUES (${email}, ${hash}, ${name}, ARRAY['event_admin']::text[]) RETURNING id`;
  const res = NextResponse.json({ ok: true });
  setAuthCookie(res, await signToken(rows[0].id));
  return res;
}
