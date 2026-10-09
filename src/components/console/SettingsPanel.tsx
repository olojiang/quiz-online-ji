"use client";
import { useT } from "@/components/i18n";
import { useEffect, useState } from "react";
import { api, Icon, Spinner, Toggle, useUI } from "../ui";
import { GUEST_THEMES, SCREEN_THEMES, isHex } from "@/lib/types";
import { FEATURE_GROUPS } from "@/lib/features";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const NAV = [
  { key: "basic", label: "基本信息" },
  { key: "features", label: "功能设置" },
  { key: "theme", label: "皮肤主题" },
];

export function SettingsDrawer({ event, qa, perms, onClose, onChanged, onDeleted, initialTab = "basic" }: { event: Any; qa: Any | null; perms: Any; onClose: () => void; onChanged: () => void; onDeleted: () => void; initialTab?: string }) {
  const t = useT();
  const { toast, confirm } = useUI();
  const [tab, setTab] = useState(initialTab);
  const [f, setF] = useState({
    name: event.name, date: event.event_date ? String(event.event_date).slice(0, 10) : "", description: event.description || "",
    status: event.status, allow_pre_questions: event.allow_pre_questions,
    groups: (event.groups || []).join("\n"), blocklist: (event.blocklist || []).join("\n"),
    min_length: event.min_length, rate_limit: event.rate_limit,
    screen_theme: event.screen_theme, guest_theme: event.guest_theme || "blue",
    autoApprove: !!qa?.config?.autoApprove,
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function save() {
    if (!f.name.trim()) { setTab("basic"); return toast(t("请输入活动名称"), "error"); }
    setBusy(true);
    try {
      await api(`/api/events/${event.id}`, { method: "PATCH", body: {
        name: f.name, date: f.date || null, description: f.description, status: f.status, allow_pre_questions: f.allow_pre_questions,
        ...(FEATURE_GROUPS ? { groups: f.groups.split(/[\n,，]/) } : {}), blocklist: f.blocklist.split(/[\n,，]/), min_length: Number(f.min_length), rate_limit: Number(f.rate_limit),
        screen_theme: f.screen_theme, guest_theme: f.guest_theme,
      } });
      if (qa && perms.moderate && f.autoApprove !== !!qa.config?.autoApprove)
        await api(`/api/interactions/${qa.id}`, { method: "PATCH", body: { autoApprove: f.autoApprove } });
      toast(t("设置已保存"));
      onChanged();
      onClose();
    } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
  }
  async function del() {
    if (!(await confirm({ title: `删除活动「${event.name}」？`, message: t("活动下的所有互动、提问、投票和嘉宾记录都会被永久删除，无法恢复。"), danger: true, confirmText: t("永久删除") }))) return;
    try { await api(`/api/events/${event.id}`, { method: "DELETE" }); toast(t("活动已删除")); onDeleted(); } catch (err) { toast((err as Error).message, "error"); }
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-gray-900/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="animate-fade-up w-full max-w-3xl h-full bg-white shadow-2xl flex">
        <nav className="hidden sm:block w-44 shrink-0 bg-gray-50 pt-24">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => setTab(n.key)} className={`w-full text-left pl-12 py-3 text-sm border-r-2 ${tab === n.key ? "text-brand-700 font-medium border-brand-600 bg-white" : "text-gray-600 border-transparent hover:text-gray-900"}`}>{t(n.label)}</button>
          ))}
        </nav>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="h-16 shrink-0 px-6 flex items-center justify-between border-b border-dashed border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">{t("设置")}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><Icon name="x" className="w-5 h-5" /></button>
          </div>
          <div className="sm:hidden flex border-b border-gray-100">
            {NAV.map((n) => <button key={n.key} onClick={() => setTab(n.key)} className={`flex-1 py-2.5 text-sm ${tab === n.key ? "text-brand-700 border-b-2 border-brand-600" : "text-gray-500"}`}>{t(n.label)}</button>)}
          </div>
          <div className="flex-1 overflow-auto scrollbar-thin px-6 py-6 space-y-6">
            {tab === "basic" && (
              <>
                <Field label="活动名称"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} /></Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="活动日期"><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
                </div>
                <Field label="活动简介" hint="显示在嘉宾端顶部和投屏欢迎页"><textarea className="input" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={1000} placeholder={t("例如：时间、地点、议程简介")} /></Field>
                {FEATURE_GROUPS && <Field label="组别列表" hint="每行一个。设置后嘉宾提问时从下拉框选择组别；留空则嘉宾自由填写。"><textarea className="input" rows={5} value={f.groups} onChange={(e) => setF({ ...f, groups: e.target.value })} placeholder={"销售部\n市场部\n研发中心"} /></Field>}
                <div className="pt-4 border-t border-gray-100"><button type="button" className="btn btn-ghost text-red-600 hover:bg-red-50 -ml-3" onClick={del}><Icon name="trash" />{t("删除活动")}</button></div>
              </>
            )}
            {tab === "features" && (
              <>
                <Field label="活动状态" hint="未开始时可开放会前提问；进行中嘉宾可参与所有互动；已结束后关闭提交。">
                  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                    {[["upcoming", "未开始"], ["live", "进行中"], ["ended", "已结束"]].map(([k, l], i) => (
                      <button type="button" key={k} onClick={() => setF({ ...f, status: k })} className={`px-5 py-2 ${i ? "border-l border-gray-200" : ""} ${f.status === k ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>{l}</button>
                    ))}
                  </div>
                </Field>
                <SwitchRow title={t("允许会前提问")} desc={t("活动「未开始」时，嘉宾通过链接/二维码即可提前提交问题")} checked={f.allow_pre_questions} onChange={(v) => setF({ ...f, allow_pre_questions: v })} />
                {qa && <SwitchRow title={t("自动审核")} desc={t("开启后新问题直接展示；被下方规则标记的问题仍会进入待审核")} checked={f.autoApprove} disabled={!perms.moderate} onChange={(v) => setF({ ...f, autoApprove: v })} />}
                <div className="pt-2">
                  <div className="text-sm font-medium text-gray-900">{t("垃圾提问过滤")}</div>
                  <p className="text-xs text-gray-500 mt-1">{t("命中规则的问题会带上原因标签进入「待审核」。重复内容和包含链接的内容也会被自动标记。")}</p>
                </div>
                <Field label="敏感词 / 屏蔽词" hint="每行一个"><textarea className="input" rows={4} value={f.blocklist} onChange={(e) => setF({ ...f, blocklist: e.target.value })} placeholder={"广告\n加微信"} /></Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="最少字数"><input className="input" type="number" min={1} max={50} value={f.min_length} onChange={(e) => setF({ ...f, min_length: e.target.value })} /></Field>
                  <Field label="每位嘉宾每分钟最多提问"><input className="input" type="number" min={1} max={30} value={f.rate_limit} onChange={(e) => setF({ ...f, rate_limit: e.target.value })} /></Field>
                </div>
              </>
            )}
            {tab === "theme" && (
              <>
                <ThemePicker title={t("投屏端")} presets={SCREEN_THEMES} value={f.screen_theme} onChange={(v) => setF({ ...f, screen_theme: v })} />
                <div className="border-t border-gray-100" />
                <ThemePicker title={t("嘉宾端")} presets={GUEST_THEMES} value={f.guest_theme} onChange={(v) => setF({ ...f, guest_theme: v })} />
              </>
            )}
          </div>
          <div className="h-20 shrink-0 border-t border-gray-100 flex items-center justify-center gap-4">
            <button className="btn btn-secondary w-24" onClick={onClose}>{t("关闭")}</button>
            <button className="btn btn-primary w-24" onClick={save} disabled={busy}>{busy && <Spinner className="w-4 h-4" />}{t("确定")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const t = useT();
  return <div><label className="label">{t(label)}</label>{children}{hint && <p className="text-xs text-gray-500 mt-1.5">{t(hint)}</p>}</div>;
}
function SwitchRow({ title, desc, checked, onChange, disabled }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-4">
      <span><span className="block text-sm font-medium text-gray-900">{title}</span><span className="block text-xs text-gray-500 mt-0.5">{desc}</span></span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function ThemePicker({ title, presets, value, onChange }: { title: string; presets: Record<string, { label: string; color: string; swatch?: string }>; value: string; onChange: (v: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const custom = isHex(value);
  return (
    <section>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-brand-600 text-[15px] font-medium">
        {title}<Icon name="chevron" className={`w-4 h-4 transition ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-5">
          <label className="flex flex-col items-center gap-2 cursor-pointer">
            <span className="relative w-full h-11 rounded-md flex items-center justify-center border border-dashed border-gray-300 overflow-hidden" style={custom ? { background: value, borderStyle: "solid" } : undefined}>
              {!custom && <Icon name="plus" className="w-6 h-6 text-gray-600" />}
              <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" value={custom ? value : "#7c3aed"} onChange={(e) => onChange(e.target.value)} aria-label={t("自定义颜色")} />
            </span>
            <span className={`flex items-center gap-1.5 text-sm ${custom ? "text-brand-600" : "text-gray-700"}`}><Radio on={custom} />{t("自定义")}{custom && <span className="font-mono text-xs text-gray-400">{value}</span>}</span>
          </label>
          {Object.entries(presets).map(([k, tt]) => (
            <button type="button" key={k} onClick={() => onChange(k)} className="flex flex-col items-center gap-2">
              <span className={`w-full h-11 rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] ${value === k ? "ring-2 ring-offset-2 ring-brand-500" : ""}`} style={{ background: tt.swatch || tt.color }} />
              <span className={`flex items-center gap-1.5 text-sm ${value === k ? "text-brand-600" : "text-gray-700"}`}><Radio on={value === k} />{t(tt.label)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
function Radio({ on }: { on: boolean }) {
  return <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${on ? "border-brand-600" : "border-gray-300"}`}>{on && <span className="w-2 h-2 rounded-full bg-brand-600" />}</span>;
}
