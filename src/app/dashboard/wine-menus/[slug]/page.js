"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function VenueWineDashboard() {

  const params = useParams();
  const venue = params.slug;

  const pretty = (venue || "")
    .replace("-", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="page-fade space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">
          {pretty} Wine
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-6">

        <Link
          href={`/dashboard/wine-menus/${venue}/editor`}
          className="so-card hover:bg-slate-800/50 transition"
        >
          <h2 className="text-lg text-white font-semibold mb-2">
            Wine List Editor
          </h2>
          <p className="text-slate-400 text-sm">
            Build and organize the wine list.
          </p>
        </Link>

        <Link
          href={`/wine/${venue}`}
          className="so-card hover:bg-slate-800/50 transition"
        >
          <h2 className="text-lg text-white font-semibold mb-2">
            Guest View
          </h2>
          <p className="text-slate-400 text-sm">
            See the public wine list for guests.
          </p>
        </Link>

        <Link
          href={`/dashboard/wines`}
          className="so-card hover:bg-slate-800/50 transition"
        >
          <h2 className="text-lg text-white font-semibold mb-2">
            Cellar Inventory
          </h2>
          <p className="text-slate-400 text-sm">
            Manage bottle stock and transfers.
          </p>
        </Link>

      </div>

    </div>
  );
}