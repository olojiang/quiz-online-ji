"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, Avatar, EmptyState, Icon, PageLoader, useUI } from "./ui";
import { useT } from "./i18n";
import { fmtTime } from "@/lib/util";
import { DistRows, StarRow } from "./Rating";
import { FEATURE_GROUPS } from "@/lib/features";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return p.replace(" ", "T");
}
const fromLocalInput = (v: string) => (v ? new Date(`${v}:00+08:00`).toISOString() : "");

export function ReportView({ dataUrl, exportUrl, title }: { dataUrl: string; exportUrl: string; title?: string }) {
  const t = useT();
  const { toast } = useUI();
  const [gran, setGran] = useState("hour");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ gran, ...(from ? { from: fromLocalInput(from) } : {}), ...(to ? { to: fromLocalInput(to) } : {}) });
    api(`${dataUrl}${dataUrl.includes("?") ? "&" : "?"}${qs}`).then((d) => setData(d.report)).catch((e) => toast(e.message, "error")).finally(() => setLoading(false));
  }, [dataUrl, gran, from, to, toast]);
  if (!data) return <div className="card"><PageLoader /></div>;
  const k = data.kpis;
  const dl = (section: string) => { window.location.href = `${exportUrl}?section=${section}`; };
  const trendPts = data.trend.points.map((p: Any) => ({ ...p, label: data.trend.gran === "day" ? p.t.slice(5, 10) : data.trend.gran === "hour" ? p.t.slice(5, 13) + "时" : p.t.slice(11) }));

  return (
    <div className="space-y-5 w-full">
      {/* section 1 */}
      <section className="card">
        <Header icon="poll" title={title || t("活动报告")} action={<button className="btn btn-secondary btn-sm" onClick={() => dl("all")}><Icon name="external" className="w-3.5 h-3.5 rotate-90" />{t("下载全部")}</button>} />
        <div className="p-5 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Kpi color="rose" icon="users" title={t("总参与人数")} desc={t("访问活动的嘉宾总数")} value={k.totalGuests} />
          <Kpi color="amber" icon="user" title={t("活跃参与人数")} desc={t("至少参与过一次互动的嘉宾总数")} value={k.activeGuests} />
          <Kpi color="teal" icon="poll" title={t("互动贡献总数")} desc={t("提问、点赞、投票、评论、作答、评分总次数")} value={k.contributions} />
          <Kpi color="indigo" icon="screen" title={t("互动内容数量")} desc={t("活动中创建的互动内容项总数")} value={k.interactions} />
        </div>
        <div className="px-5 pb-5 border-t border-dashed border-gray-100 pt-5">
          <SubTitle title={t("互动类型分布")} desc={t("各互动类别创建数量")} />
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.typeDist.map((d: Any) => ({ ...d, label: t(d.label) }))} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f5f3ff" }} formatter={(v) => [v, t("数量")]} />
                <Bar dataKey="n" fill="#6d5dfc" radius={[6, 6, 0, 0]} maxBarSize={44}><LabelList dataKey="n" position="top" style={{ fontSize: 12, fill: "#4b5563" }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-2 items-start">
      {/* section 2 */}
      <section className="card min-w-0">
        <Header icon="users" iconColor="text-rose-500" title={t("嘉宾数据洞察")} action={<button className="btn btn-ghost btn-sm" title={t("下载嘉宾数据")} onClick={() => dl("guests")}><Icon name="external" className="w-4 h-4 rotate-90" /></button>} />
        <div className="p-5">
          <div className="flex flex-wrap items-start gap-3">
            <SubTitle title={t("嘉宾参与趋势")} desc={t("按所选时间范围和最小颗粒度查看嘉宾扫码参与走势")} />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 h-9 text-xs text-gray-500">
                <Icon name="calendar" className="w-3.5 h-3.5" />
                <input type="datetime-local" className="outline-none bg-transparent text-gray-700 w-[150px]" value={from || toLocalInput(data.trend.from)} onChange={(e) => setFrom(e.target.value)} aria-label={t("开始时间")} />
                <span>{t("至")}</span>
                <input type="datetime-local" className="outline-none bg-transparent text-gray-700 w-[150px]" value={to || toLocalInput(data.trend.to)} onChange={(e) => setTo(e.target.value)} aria-label={t("结束时间")} />
              </div>
              <select className="input h-9 w-24 text-xs" value={gran} onChange={(e) => setGran(e.target.value)}>
                <option value="minute">{t("分钟")}</option><option value="hour">{t("小时")}</option><option value="day">{t("天")}</option>
              </select>
              {(from || to) && <button className="btn btn-ghost btn-sm" onClick={() => { setFrom(""); setTo(""); }}>{t("重置")}</button>}
            </div>
          </div>
          {data.trend.gran !== gran && <p className="text-xs text-amber-600 mt-2">{t("时间范围较长，已自动按「{g}」显示", { g: t({ minute: t("分钟"), hour: t("小时"), day: t("天") }[data.trend.gran as "minute"]) })}</p>}
          <div className={`h-64 mt-3 ${loading ? "opacity-60" : ""}`}>
            {trendPts.length === 0 ? <EmptyState icon="users" title={t("暂无访问数据")} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendPts} margin={{ top: 20, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.t} formatter={(v) => [v, t("活跃嘉宾")]} />
                  <Line type="monotone" dataKey="n" stroke="#6d5dfc" strokeWidth={2.5} dot={trendPts.length < 60 ? { r: 3, fill: "#fff", strokeWidth: 2 } : false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="grid lg:grid-cols-[1fr_380px] 2xl:grid-cols-1 min-[2200px]:grid-cols-[1fr_340px] border-t border-dashed border-gray-100">
          <div className="p-5">
            <SubTitle title={t("活跃嘉宾贡献排行")} />
            {data.leaderboard.length === 0 ? <EmptyState icon="user" title={t("暂无嘉宾互动")} /> : (
              <ol className="mt-3 divide-y divide-gray-100">
                {data.leaderboard.slice(0, 20).map((r: Any, i: number) => (
                  <li key={r.participant_id} className="flex items-center gap-3 py-2.5">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${i === 0 ? "bg-rose-100 text-rose-600" : i === 1 ? "bg-amber-100 text-amber-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>{i + 1}</span>
                    <Avatar name={r.nickname} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-900 truncate">{r.nickname}{FEATURE_GROUPS && r.group_name && <span className="text-gray-400"> · {r.group_name}</span>}</div>
                      <div className="text-xs text-gray-500">{t("提问 {a} · 点赞 {b} · 互动参与次数 {c}", { a: r.questions, b: r.likes, c: r.responses + r.comments })}</div>
                    </div>
                    <span className="text-sm text-brand-600 whitespace-nowrap">{t("贡献总数")} <b>{r.total}</b></span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="p-5 lg:border-l 2xl:border-l-0 2xl:border-t min-[2200px]:border-l min-[2200px]:border-t-0 border-dashed border-gray-100 space-y-6">
            {FEATURE_GROUPS && <div>
              <SubTitle title={t("按组别统计")} />
              {data.groups.length === 0 ? <p className="text-sm text-gray-400 mt-3">{t("暂无数据")}</p> : (
                <table className="w-full text-sm mt-3">
                  <thead className="text-xs text-gray-500"><tr><th className="text-left font-medium py-1.5">{t("组别")}</th><th className="text-right font-medium">{t("嘉宾")}</th><th className="text-right font-medium">{t("活跃")}</th><th className="text-right font-medium">{t("提问")}</th><th className="text-right font-medium">{t("贡献")}</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">{data.groups.map((g: Any) => <tr key={g.group}><td className="py-2 text-gray-800">{t(g.group)}</td><td className="text-right tabular-nums">{g.guests}</td><td className="text-right tabular-nums">{g.active}</td><td className="text-right tabular-nums">{g.questions}</td><td className="text-right tabular-nums font-medium text-brand-600">{g.total}</td></tr>)}</tbody>
                </table>
              )}
            </div>}
            {data.links.length > 0 && (
              <div>
                <SubTitle title={t("嘉宾来源链接")} />
                <ul className="mt-3 space-y-2 text-sm">{data.links.map((l: Any) => <li key={l.id} className="flex items-center gap-2"><span className={`truncate ${l.revoked_at ? "text-gray-400 line-through" : "text-gray-800"}`}>{t(l.label)}</span><span className="ml-auto text-xs text-gray-500 whitespace-nowrap">{t("{n} 位嘉宾 · {v} 次访问", { n: l.guests, v: l.visits })}</span></li>)}</ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* section 3 */}
      <section className="card min-w-0">
        <Header icon="qa" title={t("问答互动分析")} desc={t("提问热度与互动情况")} action={<button className="btn btn-ghost btn-sm" title={t("导出问题 CSV")} onClick={() => dl("questions")}><Icon name="external" className="w-4 h-4 rotate-90" /></button>} />
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-3 gap-3">
          {[["问题总数", data.qa.stats.total], ["参与提问人数", data.qa.stats.askers], ["待审核", data.qa.stats.pending], ["展示中", data.qa.stats.showing], ["已归档或已回答", data.qa.stats.archived_or_answered], ["点赞数", data.qa.stats.likes]].map(([l, v]) => (
            <div key={l as string} className="rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3"><div className="text-xs text-gray-500">{t(l as string)}</div><div className="text-2xl font-semibold text-brand-600 mt-1 tabular-nums">{v as number}</div></div>
          ))}
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 mb-2"><Icon name="like" className="w-4 h-4 text-rose-500" />{t("热门提问")}</div>
          {data.qa.hot.length === 0 ? <EmptyState icon="qa" title={t("暂无展示中的问题")} /> : (
            <ul className="divide-y divide-gray-100">
              {data.qa.hot.map((q: Any) => (
                <li key={q.id} className="py-3 flex gap-3">
                  <Avatar name={q.nickname} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">{q.nickname}{FEATURE_GROUPS && q.group_name && ` · ${q.group_name}`} · {fmtTime(q.created_at)}{q.answered && <span className="chip bg-emerald-50 text-emerald-700 ml-2">{t("已回答")}</span>}</div>
                    <div className="text-sm text-gray-900 mt-0.5 break-words">{q.text}</div>
                  </div>
                  <div className="flex items-start gap-3 text-xs text-gray-500 whitespace-nowrap pt-1"><span className="flex items-center gap-1"><Icon name="comment" className="w-3.5 h-3.5" />{q.comments}</span><span className="flex items-center gap-1"><Icon name="like" className="w-3.5 h-3.5" />{q.likes}</span></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>

      {/* section 4 */}
      <section className="card">
        <Header icon="rate" iconColor="text-amber-500" title={t("评分结果")} desc={t("各评分互动的平均分、分布与评论")} />
        {!data.ratings?.length ? <EmptyState icon="rate" title={t("暂无评分互动")} desc={t("在「创建互动」中选择「评分」，即可收集嘉宾打分。")} /> : (
          <div className="divide-y divide-dashed divide-gray-100">
            {data.ratings.map((r: Any) => (
              <div key={r.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="font-medium text-gray-900">{r.title}</span>
                  <span className={`chip ${r.closed ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"}`}>{r.closed ? t("已结束") : t("评分进行中")}</span>
                  <span className="text-xs text-gray-500">{r.scale === "star" ? t("星级 · 满分 {n} 星", { n: r.max }) : t("分数 · 满分 {n} 分", { n: r.max })} · {t("{n} 人已评分", { n: r.raters })}</span>
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                  {r.items.map((it: Any, i: number) => (
                    <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                      <div className="text-sm text-gray-700 truncate">{it.name}</div>
                      <div className="flex items-end gap-2 mt-1"><span className="text-3xl font-semibold tabular-nums text-brand-600">{it.avg == null ? "–" : it.avg.toFixed(1)}</span><span className="text-xs text-gray-400 pb-1">/ {r.max} · {t("{n} 人评分", { n: it.count })}</span></div>
                      <StarRow value={it.avg == null ? null : r.scale === "star" ? it.avg : (it.avg / r.max) * 5} max={r.scale === "star" ? r.max : 5} size={15} className="mt-1" />
                      <div className="mt-3"><DistRows dist={it.dist} scale={r.scale} /></div>
                    </div>
                  ))}
                </div>
                {FEATURE_GROUPS && r.byGroup.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <div className="text-sm font-medium text-gray-900 mb-1">{t("按组别平均分")}</div>
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500"><tr><th className="text-left font-medium py-1.5">{t("组别")}</th><th className="text-right font-medium px-2">{t("人数")}</th>{r.items.map((it: Any, i: number) => <th key={i} className="text-right font-medium px-2">{it.name}</th>)}</tr></thead>
                      <tbody className="divide-y divide-gray-100">{r.byGroup.map((g: Any) => <tr key={g.group}><td className="py-2 text-gray-800">{t(g.group)}</td><td className="text-right px-2 tabular-nums">{g.raters}</td>{g.avgs.map((a: number | null, i: number) => <td key={i} className="text-right px-2 tabular-nums font-medium text-brand-600">{a == null ? "–" : a.toFixed(1)}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
                {r.comments.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-900 mb-1">{t("评论")} <span className="text-xs text-gray-400 font-normal">{r.commentCount}</span></div>
                    <ul className="divide-y divide-gray-100">{r.comments.map((c: Any, i: number) => <li key={i} className="py-2 text-sm"><span className="text-xs text-gray-400">{c.nickname ? `${c.nickname}${FEATURE_GROUPS && c.group_name ? ` · ${c.group_name}` : ""}` : t("匿名嘉宾")} · {fmtTime(c.created_at)}</span><div className="text-gray-900 break-words">{c.text}</div></li>)}</ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* section 5 */}
      <section className="card">
        <Header icon="lottery" iconColor="text-orange-500" title={t("抽奖结果")} desc={t("各抽奖的奖项与获奖名单")} />
        {!data.lotteries?.length ? <EmptyState icon="lottery" title={t("暂无抽奖")} desc={t("在「创建互动」中选择「抽奖」，即可从参与嘉宾中随机抽取获奖者。")} /> : (
          <div className="divide-y divide-dashed divide-gray-100">
            {data.lotteries.map((l: Any) => (
              <div key={l.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="font-medium text-gray-900">{l.title}</span>
                  <span className={`chip ${l.phase === "revealed" ? "bg-emerald-50 text-emerald-700" : l.phase === "rolling" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{l.phase === "revealed" ? t("已揭晓") : l.phase === "rolling" ? t("抽奖中") : t("待开始")}</span>
                  <span className="text-xs text-gray-500">{t("已加入 {n} 人", { n: l.joined })} · {l.participatedOnly ? t("仅限参与过互动的嘉宾") : t("全部嘉宾")} · {l.allowRepeat ? t("允许重复中奖") : t("不可重复中奖")}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {l.prizes.map((p: Any, i: number) => <span key={i} className="chip bg-orange-50 text-orange-700 ring-1 ring-orange-100 px-2.5 py-1">{p.name} · {t("已抽出 {a}/{b}", { a: p.drawn, b: p.count })}</span>)}
                </div>
                {l.winners.length === 0 ? <p className="text-sm text-gray-400">{t("还没有抽出获奖者")}</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500"><tr><th className="text-left font-medium py-1.5">{t("中奖时间")}</th><th className="text-left font-medium px-2">{t("奖项")}</th><th className="text-left font-medium px-2">{t("姓名")}</th><th className="text-right font-medium">{t("状态")}</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">{l.winners.map((w: Any, i: number) => (
                        <tr key={i} className={w.voided ? "text-gray-400" : ""}><td className="py-2 tabular-nums">{fmtTime(w.drawn_at)}</td><td className="px-2">{w.prize_name}</td><td className={`px-2 font-medium ${w.voided ? "line-through" : "text-gray-900"}`}>{w.nickname}</td><td className="text-right">{w.voided ? <span className="chip bg-gray-100 text-gray-500">{t("已作废")}</span> : <span className="chip bg-emerald-50 text-emerald-700">{t("有效")}</span>}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Header({ icon, iconColor = "text-brand-600", title, desc, action }: { icon: string; iconColor?: string; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-5 py-4 border-b border-dashed border-gray-200">
      <Icon name={icon} className={`w-[18px] h-[18px] ${iconColor}`} />
      <div><h3 className="font-semibold text-gray-900">{title}</h3>{desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}</div>
      <div className="ml-auto">{action}</div>
    </div>
  );
}
function SubTitle({ title, desc }: { title: string; desc?: string }) {
  return <div><div className="text-sm font-medium text-gray-900">{title}</div>{desc && <div className="text-xs text-gray-500 mt-0.5">{desc}</div>}</div>;
}
const KPI_COLORS: Record<string, [string, string]> = { rose: ["bg-rose-50 text-rose-500", "text-rose-500"], amber: ["bg-amber-50 text-amber-500", "text-amber-500"], teal: ["bg-teal-50 text-teal-500", "text-teal-500"], indigo: ["bg-indigo-50 text-indigo-500", "text-indigo-500"] };
function Kpi({ color, icon, title, desc, value }: { color: string; icon: string; title: string; desc: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 flex items-center gap-3">
      <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${KPI_COLORS[color][0]}`}><Icon name={icon} className="w-5 h-5" /></span>
      <div className="min-w-0 flex-1"><div className={`text-[15px] font-medium ${KPI_COLORS[color][1]}`}>{title}</div><div className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</div></div>
      <div className={`text-2xl font-semibold tabular-nums ${KPI_COLORS[color][1]}`}>{value}</div>
    </div>
  );
}
