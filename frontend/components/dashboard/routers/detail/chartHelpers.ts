// These generate numbers that LOOK random but are always the same for the
// same input (a seed). That's important here: every time this router's page
// re-renders, we want its uptime/performance chart to show the same shape,
// not jump around randomly. Real Math.random() would do that; this doesn't.

export function seeded(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return min + frac * (max - min);
}

// Builds 9 days of "was the router up all day?" data for the uptime bar
// chart. hashString turns the router's IP into a consistent seed so the
// same router always shows the same pattern.
import { hashString } from "@/components/dashboard/active-users/advanced-details/helpers";

export function buildDailyUptime(ip: string, healthy: boolean) {
  const seed = hashString(ip);
  const days = Array.from({ length: 9 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (8 - i));
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  return days.map((day, i) => ({
    day,
    uptime: healthy ? (seeded(seed + i, 70, 100) > 40 ? 100 : 0) : (seeded(seed + i, 0, 100) > 45 ? 100 : 0),
  }));
}
