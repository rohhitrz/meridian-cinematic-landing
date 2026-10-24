import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/site";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: `${SITE.name} — design study`,
  description: SITE.description,
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The inline script adds `js` to <html> before hydration, so its class differs by design.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body id="top">
        {/* Lets CSS hide pre-reveal states only when JS will reveal them. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {children}
      </body>
    </html>
  );
}
