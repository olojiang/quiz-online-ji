import { json, loadInteraction } from "@/lib/auth";
import { fileResponse, rateCSV } from "@/lib/report";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** CSV of a 评分 interaction: summary, distribution, per-组别 averages (when FEATURE_GROUPS) and every response. */
export async function GET(_req: Request, { params }: Ctx) {
  const r = await loadInteraction(Number((await params).id));
  if ("error" in r) return r.error;
  if (r.interaction.type !== "rate") return json({ error: "仅评分互动支持导出" }, 400);
  return fileResponse(await rateCSV(r.event, r.interaction));
}
