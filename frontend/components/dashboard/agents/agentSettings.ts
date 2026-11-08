// Per-agent settings — what ONE agent may see and do, on top of their own
// permissions, and how you want to hear about what they do.
//
// An agent can only do something if their role/permissions allow it AND you
// haven't switched that capability off for them here. Turning access off
// altogether is done with the agent's status (Active / Suspended …), shown
// as an Access switch in the agents list.
//
// Everything in this file is plain logic (no React, no storage) so the rules
// can be tested on their own and shared by the settings screen, the agent
// portal and the data layer.

import { sym } from "@/components/dashboard/shared/currency";
import { ALL_PERMISSION_KEYS } from "./permissionSchema";
import type {
  AgentPermissions,
  AgentProfile,
  AgentSettings,
  MomoIntegrationSettings,
  PaymentSettings,
} from "../shared/types";

export type { AgentSettings };

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  allowCreateVouchers: true,
  allowCustomVoucherCredentials: false,
  allowViewSalesCommission: true,
  allowViewAssignedRouters: true,
  notifyOnVoucherGeneration: false,
  notifyByEmail: true,
  notifyBySms: false,
  notifyEmailOverride: "",
  notifyPhoneOverride: "",
  payoutNotes: "",
};

// Saved data (or nothing at all) is filled in from the defaults, and
// anything of the wrong type is ignored rather than trusted.
export function normalizeAgentSettings(raw: unknown): AgentSettings {
  const base = { ...DEFAULT_AGENT_SETTINGS };
  if (!raw || typeof raw !== "object") return base;
  const source = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  (Object.keys(base) as Array<keyof AgentSettings>).forEach((key) => {
    if (typeof source[key] === typeof base[key]) out[key] = source[key];
  });
  return out as AgentSettings;
}

export function settingsOf(agent: Pick<AgentProfile, "settings"> & { isDefault?: boolean } | null | undefined): AgentSettings {
  const settings = normalizeAgentSettings(agent?.settings);
  // The admin's own agent profile has every capability switched on.
  if (agent?.isDefault) {
    return {
      ...settings,
      allowCreateVouchers: true,
      allowCustomVoucherCredentials: true,
      allowViewSalesCommission: true,
      allowViewAssignedRouters: true,
    };
  }
  return settings;
}

// --- Capabilities → the agent permissions they control ----------------------

export const CREATE_VOUCHER_PERMISSIONS = [
  "voucher.generate",
  "voucher.bulk",
  "voucher.presets",
  "voucher.presetsManage",
];

export const SALES_COMMISSION_PERMISSIONS = [
  "sales.viewOwn",
  "sales.viewTeam",
  "sales.export",
  "dashboard.viewOwnKpis",
  "dashboard.viewAccountKpis",
  "transactions.viewStatus",
  "transactions.viewHistory",
  "transactions.export",
  "reports.viewFinancial",
];

// What this agent can ACTUALLY do: their own permissions with the
// capabilities you switched off for them taken away. The stored agent is
// never changed — only the copy the agent portal works from.
export function applyAgentRestrictions(agent: AgentProfile): AgentProfile {
  // The admin's own (default) agent profile can do everything an agent can —
  // no permission or per-agent setting takes anything away from it.
  if (agent.isDefault) {
    const everything: AgentPermissions = { ...agent.permissions };
    ALL_PERMISSION_KEYS.forEach((key) => {
      everything[key] = "Allowed";
    });
    return { ...agent, permissions: everything };
  }
  const settings = settingsOf(agent);
  const denied: string[] = [];
  if (!settings.allowCreateVouchers) denied.push(...CREATE_VOUCHER_PERMISSIONS);
  if (!settings.allowViewSalesCommission) denied.push(...SALES_COMMISSION_PERMISSIONS);
  if (denied.length === 0) return agent;

  const permissions: AgentPermissions = { ...agent.permissions };
  denied.forEach((key) => {
    if (key in permissions) permissions[key] = "Denied";
  });
  return { ...agent, permissions };
}

// --- Validation of the settings form ---------------------------------------

export type AgentSettingsErrors = Partial<
  Record<"notifyChannels" | "notifyEmailOverride" | "notifyPhoneOverride", string>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function phoneDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function validateAgentSettings(draft: AgentSettings): AgentSettingsErrors {
  const errors: AgentSettingsErrors = {};
  if (draft.notifyOnVoucherGeneration) {
    if (!draft.notifyByEmail && !draft.notifyBySms) {
      errors.notifyChannels = "Choose email, SMS, or both.";
    }
    const email = draft.notifyEmailOverride.trim();
    if (draft.notifyByEmail && email && !EMAIL_PATTERN.test(email)) {
      errors.notifyEmailOverride = "That doesn't look like an email address.";
    }
    const phone = draft.notifyPhoneOverride.trim();
    if (draft.notifyBySms && phone && (phoneDigits(phone).length < 9 || phoneDigits(phone).length > 15)) {
      errors.notifyPhoneOverride = "Enter a phone number with 9–15 digits.";
    }
  }
  return errors;
}

// --- Agent voucher alerts ---------------------------------------------------

export type VoucherAlertDelivery = {
  channel: "Email" | "SMS";
  // null = nothing to send to (no override and no organization contact).
  to: string | null;
  usingOverride: boolean;
};

