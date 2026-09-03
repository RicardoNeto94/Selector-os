import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  CircleStackIcon,
  CloudIcon,
  DocumentArrowUpIcon,
  GlobeAltIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { createAdminClient } from "@/lib/server/requireAdministrator";
import { requireDashboardUser } from "@/lib/server/requireDashboardUser";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import "./setup.css";

export const dynamic = "force-dynamic";

const INVENTORY_LABELS = {
  api: "CompuCash API",
  hybrid: "Hybrid inventory",
  manual: "Manual inventory",
  csv: "File-managed inventory",
};

function countOf(result) {
  if (result.error) throw result.error;
  return Number(result.count || 0);
}

function StepCard({ number, icon: Icon, title, description, complete, meta, href, action, locked }) {
  return <article className={`wine-setup-step ${complete ? "is-complete" : ""} ${locked ? "is-locked" : ""}`}>
    <div className="wine-setup-step__number">{complete ? <CheckCircleIcon /> : String(number).padStart(2, "0")}</div>
    <div className="wine-setup-step__icon"><Icon /></div>
    <div className="wine-setup-step__copy"><span>{complete ? "Complete" : locked ? "Plan upgrade" : "Next step"}</span><h2>{title}</h2><p>{description}</p><small>{meta}</small></div>
    {locked ? <Link className="wine-setup-step__action is-secondary" href="/dashboard/billing"><LockClosedIcon /> View plans</Link> : <Link className="wine-setup-step__action" href={href}>{complete ? "Review" : action}<ArrowRightIcon /></Link>}
  </article>;
}

