import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default async function HomePage() {

  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen text-white">

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">

        <h1 className="text-5xl font-semibold">
          The operating system for restaurant menus
        </h1>

        <p className="text-slate-400 mt-4 text-lg max-w-2xl mx-auto">
          SelectorOS helps restaurants manage dishes, allergens and menus
          from a single workspace.
        </p>

        <div className="flex justify-center gap-4 mt-8">

          <a
            href="/sign-up"
            className="px-6 py-3 rounded-full bg-white text-black font-medium"
          >
            Start Workspace
          </a>

          <a
            href="/sign-in"
            className="px-6 py-3 rounded-full border border-white/30"
          >
            Login
          </a>

        </div>

      </section>


      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-4 gap-6">

        <div className="so-card">
          <h3 className="text-white font-semibold">Menu Intelligence</h3>
          <p className="text-slate-400 text-sm mt-2">
            Structure menus, categories and dishes in one system.
          </p>
        </div>

        <div className="so-card">
          <h3 className="text-white font-semibold">Allergen Control</h3>
          <p className="text-slate-400 text-sm mt-2">
            Track allergens at dish level for complete clarity.
          </p>
        </div>

        <div className="so-card">
          <h3 className="text-white font-semibold">Guest Safe View</h3>
          <p className="text-slate-400 text-sm mt-2">
            Instantly show guests what they can safely eat.
          </p>
        </div>

        <div className="so-card">
          <h3 className="text-white font-semibold">Inverted Filtering</h3>
          <p className="text-slate-400 text-sm mt-2">
            Select an allergen and instantly see dishes that contain or avoid it.
          </p>
        </div>

      </section>


      {/* HOW IT WORKS */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">

        <h2 className="text-3xl font-semibold mb-10">
          How SelectorOS works
        </h2>

        <div className="grid md:grid-cols-3 gap-6 text-left">

          <div className="so-card">
            <h3 className="text-white font-semibold">Create workspace</h3>
            <p className="text-slate-400 text-sm mt-2">
              Set up your restaurant and menus.
            </p>
          </div>

          <div className="so-card">
            <h3 className="text-white font-semibold">Add dishes</h3>
            <p className="text-slate-400 text-sm mt-2">
              Define categories, prices and allergens.
            </p>
          </div>

          <div className="so-card">
            <h3 className="text-white font-semibold">Publish menu</h3>
            <p className="text-slate-400 text-sm mt-2">
              Give staff and guests instant clarity.
            </p>
          </div>

        </div>

      </section>


      {/* FINAL CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">

        <h2 className="text-3xl font-semibold">
          Start your SelectorOS workspace today
        </h2>

        <a
          href="/sign-up"
          className="inline-block mt-8 px-8 py-4 rounded-full bg-white text-black font-medium"
        >
          Create Workspace
        </a>

      </section>

    </main>
  );
}
