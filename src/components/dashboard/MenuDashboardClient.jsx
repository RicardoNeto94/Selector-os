"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";
import { QRCodeSVG } from "qrcode.react";
import CreateMenuModal from "./CreateMenuModal";

export default function MenuDashboardClient({
  menus,
  restaurant,
  plan,
  maxMenus,
  isAtLimit,
}) {

  const [showModal, setShowModal] = useState(false);

  // ✅ HARD FIX → no hydration mismatch, no undefined
  const BASE_URL = "https://selector-os.vercel.app";

  return (
    <div className="so-main-inner space-y-8">

      {/* HEADER */}
      <div className="flex items-center justify-between">

        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            MENUS
          </p>

          <h1 className="text-2xl font-semibold text-white mt-1">
            {restaurant.name}
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            Plan: <strong>{plan}</strong>{" "}
            {typeof maxMenus === "number" && (
              <>({menus.length}/{maxMenus})</>
            )}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          disabled={isAtLimit}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium ${
            isAtLimit
              ? "bg-white/5 text-slate-500"
              : "bg-white text-black hover:opacity-90"
          }`}
        >
          <PlusIcon className="h-4 w-4" />
          New Menu
        </button>

      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {menus.length === 0 && (
          <div className="so-card p-6 text-slate-400">
            No menus yet.
          </div>
        )}

        {menus.map((m) => {

          const menuUrl = `${BASE_URL}/menu/${m.public_slug}`;

          return (
            <div
              key={m.id}
              className="so-card p-6 flex flex-col justify-between hover:shadow-xl transition"
            >

              {/* TOP */}
              <div className="flex justify-between items-start">

                <div>
                  <div className="text-lg font-semibold text-white">
                    {m.name}
                  </div>

                  <div className="text-xs text-slate-400 mt-1">
                    /menu/{m.public_slug}
                  </div>
                </div>

                <a
                  href={menuUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Open
                </a>

              </div>

              {/* QR */}
              <div className="flex justify-center py-6">

                <div
                  id={`qr-${m.id}`}
                  className="bg-white p-3 rounded-2xl"
                >
                  <QRCodeSVG value={menuUrl} size={120} />
                </div>

              </div>

              {/* ACTIONS */}
              <div className="flex justify-between items-center">

                {/* ✅ FIXED EDIT BUTTON */}
                <Link
                  href={`/dashboard/menu/${m.public_slug}`}
                  className="text-sm text-blue-400 hover:text-white"
                >
                  Edit Menu
                </Link>

                {/* DOWNLOAD */}
                <button
                  onClick={() => {

                    const svg = document
                      .getElementById(`qr-${m.id}`)
                      ?.querySelector("svg");

                    if (!svg) return;

                    const blob = new Blob([svg.outerHTML], {
                      type: "image/svg+xml",
                    });

                    const url = URL.createObjectURL(blob);

                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${m.name}-qr.svg`;
                    a.click();

                    URL.revokeObjectURL(url);

                  }}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Download QR
                </button>

              </div>

            </div>
          );
        })}

      </div>

      {/* MODAL */}
      <CreateMenuModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        restaurantId={restaurant.id}
      />

    </div>
  );
}