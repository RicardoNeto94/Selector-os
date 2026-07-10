"use client";

import { useEffect, useState } from "react";

import WineClientView from "@/app/wine/[slug]/WineClientView";

export default function DiningWineView({ slug }) {
  const [wineData, setWineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      setWineData(null);
      setLoading(false);
      setError("");
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
        console.error(
          "DINING WINE ERROR:",
          loadError
        );

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

  if (loading) {
    return (
      <div className="vx-dining-wine-state">
        <span>WINE CELLAR</span>

        <p>Preparing the wine selection...</p>
      </div>
    );
  }

  if (error || !wineData?.menu) {
    return (
      <div className="vx-dining-wine-state">
        <span>WINE CELLAR</span>

        <p>
          {error ||
            "The wine selection is currently unavailable."}
        </p>
      </div>
    );
  }

  return (
    <section className="vx-dining-wine-embed">
      <WineClientView
        menu={wineData.menu}
        items={wineData.items || []}
        sakePairings={wineData.sakePairings || []}
      />
    </section>
  );
}