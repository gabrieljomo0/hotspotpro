// Looking people up across ALL businesses (needed only at sign-in, before we know whose
// business the visitor belongs to). Nothing here returns business data, only who someone is.

import { forEachTenant, getState, withTenant, type TenantRecord } from "./store";

export type Found<T> = { tenant: TenantRecord; row: T };

/** Every row of one saved list (agents, installers…) in every business, tagged with its business. */
export function scanAll<T>(key: string): Found<T>[] {
  const out: Found<T>[] = [];
  forEachTenant(
    (tenant) => {
      const value = getState(key)?.value;
      if (Array.isArray(value)) for (const row of value as T[]) if (row) out.push({ tenant, row });
    },
    { includeSuspended: true },
  );
  return out;
}

/** An agent by id. If several businesses use the same id, the business tag in the invite link decides. */
export function findAgentById<T extends { id: string }>(id: string, businessTag?: string | null): Found<T> | null {
  const matches = scanAll<T>("agents").filter((f) => f.row.id === id);
  return matches.find((f) => businessTag && f.tenant.tag === businessTag) ?? matches[0] ?? null;
}

/** Read one saved list of one business. */
export function listOf<T>(tenantId: string, key: string): T[] {
  return withTenant(tenantId, () => {
    const value = getState(key)?.value;
    return Array.isArray(value) ? (value as T[]) : [];
  });
}
