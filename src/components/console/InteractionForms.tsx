"use client";
import { useT } from "@/components/i18n";
import { useState } from "react";
import { api, Icon, Modal, Spinner, Toggle, useUI } from "../ui";
import { FEATURE_GROUPS } from "@/lib/features";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const TILES = [
  { type: "qa", label: "提问", icon: "qa", color: "text-indigo-500 bg-indigo-50", desc: "嘉宾提交问题、点赞、评论；支持会前提问与审核" },
  { type: "poll", label: "选择题", icon: "poll", color: "text-blue-500 bg-blue-50", desc: "单选或多选投票，大屏实时显示结果条" },
  { type: "cloud", label: "标签云", icon: "cloud", color: "text-teal-500 bg-teal-50", soon: true },
  { type: "quiz", label: "测验", icon: "quiz", color: "text-rose-500 bg-rose-50", desc: "限时答题，答对越快得分越高，实时排行榜" },
  { type: "rate", label: "评分", icon: "rate", color: "text-amber-500 bg-amber-50", desc: "嘉宾为一个或多个评分项打分，大屏实时展示平均分与分布" },
  { type: "open", label: "开放话题", icon: "open", color: "text-violet-500 bg-violet-50", desc: "嘉宾自由填写观点，大屏以列表展示" },
  { type: "danmu", label: "弹幕", icon: "danmu", color: "text-emerald-500 bg-emerald-50", soon: true },
  { type: "lottery", label: "抽奖", icon: "lottery", color: "text-orange-500 bg-orange-50", soon: true },
];

