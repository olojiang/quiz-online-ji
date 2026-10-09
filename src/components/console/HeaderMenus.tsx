"use client";
import { useT } from "@/components/i18n";
import { useEffect, useRef, useState } from "react";
import { api, copyText, Dropdown, Icon, MenuItem, Modal, QR, useUI } from "../ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function origin() { return typeof window !== "undefined" ? window.location.origin : ""; }

export function GuestMenu({ hash, embedHash, canManage, eventId, onChanged }: { hash: string | null; embedHash: string | null; canManage: boolean; eventId: number; onChanged: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const [qr, setQr] = useState(false);
  const [sim, setSim] = useState(false);
  const url = hash ? `${origin()}/g/${hash}` : "";
  async function embedCode() {
    let h = embedHash;
    if (!h) {
      if (!canManage) return toast(t("还没有嵌入链接，请联系活动管理员生成"), "error");
      try { const d = await api(`/api/events/${eventId}/links`, { body: { type: "embed", label: "" } }); h = d.link.hash; onChanged(); }
      catch (e) { return toast((e as Error).message, "error"); }
    }
    await copyText(`<iframe src="${origin()}/embed/${h}" width="400" height="720" style="border:0;border-radius:12px" allow="clipboard-write"></iframe>`);
    toast(t("嵌入代码已复制（使用独立的嵌入链接）"));
  }
  const need = (fn: () => void) => () => { if (!hash) toast(t("嘉宾链接已全部失效，请在「链接管理」中生成新链接"), "error"); else fn(); };
  return (
    <>
      <Dropdown width="w-80" trigger={(open) => (
        <button className={`btn ${open ? "bg-brand-50 text-brand-700 border border-brand-200" : "btn-secondary"}`}><Icon name="phone" /><span className="hidden sm:inline">{t("嘉宾端")}</span></button>
      )}>
        {(close) => (
          <>
            <div className="px-4 pt-1 pb-2 text-xs text-gray-400">{t("嘉宾端")}</div>
            <MenuItem icon="qr" title={t("嘉宾端二维码")} desc={t("扫码即可进入嘉宾端参与互动")} onClick={() => { close(); need(() => setQr(true))(); }} />
            <MenuItem icon="phone" title={t("模拟器中打开")} desc={t("在当前页面预览嘉宾端效果")} onClick={() => { close(); need(() => setSim(true))(); }} />
            <MenuItem icon="external" title={t("在新的页面打开")} desc={t("在浏览器新标签页中打开嘉宾端")} onClick={() => { close(); need(() => window.open(url, "_blank"))(); }} />
            <MenuItem icon="copy" title={t("复制链接到剪贴板")} desc={t("复制嘉宾端访问链接，可分享给参会者")} onClick={() => { close(); need(async () => { await copyText(url); toast(t("嘉宾端链接已复制")); })(); }} />
            <MenuItem icon="code" title={t("复制嵌入代码")} desc={t("复制 iframe 嵌入代码到其他网页使用")} onClick={() => { close(); embedCode(); }} />
          </>
        )}
      </Dropdown>
      {qr && (
        <Modal onClose={() => setQr(false)} title={t("嘉宾端二维码")} width="max-w-sm">
          <div className="px-6 pb-6 flex flex-col items-center">
            <div className="p-4 rounded-2xl border border-gray-100 shadow-sm"><QR text={url} size={220} /></div>
                        <div className="mt-2 text-xs text-gray-400 break-all text-center">{url}</div>
            <button className="btn btn-secondary mt-4" onClick={async () => { await copyText(url); toast(t("链接已复制")); }}><Icon name="copy" />{t("复制链接")}</button>
          </div>
        </Modal>
      )}
      {sim && (
        <Modal onClose={() => setSim(false)} title={t("嘉宾端预览")} width="max-w-md">
          <div className="px-6 pb-6 flex justify-center">
            <div className="rounded-[2.5rem] bg-gray-900 p-3 shadow-2xl">
              <div className="relative rounded-[2rem] overflow-hidden bg-white" style={{ width: 340, height: 660 }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-gray-900 rounded-b-2xl z-10" />
                <iframe src={`/g/${hash}?preview=1`} className="w-full h-full border-0" title={t("嘉宾端预览")} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function ScreenMenu({ event, hash, canPresent, onChanged }: { event: Any; hash: string | null; canPresent: boolean; onChanged: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const [overlay, setOverlay] = useState(false);
  const [help, setHelp] = useState(false);
  const url = hash ? `${origin()}/s/${hash}` : "";
  const needS = (fn: () => void) => () => { if (!hash) toast(canPresent ? t("投屏链接已全部失效，请在「链接管理」中生成新链接") : t("你没有投屏权限"), "error"); else fn(); };
  async function setChannel(ch: string) {
    try { await api(`/api/events/${event.id}`, { method: "PATCH", body: { screen_channel: ch } }); toast(ch === "welcome" ? t("已切换至欢迎页") : t("已切换至互动频道")); onChanged(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  const ch = event.screen_channel;
  return (
    <>
      <Dropdown width="w-80" trigger={() => (
        <button className="btn btn-primary" title={t("投屏端")}><Icon name="screen" /><span className="hidden sm:inline">{t("投屏端")}</span>
          <span className="hidden md:inline-flex items-center gap-1 rounded bg-white/20 px-1.5 py-0.5 text-[11px] font-normal"><span className={`w-1.5 h-1.5 rounded-full ${ch === "welcome" ? "bg-amber-300" : "bg-emerald-300"}`} />{ch === "welcome" ? t("欢迎页") : t("互动频道")}</span>
        </button>
      )}>
        {(close) => (
          <>
            <div className="px-4 pt-1 pb-1 text-xs text-gray-400">{t("投屏打开模式")}</div>
            <MenuItem icon="external" title={t("在新窗口中打开")} desc={t("在新窗口打开投屏模式，适合有扩展屏幕的用户")} onClick={() => { close(); needS(() => window.open(url, "qoj-screen", "popup=yes,width=1280,height=720"))(); }} />
            <MenuItem icon="expand" title={t("当前窗口打开")} desc={t("在当前页面上全屏显示投播内容，适合独立屏幕用户")} onClick={() => { close(); needS(() => setOverlay(true))(); }} />
            <div className="my-1.5 border-t border-gray-100" />
            <div className="px-4 pt-1 pb-1 text-xs text-gray-400">{t("频道切换")}{!canPresent && t("（仅主持人可操作）")}</div>
            <MenuItem icon="hi" title={t("切换至欢迎页")} active={ch === "welcome"}
              right={<Icon name={ch === "welcome" ? "pause" : "play"} className={`w-4 h-4 ${ch === "welcome" ? "text-brand-600" : "text-gray-300"}`} strokeWidth={3} />}
              onClick={() => { close(); if (canPresent) setChannel("welcome"); else toast(t("只有主持人可以切换频道"), "error"); }} />
            <MenuItem icon="screen" title={t("切换至互动频道")} active={ch === "interaction"}
              right={<Icon name={ch === "interaction" ? "pause" : "play"} className={`w-4 h-4 ${ch === "interaction" ? "text-brand-600" : "text-gray-300"}`} strokeWidth={3} />}
              onClick={() => { close(); if (canPresent) setChannel("interaction"); else toast(t("只有主持人可以切换频道"), "error"); }} />
            <div className="my-1.5 border-t border-gray-100" />
            <MenuItem icon="copy" title={t("复制当前模式链接")} onClick={() => { close(); needS(async () => { await copyText(url); toast(t("投屏链接已复制")); })(); }} />
            <MenuItem icon="eye" title={t("使用教程")} onClick={() => { close(); setHelp(true); }} />
          </>
        )}
      </Dropdown>
      {overlay && <ScreenOverlay url={`/s/${hash}`} onClose={() => setOverlay(false)} />}
      {help && (
        <Modal onClose={() => setHelp(false)} title={t("投屏使用教程")}>
          <div className="px-6 pb-6 text-sm text-gray-600 leading-relaxed space-y-3">
            <p><b className="text-gray-900">{t("1. 打开投屏：")}</b>{t("有扩展屏时选「在新窗口中打开」，把窗口拖到投影屏后点右下角「全屏」；只有一块屏幕时选「当前窗口打开」。")}</p>
            <p><b className="text-gray-900">{t("2. 切换频道：")}</b>{t("开场前切到「欢迎页」显示活动名称和二维码；开始互动后切到「互动频道」。投屏端每 2 秒自动同步。")}</p>
            <p><b className="text-gray-900">{t("3. 选择互动：")}</b>{t("在左侧选择互动并点击「设为当前互动」，大屏和嘉宾端会同时切换。")}</p>
            <p><b className="text-gray-900">{t("4. 现场操作：")}</b>{t("在提问列表里可以置顶、标记已回答、精选，或点击「上墙」把某个问题放大显示在大屏上。")}</p>
            <p><b className="text-gray-900">{t("5. 大屏控制栏：")}</b>{t("左下角可切换欢迎页/互动、翻页、缩放和全屏；鼠标移开后会自动变淡。")}</p>
          </div>
        </Modal>
      )}
    </>
  );
}

function ScreenOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.requestFullscreen?.().catch(() => {});
    const onFs = () => { if (!document.fullscreenElement) onClose(); };
    document.addEventListener("fullscreenchange", onFs);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onFs); window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return (
    <div ref={ref} className="fixed inset-0 z-[95] bg-black">
      <iframe src={url} className="w-full h-full border-0" title={t("投屏")} />
      <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); onClose(); }} className="absolute top-3 right-3 rounded-full bg-black/40 text-white/80 hover:text-white p-2" title={t("退出 (Esc)")}><Icon name="x" className="w-5 h-5" /></button>
    </div>
  );
}
