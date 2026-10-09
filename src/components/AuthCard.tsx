"use client";
import { LogoMark } from "./Logo";
import { LangSwitch } from "./i18n";
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-indigo-50 px-4">
      <div className="absolute top-4 right-4"><LangSwitch /></div>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8 font-semibold text-gray-900 text-lg"><LogoMark size={38} />Quiz Online Ji</div>
        <div className="card p-7 shadow-xl shadow-brand-100/50">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
