"use client";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LinkError } from "@/components/LinkError";
import Link from "next/link";
import { api, Avatar, Dropdown, Icon, MenuItem, Modal, PageLoader, Spinner, copyText, usePoll, useUI } from "@/components/ui";
import { fmtTime } from "@/lib/util";
import { guestVars } from "@/lib/palette";
import { AppLogo } from "@/components/Logo";
import { LangSwitch, useT } from "@/components/i18n";
import { ScoreInput, StarInput, StarRow } from "@/components/Rating";
import { guestPalette } from "@/lib/palette";
import { FEATURE_GROUPS } from "@/lib/features";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
type Profile = { name: string; group?: string };
/** "姓名" or "姓名 · 组别" depending on FEATURE_GROUPS. */
const who = (name: string, group?: string) => (FEATURE_GROUPS && group ? `${name} · ${group}` : name);

function getPid() {
  let p = localStorage.getItem("qoj_pid");
  if (!p) { p = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, ""); localStorage.setItem("qoj_pid", p); }
  return p;
}

/**
 * Desktop/tablet (≥768px) framing: the guest page becomes a centred "app card" on a soft themed backdrop.
 * Phones keep the full-screen layout (every framing class is md:-prefixed). /embed (iframe) stays unframed.
 */
function useFramed() { return !(usePathname() || "").startsWith("/embed"); }

