import type { CaptivePortalConfig, VoucherLoginMethod } from "../shared/types";

/** Match voucher shape to what that router's captive portal asks customers to type. */
export function voucherLoginMethodFromPortal(
  authMethod: CaptivePortalConfig["authMethod"],
): VoucherLoginMethod {
  return authMethod === "PIN Only" ? "code" : "credentials";
}

export function loginMethodLabel(method: VoucherLoginMethod): string {
  return method === "code" ? "Single code" : "Username & password";
}

/**
 * Derive loginMethod from selected routers' captive portal settings.
 * Conflicts (PIN vs username/password on different routers) must not share one batch.
 */
export function loginMethodForRouterIps(
  routerIps: string[],
  getCaptivePortalConfig: (routerIp: string) => CaptivePortalConfig,
):
  | { ok: true; loginMethod: VoucherLoginMethod }
  | { ok: false; message: string } {
  if (routerIps.length === 0) {
    return { ok: false, message: "Select at least one router so vouchers match that portal's login fields." };
  }

  const methods = new Map<VoucherLoginMethod, string[]>();
  for (const ip of routerIps) {
    const method = voucherLoginMethodFromPortal(getCaptivePortalConfig(ip).authMethod);
    const list = methods.get(method) ?? [];
    list.push(ip);
    methods.set(method, list);
  }

  if (methods.size > 1) {
    return {
      ok: false,
      message:
        "Selected routers use different captive portal logins (single code vs username & password). Generate separate batches, or set Captive Portal → Login the same on those routers.",
    };
  }

  const loginMethod = methods.keys().next().value as VoucherLoginMethod;
  return { ok: true, loginMethod };
}
