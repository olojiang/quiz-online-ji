import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UIProvider } from "@/components/ui";
import { LangProvider } from "@/components/i18n";

export const metadata: Metadata = {
  title: "活动问答 · Quiz Online Ji",
  description: "活动现场互动：提问、投票、测验、开放话题",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#7c3aed" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <LangProvider><UIProvider>{children}</UIProvider></LangProvider>
      </body>
    </html>
  );
}
