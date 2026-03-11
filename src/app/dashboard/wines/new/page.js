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
  const [wineType, setWineType] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [vintage, setVintage] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState(0);

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
      wine_type: wineType,
      region,
      country,
      vintage,
      size,
      price: price ? Number(price) : null,
      stock: Number(stock)
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

          <select
            className="so-input"
            value={wineType}
            onChange={(e) => setWineType(e.target.value)}
          >
            <option value="">Select Wine Type</option>
            <option value="Sparkling">Sparkling</option>
            <option value="White">White</option>
            <option value="Rosé">Rosé</option>
            <option value="Red">Red</option>
            <option value="Dessert">Dessert</option>
            <option value="Fortified">Fortified</option>
          </select>

          <input
            className="so-input"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />

          <input
            className="so-input"
            placeholder="Region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
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
            type="number"
            placeholder="Price (€)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <input
            className="so-input"
            type="number"
            placeholder="Initial stock (bottles)"
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
