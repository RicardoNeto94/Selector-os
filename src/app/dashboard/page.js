import Link from "next/link";
import PwaRefreshControl from "@/components/dashboard/PwaRefreshControl";
import SalesRefreshButton from "@/components/dashboard/SalesRefreshButton";
import { createClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { bottleQuantity, hasAvailableStock, isLowStock, isOutOfStock, positiveBottleQuantity, sumWholeBottles } from "@/lib/wineInventory";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import {
  ArrowRightIcon, ArrowPathIcon, BeakerIcon, BuildingStorefrontIcon,
  CheckCircleIcon, CircleStackIcon, ClipboardDocumentCheckIcon,
  ClockIcon, ExclamationTriangleIcon, RectangleStackIcon, UsersIcon, BellAlertIcon,
  ArrowDownTrayIcon, ChartBarIcon,
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
  return <Link href={href} className="group grid min-h-[88px] grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] border border-[#ded3c8] bg-[#fbf8f3] p-3.5 transition duration-200 hover:border-[#b9ccc5] hover:bg-white">
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dfd1c5] bg-[#f7f1eb]"><Icon className="h-4 w-4 text-[#8e6c5c]" /></div>
    <div className="min-w-0"><div className="text-[7px] uppercase tracking-[0.22em] text-[#a17865]">{eyebrow}</div><div className="mt-0.5 text-[13px] tracking-[-0.01em] text-[#30241f]">{title}</div><div className="mt-0.5 truncate text-[8px] text-[#928278]" title={description}>{meta}</div></div>
    <ArrowRightIcon className="h-3.5 w-3.5 text-[#b7a79c] transition group-hover:translate-x-0.5 group-hover:text-[#55766b]" />
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
  const salesStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [menusResponse, dishesResponse, membershipsResponse, pendingMembershipsResponse, locationsResult, inventoryRows, valuationRows, latestSyncResult, roomPwaMenuResult, salesRows] = await Promise.all([
    scopeTenantQuery(supabase.from("menus").select("*", { count: "exact", head: true }), tenant),
    scopeTenantQuery(supabase.from("menu_items").select("*", { count: "exact", head: true }), tenant),
    memberCountQuery,
    pendingMemberCountQuery,
    scopeTenantQuery(supabase.from("wine_locations").select("id,name,location_type,wine_menu_id").order("name"), tenant),
    fetchAllRows(supabase, "wine_inventory", "wine_id,quantity,location_id,wines(is_active)", (query) => scopeTenantQuery(query, tenant)),
    fetchAllRows(supabase, "wine_inventory_valuations", "wine_id,location_id", (query) => scopeTenantQuery(query, tenant).eq("source", "compucash")),
    scopeTenantQuery(supabase.from("compucash_sync_runs").select("status,changed_rows,products_received,products_matched,unmatched_products,error_message,completed_at").order("created_at", { ascending: false }).limit(1), tenant).maybeSingle(),
    scopeTenantQuery(supabase.from("menus").select("name,public_slug").eq("design_type", "burman").eq("is_active", true).not("public_slug", "is", null).limit(1), tenant).maybeSingle(),
    fetchOptionalSalesRows(supabase, tenant, salesStart),
  ]);
  const locations = locationsResult.data || [];
  const latestSync = latestSyncResult.data;
  const organisationName = tenant.property?.name || tenant.organization.name || "VAXERON Hospitality";
  const teamCount = membershipsResponse.count || 0;
  const pendingTeamCount = pendingMembershipsResponse.count || 0;
  const positiveRows = inventoryRows.filter((row) => hasAvailableStock(row.quantity));
  const totalWineUnits = positiveRows.reduce((total, row) => total + positiveBottleQuantity(row.quantity), 0);
  const unopenedBottles = sumWholeBottles(positiveRows);
  const stockedWineIds = new Set(positiveRows.map((row) => String(row.wine_id)));
  const stockedWines = stockedWineIds.size;
  const lowStockRows = positiveRows.filter((row) => isLowStock(row.quantity)).length;
  const compucashValuationKeys = new Set(valuationRows.map((row) => `${row.wine_id}|${row.location_id}`));
  const reorderSignalRows = inventoryRows.filter((row) => row.wines?.is_active && isOutOfStock(row.quantity) && compucashValuationKeys.has(`${row.wine_id}|${row.location_id}`)).length;
  const negativeRows = inventoryRows.filter((row) => bottleQuantity(row.quantity) < 0).length;
  const roundingRows = inventoryRows.filter((row) => number(row.quantity) < 0 && bottleQuantity(row.quantity) === 0).length;
  const venueMetrics = locations.map((location) => {
    const rows = positiveRows.filter((row) => row.location_id === location.id);
    return { ...location, wines: new Set(rows.map((row) => row.wine_id)).size, quantity: rows.reduce((sum, row) => sum + positiveBottleQuantity(row.quantity), 0) };
  }).sort((a, b) => b.quantity - a.quantity);
  const maxVenueQuantity = Math.max(1, ...venueMetrics.map((location) => location.quantity));
  const syncHealthy = latestSync?.status === "succeeded";
  const compucashConfigured = Boolean(process.env.COMPUCASH_BASE_URL && (process.env.COMPUCASH_CLIENT_ID || process.env.COMPUCASH_IDENTITY) && (process.env.COMPUCASH_CLIENT_SECRET || process.env.COMPUCASH_SECRET));
  const completedSales = salesRows.filter((row) => !row.is_cancelled);
  const salesRevenue = completedSales.reduce((sum, row) => sum + number(row.gross_amount), 0);
  const salesUnits = completedSales.reduce((sum, row) => sum + number(row.quantity), 0);
  const bottleEquivalentSales = completedSales.reduce((sum, row) => sum + number(row.bottle_equivalent), 0);
  const saleDays = buildSalesDays(completedSales, 7);
  const maxSalesRevenue = Math.max(1, ...saleDays.map((day) => day.revenue));
  const topWines = buildTopWines(completedSales).slice(0, 4);
  const venueSales = buildVenueSales(completedSales);
  const maxVenueSalesRevenue = Math.max(1, ...venueSales.map((venue) => venue.revenue));

  return <div className="so-overview-page min-h-screen bg-[#f7f3ed] text-[#30241f]"><div className="mx-auto max-w-[1700px] px-5 py-4 md:px-7 lg:px-8">
    <header className="so-overview-header flex flex-col gap-3 border-b border-[#ded3c8] pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0"><div className="text-[8px] uppercase tracking-[0.3em] text-[#a17865]">VAXERON Operational Overview</div><h1 className="mt-1.5 text-[31px] font-medium tracking-[-0.045em] md:text-[36px]">Good to see you</h1><p className="mt-1 max-w-[680px] text-[10px] leading-[1.5] text-[#8a7b70] md:text-[11px]">{organisationName} — live inventory, guest experience and operational health in one view.</p></div>
      <div className="flex flex-wrap items-center gap-2"><div className="flex min-h-10 items-center gap-2 rounded-full border border-[#d9cbc0] bg-[#fbf8f3] px-4"><span className={`h-1.5 w-1.5 rounded-full ${syncHealthy ? "bg-[#7f9872]" : "bg-[#b86745]"}`} /><span className="text-[8px] uppercase tracking-[0.16em] text-[#817168]">{syncHealthy ? "Systems operational" : "Attention required"}</span></div><Link href="/dashboard/wine-cellar/venues" className="flex min-h-10 items-center rounded-full bg-[#963d2d] px-5 text-[9px] uppercase tracking-[0.15em] text-white">Open operations</Link></div>
    </header>

    <section className="mt-4 rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div><div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">CompuCash sales · last 30 days</div><h2 className="mt-2 text-[22px] tracking-[-0.035em]">Wine sales tracker</h2><p className="mt-1 text-[9px] text-[#95867b]">Matched wine products only. Sales are reporting events and never adjust the live inventory a second time.</p></div>
        <div className="flex gap-2"><SalesRefreshButton /><a href={`/api/compucash/sales/export?from=${salesStart}`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#d9cbc0] bg-white px-4 text-[8px] uppercase tracking-[0.14em] text-[#6f625a]"><ArrowDownTrayIcon className="h-3.5 w-3.5" />Export CSV</a></div>
      </div>
      <div className="mt-4 grid gap-px overflow-hidden rounded-[16px] border border-[#e3d9d0] bg-[#e3d9d0] sm:grid-cols-3">
        <StatCard label="Gross wine revenue" value={`€${formatNumber(salesRevenue, 2)}`} description={`${formatNumber(completedSales.length)} matched sale lines`} tone="good" />
        <StatCard label="Sale units" value={formatNumber(salesUnits, 2)} description="POS quantities, including serving products" />
        <StatCard label="Bottle equivalent" value={formatNumber(bottleEquivalentSales, 2)} description="Exact where serving size is mapped" />
      </div>
      {completedSales.length ? <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="flex h-32 items-end gap-2 border-b border-[#e5dbd2] px-1" aria-label="Wine sales revenue for the last seven days">{saleDays.map((day) => <div key={day.date} className="flex h-full flex-1 flex-col justify-end gap-1"><span className="text-center text-[7px] text-[#9b8b80]">€{formatNumber(day.revenue)}</span><div className="mx-auto w-full max-w-16 rounded-t-[8px] bg-[#55766b]" style={{ height: `${Math.max(3, day.revenue / maxSalesRevenue * 88)}%` }} /><span className="pb-1 text-center text-[7px] uppercase tracking-[0.08em] text-[#9b8b80]">{day.label}</span></div>)}</div>
        </div>
        <div className="divide-y divide-[#ebe2da]">{topWines.map((wine, index) => <div key={wine.id} className="flex items-center gap-3 py-2.5"><span className="text-[9px] text-[#b2a197]">0{index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-[10px] text-[#40312a]">{wine.name}</div><div className="mt-0.5 truncate text-[8px] text-[#9b8b80]">{wine.producer || "Wine sale"}</div></div><div className="text-right"><div className="text-[10px] text-[#40312a]">€{formatNumber(wine.revenue, 2)}</div><div className="text-[7px] text-[#9b8b80]">{formatNumber(wine.quantity, 2)} units</div></div></div>)}</div>
      </div> : <div className="mt-5 flex min-h-24 items-center justify-center rounded-[14px] border border-dashed border-[#ded3c8] text-[9px] text-[#95867b]"><ChartBarIcon className="mr-2 h-4 w-4" />Sales appear after the next CompuCash sync.</div>}

      {venueSales.length > 0 && <div className="mt-5 border-t border-[#e5dbd2] pt-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="text-[8px] uppercase tracking-[0.24em] text-[#a17865]">Venue performance</div><h3 className="mt-1.5 text-[16px] tracking-[-0.025em] text-[#40312a]">Wine sold by venue</h3></div>
          <div className="text-[8px] text-[#9b8b80]">CompuCash sales-point attribution · {formatNumber(venueSales.length)} venues</div>
        </div>
        <div className="mt-3 overflow-hidden rounded-[14px] border border-[#e3d9d0]">
          <div className="hidden grid-cols-[minmax(180px,1.3fr)_minmax(150px,1fr)_90px_90px_90px] gap-3 border-b border-[#e8dfd7] bg-[#f6f1eb] px-4 py-2 text-[7px] uppercase tracking-[0.16em] text-[#9b8b80] md:grid">
            <span>Venue / sales point</span><span>Top wine</span><span className="text-right">Revenue</span><span className="text-right">POS units</span><span className="text-right">Bottle eq.</span>
          </div>
          <div className="divide-y divide-[#ebe2da]">{venueSales.map((venue) => <div key={venue.id} className="grid gap-3 bg-white px-4 py-3 md:grid-cols-[minmax(180px,1.3fr)_minmax(150px,1fr)_90px_90px_90px] md:items-center">
            <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${venue.unassigned ? "bg-[#bd784e]" : "bg-[#66877b]"}`} /><strong className="truncate text-[10px] font-medium text-[#40312a]">{venue.name}</strong></div><div className="mt-1 h-1 overflow-hidden rounded-full bg-[#eee7e0]"><div className="h-full rounded-full bg-[#66877b]" style={{ width: `${Math.max(2, venue.revenue / maxVenueSalesRevenue * 100)}%` }} /></div><div className="mt-1 text-[7px] text-[#aa9a90]">{formatNumber(venue.lines)} sale lines{venue.unassigned ? " · mapping needed" : ""}</div></div>
            <div className="min-w-0"><div className="truncate text-[9px] text-[#5d4d44]">{venue.topWine?.name || "No matched wine"}</div><div className="mt-0.5 text-[7px] text-[#aa9a90]">{venue.topWine ? `€${formatNumber(venue.topWine.revenue, 2)}` : "—"}</div></div>
            <div className="flex items-baseline justify-between md:block md:text-right"><span className="text-[7px] uppercase tracking-[0.14em] text-[#aa9a90] md:hidden">Revenue</span><strong className="text-[10px] font-medium text-[#40312a]">€{formatNumber(venue.revenue, 2)}</strong></div>
            <div className="flex items-baseline justify-between md:block md:text-right"><span className="text-[7px] uppercase tracking-[0.14em] text-[#aa9a90] md:hidden">POS units</span><span className="text-[9px] text-[#6f625a]">{formatNumber(venue.quantity, 2)}</span></div>
            <div className="flex items-baseline justify-between md:block md:text-right"><span className="text-[7px] uppercase tracking-[0.14em] text-[#aa9a90] md:hidden">Bottle eq.</span><span className="text-[9px] text-[#6f625a]">{formatNumber(venue.bottleEquivalent, 2)}</span></div>
          </div>)}</div>
        </div>
        <p className="mt-2 text-[7px] leading-4 text-[#aa9a90]">Venue attribution follows the sales point recorded on each CompuCash invoice. Unassigned rows remain visible until their sales point is configured.</p>
      </div>}
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="so-dashboard-chart-card rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] p-4 md:p-5">
        <div className="flex items-start justify-between gap-4"><div><div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">Live estate</div><h2 className="mt-2 text-[22px] tracking-[-0.035em]">Inventory distribution</h2><p className="mt-1 text-[9px] text-[#95867b]">Current positive CompuCash-backed physical stock by leading location, including open fractions.</p></div><div className="text-right"><strong className="block text-[20px] font-medium text-[#26322f]">{formatNumber(totalWineUnits, 2)}</strong><span className="text-[7px] uppercase tracking-[0.15em] text-[#909d98]">Physical units incl. open</span></div></div>
        <div className="so-location-chart" aria-label="Physical inventory units by location">{venueMetrics.slice(0, 7).map((location) => { const height = Math.max(6, (location.quantity / maxVenueQuantity) * 100); return <Link key={location.id} href={`/dashboard/wine-cellar/venues/${location.id}`} className="so-location-column" title={`${location.name}: ${formatNumber(location.quantity, 2)} physical units including open fractions`}><div className="so-location-value">{formatNumber(location.quantity, 1)}</div><div className="so-location-track"><div className="so-location-bar" style={{ height: `${height}%` }} /></div><span>{location.name}</span></Link>; })}</div>
        <div className="so-chart-footer"><span>Live inventory snapshot</span><Link href="/dashboard/wine-cellar/venues">Explore all venues →</Link></div>
      </div>
      <div className="rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] p-4 md:p-5">
        <div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">Operational attention</div><h2 className="mt-2 text-[22px] tracking-[-0.035em]">What needs a look</h2>
        <div className="mt-4 divide-y divide-[#ebe2da]">
          <StatusRow icon={syncHealthy ? CheckCircleIcon : ExclamationTriangleIcon} title={syncHealthy ? "Compucash sync succeeded" : "Compucash sync needs attention"} detail={latestSync ? `${formatNumber(latestSync.products_matched)} products matched · ${formatNumber(latestSync.changed_rows)} rows changed · ${formatDate(latestSync.completed_at)}` : compucashConfigured ? "Connected; awaiting the first run" : "Production credentials are incomplete"} href="/dashboard/wines" tone={syncHealthy ? "good" : "warning"} />
          <StatusRow icon={ExclamationTriangleIcon} title={`${negativeRows} negative inventory balances`} detail={`${roundingRows} additional tiny rounding residues are safely hidden from guests`} href="/dashboard/wine-cellar/reconciliation" tone={negativeRows ? "warning" : "good"} />
          <StatusRow icon={CircleStackIcon} title={`${lowStockRows} low-stock inventory rows`} detail="Positive venue balances at two bottles or fewer" href="/dashboard/wine-cellar/inventory" tone={lowStockRows ? "warning" : "good"} />
          <StatusRow icon={BellAlertIcon} title={`${reorderSignalRows} wines suggested for ordering`} detail="Zero-stock notifications clear automatically when Compucash reports stock above zero" href="/dashboard/wine-cellar/ordering" tone={reorderSignalRows ? "warning" : "good"} />
          <StatusRow icon={UsersIcon} title={pendingTeamCount ? `${pendingTeamCount} pending team invitation` : "Team access is up to date"} detail={`${teamCount} profiles currently registered`} href="/dashboard/team" tone={pendingTeamCount ? "warning" : "good"} />
        </div>
      </div>
    </section>

    <section className="mt-5"><div><div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">Quick actions</div><h2 className="mt-1 text-[20px] tracking-[-0.035em] md:text-[22px]">Run the operation</h2><p className="mt-1 text-[9px] text-[#95867b]">The most useful day-to-day workspaces.</p></div>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <OperationCard href="/dashboard/wines" icon={BeakerIcon} eyebrow="Wine" title="Wine Cellar" description="Manage stocked wine records, pricing and catalogue information." meta={`${formatNumber(stockedWines)} active wine labels`} />
        <OperationCard href="/dashboard/wine-cellar/inventory" icon={CircleStackIcon} eyebrow="Inventory" title="Stock Control" description="Review live quantities across cellar and venue storage." meta={`${formatNumber(unopenedBottles)} unopened bottles`} />
        <OperationCard href="/dashboard/wine-cellar/venues" icon={BuildingStorefrontIcon} eyebrow="Venues" title="Venue Wines" description="Control venue selections and guest-facing availability." meta={`${locations.length} storage locations`} />
        <OperationCard href="/dashboard/wine-cellar/reconciliation" icon={ClipboardDocumentCheckIcon} eyebrow="Exceptions" title="Stock Issues" description="Review negative balances and discrepancies reported by the Compucash sync." meta={`${negativeRows} balances need review`} />
        <OperationCard href="/dashboard/wine-cellar/ordering" icon={BellAlertIcon} eyebrow="Purchasing" title="Ordering Centre" description="Review zero-stock wines suggested for replenishment by live Compucash inventory." meta={`${reorderSignalRows} suggestions to order`} />
        <OperationCard href="/dashboard/menu" icon={RectangleStackIcon} eyebrow="Experience" title="Menus" description="Manage digital menus presented to guests." meta={`${menusResponse.count || 0} menus configured`} />
        <OperationCard href="/dashboard/experiences" icon={ClockIcon} eyebrow="Guest Journey" title="Dining" description="Manage dining experiences and hospitality content." meta={`${dishesResponse.count || 0} menu items`} />
        <OperationCard href="/dashboard/team" icon={UsersIcon} eyebrow="Access" title="Team & Access" description="Invite team members and control operational access." meta={pendingTeamCount ? `${pendingTeamCount} invitation pending` : `${teamCount} team members`} />
        <OperationCard href="/dashboard/wine-cellar/transfers" icon={ArrowPathIcon} eyebrow="Movement" title="Wine Movements" description="Review transfers and inventory movement history." meta="Operational audit trail" />
      </div>
    </section>

    {roomPwaMenuResult.data && access.entitlements?.modules?.guest_experience && (
      <PwaRefreshControl
        menuSlug={roomPwaMenuResult.data.public_slug}
        propertyName={tenant.property?.name || roomPwaMenuResult.data.name || "Property"}
      />
    )}
  </div></div>;
}

async function fetchOptionalSalesRows(supabase, tenant, startDate) {
  try {
    return await fetchAllRows(
      supabase,
      "compucash_activity_rows",
      "business_date,quantity,bottle_equivalent,gross_amount,is_cancelled,wine_id,sale_point_id,sale_point_name,wines(name,producer)",
      (query) => scopeTenantQuery(query, tenant).eq("event_type", "sale").gte("business_date", startDate)
    );
  } catch (error) {
    if (["42P01", "PGRST200", "PGRST205"].includes(error?.code)) return [];
    throw error;
  }
}

function buildSalesDays(rows, count) {
  const byDate = new Map();
  for (const row of rows) byDate.set(row.business_date, (byDate.get(row.business_date) || 0) + number(row.gross_amount));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (count - index - 1));
    const key = date.toISOString().slice(0, 10);
    return { date: key, label: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(date), revenue: byDate.get(key) || 0 };
  });
}

function buildTopWines(rows) {
  const totals = new Map();
  for (const row of rows) {
    const key = row.wine_id || row.wines?.name || "unknown";
    const current = totals.get(key) || { id: key, name: row.wines?.name || "Mapped wine", producer: row.wines?.producer, revenue: 0, quantity: 0 };
    current.revenue += number(row.gross_amount);
    current.quantity += number(row.quantity);
    totals.set(key, current);
  }
  return [...totals.values()].sort((a, b) => b.revenue - a.revenue);
}

function buildVenueSales(rows) {
  const venues = new Map();
  for (const row of rows) {
    const salePointName = String(row.sale_point_name || "").trim();
    const salePointId = String(row.sale_point_id || "").trim();
    const key = salePointId || salePointName.toLowerCase() || "unassigned";
    const venue = venues.get(key) || {
      id: key,
      name: salePointName || "Unassigned sales point",
      unassigned: !salePointId && !salePointName,
      revenue: 0,
      quantity: 0,
      bottleEquivalent: 0,
      lines: 0,
      wines: new Map(),
    };
    venue.revenue += number(row.gross_amount);
    venue.quantity += number(row.quantity);
    venue.bottleEquivalent += number(row.bottle_equivalent);
    venue.lines += 1;

    const wineKey = row.wine_id || row.wines?.name || "unknown";
    const wine = venue.wines.get(wineKey) || {
      name: row.wines?.name || row.product_name || "Matched wine",
      revenue: 0,
    };
    wine.revenue += number(row.gross_amount);
    venue.wines.set(wineKey, wine);
    venues.set(key, venue);
  }

  return [...venues.values()]
    .map((venue) => ({
      ...venue,
      topWine: [...venue.wines.values()].sort((a, b) => b.revenue - a.revenue)[0] || null,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}
