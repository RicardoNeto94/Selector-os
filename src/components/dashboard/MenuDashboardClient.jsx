"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import CreateMenuModal from "./CreateMenuModal";

export default function MenuDashboardClient({
  menus,
  restaurant,
  plan,
  maxMenus,
  isAtLimit,
}) {

  const [showModal, setShowModal] = useState(false);
  const supabase = createClient();

  const getDomainForMenu = (slug) => {
    if (slug.includes("burman")) return "https://burman.vaxeron.com";
    if (slug.includes("foxden")) return "https://foxden.vaxeron.com";
    return "https://selector-os.vercel.app";
  };

  const handleDeleteMenu = async (menuId) => {
    const confirmDelete = confirm("Delete this menu? This cannot be undone.");
    if (!confirmDelete) return;

    await supabase.from("menus").delete().eq("id", menuId);
    window.location.reload();
  };

  return (
    <div className="so-main-inner space-y-8">

      {/* HEADER */}
      <div className="flex items-center justify-between">

        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--so-text-muted)]">
            MENUS
          </p>

          <h1 className="text-2xl font-semibold mt-1">
            {restaurant.name}
          </h1>

          <p className="text-sm text-[var(--so-text-muted)] mt-1">
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
              ? "opacity-50 border border-[var(--so-border-subtle)]"
              : "button"
          }`}
        >
          <PlusIcon className="h-4 w-4" />
          New Menu
        </button>

      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {menus.length === 0 && (
          <div className="panel p-6 text-[var(--so-text-muted)]">
            No menus yet.
          </div>
        )}

        {menus.map((m) => {

          const menuUrl = getDomainForMenu(m.public_slug);

          return (
            <div
              key={m.id}
              className="panel p-6 flex flex-col justify-between transition hover:shadow-lg"
            >

              {/* TOP */}
              <div className="flex justify-between items-start">

                <div>
                  <div className="text-lg font-semibold">
                    {m.name}
                  </div>

                  <div className="text-xs text-[var(--so-text-muted)] mt-1">
                    /menu/{m.public_slug}
                  </div>
                </div>

                <a
                  href={`/menu/${m.public_slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[var(--so-text-muted)] hover:text-[var(--so-accent)]"
                >
                  Open
                </a>

              </div>

              {/* QR */}
              <div className="flex justify-center py-6">

                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG
                    value={menuUrl}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin={true}
                  />
                </div>

              </div>

              {/* ACTIONS */}
              <div className="flex justify-between items-center">

                <div className="flex gap-4 items-center">

                  <Link
                    href={`/dashboard/menu/${m.public_slug}`}
                    className="text-sm text-[var(--so-accent)]"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => handleDeleteMenu(m.id)}
                    className="text-sm text-red-500 flex items-center gap-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>

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
                  className="text-sm text-[var(--so-text-muted)] hover:text-[var(--so-accent)]"
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