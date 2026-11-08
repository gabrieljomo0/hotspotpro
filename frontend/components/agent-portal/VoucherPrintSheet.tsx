"use client";

// Prints a list of voucher cards. Render it with the items to print; it opens
// the browser's print dialog once and then calls onDone. The page itself is
// only hidden (print CSS) while this is mounted, so normal printing is unaffected.

import { useEffect } from "react";

import { VoucherCardPreview, type PrintDesignId } from "@/components/dashboard/vouchers/VoucherCardPreview";

export type PrintItem = {
  code: string;
  password: string | null;
  packageName: string;
  price: string;
  design: string;
};

export function VoucherPrintSheet({
  items,
  businessName,
  onDone,
}: {
  items: PrintItem[];
  businessName?: string;
  onDone: () => void;
}) {
  useEffect(() => {
    if (items.length === 0) return;
    const timer = setTimeout(() => {
      window.print();
      onDone();
    }, 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (items.length === 0) return null;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #voucher-print-area, #voucher-print-area * { visibility: visible; }
          #voucher-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <div id="voucher-print-area" data-testid="print-area" className="hidden print:block">
        <div className="grid grid-cols-4 gap-3">
          {items.map((item, index) => (
            <div key={item.code} className="break-inside-avoid">
              <VoucherCardPreview
                design={item.design as PrintDesignId}
                number={index + 1}
                code={item.code}
                password={item.password}
                packageName={item.packageName}
                price={item.price}
                businessName={businessName}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
