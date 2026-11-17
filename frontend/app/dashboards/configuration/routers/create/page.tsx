"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { HotspotSizingPanel } from "@/components/dashboard/routers/HotspotSizingPanel";
import {
  DEFAULT_PEAK,
  parseLanIp,
  planFor,
  type PeakChoice,
} from "@/components/dashboard/routers/hotspotSizing";

type RouterType = "New Router" | "Existing Router";

const STEPS = [
  { label: "Connection", description: "Basic info" },
  { label: "Details", description: "Command" },
  { label: "Confirm", description: "Verify success" },
];

function generateToken(length = 80) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// What the router does, in order, once the command is run. Which stages
// appear depends on the router type and the services chosen.
type ProvisionStep = { id: string; label: string };

function buildProvisionSteps(routerType: RouterType, hotspot: boolean, pppoe: boolean): ProvisionStep[] {
  const steps: ProvisionStep[] = [
    { id: "received", label: "Command received by the router" },
    { id: "download", label: "Downloading the setup script from HotspotPro" },
    { id: "api", label: "Creating the HotspotPro API user" },
    { id: "tunnel", label: "Opening the secure WireGuard tunnel" },
  ];
  if (routerType === "New Router") {
    steps.push({ id: "network", label: "Setting up the bridge and IP addressing" });
    if (hotspot) steps.push({ id: "hotspot", label: "Starting the hotspot and DHCP server" });
    if (pppoe) steps.push({ id: "pppoe", label: "Starting the PPPoE server" });
  } else {
    steps.push({ id: "keep", label: "Leaving your existing configuration untouched" });
  }
  steps.push({ id: "radius", label: "Connecting RADIUS and firewall rules" });
  steps.push({ id: "checkin", label: "Router checking in with HotspotPro" });
  return steps;
}

const STEP_MS = 1400; // how long each stage takes to tick
const OPEN_DELAY_SECONDS = 3; // pause on "done" before the dashboard opens

