"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { api, Spinner, useUI } from "@/components/ui";
import { useT } from "@/components/i18n";

export default function Register() {
  const router = useRouter();
  const t = useT();
  const { toast } = useUI();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password !== f.confirm) return toast(t("两次输入的密码不一致"), "error");
    setBusy(true);
    try {
      await api("/api/auth/register", { body: { name: f.name, email: f.email, password: f.password } });
      toast(t("注册成功，欢迎使用"));
      router.replace("/dashboard");
    } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <AuthCard title={t("注册账号")} subtitle={t("注册后即可创建并管理你自己的活动")}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">{t("昵称")}</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={40} required /></div>
        <div><label className="label">{t("邮箱")}</label><input className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
        <div><label className="label">{t("密码（至少 8 位）")}</label><input className="input" type="password" minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
        <div><label className="label">{t("确认密码")}</label><input className="input" type="password" minLength={8} autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></div>
        <button className="btn btn-primary w-full h-10" disabled={busy}>{busy && <Spinner className="w-4 h-4" />}{t("注册")}</button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-500">{t("已有账号？")}<Link href="/login" className="text-brand-600 font-medium">{t("登录")}</Link></p>
    </AuthCard>
  );
}
