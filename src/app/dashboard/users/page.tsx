"use client";
import { useT } from "@/components/i18n";
import { useCallback, useEffect, useState } from "react";
import { api, Avatar, EmptyState, Icon, Modal, PageLoader, ROLE_LABEL, Spinner, useUI } from "@/components/ui";
import { useMe } from "@/components/me";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type U = Record<string, any>;
const ROLES = ["super_admin", "event_admin", "moderator", "presenter"];
const ROLE_DESC: Record<string, string> = {
  super_admin: "管理所有用户、角色和全部活动",
  event_admin: "创建并管理自己的活动与互动，分配成员",
  moderator: "审核被分配活动中的提问（通过/拒绝/归档）",
  presenter: "控制投屏：切换频道、置顶、标记已回答、上墙",
};

export default function UsersPage() {
  const t = useT();
  const me = useMe();
  const { toast, confirm } = useUI();
  const [users, setUsers] = useState<U[] | null>(null);
  const [edit, setEdit] = useState<U | "new" | null>(null);
  const [resetFor, setResetFor] = useState<U | null>(null);
  const load = useCallback(() => api("/api/users").then((d) => setUsers(d.users)).catch((e) => toast(e.message, "error")), [toast]);
  useEffect(() => { load(); }, [load]);

  if (!me.isSuper) return <main className="max-w-6xl 2xl:max-w-[1440px] min-[1800px]:max-w-[1600px] mx-auto p-6"><div className="card"><EmptyState icon="shield" title={t("无权访问")} desc={t("仅超级管理员可以管理用户。")} /></div></main>;

  async function toggleDisabled(u: U) {
    if (!(await confirm({ title: u.disabled ? t("启用该用户？") : t("停用该用户？"), message: u.disabled ? `${u.name} 将可以重新登录。` : `${u.name} 将无法登录，已登录的会话会立即失效。`, danger: !u.disabled, confirmText: u.disabled ? t("启用") : t("停用") }))) return;
    try { await api(`/api/users/${u.id}`, { method: "PATCH", body: { disabled: !u.disabled } }); toast(u.disabled ? t("已启用") : t("已停用")); load(); } catch (e) { toast((e as Error).message, "error"); }
  }
  async function remove(u: U) {
    if (!(await confirm({ title: t("删除该用户？"), message: `将永久删除 ${u.name}（${u.email}）及其活动成员关系。此操作不可撤销。`, danger: true, confirmText: t("删除") }))) return;
    try { await api(`/api/users/${u.id}`, { method: "DELETE" }); toast(t("已删除")); load(); } catch (e) { toast((e as Error).message, "error"); }
  }

  return (
    <main className="max-w-6xl 2xl:max-w-[1440px] min-[1800px]:max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("用户管理")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("预先创建工作人员账号并分配角色，也可以停用账号。用户也可以自行注册（自动成为活动管理员）。")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEdit("new")}><Icon name="plus" />{t("新建用户")}</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {ROLES.map((r) => (
          <div key={r} className="rounded-xl bg-white border border-gray-200/80 p-4">
            <div className="text-sm font-medium text-gray-900">{t(ROLE_LABEL[r])}</div>
            <div className="text-xs text-gray-500 mt-1 leading-relaxed">{t(ROLE_DESC[r])}</div>
          </div>
        ))}
      </div>
      {!users ? <PageLoader /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr><th className="text-left font-medium px-5 py-3">{t("用户")}</th><th className="text-left font-medium px-5 py-3">{t("角色")}</th><th className="text-left font-medium px-5 py-3">{t("状态")}</th><th className="text-left font-medium px-5 py-3">{t("创建时间")}</th><th className="px-5 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={u.name || u.email} size={32} /><div><div className="font-medium text-gray-900">{u.name}{u.id === me.user.id && <span className="ml-1.5 text-xs text-gray-400">{t("（我）")}</span>}</div><div className="text-xs text-gray-500">{u.email}</div></div></div></td>
                    <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{u.roles.map((r: string) => <span key={r} className={`chip ${r === "super_admin" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-700"}`}>{t(ROLE_LABEL[r])}</span>)}</div></td>
                    <td className="px-5 py-3">{u.disabled ? <span className="chip bg-red-50 text-red-600">{t("已停用")}</span> : <span className="chip bg-emerald-50 text-emerald-700">{t("正常")}</span>}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString("zh-CN")}</td>
                    <td className="px-5 py-3"><div className="flex justify-end gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEdit(u)}>{t("编辑")}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setResetFor(u)}>{t("重置密码")}</button>
                      {u.id !== me.user.id && <button className="btn btn-ghost btn-sm" onClick={() => toggleDisabled(u)}>{u.disabled ? t("启用") : t("停用")}</button>}
                      {u.id !== me.user.id && <button className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => remove(u)}>{t("删除")}</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {edit && <UserForm user={edit === "new" ? null : edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {resetFor && <ResetPassword user={resetFor} onClose={() => setResetFor(null)} />}
    </main>
  );
}

function UserForm({ user, onClose, onDone }: { user: U | null; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const [f, setF] = useState({ name: user?.name || "", email: user?.email || "", password: "", roles: (user?.roles as string[]) || ["moderator"] });
  const [busy, setBusy] = useState(false);
  const toggleRole = (r: string) => setF((x) => ({ ...x, roles: x.roles.includes(r) ? x.roles.filter((y) => y !== r) : [...x.roles, r] }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (user) await api(`/api/users/${user.id}`, { method: "PATCH", body: { name: f.name, roles: f.roles } });
      else await api("/api/users", { body: f });
      toast(user ? t("已保存") : t("用户已创建"));
      onDone();
    } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose} title={user ? t("编辑用户") : t("新建用户")}>
      <form onSubmit={submit} className="px-6 pb-6 space-y-4">
        <div><label className="label">{t("姓名")}</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
        <div><label className="label">{t("邮箱（登录账号）")}</label><input className="input disabled:bg-gray-50 disabled:text-gray-500" type="email" disabled={!!user} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
        {!user && <div><label className="label">{t("初始密码（至少 8 位）")}</label><input className="input" type="text" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>}
        <div>
          <label className="label">{t("角色")}</label>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label key={r} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${f.roles.includes(r) ? "border-brand-400 bg-brand-50/50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input type="checkbox" className="mt-0.5 accent-brand-600" checked={f.roles.includes(r)} onChange={() => toggleRole(r)} />
                <span><span className="block text-sm font-medium text-gray-900">{t(ROLE_LABEL[r])}</span><span className="block text-xs text-gray-500 mt-0.5">{t(ROLE_DESC[r])}</span></span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">{t("审核员/主持人还需由活动管理员在具体活动的「成员」中分配。")}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t("取消")}</button>
          <button className="btn btn-primary" disabled={busy || !f.roles.length}>{busy && <Spinner className="w-4 h-4" />}{user ? t("保存") : t("创建")}</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPassword({ user, onClose }: { user: U; onClose: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await api(`/api/users/${user.id}`, { method: "PATCH", body: { password: pw } }); toast(t("密码已重置")); onClose(); }
    catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose} title={t("重置密码")} width="max-w-sm">
      <form onSubmit={submit} className="px-6 pb-6 space-y-4">
        <p className="text-sm text-gray-500">{t("为")} <b className="text-gray-800">{user.name}</b>{t("（")}{user.email}{t("）设置新密码。")}</p>
        <input className="input" type="text" minLength={8} placeholder={t("新密码，至少 8 位")} value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={onClose}>{t("取消")}</button><button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="w-4 h-4" />}{t("重置")}</button></div>
      </form>
    </Modal>
  );
}
