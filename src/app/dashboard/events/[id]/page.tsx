"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, EmptyState, Icon, PageLoader, usePoll, useUI } from "@/components/ui";
import { useMe } from "@/components/me";
import { UserMenu } from "@/components/UserMenu";
import { TYPE_LABEL } from "@/lib/types";
import { GuestMenu, ScreenMenu } from "@/components/console/HeaderMenus";
import { CreateInteractionModal, InteractionForm } from "@/components/console/InteractionForms";
import { QAModeration } from "@/components/console/QAModeration";
import { LiveResults } from "@/components/console/LiveResults";
import { SettingsDrawer } from "@/components/console/SettingsPanel";
import { LinksPanel } from "@/components/console/LinksPanel";
import { ReportView } from "@/components/ReportView";
import { AppLogo } from "@/components/Logo";
import { LangSwitch, useT } from "@/components/i18n";
import { MembersPanel } from "@/components/console/MembersPanel";
import { StatusControl } from "@/components/console/StatusControl";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const TYPE_ICON: Record<string, string> = { qa: "qa", poll: "poll", quiz: "quiz", open: "open", rate: "rate" };

export default function EventConsole() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const router = useRouter();
  const { toast, confirm } = useUI();
  const { data, error, reload } = usePoll<Any>(() => api(`/api/events/${id}`), 4000, [id]);
  const [view, setView] = useState<string>(""); // "i:<id>" | "settings" | "members"
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Any>(null);
  const [settings, setSettings] = useState(false);
  const t = useT();

  useEffect(() => {
    if (data && !view) {
      const want = new URLSearchParams(window.location.search).get("view");
      if (want === "report" || want === "links" || want === "members") { setView(want); return; }
      const qa = data.interactions.find((i: Any) => i.type === "qa");
      const first = qa || data.interactions[0];
      setView(first ? `i:${first.id}` : "report");
    }
  }, [data, view]);

  if (error && !data) {
    return <div className="min-h-screen flex items-center justify-center"><div className="card"><EmptyState icon="shield" title={error.status === 403 ? t("无权访问该活动") : error.status === 404 ? t("活动不存在") : t("加载失败")} desc={error.message} action={<Link href="/dashboard" className="btn btn-secondary">{t("返回活动列表")}</Link>} /></div></div>;
  }
  if (!data) return <PageLoader />;
  const { event, interactions, perms, participants } = data;
  const current = interactions.find((i: Any) => i.id === event.current_interaction_id);
  const selected = view.startsWith("i:") ? interactions.find((i: Any) => `i:${i.id}` === view) : null;
  const qaId: number | null = interactions.find((i: Any) => i.type === "qa")?.id ?? null;

  async function setCurrent(iid: number | null) {
    try { await api(`/api/events/${id}`, { method: "PATCH", body: { current_interaction_id: iid, screen_channel: "interaction" } }); toast(iid ? t("已设为当前互动并切换至互动频道") : t("已取消当前互动")); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  async function removeInteraction(it: Any) {
    if (!(await confirm({ title: `删除「${it.title}」？`, message: t("该互动下的所有提问、投票和作答记录都会被永久删除。"), danger: true, confirmText: t("删除") }))) return;
    try { await api(`/api/interactions/${it.id}`, { method: "DELETE" }); toast(t("已删除")); setView(""); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200/80">
        <div className="px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100" title={t("返回")}><Icon name="back" className="w-5 h-5" /></Link>
          <Link href="/dashboard" className="hidden lg:block"><AppLogo size={26} /></Link>
          <div className="min-w-0 flex items-center gap-2">
            <h1 className="font-semibold text-gray-900 truncate max-w-[40vw]">{event.name}</h1>
          </div>
          <StatusControl event={event} perms={perms} onChanged={reload} />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600" title={t("在线 / 累计参与人数")}>
              <Icon name="users" className="w-4 h-4 text-gray-400" />
              <span><b className="text-emerald-600 font-semibold">{participants.online}</b><span className="text-gray-400">/{participants.total}</span></span>
            </div>
            <GuestMenu hash={data.links.guest} embedHash={data.links.embed} canManage={perms.manage} eventId={event.id} onChanged={reload} />
            <ScreenMenu event={event} hash={data.links.screen} canPresent={perms.present} onChanged={reload} />
            {perms.manage && <button className="hidden sm:inline-flex p-2 rounded-lg text-gray-500 hover:bg-gray-100" title={t("设置")} onClick={() => setSettings(true)}><Icon name="settings" className="w-5 h-5" /></button>}
            <Link href={`/help?role=${perms.manage ? "event_admin" : perms.moderate ? "moderator" : "presenter"}`} target="_blank" className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-brand-600 hover:border-brand-300 text-sm font-semibold" title={t("帮助中心")}>?</Link>
            <span className="hidden md:inline-flex"><LangSwitch /></span>
            <UserMenu me={me} />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="md:w-64 shrink-0 bg-white md:border-r border-b md:border-b-0 border-gray-200/80 p-3 md:min-h-[calc(100vh-56px)]">
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <span className="text-xs font-medium text-gray-400">{t("互动内容")}</span>
            {perms.manage && <button className="text-brand-600 hover:bg-brand-50 rounded-md p-1" title={t("创建互动")} onClick={() => setCreating(true)}><Icon name="plus" className="w-4 h-4" /></button>}
          </div>
          <div className="flex md:flex-col gap-1 overflow-x-auto scrollbar-thin">
            {interactions.map((it: Any) => (
              <button key={it.id} onClick={() => setView(`i:${it.id}`)}
                className={`shrink-0 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${view === `i:${it.id}` ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50"}`}>
                <span className={`w-7 h-7 rounded-md flex items-center justify-center ${view === `i:${it.id}` ? "bg-white text-brand-600" : "bg-gray-100 text-gray-500"}`}><Icon name={TYPE_ICON[it.type]} className="w-4 h-4" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">{it.title}</span>
                  <span className="block text-[11px] text-gray-400">{t(TYPE_LABEL[it.type])}</span>
                </span>
                {it.type === "qa" && it.pending_count > 0 && <span className="chip bg-red-500 text-white px-1.5">{it.pending_count}</span>}
                {it.id === event.current_interaction_id && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title={t("当前投屏")} />}
              </button>
            ))}
            {perms.manage && (
              <button onClick={() => setCreating(true)} className="shrink-0 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-500 border border-dashed border-gray-300 hover:border-brand-400 hover:text-brand-600 md:mt-1">
                <Icon name="plus" className="w-4 h-4" />{t("创建互动")}
              </button>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex md:flex-col gap-1">
            <SideLink active={view === "report"} icon="poll" onClick={() => setView("report")}>{t("活动报告")}</SideLink>
            <SideLink active={view === "links"} icon="external" onClick={() => setView("links")}>{t("链接管理")}</SideLink>
            <SideLink active={view === "members"} icon="users" onClick={() => setView("members")}>{t("成员")}</SideLink>
            {perms.manage && <SideLink active={false} icon="settings" onClick={() => setSettings(true)}>{t("活动设置")}</SideLink>}
          </div>
          {!perms.manage && (
            <div className="hidden md:block mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500 leading-relaxed">
              你在本活动的身份：{[perms.moderate && "审核员", perms.present && "主持人"].filter(Boolean).join("、")}
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 2xl:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
          {view === "report" && <ReportView dataUrl={`/api/events/${event.id}/report`} exportUrl={`/api/events/${event.id}/export`} />}
          {view === "links" && <LinksPanel eventId={event.id} onChanged={reload} />}
          {view === "members" && <MembersPanel eventId={event.id} canManage={perms.manage} />}
          {selected && (
            <div className="w-full">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="min-w-0">
                  <div className="text-xs text-gray-400">{t(TYPE_LABEL[selected.type])}</div>
                  <h2 className="text-xl font-semibold text-gray-900 truncate">{selected.title}</h2>
                </div>
                {selected.id === event.current_interaction_id && <span className="chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{t("当前投屏中")}</span>}
                <div className="ml-auto flex gap-2">
                  {perms.present && (selected.id === event.current_interaction_id
                    ? <button className="btn btn-secondary" onClick={() => setCurrent(null)}>{t("取消投屏")}</button>
                    : <button className="btn btn-primary" onClick={() => setCurrent(selected.id)}><Icon name="screen" />{t("设为当前互动")}</button>)}
                  {perms.manage && <button className="btn btn-secondary" onClick={() => setEditing(selected)}><Icon name="edit" />{t("编辑")}</button>}
                  {perms.manage && <button className="btn btn-secondary text-red-600 hover:bg-red-50" onClick={() => removeInteraction(selected)} title={t("删除")}><Icon name="trash" /></button>}
                </div>
              </div>
              {selected.type === "qa" ? (
                <QAModeration interaction={selected} event={event} perms={perms} />
              ) : (
                <LiveResults interaction={selected} perms={perms} />
              )}
            </div>
          )}
          {!selected && !["report", "links", "members"].includes(view) && (
            <div className="card"><EmptyState icon="qa" title={t("还没有互动")} desc={t("创建一个互动，开始收集问题或发起投票。")} action={perms.manage && <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" />{t("创建互动")}</button>} /></div>
          )}
          {current && selected && selected.id !== current.id && (
            <p className="mt-4 text-xs text-gray-400">{t("当前投屏互动")}：{current.title}</p>
          )}
          </div>
        </main>
      </div>

      {settings && <SettingsDrawer event={event} qa={interactions.find((i: Any) => i.type === "qa") || null} perms={perms} onClose={() => setSettings(false)} onChanged={reload} onDeleted={() => router.replace("/dashboard")} />}
      {creating && <CreateInteractionModal eventId={event.id} qaId={qaId} onClose={() => setCreating(false)} onCreated={(it) => { setCreating(false); reload(); setView(`i:${it.id}`); }} onGoQA={(qid) => { setCreating(false); setView(`i:${qid}`); }} />}
      {editing && <InteractionForm type={editing.type} initial={editing} eventId={event.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function SideLink({ active, icon, onClick, children }: { active: boolean; icon: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${active ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
      <Icon name={icon} className="w-4 h-4" />{children}
    </button>
  );
}
