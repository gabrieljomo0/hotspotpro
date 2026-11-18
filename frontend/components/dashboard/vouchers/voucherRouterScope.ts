// Resolve which routers a voucher batch should cover.
// Seed/demo package IPs (192.168.88.x without a provisioning token) must not
// lock new batches away from the real linked MikroTik customers log into.

export type RouterScopeRow = {
  ip: string;
  provisioningToken?: string;
};

export type PackageScope = {
  routerIps?: string[];
  applyToAllSites?: boolean;
};

export function isLinkedRouter(router: RouterScopeRow) {
  return typeof router.provisioningToken === "string" && router.provisioningToken.length > 0;
}

/** Routers the admin/agent may pick for this package. */
export function pickableRoutersForPackage<T extends RouterScopeRow>(
  pkg: PackageScope | null | undefined,
  routers: T[],
): T[] {
  if (!pkg || pkg.applyToAllSites || !pkg.routerIps?.length) return routers;
  const listed = routers.filter((r) => pkg.routerIps!.includes(r.ip));
  if (listed.some(isLinkedRouter)) return listed.filter(isLinkedRouter);
  const live = routers.filter(isLinkedRouter);
  return live.length > 0 ? live : listed.length > 0 ? listed : routers;
}

/** Default selection when opening generate / switching package. */
export function defaultRouterIpsForPackage(
  pkg: PackageScope | null | undefined,
  routers: RouterScopeRow[],
): string[] {
  if (!pkg) return routers.length === 1 ? [routers[0].ip] : [];
  if (pkg.applyToAllSites) return routers.length === 1 ? [routers[0].ip] : [];
  const pickable = pickableRoutersForPackage(pkg, routers);
  const packageHasLive = (pkg.routerIps || []).some((ip) => {
    const row = routers.find((r) => r.ip === ip);
    return !!row && isLinkedRouter(row);
  });
  // Package still points at demo rows only — pre-select every live MikroTik.
  if (!packageHasLive) return pickable.filter(isLinkedRouter).map((r) => r.ip);
  if (pickable.length === 1) return [pickable[0].ip];
  return pickable.filter((r) => (pkg.routerIps || []).includes(r.ip)).map((r) => r.ip);
}

/**
 * Before saving a batch: if the chosen IPs are only seed/demo rows, rewrite
 * them to the account's real linked routers so portal login matches WiFi.
 */
export function normalizeVoucherRouterIps(
  requested: string[],
  routers: RouterScopeRow[],
): string[] {
  if (requested.length === 0) return [];
  const liveIps = routers.filter(isLinkedRouter).map((r) => r.ip);
  const requestedLive = requested.filter((ip) => liveIps.includes(ip));
  if (requestedLive.length > 0) return Array.from(new Set(requestedLive));
  const requestedKnown = requested.filter((ip) => routers.some((r) => r.ip === ip));
  const onlyDemo =
    requestedKnown.length > 0 &&
    requestedKnown.every((ip) => {
      const row = routers.find((r) => r.ip === ip);
      return !!row && !isLinkedRouter(row);
    });
  if (onlyDemo && liveIps.length > 0) return liveIps;
  return Array.from(new Set(requested));
}
