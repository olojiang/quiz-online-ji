"use client";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, Avatar, Icon, QR, Spinner, usePoll } from "@/components/ui";
import { LinkError } from "@/components/LinkError";
import { useT } from "@/components/i18n";
import { screenPalette, screenVars } from "@/lib/palette";
import { StarRow } from "@/components/Rating";
import { FEATURE_GROUPS } from "@/lib/features";
import { LotteryScreen } from "@/components/LotteryScreen";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function ScreenPage() {
  const t = useT();
  const { hash } = useParams<{ hash: string }>();
  const [sort, setSort] = useState<"hot" | "time">("hot");
  const visited = useRef(false);
  const { data, error } = usePoll<Any>(() => { const first = !visited.current; visited.current = true; return api(`/api/s/${hash}?sort=${sort}${first ? "&visit=1" : ""}`); }, 2000, [hash, sort]);
  const [localChannel, setLocalChannel] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  // The screen is laid out for 1920×1080 and scaled to the actual display so 2560×1440 / 4K fill the screen and small displays don't clip.
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const f = () => setFit(Math.min(2.2, Math.max(0.7, Math.min(window.innerWidth / 1920, window.innerHeight / 1080))));
    f(); window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  const [page, setPage] = useState(0);
  const [idle, setIdle] = useState(false);
  const lastServerChannel = useRef<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  useEffect(() => { setOrigin(window.location.origin); setPreviewTheme(new URLSearchParams(window.location.search).get("theme")); }, []);

  // server channel changes override a local toggle
  const serverChannel = data?.event?.screen_channel;
  useEffect(() => {
    if (serverChannel && serverChannel !== lastServerChannel.current) { lastServerChannel.current = serverChannel; setLocalChannel(null); }
  }, [serverChannel]);

  // fade controls when mouse idle
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const h = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), 3000); };
    h();
    window.addEventListener("mousemove", h);
    return () => { window.removeEventListener("mousemove", h); clearTimeout(t); };
  }, []);

  if (error && !data) return <div className="h-screen flex items-center justify-center bg-[#0b1a45] text-[color:var(--s-muted)] text-xl">{error.message}</div>;
  if (!data) return <div className="h-screen flex items-center justify-center bg-[#0b1a45] text-white"><Spinner className="w-8 h-8" /></div>;

  const ev = data.event;
  const vars = screenVars(previewTheme || ev.screen_theme);
  const channel = localChannel || ev.screen_channel;
  const guestUrl = data.guestHash ? `${origin}/g/${data.guestHash}` : "";
  const live = data.live;
  const showWelcome = channel === "welcome" || !live;

  async function switchChannel(ch: string) {
    setLocalChannel(ch);
    // if a signed-in presenter is operating this screen, persist it for everyone
    try { await api(`/api/events/${ev.id}`, { method: "PATCH", body: { screen_channel: ch } }); } catch { /* local only */ }
  }
  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // pagination for Q&A / open lists
  const perPage = Math.max(2, Math.round(5 / zoom));
  let items: Any[] = [];
  if (!showWelcome && live.type === "qa") items = live.questions.filter((q: Any) => q.id !== live.featuredId);
  if (!showWelcome && live.type === "open") items = live.responses;
  const pages = Math.max(1, Math.ceil(items.length / (live?.type === "open" ? perPage * 2 : perPage)));
  const pg = Math.min(page, pages - 1);

  return (
    <div className="h-screen w-screen overflow-hidden relative select-none" style={{ ...vars, background: "radial-gradient(ellipse at 50% 35%, var(--s-bg2), var(--s-bg) 70%)", color: "var(--s-fg)" } as React.CSSProperties}>
      <div className="absolute left-0 top-0" style={{ width: `${100 / (fit * zoom)}vw`, height: `${100 / (fit * zoom)}vh`, transform: `scale(${fit * zoom})`, transformOrigin: "0 0" }}>
      {showWelcome ? (
        <Welcome name={ev.name} desc={ev.description} url={guestUrl} waiting={channel !== "welcome" && !live} />
      ) : live.type === "lottery" && live.phase !== "idle" ? (
        // drawing / revealed: full-width stage; a small QR stays in the corner
        <LotteryScreen live={live} card="var(--s-card)" guestQR={guestUrl ? <div className="absolute right-8 top-8 flex flex-col items-center gap-2 opacity-90"><div className="bg-white rounded-xl p-2 shadow-lg"><QR text={guestUrl} size={110} /></div><span className="text-base font-medium">{t("扫码参与")}</span></div> : null} />
      ) : (
        <div className="h-full flex">
          {/* left column */}
          <aside className="w-[260px] shrink-0 flex flex-col items-center pt-[110px] px-6">
            {guestUrl ? <div className="bg-white rounded-2xl p-3 shadow-lg"><QR text={guestUrl} size={190} /></div> : <div className="w-[214px] h-[214px] rounded-2xl border-2 border-dashed border-current opacity-60 flex items-center justify-center text-center text-sm px-4">{t("嘉宾链接未生成")}</div>}
            <div className="mt-8 text-center text-[26px] font-semibold leading-[2.4]">{t("扫描二维码参与")}<br />{t("嘉宾互动")}</div>
          </aside>
          {/* content */}
          <main className="flex-1 min-w-0 pr-8 pb-28 flex flex-col">
            <div className="h-[110px] flex items-center gap-3 text-[30px]">
              <Icon name={live.type === "qa" ? "qa" : live.type === "poll" ? "poll" : live.type === "quiz" ? "quiz" : live.type === "rate" ? "rate" : live.type === "lottery" ? "lottery" : "open"} className="w-9 h-9" />
              {live.type === "qa" ? (
                <div className="relative">
                  <select value={sort} onChange={(e) => { setSort(e.target.value as "hot" | "time"); setPage(0); }} className="appearance-none bg-transparent pr-10 outline-none cursor-pointer font-medium">
                    <option value="hot" className="text-gray-900">{t("热门")}</option>
                    <option value="time" className="text-gray-900">{t("时间顺序")}</option>
                  </select>
                  <Icon name="chevron" className="w-5 h-5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                </div>
              ) : <span className="font-medium truncate">{live.title}</span>}
              {live.type === "qa" && <span className="ml-auto text-2xl font-semibold text-[color:var(--s-muted)]">{t("{n} 个问题", { n: live.approvedCount })}</span>}
              {live.type === "lottery" && <span className="ml-auto shrink-0 flex items-center gap-2 text-2xl font-semibold text-[color:var(--s-muted)]"><Icon name="users" className="w-7 h-7" />{t("抽奖池 {n} 人", { n: live.poolSize })}</span>}
              {live.type === "rate" && <span className="ml-auto shrink-0 flex items-center gap-4 text-2xl font-semibold text-[color:var(--s-muted)]">{live.closed && <span className="chip text-xl px-4 py-1.5" style={{ background: "var(--s-badge-bg)", color: "var(--s-badge-fg)" }}>{t("评分已结束")}</span>}<span className="flex items-center gap-2"><Icon name="users" className="w-7 h-7" />{t("{n} 人已评分", { n: live.raters })}</span></span>}
            </div>
            <div className="flex-1 min-h-0">
              {live.type === "qa" && <QAScreen live={live} items={items.slice(pg * perPage, pg * perPage + perPage)} card="var(--s-card)" />}
              {live.type === "poll" && <PollScreen live={live} card="var(--s-card)" />}
              {live.type === "quiz" && <QuizScreen live={live} card="var(--s-card)" />}
              {live.type === "rate" && <RateScreen live={live} card="var(--s-card)" theme={previewTheme || ev.screen_theme} />}
              {live.type === "lottery" && <LotteryScreen live={live} card="var(--s-card)" />}
              {live.type === "open" && <OpenScreen live={live} items={items.slice(pg * perPage * 2, (pg + 1) * perPage * 2)} card="var(--s-card)" />}
            </div>
          </main>
        </div>
      )}

      </div>

      {/* control bar */}
      <div style={{ transform: `scale(${fit})`, transformOrigin: "0 100%" }} className={`absolute left-11 bottom-6 flex items-center h-[72px] px-3 gap-1 rounded-sm bg-gray-900/85 backdrop-blur text-white ring-1 ring-white/10 shadow-2xl transition-opacity duration-500 ${idle ? "opacity-70 hover:opacity-100" : "opacity-100"}`}>
        <CtlBtn active={channel === "welcome"} title={t("欢迎页")} onClick={() => switchChannel("welcome")}><Icon name="hi" className="w-6 h-6" /></CtlBtn>
        <CtlBtn active={channel !== "welcome"} title={t("互动频道")} onClick={() => switchChannel("interaction")}><Icon name="screen" className="w-6 h-6" /></CtlBtn>
        {!showWelcome && <>
        <span className="w-px h-12 bg-white/20 mx-2" />
        <CtlBtn title={t("上一页")} disabled={pg <= 0} onClick={() => setPage(pg - 1)}><Icon name="first" className="w-5 h-5" /></CtlBtn>
        <span className="px-2 text-xl tabular-nums min-w-[56px] text-center">{pg + 1}/{pages}</span>
        <CtlBtn title={t("下一页")} disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)}><Icon name="last" className="w-5 h-5" /></CtlBtn>
        </>}
        <span className="w-px h-12 bg-white/20 mx-2" />
        <CtlBtn title={t("缩小")} onClick={() => setZoom(Math.max(0.6, +(zoom - 0.1).toFixed(1)))}><Icon name="zoomOut" className="w-6 h-6" /></CtlBtn>
        <span className="text-xl tabular-nums w-16 text-center">{Math.round(zoom * 100)}%</span>
        <CtlBtn title={t("放大")} onClick={() => setZoom(Math.min(1.8, +(zoom + 0.1).toFixed(1)))}><Icon name="zoomIn" className="w-6 h-6" /></CtlBtn>
        <button onClick={fullscreen} className="ml-2 flex items-center gap-2 px-3 h-12 rounded hover:bg-[color:var(--s-track)] text-xl"><Icon name="expand" className="w-6 h-6" />{t("全屏")}</button>
      </div>
    </div>
  );
}

