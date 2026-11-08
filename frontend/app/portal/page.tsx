"use client";

import { sym } from "@/components/dashboard/shared/currency";
import type {
  FormEvent,
  ReactNode,
} from "react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";

import {
  ArrowRight,
  Camera,
  Loader2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Send,
  ShoppingCart,
  Smartphone,
  Ticket,
  Upload,
  UserRound,
  Tv,
  UsersRound,
  Wifi,
} from "lucide-react";

import { emailProblem, usernameProblem } from "@/components/dashboard/agents/agentSignup";
import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import type {
  BuyerType,
  BuyStage,
  PaymentStage,
  PaymentNetworkId,
  PackagePlan,
  PaymentNetwork,
  PaymentResult,
  ResellerFormData,
  IconComponent,
} from "@/components/portal/types";
import { PortalHeader, BrandHeader } from "@/components/portal/PortalHeader";
import {
  InputField,
  PrimaryButton,
  ModalShell,
  FileCaptureField,
} from "@/components/portal/PortalFormControls";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */
/* Shared types (BuyerType, BuyStage, PaymentNetwork, IconComponent, etc.)
   now live in components/portal/types.ts, imported above, so both this
   file and the extracted components stay in sync automatically. */

/* -------------------------------------------------------------------------- */
/*                                     DATA                                   */
/* -------------------------------------------------------------------------- */

const packagePlans: PackagePlan[] = [
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

const paymentNetworks: Record<
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

const emptyResellerForm: ResellerFormData = {
  fullName: "",
  phone: "",
  whatsapp: "",
  email: "",
  location: "",
  username: "",
  password: "",
  idFrontFileName: "",
  idBackFileName: "",
  faceCaptureFileName: "",
  idFrontImage: "",
  idBackImage: "",
  faceCaptureImage: "",
};

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function formatMoney(amount: number) {
  return `${sym()} ${amount.toFixed(2)}`;
}

function cleanPhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 12);
}

function normalizeGhanaPhone(value: string) {
  const cleaned = value.replace(/\D/g, "");

  if (
    cleaned.startsWith("233") &&
    cleaned.length === 12
  ) {
    return `0${cleaned.slice(3)}`;
  }

  return cleaned.slice(0, 10);
}

