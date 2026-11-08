export const DEVICE_TYPES = [
  "Android Phone",
  "iPhone",
  "Windows Laptop",
  "MacBook",
  "Smart TV",
];

export const SITE_CATALOG = [
  "YouTube", "WhatsApp", "Facebook", "Instagram", "TikTok",
  "Google", "Netflix", "X (Twitter)", "Jumia", "Spotify",
];

export const QUOTA_BY_PACKAGE: Record<string, number> = {
  "5GH": 5,
  "Daily Plan": 2,
  "Weekly Plan": 10,
  "Monthly Plan": 40,
  "Direct Voucher": 1,
};

export const NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "status", label: "Status" },
  { id: "data-quota", label: "Data Quota" },
  { id: "timeline", label: "Timeline" },
  { id: "sites", label: "Sites Visited" },
  { id: "loyalty", label: "Loyalty" },
];

export function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1000;
  }
  return hash;
}

export function minutesToLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatMinuteOfDay(minute: number) {
  const hours24 = Math.floor(minute / 60) % 24;
  const mins = Math.round(minute % 60);
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${mins.toString().padStart(2, "0")} ${period}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 1) {
    return `${Math.max(1, Math.round(minutes * 60))} sec`;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function buildSiteVisits(seed: number) {
  const count = 4 + (seed % 3);
  const shuffled = [...SITE_CATALOG].sort(
    (a, b) => ((seed + a.length) % 7) - ((seed + b.length) % 7),
  );

  return shuffled.slice(0, count).map((site, index) => {
    const dataMb = 15 + ((seed + index * 53) % 480);
    const minutes = 3 + ((seed + index * 17) % 90);
    return { site, dataMb, minutes };
  });
}

export type TimelineSegment = {
  startMinute: number;
  endMinute: number;
  status: "Online" | "Offline";
  widthPct: number;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
  dataMb: number;
};

export function buildSessionTimeline(seed: number): TimelineSegment[] {
  const dayStart = 6 * 60; // 6:00 AM
  const dayEnd = 23 * 60; // 11:00 PM
  const totalMinutes = dayEnd - dayStart;

  const segments: Array<{
    startMinute: number;
    endMinute: number;
    status: "Online" | "Offline";
  }> = [];

  let cursor = dayStart;
  let step = 0;

  while (cursor < dayEnd) {
    // Mostly long online stretches, occasionally interrupted by a short drop
    const isBlip = (seed + step * 37) % 6 === 0;
    const durationMinutes = isBlip
      ? // short disconnect — anywhere from ~10 seconds to 3 minutes
        (((seed + step * 53) % 18) + 1) / 6
      : // online stretch — 40 to 160 minutes
        40 + ((seed + step * 29) % 120);

    const end = Math.min(dayEnd, cursor + durationMinutes);

    segments.push({
      startMinute: cursor,
      endMinute: end,
      status: isBlip ? "Offline" : "Online",
    });

    cursor = end;
    step += 1;
  }

  return segments.map((segment) => {
    const durationMinutes = segment.endMinute - segment.startMinute;
    return {
      ...segment,
      widthPct: (durationMinutes / totalMinutes) * 100,
      startLabel: formatMinuteOfDay(segment.startMinute),
      endLabel: formatMinuteOfDay(segment.endMinute),
      durationLabel: formatDuration(durationMinutes),
      dataMb:
        segment.status === "Online"
          ? Math.round(10 + durationMinutes * 4)
          : 0,
    };
  });
}

export function buildStatusSummary(seed: number) {
  // Simple plain-language time breakdown (out of a typical 8-hour active window)
  const totalMinutes = 8 * 60;
  const onlineMinutes = Math.round(
    totalMinutes * (0.55 + ((seed % 20) / 100)),
  );
  const idleMinutes = Math.round(totalMinutes * (0.1 + ((seed % 10) / 100)));
  const offlineMinutes = Math.max(
    0,
    totalMinutes - onlineMinutes - idleMinutes,
  );

  return [
    { label: "Online", minutes: onlineMinutes, colorKey: "online" as const },
    { label: "Idle", minutes: idleMinutes, colorKey: "idle" as const },
    { label: "Offline", minutes: offlineMinutes, colorKey: "offline" as const },
  ];
}

export function buildQuotaSeries(seed: number, quotaGb: number) {
  const hours = ["8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm"];
  let cumulative = 0;
  return hours.map((hour, index) => {
    const step = quotaGb * (0.08 + ((seed + index * 13) % 10) / 60);
    cumulative = Math.min(quotaGb, cumulative + step);
    return { hour, usedGb: Number(cumulative.toFixed(2)) };
  });
}

export function buildConnectionQuality(seed: number) {
  const signalPct = 55 + (seed % 40);
  const latencyMs = 18 + (seed % 60);
  const packetLossPct = seed % 9 === 0 ? 2 : 0;

  const rating =
    signalPct > 80 && latencyMs < 40
      ? "Excellent"
      : signalPct > 60
        ? "Good"
        : "Weak";

  return { signalPct, latencyMs, packetLossPct, rating };
}
