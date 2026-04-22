"use client";

import { useEffect, useState } from "react";

export default function MenuClientView({ menu, categories, items }) {

  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("[data-category]");
      let current = null;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 120) {
          current = section.getAttribute("data-category");
        }
      });

      setActiveCategory(current);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const grouped = categories.map(cat => ({
    ...cat,
    items: items.filter(
      i => String(i.category_id) === String(cat.id)
    )
  }));

  return (
    <div
      className="min-h-screen px-6 py-16"
      style={{
        background: "#1a0505",
        color: "#f5f5f5"
      }}
    >
      <div className="max-w-[720px] mx-auto">

        {/* HEADER */}
        <div className="text-center mb-24">

          {menu.logo_url && (
            <div className="flex justify-center mb-6">
              <img
                src={menu.logo_url}
                className="h-20 scale-[3.5] origin-center opacity-90"
              />
            </div>
          )}

          <p className="tracking-[0.45em] text-xs opacity-60">
            FOOD & DRINKS
          </p>

        </div>

        {/* LIST */}
      <div className="space-y-28">

  {grouped.map(cat => (
    <div key={cat.id}>

      {/* ✅ CATEGORY TITLE */}
      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.5em] uppercase text-[#c9a96a]">
          {cat.name}
        </p>
        <div className="w-10 h-[1px] bg-[#c9a96a]/40 mx-auto mt-3"></div>
      </div>

      {/* ITEMS */}
      <div className="space-y-8">

        {cat.items.map(item => (
          <div
            key={item.id}
            className="flex justify-between border-b border-white/10 pb-6"
          >

            <div className="max-w-[75%]">
              <p className="text-[18px]">{item.name}</p>

              {item.description && (
                <p className="text-[13px] opacity-50 mt-2">
                  {item.description}
                </p>
              )}
            </div>

            <div className="text-[#c9a96a]">
              €{item.price}
            </div>

          </div>
        ))}

      </div>

    </div>
  ))}

</div>

      </div>
    </div>
  );
}