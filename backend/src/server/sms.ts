// Sends text messages through the gateway chosen in Settings → SMS.
//
// Supported: Hubtel (Ghana) and Africa's Talking. Mambo SMS and JulySMS are
// listed in the settings but not connected yet — a message to them is logged
// as "failed: not supported". Every attempt is kept in the SMS log.

import crypto from "node:crypto";
import { addSms, getState } from "./store";

type SmsSettings = {
  enabled?: boolean; gateway?: string; senderId?: string;
  creds?: Record<string, { apiKey?: string; apiSecret?: string; username?: string }>;
};

/** 0244123456 / +233244123456 / 233244123456 -> 233244123456 */
export function toInternational(phone: string, country = "233") {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith(country)) return digits;
  if (digits.startsWith("0")) return country + digits.slice(1);
  return country + digits;
}

async function timedFetch(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendSms(to: string, message: string): Promise<{ ok: boolean; detail: string }> {
  const settings = (getState("smsSettings")?.value ?? {}) as SmsSettings;
  const gateway = settings.gateway ?? "";
  const creds = settings.creds?.[gateway] ?? {};
  const record = (status: "sent" | "failed" | "skipped", detail: string) => {
    addSms({ id: crypto.randomUUID(), to, text: message, gateway: gateway || "none", status, detail, createdAt: new Date().toISOString() });
    return { ok: status === "sent", detail };
  };

  if (!settings.enabled) return record("skipped", "SMS is switched off in Settings → SMS.");
  const sender = (settings.senderId || "HotspotPro").slice(0, 11);

  try {
    if (gateway === "hubtel") {
      if (!creds.username || !creds.apiSecret) return record("failed", "Hubtel Client ID / Secret are missing.");
      const params = new URLSearchParams({
        clientid: creds.username, clientsecret: creds.apiSecret, from: sender, to: toInternational(to), content: message,
      });
      const response = await timedFetch(`https://smsc.hubtel.com/v1/messages/send?${params}`);
      const body = await response.text();
      return response.ok ? record("sent", body.slice(0, 200)) : record("failed", `Hubtel answered ${response.status}: ${body.slice(0, 200)}`);
    }
    if (gateway === "africastalking") {
      if (!creds.username || !creds.apiKey) return record("failed", "Africa's Talking username / API key are missing.");
      const host = creds.username === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
      const form = new URLSearchParams({ username: creds.username, to: `+${toInternational(to)}`, message });
      if (settings.senderId) form.set("from", settings.senderId);
      const response = await timedFetch(`https://${host}/version1/messaging`, {
        method: "POST",
        headers: { apiKey: creds.apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      const body = await response.text();
      return response.ok ? record("sent", body.slice(0, 200)) : record("failed", `Africa's Talking answered ${response.status}: ${body.slice(0, 200)}`);
    }
    return record("failed", `The "${gateway || "no"}" gateway is not connected yet. Use Hubtel or Africa's Talking.`);
  } catch (error) {
    return record("failed", `Could not reach the SMS gateway: ${(error as Error).message}`);
  }
}
