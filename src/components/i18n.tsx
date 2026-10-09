"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { EN } from "@/lib/i18n-en";

export type Lang = "zh" | "en";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "zh", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");
  useEffect(() => {
    const saved = localStorage.getItem("qoj_lang") as Lang | null;
    if (saved === "en" || saved === "zh") setLangState(saved);
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("qoj_lang", l);
    document.cookie = `qoj_lang=${l};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.lang = l === "en" ? "en" : "zh-CN";
  }, []);
  useEffect(() => { document.documentElement.lang = lang === "en" ? "en" : "zh-CN"; }, [lang]);
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

/** t("中文 {n}", { n }) → English when lang=en and a translation exists; Chinese is the key and the fallback. */
export function translate(lang: Lang, zh: string, vars?: Record<string, string | number>) {
  let s = lang === "en" ? EN[zh] ?? zh : zh;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
export function useT() {
  const { lang } = useContext(Ctx);
  return useCallback((zh: string, vars?: Record<string, string | number>) => translate(lang, zh, vars), [lang]);
}
export const useLang = () => useContext(Ctx);

export function LangSwitch({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <button type="button" onClick={() => setLang(lang === "zh" ? "en" : "zh")} title="切换语言 / Switch language"
      className={`inline-flex items-center rounded-full text-[11px] font-medium p-0.5 border ${dark ? "border-white/40 text-white" : "border-gray-200 text-gray-600 bg-white"}`}>
      <span className={`px-2 py-0.5 rounded-full ${lang === "zh" ? (dark ? "bg-white text-gray-900" : "bg-brand-600 text-white") : ""}`}>中</span>
      <span className={`px-2 py-0.5 rounded-full ${lang === "en" ? (dark ? "bg-white text-gray-900" : "bg-brand-600 text-white") : ""}`}>EN</span>
    </button>
  );
}
