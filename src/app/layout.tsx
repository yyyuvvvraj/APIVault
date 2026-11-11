import type { Metadata } from "next";
import "./globals.css";
import { SiteChrome } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: {
    default: "APIVault — Discover APIs worth building with",
    template: "%s | APIVault",
  },
  description: "A community-built API directory for discovering, comparing, and contributing useful APIs.",
  openGraph: {
    title: "APIVault — Discover APIs worth building with",
    description: "A community-built API directory for developers.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
