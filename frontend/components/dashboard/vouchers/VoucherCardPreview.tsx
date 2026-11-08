"use client";

export type PrintDesignId = "micro-strip" | "classic-card" | "bold-ribbon" | "minimal-frame";

export const PRINT_DESIGNS: Array<{
  id: PrintDesignId;
  name: string;
  description: string;
  tags: string[];
  accent: string;
}> = [
  {
    id: "micro-strip",
    name: "Micro Strip",
    description: "Dense horizontal strip — the most codes per printed page.",
    tags: ["100 / page", "Lowest cost"],
    accent: "#1a1a1a",
  },
  {
    id: "classic-card",
    name: "Classic Card",
    description: "A clean bordered card with your brand color across the top.",
    tags: ["48 / page", "Most readable"],
    accent: "#1a1a1a",
  },
  {
    id: "bold-ribbon",
    name: "Bold Ribbon",
    description: "A diagonal ribbon badge makes the package pop at a glance.",
    tags: ["54 / page", "Eye-catching"],
    accent: "#1a1a1a",
  },
  {
    id: "minimal-frame",
    name: "Minimal Frame",
    description: "Thin outline, monospace code, nothing extra.",
    tags: ["60 / page", "Minimalist"],
    accent: "#1a1a1a",
  },
];

type CardProps = {
  design: PrintDesignId;
  code: string;
  password?: string | null;
  packageName: string;
  price: string;
  businessName?: string;
};

// `number` is the voucher's position on the printed sheet (1, 2, 3 …). When
// given, it is shown as "No. n" in the top corner of every design so a
// printed sheet can be checked, counted and handed out in order.
export function VoucherCardPreview({
  number,
  ...card
}: CardProps & { number?: number }) {
  if (number === undefined) return <VoucherCardBody {...card} />;
  return (
    <div className="relative w-56" data-voucher-number={number}>
      <VoucherCardBody {...card} />
      <span
        data-testid="voucher-number"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        className="pointer-events-none absolute right-2 top-2 rounded border border-[#1a1a1a] bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none text-[#1a1a1a]"
      >
        No. {number}
      </span>
    </div>
  );
}

function VoucherCardBody({
  design,
  code,
  password = null,
  packageName,
  price,
  businessName = "HotspotPro",
}: CardProps) {
  const accent = PRINT_DESIGNS.find((d) => d.id === design)?.accent ?? "#1a1a1a";

  if (design === "classic-card") {
    return (
      <div className="w-56 overflow-hidden rounded-xl border-2 bg-white shadow-sm" style={{ borderColor: accent }}>
        <div className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: accent }}>
          {businessName}
        </div>
        <div className="px-4 py-4 text-center">
          {password ? (
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#a3a3a3]">User / Pass</p>
              <p className="font-mono text-lg font-black text-[#1a1a1a]">{code}</p>
              <p className="font-mono text-lg font-black text-[#1a1a1a]">{password}</p>
            </div>
          ) : (
            <p className="font-mono text-xl font-black text-[#1a1a1a]">{code}</p>
          )}
          <p className="mt-2 text-xs font-semibold text-[#525252]">{packageName}</p>
          <p className="text-xs text-[#737373]">{price}</p>
        </div>
      </div>
    );
  }

  if (design === "bold-ribbon") {
    return (
      <div className="relative w-56 overflow-hidden rounded-xl border border-[#f4f4f4] bg-white p-4 text-center shadow-sm">
        <div
          className="absolute -right-10 top-3 w-32 rotate-45 py-1 text-center text-[9px] font-bold uppercase text-white"
          style={{ background: accent }}
        >
          {packageName}
        </div>
        {password ? (
          <div className="mt-4 space-y-0.5">
            <p className="font-mono text-lg font-black text-[#1a1a1a]">U: {code}</p>
            <p className="font-mono text-lg font-black text-[#1a1a1a]">P: {password}</p>
          </div>
        ) : (
          <p className="mt-4 font-mono text-xl font-black text-[#1a1a1a]">{code}</p>
        )}
        <p className="mt-2 text-xs font-semibold" style={{ color: accent }}>
          {price}
        </p>
        <p className="text-[10px] text-[#a3a3a3]">{businessName}</p>
      </div>
    );
  }

  if (design === "minimal-frame") {
    return (
      <div className="w-56 rounded-lg border border-dashed p-4 text-center" style={{ borderColor: accent }}>
        {password ? (
          <div className="space-y-0.5">
            <p className="font-mono text-base font-bold tracking-wider text-[#1a1a1a]">{code}</p>
            <p className="font-mono text-base font-bold tracking-wider text-[#1a1a1a]">{password}</p>
          </div>
        ) : (
          <p className="font-mono text-lg font-bold tracking-wider text-[#1a1a1a]">
            {code}
          </p>
        )}
        <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-[#737373]">
          <span>{packageName}</span>
          <span>·</span>
          <span>{price}</span>
        </div>
      </div>
    );
  }

  // micro-strip (default) — dense single-line strip
  return (
    <div className="w-56 overflow-hidden rounded-lg border border-[#f4f4f4] bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-1" style={{ background: `${accent}15` }}>
        <span className="text-[9px] font-bold uppercase" style={{ color: accent }}>
          {businessName}
        </span>
        <span className="text-[9px] font-bold" style={{ color: accent }}>
          {price}
        </span>
      </div>
      <div className="px-3 py-2.5">
        {password ? (
          <p className="font-mono text-sm font-black text-[#1a1a1a]">
            {code} / {password}
          </p>
        ) : (
          <p className="font-mono text-base font-black text-[#1a1a1a]">{code}</p>
        )}
        <p className="text-[9px] text-[#a3a3a3]">{packageName}</p>
      </div>
    </div>
  );
}
