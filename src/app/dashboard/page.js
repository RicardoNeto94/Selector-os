import Link from "next/link";
import PwaRefreshControl from "@/components/dashboard/PwaRefreshControl";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRightIcon, ArrowPathIcon, BeakerIcon, BuildingStorefrontIcon,
  CheckCircleIcon, CircleStackIcon, ClipboardDocumentCheckIcon,
  ClockIcon, ExclamationTriangleIcon, RectangleStackIcon, UsersIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";
const RESTAURANT_ID = "0a8fb8bb-b4c8-4f05-9874-929637521f58";
const number = (value) => Number(value || 0);
const formatNumber = (value, digits = 0) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(number(value));
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Not yet run";

function StatCard({ label, value, description, tone = "default" }) {
  const accent = tone === "warning" ? "text-[#a95836]" : tone === "good" ? "text-[#667d5e]" : "text-[#30241f]";
  return <div className="min-w-0 bg-[#fbf8f3] px-5 py-5 md:px-6">
    <div className="text-[8px] uppercase tracking-[0.22em] text-[#a29184]">{label}</div>
    <div className={`mt-2 text-[27px] font-light tracking-[-0.04em] md:text-[31px] ${accent}`}>{value}</div>
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
  return href ? <Link href={href} className="block rounded-[14px] px-3 py-3 transition hover:bg-[#f7f1eb]">{content}</Link> : <div className="rounded-[14px] px-3 py-3">{content}</div>;
}

function OperationCard({ href, icon: Icon, eyebrow, title, description, meta }) {
  return <Link href={href} className="group flex min-h-[150px] flex-col justify-between rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] p-5 transition duration-300 hover:-translate-y-[2px] hover:border-[#cdb9aa] hover:shadow-[0_16px_40px_rgba(63,42,31,0.06)]">
    <div><div className="flex items-start justify-between gap-4"><div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfd1c5] bg-[#f7f1eb]"><Icon className="h-4 w-4 text-[#8e6c5c]" /></div><ArrowRightIcon className="h-3.5 w-3.5 text-[#b7a79c] transition group-hover:translate-x-1 group-hover:text-[#963d2d]" /></div>
      <div className="mt-5 text-[7px] uppercase tracking-[0.24em] text-[#a17865]">{eyebrow}</div><div className="mt-1.5 text-[15px] tracking-[-0.02em] text-[#30241f]">{title}</div><div className="mt-1.5 max-w-[300px] text-[9px] leading-[1.6] text-[#928278]">{description}</div></div>
    <div className="mt-4 border-t border-[#ebe2da] pt-3 text-[8px] text-[#a29287]">{meta}</div>
  </Link>;
}

