"use client";

import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import CreateMenuModal from "./CreateMenuModal";
import { QRCodeSVG } from "qrcode.react";

export default function MenuDashboardClient({
  menus,
  restaurant,
  plan,
  maxMenus,
  isAtLimit,
}) {

  const [showModal, setShowModal] = useState(false);

  return (
    <div className="page-fade">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <header className="flex items-center justify-between">

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-600">
              SELECTOROS • MENUS
            </p>

            <h1 className="mt-2 text-2xl font-semibold">
              Menus for{" "}
              <span className="text-emerald-600">
                {restaurant.name}
              </span>
            </h1>

            <p className="text-sm text-slate-600 mt-1">
              Plan: <strong>{plan}</strong>{" "}
              {typeof maxMenus === "number" && (
                <>({menus.length}/{maxMenus})</>
              )}
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            disabled={isAtLimit}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm
              ${
                isAtLimit
                  ? "bg-gray-200 text-gray-400"
                  : "bg-emerald-500 text-white hover:bg-emerald-600"
              }
            `}
          >
            <PlusIcon className="h-4 w-4" />
            Create Menu
          </button>

        </header>

        {/* MENU LIST */}
        <div className="so-card p-6">

          {menus.length === 0 ? (
            <p className="text-sm text-slate-600">
              No menus yet.
            </p>
          ) : (
            <div className="space-y-2">

              {menus.map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between items-center py-4 border-b"
                >

                  {/* LEFT */}
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-slate-500">
                      /menu/{m.public_slug}
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="flex items-center gap-6">

                    {/* OPEN */}
                    <a
                      href={`/menu/${m.public_slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 text-sm"
                    >
                      Open
                    </a>

                    {/* QR + DOWNLOAD */}
                    <div className="flex flex-col items-center gap-2">

                      <div id={`qr-${m.id}`} className="bg-white p-2 rounded">
  <QRCodeSVG
    value={`${process.env.NEXT_PUBLIC_APP_URL}/menu/${m.public_slug}`}
    size={70}
  />
</div>

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
                        className="text-xs text-slate-500 hover:text-black"
                      >
                        Download
                      </button>

                    </div>

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

        {/* CREATE MENU MODAL */}
        <CreateMenuModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          restaurantId={restaurant.id}
        />

      </div>
    </div>
  );
}