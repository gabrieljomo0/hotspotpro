import { redirect } from "next/navigation";

// Payments was merged into Transactions — one page for money-in instead
// of two, so a bookmark or old link here still lands somewhere real.
export default function PaymentsRedirectPage() {
  redirect("/dashboards/transactions");
}
