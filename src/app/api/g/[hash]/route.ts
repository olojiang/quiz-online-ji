import { FEATURE_GROUPS } from "@/lib/features";
import { sql } from "@/lib/db";
import { json } from "@/lib/auth";
import { buildLive } from "@/lib/live";
import { countVisit } from "@/lib/links";
import { askState, fromLink, guestInteraction, publicEvent, qaOf } from "@/lib/public";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ hash: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const r = await fromLink((await params).hash, ["guest", "embed"]);
  if ("error" in r) return r.error;
  const ev = r.event;
  const url = new URL(req.url);
  const pid = (url.searchParams.get("pid") || "").slice(0, 64);
  const nick = (url.searchParams.get("nick") || "").slice(0, 40);
  const group = FEATURE_GROUPS ? (url.searchParams.get("group") || "").slice(0, 40) : "";
  const sort = url.searchParams.get("sort") || "hot";
  if (url.searchParams.get("visit") === "1") await countVisit(r.link.id);
  if (pid) {
    await sql`INSERT INTO qoj_participants (event_id, participant_id, nickname, group_name, link_id) VALUES (${ev.id}, ${pid}, ${nick}, ${group}, ${r.link.id})
      ON CONFLICT (event_id, participant_id) DO UPDATE SET last_seen = now(),
        nickname = CASE WHEN EXCLUDED.nickname <> '' THEN EXCLUDED.nickname ELSE qoj_participants.nickname END,
        group_name = CASE WHEN EXCLUDED.group_name <> '' THEN EXCLUDED.group_name ELSE qoj_participants.group_name END,
        link_id = COALESCE(qoj_participants.link_id, EXCLUDED.link_id)`;
    await sql`INSERT INTO qoj_visits (event_id, participant_id, minute) VALUES (${ev.id}, ${pid}, date_trunc('minute', now())) ON CONFLICT DO NOTHING`;
  }
  const it = await guestInteraction(ev);
  const live = it ? await buildLive(it, { participantId: pid, mode: "audience", sort }) : null;
  let qa = null;
  if (it && it.type !== "qa") {
    const q = await qaOf(ev.id);
    if (q) qa = await buildLive(q, { participantId: pid, mode: "audience", sort });
  }
  return json({ event: publicEvent(ev), live, qa, ...askState(ev), linkLabel: r.link.label, serverTime: Date.now() });
}
