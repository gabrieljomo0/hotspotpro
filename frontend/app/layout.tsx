import type { Metadata } from "next";
import "./globals.css";

import { DashboardProvider } from "@/components/dashboard/context/DashboardContext";
import { CurrencyBoundary } from "@/components/dashboard/shared/CurrencyBoundary";

export const metadata: Metadata = {
  title: {
    default: "HotspotPro Billing System",
    template: "%s | HotspotPro",
  },
  description:
    "A modern hotspot billing, voucher and router management system.",
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
      </body>
    </html>
  );
}