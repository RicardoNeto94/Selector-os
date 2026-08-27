import Link from "next/link";
import PwaRefreshControl from "@/components/dashboard/PwaRefreshControl";
import { createClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { bottleQuantity, positiveBottleQuantity } from "@/lib/wineInventory";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import {
  ArrowRightIcon, ArrowPathIcon, BeakerIcon, BuildingStorefrontIcon,
  CheckCircleIcon, CircleStackIcon, ClipboardDocumentCheckIcon,
  ClockIcon, ExclamationTriangleIcon, RectangleStackIcon, UsersIcon, BellAlertIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";
const number = (value) => Number(value || 0);
const formatNumber = (value, digits = 0) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(number(value));
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Not yet run";

function StatCard({ label, value, description, tone = "default" }) {
  const accent = tone === "warning" ? "text-[#a95836]" : tone === "good" ? "text-[#667d5e]" : "text-[#30241f]";
  return <div className="so-overview-stat min-w-0 bg-[#fbf8f3] px-4 py-3.5 md:px-5">
    <div className="text-[8px] uppercase tracking-[0.22em] text-[#a29184]">{label}</div>
    <div className={`mt-1.5 text-[24px] font-light tracking-[-0.04em] md:text-[27px] ${accent}`}>{value}</div>
    <div className="mt-1 text-[9px] leading-4 text-[#95857a]">{description}</div>
  </div>;
}

function StatusRow({ icon: Icon, title, detail, href, tone = "neutral" }) {
  const iconStyle = tone === "warning" ? "border-[#ead2c4] bg-[#f8ebe3] text-[#a95836]" : tone === "good" ? "border-[#d5dfcf] bg-[#eef3ea] text-[#667d5e]" : "border-[#dfd1c5] bg-[#f7f1eb] text-[#8e6c5c]";
  const content = <div className="flex items-center gap-3.5">
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${iconStyle}`}><Icon className="h-4 w-4" /></div>
    <div className="min-w-0 flex-1"><div className="text-[11px] font-medium text-[#40312a]">{title}</div><div className="mt-0.5 text-[9px] leading-4 text-[#95857a]">{detail}</div></div>
    {href && <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-[#b5a398]" />}
  </div>;
  return href ? <Link href={href} className="block rounded-[14px] px-3 py-2.5 transition hover:bg-[#f7f1eb]">{content}</Link> : <div className="rounded-[14px] px-3 py-2.5">{content}</div>;
}

function OperationCard({ href, icon: Icon, eyebrow, title, description, meta }) {
  return <Link href={href} className="group flex min-h-[126px] flex-col justify-between rounded-[18px] border border-[#ded3c8] bg-[#fbf8f3] p-4 transition duration-300 hover:-translate-y-[2px] hover:border-[#cdb9aa] hover:shadow-[0_16px_40px_rgba(63,42,31,0.06)]">
    <div><div className="flex items-start justify-between gap-4"><div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfd1c5] bg-[#f7f1eb]"><Icon className="h-4 w-4 text-[#8e6c5c]" /></div><ArrowRightIcon className="h-3.5 w-3.5 text-[#b7a79c] transition group-hover:translate-x-1 group-hover:text-[#963d2d]" /></div>
      <div className="mt-3 text-[7px] uppercase tracking-[0.24em] text-[#a17865]">{eyebrow}</div><div className="mt-1 text-[14px] tracking-[-0.02em] text-[#30241f]">{title}</div><div className="mt-1 max-w-[300px] text-[8.5px] leading-[1.45] text-[#928278]">{description}</div></div>
    <div className="mt-3 border-t border-[#ebe2da] pt-2 text-[8px] text-[#a29287]">{meta}</div>
  </Link>;
}

export default async function DashboardPage() {
  const access = await requireDashboardUser();
  if (!access.allowed) return null;
  const tenant = access.tenant;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const organizationId = tenant.organization.id;
  const memberCountQuery = tenant.source === "membership"
    ? supabase.from("organization_memberships").select("user_id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active")
    : supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active");
  const pendingMemberCountQuery = tenant.source === "membership"
    ? supabase.from("organization_memberships").select("user_id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "invited")
    : supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending");
  const [menusResponse, dishesResponse, membershipsResponse, pendingMembershipsResponse, menuItemRows, locationsResult, inventoryRows, latestSyncResult] = await Promise.all([
    scopeTenantQuery(supabase.from("menus").select("*", { count: "exact", head: true }), tenant),
    scopeTenantQuery(supabase.from("menu_items").select("*", { count: "exact", head: true }), tenant),
    memberCountQuery,
    pendingMemberCountQuery,
    fetchAllRows(supabase, "wine_menu_items", "wine_id", (query) => scopeTenantQuery(query, tenant)),
    scopeTenantQuery(supabase.from("wine_locations").select("id,name,location_type,wine_menu_id").order("name"), tenant),
    fetchAllRows(supabase, "wine_inventory", "wine_id,quantity,location_id,wines(is_active)", (query) => scopeTenantQuery(query, tenant)),
    scopeTenantQuery(supabase.from("compucash_sync_runs").select("status,changed_rows,products_received,products_matched,unmatched_products,error_message,completed_at").order("created_at", { ascending: false }).limit(1), tenant).maybeSingle(),
  ]);
  const locations = locationsResult.data || [];
  const latestSync = latestSyncResult.data;
  const organisationName = tenant.property?.name || tenant.organization.name || "VAXERON Hospitality";
  const teamCount = membershipsResponse.count || 0;
  const pendingTeamCount = pendingMembershipsResponse.count || 0;
  const positiveRows = inventoryRows.filter((row) => positiveBottleQuantity(row.quantity) > 0);
  const totalWineUnits = positiveRows.reduce((total, row) => total + positiveBottleQuantity(row.quantity), 0);
  const stockedWineIds = new Set(positiveRows.map((row) => String(row.wine_id)));
  const stockedWines = stockedWineIds.size;
  const stockedMenuPlacements = menuItemRows.filter((row) => stockedWineIds.has(String(row.wine_id))).length;
  const lowStockRows = positiveRows.filter((row) => number(row.quantity) <= 2).length;
  const reorderSignalRows = inventoryRows.filter((row) => row.wines?.is_active && number(row.quantity) > 0 && number(row.quantity) <= 2).length;
  const negativeRows = inventoryRows.filter((row) => bottleQuantity(row.quantity) < 0).length;
  const roundingRows = inventoryRows.filter((row) => number(row.quantity) < 0 && bottleQuantity(row.quantity) === 0).length;
  const venueMetrics = locations.map((location) => {
    const rows = positiveRows.filter((row) => row.location_id === location.id);
    return { ...location, wines: new Set(rows.map((row) => row.wine_id)).size, quantity: rows.reduce((sum, row) => sum + positiveBottleQuantity(row.quantity), 0) };
  }).sort((a, b) => b.quantity - a.quantity);
  const maxVenueQuantity = Math.max(1, ...venueMetrics.map((location) => location.quantity));
  const syncHealthy = latestSync?.status === "succeeded";
  const compucashConfigured = Boolean(process.env.COMPUCASH_BASE_URL && (process.env.COMPUCASH_CLIENT_ID || process.env.COMPUCASH_IDENTITY) && (process.env.COMPUCASH_CLIENT_SECRET || process.env.COMPUCASH_SECRET));

  return <div className="so-overview-page min-h-screen bg-[#f7f3ed] text-[#30241f]"><div className="mx-auto max-w-[1700px] px-5 py-4 md:px-7 lg:px-8">
    <header className="so-overview-header flex flex-col gap-3 border-b border-[#ded3c8] pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0"><div className="text-[8px] uppercase tracking-[0.3em] text-[#a17865]">VAXERON Operational Overview</div><h1 className="mt-1.5 text-[31px] font-medium tracking-[-0.045em] md:text-[36px]">Good to see you</h1><p className="mt-1 max-w-[680px] text-[10px] leading-[1.5] text-[#8a7b70] md:text-[11px]">{organisationName} — live inventory, guest experience and operational health in one view.</p></div>
      <div className="flex flex-wrap items-center gap-2"><div className="flex min-h-10 items-center gap-2 rounded-full border border-[#d9cbc0] bg-[#fbf8f3] px-4"><span className={`h-1.5 w-1.5 rounded-full ${syncHealthy ? "bg-[#7f9872]" : "bg-[#b86745]"}`} /><span className="text-[8px] uppercase tracking-[0.16em] text-[#817168]">{syncHealthy ? "Systems operational" : "Attention required"}</span></div><Link href="/dashboard/wine-cellar/venues" className="flex min-h-10 items-center rounded-full bg-[#963d2d] px-5 text-[9px] uppercase tracking-[0.15em] text-white">Open operations</Link></div>
    </header>

    <section className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-[#ded3c8] bg-[#ded3c8] xl:grid-cols-5">
      <StatCard label="Active Wine Labels" value={formatNumber(stockedWines)} description="Unique labels with positive physical stock" />
      <StatCard label="Physical Bottle Stock" value={formatNumber(totalWineUnits, 2)} description={`Bottle units across ${locations.length} locations · open fractions included`} />
      <StatCard label="Active Menu Placements" value={formatNumber(stockedMenuPlacements)} description="Stocked wine-to-menu entries; one label can appear more than once" />
      <StatCard label="Low-Stock Location Lines" value={formatNumber(lowStockRows)} description="Positive location balances at 2 units or fewer" tone={lowStockRows ? "warning" : "good"} />
      <StatCard label="Compucash Sync" value={syncHealthy ? "Healthy" : "Check"} description={formatDate(latestSync?.completed_at)} tone={syncHealthy ? "good" : "warning"} />
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="so-dashboard-chart-card rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] p-4 md:p-5">
        <div className="flex items-start justify-between gap-4"><div><div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">Live estate</div><h2 className="mt-2 text-[22px] tracking-[-0.035em]">Inventory distribution</h2><p className="mt-1 text-[9px] text-[#95867b]">Current positive CompuCash-backed physical stock by leading location.</p></div><div className="text-right"><strong className="block text-[20px] font-medium text-[#26322f]">{formatNumber(totalWineUnits, 2)}</strong><span className="text-[7px] uppercase tracking-[0.15em] text-[#909d98]">Bottle units</span></div></div>
        <div className="so-location-chart" aria-label="Inventory bottles by location">{venueMetrics.slice(0, 7).map((location) => { const height = Math.max(6, (location.quantity / maxVenueQuantity) * 100); return <Link key={location.id} href={`/dashboard/wine-cellar/venues/${location.id}`} className="so-location-column" title={`${location.name}: ${formatNumber(location.quantity, 2)} bottles`}><div className="so-location-value">{formatNumber(location.quantity, 1)}</div><div className="so-location-track"><div className="so-location-bar" style={{ height: `${height}%` }} /></div><span>{location.name}</span></Link>; })}</div>
        <div className="so-chart-footer"><span>Live inventory snapshot</span><Link href="/dashboard/wine-cellar/venues">Explore all venues →</Link></div>
      </div>
      <div className="rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] p-4 md:p-5">
        <div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">Operational attention</div><h2 className="mt-2 text-[22px] tracking-[-0.035em]">What needs a look</h2>
        <div className="mt-4 divide-y divide-[#ebe2da]">
          <StatusRow icon={syncHealthy ? CheckCircleIcon : ExclamationTriangleIcon} title={syncHealthy ? "Compucash sync succeeded" : "Compucash sync needs attention"} detail={latestSync ? `${formatNumber(latestSync.products_matched)} products matched · ${formatNumber(latestSync.changed_rows)} rows changed · ${formatDate(latestSync.completed_at)}` : compucashConfigured ? "Connected; awaiting the first run" : "Production credentials are incomplete"} href="/dashboard/wines" tone={syncHealthy ? "good" : "warning"} />
          <StatusRow icon={ExclamationTriangleIcon} title={`${negativeRows} negative inventory balances`} detail={`${roundingRows} additional tiny rounding residues are safely hidden from guests`} href="/dashboard/wine-cellar/reconciliation" tone={negativeRows ? "warning" : "good"} />
          <StatusRow icon={CircleStackIcon} title={`${lowStockRows} low-stock inventory rows`} detail="Positive venue balances at two bottles or fewer" href="/dashboard/wine-cellar/inventory" tone={lowStockRows ? "warning" : "good"} />
          <StatusRow icon={BellAlertIcon} title="Ordering Centre ready" detail={`${reorderSignalRows} quiet low-stock suggestions; notifications activate after approval`} href="/dashboard/wine-cellar/ordering" tone="good" />
          <StatusRow icon={UsersIcon} title={pendingTeamCount ? `${pendingTeamCount} pending team invitation` : "Team access is up to date"} detail={`${teamCount} profiles currently registered`} href="/dashboard/team" tone={pendingTeamCount ? "warning" : "good"} />
        </div>
      </div>
    </section>

    <section className="mt-5"><div><div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">Quick actions</div><h2 className="mt-1 text-[20px] tracking-[-0.035em] md:text-[22px]">Run the operation</h2><p className="mt-1 text-[9px] text-[#95867b]">The most useful day-to-day workspaces.</p></div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OperationCard href="/dashboard/wines" icon={BeakerIcon} eyebrow="Wine" title="Wine Cellar" description="Manage stocked wine records, pricing and catalogue information." meta={`${formatNumber(stockedWines)} active wine labels`} />
        <OperationCard href="/dashboard/wine-cellar/inventory" icon={CircleStackIcon} eyebrow="Inventory" title="Stock Control" description="Review live quantities across cellar and venue storage." meta={`${formatNumber(totalWineUnits, 2)} physical bottle units`} />
        <OperationCard href="/dashboard/wine-cellar/venues" icon={BuildingStorefrontIcon} eyebrow="Venues" title="Venue Wines" description="Control venue selections and guest-facing availability." meta={`${locations.length} storage locations`} />
        <OperationCard href="/dashboard/wine-cellar/reconciliation" icon={ClipboardDocumentCheckIcon} eyebrow="Exceptions" title="Stock Issues" description="Review negative balances and discrepancies reported by the Compucash sync." meta={`${negativeRows} balances need review`} />
        <OperationCard href="/dashboard/wine-cellar/ordering" icon={BellAlertIcon} eyebrow="Purchasing" title="Ordering Centre" description="Approve reorder recommendations and follow purchases through delivery." meta={`${reorderSignalRows} quiet suggestions`} />
        <OperationCard href="/dashboard/menu" icon={RectangleStackIcon} eyebrow="Experience" title="Menus" description="Manage digital menus presented to guests." meta={`${menusResponse.count || 0} menus configured`} />
        <OperationCard href="/dashboard/experiences" icon={ClockIcon} eyebrow="Guest Journey" title="Dining" description="Manage dining experiences and hospitality content." meta={`${dishesResponse.count || 0} menu items`} />
        <OperationCard href="/dashboard/team" icon={UsersIcon} eyebrow="Access" title="Team & Access" description="Invite team members and control operational access." meta={pendingTeamCount ? `${pendingTeamCount} invitation pending` : `${teamCount} team members`} />
        <OperationCard href="/dashboard/wine-cellar/transfers" icon={ArrowPathIcon} eyebrow="Movement" title="Wine Movements" description="Review transfers and inventory movement history." meta="Operational audit trail" />
      </div>
    </section>

    <PwaRefreshControl />
    <section className="mt-7 flex flex-col gap-4 rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d9d8c9] bg-[#f3f5ed]"><span className={`h-1.5 w-1.5 rounded-full ${syncHealthy ? "bg-[#7f9872]" : "bg-[#b86745]"}`} /></div><div><div className="text-[9px] font-medium">VAXERON operational</div><div className="mt-0.5 text-[8px] text-[#9b8b80]">Inventory, venues and guest experience connected</div></div></div><div className="text-[7px] uppercase tracking-[0.24em] text-[#ad9d92]">Hospitality, orchestrated.</div></section>
  </div></div>;
}
