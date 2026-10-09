import { sql } from "@/lib/db";
import { bad, forbidden, json, loadEvent, readJson } from "@/lib/auth";
import { createLink } from "@/lib/links";
import { TOKEN_KINDS, TokenKind } from "@/lib/util";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

// which link types each role may see
function visibleTypes(perms: { manage: boolean; present: boolean; moderate: boolean }): TokenKind[] {
  if (perms.manage) return [...TOKEN_KINDS];
  const t: TokenKind[] = ["guest", "embed"];
  if (perms.present) t.push("screen");
  return t;
}

export async function GET(_req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  const types = visibleTypes(r.perms);
  const rows = await sql`SELECT l.*, u.name AS creator_name,
      (SELECT count(*)::int FROM qoj_participants p WHERE p.link_id = l.id) AS guests
    FROM qoj_links l LEFT JOIN qoj_users u ON u.id = l.created_by
    WHERE l.event_id = ${r.event.id} AND l.type = ANY(${types}) ORDER BY l.created_at DESC`;
  return json({ links: rows, canManage: r.perms.manage });
}

export async function POST(req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  const b = await readJson<{ type?: string; label?: string }>(req);
  const type = String(b.type) as TokenKind;
  if (!TOKEN_KINDS.includes(type)) return bad("无效的链接类型");
  // event admins can create any link; presenters may create a screen link only if none is active
  if (!r.perms.manage) {
    return forbidden("只有活动管理员可以生成链接");
  }
  const link = await createLink(r.event.id, type, r.user.id, String(b.label || "").trim());
  return json({ link });
}
