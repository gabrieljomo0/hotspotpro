"use client";

import { useMemo } from "react";

import { useDashboard } from "../context/DashboardContext";
import { salesByRouter, sumRows, periodRange, type Period } from "./commission";

// Everything the billing page needs about commission, worked out from the
// real voucher sales.
export function useCommissionFigures(period: Period = "this-month") {
  const { subscription, vouchers, voucherBatches, packages, agents, routers } = useDashboard();
  const rate = subscription.commissionRate;

  return useMemo(() => {
    const rows = salesByRouter(vouchers, voucherBatches, packages, agents, routers, rate, periodRange(period));
    const shown = sumRows(rows);
    // What is owed: everything sold since commission billing began, less what is paid.
    const since = subscription.commissionSinceMs ?? Infinity;
    const owedRows = salesByRouter(vouchers, voucherBatches, packages, agents, routers, rate, [since, Infinity]);
    const earned = sumRows(owedRows).commission;
    const balanceDue = Math.max(0, Math.round((earned - subscription.commissionPaid) * 100) / 100);
    // What the same month would cost on each model (for the comparison).
    const month = sumRows(salesByRouter(vouchers, voucherBatches, packages, agents, routers, rate, periodRange("this-month")));
    return { rows, shown, earned, balanceDue, rate, monthSales: month.sales, monthCommission: month.commission };
  }, [vouchers, voucherBatches, packages, agents, routers, rate, period, subscription.commissionSinceMs, subscription.commissionPaid]);
}
