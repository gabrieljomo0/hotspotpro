import { redirect } from "next/navigation";

// This used to be its own page. SMS & Email now lives under Settings, so an old
// link or bookmark here lands there.
export default function MessagesRedirect() {
  redirect("/dashboards/settings/sms-email");
}
