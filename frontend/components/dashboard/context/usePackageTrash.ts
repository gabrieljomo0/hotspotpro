"use client";

// Deleting a package: two choices (keep its customers online, or end their vouchers and sign them
// out), and a PACKAGE_RESTORE_MS window to restore it. Deleted packages live in their own
// "deletedPackages" store, so everything that sells packages keeps reading only the live list, while
// the server can still look one up for customers who were kept on it.

import { useEffect, type Dispatch, type SetStateAction } from "react";

import type { PackageGuard } from "../agents/agentPackages";
import type { RouterInfo } from "../data/dashboard-data";
import { PACKAGE_RESTORE_MS, type DeletedPackage, type Package, type Voucher } from "../shared/types";
import { usePersistedState } from "./usePersistedState";
import { queueRouterActionMany } from "./queueRouterAction";
import { persistNow } from "./syncClient";

function expiresAt(voucher: Voucher) {
  return (voucher as Voucher & { expiresAtMs?: number }).expiresAtMs;
}

/** Customers with time left on these packages, and vouchers not started yet. */
export function packageVoucherUsage(vouchers: Voucher[], packageNames: string[], now = Date.now()) {
  const names = new Set(packageNames);
  const inUse: Voucher[] = [];
  let unused = 0;
  for (const voucher of vouchers) {
    if (!names.has(voucher.packageName)) continue;
    const exp = expiresAt(voucher);
    if (voucher.status === "Used" && !(exp && exp <= now)) inUse.push(voucher);
    else if (voucher.status === "Available") unused += 1;
  }
  return { inUse, unused };
}

