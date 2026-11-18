"use client";

// Packages: every action that can be taken on a package (create, edit,
// hide/disable, delete, duplicate, expire its vouchers). The `packages`
// list itself is NOT owned by this hook — it's declared in the main
// DashboardContext and passed in, because useAgentState also needs to read
// it (for wallet-funding price checks), and useAgentState has to run
// before this hook (this hook needs currentAgentId, which comes from
// useAgentState's return value) — so packages/setPackages have to exist
// before either hook is called.
//
// showToast/logActivity are passed in (from useNotifications). setVouchers
// is passed in too — expiring a package's vouchers needs to update voucher
// state, which still lives in the main DashboardContext for now.

import { speedLabel } from "@/components/dashboard/packages/speedInput";
import type { Package, PackageInput, PackageStatus, Voucher, VoucherBatch } from "../shared/types";
import { DEFAULT_AGENT_ID } from "./utils";
import type { Dispatch, SetStateAction } from "react";
import type { PackageAction, PackageGuard } from "../agents/agentPackages";
import { reconcileBatchesFromVouchers } from "../vouchers/reconcileBatches";

export const initialPackages: Package[] = [
  {
    id: "pkg-5gh",
    name: "5GH",
    description: "Quick top-up plan for short visits.",
    price: "GH₵ 5.00",
    validity: "14 Hours",
    durationValue: 14,
    durationUnit: "Hours",
    download: "3 Mbps",
    upload: "3 Mbps",
    downloadMbps: 3,
    uploadMbps: 3,
    fupValue: null,
    fupUnit: "GB",
    throttleEnabled: false,
    throttleAtValue: null,
    throttleAtUnit: "GB",
    throttleSpeedMbps: 1,
    devices: 1,
    customers: 136,
    status: "Active",
    freeTrial: false,
    burstEnabled: false,
    scheduleEnabled: false,
    pppoeEnabled: false,
    hotspotEnabled: true,
    agentResellingEnabled: true,
    agentPrice: "",
    featured: true,
    displayOrder: 0,
    agentId: DEFAULT_AGENT_ID,
    routerIps: [
      "192.168.88.1",
      "192.168.88.2",
      "192.168.88.3",
      "pending-mikrotik-2",
      "192.168.88.5",
      "192.168.89.1",
      "192.168.89.2",
      "192.168.90.1",
      "192.168.90.2",
      "192.168.92.1",
    ],
    applySiteId: null,
    applyToAllSites: true,
    pushedToAgentIds: [],
  },
  {
    id: "pkg-daily",
    name: "Daily Plan",
    routerIps: ["192.168.88.1", "192.168.88.2", "192.168.88.3"],
    applySiteId: null,
    applyToAllSites: false,
    pushedToAgentIds: [],
    description: "Full day internet access. Great for guests and visitors.",
    price: "GH₵ 10.00",
    validity: "24 Hours",
    durationValue: 24,
    durationUnit: "Hours",
    download: "5 Mbps",
    upload: "5 Mbps",
    downloadMbps: 5,
    uploadMbps: 5,
    fupValue: null,
    fupUnit: "GB",
    throttleEnabled: false,
    throttleAtValue: null,
    throttleAtUnit: "GB",
    throttleSpeedMbps: 1,
    devices: 2,
    customers: 214,
    status: "Active",
    freeTrial: false,
    burstEnabled: true,
    scheduleEnabled: false,
    pppoeEnabled: false,
    hotspotEnabled: true,
    agentResellingEnabled: true,
    agentPrice: "",
    featured: true,
    displayOrder: 1,
    agentId: DEFAULT_AGENT_ID,
  },
  {
    id: "pkg-weekly",
    name: "Weekly Plan",
    description: "7 days of reliable internet. Ideal for short-term stays.",
    price: "GH₵ 45.00",
    validity: "7 Days",
    durationValue: 7,
    durationUnit: "Days",
    download: "8 Mbps",
    upload: "8 Mbps",
    downloadMbps: 8,
    uploadMbps: 8,
    fupValue: null,
    fupUnit: "GB",
    throttleEnabled: false,
    throttleAtValue: null,
    throttleAtUnit: "GB",
    throttleSpeedMbps: 1,
    devices: 2,
    customers: 98,
    status: "Active",
    freeTrial: false,
    burstEnabled: false,
    scheduleEnabled: false,
    pppoeEnabled: true,
    hotspotEnabled: true,
    agentResellingEnabled: true,
    agentPrice: "",
    featured: false,
    displayOrder: 2,
    agentId: DEFAULT_AGENT_ID,
    routerIps: ["192.168.88.2"],
    applySiteId: null,
    applyToAllSites: false,
    pushedToAgentIds: [],
  },
  {
    id: "pkg-monthly",
    name: "Monthly Plan",
    description: "Full month unlimited access. Best for regular customers.",
    price: "GH₵ 120.00",
    validity: "30 Days",
    durationValue: 30,
    durationUnit: "Days",
    download: "10 Mbps",
    upload: "10 Mbps",
    downloadMbps: 10,
    uploadMbps: 10,
    fupValue: null,
    fupUnit: "GB",
    throttleEnabled: false,
    throttleAtValue: null,
    throttleAtUnit: "GB",
    throttleSpeedMbps: 1,
    devices: 3,
    customers: 41,
    status: "Active",
    freeTrial: false,
    burstEnabled: false,
    scheduleEnabled: false,
    pppoeEnabled: true,
    hotspotEnabled: true,
    agentResellingEnabled: false,
    agentPrice: "",
    featured: false,
    displayOrder: 3,
    agentId: DEFAULT_AGENT_ID,
    routerIps: ["192.168.88.3"],
    applySiteId: null,
    applyToAllSites: false,
    pushedToAgentIds: [],
  },
];


