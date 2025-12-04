// src/app/onboarding/OnboardingClient.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OnboardingClient({ existingRestaurant }) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [name, setName] = useState(existingRestaurant?.name || "");
  const [slug, setSlug] = useState(existingRestaurant?.slug || "");
  const [location, setLocation] = useState(existingRestaurant?.location || "");
  const [cuisine, setCuisine] = useState(existingRestaurant?.cuisine || "");
  const [autoSlug, setAutoSlug] = useState(!existingRestaurant?.slug);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate slug from name when in "auto" mode
  useEffect(() => {
    if (autoSlug) {
      setSlug(slugify(name));
    }
  }, [name, autoSlug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your restaurant name.");
      return;
    }
    if (!slug.trim()) {
      setError("Please set a restaurant URL slug.");
      return;
    }

    try {
      setLoading(true);

      // 1) Get current user ID
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be signed in to complete onboarding.");
      }

      // 2) Build payload
      const payload = {
        owner_id: user.id,
        name: name.trim(),
        slug: slug.trim(),
        location: location.trim() || null,
        cuisine: cuisine.trim() || null,
        subscription_plan: existingRestaurant?.subscription_plan || "free",
        plan: existingRestaurant?.plan || "starter",
        onboarding_complete: true,
        onboarding_completed: true, // keep both flags in sync
      };

      // 3) Insert or update
      let query = supabase.from("restaurants");

      if (existingRestaurant?.id) {
        query = query.update(payload).eq("id", existingRestaurant.id);
      } else {
        query = query.insert(payload);
      }

      const { error: upsertError } = await query;

      if (upsertError) {
        console.error("Onboarding upsert error:", upsertError);
        throw new Error("Could not save your restaurant. Try again.");
      }

      // 4) Go to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Onboarding error:", err);
      setError(err.message || "Something went wrong while saving.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div className="relative overflow-hidden rounded-3xl bg-white/90 border border-slate-200 shadow-[0_32px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        {/* subtle gradient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-100/60 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-sky-100/60 blur-3xl" />
        </div>

        <div className="relative px-7 py-8 md:px-9 md:py-10">
          {/* Header */}
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-500/90 mb-2">
              SelectorOS • Onboarding
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              Let’s set up your restaurant.
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              These details power your live staff view and guest-facing tools.
              You can change them later in Settings.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Restaurant name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Restaurant name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-400"
                placeholder="e.g. Shang Shi"
              />
            </div>

            {/* Slug */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Workspace URL
                </label>
                <button
                  type="button"
                  className="text-[11px] text-slate-500 hover:text-slate-700"
                  onClick={() => setAutoSlug((prev) => !prev)}
                >
                  {autoSlug ? "Edit manually" : "Auto from name"}
                </button>
              </div>

              <div className="flex rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm shadow-[0_1px_0_rgba(255,255,255,0.7)] focus-within:ring-2 focus-within:ring-emerald-400/70 focus-within:border-emerald-400">
                <span className="text-slate-400 mr-1">
                  selector.ee/r/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setAutoSlug(false);
                  }}
                  className="flex-1 bg-transparent text-slate-900 focus:outline-none"
                  placeholder="shang-shi"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                This is what staff will use during service. Lowercase letters,
                numbers and dashes only.
              </p>
            </div>

            {/* Location & cuisine (inline on desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  City / location <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-400"
                  placeholder="Tallinn, Estonia"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Cuisine style <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-400"
                  placeholder="Cantonese fine dining"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400">
                You’ll be able to configure dishes, allergens and themes on the
                next screens.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 text-slate-50 px-6 py-2.5 text-sm font-semibold shadow-[0_14px_40px_rgba(15,23,42,0.35)] hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {loading ? "Saving…" : "Continue to dashboard"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
