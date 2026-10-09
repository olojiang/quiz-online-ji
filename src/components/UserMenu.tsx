"use client";
import { useT } from "@/components/i18n";
import { useRouter } from "next/navigation";
import { api, Avatar, Dropdown, Icon, MenuItem, ROLE_LABEL } from "./ui";
import type { Me } from "./me";

export function UserMenu({ me }: { me: Me }) {
  const t = useT();
  const router = useRouter();
  return (
    <Dropdown width="w-60" trigger={() => (
      <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-gray-100">
        <Avatar name={me.user.name || me.user.email} size={28} />
        <span className="text-sm text-gray-700 hidden sm:inline max-w-[120px] truncate">{me.user.name}</span>
        <Icon name="chevron" className="w-3.5 h-3.5 text-gray-400" />
      </button>
    )}>
      {() => (
        <>
          <div className="px-4 pb-2 pt-1 border-b border-gray-100 mb-1">
            <div className="text-sm font-medium text-gray-900 truncate">{me.user.name}</div>
            <div className="text-xs text-gray-500 truncate">{me.user.email}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">{me.user.roles.map((r) => <span key={r} className="chip bg-brand-50 text-brand-700">{t(ROLE_LABEL[r])}</span>)}</div>
          </div>
          <MenuItem icon="user" title={t("个人信息")} onClick={() => router.push("/dashboard/profile")} />
          <MenuItem icon="info" title={t("帮助中心")} onClick={() => router.push("/help")} />
          <MenuItem icon="logout" title={t("退出登录")} onClick={async () => { await api("/api/auth/logout", { body: {} }); router.replace("/login"); }} />
        </>
      )}
    </Dropdown>
  );
}
