"use client";
import { useEffect, useRef, useState } from "react";
import { Avatar, Icon } from "@/components/ui";
import { useT } from "@/components/i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** Cosmetic rolling: every slot cycles through pool names. Winners are decided on the server at reveal. */
function useRoll(names: string[], slots: number, active: boolean, speed: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const h = setInterval(() => setTick((x) => x + 1), reduce ? 400 : speed);
    return () => clearInterval(h);
  }, [active, speed]);
  const list = names.length ? names : ["?"];
  return Array.from({ length: slots }, (_, i) => list[Math.floor(Math.abs(Math.sin((tick + 1) * 12.9898 + i * 78.233) * 43758.5453)) % list.length]);
}

const CONFETTI = ["#fcd34d", "#f472b6", "#60a5fa", "#34d399", "#f97316", "#a78bfa"];
function Confetti({ seed }: { seed: number }) {
  return (
    <div className="lt-confetti pointer-events-none absolute inset-0 overflow-hidden" aria-hidden key={seed}>
      {Array.from({ length: 70 }, (_, i) => {
        const left = (i * 37 + seed * 13) % 100;
        const delay = ((i * 53) % 90) / 100;
        const dur = 2.4 + ((i * 29) % 16) / 10;
        const size = 8 + ((i * 7) % 9);
        return <span key={i} style={{ left: `${left}%`, width: size, height: size * 0.45, background: CONFETTI[i % CONFETTI.length], animationDelay: `${delay}s`, animationDuration: `${dur}s` }} />;
      })}
    </div>
  );
}

