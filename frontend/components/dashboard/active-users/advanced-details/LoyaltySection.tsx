import { Star } from "lucide-react";

export function LoyaltySection({
  points,
  loyaltyEnabled,
  pointsToVoucherThreshold,
  rewardPackageName,
  canRedeem,
  onRedeem,
}: {
  points: number;
  loyaltyEnabled: boolean;
  pointsToVoucherThreshold: number;
  rewardPackageName: string;
  canRedeem: boolean;
  onRedeem: () => void;
}) {
  return (
    <div id="loyalty" className="rounded-xl border border-amber-200 bg-white p-4 scroll-mt-20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Star size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">
              {points} loyalty points
            </p>
            <p className="text-xs text-[#1a1a1a]">
              {loyaltyEnabled
                ? `${pointsToVoucherThreshold} points = a free ${rewardPackageName} voucher`
                : "Loyalty programme is currently disabled in Settings."}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!canRedeem}
          onClick={onRedeem}
          className="shrink-0 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-[#f3f1ec] disabled:text-white/70"
        >
          Redeem
        </button>
      </div>
    </div>
  );
}
