"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function BurmanDiningWine({ venueName = "" }) {
  const supabase = createClientComponentClient();

  const [view, setView] = useState("landing");
  const [category, setCategory] = useState("All");
  const [selectedWine, setSelectedWine] = useState(null);

  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const normalizedVenueName = venueName
    .toLowerCase()
    .trim();

  const menuSlug = normalizedVenueName
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  const isShang = normalizedVenueName.includes("shang");
  const isKoyo = normalizedVenueName.includes("koyo");

  useEffect(() => {
    loadWineMenu();
  }, [venueName]);

  async function loadWineMenu() {
    if (!venueName) return;

    setLoading(true);
    setLoadError("");

    const { data: menuData, error: menuError } =
      await supabase
        .from("wine_menus")
        .select("id, name, slug")
        .eq("slug", menuSlug)
        .maybeSingle();

    if (menuError) {
      console.error("WINE MENU ERROR:", menuError);
      setLoadError("Unable to load the wine collection.");
      setWines([]);
      setLoading(false);
      return;
    }

    if (!menuData) {
      console.warn(
        `No wine menu found for venue: ${venueName} / ${menuSlug}`
      );

      setWines([]);
      setLoading(false);
      return;
    }

    const { data: menuItemsData, error: itemsError } =
      await supabase
        .from("wine_menu_items")
        .select(`
          id,
          wine_id,
          quantity,
          description,
          price_override,
          service_type,
          glass_price,
          wines (
            id,
            name,
            producer,
            vintage,
            region,
            country,
            grape,
            wine_type,
            price,
            is_active,
            wine_inventory (
              id,
              quantity,
              location_id,
              wine_locations (
                id,
                name,
                slug,
                restaurant_id
              )
            )
          )
        `)
        .eq("wine_menu_id", menuData.id);

    if (itemsError) {
      console.error("WINE ITEMS ERROR:", itemsError);
      setLoadError("Unable to load the wine collection.");
      setWines([]);
      setLoading(false);
      return;
    }

    const mappedWines = (menuItemsData || [])
      .map((item) => {
        const wine = item.wines;

        if (!wine || wine.is_active === false) {
          return null;
        }

        const venueInventory =
          wine.wine_inventory?.filter((inventory) => {
            const locationName =
              inventory.wine_locations?.name
                ?.toLowerCase()
                .trim() || "";

            if (isShang) {
              return locationName.includes("shang shi");
            }

            if (isKoyo) {
              return locationName.includes("koyo");
            }

            return locationName.includes(
              normalizedVenueName
            );
          }) || [];

        const venueStock = venueInventory.reduce(
          (total, inventory) =>
            total + Number(inventory.quantity || 0),
          0
        );

        return {
          id: wine.id,
          menuItemId: item.id,

          name: wine.name,
          producer: wine.producer,
          vintage: wine.vintage,
          region: wine.region,
          country: wine.country,
          grape: wine.grape,

          wineType: wine.wine_type,

          description:
            item.description?.trim() || "",

          bottlePrice:
            item.price_override ??
            wine.price ??
            null,

          glassPrice: item.glass_price ?? null,

          serviceType:
            item.service_type || "bottle",

          stock: venueStock,
        };
      })
      .filter(Boolean)
      .filter((wine) => wine.stock > 0);

    setWines(mappedWines);
    setLoading(false);
  }

  function getWineCategory(wineType) {
    const type = wineType?.toLowerCase() || "";

    if (type === "sparkling") {
      return "Sparkling";
    }

    if (type === "white") {
      return "White";
    }

    if (type === "rose") {
      return "Rosé";
    }

    if (type === "red") {
      return "Red";
    }

    if (type === "orange") {
      return "Orange";
    }

    if (
      type === "dessert" ||
      type === "fortified"
    ) {
      return "Sweet";
    }

    return "Other";
  }

  const bottleWines = useMemo(() => {
    return wines.filter(
      (wine) =>
        wine.serviceType === "bottle" ||
        wine.serviceType === "both"
    );
  }, [wines]);

  const glassWines = useMemo(() => {
    return wines.filter(
      (wine) =>
        (wine.serviceType === "glass" ||
          wine.serviceType === "both") &&
        wine.glassPrice !== null
    );
  }, [wines]);

  const visibleWines = useMemo(() => {
    if (category === "All") {
      return bottleWines;
    }

    return bottleWines.filter(
      (wine) =>
        getWineCategory(wine.wineType) === category
    );
  }, [bottleWines, category]);

  if (loading) {
    return (
      <section className="vx-wine-landing">
        <div className="vx-wine-intro">
          <span className="vx-dining-section-label">
            THE CELLAR
          </span>

          <h3>
            Preparing
            <br />
            the cellar.
          </h3>

          <p>
            The wine collection is being prepared for your
            evening.
          </p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="vx-wine-landing">
        <div className="vx-wine-intro">
          <span className="vx-dining-section-label">
            THE CELLAR
          </span>

          <h3>
            The cellar is
            <br />
            temporarily unavailable.
          </h3>

          <p>{loadError}</p>
        </div>
      </section>
    );
  }

  if (selectedWine) {
    return (
      <section className="vx-wine-detail">
        <button
          className="vx-wine-back"
          onClick={() => setSelectedWine(null)}
        >
          ← Back to cellar
        </button>

        <div className="vx-wine-detail-content">
          <span className="vx-dining-section-label">
            {getWineCategory(selectedWine.wineType)}
          </span>

          <h3>{selectedWine.name}</h3>

          {selectedWine.producer && (
            <p className="vx-wine-producer">
              {selectedWine.producer}
            </p>
          )}

          <div className="vx-wine-detail-meta">
            {selectedWine.vintage && (
              <span>{selectedWine.vintage}</span>
            )}

            {selectedWine.region && (
              <span>{selectedWine.region}</span>
            )}

            {selectedWine.country && (
              <span>{selectedWine.country}</span>
            )}

            {selectedWine.grape && (
              <span>{selectedWine.grape}</span>
            )}
          </div>

          {selectedWine.description && (
            <p>{selectedWine.description}</p>
          )}

          <div className="vx-wine-detail-prices">
            {(selectedWine.serviceType === "bottle" ||
              selectedWine.serviceType === "both") &&
              selectedWine.bottlePrice !== null && (
                <div>
                  <small>BOTTLE</small>
                  <strong>
                    €{selectedWine.bottlePrice}
                  </strong>
                </div>
              )}

            {(selectedWine.serviceType === "glass" ||
              selectedWine.serviceType === "both") &&
              selectedWine.glassPrice !== null && (
                <div>
                  <small>GLASS</small>
                  <strong>
                    €{selectedWine.glassPrice}
                  </strong>
                </div>
              )}
          </div>
        </div>
      </section>
    );
  }

  if (view === "glass") {
    return (
      <section className="vx-wine-list-view">
        <button
          className="vx-wine-back"
          onClick={() => setView("landing")}
        >
          ← The Cellar
        </button>

        <div className="vx-wine-view-heading">
          <span className="vx-dining-section-label">
            BY THE GLASS
          </span>

          <h3>A glass for the moment</h3>

          <p>
            A concise selection chosen to complement the
            character of the cuisine.
          </p>
        </div>

        {glassWines.length ? (
          <div className="vx-wine-glass-list">
            {glassWines.map((wine) => (
              <button
                key={wine.id}
                className="vx-wine-row vx-wine-row-button"
                onClick={() => setSelectedWine(wine)}
              >
                <div>
                  <small>
                    {getWineCategory(wine.wineType)}
                    {wine.vintage
                      ? ` · ${wine.vintage}`
                      : ""}
                  </small>

                  <h4>{wine.name}</h4>

                  <p>
                    {[wine.producer, wine.region]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="vx-wine-row-end">
                  <span>€{wine.glassPrice}</span>
                  <small>→</small>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="vx-wine-find-placeholder">
            <span>BY THE GLASS</span>

            <h4>Selection coming soon</h4>

            <p>
              Please contact our restaurant team for today's
              by-the-glass recommendations.
            </p>
          </div>
        )}
      </section>
    );
  }

  if (view === "cellar") {
    return (
      <section className="vx-wine-list-view">
        <button
          className="vx-wine-back"
          onClick={() => setView("landing")}
        >
          ← The Cellar
        </button>

        <div className="vx-wine-view-heading">
          <span className="vx-dining-section-label">
            THE COLLECTION
          </span>

          <h3>Explore the cellar</h3>

          <p>
            Wines selected for character, provenance and
            their place at the table.
          </p>
        </div>

        <div className="vx-wine-filters">
          {[
            "All",
            "Sparkling",
            "White",
            "Rosé",
            "Red",
            "Orange",
            "Sweet",
          ].map((item) => (
            <button
              key={item}
              className={
                category === item
                  ? "vx-wine-filter active"
                  : "vx-wine-filter"
              }
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {visibleWines.length ? (
          <div className="vx-wine-cellar-list">
            {visibleWines.map((wine) => (
              <button
                key={wine.id}
                className="vx-wine-row vx-wine-row-button"
                onClick={() => setSelectedWine(wine)}
              >
                <div>
                  <small>
                    {getWineCategory(wine.wineType)}
                    {wine.vintage
                      ? ` · ${wine.vintage}`
                      : ""}
                  </small>

                  <h4>{wine.name}</h4>

                  <p>
                    {[wine.producer, wine.region]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="vx-wine-row-end">
                  {wine.bottlePrice !== null && (
                    <span>€{wine.bottlePrice}</span>
                  )}

                  <small>→</small>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="vx-wine-find-placeholder">
            <span>THE COLLECTION</span>

            <h4>No wines available</h4>

            <p>
              No wines from this collection are currently
              available in the venue cellar.
            </p>
          </div>
        )}
      </section>
    );
  }

  if (view === "find") {
    return (
      <section className="vx-wine-find">
        <button
          className="vx-wine-back"
          onClick={() => setView("landing")}
        >
          ← The Cellar
        </button>

        <div className="vx-wine-view-heading">
          <span className="vx-dining-section-label">
            PERSONAL SELECTION
          </span>

          <h3>Find your wine</h3>

          <p>
            Tell us what you are drawn to and discover wines
            from the live cellar selected around your evening.
          </p>
        </div>

        <div className="vx-wine-find-placeholder">
          <span>COMING NEXT</span>

          <h4>Wine discovery</h4>

          <p>
            Cuisine, style and preference will guide a
            personal selection from the live cellar.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="vx-wine-landing">
      <div className="vx-wine-intro">
        <span className="vx-dining-section-label">
          THE CELLAR
        </span>

        <h3>
          Wine, selected
          <br />
          for the table.
        </h3>

        <p>
          {isShang
            ? "A considered cellar shaped around the depth, delicacy and complexity of Cantonese cuisine."
            : isKoyo
            ? "A precise collection selected around seasonality, delicacy and the progression of the omakase experience."
            : "A considered collection selected for provenance, character and the dining experience."}
        </p>
      </div>

      <div className="vx-wine-actions">
        <button
          className="vx-wine-action"
          onClick={() => setView("glass")}
        >
          <span>01</span>

          <div>
            <small>CURATED SELECTION</small>
            <h4>By the Glass</h4>

            <p>
              Discover wines selected to enjoy by the glass.
            </p>
          </div>

          <strong>→</strong>
        </button>

        <button
          className="vx-wine-action"
          onClick={() => setView("cellar")}
        >
          <span>02</span>

          <div>
            <small>THE COLLECTION</small>
            <h4>Explore the Cellar</h4>

            <p>
              Browse the wine collection available for the
              evening.
            </p>
          </div>

          <strong>→</strong>
        </button>

        <button
          className="vx-wine-action vx-wine-action-featured"
          onClick={() => setView("find")}
        >
          <span>03</span>

          <div>
            <small>PERSONAL SELECTION</small>
            <h4>Help Me Choose</h4>

            <p>
              Discover wines selected around your taste and
              dining experience.
            </p>
          </div>

          <strong>→</strong>
        </button>
      </div>
    </section>
  );
}