import { NextResponse } from "next/server";
import { isDenied, requireSuper } from "@/server/superGuard";
import { peopleAcrossPlatform } from "@/server/superStats";

// Super admin: everyone with a login — owners, agents and installers — across all businesses.
export async function GET(request: Request) {
  const guard = requireSuper(request);
  if (isDenied(guard)) return guard;
  return NextResponse.json({ people: peopleAcrossPlatform() });
}
