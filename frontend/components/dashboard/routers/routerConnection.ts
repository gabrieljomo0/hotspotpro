// Works out the red / green connection indicator for a router, from
//   - what the admin did (Disconnect / Reconnect), saved on the router, and
//   - what the router itself is doing (it asks the server every 30 seconds;
//     silence for 2+ minutes means it lost its internet or power).
// Red wins over green. Green ("back online") stays for 10 minutes.

export type ControlInfo = {
  disconnected: boolean;
  hasToken: boolean;
  hotspot: boolean;
  lastCheckInAt: string | null;
  enforced: boolean;
  lostSignal: boolean;
  outage: { from: string; to: string } | null;
  setupPath: string | null;
};

export type Indicator =
  | { kind: "lost"; since: string | null }
  | { kind: "disconnected"; since: string | null }
  | { kind: "back"; since: string; how: "reconnected" | "recovered"; wasDownMs: number | null }
  | null;

const BACK_MS = 10 * 60 * 1000;

export function connectionIndicator(
  router: { disconnected?: boolean; disconnectedAt?: string; reconnectedAt?: string },
  control: ControlInfo | null | undefined,
  now: number,
): Indicator {
  if (control?.lostSignal) return { kind: "lost", since: control.lastCheckInAt };
  if (router.disconnected) return { kind: "disconnected", since: router.disconnectedAt ?? null };

  const candidates: { at: string; how: "reconnected" | "recovered"; down: number | null }[] = [];
  if (router.reconnectedAt) {
    const down = router.disconnectedAt ? Date.parse(router.reconnectedAt) - Date.parse(router.disconnectedAt) : null;
    candidates.push({ at: router.reconnectedAt, how: "reconnected", down });
  }
  if (control?.outage) candidates.push({ at: control.outage.to, how: "recovered", down: Date.parse(control.outage.to) - Date.parse(control.outage.from) });
  const latest = candidates.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  if (latest && now - Date.parse(latest.at) < BACK_MS) return { kind: "back", since: latest.at, how: latest.how, wasDownMs: latest.down };
  return null;
}
