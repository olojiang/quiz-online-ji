import { FEATURE_GROUPS } from "@/lib/features";
import { sql } from "./db";
import { TYPE_LABEL } from "./types";
import { rateStats } from "./live";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const ALL_TYPES: [string, string][] = [
  ["qa", "提问"], ["poll", "选择题"], ["cloud", "标签云"], ["quiz", "测验"], ["rate", "评分"], ["open", "开放话题"], ["danmu", "弹幕"], ["lottery", "抽奖"],
];
const TZ = "Asia/Shanghai";
const STATUS_ZH: Record<string, string> = { approved: "已通过", pending: "待审核", rejected: "已拒绝" };

async function contributions(eventId: number) {
  return sql`WITH evq AS (SELECT q.id, q.participant_id FROM qoj_questions q JOIN qoj_interactions i ON i.id = q.interaction_id WHERE i.event_id = ${eventId}),
    c AS (
      SELECT participant_id, 'q' AS k FROM evq
      UNION ALL SELECT l.participant_id, 'l' FROM qoj_question_likes l JOIN evq ON evq.id = l.question_id
      UNION ALL SELECT cm.participant_id, 'c' FROM qoj_comments cm JOIN evq ON evq.id = cm.question_id
      UNION ALL SELECT r.participant_id, 'r' FROM qoj_responses r JOIN qoj_interactions i ON i.id = r.interaction_id WHERE i.event_id = ${eventId}
    )
    SELECT c.participant_id, COALESCE(NULLIF(p.nickname, ''), '匿名嘉宾') AS nickname, COALESCE(p.group_name, '') AS group_name,
      count(*) FILTER (WHERE k = 'q')::int AS questions, count(*) FILTER (WHERE k = 'l')::int AS likes,
      count(*) FILTER (WHERE k = 'c')::int AS comments, count(*) FILTER (WHERE k = 'r')::int AS responses, count(*)::int AS total
    FROM c LEFT JOIN qoj_participants p ON p.event_id = ${eventId} AND p.participant_id = c.participant_id
    GROUP BY c.participant_id, p.nickname, p.group_name ORDER BY total DESC, questions DESC`;
}

export async function trend(eventId: number, fromIn?: string | null, toIn?: string | null, granIn?: string | null) {
  let gran = ["minute", "hour", "day"].includes(String(granIn)) ? String(granIn) : "hour";
  const span = await sql`SELECT min(minute) AS a, max(minute) AS b FROM qoj_visits WHERE event_id = ${eventId}`;
  const from = fromIn ? new Date(fromIn) : span[0].a ? new Date(span[0].a) : new Date(Date.now() - 3600e3);
  const to = toIn ? new Date(toIn) : new Date(Math.max(Date.now(), span[0].b ? new Date(span[0].b).getTime() : 0));
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return { gran, points: [], from: null, to: null };
  const mins = (to.getTime() - from.getTime()) / 60000;
  // keep charts readable: auto-coarsen when the requested granularity would produce too many points
  if (gran === "minute" && mins > 720) gran = "hour";
  if (gran === "hour" && mins / 60 > 24 * 45) gran = "day";
  const step = `1 ${gran}`;
  const rows = await sql`WITH s AS (
      SELECT generate_series(date_trunc(${gran}, ${from.toISOString()}::timestamptz AT TIME ZONE ${TZ}), date_trunc(${gran}, ${to.toISOString()}::timestamptz AT TIME ZONE ${TZ}), ${step}::interval) AS b
    ), v AS (
      SELECT date_trunc(${gran}, minute AT TIME ZONE ${TZ}) AS b, count(DISTINCT participant_id)::int AS n FROM qoj_visits
      WHERE event_id = ${eventId} AND minute >= ${from.toISOString()}::timestamptz - interval '1 minute' AND minute <= ${to.toISOString()}::timestamptz GROUP BY 1
    )
    SELECT to_char(s.b, 'YYYY-MM-DD HH24:MI') AS t, COALESCE(v.n, 0) AS n FROM s LEFT JOIN v ON v.b = s.b ORDER BY s.b LIMIT 1500`;
  return { gran, points: rows.map((r) => ({ t: r.t, n: r.n })), from: from.toISOString(), to: to.toISOString() };
}

