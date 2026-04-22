"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingSelector({ slug, menu }) {

  const router = useRouter();
  const [loading, setLoading] = useState(null); // 🔥 track click

  const handleNavigate = (type) => {
    setLoading(type);
    setTimeout(() => {
      router.push(`/menu/${slug}?type=${type}`);
    }, 120); // small delay = smoother feel
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#2a0000] text-white px-6">

      {/* LOGO */}
      {menu?.logo_url && (
        <div className="mb-16">
          <img
            src={menu.logo_url}
            className="h-64 mx-auto opacity-90 transition-all duration-500"
          />
        </div>
      )}

      {/* TITLE */}
      <p className="tracking-[0.5em] text-xs opacity-60 mb-12">
        SELECT MENU
      </p>

      {/* OPTIONS */}
      <div className="flex gap-6">

        {/* FOOD */}
        <button
          onClick={() => handleNavigate("food")}
          className={`px-10 py-4 rounded-2xl border border-white/20 transition-all duration-300 ${
            loading === "food"
              ? "scale-95 opacity-70"
              : "hover:bg-white/10 hover:scale-[1.03]"
          }`}
        >
          FOOD
        </button>

        {/* DRINKS */}
        <button
          onClick={() => handleNavigate("drinks")}
          className={`px-10 py-4 rounded-2xl border border-white/20 transition-all duration-300 ${
            loading === "drinks"
              ? "scale-95 opacity-70"
              : "hover:bg-white/10 hover:scale-[1.03]"
          }`}
        >
          DRINKS
        </button>

      </div>

    </div>
  );
}