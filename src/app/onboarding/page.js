"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true); // new: to avoid flicker while we check

  // SLUGIFY FUNCTION
  const slugify = (str) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // 1) On mount, check if this user already has a restaurant.
  //    If yes → onboarding is skipped, go straight to dashboard.
  useEffect(() => {
    const run = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("User error during onboarding check:", userError);
          router.push("/sign-in");
          return;
        }

        const { data: existingRestaurant, error: restaurantError } =
          await supabase
            .from("restaurants")
            .select("id")
            .eq("owner_id", user.id)
            .maybeSingle();

        if (restaurantError) {
          console.error("Restaurant check error:", restaurantError);
          // if the check fails, we let them stay here rather than blocking
          return;
        }

        // If the user already has a restaurant, skip onboarding.
        if (existingRestaurant) {
          router.push("/dashboard");
          return;
        }
      } finally {
        setChecking(false);
      }
    };

    run();
  }, [router, supabase]);

  async function createRestaurant() {
    if (!name.trim()) return;

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User error:", userError);
        router.push("/sign-in");
        return;
      }

      const slug = slugify(name);

      const { data, error } = await supabase
        .from("restaurants")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          slug,
        })
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Create restaurant error:", error);
        throw error;
      }

      // Go straight to dashboard after onboarding
      router.push("/dashboard");
    } catch (err) {
      console.error("Onboarding error:", err);
      alert(err.message || "Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  }

  // While we are checking whether the user already has a restaurant,
  // show a subtle loading state instead of flickering the form.
  if (checking) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-20 text-slate-50">
        <p className="text-sm text-slate-300">
          Preparing your SelectorOS workspace…
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-20 bg-gradient-to-b from-[#232428] to-[#101114] text-slate-50">
      <h1 className="text-4xl font-bold mb-10 text-center">
        Welcome to Selector<span className="text-emerald-400">OS</span>
      </h1>

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/80 p-8 space-y-6 shadow-[0_24px_60px_rgba(0,0,0,0.75)]">
        <p className="text-sm text-slate-300">
          Let&apos;s start by creating your first restaurant. You can change its
          name later in Settings.
        </p>

        <label className="block text-left text-sm font-semibold text-slate-300">
          Restaurant name
        </label>

        <input
          type="text"
          placeholder="Ex: Koyo"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={createRestaurant}
          disabled={loading || name.trim().length < 2}
          className="w-full button disabled:opacity-40"
        >
          {loading ? "Creating…" : "Create & Continue"}
        </button>
      </div>
    </main>
  );
}
