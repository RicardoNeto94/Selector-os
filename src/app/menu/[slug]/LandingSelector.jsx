"use client";

import { useRouter } from "next/navigation";

export default function LandingSelector({ slug, menu }) {

  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#2a0000] text-white">

      {/* LOGO */}
      {menu?.logo_url && (
        <div className="mb-12">
          <img
            src={menu.logo_url}
            className="h-24 mx-auto opacity-90"
          />
        </div>
      )}

      {/* TITLE */}
      <p className="tracking-[0.5em] text-xs opacity-60 mb-10">
        SELECT MENU
      </p>

      {/* OPTIONS */}
      <div className="flex gap-6">

        <button
          onClick={() => router.push(`/menu/${slug}?type=food`)}
          className="px-8 py-4 border border-white/20 rounded-xl hover:bg-white/10 transition"
        >
          FOOD
        </button>

        <button
          onClick={() => router.push(`/menu/${slug}?type=drinks`)}
          className="px-8 py-4 border border-white/20 rounded-xl hover:bg-white/10 transition"
        >
          DRINKS
        </button>

      </div>

    </div>
  );
}