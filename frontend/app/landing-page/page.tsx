"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Mail,
  Menu,
  Package,
  PlayCircle,
  RadioTower,
  Router,
  ShieldCheck,
  Smartphone,
  Ticket,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { InstallAppButton } from "@/components/InstallAppButton";

const features = [
  {
    title: "User Management",
    description:
      "Manage customers, monitor active users and view their internet sessions.",
    icon: Users,
  },
  {
    title: "Sell Internet Packages",
    description:
      "Create flexible internet packages and sell them directly to customers.",
    icon: Package,
  },
  {
    title: "Voucher Management",
    description:
      "Generate, manage and monitor voucher codes from one simple dashboard.",
    icon: Ticket,
  },
  {
    title: "Router Monitoring",
    description:
      "Monitor router uptime, connected clients, CPU, memory and network status.",
    icon: Router,
  },
  {
    title: "Payment Tracking",
    description:
      "Track Mobile Money, cash, card and voucher transactions securely.",
    icon: CreditCard,
  },
  {
    title: "Reports and Analytics",
    description:
      "View revenue, package sales, usage and business performance reports.",
    icon: BarChart3,
  },
  {
    title: "Resellers and Agents",
    description:
      "Manage agents, sellers and commissions from one central system.",
    icon: Users,
  },
  {
    title: "SMS and Notifications",
    description:
      "Send messages, package expiry alerts and payment notifications.",
    icon: Mail,
  },
];