export async function buildReport(ev: Row, q: { from?: string | null; to?: string | null; gran?: string | null }) {
  const id = ev.id;
  const [, contrib, inter, qaStats, hot, links] = await Promise.all([
    sql`SELECT count(*)::int AS n FROM qoj_participants WHERE event_id = ${id}`,
    contributions(id),
    sql`SELECT type, count(*)::int AS n FROM qoj_interactions WHERE event_id = ${id} GROUP BY type`,
    sql`SELECT count(*)::int AS total, count(DISTINCT q.participant_id)::int AS askers,
        count(*) FILTER (WHERE q.status = 'pending' AND NOT q.archived)::int AS pending,
        count(*) FILTER (WHERE q.status = 'approved' AND NOT q.archived)::int AS showing,
        count(*) FILTER (WHERE q.archived OR q.answered)::int AS archived_or_answered,
        COALESCE(sum(q.likes), 0)::int AS likes
      FROM qoj_questions q JOIN qoj_interactions i ON i.id = q.interaction_id WHERE i.event_id = ${id}`,
    sql`SELECT q.id, q.nickname, q.group_name, q.text, q.likes, q.status, q.answered, q.created_at,
        (SELECT count(*)::int FROM qoj_comments c WHERE c.question_id = q.id) AS comments
      FROM qoj_questions q JOIN qoj_interactions i ON i.id = q.interaction_id
      WHERE i.event_id = ${id} AND q.status = 'approved' ORDER BY q.likes DESC, q.created_at DESC LIMIT 20`,
    sql`SELECT l.id, l.label, l.type, l.visits, l.revoked_at, (SELECT count(*)::int FROM qoj_participants p WHERE p.link_id = l.id) AS guests
      FROM qoj_links l WHERE l.event_id = ${id} AND l.type IN ('guest','embed') ORDER BY l.created_at`,
  ]);
  const typeCounts = Object.fromEntries(inter.map((r) => [r.type, r.n]));
  const groupMap = new Map<string, Row>();
  const pg = await sql`SELECT COALESCE(NULLIF(group_name, ''), '未填写') AS g, count(*)::int AS guests FROM qoj_participants WHERE event_id = ${id} GROUP BY 1`;
  for (const r of pg) groupMap.set(r.g, { group: r.g, guests: r.guests, active: 0, questions: 0, likes: 0, total: 0 });
  for (const c of contrib) {
    const g = c.group_name || "未填写";
    const row = groupMap.get(g) || { group: g, guests: 0, active: 0, questions: 0, likes: 0, total: 0 };
    row.active++; row.questions += c.questions; row.likes += c.likes; row.total += c.total;
    groupMap.set(g, row);
  }
  const ratings = await ratingResults(id);
  return {
    event: { name: ev.name, status: ev.status, event_date: ev.event_date },
    kpis: {
      // every contributor is also a visitor, even if their visit row was never written
      totalGuests: new Set([...(await sql`SELECT participant_id FROM qoj_participants WHERE event_id = ${id}`).map((r) => r.participant_id), ...contrib.map((c) => c.participant_id)]).size,
      activeGuests: contrib.length,
      contributions: contrib.reduce((s, c) => s + c.total, 0),
      interactions: inter.reduce((s, r) => s + r.n, 0),
    },
    typeDist: ALL_TYPES.map(([k, label]) => ({ type: k, label, n: typeCounts[k] || 0 })),
    trend: await trend(id, q.from, q.to, q.gran),
    leaderboard: contrib.slice(0, 50).map((c) => (FEATURE_GROUPS ? c : { ...c, group_name: "" })),
    groups: FEATURE_GROUPS ? [...groupMap.values()].sort((a, b) => b.total - a.total) : [],
    links: links.map((l) => ({ id: l.id as number, type: l.type as string, visits: l.visits as number, guests: l.guests as number, revoked_at: l.revoked_at, label: l.label || (l.type === "embed" ? "嵌入链接" : "默认嘉宾链接") })),
    qa: { stats: qaStats[0], hot: FEATURE_GROUPS ? hot : hot.map((h) => ({ ...h, group_name: "" })) },
    ratings,
  };
}

/** 评分结果 for the report: one entry per 评分 interaction. Names are dropped when the rating is anonymous. */
export async function ratingResults(eventId: number) {
  const its = await sql`SELECT * FROM qoj_interactions WHERE event_id = ${eventId} AND type = 'rate' ORDER BY id`;
  const out = [];
  for (const it of its) {
    const st = await rateStats(it);
    out.push({
      id: it.id as number, title: it.title as string, closed: !!it.state?.closed, scale: st.scale, max: st.max, anonymous: st.anonymous, raters: st.raters,
      items: st.items, byGroup: FEATURE_GROUPS ? st.byGroup : [],
      comments: st.comments.slice(0, 50).map((c) => ({ text: c.text, created_at: c.created_at, nickname: st.anonymous ? "" : c.nickname, group_name: st.anonymous || !FEATURE_GROUPS ? "" : c.group_name })),
      commentCount: st.comments.length,
    });
  }
  return out;
}

