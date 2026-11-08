// The route files were written against Next.js's `NextResponse`. The backend runs
// as a plain Node server, so this is the small part of it they use:
//   NextResponse.json(body, init)   and   response.cookies.set({...})
// It is a normal Web `Response` underneath.

export type CookieInit = {
  name: string;
  value: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  domain?: string;
};

export function serializeCookie(c: CookieInit): string {
  const parts = [`${c.name}=${encodeURIComponent(c.value)}`];
  parts.push(`Path=${c.path ?? "/"}`);
  if (c.domain) parts.push(`Domain=${c.domain}`);
  if (c.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(c.maxAge)}`);
  if (c.httpOnly) parts.push("HttpOnly");
  if (c.secure) parts.push("Secure");
  if (c.sameSite) parts.push(`SameSite=${c.sameSite[0].toUpperCase()}${c.sameSite.slice(1)}`);
  return parts.join("; ");
}

export class NextResponse extends Response {
  cookies = {
    set: (cookie: CookieInit) => {
      this.headers.append("Set-Cookie", serializeCookie(cookie));
    },
  };

  static json(body: unknown, init: ResponseInit = {}): NextResponse {
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new NextResponse(JSON.stringify(body), { ...init, headers });
  }
}
