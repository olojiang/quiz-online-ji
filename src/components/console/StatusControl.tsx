"use client";
import { useState } from "react";
import { api, Dropdown, Icon, MenuItem, Spinner, STATUS_STYLE, useUI } from "@/components/ui";
import { useT } from "@/components/i18n";
import { STATUS_LABEL } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
export type EventStatus = "upcoming" | "live" | "ended";
const ORDER: EventStatus[] = ["upcoming", "live", "ended"];
const STATUS_DESC: Record<EventStatus, string> = {
  upcoming: "嘉宾可提前提问（需开启会前提问）",
  live: "嘉宾可参与所有互动",
  ended: "嘉宾无法再提交，内容仍可查看",
};
/** The one obvious next step for each state. */
const PRIMARY: Record<EventStatus, { to: EventStatus; label: string; icon: string }> = {
  upcoming: { to: "live", label: "开始活动", icon: "play" },
  live: { to: "ended", label: "结束活动", icon: "stop" },
  ended: { to: "live", label: "重新开放", icon: "refresh" },
};
const TOAST: Record<EventStatus, string> = { upcoming: "活动已改为「未开始」", live: "活动已开始", ended: "活动已结束" };

/** 活动管理员 / 超级管理员 (perms.manage) can set any state; 主持人 can start / end / reopen (live ⇄ ended). Mirrors the PATCH check. */
export function canSetStatus(perms: Any, to: EventStatus) {
  if (perms?.manage) return true;
  return !!perms?.present && to !== "upcoming";
}
export function canChangeStatus(perms: Any) { return !!(perms?.manage || perms?.present); }

/** Shared logic: PATCH status with a confirm before ending, toast after. */
export function useStatusChanger(event: Any, onChanged: () => void) {
  const t = useT();
  const { toast, confirm } = useUI();
  const [busy, setBusy] = useState(false);
  async function change(to: EventStatus) {
    if (to === event.status || busy) return;
    if (to === "ended") {
      const ok = await confirm({
        title: t("结束活动「{name}」？", { name: event.name }),
        message: t("结束后，嘉宾将无法再提问、投票、作答或评分；已有内容和报告仍可查看。需要时可以点「重新开放」恢复。"),
        danger: true, confirmText: t("结束活动"),
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await api(`/api/events/${event.id}`, { method: "PATCH", body: { status: to } });
      toast(event.status === "ended" && to === "live" ? t("活动已重新开放") : t(TOAST[to]));
      onChanged();
    } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }
  return { change, busy };
}

function StatusMenuItems({ event, perms, change, close }: { event: Any; perms: Any; change: (s: EventStatus) => void; close: () => void }) {
  const t = useT();
  return (
    <>
      <div className="px-4 pb-1 text-xs text-gray-400">{t("切换活动状态")}</div>
      {ORDER.filter((s) => canSetStatus(perms, s) || s === event.status).map((s) => (
        <MenuItem key={s} title={t(STATUS_LABEL[s])} desc={t(STATUS_DESC[s])} active={event.status === s}
          right={event.status === s ? <Icon name="check" className="w-4 h-4 text-brand-600 mt-0.5" /> : undefined}
          onClick={() => { close(); change(s); }} />
      ))}
    </>
  );
}

/** Console header: badge (doubles as the state dropdown) + one primary action. */
export function StatusControl({ event, perms, onChanged }: { event: Any; perms: Any; onChanged: () => void }) {
  const t = useT();
  const { change, busy } = useStatusChanger(event, onChanged);
  const status = event.status as EventStatus;
  const badge = <span className={`chip ${STATUS_STYLE[status]}`}>{status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}{t(STATUS_LABEL[status])}</span>;
  if (!canChangeStatus(perms)) return <span title={t("活动状态")}>{badge}</span>;
  const p = PRIMARY[status];
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Dropdown align="left" width="w-64" trigger={() => (
        <button className="inline-flex items-center gap-0.5 rounded-full hover:opacity-80" title={t("切换活动状态")} aria-label={t("切换活动状态")} data-testid="status-dropdown">
          {badge}<Icon name="chevron" className="w-3.5 h-3.5 text-gray-400" />
        </button>
      )}>
        {(close) => <StatusMenuItems event={event} perms={perms} change={change} close={close} />}
      </Dropdown>
      {canSetStatus(perms, p.to) && (
        <button className={`btn h-8 px-3 text-sm ${status === "upcoming" ? "btn-primary" : "btn-secondary"}`} disabled={busy} onClick={() => change(p.to)} data-testid="status-primary">
          {busy ? <Spinner className="w-4 h-4" /> : <Icon name={p.icon} className="w-4 h-4" />}<span className="hidden sm:inline">{t(p.label)}</span>
        </button>
      )}
    </div>
  );
}

/** 我的活动 card: quick action button + ⋯ menu with all states. Stops clicks from opening the card link. */
export function StatusQuickActions({ event, perms, onChanged }: { event: Any; perms: Any; onChanged: () => void }) {
  const t = useT();
  const { change, busy } = useStatusChanger(event, onChanged);
  if (!canChangeStatus(perms)) return null;
  const status = event.status as EventStatus;
  const p = PRIMARY[status];
  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };
  return (
    <div className="flex items-center gap-1" onClick={stop}>
      {canSetStatus(perms, p.to) && (
        <button className="group/sa inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 h-7 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50" disabled={busy} onClick={() => change(p.to)} data-testid="card-status-primary">
          {busy ? <Spinner className="w-3.5 h-3.5" /> : <Icon name={p.icon} className="w-3.5 h-3.5 text-gray-400 group-hover/sa:text-brand-600" />}{t(p.label)}
        </button>
      )}
      <Dropdown width="w-64" trigger={() => <button className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700" title={t("切换活动状态")} aria-label={t("切换活动状态")} data-testid="card-status-menu"><Icon name="more" className="w-4 h-4" /></button>}>
        {(close) => <StatusMenuItems event={event} perms={perms} change={change} close={close} />}
      </Dropdown>
    </div>
  );
}
