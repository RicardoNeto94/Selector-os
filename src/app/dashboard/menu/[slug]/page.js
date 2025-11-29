// src/app/menu/[slug]/page.js

export const dynamic = "force-dynamic";

export default async function PublicMenuPage({ params }) {
  const { slug } = params;

  // For now, just a simple placeholder to confirm routing works.
  // We will later plug in the full Shang Shi allergen tool UI here.
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80">
          SELECTOROS • GUEST VIEW
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold">
          Public allergen menu for{" "}
          <span className="text-emerald-400">{slug}</span>
        </h1>
        <p className="text-sm text-slate-300/80">
          Routing is working. Next step: we plug in the full Shang Shi–style
          allergen tool here so guests can filter by allergens and categories
          in real time.
        </p>
      </div>
    </main>
  );
}
