// A customer buying a package online: create the payment, and — once the
// money is confirmed — issue the voucher exactly once, record the sale, and
// text the code.

import crypto from "node:crypto";
import {
  type PaymentRecord, allPayments, getPayment, getState, savePayment,
} from "./store";
import {
  type Pkg, addVoucher, list, priceOf, routerAllowsPackage, uniqueCode,
} from "./packages";
import { detectNetwork, hubtelCharge, hubtelStatus, paymentMode, webhookSecret } from "./payments";
import { sendSms } from "./sms";

const now = () => new Date().toISOString();
const note = (p: PaymentRecord, text: string) => p.log.push({ at: now(), text });

export function newReference() {
  return "HP" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(5).toString("hex").toUpperCase();
}

export type PurchaseInput = {
  packageId: string;
  phone: string;
  buyerType: "self" | "other" | "device";
  recipientPhone?: string;
  deviceMac?: string;
  routerIp?: string | null;
  origin: string;
};

export async function createPurchase(input: PurchaseInput): Promise<{ ok: true; payment: PaymentRecord } | { ok: false; status: number; message: string }> {
  const mode = paymentMode();
  if (mode === "off") return { ok: false, status: 503, message: "Online payments are not set up yet. Please buy a voucher from an agent." };

  const pkg = list<Pkg>("packages").find((p) => p.id === input.packageId);
  if (!pkg || !routerAllowsPackage(pkg, input.routerIp ?? null)) return { ok: false, status: 404, message: "That package isn't available." };
  const amount = priceOf(pkg);
  if (amount <= 0) return { ok: false, status: 400, message: "That package has no price." };
  const network = detectNetwork(input.phone);
  if (network === "unknown") return { ok: false, status: 400, message: "Enter a valid Ghanaian Mobile Money number." };
  if (input.buyerType === "other" && detectNetwork(input.recipientPhone ?? "") === "unknown") {
    return { ok: false, status: 400, message: "Enter a valid recipient phone number." };
  }

  const subscription = getState("subscription")?.value as { billingModel?: string; commissionRate?: number } | undefined;
  const rate = subscription?.billingModel === "Commission" ? subscription.commissionRate ?? 0 : 0;

  const payment: PaymentRecord = {
    id: newReference(),
    gateway: mode,
    status: "pending",
    amount,
    currency: "GHS",
    phone: input.phone.trim(),
    network,
    packageId: pkg.id,
    packageName: pkg.name,
    routerIp: input.routerIp ?? null,
    buyerType: input.buyerType,
    recipientPhone: input.recipientPhone?.trim() || null,
    deviceMac: input.deviceMac?.trim() || null,
    commissionRate: rate,
    createdAt: now(),
    log: [],
  };
  note(payment, `Payment started for ${pkg.name} (GH₵ ${amount.toFixed(2)}).`);

  if (mode === "hubtel") {
    const callbackUrl = `${input.origin}/api/webhooks/hubtel?secret=${webhookSecret()}`;
    const result = await hubtelCharge({ reference: payment.id, amount, phone: input.phone, network, description: `${pkg.name} internet`, callbackUrl });
    if (!result.accepted) {
      payment.status = "failed";
      payment.failureReason = result.reason;
      note(payment, `Hubtel did not accept the request: ${result.reason}`);
      savePayment(payment);
      return { ok: false, status: 502, message: result.reason || "The payment could not be started." };
    }
    payment.providerTxId = result.providerTxId;
    note(payment, "Payment prompt sent to the customer's phone.");
  } else {
    note(payment, "Sandbox payment — waiting for approval.");
  }
  savePayment(payment);
  return { ok: true, payment };
}

function defaultAgentId(routerIp: string | null) {
  const agents = list<{ id: string; routerIp?: string; isDefault?: boolean }>("agents");
  return (routerIp && agents.find((a) => a.routerIp === routerIp)?.id) || agents.find((a) => a.isDefault)?.id || "";
}

