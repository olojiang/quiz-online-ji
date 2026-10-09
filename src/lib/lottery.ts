import { randomInt } from "crypto";
import { sql } from "./db";
import type { LotteryConfig, LotteryState } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Fisher–Yates with crypto-secure randomness; returns the first n of a shuffled copy. */
export function secureSample<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.max(0, n));
}

export async function lotteryWinners(itId: number) {
  return sql`SELECT id, prize_index, prize_name, participant_id, nickname, round, voided, voided_at, drawn_at
    FROM qoj_lottery_winners WHERE interaction_id = ${itId} ORDER BY prize_index, drawn_at, id`;
}

/**
 * Everyone who joined the event with a name, with eligibility flags.
 *  - participated: asked / liked / commented / answered (voted, quiz, rating, open topic) in this event
 *  - excluded: removed by hand (config.exclude)
 */
export async function lotteryPeople(it: Row) {
  const cfg = it.config as LotteryConfig;
  const rows = await sql`WITH evq AS (SELECT q.id, q.participant_id FROM qoj_questions q JOIN qoj_interactions i ON i.id = q.interaction_id WHERE i.event_id = ${it.event_id}),
    act AS (
      SELECT participant_id FROM evq
      UNION SELECT l.participant_id FROM qoj_question_likes l JOIN evq ON evq.id = l.question_id
      UNION SELECT c.participant_id FROM qoj_comments c JOIN evq ON evq.id = c.question_id
      UNION SELECT r.participant_id FROM qoj_responses r JOIN qoj_interactions i ON i.id = r.interaction_id WHERE i.event_id = ${it.event_id}
    )
    SELECT p.participant_id, p.nickname, p.first_seen, EXISTS (SELECT 1 FROM act WHERE act.participant_id = p.participant_id) AS participated
    FROM qoj_participants p WHERE p.event_id = ${it.event_id} AND btrim(p.nickname) <> '' ORDER BY p.first_seen, p.participant_id`;
  const ex = new Set(cfg.exclude || []);
  return rows.map((r) => ({ pid: r.participant_id as string, nickname: r.nickname as string, participated: !!r.participated, excluded: ex.has(r.participant_id) }));
}

/** Who can still be drawn for prize `prizeIndex` (or the lottery in general when prizeIndex is null). */
export function eligible(cfg: LotteryConfig, people: Awaited<ReturnType<typeof lotteryPeople>>, winners: Row[], prizeIndex: number | null) {
  const activeAny = new Set(winners.filter((w) => !w.voided).map((w) => w.participant_id));
  const activeSame = new Set(winners.filter((w) => !w.voided && w.prize_index === prizeIndex).map((w) => w.participant_id));
  // a voided winner (e.g. not present) is not drawn again in this lottery
  const voided = new Set(winners.filter((w) => w.voided).map((w) => w.participant_id));
  return people.filter((p) => !p.excluded && (!cfg.participatedOnly || p.participated) && !voided.has(p.pid)
    && (cfg.allowRepeat ? !activeSame.has(p.pid) : !activeAny.has(p.pid)));
}

export function prizeSummary(cfg: LotteryConfig, winners: Row[]) {
  return (cfg.prizes || []).map((p, i) => {
    const won = winners.filter((w) => w.prize_index === i && !w.voided).length;
    return { name: p.name, count: p.count, desc: p.desc || "", drawn: won, remaining: Math.max(0, p.count - won) };
  });
}

export function lotteryState(it: Row): Required<Pick<LotteryState, "phase">> & LotteryState {
  const st = (it.state || {}) as LotteryState;
  return { ...st, phase: st.phase || "idle" };
}

/**
 * Draw winners for one prize. Server-side, crypto-secure. Concurrency-safe: the insert runs in one transaction
 * behind an advisory lock on the interaction, re-checks the remaining 名额 and (when repeats are off) that a
 * picked person has not won anything else meanwhile, so the count never exceeds 名额.
 */
export async function drawPrize(it: Row, prizeIndex: number, want?: number) {
  const cfg = it.config as LotteryConfig;
  const prize = cfg.prizes?.[prizeIndex];
  if (!prize) return { error: "奖项不存在" } as const;
  const winners = await lotteryWinners(it.id);
  const won = winners.filter((w) => w.prize_index === prizeIndex && !w.voided).length;
  const remaining = prize.count - won;
  if (remaining <= 0) return { error: `「${prize.name}」名额已满` } as const;
  const pool = eligible(cfg, await lotteryPeople(it), winners, prizeIndex);
  if (!pool.length) return { error: "抽奖池为空：没有符合条件的嘉宾" } as const;
  const n = Math.min(remaining, pool.length, want && want > 0 ? Math.floor(want) : remaining);
  const picks = secureSample(pool, n);
  const round = (winners.filter((w) => w.prize_index === prizeIndex).reduce((m, w) => Math.max(m, w.round), 0) || 0) + 1;
  const pids = picks.map((p) => p.pid);
  const names = picks.map((p) => p.nickname);
  const ord = picks.map((_, i) => i);
  const [, ins] = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(${7_340_000 + Number(it.id)})`,
    sql`WITH cand AS (SELECT * FROM unnest(${pids}::text[], ${names}::text[], ${ord}::int[]) AS c(pid, nick, ord)),
      ok AS (SELECT c.* FROM cand c WHERE ${!!cfg.allowRepeat} OR NOT EXISTS (
        SELECT 1 FROM qoj_lottery_winners w WHERE w.interaction_id = ${it.id} AND NOT w.voided AND w.participant_id = c.pid)),
      lim AS (SELECT * FROM ok ORDER BY ord LIMIT GREATEST(0, ${prize.count}::int - (SELECT count(*)::int FROM qoj_lottery_winners WHERE interaction_id = ${it.id} AND prize_index = ${prizeIndex} AND NOT voided)))
      INSERT INTO qoj_lottery_winners (interaction_id, prize_index, prize_name, participant_id, nickname, round)
      SELECT ${it.id}, ${prizeIndex}, ${prize.name}, pid, nick, ${round} FROM lim
      ON CONFLICT DO NOTHING RETURNING id, participant_id, nickname`,
  ]);
  if (!ins.length) return { error: "抽奖冲突，请重试" } as const;
  return { winners: ins, round } as const;
}