export default function GuestPage() {
  const t = useT();
  const framed = useFramed();
  const F = (cls: string) => (framed ? cls : "");
  const { hash: code } = useParams<{ hash: string }>();
  const [pid, setPid] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [sort, setSort] = useState<"hot" | "time">("hot");
  const [tab, setTab] = useState<"current" | "qa">("current");
  const [editProfile, setEditProfile] = useState(false);
  const visited = useRef(false);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  useEffect(() => {
    setPid(getPid());
    setPreviewTheme(new URLSearchParams(window.location.search).get("theme"));
    try { const p = JSON.parse(localStorage.getItem(`qoj_profile`) || "null"); if (p?.name) setProfile(p); } catch { /* */ }
    setReady(true);
  }, []);
  const { data, error, reload, setData } = usePoll<Any>(
    () => { const first = !visited.current; visited.current = true; return api(`/api/g/${code}?pid=${pid}&nick=${encodeURIComponent(profile?.name || "")}${FEATURE_GROUPS ? `&group=${encodeURIComponent(profile?.group || "")}` : ""}&sort=${sort}${first ? "&visit=1" : ""}`); }, 2500, [code, pid, profile?.name, sort]);

  const themeKey = previewTheme || data?.event?.guest_theme;
  useEffect(() => {
    const vars = guestVars(themeKey);
    for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
  }, [themeKey]);
  function saveProfile(p: Profile) { localStorage.setItem("qoj_profile", JSON.stringify(p)); setProfile(p); setEditProfile(false); }

  if (!ready || (!data && !error)) return <PageLoader />;
  if (error && !data) return <LinkError revoked={error.status === 410} message={error.message} />;
  const ev = data.event;
  if (!profile || editProfile) return <JoinGate event={ev} framed={framed} initial={profile} onDone={saveProfile} onCancel={profile ? () => setEditProfile(false) : undefined} />;

  const cur = data.live;
  const qa = cur?.type === "qa" ? cur : data.qa;
  const showTabs = cur && cur.type !== "qa" && data.qa;
  const view = showTabs ? (tab === "qa" ? data.qa : cur) : cur;
  const updateQA = (fn: (q: Any) => Any) => setData((d: Any) => d && (d.live?.type === "qa" ? { ...d, live: fn(d.live) } : { ...d, qa: fn(d.qa) }));

  return (
    <div className={`g-scope min-h-screen bg-[color:var(--g-page)] ${F("g-backdrop md:px-6 md:pt-10 md:pb-6")}`}>
      <div className={`max-w-2xl mx-auto ${F("md:max-w-[720px] xl:max-w-[760px] md:flex md:flex-col md:min-h-[calc(100vh-7.5rem)] md:rounded-[20px] g-frame md:bg-[color:var(--g-page)]")}`} data-testid="guest-card">
        <header className={`g-hero px-5 pt-5 pb-6 ${F("md:px-8 md:pt-7 md:pb-8 md:rounded-t-[20px]")}`}>
          <span className="g-hero-grain" aria-hidden />
          <div className="flex items-center gap-2"><AppLogo size={22} white /><div className="flex-1" /><LangSwitch dark /></div>
          <h1 className={`mt-4 text-[22px] leading-tight font-semibold tracking-tight break-words ${F("md:mt-5 md:text-[28px]")}`}>{ev.name}</h1>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="g-chip"><Icon name={view ? (TYPE_ICON[view.type] || "qa") : "mic"} className="w-3.5 h-3.5" />{view ? t(view.title) : t("等待互动开始")}</span>
            {ev.status === "live" && <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--g-header-muted)]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />{t("进行中")}</span>}
          </div>
        </header>
        {data.notice && <div className={`px-5 py-2.5 text-xs flex items-center gap-2 ${ev.status === "ended" ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-800"}`}><Icon name="info" className="w-3.5 h-3.5 shrink-0" />{t(data.notice)}</div>}
        {showTabs && (
          <div className="flex bg-white/90 border-b border-gray-100 text-sm">
            {(["current", "qa"] as const).map((k) => (
              <button key={k} className={`relative flex-1 py-3.5 transition-colors ${tab === k ? "text-[color:var(--g-text)] font-semibold" : "text-gray-500 hover:text-gray-800"}`} onClick={() => setTab(k)}>
                {t(k === "current" ? cur.title : data.qa.title)}
                <span className={`g-tab-ind absolute left-1/2 -translate-x-1/2 bottom-0 h-[3px] w-10 rounded-full bg-[color:var(--g-text)] transition-transform duration-300 ${tab === k ? "scale-x-100" : "scale-x-0"}`} />
              </button>
            ))}
          </div>
        )}
        <div className={`pb-20 ${F("md:flex-1 md:pb-6 md:px-3 md:pt-1 g-desk")}`}>
          {!view && <GuestEmpty icon="mic" title={t("互动即将开始")} desc={t("主持人开启互动后，这里会自动刷新。")} />}
          {view?.type === "qa" && qa && <QAView code={code} pid={pid} profile={profile} event={ev} qa={qa} canAsk={data.canAsk} sort={sort} setSort={setSort} reload={reload} update={updateQA} />}
          {view?.type === "poll" && <PollView code={code} pid={pid} profile={profile} live={view} reload={reload} ended={ev.status === "ended"} />}
          {view?.type === "quiz" && <QuizView code={code} pid={pid} profile={profile} live={view} reload={reload} />}
          {view?.type === "rate" && <RateView code={code} pid={pid} profile={profile} live={view} reload={reload} ended={ev.status === "ended"} theme={themeKey} />}
          {view?.type === "open" && <OpenView code={code} pid={pid} profile={profile} live={view} reload={reload} ended={ev.status === "ended"} />}
        </div>
        <footer className={`fixed bottom-0 inset-x-0 z-20 g-frost border-t border-black/[0.06] ${F("md:sticky md:rounded-b-[20px]")}`}>
          <div className={`max-w-2xl mx-auto px-4 h-12 flex items-center gap-2 text-xs text-gray-500 ${F("md:max-w-none md:px-6 md:h-14 md:text-[13px] md:gap-3")}`}>
            <GAvatar name={profile.name} size={24} />
            <span className="truncate text-gray-700 font-medium">{who(profile.name, profile.group)}</span>
            <button className="ml-auto rounded-full px-3 h-7 text-[color:var(--g-text)] hover:bg-[color:var(--g-soft)] transition-colors" onClick={() => setEditProfile(true)}>{t("修改信息")}</button>
            <Link href="/help?role=guest" target="_blank" className="text-gray-500 hover:text-[color:var(--g-text)]">{t("帮助")}</Link>
          </div>
        </footer>
      </div>
      {framed && <GuestBrand name={ev.name} />}
    </div>
  );
}

const TYPE_ICON: Record<string, string> = { qa: "qa", poll: "poll", quiz: "quiz", rate: "rate", open: "open" };

/** Initials avatar with a soft two-tone gradient (hue derived from the name). */
function GAvatar({ name, size = 32 }: { name: string; size?: number }) {
  let h = 0;
  for (const c of name || "?") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return <Avatar name={name} size={size} bg={`linear-gradient(135deg, hsl(${hue} 62% 58%), hsl(${(hue + 35) % 360} 58% 42%))`} />;
}

/** Themed empty state: soft gradient medallion + friendly copy. */
function GuestEmpty({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <div className="g-in flex flex-col items-center justify-center text-center py-16 px-8">
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-3 rounded-full bg-[color:var(--g-soft)] blur-md" />
        <div className="relative w-16 h-16 rounded-[22px] flex items-center justify-center text-white shadow-lg rotate-[-6deg]" style={{ background: "linear-gradient(135deg, var(--g-primary), var(--g-primary-2))" }}>
          <Icon name={icon} className="w-8 h-8 rotate-[6deg]" />
        </div>
      </div>
      <div className="text-[15px] font-semibold text-gray-900 tracking-tight">{title}</div>
      {desc && <div className="mt-2 text-sm text-gray-500 max-w-xs leading-relaxed">{desc}</div>}
    </div>
  );
}

