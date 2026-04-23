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
        <div className="mb-16">
          <img
            src={menu.logo_url}
            className="h-56 mx-auto opacity-90"
          />
        </div>
      )}

      {/* TITLE */}
      <p className="tracking-[0.5em] text-xs opacity-60 mb-12">
        SELECT MENU
      </p>

      {/* 🎰 POKER TABLE BUTTONS */}
      <div className="flex flex-col gap-10 items-center">

        {/* SNACKS TABLE */}
        <button
          onClick={() => handleNavigate("food")}
          className={`relative w-[280px] h-[140px] transition-all duration-300 ${
            loading === "food"
              ? "scale-95 opacity-70"
              : "hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(201,169,106,0.25)]"
          }`}
        >
          {/* WOOD RIM */}
          <div className="absolute inset-0 rounded-[999px] bg-[#3b1f0f] shadow-[inset_0_3px_10px_rgba(0,0,0,0.6)]"></div>

          {/* GOLD EDGE */}
          <div className="absolute inset-[6px] rounded-[999px] border border-[#c9a96a]"></div>

          {/* FELT */}
          <div className="absolute inset-[10px] rounded-[999px] bg-[radial-gradient(circle_at_30%_30%,#0f3d2e,#08241b)]"></div>

          {/* INNER TABLE LINE */}
          <div className="absolute inset-[22px] rounded-[999px] border border-white/10"></div>

          {/* TEXT */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[14px] tracking-[0.4em] text-[#c9a96a]">
              SNACKS
            </span>
          </div>
        </button>

        {/* DRINKS TABLE */}
        <button
          onClick={() => handleNavigate("drinks")}
          className={`relative w-[280px] h-[140px] transition-all duration-300 ${
            loading === "drinks"
              ? "scale-95 opacity-70"
              : "hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(201,169,106,0.25)]"
          }`}
        >
          {/* WOOD RIM */}
          <div className="absolute inset-0 rounded-[999px] bg-[#3b1f0f] shadow-[inset_0_3px_10px_rgba(0,0,0,0.6)]"></div>

          {/* GOLD EDGE */}
          <div className="absolute inset-[6px] rounded-[999px] border border-[#c9a96a]"></div>

          {/* FELT */}
          <div className="absolute inset-[10px] rounded-[999px] bg-[radial-gradient(circle_at_30%_30%,#0f3d2e,#08241b)]"></div>

          {/* INNER TABLE LINE */}
          <div className="absolute inset-[22px] rounded-[999px] border border-white/10"></div>

          {/* TEXT */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[14px] tracking-[0.4em] text-[#c9a96a]">
              DRINKS
            </span>
          </div>
        </button>

      </div>

    </div>
  );
}