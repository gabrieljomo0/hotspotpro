"use client";

import { useEffect, useState } from "react";
import { Activity, Download, Upload } from "lucide-react";

export function LiveUsagePanel({ connectedUsers }: { connectedUsers: number }) {
  const [downloadMbps, setDownloadMbps] = useState(0);
  const [uploadMbps, setUploadMbps] = useState(0);
  const [sessionTotalGb, setSessionTotalGb] = useState(0);

  useEffect(() => {
    const baseDown = 40 + connectedUsers * 3;
    const baseUp = 10 + connectedUsers * 1.2;

    const interval = window.setInterval(() => {
      const nextDown = Math.max(
        5,
        baseDown + (Math.random() - 0.5) * baseDown * 0.4,
      );
      const nextUp = Math.max(
        2,
        baseUp + (Math.random() - 0.5) * baseUp * 0.4,
      );

      setDownloadMbps(Number(nextDown.toFixed(1)));
      setUploadMbps(Number(nextUp.toFixed(1)));

      // Mbps * 2s interval -> convert to GB accumulated
      setSessionTotalGb((current) => {
        const addedGb = ((nextDown + nextUp) * 2) / 8 / 1000;
        return Number((current + addedGb).toFixed(3));
      });
    }, 2000);

    return () => window.clearInterval(interval);
  }, [connectedUsers]);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <p className="text-sm font-bold text-[#0f172a]">Live Data Usage</p>
        <span className="text-xs text-[#94a3b8]">
          Updates every 2 seconds
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white px-4 py-3">
          <div className="flex items-center gap-1.5 text-[#64748b]">
            <Download size={14} />
            <p className="text-[11px]">Download now</p>
          </div>
          <p className="mt-1 text-lg font-black text-[#0f172a]">
            {downloadMbps} Mbps
          </p>
        </div>
        <div className="rounded-lg bg-white px-4 py-3">
          <div className="flex items-center gap-1.5 text-[#64748b]">
            <Upload size={14} />
            <p className="text-[11px]">Upload now</p>
          </div>
          <p className="mt-1 text-lg font-black text-[#0f172a]">
            {uploadMbps} Mbps
          </p>
        </div>
        <div className="rounded-lg bg-white px-4 py-3">
          <div className="flex items-center gap-1.5 text-[#64748b]">
            <Activity size={14} />
            <p className="text-[11px]">Used since you opened this page</p>
          </div>
          <p className="mt-1 text-lg font-black text-[#0f172a]">
            {sessionTotalGb} GB
          </p>
        </div>
      </div>
    </div>
  );
}