export function resolveVoucherAlertDeliveries(
  settings: AgentSettings,
  organization: { supportEmail: string; supportNumber: string },
): VoucherAlertDelivery[] {
  if (!settings.notifyOnVoucherGeneration) return [];
  const deliveries: VoucherAlertDelivery[] = [];

  if (settings.notifyByEmail) {
    const override = settings.notifyEmailOverride.trim();
    const fallback = organization.supportEmail.trim();
    deliveries.push({ channel: "Email", to: override || fallback || null, usingOverride: !!override });
  }
  if (settings.notifyBySms) {
    const override = settings.notifyPhoneOverride.trim();
    const fallback = organization.supportNumber.trim();
    deliveries.push({ channel: "SMS", to: override || fallback || null, usingOverride: !!override });
  }
  return deliveries;
}

export function composeVoucherAlertMessage(details: {
  agentName: string;
  quantity: number;
  packageName: string;
  reference: string;
  routerName: string | null;
  walletBalance: number | null;
}) {
  const parts = [
    `${details.agentName} generated ${details.quantity} voucher${details.quantity === 1 ? "" : "s"} for "${details.packageName}" (batch ${details.reference})`,
  ];
  if (details.routerName) parts[0] += ` on ${details.routerName}`;
  parts[0] += ".";
  if (details.walletBalance !== null) parts.push(`Wallet balance now ${sym()} ${details.walletBalance.toLocaleString()}.`);
  return parts.join(" ");
}

export type VoucherAlertLogEntry = {
  id: string;
  agentId: string;
  agentName: string;
  channel: "Email" | "SMS";
  to: string | null;
  message: string;
  sentAt: string;
  // We have no email/SMS gateway connected, so every entry is a record of
  // what WOULD be sent — never presented as delivered.
  status: "Logged" | "No destination";
};

// --- Custom voucher credentials ---------------------------------------------

export const CUSTOM_CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

export function validateCustomCredentials(
  customCode: string,
  customPassword: string,
  existingCodes: string[],
): { ok: true } | { ok: false; field: "code" | "password"; error: string } {
  const code = customCode.trim();
  const password = customPassword.trim();

  if (code) {
    if (!CUSTOM_CODE_PATTERN.test(code)) {
      return { ok: false, field: "code", error: "Use 3–32 letters, numbers, dashes or underscores — no spaces." };
    }
    if (existingCodes.some((existing) => existing.toLowerCase() === code.toLowerCase())) {
      return { ok: false, field: "code", error: "That username is already used by another voucher." };
    }
  }
  if (password && (password.length < 4 || password.length > 32 || /\s/.test(password))) {
    return { ok: false, field: "password", error: "Use 4–32 characters with no spaces." };
  }
  return { ok: true };
}

// --- Purchase for Customer ---------------------------------------------------
//
// Letting an agent start a mobile-money payment on a customer's behalf needs
// a payment gateway — Hubtel (in Payment Settings) or an aggregator such as
// Hubtel/Paystack (in Mobile Money integration) — with its keys filled in.

export function isCustomerPurchaseAvailable(
  payment: Pick<PaymentSettings, "gateway" | "consumerKey" | "consumerSecret">,
  momo: Pick<MomoIntegrationSettings, "enabled" | "provider" | "merchantId" | "apiKey" | "apiSecret">,
): boolean {
  const hubtelConfigured =
    payment.gateway === "Hubtel" && payment.consumerKey.trim() !== "" && payment.consumerSecret.trim() !== "";
  const aggregatorConfigured =
    momo.enabled &&
    momo.provider === "Aggregator (Hubtel/Paystack/Flutterwave)" &&
    momo.merchantId.trim() !== "" &&
    momo.apiKey.trim() !== "" &&
    momo.apiSecret.trim() !== "";
  return hubtelConfigured || aggregatorConfigured;
}

// --- Access ---------------------------------------------------------------------
//
// Whether an agent can sign in is their STATUS: Active gets in; Suspended and
// Deactivated are "access disabled" (the switch in the agents list); Pending
// is an application still waiting for a decision.

export function agentHasAccess(agent: Pick<AgentProfile, "status">) {
  return agent.status === "Active";
}

export const ACCESS_DISABLED_MESSAGE =
  "Your access has been disabled. Please contact admin to reactivate your access.";
export const ACCESS_PENDING_MESSAGE = "Your application is still awaiting admin's approval.";

export function accessBlockedMessage(status: AgentProfile["status"]) {
  return status === "Pending" ? ACCESS_PENDING_MESSAGE : ACCESS_DISABLED_MESSAGE;
}

// Can this agent's login details be used to sign in right now?
//  - the account-wide "Enable Agent Portal" switch must be on, and
//  - the default (admin) agent also needs its own sign-in switch turned on.
export const AGENT_PORTAL_OFF_MESSAGE =
  "Agent sign-in is switched off for this account. Ask the account owner to turn on the Agent Portal.";
export const ADMIN_AGENT_LOGIN_OFF_MESSAGE =
  "Sign-in with the admin agent's login details is switched off. Turn it on from the agent's Portal Access tab first.";

export const AGENT_DASHBOARD_OFF_MESSAGE =
  "Your agent dashboard has been switched off by admin. Please contact admin to turn it back on.";

export function agentDashboardOff(agent: Pick<AgentProfile, "portalAccessEnabled">) {
  return agent.portalAccessEnabled === false;
}

export function agentSignInBlock(
  agent: Pick<AgentProfile, "isDefault" | "portalLoginEnabled" | "portalAccessEnabled">,
  agentPortalEnabled: boolean,
): string | null {
  if (!agentPortalEnabled) return AGENT_PORTAL_OFF_MESSAGE;
  if (agentDashboardOff(agent)) return AGENT_DASHBOARD_OFF_MESSAGE;
  if (agent.isDefault && !agent.portalLoginEnabled) return ADMIN_AGENT_LOGIN_OFF_MESSAGE;
  return null;
}
