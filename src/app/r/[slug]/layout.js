import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import "../[slug]/theme.css";

export const dynamic = "force-dynamic";

export default async function RestaurantPublicLayout({ children, params }) {
  const supabase = createServerComponentClient({ cookies });

  // Fetch restaurant by its slug
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!restaurant) {
    return (
      <html>
        <body className="p-20 text-center text-red-500">
          Restaurant not found.
        </body>
      </html>
    );
  }

  // Inject theme variables
  const style = {
    "--primary": restaurant.theme_primary_color || "#d4af37",
    "--secondary": restaurant.theme_secondary_color || "#ffffff",
    "--accent": restaurant.theme_accent_color || "#8b6f47",
    "--background": restaurant.theme_background_url
      ? `url(${restaurant.theme_background_url})`
      : "none",
    "--font": restaurant.theme_font || "Inter, sans-serif",
    "--card-style": restaurant.theme_card_style || "glass",
  };

  return (
    <html lang="en">
      <body style={style} className="min-h-screen">
        <main className="mx-auto max-w-4xl py-10 px-6">{children}</main>
      </body>
    </html>
  );
}
