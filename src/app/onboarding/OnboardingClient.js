"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
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
  const supabase = createClientComponentClient();
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

  const selectedPlan = searchParams.get("plan") || "starter";

  useEffect(() => {
    if (existingRestaurant) {
      setRestaurant(existingRestaurant);
      setName(existingRestaurant.name || "");
      setLocation(existingRestaurant.location || "");
      setCuisine(existingRestaurant.cuisine || "");
    }
  }, [existingRestaurant]);

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

      // Prepare payload
      const payload = {
        name: name.trim(),
        location: location.trim() || null,
        cuisine: cuisine.trim() || null,
        slug: slugify(name),
        subscription_plan: selectedPlan, // so you can see what they chose
      };

      let upserted;

      if (restaurant) {
        const { data, error } = await supabase
          .from("restaurants")
          .update(payload)
          .eq("id", restaurant.id)
          .select("*")
          .maybeSingle();

        if (error) throw error;
        upserted = data;
      } else {
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

      setRestaurant(upserted);
      setStep(2);
    } catch (err) {
      console.error("Onboarding step 1 error", err);
      setError(err.message || "Failed to save restaurant.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish() {
    if (!restaurant) return;
    setError("");
    setFinishing(true);

    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          onboarding_complete: true,
          onboarding_completed: true,
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      router.push("/dashboard");
    } catch (err) {
      console.error("Onboarding finish error", err);
      setError(err.message || "Failed to finish onboarding.");
      setFinishing(false);
    }
  }

  // --- UI ---

  if (step === 1) {
    return (
      <div className="w-full max-w-xl">
        <div className="mb-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-200/80 mb-1">
            SelectorOS • Onboarding
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
            Let&apos;s set up your restaurant
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            We&apos;ll use this information to personalize your workspace.
          </p>
        </div>

        <form
          onSubmit={handleStepOneSubmit}
          className="rounded-3xl bg-slate-950/85 border border-slate-800/80 shadow-[0_24px_70px_rgba(0,0,0,0.8)] px-6 py-6 space-y-4"
        >
          {error && (
            <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs text-red-200 mb-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Restaurant name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Shang Shi"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Tallinn, Estonia"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Cuisine (optional)
            </label>
            <input
              type="text"
              value={cuisine}
              onChange={e => setCuisine(e.target.value)}
              placeholder="Cantonese, Japanese Omakase…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <p className="text-[11px] text-slate-400">
              Plan selected:{" "}
              <span className="font-semibold capitalize text-slate-100">
                {selectedPlan}
              </span>
            </p>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50 transition"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // STEP 2 – LOGO UPLOAD
  return (
    <div className="w-full max-w-xl">
      <div className="mb-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-200/80 mb-1">
          SelectorOS • Onboarding
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
          Add your logo
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          This logo appears on your public allergen page and staff dashboard.
        </p>
      </div>

      <div className="rounded-3xl bg-slate-950/85 border border-slate-800/80 shadow-[0_24px_70px_rgba(0,0,0,0.8)] px-6 py-6 space-y-5">
        {error && (
          <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs text-red-200 mb-2">
            {error}
          </div>
        )}

        <LogoUploader
          restaurantId={restaurant.id}
          initialLogoUrl={
            restaurant.theme_logo_url || restaurant.logo_url || ""
          }
        />

        <div className="flex items-center justify-between pt-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleFinish}
            disabled={finishing}
            className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50 transition"
          >
            {finishing ? "Finishing…" : "Finish & go to dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
