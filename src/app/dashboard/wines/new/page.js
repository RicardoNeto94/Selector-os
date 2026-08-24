"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewWinePage() {

  const supabase = createClient();
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
  const [grapes, setGrapes] = useState("");
  const [subregion, setSubregion] = useState("");
  const [description, setDescription] = useState("");
const [locations, setLocations] = useState([]);
const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
  loadLocations();
}, []);
async function loadLocations() {

  const { data } = await supabase
    .from("wine_locations")
    .select("*")
    .order("name");

  if (!data) return;

  if (data.length > 0) {

    console.log("Loaded locations:", data);

    setLocations(data);

    if (!selectedLocation) {
      setSelectedLocation(data[0].id);
    }

  }

}
  const handleSubmit = async (e) => {

    console.log("Submit triggered");

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
    
    console.log("Restaurant found:", restaurant);

    if (!restaurant) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("wines")
      .insert([
        {
          restaurant_id: restaurant.id,
          name,
          producer,
          wine_type: wineType,
          region,
          subregion,
          country,
          grapes,
          vintage: vintage ? Number(vintage) : null,
          size,
          price: price ? Number(price) : null,
          description
        }
      ])
      .select();

    if (error) {
      console.error("Wine insert error:", error);
      setLoading(false);
      return;
    }

    console.log("Inserted wine:", data);
    const createdWine = data?.[0];

console.log("Created wine:", createdWine);
console.log("Selected location:", selectedLocation);
console.log("Stock:", stock);

if (createdWine && selectedLocation) {

  const { data: inventoryData, error: inventoryError } = await supabase
  .from("wine_inventory")
  .insert({
    wine_id: createdWine.id,
    location_id: selectedLocation,
    quantity: Number(stock)
  })
  .select();
  

  console.log("Inventory insert:", inventoryData);

  if (inventoryError) {
    console.error("Inventory insert error:", inventoryError);
  }

}

    router.push("/dashboard/wines");
  };

  return (

    <div className="so-page page-fade">

      <div className="w-full">

        <header className="so-page-header">
          <div><p className="so-page-eyebrow">Wine operations</p><h1 className="so-page-title">Add wine</h1><p className="so-page-description">Create a catalogue record and optionally assign its opening stock to a location.</p></div>
          <button type="button" onClick={() => router.back()} className="so-btn-secondary">Cancel</button>
        </header>

        <form
  onSubmit={handleSubmit}
  className="so-card w-full p-6 md:p-8 !grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
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
  placeholder="Grape variety (Pinot Noir, Chardonnay...)"
  value={grapes}
  onChange={(e) => setGrapes(e.target.value)}
/>

          <select
            className="so-input"
            value={wineType}
            onChange={(e) => setWineType(e.target.value)}
          >
            <option value="">Wine Type</option>
            <option value="Sparkling">Sparkling</option>
            <option value="White">White</option>
            <option value="Rosé">Rosé</option>
            <option value="Red">Red</option>
            <option value="Dessert">Dessert</option>
            <option value="Fortified">Fortified</option>
            <option value="Sake">Sake</option>
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
  placeholder="Subregion"
  value={subregion}
  onChange={(e) => setSubregion(e.target.value)}
/>

          <input
            className="so-input"
            placeholder="Vintage"
            value={vintage}
            onChange={(e) => setVintage(e.target.value)}
          />

          <input
            className="so-input"
            placeholder="Bottle size"
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
<select
  className="so-input text-[#3a2a24]"
  value={selectedLocation}
  onChange={(e) => setSelectedLocation(e.target.value)}
>

  {locations.map((location) => (

    <option
      key={location.id}
      value={location.id}
    >
      {location.name}
    </option>

  ))}

</select>
          <input
            className="so-input"
            type="number"
            placeholder="Initial stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />

          <textarea
            className="so-input col-span-2 h-24 resize-none"
            placeholder="Wine description (appears in guest modal)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            disabled={loading}
            className="so-btn-primary col-span-2"
          >
            {loading ? "Saving..." : "Save Wine"}
          </button>

        </form>

      </div>

    </div>

  );
}