/* ---------------- export ---------------- */
/** 组别 column helper: the column is present only while FEATURE_GROUPS is on. */
const gcol = (v: unknown): unknown[] => (FEATURE_GROUPS ? [v] : []);
const csvCell = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCSV(rows: unknown[][]) { return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"); }
const fmt = (d: string | Date) => new Intl.DateTimeFormat("zh-CN", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d));

async function questionRows(eventId: number) {
  const rows = await sql`SELECT q.nickname, q.group_name, q.text, q.status, q.archived, q.answered, q.pinned, q.highlighted, q.likes, q.flag_reason, q.created_at,
      (SELECT count(*)::int FROM qoj_comments c WHERE c.question_id = q.id) AS comments
    FROM qoj_questions q JOIN qoj_interactions i ON i.id = q.interaction_id WHERE i.event_id = ${eventId} ORDER BY q.created_at`;
  return [["姓名", ...gcol("组别"), "问题", "状态", "点赞", "评论", "已回答", "置顶", "精选", "系统标记", "时间"],
    ...rows.map((r) => [r.nickname, ...gcol(r.group_name), r.text, r.archived ? "已归档" : STATUS_ZH[r.status] || r.status, r.likes, r.comments, r.answered ? "是" : "", r.pinned ? "是" : "", r.highlighted ? "是" : "", r.flag_reason || "", fmt(r.created_at)])];
}
async function guestRows(eventId: number) {
  const contrib = await contributions(eventId);
  return [["排名", "姓名", ...gcol("组别"), "提问", "点赞", "评论", "互动作答", "贡献总数"],
    ...contrib.map((c, i) => [i + 1, c.nickname, ...gcol(c.group_name), c.questions, c.likes, c.comments, c.responses, c.total])];
}
async function responseRows(eventId: number) {
  const rows = await sql`SELECT i.title, i.type, i.config, r.nickname, r.question_index, r.answer, r.correct, r.score, r.created_at
    FROM qoj_responses r JOIN qoj_interactions i ON i.id = r.interaction_id WHERE i.event_id = ${eventId} ORDER BY i.id, r.created_at`;
  return [["互动", "类型", "姓名", "题目", "回答", "是否正确", "得分", "时间"], ...rows.map((r) => {
    let qText = "", ans = "";
    if (r.type === "poll") { qText = r.config.question; ans = (r.answer || []).map((i: number) => r.config.options[i]).join(" / "); }
    else if (r.type === "quiz") { const q = r.config.questions[r.question_index] || {}; qText = q.text; ans = (r.answer || []).map((i: number) => q.options?.[i]).join(" / "); }
    else if (r.type === "rate") { qText = (r.config.items || []).join(" / "); ans = (r.config.items || []).map((n: string, i: number) => `${n}: ${r.answer?.scores?.[i] ?? ""}`).join("; ") + (r.answer?.comment ? ` | ${r.answer.comment}` : ""); }
    else { qText = r.config.prompt; ans = r.answer?.text || ""; }
    return [r.title, TYPE_LABEL[r.type] || r.type, r.type === "rate" && r.config.anonymous ? "匿名" : r.nickname, qText, ans, r.correct === null ? "" : r.correct ? "是" : "否", r.type === "quiz" ? r.score : "", fmt(r.created_at)];
  })];
}

const scaleLabel = (scale: string, max: number) => (scale === "score" ? `分数（1–${max}）` : `星级（1–${max} 星）`);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ratingSheet(ratings: any[]) {
  const rows: unknown[][] = [];
  for (const r of ratings) {
    rows.push([`评分：${r.title}`, scaleLabel(r.scale, r.max), `评分人数 ${r.raters}`, r.closed ? "已结束" : "进行中"]);
    rows.push(["评分项", "平均分", "评分人数", ...Array.from({ length: r.max }, (_, i) => `${i + 1} 分`)]);
    for (const it of r.items) rows.push([it.name, it.avg ?? "", it.count, ...it.dist]);
    rows.push([]);
  }
  return rows;
}

