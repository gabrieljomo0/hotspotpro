// Example applications, so the Agent Applications tab can be seen working
// before a real applicant turns up. Every sample has an id starting with
// "sample-" and an @example.com address, so they are easy to tell apart and
// can be removed in one click.

import type { AgentProfile, ApprovalRequest } from "../../shared/types";

export const SAMPLE_PREFIX = "sample-";

export function isSampleId(id: string) {
  return id.startsWith(SAMPLE_PREFIX);
}

// A tiny stand-in picture (an ID card / a face) so the review window has
// something to show.
function placeholder(label: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="${color}"/><text x="160" y="105" font-family="sans-serif" font-size="22" fill="#ffffff" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type Sample = {
  key: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  whatsapp: string;
  location: string;
  state: "Pending" | "Under Review" | "Approved" | "Rejected";
  createdAt: string;
  reason?: string;
};

const SAMPLES: Sample[] = [
  { key: "abena", name: "Abena Serwaa Kyei", email: "abena.kyei@example.com", username: "abena.sells", phone: "0244567812", whatsapp: "0244567812", location: "Adum, Kumasi", state: "Pending", createdAt: "05 Oct 2026, 16:42" },
  { key: "samuel", name: "Samuel Tetteh Quaye", email: "samuel.quaye@example.com", username: "sam.quaye", phone: "SAME_AS_EXISTING", whatsapp: "0201239988", location: "Community 4, Tema", state: "Pending", createdAt: "06 Oct 2026, 08:15" },
  { key: "fatima", name: "Fatima Abdul-Rahman", email: "fatima.ar@example.com", username: "fatima.wifi", phone: "0553310045", whatsapp: "0553310045", location: "Lamashegu, Tamale", state: "Under Review", createdAt: "04 Oct 2026, 11:03" },
  { key: "kojo", name: "Kojo Antwi", email: "kojo.antwi@example.com", username: "kojo.antwi", phone: "0277001234", whatsapp: "0277001234", location: "Cape Coast", state: "Approved", createdAt: "01 Oct 2026, 09:30", reason: "ID and selfie match. Welcome aboard." },
  { key: "michael", name: "Michael Ofori", email: "michael.ofori@example.com", username: "mike.ofori", phone: "0500998877", whatsapp: "0500998877", location: "Takoradi", state: "Rejected", createdAt: "30 Sep 2026, 14:20", reason: "The ID photo was too blurry to read. Please re-apply with a clear photo." },
];

export type SampleBundle = {
  agents: AgentProfile[];
  requests: ApprovalRequest[];
  files: Record<string, { idFront: string; idBack: string; face: string }>;
};

// Builds the samples from an existing agent record (used as a template for
// every field an application doesn't set), skipping any already present.
export function buildSampleApplications(template: AgentProfile, existing: AgentProfile[]): SampleBundle {
  const taken = new Set(existing.map((agent) => agent.email.toLowerCase()));
  const clashPhone = existing.find((agent) => agent.phone && !agent.isDefault)?.phone ?? "0240000000";
  const bundle: SampleBundle = { agents: [], requests: [], files: {} };

  SAMPLES.forEach((sample, index) => {
    if (taken.has(sample.email)) return;
    const id = `${SAMPLE_PREFIX}${sample.key}`;
    const status: AgentProfile["status"] =
      sample.state === "Approved" ? "Active" : sample.state === "Rejected" ? "Deactivated" : "Pending";

    bundle.agents.push({
      ...template,
      id,
      agentCode: `AGT-S${String(index + 1).padStart(3, "0")}`,
      name: sample.name,
      email: sample.email,
      username: sample.username,
      role: "Field Agent",
      status,
      isDefault: false,
      createdAt: sample.createdAt.split(",")[0],
      lastLogin: "Never",
      walletBalance: 0,
      pendingCommission: 0,
      earnedCommission: 0,
      devices: [],
      riskFlag: false,
      appliedViaPortal: true,
      phone: sample.phone === "SAME_AS_EXISTING" ? clashPhone : sample.phone,
      whatsapp: sample.whatsapp,
      location: sample.location,
      idFrontFileName: `${sample.key}-ghana-card-front.jpg`,
      idBackFileName: `${sample.key}-ghana-card-back.jpg`,
      faceCaptureFileName: `${sample.key}-selfie.jpg`,
      ghanaCardNumber: null,
      dateOfBirth: null,
      profileVerified: false,
      hasChangedDefaultPassword: false,
      password: "Sample#123",
      accessType: null,
      accessDispatchedAt: null,
    });

    bundle.requests.push({
      id: `${SAMPLE_PREFIX}appr-${sample.key}`,
      type: "New Agent",
      agentId: id,
      agentName: sample.name,
      summary: `Sample application: new agent "${sample.name}" (Field Agent) awaiting approval before activation.`,
      status: sample.state,
      createdAt: sample.createdAt,
      decidedAt: sample.state === "Approved" || sample.state === "Rejected" ? "05 Oct 2026, 10:00" : null,
      decidedBy: sample.state === "Approved" || sample.state === "Rejected" ? "Admin User" : null,
      reason: sample.reason ?? null,
    });

    bundle.files[id] = {
      idFront: placeholder("SAMPLE · ID FRONT", "#2563eb"),
      idBack: placeholder("SAMPLE · ID BACK", "#2563eb"),
      face: placeholder("SAMPLE · SELFIE", "#059669"),
    };
  });

  return bundle;
}
