// Rules for creating an agent — by you from the Add agent window, or from an
// application on the captive portal — kept as plain logic so they can be
// tested and shared.

import type { AgentRole } from "../shared/types";

export type NewAgentInput = {
  name: string;
  email: string;
  username: string;
  phone: string;
  whatsapp: string;
  location: string;
  role: AgentRole;
  routerIp: string | null;
  commissionPercent: string;
  // Blank = make one for them.
  password: string;
  // Set when someone adds them to help run that agent's dashboard (the
  // admin's own default agent profile, for instance).
  assignedAdminId?: string;
};

export type NewAgentField =
  | "name"
  | "email"
  | "username"
  | "phone"
  | "whatsapp"
  | "commissionPercent"
  | "password";
export type NewAgentErrors = Partial<Record<NewAgentField, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function digitsOf(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

// What the username field says is wrong with a username, or null if it's fine.
export function usernameProblem(
  username: string,
  existing: Array<{ id?: string; username: string }>,
  ignoreId?: string,
): string | null {
  const value = normalizeUsername(username);
  if (!value) return "Choose a username.";
  if (!USERNAME_PATTERN.test(value)) {
    return "Use 3–32 lowercase letters, numbers, dots, dashes or underscores — starting with a letter or number.";
  }
  if (existing.some((agent) => (ignoreId === undefined || agent.id !== ignoreId) && agent.username.toLowerCase() === value)) {
    return "That username is already taken.";
  }
  return null;
}

export function emailProblem(
  email: string,
  existing: Array<{ id?: string; email: string }>,
  ignoreId?: string,
): string | null {
  const value = email.trim().toLowerCase();
  if (!value) return "Enter an email address.";
  if (!EMAIL.test(value)) return "That doesn't look like an email address.";
  if (existing.some((agent) => (ignoreId === undefined || agent.id !== ignoreId) && agent.email.toLowerCase() === value)) {
    return "An agent with this email already exists.";
  }
  return null;
}

export function phoneProblem(phone: string, required: boolean): string | null {
  if (!phone.trim()) return required ? "Enter a phone number." : null;
  const digits = digitsOf(phone);
  return digits.length >= 9 && digits.length <= 15 ? null : "Enter a phone number with 9–15 digits.";
}

export function validateNewAgent(
  input: NewAgentInput,
  existing: Array<{ username: string; email: string }>,
  maxCommissionPercent: number,
): NewAgentErrors {
  const errors: NewAgentErrors = {};
  if (input.name.trim().length < 2) errors.name = "Enter the agent's full name.";

  const email = emailProblem(input.email, existing);
  if (email) errors.email = email;

  const username = usernameProblem(input.username, existing);
  if (username) errors.username = username;

  const phone = phoneProblem(input.phone, true);
  if (phone) errors.phone = phone;

  const whatsapp = phoneProblem(input.whatsapp, false);
  if (whatsapp) errors.whatsapp = whatsapp;

  const rate = Number(input.commissionPercent);
  if (input.commissionPercent.trim() === "" || !Number.isFinite(rate) || rate < 0) {
    errors.commissionPercent = "Enter 0 or more — for example 5 for 5%.";
  } else if (rate > maxCommissionPercent) {
    errors.commissionPercent = `That's above your platform maximum of ${maxCommissionPercent}%.`;
  }

  if (input.password.trim() !== "" && input.password.trim().length < 6) {
    errors.password = "Use at least 6 characters, or leave it blank and we'll make one.";
  }
  return errors;
}

// A readable temporary password: no look-alike characters (0/O, 1/l/I).
export function generateTemporaryPassword(random: () => number = Math.random) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (set: string) => set[Math.floor(random() * set.length)];
  const chars = [pick(letters), pick(letters), pick(letters), pick(letters), pick(letters), pick(letters), pick(digits), pick(digits), pick(digits), pick(digits)];
  // Shuffle so the digits aren't always at the end.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// A username that is free, built from an email's first part (used when an
// application didn't give one, or an older record has none).
export function freeUsername(base: string, existing: Array<{ username: string }>) {
  const clean = normalizeUsername(base).replace(/[^a-z0-9._-]/g, "") || "agent";
  const root = clean.length >= 3 ? clean.slice(0, 28) : (clean + "agent").slice(0, 28);
  let candidate = root;
  let counter = 2;
  while (existing.some((a) => a.username.toLowerCase() === candidate)) {
    candidate = `${root}${counter}`;
    counter += 1;
  }
  return candidate;
}