/** Single-interaction CSV for the console's 导出 CSV button. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rateCSV(ev: Row, it: Row) {
  const st = await rateStats(it);
  const rows: unknown[][] = [
    ["评分", it.title], ["评分方式", scaleLabel(st.scale, st.max)], ["评分人数", st.raters], ["状态", it.state?.closed ? "已结束" : "进行中"], ["匿名展示", st.anonymous ? "是" : "否"], [],
    ["评分项", "平均分", "评分人数", ...Array.from({ length: st.max }, (_, i) => `${i + 1} 分人数`)],
    ...st.items.map((x) => [x.name, x.avg ?? "", x.count, ...x.dist]), [],
    ...(FEATURE_GROUPS ? [["组别", "评分人数", ...st.items.map((x) => `${x.name} 平均分`)],
      ...st.byGroup.map((g) => [g.group, g.raters, ...g.avgs.map((a) => a ?? "")]), []] : []),
    ["姓名", ...gcol("组别"), ...st.items.map((x) => x.name), "评论", "时间"],
    ...st.rows.map((r) => [st.anonymous ? "匿名" : r.nickname, ...gcol(r.group_name || ""), ...st.items.map((_, i) => r.answer?.scores?.[i] ?? ""), r.answer?.comment || "", fmt(r.created_at)]),
  ];
  const base = `${ev.name}-${it.title}`.replace(/[\\/:*?"<>|]/g, "_");
  return { filename: `${base}-评分结果.csv`, body: toCSV(rows), type: "text/csv; charset=utf-8" };
}

function xmlEsc(s: unknown) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function spreadsheetML(sheets: [string, unknown[][]][]) {
  const ws = sheets.map(([name, rows]) => `<Worksheet ss:Name="${xmlEsc(name)}"><Table>${rows.map((r, ri) => `<Row>${r.map((c) => `<Cell${ri === 0 ? ' ss:StyleID="h"' : ""}><Data ss:Type="${typeof c === "number" ? "Number" : "String"}">${xmlEsc(c)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>${ws}</Workbook>`;
}

export async function exportFile(ev: Row, section: string): Promise<{ filename: string; body: string; type: string }> {
  const base = `${ev.name}`.replace(/[\\/:*?"<>|]/g, "_");
  if (section === "questions") return { filename: `${base}-问题列表.csv`, body: toCSV(await questionRows(ev.id)), type: "text/csv; charset=utf-8" };
  if (section === "guests") {
    const rep = await buildReport(ev, {});
    const groupRows: unknown[][] = FEATURE_GROUPS ? [[], ["组别", "嘉宾数", "活跃嘉宾", "提问", "点赞", "贡献总数"], ...rep.groups.map((g) => [g.group, g.guests, g.active, g.questions, g.likes, g.total])] : [];
    const rows = [...(await guestRows(ev.id)), ...groupRows,
      [], ["嘉宾参与趋势（时间）", "活跃嘉宾数"], ...rep.trend.points.map((p) => [p.t, p.n])];
    return { filename: `${base}-嘉宾数据.csv`, body: toCSV(rows), type: "text/csv; charset=utf-8" };
  }
  const rep = await buildReport(ev, { gran: "hour" });
  const overview: unknown[][] = [["指标", "数值"], ["活动名称", ev.name], ["总参与人数", rep.kpis.totalGuests], ["活跃参与人数", rep.kpis.activeGuests], ["互动贡献总数", rep.kpis.contributions], ["互动内容数量", rep.kpis.interactions],
    [], ["互动类型", "数量"], ...rep.typeDist.map((t) => [t.label, t.n]),
    [], ["问答指标", "数值"], ["问题总数", rep.qa.stats.total], ["参与提问人数", rep.qa.stats.askers], ["待审核", rep.qa.stats.pending], ["展示中", rep.qa.stats.showing], ["已归档或已回答", rep.qa.stats.archived_or_answered], ["点赞数", rep.qa.stats.likes]];
  return {
    filename: `${base}-活动报告.xls`, type: "application/vnd.ms-excel; charset=utf-8",
    body: spreadsheetML([
      ["概览", overview],
      ["嘉宾贡献", await guestRows(ev.id)],
      ...(FEATURE_GROUPS ? [["组别", [["组别", "嘉宾数", "活跃嘉宾", "提问", "点赞", "贡献总数"], ...rep.groups.map((g) => [g.group, g.guests, g.active, g.questions, g.likes, g.total])]] as [string, unknown[][]]] : []),
      ["参与趋势", [["时间（小时）", "活跃嘉宾数"], ...rep.trend.points.map((p) => [p.t, p.n])]],
      ["问题", await questionRows(ev.id)],
      ["互动作答", await responseRows(ev.id)],
      ...(rep.ratings.length ? [["评分结果", ratingSheet(rep.ratings)] as [string, unknown[][]]] : []),
      ["来源链接", [["链接", "访问次数", "嘉宾数", "状态"], ...rep.links.map((l) => [l.label, l.visits, l.guests, l.revoked_at ? "已失效" : "有效"])]],
    ]),
  };
}

export function fileResponse(f: { filename: string; body: string; type: string }) {
  return new Response(f.body, { headers: { "Content-Type": f.type, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.filename)}`, "Cache-Control": "no-store" } });
}
