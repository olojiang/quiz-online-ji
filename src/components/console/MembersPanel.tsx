"use client";
import { useT } from "@/components/i18n";
import { useCallback, useEffect, useState } from "react";
import { api, Avatar, EmptyState, Icon, PageLoader, ROLE_LABEL, useUI } from "../ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function MembersPanel({ eventId, canManage }: { eventId: number; canManage: boolean }) {
  const t = useT();
  const { toast, confirm } = useUI();
  const [data, setData] = useState<Any>(null);
  const [users, setUsers] = useState<Any[]>([]);
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("moderator");
  const load = useCallback(() => api(`/api/events/${eventId}/members`).then(setData).catch((e) => toast(e.message, "error")), [eventId, toast]);
  useEffect(() => { load(); if (canManage) api("/api/users").then((d) => setUsers(d.users)).catch(() => {}); }, [load, canManage]);
  async function add() {
    if (!uid) return toast(t("请选择用户"), "error");
    try { await api(`/api/events/${eventId}/members`, { body: { user_id: Number(uid), role } }); toast(t("成员已添加")); setUid(""); load(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  async function remove(m: Any) {
    if (!(await confirm({ title: t("移除成员？"), message: `${m.name} 将不再拥有本活动的${t(ROLE_LABEL[m.role])}权限。`, danger: true, confirmText: t("移除") }))) return;
    try { await api(`/api/events/${eventId}/members?user_id=${m.user_id}&role=${m.role}`, { method: "DELETE" }); toast(t("已移除")); load(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  if (!data) return <div className="card"><PageLoader /></div>;
  return (
    <div className={`w-full grid gap-4 items-start ${canManage ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : ""}`}>
      {canManage && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900">{t("添加成员")}</h3>
          <p className="text-sm text-gray-500 mt-1">{t("从已有用户中分配本活动的审核员或主持人。新用户需先由超级管理员在「用户管理」中创建。")}</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <select className="input" value={uid} onChange={(e) => setUid(e.target.value)}>
              <option value="">{t("选择用户…")}</option>
              {users.filter((u) => u.id !== data.owner?.id).map((u) => <option key={u.id} value={u.id}>{u.name}（{u.email}{t("）")}</option>)}
            </select>
            <select className="input sm:w-48" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="moderator">{t("审核员")}</option>
              <option value="presenter">{t("主持人/投屏操作员")}</option>
            </select>
            <button className="btn btn-primary h-10" onClick={add}><Icon name="plus" />{t("添加")}</button>
          </div>
        </div>
      )}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">{t("活动成员")}</div>
        <ul className="divide-y divide-gray-100">
          {data.owner && (
            <li className="px-5 py-3 flex items-center gap-3"><Avatar name={data.owner.name} size={34} /><div className="flex-1 min-w-0"><div className="text-sm font-medium text-gray-900">{data.owner.name}</div><div className="text-xs text-gray-500">{data.owner.email}</div></div><span className="chip bg-brand-50 text-brand-700">{t("活动负责人")}</span></li>
          )}
          {data.members.map((m: Any) => (
            <li key={`${m.user_id}-${m.role}`} className="px-5 py-3 flex items-center gap-3">
              <Avatar name={m.name} size={34} />
              <div className="flex-1 min-w-0"><div className="text-sm font-medium text-gray-900">{m.name}{m.disabled && <span className="ml-2 chip bg-red-50 text-red-600">{t("已停用")}</span>}</div><div className="text-xs text-gray-500">{m.email}</div></div>
              <span className={`chip ${m.role === "moderator" ? "bg-sky-50 text-sky-700" : "bg-orange-50 text-orange-700"}`}>{t(ROLE_LABEL[m.role])}</span>
              {canManage && <button className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => remove(m)}>{t("移除")}</button>}
            </li>
          ))}
        </ul>
        {data.members.length === 0 && <EmptyState icon="users" title={t("暂无其他成员")} desc={canManage ? t("添加审核员负责预审提问，添加主持人负责现场投屏操作。") : undefined} />}
      </div>
    </div>
  );
}
