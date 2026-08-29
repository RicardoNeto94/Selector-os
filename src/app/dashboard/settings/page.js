import Link from "next/link";
import AppearanceSettingsForm from "./AppearanceSettingsForm";
import LogoUploader from "./LogoUploader";
import { createAdminClient } from "@/lib/server/requireAdministrator";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import { ArrowDownTrayIcon, BellAlertIcon, BuildingOffice2Icon, CheckCircleIcon, CircleStackIcon, LinkIcon, ShieldCheckIcon, UsersIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

const SETTINGS_NAV = [["Workspace", "#workspace"], ["Guest experience", "#appearance"], ["Integrations", "#integrations"], ["Notifications", "#notifications"], ["Security & access", "#security"], ["Data", "#data"]];

function Section({ id, icon: Icon, eyebrow, title, description, children }) {
  return <section id={id} className="scroll-mt-24 rounded-[18px] border border-[#20322e]/10 bg-white/70 p-5 shadow-[0_10px_30px_rgba(24,42,36,0.04)] backdrop-blur-xl md:p-6"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#e8efeb] text-[#44675c]"><Icon className="h-[17px] w-[17px]" /></div><div><div className="text-[8px] font-semibold uppercase tracking-[0.24em] text-[#758a83]">{eyebrow}</div><h2 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-[#20332e]">{title}</h2>{description && <p className="mt-1 max-w-[700px] text-[10px] leading-5 text-[#7a8883]">{description}</p>}</div></div><div className="mt-5">{children}</div></section>;
}

function ReadOnlyField({ label, value, helper }) {
  return <div className="min-w-0 rounded-[13px] border border-[#20322e]/8 bg-[#f6f9f6] p-4"><div className="text-[8px] uppercase tracking-[0.19em] text-[#84938e]">{label}</div><div className="mt-1.5 truncate text-[12px] font-semibold capitalize text-[#2c413b]">{value || "Not configured"}</div>{helper && <div className="mt-1 text-[9px] text-[#94a09c]">{helper}</div>}</div>;
}

function ActionLink({ href, children }) {
  return <Link href={href} className="inline-flex items-center justify-between gap-3 rounded-full border border-[#20322e]/12 bg-white px-4 py-2.5 text-[9px] font-semibold text-[#35564c] no-underline transition hover:border-[#35564c]/30 hover:bg-[#f3f7f4]">{children}<span aria-hidden="true">→</span></Link>;
}

export default async function SettingsPage() {
  const access = await requireDashboardUser();
  if (!access.allowed) return null;
  const admin = createAdminClient();
  const restaurantQuery = scopeTenantQuery(
    admin.from("restaurants").select("id,name,slug,logo_url,theme_logo_url,theme_primary_color,theme_background_style,theme_card_style,theme_density"),
    access.tenant
  ).order("id").limit(1).maybeSingle();
  const syncQuery = scopeTenantQuery(
    admin.from("compucash_sync_runs").select("status,completed_at,products_matched,unmatched_products"),
    access.tenant
  ).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const [{ data: restaurant, error }, { data: latestSync }] = await Promise.all([
    restaurantQuery,
    syncQuery,
  ]);
  if (error || !restaurant) throw new Error(error?.message || "Vaxeron organisation configuration was not found.");
  const syncHealthy = latestSync?.status === "succeeded";
  const syncDate = latestSync?.completed_at ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(latestSync.completed_at)) : "Awaiting first run";
  const tenant = access.tenant || {};
  const organisation = tenant.organization || {};
  const property = tenant.property || {};
  const accessRole = property.role || organisation.role || "member";

  return <main className="min-h-screen bg-transparent text-[#20332e]"><div className="mx-auto max-w-[1500px] px-2 py-3 md:px-4 md:py-5">
    <header className="flex flex-col gap-4 border-b border-[#20322e]/10 pb-5 md:flex-row md:items-end md:justify-between"><div><div className="text-[8px] font-semibold uppercase tracking-[0.3em] text-[#758a83]">Workspace administration</div><h1 className="mt-2 text-[32px] font-semibold tracking-[-0.05em] md:text-[40px]">Settings</h1><p className="mt-1 max-w-[650px] text-[10px] leading-5 text-[#7a8883]">Configure the shared workspace, guest presentation and connected operations for {property.name || restaurant.name}.</p></div><div className="rounded-full border border-[#20322e]/10 bg-white/70 px-4 py-2 text-[8px] uppercase tracking-[0.18em] text-[#6d817a]">Administrator controlled</div></header>
    <div className="mt-5 grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-4 lg:self-start"><nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto rounded-[16px] border border-[#20322e]/9 bg-white/62 p-2 backdrop-blur-xl lg:grid">{SETTINGS_NAV.map(([label, href]) => <a key={href} href={href} className="whitespace-nowrap rounded-[10px] px-3 py-2.5 text-[9px] font-medium text-[#6f807a] no-underline transition hover:bg-[#eaf0ec] hover:text-[#29463d]">{label}</a>)}</nav><p className="mt-3 hidden px-3 text-[8px] leading-4 text-[#91a09b] lg:block">Grouped by responsibility so first-time users can find the correct control without scanning the entire platform.</p></aside>
      <div className="space-y-4">
        <Section id="workspace" icon={BuildingOffice2Icon} eyebrow="Identity" title="Workspace" description="The business and property currently active in this session."><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><ReadOnlyField label="Organisation" value={organisation.name || restaurant.name} helper="Shared tenant boundary" /><ReadOnlyField label="Property" value={property.name || restaurant.name} helper="Current operating property" /><ReadOnlyField label="Timezone" value={property.timezone || "Europe/Tallinn"} helper="Operational reporting" /><ReadOnlyField label="Currency" value={property.currencyCode || "EUR"} helper="Financial display" /></div><p className="mt-3 text-[9px] leading-4 text-[#87958f]">These identifiers are read-only because they scope users, data, integrations and guest URLs. Change them only through controlled onboarding.</p></Section>
        <Section id="appearance" icon={LinkIcon} eyebrow="Guest experience" title="Brand & appearance" description="Shared visual defaults used by supported guest-facing experiences."><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><AppearanceSettingsForm initialPrimaryColor={restaurant.theme_primary_color} initialBackgroundStyle={restaurant.theme_background_style} initialCardStyle={restaurant.theme_card_style} initialDensity={restaurant.theme_density} /><div className="border-t border-[#20322e]/9 pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0"><div className="mb-3 text-[8px] uppercase tracking-[0.2em] text-[#7c8e88]">Guest-facing logo</div><LogoUploader initialLogoUrl={restaurant.theme_logo_url || restaurant.logo_url || ""} /></div></div></Section>
        <Section id="integrations" icon={CheckCircleIcon} eyebrow="Connected systems" title="Integrations" description="Live status of external systems feeding Vaxeron."><div className="flex flex-col gap-4 rounded-[14px] border border-[#20322e]/9 bg-[#f5f8f5] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className={`h-2.5 w-2.5 rounded-full ${syncHealthy ? "bg-[#5fa584]" : "bg-[#c99251]"}`} /><div><div className="text-[11px] font-semibold">Compucash inventory</div><div className="mt-1 text-[9px] text-[#81908b]">Last completed {syncDate}</div></div></div><div className="text-left sm:text-right"><div className="text-[9px] font-medium text-[#526b63]">{syncHealthy ? "Connected and healthy" : "Status needs review"}</div><div className="mt-1 text-[8px] text-[#8b9894]">{latestSync ? `${Number(latestSync.products_matched || 0).toLocaleString("en-GB")} matched · ${Number(latestSync.unmatched_products || 0).toLocaleString("en-GB")} unmatched` : "No synchronization history"}</div></div></div></Section>
        <Section id="notifications" icon={BellAlertIcon} eyebrow="Operations" title="Notifications" description="Inventory notifications are derived from live Compucash stock, rather than duplicated manual alerts."><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[11px] font-semibold">Ordering suggestions</div><p className="mt-1 text-[9px] leading-4 text-[#81908b]">Zero-stock items appear in the Ordering Centre and clear automatically after stock returns.</p></div><ActionLink href="/dashboard/wine-cellar/ordering">Open notification centre</ActionLink></div></Section>
        <Section id="security" icon={ShieldCheckIcon} eyebrow="Protected workspace" title="Security & access" description="Access is tenant-scoped and changes are verified server-side."><div className="grid gap-2 sm:grid-cols-2"><ReadOnlyField label="Your access level" value={accessRole.replaceAll("_", " ")} helper="Applied to this workspace" /><ReadOnlyField label="Access management" value="Team & Access" helper="Invitations, roles and members" /></div><div className="mt-4"><ActionLink href="/dashboard/team"><UsersIcon className="h-4 w-4" /> Manage team access</ActionLink></div></Section>
        <Section id="data" icon={CircleStackIcon} eyebrow="Inventory records" title="Data & exports" description="Use Vaxeron’s operational pages for reconciliations and current inventory extracts."><div className="flex flex-wrap gap-2"><ActionLink href="/dashboard/wine-cellar/inventory"><ArrowDownTrayIcon className="h-4 w-4" /> Inventory & exports</ActionLink><ActionLink href="/dashboard/wine-cellar/reconciliation">Review stock issues</ActionLink></div></Section>
      </div>
    </div>
  </div></main>;
}