export function CreateInteractionModal({ eventId, qaId, onClose, onCreated, onGoQA }: { eventId: number; qaId: number | null; onClose: () => void; onCreated: (it: Any) => void; onGoQA: (id: number) => void }) {
  const t = useT();
  const [hover, setHover] = useState("poll");
  const [type, setType] = useState<string | null>(null);
  if (type) return <InteractionForm type={type} eventId={eventId} onClose={() => setType(null)} onSaved={onCreated} />;
  const h = TILES.find((tt) => tt.type === hover)!;
  return (
    <Modal onClose={onClose} width="max-w-4xl">
      <div className="relative grid md:grid-cols-[1fr_380px] gap-8 p-6 sm:p-8">
        <button className="absolute right-4 top-4 text-gray-400 hover:text-gray-600" onClick={onClose}><Icon name="x" className="w-5 h-5" /></button>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 text-center">{t("创建互动内容")}</h3>
          <p className="text-sm text-gray-500 text-center mt-1.5">{t("请选择一种互动类型，创建内容将在大屏幕上投放")}</p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            {TILES.map((tt) => {
              // 提问 is created with every event; when it exists the tile is a shortcut to it, not a dead end
              const qaExists = tt.type === "qa" && qaId != null;
              const disabled = !!tt.soon;
              return (
                <button key={tt.type} disabled={disabled} onMouseEnter={() => setHover(tt.type)} onFocus={() => setHover(tt.type)}
                  onClick={() => (qaExists ? onGoQA(qaId!) : setType(tt.type))}
                  title={qaExists ? t("每个活动只有一个提问互动，点击前往") : undefined}
                  className={`relative aspect-[1.1] rounded-xl border flex flex-col items-center justify-center gap-2.5 transition ${disabled ? "border-gray-100 opacity-50 cursor-not-allowed" : qaExists ? "border-indigo-200 bg-indigo-50/40 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5" : "border-gray-200 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5"}`}>
                  <span className={`w-11 h-11 rounded-full flex items-center justify-center ${tt.color}`}><Icon name={tt.icon} className="w-5 h-5" /></span>
                  <span className="text-sm text-gray-800">{t(tt.label)}</span>
                  {tt.soon && <span className="absolute top-2 right-2 chip bg-gray-100 text-gray-500 text-[10px]">{t("即将推出")}</span>}
                  {qaExists && <span className="text-[11px] text-indigo-600 -mt-1.5 flex items-center gap-0.5">{t("已创建 · 点击前往")}<Icon name="chevron" className="w-3 h-3 -rotate-90" /></span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="hidden md:flex flex-col justify-center">
          <div className="text-base font-medium text-gray-800 mb-3">{t(h.label)}</div>
          <div className="rounded-lg bg-gray-200 h-2.5 shadow-inner" />
          <div className="mx-3 rounded-b-md bg-gradient-to-br from-[#1b3a8a] to-[#0b1a45] aspect-video p-3 flex gap-3 shadow-xl">
            <div className="w-16 flex flex-col items-center gap-1.5 pt-2">
              <div className="w-12 h-12 bg-white rounded grid grid-cols-4 gap-px p-1">{Array.from({ length: 16 }).map((_, i) => <span key={i} className={(i * 7) % 3 ? "bg-gray-900" : ""} />)}</div>
              <div className="text-[7px] text-white/80 text-center leading-tight">{t("扫描二维码参与嘉宾互动")}</div>
            </div>
            {h.type === "rate" ? (
              <div className="flex-1 grid grid-cols-2 gap-1.5 pt-2">
                {[4.6, 4.2].map((v, k) => (
                  <div key={k} className="rounded bg-white/10 p-1.5 flex flex-col">
                    <div className="h-1 w-8 rounded bg-white/50" />
                    <div className="text-white font-bold text-base leading-none mt-1.5">{v}</div>
                    <div className="text-amber-300 text-[8px] leading-none mt-0.5">★★★★★</div>
                    <div className="flex items-end gap-0.5 h-6 mt-auto">{[1, 1, 2, 5, 9].map((b, i) => <span key={i} className="flex-1 bg-white/60 rounded-sm" style={{ height: `${b * 10 + 5}%` }} />)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 space-y-1.5 pt-2">
                {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-3.5 rounded bg-white/10 flex items-center px-1.5"><div className="h-1 rounded bg-white/50" style={{ width: `${80 - i * 12}%` }} /></div>)}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-4 leading-relaxed">{h.soon ? t("该互动类型即将推出，敬请期待。") : h.type === "qa" && qaId != null ? t("{a}。{b}", { a: t(h.desc!), b: t("每个活动只有一个提问互动，已自动创建，点击即可前往。") }) : t(h.desc!)}</p>
        </div>
      </div>
    </Modal>
  );
}

const TITLE_DEFAULT: Record<string, string> = { qa: "提问", poll: "选择题", quiz: "知识测验", open: "开放话题", rate: "评分" };

export function InteractionForm({ type, eventId, initial, onClose, onSaved }: { type: string; eventId: number; initial?: Any; onClose: () => void; onSaved: (it: Any) => void }) {
  const t = useT();
  const { toast } = useUI();
  const cfg = initial?.config || {};
  const [title, setTitle] = useState(initial?.title || TITLE_DEFAULT[type]);
  const [question, setQuestion] = useState(cfg.question || "");
  const [options, setOptions] = useState<string[]>(cfg.options || ["", ""]);
  const [multi, setMulti] = useState(!!cfg.multi);
  const [prompt, setPrompt] = useState(cfg.prompt || "");
  const [qs, setQs] = useState<Any[]>(cfg.questions || [{ text: "", options: ["", "", "", ""], correct: [0], timeLimit: 20 }]);
  const [items, setItems] = useState<string[]>(cfg.items || ["", ""]);
  const [scale, setScale] = useState<"star" | "score">(cfg.scale || "star");
  const [max, setMax] = useState<number>(cfg.max || 5);
  const [allowComment, setAllowComment] = useState(!!cfg.allowComment);
  const [anonymous, setAnonymous] = useState(!!cfg.anonymous);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const config = type === "rate" ? { items, scale, max, allowComment, anonymous } : type === "poll" ? { question: question || title, options, multi } : type === "open" ? { prompt: prompt || title } : type === "quiz" ? { questions: qs } : {};
    setBusy(true);
    try {
      const d = initial
        ? await api(`/api/interactions/${initial.id}`, { method: "PATCH", body: { title, config } })
        : await api(`/api/events/${eventId}/interactions`, { body: { type, title, config } });
      toast(initial ? t("已保存") : t("互动已创建"));
      onSaved(d.interaction);
    } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
  }
  const updQ = (i: number, patch: Any) => setQs(qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const label = { qa: t("提问"), poll: t("选择题"), quiz: t("测验"), open: t("开放话题"), rate: t("评分") }[type];

  return (
    <Modal onClose={onClose} title={`${initial ? t("编辑") : t("创建")}${label}`} width="max-w-2xl">
      <form onSubmit={submit} className="px-6 pb-6 space-y-5">
        <div><label className="label">{t("标题")}</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} /></div>
        {type === "qa" && <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{FEATURE_GROUPS ? t("嘉宾填写姓名、组别和问题提交，审核通过后所有嘉宾可见并可点赞。自动审核和过滤规则可在提问页面和「活动设置」中配置。") : t("嘉宾填写姓名和问题提交，审核通过后所有嘉宾可见并可点赞。自动审核和过滤规则可在提问页面和「活动设置」中配置。")}</p>}
        {type === "open" && <div><label className="label">{t("话题 / 问题")}</label><textarea className="input" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t("例如：你认为本次活动最大的收获是什么？")} /></div>}
        {type === "poll" && (
          <>
            <div><label className="label">{t("题目")}</label><input className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("例如：你最期待哪个环节？")} /></div>
            <div>
              <label className="label">{t("选项")}</label>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="w-8 h-10 flex items-center justify-center text-sm text-gray-400">{String.fromCharCode(65 + i)}</span>
                    <input className="input" value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`选项 ${i + 1}`} />
                    <button type="button" className="btn btn-ghost px-2" disabled={options.length <= 2} onClick={() => setOptions(options.filter((_, j) => j !== i))}><Icon name="x" /></button>
                  </div>
                ))}
              </div>
              {options.length < 12 && <button type="button" className="btn btn-ghost btn-sm mt-2 text-brand-600" onClick={() => setOptions([...options, ""])}><Icon name="plus" />{t("添加选项")}</button>}
            </div>
            <label className="flex items-center gap-3 text-sm text-gray-700"><Toggle checked={multi} onChange={setMulti} />{t("允许多选")}</label>
          </>
        )}
        {type === "rate" && (
          <>
            <div>
              <label className="label">{t("评分项")}</label>
              <div className="space-y-2">
                {items.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="w-8 h-10 flex items-center justify-center text-sm text-gray-400">{i + 1}</span>
                    <input className="input" value={o} maxLength={60} onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))} placeholder={i === 0 ? t("例如：演讲内容") : i === 1 ? t("例如：演讲表现") : t("评分项 {n}", { n: i + 1 })} />
                    <button type="button" className="btn btn-ghost px-2" disabled={items.length <= 1} onClick={() => setItems(items.filter((_, j) => j !== i))} title={t("删除")}><Icon name="x" /></button>
                  </div>
                ))}
              </div>
              {items.length < 10 && <button type="button" className="btn btn-ghost btn-sm mt-2 text-brand-600" onClick={() => setItems([...items, ""])}><Icon name="plus" />{t("添加评分项")}</button>}
              {initial && <p className="text-xs text-amber-600 mt-1.5">{t("已有评分时，增删或调整评分项顺序会影响已收集分数的对应关系。")}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t("评分方式")}</label>
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-sm">
                  {(["star", "score"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => { setScale(k); setMax(k === "star" ? 5 : 10); }}
                      className={`px-3.5 py-1.5 rounded-md ${scale === k ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>{k === "star" ? t("星级") : t("分数")}</button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{scale === "star" ? t("嘉宾点亮 1–{n} 颗星", { n: max }) : t("嘉宾选择 1–{n} 分", { n: max })}</p>
              </div>
              <div>
                <label className="label">{t("满分")}</label>
                <select className="input w-32" value={max} onChange={(e) => setMax(Number(e.target.value))}>
                  {Array.from({ length: 8 }, (_, i) => i + 3).map((n) => <option key={n} value={n}>{scale === "star" ? t("{n} 星", { n }) : t("{n} 分", { n })}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm text-gray-700"><Toggle checked={allowComment} onChange={setAllowComment} />{t("允许嘉宾填写评论")}</label>
            <label className="flex items-start gap-3 text-sm text-gray-700"><Toggle checked={anonymous} onChange={setAnonymous} /><span>{t("匿名展示")}<span className="block text-xs text-gray-500 mt-0.5">{FEATURE_GROUPS ? t("开启后，大屏、控制台、报告和导出中都不显示评分人的姓名和组别（按组别平均分仍会统计）。") : t("开启后，大屏、控制台、报告和导出中都不显示评分人的姓名。")}</span></span></label>
          </>
        )}
        {type === "quiz" && (
          <div className="space-y-4">
            {qs.map((q, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="chip bg-brand-50 text-brand-700">{t("第 {n} 题", { n: i + 1 })}</span>
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">{t("限时")}<input className="input h-8 w-16 text-center" type="number" min={5} max={300} value={q.timeLimit} onChange={(e) => updQ(i, { timeLimit: Number(e.target.value) })} />{t("秒")}</span>
                  <button type="button" className="btn btn-ghost btn-sm px-2" disabled={qs.length <= 1} onClick={() => setQs(qs.filter((_, j) => j !== i))}><Icon name="trash" /></button>
                </div>
                <input className="input" value={q.text} onChange={(e) => updQ(i, { text: e.target.value })} placeholder={t("题目")} />
                <div className="space-y-2">
                  {q.options.map((o: string, k: number) => (
                    <div key={k} className="flex items-center gap-2">
                      <button type="button" title={t("标记为正确答案")} onClick={() => updQ(i, { correct: q.correct.includes(k) ? q.correct.filter((x: number) => x !== k) : [...q.correct, k] })}
                        className={`w-7 h-7 shrink-0 rounded-full border flex items-center justify-center ${q.correct.includes(k) ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 text-transparent hover:border-emerald-400"}`}><Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} /></button>
                      <input className="input" value={o} onChange={(e) => updQ(i, { options: q.options.map((x: string, j: number) => (j === k ? e.target.value : x)) })} placeholder={`选项 ${String.fromCharCode(65 + k)}`} />
                      <button type="button" className="btn btn-ghost px-2" disabled={q.options.length <= 2} onClick={() => updQ(i, { options: q.options.filter((_: string, j: number) => j !== k), correct: q.correct.filter((x: number) => x !== k).map((x: number) => (x > k ? x - 1 : x)) })}><Icon name="x" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  {q.options.length < 8 ? <button type="button" className="btn btn-ghost btn-sm text-brand-600" onClick={() => updQ(i, { options: [...q.options, ""] })}><Icon name="plus" />{t("添加选项")}</button> : <span />}
                  <span className="text-xs text-gray-400">{t("点击圆圈标记正确答案")}{q.correct.length > 1 ? t("（多选题）") : ""}</span>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary w-full border-dashed" onClick={() => setQs([...qs, { text: "", options: ["", "", "", ""], correct: [0], timeLimit: 20 }])}><Icon name="plus" />{t("添加题目")}</button>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 -mx-6 px-6 pt-4">
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t("取消")}</button>
          <button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="w-4 h-4" />}{initial ? t("保存") : t("创建")}</button>
        </div>
      </form>
    </Modal>
  );
}
