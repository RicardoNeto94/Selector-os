"use client";

import { useRouter } from "next/navigation";

export default function DefaultLanding({ slug, menu }) {

  const router = useRouter();

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white">

      {/* OPTIONAL LOGO */}
      {menu?.logo_url && (
        <img src={menu.logo_url} className="h-32 mb-10 opacity-80" />
      )}

      <div className="flex gap-8">

        <button
          onClick={() => router.push(`/menu/${slug}?type=food`)}
          className="text-white tracking-[0.3em]"
        >
          FOOD
        </button>

        <button
          onClick={() => router.push(`/menu/${slug}?type=drinks`)}
          className="text-white tracking-[0.3em]"
        >
          DRINKS
        </button>

      </div>

    </div>
  );
}