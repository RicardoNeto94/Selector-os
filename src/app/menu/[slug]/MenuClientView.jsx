"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MenuClientView({ menu, categories, items }) {

  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    const container = document.getElementById("app-scroll");
    if (!container) return;

    const handleScroll = () => {

      setScrolled(container.scrollTop > 10);

      const sections = document.querySelectorAll("[data-section]");
      let current = null;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 140) {
          current = section.getAttribute("data-section");
        }
      });

      setActiveCategory(current);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const grouped = categories.map(cat => ({
    ...cat,
    items: items.filter(
      i => String(i.category_id) === String(cat.id)
    )
  }));

  return (
    <div className="bg-[#2a0000] text-[#f5f5f5]">

      {/* BACK */}
      <div className="fixed top-6 left-6 z-[60]">
        <button
          onClick={() => router.push(`/menu/${menu.public_slug}`)}
          className="text-[#c9a96a] text-[13px] tracking-[0.15em] opacity-70 hover:opacity-100"
        >
          ← Back
        </button>
      </div>

      {/* HEADER */}
      <div
        className={`sticky top-0 z-50 transition-all duration-300 border-b border-white/5 ${
          scrolled
            ? "bg-[#2a0000]/90 backdrop-blur-xl"
            : "bg-[#2a0000]/70 backdrop-blur-md"
        }`}
      >
        <div className="max-w-[720px] mx-auto text-center py-6">

          {menu.logo_url && (
            <div
              className={`flex justify-center transition-all duration-300 ${
                scrolled ? "h-20" : "h-28"
              }`}
            >
              <img
                src={menu.logo_url}
                className={`h-full object-contain transition-all duration-300 ${
                  scrolled ? "scale-[2.3]" : "scale-[3.0]"
                }`}
              />
            </div>
          )}

          <p className="text-[11px] tracking-[0.5em] opacity-50">
            FOOD (18:00 to 22:00)
          </p>

        </div>
      </div>

      {/* 🔥 GLOBAL CATEGORY BAR */}
      <div className="sticky top-[96px] z-40 bg-[#2a0000] py-3 border-b border-white/5">
        <div className="text-center">
          <p className="text-[11px] tracking-[0.6em] uppercase text-[#c9a96a]">
            ♦ {activeCategory || ""} ♠
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-6 pt-10 pb-28">
        <div className="max-w-[720px] mx-auto space-y-20">

          {grouped.map(cat => (
            <div key={cat.id} data-section={cat.name}>

              {/* SECTION TITLE */}
              <div className="text-center mb-6">
                <p className="text-[11px] tracking-[0.5em] uppercase text-[#c9a96a]/50">
                  {cat.name}
                </p>
              </div>

              {/* ITEMS */}
              <div className="space-y-5">

                {cat.items.map(item => (
                  <div
                    key={item.id}
                    className="flex justify-between border-b border-white/10 pb-4"
                  >

                    <div className="max-w-[75%]">
                      <p className="text-[15px] font-light">
                        {item.name}
                      </p>

                      {item.description && (
                        <p className="text-[12px] opacity-40 mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* 🔥 CHIP STYLE PRICE */}
                    <div className="text-[#c9a96a] text-[13px] px-3 py-1 rounded-full border border-[#c9a96a]/30">
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