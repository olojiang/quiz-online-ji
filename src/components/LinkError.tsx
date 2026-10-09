"use client";
import { LogoMark } from "./Logo";
import { useT } from "./i18n";

export function LinkError({ revoked, message, dark = false }: { revoked?: boolean; message?: string; dark?: boolean }) {
  const t = useT();
  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${dark ? "bg-[#0f172a] text-white" : "bg-gray-50"}`}>
      <div className={`w-full max-w-sm text-center rounded-2xl p-8 ${dark ? "bg-white/5" : "bg-white shadow-sm border border-gray-100"}`}>
        <div className="flex justify-center"><LogoMark size={52} /></div>
        <h1 className={`mt-5 text-lg font-semibold ${dark ? "" : "text-gray-900"}`}>{revoked ? t("链接已失效") : t("链接不存在")}</h1>
        <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-white/70" : "text-gray-500"}`}>
          {revoked ? t("主办方已更新了这个链接。请重新扫描现场二维码，或向主办方索取最新链接。") : message || t("请检查链接是否完整，或向主办方索取正确的链接。")}
        </p>
      </div>
    </div>
  );
}
