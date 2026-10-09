import { sql } from "@/lib/db";
import { forbidden, json, loadInteraction, readJson } from "@/lib/auth";
import type { QuizConfig, QuizState } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const r = await loadInteraction(Number((await params).id));
  if ("error" in r) return r.error;
  if (!r.perms.present) return forbidden("只有主持人可以控制测验");
  const it = r.interaction;
  if (it.type !== "quiz") return json({ error: "不是测验" }, 400);
  const cfg = it.config as QuizConfig;
  const st = (it.state || {}) as QuizState;
  const { action } = await readJson<{ action?: string }>(req);
  let next: QuizState = st;
  const qi = st.currentQ ?? 0;
  switch (action) {
    case "start": next = { phase: "question", currentQ: 0, startedAt: Date.now() }; break;
    case "reveal": next = { ...st, phase: "reveal" }; break;
    case "next":
      if (qi + 1 >= cfg.questions.length) next = { ...st, phase: "finished" };
      else next = { phase: "question", currentQ: qi + 1, startedAt: Date.now() };
      break;
    case "finish": next = { ...st, phase: "finished" }; break;
    case "reset":
      await sql`DELETE FROM qoj_responses WHERE interaction_id = ${it.id}`;
      next = { phase: "idle", currentQ: 0 };
      break;
    default: return json({ error: "未知操作" }, 400);
  }
  await sql`UPDATE qoj_interactions SET state = ${JSON.stringify(next)}::jsonb WHERE id = ${it.id}`;
  return json({ state: next });
}
