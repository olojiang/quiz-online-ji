import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { json, readJson, setAuthCookie, signToken } from "@/lib/auth";

export async function POST(req: Request) {
  await ensureSchema();
  const b = await readJson<{ email?: string; password?: string }>(req);
  const email = (b.email || "").trim().toLowerCase();
  const rows = await sql`SELECT id, password_hash, disabled FROM qoj_users WHERE email = ${email}`;
  const u = rows[0];
  if (!u || !(await bcrypt.compare(b.password || "", u.password_hash))) return json({ error: "邮箱或密码错误" }, 401);
  if (u.disabled) return json({ error: "该账号已被停用，请联系超级管理员" }, 403);
  const res = NextResponse.json({ ok: true });
  setAuthCookie(res, await signToken(u.id));
  return res;
}
