import { sql } from "@/lib/db";
import { forbidden, json, loadInteraction, notFound, readJson, getUser, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const MODERATE = ["approve", "reject", "archive", "unarchive", "delete", "restore"];
const PRESENT = ["pin", "unpin", "answer", "unanswer", "highlight", "unhighlight", "feature", "unfeature"];

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await getUser())) return unauthorized();
  const qid = Number((await params).id);
  const qs = await sql`SELECT * FROM qoj_questions WHERE id = ${qid}`;
  const q = qs[0];
  if (!q) return notFound("问题不存在");
  const r = await loadInteraction(q.interaction_id);
  if ("error" in r) return r.error;
  const { action } = await readJson<{ action?: string }>(req);
  if (!action || (!MODERATE.includes(action) && !PRESENT.includes(action))) return json({ error: "未知操作" }, 400);
  if (MODERATE.includes(action) && !r.perms.moderate) return forbidden("只有审核员可以执行审核操作");
  if (PRESENT.includes(action) && !r.perms.present) return forbidden("只有主持人可以执行现场操作");
  const iid = r.interaction.id;
  switch (action) {
    case "approve": await sql`UPDATE qoj_questions SET status = 'approved', archived = false, reviewed_at = now() WHERE id = ${qid}`; break;
    case "reject": await sql`UPDATE qoj_questions SET status = 'rejected', pinned = false, reviewed_at = now() WHERE id = ${qid}`; break;
    case "restore": await sql`UPDATE qoj_questions SET status = 'pending', reviewed_at = NULL WHERE id = ${qid}`; break;
    case "archive": await sql`UPDATE qoj_questions SET archived = true, pinned = false WHERE id = ${qid}`; break;
    case "unarchive": await sql`UPDATE qoj_questions SET archived = false WHERE id = ${qid}`; break;
    case "delete": await sql`DELETE FROM qoj_questions WHERE id = ${qid}`; break;
    case "pin": await sql`UPDATE qoj_questions SET pinned = true WHERE id = ${qid}`; break;
    case "unpin": await sql`UPDATE qoj_questions SET pinned = false WHERE id = ${qid}`; break;
    case "answer": await sql`UPDATE qoj_questions SET answered = true WHERE id = ${qid}`; break;
    case "unanswer": await sql`UPDATE qoj_questions SET answered = false WHERE id = ${qid}`; break;
    case "highlight": await sql`UPDATE qoj_questions SET highlighted = true WHERE id = ${qid}`; break;
    case "unhighlight": await sql`UPDATE qoj_questions SET highlighted = false WHERE id = ${qid}`; break;
    case "feature":
      if (q.status !== "approved" || q.archived) return json({ error: "只能上墙展示中的问题" }, 400);
      await sql`UPDATE qoj_interactions SET state = state || ${JSON.stringify({ featuredId: qid })}::jsonb WHERE id = ${iid}`; break;
    case "unfeature": await sql`UPDATE qoj_interactions SET state = state - 'featuredId' WHERE id = ${iid}`; break;
  }
  if (["reject", "archive", "delete"].includes(action) && r.interaction.state?.featuredId === qid)
    await sql`UPDATE qoj_interactions SET state = state - 'featuredId' WHERE id = ${iid}`;
  return json({ ok: true });
}
