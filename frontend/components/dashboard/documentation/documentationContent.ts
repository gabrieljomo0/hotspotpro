export type DocSection = {
  id: string;
  title: string;
  summary: string;
  points: string[];
};

export type DocCategory = {
  id: string;
  title: string;
  sections: DocSection[];
};

export const DOCUMENTATION: DocCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    sections: [
      {
        id: "overview",
        title: "What HotspotPro is",
        summary:
          "HotspotPro is a full hotspot billing and management platform: it runs your MikroTik routers, sells internet access through vouchers or PPPoE, gives resellers and installers their own scoped dashboards, and lets customers pay and connect through a customizable captive portal.",
        points: [
          "One account can run many physical locations (\"businesses/sites\"), each with its own routers.",
          "Three kinds of people use the system: you (admin), your agents/resellers, and your installers — each gets a different, appropriately restricted view.",
          "Customers never see the admin dashboard at all — only the captive portal login page on their device.",
        ],
      },
      {
        id: "login",
        title: "Logging in",
        summary: "The admin dashboard is reached at /login. The first person to open a new site creates the owner account there (Create one); after that, sign-up is closed.",
        points: [
          "Agents and installers' clients log into their own scoped view at /agent-portal/[agentId], reached via a link from the admin side — they don't share the admin login.",
          "The captive portal customers see when connecting to WiFi lives at /portal.",
        ],
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard Overview",
    sections: [
      {
        id: "main-dashboard",
        title: "The main dashboard",
        summary:
          "The landing page after login. Shows revenue, active users, router status, and quick actions at a glance.",
        points: [
          "Statistics grid: today's revenue, active sessions, router uptime, and similar top-line numbers.",
          "Quick Actions: shortcuts to the most common tasks (add customer, sell package, generate voucher).",
          "Revenue chart and recent activity feed update as you use the system.",
        ],
      },
    ],
  },
  {
    id: "users",
    title: "Active Users & Sessions",
    sections: [
      {
        id: "users-list",
        title: "Managing connected customers",
        summary: "Every device currently online (or recently online) shows up here, with filters for status, router, and package.",
        points: [
          "Extend Access: give a user more time, with quick presets or a fully custom amount and unit (minutes/hours/days).",
          "Top Up Data: add extra data allowance, with presets or a custom GB amount.",
          "Pause, Disconnect, or Block a user without deleting their record; Delete removes them permanently.",
          "Change Package and Reset Password are available per user. Session Details is one page per user: the session, live usage and the advanced details (status, data quota, timeline, connection quality, loyalty) together.",
          "Separate tabs cover Inactive, Expired, IP Bindings, PPPoE, Blocked Devices, and Loyalty Points customers.",
        ],
      },
    ],
  },
  {
    id: "vouchers",
    title: "Vouchers",
    sections: [
      {
        id: "voucher-generation",
        title: "Generating vouchers",
        summary: "Create batches of prepaid access codes tied to a package, with full control over format and quantity.",
        points: [
          "Choose package, batch reference, code format (uppercase/lowercase/mixed/numeric), code length, quantity, and an optional prefix.",
          "Mark a batch as a giveaway to exclude it from revenue reporting.",
          "If an agent's wallet-funding requirement is on, the quantity they can generate is capped by their wallet balance ÷ package price.",
        ],
      },
      {
        id: "voucher-printing",
        title: "Printing and batches",
        summary: "Every batch can be reviewed, redesigned, and printed or downloaded as a PDF.",
        points: [
          "Four print designs: Micro Strip, Classic Card, Bold Ribbon, Minimal Frame. Every voucher on a printed sheet carries its number (#1, #2, #3 …) in the corner, including reprints of an agent's unsold vouchers, so a sheet can be counted and handed out in order.",
          "Bulk-assign vouchers to a different batch, or filter and reassign by package, status, date range, or online/giveaway status.",
        ],
      },
      {
        id: "voucher-cleanup",
        title: "Automatic voucher cleanup",
        summary: "\"Cleanup Settings\" on the Vouchers page links through to Settings → Business Settings → Voucher Cleanup, where admin sets, once, how long Used and Expired vouchers stick around before being cleared out automatically — no need to specify anything when creating a voucher afterwards.",
        points: [
          "An account-wide default applies everywhere, with an optional override per router for a different retention period on one specific router.",
          "A router without its own override simply follows the account-wide default; \"Use default\" removes an override at any time.",
          "Clicking \"Done\" saves the policy and runs a cleanup pass immediately, rather than waiting for the next scheduled background check — after that, it keeps running automatically on its own.",
        ],
      },
    ],
  },
  {
    id: "packages",
    title: "Packages",
    sections: [
      {
        id: "package-management",
        title: "Creating and managing packages",
        summary: "Packages define what a customer buys — duration, speed, data cap, device limit, and price.",
        points: [
          "Five-section form: Basic Config, Speed & Performance, Pricing & Devices, Advanced Features, Availability & Visibility.",
          "Quick Templates provide ready-made starting points (2 Hours, Daily, Weekly, Monthly, Free Trial, Night Owl).",
          "Bulk actions: activate, hide, disable, or delete multiple packages at once. Duplicate or expire a package's vouchers individually.",
          "A package can be restricted to specific routers via routerIps, or left available everywhere. Tick \"All agents\" on the package form to let every agent sell it whichever router they are on (including agents added later).",
          "Data throttling: a package can slow a user down once they cross a data threshold, instead of cutting them off — set this per package (applies to every voucher generated from it), or set a default for a whole business under Configuration → Hotspot → Network. The package's own setting always wins over the business default when both are set.",
        ],
      },
    ],
  },
  {
    id: "routers",
    title: "Routers",
    sections: [
      {
        id: "adding-routers",
        title: "Adding a router",
        summary: "The Add Router wizard walks through connecting a physical MikroTik device.",
        points: [
          "Step 1: name the router, choose New Router (full provisioning) or Existing Router (connect-only, doesn't touch current config), and assign it to a Business/Site — pick an existing one or create a new one inline.",
          "Step 2: a generated provisioning command is pasted into the router's terminal; the system polls automatically (with a manual \"Check Now\" option) until it connects.",
          "Step 3: configure Hotspot and/or PPPoE service — both can run on the same router — plus WireGuard remote-access details and generated API credentials.",
        ],
      },
      {
        id: "router-list",
        title: "The routers list",
        summary: "A horizontal table of every router: provisioning status, CPU/memory, online status, and remote access, filterable by All/Online/Offline/Pending/Error.",
        points: [
          "Remote Access is a real, working toggle — switching it on assigns a WinBox address automatically.",
          "The Actions dropdown covers View Details, Edit, Reboot, Regenerate WinBox, and Delete, each opening a confirmation dialog before anything happens.",
        ],
      },
      {
        id: "router-detail",
        title: "A router's own page",
        summary: "Clicking into a router opens its full control panel with its own tabs.",
        points: [
          "System Information: live status, connection health, WinBox access details, device info, RADIUS config, and CPU/memory + uptime charts.",
          "Hotspot: network settings (SSID, WiFi password, bandwidth, timeouts) and Ads & Free Trial configuration.",
          "Captive Portal: template, design, and customer-experience settings, with a live preview panel.",
          "Reports, Internet Users, Access Points, and Multi-WAN each have their own tab.",
          "Full Provision configures SNMP, RADIUS, services, and the walled garden in one action, with a confirmation dialog first.",
          "More Actions covers Configure Multi-WAN, Notification Contacts, Sync hotspot files, Sync Router Time, Configure SNMP, Configure Walled Garden, Harden Services, Regenerate WinBox, download the WireGuard config or provisioning script, Reboot, Edit, and Delete — every one of which asks for confirmation and shows a real success or failure result.",
        ],
      },
    ],
  },
  {
    id: "hotspot-captive-portal",
    title: "Hotspot & Captive Portal",
    sections: [
      {
        id: "shared-by-site",
        title: "Shared setup across a business",
        summary:
          "Hotspot and captive portal settings are stored per business/site, not per router — every router assigned to the same business automatically shares the same network name, portal template, colors, and customer-experience settings.",
        points: [
          "Change it once on any router in that business, and every other router in the same business reflects it immediately.",
          "\"Apply this setup to other sites too\" lets you push one business's setup to selected businesses, or to every business at once.",
          "The SSID itself can be set to \"same for every site\" (one network name everywhere) or \"per-router\" (each keeps its own).",
        ],
      },
      {
        id: "templates",
        title: "Templates and design",
        summary: "Four captive portal templates are available: Classic (the full, real customer login experience), Dark, Ocean Blue, and Sunset.",
        points: [
          "Dark, Ocean Blue, and Sunset are the same layout in different color schemes; Classic is the fully distinct built experience and is the default.",
          "Customize primary/secondary colors, logo size, font, language, a custom uploaded logo image, and a custom uploaded background image.",
          "Choose the login method: Username & Password, or PIN Only.",
        ],
      },
      {
        id: "customer-experience",
        title: "Customer experience toggles",
        summary: "Fine-grained control over what appears on the login page, all reflected live in the preview panel.",
        points: [
          "Show packages, package device limits, package time, device MAC, allow online purchases, buy-for-another-device, feedback button.",
          "Buy Online Vouchers and Apply for Reseller are independent, hideable permissions — turn either off and it disappears from the portal.",
          "Free trial: enable/disable, button text, trials per device, one-click vs phone-verification mode, button position, and a cooldown option.",
          "Advertisements can be toggled on or off per business.",
        ],
      },
    ],
  },
  {
    id: "businesses",
    title: "Businesses / Sites",
    sections: [
      {
        id: "business-concept",
        title: "What a business/site is",
        summary: "A business (or site) is a named grouping of one or more routers at the same physical location or brand.",
        points: [
          "Created inline when adding a router, by picking an existing business or typing a new name.",
          "All hotspot and captive portal configuration is scoped to the business, not the individual router.",
        ],
      },
    ],
  },
  {
    id: "agents",
    title: "Agents & Resellers",
    sections: [
      {
        id: "agent-management",
        title: "Managing agents",
        summary: "The Agents page has two tabs — All Agents and Agent Applications — and an Add agent button.",
        points: [
          "All Agents shows the headline numbers — four cards spread across the page — Today's Revenue, what's owed to you, wallet balances and commission — and a short list: name, phone, router, an Access switch, sold, remaining, revenue and what each agent owes. Everything else is on the agent's own page (View).",
          "Revenue filter: choose Today, Yesterday, This week, This month, All time, a specific day, a specific month or a date range, and optionally a time of day (for example 08:00–12:00, or overnight such as 22:00–02:00). The revenue card and each agent's Sold and Revenue follow the filter; Remaining and Owed always show the current position.",
          "Login links are per agent: use Copy login link in an agent's Actions menu, on their own page, or in the Add agent window. The link opens the sign-in page locked to that one agent — their email is filled in and only their password is accepted. Links work in the browser holding your data (there is no server yet).",
          "Add agent opens a window for the name, email, username, phone number and more. They are active straight away, with a temporary password shown once for you to give them.",
          "The Access switch turns one agent's sign-in on or off. An agent whose access is off is told to contact admin to reactivate it.",
          "Roles: Owner, Manager, Field Agent, Associate Admin, Sub-Agent, Viewer — each with a default permission preset.",
          "Full profile per agent: Overview, Application, Portal Access, Activity, Sales, Collections, Wallet, Commission, Devices, Settings, Permissions, Limits, Approvals.",
          "Settings are per agent: whether they can create vouchers, set their own voucher credentials, see sales & commission or their router, and whether you get a summary when they generate vouchers.",
          "Collections records money you collect from an agent for vouchers they sold from stock you gave them, and keeps the ledger of what they owe.",
          "Wallet-funding can be required before an agent generates vouchers, capping quantity by wallet balance ÷ package price.",
          "Emails: when someone applies, they get a congratulations email with their sign-in details; when you approve them (or add an agent yourself) they get a welcome email with their password and their own sign-in link. No mail server is connected yet, so each email is written for you under Agent Applications → Emails to applicants and you send it with one click on Open in Gmail. The first time the Applications tab is opened empty it is filled with sample applications you can remove.",
          "Applications submitted through the captive portal's \"Apply as Reseller\" form land under Agent Applications (with a pop-up on the dashboard and a count on the Agents menu when one arrives) with everything the applicant entered — name, username, email, phone, WhatsApp, location, and their ID and selfie as pictures — plus a checklist to verify them before you approve or reject.",
        ],
      },
      {
        id: "agent-permissions",
        title: "Agent permissions",
        summary: "A 14-group, 60+ permission matrix (Dashboard, Voucher, Customers, Sessions, Sales, Payments, Wallet, Commission, Inventory, Agent Management, Approvals, PIN & Security, Reports, Settings) with six presets.",
        points: [
          "Each permission cycles through Denied / Allowed / Approval Required.",
          "Presets: Full Agent, Sales Agent, Voucher Agent, Support Agent, Associate Admin, Read Only.",
          "An Access Level selector at the top — Full Access, Partial Access, or View Only — offers the same simple choice as sharing a Google Doc. Full Access and View Only apply instantly; Partial Access leaves the detailed matrix open for exact fine-tuning.",
        ],
      },
      {
        id: "agent-portal",
        title: "The agent's own dashboard",
        summary: "Opening \"Agent Dashboard\" from an agent's profile opens their full, standalone platform in a new tab, with its own sidebar and a clear link back to admin.",
        points: [
          "Shows the agent's real wallet balance, commission, and live customer/session data.",
          "Everything in it follows the agent's permissions: the sidebar shows only what's allowed, \"Active Users\" uses the same table as the admin (search, status and package filters, an Actions menu that opens session details and the extend / top up / pause / block pages) and shows only what the agent may do — session columns need \"View live sessions\", and an agent with edit, block and terminate-other-sessions permissions gets full control with checkboxes, bulk actions and delete, and Sales shows commission, payment status, buyer phone, team sales and CSV export only when each is allowed. Sales can be filtered by day, month, date range and time of day, and searched.",
          "The main dashboard opens with a sales overview like the admin's — one compact Sales card next to the other small cards, showing total sales, vouchers sold and commission together, with a small filter (daily, a date, days from–to, this week, this month or a chosen month) — built from the agent's own sales and shown only if they may view sales. The small resale-price reminder can be closed and stays closed.",
          "The sidebar has no Change Password or Logout entry: the password is changed on My Profile, and signing out is in the top-bar menu. Under Tools, SMS lets an agent send and review messages (recorded only — no SMS gateway is connected) and Support Tickets lets them log, answer, close or escalate customer problems; escalated tickets reach you under Agents → Agent support tickets.",
          "On your own default agent dashboard, the \"Admins\" panel lets you add people to help manage it: they are active straight away as Associate Admins, get a temporary password to hand over, can be suspended any time, and sign in straight to this dashboard.",
          "On the Vouchers page each batch has an arrow that opens the list of every voucher in it (code, status, who it was sold to); clicking the batch name opens the full batch.",
          "Bulk Actions (Vouchers page) opens only with the \"Bulk\" permission: pick several vouchers, then copy their codes, download a CSV (needs \"Print / Share\") or expire the unused ones (needs \"Cancel\").",
          "For now an agent can generate vouchers even if their profile isn't complete, so the flow can be tested.",
          "Your own default agent profile can do everything an agent can, whatever permissions are set; other agents get only what you allow.",
          "The agent's Vouchers page looks like the admin's: \"All Batches\" on top (each batch has View codes and Print, plus View all / Print all codes) and the full voucher list below with search, checkboxes, and copy / print selected — printing needs the print permission. \"Vouchers From Admin\" only appears once the admin has actually pushed a batch to that agent, and an agent can only open batches they made or that were pushed to them.",
          "Agents use packages the admin pushed to them or make their own — they never choose a router or site, because new packages are set up on the router the admin assigned them. \"Quick Create\" on the Packages page makes one from just a name, price, duration and optional data limit (5 Mbps, 1 device, unlimited data otherwise).",
          "If the admin has granted the \"Invite a manager\" permission, the agent can add their own managers, who then wait for admin approval.",
          "If dispatched with standing installer/admin access, a transparent \"Installer Support Access\" panel lets the agent see who has it and revoke or restore it themselves at any time — without affecting their own full use of the dashboard.",
        ],
      },
      {
        id: "messages",
        title: "Automated agent messages",
        summary: "Applied, Approved, and Suspended each trigger an automatic SMS or email using an editable template with a {name} placeholder that fills in the agent's real name.",
        points: [
          "Templates and a log of every message sent are managed under Settings → SMS & Email.",
        ],
      },
    ],
  },
  {
    id: "installers",
    title: "Installers",
    sections: [
      {
        id: "installer-workflow",
        title: "The installer workflow",
        summary: "Installers are field technicians who set routers up on-site, then hand the finished job to the client.",
        points: [
          "Add an installer, then assign them to a business/site (and optionally one specific router) from All Installers.",
          "Once set up is complete, dispatch it to the client from Installer Clients — this creates the client their own agent-dashboard account, active immediately, with zero admin configuration access.",
          "Dispatch also grants the installer permanent, transparent standing access to help the client later — visible and revocable by the client at any time from their own dashboard.",
        ],
      },
    ],
  },
  {
    id: "payments",
    title: "Payments & Transactions",
    sections: [
      {
        id: "payments-overview",
        title: "Transactions and gateways",
        summary: "Real transaction records with method breakdowns, plus payment gateway configuration under Settings.",
        points: [
          "Request a new payment gateway to be added if the one you need isn't listed.",
          "A gateway (PesaPal, Hubtel, MTN Mobile Money, and others) can be set once for every business, or configured differently per business — each with its own credentials — via the toggle at the top of Settings → Payments.",
          "MoMo (MTN Mobile Money, Airtel Money, Telecel Cash) is not a separate integration — it's simply one of the gateway choices in this same Payments settings panel, subject to the same same/per-business strategy as every other gateway.",
        ],
      },
    ],
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    sections: [
      {
        id: "analytics-overview",
        title: "What's available",
        summary: "Revenue trend, data usage trend, peak usage hours, bandwidth distribution, and package distribution charts, both account-wide and per-router.",
        points: [],
      },
    ],
  },
  {
    id: "loyalty",
    title: "Loyalty Programme",
    sections: [
      {
        id: "loyalty-overview",
        title: "Points and redemption",
        summary: "Customers earn loyalty points which can be viewed and redeemed on their behalf.",
        points: [],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    sections: [
      {
        id: "settings-structure",
        title: "How Settings is organized",
        summary: "Settings covers account-wide configuration — things that apply everywhere, not to one router.",
        points: [
          "General Settings, Branding, Payments, Hotspot (voucher/billing policy only — not portal design), Captive Portal (a pointer to each router's own Hotspot Configuration tab), Domain, Loyalty Programme, SMS, WhatsApp, Notifications, Security, Sites (linked accounts), Roles & Permissions, Activity Logs.",
          "Portal design, templates, and network settings live on each router's own page, not in Settings — see Hotspot & Captive Portal above.",
          "Currency: every amount is shown in Ghana cedis (GH₵) by default. When you sign in, HotspotPro checks where you are (from your internet address; if that is unavailable, from your time zone when it names a specific country) and, if a different currency fits, asks before switching. You can also pick the currency yourself under Settings → Currency. Switching only changes the label — amounts are not converted with an exchange rate — so re-price your packages if you change currency.",
        ],
      },
      {
        id: "account",
        title: "Your own account",
        summary: "Manage your own name, email, and dashboard language from Account.",
        points: [
          "Dashboard language is your own admin interface's language preference — separate from the captive portal's customer-facing language, which is set per router.",
        ],
      },
    ],
  },
  {
    id: "roles-permissions",
    title: "Roles & Permissions",
    sections: [
      {
        id: "roles-overview",
        title: "The main permission control center",
        summary: "Every module of the site — users, vouchers, packages, routers, hotspot & captive portal, agents, installers, payments, reports, messages, loyalty, and settings itself — is covered here, organized by role.",
        points: [
          "Five role presets: Owner (full access), Operations Manager, Support Staff, Billing/Finance Staff, Read-Only Auditor.",
          "Each permission cycles through Denied / Allowed / Approval Required, same convention as agent permissions.",
          "Reset any role back to its default preset at any time.",
        ],
      },
      {
        id: "admin-team",
        title: "Adding more system admins",
        summary: "The Admin Team panel at the top of Roles & Permissions lets the account owner add other people their own login to the admin dashboard.",
        points: [
          "Add System Admin collects a name, email, phone, and one of the five roles — their permissions come entirely from that role.",
          "New admins start as Pending until they accept their invite.",
          "Any admin's role can be changed, or their account suspended or removed, from the same panel — except the account owner, who can't be suspended or removed.",
        ],
      },
    ],
  },
  {
    id: "activity-logs",
    title: "Activity Logs",
    sections: [
      {
        id: "activity-overview",
        title: "What gets logged",
        summary: "Every meaningful action across the system is recorded: vouchers generated, packages changed, routers added or reconfigured, agents approved or suspended, users modified, and settings changed.",
        points: [
          "Filterable by category: Voucher, Package, Router, Agent, User, Settings.",
          "Retention is configurable, and history can be cleared from here.",
        ],
      },
    ],
  },
  {
    id: "alerts",
    title: "Alerts",
    sections: [
      {
        id: "alerts-overview",
        title: "Operational alerts, separate from customer notifications",
        summary: "Settings → Account Settings → Alerts controls internal alerts — a router going offline or coming back online, a package's voucher stock running low or fully finished, an agent generating vouchers, an agent's own stock running low, or someone applying to become a reseller through a captive portal. This is different from Settings → Notifications, which covers customer-facing SMS/email like OTP and expiry reminders.",
        points: [
          "Each of the seven alert types can be scoped to every business/router on the account, one specific business, or one specific router — the most specific matching rule wins.",
          "Each alert type has its own switches for whether it notifies the admin, the agent(s) assigned to the affected router, or both.",
          "Voucher stock and agent-stock alerts have a configurable threshold — the remaining count that triggers the alert.",
          "Fired alerts appear in the notification bell — the admin's own bell in the main dashboard, and each agent's own bell in their agent portal, showing only the alerts meant for them.",
        ],
      },
    ],
  },
  {
    id: "captive-portal-customer",
    title: "The Customer-Facing Captive Portal",
    sections: [
      {
        id: "customer-login",
        title: "What customers see",
        summary: "The actual /portal page customers land on when connecting to WiFi — separate from every admin/agent view.",
        points: [
          "Package browsing, voucher login, and an \"Apply as Reseller\" application form (collecting username, password, phone, Gmail, location, ID front/back, and a face-capture selfie) that lands in Agent Applications for approval.",
          "Reflects whichever template and customization settings are configured for that router's business.",
        ],
      },
    ],
  },
];