function CtlBtn({ children, active, disabled, title, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; title: string; onClick: () => void }) {
  return <button title={title} disabled={disabled} onClick={onClick} className={`w-14 h-14 rounded flex items-center justify-center transition ${active ? "bg-black/40" : "hover:bg-[color:var(--s-track)]"} disabled:opacity-30`}>{children}</button>;
}

function Welcome({ name, desc, url, waiting }: { name: string; desc?: string; url: string; waiting: boolean }) {
  const t = useT();
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-10 animate-fade-up">
      <div className="text-[color:var(--s-muted)] text-2xl font-semibold tracking-[0.3em]">WELCOME</div>
      <h1 className="mt-6 text-[64px] font-bold leading-tight max-w-[80%] drop-shadow-sm">{name}</h1>
      {desc && <p className="mt-4 text-2xl text-[color:var(--s-muted)] max-w-[70%] whitespace-pre-line">{desc}</p>}
      {url ? <div className="mt-12 bg-white rounded-3xl p-5 shadow-2xl"><QR text={url} size={260} /></div> : <div className="mt-12 text-2xl">{t("嘉宾链接未生成")}</div>}
      <div className="mt-8 text-3xl font-semibold">{t("扫描二维码参与嘉宾互动")}</div>
      {waiting && <div className="mt-6 text-[color:var(--s-muted)] text-2xl font-medium">{t("互动即将开始…")}</div>}
    </div>
  );
}