/** Muted branding under the desktop card (hidden on phones). */
function GuestBrand({ name }: { name?: string }) {
  return <p className="hidden md:block text-center text-xs text-[color:var(--g-backdrop-muted)] mt-5 truncate px-4">{name ? `${name} · ` : ""}Quiz Online Ji</p>;
}

function JoinGate({ event, framed, initial, onDone, onCancel }: { event: Any; framed: boolean; initial: Profile | null; onDone: (p: Profile) => void; onCancel?: () => void }) {
  const F = (cls: string) => (framed ? cls : "");
  const t = useT();
  const [name, setName] = useState(initial?.name || "");
  const [group, setGroup] = useState(initial?.group || "");
  const groups: string[] = event.groups || [];
  return (
    <div className={`g-scope min-h-screen bg-[color:var(--g-page)] ${F("g-backdrop md:px-6 md:pt-[12vh] md:pb-8")}`}>
      <div className={`max-w-md mx-auto ${F("md:max-w-[480px] md:rounded-[20px] g-frame md:bg-[color:var(--g-page)] md:pb-8")}`} data-testid="guest-card">
        <div className={`g-hero px-6 pt-8 pb-20 ${F("md:px-9 md:pt-9 md:rounded-t-[20px]")}`}>
          <span className="g-hero-grain" aria-hidden />
          <div className="flex items-center justify-between mb-8"><AppLogo size={30} white /><LangSwitch dark /></div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--g-header-muted)]">{t("欢迎参加")}</div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight break-words">{event.name}</h1>
          {event.event_date && <div className="mt-3 inline-flex items-center gap-1.5 g-chip"><Icon name="calendar" className="w-3.5 h-3.5" />{String(event.event_date).slice(0, 10)}</div>}
        </div>
        <form className={`g-in g-card relative mx-4 -mt-12 p-6 space-y-5 ${F("md:mx-7 md:p-8")}`} onSubmit={(e) => { e.preventDefault(); if (name.trim() && (!FEATURE_GROUPS || group.trim())) onDone({ name: name.trim(), group: FEATURE_GROUPS ? group.trim() : initial?.group || "" }); }}>
          <div className="text-base font-semibold text-gray-900 tracking-tight">{FEATURE_GROUPS ? t("填写信息后参与互动") : t("填写姓名即可参与互动")}</div>
          <div><label className="label">{t("姓名")} <span className="text-red-500">*</span></label><input className="input h-12 rounded-xl text-[15px] px-4" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={t("请输入您的姓名")} required autoFocus /></div>
          {FEATURE_GROUPS && <div><label className="label">{t("组别")} <span className="text-red-500">*</span></label>
            {groups.length ? (
              <select className="input h-11" value={group} onChange={(e) => setGroup(e.target.value)} required><option value="">{t("请选择组别")}</option>{groups.map((g) => <option key={g}>{g}</option>)}</select>
            ) : <input className="input h-11" value={group} onChange={(e) => setGroup(e.target.value)} maxLength={40} placeholder={t("请输入您的组别/部门")} required />}
          </div>}
          <button className="btn g-btn w-full h-12 rounded-xl text-[15px] font-semibold tracking-wide shadow-[0_8px_20px_-8px_var(--g-primary)]" >{t("进入活动")}<Icon name="right" className="w-4 h-4" /></button>
          {onCancel && <button type="button" className="btn btn-ghost w-full" onClick={onCancel}>{t("取消")}</button>}
        </form>
        <p className={`text-center text-xs text-gray-500 mt-6 ${F("md:text-[13px]")}`}><Link href="/help?role=guest" className="underline">{t("如何参与？查看帮助")}</Link></p>
      </div>
      {framed && <GuestBrand />}
    </div>
  );
}

