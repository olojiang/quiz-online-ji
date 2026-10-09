import { json } from "@/lib/auth";
import { countVisit } from "@/lib/links";
import { fromLink } from "@/lib/public";
import { buildReport } from "@/lib/report";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ hash: string }> };

// read-only shared report link
export async function GET(req: Request, { params }: Ctx) {
  const r = await fromLink((await params).hash, ["report"]);
  if ("error" in r) return r.error;
  const u = new URL(req.url).searchParams;
  if (u.get("visit") === "1") await countVisit(r.link.id);
  return json({ report: await buildReport(r.event, { from: u.get("from"), to: u.get("to"), gran: u.get("gran") }) });
}
