import { hotspotHtml } from "@/server/hotspotPages";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return hotspotHtml("login.html", request, token);
}
