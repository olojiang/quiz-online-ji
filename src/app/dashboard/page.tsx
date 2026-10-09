"use client";
import { useT } from "@/components/i18n";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, EmptyState, Icon, Modal, PageLoader, Spinner, STATUS_STYLE, useUI } from "@/components/ui";
import { STATUS_LABEL } from "@/lib/types";
import { useMe } from "@/components/me";
import { FEATURE_GROUPS } from "@/lib/features";
import { StatusQuickActions } from "@/components/console/StatusControl";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ev = Record<string, any>;

export default function Dashboard() {
  const t = useT();
  const me = useMe();
  const { toast } = useUI();
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const load = useCallback(() => api("/api/events").then((d) => setEvents(d.events)).catch((e) => toast(e.message, "error")), [toast]);
  useEffect(() => { load(); }, [load]);
  const filtered = (events || []).filter((e) => (status === "all" || e.status === status) && (!q.trim() || e.name.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <main className="max-w-6xl 2xl:max-w-[1440px] min-[1800px]:max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("我的活动")}</h1>
          <p className="text-sm text-gray-500 mt-1">{me.canCreateEvents ? t("创建活动，开放会前提问，现场审核并投屏") : t("你被分配为以下活动的审核员或主持人")}</p>
        </div>
        {me.canCreateEvents && <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" />{t("创建活动")}</button>}
      </div>
      {events && events.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden text-sm">
            {[["all", "全部"], ["live", "进行中"], ["upcoming", "未开始"], ["ended", "已结束"]].map(([k, l], i) => (
              <button key={k} onClick={() => setStatus(k)} className={`px-4 py-2 ${i ? "border-l border-gray-200" : ""} ${status === k ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                {t(l)}<span className="ml-1 text-xs text-gray-400">{k === "all" ? events.length : events.filter((e) => e.status === k).length}</span>
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Icon name="search" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input pl-9" placeholder={t("搜索活动名称")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      )}
      {!events ? <PageLoader /> : events.length === 0 ? (
        <div className="card">
          <EmptyState icon="calendar" title={me.canCreateEvents ? t("还没有活动") : t("暂无分配给你的活动")}
            desc={me.canCreateEvents ? t("创建第一个活动，系统会自动生成嘉宾链接、二维码和投屏链接，并开启提问互动。") : t("请联系活动管理员把你添加为活动成员。")}
            action={me.canCreateEvents && <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" />{t("创建活动")}</button>} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 min-[1800px]:grid-cols-4 gap-4">
          {filtered.length === 0 && <div className="sm:col-span-2 lg:col-span-3 card"><EmptyState icon="search" title={t("没有符合条件的活动")} /></div>}
          {filtered.map((e) => (
            <div key={e.id} className="card hover:border-brand-300 hover:shadow-md transition group flex flex-col" data-testid="event-card">
              <Link href={`/dashboard/events/${e.id}`} className="block p-5 pb-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 line-clamp-2">{e.name}</h3>
                  <span className={`chip shrink-0 ${STATUS_STYLE[e.status]}`}>{t(STATUS_LABEL[e.status])}</span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Icon name="calendar" className="w-3.5 h-3.5" />{e.event_date ? String(e.event_date).slice(0, 10) : t("未设置日期")}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                  <span>{t("{n} 个互动", { n: e.interaction_count })}</span>
                  <span>{t("{n} 位嘉宾", { n: e.participant_count })}</span>
                  <span className="ml-auto flex gap-1">
                    {!e.perms.manage && e.perms.moderate && <span className="chip bg-sky-50 text-sky-700">{t("审核员")}</span>}
                    {!e.perms.manage && e.perms.present && <span className="chip bg-orange-50 text-orange-700">{t("主持人")}</span>}
                    {me.isSuper && e.user_id !== me.user.id && <span className="chip bg-gray-100 text-gray-600">{e.owner_name}</span>}
                  </span>
                </div>
              </Link>
              <div className="px-5 pb-3 pt-2 min-h-[12px] flex items-center justify-end">
                <StatusQuickActions event={e} perms={e.perms} onChanged={load} />
              </div>
            </div>
          ))}
        </div>
      )}
      {creating && <CreateEvent onClose={() => setCreating(false)} onDone={() => { setCreating(false); load(); }} />}
    </main>
  );
}

function CreateEvent({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [groups, setGroups] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/events", { body: { name, date: date || null, ...(FEATURE_GROUPS ? { groups: groups.split(/[\n,，]/) } : {}) } });
      toast(t("活动已创建"));
      onDone();
    } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose} title={t("创建活动")}>
      <form onSubmit={submit} className="px-6 pb-6 space-y-4">
        <div><label className="label">{t("活动名称")}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("例如：2026 年度战略分享会")} required autoFocus /></div>
        <div><label className="label">{t("活动日期")}</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        {FEATURE_GROUPS && <div>
          <label className="label">{t("组别列表")} <span className="text-gray-400 font-normal">{t("（可选，每行一个；留空则嘉宾自由填写）")}</span></label>
          <textarea className="input" rows={3} value={groups} onChange={(e) => setGroups(e.target.value)} placeholder={"销售部\n市场部\n研发中心"} />
        </div>}
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 leading-relaxed">{t("创建后会自动生成嘉宾链接与二维码、投屏链接，并默认开启「提问」互动和会前提问（人工审核）。")}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t("取消")}</button>
          <button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="w-4 h-4" />}{t("创建")}</button>
        </div>
      </form>
    </Modal>
  );
}
