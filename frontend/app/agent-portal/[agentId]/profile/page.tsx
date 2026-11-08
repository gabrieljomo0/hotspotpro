"use client";

import { use, useState } from "react";
import {
  User,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  IdCard,
  Camera,
  Lock,
  Check,
  AlertTriangle,
  CircleCheck,
  Upload,
  Wifi,
  Building2,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { AgentPortalPage } from "@/components/agent-portal/AgentPortalPage";
import { normalizeUsername, usernameProblem } from "@/components/dashboard/agents/agentSignup";
import { isAgentProfileComplete, missingProfileFields } from "@/components/dashboard/agents/agentPackages";
import type { AgentProfile } from "@/components/dashboard/shared/types";

// A single text field with a save button that only appears once the
// value has actually changed, so nothing saves on every keystroke.
function EditableField({
  icon: Icon,
  label,
  value,
  placeholder,
  onSave,
  type = "text",
  testId,
  validate,
  hint,
}: {
  testId?: string;
  validate?: (draft: string) => string | null;
  hint?: string;
  icon: typeof Phone;
  label: string;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  type?: string;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = draft.trim() !== (value ?? "").trim() && draft.trim() !== "";
  const error = validate ? validate(draft) : null;
  return (
    <label className="block" data-testid={testId}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#525252]">
        <Icon size={13} />
        {label}
      </span>
      <div className="flex gap-2">
        <input
          type={type}
          data-testid={testId ? `${testId}-input` : undefined}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
        />
        {dirty && (
          <button
            type="button"
            onClick={() => onSave(draft.trim())}
            data-testid={testId ? `${testId}-save` : undefined}
            disabled={!!error}
            className="shrink-0 disabled:opacity-50 rounded-xl bg-[#1a1a1a] px-3 text-xs font-bold text-white hover:bg-[#111111]"
          >
            Save
          </button>
        )}
      </div>
      {error && dirty ? (
        <p data-testid={testId ? `${testId}-error` : undefined} className="mt-1 text-xs font-semibold text-[#1a1a1a]">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-[#a3a3a3]">{hint}</p>
      ) : null}
    </label>
  );
}

// Ghana Card number / date of birth — free to set the first time, locked
// (with a "Request Change" flow through admin) once a value exists.
function LockedField({
  label,
  value,
  onSetInitial,
  onRequestChange,
}: {
  label: string;
  value: string | null;
  onSetInitial: (value: string) => void;
  onRequestChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [requesting, setRequesting] = useState(false);

  if (!value) {
    return (
      <div>
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#525252]">
          <Lock size={13} />
          {label}
        </span>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Enter your ${label.toLowerCase()}`}
            className="h-10 w-full rounded-xl border-2 border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#d4d4d4]"
          />
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => onSetInitial(draft.trim())}
            className="shrink-0 rounded-xl bg-[#1a1a1a] px-3 text-xs font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
        <p className="mt-1 text-[11px] text-[#1a1a1a]">
          You can set this once, right now. After that, changing it needs admin&apos;s approval.
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#525252]">
        <Lock size={13} />
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-xl bg-[#f7f7f7] px-3 py-2.5">
        <span className="flex-1 text-sm font-semibold text-[#1a1a1a]">{value}</span>
        <span className="rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#a3a3a3]">
          Locked
        </span>
      </div>

      {!requesting ? (
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            setRequesting(true);
          }}
          className="mt-1.5 text-xs font-semibold text-[#1a1a1a] hover:underline"
        >
          Request a change from admin
        </button>
      ) : (
        <div className="mt-2 space-y-2 rounded-xl bg-white p-3">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!draft.trim() || draft.trim() === value}
              onClick={() => {
                onRequestChange(draft.trim());
                setRequesting(false);
              }}
              className="rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send Request
            </button>
            <button
              type="button"
              onClick={() => setRequesting(false)}
              className="rounded-lg bg-[#f4f4f4] px-3 py-1.5 text-xs font-bold text-[#525252] hover:bg-[#f7f7f7]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FileSlot({
  icon: Icon,
  label,
  fileName,
  onSelect,
}: {
  icon: typeof IdCard;
  label: string;
  fileName: string | null;
  onSelect: (fileName: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#f7f7f7] px-4 py-3 hover:border-[#1a1a1a]">
      <span className="flex items-center gap-2.5">
        <Icon size={16} className="text-[#737373]" />
        <span className="text-sm text-[#525252]">{label}</span>
      </span>
      {fileName ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-bold text-[#1a1a1a]">
          <CircleCheck size={12} />
          Submitted
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs font-semibold text-[#737373]">
          <Upload size={12} />
          Upload
        </span>
      )}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file.name);
        }}
      />
    </label>
  );
}

function ProfilePage({
  agent,
  agentId,
}: {
  agent: AgentProfile;
  agentId: string;
}) {
  const {
    updateAgentContactDetails,
    setInitialIdentityDetails,
    requestAgentDetailChange,
    changeAgentCredentials,
    agents,
    routers,
    businessLocations,
    hotspotSettings,
    getEffectiveSsid,
    getCaptivePortalConfig,
    updateRouterConfig,
    updateBusinessLocationSsid,
    updateCaptivePortalConfig,
  } = useDashboard();

  // Network details of this agent's own router: the WiFi name people see
  // when they connect, and the business name shown on the login page.
  const router = routers.find((r) => r.ip === agent.routerIp);
  const site = router?.siteId ? businessLocations.find((b) => b.id === router.siteId) : null;
  const wifiName = router ? getEffectiveSsid(router.ip) : "";
  const wifiSharedByAdmin = !site?.ssidMode || site.ssidMode !== "siteWide" ? hotspotSettings.ssidStrategy === "same" : false;
  const businessName = router ? getCaptivePortalConfig(router.ip).businessNameOverride : "";

  function saveWifiName(value: string) {
    if (!router) return;
    if (site?.ssidMode === "siteWide") updateBusinessLocationSsid(site.id, { siteWideSsid: value });
    else updateRouterConfig(router.ip, { ssid: value });
    updateCaptivePortalConfig(router.ip, { ssid: value });
  }

  const canEdit = agent.permissions["settings.editProfile"] === "Allowed";
  const canChangePassword = agent.permissions["settings.changePassword"] === "Allowed";
  const complete = isAgentProfileComplete(agent);
  const missing = missingProfileFields(agent);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  function handlePasswordChange() {
    if (newPassword.length < 6 || newPassword !== confirmPassword) return;
    changeAgentCredentials(agentId, { password: newPassword });
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
    window.setTimeout(() => setPasswordSaved(false), 3000);
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-black text-[#1a1a1a] md:text-3xl">
          <User className="text-[#1a1a1a]" size={26} />
          My Profile
        </h1>
        <p className="mt-1 text-sm text-[#737373]">Your own details — not admin&apos;s.</p>
      </div>

      {!complete && (
        <div className="mb-6 rounded-2xl border-2 bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
            <AlertTriangle size={16} />
            Finish your profile before you can sell
          </p>
          <p className="mt-1 text-xs text-[#1a1a1a]">
            You can browse your dashboard, but Generate Vouchers stays locked until every item below is filled in:
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {missing.map((field) => (
              <li key={field} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1a1a1a]">
                {field}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-bold text-[#1a1a1a]">Contact Details</h2>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-[#a3a3a3]">Full name</span>
              <p className="text-sm font-semibold text-[#1a1a1a]">{agent.name}</p>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-[#a3a3a3]">Agent code</span>
              <p className="text-sm font-semibold text-[#1a1a1a]">{agent.agentCode}</p>
            </div>
            {canEdit ? (
              <>
                <EditableField
                  icon={Phone}
                  label="Phone number"
                  value={agent.phone ?? ""}
                  placeholder="055 123 4567"
                  onSave={(value) => updateAgentContactDetails(agentId, { phone: value })}
                />
                <EditableField
                  icon={MessageCircle}
                  label="WhatsApp number"
                  value={agent.whatsapp ?? ""}
                  placeholder="055 123 4567"
                  onSave={(value) => updateAgentContactDetails(agentId, { whatsapp: value })}
                />
                <EditableField
                  icon={Mail}
                  label="Email"
                  value={agent.email}
                  placeholder="you@gmail.com"
                  type="email"
                  onSave={(value) => updateAgentContactDetails(agentId, { email: value })}
                />
                <EditableField
                  icon={MapPin}
                  label="Location"
                  value={agent.location ?? ""}
                  placeholder="Your area"
                  onSave={(value) => updateAgentContactDetails(agentId, { location: value })}
                />
              </>
            ) : (
              <>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-[#a3a3a3]">Phone</span>
                  <p className="text-sm font-semibold text-[#1a1a1a]">{agent.phone ?? "Not set"}</p>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-[#a3a3a3]">WhatsApp</span>
                  <p className="text-sm font-semibold text-[#1a1a1a]">{agent.whatsapp ?? "Not set"}</p>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-[#a3a3a3]">Email</span>
                  <p className="text-sm font-semibold text-[#1a1a1a]">{agent.email}</p>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-[#a3a3a3]">Location</span>
                  <p className="text-sm font-semibold text-[#1a1a1a]">{agent.location ?? "Not set"}</p>
                </div>
              </>
            )}
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl bg-white shadow-sm" data-testid="account-network-card">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-bold text-[#1a1a1a]">Username &amp; Network</h2>
            <p className="text-xs text-[#737373]">What you sign in with, and the names your customers see.</p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {canEdit ? (
              <EditableField
                testId="field-username"
                icon={User}
                label="Username"
                value={agent.username}
                placeholder="your.username"
                validate={(draft) => usernameProblem(draft, agents, agentId)}
                onSave={(value) => {
                  const clean = normalizeUsername(value);
                  if (usernameProblem(clean, agents, agentId)) return;
                  changeAgentCredentials(agentId, { username: clean });
                }}
                hint="Lowercase letters, numbers, dots, dashes or underscores."
              />
            ) : (
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-[#a3a3a3]">Username</span>
                <p className="text-sm font-semibold text-[#1a1a1a]">{agent.username}</p>
              </div>
            )}
            {router ? (
              <>
                {canEdit && !wifiSharedByAdmin ? (
                  <EditableField
                    testId="field-wifi"
                    icon={Wifi}
                    label="WiFi network name"
                    value={wifiName}
                    placeholder="My WiFi"
                    onSave={saveWifiName}
                  />
                ) : (
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold text-[#a3a3a3]">WiFi network name</span>
                    <p data-testid="field-wifi-readonly" className="text-sm font-semibold text-[#1a1a1a]">{wifiName}</p>
                    {wifiSharedByAdmin && (
                      <p className="mt-1 text-[11px] text-[#a3a3a3]">One name is shared by every network — your admin sets it.</p>
                    )}
                  </div>
                )}
                {canEdit ? (
                  <EditableField
                    testId="field-business"
                    icon={Building2}
                    label="Business name"
                    value={businessName}
                    placeholder="Shown on your login page"
                    onSave={(value) => updateCaptivePortalConfig(router.ip, { businessNameOverride: value })}
                  />
                ) : (
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold text-[#a3a3a3]">Business name</span>
                    <p className="text-sm font-semibold text-[#1a1a1a]">{businessName || "Not set"}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[#a3a3a3] sm:col-span-2">No router is assigned to you yet, so there is no network to name.</p>
            )}
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-bold text-[#1a1a1a]">Identity Verification</h2>
            <p className="text-xs text-[#737373]">Needed once, so admin and customers can trust who they&apos;re dealing with.</p>
          </div>
          <div className="space-y-3 p-5">
            <FileSlot
              icon={IdCard}
              label="Ghana Card — Front"
              fileName={agent.idFrontFileName}
              onSelect={(fileName) => canEdit && updateAgentContactDetails(agentId, { idFrontFileName: fileName })}
            />
            <FileSlot
              icon={IdCard}
              label="Ghana Card — Back"
              fileName={agent.idBackFileName}
              onSelect={(fileName) => canEdit && updateAgentContactDetails(agentId, { idBackFileName: fileName })}
            />
            <FileSlot
              icon={Camera}
              label="Face capture (selfie)"
              fileName={agent.faceCaptureFileName}
              onSelect={(fileName) => canEdit && updateAgentContactDetails(agentId, { faceCaptureFileName: fileName })}
            />

            <div className="grid gap-4 border-t border-[#f4f4f4] pt-4 sm:grid-cols-2">
              <LockedField
                label="Ghana Card number"
                value={agent.ghanaCardNumber}
                onSetInitial={(value) => setInitialIdentityDetails(agentId, value, agent.dateOfBirth ?? "")}
                onRequestChange={(value) => requestAgentDetailChange(agentId, "ghanaCardNumber", value)}
              />
              <LockedField
                label="Date of birth"
                value={agent.dateOfBirth}
                onSetInitial={(value) => setInitialIdentityDetails(agentId, agent.ghanaCardNumber ?? "", value)}
                onRequestChange={(value) => requestAgentDetailChange(agentId, "dateOfBirth", value)}
              />
            </div>
          </div>
        </article>

        {canChangePassword && (
          <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="text-sm font-bold text-[#1a1a1a]">Change Password</h2>
              <p className="text-xs text-[#737373]">
                {agent.hasChangedDefaultPassword
                  ? "Set your own password any time."
                  : "You're still using the default password admin gave you — set your own below."}
              </p>
            </div>
            <div className="space-y-3 p-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#525252]">New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#525252]">Confirm new password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
                />
              </label>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs font-semibold text-red-600">Passwords don&apos;t match.</p>
              )}
              <button
                type="button"
                disabled={newPassword.length < 6 || newPassword !== confirmPassword}
                onClick={handlePasswordChange}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={14} />
                {passwordSaved ? "Saved!" : "Save New Password"}
              </button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

export default function AgentProfilePage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);

  return (
    <AgentPortalPage
      agentId={agentId}
      permissionKey="settings.viewProfile"
      featureLabel="My Profile"
      render={(agent) => <ProfilePage agent={agent} agentId={agentId} />}
    />
  );
}