function QAView({ code, pid, profile, event, qa, canAsk, sort, setSort, reload, update }: { code: string; pid: string; profile: Profile; event: Any; qa: Any; canAsk: boolean; sort: string; setSort: (s: "hot" | "time") => void; reload: () => void; update: (fn: (q: Any) => Any) => void }) {
  const t = useT();
  const { toast } = useUI();
  const [composing, setComposing] = useState(false);
  const [openComments, setOpenComments] = useState<number | null>(null);
  async function like(q: Any) {
    update((d) => ({ ...d, questions: d.questions.map((x: Any) => x.id === q.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x) }));
    try { await api(`/api/g/${code}/questions/${q.id}/like`, { body: { pid } }); } catch (e) { toast((e as Error).message, "error"); }
    reload();
  }
  const questions = qa.questions as Any[];
  return (
    <>
      <button disabled={!canAsk} onClick={() => setComposing(true)} className="g-in group mx-3 mt-4 w-[calc(100%-1.5rem)] bg-white rounded-full border border-black/[0.06] pl-2 pr-2 py-2 flex items-center gap-3 text-[15px] text-gray-500 disabled:text-gray-400 shadow-[0_2px_4px_rgba(16,24,40,0.04),0_10px_24px_-14px_rgba(16,24,40,0.25)] transition hover:shadow-[0_2px_4px_rgba(16,24,40,0.05),0_14px_30px_-14px_rgba(16,24,40,0.3)] disabled:shadow-none">
        <span className="w-10 h-10 rounded-full flex items-center justify-center bg-[color:var(--g-soft)] text-[color:var(--g-text)] shrink-0"><Icon name="edit" className="w-[18px] h-[18px]" /></span>
        <span className="flex-1 text-left truncate">{canAsk ? t("点击输入您的问题") : t("提问已关闭")}</span>
        {canAsk && <span className="g-btn rounded-full w-9 h-9 inline-flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden><Icon name="right" className="w-4 h-4" strokeWidth={2.2} /></span>}
      </button>
      <div className="flex items-center px-3 mt-5 border-b border-black/[0.06]">
        {(["hot", "time"] as const).map((s) => (
          <button key={s} onClick={() => setSort(s)} className={`relative px-4 py-3 text-sm transition-colors ${sort === s ? "text-gray-900 font-semibold" : "text-gray-500 hover:text-gray-800"}`}>
            {s === "hot" ? t("热门问题") : t("最新问题")}
            <span className={`g-tab-ind absolute left-4 right-4 -bottom-px h-[3px] rounded-full bg-[color:var(--g-text)] transition-transform duration-300 origin-center ${sort === s ? "scale-x-100" : "scale-x-0"}`} />
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500 pr-1 tabular-nums">{t("{n}个问题", { n: qa.approvedCount })}</span>
      </div>
      {questions.length === 0 ? (
        <GuestEmpty icon="qa" title={t("还没有问题")} desc={canAsk ? t("来提出第一个问题吧！审核通过后所有人都能看到并点赞。") : undefined} />
      ) : (
        <ul className="px-3 pt-4 space-y-3">
          {questions.map((q) => (
            <li key={q.id} className={`g-in g-card g-lift px-4 py-4 ${q.status === "pending" ? "opacity-80" : ""}`}>
              <div className="flex items-start gap-3">
                <GAvatar name={q.nickname} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-gray-800 truncate">{q.nickname}{FEATURE_GROUPS && q.group_name && <span className="text-gray-500"> · {q.group_name}</span>}</div>
                  <div className="text-xs text-gray-400 mt-0.5 tabular-nums">{fmtTime(q.created_at)}</div>
                </div>
                {q.status === "approved" ? (
                  <button onClick={() => like(q)} className={`flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full border text-sm transition-colors active:scale-95 ${q.liked ? "text-[color:var(--g-text)] bg-[color:var(--g-soft)] border-[color:var(--g-soft-border)]" : "text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"}`} aria-label={t("点赞")} aria-pressed={!!q.liked}>
                    <Icon name="like" className="w-4 h-4" strokeWidth={q.liked ? 2.2 : 1.7} /><span className="tabular-nums font-medium">{q.likes}</span>
                  </button>
                ) : <span className="chip bg-amber-50 text-amber-700">{t("审核中")}</span>}
              </div>
              <p className="mt-3 text-[15px] text-gray-900 leading-[1.7] tracking-[0.01em] whitespace-pre-wrap break-words">{q.text}</p>
              <div className="mt-1 flex items-center gap-2">
                {q.pinned && <span className="chip bg-blue-50 text-blue-700">{t("置顶")}</span>}
                {q.answered && <span className="chip bg-emerald-50 text-emerald-700">{t("已回答")}</span>}
                {q.highlighted && <span className="chip bg-amber-50 text-amber-800">{t("精选")}</span>}
                {q.status === "approved" && q.comment_count > 0 && <button className="text-xs text-gray-500" onClick={() => setOpenComments(openComments === q.id ? null : q.id)}>{q.comment_count}{t("条评论")}</button>}
                {q.status === "approved" && (
                  <div className="ml-auto">
                    <Dropdown width="w-36" trigger={() => <button className="p-1 text-gray-500 hover:text-gray-500"><Icon name="more" className="w-5 h-5" /></button>}>
                      {(close) => (
                        <>
                          <MenuItem icon="comment" title={t("评论")} onClick={() => { close(); setOpenComments(q.id); }} />
                          <MenuItem icon="copy" title={t("复制内容")} onClick={async () => { close(); await copyText(q.text); toast(t("已复制")); }} />
                        </>
                      )}
                    </Dropdown>
                  </div>
                )}
              </div>
              {openComments === q.id && <Comments code={code} qid={q.id} pid={pid} profile={profile} canComment={event.status !== "ended"} onPosted={reload} />}
            </li>
          ))}
        </ul>
      )}
      {composing && <AskSheet code={code} pid={pid} profile={profile} event={event} onClose={() => setComposing(false)} onDone={() => { setComposing(false); reload(); }} />}
    </>
  );
}

function AskSheet({ code, pid, profile, event, onClose, onDone }: { code: string; pid: string; profile: Profile; event: Any; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const [name, setName] = useState(profile.name);
  const [group, setGroup] = useState(profile.group || "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const groups: string[] = event.groups || [];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api(`/api/g/${code}/questions`, { body: { pid, name, ...(FEATURE_GROUPS ? { group } : {}), text } });
      localStorage.setItem("qoj_profile", JSON.stringify({ name, group }));
      toast(d.message);
      onDone();
    } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose} title={t("提问")} width="max-w-lg">
      <form onSubmit={submit} className="px-6 pb-6 space-y-3.5">
        <div className={FEATURE_GROUPS ? "grid grid-cols-2 gap-3" : ""}>
          <div><label className="label">{t("姓名")} <span className="text-red-500">*</span></label><input className="input h-11 rounded-xl px-4" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required /></div>
          {FEATURE_GROUPS && <div><label className="label">{t("组别")} <span className="text-red-500">*</span></label>
            {groups.length ? <select className="input" value={group} onChange={(e) => setGroup(e.target.value)} required><option value="">{t("请选择")}</option>{groups.map((g) => <option key={g}>{g}</option>)}</select>
              : <input className="input" value={group} onChange={(e) => setGroup(e.target.value)} maxLength={40} required />}
          </div>}
        </div>
        <div>
          <label className="label">{t("问题")} <span className="text-red-500">*</span></label>
          <textarea className="input rounded-xl text-[15px] px-4 py-3" rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={t("请输入您的问题…")} required autoFocus />
          <div className="text-right text-xs text-gray-500 mt-1">{text.length}/500</div>
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1.5"><Icon name="shield" className="w-3.5 h-3.5 shrink-0" />{t("问题经主办方审核后对所有参会者可见。")}</p>
        <button className="btn g-btn w-full h-12 rounded-xl text-[15px] font-semibold tracking-wide"  disabled={busy || !text.trim()}>{busy && <Spinner className="w-4 h-4" />}{t("提交问题")}</button>
      </form>
    </Modal>
  );
}

function Comments({ code, qid, pid, profile, canComment, onPosted }: { code: string; qid: number; pid: string; profile: Profile; canComment: boolean; onPosted: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const [list, setList] = useState<Any[] | null>(null);
  const [text, setText] = useState("");
  const load = () => api(`/api/g/${code}/questions/${qid}/comments`).then((d) => setList(d.comments)).catch(() => setList([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [qid]);
  async function post(e: React.FormEvent) {
    e.preventDefault();
    try { await api(`/api/g/${code}/questions/${qid}/comments`, { body: { pid, name: profile.name, text } }); setText(""); load(); onPosted(); }
    catch (err) { toast((err as Error).message, "error"); }
  }
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {!list ? <Spinner className="w-4 h-4 text-gray-500" /> : list.length === 0 ? <p className="text-xs text-gray-500">{t("暂无评论")}</p> : (
        <ul className="space-y-2">{list.map((c) => <li key={c.id} className="text-sm"><span className="text-gray-500">{c.nickname}{t("：")}</span><span className="text-gray-800 break-words">{c.text}</span></li>)}</ul>
      )}
      {canComment && (
        <form onSubmit={post} className="mt-2.5 flex gap-2">
          <input className="input h-9" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("写评论…")} maxLength={300} />
          <button className="btn g-btn h-9"  disabled={!text.trim()}>{t("发送")}</button>
        </form>
      )}
    </div>
  );
}

function PollView({ code, pid, profile, live, reload, ended }: { code: string; pid: string; profile: Profile; live: Any; reload: () => void; ended: boolean }) {
  const t = useT();
  const { toast } = useUI();
  const [sel, setSel] = useState<number[]>([]);
  const [changing, setChanging] = useState(false);
  const voted = live.mine && !changing;
  async function submit() {
    try { await api(`/api/g/${code}/respond`, { body: { pid, name: profile.name, interactionId: live.id, answer: sel } }); toast(t("投票成功")); setChanging(false); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  const toggle = (i: number) => setSel(live.multi ? (sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]) : [i]);
  return (
    <div className="p-4">
      <div className="g-in g-card p-5">
        <div className="text-[17px] font-medium text-gray-900 leading-snug">{live.question}</div>
        <div className="text-xs text-gray-500 mt-1">{live.multi ? t("多选") : t("单选")} · {live.voters}{t("人已投票")}</div>
        <div className="mt-5 space-y-2.5">
          {live.options.map((o: string, i: number) => {
            const pct = live.voters ? Math.round((live.counts[i] / live.voters) * 100) : 0;
            const mine = live.mine?.includes(i);
            return voted || ended ? (
              <div key={i} className={`relative overflow-hidden rounded-xl border px-4 py-3.5 ${mine ? "border-[color:var(--g-text)]" : "border-gray-100"}`}>
                <div className="absolute inset-y-0 left-0 bg-[color:var(--g-soft)] transition-all duration-700" style={{ width: `${pct}%` }} />
                <div className="relative flex items-center justify-between text-sm"><span className="flex items-center gap-2">{mine && <Icon name="check" className="w-4 h-4 text-[color:var(--g-text)]" strokeWidth={2.5} />}{o}</span><span className="text-gray-500 tabular-nums">{pct}%</span></div>
              </div>
            ) : (
              <button key={i} onClick={() => toggle(i)} className={`w-full text-left rounded-xl border px-4 py-3.5 text-sm flex items-center gap-3 transition ${sel.includes(i) ? "border-[color:var(--g-text)] bg-[color:var(--g-soft)] text-[color:var(--g-text)]" : "border-gray-200"}`}>
                <span className={`w-5 h-5 ${live.multi ? "rounded" : "rounded-full"} border flex items-center justify-center ${sel.includes(i) ? "bg-[color:var(--g-primary)] border-[color:var(--g-text)] text-white" : "border-gray-300"}`}>{sel.includes(i) && <Icon name="check" className="w-3 h-3" strokeWidth={3} />}</span>{o}
              </button>
            );
          })}
        </div>
        {!voted && !ended && <button className="btn g-btn w-full h-11 mt-5"  disabled={!sel.length} onClick={submit}>{t("提交投票")}</button>}
        {voted && !ended && <button className="btn btn-ghost w-full mt-3 text-[color:var(--g-text)]" onClick={() => { setSel(live.mine); setChanging(true); }}>{t("修改投票")}</button>}
      </div>
    </div>
  );
}

function QuizView({ code, pid, profile, live, reload }: { code: string; pid: string; profile: Profile; live: Any; reload: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const [sel, setSel] = useState<number[]>([]);
  const [left, setLeft] = useState(live.remaining);
  const qKey = `${live.currentQ}-${live.phase}`;
  const prevKey = useRef(qKey);
  useEffect(() => { if (prevKey.current !== qKey) { setSel([]); prevKey.current = qKey; } }, [qKey]);
  useEffect(() => { setLeft(live.remaining); const t = setInterval(() => setLeft((x: number) => Math.max(0, x - 1)), 1000); return () => clearInterval(t); }, [live.remaining]);
  async function submit() {
    try { await api(`/api/g/${code}/respond`, { body: { pid, name: profile.name, interactionId: live.id, answer: sel } }); toast(t("已提交")); reload(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  if (live.phase === "idle") return <GuestEmpty icon="quiz" title={t("测验即将开始")} desc={t("共 {n} 道题，答对越快得分越高。请等待主持人开始。", { n: live.total })} />;
  if (live.phase === "finished") return (
    <div className="p-4"><div className="g-in g-card p-6 text-center">
      <div className="text-sm text-gray-500">{t("测验结束")}</div>
      <div className="text-4xl font-bold text-[color:var(--g-text)] mt-2">{live.myTotal ?? 0}<span className="text-base font-normal text-gray-500"> {t("分")}</span></div>
      <div className="text-sm text-gray-500 mt-1">{live.myRank ? t("排名第 {n}", { n: live.myRank }) : t("未参与作答")}</div>
      <ol className="mt-6 text-left space-y-2">{live.leaderboard.slice(0, 10).map((r: Any, i: number) => <li key={r.participant_id} className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2 ${r.participant_id === pid ? "bg-[color:var(--g-soft)]" : ""}`}><b className="w-5 text-gray-500">{i + 1}</b><span className="flex-1 truncate">{r.nickname}</span><span className="tabular-nums">{r.score}</span></li>)}</ol>
    </div></div>
  );
  const q = live.question;
  const answered = !!live.mine;
  const multi = q?.multi;
  return (
    <div className="p-4"><div className="g-in g-card p-5">
      <div className="flex items-center justify-between text-xs text-gray-500"><span>{t("第 {a} / {b} 题", { a: live.currentQ + 1, b: live.total })}{multi ? ` · ${t("多选")}` : ""}</span>{live.phase === "question" && <span className={`text-lg font-semibold tabular-nums ${left <= 5 ? "text-red-500" : "text-[color:var(--g-text)]"}`}>{left}s</span>}</div>
      <div className="text-[17px] font-medium text-gray-900 mt-2 leading-snug">{q?.text}</div>
      <div className="mt-5 space-y-2.5">
        {q?.options.map((o: string, i: number) => {
          const isC = q.correct?.includes(i);
          const mine = live.mine?.answer?.includes(i) || (!answered && sel.includes(i));
          const reveal = live.phase === "reveal";
          return (
            <button key={i} disabled={answered || reveal || left <= 0} onClick={() => setSel(multi ? (sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]) : [i])}
              className={`w-full text-left rounded-xl border px-4 py-3.5 text-sm flex items-center gap-3 ${reveal && isC ? "border-emerald-400 bg-emerald-50" : reveal && mine ? "border-red-300 bg-red-50" : mine ? "border-[color:var(--g-text)] bg-[color:var(--g-soft)]" : "border-gray-200"}`}>
              <b className="text-gray-500 w-4">{String.fromCharCode(65 + i)}</b><span className="flex-1">{o}</span>
              {reveal && isC && <Icon name="check" className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
      {live.phase === "question" && !answered && <button className="btn g-btn w-full h-11 mt-5"  disabled={!sel.length || left <= 0} onClick={submit}>{left <= 0 ? t("时间到") : t("提交答案")}</button>}
      {live.phase === "question" && answered && <p className="text-center text-sm text-gray-500 mt-5">{t("已提交，等待公布答案…")}</p>}
      {live.phase === "reveal" && <p className={`text-center text-sm mt-5 font-medium ${live.mine?.correct ? "text-emerald-600" : "text-gray-500"}`}>{!live.mine ? t("本题未作答") : live.mine.correct ? t("回答正确 +{n} 分", { n: live.mine.score }) : t("回答错误")}{live.myTotal != null && <span className="text-gray-500 font-normal">{t(" · 总分 {n}", { n: live.myTotal })}</span>}</p>}
    </div></div>
  );
}

function OpenView({ code, pid, profile, live, reload, ended }: { code: string; pid: string; profile: Profile; live: Any; reload: () => void; ended: boolean }) {
  const t = useT();
  const { toast } = useUI();
  const [text, setText] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await api(`/api/g/${code}/respond`, { body: { pid, name: profile.name, interactionId: live.id, text } }); setText(""); toast(t("提交成功")); reload(); }
    catch (err) { toast((err as Error).message, "error"); }
  }
  return (
    <div className="p-4 space-y-3">
      <div className="g-in g-card p-5">
        <div className="text-[17px] font-medium text-gray-900 leading-snug">{live.prompt}</div>
        {!ended && (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={t("写下你的想法…")} />
            <button className="btn g-btn w-full h-11"  disabled={!text.trim()}>{t("提交")}</button>
          </form>
        )}
      </div>
      <div className="text-xs text-gray-500 px-1">{t("{n} 条回答", { n: live.count })}</div>
      <ul className="space-y-2">{live.responses.map((r: Any) => (
        <li key={r.id} className="g-in g-card px-4 py-3.5"><div className="text-xs text-gray-500">{r.nickname}{r.mine && " · 我"}</div><div className="text-sm text-gray-900 mt-1 break-words">{r.text}</div></li>
      ))}</ul>
    </div>
  );
}

function RateView({ code, pid, profile, live, reload, ended, theme }: { code: string; pid: string; profile: Profile; live: Any; reload: () => void; ended: boolean; theme?: string }) {
  const t = useT();
  const { toast } = useUI();
  const [scores, setScores] = useState<number[]>(() => live.items.map((_: Any, i: number) => Number(live.mine?.scores?.[i]) || 0));
  const [comment, setComment] = useState<string>(live.mine?.comment || "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const starColor = guestPalette(theme).primary;
  const closed = live.closed || ended;
  const submitted = !!live.mine && !editing;
  async function submit() {
    setBusy(true);
    try {
      await api(`/api/g/${code}/respond`, { body: { pid, name: profile.name, ...(FEATURE_GROUPS ? { group: profile.group } : {}), interactionId: live.id, scores, comment } });
      toast(live.mine ? t("评分已更新") : t("评分已提交"));
      setEditing(false); reload();
    } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }
  const startEdit = () => { setScores(live.items.map((_: Any, i: number) => Number(live.mine?.scores?.[i]) || 0)); setComment(live.mine?.comment || ""); setEditing(true); };
  const complete = scores.length === live.items.length && scores.every((v) => v >= 1);
  const unit = (v: number) => (live.scale === "star" ? t("{n} 星", { n: v }) : t("{n} 分", { n: v }));
  return (
    <div className="p-4 space-y-3">
      <div className="g-in g-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[17px] font-medium text-gray-900 leading-snug">{live.title}</div>
          {closed ? <span className="chip bg-gray-100 text-gray-600 shrink-0">{t("评分已结束")}</span> : submitted ? <span className="chip bg-emerald-50 text-emerald-700 shrink-0">{t("已提交")}</span> : null}
        </div>
        <div className="text-xs text-gray-500 mt-1">{live.scale === "star" ? t("星级 · 满分 {n} 星", { n: live.max }) : t("分数 · 满分 {n} 分", { n: live.max })} · {t("{n} 人已评分", { n: live.raters })}</div>
        {submitted || closed ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {live.items.map((it: Any, i: number) => (
              <li key={i} className="py-3">
                <div className="flex items-center justify-between text-sm"><span className="text-gray-900 font-medium">{it.name}</span><span className="text-gray-500">{t("我的评分")}{t("：")}<b className="text-[color:var(--g-text)]">{live.mine?.scores?.[i] ? unit(live.mine.scores[i]) : "–"}</b></span></div>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                  <StarRow value={it.avg == null ? null : live.scale === "star" ? it.avg : (it.avg / live.max) * 5} max={live.scale === "star" ? live.max : 5} size={14} on={starColor} />
                  <span>{t("平均")} <b className="text-gray-800 tabular-nums">{it.avg == null ? "–" : it.avg.toFixed(1)}</b> · {t("{n} 人评分", { n: it.count })}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 space-y-5">
            {live.items.map((it: Any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-2"><span className="font-medium text-gray-900">{it.name}</span><span className="text-[color:var(--g-text)] tabular-nums">{scores[i] ? unit(scores[i]) : <span className="text-gray-400">{t("请打分")}</span>}</span></div>
                {live.scale === "star"
                  ? <StarInput value={scores[i] || 0} max={live.max} color={starColor} onChange={(v) => setScores(scores.map((x, j) => (j === i ? v : x)))} />
                  : <ScoreInput value={scores[i] || 0} max={live.max} onChange={(v) => setScores(scores.map((x, j) => (j === i ? v : x)))} />}
              </div>
            ))}
            {live.allowComment && (
              <div><label className="label">{t("评论（选填）")}</label><textarea className="input" rows={3} maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("说说你的看法…")} /></div>
            )}
            <p className="text-xs text-gray-500">{FEATURE_GROUPS ? t("以「{name} · {group}」身份提交，评分结束前可以修改。", { name: profile.name, group: profile.group || "" }) : t("以「{name}」身份提交，评分结束前可以修改。", { name: profile.name })}</p>
            <button className="btn g-btn w-full h-11" disabled={!complete || busy} onClick={submit}>{busy && <Spinner className="w-4 h-4" />}{live.mine ? t("更新评分") : t("提交评分")}</button>
            {editing && <button className="btn btn-ghost w-full" onClick={() => setEditing(false)}>{t("取消")}</button>}
          </div>
        )}
        {submitted && !closed && <button className="btn btn-ghost w-full mt-3 text-[color:var(--g-text)]" onClick={startEdit}>{t("修改评分")}</button>}
        {live.mine?.comment && (submitted || closed) && <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 break-words">{t("我的评论")}{t("：")}{live.mine.comment}</p>}
      </div>
    </div>
  );
}
