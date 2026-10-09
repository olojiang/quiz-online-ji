"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppLogo } from "@/components/Logo";
import { LangSwitch, useLang, useT } from "@/components/i18n";
import { api, Icon } from "@/components/ui";
import { FLOW, HELP, HelpRole } from "@/lib/help-content";

const ORDER: HelpRole[] = ["event_admin", "moderator", "presenter", "super_admin", "guest"];
/** Which page a signed-in user lands on: their highest-privilege role. */
const PRIMARY: HelpRole[] = ["super_admin", "event_admin", "moderator", "presenter"];
/** Render **label** as bold (exact UI button / tab names). */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith("**") && part.endsWith("**") ? <b key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</b> : part)}</>;
}
const ICON: Record<HelpRole, string> = { super_admin: "shield", event_admin: "calendar", moderator: "check", presenter: "screen", guest: "phone" };

export default function HelpCenter() {
  const { lang } = useLang();
  const t = useT();
  const [myRoles, setMyRoles] = useState<HelpRole[] | null>(null);
  const [role, setRole] = useState<HelpRole | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("role") as HelpRole | null;
    api("/api/auth/me")
      .then((d) => { const r = d.user.roles as HelpRole[]; setMyRoles(r); setRole(q || PRIMARY.find((x) => r.includes(x)) || "event_admin"); })
      .catch(() => { setMyRoles([]); setRole(q || "guest"); });
  }, []);
  const pages = HELP[lang];
  // logged-in roles first, then the rest
  const rank = (r: HelpRole) => (myRoles?.includes(r) ? PRIMARY.indexOf(r) : 100 + ORDER.indexOf(r));
  const sorted = [...ORDER].sort((a, b) => rank(a) - rank(b));
  const page = pages.find((p) => p.role === role);
  return (
    <div className="qoj-console min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-30">
        <div className="max-w-6xl 2xl:max-w-[1440px] min-[1800px]:max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/" className="text-gray-900"><AppLogo size={26} text={t("帮助中心")} /></Link>
          <div className="ml-auto flex items-center gap-3">
            <LangSwitch />
            {myRoles && myRoles.length > 0 && <Link href="/dashboard" className="btn btn-secondary btn-sm">{t("返回控制台")}</Link>}
          </div>
        </div>
      </header>
      <div className="max-w-6xl 2xl:max-w-[1440px] min-[1800px]:max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">{t("帮助中心")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("选择你的身份，查看对应的使用指南")}</p>
        {/* flow diagram */}
        <div className="card mt-6 p-5">
          <div className="text-sm font-medium text-gray-900 mb-4">{t("完整流程")}</div>
          <ol className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {FLOW[lang].map(([title, desc], i) => (
              <li key={title} className="relative flex sm:flex-col items-center sm:text-center gap-3 rounded-xl bg-brand-50/60 p-4">
                <span className="w-9 h-9 shrink-0 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold">{i + 1}</span>
                <div><div className="font-medium text-gray-900">{title}</div><div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</div></div>
                {i < 4 && <span className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 text-brand-300 z-10"><Icon name="right" className="w-5 h-5" strokeWidth={2.5} /></span>}
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-6 grid lg:grid-cols-[240px_1fr] gap-6">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {sorted.map((r) => {
              const p = pages.find((x) => x.role === r)!;
              const mine = myRoles?.includes(r);
              return (
                <button key={r} onClick={() => setRole(r)} className={`shrink-0 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-left ${role === r ? "bg-white shadow-sm border border-gray-200 text-brand-700 font-medium" : "text-gray-600 hover:bg-white"}`}>
                  <Icon name={ICON[r]} className="w-4 h-4" />{p.name}
                  {mine && <span className="ml-auto chip bg-brand-50 text-brand-700 text-[10px]">{t("我的身份")}</span>}
                </button>
              );
            })}
          </nav>
          {page && (
            <article className="space-y-5">
              <div className="card p-6">
                <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><Icon name={ICON[page.role]} className="w-5 h-5" /></span>
                  <div><h2 className="text-xl font-semibold text-gray-900">{page.name}</h2><p className="text-sm text-gray-600 mt-0.5">{page.intro}</p></div></div>
                <div className="mt-5 rounded-xl bg-emerald-50/70 border border-emerald-100 p-4">
                  <div className="text-sm font-medium text-emerald-800">{t("你能做什么")}</div>
                  <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-emerald-900">{page.can.map((c) => <li key={c} className="flex gap-2"><Icon name="check" className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" strokeWidth={2.5} />{c}</li>)}</ul>
                </div>
                {page.links.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{page.links.map((l) => <Link key={l.href} href={l.href} className="btn btn-secondary btn-sm"><Icon name="external" className="w-3.5 h-3.5" />{l.label}</Link>)}</div>}
              </div>
              <section className="card p-6 border-brand-200">
                <h3 className="font-semibold text-gray-900">{t("第一次使用")}</h3>
                <ol className="mt-3 space-y-2.5">{page.quick.map((st, i) => <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed"><span className="w-6 h-6 shrink-0 rounded-full bg-brand-600 text-white text-xs font-semibold flex items-center justify-center">{i + 1}</span><span className="pt-0.5"><Rich text={st} /></span></li>)}</ol>
              </section>
              {page.sections.length > 0 && <h3 className="text-sm font-medium text-gray-500 pt-1">{t("常用操作")}</h3>}
              {page.sections.map((s) => (
                <section key={s.title} className="card p-6">
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <ol className="mt-3 space-y-2.5">{s.steps.map((st, i) => <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed"><span className="w-6 h-6 shrink-0 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center">{i + 1}</span><span className="pt-0.5"><Rich text={st} /></span></li>)}</ol>
                </section>
              ))}
              <section className="card p-6">
                <h3 className="font-semibold text-gray-900">{t("常见问题")}</h3>
                <div className="mt-3 divide-y divide-gray-100">{page.faq.map(([q, a]) => <details key={q} className="py-3 group"><summary className="cursor-pointer text-sm font-medium text-gray-800 list-none flex items-center gap-2"><Icon name="chevron" className="w-4 h-4 text-gray-400 -rotate-90 group-open:rotate-0 transition" />{q}</summary><p className="mt-2 pl-6 text-sm text-gray-600 leading-relaxed"><Rich text={a} /></p></details>)}</div>
              </section>
              <section className="rounded-xl bg-amber-50 border border-amber-100 p-5">
                <div className="text-sm font-medium text-amber-800 flex items-center gap-1.5"><Icon name="info" className="w-4 h-4" />{t("小贴士")}</div>
                <ul className="mt-2 space-y-1.5 text-sm text-amber-900 list-disc pl-5">{page.tips.map((x) => <li key={x}>{x}</li>)}</ul>
              </section>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
