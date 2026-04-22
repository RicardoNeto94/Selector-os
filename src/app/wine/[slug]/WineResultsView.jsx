"use client";

import { useEffect, useState } from "react";

function getWine(item) {
  if (Array.isArray(item?.wines)) return item.wines[0] || {};
  return item?.wines || item || {};
}

function matches(value, filter) {
  if (!filter) return true;
  return String(value || "").toLowerCase().includes(filter.toLowerCase());
}

export default function WineResultsView({ menu, items, filters = {}, onBack }) {

  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("[data-category]");

      let current = null;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();

        if (rect.top <= 80) {
          current = section.getAttribute("data-category");
        }
      });

      setActiveCategory(current);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filtered = items.filter(item => {
    const w = getWine(item);

    return (
      matches(w.wine_type, filters.wine_type) &&
      matches(w.country, filters.country) &&
      matches(w.region, filters.region) &&
      matches(w.vintage, filters.vintage) &&
      matches(w.name, filters.name)
    );
  });

  const grouped = filtered.reduce((acc, item) => {
    const wine = getWine(item);
    const type = wine.wine_type || "Other";

    if (!acc[type]) acc[type] = [];
    acc[type].push(item);

    return acc;
  }, {});

  return (
    <div
      className="min-h-screen px-6 py-10"
      style={{
        background: "linear-gradient(180deg, #003223 0%, #001a12 100%)"
      }}
    >
      <div className="max-w-[720px] mx-auto">

        {/* HEADER */}
        <div className="text-center text-white mb-16">
          <img src="/shangshi-logo.png" className="h-20 mx-auto mb-5" />

          <p className="tracking-[0.35em] text-xs opacity-70">
            WINE SELECTION
          </p>
        </div>

        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-16 text-white">

          <div>
            <p className="text-[11px] tracking-[0.35em] uppercase text-[#c9a96a]">
              {menu?.name}
            </p>

            <p className="text-xs text-white/40 mt-1">
              {filtered.length} wines
            </p>
          </div>

          <button
            onClick={onBack}
            className="
              text-xs border border-[#c9a96a] text-[#c9a96a]
              px-4 py-2 rounded-full
              hover:bg-[#c9a96a] hover:text-black
              transition
            "
          >
            Back
          </button>

        </div>

        {/* LIST */}
        <div className="space-y-24">

          {Object.entries(grouped).map(([type, wines]) => {

            const isActive = activeCategory === type;

            // ✅ SORT BY PRICE (ascending)
            const sortedWines = [...wines].sort((a, b) => {
              const wa = getWine(a);
              const wb = getWine(b);

              return Number(wa.price || 0) - Number(wb.price || 0);
            });

            return (
              <div key={type} data-category={type}>

                {/* 🔥 SMART STICKY HEADER */}
                <div className="sticky top-0 z-30">

                  {/* FULL WIDTH GLASS */}
                  <div
                    className={`
                      absolute left-1/2 -translate-x-1/2 w-screen h-full
                      transition-all duration-500
                      ${isActive ? "opacity-100 backdrop-blur-xl" : "opacity-0"}
                    `}
                    style={{
                      background: "rgba(255,255,255,0.03)"
                    }}
                  />

                  {/* CONTENT */}
                  <div className={`
                    relative py-5 text-center
                    transition-all duration-500
                    ${isActive ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}
                  `}>

                    <p className={`
                      text-xs
                      tracking-[0.5em]
                      uppercase
                      text-[#c9a96a]
                      transition-all duration-500
                      ${isActive ? "scale-100" : "scale-95"}
                    `}>
                      {type}
                    </p>

                    <div className="w-10 h-[1px] bg-[#c9a96a]/40 mt-3 mx-auto"></div>

                  </div>

                </div>

                {/* WINES */}
                <div className="space-y-8 mt-8">

                  {sortedWines.map((item) => {
                    const w = getWine(item);

                    return (
                      <div
                        key={item.id}
                        className="
                          flex justify-between items-start
                          pb-6
                          border-b border-white/10
                          hover:border-white/30
                          transition
                        "
                      >
                        <div className="max-w-[75%]">

                          <p className="
                            text-[17px]
                            text-white
                            leading-snug
                            tracking-wide
                          ">
                            {w.name}
                          </p>

                          <p className="
                            text-[13px]
                            text-white/50
                            mt-2
                          ">
                            {w.producer} · {w.country} · {w.vintage}
                          </p>

                        </div>

                        <div className="
                          text-[#c9a96a]
                          text-[16px]
                          tracking-wide
                        ">
                          €{w.price}
                        </div>

                      </div>
                    );
                  })}

                </div>

              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
}