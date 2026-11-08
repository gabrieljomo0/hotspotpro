import { usePersistedState } from "./usePersistedState";
import type { VoucherAlertLogEntry } from "../agents/agentSettings";

const MAX_LOG = 50;

// A record of the "an agent generated vouchers" summaries. Email and SMS
// sending isn't connected yet, so each one is recorded rather than sent.
export function useVoucherAlertLog() {
  const [voucherAlertLog, setVoucherAlertLog] = usePersistedState<VoucherAlertLogEntry[]>("agentVoucherAlertLog", []);

  function recordVoucherAlerts(entries: Array<Omit<VoucherAlertLogEntry, "id" | "sentAt">>) {
    if (entries.length === 0) return;
    const sentAt = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const stamped = entries.map((entry) => ({
      ...entry,
      id: `vga-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sentAt,
    }));
    setVoucherAlertLog((current) => [...stamped, ...current].slice(0, MAX_LOG));
  }

  return { voucherAlertLog, recordVoucherAlerts };
}
