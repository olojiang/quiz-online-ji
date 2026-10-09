import { sql } from "@/lib/db";
import { json } from "@/lib/auth";
import { buildLive } from "@/lib/live";
import { countVisit, primaryLink } from "@/lib/links";
import { fromLink } from "@/lib/public";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ hash: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const r = await fromLink((await params).hash, ["screen"]);
  if ("error" in r) return r.error;
  const ev = r.event;
  const url = new URL(req.url);
  if (url.searchParams.get("visit") === "1") await countVisit(r.link.id);
  let live = null;
  if (ev.current_interaction_id) {
    const rows = await sql`SELECT * FROM qoj_interactions WHERE id = ${ev.current_interaction_id}`;
    if (rows[0]) live = await buildLive(rows[0], { mode: "screen", sort: url.searchParams.get("sort") || "hot" });
  }
  const guest = await primaryLink(ev.id, "guest");
  const p = await sql`SELECT count(*)::int AS total FROM qoj_participants WHERE event_id = ${ev.id}`;
  return json({
    // the screen may know the guest link (it shows its QR) — never the other way round
    event: { id: ev.id, name: ev.name, status: ev.status, description: ev.description || "", screen_channel: ev.screen_channel, screen_theme: ev.screen_theme },
    guestHash: guest?.hash || null, live, participants: p[0],
  });
}