export default async function WineSetupPage() {
  const access = await requireDashboardUser();
  if (!access.allowed) return null;

  const admin = createAdminClient();
  const tenant = access.tenant;
  const scope = (query) => scopeTenantQuery(query, tenant);
  const inventoryMode = access.platformSettings?.inventory_mode || "manual";
  const requiresConnection = ["api", "hybrid"].includes(inventoryMode);
  const digitalEnabled = Boolean(access.entitlements?.modules?.guest_experience);

  const results = await Promise.all([
    scope(admin.from("wine_locations").select("id", { count: "exact", head: true }).eq("is_active", true)),
    scope(admin.from("wines").select("id", { count: "exact", head: true }).eq("is_active", true)),
    scope(admin.from("wine_inventory").select("id", { count: "exact", head: true }).gt("quantity", 0)),
    scope(admin.from("wine_menus").select("id", { count: "exact", head: true }).eq("is_active", true)),
    scope(admin.from("guest_experiences").select("id", { count: "exact", head: true }).not("venue_location_id", "is", null).eq("is_published", true)),
    scope(admin.from("integration_connections").select("id", { count: "exact", head: true }).eq("provider", "compucash").eq("status", "active")),
  ]);

  const [locationCount, wineCount, stockedCount, listCount, publishedCount, connectionCount] = results.map(countOf);
  const sourceComplete = !requiresConnection || connectionCount > 0;
  const steps = [sourceComplete, locationCount > 0, wineCount > 0, stockedCount > 0, digitalEnabled ? listCount > 0 : true, digitalEnabled ? publishedCount > 0 : true];
  const completed = steps.filter(Boolean).length;
  const total = steps.length;
  const percentage = Math.round((completed / total) * 100);
  const nextHref = !sourceComplete ? "/dashboard/settings#integrations" : !locationCount ? "/dashboard/wine-cellar/venues" : !wineCount ? (requiresConnection ? "/dashboard/wines" : "/dashboard/wine-cellar/catalogue-import") : !stockedCount ? "/dashboard/wine-cellar/inventory" : digitalEnabled && !listCount ? "/dashboard/wine-cellar/venues" : digitalEnabled && !publishedCount ? "/dashboard/wine-menus/studio" : "/dashboard/wines";

  return <main className="wine-setup-page"><div className="wine-setup-shell">
    <header className="wine-setup-hero">
      <div><span>Guided wine onboarding</span><h1>Prepare your wine workspace.</h1><p>One clear route from an empty account to controlled stock and a guest-ready digital wine list.</p></div>
      <div className="wine-setup-progress"><div><strong>{percentage}%</strong><span>{completed} of {total} stages ready</span></div><div className="wine-setup-progress__track"><i style={{ width: `${percentage}%` }} /></div><Link href={nextHref}>{percentage === 100 ? "Open Wine Cellar" : "Continue setup"}<ArrowRightIcon /></Link></div>
    </header>

    <section className="wine-setup-context" aria-label="Current workspace configuration">
      <div><span>Workspace</span><strong>{tenant.property?.name || tenant.organization?.name}</strong></div>
      <div><span>Inventory source</span><strong>{INVENTORY_LABELS[inventoryMode] || inventoryMode}</strong></div>
      <div><span>Guest publishing</span><strong>{digitalEnabled ? "Included" : "Not in current plan"}</strong></div>
    </section>

    <section className="wine-setup-steps">
      <StepCard number={1} icon={CloudIcon} title="Confirm the inventory source" complete={sourceComplete} href="/dashboard/settings#integrations" action="Review connection" description={requiresConnection ? "Connect the system that supplies live quantities and wine activity." : "This workspace is ready to maintain inventory directly in Vaxeron."} meta={requiresConnection ? `${connectionCount} active CompuCash connection${connectionCount === 1 ? "" : "s"}` : `${INVENTORY_LABELS[inventoryMode] || inventoryMode} selected`} />
      <StepCard number={2} icon={BuildingStorefrontIcon} title="Create wine locations" complete={locationCount > 0} href="/dashboard/wine-cellar/venues" action="Create locations" description="Add the cellar, venues, bars and service points where wine is physically held." meta={`${locationCount} active location${locationCount === 1 ? "" : "s"}`} />
      <StepCard number={3} icon={DocumentArrowUpIcon} title="Build the wine catalogue" complete={wineCount > 0} href={requiresConnection ? "/dashboard/wines" : "/dashboard/wine-cellar/catalogue-import"} action={requiresConnection ? "Review synced wines" : "Import catalogue"} description={requiresConnection ? "Review wines created by the connected inventory feed and complete guest-facing details." : "Import a spreadsheet or begin adding wines manually."} meta={`${wineCount} active wine label${wineCount === 1 ? "" : "s"}`} />
      <StepCard number={4} icon={CircleStackIcon} title="Establish opening stock" complete={stockedCount > 0} href="/dashboard/wine-cellar/inventory" action="Record opening stock" description={requiresConnection ? "Confirm the first synchronization has produced positive venue balances." : "Set the opening quantity for each wine and location. Every count is audited."} meta={`${stockedCount} positive wine-location balance${stockedCount === 1 ? "" : "s"}`} />
      <StepCard number={5} icon={GlobeAltIcon} title="Create the digital wine list" complete={listCount > 0} locked={!digitalEnabled} href="/dashboard/wine-cellar/venues" action="Choose a venue" description="Start from a venue, choose the guest presentation and automatically include available wines." meta={digitalEnabled ? `${listCount} configured wine list${listCount === 1 ? "" : "s"}` : "Digital Wine or Hospitality Suite required"} />
      <StepCard number={6} icon={GlobeAltIcon} title="Preview and publish" complete={publishedCount > 0} locked={!digitalEnabled} href="/dashboard/wine-menus/studio" action="Open wine-list studio" description="Check the mobile and tablet presentation, then publish the final guest URL and PWA." meta={digitalEnabled ? `${publishedCount} published guest experience${publishedCount === 1 ? "" : "s"}` : "Available with guest publishing"} />
    </section>

    <footer className="wine-setup-footer"><div><CheckCircleIcon /><span><strong>Your data stays inside this workspace.</strong> Locations, wines, stock and guest lists are scoped to {tenant.organization?.name}.</span></div><Link href="/dashboard/team">Invite the operating team<ArrowRightIcon /></Link></footer>
  </div></main>;
}
