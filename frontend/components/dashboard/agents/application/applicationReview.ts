// The checks an admin runs down when deciding on an agent application:
// is everything filled in, does it look genuine, and does it clash with an
// existing agent. Plain logic so it can be tested.

import type { AgentProfile } from "../../shared/types";
import { digitsOf } from "../agentSignup";

export type ApplicationFiles = { idFront?: string; idBack?: string; face?: string };

export type ReviewCheck = {
  key: string;
  label: string;
  ok: boolean;
  // Short reason shown next to a check that needs attention.
  note: string;
};

// A Ghanaian mobile number, written 0244123456 or +233 244 123 456.
export function isGhanaMobile(value: string) {
  let digits = digitsOf(value);
  if (digits.startsWith("233") && digits.length === 12) digits = "0" + digits.slice(3);
  return /^0[235]\d{8}$/.test(digits);
}

function samePhone(a: string | null, b: string | null) {
  if (!a || !b) return false;
  const norm = (value: string) => {
    let digits = digitsOf(value);
    if (digits.startsWith("233") && digits.length === 12) digits = "0" + digits.slice(3);
    return digits;
  };
  return norm(a) === norm(b);
}

export function reviewApplication(agent: AgentProfile, everyone: AgentProfile[]) {
  const others = everyone.filter((a) => a.id !== agent.id);
  const checks: ReviewCheck[] = [
    {
      key: "name",
      label: "Full name given",
      ok: agent.name.trim().split(/\s+/).filter(Boolean).length >= 2,
      note: "Only one name was given.",
    },
    {
      key: "phone",
      label: "Valid Ghanaian phone number",
      ok: !!agent.phone && isGhanaMobile(agent.phone),
      note: agent.phone ? "That doesn't look like a Ghanaian mobile number." : "No phone number was given.",
    },
    {
      key: "whatsapp",
      label: "Valid WhatsApp number",
      ok: !!agent.whatsapp && isGhanaMobile(agent.whatsapp),
      note: agent.whatsapp ? "That doesn't look like a Ghanaian mobile number." : "No WhatsApp number was given.",
    },
    {
      key: "email",
      label: "Valid email address",
      ok: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(agent.email),
      note: "That doesn't look like an email address.",
    },
    {
      key: "emailUnique",
      label: "Email not used by another agent",
      ok: !others.some((a) => a.email.toLowerCase() === agent.email.toLowerCase()),
      note: "Another agent already uses this email.",
    },
    {
      key: "usernameUnique",
      label: "Username not used by another agent",
      ok: !others.some((a) => a.username.toLowerCase() === agent.username.toLowerCase()),
      note: "Another agent already uses this username.",
    },
    {
      key: "phoneUnique",
      label: "Phone number not used by another agent",
      ok: !others.some((a) => samePhone(a.phone, agent.phone)),
      note: "Another agent already uses this phone number.",
    },
    {
      key: "location",
      label: "Location given",
      ok: !!agent.location && agent.location.trim() !== "",
      note: "No location was given.",
    },
    { key: "idFront", label: "ID card — front provided", ok: !!agent.idFrontFileName, note: "Not submitted." },
    { key: "idBack", label: "ID card — back provided", ok: !!agent.idBackFileName, note: "Not submitted." },
    { key: "face", label: "Selfie provided", ok: !!agent.faceCaptureFileName, note: "Not submitted." },
  ];
  const passed = checks.filter((check) => check.ok).length;
  return { checks, passed, total: checks.length, needsAttention: checks.filter((c) => !c.ok) };
}
