import { sql } from "@/lib/db";
import { forbidden, json, loadInteraction, readJson } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** Open / close a 评分 interaction. Same people who run the screen (主持人, 活动管理员). */
export async function POST(req: Request, { params }: Ctx) {
  const r = await loadInteraction(Number((await params).id));
  if ("error" in r) return r.error;
  if (!r.perms.present) return forbidden("只有主持人或活动管理员可以开启/结束评分");
  const it = r.interaction;
  if (it.type !== "rate") return json({ error: "不是评分互动" }, 400);
  const { action } = await readJson<{ action?: string }>(req);
  if (action !== "open" && action !== "close") return json({ error: "未知操作" }, 400);
  await sql`UPDATE qoj_interactions SET state = state || ${JSON.stringify({ closed: action === "close" })}::jsonb WHERE id = ${it.id}`;
  return json({ ok: true, closed: action === "close" });
}