const statistics = [
  {
    value: "2,000+",
    label: "Hotspot businesses",
    icon: Users,
  },
  {
    value: "5,000+",
    label: "Routers managed",
    icon: Router,
  },
  {
    value: "1M+",
    label: "Transactions processed",
    icon: CreditCard,
  },
  {
    value: "GH₵ 50M+",
    label: "Revenue processed",
    icon: BarChart3,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [previewMissing, setPreviewMissing] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("hotspotpro-theme") ?? localStorage.getItem("hotspotpro-public-theme");
    setDarkMode(storedTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    localStorage.setItem("hotspotpro-theme", nextDarkMode ? "dark" : "light");
  }

  return (
    <main className={`min-h-screen bg-white text-slate-950 transition-colors dark:bg-slate-950 dark:text-white ${darkMode ? "dark" : ""}`}>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Wifi
              className="h-8 w-8"
              strokeWidth={2}
            />

            <div>
              <p className="text-xl font-bold leading-none">
                HotspotPro
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Billing System
              </p>
            </div>
          </Link>

          <nav className="mx-auto hidden items-center gap-10 lg:flex">
            <a
              href="#home"
              className="border-b-2 border-current py-2 text-sm font-semibold"
            >
              Home
            </a>

            <a
              href="#features"
              className="py-2 text-sm font-medium text-slate-600 transition hover:underline dark:text-slate-300"
            >
              Features
            </a>


            <a
              href="#about"
              className="py-2 text-sm font-medium text-slate-600 transition hover:underline dark:text-slate-300"
            >
              About Us
            </a>

            <a
              href="#contact"
              className="py-2 text-sm font-medium text-slate-600 transition hover:underline dark:text-slate-300"
            >
              Contact
            </a>
          </nav>

          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <Link
              href="/portal"
              className="py-2 text-sm font-medium text-slate-600 transition hover:underline dark:text-slate-300"
            >
              Customer Portal
            </Link>

            <Link
              href="/reseller-portal"
              className="py-2 text-sm font-medium text-slate-600 transition hover:underline dark:text-slate-300"
            >
              Reseller Portal
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-600"
              aria-label="Change theme"
            >
              {darkMode ? "Dark" : "Light"}
            </button>

            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-900"
            >
              Login
            </Link>

            <Link
              href="/login?mode=register"
              className="rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="ml-auto rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={25} />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden">
            <div className="ml-auto min-h-screen w-[300px] border-l border-slate-200 bg-white p-5 text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">Menu</span>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-2 hover:bg-white/10"
                >
                  <X size={22} />
                </button>
              </div>

              <nav className="mt-8 space-y-2">
                {[
                  ["Home", "#home"],
                  ["Features", "#features"],
                  ["About Us", "#about"],
                  ["Contact", "#contact"],
                ].map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-4 py-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    {label}
                  </a>
                ))}
              </nav>

              <div className="mt-8 space-y-3">
                <Link
                  href="/portal"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  Customer Portal
                </Link>

                <Link
                  href="/reseller-portal"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  Reseller Portal
                </Link>

                <Link
                  href="/login"
                  className="block rounded-lg border border-slate-300 px-5 py-3 text-center text-sm font-semibold dark:border-slate-600"
                >
                  Login
                </Link>

                <Link
                  href="/login?mode=register"
                  className="block rounded-lg bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white dark:bg-white dark:text-slate-950"
                >
                  Get Started
                </Link>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold dark:border-slate-600"
                >
                  {darkMode ? "Dark" : "Light"}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <section
        id="home"
        className="relative overflow-hidden bg-white dark:bg-slate-950"
      >
        <div className="relative mx-auto grid max-w-[1500px] items-center gap-12 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Simple hotspot billing solution
            </p>

            <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight md:text-6xl xl:text-7xl">
              Powerful. Simple.
              <br />
              Reliable.
              <br />
              Hotspot Billing.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Manage customers, sell internet packages, generate vouchers,
              track payments and monitor routers from one easy-to-use system.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/login?mode=register"
                className="inline-flex items-center gap-3 rounded-lg bg-slate-950 px-7 py-4 text-base font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Get Started Free
                <ArrowRight size={20} />
              </Link>

              <a
                href="#features"
                className="inline-flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-7 py-4 text-base font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                <PlayCircle size={21} />
                View Features
              </a>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-3">
                {["KM", "AS", "KB", "AD"].map((initials) => (
                  <div
                    key={initials}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-xs font-bold text-white dark:border-slate-950"
                  >
                    {initials}
                  </div>
                ))}
              </div>

              <div>
                <p className="font-bold">2,000+ businesses</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  already growing with HotspotPro
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[28px] border border-slate-300 bg-slate-900 p-3 shadow-2xl dark:border-slate-700">
              <div className="overflow-hidden rounded-[18px] bg-white">
                {!previewMissing ? (
                  <Image
                    src="/dashboard-preview.png"
                    alt="HotspotPro dashboard preview"
                    width={1600}
                    height={1000}
                    priority
                    className="h-auto w-full"
                    onError={() => setPreviewMissing(true)}
                  />
                ) : (
                  <div className="flex min-h-[430px] items-center justify-center bg-slate-100 p-8 text-center dark:bg-slate-900">
                    <div>
                      <LayoutDashboardPreview />
                      <p className="mt-5 font-semibold text-slate-700 dark:text-slate-200">
                        HotspotPro Dashboard
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Add dashboard-preview.png to the public folder.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mx-auto h-4 w-[80%] rounded-b-full bg-slate-400 shadow-lg dark:bg-slate-700" />
          </div>
        </div>
      </section>

      <section
        id="features"
        className="bg-white py-20 dark:bg-slate-950"
      >
        <div className="mx-auto max-w-[1500px] px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Everything you need
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              Run your hotspot business with ease
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-400">
              Simple tools designed to help you manage your network,
              customers, payments and sales.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700">
                    <Icon size={23} />
                  </div>

                  <h3 className="mt-5 text-lg font-bold">
                    {feature.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {statistics.map((statistic) => {
            const Icon = statistic.icon;

            return (
              <div
                key={statistic.label}
                className="flex items-center justify-center gap-4 lg:justify-start"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700">
                  <Icon size={25} />
                </div>

                <div>
                  <p className="text-3xl font-black">{statistic.value}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {statistic.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="about"
        className="bg-slate-50 py-20 dark:bg-slate-900"
      >
        <div className="mx-auto grid max-w-[1300px] items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="font-bold uppercase tracking-widest text-slate-500">
              About HotspotPro
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight">
              Built to make hotspot management simple
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
              HotspotPro gives hotspot owners, installers, agents and
              resellers the tools required to manage internet services from
              one secure platform.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "Manage several routers and branches",
                "Monitor uptime and active users",
                "Accept and track customer payments",
                "Manage installers, resellers and agents",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="text-slate-950 dark:text-white" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-950 p-8 text-white dark:border-slate-700">
            <ShieldCheck className="h-14 w-14" />

            <h3 className="mt-6 text-3xl font-black">
              Reliable and easy to control
            </h3>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              Monitor router availability, customer activity and revenue
              without switching between several systems.
            </p>

            <Link
              href="/login?mode=register"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-slate-950"
            >
              Create your account
              <ChevronRight size={19} />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="bg-white py-20 dark:bg-slate-950"
      >
        <div className="mx-auto flex max-w-[1300px] flex-col items-center justify-between gap-10 rounded-lg border border-slate-200 p-8 dark:border-slate-800 md:p-12 lg:flex-row">
          <div>
            <h2 className="text-3xl font-black md:text-4xl">
              Ready to grow your hotspot business?
            </h2>

            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Create your account and begin managing your hotspot network.
            </p>

            <div className="mt-7 flex flex-wrap gap-4">
              <Link
                href="/login?mode=register"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-7 py-4 font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                Get Started
                <ArrowRight size={19} />
              </Link>

              <a
                href="mailto:support@hotspotpro.com"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-7 py-4 font-semibold dark:border-slate-700"
              >
                Contact Support
              </a>
            </div>
          </div>

          <div className="flex h-48 w-64 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700">
            <RadioTower className="h-24 w-24" />
          </div>
        </div>
      </section>

      <footer className="bg-[#1a1a1a] text-white">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <Wifi
                className="h-8 w-8"
                strokeWidth={2}
              />

              <div>
                <p className="text-lg font-bold">HotspotPro</p>
                <p className="text-xs text-slate-400">Billing System</p>
              </div>
            </div>

            <p className="mt-5 max-w-xs leading-7 text-slate-400">
              A simple hotspot billing and network management platform for
              modern internet businesses.
            </p>
          </div>

          <div>
            <p className="font-bold">Product</p>
            <div className="mt-5 space-y-3 text-sm text-slate-400">
              <a className="block hover:underline" href="#features">
                Features
              </a>
              <Link className="block hover:underline" href="/login">
                Login
              </Link>
            </div>
          </div>

          <div>
            <p className="font-bold">Company</p>
            <div className="mt-5 space-y-3 text-sm text-slate-400">
              <a className="block hover:underline" href="#about">
                About Us
              </a>
              <a className="block hover:underline" href="#contact">
                Contact
              </a>
              <a className="block hover:underline" href="#">
                Documentation
              </a>
            </div>
          </div>

          <div>
            <p className="font-bold">Portals</p>
            <div className="mt-5 space-y-3 text-sm text-slate-400">
              <Link className="block hover:underline" href="/portal">
                Customer Portal
              </Link>
              <Link
                className="block hover:underline"
                href="/reseller-portal"
              >
                Reseller Portal
              </Link>
              <Link className="block hover:underline" href="/login">
                Admin Login
              </Link>
              <Link className="block hover:underline" href="/super-admin">
                Super Admin
              </Link>
            </div>
          </div>

          <div>
            <p className="font-bold">Get in touch</p>
            <div className="mt-5 space-y-4 text-sm text-slate-400">
              <p>support@hotspotpro.com</p>
              <p>+233 24 123 4567</p>
              <p>Accra, Ghana</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-4 px-5 py-6 text-sm text-slate-400 sm:flex-row lg:px-8">
            <p>© 2026 HotspotPro. All rights reserved.</p>

            <div className="flex gap-6">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
      {/* Install stays at the bottom of the site only; users can close it. */}
      <InstallAppButton />
    </main>
  );
}

function LayoutDashboardPreview() {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 text-slate-950">
      <BarChart3 size={38} />
    </div>
  );
}