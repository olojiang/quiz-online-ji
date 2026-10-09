import { json, loadInteraction } from "@/lib/auth";
import { fileResponse, lotteryCSV, rateCSV } from "@/lib/report";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** CSV of one interaction: 评分 (summary, distribution, responses) or 抽奖 (prizes and every winner, voided ones marked). */
export async function GET(_req: Request, { params }: Ctx) {
  const r = await loadInteraction(Number((await params).id));
  if ("error" in r) return r.error;
  if (r.interaction.type === "rate") return fileResponse(await rateCSV(r.event, r.interaction));
  if (r.interaction.type === "lottery") return fileResponse(await lotteryCSV(r.event, r.interaction));
  return json({ error: "仅评分和抽奖互动支持导出" }, 400);
}
