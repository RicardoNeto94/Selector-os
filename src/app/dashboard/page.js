import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

import {
  ArrowRightIcon,
  BeakerIcon,
  BuildingStorefrontIcon,
  CircleStackIcon,
  ClipboardDocumentCheckIcon,
  RectangleStackIcon,
  SparklesIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

/* =========================================================
   HELPERS
========================================================= */

function number(value) {
  return Number(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-GB").format(
    number(value)
  );
}

function StatCard({
  label,
  value,
  description,
}) {
  return (
    <div className="min-w-0 bg-[#fbf8f3] px-5 py-4 md:px-6 md:py-5">
      <div className="text-[8px] uppercase tracking-[0.22em] text-[#a29184]">
        {label}
      </div>

      <div className="mt-2 text-[24px] font-light tracking-[-0.04em] text-[#30241f] md:text-[29px]">
        {formatNumber(value)}
      </div>

      <div className="mt-1 truncate text-[8px] text-[#a29287]">
        {description}
      </div>
    </div>
  );
}

function OperationCard({
  href,
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[150px] min-w-0 flex-col justify-between rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] p-5 transition duration-300 hover:-translate-y-[2px] hover:border-[#cdb9aa] hover:shadow-[0_16px_40px_rgba(63,42,31,0.06)]"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfd1c5] bg-[#f7f1eb]">
            <Icon className="h-4 w-4 text-[#8e6c5c]" />
          </div>

          <ArrowRightIcon className="h-3.5 w-3.5 text-[#b7a79c] transition group-hover:translate-x-1 group-hover:text-[#963d2d]" />
        </div>

        <div className="mt-5 text-[7px] uppercase tracking-[0.24em] text-[#a17865]">
          {eyebrow}
        </div>

        <div className="mt-1.5 text-[15px] tracking-[-0.02em] text-[#30241f]">
          {title}
        </div>

        <div className="mt-1.5 max-w-[290px] text-[9px] leading-[1.6] text-[#928278]">
          {description}
        </div>
      </div>

      {meta && (
        <div className="mt-4 border-t border-[#ebe2da] pt-3 text-[8px] text-[#a29287]">
          {meta}
        </div>
      )}
    </Link>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default async function DashboardPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  /* =======================================================
     ORGANISATION
  ======================================================= */

  const {
  data: restaurant,
} = await supabase
  .from("restaurants")
  .select("*")
  .eq(
    "id",
    "0a8fb8bb-b4c8-4f05-9874-929637521f58"
  )
  .maybeSingle();

  /* =======================================================
     CORE COUNTS
  ======================================================= */

  const [
    menusResponse,
    dishesResponse,
    winesResponse,
    locationsResponse,
    profilesResponse,
    pendingProfilesResponse,
    menuItemsResponse,
  ] = await Promise.all([
    supabase
      .from("menus")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("menu_items")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("wines")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("wine_locations")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),

    supabase
      .from("wine_menu_items")
      .select("*", {
        count: "exact",
        head: true,
      }),
  ]);

  const menusCount =
    menusResponse.count || 0;

  const dishesCount =
    dishesResponse.count || 0;

  const winesCount =
    winesResponse.count || 0;

  const locationsCount =
    locationsResponse.count || 0;

  const teamCount =
    profilesResponse.count || 0;

  const pendingTeamCount =
    pendingProfilesResponse.count || 0;

  const publishedWineItems =
    menuItemsResponse.count || 0;

  /* =======================================================
     INVENTORY
  ======================================================= */

  const {
    data: inventoryRows = [],
  } = await supabase
    .from("wine_inventory")
    .select(`
      wine_id,
      quantity,
      location_id
    `);

  const totalWineUnits = (
    inventoryRows || []
  ).reduce(
    (total, row) =>
      total + number(row.quantity),
    0
  );

  const stockedWineIds = new Set(
    (inventoryRows || [])
      .filter(
        (row) =>
          number(row.quantity) > 0
      )
      .map((row) =>
        String(row.wine_id)
      )
  );

  const stockedWines =
    stockedWineIds.size;

  /* =======================================================
     VENUE NAME
  ======================================================= */

  const organisationName =
    restaurant?.name ||
    "VAXERON Hospitality";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#f7f3ed] text-[#30241f]">
      <div className="mx-auto max-w-[1700px] px-5 py-7 md:px-8 lg:px-10">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="flex flex-col gap-5 border-b border-[#ded3c8] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-[0.34em] text-[#a17865]">
              VAXERON Operational Overview
            </div>

            <h1 className="mt-3 text-[34px] font-medium tracking-[-0.045em] md:text-[44px]">
              Welcome back
            </h1>

            <p className="mt-2 max-w-[680px] text-[11px] leading-[1.7] text-[#8a7b70] md:text-[12px]">
              {organisationName} — live
              overview of your hospitality
              workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex min-h-10 items-center gap-2 rounded-full border border-[#d9cbc0] bg-[#fbf8f3] px-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7f9872]" />

              <span className="text-[8px] uppercase tracking-[0.16em] text-[#817168]">
                Operational
              </span>
            </div>

            <Link
              href="/dashboard/settings"
              className="flex min-h-10 items-center rounded-full bg-[#963d2d] px-5 text-[9px] uppercase tracking-[0.15em] text-white"
            >
              Workspace
            </Link>
          </div>
        </header>

        {/* =================================================
            KPI STRIP
        ================================================= */}

        <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[#ded3c8] bg-[#ded3c8] lg:grid-cols-4">
          <StatCard
            label="Wine Portfolio"
            value={winesCount}
            description={`${stockedWines} currently stocked`}
          />

          <StatCard
            label="Inventory Units"
            value={totalWineUnits}
            description={`Across ${locationsCount} storage locations`}
          />

          <StatCard
            label="Guest Wine Listings"
            value={publishedWineItems}
            description="Connected to wine menus"
          />

          <StatCard
            label="Team Access"
            value={teamCount}
            description={
              pendingTeamCount > 0
                ? `${pendingTeamCount} invitation pending`
                : "No pending invitations"
            }
          />
        </section>

        {/* =================================================
            OPERATIONS
        ================================================= */}

        <section className="mt-7">
          <div className="flex items-end justify-between gap-5">
            <div>
              <div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">
                Operations
              </div>

              <h2 className="mt-2 text-[21px] tracking-[-0.035em] md:text-[25px]">
                Hospitality workspace
              </h2>

              <p className="mt-1 text-[9px] text-[#95867b]">
                Direct access to live
                operational areas.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OperationCard
              href="/dashboard/wines"
              icon={BeakerIcon}
              eyebrow="Wine"
              title="Wine Cellar"
              description="Manage the master wine portfolio, pricing and wine information."
              meta={`${winesCount} wines registered`}
            />

            <OperationCard
              href="/dashboard/wine-cellar/inventory"
              icon={CircleStackIcon}
              eyebrow="Inventory"
              title="Stock Control"
              description="Review live quantities across the central cellar and venue storage."
              meta={`${formatNumber(
                totalWineUnits
              )} inventory units`}
            />

            <OperationCard
              href="/dashboard/wine-cellar/venues"
              icon={BuildingStorefrontIcon}
              eyebrow="Venues"
              title="Venue Wines"
              description="Control venue wine selections and guest-facing wine availability."
              meta={`${locationsCount} storage locations`}
            />

            <OperationCard
              href="/dashboard/wine-cellar/reconciliation"
              icon={
                ClipboardDocumentCheckIcon
              }
              eyebrow="Control"
              title="Reconciliation"
              description="Compare operational counts and identify stock discrepancies."
              meta="Inventory control"
            />

            <OperationCard
              href="/dashboard/menu"
              icon={RectangleStackIcon}
              eyebrow="Experience"
              title="Menus"
              description="Manage digital menus and the content presented to guests."
              meta={`${menusCount} menus configured`}
            />

            <OperationCard
              href="/dashboard/experiences"
              icon={SparklesIcon}
              eyebrow="Guest Journey"
              title="Dining"
              description="Manage dining experiences and hospitality content."
              meta={`${dishesCount} menu items`}
            />

            <OperationCard
              href="/dashboard/team"
              icon={UsersIcon}
              eyebrow="Access"
              title="Team & Access"
              description="Invite team members and control roles and operational access."
              meta={
                pendingTeamCount > 0
                  ? `${pendingTeamCount} pending invitation`
                  : `${teamCount} team members`
              }
            />

            <OperationCard
              href="/dashboard/settings"
              icon={BuildingStorefrontIcon}
              eyebrow="Workspace"
              title="Configuration"
              description="Review the core configuration of your VAXERON workspace."
              meta={organisationName}
            />
          </div>
        </section>

        {/* =================================================
            SYSTEM FOOTER
        ================================================= */}

        <section className="mt-7 flex flex-col gap-4 rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d9d8c9] bg-[#f3f5ed]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7f9872]" />
            </div>

            <div>
              <div className="text-[9px] font-medium">
                VAXERON operational
              </div>

              <div className="mt-0.5 text-[8px] text-[#9b8b80]">
                Hospitality workspace
                connected
              </div>
            </div>
          </div>

          <div className="text-[7px] uppercase tracking-[0.24em] text-[#ad9d92]">
            Hospitality, orchestrated.
          </div>
        </section>
      </div>
    </div>
  );
}