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

      {/* TABLE BUTTONS */}
      <div className="flex gap-10">

        {/* FOOD */}
        <button
          onClick={() => handleNavigate("food")}
          className={`relative w-36 h-36 rounded-full transition-all duration-300 ${
            loading === "food"
              ? "scale-95 opacity-70"
              : "hover:scale-[1.05]"
          }`}
        >
          {/* GOLD RIM */}
          <div className="absolute inset-0 rounded-full border-[3px] border-[#c9a96a]/70 shadow-[0_0_20px_rgba(201,169,106,0.2)]"></div>

          {/* FELT SURFACE */}
          <div className="absolute inset-[6px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#0f3d2e,#08241b)] shadow-inner"></div>

          {/* LIGHT REFLECTION */}
          <div className="absolute inset-[6px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)]"></div>

          {/* TEXT */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[13px] tracking-[0.3em] text-[#c9a96a]">
              FOOD
            </span>
          </div>
        </button>

        {/* DRINKS */}
        <button
          onClick={() => handleNavigate("drinks")}
          className={`relative w-36 h-36 rounded-full transition-all duration-300 ${
            loading === "drinks"
              ? "scale-95 opacity-70"
              : "hover:scale-[1.05]"
          }`}
        >
          {/* GOLD RIM */}
          <div className="absolute inset-0 rounded-full border-[3px] border-[#c9a96a]/70 shadow-[0_0_20px_rgba(201,169,106,0.2)]"></div>

          {/* FELT SURFACE */}
          <div className="absolute inset-[6px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#0f3d2e,#08241b)] shadow-inner"></div>

          {/* LIGHT REFLECTION */}
          <div className="absolute inset-[6px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)]"></div>

          {/* TEXT */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[13px] tracking-[0.3em] text-[#c9a96a]">
              DRINKS
            </span>
          </div>
        </button>

      </div>

    </div>
  );
}