"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CHANNEL = "burman_room_pwa";

function formatTimestamp(value) {
  if (!value) return "Never published";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Unknown";
  }
}

export default function PwaRefreshControl() {
  const supabase = createClient();

  const [version, setVersion] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    setError("");

    const { data, error: statusError } = await supabase
      .from("pwa_refresh_signals")
      .select("version, updated_at")
      .eq("channel", CHANNEL)
      .maybeSingle();

    if (statusError) {
      console.error("PWA REFRESH STATUS ERROR:", statusError);
      setError("Unable to load PWA status.");
      setLoading(false);
      return;
    }

    setVersion(data?.version ?? null);
    setUpdatedAt(data?.updated_at ?? null);
    setLoading(false);
  }

  async function publishRefresh() {
    if (publishing) return;

    setPublishing(true);
    setMessage("");
    setError("");

    const { data, error: publishError } = await supabase.rpc(
      "publish_pwa_refresh",
      {
        p_channel: CHANNEL,
      }
    );

    if (publishError) {
      console.error("PWA REFRESH PUBLISH ERROR:", publishError);
      setError(
        publishError.message ||
          "Unable to refresh the Burman room PWA."
      );
      setPublishing(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    setVersion(row?.version ?? null);
    setUpdatedAt(row?.updated_at ?? new Date().toISOString());
    setMessage("Refresh signal sent to all room iPads.");
    setPublishing(false);

    window.setTimeout(() => {
      setMessage("");
    }, 5000);
  }

  return (
    <section className="mt-7 rounded-[20px] border border-[#ded3c8] bg-[#fbf8f3] px-5 py-5 md:px-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">
            PWA Control
          </div>

          <h2 className="mt-2 text-[19px] tracking-[-0.03em] text-[#30241f] md:text-[22px]">
            Burman Room PWA
          </h2>

          <p className="mt-1 max-w-[660px] text-[9px] leading-[1.65] text-[#928278]">
            Send a live refresh signal to every open Burman room iPad.
            The app remains open in Guided Access while its live content
            refreshes.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[8px] text-[#9a897f]">
            <span>
              Status:{" "}
              <strong className="font-medium text-[#61785c]">
                {error ? "Unavailable" : "Ready"}
              </strong>
            </span>

            <span>
              Version:{" "}
              <strong className="font-medium text-[#55443b]">
                {loading ? "—" : version ?? "—"}
              </strong>
            </span>

            <span>
              Last published:{" "}
              <strong className="font-medium text-[#55443b]">
                {loading ? "Loading…" : formatTimestamp(updatedAt)}
              </strong>
            </span>
          </div>

          {message && (
            <div className="mt-3 text-[9px] text-[#61785c]">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-3 text-[9px] text-[#a34d3e]">
              {error}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={publishRefresh}
          disabled={publishing || loading}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#963d2d] px-6 text-[9px] uppercase tracking-[0.16em] text-white transition hover:bg-[#7f3327] disabled:cursor-wait disabled:opacity-50"
        >
          {publishing ? "Refreshing…" : "Refresh Room PWA"}
        </button>
      </div>
    </section>
  );
}