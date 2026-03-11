
"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function NewWineMenuPage() {

  const supabase = createClientComponentClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {

    e.preventDefault();
    setLoading(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!restaurant) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("wine_menus")
      .insert({
        restaurant_id: restaurant.id,
        name
      })
      .select()
      .single();

    router.push(`/dashboard/wine-menus/${data.id}`);
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
