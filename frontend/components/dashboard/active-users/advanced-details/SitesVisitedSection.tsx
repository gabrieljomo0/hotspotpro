import { Globe } from "lucide-react";

export function SitesVisitedSection({
  visits,
  totalDataMb,
}: {
  visits: Array<{ site: string; dataMb: number; minutes: number }>;
  totalDataMb: number;
}) {
  return (
    <div id="sites" className="mb-6 overflow-hidden rounded-xl border border-blue-200 scroll-mt-20">
      <div className="border-b border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm font-bold text-[#0f172a]">
          Sites Visited This Session
        </p>
        <p className="text-xs text-[#64748b]">
          {visits.length} sites · {(totalDataMb / 1024).toFixed(2)} GB total
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-[#ffffff] text-xs text-[#64748b]">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Site</th>
            <th className="px-4 py-2.5 font-semibold">Data Used</th>
            <th className="px-4 py-2.5 font-semibold">Time Spent</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => (
            <tr key={visit.site} className="border-t border-[#f1f5f9]">
              <td className="px-4 py-2.5 font-semibold text-[#0f172a]">
                <span className="inline-flex items-center gap-2">
                  <Globe size={14} className="text-[#94a3b8]" />
                  {visit.site}
                </span>
              </td>
              <td className="px-4 py-2.5 text-[#475569]">{visit.dataMb} MB</td>
              <td className="px-4 py-2.5 text-[#475569]">
                {visit.minutes} min
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