export function LotteryScreen({ live, card, guestQR }: { live: Any; card: string; guestQR?: React.ReactNode }) {
  const t = useT();
  const prize = live.prize != null ? live.prizes[live.prize] : null;
  const latest: Any[] = (live.winners as Any[]).filter((w) => w.latest);
  // landing: the short "slowing down" beat between 停止/揭晓 and showing the winners
  const [landing, setLanding] = useState(false);
  const prevPhase = useRef(live.phase);
  const prevSeq = useRef(live.drawSeq);
  useEffect(() => {
    if (live.phase === "revealed" && live.drawSeq !== prevSeq.current && prevPhase.current === "rolling") {
      setLanding(true);
      const h = setTimeout(() => setLanding(false), 1300);
      prevPhase.current = live.phase; prevSeq.current = live.drawSeq;
      return () => clearTimeout(h);
    }
    prevPhase.current = live.phase; prevSeq.current = live.drawSeq;
  }, [live.phase, live.drawSeq]);

  const rolling = live.phase === "rolling" || landing;
  const slots = Math.max(1, Math.min(12, landing ? latest.length || 1 : prize ? Math.min(prize.remaining || 1, live.poolSize || 1) : 1));
  const names = useRoll(live.rollNames || [], slots, rolling, landing ? 190 : 70);

  if (live.phase === "idle") {
    return (
      <div className="h-full flex flex-col">
        <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${Math.min(3, live.prizes.length)}, minmax(0, 1fr))` }}>
          {live.prizes.map((p: Any, i: number) => (
            <div key={i} className="lt-prize rounded-sm p-8 relative overflow-hidden animate-fade-up" style={{ background: card, color: "var(--s-card-fg)", animationDelay: `${i * 80}ms` }}>
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-[0.12]" style={{ background: "var(--s-card-fg)" }} />
              <Icon name="lottery" className="w-10 h-10 opacity-80" />
              <div className="text-[40px] font-bold mt-4 leading-tight truncate">{p.name}</div>
              <div className="text-2xl mt-2" style={{ color: "var(--s-card-muted)" }}>{t("{n} 名", { n: p.count })}{p.desc ? ` · ${p.desc}` : ""}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 -m-6 rounded-full blur-2xl opacity-40" style={{ background: "var(--s-feat-bg)" }} />
            <div className="relative w-32 h-32 rounded-[36px] flex items-center justify-center shadow-2xl rotate-[-6deg]" style={{ background: "var(--s-feat-bg)", color: "var(--s-feat-accent)" }}><Icon name="lottery" className="w-16 h-16 rotate-[6deg]" /></div>
          </div>
          <div className="text-[44px] font-semibold">{t("扫码加入，等待抽奖开始")}</div>
          <div className="mt-4 text-2xl text-[color:var(--s-muted)] flex items-center gap-3"><Icon name="users" className="w-7 h-7" />{t("抽奖池 {n} 人", { n: live.poolSize })}</div>
        </div>
      </div>
    );
  }

  const shown = latest.length ? latest : (live.winners as Any[]).filter((w) => w.prize_index === live.prize);
  const big = shown.length <= 1 ? "text-[110px]" : shown.length <= 3 ? "text-[72px]" : shown.length <= 6 ? "text-[54px]" : "text-[40px]";
  const cols = shown.length <= 1 ? 1 : shown.length <= 4 ? Math.min(shown.length, 4) : shown.length <= 6 ? 3 : 4;
  const others = (live.winners as Any[]).filter((w) => !w.latest);
  return (
    <div className="relative h-full flex flex-col items-center px-16 pt-14 pb-32 text-center">
      {!rolling && <Confetti seed={live.drawSeq} />}
      <div className="flex items-center gap-4 text-[30px] font-medium text-[color:var(--s-muted)]"><Icon name="lottery" className="w-9 h-9" />{live.title}</div>
      <div className="mt-5 inline-flex items-center gap-4 rounded-full px-10 py-3 text-[52px] font-bold shadow-2xl" style={{ background: "var(--s-feat-bg)", color: "var(--s-feat-accent)" }}>
        {prize?.name || t("抽奖")}
        {prize && <span className="text-[30px] font-semibold" style={{ color: "var(--s-feat-muted)" }}>{t("{a}/{b} 名", { a: prize.drawn, b: prize.count })}</span>}
      </div>
      {rolling ? (
        <>
          <div className="mt-16 w-full flex-1 min-h-0 flex flex-wrap items-center justify-center content-center gap-6">
            {names.map((n, i) => (
              <div key={i} className={`lt-slot rounded-2xl flex items-center justify-center font-bold tabular-nums ${slots <= 1 ? "w-[760px] h-[300px] text-[130px]" : slots <= 3 ? "w-[460px] h-[220px] text-[80px]" : slots <= 6 ? "w-[380px] h-[170px] text-[60px]" : "w-[300px] h-[130px] text-[44px]"}`} style={{ background: card, color: "var(--s-card-fg)" }}>
                <span className={`lt-roll truncate px-6 ${landing ? "lt-roll-slow" : ""}`} key={n + i}>{n}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 text-[30px] text-[color:var(--s-muted)] flex items-center gap-3">{landing ? t("揭晓中…") : <><span className="w-3 h-3 rounded-full bg-current animate-ping" />{t("正在抽取…")}</>}<span className="ml-6 flex items-center gap-2 text-2xl"><Icon name="users" className="w-7 h-7" />{t("抽奖池 {n} 人", { n: live.poolSize })}</span></div>
        </>
      ) : (
        <>
          <div className="mt-6 text-[34px] font-semibold">{t("恭喜以下获奖者")}</div>
          <div className="mt-8 w-full flex-1 min-h-0 grid gap-6 content-center" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, ${cols === 1 ? "760px" : cols <= 3 ? "560px" : "1fr"}))`, justifyContent: "center" }}>
            {shown.map((w, i) => (
              <div key={w.id} className="lt-win rounded-2xl px-8 py-8 flex flex-col items-center justify-center shadow-2xl border-t-[10px]" style={{ background: "var(--s-feat-bg)", color: "var(--s-feat-fg)", borderColor: "var(--s-feat-accent)", animationDelay: `${i * 120}ms` }}>
                <Avatar name={w.nickname} size={shown.length <= 3 ? 96 : 64} bg="var(--s-feat-accent)" fg="#ffffff" />
                <div className={`${big} font-bold leading-tight mt-4 max-w-full truncate`}>{w.nickname}</div>
                <div className="text-2xl mt-2 font-medium" style={{ color: "var(--s-feat-accent)" }}>{w.prize_name}</div>
              </div>
            ))}
          </div>
          {others.length > 0 && (
            <div className="mt-8 max-w-[1500px] flex flex-wrap justify-center gap-3 text-xl">
              {others.slice(0, 24).map((w) => <span key={w.id} className="rounded-full px-4 py-1.5" style={{ background: card, color: "var(--s-card-fg)" }}>{w.prize_name} · {w.nickname}</span>)}
              {others.length > 24 && <span className="px-2 py-1.5 text-[color:var(--s-muted)]">+{others.length - 24}</span>}
            </div>
          )}
        </>
      )}
      {guestQR}
    </div>
  );
}
