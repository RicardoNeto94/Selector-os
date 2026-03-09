import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default async function HomePage() {

  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged in users go straight to the app
  if (user) {
    redirect("/dashboard");
  }

  // Visitors see the landing page
  return (
    <main className="min-h-screen">

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">

        <h1 className="text-5xl font-semibold text-white">
          The operating system for restaurant menus
        </h1>

        <p className="text-slate-400 mt-4 text-lg max-w-2xl mx-auto">
          Manage dishes, allergens and menus from a single workspace.
          Built for modern restaurants.
        </p>

        <div className="flex justify-center gap-4 mt-8">

          <a
            href="/sign-up"
            className="px-6 py-3 rounded-full bg-white text-black font-medium"
          >
            Start workspace
          </a>

          <a
            href="/sign-in"
            className="px-6 py-3 rounded-full border border-white/30 text-white"
          >
            Login
          </a>

        </div>

      </section>


      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-4 gap-6">

        <div className="so-card">
          <h3 className="text-white font-semibold">Menu intelligence</h3>
          <p className="text-slate-400 text-sm mt-2">
            Structure menus, categories and dishes in one system.
          </p>
        </div>

        <div className="so-card">
          <h3 className="text-white font-semibold">Allergen control</h3>
          <p className="text-slate-400 text-sm mt-2">
            Track allergens at dish level for full clarity.
          </p>
        </div>

        <div className="so-card">
          <h3 className="text-white font-semibold">Guest safe view</h3>
          <p className="text-slate-400 text-sm mt-2">
            Show guests exactly what they can safely eat.
          </p>
        </div>

        <div className="so-card">
          <h3 className="text-white font-semibold">Inverted filtering</h3>
          <p className="text-slate-400 text-sm mt-2">
            Instantly see dishes that contain or avoid allergens.
          </p>
        </div>

      </section>

    </main>
  );
}
