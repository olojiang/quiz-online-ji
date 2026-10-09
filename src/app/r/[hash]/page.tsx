"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ReportView } from "@/components/ReportView";
import { AppLogo } from "@/components/Logo";
import { LangSwitch, useT } from "@/components/i18n";
import { LinkError } from "@/components/LinkError";
import { api, PageLoader } from "@/components/ui";

export default function SharedReport() {
  const { hash } = useParams<{ hash: string }>();
  const t = useT();
  const [state, setState] = useState<{ name?: string; err?: { status: number; message: string } } | null>(null);
  useEffect(() => {
    api(`/api/r/${hash}?visit=1`).then((d) => setState({ name: d.report.event.name })).catch((e) => setState({ err: { status: e.status, message: e.message } }));
  }, [hash]);
  if (!state) return <PageLoader />;
  if (state.err) return <LinkError revoked={state.err.status === 410} message={state.err.message} />;
  return (
    <div className="qoj-console min-h-screen">
      <header className="bg-white border-b border-gray-200/80">
        <div className="max-w-6xl 2xl:max-w-[1440px] min-[1800px]:max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <AppLogo size={26} />
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-900 truncate">{state.name}</span>
          <span className="chip bg-gray-100 text-gray-500 ml-1">{t("只读报告")}</span>
          <span className="ml-auto"><LangSwitch /></span>
        </div>
      </header>
      <main className="max-w-6xl 2xl:max-w-[1440px] min-[1800px]:max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <ReportView dataUrl={`/api/r/${hash}`} exportUrl={`/api/r/${hash}/export`} />
      </main>
    </div>
  );
}