function displayPhoneNumber(value: string) {
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

function isValidGhanaPhone(value: string) {
  const phone = normalizeGhanaPhone(value);

  return /^0[235][0-9]{8}$/.test(phone);
}

function detectPaymentNetwork(
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

function generateReference() {
  const timestamp = Date.now()
    .toString()
    .slice(-8);

  const random = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `HP-${timestamp}-${random}`;
}

function generateSessionId() {
  return `SES-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}

function generateVoucherUsername() {
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

function generateVoucherPassword() {
  return Math.floor(
    100000 + Math.random() * 900000,
  ).toString();
}

/* Shared, reusable pieces (PortalHeader, BrandHeader, InputField,
   PrimaryButton, ModalShell, FileCaptureField) now live under
   components/portal/, imported at the top of this file. */

/* -------------------------------------------------------------------------- */
/*                                HOME PORTAL                                 */
/* -------------------------------------------------------------------------- */

function HomePortal({
  voucherUsername,
  voucherPassword,
  showPassword,
  error,
  connectedFromVoucher,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  onVoucherLogin,
  onOpenBuy,
  onOpenReseller,
}: {
  voucherUsername: string;
  voucherPassword: string;
  showPassword: boolean;
  error: string;
  connectedFromVoucher: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onVoucherLogin: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
  onOpenBuy: () => void;
  onOpenReseller: () => void;
}) {
  return (
    <div>
      <BrandHeader />

      <div className="mt-6 text-center">
        <h2 className="text-2xl font-black text-[#0f172a]">
          Welcome!
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#64748b]">
          Enter your voucher or buy internet
          access online.
        </p>
      </div>

      {connectedFromVoucher && (
        <div className="mt-5 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 text-center">
          <CheckCircle2 className="mx-auto text-[#059669]" />

          <p className="mt-2 font-bold text-[#047857]">
            Internet connected
          </p>

          <p className="mt-1 text-xs text-[#059669]">
            Your voucher has been accepted.
          </p>
        </div>
      )}

      <form
        onSubmit={onVoucherLogin}
        className="mt-6 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_10px_30px_rgba(37,99,235,0.06)]"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#2563eb]">
            <Ticket size={22} />
          </div>

          <div>
            <h3 className="font-black text-[#0f172a]">
              Use Voucher
            </h3>

            <p className="text-xs text-[#64748b]">
              Enter the voucher code. Add a password only if it has one.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <InputField
            label="Voucher code"
            value={voucherUsername}
            placeholder="Enter voucher code"
            icon={CircleUserRound}
            required
            onChange={onUsernameChange}
          />

          <InputField
            label="Password"
            value={voucherPassword}
            placeholder="Same as the code, if it has no password"
            icon={KeyRound}
            type={
              showPassword
                ? "text"
                : "password"
            }
            onChange={onPasswordChange}
            rightElement={
              <button
                type="button"
                onClick={onTogglePassword}
                aria-label="Show or hide password"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            }
          />
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-[#fff4f4] p-3 text-sm text-[#dc2626]">
            {error}
          </p>
        )}

        <div className="mt-5">
          <PrimaryButton type="submit">
            Log In
            <ArrowRight size={18} />
          </PrimaryButton>
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-xs font-bold text-[#94a3b8]">
            OR
          </span>

          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={onOpenBuy}
          className="flex w-full items-center gap-4 rounded-xl border border-[#bfdbfe] bg-[#f1f5f9] p-4 text-left transition hover:border-[#f4b400] hover:bg-[#f1f5f9]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white">
            <ShoppingCart size={23} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-black text-[#0f172a]">
              Buy Online Voucher
            </p>

            <p className="mt-1 text-xs leading-5 text-[#64748b]">
              Select a package and pay with Mobile
              Money
            </p>
          </div>

          <ChevronRight className="text-[#2563eb]" />
        </button>

        <button
          type="button"
          onClick={onOpenReseller}
          className="mt-3 flex w-full items-center gap-4 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-100"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-[#0f172a]">
            <UsersRound size={23} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-black text-[#0f172a]">
              Apply for Reseller / Agent
            </p>

            <p className="mt-1 text-xs leading-5 text-[#64748b]">
              Join the network and start earning
            </p>
          </div>

          <ChevronRight className="text-[#047857]" />
        </button>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  BUY FORM                                  */
/* -------------------------------------------------------------------------- */

function BuyForm({
  selectedPackageId,
  buyerType,
  recipientPhone,
  paymentPhone,
  detectedPaymentNetwork,
  allowDevice,
  deviceMac,
  onDeviceMacChange,
  error,
  onPackageChange,
  onBuyerTypeChange,
  onRecipientPhoneChange,
  onPaymentPhoneChange,
  onSubmit,
  plans,
}: {
  selectedPackageId: string;
  buyerType: BuyerType;
  recipientPhone: string;
  paymentPhone: string;
  detectedPaymentNetwork: PaymentNetwork;
  allowDevice: boolean;
  deviceMac: string;
  onDeviceMacChange: (value: string) => void;
  error: string;
  onPackageChange: (id: string) => void;
  onBuyerTypeChange: (type: BuyerType) => void;
  onRecipientPhoneChange: (value: string) => void;
  onPaymentPhoneChange: (value: string) => void;
  onSubmit: () => void;
  plans: PackagePlan[];
}) {
  const selectedPackage = plans.find(
    (plan) => plan.id === selectedPackageId,
  );

  const networkDetected =
    detectedPaymentNetwork.id !== "unknown";

  return (
    <div>
      <section>
        <p className="mb-3 text-sm font-black text-[#0f172a]">
          1. Choose a package
        </p>

        <div className="space-y-2.5">
          {plans.map((plan) => {
            const selected =
              selectedPackageId === plan.id;

            return (
              <button
                type="button"
                key={plan.id}
                onClick={() =>
                  onPackageChange(plan.id)
                }
                className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                  selected
                    ? "border-[#f4b400] bg-[#f1f5f9] ring-2 ring-amber-100"
                    : "border-[#e2e8f0] bg-white hover:border-[#60a5fa]"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected
                      ? "border-[#f4b400]"
                      : "border-[#cbd5e1]"
                  }`}
                >
                  {selected && (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f4b400]" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#0f172a]">
                    {plan.name}
                  </p>

                  <p className="mt-1 text-xs text-[#64748b]">
                    {plan.speed} · {plan.validity}
                  </p>
                </div>

                <p className="text-sm font-black text-[#1d4ed8]">
                  {formatMoney(plan.price)}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 border-t border-[#e2e8f0] pt-5">
        <p className="mb-3 text-sm font-black text-[#0f172a]">
          2. Who is this package for?
        </p>

        <div className={`grid gap-3 ${allowDevice ? "grid-cols-3" : "grid-cols-2"}`}>
          <button
            type="button"
            onClick={() =>
              onBuyerTypeChange("self")
            }
            className={`rounded-xl border p-3.5 text-left transition ${
              buyerType === "self"
                ? "border-[#f4b400] bg-[#f1f5f9]"
                : "border-[#e2e8f0]"
            }`}
          >
            <UserRound
              size={20}
              className={
                buyerType === "self"
                  ? "text-[#2563eb]"
                  : "text-[#64748b]"
              }
            />

            <p className="mt-2 text-sm font-black text-[#0f172a]">
              Myself
            </p>

            <p className="mt-1 text-[11px] leading-4 text-[#64748b]">
              Connect this device
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              onBuyerTypeChange("other")
            }
            className={`rounded-xl border p-3.5 text-left transition ${
              buyerType === "other"
                ? "border-[#f4b400] bg-[#f1f5f9]"
                : "border-[#e2e8f0]"
            }`}
          >
            <UsersRound
              size={20}
              className={
                buyerType === "other"
                  ? "text-[#2563eb]"
                  : "text-[#64748b]"
              }
            />

            <p className="mt-2 text-sm font-black text-[#0f172a]">
              Someone Else
            </p>

            <p className="mt-1 text-[11px] leading-4 text-[#64748b]">
              Send voucher by SMS
            </p>
          </button>

          {allowDevice && (
            <button
              type="button"
              data-testid="portal-buy-device"
              onClick={() =>
                onBuyerTypeChange("device")
              }
              className={`rounded-xl border p-3.5 text-left transition ${
                buyerType === "device"
                  ? "border-[#f4b400] bg-[#f1f5f9]"
                  : "border-[#e2e8f0]"
              }`}
            >
              <Tv
                size={20}
                className={
                  buyerType === "device"
                    ? "text-[#2563eb]"
                    : "text-[#64748b]"
                }
              />

              <p className="mt-2 text-sm font-black text-[#0f172a]">
                TV / Device
              </p>

              <p className="mt-1 text-[11px] leading-4 text-[#64748b]">
                Connect a TV or other device
              </p>
            </button>
          )}
        </div>

        {buyerType === "device" && (
          <div className="mt-4" data-testid="portal-device-mac">
            <InputField
              label="Device MAC address"
              value={deviceMac}
              placeholder="A4:C3:F0:12:34:56"
              icon={Wifi}
              required
              onChange={onDeviceMacChange}
            />
            <p className="mt-1.5 text-[11px] text-[#64748b]">
              Find it in the TV or device&apos;s network settings.
            </p>
          </div>
        )}

        {buyerType === "other" && (
          <div className="mt-4">
            <InputField
              label="Recipient phone number"
              value={displayPhoneNumber(
                recipientPhone,
              )}
              placeholder="055 123 4567"
              icon={Phone}
              type="tel"
              inputMode="tel"
              required
              onChange={(value) =>
                onRecipientPhoneChange(
                  cleanPhoneNumber(value),
                )
              }
            />
          </div>
        )}
      </section>

      <section className="mt-6 border-t border-[#e2e8f0] pt-5">
        <p className="mb-3 text-sm font-black text-[#0f172a]">
          3. Enter payment number
        </p>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[#0f172a]">
            Mobile Money number
          </span>

          <div className="relative">
            <Smartphone
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />

            <input
              required
              type="tel"
              inputMode="tel"
              value={displayPhoneNumber(
                paymentPhone,
              )}
              placeholder="Enter payment number"
              onChange={(event) =>
                onPaymentPhoneChange(
                  cleanPhoneNumber(
                    event.target.value,
                  ),
                )
              }
              className={`w-full rounded-xl border bg-white py-3.5 pl-12 text-base text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:ring-4 focus:ring-blue-100 ${
                networkDetected
                  ? "border-[#f4b400] pr-36"
                  : "border-[#cbd5e1] pr-4 focus:border-[#2563eb]"
              }`}
            />

            {networkDetected && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div
                  className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${detectedPaymentNetwork.borderClass} ${detectedPaymentNetwork.backgroundClass}`}
                >
                  <span
                    className={`rounded-md px-1.5 py-1 text-[9px] font-black ${detectedPaymentNetwork.badgeClass}`}
                  >
                    {detectedPaymentNetwork.shortName}
                  </span>

                  <span className="max-w-[82px] truncate text-[11px] font-black text-[#0f172a]">
                    {detectedPaymentNetwork.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </label>
      </section>

      <section className="mt-5 rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#64748b]">
            Package
          </span>

          <span className="font-black text-[#0f172a]">
            {selectedPackage?.name}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-[#64748b]">
            Recipient
          </span>

          <span className="font-black text-[#0f172a]">
            {buyerType === "self"
              ? "This device"
              : buyerType === "device"
                ? deviceMac.trim().toUpperCase() || "Not entered"
                : displayPhoneNumber(
                  recipientPhone,
                ) || "Not entered"}
          </span>
        </div>

        {networkDetected && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-[#64748b]">
              Payment network
            </span>

            <span className="font-black text-[#0f172a]">
              {detectedPaymentNetwork.name}
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-[#64748b]">
            Payment number
          </span>

          <span className="font-black text-[#0f172a]">
            {displayPhoneNumber(
              paymentPhone,
            ) || "Not entered"}
          </span>
        </div>

        <div className="mt-4 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center justify-between">
            <span className="font-black text-[#0f172a]">
              Total amount
            </span>

            <span className="text-xl font-black text-[#1d4ed8]">
              {selectedPackage
                ? formatMoney(
                    selectedPackage.price,
                  )
                : formatMoney(0)}
            </span>
          </div>
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-[#fff4f4] p-3 text-sm text-[#dc2626]">
          {error}
        </p>
      )}

      <div className="mt-5">
        <PrimaryButton
          disabled={
            !isValidGhanaPhone(
              paymentPhone,
            ) || !networkDetected
          }
          onClick={onSubmit}
        >
          Pay Now
          <ArrowRight size={18} />
        </PrimaryButton>
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs leading-5 text-[#64748b]">
        <KeyRound size={14} />
        Approve the secure payment prompt on your
        phone.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             PROCESSING VIEW                                */
/* -------------------------------------------------------------------------- */

function ProcessingContent({
  paymentStage,
  selectedPackage,
  paymentNetwork,
  paymentPhone,
  elapsedSeconds,
  onSandbox,
}: {
  paymentStage: PaymentStage;
  selectedPackage?: PackagePlan;
  paymentNetwork: PaymentNetwork;
  paymentPhone: string;
  elapsedSeconds: number;
  onSandbox?: (outcome: "pay" | "fail") => void;
}) {
  const content = {
    initiating: {
      title: "Sending payment request",
      description:
        "Connecting securely to your Mobile Money service.",
    },

    waiting: {
      title: "Approve the payment prompt",
      description: `A payment request was sent to ${displayPhoneNumber(
        paymentPhone,
      )}.`,
    },

    confirming: {
      title: "Confirming payment",
      description:
        "Payment received. Activating your internet.",
    },
  }[paymentStage];

  return (
    <div className="py-5 text-center">
      <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-[9px] border-[#f1f5f9]" />

        <div className="absolute inset-0 animate-spin rounded-full border-[9px] border-transparent border-r-[#2563eb] border-t-[#2563eb]" />

        {paymentStage === "waiting" ? (
          <Smartphone
            size={36}
            className="text-[#0f172a]"
          />
        ) : (
          <LoaderCircle
            size={38}
            className="text-[#0f172a]"
          />
        )}
      </div>

      <h3 className="mt-6 text-xl font-black text-[#0f172a]">
        {content.title}
      </h3>

      <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#64748b]">
        {content.description}
      </p>

      <div
        className={`mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border px-3 py-2 ${paymentNetwork.borderClass} ${paymentNetwork.backgroundClass}`}
      >
        <span
          className={`rounded-md px-2 py-1 text-[10px] font-black ${paymentNetwork.badgeClass}`}
        >
          {paymentNetwork.shortName}
        </span>

        <span className="text-xs font-bold text-[#0f172a]">
          {paymentNetwork.name}
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-[#64748b]">
            Package
          </span>

          <span className="font-black text-[#0f172a]">
            {selectedPackage?.name}
          </span>
        </div>

        <div className="mt-3 flex justify-between text-sm">
          <span className="text-[#64748b]">
            Network
          </span>

          <span className="font-black text-[#0f172a]">
            {paymentNetwork.name}
          </span>
        </div>

        <div className="mt-3 flex justify-between text-sm">
          <span className="text-[#64748b]">
            Number
          </span>

          <span className="font-black text-[#0f172a]">
            {displayPhoneNumber(
              paymentPhone,
            )}
          </span>
        </div>

        <div className="mt-3 flex justify-between text-sm">
          <span className="text-[#64748b]">
            Amount
          </span>

          <span className="font-black text-[#0f172a]">
            {selectedPackage
              ? formatMoney(
                  selectedPackage.price,
                )
              : formatMoney(0)}
          </span>
        </div>

        <div className="mt-3 flex justify-between text-sm">
          <span className="text-[#64748b]">
            Time
          </span>

          <span className="font-black text-[#0f172a]">
            {elapsedSeconds}s
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] p-4 text-sm leading-6 text-[#1e3a8a]">
        Do not close this popup. Approve the
        payment request on your phone.
      </div>

      {onSandbox && (
        <div
          data-testid="sandbox-box"
          className="mt-4 rounded-xl border border-[#e2e8f0] bg-white p-4 text-left"
        >
          <p className="text-xs font-bold text-[#475569]">
            Test mode — no real money is taken
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              data-testid="sandbox-approve"
              onClick={() => onSandbox("pay")}
              className="flex-1 rounded-lg bg-[#2563eb] px-3 py-2 text-sm font-bold text-white hover:bg-[#1d4ed8]"
            >
              Approve payment
            </button>
            <button
              type="button"
              data-testid="sandbox-decline"
              onClick={() => onSandbox("fail")}
              className="flex-1 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold text-[#475569] hover:bg-[#f1f5f9]"
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              CONNECTED VIEW                                */
/* -------------------------------------------------------------------------- */

function ConnectedContent({
  selectedPackage,
  paymentResult,
  deviceMac,
  onDone,
}: {
  selectedPackage?: PackagePlan;
  paymentResult: PaymentResult | null;
  deviceMac?: string;
  onDone: () => void;
}) {
  const expiry = useMemo(() => {
    const date = new Date();

    if (selectedPackage?.validityHours) {
      date.setHours(
        date.getHours() +
          selectedPackage.validityHours,
      );
    } else {
      date.setDate(
        date.getDate() +
          (selectedPackage?.validityDays ?? 1),
      );
    }

    return date.toLocaleString("en-GH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [selectedPackage]);

  return (
    <div className="text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-[#059669]">
        <Wifi
          size={49}
          strokeWidth={3}
        />
      </div>

      <h3 className="mt-5 text-2xl font-black text-[#0f172a]">
        {deviceMac ? "Device Connected!" : "You\u2019re Connected!"}
      </h3>

      <p className="mt-2 text-sm text-[#64748b]" data-testid="portal-connected-note">
        {deviceMac
          ? `Your package is active on ${deviceMac.toUpperCase()}.`
          : "Your internet package is active."}
      </p>

      <div className="mt-6 rounded-xl border border-[#e2e8f0] bg-white p-4 text-left">
        <div className="flex justify-between border-b border-[#f1f5f9] py-3 text-sm">
          <span className="text-[#64748b]">
            Status
          </span>

          <span className="flex items-center gap-2 font-black text-[#059669]">
            <span className="h-2 w-2 rounded-full bg-[#ecfdf5]0" />
            Connected
          </span>
        </div>

        <div className="flex justify-between border-b border-[#f1f5f9] py-3 text-sm">
          <span className="text-[#64748b]">
            Package
          </span>

          <span className="font-black text-[#0f172a]">
            {selectedPackage?.name}
          </span>
        </div>

        <div className="flex justify-between border-b border-[#f1f5f9] py-3 text-sm">
          <span className="text-[#64748b]">
            Speed
          </span>

          <span className="font-black text-[#0f172a]">
            Up to {selectedPackage?.speed}
          </span>
        </div>

        <div className="flex justify-between border-b border-[#f1f5f9] py-3 text-sm">
          <span className="text-[#64748b]">
            Valid until
          </span>

          <span className="max-w-[190px] text-right font-black text-[#0f172a]">
            {expiry}
          </span>
        </div>

        <div className="flex justify-between border-b border-[#f1f5f9] py-3 text-sm">
          <span className="text-[#64748b]">
            Reference
          </span>

          <span className="font-black text-[#0f172a]">
            {paymentResult?.reference}
          </span>
        </div>

        <div className="flex justify-between py-3 text-sm">
          <span className="text-[#64748b]">
            Session ID
          </span>

          <span className="font-black text-[#0f172a]">
            {paymentResult?.sessionId}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 text-sm leading-6 text-[#047857]">
        <CheckCircle2 className="mx-auto mb-2" />

        No logout is required. Access ends
        automatically when the package expires.
      </div>

      <div className="mt-5">
        <PrimaryButton onClick={onDone}>
          Done
          <Check size={18} />
        </PrimaryButton>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            VOUCHER SENT VIEW                               */
/* -------------------------------------------------------------------------- */

function VoucherSentContent({
  selectedPackage,
  recipientPhone,
  paymentResult,
  onDone,
}: {
  selectedPackage?: PackagePlan;
  recipientPhone: string;
  paymentResult: PaymentResult | null;
  onDone: () => void;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#f1f5f9] text-[#2563eb]">
        <MessageSquareText size={46} />
      </div>

      <h3 className="mt-5 text-2xl font-black text-[#0f172a]">
        Voucher Sent!
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#64748b]">
        The voucher details were sent by SMS to:
      </p>

      <p className="mt-2 text-xl font-black text-[#1d4ed8]">
        {displayPhoneNumber(
          recipientPhone,
        )}
      </p>

      <div className="mt-6 rounded-xl border border-[#e2e8f0] bg-white p-4 text-left">
        <div className="flex justify-between border-b border-[#f1f5f9] py-3 text-sm">
          <span className="text-[#64748b]">
            Package
          </span>

          <span className="font-black text-[#0f172a]">
            {selectedPackage?.name}
          </span>
        </div>

        <div className="flex justify-between border-b border-[#f1f5f9] py-3 text-sm">
          <span className="text-[#64748b]">
            Username
          </span>

          <span className="font-black text-[#0f172a]">
            {paymentResult?.voucherUsername}
          </span>
        </div>

        <div className="flex justify-between border-b border-[#f1f5f9] py-3 text-sm">
          <span className="text-[#64748b]">
            Password
          </span>

          <span className="font-black text-[#0f172a]">
            {paymentResult?.voucherPassword}
          </span>
        </div>

        <div className="flex justify-between py-3 text-sm">
          <span className="text-[#64748b]">
            Reference
          </span>

          <span className="font-black text-[#0f172a]">
            {paymentResult?.reference}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] p-4 text-sm leading-6 text-[#1e3a8a]">
        The recipient can enter the username and
        password on the portal to connect.
      </div>

      <div className="mt-5">
        <PrimaryButton onClick={onDone}>
          Done
          <Check size={18} />
        </PrimaryButton>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         RESELLER APPLICATION                               */
/* -------------------------------------------------------------------------- */

function ResellerApplication({
  form,
  error,
  submitted,
  onChange,
  onSubmit,
  onDone,
}: {
  form: ResellerFormData;
  error: string;
  submitted: boolean;
  onChange: (
    field: keyof ResellerFormData,
    value: string,
  ) => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
  onDone: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-[#047857]">
          <Send size={43} />
        </div>

        <h3 className="mt-5 text-2xl font-black text-[#0f172a]">
          Application Submitted
        </h3>

        <p className="mt-3 text-sm leading-6 text-[#64748b]">
          Your reseller application has been
          received. Our team will contact you after
          reviewing it.
        </p>

        <div className="mt-6">
          <PrimaryButton onClick={onDone}>
            Done
            <Check size={18} />
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
    >
      <InputField
        label="Full name"
        value={form.fullName}
        placeholder="Enter your full name"
        icon={UserRound}
        required
        onChange={(value) =>
          onChange("fullName", value)
        }
      />

      <InputField
        label="Choose a username"
        value={form.username}
        placeholder="e.g. kwame.sells"
        icon={CircleUserRound}
        required
        onChange={(value) =>
          onChange("username", value)
        }
      />

      <InputField
        label="Choose a password"
        value={form.password}
        placeholder="At least 6 characters"
        icon={KeyRound}
        type={showPassword ? "text" : "password"}
        required
        onChange={(value) =>
          onChange("password", value)
        }
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="text-[#94a3b8]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />

      <InputField
        label="Phone number"
        value={displayPhoneNumber(
          form.phone,
        )}
        placeholder="055 123 4567"
        icon={Phone}
        type="tel"
        inputMode="tel"
        required
        onChange={(value) =>
          onChange(
            "phone",
            cleanPhoneNumber(value),
          )
        }
      />

      <label className="flex items-center gap-2 text-xs text-[#64748b]">
        <input
          type="checkbox"
          checked={form.whatsapp === form.phone && form.phone !== ""}
          onChange={(event) =>
            onChange("whatsapp", event.target.checked ? form.phone : "")
          }
          className="h-4 w-4 rounded border-[#e2e8f0] accent-[#2563eb]"
        />
        My WhatsApp number is the same as my phone number
      </label>

      <InputField
        label="WhatsApp number"
        value={displayPhoneNumber(form.whatsapp)}
        placeholder="055 123 4567"
        icon={Phone}
        type="tel"
        inputMode="tel"
        required
        onChange={(value) => onChange("whatsapp", cleanPhoneNumber(value))}
      />

      <InputField
        label="Gmail / Email address"
        value={form.email}
        placeholder="you@gmail.com"
        icon={Mail}
        type="email"
        inputMode="email"
        required
        onChange={(value) =>
          onChange("email", value)
        }
      />

      <InputField
        label="Location or area"
        value={form.location}
        placeholder="Enter your location"
        icon={MapPin}
        required
        onChange={(value) =>
          onChange("location", value)
        }
      />

      <FileCaptureField
        label="ID Card — Front"
        icon={Upload}
        fileName={form.idFrontFileName}
        preview={form.idFrontImage}
        onSelect={(fileName, picture) => {
          onChange("idFrontFileName", fileName);
          onChange("idFrontImage", picture);
        }}
      />

      <FileCaptureField
        label="ID Card — Back"
        icon={Upload}
        fileName={form.idBackFileName}
        preview={form.idBackImage}
        onSelect={(fileName, picture) => {
          onChange("idBackFileName", fileName);
          onChange("idBackImage", picture);
        }}
      />

      <FileCaptureField
        label="Face Capture (selfie)"
        icon={Camera}
        fileName={form.faceCaptureFileName}
        preview={form.faceCaptureImage}
        onSelect={(fileName, picture) => {
          onChange("faceCaptureFileName", fileName);
          onChange("faceCaptureImage", picture);
        }}
        capture="user"
      />

      {error && (
        <p className="rounded-xl border border-red-200 bg-[#fff4f4] p-3 text-sm text-[#dc2626]">
          {error}
        </p>
      )}

      <PrimaryButton type="submit">
        Submit Application
        <Send size={18} />
      </PrimaryButton>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                     PAGE                                   */
/* -------------------------------------------------------------------------- */

function CaptivePortalPageInner() {
  const { addAgent, fireAlert, routers, agents, getCaptivePortalConfig } = useDashboard();
  const searchParams = useSearchParams();
  // Which router's captive portal this page represents. In a real system
  // each router serves its own portal at its own address; here, since
  // this is one shared demo page, ?router=<ip> in the URL says which one
  // — falling back to the first router so the page still works without it.
  const portalRouterIp = searchParams.get("router") ?? routers[0]?.ip ?? null;
  // The admin's captive-portal settings for this router's site decide
  // which options customers see (e.g. "Buy for TV or another device").
  const captiveConfig = getCaptivePortalConfig(portalRouterIp ?? "");

  const [voucherUsername, setVoucherUsername] =
    useState("");

  const [voucherPassword, setVoucherPassword] =
    useState("");

  const [
    showVoucherPassword,
    setShowVoucherPassword,
  ] = useState(false);

  const [voucherError, setVoucherError] =
    useState("");

  const [
    connectedFromVoucher,
    setConnectedFromVoucher,
  ] = useState(false);

  const [buyModalOpen, setBuyModalOpen] =
    useState(false);

  const [buyStage, setBuyStage] =
    useState<BuyStage>("form");

  const [
    selectedPackageId,
    setSelectedPackageId,
  ] = useState("daily");

  const [buyerType, setBuyerType] =
    useState<BuyerType>("self");

  const [deviceMac, setDeviceMac] = useState("");

  const [
    recipientPhone,
    setRecipientPhone,
  ] = useState("");

  const [
    paymentPhone,
    setPaymentPhone,
  ] = useState("");

  const [
    purchaseError,
    setPurchaseError,
  ] = useState("");

  const [
    paymentStage,
    setPaymentStage,
  ] = useState<PaymentStage>("initiating");

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const [
    paymentResult,
    setPaymentResult,
  ] = useState<PaymentResult | null>(
    null,
  );

  const [
    resellerModalOpen,
    setResellerModalOpen,
  ] = useState(false);

  const [
    resellerForm,
    setResellerForm,
  ] = useState<ResellerFormData>(
    emptyResellerForm,
  );

  const [
    resellerError,
    setResellerError,
  ] = useState("");

  const [
    resellerSubmitted,
    setResellerSubmitted,
  ] = useState(false);

  const paymentTimers =
    useRef<number[]>([]);

  // With the HotspotPro server running, packages and payments are real; with
  // no server (static preview) the built-in plans and a timed demo are used.
  const [plans, setPlans] = useState<PackagePlan[]>(packagePlans);
  const [payMode, setPayMode] = useState<"hubtel" | "sandbox" | "off" | null>(null);
  const [purchaseRef, setPurchaseRef] = useState<string | null>(null);
  const routerToken = searchParams.get("rt");
  const hotspotLoginUrl = searchParams.get("login");
  const hotspotDst = searchParams.get("dst");

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams();
    if (portalRouterIp) query.set("router", portalRouterIp);
    if (routerToken) query.set("rt", routerToken);
    fetch(`/api/portal/config?${query}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (cancelled || !config || !Array.isArray(config.packages)) return;
        setPlans(config.packages as PackagePlan[]);
        setPayMode(config.payments);
        if (config.packages[0]) setSelectedPackageId(config.packages[0].id);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalRouterIp, routerToken]);

  // Hand the customer's login back to the router, which is what really lets them online.
  function routerLogin(username: string, password: string) {
    if (!hotspotLoginUrl || !/^https?:\/\//.test(hotspotLoginUrl)) return;
    const form = document.createElement("form");
    form.method = "post";
    form.action = hotspotLoginUrl;
    const fields: Record<string, string> = { username, password, dst: hotspotDst ?? "" };
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  const selectedPackage =
    plans.find(
      (plan) =>
        plan.id === selectedPackageId,
    );

  const detectedPaymentNetworkId =
    detectPaymentNetwork(paymentPhone);

  const detectedPaymentNetwork =
    paymentNetworks[
      detectedPaymentNetworkId
    ];

  useEffect(() => {
    if (
      !buyModalOpen ||
      buyStage !== "processing"
    ) {
      return;
    }

    const interval =
      window.setInterval(() => {
        setElapsedSeconds(
          (current) => current + 1,
        );
      }, 1000);

    return () =>
      window.clearInterval(interval);
  }, [buyModalOpen, buyStage]);

  useEffect(() => {
    if (
      buyModalOpen ||
      resellerModalOpen
    ) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "";
    }

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [
    buyModalOpen,
    resellerModalOpen,
  ]);

  useEffect(() => {
    return () => {
      paymentTimers.current.forEach(
        (timer) =>
          window.clearTimeout(timer),
      );
    };
  }, []);

  function clearPaymentTimers() {
    paymentTimers.current.forEach(
      (timer) => {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      },
    );

    paymentTimers.current = [];
  }

  function resetBuyModal() {
    clearPaymentTimers();

    setBuyStage("form");
    setPurchaseRef(null);
    setSelectedPackageId(plans[0]?.id ?? "daily");
    setBuyerType("self");
    setRecipientPhone("");
    setDeviceMac("");
    setPaymentPhone("");
    setPurchaseError("");
    setPaymentStage("initiating");
    setElapsedSeconds(0);
    setPaymentResult(null);
  }

  function openBuyModal() {
    resetBuyModal();
    setBuyModalOpen(true);
  }

  function closeBuyModal() {
    if (buyStage === "processing") {
      return;
    }

    setBuyModalOpen(false);

    window.setTimeout(() => {
      resetBuyModal();
    }, 200);
  }

  function handleVoucherLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setVoucherError("");
    setConnectedFromVoucher(false);

    const username = voucherUsername.trim();
    const password = voucherPassword.trim() || username;
    if (!username) {
      setVoucherError("Enter your voucher code.");
      return;
    }

    if (payMode !== null) {
      fetch("/api/portal/voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(routerToken ? { "x-hsp-rt": routerToken } : {}) },
        body: JSON.stringify({ username, password }),
      })
        .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) }))
        .then(({ ok, body }) => {
          if (!ok || !body.valid) {
            setVoucherError(body.message ?? "That voucher isn't valid.");
            return;
          }
          setConnectedFromVoucher(true);
          routerLogin(username, password);
        })
        .catch(() => setVoucherError("Could not reach the service. Try again."));
      return;
    }

    setConnectedFromVoucher(true);
  }

  // Real payment: ask the server to start it, then watch for the result.
  async function startServerPayment() {
    if (!selectedPackage) return;
    setPaymentStage("initiating");
    setElapsedSeconds(0);
    setBuyStage("processing");
    try {
      const response = await fetch("/api/portal/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(routerToken ? { "x-hsp-rt": routerToken } : {}) },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          phone: paymentPhone,
          buyerType,
          recipientPhone: buyerType === "other" ? recipientPhone : undefined,
          deviceMac: buyerType === "device" ? deviceMac : undefined,
          routerIp: portalRouterIp,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setBuyStage("form");
        setPurchaseError(body.message ?? "The payment could not be started.");
        return;
      }
      setPurchaseRef(body.reference);
      setPaymentStage("waiting");
      const reference: string = body.reference;
      const timer = window.setInterval(async () => {
        try {
          const r = await fetch(`/api/portal/purchase/${reference}`);
          const status = await r.json();
          if (status.status === "paid") {
            window.clearInterval(timer);
            setPaymentStage("confirming");
            const result: PaymentResult = {
              reference,
              sessionId: reference,
              completedAt: status.paidAt ?? new Date().toISOString(),
              voucherUsername: status.voucher?.username,
              voucherPassword: status.voucher?.password,
            };
            setPaymentResult(result);
            if (buyerType === "self") {
              setBuyStage("connected");
              if (result.voucherUsername) routerLogin(result.voucherUsername, result.voucherPassword ?? result.voucherUsername);
            } else {
              setBuyStage("voucher-sent");
            }
          } else if (status.status === "failed" || status.status === "expired") {
            window.clearInterval(timer);
            setBuyStage("form");
            setPurchaseError(status.reason ?? "The payment did not go through.");
          }
        } catch {
          // keep trying
        }
      }, 2000);
      paymentTimers.current = [timer];
    } catch {
      setBuyStage("form");
      setPurchaseError("Could not reach the service. Try again.");
    }
  }

  async function sandboxDecision(outcome: "pay" | "fail") {
    if (!purchaseRef) return;
    await fetch(`/api/portal/purchase/${purchaseRef}/sandbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    }).catch(() => undefined);
  }

  function startPayment() {
    setPurchaseError("");

    if (!selectedPackage) {
      setPurchaseError(
        "Select an internet package.",
      );

      return;
    }

    if (
      buyerType === "other" &&
      !isValidGhanaPhone(
        recipientPhone,
      )
    ) {
      setPurchaseError(
        "Enter a valid Ghanaian recipient phone number.",
      );

      return;
    }

    if (
      buyerType === "device" &&
      !/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(
        deviceMac.trim(),
      )
    ) {
      setPurchaseError(
        "Enter the device MAC address, e.g. A4:C3:F0:12:34:56.",
      );

      return;
    }

    if (
      !isValidGhanaPhone(paymentPhone)
    ) {
      setPurchaseError(
        "Enter a valid Ghanaian Mobile Money number.",
      );

      return;
    }

    if (
      detectedPaymentNetworkId ===
      "unknown"
    ) {
      setPurchaseError(
        "The payment network could not be detected.",
      );

      return;
    }

    clearPaymentTimers();

    if (payMode === "off") {
      setPurchaseError("Online payment isn't available here yet. Please buy a voucher from an attendant.");
      return;
    }
    if (payMode !== null) {
      void startServerPayment();
      return;
    }

    setPaymentStage("initiating");
    setElapsedSeconds(0);
    setBuyStage("processing");

    const waitingTimer =
      window.setTimeout(() => {
        setPaymentStage("waiting");
      }, 1200);

    const confirmingTimer =
      window.setTimeout(() => {
        setPaymentStage("confirming");
      }, 5000);

    const successTimer =
      window.setTimeout(() => {
        const result: PaymentResult = {
          reference:
            generateReference(),
          sessionId:
            generateSessionId(),
          completedAt:
            new Date().toISOString(),
        };

        if (buyerType === "other") {
          result.voucherUsername =
            generateVoucherUsername();

          result.voucherPassword =
            generateVoucherPassword();
        }

        setPaymentResult(result);

        if (buyerType !== "other") {
          setBuyStage("connected");
        } else {
          setBuyStage(
            "voucher-sent",
          );
        }
      }, 8000);

    paymentTimers.current = [
      waitingTimer,
      confirmingTimer,
      successTimer,
    ];
  }

  function completeBuyFlow() {
    setBuyModalOpen(false);

    window.setTimeout(() => {
      resetBuyModal();
    }, 200);
  }

  function openResellerModal() {
    setResellerForm(
      emptyResellerForm,
    );

    setResellerError("");
    setResellerSubmitted(false);
    setResellerModalOpen(true);
  }

  function closeResellerModal() {
    setResellerModalOpen(false);
  }

  function handleResellerSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setResellerError("");

    if (
      !resellerForm.fullName.trim()
    ) {
      setResellerError(
        "Enter your full name.",
      );

      return;
    }

    if (
      !isValidGhanaPhone(
        resellerForm.phone,
      )
    ) {
      setResellerError(
        "Enter a valid Ghanaian phone number.",
      );

      return;
    }

    if (
      !resellerForm.email.includes(
        "@",
      ) ||
      !resellerForm.email.includes(
        ".",
      )
    ) {
      setResellerError(
        "Enter a valid email address.",
      );

      return;
    }

    if (
      !resellerForm.location.trim()
    ) {
      setResellerError(
        "Enter your location or area.",
      );

      return;
    }

    const usernameIssue = usernameProblem(resellerForm.username, agents);
    if (usernameIssue) {
      setResellerError(usernameIssue);
      return;
    }

    const emailIssue = emailProblem(resellerForm.email, agents);
    if (emailIssue) {
      setResellerError(
        emailIssue.includes("already exists")
          ? "An application or account with this email already exists. If it's yours, sign in or contact admin."
          : emailIssue,
      );
      return;
    }

    if (!resellerForm.password || resellerForm.password.length < 6) {
      setResellerError("Choose a password with at least 6 characters.");
      return;
    }

    if (!resellerForm.idFrontFileName || !resellerForm.idBackFileName) {
      setResellerError("Upload both the front and back of your ID.");
      return;
    }

    if (!resellerForm.faceCaptureFileName) {
      setResellerError("Take a face capture (selfie) to verify your identity.");
      return;
    }

    if (!isValidGhanaPhone(resellerForm.whatsapp)) {
      setResellerError("Enter a valid WhatsApp number.");
      return;
    }

    addAgent(
      resellerForm.fullName.trim(),
      resellerForm.email.trim(),
      "Field Agent",
      portalRouterIp,
      {
        phone: resellerForm.phone,
        whatsapp: resellerForm.whatsapp,
        location: resellerForm.location,
        password: resellerForm.password,
        appliedViaPortal: true,
        idFrontFileName: resellerForm.idFrontFileName,
        idBackFileName: resellerForm.idBackFileName,
        faceCaptureFileName: resellerForm.faceCaptureFileName,
        // Everything the form asked for goes through — including the username
        // they chose and the pictures of their ID and face.
        username: resellerForm.username,
        idFrontImage: resellerForm.idFrontImage || undefined,
        idBackImage: resellerForm.idBackImage || undefined,
        faceCaptureImage: resellerForm.faceCaptureImage || undefined,
      },
    );

    const appliedRouter = routers.find((r) => r.ip === portalRouterIp);
    fireAlert(
      "resellerApplied",
      `${resellerForm.fullName.trim()} applied to become a reseller${appliedRouter ? ` on ${appliedRouter.name}` : ""}.`,
      { routerIp: portalRouterIp ?? undefined },
    );

    setResellerSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-3 py-4 text-[#0f172a] sm:py-8">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-[#e2e8f0] bg-white shadow-[0_20px_60px_rgba(37,99,235,0.12)]">
        <PortalHeader />

        <div className="p-5 sm:p-6">
          <HomePortal
            voucherUsername={
              voucherUsername
            }
            voucherPassword={
              voucherPassword
            }
            showPassword={
              showVoucherPassword
            }
            error={voucherError}
            connectedFromVoucher={
              connectedFromVoucher
            }
            onUsernameChange={
              setVoucherUsername
            }
            onPasswordChange={
              setVoucherPassword
            }
            onTogglePassword={() =>
              setShowVoucherPassword(
                (current) => !current,
              )
            }
            onVoucherLogin={
              handleVoucherLogin
            }
            onOpenBuy={openBuyModal}
            onOpenReseller={
              openResellerModal
            }
          />
        </div>
      </div>

      <p className="mx-auto mt-5 max-w-md text-center text-xs text-[#64748b]">
        Powered by HotspotPro Billing
        System
      </p>

      {buyModalOpen && (
        <ModalShell
          title={
            buyStage === "form"
              ? "Buy Internet"
              : buyStage ===
                  "processing"
                ? "Processing Payment"
                : buyStage ===
                    "connected"
                  ? "Internet Connected"
                  : "Voucher Sent"
          }
          subtitle={
            buyStage === "form"
              ? "Select your package and enter the Mobile Money number."
              : undefined
          }
          onClose={closeBuyModal}
          preventClose={
            buyStage === "processing"
          }
        >
          {buyStage === "form" && (
            <BuyForm
              selectedPackageId={
                selectedPackageId
              }
              buyerType={buyerType}
              recipientPhone={
                recipientPhone
              }
              paymentPhone={
                paymentPhone
              }
              detectedPaymentNetwork={
                detectedPaymentNetwork
              }
              allowDevice={captiveConfig.buyForOtherDevice}
              deviceMac={deviceMac}
              onDeviceMacChange={setDeviceMac}
              error={purchaseError}
              onPackageChange={
                setSelectedPackageId
              }
              onBuyerTypeChange={(
                type,
              ) => {
                setBuyerType(type);

                if (type !== "other") {
                  setRecipientPhone("");
                }
              }}
              onRecipientPhoneChange={
                setRecipientPhone
              }
              onPaymentPhoneChange={
                setPaymentPhone
              }
              onSubmit={startPayment}
              plans={plans}
            />
          )}

          {buyStage ===
            "processing" && (
            <ProcessingContent
              paymentStage={
                paymentStage
              }
              selectedPackage={
                selectedPackage
              }
              paymentNetwork={
                detectedPaymentNetwork
              }
              paymentPhone={
                paymentPhone
              }
              elapsedSeconds={
                elapsedSeconds
              }
              onSandbox={
                payMode === "sandbox" && purchaseRef
                  ? sandboxDecision
                  : undefined
              }
            />
          )}

          {buyStage ===
            "connected" && (
            <ConnectedContent
              selectedPackage={
                selectedPackage
              }
              paymentResult={
                paymentResult
              }
              deviceMac={
                buyerType === "device"
                  ? deviceMac.trim()
                  : undefined
              }
              onDone={
                completeBuyFlow
              }
            />
          )}

          {buyStage ===
            "voucher-sent" && (
            <VoucherSentContent
              selectedPackage={
                selectedPackage
              }
              recipientPhone={
                recipientPhone || paymentPhone
              }
              paymentResult={
                paymentResult
              }
              onDone={
                completeBuyFlow
              }
            />
          )}
        </ModalShell>
      )}

      {resellerModalOpen && (
        <ModalShell
          title="Apply for Reseller / Agent"
          subtitle="Enter your details and submit your application."
          onClose={
            closeResellerModal
          }
        >
          <ResellerApplication
            form={resellerForm}
            error={resellerError}
            submitted={
              resellerSubmitted
            }
            onChange={(
              field,
              value,
            ) =>
              setResellerForm(
                (current) => ({
                  ...current,
                  [field]: value,
                }),
              )
            }
            onSubmit={
              handleResellerSubmit
            }
            onDone={
              closeResellerModal
            }
          />
        </ModalShell>
      )}
    </main>
  );
}
export default function CaptivePortalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9]">
          <Loader2 className="h-9 w-9 animate-spin text-[#2563eb]" />
        </div>
      }
    >
      <CaptivePortalPageInner />
    </Suspense>
  );
}
