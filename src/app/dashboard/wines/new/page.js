"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function NewWinePage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [producer, setProducer] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [vintage, setVintage] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
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

    const { error } = await supabase.from("wines").insert({
      restaurant_id: restaurant.id,
      name,
      producer,
      region,
      country,
      vintage,
      size,
      price,
      stock,
    });

    if (error) {
      console.error("Wine insert error:", error);
      setLoading(false);
      return;
    }

    router.push("/dashboard/wines");
  };

  return (
    <div className="page-fade">
      <div className="max-w-xl mx-auto">

        <h1 className="text-2xl font-semibold text-white mb-6">
          Add Wine
        </h1>

        <form
          onSubmit={handleSubmit}
          className="so-card p-6 space-y-4"
        >

          <input
            className="so-input"
            placeholder="Wine name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="so-input"
            placeholder="Producer"
            value={producer}
            onChange={(e) => setProducer(e.target.value)}
          />

          <input
            className="so-input"
            placeholder="Region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />

          <input
            className="so-input"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />

          <input
            className="so-input"
            placeholder="Vintage"
            value={vintage}
            onChange={(e) => setVintage(e.target.value)}
          />

          <input
            className="so-input"
            placeholder="Bottle size (750ml, Magnum)"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />

          <input
            className="so-input"
            placeholder="Price (€)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <input
            className="so-input"
            type="number"
            placeholder="Stock (bottles)"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />

          <button
            disabled={loading}
            className="so-btn-primary w-full"
          >
            {loading ? "Saving..." : "Save Wine"}
          </button>

        </form>

      </div>
    </div>
  );
}
