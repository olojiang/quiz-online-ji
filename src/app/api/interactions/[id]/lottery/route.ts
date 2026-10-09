import { sql } from "@/lib/db";
import { forbidden, json, loadInteraction, readJson } from "@/lib/auth";
import { drawPrize, eligible, lotteryPeople, lotteryState, lotteryWinners } from "@/lib/lottery";
import type { LotteryConfig, LotteryState } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Run a 抽奖. Same people who run the screen (主持人, 活动管理员, 超级管理员); 审核员 is read-only.
 *  start   {prize, count?} → phase rolling (screen animates; nothing is decided yet)
 *  reveal  {count?}        → server draws winners now (crypto-secure) → phase revealed
 *  cancel                  → stop rolling without drawing
 *  void    {winnerId}      → 作废 a winner (row kept, voided = true); its slot can be drawn again
 *  exclude {pid, excluded} → remove a person from / return a person to the pool
 *  reset                   → delete every winner, back to 待开始
 */
export async function POST(req: Request, { params }: Ctx) {
  const r = await loadInteraction(Number((await params).id));
  if ("error" in r) return r.error;
  if (!r.perms.present) return forbidden("只有主持人或活动管理员可以进行抽奖");
  const it = r.interaction;
  if (it.type !== "lottery") return json({ error: "不是抽奖互动" }, 400);
  const cfg = it.config as LotteryConfig;
  const st = lotteryState(it);
  const b = await readJson<{ action?: string; prize?: number; count?: number; winnerId?: number; pid?: string; excluded?: boolean }>(req);
  const save = (next: LotteryState & { lastIds?: number[]; batch?: number | null }) => sql`UPDATE qoj_interactions SET state = ${JSON.stringify(next)}::jsonb WHERE id = ${it.id}`;

  switch (b.action) {
    case "start": {
      const pi = Number(b.prize);
      const prize = cfg.prizes[pi];
      if (!Number.isInteger(pi) || !prize) return json({ error: "奖项不存在" }, 400);
      const winners = await lotteryWinners(it.id);
      const won = winners.filter((w) => w.prize_index === pi && !w.voided).length;
      if (won >= prize.count) return json({ error: `「${prize.name}」名额已满` }, 400);
      const pool = eligible(cfg, await lotteryPeople(it), winners, pi);
      if (!pool.length) return json({ error: "抽奖池为空：没有符合条件的嘉宾" }, 400);
      const batch = b.count && Number(b.count) > 0 ? Math.min(Math.floor(Number(b.count)), prize.count - won) : null;
      await save({ phase: "rolling", prize: pi, drawSeq: st.drawSeq || 0, rollingAt: Date.now(), lastIds: [], batch });
      return json({ ok: true, phase: "rolling" });
    }
    case "reveal": {
      if (st.phase !== "rolling" || typeof st.prize !== "number") return json({ error: "请先点击「开始抽奖」" }, 400);
      const want = b.count && Number(b.count) > 0 ? Number(b.count) : (it.state?.batch as number | null) || undefined;
      const d = await drawPrize(it, st.prize, want);
      if ("error" in d) return json({ error: d.error }, 400);
      await save({ phase: "revealed", prize: st.prize, drawSeq: (st.drawSeq || 0) + 1, revealedAt: Date.now(), lastIds: d.winners.map((w) => w.id as number) });
      return json({ ok: true, phase: "revealed", winners: d.winners.map((w) => ({ id: w.id, nickname: w.nickname })) });
    }
    case "cancel": {
      if (st.phase !== "rolling") return json({ ok: true });
      await save({ ...st, phase: (st.drawSeq || 0) > 0 ? "revealed" : "idle", lastIds: (it.state?.lastIds as number[]) || [] });
      return json({ ok: true });
    }
    case "void": {
      const rows = await sql`UPDATE qoj_lottery_winners SET voided = true, voided_at = now() WHERE id = ${Number(b.winnerId)} AND interaction_id = ${it.id} AND NOT voided RETURNING id`;
      if (!rows.length) return json({ error: "中奖记录不存在或已作废" }, 404);
      return json({ ok: true });
    }
    case "exclude": {
      const pid = String(b.pid || "").slice(0, 64);
      if (!pid) return json({ error: "缺少嘉宾" }, 400);
      const set = new Set(cfg.exclude || []);
      if (b.excluded === false) set.delete(pid); else set.add(pid);
      await sql`UPDATE qoj_interactions SET config = config || ${JSON.stringify({ exclude: [...set] })}::jsonb WHERE id = ${it.id}`;
      return json({ ok: true, exclude: [...set] });
    }
    case "reset": {
      await sql`DELETE FROM qoj_lottery_winners WHERE interaction_id = ${it.id}`;
      await save({ phase: "idle", drawSeq: 0, lastIds: [] });
      return json({ ok: true, phase: "idle" });
    }
    default:
      return json({ error: "未知操作" }, 400);
  }
}
