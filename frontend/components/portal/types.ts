import type { ComponentType } from "react";

export type BuyerType = "self" | "other" | "device";

export type BuyStage =
  | "form"
  | "processing"
  | "connected"
  | "voucher-sent";

export type PaymentStage =
  | "initiating"
  | "waiting"
  | "confirming";

export type PaymentNetworkId =
  | "mtn"
  | "telecel"
  | "at-money"
  | "unknown";

export type PackagePlan = {
  id: string;
  name: string;
  speed: string;
  validity: string;
  validityDays: number;
  validityHours?: number;
  price: number;
};

export type PaymentNetwork = {
  id: PaymentNetworkId;
  name: string;
  shortName: string;
  badgeClass: string;
  borderClass: string;
  backgroundClass: string;
};

export type PaymentResult = {
  reference: string;
  sessionId: string;
  completedAt: string;
  voucherUsername?: string;
  voucherPassword?: string;
};

export type ResellerFormData = {
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  location: string;
  username: string;
  password: string;
  idFrontFileName: string;
  idBackFileName: string;
  faceCaptureFileName: string;
  // Small copies of the pictures (empty if the browser couldn't read them).
  idFrontImage: string;
  idBackImage: string;
  faceCaptureImage: string;
};

export type IconComponent = ComponentType<{
  size?: number;
  className?: string;
}>;
