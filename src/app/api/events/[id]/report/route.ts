import { json, loadEvent } from "@/lib/auth";
import { buildReport } from "@/lib/report";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  const u = new URL(req.url).searchParams;
  return json({ report: await buildReport(r.event, { from: u.get("from"), to: u.get("to"), gran: u.get("gran") }) });
}