/** Money confirmed. Safe to call many times — the voucher is issued only once. */
export function markPaid(id: string, details: { providerTxId?: string; amount?: number } = {}): PaymentRecord | null {
  const payment = getPayment(id);
  if (!payment) return null;
  if (payment.status === "paid") return payment;

  if (details.amount !== undefined && details.amount + 0.01 < payment.amount) {
    payment.status = "failed";
    payment.failureReason = `Paid GH₵ ${details.amount} but the package costs GH₵ ${payment.amount}.`;
    note(payment, payment.failureReason);
    savePayment(payment);
    return payment;
  }

  const pkg = list<Pkg>("packages").find((p) => p.id === payment.packageId);
  const code = uniqueCode();
  const ms = Date.now();
  addVoucher({
    code,
    password: null,
    packageName: pkg?.name ?? payment.packageName,
    status: "Used",
    delivery: payment.buyerType === "other" ? "SMS" : "Online",
    saleType: "Online",
    usedByCustomerId: null,
    redeemerPhone: payment.buyerType === "other" ? payment.recipientPhone : payment.phone,
    generatedAt: new Date(ms).toLocaleString("en-GB"),
    generatedAtMs: ms,
    usedAtMs: ms,
    agentId: defaultAgentId(payment.routerIp),
    batchId: null,
    serverIssuedMs: ms,
  });

  payment.status = "paid";
  payment.paidAt = now();
  payment.voucherCode = code;
  payment.voucherPassword = null;
  if (details.providerTxId) payment.providerTxId = details.providerTxId;
  payment.commission = Math.round(payment.amount * (payment.commissionRate ?? 0)) / 100;
  note(payment, `Payment confirmed. Voucher ${code} issued.`);
  savePayment(payment);

  const to = payment.buyerType === "other" ? payment.recipientPhone ?? payment.phone : payment.phone;
  void sendSms(to, `Your ${payment.packageName} internet voucher: ${code}. Enter it on the WiFi login page. Ref ${payment.id}.`).then((r) => {
    const p = getPayment(id);
    if (p) {
      note(p, r.ok ? "Voucher code sent by SMS." : `SMS not sent: ${r.detail}`);
      savePayment(p);
    }
  });
  return payment;
}

export function markFailed(id: string, reason: string) {
  const payment = getPayment(id);
  if (!payment || payment.status !== "pending") return payment;
  payment.status = "failed";
  payment.failureReason = reason;
  note(payment, `Payment failed: ${reason}`);
  savePayment(payment);
  return payment;
}

const lastCheck = new Map<string, number>();

/** For a pending live payment, ask Hubtel directly (at most every 15 s) — recovers payments whose callback never arrived. */
export async function refreshPending(payment: PaymentRecord): Promise<PaymentRecord> {
  if (payment.status !== "pending") return payment;
  const age = Date.now() - Date.parse(payment.createdAt);
  if (payment.gateway === "hubtel") {
    if (age > 30 * 60 * 1000) return markFailed(payment.id, "Not approved in time.") ?? payment;
    if (age > 20000 && Date.now() - (lastCheck.get(payment.id) ?? 0) > 15000) {
      lastCheck.set(payment.id, Date.now());
      const status = await hubtelStatus(payment.id);
      if (status === "paid") return markPaid(payment.id) ?? payment;
      if (status === "failed") return markFailed(payment.id, "The payment was declined or cancelled.") ?? payment;
    }
  } else if (age > 15 * 60 * 1000) {
    return markFailed(payment.id, "Not approved in time.") ?? payment;
  }
  return getPayment(payment.id) ?? payment;
}

export function salesReport(from: number, to: number) {
  const rows = allPayments().filter((p) => p.status === "paid" && p.paidAt && Date.parse(p.paidAt) >= from && Date.parse(p.paidAt) < to);
  const byRouter = new Map<string, { routerIp: string; count: number; sales: number; commission: number }>();
  const byPackage = new Map<string, { packageName: string; count: number; sales: number }>();
  for (const p of rows) {
    const r = byRouter.get(p.routerIp ?? "unknown") ?? { routerIp: p.routerIp ?? "unknown", count: 0, sales: 0, commission: 0 };
    r.count += 1; r.sales += p.amount; r.commission += p.commission ?? 0;
    byRouter.set(r.routerIp, r);
    const k = byPackage.get(p.packageName) ?? { packageName: p.packageName, count: 0, sales: 0 };
    k.count += 1; k.sales += p.amount;
    byPackage.set(k.packageName, k);
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    count: rows.length,
    sales: round(rows.reduce((s, p) => s + p.amount, 0)),
    commission: round(rows.reduce((s, p) => s + (p.commission ?? 0), 0)),
    byRouter: [...byRouter.values()].map((r) => ({ ...r, sales: round(r.sales), commission: round(r.commission) })),
    byPackage: [...byPackage.values()].map((r) => ({ ...r, sales: round(r.sales) })),
  };
}
