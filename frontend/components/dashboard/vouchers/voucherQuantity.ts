/** Default batch size when the quantity field is left empty or invalid. */
export const VOUCHER_BATCH_DEFAULT = 60;
/** Hard cap per generate batch. */
export const VOUCHER_BATCH_MAX = 300;

/** Allow the input to be cleared while typing. */
export function parseVoucherQuantityInput(raw: string): number | "" {
  if (raw.trim() === "") return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";
  return Math.trunc(n);
}

/** Resolve for submit: empty → default 60, then clamp 1…300. */
export function resolveVoucherQuantity(value: number | ""): number {
  if (value === "" || !Number.isFinite(value) || value < 1) return VOUCHER_BATCH_DEFAULT;
  return Math.min(VOUCHER_BATCH_MAX, Math.max(1, Math.trunc(value)));
}
