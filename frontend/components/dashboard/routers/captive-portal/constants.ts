import type { CaptivePortalTemplate } from "@/components/dashboard/shared/types";

// The 4 captive portal designs a business can choose between. "Classic" is
// the real, fully-built customer login page; the other three are the same
// layout in different color schemes.
export const TEMPLATES: Array<{
  key: CaptivePortalTemplate;
  description: string;
  color: string;
  isNew?: boolean;
}> = [
  { key: "Classic", description: "Your real, fully-built customer login page — packages, voucher login, and reseller sign-up.", color: "bg-blue-500", isNew: true },
  { key: "Dark", description: "Sleek dark theme with green accents", color: "bg-emerald-600" },
  { key: "Ocean Blue", description: "Fresh blue theme with clean design", color: "bg-blue-600" },
  { key: "Sunset", description: "Warm theme with coral accents", color: "bg-amber-500" },
];

export const FONTS = ["Work Sans", "Inter", "Poppins", "Roboto", "Nunito", "Lato"];
export const LANGUAGES = ["English", "French", "Swahili", "Twi", "Hausa"];
