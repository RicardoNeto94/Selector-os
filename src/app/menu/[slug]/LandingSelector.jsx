"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingSelector({ slug, menu }) {

  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [fadeOut, setFadeOut] = useState(false);

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
        height: "100dvh",
        overflow: "hidden",
      }}
    >

      {/* LOGO */}
      {menu?.logo_url && (
        <div className="mb-12">
          <img
            src={menu.logo_url}
            className="h-48 mx-auto opacity-90"
          />
        </div>
      )}

      {/* TITLE */}
      <p className="tracking-[0.5em] text-xs opacity-60 mb-10">
        SELECT MENU
      </p>

      {/* 🎰 TABLE BUTTONS */}
      <div className="flex gap-6 justify-center">

        {/* SNACKS */}
        <button
          onClick={() => handleNavigate("food")}
          className={`relative w-[160px] h-[80px] transition-all duration-200 ${
            loading === "food" ? "scale-95 opacity-70" : ""
          }`}
        >
          {/* WOOD */}
          <div className="absolute inset-0 rounded-[999px] bg-[#3b1f0f] shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]"></div>

          {/* GOLD */}
          <div className="absolute inset-[4px] rounded-[999px] border border-[#c9a96a]"></div>

          {/* FELT */}
          <div className="absolute inset-[7px] rounded-[999px] bg-[radial-gradient(circle_at_30%_30%,#0f3d2e,#08241b)]"></div>

          {/* INNER LINE */}
          <div className="absolute inset-[14px] rounded-[999px] border border-white/10"></div>

          {/* TEXT */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] tracking-[0.35em] text-[#c9a96a]">
              SNACKS
            </span>
          </div>
        </button>

        {/* DRINKS */}
        <button
          onClick={() => handleNavigate("drinks")}
          className={`relative w-[160px] h-[80px] transition-all duration-200 ${
            loading === "drinks" ? "scale-95 opacity-70" : ""
          }`}
        >
          {/* WOOD */}
          <div className="absolute inset-0 rounded-[999px] bg-[#3b1f0f] shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]"></div>

          {/* GOLD */}
          <div className="absolute inset-[4px] rounded-[999px] border border-[#c9a96a]"></div>

          {/* FELT */}
          <div className="absolute inset-[7px] rounded-[999px] bg-[radial-gradient(circle_at_30%_30%,#0f3d2e,#08241b)]"></div>

          {/* INNER LINE */}
          <div className="absolute inset-[14px] rounded-[999px] border border-white/10"></div>

          {/* TEXT */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] tracking-[0.35em] text-[#c9a96a]">
              DRINKS
            </span>
          </div>
        </button>

      </div>

    </div>
  );
}