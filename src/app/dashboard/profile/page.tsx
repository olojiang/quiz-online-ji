"use client";
import { useState } from "react";
import { api, Avatar, ROLE_LABEL, Spinner, useUI } from "@/components/ui";
import { useMe } from "@/components/me";
import { useT } from "@/components/i18n";

export default function Profile() {
  const me = useMe();
  const t = useT();
  const { toast } = useUI();
  const [name, setName] = useState(me.user.name);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState<"" | "name" | "pw">("");
  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy("name");
    try { await api("/api/auth/me", { method: "PATCH", body: { name } }); toast(t("昵称已更新")); me.user.name = name.trim(); }
    catch (err) { toast((err as Error).message, "error"); } finally { setBusy(""); }
  }
  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.confirm) return toast(t("两次输入的密码不一致"), "error");
    setBusy("pw");
    try { await api("/api/auth/me", { method: "PATCH", body: { currentPassword: pw.current, newPassword: pw.next } }); toast(t("密码已修改")); setPw({ current: "", next: "", confirm: "" }); }
    catch (err) { toast((err as Error).message, "error"); } finally { setBusy(""); }
  }
  return (
    <main className="max-w-2xl 2xl:max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={me.user.name || me.user.email} size={56} />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("个人信息")}</h1>
          <div className="text-sm text-gray-500 mt-0.5">{me.user.email}</div>
          <div className="mt-1.5 flex flex-wrap gap-1">{me.user.roles.map((r) => <span key={r} className="chip bg-brand-50 text-brand-700">{t(ROLE_LABEL[r])}</span>)}</div>
        </div>
      </div>
      <form onSubmit={saveName} className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">{t("基本资料")}</h2>
        <div><label className="label">{t("昵称")}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required /></div>
        <div><label className="label">{t("登录邮箱")}</label><input className="input bg-gray-50 text-gray-500" value={me.user.email} readOnly /></div>
        <button className="btn btn-primary" disabled={busy === "name"}>{busy === "name" && <Spinner className="w-4 h-4" />}{t("保存")}</button>
      </form>
      <form onSubmit={savePw} className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">{t("修改登录密码")}</h2>
        <div><label className="label">{t("当前密码")}</label><input className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">{t("新密码（至少 8 位）")}</label><input className="input" type="password" minLength={8} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></div>
          <div><label className="label">{t("确认新密码")}</label><input className="input" type="password" minLength={8} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></div>
        </div>
        <button className="btn btn-primary" disabled={busy === "pw"}>{busy === "pw" && <Spinner className="w-4 h-4" />}{t("修改密码")}</button>
      </form>
    </main>
  );
}
