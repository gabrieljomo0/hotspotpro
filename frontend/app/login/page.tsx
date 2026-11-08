"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  FormEvent,
  Suspense,
  useEffect,
  useState,
} from "react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { purgeLocalCache } from "@/components/dashboard/context/localCache";

type LinkInfo = { name: string; email: string } | null;

function LoginForm() {
  const searchParams = useSearchParams();
  // Sign-in is checked by the server (/api/auth/login) for everybody: the
  // owner, agents and installers. The agent list is only read here for the
  // "is agent sign-in switched on" policy, once the server has accepted them.
  const { actAsAgent } = useDashboard();

  // A per-agent link (/login?agent=<id>) leads to ONE agent's sign-in: the
  // email is filled in and locked, and only that agent's password is
  // accepted — nobody else (admin, installer, another agent) can use it.
  const agentLinkId = searchParams.get("agent");
  const agentLinkMode = Boolean(agentLinkId);
  const [linkedAgent, setLinkedAgent] = useState<LinkInfo>(null);
  const [linkChecked, setLinkChecked] = useState(false);

  useEffect(() => {
    if (!agentLinkId) return;
    let cancelled = false;
    fetch(`/api/auth/agent-link/${encodeURIComponent(agentLinkId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setLinkedAgent(data?.found ? { name: data.name || "there", email: data.email } : null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLinkChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [agentLinkId]);
  const storeReady = linkChecked;

  const registerMode =
    searchParams.get("mode") === "register";

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [form, setForm] = useState({
    name: "",
    businessName: "",
    email: "",
    password: "",
    confirmPassword: "",
    setupCode: "",
  });

  // Asks the server whether the owner account still has to be created (first visit
  // to a new site) and whether it needs the server's setup code.
  const [setup, setSetup] = useState<{ firstAccount: boolean; signupOpen: boolean; needsSetupCode: boolean } | null>(null);
  useEffect(() => {
    if (agentLinkId) return;
    let cancelled = false;
    fetch("/api/auth/setup")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) setSetup({ firstAccount: Boolean(data.firstAccount), signupOpen: data.signupOpen !== false, needsSetupCode: Boolean(data.needsSetupCode) });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [agentLinkId]);
  const signupClosed = registerMode && setup?.signupOpen === false;

  // The website's guard sent this visitor back here: say why instead of a silent bounce.
  const redirectReason = searchParams.get("reason");
  const reasonMessage =
    redirectReason === "backend-down"
      ? "The website cannot reach the HotspotPro backend. Make sure the backend window is running (it shows \"HotspotPro backend is running\") and try again."
      : redirectReason === "suspended"
        ? "This account has been suspended. Contact the platform administrator."
        : redirectReason === "rejected"
        ? "You signed in, but the server did not accept your login cookie. Sign in again; if this repeats, clear this site's cookies and try once more."
        : null;

  // After a successful sign-in/sign-up, confirm the browser really kept the login
  // before moving on, so a lost cookie shows a clear message instead of a loop.
  async function sessionWorks() {
    try {
      const check = await fetch("/api/auth/me", { cache: "no-store" });
      const data = check.ok ? await check.json() : null;
      if (data?.authenticated) return true;
      setError(
        "You were signed in, but your browser did not keep the login (the next page cannot see it). Use the same address you opened (for example http://localhost:3000), allow cookies for this site, then try again.",
      );
      return false;
    } catch {
      setError("Signed in, but the website could not reach the backend to confirm it. Check that the backend window is still running.");
      return false;
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      if (registerMode) {
        if (form.password.length < 8) {
          setError("The password must be at least 8 characters.");
          return;
        }
        if (form.password !== form.confirmPassword) {
          setError("The two passwords are not the same.");
          return;
        }
        const created = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            businessName: form.businessName,
            email: form.email,
            password: form.password,
            setupCode: form.setupCode || undefined,
          }),
        });
        const createdResult = await created.json().catch(() => ({}));
        if (!created.ok) {
          setError(createdResult.message ?? "Could not create the account.");
          return;
        }
        try {
          window.sessionStorage.setItem("hotspotpro:currencyCheck", "1");
        } catch {
          // Storage blocked — the check is simply skipped.
        }
        if (!(await sessionWorks())) return;
        purgeLocalCache();
        window.location.assign("/dashboards");
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agentLinkMode ? undefined : form.email,
          agentId: agentLinkId ?? undefined,
          password: form.password,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "The email address or password is incorrect.");
        return;
      }

      if (!(await sessionWorks())) return;
      purgeLocalCache(); // never show or upload another account's cached data

      // The server has signed this visitor in. The page is reloaded (instead
      // of client-side navigation) so the app starts fresh with the saved
      // data from the server for this user.
      const requested = searchParams.get("next");
      // Only same-site paths (never another website) are accepted.
      const next = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : null;

      if (result.role === "agent") {
        actAsAgent(result.agentId);
        window.location.assign(next || `/agent-portal/${result.agentId}`);
        return;
      }

      if (result.role === "installer") {
        window.location.assign(next || `/installer-portal/${result.installerId}`);
        return;
      }

      // Tell the dashboard an admin just signed in, so it can check whether
      // the currency still suits where they are (see CurrencyGate).
      try {
        window.sessionStorage.setItem("hotspotpro:currencyCheck", "1");
      } catch {
        // Storage blocked — the check is simply skipped.
      }

      window.location.assign(next || "/dashboards");
    } catch {
      setError(
        "Unable to connect to the login service.",
      );
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-3 text-base text-[#0f172a] outline-none focus:border-[#2563eb]";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f5f9] px-5 py-10">
      <div className="w-full max-w-sm rounded-lg border border-[#e2e8f0] bg-white p-8">
        <p className="text-lg font-bold text-[#0f172a]">HotspotPro</p>

        <h1 className="mt-6 text-2xl font-bold text-[#0f172a]">
          {registerMode
            ? signupClosed
              ? "Sign-up is closed"
              : setup?.firstAccount
                ? "Create your account"
                : "Create your account"
            : agentLinkMode
              ? linkedAgent
                ? `Hi ${linkedAgent.name.split(" ")[0]}`
                : "Agent sign in"
              : "Sign in"}
        </h1>

        {agentLinkMode && (
          <p className="mt-1 text-sm text-[#64748b]">Enter your password to continue.</p>
        )}

        {agentLinkMode && storeReady && !linkedAgent && (
          <div
            data-testid="agent-link-invalid"
            className="mt-5 rounded-lg border border-red-200 bg-[#fef2f2] p-3 text-sm text-[#b91c1c]"
          >
            This link isn&apos;t valid on this device. Ask your admin for a new one.
          </div>
        )}

        {registerMode && !signupClosed && (
          <p className="mt-1 text-sm text-[#64748b]">
            {setup?.firstAccount
              ? "This is the first sign-up on this site, so this account becomes the super admin. You still sign in to your normal dashboard; the super admin area is the link in the landing page footer."
              : "Create your own WiFi business account. Your routers, vouchers, agents and payments stay completely separate from everyone else's."}
          </p>
        )}

        {reasonMessage && !error && (
          <p className="mt-5 rounded-lg bg-[#fef2f2] p-3 text-sm text-[#b91c1c]">{reasonMessage}</p>
        )}

        {signupClosed && (
          <div className="mt-5 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] p-3 text-sm text-[#475569]">
            New sign-ups are switched off on this site. Sign in if you already have an account, or ask the administrator
            to create one for you.
          </div>
        )}

        {!registerMode && !agentLinkMode && setup?.firstAccount && (
          <div className="mt-5 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] p-3 text-sm text-[#475569]">
            No account exists yet.{" "}
            <Link href="/login?mode=register" className="font-semibold text-[#2563eb] hover:underline">
              Create your account
            </Link>{" "}
            to get started.
          </div>
        )}

        <form onSubmit={handleSubmit} className={`mt-6 space-y-4 ${signupClosed ? "hidden" : ""}`}>
          {registerMode && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm text-[#475569]">Full name</span>
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className={input}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-[#475569]">Business name (optional)</span>
                <input
                  autoComplete="organization"
                  value={form.businessName}
                  onChange={(event) => setForm({ ...form, businessName: event.target.value })}
                  className={input}
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1 block text-sm text-[#475569]">Email</span>
            <input
              required
              type="email"
              data-testid="login-email"
              readOnly={agentLinkMode}
              value={agentLinkMode ? linkedAgent?.email ?? "" : form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={`${input} ${agentLinkMode ? "bg-[#f8fafc] text-[#64748b]" : ""}`}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-[#475569]">Password</span>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                data-testid="login-password"
                autoComplete={registerMode ? "new-password" : "current-password"}
                minLength={registerMode ? 8 : undefined}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className={`${input} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                aria-label="Show or hide password"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {registerMode && (
            <label className="block">
              <span className="mb-1 block text-sm text-[#475569]">Confirm password</span>
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                className={input}
              />
              <span className="mt-1 block text-xs text-[#94a3b8]">At least 8 characters.</span>
            </label>
          )}

          {registerMode && setup?.needsSetupCode && (
            <label className="block">
              <span className="mb-1 block text-sm text-[#475569]">Setup code</span>
              <input
                required
                value={form.setupCode}
                onChange={(event) => setForm({ ...form, setupCode: event.target.value })}
                className={input}
              />
              <span className="mt-1 block text-xs text-[#94a3b8]">
                The HOTSPOTPRO_SETUP_CODE the server was started with.
              </span>
            </label>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-[#fef2f2] p-3 text-sm text-[#b91c1c]">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (agentLinkMode && !linkedAgent)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-3 text-base font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {registerMode ? "Create account" : "Sign in"}
          </button>
        </form>

        {!agentLinkMode && (
          <p className="mt-5 text-center text-sm text-[#64748b]">
            {registerMode ? "Have an account? " : setup?.signupOpen === false ? "" : "No account? "}
            {(registerMode || setup?.signupOpen !== false) && (
              <Link
                href={registerMode ? "/login" : "/login?mode=register"}
                className="font-semibold text-[#2563eb] hover:underline"
              >
                {registerMode ? "Sign in" : "Create one"}
              </Link>
            )}
          </p>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9]">
          <Loader2 className="h-9 w-9 animate-spin text-[#2563eb]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}