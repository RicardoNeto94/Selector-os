"use client";

import { useState } from "react";
import ShangShiWineResultsView from "./ShangShiWineResultsView";

function getWine(item) {
  if (Array.isArray(item?.wines)) return item.wines[0] || {};
  return item?.wines || item || {};
}

// 👉 normalize text (avoid duplicates like france / France)
function normalize(str) {
  return String(str || "").trim();
}

export default function ShangShiWineView({ menu, items }) {

  const [filters, setFilters] = useState({
    wine_type: "",
    name: "",
    country: "",
    region: "",
    vintage: ""
  });

  const [showResults, setShowResults] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleShowResults = () => setShowResults(true);
  const handleBack = () => setShowResults(false);

  const handleReset = () => {
    setFilters({
      wine_type: "",
      name: "",
      country: "",
      region: "",
      vintage: ""
    });
  };

  const wines = items.map(getWine);

  // ✅ COUNTRIES (A → Z)
  const countries = [
    ...new Set(
      wines.map(w => normalize(w.country)).filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  // ✅ REGIONS (A → Z, FILTERED BY COUNTRY)
  const regions = [
    ...new Set(
      wines
        .filter(w => !filters.country || normalize(w.country) === filters.country)
        .map(w => normalize(w.region))
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  // ✅ VINTAGES (OLD → NEW = DESC)
  const vintages = [
    ...new Set(
      wines
        .filter(w =>
          (!filters.country || normalize(w.country) === filters.country) &&
          (!filters.region || normalize(w.region) === filters.region)
        )
        .map(w => Number(w.vintage))
        .filter(Boolean)
    )
  ].sort((a, b) => b - a); // 🔥 descending

  if (showResults) {
    return (
      <WineResultsView
        menu={menu}
        items={items}
        filters={filters}
        onBack={handleBack}
      />
    );
  }

  return (
    <div
      className="h-screen flex items-center justify-center px-4 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #003223 0%, #001a12 100%)"
      }}
    >
      <div className="w-full max-w-[680px]">

        {/* HEADER */}
        <div className="text-center text-white mb-6">
          <img src="/shangshi-logo.png" className="h-16 mx-auto mb-3" />
          <p className="tracking-[0.3em] text-[10px] opacity-70">
            WINE SELECTION
          </p>
        </div>

        {/* CARD */}
        <div className="bg-[#F4F1EA] rounded-[28px] px-8 py-8 shadow-xl">

          {/* TITLE */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-[#1A1A1A]">
              Find your bottle
            </h2>

            <p className="text-xs text-neutral-500 mt-1">
              Select a style or refine your search
            </p>
          </div>

          {/* WINE TYPES */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {["red", "white", "sparkling", "rose"].map((type) => (
              <button
                key={type}
                onClick={() =>
                  setFilters({ ...filters, wine_type: type })
                }
                className={`
                  px-4 py-1.5 rounded-full text-[10px] tracking-[0.25em] uppercase
                  border transition-all duration-200

                  ${
                    filters.wine_type === type
                      ? "bg-[#0B3D2E] text-white border-[#0B3D2E]"
                      : "border-[#C9A96A] text-[#5A4A2F] hover:bg-[#EDE6D8]"
                  }
                `}
              >
                {type}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search wine name"
              value={filters.name}
              onChange={(e) =>
                setFilters({ ...filters, name: e.target.value })
              }
              className="w-full px-5 py-3 rounded-full border border-[#C9A96A]/40 text-sm text-[#1A1A1A]"
            />
          </div>

          {/* TOGGLE */}
          <div className="text-center mb-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[#8B6E3B] underline"
            >
              {showAdvanced ? "Hide filters" : "Advanced filters"}
            </button>
          </div>

          {/* ADVANCED */}
          {showAdvanced && (
            <div className="space-y-3 mb-5">

              {/* COUNTRY */}
              <select
                value={filters.country}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    country: e.target.value,
                    region: "",
                    vintage: ""
                  })
                }
                className="w-full px-4 py-2.5 rounded-full border border-[#C9A96A]/40 text-sm text-[#1A1A1A]"
              >
                <option value="">All Countries</option>
                {countries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              {/* REGION */}
              <select
                value={filters.region}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    region: e.target.value,
                    vintage: ""
                  })
                }
                disabled={!filters.country}
                className="w-full px-4 py-2.5 rounded-full border border-[#C9A96A]/40 text-sm text-[#1A1A1A] disabled:opacity-40"
              >
                <option value="">
                  {filters.country ? "All Regions" : "Select country first"}
                </option>
                {regions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>

              {/* VINTAGE */}
              <select
                value={filters.vintage}
                onChange={(e) =>
                  setFilters({ ...filters, vintage: e.target.value })
                }
                disabled={!filters.region}
                className="w-full px-4 py-2.5 rounded-full border border-[#C9A96A]/40 text-sm text-[#1A1A1A] disabled:opacity-40"
              >
                <option value="">
                  {filters.region ? "All Vintages" : "Select region first"}
                </option>
                {vintages.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>

            </div>
          )}

          {/* ACTIONS */}
          <div className="flex gap-3 mt-4">

            <button
              onClick={handleReset}
              className="w-1/3 py-3 rounded-full text-xs border border-[#C9A96A]/50 text-[#8B6E3B]"
            >
              Reset
            </button>

            <button
              onClick={handleShowResults}
              className="w-2/3 py-3 rounded-full text-xs tracking-[0.35em] uppercase border border-[#C9A96A] text-[#C9A96A] hover:bg-[#C9A96A] hover:text-black transition"
            >
              Show selection
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}