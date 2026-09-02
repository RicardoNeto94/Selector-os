import Link from "next/link";
import SalesRefreshButton from "@/components/dashboard/SalesRefreshButton";
import { createClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { bottleQuantity, hasAvailableStock, isOutOfStock, positiveBottleQuantity } from "@/lib/wineInventory";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import {
  ArrowRightIcon, BeakerIcon, BuildingStorefrontIcon,
  CheckCircleIcon, CircleStackIcon, ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon, BellAlertIcon,
  ArrowDownTrayIcon, ChartBarIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";
const number = (value) => Number(value || 0);
const formatNumber = (value, digits = 0) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(number(value));
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Not yet run";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

function FilterLink({ href, active, children }) {
  return <Link href={href} className={`inline-flex min-h-8 items-center justify-center rounded-full px-3 text-[8px] tracking-[0.08em] transition ${active ? "bg-[#29483f] text-white" : "border border-[#ded3c8] bg-white text-[#77685f] hover:border-[#afc2ba]"}`}>{children}</Link>;
}

function VenueSalesRow({ venue, maxRevenue }) {
  return <div className="grid gap-2.5 bg-white px-4 py-2.5 md:grid-cols-[minmax(170px,1.25fr)_minmax(145px,1fr)_90px_80px_85px] md:items-center">
    <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${venue.unassigned ? "bg-[#bd784e]" : "bg-[#66877b]"}`} /><strong className="truncate text-[10px] font-medium text-[#40312a]">{venue.name}</strong></div><div className="mt-1 h-1 overflow-hidden rounded-full bg-[#eee7e0]"><div className="h-full rounded-full bg-[#66877b]" style={{ width: `${Math.max(2, venue.revenue / maxRevenue * 100)}%` }} /></div><div className="mt-1 text-[7px] text-[#aa9a90]">{formatNumber(venue.lines)} lines{venue.unassigned ? " · mapping needed" : ""}</div></div>
    <div className="min-w-0"><div className="truncate text-[9px] text-[#5d4d44]">{venue.topWine?.name || "No matched wine"}</div><div className="mt-0.5 text-[7px] text-[#aa9a90]">{venue.topWine ? `€${formatNumber(venue.topWine.revenue, 2)}` : "—"}</div></div>
    <div className="flex items-baseline justify-between md:block md:text-right"><span className="text-[7px] uppercase tracking-[0.14em] text-[#aa9a90] md:hidden">Revenue</span><strong className="text-[10px] font-medium text-[#40312a]">€{formatNumber(venue.revenue, 2)}</strong></div>
    <div className="flex items-baseline justify-between md:block md:text-right"><span className="text-[7px] uppercase tracking-[0.14em] text-[#aa9a90] md:hidden">POS units</span><span className="text-[9px] text-[#6f625a]">{formatNumber(venue.quantity, 2)}</span></div>
    <div className="flex items-baseline justify-between md:block md:text-right"><span className="text-[7px] uppercase tracking-[0.14em] text-[#aa9a90] md:hidden">Bottle eq.</span><span className="text-[9px] text-[#6f625a]">{formatNumber(venue.bottleEquivalent, 2)}</span></div>
  </div>;
}

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const access = await requireDashboardUser();
  if (!access.allowed) return null;
  const tenant = access.tenant;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const salesPeriod = resolveSalesPeriod(params);
  const salesScope = ["all", "wine", "sake", "alcohol-free"].includes(params?.scope) ? params.scope : "all";
  const [locationsResult, inventoryRows, valuationRows, latestSyncResult, salesRows] = await Promise.all([
    scopeTenantQuery(supabase.from("wine_locations").select("id,name,location_type,wine_menu_id").order("name"), tenant),
    fetchAllRows(supabase, "wine_inventory", "wine_id,quantity,location_id,wines(is_active)", (query) => scopeTenantQuery(query, tenant)),
    fetchAllRows(supabase, "wine_inventory_valuations", "wine_id,location_id", (query) => scopeTenantQuery(query, tenant).eq("source", "compucash")),
    scopeTenantQuery(supabase.from("compucash_sync_runs").select("status,changed_rows,products_received,products_matched,unmatched_products,error_message,completed_at").order("created_at", { ascending: false }).limit(1), tenant).maybeSingle(),
    fetchOptionalSalesRows(supabase, tenant, salesPeriod.previousStart, salesPeriod.end),
  ]);
  const locations = locationsResult.data || [];
  const latestSync = latestSyncResult.data;
  const organisationName = tenant.property?.name || tenant.organization.name || "VAXERON Hospitality";
  const positiveRows = inventoryRows.filter((row) => hasAvailableStock(row.quantity));
  const totalWineUnits = positiveRows.reduce((total, row) => total + positiveBottleQuantity(row.quantity), 0);
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
  const scopedSales = salesRows.filter((row) => matchesSalesScope(row, salesScope));
  const completedSales = scopedSales.filter((row) => !row.is_cancelled && row.business_date >= salesPeriod.start && row.business_date <= salesPeriod.end);
  const previousSales = scopedSales.filter((row) => !row.is_cancelled && row.business_date >= salesPeriod.previousStart && row.business_date <= salesPeriod.previousEnd);
  const salesRevenue = completedSales.reduce((sum, row) => sum + number(row.gross_amount), 0);
  const previousSalesRevenue = previousSales.reduce((sum, row) => sum + number(row.gross_amount), 0);
  const revenueChange = percentageChange(salesRevenue, previousSalesRevenue);
  const salesUnits = completedSales.reduce((sum, row) => sum + number(row.quantity), 0);
  const bottleEquivalentSales = completedSales.reduce((sum, row) => sum + number(row.bottle_equivalent), 0);
  const saleDays = buildSalesDays(completedSales, Math.min(7, salesPeriod.days), salesPeriod.end);
  const maxSalesRevenue = Math.max(1, ...saleDays.map((day) => day.revenue));
  const topWines = buildTopWines(completedSales).slice(0, 4);
  const venueSales = buildVenueSales(completedSales);
  const maxVenueSalesRevenue = Math.max(1, ...venueSales.map((venue) => venue.revenue));
  const unassignedSales = venueSales.find((venue) => venue.unassigned);

  return <div className="so-overview-page min-h-screen bg-[#f7f3ed] text-[#30241f]"><div className="mx-auto max-w-[1700px] px-5 py-4 md:px-7 lg:px-8">
    <header className="so-overview-header flex flex-col gap-3 border-b border-[#ded3c8] pb-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0"><div className="text-[8px] uppercase tracking-[0.24em] text-[#a17865]">{organisationName} · Operational overview</div><h1 className="mt-1 text-[29px] font-medium tracking-[-0.045em] md:text-[34px]">Good to see you</h1><p className="mt-0.5 max-w-[640px] text-[10px] leading-[1.5] text-[#8a7b70]">What happened, what needs attention and where to act next.</p></div>
      <div className="flex flex-wrap items-center gap-2"><div className="flex min-h-9 items-center gap-2 rounded-full border border-[#d9cbc0] bg-[#fbf8f3] px-3.5"><span className={`h-1.5 w-1.5 rounded-full ${syncHealthy ? "bg-[#7f9872]" : "bg-[#b86745]"}`} /><span className="text-[8px] uppercase tracking-[0.13em] text-[#817168]">{syncHealthy ? "Systems operational" : "Attention required"}</span></div><Link href="/dashboard/wines/new" className="flex min-h-9 items-center rounded-full bg-[#29483f] px-4 text-[8px] uppercase tracking-[0.13em] text-white">Add wine</Link></div>
    </header>

    <section className="mt-3 overflow-hidden rounded-[16px] border border-[#ded3c8] bg-[#fbf8f3]">
      <div className="flex flex-col gap-1 border-b border-[#e5dbd2] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[8px] uppercase tracking-[0.2em] text-[#a17865]">Operational attention</div><h2 className="mt-0.5 text-[15px] tracking-[-0.02em]">What needs a look</h2></div><span className="text-[8px] text-[#9b8b80]">Prioritised exceptions only</span></div>
      <div className="grid divide-y divide-[#ebe2da] lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <StatusRow icon={syncHealthy ? CheckCircleIcon : ExclamationTriangleIcon} title={syncHealthy ? "Sync healthy" : "Sync needs attention"} detail={latestSync ? `${formatNumber(latestSync.products_matched)} matched · ${formatDate(latestSync.completed_at)}` : compucashConfigured ? "Awaiting first run" : "Credentials incomplete"} href="/dashboard/wines" tone={syncHealthy ? "good" : "warning"} />
        <StatusRow icon={ExclamationTriangleIcon} title={`${negativeRows} negative balances`} detail={`${roundingRows} rounding residues hidden`} href="/dashboard/wine-cellar/reconciliation" tone={negativeRows ? "warning" : "good"} />
        <StatusRow icon={BellAlertIcon} title={`${reorderSignalRows} order suggestions`} detail="Zero-stock wines to review" href="/dashboard/wine-cellar/ordering" tone={reorderSignalRows ? "warning" : "good"} />
        <StatusRow icon={BuildingStorefrontIcon} title={unassignedSales ? `${formatNumber(unassignedSales.lines)} unassigned sales` : "Venue sales assigned"} detail={unassignedSales ? `€${formatNumber(unassignedSales.revenue, 2)} needs mapping` : "All sales points identified"} href="#venue-performance" tone={unassignedSales ? "warning" : "good"} />
      </div>
    </section>

    <section className="mt-4 rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] p-4 md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div><div className="text-[8px] uppercase tracking-[0.24em] text-[#a17865]">CompuCash performance</div><h2 className="mt-1.5 text-[20px] tracking-[-0.035em]">Wine sales tracker</h2><p className="mt-1 text-[9px] text-[#95867b]">{salesPeriod.label} · {salesScopeLabel(salesScope)} · matched products only</p></div>
        <div className="flex flex-col gap-2 xl:items-end">
          <div className="flex flex-wrap gap-1.5">
            {[["7", "7 days"], ["30", "30 days"], ["last-month", "Last month"]].map(([range, label]) => <FilterLink key={range} href={salesHref({ range, scope: salesScope })} active={salesPeriod.range === range}>{label}</FilterLink>)}
            <form action="/dashboard" className="flex flex-wrap items-center gap-1.5"><input type="hidden" name="range" value="custom" /><input type="hidden" name="scope" value={salesScope} /><input aria-label="Sales start date" type="date" name="from" defaultValue={salesPeriod.range === "custom" ? salesPeriod.start : ""} className="min-h-8 rounded-full border border-[#ded3c8] bg-white px-2.5 text-[8px] text-[#77685f]" /><input aria-label="Sales end date" type="date" name="to" defaultValue={salesPeriod.range === "custom" ? salesPeriod.end : ""} className="min-h-8 rounded-full border border-[#ded3c8] bg-white px-2.5 text-[8px] text-[#77685f]" /><button className="min-h-8 rounded-full border border-[#ded3c8] bg-white px-3 text-[8px] text-[#77685f]">Apply</button></form>
          </div>
          <div className="flex flex-wrap gap-1.5">{[["all", "All"], ["wine", "Wine"], ["sake", "Sake"], ["alcohol-free", "Alcohol-free"]].map(([scope, label]) => <FilterLink key={scope} href={salesHref({ range: salesPeriod.range, scope, from: salesPeriod.start, to: salesPeriod.end })} active={salesScope === scope}>{label}</FilterLink>)}<SalesRefreshButton /><a href={`/api/compucash/sales/export?from=${salesPeriod.start}&to=${salesPeriod.end}`} className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-[#d9cbc0] bg-white px-3 text-[8px] tracking-[0.08em] text-[#6f625a]"><ArrowDownTrayIcon className="h-3.5 w-3.5" />Export</a></div>
        </div>
      </div>
      <div className="mt-4 grid gap-px overflow-hidden rounded-[16px] border border-[#e3d9d0] bg-[#e3d9d0] sm:grid-cols-3">
        <StatCard label="Gross revenue" value={`€${formatNumber(salesRevenue, 2)}`} description={`${formatNumber(completedSales.length)} matched lines · ${formatRevenueChange(revenueChange)}`} tone="good" />
        <StatCard label="Sale units" value={formatNumber(salesUnits, 2)} description="POS quantities, including serving products" />
        <StatCard label="Bottle equivalent" value={formatNumber(bottleEquivalentSales, 2)} description="Exact where serving size is mapped" />
      </div>
      {completedSales.length ? <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="flex h-32 items-end gap-2 border-b border-[#e5dbd2] px-1" aria-label="Wine sales revenue for the last seven days">{saleDays.map((day) => <div key={day.date} className="flex h-full flex-1 flex-col justify-end gap-1"><span className="text-center text-[7px] text-[#9b8b80]">€{formatNumber(day.revenue)}</span><div className="mx-auto w-full max-w-16 rounded-t-[8px] bg-[#55766b]" style={{ height: `${Math.max(3, day.revenue / maxSalesRevenue * 88)}%` }} /><span className="pb-1 text-center text-[7px] uppercase tracking-[0.08em] text-[#9b8b80]">{day.label}</span></div>)}</div>
        </div>
        <div className="divide-y divide-[#ebe2da]">{topWines.map((wine, index) => <div key={wine.id} className="flex items-center gap-3 py-2.5"><span className="text-[9px] text-[#b2a197]">0{index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-[10px] text-[#40312a]">{wine.name}</div><div className="mt-0.5 truncate text-[8px] text-[#9b8b80]">{wine.producer || "Wine sale"}</div></div><div className="text-right"><div className="text-[10px] text-[#40312a]">€{formatNumber(wine.revenue, 2)}</div><div className="text-[7px] text-[#9b8b80]">{formatNumber(wine.quantity, 2)} units</div></div></div>)}</div>
      </div> : <div className="mt-5 flex min-h-24 items-center justify-center rounded-[14px] border border-dashed border-[#ded3c8] text-[9px] text-[#95867b]"><ChartBarIcon className="mr-2 h-4 w-4" />Sales appear after the next CompuCash sync.</div>}

      {venueSales.length > 0 && <div id="venue-performance" className="mt-5 scroll-mt-24 border-t border-[#e5dbd2] pt-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="text-[8px] uppercase tracking-[0.24em] text-[#a17865]">Venue performance</div><h3 className="mt-1.5 text-[16px] tracking-[-0.025em] text-[#40312a]">Wine sold by venue</h3></div>
          <div className="text-[8px] text-[#9b8b80]">CompuCash sales-point attribution · showing {Math.min(5, venueSales.length)} of {formatNumber(venueSales.length)}</div>
        </div>
        <div className="mt-3 overflow-hidden rounded-[14px] border border-[#e3d9d0]">
          <div className="hidden grid-cols-[minmax(180px,1.3fr)_minmax(150px,1fr)_90px_90px_90px] gap-3 border-b border-[#e8dfd7] bg-[#f6f1eb] px-4 py-2 text-[7px] uppercase tracking-[0.16em] text-[#9b8b80] md:grid">
            <span>Venue / sales point</span><span>Top wine</span><span className="text-right">Revenue</span><span className="text-right">POS units</span><span className="text-right">Bottle eq.</span>
          </div>
          <div className="divide-y divide-[#ebe2da]">{venueSales.slice(0, 5).map((venue) => <VenueSalesRow key={venue.id} venue={venue} maxRevenue={maxVenueSalesRevenue} />)}</div>
        </div>
        {venueSales.length > 5 && <details className="mt-2 rounded-[12px] border border-[#e3d9d0] bg-white"><summary className="cursor-pointer list-none px-4 py-2.5 text-center text-[8px] uppercase tracking-[0.14em] text-[#667b74]">View all {venueSales.length} venues</summary><div className="divide-y divide-[#ebe2da] border-t border-[#ebe2da]">{venueSales.slice(5).map((venue) => <VenueSalesRow key={venue.id} venue={venue} maxRevenue={maxVenueSalesRevenue} />)}</div></details>}
        <p className="mt-2 text-[7px] leading-4 text-[#aa9a90]">Venue attribution follows the sales point recorded on each CompuCash invoice. Unassigned rows remain visible until their sales point is configured.</p>
      </div>}
    </section>

    <section className="so-dashboard-chart-card mt-4 rounded-[18px] border border-[#ded3c8] bg-[#fbf8f3] p-4 md:p-5">
      <div className="flex items-start justify-between gap-4"><div><div className="text-[8px] uppercase tracking-[0.22em] text-[#a17865]">Live inventory</div><h2 className="mt-1.5 text-[18px] tracking-[-0.03em]">Stock distribution</h2><p className="mt-1 text-[9px] text-[#95867b]">A compact location overview; detailed stock remains in Wine Cellar.</p></div><div className="text-right"><strong className="block text-[18px] font-medium text-[#26322f]">{formatNumber(totalWineUnits, 2)}</strong><span className="text-[7px] uppercase tracking-[0.12em] text-[#909d98]">Units incl. open</span></div></div>
      <div className="so-location-chart" style={{ height: "145px" }} aria-label="Physical inventory units by location">{venueMetrics.slice(0, 7).map((location) => { const height = Math.max(6, (location.quantity / maxVenueQuantity) * 100); return <Link key={location.id} href={`/dashboard/wine-cellar/venues/${location.id}`} className="so-location-column" title={`${location.name}: ${formatNumber(location.quantity, 2)} physical units including open fractions`}><div className="so-location-value">{formatNumber(location.quantity, 1)}</div><div className="so-location-track"><div className="so-location-bar" style={{ height: `${height}%` }} /></div><span>{location.name}</span></Link>; })}</div>
      <div className="so-chart-footer"><span>Current inventory snapshot</span><Link href="/dashboard/wine-cellar/inventory">Open Stock Control →</Link></div>
    </section>

    <section className="mt-4"><div className="flex items-end justify-between gap-4"><div><div className="text-[8px] uppercase tracking-[0.22em] text-[#a17865]">Next actions</div><h2 className="mt-1 text-[18px] tracking-[-0.03em]">Run the operation</h2></div><span className="hidden text-[8px] text-[#9b8b80] sm:block">Four frequent workflows</span></div>
      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <OperationCard href="/dashboard/wines/new" icon={BeakerIcon} eyebrow="Catalogue" title="Add wine" description="Create a new wine record." meta="Add to the protected catalogue" />
        <OperationCard href="/dashboard/wine-cellar/venues" icon={BuildingStorefrontIcon} eyebrow="Venues" title="Venue Wines" description="Control venue selections and guest-facing availability." meta={`${locations.length} locations configured`} />
        <OperationCard href="/dashboard/wine-cellar/reconciliation" icon={ClipboardDocumentCheckIcon} eyebrow="Exceptions" title="Stock Issues" description="Review negative balances and discrepancies reported by the Compucash sync." meta={`${negativeRows} balances need review`} />
        <OperationCard href="/dashboard/wine-cellar/ordering" icon={BellAlertIcon} eyebrow="Purchasing" title="Ordering Centre" description="Review zero-stock wines suggested for replenishment by live Compucash inventory." meta={`${reorderSignalRows} suggestions to order`} />
      </div>
    </section>
  </div></div>;
}

function resolveSalesPeriod(params = {}) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const requestedRange = ["7", "30", "last-month", "custom"].includes(params?.range) ? params.range : "30";
  let range = requestedRange;
  let start;
  let end = todayIso;

  if (range === "custom" && ISO_DATE.test(params?.from || "") && ISO_DATE.test(params?.to || "") && params.from <= params.to) {
    start = params.from;
    end = params.to;
  } else if (range === "last-month") {
    const firstThisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const lastMonthEnd = addDays(firstThisMonth, -1);
    const lastMonthStart = new Date(Date.UTC(lastMonthEnd.getUTCFullYear(), lastMonthEnd.getUTCMonth(), 1));
    start = toIsoDate(lastMonthStart);
    end = toIsoDate(lastMonthEnd);
  } else {
    if (range === "custom") range = "30";
    start = toIsoDate(addDays(new Date(`${end}T00:00:00Z`), range === "7" ? -6 : -29));
  }

  const days = Math.max(1, Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86400000) + 1);
  const previousEndDate = addDays(new Date(`${start}T00:00:00Z`), -1);
  const previousStartDate = addDays(previousEndDate, -(days - 1));
  return {
    range,
    start,
    end,
    days,
    previousStart: toIsoDate(previousStartDate),
    previousEnd: toIsoDate(previousEndDate),
    label: `${formatShortDate(start)}–${formatShortDate(end)}`,
  };
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function salesHref({ range, scope, from, to }) {
  const query = new URLSearchParams({ range, scope });
  if (range === "custom" && from && to) {
    query.set("from", from);
    query.set("to", to);
  }
  return `/dashboard?${query}`;
}

function salesScopeLabel(scope) {
  return ({ all: "All matched beverages", wine: "Wine only", sake: "Sake only", "alcohol-free": "Alcohol-free only" })[scope] || "All matched beverages";
}

function matchesSalesScope(row, scope) {
  if (scope === "all") return true;
  const wineType = String(row.wines?.wine_type || "").trim().toLowerCase();
  const isSake = wineType.includes("sake");
  const isAlcoholFree = wineType.includes("non-alcohol") || wineType.includes("alcohol-free") || wineType.includes("alcohol free") || wineType.includes("soft-drink");
  if (scope === "sake") return isSake;
  if (scope === "alcohol-free") return isAlcoholFree;
  return !isSake && !isAlcoholFree;
}

function percentageChange(current, previous) {
  if (!previous) return null;
  return (current - previous) / previous * 100;
}

function formatRevenueChange(change) {
  if (change === null) return "No prior comparison";
  const direction = change >= 0 ? "up" : "down";
  return `${direction} ${formatNumber(Math.abs(change), 1)}% vs previous period`;
}

async function fetchOptionalSalesRows(supabase, tenant, startDate, endDate) {
  try {
    return await fetchAllRows(
      supabase,
      "compucash_activity_rows",
      "business_date,quantity,bottle_equivalent,gross_amount,is_cancelled,wine_id,sale_point_id,sale_point_name,wines(name,producer,wine_type)",
      (query) => scopeTenantQuery(query, tenant).eq("event_type", "sale").gte("business_date", startDate).lte("business_date", endDate)
    );
  } catch (error) {
    if (["42P01", "PGRST200", "PGRST205"].includes(error?.code)) return [];
    throw error;
  }
}

function buildSalesDays(rows, count, endDate) {
  const byDate = new Map();
  for (const row of rows) byDate.set(row.business_date, (byDate.get(row.business_date) || 0) + number(row.gross_amount));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(`${endDate}T00:00:00Z`);
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
