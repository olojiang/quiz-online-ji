"use client";
import { useCallback, useEffect, useState } from "react";
import { api, copyText, EmptyState, Icon, Modal, PageLoader, QR, Spinner, useUI } from "../ui";
import { fmtTime } from "@/lib/util";
import { useT } from "../i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
export const LINK_TYPES: Record<string, { label: string; path: string; desc: string; icon: string }> = {
  guest: { label: "嘉宾端", path: "/g/", desc: "嘉宾扫码/打开后参与提问、点赞、投票", icon: "phone" },
  screen: { label: "投屏端", path: "/s/", desc: "大屏投影页面，可看到嘉宾二维码", icon: "screen" },
  report: { label: "报告分享", path: "/r/", desc: "只读的活动报告，可分享给领导或客户", icon: "poll" },
  embed: { label: "嵌入", path: "/embed/", desc: "用于 iframe 嵌入到其他网页的嘉宾端", icon: "code" },
};

export function LinksPanel({ eventId, onChanged }: { eventId: number; onChanged: () => void }) {
  const t = useT();
  const { toast, confirm } = useUI();
  const [data, setData] = useState<Any>(null);
  const [creating, setCreating] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const load = useCallback(() => api(`/api/events/${eventId}/links`).then(setData).catch((e) => toast(e.message, "error")), [eventId, toast]);
  useEffect(() => { load(); }, [load]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const urlOf = (l: Any) => `${origin}${LINK_TYPES[l.type].path}${l.hash}`;

  async function revoke(l: Any) {
    if (!(await confirm({ title: t("让该链接失效？"), message: t("失效后打开此链接会看到「链接已失效」页面。已产生的数据仍保留在活动中。"), danger: true, confirmText: t("使其失效") }))) return;
    try { await api(`/api/links/${l.id}`, { method: "PATCH", body: { revoke: true } }); toast(t("链接已失效")); load(); onChanged(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  async function restore(l: Any) {
    try { await api(`/api/links/${l.id}`, { method: "PATCH", body: { restore: true } }); toast(t("链接已恢复")); load(); onChanged(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  async function rotate(type: string) {
    if (!(await confirm({ title: t("重置{type}链接？", { type: t(LINK_TYPES[type].label) }), message: t("将生成新链接，并让该类型所有旧链接失效。数据不会丢失。"), confirmText: t("重置链接") }))) return;
    try {
      for (const l of data.links.filter((x: Any) => x.type === type && !x.revoked_at)) await api(`/api/links/${l.id}`, { method: "PATCH", body: { revoke: true } });
      await api(`/api/events/${eventId}/links`, { body: { type, label: "" } });
      toast(t("已生成新链接")); load(); onChanged();
    } catch (e) { toast((e as Error).message, "error"); }
  }

  if (!data) return <div className="card"><PageLoader /></div>;
  const links = (data.links as Any[]).filter((l) => filter === "all" || l.type === filter);
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t("链接管理")}</h2>
          <p className="text-sm text-gray-500 mt-1">{t("所有分享链接都是随机生成、不可猜测的。可为不同渠道生成多个带标签的嘉宾链接，报告中会统计嘉宾来源。")}</p>
        </div>
        {data.canManage && <button className="btn btn-primary ml-auto" onClick={() => setCreating(true)}><Icon name="plus" />{t("生成链接")}</button>}
      </div>
      {data.canManage && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(LINK_TYPES).map(([k, v]) => {
            const active = data.links.filter((l: Any) => l.type === k && !l.revoked_at).length;
            return (
              <div key={k} className="rounded-xl bg-white border border-gray-200/80 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900"><Icon name={v.icon} className="w-4 h-4 text-brand-600" />{t(v.label)}<span className="ml-auto text-xs text-gray-400">{t("{n} 个有效", { n: active })}</span></div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed min-h-[32px]">{t(v.desc)}</p>
                <button className="btn btn-ghost btn-sm -ml-2 mt-1 text-brand-600" onClick={() => rotate(k)}><Icon name="refresh" />{t("重置链接")}</button>
              </div>
            );
          })}
        </div>
      )}
      <div className="card">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-900 mr-2">{t("链接历史")}</span>
          {["all", ...Object.keys(LINK_TYPES)].map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-2.5 py-1 rounded-md ${filter === k ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50"}`}>{k === "all" ? t("全部") : t(LINK_TYPES[k].label)}</button>
          ))}
        </div>
        {links.length === 0 ? <EmptyState icon="external" title={t("暂无链接")} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 bg-gray-50"><tr>
                <th className="text-left font-medium px-5 py-2.5">{t("类型 / 标签")}</th><th className="text-left font-medium px-3 py-2.5">{t("链接")}</th>
                <th className="text-right font-medium px-3 py-2.5">{t("访问")}</th><th className="text-right font-medium px-3 py-2.5">{t("嘉宾")}</th>
                <th className="text-left font-medium px-3 py-2.5">{t("创建人 / 时间")}</th><th className="text-left font-medium px-3 py-2.5">{t("状态")}</th><th className="px-5" />
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {links.map((l) => (
                  <tr key={l.id} className={l.revoked_at ? "text-gray-400" : ""}>
                    <td className="px-5 py-3"><div className="font-medium text-gray-800">{t(LINK_TYPES[l.type].label)}</div><div className="text-xs text-gray-500">{l.label || t("默认")}</div></td>
                    <td className="px-3 py-3 font-mono text-xs"><span className={l.revoked_at ? "line-through" : "text-gray-700"}>{LINK_TYPES[l.type].path}{l.hash}</span></td>
                    <td className="px-3 py-3 text-right tabular-nums">{l.visits}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{l.type === "guest" || l.type === "embed" ? l.guests : "—"}</td>
                    <td className="px-3 py-3 text-xs"><div>{l.creator_name || t("系统")}</div><div className="text-gray-400">{fmtTime(l.created_at)}</div></td>
                    <td className="px-3 py-3">{l.revoked_at ? <span className="chip bg-gray-100 text-gray-500" title={fmtTime(l.revoked_at)}>{t("已失效")}</span> : <span className="chip bg-emerald-50 text-emerald-700">{t("有效")}</span>}</td>
                    <td className="px-5 py-3"><div className="flex justify-end gap-1">
                      {!l.revoked_at && <button className="btn btn-ghost btn-sm" title={t("复制")} onClick={async () => { await copyText(urlOf(l)); toast(t("链接已复制")); }}><Icon name="copy" /></button>}
                      {!l.revoked_at && l.type !== "report" && <button className="btn btn-ghost btn-sm" title={t("二维码")} onClick={() => setQr(urlOf(l))}><Icon name="qr" /></button>}
                      {!l.revoked_at && <a className="btn btn-ghost btn-sm" href={urlOf(l)} target="_blank" rel="noreferrer" title={t("打开")}><Icon name="external" /></a>}
                      {data.canManage && (l.revoked_at ? <button className="btn btn-ghost btn-sm" onClick={() => restore(l)}>{t("恢复")}</button> : <button className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => revoke(l)}>{t("失效")}</button>)}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {creating && <CreateLink eventId={eventId} onClose={() => setCreating(false)} onDone={() => { setCreating(false); load(); onChanged(); }} />}
      {qr && <Modal onClose={() => setQr(null)} title={t("二维码")} width="max-w-sm"><div className="px-6 pb-6 flex flex-col items-center"><QR text={qr} size={220} /><div className="mt-3 text-xs text-gray-400 break-all text-center">{qr}</div></div></Modal>}
    </div>
  );
}

function CreateLink({ eventId, onClose, onDone }: { eventId: number; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const [type, setType] = useState("guest");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await api(`/api/events/${eventId}/links`, { body: { type, label } }); toast(t("已生成新链接")); onDone(); }
    catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose} title={t("生成链接")}>
      <form onSubmit={submit} className="px-6 pb-6 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(LINK_TYPES).map(([k, v]) => (
            <button type="button" key={k} onClick={() => setType(k)} className={`text-left rounded-lg border p-3 ${type === k ? "border-brand-500 bg-brand-50/50" : "border-gray-200 hover:bg-gray-50"}`}>
              <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5"><Icon name={v.icon} className="w-4 h-4 text-brand-600" />{t(v.label)}</div>
              <div className="text-xs text-gray-500 mt-1">{t(v.desc)}</div>
            </button>
          ))}
        </div>
        <div><label className="label">{t("标签（可选）")}</label><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder={t("例如：微信群、邮件、会场海报")} /></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={onClose}>{t("取消")}</button><button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="w-4 h-4" />}{t("生成")}</button></div>
      </form>
    </Modal>
  );
}
