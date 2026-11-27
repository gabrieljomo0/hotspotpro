import { NextResponse } from "next/server";
import { TRIAL_DAYS } from "@/server/accessGate";
import { radiusCloudEnabled, radiusListenEnabled, radiusPorts, radiusPublicHost } from "@/server/radius";
import { SETUP_VERSION } from "@/server/routeros";
import { listTenants } from "@/server/store";
import { relayStatus, winboxRelayAddress, winboxRelayEnabled } from "@/server/winboxRelay";

export async function GET() {
  const on = radiusCloudEnabled();
  const ports = radiusPorts();
  const relayOn = winboxRelayEnabled();
  const relay = relayOn ? await relayStatus() : { ok: false, armed: false };
  return NextResponse.json({
    ok: true,
    businesses: listTenants().length,
    trialDays: TRIAL_DAYS,
    setupVersion: SETUP_VERSION,
    radius: on ? "on" : "off",
    radiusListen: radiusListenEnabled() ? "on" : "off",
    radiusHost: on ? radiusPublicHost() || null : null,
    radiusAuthPort: ports.authPort,
    radiusAcctPort: ports.acctPort,
    winboxRelay: relayOn ? (relay.ok ? "on" : "starting") : "off",
    winboxRelayArmed: !!relay.armed,
    winboxHost: relayOn ? winboxRelayAddress() || null : null,
    time: new Date().toISOString(),
  });
}
