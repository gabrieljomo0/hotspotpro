import type { Metadata, Viewport } from "next";
import "./globals.css";

import { DashboardProvider } from "@/components/dashboard/context/DashboardContext";
import { CurrencyBoundary } from "@/components/dashboard/shared/CurrencyBoundary";
import { PwaRegister } from "@/components/PwaRegister";
import { InstallAppBanner } from "@/components/InstallAppButton";

export const metadata: Metadata = {
  title: {
    default: "HotspotPro Billing System",
    template: "%s | HotspotPro",
  },
  description:
    "A modern hotspot billing, voucher and router management system.",
  applicationName: "HotspotPro",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HotspotPro",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <CurrencyBoundary>
          <DashboardProvider>{children}</DashboardProvider>
        </CurrencyBoundary>
        <PwaRegister />
        <InstallAppBanner />
      </body>
    </html>
  );
}