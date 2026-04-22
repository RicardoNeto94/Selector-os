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
        if (rect.top <= 160) {
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
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-[#2a0000]/80 border-b border-white/5">

        <div className="max-w-[720px] mx-auto text-center py-6">

          {menu.logo_url && (
           <div className="h-24 flex items-center justify-center overflow-visible">
  <img
    src={menu.logo_url}
    className="h-full scale-[3.0] object-contain opacity-95"
  />
</div>
          )}

          <p className="tracking-[0.45em] text-xs opacity-60">
            FOOD (18:00 to 22:00)
          </p>

        </div>

      </div>

      {/* CONTENT */}
      <div className="px-6 pt-12 pb-20">
        <div className="max-w-[720px] mx-auto space-y-24">

          {grouped.map(cat => (
            <div key={cat.id} data-category={cat.name}>

              {/* 🔥 STICKY CATEGORY */}
              <div className="sticky top-[120px] z-40 bg-[#2a0000]/90 backdrop-blur-md py-4">

                <div className="text-center">
                  <p className="text-xs tracking-[0.5em] uppercase text-[#c9a96a]">
                    {cat.name}
                  </p>
                  <div className="w-10 h-[1px] bg-[#c9a96a]/40 mx-auto mt-3"></div>
                </div>

              </div>

              {/* ITEMS */}
              <div className="space-y-8 mt-6">

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