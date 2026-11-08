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
        <p className="text-sm font-bold text-[#1a1a1a]">
          Sites Visited This Session
        </p>
        <p className="text-xs text-[#737373]">
          {visits.length} sites · {(totalDataMb / 1024).toFixed(2)} GB total
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-[#ffffff] text-xs text-[#737373]">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Site</th>
            <th className="px-4 py-2.5 font-semibold">Data Used</th>
            <th className="px-4 py-2.5 font-semibold">Time Spent</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => (
            <tr key={visit.site} className="border-t border-[#f4f4f4]">
              <td className="px-4 py-2.5 font-semibold text-[#1a1a1a]">
                <span className="inline-flex items-center gap-2">
                  <Globe size={14} className="text-[#a3a3a3]" />
                  {visit.site}
                </span>
              </td>
              <td className="px-4 py-2.5 text-[#525252]">{visit.dataMb} MB</td>
              <td className="px-4 py-2.5 text-[#525252]">
                {visit.minutes} min
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
