import { FEATURE_GROUPS } from "@/lib/features";
import { sql } from "@/lib/db";
import { forbidden, json, loadInteraction, readJson } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const r = await loadInteraction(Number((await params).id));
  if ("error" in r) return r.error;
  if (!r.perms.moderate && !r.perms.present) return forbidden();
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") || "showing";
  const q = (url.searchParams.get("q") || "").trim();
  const group = FEATURE_GROUPS ? url.searchParams.get("group") || "" : "";
  const filter = url.searchParams.get("filter") || "all";
  const id = r.interaction.id;
  const like = q ? `%${q}%` : "%";
  const rows = await sql`SELECT q.*, (SELECT count(*)::int FROM qoj_comments c WHERE c.question_id = q.id) AS comment_count
    FROM qoj_questions q WHERE q.interaction_id = ${id}
      AND (
        (${tab} = 'showing' AND q.status = 'approved' AND q.archived = false) OR
        (${tab} = 'pending' AND q.status = 'pending' AND q.archived = false) OR
        (${tab} = 'history' AND q.reviewed_at IS NOT NULL) OR
        (${tab} = 'archived' AND q.archived = true)
      )
      AND (q.text ILIKE ${like} OR q.nickname ILIKE ${like})
      AND (${group} = '' OR q.group_name = ${group})
      AND (
        ${filter} = 'all' OR (${filter} = 'highlighted' AND q.highlighted) OR (${filter} = 'pinned' AND q.pinned)
        OR (${filter} = 'answered' AND q.answered) OR (${filter} = 'unanswered' AND NOT q.answered)
        OR (${filter} = 'flagged' AND q.flag_reason IS NOT NULL)
      )
    ORDER BY CASE WHEN ${tab} = 'history' THEN q.reviewed_at END DESC NULLS LAST,
      CASE WHEN ${tab} = 'showing' THEN q.pinned END DESC, q.created_at DESC
    LIMIT 500`;
  const c = await sql`SELECT
      count(*) FILTER (WHERE status = 'approved' AND archived = false)::int AS showing,
      count(*) FILTER (WHERE status = 'pending' AND archived = false)::int AS pending,
      count(*) FILTER (WHERE reviewed_at IS NOT NULL)::int AS history,
      count(*) FILTER (WHERE archived = true)::int AS archived
    FROM qoj_questions WHERE interaction_id = ${id}`;
  const groups = await sql`SELECT DISTINCT group_name FROM qoj_questions WHERE interaction_id = ${id} AND group_name <> '' ORDER BY group_name`;
  return json({
    questions: rows, counts: c[0], groups: FEATURE_GROUPS ? groups.map((g) => g.group_name) : [],
    featuredId: r.interaction.state?.featuredId ?? null, autoApprove: !!r.interaction.config?.autoApprove, perms: r.perms,
  });
}

// bulk actions
export async function POST(req: Request, { params }: Ctx) {
  const r = await loadInteraction(Number((await params).id));
  if ("error" in r) return r.error;
  const b = await readJson<{ action?: string }>(req);
  if (b.action === "archive_all") {
    if (!r.perms.moderate) return forbidden("只有审核员可以归档问题");
    await sql`UPDATE qoj_questions SET archived = true WHERE interaction_id = ${r.interaction.id} AND status = 'approved' AND archived = false`;
    await sql`UPDATE qoj_interactions SET state = state - 'featuredId' WHERE id = ${r.interaction.id}`;
    return json({ ok: true });
  }
  return json({ error: "未知操作" }, 400);
}
