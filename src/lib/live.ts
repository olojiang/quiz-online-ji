import { FEATURE_GROUPS } from "@/lib/features";
import { sql } from "./db";
import type { LotteryConfig, PollConfig, QuizConfig, QuizState, RateConfig } from "./types";
import { eligible, lotteryPeople, lotteryState, lotteryWinners, prizeSummary } from "./lottery";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function leaderboard(interactionId: number, limit = 10) {
  const rows = await sql`SELECT participant_id, max(nickname) AS nickname, sum(score)::int AS score,
      count(*) FILTER (WHERE correct)::int AS correct
    FROM qoj_responses WHERE interaction_id = ${interactionId}
    GROUP BY participant_id ORDER BY score DESC, correct DESC LIMIT ${limit}`;
  return rows;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Aggregate 评分 responses. Scores outside 1..max (e.g. after the organizer lowered the max) are ignored. */
export async function rateStats(it: Row) {
  const cfg = it.config as RateConfig;
  const max = cfg.max || 5;
  const rows = await sql`SELECT r.participant_id, r.nickname, r.answer, r.created_at, COALESCE(NULLIF(r.answer->>'group', ''), p.group_name, '') AS group_name
    FROM qoj_responses r JOIN qoj_interactions i ON i.id = r.interaction_id
    LEFT JOIN qoj_participants p ON p.event_id = i.event_id AND p.participant_id = r.participant_id
    WHERE r.interaction_id = ${it.id} ORDER BY r.created_at DESC`;
  const items = (cfg.items || []).map((name) => ({ name, sum: 0, count: 0, dist: Array.from({ length: max }, () => 0) as number[] }));
  const groups = new Map<string, { group: string; raters: number; sums: number[]; counts: number[] }>();
  const comments: Row[] = [];
  for (const r of rows) {
    const scores: unknown[] = Array.isArray(r.answer?.scores) ? r.answer.scores : [];
    const g = r.group_name || "未填写";
    const gr = groups.get(g) || { group: g, raters: 0, sums: items.map(() => 0), counts: items.map(() => 0) };
    gr.raters++;
    items.forEach((it2, i) => {
      const v = Number(scores[i]);
      if (!Number.isInteger(v) || v < 1 || v > max) return;
      it2.sum += v; it2.count++; it2.dist[v - 1]++;
      gr.sums[i] += v; gr.counts[i]++;
    });
    groups.set(g, gr);
    const c = String(r.answer?.comment || "").trim();
    if (c) comments.push({ participant_id: r.participant_id, nickname: r.nickname, group_name: r.group_name, text: c, scores, created_at: r.created_at });
  }
  return {
    rows, raters: rows.length, max, scale: cfg.scale || "star", allowComment: !!cfg.allowComment, anonymous: !!cfg.anonymous,
    items: items.map((x) => ({ name: x.name, avg: x.count ? r1(x.sum / x.count) : null, count: x.count, dist: x.dist })),
    byGroup: [...groups.values()].sort((a, b) => b.raters - a.raters).map((g) => ({ group: g.group, raters: g.raters, avgs: g.sums.map((s, i) => (g.counts[i] ? r1(s / g.counts[i]) : null)) })),
    comments,
  };
}

export async function buildLive(it: Row, opts: { participantId?: string; mode: "audience" | "screen" | "admin"; sort?: string }) {
  const pid = opts.participantId || "";
  const base = { id: it.id, type: it.type, title: it.title };
  if (it.type === "qa") {
    const sortHot = opts.sort !== "time";
    let rows: Row[];
    if (opts.mode === "audience") {
      rows = await sql`SELECT q.id, q.nickname, q.group_name, q.text, q.status, q.pinned, q.answered, q.highlighted, q.likes, q.created_at,
          q.participant_id = ${pid} AS mine,
          EXISTS(SELECT 1 FROM qoj_question_likes l WHERE l.question_id = q.id AND l.participant_id = ${pid}) AS liked,
          (SELECT count(*)::int FROM qoj_comments c WHERE c.question_id = q.id) AS comment_count
        FROM qoj_questions q
        WHERE q.interaction_id = ${it.id} AND q.archived = false
          AND (q.status = 'approved' OR (q.status = 'pending' AND q.participant_id = ${pid}))
        ORDER BY q.created_at DESC LIMIT 300`;
    } else {
      rows = await sql`SELECT q.id, q.nickname, q.group_name, q.text, q.status, q.pinned, q.answered, q.highlighted, q.likes, q.created_at,
          (SELECT count(*)::int FROM qoj_comments c WHERE c.question_id = q.id) AS comment_count
        FROM qoj_questions q
        WHERE q.interaction_id = ${it.id} AND q.archived = false AND q.status = 'approved'
        ORDER BY q.created_at DESC LIMIT 300`;
    }
    rows.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortHot && a.likes !== b.likes) return b.likes - a.likes;
      return opts.mode === "screen" && !sortHot
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const featuredId = it.state?.featuredId ?? null;
    let featured: Row | null = null;
    if (featuredId) {
      featured = rows.find((r) => r.id === featuredId) || null;
      if (!featured && opts.mode !== "audience") {
        const f = await sql`SELECT id, nickname, group_name, text, likes, pinned, answered, highlighted, created_at FROM qoj_questions WHERE id = ${featuredId} AND status = 'approved' AND archived = false`;
        featured = f[0] || null;
      }
    }
    return { ...base, questions: rows, approvedCount: rows.filter((r) => r.status === "approved").length, featuredId: featured ? featured.id : null, featured };
  }
  if (it.type === "poll") {
    const cfg = it.config as PollConfig;
    const resp = await sql`SELECT participant_id, answer FROM qoj_responses WHERE interaction_id = ${it.id}`;
    const counts = cfg.options.map(() => 0);
    let mine: number[] | null = null;
    for (const r of resp) {
      const ans: number[] = Array.isArray(r.answer) ? r.answer : [];
      for (const i of ans) if (counts[i] !== undefined) counts[i]++;
      if (r.participant_id === pid) mine = ans;
    }
    return { ...base, question: cfg.question, options: cfg.options, multi: cfg.multi, counts, voters: resp.length, mine };
  }
  if (it.type === "quiz") {
    const cfg = it.config as QuizConfig;
    const st = (it.state || {}) as QuizState;
    const phase = st.phase || "idle";
    const qi = st.currentQ ?? 0;
    const q = cfg.questions[qi];
    const now = Date.now();
    let remaining = 0;
    if (phase === "question" && q && st.startedAt) remaining = Math.max(0, Math.ceil((st.startedAt + q.timeLimit * 1000 - now) / 1000));
    const showAnswer = phase === "reveal" || phase === "finished" || opts.mode === "admin";
    let dist: number[] = [];
    let answeredCount = 0;
    let mine: Row | null = null;
    if (q) {
      const resp = await sql`SELECT participant_id, answer, correct, score FROM qoj_responses WHERE interaction_id = ${it.id} AND question_index = ${qi}`;
      dist = q.options.map(() => 0);
      for (const r of resp) {
        for (const i of (r.answer as number[]) || []) if (dist[i] !== undefined) dist[i]++;
        if (r.participant_id === pid) mine = { answer: r.answer, correct: showAnswer ? r.correct : null, score: showAnswer ? r.score : null };
      }
      answeredCount = resp.length;
    }
    const lb = await leaderboard(it.id, 10);
    let myTotal: number | null = null;
    let myRank: number | null = null;
    if (pid) {
      const all = await sql`SELECT participant_id, sum(score)::int AS score FROM qoj_responses WHERE interaction_id = ${it.id} GROUP BY participant_id ORDER BY score DESC`;
      const idx = all.findIndex((r) => r.participant_id === pid);
      if (idx >= 0) { myRank = idx + 1; myTotal = all[idx].score; }
    }
    return {
      ...base, phase, currentQ: qi, total: cfg.questions.length, remaining,
      question: q && phase !== "idle" ? { text: q.text, options: q.options, timeLimit: q.timeLimit, multi: q.correct.length > 1, correct: showAnswer ? q.correct : null } : null,
      dist: showAnswer || opts.mode !== "audience" ? dist : null, answeredCount, mine, leaderboard: lb, myTotal, myRank,
    };
  }
  if (it.type === "open") {
    const rows = await sql`SELECT id, nickname, answer, created_at, participant_id = ${pid} AS mine FROM qoj_responses WHERE interaction_id = ${it.id} ORDER BY created_at DESC LIMIT 200`;
    const cnt = await sql`SELECT count(*)::int AS n FROM qoj_responses WHERE interaction_id = ${it.id}`;
    return { ...base, prompt: it.config?.prompt || it.title, responses: rows.map((r) => ({ id: r.id, nickname: r.nickname, text: r.answer?.text || "", created_at: r.created_at, mine: r.mine })), count: cnt[0].n };
  }
  if (it.type === "rate") {
    const st = await rateStats(it);
    const closed = !!it.state?.closed;
    const out: Row = { ...base, items: st.items, raters: st.raters, max: st.max, scale: st.scale, allowComment: st.allowComment, anonymous: st.anonymous, closed };
    if (opts.mode === "audience") {
      const m = st.rows.find((r) => r.participant_id === pid);
      out.mine = m ? { scores: m.answer?.scores || [], comment: m.answer?.comment || "" } : null;
      return out;
    }
    // anonymous display: names are never sent to the screen or the console
    out.comments = st.comments.slice(0, 200).map((c, i) => ({ id: i, text: c.text, created_at: c.created_at, nickname: st.anonymous ? "" : c.nickname, group_name: st.anonymous || !FEATURE_GROUPS ? "" : c.group_name }));
    out.commentCount = st.comments.length;
    if (opts.mode === "admin") out.byGroup = FEATURE_GROUPS ? st.byGroup : [];
    return out;
  }
  if (it.type === "lottery") {
    const cfg = it.config as LotteryConfig;
    const st = lotteryState(it);
    const [people, winners] = await Promise.all([lotteryPeople(it), lotteryWinners(it.id)]);
    const prizes = prizeSummary(cfg, winners);
    const curPrize = typeof st.prize === "number" && prizes[st.prize] ? st.prize : null;
    // pool for the prize being drawn (or the next one with open slots) — this is the 抽奖池 everyone sees
    const poolPrize = curPrize ?? Math.max(0, prizes.findIndex((p) => p.remaining > 0));
    const pool = eligible(cfg, people, winners, poolPrize);
    const lastIds = new Set<number>((it.state?.lastIds as number[]) || []);
    const active = winners.filter((w) => !w.voided);
    const out: Row = {
      ...base, phase: st.phase, prize: curPrize, drawSeq: st.drawSeq || 0, prizes, poolSize: pool.length,
      participatedOnly: !!cfg.participatedOnly, allowRepeat: !!cfg.allowRepeat,
      winners: active.map((w) => ({ id: w.id, prize_index: w.prize_index, prize_name: w.prize_name, nickname: w.nickname, drawn_at: w.drawn_at, latest: lastIds.has(w.id) })),
    };
    if (opts.mode === "audience") {
      out.mine = active.filter((w) => w.participant_id === pid).map((w) => ({ id: w.id, prize_index: w.prize_index, prize_name: w.prize_name, drawn_at: w.drawn_at }));
      out.inPool = pool.some((p) => p.pid === pid);
      return out;
    }
    // names only, for the cosmetic rolling animation on the screen (winners are picked on the server at reveal)
    out.rollNames = (pool.length ? pool : people).slice(0, 400).map((p) => p.nickname);
    if (opts.mode === "admin") {
      out.winners = winners.map((w) => ({ id: w.id, prize_index: w.prize_index, prize_name: w.prize_name, participant_id: w.participant_id, nickname: w.nickname, round: w.round, voided: w.voided, voided_at: w.voided_at, drawn_at: w.drawn_at, latest: lastIds.has(w.id) }));
      const winSet = new Set(active.map((w) => w.participant_id));
      const poolSet = new Set(pool.map((p) => p.pid));
      out.people = people.map((p) => ({ ...p, won: winSet.has(p.pid), inPool: poolSet.has(p.pid) }));
      out.joined = people.length;
    }
    return out;
  }
  return base;
}
