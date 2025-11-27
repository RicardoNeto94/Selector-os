import "./theme.css";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function RestaurantPublicLayout({ children, params }) {
  const supabase = createServerComponentClient({ cookies });

  // Load restaurant by slug
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("public_slug", params.slug)
    .maybeSingle();

  return (
    <html lang="en">
      <body
        style={{
          "--primary": restaurant?.theme_primary_color ?? "#d4af37",
          "--secondary": restaurant?.theme_secondary_color ?? "#ffffff",
          "--accent": restaurant?.theme_accent_color ?? "#8b6f47",
          "--background": restaurant?.theme_background_url ?? "none",
          "--logo": restaurant?.theme_logo_url ?? "none",
          "--font": restaurant?.theme_font ?? "Inter, sans-serif",
          "--card-style": restaurant?.theme_card_style ?? "glass",
        }}
        className="min-h-screen bg-[color:var(--secondary)] text-[color:var(--primary)]"
      >
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
