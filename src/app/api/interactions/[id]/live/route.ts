import { json, loadInteraction } from "@/lib/auth";
import { buildLive } from "@/lib/live";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const r = await loadInteraction(Number((await params).id));
  if ("error" in r) return r.error;
  return json({ live: await buildLive(r.interaction, { mode: "admin" }) });
}
