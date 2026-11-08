"use client";

// A working copy of the customer login page inside a phone frame. It reads
// the settings being edited, so every change shows up at once, and every
// button does what it will do for a real customer:
//   - log in with a voucher (checked against your real vouchers)
//   - pick / buy a package online (mobile-money steps)
//   - start a free trial (one click or phone verification, with limits)
//   - apply as a reseller, send feedback
//   - connected screen with a running timer and the redirect
// It is a sandbox: nothing here uses up a real voucher or saves any data.
// "Reset" puts the page back to a fresh device.

import { localizeAmountString } from "@/components/dashboard/shared/currency";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  KeyRound,
  UserRound,
  Ticket,
  ShoppingCart,
  UsersRound,
  MessageSquareText,
  Smartphone,
  RotateCcw,
  ArrowLeft,
  Check,
  Wifi,
  Gift,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type { CaptivePortalConfig, Package } from "@/components/dashboard/shared/types";
import { TEMPLATES } from "./constants";

type Screen = "login" | "buy" | "pay" | "bought" | "otp" | "reseller" | "feedback" | "sent" | "connected";

type Session = { packageName: string; validity: string; down: string; up: string; devices: number; source: string };

const COOLDOWN_TEXT = "You have used your free trials. You can try again after the cooldown (24 hours).";

function digits(value: string) {
  return value.replace(/\D/g, "");
}

// 0241234567, 241234567 and +233241234567 all mean the same number.
function normalizePhone(value: string) {
  let d = digits(value);
  if (d.startsWith("233")) d = d.slice(3);
  if (d.length === 9) d = `0${d}`;
  return d;
}

function validPhone(value: string) {
  const d = normalizePhone(value);
  return d.length === 10 && d.startsWith("0");
}

