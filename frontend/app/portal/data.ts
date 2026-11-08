// Static package plans and payment-network display data for the captive portal.

import type { PackagePlan, PaymentNetworkId, PaymentNetwork, ResellerFormData } from "./types";

export const packagePlans: PackagePlan[] = [
  {
    id: "one-hour",
    name: "1 Hour",
    speed: "5 Mbps",
    validity: "1 Hour",
    validityDays: 0,
    validityHours: 1,
    price: 2,
  },
  {
    id: "daily",
    name: "Daily",
    speed: "10 Mbps",
    validity: "24 Hours",
    validityDays: 1,
    price: 10,
  },
  {
    id: "weekly",
    name: "Weekly",
    speed: "20 Mbps",
    validity: "7 Days",
    validityDays: 7,
    price: 45,
  },
  {
    id: "monthly",
    name: "Monthly",
    speed: "30 Mbps",
    validity: "30 Days",
    validityDays: 30,
    price: 120,
  },
];

export const paymentNetworks: Record<
  PaymentNetworkId,
  PaymentNetwork
> = {
  mtn: {
    id: "mtn",
    name: "MTN Mobile Money",
    shortName: "MTN",
    badgeClass: "bg-[#ffcc00] text-[#0f172a]",
    borderClass: "border-[#bfdbfe]",
    backgroundClass: "bg-[#f1f5f9]",
  },

  telecel: {
    id: "telecel",
    name: "Telecel Cash",
    shortName: "TC",
    badgeClass: "bg-red-600 text-[#0f172a]",
    borderClass: "border-red-200",
    backgroundClass: "bg-[#fff4f4]",
  },

  "at-money": {
    id: "at-money",
    name: "AT Money",
    shortName: "AT",
    badgeClass: "bg-[#fff7ed]0 text-[#0f172a]",
    borderClass: "border-amber-200",
    backgroundClass: "bg-[#fff7ed]",
  },

  unknown: {
    id: "unknown",
    name: "",
    shortName: "",
    badgeClass: "",
    borderClass: "",
    backgroundClass: "",
  },
};

export const emptyResellerForm: ResellerFormData = {
  fullName: "",
  phone: "",
  email: "",
  location: "",
  username: "",
  password: "",
  idFrontFileName: "",
  idBackFileName: "",
  faceCaptureFileName: "",
};
