// The emails an agent gets: one when their application is received
// (congratulations + their sign-in details) and one when it is approved.
//
// HotspotPro has no mail server connected yet, so nothing is delivered
// automatically. Each email is written here and kept in an outbox; the admin
// sends it with one click ("Open in Gmail" opens Gmail with the To, Subject
// and message already filled in). Plain logic so the wording can be tested.

import { agentLoginLink } from "./agentLink";

export type AgentEmailKind = "Applied" | "Approved";

export type AgentEmailInput = {
  kind: AgentEmailKind;
  name: string;
  email: string;
  username: string;
  password: string | null;
  agentId: string;
  origin: string;
  businessName?: string;
};

export type BuiltEmail = { to: string; subject: string; body: string };

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

export function buildAgentEmail(input: AgentEmailInput): BuiltEmail {
  const business = input.businessName?.trim() || "HotspotPro";
  const hello = `Hi ${firstName(input.name)},`;
  const link = agentLoginLink(input.origin || "", input.agentId);
  const details = [
    `Sign-in link: ${link}`,
    `Email: ${input.email}`,
    `Username: ${input.username}`,
    `Password: ${input.password ?? "(the password you chose when applying)"}`,
  ].join("\n");

  if (input.kind === "Applied") {
    return {
      to: input.email,
      subject: `Congratulations — your ${business} agent application was received`,
      body: [
        hello,
        "",
        `Congratulations! Your application to become a ${business} agent was submitted successfully. We'll review it shortly and email you again as soon as it's approved.`,
        "",
        "Keep these sign-in details safe — you can use them once you're approved:",
        details,
        "",
        "For your security, change your password after you first sign in and never share it with anyone.",
        "",
        `— The ${business} team`,
      ].join("\n"),
    };
  }

  return {
    to: input.email,
    subject: `Congratulations — you're now a ${business} agent`,
    body: [
      hello,
      "",
      `Congratulations! Your ${business} agent application has been approved. You can sign in and start selling vouchers now.`,
      "",
      details,
      "",
      "For your security, change your password after you first sign in and never share it with anyone.",
      "",
      `— The ${business} team`,
    ].join("\n"),
  };
}

// A link that opens Gmail's compose window with everything filled in.
export function gmailComposeUrl(email: BuiltEmail): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", to: email.to, su: email.subject, body: email.body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