function QAScreen({ live, items, card }: { live: Any; items: Any[]; card: string }) {
  const t = useT();
  const f = live.featured;
  if (!f && items.length === 0) return <div className="h-full flex flex-col items-center justify-center text-[color:var(--s-muted)]"><Icon name="qa" className="w-16 h-16 mb-5 opacity-60" /><div className="text-3xl">{t("扫码提出你的问题")}</div><div className="text-2xl mt-3 font-medium">{t("审核通过的问题将显示在这里")}</div></div>;
  return (
    <div className="space-y-4">
      {f && (
        <div key={f.id} className="animate-fade-up rounded-sm px-10 py-9 shadow-2xl border-l-[10px]" style={{ background: "var(--s-feat-bg)", color: "var(--s-feat-fg)", borderColor: "var(--s-feat-accent)" }}>
          <div className="flex items-center gap-4">
            <span className="chip text-xl px-4 py-1.5 font-semibold text-white" style={{ background: "var(--s-feat-accent)" }}>{t("正在讨论")}</span>
            <Avatar name={f.nickname} size={48} bg="var(--s-feat-accent)" fg="#ffffff" />
            <span className="text-2xl" style={{ color: "var(--s-feat-muted)" }}>{f.nickname}{FEATURE_GROUPS && f.group_name && <span> · {f.group_name}</span>}</span>
            <span className="ml-auto flex items-center gap-2 text-2xl" style={{ color: "var(--s-feat-muted)" }}><Icon name="like" className="w-8 h-8" />{f.likes}</span>
          </div>
          <p className="mt-6 text-[44px] leading-snug font-medium break-words">{f.text}</p>
        </div>
      )}
      {items.map((q) => (
        <div key={q.id} className="rounded-sm px-8 py-7 transition-all" style={{ background: card, color: "var(--s-card-fg)" }}>
          <div className="flex items-center gap-5">
            <Avatar name={q.nickname} size={54} bg="var(--s-badge-bg)" fg="var(--s-badge-fg)" />
            <span className="text-[22px]">{q.nickname}{FEATURE_GROUPS && q.group_name && <span style={{ color: "var(--s-card-muted)" }}> · {q.group_name}</span>}</span>
            {q.highlighted && <span className="chip text-xl px-4 py-1.5 font-semibold" style={{ background: "var(--s-badge-bg)", color: "var(--s-badge-fg)" }}>{t("★ 精选")}</span>}
            <div className="ml-auto flex items-center gap-5">
              {q.pinned && <span className="chip text-xl px-4 py-1.5 font-semibold" style={{ background: "var(--s-badge-bg)", color: "var(--s-badge-fg)" }}><Icon name="top" className="w-5 h-5" strokeWidth={2.5} />{t("置顶")}</span>}
              {q.answered && <span className="chip text-xl px-4 py-1.5 font-semibold border-2" style={{ borderColor: "var(--s-badge-bg)", color: "var(--s-card-fg)" }}><Icon name="check" className="w-5 h-5" strokeWidth={2.5} />{t("已回答")}</span>}
              <span className="flex items-center gap-1 text-[26px]"><Icon name="like" className="w-10 h-10" />{q.likes}</span>
            </div>
          </div>
          <p className="mt-5 text-[28px] leading-snug break-words">{q.text}</p>
        </div>
      ))}
    </div>
  );
}

