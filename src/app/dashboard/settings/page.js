import AppearanceSettingsForm from "./AppearanceSettingsForm";
import LogoUploader from "./LogoUploader";
import { createAdminClient } from "@/lib/server/requireAdministrator";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import { BuildingOffice2Icon, CheckCircleIcon, LinkIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

function InfoCard({ icon: Icon, eyebrow, title, children }) {
  return <section className="rounded-[22px] border border-[#ded3c8] bg-[#fbf8f3] p-5 md:p-6"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfd1c5] bg-[#f7f1eb]"><Icon className="h-4 w-4 text-[#8e6c5c]" /></div><div><div className="text-[8px] uppercase tracking-[0.24em] text-[#a17865]">{eyebrow}</div><h2 className="mt-1 text-[17px] tracking-[-0.025em] text-[#30241f]">{title}</h2></div></div><div className="mt-5">{children}</div></section>;
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

  return <main className="min-h-screen bg-[#f7f3ed] text-[#30241f]"><div className="mx-auto max-w-[1450px] px-5 py-7 md:px-8 lg:px-10">
    <header className="border-b border-[#ded3c8] pb-7"><div className="text-[9px] uppercase tracking-[0.34em] text-[#a17865]">Administration</div><h1 className="mt-3 text-[34px] font-medium tracking-[-0.045em] md:text-[42px]">Settings</h1><p className="mt-2 max-w-[700px] text-[11px] leading-5 text-[#8a7b70]">Manage organisation branding, guest presentation and connected systems for {restaurant.name}.</p></header>
    <div className="mt-7 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]"><div className="space-y-4">
      <section className="rounded-[22px] border border-[#ded3c8] bg-[#fbf8f3] p-5 md:p-6"><AppearanceSettingsForm initialPrimaryColor={restaurant.theme_primary_color} initialBackgroundStyle={restaurant.theme_background_style} initialCardStyle={restaurant.theme_card_style} initialDensity={restaurant.theme_density} /></section>
      <InfoCard icon={BuildingOffice2Icon} eyebrow="Organisation" title="Vaxeron account"><div className="grid gap-px overflow-hidden rounded-[14px] border border-[#e4d9cf] bg-[#e4d9cf] sm:grid-cols-2"><div className="bg-[#f8f4ef] p-4"><div className="text-[8px] uppercase tracking-[0.18em] text-[#a29184]">Organisation</div><div className="mt-1.5 text-[12px] font-medium">{restaurant.name}</div></div><div className="bg-[#f8f4ef] p-4"><div className="text-[8px] uppercase tracking-[0.18em] text-[#a29184]">Access level</div><div className="mt-1.5 text-[12px] font-medium">Administrator</div></div></div><p className="mt-3 text-[9px] leading-4 text-[#95857a]">Organisation identity changes are controlled centrally to protect connected menus, URLs and integrations.</p></InfoCard>
    </div><div className="space-y-4">
      <InfoCard icon={LinkIcon} eyebrow="Branding" title="Guest-facing logo"><LogoUploader initialLogoUrl={restaurant.theme_logo_url || restaurant.logo_url || ""} /></InfoCard>
      <InfoCard icon={CheckCircleIcon} eyebrow="Integrations" title="Compucash"><div className="flex items-center justify-between gap-4 rounded-[14px] border border-[#d9dfd3] bg-[#f1f5ee] px-4 py-3"><div><div className="text-[11px] font-medium text-[#41503d]">Automatic inventory sync</div><div className="mt-1 text-[9px] text-[#73806e]">Last completed {syncDate}</div></div><div className={`rounded-full px-3 py-1 text-[8px] uppercase tracking-[0.16em] ${syncHealthy ? "bg-[#dce8d7] text-[#52694b]" : "bg-[#f2ded3] text-[#9a5238]"}`}>{syncHealthy ? "Connected" : "Check status"}</div></div><div className="mt-3 text-[9px] leading-4 text-[#95857a]">{latestSync ? `${Number(latestSync.products_matched || 0).toLocaleString("en-GB")} products matched · ${Number(latestSync.unmatched_products || 0).toLocaleString("en-GB")} unmatched on the last run.` : "No synchronization history is available yet."}</div></InfoCard>
      <InfoCard icon={ShieldCheckIcon} eyebrow="Security" title="Administrator controls"><p className="text-[10px] leading-5 text-[#7f7066]">Settings changes and logo uploads are authenticated on the server and restricted to Vaxeron administrators.</p></InfoCard>
    </div></div>
  </div></main>;
}
