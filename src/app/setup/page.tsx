"use client";
import { useT } from "@/components/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { api, PageLoader, Spinner, useUI } from "@/components/ui";

export default function Setup() {
  const t = useT();
  const router = useRouter();
  const { toast } = useUI();
  const [needed, setNeeded] = useState<boolean | null>(null);
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/setup").then((d) => setNeeded(d.needed)).catch(() => setNeeded(false)); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password !== f.confirm) return toast(t("两次输入的密码不一致"), "error");
    setBusy(true);
    try {
      await api("/api/setup", { body: { name: f.name, email: f.email, password: f.password } });
      toast(t("初始化完成，欢迎使用"));
      router.replace("/dashboard");
    } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
  }
  if (needed === null) return <PageLoader />;
  if (!needed)
    return (
      <AuthCard title={t("系统已初始化")} subtitle="超级管理员账号已存在，初始化页面已关闭。">
        <Link href="/login" className="btn btn-primary w-full h-10">{t("前往登录")}</Link>
      </AuthCard>
    );
  return (
    <AuthCard title={t("初始化系统")} subtitle="创建第一个超级管理员账号。此页面仅在系统中没有任何用户时可用。">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">{t("姓名")}</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
        <div><label className="label">{t("邮箱")}</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
        <div><label className="label">{t("密码（至少 8 位）")}</label><input className="input" type="password" minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
        <div><label className="label">{t("确认密码")}</label><input className="input" type="password" minLength={8} autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></div>
        <button className="btn btn-primary w-full h-10" disabled={busy}>{busy && <Spinner className="w-4 h-4" />}{t("创建超级管理员")}</button>
      </form>
    </AuthCard>
  );
}