export default function AddRouterPage() {
  const navigate = useRouter();
  const { routers, businessLocations, addRouter, addBusinessLocation, showToast, updateRouterCleanup } = useDashboard();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(`MikroTik-${routers.length + 1}`);
  const [routerType, setRouterType] = useState<RouterType>("New Router");
  const [dnsName, setDnsName] = useState("");

  const [siteChoice, setSiteChoice] = useState<string>(businessLocations[0]?.id ?? "__new__");
  const [newSiteName, setNewSiteName] = useState("");

  const [hotspotEnabled, setHotspotEnabled] = useState(true);
  const [loginMode, setLoginMode] = useState<"cloud" | "local">("cloud");
  const [pppoeEnabled, setPppoeEnabled] = useState(true);

  // Does the router have WiFi? If so, the name people will see when connecting.
  // Optional automatic clean-up of inactive voucher users.
  const [pruneOn, setPruneOn] = useState(false);
  const [pruneDays, setPruneDays] = useState(7);

  const [hasWireless, setHasWireless] = useState(true);
  // The port the ISP cable goes into. Always ether1 unless the owner says otherwise.
  const [wanInterface, setWanInterface] = useState("ether1");
  // The script counts the ports and keeps the highest numbered one out of the hotspot.
  const [lastPortFree, setLastPortFree] = useState(true);
  // WinBox stays open on the same network. There is no separate choice for it.
  const adminFromWan = true;
  const wanClean = /^(ether|sfp|sfp-sfpplus|sfpplus|lte|wlan|wifi|vlan|pppoe-out)[A-Za-z0-9._-]*$/.test(wanInterface.trim()) ? wanInterface.trim() : "ether1";
  const [wifiSsid, setWifiSsid] = useState("");

  // Hotspot address range, chosen from how many people use it at once.
  const [peak, setPeak] = useState<PeakChoice>(DEFAULT_PEAK);
  const [lanIp, setLanIp] = useState("");

  const [started, setStarted] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState<"mode" | "config" | null>(null);
  const startedAt = useRef(0);
  const finishedRef = useRef(false);

  // Coming from a site page ("Add a router to this site"): pick that site.
  // Saved sites load just after the first render, so wait until it is there.
  const sitePicked = useRef(false);
  useEffect(() => {
    if (sitePicked.current) return;
    const wanted = new URLSearchParams(window.location.search).get("site");
    if (!wanted) {
      sitePicked.current = true;
      return;
    }
    if (businessLocations.some((site) => site.id === wanted)) {
      sitePicked.current = true;
      setSiteChoice(wanted);
    }
  }, [businessLocations]);

  const provisioningToken = useRef(generateToken());
  const peakPlan = planFor(peak);
  const lanInput = lanIp.trim() || peakPlan.lanIp;
  const lanParsed = parseLanIp(lanInput);
  const lanError = "error" in lanParsed ? lanParsed.error : "";
  const hotspotNetwork = "error" in lanParsed ? planFor(peak).lanIp : lanParsed.network;
  const typedDns = dnsName.toLowerCase().replace(/[^a-z]/g, "");
  const nameDns = (name.match(/[a-zA-Z]/g) || []).join("").toLowerCase().slice(0, 4);
  const loginDns = routerType === "Existing Router" && typedDns.length > 0 && typedDns.length < 5 ? typedDns : nameDns || "wifi";
  const pppoeNetwork = "192.168.91.0/24";

  // Always put WiFi on the hotspot bridge when the box has wireless — otherwise
  // clients join the SSID with free internet and never see the voucher page.
  const wifiQuery =
    hasWireless && wifiSsid.trim()
      ? `?wireless=yes&ssid=${encodeURIComponent(wifiSsid.trim())}`
      : hasWireless
        ? "?wireless=yes"
        : "?wireless=no";

  // The router downloads its script from THIS server, so the address in the
  // command is the one the dashboard is opened at (set HOTSPOTPRO_PUBLIC_URL
  // on the server if routers must reach it by a different address).
  const [origin, setOrigin] = useState("https://hotspotpro.com");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const fetchMode = origin.startsWith("https") ? "https" : "http";

  // A router can't reach "localhost" (that is the router itself). When the
  // dashboard is opened on localhost, offer this computer's address on the
  // network instead, e.g. http://192.168.1.50:3000.
  const [suggestions, setSuggestions] = useState<{ address: string; origin: string; interface: string }[]>([]);
  const originIsLocal = /^https?:\/\/(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(origin);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/provision/address")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setSuggestions(data.candidates ?? []);
        if (data.configured) setOrigin(data.configured);
        else {
          // The router talks to the backend directly. On this computer that is the network address
          // on the backend's port, even when the dashboard itself is open on the website's port.
          const pageHost = (() => { try { return new URL(window.location.origin).hostname; } catch { return ""; } })();
          const onThisNetwork = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(pageHost) || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(pageHost);
          if (onThisNetwork) {
            const same = (data.candidates ?? []).find((item: { address: string }) => item.address === pageHost);
            const pick = same ?? data.candidates?.[0];
            if (pick) setOrigin(pick.origin);
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Check the script without a router, and (testing only) pretend a router ran it.
  type ScriptReport = { ok: boolean; errors: string[]; warnings: string[]; stats: { lines: number; steps: number } };
  const [scriptCheck, setScriptCheck] = useState<{ report: ScriptReport; script: string } | null>(null);
  const [checkError, setCheckError] = useState("");
  const [showScript, setShowScript] = useState(false);
  const checkWireless = hasWireless;

  async function runScriptCheck() {
    setCheckError("");
    try {
      const query = new URLSearchParams({ origin, wireless: checkWireless ? "yes" : "no", ssid: wifiSsid.trim() });
      const response = await fetch(`/api/provision/${provisioningToken.current}/check?${query}`);
      const body = await response.json();
      if (!response.ok) {
        setCheckError(body.message ?? "Could not check the script.");
        return;
      }
      setScriptCheck({ report: body.report, script: body.script });
    } catch {
      setCheckError("Could not reach the server.");
    }
  }

  async function simulateRouter() {
    setCheckError("");
    try {
      const response = await fetch(`/api/provision/${provisioningToken.current}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, wireless: checkWireless, ssid: wifiSsid.trim() }),
      });
      const body = await response.json();
      if (!response.ok) {
        setCheckError(body.message ?? "The test could not run.");
        if (body.report) setScriptCheck({ report: body.report, script: "" });
        return;
      }
      setScriptCheck({ report: body.report, script: scriptCheck?.script ?? "" });
      startProvisioning();
    } catch {
      setCheckError("Could not reach the server.");
    }
  }

  function downloadScript() {
    if (!scriptCheck?.script) return;
    const blob = new Blob([scriptCheck.script], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "hotspotpro-setup.rsc";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const setupUrl = `${origin}/api/provision/${provisioningToken.current}${wifiQuery}`;
  const tlsFlag = fetchMode === "https" ? " check-certificate=no" : "";
  const modeCommand = "/system device-mode update mode=advanced";
  const provisioningCommand = `:global hpFile "hotspotpro.rsc"; :do { /interface bridge port remove [find where interface=${wanClean}] } on-error={ }; :do { /ip dhcp-client add interface=${wanClean} disabled=no add-default-route=yes use-peer-dns=yes comment="HotspotPro WAN DHCP Client" } on-error={ }; :delay 8s; :do { /tool fetch mode=${fetchMode} url="${setupUrl}" dst-path=$hpFile${tlsFlag} } on-error={ :delay 8s; /tool fetch mode=${fetchMode} url="${setupUrl}" dst-path=$hpFile${tlsFlag} }; :delay 2s; :if ([:len [/file find where name=("flash/" . $hpFile)]] > 0) do={ :set hpFile ("flash/" . $hpFile) }; /import file-name=$hpFile; /file remove $hpFile`;

  const provisionSteps = buildProvisionSteps(routerType, hotspotEnabled, pppoeEnabled);
  const connected = started && doneCount >= provisionSteps.length;

  // With the HotspotPro server running, the command's link is registered with
  // it while this step is open, and the LAST stage ("router checking in")
  // only completes when the router really calls back. Without a server it
  // falls back to the timed demo.
  const [serverMode, setServerMode] = useState(false);
  const [serverDone, setServerDone] = useState(false);
  const linkedIp = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 1) return;
    let cancelled = false;
    fetch("/api/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: provisioningToken.current,
        router: {
          name,
          routerType,
          dnsName: loginDns,
          hotspotEnabled,
          loginMode,
          hotspotNetwork: hotspotEnabled ? hotspotNetwork : "",
          hotspotGatewayIp: hotspotEnabled && !("error" in lanParsed) ? lanParsed.ip : undefined,
          pppoeEnabled,
          pppoeNetwork: pppoeEnabled ? pppoeNetwork : "",
          hasWireless: routerType === "New Router" ? hasWireless : undefined,
          wanInterface: wanClean,
          managementPort: "",
          lastPortFree,
          adminFromWan,
        },
      }),
    })
      .then((response) => {
        if (!cancelled && response.ok) setServerMode(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (!serverMode || serverDone) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/provision/${provisioningToken.current}/status`);
        if (!response.ok) return;
        const status = (await response.json()) as { fetched: boolean; done: boolean; routerIp?: string | null };
        if (status.routerIp) linkedIp.current = status.routerIp;
        if (status.fetched || status.done) startProvisioning();
        if (status.done) setServerDone(true);
      } catch {
        // try again on the next tick
      }
    }, 2500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverMode, serverDone, started]);

  // Tick the stages off one by one, once the command has been run.
  useEffect(() => {
    if (!started || connected) return;
    // Waiting for the real router to check in (server mode).
    if (serverMode && !serverDone && doneCount >= provisionSteps.length - 1) return;
    const timer = window.setTimeout(() => {
      setDoneCount((count) => count + 1);
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [started, doneCount, connected, serverMode, serverDone]);

  // Everything succeeded: say so, then open the router's dashboard.
  useEffect(() => {
    if (!connected) return;
    showToast("Router provisioned successfully.");
    setCountdown(OPEN_DELAY_SECONDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      handleFinish();
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  function startProvisioning() {
    if (started) return;
    startedAt.current = Date.now();
    setDoneCount(0);
    setStarted(true);
  }

  function handleCopy(which: "mode" | "config") {
    navigator.clipboard?.writeText(which === "mode" ? modeCommand : provisioningCommand).catch(() => {});
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1500);
    if (which === "config") startProvisioning();
  }

  function handleCheckNow() {
    if (!started) {
      showToast("Checking router status…");
      startProvisioning();
    }
  }

  function handleBack() {
    // Leaving the command step stops the run.
    setStarted(false);
    setDoneCount(0);
    setCountdown(null);
    setStep(0);
  }

  function handleFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const openPortal = (ip: string) => {
      showToast("Router connected successfully. Opening the captive portal settings.");
      navigate.push(`/dashboards/configuration/routers/${encodeURIComponent(ip)}?tab=captive-portal&setup=done`);
    };
    if (linkedIp.current) {
      openPortal(linkedIp.current);
      return;
    }
    const newRouter = addRouter({
      name,
      routerType,
      dnsName: loginDns,
      hotspotEnabled,
      loginMode,
      hotspotNetwork: hotspotEnabled ? hotspotNetwork : "",
      hotspotGatewayIp: hotspotEnabled && !("error" in lanParsed) ? lanParsed.ip : undefined,
      pppoeEnabled,
      pppoeNetwork: pppoeEnabled ? pppoeNetwork : "",
      siteId: siteChoice !== "__new__" ? siteChoice : undefined,
      newSiteName: siteChoice === "__new__" ? newSiteName.trim() : undefined,
      hasWireless: routerType === "New Router" ? hasWireless : undefined,
      wanInterface: wanClean,
      managementPort: "",
      lastPortFree,
      adminFromWan,
      wifiSsid: hasWireless ? wifiSsid.trim() : undefined,
      provisioningToken: provisioningToken.current,
      provisioned: serverDone,
    });
    if (pruneOn) updateRouterCleanup(newRouter.ip, { pruneEnabled: true, pruneAfterDays: pruneDays }, true);
    openPortal(newRouter.ip);
  }

  const shown = connected ? 2 : step; // the Confirm dot lights up when provisioning is done

  const canContinue =
    name.trim().length > 0 &&
    (siteChoice !== "__new__" || newSiteName.trim().length > 0) &&
    !(routerType === "New Router" && hotspotEnabled && lanError) &&
    !(routerType === "New Router" && hasWireless && wifiSsid.trim().length === 0);

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="mb-1 text-xs text-[#a3a3a3]">
        Routers <span className="mx-1">›</span> Add Router
      </div>
      <h1 className="mb-2 text-3xl font-black text-[#1a1a1a] md:text-4xl">Provision Router</h1>
      <p className="mb-6 text-sm text-[#737373]">
        Paste the configuration command once. If the router says device mode is not allowed, use the small mode command after it, unplug the power cord for 10 seconds, restore power, then paste the configuration command again.
      </p>

      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-[#e6e6e6] bg-white p-4">
        {STEPS.map((s, index) => (
          <div key={s.label} className="flex flex-1 items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                index < shown
                  ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                  : index === shown
                    ? "border-[#1a1a1a] text-[#1a1a1a]"
                    : "border-[#e6e6e6] text-[#a3a3a3]"
              }`}
            >
              {index < shown ? <Check size={16} /> : index + 1}
            </div>
            <div className="hidden sm:block">
              <p className={`text-sm font-bold ${index <= shown ? "text-[#1a1a1a]" : "text-[#a3a3a3]"}`}>
                {s.label}
              </p>
              <p className="text-xs text-[#a3a3a3]">{s.description}</p>
            </div>
            {index < STEPS.length - 1 && (
              <div className="mx-2 hidden h-px flex-1 bg-[#e6e6e6] sm:block" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)] md:p-8">
        {step === 0 && (
          <div className="space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#525252]">
                Router Name <span className="text-red-500">*</span>
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g., Shop"
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              />
              <span className="mt-1 block text-xs text-[#a3a3a3]">
                The WiFi login name is <span className="font-mono text-[#1a1a1a]">{loginDns}</span>. It is taken from this router name and stays under 5 letters.
              </span>
            </label>

            <div>
              <span className="mb-2 block text-sm font-semibold text-[#525252]">
                Business / Site / Organization <span className="text-red-500">*</span>
              </span>
              <select
                value={siteChoice}
                onChange={(event) => setSiteChoice(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              >
                {businessLocations.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
                <option value="__new__">+ Add a new business / site…</option>
              </select>
              <span className="mt-1 block text-xs text-[#a3a3a3]">
                Routers in the same business share one captive portal design
                and hotspot setup. Pick an existing one, or create a new one
                for a different location.
              </span>

              {siteChoice === "__new__" && (
                <input
                  value={newSiteName}
                  onChange={(event) => setNewSiteName(event.target.value)}
                  placeholder="e.g., Kasoa Branch"
                  className="mt-3 h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              )}
            </div>

            <div>
              <span className="mb-2 block text-sm font-semibold text-[#525252]">
                Router Type <span className="text-red-500">*</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRouterType("New Router")}
                  className={`rounded-xl border-2 p-4 text-center ${
                    routerType === "New Router" ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white"
                  }`}
                >
                  <p className={`text-sm font-bold ${routerType === "New Router" ? "text-[#1a1a1a]" : "text-[#1a1a1a]"}`}>
                    New Router
                  </p>
                  <p className={`text-xs ${routerType === "New Router" ? "text-[#1a1a1a]" : "text-[#a3a3a3]"}`}>
                    Fresh setup, no existing config
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRouterType("Existing Router")}
                  className={`rounded-xl border-2 p-4 text-center ${
                    routerType === "Existing Router" ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white"
                  }`}
                >
                  <p className={`text-sm font-bold ${routerType === "Existing Router" ? "text-[#1a1a1a]" : "text-[#1a1a1a]"}`}>
                    Existing Router
                  </p>
                  <p className={`text-xs ${routerType === "Existing Router" ? "text-[#1a1a1a]" : "text-[#a3a3a3]"}`}>
                    Already in use, connect only
                  </p>
                </button>
              </div>
              <p className="mt-2 text-xs text-[#a3a3a3]">
                {routerType === "New Router"
                  ? "Full provisioning will configure bridges, IPs, DHCP, and hotspot services."
                  : "Minimal connection only adds API access and WireGuard. Your existing configuration will not be modified."}
              </p>
            </div>

            <label className="block" data-testid="wan-field">
              <span className="mb-1 block text-sm font-semibold text-[#525252]">Internet port</span>
              <input
                value={wanInterface}
                onChange={(event) => setWanInterface(event.target.value)}
                placeholder="ether1"
                className="h-10 w-full max-w-[180px] rounded-xl border border-[#e6e6e6] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
              />
              <span className="mt-1 block text-xs text-[#a3a3a3]">
                The internet cable uses port 1. Leave this as ether1 unless the cable is in a different port.
                {wanInterface.trim() && wanClean !== wanInterface.trim() ? " That name is not valid, so ether1 will be used." : ""}
              </span>
            </label>

            {routerType === "New Router" && (
              <label className="flex items-start gap-3 rounded-xl border border-[#e6e6e6] bg-white p-3" data-testid="mgmt-field">
                <input type="checkbox" checked={lastPortFree} onChange={(event) => setLastPortFree(event.target.checked)} className="mt-1 h-4 w-4" />
                <span className="text-sm text-[#525252]">
                  <span className="block font-semibold">Keep the last port free</span>
                  <span className="mt-0.5 block text-xs text-[#a3a3a3]">
                    The script counts the ethernet ports on the router. Port 1 is the internet cable unless you change the internet port above. The last port stays out of the hotspot for your computer. Turn this off if that last port should be part of the hotspot.
                  </span>
                </span>
              </label>
            )}

            {routerType === "Existing Router" && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#525252]">DNS name</span>
                <input
                  value={dnsName}
                  onChange={(event) => setDnsName(event.target.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 4))}
                  placeholder={loginDns}
                  className="h-11 w-full max-w-[180px] rounded-xl border border-[#e6e6e6] bg-white px-3 font-mono text-sm outline-none focus:border-[#1a1a1a]"
                />
                <span className="mt-1 block text-xs text-[#a3a3a3]">Leave this empty to use {loginDns} from the router name. Fewer than 5 letters.</span>
              </label>
            )}

            {routerType === "New Router" && (
              <div data-testid="wireless-card" className="rounded-xl border border-[#e6e6e6] bg-white p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hasWireless}
                    data-testid="wireless-switch"
                    onClick={() => setHasWireless((current) => !current)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${hasWireless ? "bg-[#1a1a1a]" : "bg-[#d4d4d4]"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${hasWireless ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                  </button>
                  <span className="text-sm font-bold text-[#1a1a1a]">Router has Wireless</span>
                </div>
                <p className="mt-2 text-xs text-[#737373]">Enable this if your MikroTik router has WiFi capabilities</p>
                {hasWireless && (
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-semibold text-[#525252]">
                      WiFi SSID <span className="text-red-500">*</span>
                    </span>
                    <input
                      value={wifiSsid}
                      onChange={(event) => setWifiSsid(event.target.value)}
                      maxLength={32}
                      data-testid="wifi-ssid"
                      placeholder="e.g., Kasoa Free WiFi"
                      className="h-11 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                    />
                    <span className="mt-1 block text-xs text-[#a3a3a3]">Network name that users will see when connecting</span>
                  </label>
                )}
              </div>
            )}

            {routerType === "New Router" && (
              <div className="rounded-xl border border-[#f4f4f4] bg-[#ffffff] p-4">
                <p className="mb-3 text-sm font-bold text-[#1a1a1a]">Service Configuration</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setHotspotEnabled((current) => !current)}
                    className={`rounded-xl border-2 p-4 text-left ${
                      hotspotEnabled ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#1a1a1a]">Enable Hotspot</span>
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded ${
                          hotspotEnabled ? "bg-[#1a1a1a] text-white" : "border border-[#e6e6e6]"
                        }`}
                      >
                        {hotspotEnabled && <Check size={11} />}
                      </span>
                    </div>
                    <p className="text-xs text-[#a3a3a3]">WiFi hotspot for public access</p>
                    <p className="font-mono text-xs text-[#a3a3a3]" data-testid="hotspot-network">Network: {hotspotNetwork}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPppoeEnabled((current) => !current)}
                    className={`rounded-xl border-2 p-4 text-left ${
                      pppoeEnabled ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6] bg-white"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#1a1a1a]">Enable PPPoE</span>
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded ${
                          pppoeEnabled ? "bg-[#1a1a1a] text-white" : "border border-[#e6e6e6]"
                        }`}
                      >
                        {pppoeEnabled && <Check size={11} />}
                      </span>
                    </div>
                    <p className="text-xs text-[#a3a3a3]">Wired customers dial in on the hotspot. Logins stay on the router.</p>
                    <p className="font-mono text-xs text-[#a3a3a3]">Network: {pppoeNetwork}</p>
                  </button>
                </div>

                {hotspotEnabled && (
                  <div className="mt-4 rounded-xl border border-[#e6e6e6] bg-white p-4">
                    <p className="text-sm font-bold text-[#1a1a1a]">How customers log in</p>
                    <p className="mt-1 text-xs text-[#737373]">Pick one. The router uses only that method, and you can change it later.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {([
                        ["cloud", "Cloud", "Vouchers stay in HotspotPro. The router asks the cloud when a customer logs in."],
                        ["local", "On the router", "Vouchers are stored on the MikroTik and keep working if the cloud cannot be reached."],
                      ] as const).map(([id, label, detail]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setLoginMode(id)}
                          className={`rounded-xl border-2 p-3 text-left ${loginMode === id ? "border-[#1a1a1a] bg-[#f4f4f4]" : "border-[#e6e6e6]"}`}
                        >
                          <span className="text-sm font-bold text-[#1a1a1a]">{label}</span>
                          <span className="mt-1 block text-xs text-[#737373]">{detail}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {hotspotEnabled && (
                  <HotspotSizingPanel
                    peak={peak}
                    onPeak={(next) => {
                      setPeak(next);
                      setLanIp("");
                    }}
                  />
                )}
              </div>
            )}

            <div data-testid="prune-card" className="rounded-xl border border-[#e6e6e6] bg-white p-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={pruneOn}
                  data-testid="prune-switch"
                  onClick={() => setPruneOn((current) => !current)}
                  className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${pruneOn ? "bg-[#1a1a1a]" : "bg-[#d4d4d4]"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${pruneOn ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1a1a1a]">Prune inactive users</p>
                  <p className="text-xs text-[#737373]">
                    Automatically remove voucher users who are offline and have not been seen for a while. More clean-up options (expired vouchers, cookies, time of day)
                    are under the router&apos;s Hotspot → Clean-up tab.
                  </p>
                  {pruneOn && (
                    <label className="mt-3 flex items-center gap-2 text-sm text-[#525252]">
                      Remove users inactive for
                      <input
                        data-testid="prune-days"
                        type="number"
                        min={1}
                        max={365}
                        value={pruneDays}
                        onChange={(event) => setPruneDays(Math.max(1, Math.min(365, Math.floor(Number(event.target.value) || 1))))}
                        className="h-10 w-20 rounded-lg border border-[#d4d4d4] bg-white px-2 text-center text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                      />
                      days
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate.push("/dashboards/configuration/routers")}
                className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#ffffff]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep(1)}
                className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Command
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-[#e6e6e6] bg-white p-4" data-testid="provision-review">
              <p className="text-sm font-bold text-[#1a1a1a]">What this command configures</p>
              <dl className="mt-3 grid gap-2 text-xs text-[#525252] sm:grid-cols-2">
                <div><dt className="text-[#a3a3a3]">Internet port</dt><dd className="font-mono">{wanClean}</dd></div>
                <div><dt className="text-[#a3a3a3]">Customer bridge</dt><dd className="font-mono">hotspotpro-bridge</dd></div>
                <div><dt className="text-[#a3a3a3]">Hotspot</dt><dd className="font-mono">{hotspotEnabled ? hotspotNetwork : "Off"}</dd></div>
                <div><dt className="text-[#a3a3a3]">Gateway and DNS</dt><dd className="font-mono">{hotspotEnabled && !("error" in lanParsed) ? lanParsed.ip : "—"} · 8.8.8.8, 8.8.4.4</dd></div>
                <div><dt className="text-[#a3a3a3]">Login name</dt><dd className="font-mono">{loginDns}</dd></div>
                <div><dt className="text-[#a3a3a3]">Vouchers</dt><dd className="font-mono">{loginMode === "cloud" ? "Cloud" : "On the router"}</dd></div>
                <div><dt className="text-[#a3a3a3]">PPPoE</dt><dd className="font-mono">{pppoeEnabled ? `${pppoeNetwork} on the customer bridge` : "Off"}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-[#a3a3a3]">The router checks in by itself after the paste. WinBox works on the same network, and from outside once the router is online. A queued change is not done until the router reports back.</p>
            </div>
            <div className="rounded-xl border border-[#f4f4f4] p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#1a1a1a]">Configuration command</p>
                  <p className="text-xs text-[#a3a3a3]">Paste this once. It downloads the setup, waits, imports it, and deletes the file. Leave the internet cable in {wanClean} and keep WinBox open until the setup finishes.</p>
                </div>
                <button
                  type="button"
                  data-testid="copy-command"
                  onClick={() => handleCopy("config")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#111111]"
                >
                  {copied === "config" ? <Check size={13} /> : <Copy size={13} />}
                  {copied === "config" ? "Copied" : "Copy"}
                </button>
              </div>
              <code
                data-testid="command-text"
                onCopy={() => startProvisioning()}
                className="block max-h-40 overflow-y-auto whitespace-pre-wrap break-all rounded-lg bg-[#1a1a1a] px-3 py-2.5 text-xs text-white"
              >
                {provisioningCommand}
              </code>
            </div>
            <div className="rounded-lg border border-[#e6e6e6] bg-[#fafafa] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#1a1a1a]">Mode command</p>
                  <p className="text-[11px] text-[#a3a3a3]">Only if the terminal says device mode is not allowed. Paste this after the configuration command, unplug the power cord for 10 seconds, restore power, then paste the configuration command again.</p>
                </div>
                <button
                  type="button"
                  data-testid="copy-mode"
                  onClick={() => handleCopy("mode")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#1a1a1a] bg-white px-2.5 py-1 text-[11px] font-bold text-[#1a1a1a] hover:bg-[#f4f4f4]"
                >
                  {copied === "mode" ? <Check size={12} /> : <Copy size={12} />}
                  {copied === "mode" ? "Copied" : "Copy"}
                </button>
              </div>
              <code
                data-testid="mode-text"
                className="block whitespace-pre-wrap break-all rounded-md bg-[#1a1a1a] px-2.5 py-1.5 text-[11px] text-white"
              >
                {modeCommand}
              </code>
            </div>

            {/* Address the router will use to reach this server */}
            <div data-testid="router-address" className="rounded-xl border border-[#e6e6e6] bg-white p-4">
              <p className="text-sm font-bold text-[#1a1a1a]">Address the router will use to reach this server</p>
              <p className="mt-1 text-xs text-[#737373]">
                The router downloads its setup from this address, so it must be one the router can reach, such as http://192.168.1.50:4000.
                If Windows asks whether to allow Node.js on private networks, allow it, or the paste will not download.
              </p>
              <input
                data-testid="origin-input"
                value={origin}
                onChange={(e) => {
                  setOrigin(e.target.value.trim().replace(/\/+$/, ""));
                  setScriptCheck(null);
                }}
                className="mt-3 h-11 w-full rounded-xl border border-[#d4d4d4] px-3 font-mono text-sm outline-none focus:border-[#1a1a1a]"
              />
              {suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map((item) => (
                    <button
                      key={item.origin}
                      type="button"
                      onClick={() => {
                        setOrigin(item.origin);
                        setScriptCheck(null);
                      }}
                      className="rounded-lg border border-[#d4d4d4] bg-white px-2.5 py-1 font-mono text-xs text-[#525252] hover:bg-[#f4f4f4]"
                    >
                      {item.origin} <span className="text-[#a3a3a3]">({item.interface})</span>
                    </button>
                  ))}
                </div>
              )}
              {originIsLocal && (
                <p data-testid="localhost-warning" className="mt-3 rounded-lg border border-[#f3f1ec] bg-[#f3f1ec] p-3 text-xs font-semibold text-[#1a1a1a]">
                  This address says localhost, which a router can never reach. Pick or type this computer&apos;s network address above before running the command.
                </p>
              )}
            </div>

            {/* Test the setup without a router */}
            <div data-testid="script-test" className="rounded-xl border border-[#e6e6e6] bg-white p-4">
              <p className="text-sm font-bold text-[#1a1a1a]">Test the setup before using a real router</p>
              <p className="mt-1 text-xs text-[#737373]">
                &quot;Check script&quot; builds the exact script the router would download and checks it for mistakes. &quot;Pretend a router ran it&quot; (testing only)
                completes the setup as if a router had checked in, so you can try the rest of the app.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="check-script"
                  onClick={runScriptCheck}
                  className="rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
                >
                  Check script
                </button>
                <button
                  type="button"
                  data-testid="simulate-router"
                  onClick={simulateRouter}
                  className="rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-xs font-bold text-[#525252] hover:bg-[#f4f4f4]"
                >
                  Pretend a router ran it
                </button>
                {scriptCheck?.script && (
                  <>
                    <button type="button" data-testid="show-script" onClick={() => setShowScript((v) => !v)} className="rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-xs font-bold text-[#525252] hover:bg-[#f4f4f4]">
                      {showScript ? "Hide script" : "Show script"}
                    </button>
                    <button type="button" data-testid="download-script" onClick={downloadScript} className="rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-xs font-bold text-[#525252] hover:bg-[#f4f4f4]">
                      Download .rsc
                    </button>
                  </>
                )}
              </div>
              {checkError && <p data-testid="check-error" className="mt-3 text-xs font-semibold text-[#1a1a1a]">{checkError}</p>}
              {scriptCheck && (
                <div data-testid="check-result" className="mt-3 rounded-lg border border-[#e6e6e6] p-3">
                  <p className={`text-sm font-bold ${scriptCheck.report.ok ? "text-[#1a1a1a]" : "text-[#1a1a1a]"}`}>
                    {scriptCheck.report.ok
                      ? `Script looks good — ${scriptCheck.report.stats.steps} steps, ${scriptCheck.report.stats.lines} lines.`
                      : `${scriptCheck.report.errors.length} problem${scriptCheck.report.errors.length === 1 ? "" : "s"} found.`}
                  </p>
                  {scriptCheck.report.errors.map((message) => (
                    <p key={message} className="mt-1 text-xs text-[#1a1a1a]">✗ {message}</p>
                  ))}
                  {scriptCheck.report.warnings.map((message) => (
                    <p key={message} className="mt-1 text-xs text-[#525252]">! {message}</p>
                  ))}
                </div>
              )}
              {showScript && scriptCheck?.script && (
                <pre data-testid="script-text" className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#1a1a1a] p-3 text-[11px] text-white">{scriptCheck.script}</pre>
              )}
            </div>

            {/* Live provisioning progress: circular percentage loader */}
            <div data-testid="provision-progress" className="flex flex-col items-center rounded-xl border border-[#f4f4f4] p-6 text-center">
              {(() => {
                const pct = Math.round((doneCount / provisionSteps.length) * 100);
                const R = 54;
                const C = 2 * Math.PI * R;
                return (
                  <div className="relative h-36 w-36">
                    <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                      <circle cx="64" cy="64" r={R} fill="none" stroke="#e6e6e6" strokeWidth="10" />
                      <circle
                        data-testid="provision-ring"
                        cx="64"
                        cy="64"
                        r={R}
                        fill="none"
                        stroke="#1a1a1a"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={C}
                        strokeDashoffset={C * (1 - pct / 100)}
                        style={{ transition: "stroke-dashoffset 600ms ease" }}
                      />
                    </svg>
                    <span
                      data-testid="provision-percent"
                      className="absolute inset-0 flex items-center justify-center text-3xl font-black text-[#1a1a1a]"
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })()}
              <p className="mt-4 text-sm font-bold text-[#1a1a1a]">
                {connected ? "Setup completed" : "Setting up your router"}
              </p>
              <p data-testid="provision-status" className="text-xs text-[#a3a3a3]">
                {!started
                  ? "Paste the configuration command on the router to begin."
                  : connected
                    ? "Your router is ready."
                    : "Please wait, this takes a moment…"}
              </p>
            </div>

            {!started && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#f4f4f4] p-4">
                <div>
                  <p className="text-sm font-bold text-[#1a1a1a]">Router Status Check</p>
                  <p className="text-xs text-[#a3a3a3]">Starts as soon as you copy the configuration command, or click to check now</p>
                </div>
                <button
                  type="button"
                  data-testid="check-now"
                  onClick={handleCheckNow}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-white hover:bg-[#111111]"
                >
                  <RefreshCw size={13} />
                  Check Now
                </button>
              </div>
            )}

            {!connected && (
              <p className="rounded-xl bg-[#f4f4f4] p-3 text-xs text-[#525252]">
                Paste the configuration command once. If the router says device mode is not allowed, use the mode command after it, unplug the power cord for 10 seconds, restore power, then paste the configuration command again.
              </p>
            )}

            {connected && (
              <div
                data-testid="provision-success"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f4f4f4] p-4"
              >
                <div>
                  <p className="text-sm font-bold text-[#1a1a1a]">
                    Router connected successfully. Thank you for using our system.
                  </p>
                  <p className="mt-1 text-sm text-[#1a1a1a]">
                    The captive portal settings open next, so you can set the login page customers see.
                  </p>
                  <p data-testid="open-countdown" className="mt-1 text-xs text-[#737373]">
                    {countdown !== null && countdown > 0
                      ? `Opening the captive portal settings in ${countdown}…`
                      : "Opening the captive portal settings…"}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="finish-setup"
                  onClick={handleFinish}
                  className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#111111]"
                >
                  Next
                </button>
              </div>
            )}

            {!connected && (
              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-xl border border-[#e6e6e6] bg-white px-5 py-3 text-sm font-bold text-[#525252] hover:bg-[#f4f4f4]"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-xl bg-[#d4d4d4] px-6 py-3 text-sm font-bold text-white"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
