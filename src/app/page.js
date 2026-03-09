// src/app/page.js

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default async function HomePage() {

  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user already logged in → send them to dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Otherwise show landing page
  return (
    <main className="min-h-screen text-white">

      <section className="max-w-6xl mx-auto px-6 py-24 text-center">

        <h1 className="text-4xl md:text-6xl font-semibold mb-6">
          The operating system for restaurant menus
        </h1>

        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
          SelectorOS helps restaurants manage dishes, allergens, and menus
          from a single workspace — giving teams clarity and guests confidence.
        </p>

        <div className="flex justify-center gap-4">

          <a
            href="/sign-up"
            className="px-6 py-3 rounded-full bg-white text-black font-medium"
          >
            Start workspace
          </a>

          <a
            href="/sign-in"
            className="px-6 py-3 rounded-full border border-white/30"
          >
            Login
          </a>

        </div>

      </section>


      <section className="max-w-5xl mx-auto px-6 py-20 text-center">

        <h2 className="text-3xl font-semibold mb-6">
          Restaurants deserve better menu systems
        </h2>

        <p className="text-slate-400 text-lg leading-relaxed">
          Menu information often lives across spreadsheets, printed menus,
          kitchen notes, and staff memory. SelectorOS brings dishes,
          allergens, and menus into one structured system.
        </p>

      </section>

    </main>
  );
}
