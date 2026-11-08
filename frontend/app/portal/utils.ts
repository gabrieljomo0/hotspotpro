// Formatting, validation and ID-generation helpers for the captive portal.

import { sym } from "@/components/dashboard/shared/currency";
import type { PaymentNetworkId } from "./types";

export function formatMoney(amount: number) {
  return `${sym()} ${amount.toFixed(2)}`;
}

export function cleanPhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 12);
}

export function normalizeGhanaPhone(value: string) {
  const cleaned = value.replace(/\D/g, "");

  if (
    cleaned.startsWith("233") &&
    cleaned.length === 12
  ) {
    return `0${cleaned.slice(3)}`;
  }

  return cleaned.slice(0, 10);
}

export function displayPhoneNumber(value: string) {
  const phone = normalizeGhanaPhone(value);

  if (phone.length <= 3) {
    return phone;
  }

  if (phone.length <= 6) {
    return `${phone.slice(0, 3)} ${phone.slice(3)}`;
  }

  return `${phone.slice(0, 3)} ${phone.slice(
    3,
    6,
  )} ${phone.slice(6, 10)}`;
}

export function isValidGhanaPhone(value: string) {
  const phone = normalizeGhanaPhone(value);

  return /^0[235][0-9]{8}$/.test(phone);
}

export function detectPaymentNetwork(
  value: string,
): PaymentNetworkId {
  const phone = normalizeGhanaPhone(value);

  if (phone.length !== 10) {
    return "unknown";
  }

  const prefix = phone.slice(0, 3);

  const mtnPrefixes = [
    "024",
    "025",
    "053",
    "054",
    "055",
    "059",
  ];

  const telecelPrefixes = [
    "020",
    "050",
  ];

  const atMoneyPrefixes = [
    "026",
    "027",
    "056",
    "057",
  ];

  if (mtnPrefixes.includes(prefix)) {
    return "mtn";
  }

  if (telecelPrefixes.includes(prefix)) {
    return "telecel";
  }

  if (atMoneyPrefixes.includes(prefix)) {
    return "at-money";
  }

  return "unknown";
}

export function generateReference() {
  const timestamp = Date.now()
    .toString()
    .slice(-8);

  const random = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `HP-${timestamp}-${random}`;
}

export function generateSessionId() {
  return `SES-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}

export function generateVoucherUsername() {
  const first = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  const second = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `HS-${first}-${second}`;
}

export function generateVoucherPassword() {
  return Math.floor(
    100000 + Math.random() * 900000,
  ).toString();
}
