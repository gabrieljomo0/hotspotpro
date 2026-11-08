// Decides which business (tenant) a request is about, before any route code runs.
//
//  - Signed-in people: the business in their session. A super admin who pressed "View as"
//    gets that business instead (a signed cookie-less switch only they can use). 
//  - Routers and customers (not signed in): the router's setup token (/api/provision/<token>/...
//    and the portal's ?rt=<token>), or the payment reference.
//  - Platform routes (/api/super/*, /api/auth/*) choose their own scope.
//
// Anything not resolved runs with NO business, and the store refuses to touch business data
// in that state — so a missing rule fails loudly instead of leaking another business.

import { sessionFromRequest, viewTenantFromRequest } from "./auth";
import { getTenant, tenantOfPayment, tenantOfToken } from "./store";

export function tenantForRequest(request: Request, params: Record<string, string>): string | null {
  const url = new URL(request.url);
  const session = sessionFromRequest(request);

  if (session?.tid) {
    if (session.sup) {
      const viewing = viewTenantFromRequest(request);
      if (viewing && getTenant(viewing)) return viewing;
    }
    return session.tid;
  }

  // Router / customer requests.
  if (params.token) return tenantOfToken(params.token);
  const token = url.searchParams.get("rt") ?? request.headers.get("x-hsp-rt");
  if (token) return tenantOfToken(token);
  if (params.ref) return tenantOfPayment(params.ref);
  return null;
}
