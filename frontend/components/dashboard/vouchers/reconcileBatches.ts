// Keep voucherBatches.codes / count / packageName / price aligned with the
// live vouchers list. Batch cards, tracking, print/push, and sales all read
// these fields — mutations that only touch vouchers must reconcile batches.

import type { Package, Voucher, VoucherBatch } from "../shared/types";

export function reconcileBatchesFromVouchers(
  batches: VoucherBatch[],
  vouchers: Voucher[],
  packages: Array<Pick<Package, "name" | "price">> = [],
): VoucherBatch[] {
  const priceByName = new Map(packages.map((p) => [p.name, p.price]));
  return batches.map((batch) => {
    const live = vouchers.filter((v) => v.batchId === batch.id);
    const codes = live.map((v) => v.code);
    if (live.length === 0) {
      return { ...batch, codes: [], count: 0 };
    }
    const tallies = new Map<string, number>();
    for (const v of live) tallies.set(v.packageName, (tallies.get(v.packageName) ?? 0) + 1);
    let packageName = batch.packageName;
    let best = 0;
    for (const [name, n] of tallies) {
      if (n > best) {
        best = n;
        packageName = name;
      }
    }
    const price = priceByName.get(packageName) ?? batch.price;
    const sameCodes =
      codes.length === batch.codes.length && codes.every((code, i) => batch.codes[i] === code);
    if (sameCodes && batch.count === codes.length && batch.packageName === packageName && batch.price === price) {
      return batch;
    }
    return { ...batch, codes, count: codes.length, packageName, price };
  });
}

/** Batch IDs touched by a set of voucher codes (for targeted reconcile / sync). */
export function batchIdsForCodes(vouchers: Voucher[], codes: string[]): string[] {
  const wanted = new Set(codes);
  const ids = new Set<string>();
  for (const v of vouchers) {
    if (wanted.has(v.code) && v.batchId) ids.add(v.batchId);
  }
  return [...ids];
}
