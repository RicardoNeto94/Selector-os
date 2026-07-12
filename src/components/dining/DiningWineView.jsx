"use client";

import { useEffect, useMemo, useState } from "react";

export default function DiningWineView({ slug }) {
  const [wineData, setWineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (!slug) {
      setWineData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadWineMenu() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/wine-menu/${encodeURIComponent(slug)}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Wine menu unavailable");
        }

        const data = await response.json();

        if (!cancelled) {
          setWineData(data);
        }
      } catch (loadError) {
        console.error("DINING WINE ERROR:", loadError);

        if (!cancelled) {
          setWineData(null);
          setError(
            "The wine selection is currently unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWineMenu();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const items = wineData?.items || [];

  const wineTypes = useMemo(() => {
    return [
      ...new Set(
        items
          .map((item) => item.wines?.wine_type)
          .filter(Boolean)
      ),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const serviceType =
        item.service_type || "bottle";

      const matchesService =
        serviceFilter === "all" ||
        (serviceFilter === "glass" &&
          ["glass", "both"].includes(serviceType)) ||
        (serviceFilter === "bottle" &&
          ["bottle", "both"].includes(serviceType));

      const matchesType =
        typeFilter === "all" ||
        item.wines?.wine_type === typeFilter;

      return matchesService && matchesType;
    });
  }, [items, serviceFilter, typeFilter]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((groups, item) => {
      const type =
        item.wines?.wine_type || "Wine Selection";

      if (!groups[type]) {
        groups[type] = [];
      }

      groups[type].push(item);

      return groups;
    }, {});
  }, [filteredItems]);

  if (loading) {
    return (
      <div className="vx-dining-wine-state">
        <span>THE CELLAR</span>
        <p>Preparing the wine selection...</p>
      </div>
    );
  }

  if (error || !wineData?.menu) {
    return (
      <div className="vx-dining-wine-state">
        <span>THE CELLAR</span>

        <p>
          {error ||
            "The wine selection is currently unavailable."}
        </p>
      </div>
    );
  }

  return (
    <section className="vx-dining-wine">
      <div className="vx-dining-wine-heading">
        <span className="vx-dining-section-label">
          THE CELLAR
        </span>

        <h3>Discover the wine collection</h3>

        <p>
          A considered selection chosen to complement the
          character, craft and cuisine of the restaurant.
        </p>
      </div>

      <div className="vx-dining-wine-controls">
        <div className="vx-dining-wine-service">
          {[
            ["all", "All Wines"],
            ["glass", "By the Glass"],
            ["bottle", "By the Bottle"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={
                serviceFilter === key ? "active" : ""
              }
              onClick={() => setServiceFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {wineTypes.length > 1 && (
          <div className="vx-dining-wine-types">
            <button
              className={
                typeFilter === "all" ? "active" : ""
              }
              onClick={() => setTypeFilter("all")}
            >
              All
            </button>

            {wineTypes.map((type) => (
              <button
                key={type}
                className={
                  typeFilter === type ? "active" : ""
                }
                onClick={() => setTypeFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="vx-dining-wine-list">
        {Object.entries(groupedItems).map(
          ([type, wines]) => (
            <div
              key={type}
              className="vx-dining-wine-section"
            >
              <h3>{type}</h3>

              {wines.map((item) => {
                const wine = item.wines || {};

                const showGlass =
                  ["glass", "both"].includes(
                    item.service_type
                  ) &&
                  item.glass_price !== null;

                const showBottle =
                  ["bottle", "both"].includes(
                    item.service_type || "bottle"
                  ) &&
                  wine.price !== null;

                return (
                  <div
                    key={item.id}
                    className="vx-dining-wine-item"
                  >
                    <div className="vx-dining-wine-copy">
                      <h4>
                        {wine.name}
                        {wine.vintage && (
                          <span> {wine.vintage}</span>
                        )}
                      </h4>

                      <p className="vx-dining-wine-origin">
                        {[
                          wine.producer,
                          wine.region,
                          wine.country,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      {wine.grapes && (
                        <p className="vx-dining-wine-grapes">
                          {wine.grapes}
                        </p>
                      )}

                      {wine.description && (
                        <p className="vx-dining-wine-description">
                          {wine.description}
                        </p>
                      )}
                    </div>

                    <div className="vx-dining-wine-pricing">
                      {showGlass && (
                        <div>
                          <span>GLASS</span>
                          <strong>€{item.glass_price}</strong>
                        </div>
                      )}

                      {showBottle && (
                        <div>
                          <span>BOTTLE</span>
                          <strong>€{wine.price}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {filteredItems.length === 0 && (
          <div className="vx-dining-wine-empty">
            No wines available for this selection.
          </div>
        )}
      </div>
    </section>
  );
}