const ACTION_VERB: Record<PackageAction, string> = {
  create: "create packages",
  edit: "edit this package",
  disableDelete: "disable or delete this package",
  duplicate: "duplicate this package",
  push: "push packages to agents",
};

export function usePackageState(
  showToast: (message: string) => void,
  logActivity: (category: "Package", message: string) => void,
  currentAgentId: string,
  packages: Package[],
  setPackages: Dispatch<SetStateAction<Package[]>>,
  setVouchers: Dispatch<SetStateAction<Voucher[]>>,
  setVoucherBatches: Dispatch<SetStateAction<VoucherBatch[]>>,
  actingAgentLabel: string | null = null,
  canAct: PackageGuard = () => true,
) {
  // Shared refusal, so every entry point says the same thing.
  function refuse(action: PackageAction) {
    showToast(`You don't have permission to ${ACTION_VERB[action]}. Ask admin.`);
  }

  // Appends "(by <agent name>)" to a log message when the action was
  // taken by an agent/reseller rather than the account owner, so admin
  // can tell at a glance whose work shows up in their activity feed.
  function withAttribution(message: string) {
    return actingAgentLabel ? `${message} (by ${actingAgentLabel})` : message;
  }

  function findPackage(id: string) {
    return packages.find((pkg) => pkg.id === id);
  }

  function derivePackageDisplayFields(input: PackageInput) {
    const validity = `${input.durationValue} ${input.durationUnit}`;
    const download = speedLabel(input.downloadMbps);
    const upload = speedLabel(input.uploadMbps);
    return { validity, download, upload };
  }

  function addPackage(input: PackageInput) {
    if (!canAct("create")) {
      refuse("create");
      return null;
    }
    const newPackage: Package = {
      id: `pkg-${Date.now()}`,
      customers: 0,
      agentId: currentAgentId,
      pushedToAgentIds: [],
      ...input,
      ...derivePackageDisplayFields(input),
    };

    setPackages((current) => [newPackage, ...current]);
    showToast(`Package "${newPackage.name}" created.`);
    logActivity("Package", withAttribution(`Created package "${newPackage.name}".`));
    return newPackage;
  }

  function updatePackage(id: string, input: PackageInput) {
    const previous = packages.find((pkg) => pkg.id === id);
    if (!canAct("edit", previous)) {
      refuse("edit");
      return;
    }
    const oldName = previous?.name;
    setPackages((current) =>
      current.map((pkg) =>
        pkg.id === id
          ? { ...pkg, ...input, ...derivePackageDisplayFields(input) }
          : pkg,
      ),
    );
    // Keep vouchers and batches pointing at the new package name/price so manage + report stay correct.
    if (oldName && (oldName !== input.name || previous.price !== input.price)) {
      setVouchers((current) => {
        const next = current.map((v) =>
          v.packageName === oldName ? { ...v, packageName: input.name } : v,
        );
        setVoucherBatches((batches) =>
          reconcileBatchesFromVouchers(
            batches.map((b) =>
              b.packageName === oldName
                ? { ...b, packageName: input.name, price: input.price }
                : b,
            ),
            next,
            [{ name: input.name, price: input.price }],
          ),
        );
        return next;
      });
    }
    showToast("Package updated.");
    logActivity("Package", withAttribution(`Updated package "${oldName ?? id}".`));
  }

  function setPackageStatus(id: string, status: PackageStatus) {
    if (!canAct("disableDelete", packages.find((pkg) => pkg.id === id))) {
      refuse("disableDelete");
      return;
    }
    setPackages((current) =>
      current.map((pkg) => (pkg.id === id ? { ...pkg, status } : pkg)),
    );
    showToast(`Package marked as ${status}.`);
    logActivity("Package", withAttribution(`Marked package as ${status}.`));
  }

  function deletePackage(id: string) {
    if (!canAct("disableDelete", packages.find((pkg) => pkg.id === id))) {
      refuse("disableDelete");
      return;
    }
    setPackages((current) => current.filter((pkg) => pkg.id !== id));
    showToast("Package deleted.");
    logActivity("Package", withAttribution("Deleted a package."));
  }

  function duplicatePackage(id: string) {
    const source = packages.find((pkg) => pkg.id === id);
    if (!source) return;
    if (!canAct("duplicate", source)) {
      refuse("duplicate");
      return;
    }

    const copy: Package = {
      ...source,
      id: `pkg-${Date.now()}`,
      name: `${source.name} (Copy)`,
      customers: 0,
      status: "Hidden",
      pushedToAgentIds: [],
      // The copy belongs to whoever made it — so an agent who duplicates a
      // package ends up owning their own version.
      agentId: currentAgentId,
    };

    setPackages((current) => [copy, ...current]);
    showToast(`Duplicated "${source.name}".`);
    logActivity("Package", withAttribution(`Duplicated package "${source.name}".`));
    return copy;
  }

  function expirePackageVouchers(packageName: string) {
    let count = 0;
    setVouchers((current) =>
      current.map((voucher) => {
        if (
          voucher.packageName === packageName &&
          voucher.status !== "Expired"
        ) {
          count += 1;
          return { ...voucher, status: "Expired" };
        }
        return voucher;
      }),
    );
    showToast(`${count} voucher(s) for "${packageName}" marked as expired.`);
    logActivity(
      "Package",
      `Expired ${count} unused voucher(s) for package "${packageName}".`,
    );
  }

  function pushPackageToAgents(packageId: string, agentIds: string[]) {
    if (!canAct("push")) {
      refuse("push");
      return;
    }
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;
    setPackages((current) =>
      current.map((p) =>
        p.id === packageId
          ? { ...p, pushedToAgentIds: Array.from(new Set([...p.pushedToAgentIds, ...agentIds])) }
          : p,
      ),
    );
    showToast(`Pushed "${pkg.name}" to ${agentIds.length} agent${agentIds.length === 1 ? "" : "s"}.`);
    logActivity("Package", `Pushed package "${pkg.name}" to ${agentIds.length} agent(s).`);
  }

  function removePackagePush(packageId: string, agentId: string) {
    if (!canAct("push")) {
      refuse("push");
      return;
    }
    setPackages((current) =>
      current.map((p) =>
        p.id === packageId
          ? { ...p, pushedToAgentIds: p.pushedToAgentIds.filter((id) => id !== agentId) }
          : p,
      ),
    );
  }

  return {
    findPackage,
    derivePackageDisplayFields,
    addPackage,
    updatePackage,
    setPackageStatus,
    deletePackage,
    duplicatePackage,
    expirePackageVouchers,
    pushPackageToAgents,
    removePackagePush,
  };
}
