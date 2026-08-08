"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function NewWineMenuPage() {

  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // NEW DESIGN STATES
  const [primaryColor, setPrimaryColor] = useState("#d4af37");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [backgroundStyle, setBackgroundStyle] = useState("dark");
  const [cardStyle, setCardStyle] = useState("glass");
  const [logoUrl, setLogoUrl] = useState("");

  const handleSubmit = async (e) => {

    e.preventDefault();
    setLoading(true);

    try {

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!restaurant) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("wine_menus")
        .insert({
          restaurant_id: restaurant.id,
          name,
          theme_primary_color: primaryColor,
          theme_secondary_color: secondaryColor,
          background_style: backgroundStyle,
          card_style: cardStyle,
          custom_logo_url: logoUrl
        })
        .select()
        .single();

      if (error) {
        console.error("Wine menu creation error:", error);
        setLoading(false);
        return;
      }

      router.push(`/dashboard/wine-menus/${data.id}`);

    } catch (err) {

      console.error("Unexpected error:", err);

    }

    setLoading(false);
  };

  return (
    <div className="page-fade">

      <div className="max-w-xl mx-auto">

        <h1 className="text-2xl font-semibold text-white mb-6">
          Create Wine Menu
        </h1>

        <form
          onSubmit={handleSubmit}
          className="so-card p-6 space-y-4"
        >

          <input
            className="so-input"
            placeholder="Wine menu name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* DESIGN SETTINGS */}

          <div className="grid grid-cols-2 gap-4">

            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="so-input h-12"
            />

            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="so-input h-12"
            />

            <select
              className="so-input"
              value={backgroundStyle}
              onChange={(e) => setBackgroundStyle(e.target.value)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>

            <select
              className="so-input"
              value={cardStyle}
              onChange={(e) => setCardStyle(e.target.value)}
            >
              <option value="glass">Glass</option>
              <option value="minimal">Minimal</option>
            </select>

          </div>

          <input
            className="so-input"
            placeholder="Custom logo URL (optional)"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />

          <button
            disabled={loading}
            className="so-btn-primary w-full"
          >
            {loading ? "Creating..." : "Create Wine Menu"}
          </button>

        </form>

      </div>

    </div>
  );
}