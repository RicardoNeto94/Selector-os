"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MenuClientView({ menu, categories, items }) {

  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {

          const scrollY = window.scrollY;

          setScrolled(prev => {
            const next = scrollY > 20;
            return prev !== next ? next : prev;
          });

          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
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
          className="text-[#c9a96a] text-[13px] tracking-[0.15em] opacity-70"
        >
          ← Back
        </button>
      </div>

      {/* HEADER */}
      <div
        className={`sticky top-0 z-50 transition-all duration-300 border-b border-[#c9a96a]/10 ${
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

      {/* CONTENT */}
      <div className="px-6 pt-10 pb-28">
        <div className="max-w-[720px] mx-auto space-y-20">

          {grouped.map(cat => (
            <div key={cat.id}>

              {/* CATEGORY TITLE */}
              <div className="py-3 mb-6 text-center">
                <p className="text-[13px] tracking-[0.6em] uppercase text-[#e6c27a]">
                  ♦ {cat.name} ♠
                </p>
                <div className="w-10 h-[1px] bg-[#c9a96a]/30 mx-auto mt-2"></div>
              </div>

              {/* ITEMS */}
              <div className="space-y-5">

                {cat.items.map(item => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center border-b border-white/10 pb-4"
                  >

                    <div className="max-w-[75%]">
                      <p className="text-[15px] font-light">
                        {item.name}
                      </p>

                      {item.description && (
                        <p className="text-[13px] text-[#b8b8b8] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* CHIP */}
                    <div className="relative w-12 h-12 flex items-center justify-center">

                      <div className="absolute inset-0 rounded-full border-2 border-[#c9a96a]/50"></div>

                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background:
                            "repeating-conic-gradient(#c9a96a 0deg 10deg, transparent 10deg 20deg)",
                          maskImage: "radial-gradient(circle, transparent 58%, black 60%)",
                          WebkitMaskImage: "radial-gradient(circle, transparent 58%, black 60%)",
                          opacity: 0.5
                        }}
                      />

                      <div className="absolute w-8 h-8 rounded-full border border-[#c9a96a]/30 bg-[#2a0000] flex items-center justify-center">
                        <span className="text-[#e6c27a] text-[13px] font-medium">
                          €{item.price}
                        </span>
                      </div>

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