export default async function DashboardPage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const [restaurantResult, menusResponse, dishesResponse, winesResponse, profilesResponse, pendingProfilesResponse, menuItemsResponse, locationsResult, inventoryResult, latestSyncResult] = await Promise.all([
    supabase.from("restaurants").select("name").eq("id", RESTAURANT_ID).maybeSingle(),
    supabase.from("menus").select("*", { count: "exact", head: true }),
    supabase.from("menu_items").select("*", { count: "exact", head: true }),
    supabase.from("wines").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("wine_menu_items").select("*", { count: "exact", head: true }),
    supabase.from("wine_locations").select("id,name,location_type,wine_menu_id").order("name"),
    supabase.from("wine_inventory").select("wine_id,quantity,location_id"),
    supabase.from("compucash_sync_runs").select("status,changed_rows,products_received,products_matched,unmatched_products,error_message,completed_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const locations = locationsResult.data || [];
  const inventoryRows = inventoryResult.data || [];
  const latestSync = latestSyncResult.data;
  const organisationName = restaurantResult.data?.name || "VAXERON Hospitality";
  const winesCount = winesResponse.count || 0;
  const teamCount = profilesResponse.count || 0;
  const pendingTeamCount = pendingProfilesResponse.count || 0;
  const positiveRows = inventoryRows.filter((row) => number(row.quantity) > 0);
  const totalWineUnits = positiveRows.reduce((total, row) => total + number(row.quantity), 0);
  const stockedWines = new Set(positiveRows.map((row) => String(row.wine_id))).size;
  const lowStockRows = positiveRows.filter((row) => number(row.quantity) <= 2).length;
  const negativeRows = inventoryRows.filter((row) => number(row.quantity) < -0.001).length;
  const roundingRows = inventoryRows.filter((row) => number(row.quantity) < 0 && number(row.quantity) >= -0.001).length;
  const venueMetrics = locations.map((location) => {
    const rows = positiveRows.filter((row) => row.location_id === location.id);
    return { ...location, wines: new Set(rows.map((row) => row.wine_id)).size, quantity: rows.reduce((sum, row) => sum + number(row.quantity), 0) };
  }).sort((a, b) => b.quantity - a.quantity);
  const syncHealthy = latestSync?.status === "succeeded";
  const compucashConfigured = Boolean(process.env.COMPUCASH_BASE_URL && (process.env.COMPUCASH_CLIENT_ID || process.env.COMPUCASH_IDENTITY) && (process.env.COMPUCASH_CLIENT_SECRET || process.env.COMPUCASH_SECRET));

  return <div className="min-h-screen bg-[#f7f3ed] text-[#30241f]"><div className="mx-auto max-w-[1700px] px-5 py-7 md:px-8 lg:px-10">
    <header className="flex flex-col gap-5 border-b border-[#ded3c8] pb-7 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0"><div className="text-[9px] uppercase tracking-[0.34em] text-[#a17865]">VAXERON Operational Overview</div><h1 className="mt-3 text-[34px] font-medium tracking-[-0.045em] md:text-[44px]">Good to see you</h1><p className="mt-2 max-w-[680px] text-[11px] leading-[1.7] text-[#8a7b70] md:text-[12px]">{organisationName} — live inventory, guest experience and operational health in one view.</p></div>
      <div className="flex flex-wrap items-center gap-2"><div className="flex min-h-10 items-center gap-2 rounded-full border border-[#d9cbc0] bg-[#fbf8f3] px-4"><span className={`h-1.5 w-1.5 rounded-full ${syncHealthy ? "bg-[#7f9872]" : "bg-[#b86745]"}`} /><span className="text-[8px] uppercase tracking-[0.16em] text-[#817168]">{syncHealthy ? "Systems operational" : "Attention required"}</span></div><Link href="/dashboard/wine-cellar/venues" className="flex min-h-10 items-center rounded-full bg-[#963d2d] px-5 text-[9px] uppercase tracking-[0.15em] text-white">Open operations</Link></div>
    </header>

    <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[#ded3c8] bg-[#ded3c8] xl:grid-cols-5">
      <StatCard label="Active Wines" value={formatNumber(winesCount)} description={`${formatNumber(stockedWines)} currently in stock`} />
      <StatCard label="Inventory Units" value={formatNumber(totalWineUnits, 2)} description={`Across ${locations.length} storage locations`} />
      <StatCard label="Guest Listings" value={formatNumber(menuItemsResponse.count || 0)} description="Items connected to wine menus" />
      <StatCard label="Low Stock Rows" value={formatNumber(lowStockRows)} description="Positive balances at 2 units or fewer" tone={lowStockRows ? "warning" : "good"} />
      <StatCard label="Last Sync" value={syncHealthy ? "Healthy" : "Check"} description={formatDate(latestSync?.completed_at)} tone={syncHealthy ? "good" : "warning"} />
    </section>

    <section className="mt-7 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[22px] border border-[#ded3c8] bg-[#fbf8f3] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4"><div><div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">Live estate</div><h2 className="mt-2 text-[22px] tracking-[-0.035em]">Inventory by location</h2><p className="mt-1 text-[9px] text-[#95867b]">Current positive Compucash-backed balances.</p></div><Link href="/dashboard/wine-cellar/venues" className="text-[8px] uppercase tracking-[0.16em] text-[#963d2d]">View all venues →</Link></div>
        <div className="mt-5 divide-y divide-[#ebe2da]">{venueMetrics.slice(0, 6).map((location) => { const share = totalWineUnits > 0 ? Math.min(100, (location.quantity / totalWineUnits) * 100) : 0; return <Link key={location.id} href={`/dashboard/wine-cellar/venues/${location.id}`} className="group grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3.5"><div className="min-w-0"><div className="flex items-center justify-between gap-3"><span className="truncate text-[11px] font-medium text-[#40312a]">{location.name}</span><span className="text-[8px] text-[#9b8b80]">{formatNumber(location.wines)} wines</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-[#ece3dc]"><div className="h-full rounded-full bg-[#9a6b58]" style={{ width: `${share}%` }} /></div></div><div className="min-w-[74px] text-right text-[11px] tabular-nums text-[#5f4a40]">{formatNumber(location.quantity, 2)}</div></Link>; })}</div>
      </div>
      <div className="rounded-[22px] border border-[#ded3c8] bg-[#fbf8f3] p-5 md:p-6">
        <div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">Operational attention</div><h2 className="mt-2 text-[22px] tracking-[-0.035em]">What needs a look</h2>
        <div className="mt-4 divide-y divide-[#ebe2da]">
          <StatusRow icon={syncHealthy ? CheckCircleIcon : ExclamationTriangleIcon} title={syncHealthy ? "Compucash sync succeeded" : "Compucash sync needs attention"} detail={latestSync ? `${formatNumber(latestSync.products_matched)} products matched · ${formatNumber(latestSync.changed_rows)} rows changed · ${formatDate(latestSync.completed_at)}` : compucashConfigured ? "Connected; awaiting the first run" : "Production credentials are incomplete"} href="/dashboard/wines" tone={syncHealthy ? "good" : "warning"} />
          <StatusRow icon={ExclamationTriangleIcon} title={`${negativeRows} negative inventory balances`} detail={`${roundingRows} additional tiny rounding residues are safely hidden from guests`} href="/dashboard/wine-cellar/reconciliation" tone={negativeRows ? "warning" : "good"} />
          <StatusRow icon={CircleStackIcon} title={`${lowStockRows} low-stock inventory rows`} detail="Positive venue balances at two units or fewer" href="/dashboard/wine-cellar/inventory" tone={lowStockRows ? "warning" : "good"} />
          <StatusRow icon={UsersIcon} title={pendingTeamCount ? `${pendingTeamCount} pending team invitation` : "Team access is up to date"} detail={`${teamCount} profiles currently registered`} href="/dashboard/team" tone={pendingTeamCount ? "warning" : "good"} />
        </div>
      </div>
    </section>

    <section className="mt-7"><div><div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">Quick actions</div><h2 className="mt-2 text-[21px] tracking-[-0.035em] md:text-[25px]">Run the operation</h2><p className="mt-1 text-[9px] text-[#95867b]">The most useful day-to-day workspaces.</p></div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OperationCard href="/dashboard/wines" icon={BeakerIcon} eyebrow="Wine" title="Wine Cellar" description="Manage wine records, pricing and catalogue information." meta={`${formatNumber(winesCount)} active wines`} />
        <OperationCard href="/dashboard/wine-cellar/inventory" icon={CircleStackIcon} eyebrow="Inventory" title="Stock Control" description="Review live quantities across cellar and venue storage." meta={`${formatNumber(totalWineUnits, 2)} positive units`} />
        <OperationCard href="/dashboard/wine-cellar/venues" icon={BuildingStorefrontIcon} eyebrow="Venues" title="Venue Wines" description="Control venue selections and guest-facing availability." meta={`${locations.length} storage locations`} />
        <OperationCard href="/dashboard/wine-cellar/reconciliation" icon={ClipboardDocumentCheckIcon} eyebrow="Exceptions" title="Stock Issues" description="Review negative balances and discrepancies reported by the Compucash sync." meta={`${negativeRows} balances need review`} />
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
