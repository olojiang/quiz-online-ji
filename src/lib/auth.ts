import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureSchema, sql } from "./db";

const COOKIE = "qoj_token";
function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "dev-insecure-secret-change-me");
}

export type Role = "super_admin" | "event_admin" | "moderator" | "presenter";
export const ALL_ROLES: Role[] = ["super_admin", "event_admin", "moderator", "presenter"];

export interface SessionUser { id: number; email: string; name: string; roles: Role[] }
export interface Perms { view: boolean; manage: boolean; moderate: boolean; present: boolean; owner: boolean }

export async function signToken(userId: number) {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Loads the signed-in user fresh from the DB (so disabling / role changes apply immediately). */
export async function getUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const t = store.get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secret());
    await ensureSchema();
    const rows = await sql`SELECT id, email, name, roles, disabled FROM qoj_users WHERE id = ${Number(payload.uid)}`;
    const u = rows[0];
    if (!u || u.disabled) return null;
    return { id: u.id, email: u.email, name: u.name, roles: (u.roles || []) as Role[] };
  } catch {
    return null;
  }
}

export const isSuper = (u: SessionUser) => u.roles.includes("super_admin");
export const canCreateEvents = (u: SessionUser) => isSuper(u) || u.roles.includes("event_admin");

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
export const unauthorized = () => json({ error: "请先登录" }, 401);
export const forbidden = (msg = "没有权限执行此操作") => json({ error: msg }, 403);
export const notFound = (msg = "未找到") => json({ error: msg }, 404);
export const bad = (msg: string) => json({ error: msg }, 400);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function eventPerms(u: SessionUser, ev: Record<string, any>): Promise<Perms> {
  if (isSuper(u)) return { view: true, manage: true, moderate: true, present: true, owner: ev.user_id === u.id };
  if (ev.user_id === u.id && u.roles.includes("event_admin"))
    return { view: true, manage: true, moderate: true, present: true, owner: true };
  const m = await sql`SELECT role FROM qoj_event_members WHERE event_id = ${ev.id} AND user_id = ${u.id}`;
  const roles = m.map((r) => r.role);
  const moderate = roles.includes("moderator");
  const present = roles.includes("presenter");
  return { view: moderate || present, manage: false, moderate, present, owner: false };
}

/** Load event + permissions for the signed-in user. Returns a Response on failure. */
export async function loadEvent(eventId: number) {
  const u = await getUser();
  if (!u) return { error: unauthorized() } as const;
  const rows = await sql`SELECT * FROM qoj_events WHERE id = ${eventId}`;
  const ev = rows[0];
  if (!ev) return { error: notFound("活动不存在") } as const;
  const perms = await eventPerms(u, ev);
  if (!perms.view) return { error: forbidden("你不是该活动的成员") } as const;
  return { user: u, event: ev, perms } as const;
}

export async function loadInteraction(interactionId: number) {
  const u = await getUser();
  if (!u) return { error: unauthorized() } as const;
  const rows = await sql`SELECT * FROM qoj_interactions WHERE id = ${interactionId}`;
  const it = rows[0];
  if (!it) return { error: notFound("互动不存在") } as const;
  const evs = await sql`SELECT * FROM qoj_events WHERE id = ${it.event_id}`;
  const ev = evs[0];
  const perms = await eventPerms(u, ev);
  if (!perms.view) return { error: forbidden("你不是该活动的成员") } as const;
  return { user: u, event: ev, interaction: it, perms } as const;
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { return {} as T; }
}
