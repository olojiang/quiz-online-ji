"use client";
import { useT } from "@/components/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { api, Spinner, useUI } from "@/components/ui";

export default function Login() {
  const t = useT();
  const router = useRouter();
  const { toast } = useUI();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  useEffect(() => { api("/api/setup").then((d) => setSetupNeeded(d.needed)).catch(() => {}); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/auth/login", { body: { email, password } });
      router.replace("/dashboard");
    } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <AuthCard title={t("登录控制台")} subtitle={t("登录后管理你的活动、审核提问和投屏")}>
      {setupNeeded && (
        <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          系统尚未初始化。<Link className="font-medium underline" href="/setup">{t("创建第一个超级管理员 →")}</Link>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">{t("邮箱")}</label><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><label className="label">{t("密码")}</label><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <button className="btn btn-primary w-full h-10" disabled={busy}>{busy && <Spinner className="w-4 h-4" />}{t("登录")}</button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-500">{t("还没有账号？")}<Link href="/register" className="text-brand-600 font-medium">{t("免费注册")}</Link></p>
      <p className="mt-2 text-center text-xs text-gray-400">{t("忘记密码请联系超级管理员重置")}</p>
    </AuthCard>
  );
}
