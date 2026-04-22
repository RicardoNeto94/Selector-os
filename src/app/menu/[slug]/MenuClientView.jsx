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
        if (rect.top <= 140) {
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
    <div className="min-h-screen bg-[#2a0000] text-[#f5f5f5]">

      {/* 🔥 STICKY HEADER */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-[#2a0000]/70 border-b border-white/5">

        <div className="max-w-[720px] mx-auto text-center py-6">

          {menu.logo_url && (
            <img
              src={menu.logo_url}
              className="h-16 mx-auto mb-2 opacity-95"
            />
          )}

          <p className="tracking-[0.45em] text-xs opacity-60">
            FOOD & DRINKS
          </p>

        </div>

      </div>

      {/* 🔥 CONTENT */}
      <div className="px-6 pt-12 pb-20">
        <div className="max-w-[720px] mx-auto">

          {/* LIST */}
          <div className="space-y-24">

            {grouped.map(cat => (
              <div key={cat.id} data-category={cat.name}>

                {/* CATEGORY TITLE */}
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

    </div>
  );
}