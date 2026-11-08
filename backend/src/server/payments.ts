// Mobile-money payments.
//
//  - "hubtel": real charges through Hubtel's Receive Money API. Needs the
//    Hubtel API ID + key and the Collection Account Number saved in
//    Settings → Payments, with "Sandbox mode" switched OFF.
//  - "sandbox": pretend payments (a button approves them). On while developing
//    (npm run dev), or if Settings → Payments has Sandbox mode on, or
//    HOTSPOTPRO_PAYMENTS_SANDBOX=1. NEVER on in production unless asked for.
//  - "off": customers can't buy online.

import crypto from "node:crypto";
import { getState, secretFor } from "./store";

export type PaymentSettings = {
  gateway?: string; sandboxMode?: boolean; consumerKey?: string; consumerSecret?: string; collectionAccountNumber?: string;
};
export type Mode = "hubtel" | "sandbox" | "off";

export function settings(): PaymentSettings {
  return (getState("paymentSettings")?.value ?? {}) as PaymentSettings;
}

export function hubtelReady(s = settings()) {
  return s.gateway === "Hubtel" && !!s.consumerKey?.trim() && !!s.consumerSecret?.trim() && !!s.collectionAccountNumber?.trim();
}

export function paymentMode(): Mode {
  const s = settings();
  if (process.env.HOTSPOTPRO_PAYMENTS_SANDBOX === "1") return "sandbox";
  if (hubtelReady(s) && !s.sandboxMode) return "hubtel";
  if (s.sandboxMode || process.env.NODE_ENV !== "production") return "sandbox";
  return "off";
}

export function webhookSecret() {
  return process.env.HOTSPOTPRO_HUBTEL_WEBHOOK_SECRET || secretFor("webhook", () => crypto.randomBytes(16).toString("hex"));
}

const CHANNELS: Record<string, string> = { mtn: "mtn-gh", telecel: "vodafone-gh", "at-money": "tigo-gh" };

export function normalizeGhanaPhone(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.startsWith("233")) return "0" + digits.slice(3);
  return digits;
}

export function detectNetwork(phone: string): "mtn" | "telecel" | "at-money" | "unknown" {
  const p = normalizeGhanaPhone(phone);
  if (p.length !== 10) return "unknown";
  const prefix = p.slice(0, 3);
  if (["024", "025", "053", "054", "055", "059"].includes(prefix)) return "mtn";
  if (["020", "050"].includes(prefix)) return "telecel";
  if (["026", "027", "056", "057"].includes(prefix)) return "at-money";
  return "unknown";
}

function basicAuth(s: PaymentSettings) {
  return "Basic " + Buffer.from(`${s.consumerKey}:${s.consumerSecret}`).toString("base64");
}

async function timedFetch(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type Charge = { reference: string; amount: number; phone: string; network: string; description: string; callbackUrl: string };

/** Ask Hubtel to send a payment prompt to the customer's phone. */
export async function hubtelCharge(charge: Charge): Promise<{ accepted: boolean; providerTxId?: string; reason?: string }> {
  const s = settings();
  const channel = CHANNELS[charge.network];
  if (!channel) return { accepted: false, reason: "That mobile-money network isn't supported." };
  try {
    const response = await timedFetch(
      `https://rmp.hubtel.com/merchantaccount/merchants/${encodeURIComponent(s.collectionAccountNumber!.trim())}/receive/mobilemoney`,
      {
        method: "POST",
        headers: { Authorization: basicAuth(s), "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          CustomerName: "Hotspot customer",
          CustomerMsisdn: "233" + normalizeGhanaPhone(charge.phone).slice(1),
          CustomerEmail: "",
          Channel: channel,
          Amount: Number(charge.amount.toFixed(2)),
          PrimaryCallbackUrl: charge.callbackUrl,
          Description: charge.description.slice(0, 100),
          ClientReference: charge.reference,
        }),
      },
    );
    const body = (await response.json().catch(() => ({}))) as { ResponseCode?: string; Message?: string; Data?: { TransactionId?: string } };
    // 0001 = prompt sent, waiting for the customer to approve.
    if (body.ResponseCode === "0001" || body.ResponseCode === "0000") return { accepted: true, providerTxId: body.Data?.TransactionId };
    return { accepted: false, reason: body.Message || `Hubtel answered ${response.status}.` };
  } catch (error) {
    return { accepted: false, reason: `Could not reach Hubtel: ${(error as Error).message}` };
  }
}

/** Ask Hubtel what really happened to a payment (used to double-check callbacks and to recover lost ones). */
export async function hubtelStatus(reference: string): Promise<"paid" | "failed" | "pending" | "unknown"> {
  const s = settings();
  if (!hubtelReady(s)) return "unknown";
  try {
    const response = await timedFetch(
      `https://api-txnstatus.hubtel.com/transactions/${encodeURIComponent(s.collectionAccountNumber!.trim())}/status?clientReference=${encodeURIComponent(reference)}`,
      { headers: { Authorization: basicAuth(s), Accept: "application/json" } },
    );
    if (!response.ok) return "unknown";
    const body = (await response.json()) as { Data?: { status?: string; transactionStatus?: string } };
    const status = (body.Data?.status ?? body.Data?.transactionStatus ?? "").toLowerCase();
    if (status === "paid" || status === "success" || status === "successful") return "paid";
    // "Unpaid" just means not paid YET (the customer may still be approving) — only a clear failure counts.
    if (status === "failed" || status === "refunded" || status === "declined") return "failed";
    return "pending";
  } catch {
    return "unknown";
  }
}