export function usePackageTrash(deps: {
  packages: Package[];
  setPackages: Dispatch<SetStateAction<Package[]>>;
  vouchers: Voucher[];
  setVouchers: Dispatch<SetStateAction<Voucher[]>>;
  routers: RouterInfo[];
  canAct: PackageGuard;
  showToast: (message: string) => void;
  logActivity: (category: "Package", message: string) => void;
}) {
  const { packages, setPackages, vouchers, setVouchers, routers, canAct, showToast, logActivity } = deps;
  const [deletedPackages, setDeletedPackages] = usePersistedState<DeletedPackage[]>("deletedPackages", []);

  // Past the restore window an entry is dropped, except one whose kept customers still have time:
  // the server needs it for their speed and time until they finish.
  useEffect(() => {
    const now = Date.now();
    const keep = deletedPackages.filter(
      (d) => now - d.deletedAtMs < PACKAGE_RESTORE_MS || (d.keepCustomers && packageVoucherUsage(vouchers, [d.pkg.name], now).inUse.length > 0),
    );
    if (keep.length !== deletedPackages.length) {
      setDeletedPackages(keep);
      void persistNow("deletedPackages", keep);
    }
  }, [deletedPackages, vouchers, setDeletedPackages]);

  function linkedRouterIps() {
    return routers.filter((r) => typeof r.provisioningToken === "string" && r.provisioningToken.length > 0).map((r) => r.ip);
  }

  /** Delete packages. keepCustomers=false also ends their vouchers and signs those customers out. */
  function deletePackages(ids: string[], keepCustomers: boolean) {
    const allowed = packages.filter((pkg) => ids.includes(pkg.id) && canAct("disableDelete", pkg));
    if (allowed.length < ids.length) showToast("You don't have permission to delete some of these packages. Ask admin.");
    if (allowed.length === 0) return;
    const now = Date.now();
    const names = new Set(allowed.map((pkg) => pkg.name));

    const ended = new Map<string, { code: string; status: Voucher["status"] }[]>();
    const signOut: Voucher[] = [];
    let nextVouchers = vouchers;
    if (!keepCustomers) {
      nextVouchers = vouchers.map((voucher) => {
        if (!names.has(voucher.packageName) || voucher.status === "Expired") return voucher;
        const list = ended.get(voucher.packageName) ?? [];
        list.push({ code: voucher.code, status: voucher.status });
        ended.set(voucher.packageName, list);
        const exp = expiresAt(voucher);
        if (voucher.status === "Used" && !(exp && exp <= now)) signOut.push(voucher);
        return { ...voucher, status: "Expired" as const };
      });
    }

    const entries: DeletedPackage[] = allowed.map((pkg) => ({ pkg, deletedAtMs: now, keepCustomers, endedVouchers: ended.get(pkg.name) ?? [] }));
    const nextDeleted = [...entries, ...deletedPackages.filter((d) => !allowed.some((pkg) => pkg.id === d.pkg.id))];
    const nextPackages = packages.filter((pkg) => !allowed.includes(pkg));

    setDeletedPackages(nextDeleted);
    if (!keepCustomers) setVouchers(nextVouchers);
    setPackages(nextPackages);
    void (async () => {
      // Deleted list first: the server must never see a package gone that its kept customers still need.
      await persistNow("deletedPackages", nextDeleted);
      if (!keepCustomers) await persistNow("vouchers", nextVouchers);
      await persistNow("packages", nextPackages);
      const linked = linkedRouterIps();
      for (const voucher of signOut) {
        const where = routers.filter((r) => (r.liveUsers ?? []).includes(voucher.code)).map((r) => r.ip);
        queueRouterActionMany(where.length > 0 ? where : linked, "kick-user", { username: voucher.code });
      }
    })();

    const label = allowed.length === 1 ? `"${allowed[0].name}"` : `${allowed.length} packages`;
    showToast(
      keepCustomers
        ? `Deleted ${label}. Customers on it stay online. You can restore it for 3 days.`
        : `Deleted ${label}. ${signOut.length} customer(s) signed out. You can restore it for 3 days.`,
    );
    logActivity(
      "Package",
      keepCustomers
        ? `Deleted ${label} (customers kept online).`
        : `Deleted ${label} and ended its vouchers (${signOut.length} customer(s) signed out).`,
    );
  }

  /** Put a deleted package back. Kept customers were never signed out; ended vouchers work again. */
  function restoreDeletedPackage(id: string) {
    const entry = deletedPackages.find((d) => d.pkg.id === id);
    if (!entry) return;
    if (Date.now() - entry.deletedAtMs >= PACKAGE_RESTORE_MS) {
      showToast(`"${entry.pkg.name}" was deleted more than 3 days ago and can't be restored.`);
      return;
    }
    if (packages.some((pkg) => pkg.name === entry.pkg.name)) {
      showToast(`A package called "${entry.pkg.name}" already exists. Rename it, then restore.`);
      return;
    }
    const before = new Map(entry.endedVouchers.map((v) => [v.code, v.status]));
    const nextVouchers =
      before.size > 0
        ? vouchers.map((voucher) => (voucher.status === "Expired" && before.has(voucher.code) ? { ...voucher, status: before.get(voucher.code)! } : voucher))
        : vouchers;
    const nextPackages = [entry.pkg, ...packages];
    const nextDeleted = deletedPackages.filter((d) => d.pkg.id !== id);

    setPackages(nextPackages);
    if (before.size > 0) setVouchers(nextVouchers);
    setDeletedPackages(nextDeleted);
    void (async () => {
      // Live list first, so the package is never missing for its customers in between.
      await persistNow("packages", nextPackages);
      if (before.size > 0) await persistNow("vouchers", nextVouchers);
      await persistNow("deletedPackages", nextDeleted);
      queueRouterActionMany(linkedRouterIps(), "sync-packages");
    })();

    showToast(
      entry.keepCustomers || before.size === 0
        ? `Restored "${entry.pkg.name}". Customers on it stayed online.`
        : `Restored "${entry.pkg.name}". ${before.size} voucher(s) work again; customers who were signed out can log in with their remaining time.`,
    );
    logActivity("Package", `Restored deleted package "${entry.pkg.name}".`);
  }

  /** Remove a deleted package for good, before the 3 days are up. */
  function purgeDeletedPackage(id: string) {
    const entry = deletedPackages.find((d) => d.pkg.id === id);
    if (!entry) return;
    if (entry.keepCustomers && packageVoucherUsage(vouchers, [entry.pkg.name]).inUse.length > 0) {
      showToast(`Customers kept on "${entry.pkg.name}" still have time left, so it stays until they finish.`);
      return;
    }
    const nextDeleted = deletedPackages.filter((d) => d.pkg.id !== id);
    setDeletedPackages(nextDeleted);
    void persistNow("deletedPackages", nextDeleted);
    showToast(`"${entry.pkg.name}" deleted for good.`);
    logActivity("Package", `Permanently deleted package "${entry.pkg.name}".`);
  }

  return { deletedPackages, deletePackages, restoreDeletedPackage, purgeDeletedPackage };
}
