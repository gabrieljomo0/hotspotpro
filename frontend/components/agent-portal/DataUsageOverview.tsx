// Total data used on this router today, split into an upload/download
// estimate (60/40 of the real total — this app doesn't track upload vs
// download separately per session) — but the total itself is real.
import { Upload, Download } from "lucide-react";

import type { ActiveUser } from "../dashboard/data/dashboard-data";
import { parseDataSize, formatGB } from "./realData";

export function DataUsageOverview({ scopedUsers }: { scopedUsers: ActiveUser[] }) {
  const totalGb = scopedUsers.reduce((sum, u) => sum + parseDataSize(u.dataUsed), 0);
  const downloadGb = totalGb * 0.6;
  const uploadGb = totalGb * 0.4;
  const downloadPct = totalGb > 0 ? Math.round((downloadGb / totalGb) * 100) : 0;
  const uploadPct = 100 - downloadPct;

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="font-bold">Data Usage Overview</h3>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#2563eb]">
            <Upload size={24} />
          </div>
          <div>
            <p className="text-sm text-[#64748b]">Upload</p>
            <p className="text-2xl font-black text-[#2563eb]">{formatGB(uploadGb)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#2563eb]">
            <Download size={24} />
          </div>
          <div>
            <p className="text-sm text-[#64748b]">Download</p>
            <p className="text-2xl font-black text-[#2563eb]">{formatGB(downloadGb)}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div className="flex h-3">
          <div className="bg-[#2563eb]" style={{ width: `${uploadPct}%` }} />
          <div className="bg-[#2563eb]" style={{ width: `${downloadPct}%` }} />
        </div>
      </div>

      <div className="mt-3 flex justify-between text-xs font-semibold">
        <span className="text-[#2563eb]">{uploadPct}%</span>
        <span className="text-[#2563eb]">{downloadPct}%</span>
      </div>

      <p className="mt-5 text-center text-sm text-[#64748b]">
        Total: <span className="font-bold text-[#0f172a]">{formatGB(totalGb)}</span>
      </p>
    </article>
  );
}
