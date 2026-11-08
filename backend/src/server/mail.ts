// Welcome mail for a new account. Sends only when a mail provider is configured.
// Without one, the account still exists and the person signs in with the email they typed.

const SITE = () => (process.env.HOTSPOTPRO_PUBLIC_URL || "https://hotspotpro-mu.vercel.app").replace(/\/+$/, "");

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.HOTSPOTPRO_MAIL_FROM;
  if (!key || !from) return false;
  const site = SITE();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your HotspotPro account is ready",
        text: `Hello ${name},\n\nYour HotspotPro account is ready.\nSign in with this email: ${to}\n${site}/login\n\nThank you for using our system.\n`,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
