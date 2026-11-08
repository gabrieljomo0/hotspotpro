// The shape of what GET /api/routers/usage returns (backend/src/server/routerUsage.ts).
// Keep the two in step if you change one.

export type RouterUsage = {
  router: { ip: string; name: string } | null;
  now: number;
  /** Whether any accounting from this router has been linked to it. */
  linked: boolean;
  lastAccountingAt: string | null;
  unlinked: { key: string; source: string; identifier: string | null; lastSeen: string }[];
  canSimulate: boolean;
  simulating: boolean;
  live: {
    online: number;
    downBytesPerSec: number;
    upBytesPerSec: number;
    sessionDown: number;
    sessionUp: number;
    fresh: boolean;
  };
  allTime: { down: number; up: number };
  hours: { h: string; down: number; up: number; starts: number }[];
  avgSessionSeconds: number;
  sessions30d: number;
  online: {
    id: string; username: string; phone: string; package: string; mac: string; ip: string;
    startedAt: string; updatedAt: string; seconds: number; down: number; up: number;
    rateDown: number; rateUp: number; dataLeft: number | null; expiresAtMs: number | null;
  }[];
  topUsers: { username: string; phone: string; package: string; down: number; up: number; sessions: number; lastSeen: string }[];
  byPackage: { name: string; down: number; up: number; sessions: number }[];
  recent: { id: string; username: string; package: string; startedAt: string; seconds: number; down: number; up: number; ended: boolean }[];
};
