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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1a1a1a]">
            <Upload size={24} />
          </div>
          <div>
            <p className="text-sm text-[#737373]">Upload</p>
            <p className="text-2xl font-black text-[#1a1a1a]">{formatGB(uploadGb)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1a1a1a]">
            <Download size={24} />
          </div>
          <div>
            <p className="text-sm text-[#737373]">Download</p>
            <p className="text-2xl font-black text-[#1a1a1a]">{formatGB(downloadGb)}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-full bg-[#e6e6e6]">
        <div className="flex h-3">
          <div className="bg-[#1a1a1a]" style={{ width: `${uploadPct}%` }} />
          <div className="bg-[#1a1a1a]" style={{ width: `${downloadPct}%` }} />
        </div>
      </div>

      <div className="mt-3 flex justify-between text-xs font-semibold">
        <span className="text-[#1a1a1a]">{uploadPct}%</span>
        <span className="text-[#1a1a1a]">{downloadPct}%</span>
      </div>

      <p className="mt-5 text-center text-sm text-[#737373]">
        Total: <span className="font-bold text-[#1a1a1a]">{formatGB(totalGb)}</span>
      </p>
    </article>
  );
}
