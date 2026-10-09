"use client";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { AppLogo } from "@/components/Logo";
import { LangSwitch, useT } from "@/components/i18n";

export default function Home() {
  const t = useT();
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
      <header className="max-w-6xl mx-auto flex items-center gap-3 px-6 h-16">
        <AppLogo size={32} text={t("活动问答")} className="text-gray-900" />
        <div className="ml-auto flex items-center gap-3">
          <LangSwitch />
          <Link href="/help" className="btn btn-ghost hidden sm:inline-flex">{t("帮助中心")}</Link>
          <Link href="/login" className="btn btn-secondary">{t("登录")}</Link>
        </div>
      </header>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="chip bg-brand-100 text-brand-700">{t("会前收集 · 现场审核 · 大屏互动")}</span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight">{t("让每一场活动")}<br />{t("都有")}<span className="text-brand-600">{t("好问题")}</span></h1>
          <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-lg">{t("嘉宾扫码即可提问、点赞和投票；主办方会前预审、现场一键上墙，热门问题自动排序投放到大屏幕。")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary h-12 px-6 text-base">{t("免费注册，创建活动")}</Link>
            <Link href="/login" className="btn btn-secondary h-12 px-6 text-base">{t("登录控制台")}</Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">{t("嘉宾无需注册：扫描主办方提供的二维码或打开链接即可参与。")}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["qa", "提问", "会前开放、实名提问、点赞热度排序"],
            ["shield", "预审", "敏感词、重复、频率自动拦截，人工复核"],
            ["poll", "选择题", "单选/多选，实时结果条"],
            ["quiz", "测验", "限时答题，速度计分排行榜"],
          ].map(([i, tt, d]) => (
            <div key={tt} className="card p-5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><Icon name={i} className="w-5 h-5" /></div>
              <div className="mt-4 font-semibold text-gray-900">{t(tt)}</div>
              <div className="mt-1 text-sm text-gray-500 leading-relaxed">{t(d)}</div>
            </div>
          ))}
        </div>
      </section>
      <footer className="text-center text-xs text-gray-400 pb-8">Quiz Online Ji</footer>
    </main>
  );
}
