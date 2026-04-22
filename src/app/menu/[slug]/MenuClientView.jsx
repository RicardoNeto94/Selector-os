"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MenuClientView({ menu, categories, items }) {
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const container = document.getElementById("app-scroll");
    if (!container) return;

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
      setScrolled(container.scrollTop > 10);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const grouped = categories.map((cat) => ({
    ...cat,
    items: items.filter((i) => String(i.category_id) === String(cat.id)),
  }));

  return (
    <div className="min-h-[100dvh] bg-[#2a0000] text-[#f5f5f5]">
      {/* BACK BUTTON */}
      <div className="fixed top-6 left-6 z-[60]">
        <button
          onClick={() => router.push(`/menu/${menu.public_slug}`)}
          className="text-[#c9a96a] text-[13px] tracking-[0.15em] opacity-70 hover:opacity-100 transition"
        >
          ← Back
        </button>
      </div>

      {/* HEADER */}
      <div
        className={`sticky top-0 z-50 border-b border-white/5 transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-2xl bg-[#2a0000]/90"
            : "backdrop-blur-md bg-[#2a0000]/70"
        }`}
      >
        <div className="max-w-[720px] mx-auto text-center py-6">
          {menu.logo_url && (
            <div
              className={`flex items-center justify-center overflow-visible transition-all duration-300 ${
                scrolled ? "h-20" : "h-28"
              }`}
            >
              <img
                src={menu.logo_url}
                className={`h-full object-contain opacity-95 transition-all duration-300 ${
                  scrolled ? "scale-[2.3]" : "scale-[3.0]"
                }`}
              />
            </div>
          )}

          <p className="tracking-[0.5em] text-[11px] opacity-50">
            FOOD (18:00 to 22:00)
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-6 pt-10 pb-28">
        <div className="max-w-[720px] mx-auto space-y-28">
          {grouped.map((cat) => (
            <div key={cat.id} data-category={cat.name}>
              {/* CATEGORY */}
              <div className="sticky top-[110px] z-40 bg-[#2a0000]/95 backdrop-blur-md py-4">
                <div className="text-center">
                  <p className="text-[11px] tracking-[0.55em] uppercase text-[#c9a96a]/90">
                    {cat.name}
                  </p>
                  <div className="w-10 h-[1px] bg-[#c9a96a]/40 mx-auto mt-3"></div>
                </div>
              </div>

              {/* ITEMS */}
              <div className="space-y-6 mt-6">
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between border-b border-white/10 pb-5"
                  >
                    <div className="max-w-[75%]">
                      <p className="text-[15px] font-light tracking-wide">
                        {item.name}
                      </p>

                      {item.description && (
                        <p className="text-[12px] opacity-40 mt-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="text-[#c9a96a] text-[14px] font-light tracking-wide">
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