function PollScreen({ live, card }: { live: Any; card: string }) {
  const max = Math.max(1, ...live.counts);
  return (
    <div className="rounded-sm p-10" style={{ background: card, color: "var(--s-card-fg)" }}>
      <div className="flex items-start justify-between gap-6"><h2 className="text-[40px] font-semibold leading-snug">{live.question}</h2><span className="text-2xl text-[color:var(--s-muted)] shrink-0 flex items-center gap-2"><Icon name="users" className="w-7 h-7" />{live.voters}</span></div>
      <div className="mt-10 space-y-7">
        {live.options.map((o: string, i: number) => {
          const pct = live.voters ? Math.round((live.counts[i] / live.voters) * 100) : 0;
          return (
            <div key={i}>
              <div className="flex justify-between text-[26px] mb-2"><span><b className="text-[color:var(--s-muted)] mr-3">{String.fromCharCode(65 + i)}</b>{o}</span><span className="tabular-nums">{live.counts[i]} · {pct}%</span></div>
              <div className="h-8 rounded-full bg-[color:var(--s-track)] overflow-hidden"><div className="h-full rounded-full bg-[color:var(--s-bar)] transition-all duration-700" style={{ width: `${(live.counts[i] / max) * 100}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuizScreen({ live, card }: { live: Any; card: string }) {
  const t = useT();
  const [left, setLeft] = useState(live.remaining);
  useEffect(() => { setLeft(live.remaining); const t = setInterval(() => setLeft((x: number) => Math.max(0, x - 1)), 1000); return () => clearInterval(t); }, [live.remaining]);
  if (live.phase === "idle") return <div className="h-full flex flex-col items-center justify-center"><Icon name="quiz" className="w-20 h-20 opacity-70" /><div className="text-[44px] font-semibold mt-6">{live.title}</div><div className="text-2xl text-[color:var(--s-muted)] mt-3">{t("共")}{live.total}{t("题 · 扫码准备答题")}</div></div>;
  if (live.phase === "finished") return <Leaderboard rows={live.leaderboard} card={card} title={t("最终排行榜")} />;
  const q = live.question;
  const reveal = live.phase === "reveal";
  const max = Math.max(1, ...(live.dist || [1]));
  return (
    <div className="grid grid-cols-[1fr_380px] gap-6">
      <div className="rounded-sm p-10" style={{ background: card, color: "var(--s-card-fg)" }}>
        <div className="flex items-center justify-between text-2xl text-[color:var(--s-muted)]"><span>{t("第 {a} / {b} 题", { a: live.currentQ + 1, b: live.total })}</span>{!reveal && <span className={`text-[56px] font-bold tabular-nums ${left <= 5 ? "text-red-500" : ""}`}>{left}</span>}</div>
        <h2 className="text-[40px] font-semibold leading-snug mt-4">{q?.text}</h2>
        <div className="mt-8 grid grid-cols-2 gap-5">
          {q?.options.map((o: string, i: number) => {
            const isC = reveal && q.correct?.includes(i);
            return (
              <div key={i} className={`relative overflow-hidden rounded-lg px-6 py-5 text-[26px] ${isC ? "bg-emerald-500" : "bg-[color:var(--s-track)]"} ${reveal && !isC ? "opacity-60" : ""}`}>
                {reveal && <div className="absolute inset-y-0 left-0 bg-[color:var(--s-track)]" style={{ width: `${((live.dist?.[i] || 0) / max) * 100}%` }} />}
                <span className="relative"><b className="mr-3 opacity-70">{String.fromCharCode(65 + i)}</b>{o}{reveal && <span className="float-right tabular-nums">{live.dist?.[i] || 0}</span>}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-6 text-xl text-[color:var(--s-muted)]">{t("已作答 {n} 人", { n: live.answeredCount })}</div>
      </div>
      <Leaderboard rows={live.leaderboard.slice(0, 8)} card={card} title={t("排行榜")} small />
    </div>
  );
}

function Leaderboard({ rows, card, title, small }: { rows: Any[]; card: string; title: string; small?: boolean }) {
  const t = useT();
  return (
    <div className={`rounded-sm ${small ? "p-6" : "p-10 max-w-3xl mx-auto"}`} style={{ background: card, color: "var(--s-card-fg)" }}>
      <div className={`${small ? "text-2xl" : "text-[40px]"} font-semibold mb-6 flex items-center gap-3`}><Icon name="quiz" className={small ? "w-7 h-7" : "w-10 h-10"} />{title}</div>
      {rows.length === 0 ? <div className="text-[color:var(--s-muted)] text-xl">{t("暂无得分")}</div> : (
        <ol className="space-y-3">
          {rows.map((r: Any, i: number) => (
            <li key={r.participant_id} className={`flex items-center gap-4 ${small ? "text-xl" : "text-[28px]"}`}>
              <span className={`${small ? "w-9 h-9 text-lg" : "w-12 h-12"} rounded-full flex items-center justify-center font-bold ${i === 0 ? "bg-amber-400" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-orange-400" : "bg-[color:var(--s-track)]"}`}>{i + 1}</span>
              <span className="flex-1 truncate">{r.nickname}</span>
              <span className="tabular-nums font-semibold">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function OpenScreen({ live, items, card }: { live: Any; items: Any[]; card: string }) {
  const t = useT();
  return (
    <div>
      <div className="rounded-sm px-8 py-6 flex items-center justify-between" style={{ background: card, color: "var(--s-card-fg)" }}><h2 className="text-[34px] font-semibold">{live.prompt}</h2><span className="text-2xl text-[color:var(--s-muted)] flex items-center gap-2"><Icon name="users" className="w-7 h-7" />{live.count}</span></div>
      {items.length === 0 ? <div className="text-center text-2xl text-[color:var(--s-muted)] mt-20">{t("扫码分享你的观点")}</div> : (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {items.map((r) => (
            <div key={r.id} className="animate-fade-up rounded-sm px-6 py-5" style={{ background: card, color: "var(--s-card-fg)" }}>
              <div className="text-lg text-[color:var(--s-muted)]">{r.nickname}</div>
              <div className="text-[26px] mt-1 leading-snug break-words">{r.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RateScreen({ live, card, theme }: { live: Any; card: string; theme?: string }) {
  const t = useT();
  const p = screenPalette(theme);
  // stars: warm amber on dark cards, the theme accent on light cards; both ≥ 3:1 against the card
  const starOn = p.mode === "dark" ? "#fcd34d" : p.accent;
  const starOff = p.mode === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.32)";
  const n = live.items.length;
  const cols = n === 1 ? 1 : n <= 4 ? 2 : 3;
  const big = n === 1 ? "text-[120px]" : n <= 2 ? "text-[96px]" : n <= 4 ? "text-[64px]" : "text-[52px]";
  const stars = live.scale === "star" ? live.max : 5;
  const comments = (live.comments || []).slice(0, cols === 1 ? 4 : 2);
  // cards stretch to fill the height so tall (4:3) or large displays have no empty band at the bottom
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-1 min-h-0 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "minmax(0, 1fr)" }}>
        {live.items.map((it: Any, i: number) => {
          const top = Math.max(1, ...it.dist);
          const starV = it.avg == null ? null : live.scale === "star" ? it.avg : (it.avg / live.max) * 5;
          return (
            <div key={i} className={`rounded-sm min-h-0 ${n <= 2 ? "p-9" : "p-6"} ${n === 1 ? "grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 items-stretch" : "flex flex-col"}`} style={{ background: card, color: "var(--s-card-fg)" }}>
              <div className={`min-w-0 ${n === 1 ? "self-end" : ""}`}>
                <div className={`${n <= 2 ? "text-[34px]" : "text-[26px]"} font-semibold leading-tight truncate`}>{it.name}</div>
                <div className="flex items-end gap-3 mt-3">
                  <span className={`${big} font-bold leading-none tabular-nums`}>{it.avg == null ? "–" : it.avg.toFixed(1)}</span>
                  <span className="text-2xl pb-2" style={{ color: "var(--s-card-muted)" }}>/ {live.max}</span>
                </div>
                <StarRow value={starV} max={stars} size={n <= 2 ? 40 : n <= 4 ? 30 : 24} on={starOn} off={starOff} className="mt-4 gap-1" />
                <div className="text-xl mt-3" style={{ color: "var(--s-card-muted)" }}>{t("{n} 人评分", { n: it.count })}</div>
              </div>
              <div className={`${n === 1 ? "" : "mt-6"} flex-1 min-h-[110px] flex items-stretch gap-2`}>
                {it.dist.map((c: number, k: number) => (
                  <div key={k} className="flex-1 min-w-0 flex flex-col items-center">
                    <div className="flex-1 w-full flex flex-col justify-end items-center min-h-0">
                      <span className={`${n <= 2 ? "text-xl" : "text-base"} tabular-nums mb-1`} style={{ color: "var(--s-card-muted)" }}>{c}</span>
                      <div className="w-full rounded-t-md transition-all duration-700" style={{ height: `calc(${(c / top) * 100}% - 2rem)`, minHeight: 4, background: c ? "var(--s-bar)" : "var(--s-track)" }} />
                    </div>
                    <span className={`${n <= 2 ? "text-xl" : "text-base"} mt-2 tabular-nums font-medium`}>{k + 1}{live.scale === "star" ? "★" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {live.raters === 0 && <div className="text-center text-2xl text-[color:var(--s-muted)]">{t("扫码为本环节打分")}</div>}
      {comments.length > 0 && (
        <div className="grid grid-cols-2 gap-4 shrink-0">
          {comments.map((c: Any) => (
            <div key={c.id} className="animate-fade-up rounded-sm px-6 py-4" style={{ background: card, color: "var(--s-card-fg)" }}>
              <div className="text-lg" style={{ color: "var(--s-card-muted)" }}>{c.nickname || t("匿名嘉宾")}</div>
              <div className="text-[24px] mt-1 leading-snug break-words line-clamp-2">{c.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
