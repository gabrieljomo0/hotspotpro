import { autoLoginHtml, getLoginTicket, markLoginTicketFetched } from "@/server/portalLogin";
import { routerForToken } from "@/server/provision";

const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;
const TICKET = /^t[A-Za-z0-9]+$/;

/** Router downloads this into hotspot/hp-go.html; the phone then opens it over HTTP. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token) || !routerForToken(token)) return new Response("unknown\n", { status: 404 });
  const id = new URL(request.url).searchParams.get("t")?.trim() || "";
  if (!TICKET.test(id)) return new Response("unknown\n", { status: 404 });
  const ticket = getLoginTicket(id, token);
  if (!ticket) return new Response("expired\n", { status: 404 });
  markLoginTicketFetched(id);
  return new Response(autoLoginHtml(ticket.username, ticket.password), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
