"use client";
import { useT } from "@/components/i18n";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Me, MeCtx } from "@/components/me";
import { api, Icon, PageLoader } from "@/components/ui";
import { UserMenu } from "@/components/UserMenu";
import { AppLogo } from "@/components/Logo";
import { LangSwitch } from "@/components/i18n";


export default function DashLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    api<Me>("/api/auth/me").then(setMe).catch(() => router.replace("/login"));
  }, [router]);
  if (!me) return <PageLoader />;
  const isConsole = path.startsWith("/dashboard/events/");
  return (
    <MeCtx.Provider value={me}>
      {!isConsole && (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200/80">
          <div className="max-w-6xl 2xl:max-w-[1440px] min-[1800px]:max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-900"><AppLogo size={28} text={t("活动问答")} /></Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/dashboard" active={path === "/dashboard"}>{t("我的活动")}</NavLink>
              {me.isSuper && <NavLink href="/dashboard/users" active={path === "/dashboard/users"}>{t("用户管理")}</NavLink>}
              <NavLink href="/help" active={false}>{t("帮助中心")}</NavLink>
            </nav>
            <div className="ml-auto flex items-center gap-3"><LangSwitch /><UserMenu me={me} /></div>
          </div>
        </header>
      )}
      <div className="qoj-console">{children}</div>
    </MeCtx.Provider>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`px-3 py-1.5 rounded-md ${active ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>{children}</Link>;
}

