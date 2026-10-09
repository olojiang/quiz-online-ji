"use client";
import { useT } from "@/components/i18n";
import { useState } from "react";
import { api, Avatar, EmptyState, Icon, PageLoader, Spinner, usePoll, useUI } from "../ui";
import { fmtTime } from "@/lib/util";
import { DistRows, StarRow } from "@/components/Rating";
import { FEATURE_GROUPS } from "@/lib/features";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function Bars({ options, counts, total, correct, dark }: { options: string[]; counts: number[]; total: number; correct?: number[] | null; dark?: boolean }) {
  const t = useT();
  const max = Math.max(1, ...counts);
  return (
    <div className="space-y-3">
      {options.map((o, i) => {
        const pct = total ? Math.round((counts[i] / total) * 100) : 0;
        const isC = correct?.includes(i);
        return (
          <div key={i}>
            <div className={`flex items-center justify-between text-sm mb-1.5 ${dark ? "text-white" : "text-gray-700"}`}>
              <span className="flex items-center gap-2 min-w-0"><b className={dark ? "text-white/60" : "text-gray-400"}>{String.fromCharCode(65 + i)}</b><span className="truncate">{o}</span>{isC && <span className={`chip ${dark ? "bg-emerald-400/20 text-emerald-200" : "bg-emerald-50 text-emerald-700"}`}>{t("正确")}</span>}</span>
              <span className={`tabular-nums ${dark ? "text-white/80" : "text-gray-500"}`}>{t("{n} 票", { n: counts[i] })} · {pct}%</span>
            </div>
            <div className={`h-3 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-gray-100"}`}>
              <div className={`h-full rounded-full transition-all duration-700 ${isC ? "bg-emerald-500" : dark ? "bg-white/80" : "bg-gradient-to-r from-brand-500 to-indigo-500"}`} style={{ width: `${(counts[i] / max) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LiveResults({ interaction, perms, isCurrent, onSetCurrent }: { interaction: Any; perms: Any; isCurrent?: boolean; onSetCurrent?: () => void }) {
  const t = useT();
  const { toast, confirm } = useUI();
  const { data, reload } = usePoll<Any>(() => api(`/api/interactions/${interaction.id}/live`), 2000, [interaction.id]);
  const live = data?.live;
  if (!live) return <div className="card"><PageLoader /></div>;

  if (live.type === "poll") {
    return (
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div><div className="text-lg font-medium text-gray-900">{live.question}</div><div className="text-sm text-gray-500 mt-1">{live.multi ? t("多选") : t("单选")} · 共 {live.voters}{t("人参与")}</div></div>
        </div>
        <Bars options={live.options} counts={live.counts} total={live.voters} />
      </div>
    );
  }

  if (live.type === "open") {
    return (
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><div className="font-medium text-gray-900">{live.prompt}</div><span className="text-sm text-gray-500">{t("{n} 条回答", { n: live.count })}</span></div>
        {live.responses.length === 0 ? <EmptyState icon="open" title={t("暂无回答")} desc={t("设为当前互动后，嘉宾即可提交观点。")} /> : (
          <ul className="divide-y divide-gray-100">
            {live.responses.map((r: Any) => (
              <li key={r.id} className="px-5 py-3 flex gap-3"><Avatar name={r.nickname} size={32} /><div className="min-w-0"><div className="text-xs text-gray-400">{r.nickname} · {fmtTime(r.created_at)}</div><div className="text-sm text-gray-900 mt-0.5 break-words">{r.text}</div></div></li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (live.type === "lottery") return <LotteryPanel live={live} interactionId={interaction.id} perms={perms} reload={reload} isCurrent={!!isCurrent} onSetCurrent={onSetCurrent} />;
  if (live.type === "rate") return <RateResults live={live} interactionId={interaction.id} perms={perms} reload={reload} />;

  // quiz
  async function ctl(action: string) {
    if (action === "reset" && !(await confirm({ title: t("重置测验？"), message: t("将清空所有作答和得分，测验回到未开始状态。"), danger: true, confirmText: t("重置") }))) return;
    try { await api(`/api/interactions/${interaction.id}/quiz`, { body: { action } }); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  const phaseLabel: Record<string, string> = { idle: t("未开始"), question: t("答题中"), reveal: t("已公布答案"), finished: t("已结束") };
  const isLast = live.currentQ + 1 >= live.total;
  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4">
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="chip bg-brand-50 text-brand-700">{phaseLabel[live.phase]}</span>
          {live.phase !== "idle" && <span className="text-sm text-gray-500">{t("第 {a} / {b} 题", { a: live.currentQ + 1, b: live.total })} · {t("已作答 {n} 人", { n: live.answeredCount })}</span>}
          {live.phase === "question" && <span className="ml-auto text-2xl font-semibold tabular-nums text-brand-600">{live.remaining}s</span>}
        </div>
        {live.phase === "idle" ? (
          <EmptyState icon="quiz" title={`共 ${live.total} 道题`} desc={t("先将测验「设为当前互动」，然后点击开始，嘉宾端会同步出题并倒计时。")} />
        ) : live.question ? (
          <>
            <div className="text-lg font-medium text-gray-900 mb-5">{live.question.text}</div>
            <Bars options={live.question.options} counts={live.dist || []} total={live.answeredCount} correct={live.question.correct} />
          </>
        ) : null}
        {perms.present && (
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-2">
            {live.phase === "idle" && <button className="btn btn-primary" onClick={() => ctl("start")}><Icon name="play" />{t("开始测验")}</button>}
            {live.phase === "question" && <button className="btn btn-primary" onClick={() => ctl("reveal")}>{t("公布答案")}</button>}
            {live.phase === "reveal" && <button className="btn btn-primary" onClick={() => ctl("next")}>{isLast ? t("结束并显示排行榜") : t("下一题")}</button>}
            {(live.phase === "question" || live.phase === "reveal") && <button className="btn btn-secondary" onClick={() => ctl("finish")}>{t("提前结束")}</button>}
            {live.phase !== "idle" && <button className="btn btn-ghost ml-auto" onClick={() => ctl("reset")}><Icon name="refresh" />{t("重置")}</button>}
          </div>
        )}
      </div>
      <div className="card p-5">
        <div className="font-medium text-gray-900 mb-3 flex items-center gap-2"><Icon name="quiz" className="w-4 h-4 text-amber-500" />{t("排行榜")}</div>
        {live.leaderboard.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">{t("暂无得分")}</p> : (
          <ol className="space-y-2">
            {live.leaderboard.map((r: Any, i: number) => (
              <li key={r.participant_id} className="flex items-center gap-3 text-sm">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-gray-300 text-white" : i === 2 ? "bg-orange-300 text-white" : "bg-gray-100 text-gray-500"}`}>{i + 1}</span>
                <span className="flex-1 truncate text-gray-800">{r.nickname}</span>
                <span className="tabular-nums font-medium text-gray-900">{r.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function RateResults({ live, interactionId, perms, reload }: { live: Any; interactionId: number; perms: Any; reload: () => void }) {
  const t = useT();
  const { toast, confirm } = useUI();
  async function toggle() {
    const closing = !live.closed;
    if (closing && !(await confirm({ title: t("结束评分？"), message: t("结束后嘉宾不能再提交或修改评分，可随时重新开放。"), confirmText: t("结束评分") }))) return;
    try { await api(`/api/interactions/${interactionId}/rating`, { body: { action: closing ? "close" : "open" } }); toast(closing ? t("评分已结束") : t("评分已重新开放")); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  const scaleText = live.scale === "star" ? t("星级 · 满分 {n} 星", { n: live.max }) : t("分数 · 满分 {n} 分", { n: live.max });
  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <span className={`chip ${live.closed ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"}`}>{live.closed ? t("已结束") : t("评分进行中")}</span>
        <span className="text-sm text-gray-500">{scaleText} · {t("{n} 人已评分", { n: live.raters })}{live.anonymous ? ` · ${t("匿名展示")}` : ""}</span>
        <div className="ml-auto flex gap-2">
          {perms.present && <button className={`btn ${live.closed ? "btn-primary" : "btn-secondary"}`} onClick={toggle}>{live.closed ? <><Icon name="play" />{t("重新开放评分")}</> : t("结束评分")}</button>}
          <a className="btn btn-secondary" href={`/api/interactions/${interactionId}/export`}><Icon name="external" className="w-4 h-4 rotate-90" />{t("导出 CSV")}</a>
        </div>
      </div>
      <div className={`grid gap-4 ${live.items.length > 1 ? "md:grid-cols-2" : ""}`}>
        {live.items.map((it: Any, i: number) => (
          <div key={i} className="card p-5">
            <div className="text-sm font-medium text-gray-900 truncate">{it.name}</div>
            <div className="flex items-end gap-3 mt-2">
              <span className="text-4xl font-semibold tabular-nums text-gray-900">{it.avg == null ? "–" : it.avg.toFixed(1)}</span>
              <span className="text-sm text-gray-400 pb-1">/ {live.max}</span>
              <span className="ml-auto text-xs text-gray-500 pb-1">{t("{n} 人评分", { n: it.count })}</span>
            </div>
            <StarRow value={starValue(it.avg, live)} max={starCount(live)} size={18} className="mt-1" />
            <div className="mt-4"><DistRows dist={it.dist} scale={live.scale} /></div>
          </div>
        ))}
      </div>
      <div className={FEATURE_GROUPS ? "grid lg:grid-cols-2 gap-4" : ""}>
        {FEATURE_GROUPS && <div className="card">
          <div className="px-5 py-3.5 border-b border-gray-100 font-medium text-gray-900">{t("按组别平均分")}</div>
          {!live.byGroup?.length ? <p className="text-sm text-gray-400 px-5 py-6">{t("暂无评分")}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500"><tr><th className="text-left font-medium px-5 py-2">{t("组别")}</th><th className="text-right font-medium px-2">{t("人数")}</th>{live.items.map((it: Any, i: number) => <th key={i} className="text-right font-medium px-3 max-w-[120px] truncate">{it.name}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">{live.byGroup.map((g: Any) => (
                  <tr key={g.group}><td className="px-5 py-2 text-gray-800">{t(g.group)}</td><td className="text-right px-2 tabular-nums">{g.raters}</td>{g.avgs.map((a: number | null, i: number) => <td key={i} className="text-right px-3 tabular-nums font-medium text-brand-600">{a == null ? "–" : a.toFixed(1)}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>}
        <div className="card">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between"><span className="font-medium text-gray-900">{t("评论")}</span><span className="text-xs text-gray-500">{live.allowComment ? t("{n} 条评论", { n: live.commentCount || 0 }) : t("未开启评论")}</span></div>
          {!live.comments?.length ? <p className="text-sm text-gray-400 px-5 py-6">{live.allowComment ? t("暂无评论") : t("可在「编辑」中开启「允许嘉宾填写评论」。")}</p> : (
            <ul className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto scrollbar-thin">
              {live.comments.map((c: Any) => (
                <li key={c.id} className="px-5 py-3"><div className="text-xs text-gray-400">{c.nickname ? `${c.nickname}${FEATURE_GROUPS && c.group_name ? ` · ${c.group_name}` : ""}` : t("匿名嘉宾")} · {fmtTime(c.created_at)}</div><div className="text-sm text-gray-900 mt-0.5 break-words">{c.text}</div></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {!perms.present && <p className="text-xs text-gray-400">{t("你在本活动为只读身份，可查看和导出评分结果。")}</p>}
    </div>
  );
}

/** Star visual: a 星级 rating shows its own number of stars; a 分数 rating is mapped onto 5 stars. */
export const starCount = (l: { scale: string; max: number }) => (l.scale === "star" ? l.max : 5);
export const starValue = (avg: number | null, l: { scale: string; max: number }) => (avg == null ? null : l.scale === "star" ? avg : (avg / l.max) * 5);

function LotteryPanel({ live, interactionId, perms, reload, isCurrent, onSetCurrent }: { live: Any; interactionId: number; perms: Any; reload: () => void; isCurrent: boolean; onSetCurrent?: () => void }) {
  const t = useT();
  const { toast, confirm } = useUI();
  const [busy, setBusy] = useState<string | null>(null);
  const [batch, setBatch] = useState<Record<number, string>>({});
  const [q, setQ] = useState("");
  async function act(action: string, body: Any = {}, key = action) {
    setBusy(key);
    try { const d = await api(`/api/interactions/${interactionId}/lottery`, { body: { action, ...body } }); reload(); return d; }
    catch (e) { toast((e as Error).message, "error"); return null; } finally { setBusy(null); }
  }
  async function reset() {
    if (!(await confirm({ title: t("重置抽奖？"), message: t("将清空本抽奖的全部中奖记录（包括已作废的），回到「待开始」。"), danger: true, confirmText: t("重置") }))) return;
    if (await act("reset")) toast(t("抽奖已重置"));
  }
  async function voidWinner(w: Any) {
    if (!(await confirm({ title: t("作废「{name}」的中奖资格？", { name: w.nickname }), message: t("记录会保留并标记为「已作废」，该名额可以重新抽取。被作废的嘉宾不会再被本抽奖抽中。"), confirmText: t("作废") }))) return;
    if (await act("void", { winnerId: w.id }, `v${w.id}`)) toast(t("已作废，可点「补抽」抽取空出的名额"));
  }
  const phaseLabel: Record<string, string> = { idle: t("待开始"), rolling: t("抽奖中"), revealed: t("已揭晓") };
  const phaseCls: Record<string, string> = { idle: "bg-gray-100 text-gray-600", rolling: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", revealed: "bg-emerald-50 text-emerald-700" };
  const people: Any[] = live.people || [];
  const filtered = people.filter((p) => !q || p.nickname.includes(q));
  const rolling = live.phase === "rolling";
  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <span className={`chip ${phaseCls[live.phase]}`}>{rolling && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}{phaseLabel[live.phase]}</span>
        <span className="text-sm text-gray-500">{t("抽奖池 {n} 人", { n: live.poolSize })} · {t("已加入 {n} 人", { n: live.joined ?? 0 })} · {live.participatedOnly ? t("仅限参与过互动的嘉宾") : t("全部嘉宾")} · {live.allowRepeat ? t("允许重复中奖") : t("不可重复中奖")}</span>
        <div className="ml-auto flex gap-2">
          <a className="btn btn-secondary" href={`/api/interactions/${interactionId}/export`}><Icon name="external" className="w-4 h-4 rotate-90" />{t("导出 CSV")}</a>
          {perms.present && <button className="btn btn-ghost" onClick={reset} disabled={!!busy}><Icon name="refresh" />{t("重置")}</button>}
        </div>
      </div>
      {!isCurrent && perms.present && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 flex flex-wrap items-center gap-3">
          <Icon name="info" className="w-4 h-4 shrink-0" />
          <span className="flex-1 min-w-[200px]">{t("先「设为当前互动」，大屏和嘉宾手机才会显示抽奖和滚动动画。")}</span>
          {onSetCurrent && <button className="btn btn-primary btn-sm" onClick={onSetCurrent}><Icon name="screen" className="w-4 h-4" />{t("设为当前互动")}</button>}
        </div>
      )}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-3">
          {live.prizes.map((p: Any, i: number) => {
            const isCur = live.prize === i;
            const ws = (live.winners as Any[]).filter((w) => w.prize_index === i);
            const full = p.remaining <= 0;
            const nb = batch[i] ?? "";
            return (
              <div key={i} className={`card p-5 ${isCur && rolling ? "ring-2 ring-amber-300" : ""}`} data-testid={`prize-${i}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-white flex items-center justify-center shadow-sm shrink-0"><Icon name="lottery" className="w-5 h-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900">{p.name} <span className="text-gray-400 font-normal">× {p.count}</span></div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.desc ? `${p.desc} · ` : ""}{t("已抽出 {a}/{b}", { a: p.drawn, b: p.count })}</div>
                  </div>
                  {perms.present && (
                    <div className="flex flex-wrap items-center gap-2">
                      {isCur && rolling ? (
                        <>
                          <button className="btn btn-primary" disabled={!!busy} onClick={async () => { const d = await act("reveal", {}, `r${i}`); if (d) toast(t("已揭晓 {n} 位获奖者", { n: d.winners.length })); }}>{busy === `r${i}` ? <Spinner className="w-4 h-4" /> : <Icon name="stop" className="w-4 h-4" />}{t("停止并揭晓")}</button>
                          <button className="btn btn-secondary" disabled={!!busy} onClick={() => act("cancel")}>{t("取消")}</button>
                        </>
                      ) : !full ? (
                        <>
                          {p.remaining > 1 && <label className="flex items-center gap-1.5 text-xs text-gray-500">{t("本轮")}<input className="input h-9 w-16 text-center" type="number" min={1} max={p.remaining} placeholder={String(p.remaining)} value={nb} onChange={(e) => setBatch({ ...batch, [i]: e.target.value })} />{t("人")}</label>}
                          <button className="btn btn-primary" disabled={!!busy || rolling} onClick={() => act("start", { prize: i, count: Number(nb) || undefined }, `s${i}`)}>{busy === `s${i}` ? <Spinner className="w-4 h-4" /> : <Icon name="play" className="w-4 h-4" />}{p.drawn === 0 ? t("开始抽奖") : ws.some((w) => w.voided) && p.remaining > 0 ? t("补抽 {n} 名", { n: p.remaining }) : t("再抽一次")}</button>
                        </>
                      ) : <span className="chip bg-emerald-50 text-emerald-700">{t("名额已满")}</span>}
                    </div>
                  )}
                </div>
                {ws.length > 0 && (
                  <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
                    {ws.map((w) => (
                      <li key={w.id} className={`py-2.5 flex items-center gap-3 text-sm ${w.voided ? "opacity-60" : ""}`}>
                        <Avatar name={w.nickname} size={28} />
                        <span className={`font-medium ${w.voided ? "line-through text-gray-500" : "text-gray-900"}`}>{w.nickname}</span>
                        {w.latest && !w.voided && <span className="chip bg-amber-50 text-amber-700">{t("刚刚揭晓")}</span>}
                        {w.voided && <span className="chip bg-gray-100 text-gray-500">{t("已作废")}</span>}
                        <span className="ml-auto text-xs text-gray-400 tabular-nums">{fmtTime(w.drawn_at)}</span>
                        {perms.present && !w.voided && <button className="btn btn-ghost btn-sm text-gray-500 hover:text-red-600" disabled={!!busy} onClick={() => voidWinner(w)}>{t("作废")}</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        <div className="card">
          <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2"><Icon name="users" className="w-4 h-4 text-gray-400" /><span className="font-medium text-gray-900">{t("抽奖池")}</span><span className="ml-auto text-xs text-gray-500">{t("{a} / {b} 人可抽", { a: live.poolSize, b: people.length })}</span></div>
          {people.length > 8 && <div className="px-4 pt-3"><input className="input h-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("搜索姓名")} /></div>}
          {people.length === 0 ? <p className="text-sm text-gray-400 px-4 py-8 text-center leading-relaxed">{t("还没有嘉宾加入。嘉宾扫码填写姓名后会出现在这里。")}</p> : (
            <ul className="max-h-[480px] overflow-y-auto scrollbar-thin divide-y divide-gray-50 py-1">
              {filtered.map((p) => (
                <li key={p.pid} className="px-4 py-2 flex items-center gap-2.5 text-sm">
                  <Avatar name={p.nickname} size={26} />
                  <span className={`truncate ${p.excluded ? "line-through text-gray-400" : "text-gray-800"}`}>{p.nickname}</span>
                  {p.won && <span className="chip bg-amber-50 text-amber-700 shrink-0">{t("已中奖")}</span>}
                  {!p.won && !p.excluded && live.participatedOnly && !p.participated && <span className="chip bg-gray-100 text-gray-500 shrink-0" title={t("未参与过互动")}>{t("未参与")}</span>}
                  {perms.present && (p.excluded
                    ? <button className="ml-auto text-xs text-brand-600 hover:underline shrink-0" onClick={() => act("exclude", { pid: p.pid, excluded: false }, `e${p.pid}`)}>{t("恢复")}</button>
                    : <button className="ml-auto text-xs text-gray-400 hover:text-red-600 shrink-0" onClick={() => act("exclude", { pid: p.pid, excluded: true }, `e${p.pid}`)}>{t("移出")}</button>)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {!perms.present && <p className="text-xs text-gray-400">{t("你在本活动为只读身份，可查看和导出抽奖结果。")}</p>}
    </div>
  );
}
