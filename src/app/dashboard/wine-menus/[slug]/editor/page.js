import { redirect } from "next/navigation";

import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { scopeTenantQuery } from "@/lib/server/tenantContext";

export const dynamic = "force-dynamic";

export default async function LegacyWineMenuEditor({ params }) {
  const { slug } = await params;
  const access = await requireAdministrator(new Request("http://localhost"));

  if (access.error) {
    redirect(
      access.error.status === 401
        ? "/sign-in?reason=session-required"
        : "/dashboard/wine-menus/studio"
    );
  }

  let menuQuery = access.admin
    .from("wine_menus")
    .select("id,location_id")
    .eq("slug", slug);
  menuQuery = scopeTenantQuery(menuQuery, access.tenant);
  const { data: menu } = await menuQuery.maybeSingle();

  if (!menu?.location_id) {
    redirect("/dashboard/wine-menus/studio");
  }

  redirect(`/dashboard/wine-cellar/venues/${menu.location_id}`);
}