function networkOf(value: string) {
  const prefix = normalizePhone(value).slice(0, 3);
  if (["024", "054", "055", "059", "053"].includes(prefix)) return "MTN MoMo";
  if (["020", "050"].includes(prefix)) return "Telecel Cash";
  if (["026", "056", "027", "057"].includes(prefix)) return "AirtelTigo Money";
  return "";
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function clock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function LivePreview({
  config,
  businessName,
}: {
  config: CaptivePortalConfig;
  businessName: string;
}) {
  const template = TEMPLATES.find((t) => t.key === config.template) ?? TEMPLATES[0];
  const { packages, vouchers } = useDashboard();
  const displayName = config.businessNameOverride.trim() || businessName;
  const displayLogo = config.logoText.trim() || displayName.slice(0, 2).toUpperCase();
  const visiblePackages = packages.filter((p) => p.status === "Active").slice(0, 3);
  const shownPackages = visiblePackages.length > 0 ? visiblePackages : packages.slice(0, 3);

  const [screen, setScreen] = useState<Screen>("login");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [redirectIn, setRedirectIn] = useState<number | null>(null);

  // Things that belong to "this device" and survive going back to the login page.
  const [trialsUsed, setTrialsUsed] = useState(0);
  const [activated, setActivated] = useState<string[]>([]);
  const [boughtCodes, setBoughtCodes] = useState<Array<{ code: string; password: string; packageName: string }>>([]);

  // Buy flow
  const [buyPackage, setBuyPackage] = useState<Package | null>(null);
  const [buyPhone, setBuyPhone] = useState("");
  const [otherDevice, setOtherDevice] = useState(false);
  const [deviceMac, setDeviceMac] = useState("");
  const [paidCode, setPaidCode] = useState<{ code: string; password: string } | null>(null);

  // Trial verification
  const [otpSent, setOtpSent] = useState("");
  const [otpEntered, setOtpEntered] = useState("");

  // Reseller / feedback
  const [resellerName, setResellerName] = useState("");
  const [resellerPhone, setResellerPhone] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sentMessage, setSentMessage] = useState("");

  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  // Running clock while connected, and the redirect countdown.
  useEffect(() => {
    if (screen !== "connected") return;
    setElapsed(0);
    const tick = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(tick);
  }, [screen]);
  useEffect(() => {
    if (screen !== "connected" || !config.redirectUrlAfterLogin.trim()) {
      setRedirectIn(null);
      return;
    }
    setRedirectIn(3);
    const tick = window.setInterval(() => setRedirectIn((value) => (value === null || value <= 0 ? 0 : value - 1)), 1000);
    return () => window.clearInterval(tick);
  }, [screen, config.redirectUrlAfterLogin]);

  function reset() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setScreen("login");
    setCode("");
    setPassword("");
    setPhone("");
    setError("");
    setNotice("");
    setSession(null);
    setTrialsUsed(0);
    setActivated([]);
    setBoughtCodes([]);
    setBuyPackage(null);
    setBuyPhone("");
    setOtherDevice(false);
    setDeviceMac("");
    setPaidCode(null);
    setOtpSent("");
    setOtpEntered("");
    setSentMessage("");
  }

  function goLogin() {
    setError("");
    setScreen("login");
  }

  function connect(packageName: string, source: string) {
    const pkg = packages.find((p) => p.name === packageName);
    setSession({
      packageName,
      validity: pkg?.validity ?? "",
      down: pkg?.download ?? "",
      up: pkg?.upload ?? "",
      devices: pkg?.devices ?? 1,
      source,
    });
    setError("");
    setScreen("connected");
  }

  function phoneProblem(): string {
    if (config.phoneCollectionOnActivation === "Required" && !phone.trim()) return "Enter your phone number to continue.";
    if (phone.trim() && !validPhone(phone)) return "That phone number doesn't look right. Use 10 digits, like 024 123 4567.";
    return "";
  }

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    const typed = code.trim().toUpperCase();
    if (!typed) {
      setError(config.authMethod === "PIN Only" ? "Enter your PIN." : "Enter your voucher username.");
      return;
    }
    if (config.authMethod !== "PIN Only" && !password.trim()) {
      setError("Enter your voucher password.");
      return;
    }
    const bad = phoneProblem();
    if (bad) {
      setError(bad);
      return;
    }

    const bought = boughtCodes.find((b) => b.code === typed);
    if (bought) {
      if (config.authMethod !== "PIN Only" && bought.password !== password.trim()) {
        setError("The password is incorrect.");
        return;
      }
      setActivated((list) => (list.includes(typed) ? list : [...list, typed]));
      connect(bought.packageName, "Bought online");
      return;
    }

    const voucher = vouchers.find((v) => v.code.toUpperCase() === typed);
    if (!voucher) {
      setError("That voucher wasn't found. Check it and try again.");
      return;
    }
    if (config.authMethod !== "PIN Only" && voucher.password !== null && voucher.password !== password.trim()) {
      setError("The password is incorrect.");
      return;
    }
    if (voucher.status === "Expired") {
      setError("This voucher has expired.");
      return;
    }
    if (voucher.status === "Used" && !activated.includes(typed)) {
      setError("This voucher has already been used on another device.");
      return;
    }
    setActivated((list) => (list.includes(typed) ? list : [...list, typed]));
    connect(voucher.packageName, "Voucher");
  }

  // ---- Free trial -------------------------------------------------------
  const trialLimit = Math.max(1, config.freeTrialsPerDevice || 1);
  const trialPackage = packages.find((p) => p.freeTrial);

  function startTrial() {
    setError("");
    setNotice("");
    if (trialsUsed >= trialLimit) {
      setError(config.freeTrialCooldownEnabled ? COOLDOWN_TEXT : config.freeTrialBlockMessage || "Free trial is no longer available on this device.");
      return;
    }
    if (config.freeTrialMode === "Phone verification") {
      setScreen("otp");
      return;
    }
    grantTrial();
  }

  function grantTrial() {
    setTrialsUsed((n) => n + 1);
    const pkg = trialPackage;
    setSession({
      packageName: pkg ? pkg.name : "Free Trial",
      validity: pkg ? pkg.validity : "10 minutes",
      down: pkg?.download ?? "2 Mbps",
      up: pkg?.upload ?? "1 Mbps",
      devices: 1,
      source: "Free trial",
    });
    setScreen("connected");
  }

  function sendOtp() {
    setError("");
    if (!validPhone(phone)) {
      setError("Enter a valid phone number to get your code.");
      return;
    }
    setOtpSent(String(1000 + Math.floor(Math.random() * 9000)));
    setOtpEntered("");
  }

  function verifyOtp() {
    if (otpEntered.trim() !== otpSent) {
      setError("That code is not right. Try again.");
      return;
    }
    setError("");
    setOtpSent("");
    grantTrial();
  }

  // ---- Buying -----------------------------------------------------------
  function openBuy(pkg: Package) {
    setBuyPackage(pkg);
    setError("");
    setNotice("");
    setPaidCode(null);
    setScreen("buy");
  }

  function pay(event: FormEvent) {
    event.preventDefault();
    if (!buyPackage) return;
    if (!validPhone(buyPhone)) {
      setError("Enter the mobile-money number to pay with.");
      return;
    }
    if (otherDevice && !/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(deviceMac.trim())) {
      setError("Enter the other device's MAC address, like A4:C3:F0:12:34:56.");
      return;
    }
    setError("");
    setScreen("pay");
    later(() => {
      const fresh = { code: randomCode(), password: randomCode().slice(0, 4) };
      setPaidCode(fresh);
      setBoughtCodes((list) => [...list, { ...fresh, packageName: buyPackage.name }]);
      setScreen("bought");
    }, 1800);
  }

  function connectBought() {
    if (!paidCode || !buyPackage) return;
    if (otherDevice) {
      setSentMessage(`Done. ${buyPackage.name} is active on the device ${deviceMac.trim().toUpperCase()}.`);
      setScreen("sent");
      return;
    }
    setActivated((list) => [...list, paidCode.code]);
    connect(buyPackage.name, "Bought online");
  }

  // ---- Reseller / feedback ---------------------------------------------
  function sendReseller(event: FormEvent) {
    event.preventDefault();
    if (!resellerName.trim() || !validPhone(resellerPhone)) {
      setError("Enter your name and a valid phone number.");
      return;
    }
    setError("");
    setSentMessage("Thanks! Your reseller application was sent. You'll get an SMS once it's reviewed.");
    setScreen("sent");
  }

  function sendFeedback(event: FormEvent) {
    event.preventDefault();
    if (!feedback.trim()) {
      setError("Write a few words first.");
      return;
    }
    setError("");
    setFeedback("");
    setSentMessage("Thank you for your feedback.");
    setScreen("sent");
  }

  // ---- Pieces -----------------------------------------------------------
  const buttonColor = `${template.color} hover:opacity-90`;
  const fieldClass = "flex items-center gap-2 rounded-xl border border-[#e6e6e6] bg-white px-3 py-2.5";
  const inputClass = "w-full min-w-0 bg-transparent text-sm text-[#1a1a1a] outline-none placeholder:text-[#a3a3a3]";
  const trialButton = config.freeTrialEnabled && (
    <button
      type="button"
      data-testid="preview-free-trial"
      onClick={startTrial}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#f4f4f4] py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#e6e6e6]"
    >
      <Gift size={14} />
      {config.freeTrialButtonText.trim() || "Free trial"}
    </button>
  );

  const back = (
    <button
      type="button"
      onClick={goLogin}
      className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-[#737373] hover:text-[#1a1a1a]"
    >
      <ArrowLeft size={12} /> Back
    </button>
  );

  const errorBox = error && (
    <p data-testid="preview-error" className="rounded-lg bg-[#f3f1ec] px-3 py-2 text-xs font-semibold text-[#1a1a1a]">
      {error}
    </p>
  );

  return (
    <div>
      <div
        data-testid="live-preview"
        className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-4 border-[#1a1a1a] bg-white bg-cover bg-center shadow-xl"
        style={config.backgroundImageDataUrl ? { backgroundImage: `url(${config.backgroundImageDataUrl})` } : undefined}
      >
        <div
          className={`px-5 pb-8 pt-6 text-center text-white ${template.color}`}
          style={{ backgroundColor: config.primaryColorOverride || undefined }}
        >
          {config.logoImageDataUrl ? (
            <img
              src={config.logoImageDataUrl}
              alt="Logo"
              className="mx-auto mb-3 rounded-full border-2 border-white/40 object-cover"
              style={{ width: config.logoSizePx ?? 56, height: config.logoSizePx ?? 56 }}
            />
          ) : (
            <div
              className="mx-auto mb-3 flex items-center justify-center rounded-full bg-white/20 font-black"
              style={{
                width: config.logoSizePx ?? 56,
                height: config.logoSizePx ?? 56,
                fontSize: (config.logoSizePx ?? 56) / 2.4,
              }}
            >
              {displayLogo}
            </div>
          )}
          <p data-testid="preview-name" className="text-lg font-black">{displayName}</p>
          <p className="text-xs opacity-80">
            {screen === "connected" ? "You are online" : "Connect to continue browsing"}
          </p>
        </div>

        <div
          className={`space-y-4 p-5 ${config.backgroundImageDataUrl ? "bg-white/90" : ""}`}
          style={{ fontFamily: config.portalFont }}
        >
          {/* ---------------- Login ---------------- */}
          {screen === "login" && (
            <>
              {config.freeTrialEnabled && config.freeTrialButtonPosition === "Top" && trialButton}

              <form onSubmit={handleLogin} className="space-y-2" data-testid="preview-login-form">
                {config.authMethod === "PIN Only" ? (
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-[#737373]">Enter your PIN</p>
                    <div className={fieldClass}>
                      <KeyRound size={15} className="text-[#a3a3a3]" />
                      <input
                        data-testid="preview-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        inputMode="text"
                        autoComplete="off"
                        placeholder="PIN / voucher code"
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={fieldClass}>
                      <UserRound size={15} className="text-[#a3a3a3]" />
                      <input
                        data-testid="preview-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        autoComplete="off"
                        placeholder="Username"
                        className={inputClass}
                      />
                    </div>
                    <div className={fieldClass}>
                      <KeyRound size={15} className="text-[#a3a3a3]" />
                      <input
                        data-testid="preview-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="off"
                        placeholder="Password"
                        className={inputClass}
                      />
                    </div>
                  </>
                )}

                {config.phoneCollectionOnActivation !== "Off" && (
                  <div className={fieldClass}>
                    <Smartphone size={15} className="text-[#a3a3a3]" />
                    <input
                      data-testid="preview-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      placeholder={`Phone number ${config.phoneCollectionOnActivation === "Required" ? "(required)" : "(optional)"}`}
                      className={inputClass}
                    />
                  </div>
                )}

                {config.showDeviceMac && (
                  <div className="rounded-lg bg-[#f7f7f7] px-3 py-2 font-mono text-[10px] text-[#737373]">
                    Device: A4:C3:F0:XX:XX:XX
                  </div>
                )}

                {errorBox}

                <button
                  type="submit"
                  data-testid="preview-connect"
                  className={`w-full rounded-xl py-2.5 text-sm font-bold text-white ${buttonColor}`}
                >
                  Connect
                </button>
              </form>

              {config.freeTrialEnabled && config.freeTrialButtonPosition !== "Top" && trialButton}

              {config.adsEnabled && (
                <div data-testid="preview-ad" className="rounded-lg bg-[#f4f4f4] px-3 py-3 text-center text-[10px] text-[#737373]">
                  <span className="font-bold uppercase tracking-wide text-[#a3a3a3]">Sponsored</span>
                  <p className="mt-0.5 text-xs font-semibold text-[#1a1a1a]">Your advert shows here</p>
                </div>
              )}

              {config.showPackages && shownPackages.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#737373]">
                    <Ticket size={12} /> Packages
                  </p>
                  <div className="space-y-1.5">
                    {shownPackages.map((pkg) => (
                      <button
                        type="button"
                        key={pkg.id}
                        data-testid="preview-package"
                        onClick={() => {
                          if (config.allowOnlinePurchases) openBuy(pkg);
                          else {
                            setError("");
                            setNotice(
                              config.physicalVoucherLocation.trim()
                                ? `Buy a voucher for ${pkg.name} at: ${config.physicalVoucherLocation}`
                                : `Ask the attendant for a ${pkg.name} voucher.`,
                            );
                          }
                        }}
                        className="block w-full rounded-lg bg-[#f7f7f7] px-3 py-2 text-left text-xs hover:bg-[#f4f4f4]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#1a1a1a]">
                            {pkg.name}
                            {config.showPackageTime && <span className="ml-1 font-normal text-[#a3a3a3]">· {pkg.validity}</span>}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1a1a1a]">{localizeAmountString(pkg.price)}</span>
                            {config.allowOnlinePurchases && (
                              <span className="rounded-full bg-[#1a1a1a] px-1.5 py-0.5 text-[9px] font-bold text-white">Buy</span>
                            )}
                          </span>
                        </div>
                        {config.showPackageDeviceLimits && (
                          <p className="mt-0.5 text-[10px] text-[#a3a3a3]">Up to {pkg.devices} device{pkg.devices === 1 ? "" : "s"}</p>
                        )}
                      </button>
                    ))}
                  </div>
                  {notice && (
                    <p data-testid="preview-notice" className="mt-2 rounded-lg bg-[#f4f4f4] px-3 py-2 text-[11px] text-[#525252]">
                      {notice}
                    </p>
                  )}
                </div>
              )}

              {config.physicalVoucherLocation.trim() && (
                <p className="rounded-lg bg-[#f4f4f4] px-3 py-2 text-[10px] text-[#525252]">
                  📍 {config.physicalVoucherLocation}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {config.showBuyOnlineVouchers && (
                  <button
                    type="button"
                    data-testid="preview-buy-online"
                    onClick={() => (shownPackages[0] ? openBuy(shownPackages[0]) : undefined)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10px] font-bold text-[#1a1a1a] hover:bg-[#e6e6e6]"
                  >
                    <ShoppingCart size={10} /> Buy Voucher Online
                  </button>
                )}
                {config.showResellerApplication && (
                  <button
                    type="button"
                    data-testid="preview-reseller"
                    onClick={() => {
                      setError("");
                      setScreen("reseller");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10px] font-bold text-[#1a1a1a] hover:bg-[#e6e6e6]"
                  >
                    <UsersRound size={10} /> Apply as Reseller
                  </button>
                )}
                {config.showFeedbackButton && (
                  <button
                    type="button"
                    data-testid="preview-feedback"
                    onClick={() => {
                      setError("");
                      setScreen("feedback");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10px] font-bold text-[#525252] hover:bg-[#e6e6e6]"
                  >
                    <MessageSquareText size={10} /> Feedback
                  </button>
                )}
              </div>
            </>
          )}

          {/* ---------------- Free-trial phone check ---------------- */}
          {screen === "otp" && (
            <div className="space-y-3" data-testid="preview-otp">
              {back}
              <p className="text-sm font-bold text-[#1a1a1a]">Verify your phone</p>
              <div className={fieldClass}>
                <Smartphone size={15} className="text-[#a3a3a3]" />
                <input
                  data-testid="preview-otp-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="Phone number"
                  className={inputClass}
                />
              </div>
              {!otpSent ? (
                <button type="button" data-testid="preview-otp-send" onClick={sendOtp} className={`w-full rounded-xl py-2.5 text-sm font-bold text-white ${buttonColor}`}>
                  Send me a code
                </button>
              ) : (
                <>
                  <p data-testid="preview-otp-hint" className="rounded-lg bg-[#f4f4f4] px-3 py-2 text-[11px] text-[#525252]">
                    An SMS would be sent to {phone}. Preview code: <strong>{otpSent}</strong>
                  </p>
                  <div className={fieldClass}>
                    <KeyRound size={15} className="text-[#a3a3a3]" />
                    <input
                      data-testid="preview-otp-code"
                      value={otpEntered}
                      onChange={(e) => setOtpEntered(e.target.value)}
                      inputMode="numeric"
                      placeholder="4-digit code"
                      className={inputClass}
                    />
                  </div>
                  <button type="button" data-testid="preview-otp-verify" onClick={verifyOtp} className={`w-full rounded-xl py-2.5 text-sm font-bold text-white ${buttonColor}`}>
                    Verify and start trial
                  </button>
                </>
              )}
              {errorBox}
            </div>
          )}

          {/* ---------------- Buy ---------------- */}
          {screen === "buy" && buyPackage && (
            <form onSubmit={pay} className="space-y-3" data-testid="preview-buy">
              {back}
              <div className="rounded-lg bg-[#f7f7f7] px-3 py-2 text-xs">
                <p className="font-bold text-[#1a1a1a]">{buyPackage.name}</p>
                <p className="text-[#737373]">
                  {buyPackage.validity} · {localizeAmountString(buyPackage.price)}
                </p>
              </div>
              <div className={fieldClass}>
                <Smartphone size={15} className="text-[#a3a3a3]" />
                <input
                  data-testid="preview-buy-phone"
                  value={buyPhone}
                  onChange={(e) => setBuyPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="Mobile-money number"
                  className={inputClass}
                />
              </div>
              {networkOf(buyPhone) && <p className="text-[11px] font-semibold text-[#525252]">Pay with {networkOf(buyPhone)}</p>}
              {config.buyForOtherDevice && (
                <label className="flex items-center gap-2 text-[11px] text-[#525252]">
                  <input
                    type="checkbox"
                    data-testid="preview-other-device"
                    checked={otherDevice}
                    onChange={(e) => setOtherDevice(e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  Buy for a TV or another device
                </label>
              )}
              {config.buyForOtherDevice && otherDevice && (
                <div className={fieldClass}>
                  <Wifi size={15} className="text-[#a3a3a3]" />
                  <input
                    data-testid="preview-device-mac"
                    value={deviceMac}
                    onChange={(e) => setDeviceMac(e.target.value)}
                    placeholder="Device MAC (A4:C3:F0:12:34:56)"
                    className={inputClass}
                  />
                </div>
              )}
              {errorBox}
              <button type="submit" data-testid="preview-pay" className={`w-full rounded-xl py-2.5 text-sm font-bold text-white ${buttonColor}`}>
                Pay {localizeAmountString(buyPackage.price)}
              </button>
            </form>
          )}

          {screen === "pay" && (
            <div className="space-y-2 py-4 text-center" data-testid="preview-paying">
              <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-4 border-[#e6e6e6] border-t-[#1a1a1a]" />
              <p className="text-sm font-bold text-[#1a1a1a]">Approve the payment on your phone</p>
              <p className="text-xs text-[#737373]">Waiting for {networkOf(buyPhone) || "mobile money"} to confirm…</p>
            </div>
          )}

          {screen === "bought" && paidCode && buyPackage && (
            <div className="space-y-3 text-center" data-testid="preview-bought">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1a1a] text-white">
                <Check size={20} />
              </span>
              <p className="text-sm font-bold text-[#1a1a1a]">Payment received</p>
              <div className="rounded-lg bg-[#f7f7f7] px-3 py-2 text-left text-xs">
                <p>
                  Voucher: <strong data-testid="preview-paid-code" className="font-mono">{paidCode.code}</strong>
                </p>
                {config.authMethod !== "PIN Only" && (
                  <p>
                    Password: <strong data-testid="preview-paid-password" className="font-mono">{paidCode.password}</strong>
                  </p>
                )}
                <p className="mt-1 text-[10px] text-[#a3a3a3]">A copy would also be sent to {buyPhone} by SMS.</p>
              </div>
              <button type="button" data-testid="preview-connect-bought" onClick={connectBought} className={`w-full rounded-xl py-2.5 text-sm font-bold text-white ${buttonColor}`}>
                {otherDevice ? "Activate on that device" : "Connect now"}
              </button>
            </div>
          )}

          {/* ---------------- Reseller ---------------- */}
          {screen === "reseller" && (
            <form onSubmit={sendReseller} className="space-y-3" data-testid="preview-reseller-form">
              {back}
              <p className="text-sm font-bold text-[#1a1a1a]">Apply as a reseller</p>
              <div className={fieldClass}>
                <UserRound size={15} className="text-[#a3a3a3]" />
                <input data-testid="preview-reseller-name" value={resellerName} onChange={(e) => setResellerName(e.target.value)} placeholder="Full name" className={inputClass} />
              </div>
              <div className={fieldClass}>
                <Smartphone size={15} className="text-[#a3a3a3]" />
                <input data-testid="preview-reseller-phone" value={resellerPhone} onChange={(e) => setResellerPhone(e.target.value)} inputMode="tel" placeholder="Phone number" className={inputClass} />
              </div>
              {errorBox}
              <button type="submit" data-testid="preview-reseller-send" className={`w-full rounded-xl py-2.5 text-sm font-bold text-white ${buttonColor}`}>
                Send application
              </button>
            </form>
          )}

          {/* ---------------- Feedback ---------------- */}
          {screen === "feedback" && (
            <form onSubmit={sendFeedback} className="space-y-3" data-testid="preview-feedback-form">
              {back}
              <p className="text-sm font-bold text-[#1a1a1a]">Tell us how we're doing</p>
              <textarea
                data-testid="preview-feedback-text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="Your message"
                className="w-full rounded-xl border border-[#e6e6e6] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] outline-none placeholder:text-[#a3a3a3]"
              />
              {errorBox}
              <button type="submit" data-testid="preview-feedback-send" className={`w-full rounded-xl py-2.5 text-sm font-bold text-white ${buttonColor}`}>
                Send
              </button>
            </form>
          )}

          {screen === "sent" && (
            <div className="space-y-3 py-2 text-center" data-testid="preview-sent">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1a1a] text-white">
                <Check size={20} />
              </span>
              <p className="text-sm font-semibold text-[#1a1a1a]">{sentMessage}</p>
              <button type="button" onClick={goLogin} className="text-xs font-bold text-[#1a1a1a] hover:underline">
                Back to login
              </button>
            </div>
          )}

          {/* ---------------- Connected ---------------- */}
          {screen === "connected" && session && (
            <div className="space-y-3 text-center" data-testid="preview-connected">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1a1a] text-white">
                <Wifi size={22} />
              </span>
              <p className="text-base font-black text-[#1a1a1a]">Connected</p>
              <div className="rounded-lg bg-[#f7f7f7] px-3 py-2 text-left text-xs text-[#525252]">
                <p>
                  Package: <strong data-testid="preview-session-package" className="text-[#1a1a1a]">{session.packageName}</strong>
                </p>
                {session.validity && <p>Valid for: {session.validity}</p>}
                {(session.down || session.up) && (
                  <p>
                    Speed: {session.down} down / {session.up} up
                  </p>
                )}
                <p>Devices: up to {session.devices}</p>
                <p>Via: {session.source}</p>
              </div>
              <p data-testid="preview-timer" className="font-mono text-lg font-bold text-[#1a1a1a]">{clock(elapsed)}</p>
              {config.redirectUrlAfterLogin.trim() && (
                <p data-testid="preview-redirect" className="rounded-lg bg-[#f4f4f4] px-3 py-2 text-[11px] text-[#525252]">
                  {redirectIn !== null && redirectIn > 0
                    ? `Taking you to ${config.redirectUrlAfterLogin.trim()} in ${redirectIn}…`
                    : `Redirected to ${config.redirectUrlAfterLogin.trim()} (a real phone would leave this page now).`}
                </p>
              )}
              {config.adsEnabled && (
                <div className="rounded-lg bg-[#f4f4f4] px-3 py-3 text-center text-[10px] text-[#737373]">
                  <span className="font-bold uppercase tracking-wide text-[#a3a3a3]">Sponsored</span>
                  <p className="mt-0.5 text-xs font-semibold text-[#1a1a1a]">Your advert shows here</p>
                </div>
              )}
              <button
                type="button"
                data-testid="preview-disconnect"
                onClick={() => {
                  setSession(null);
                  setCode("");
                  setPassword("");
                  goLogin();
                }}
                className="w-full rounded-xl bg-[#f4f4f4] py-2.5 text-sm font-bold text-[#1a1a1a] hover:bg-[#e6e6e6]"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-[#737373]">
        <span>Try it — nothing here is saved or uses a real voucher.</span>
        <button
          type="button"
          data-testid="preview-reset"
          onClick={reset}
          className="inline-flex items-center gap-1 font-bold text-[#1a1a1a] hover:underline"
        >
          <RotateCcw size={11} /> Reset
        </button>
      </div>
    </div>
  );
}
