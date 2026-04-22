"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingSelector({ slug, menu }) {

  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [fadeOut, setFadeOut] = useState(false); // 🔥 NEW

  const handleNavigate = (type) => {
    setLoading(type);
    setFadeOut(true);

    setTimeout(() => {
      router.push(`/menu/${slug}?type=${type}`);
    }, 280);
  };

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center bg-[#2a0000] text-white px-6 transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{
        minHeight: "100dvh",
        height: "100dvh",
        overflow: "hidden", // 🔥 prevents fake scrolling
      }}
    >

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