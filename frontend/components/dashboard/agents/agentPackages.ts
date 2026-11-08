import type { AgentProfile, Package } from "../shared/types";

// The packages an agent may actually sell: ones that cover their router,
// ones that apply to every site, and any admin has pushed to them
// specifically. Used everywhere an agent picks or lists packages, so the
// rule can't drift between screens.
export function getSellablePackages(packages: Package[], agent: AgentProfile): Package[] {
  return packages.filter(
    (pkg) =>
      pkg.status === "Active" &&
      (pkg.applyToAllSites ||
        pkg.applyToAllAgents ||
        (agent.routerIp !== null && pkg.routerIps.includes(agent.routerIp)) ||
        (pkg.pushedToAgentIds ?? []).includes(agent.id)),
  );
}

// What an agent may do to one specific package.
//
// A package the agent created themselves is governed by the ordinary
// edit / disable-delete permissions. A package admin created — including
// anything admin pushed to them — is admin's, so it needs its own separate
// permission (edit / disable-delete "…admin created or pushed to them").
// Permissions are off by default; admin switches each on per agent.
// Admin (the owner profile) can always do everything.
export type PackageRights = {
  isOwn: boolean;
  canEdit: boolean;
  canDisableDelete: boolean;
  canDuplicate: boolean;
};

export function getPackageRights(agent: AgentProfile, pkg: Package): PackageRights {
  if (agent.isDefault) {
    return { isOwn: true, canEdit: true, canDisableDelete: true, canDuplicate: true };
  }
  const allowed = (key: string) => agent.permissions[key] === "Allowed";
  const isOwn = pkg.agentId === agent.id;
  return {
    isOwn,
    canEdit: isOwn ? allowed("packages.edit") : allowed("packages.editPushed"),
    canDisableDelete: isOwn ? allowed("packages.disableDelete") : allowed("packages.disableDeletePushed"),
    canDuplicate: allowed("packages.duplicate"),
  };
}

export type PackageAction = "create" | "edit" | "disableDelete" | "duplicate" | "push";

// Asked before any package is changed. Returns false when whoever is
// acting (an agent, in an agent's own dashboard) hasn't been given that
// right. Admin (the owner profile) can always do everything; pushing a
// package to agents is admin-only.
export type PackageGuard = (action: PackageAction, pkg?: Package) => boolean;

export function makePackageGuard(actor: AgentProfile | undefined): PackageGuard {
  return (action, pkg) => {
    if (!actor) return false;
    if (actor.isDefault) return true;
    if (action === "push") return false;
    if (action === "create") return actor.permissions["packages.create"] === "Allowed";
    if (!pkg) return false;
    const rights = getPackageRights(actor, pkg);
    if (action === "edit") return rights.canEdit;
    if (action === "disableDelete") return rights.canDisableDelete;
    return rights.canDuplicate;
  };
}

// The post-approval verification gate: being "Active" only means admin
// approved the application. An agent still can't generate or sell a
// single voucher until every one of these is filled in, whether that
// happened at application time or was finished later from their own
// profile page.
// For now an agent can generate vouchers even with an incomplete profile, so
// the voucher flow can be tried out end to end. Flip this to true to bring
// back the "finish your profile first" lock.
export const REQUIRE_COMPLETE_PROFILE_FOR_VOUCHERS = false;

export function isAgentProfileComplete(agent: AgentProfile): boolean {
  return Boolean(
    agent.phone &&
      agent.whatsapp &&
      agent.email &&
      agent.location &&
      agent.ghanaCardNumber &&
      agent.dateOfBirth &&
      agent.idFrontFileName &&
      agent.idBackFileName &&
      agent.faceCaptureFileName,
  );
}

// Which of the required fields are still missing, in the order they're
// asked for on the profile page — used to tell the agent exactly what's
// left rather than a generic "incomplete" message.
export function missingProfileFields(agent: AgentProfile): string[] {
  const checks: [boolean, string][] = [
    [!!agent.phone, "Phone number"],
    [!!agent.whatsapp, "WhatsApp number"],
    [!!agent.email, "Email"],
    [!!agent.location, "Location"],
    [!!agent.idFrontFileName, "Ghana Card — front"],
    [!!agent.idBackFileName, "Ghana Card — back"],
    [!!agent.faceCaptureFileName, "Photo verification (selfie)"],
    [!!agent.ghanaCardNumber, "Ghana Card number"],
    [!!agent.dateOfBirth, "Date of birth"],
  ];
  return checks.filter(([done]) => !done).map(([, label]) => label);
}
