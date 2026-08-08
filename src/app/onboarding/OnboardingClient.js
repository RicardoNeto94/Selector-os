// src/app/onboarding/OnboardingClient.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LogoUploader from "../dashboard/settings/LogoUploader";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OnboardingClient({ existingRestaurant }) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [restaurant, setRestaurant] = useState(existingRestaurant || null);

  const [name, setName] = useState(existingRestaurant?.name || "");
  const [location, setLocation] = useState(existingRestaurant?.location || "");
  const [cuisine, setCuisine] = useState(existingRestaurant?.cuisine || "");

  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");

  // Plan selection: prefer DB value, then URL, then fallback
  const planFromUrl = searchParams.get("plan");
  const selectedPlan =
    existingRestaurant?.subscription_plan ||
    existingRestaurant?.plan ||
    (planFromUrl === "starter" || planFromUrl === "pro"
      ? planFromUrl
      : "starter");

  // Keep state in sync if server sends updated restaurant
  useEffect(() => {
    if (existingRestaurant) {
      setRestaurant(existingRestaurant);
      setName(existingRestaurant.name || "");
      setLocation(existingRestaurant.location || "");
      setCuisine(existingRestaurant.cuisine || "");
    }
  }, [existingRestaurant]);

  // STEP 1: create / update restaurant
  async function handleStepOneSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Restaurant name is required.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Not authenticated.");
      }

      const payload = {
        name: name.trim(),
        location: location.trim() || null,
        cuisine: cuisine.trim() || null,
        slug: slugify(name),
        subscription_plan: selectedPlan,
        plan: selectedPlan, // keep both in sync for now
      };

      let upserted = null;

      if (restaurant?.id) {
        // Update existing restaurant
        const { data, error } = await supabase
          .from("restaurants")
          .update(payload)
          .eq("id", restaurant.id)
          .select("*")
          .maybeSingle();

        if (error) throw error;
        upserted = data;
      } else {
        // Create new restaurant
        const { data, error } = await supabase
          .from("restaurants")
          .insert({
            ...payload,
            owner_id: user.id,
          })
          .select("*")
          .maybeSingle();

        if (error) throw error;
        upserted = data;
      }

      if (!upserted || !upserted.id) {
        throw new Error("Restaurant could not be created. Please try again.");
      }

      setRestaurant(upserted);
      setStep(2);
    } catch (err) {
      console.error("Onboarding step 1 error", err);
      setError(err.message || "Failed to save restaurant.");
    } finally {
      setSaving(false);
    }
  }

  // STEP 2: mark onboarding as complete
 async function handleFinish() {
  if (!restaurant) return;

  setError("");
  setFinishing(true);

  try {
    // 1) does this restaurant already have any menus?
    const { data: existingMenus, error: fetchMenusError } = await supabase
      .from("menus")
      .select("id")
      .eq("restaurant_id", restaurant.id)   // <-- column name MUST match your table
      .limit(1);

    if (fetchMenusError) {
      console.error("Onboarding: fetch menus error", fetchMenusError);
      throw fetchMenusError;
    }

    // 2) if no menus, create a default one
    if (!existingMenus || existingMenus.length === 0) {
      const { error: insertMenuError } = await supabase
        .from("menus")
        .insert({
          restaurant_id: restaurant.id,
          name: "Main menu",
        });

      if (insertMenuError) {
        console.error("Onboarding: insert menu error", insertMenuError);
        throw insertMenuError;
      }
    }

    // 3) mark onboarding as complete
    const { error: updateRestaurantError } = await supabase
      .from("restaurants")
      .update({
        onboarding_complete: true,
        onboarding_completed: true,
      })
      .eq("id", restaurant.id);

    if (updateRestaurantError) {
      console.error("Onboarding: update restaurant error", updateRestaurantError);
      throw updateRestaurantError;
    }

    // 4) go to dashboard
    router.push("/dashboard");
  } catch (err) {
    console.error("Onboarding finish error", err);
    setError(err.message || "Failed to finish onboarding.");
    setFinishing(false);
  }
}


  // ================== RENDER ====================

  // STEP 1 – basic restaurant info
  if (step === 1) {
    return (
      <div className="w-full max-w-xl">
        <form onSubmit={handleStepOneSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/60 bg-red-50 px-4 py-2 text-xs text-red-700 mb-1">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Restaurant name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Shang Shi"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Tallinn, Estonia"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Cuisine (optional)
            </label>
            <input
              type="text"
              value={cuisine}
              onChange={e => setCuisine(e.target.value)}
              placeholder="Cantonese, Japanese Omakase…"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <p className="text-[11px] text-slate-500">
              Plan selected:{" "}
              <span className="font-semibold capitalize text-slate-900">
                {selectedPlan}
              </span>
            </p>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 transition"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // STEP 2 – safety net (no restaurant)
  if (!restaurant?.id) {
    return (
      <div className="w-full max-w-xl space-y-4">
        <div className="rounded-xl border border-red-500/60 bg-red-50 px-4 py-3 text-xs text-red-700">
          Something went wrong: no restaurant record was created. Please go back
          and save your restaurant details again.
        </div>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          ← Back to details
        </button>
      </div>
    );
  }

  // STEP 2 – logo upload
  return (
    <div className="w-full max-w-xl space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/60 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mb-1 text-sm text-slate-600">
        Add a logo for{" "}
        <span className="font-semibold text-slate-900">
          {restaurant.name}
        </span>
        . This will appear on your public guest view and staff tools.
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
        <LogoUploader
          restaurantId={restaurant.id}
          initialLogoUrl={
            restaurant.theme_logo_url || restaurant.logo_url || ""
          }
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={handleFinish}
          disabled={finishing}
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 transition"
        >
          {finishing ? "Finishing…" : "Finish & go to dashboard"}
        </button>
      </div>
    </div>
  );
}
