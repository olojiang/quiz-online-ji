"use client";
import { useT } from "@/components/i18n";
import { useState } from "react";
import { api, Avatar, Dropdown, EmptyState, Icon, MenuItem, PageLoader, Toggle, usePoll, useUI } from "../ui";
import { fmtTime } from "@/lib/util";
import { FEATURE_GROUPS } from "@/lib/features";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const TABS = [
  { key: "showing", label: "展示中" },
  { key: "pending", label: "待审核" },
  { key: "history", label: "审核记录" },
  { key: "archived", label: "已归档" },
];
const FILTERS = [
  { key: "all", label: "全部问题" }, { key: "highlighted", label: "精选" }, { key: "pinned", label: "置顶" },
  { key: "answered", label: "已回答" }, { key: "unanswered", label: "未回答" }, { key: "flagged", label: "被系统标记" },
];

export function QAModeration({ interaction, event, perms }: { interaction: Any; event: Any; perms: Any }) {
  const t = useT();
  const { toast, confirm } = useUI();
  const [tab, setTab] = useState("showing");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState("all");
  const [group, setGroup] = useState("");
  const qs = new URLSearchParams({ tab, q: search, filter, ...(FEATURE_GROUPS ? { group } : {}) }).toString();
  const { data, reload, setData } = usePoll<Any>(() => api(`/api/interactions/${interaction.id}/questions?${qs}`), 3000, [interaction.id, qs]);

  async function act(q: Any, action: string, msg?: string) {
    try { await api(`/api/questions/${q.id}`, { method: "PATCH", body: { action } }); if (msg) toast(msg); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  async function setAuto(v: boolean) {
    setData((d: Any) => d && { ...d, autoApprove: v });
    try { await api(`/api/interactions/${interaction.id}`, { method: "PATCH", body: { autoApprove: v } }); toast(v ? t("已开启自动审核：新问题直接展示（被系统标记的仍需人工审核）") : t("已关闭自动审核：新问题进入待审核")); reload(); }
    catch (e) { toast((e as Error).message, "error"); reload(); }
  }
  async function archiveAll() {
    if (!(await confirm({ title: t("归档全部展示中的问题？"), message: t("归档后问题将从大屏和嘉宾端移除，可在「已归档」中恢复。"), confirmText: t("归档全部") }))) return;
    try { await api(`/api/interactions/${interaction.id}/questions`, { body: { action: "archive_all" } }); toast(t("已归档全部")); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  async function del(q: Any) {
    if (!(await confirm({ title: t("删除该问题？"), message: t("删除后无法恢复。"), danger: true, confirmText: t("删除") }))) return;
    act(q, "delete", "已删除");
  }

  const counts = data?.counts || {};
  const filtersActive = filter !== "all" || group !== "";

  return (
    <div className="card">
      {/* tabs */}
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 pt-4 pb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${event.status === "live" ? "bg-emerald-500" : "bg-rose-400"}`} />
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {TABS.map((tt, i) => (
            <button key={tt.key} onClick={() => setTab(tt.key)} className={`relative px-4 py-2 ${i ? "border-l border-gray-200" : ""} ${tab === tt.key ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
              {t(tt.label)}
              <sup className={`ml-1 ${tt.key === "pending" && counts.pending ? "inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-medium" : tab === tt.key ? "inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-brand-600 text-white text-[10px]" : "text-brand-500 text-[11px]"}`}>{counts[tt.key] ?? 0}</sup>
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-500" title={perms.moderate ? "" : t("只有审核员可以修改")}>
          {t("自动审核")} <Toggle checked={!!data?.autoApprove} disabled={!perms.moderate || !data} onChange={setAuto} />
        </label>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-2.5 border-y border-dashed border-gray-200 text-sm">
        {filtersActive && (
          <div className="flex flex-wrap gap-1.5">
            {filter !== "all" && <span className="chip bg-brand-50 text-brand-700">{FILTERS.find((f) => f.key === filter)?.label}<button onClick={() => setFilter("all")}><Icon name="x" className="w-3 h-3" /></button></span>}
            {group && <span className="chip bg-brand-50 text-brand-700">{t("组别")}：{group}<button onClick={() => setGroup("")}><Icon name="x" className="w-3 h-3" /></button></span>}
          </div>
        )}
        {showSearch && <input className="input h-8 w-56" autoFocus placeholder={t("搜索问题或姓名")} value={search} onChange={(e) => setSearch(e.target.value)} />}
        <div className="ml-auto flex items-center text-gray-700">
          <button className="px-2 hover:text-brand-600" onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearch(""); }}>{t("搜索")}</button>
          {perms.moderate && <><span className="text-gray-300">|</span><button className="px-2 hover:text-brand-600 disabled:text-gray-300" disabled={!counts.showing} onClick={archiveAll}>{t("归档全部")}</button></>}
          <span className="text-gray-300">|</span>
          <Dropdown width="w-56" trigger={() => <button className={`px-2 hover:text-brand-600 ${filtersActive ? "text-brand-600" : ""}`}>{t("过滤")}</button>}>
            {(close) => (
              <>
                <div className="px-4 pb-1 text-xs text-gray-400">{t("按状态")}</div>
                {FILTERS.map((f) => <MenuItem key={f.key} title={t(f.label)} active={filter === f.key} onClick={() => { setFilter(f.key); close(); }} />)}
                {FEATURE_GROUPS && <>
                  <div className="px-4 pt-2 pb-1 text-xs text-gray-400 border-t border-gray-100 mt-1">{t("按组别")}</div>
                  <MenuItem title={t("全部组别")} active={!group} onClick={() => { setGroup(""); close(); }} />
                  {Array.from(new Set([...(event.groups || []), ...(data?.groups || [])])).map((g: Any) => <MenuItem key={g} title={g} active={group === g} onClick={() => { setGroup(g); close(); }} />)}
                </>}
              </>
            )}
          </Dropdown>
        </div>
      </div>

      {/* list */}
      {!data ? <PageLoader /> : data.questions.length === 0 ? (
        <EmptyState icon={tab === "pending" ? "shield" : "qa"}
          title={search || filtersActive ? t("没有符合条件的问题") : { showing: t("暂无展示中的问题"), pending: t("没有待审核的问题"), history: t("暂无审核记录"), archived: t("暂无已归档问题") }[tab]!}
          desc={tab === "showing" && !search && !filtersActive ? t("分享嘉宾端二维码或链接，嘉宾提交的问题审核通过后会显示在这里。") : tab === "pending" && !search ? t("关闭自动审核后，新问题会先进入这里等待人工审核。") : undefined} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {data.questions.map((q: Any) => (
            <QuestionRow key={q.id} q={q} tab={tab} perms={perms} featured={data.featuredId === q.id} onAct={act} onDelete={del} />
          ))}
        </ul>
      )}
    </div>
  );
}

function QuestionRow({ q, tab, perms, featured, onAct, onDelete }: { q: Any; tab: string; perms: Any; featured: boolean; onAct: (q: Any, a: string, m?: string) => void; onDelete: (q: Any) => void }) {
  const t = useT();
  const isShowing = q.status === "approved" && !q.archived;
  return (
    <li className={`px-4 sm:px-5 py-4 ${featured ? "bg-amber-50/60" : q.pinned && isShowing ? "bg-brand-50/30" : ""}`}>
      <div className="flex gap-3">
        <Avatar name={q.nickname} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-1.5">
                <span className="text-gray-800 font-medium">{q.nickname}</span>
                {FEATURE_GROUPS && q.group_name && <><span className="text-gray-300">·</span><span>{q.group_name}</span></>}
                {q.highlighted && <span className="chip bg-amber-50 text-amber-700 ml-1">{t("精选")}</span>}
                {q.pinned && <span className="chip bg-blue-50 text-blue-700">{t("置顶")}</span>}
                {q.answered && <span className="chip bg-emerald-50 text-emerald-700">{t("已回答")}</span>}
                {featured && <span className="chip bg-amber-500 text-white">{t("大屏上墙中")}</span>}
                {tab === "history" && <span className={`chip ${q.status === "approved" ? "bg-emerald-50 text-emerald-700" : q.status === "rejected" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>{q.status === "approved" ? t("已通过") : q.status === "rejected" ? t("已拒绝") : t("待审核")}</span>}
                {q.archived && tab !== "archived" && <span className="chip bg-gray-100 text-gray-500">{t("已归档")}</span>}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Icon name="like" className="w-3.5 h-3.5" />{q.likes}</span>
                <span className="text-gray-200">|</span>
                <span className="flex items-center gap-1"><Icon name="comment" className="w-3.5 h-3.5" />{q.comment_count}</span>
                <span className="text-gray-200">|</span>
                <span>{fmtTime(q.created_at)}</span>
                {tab === "history" && q.reviewed_at && <><span className="text-gray-200">|</span><span>{t("审核于")} {fmtTime(q.reviewed_at)}</span></>}
              </div>
            </div>
            {/* actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {tab === "pending" && perms.moderate && (
                <>
                  <button className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onAct(q, "approve", "已通过，问题已展示")}><Icon name="check" strokeWidth={2.5} />{t("通过")}</button>
                  <button className="btn btn-sm btn-secondary text-red-600" onClick={() => onAct(q, "reject", "已拒绝")}><Icon name="x" />{t("拒绝")}</button>
                </>
              )}
              {isShowing && perms.present && (
                <>
                  <RoundBtn title={featured ? t("取消上墙") : t("上墙：在大屏放大展示")} on={featured} color="orange" icon="feature" onClick={() => onAct(q, featured ? "unfeature" : "feature", featured ? t("已取消上墙") : t("已上墙，大屏正在放大展示"))} />
                  <RoundBtn title={q.highlighted ? t("取消精选") : t("精选")} on={q.highlighted} color="amber" icon="star" onClick={() => onAct(q, q.highlighted ? "unhighlight" : "highlight")} />
                  <RoundBtn title={q.pinned ? t("取消置顶") : t("置顶")} on={q.pinned} color="blue" icon="top" onClick={() => onAct(q, q.pinned ? "unpin" : "pin")} />
                  <RoundBtn title={q.answered ? t("标记为未回答") : t("标记为已回答")} on={q.answered} color="emerald" icon="check" onClick={() => onAct(q, q.answered ? "unanswer" : "answer")} />
                </>
              )}
              {tab === "archived" && perms.moderate && <button className="btn btn-sm btn-secondary" onClick={() => onAct(q, "unarchive", "已恢复")}>{t("恢复")}</button>}
              {tab === "history" && q.status === "rejected" && perms.moderate && <button className="btn btn-sm btn-secondary" onClick={() => onAct(q, "approve", "已改为通过")}>{t("改为通过")}</button>}
            </div>
          </div>
          <p className="mt-2.5 text-[15px] text-gray-900 leading-relaxed whitespace-pre-wrap break-words">{q.text}</p>
          {q.flag_reason && <div className="mt-2"><span className="chip bg-red-50 text-red-600 ring-1 ring-red-100"><Icon name="flag" className="w-3 h-3" />{t("系统标记")}：{q.flag_reason.split("、").map((x: string) => t(x)).join("、")}</span></div>}
        </div>
        {perms.moderate && (
          <div className="self-end">
            <Dropdown width="w-40" trigger={() => <button className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Icon name="more" className="w-5 h-5" /></button>}>
              {(close) => (
                <>
                  {q.status !== "approved" && <MenuItem icon="check" title={t("通过")} onClick={() => { close(); onAct(q, "approve", "已通过"); }} />}
                  {!q.archived && <MenuItem icon="archive" title={t("归档")} onClick={() => { close(); onAct(q, "archive", "已归档"); }} />}
                  {q.status !== "rejected" && <MenuItem icon="x" title={t("拒绝")} onClick={() => { close(); onAct(q, "reject", "已拒绝"); }} />}
                  <MenuItem icon="trash" title={t("删除")} danger onClick={() => { close(); onDelete(q); }} />
                </>
              )}
            </Dropdown>
          </div>
        )}
      </div>
    </li>
  );
}

const COLORS: Record<string, [string, string]> = {
  amber: ["border-amber-400 text-amber-500 hover:bg-amber-50", "bg-amber-400 border-amber-400 text-white"],
  blue: ["border-blue-500 text-blue-600 hover:bg-blue-50", "bg-blue-600 border-blue-600 text-white"],
  emerald: ["border-emerald-500 text-emerald-600 hover:bg-emerald-50", "bg-emerald-500 border-emerald-500 text-white"],
  orange: ["border-orange-400 text-orange-500 hover:bg-orange-50", "bg-orange-500 border-orange-500 text-white"],
};
function RoundBtn({ title, on, color, icon, onClick }: { title: string; on: boolean; color: string; icon: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick} className={`w-8 h-8 rounded-full border-[1.5px] flex items-center justify-center transition ${COLORS[color][on ? 1 : 0]}`}>
      <Icon name={icon} className="w-4 h-4" strokeWidth={2} />
    </button>
  );
}
