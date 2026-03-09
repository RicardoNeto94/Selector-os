export default function PricingPage() {
  return (
    <main className="so-main page-fade">

      <div className="so-main-inner mx-auto w-full max-w-[1200px] space-y-10">

        <section className="text-center">

          <h1 className="text-4xl font-semibold text-white">
            Simple pricing for modern restaurants
          </h1>

          <p className="text-slate-400 mt-3 text-lg max-w-xl mx-auto">
            SelectorOS helps restaurants manage menus and allergens from one
            structured workspace.
          </p>

        </section>


        <section className="grid md:grid-cols-3 gap-6">

          {/* STARTER */}

          <div className="so-card flex flex-col gap-6">

            <div>

              <h2 className="text-xl font-semibold text-white">
                Starter
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Perfect for small restaurants
              </p>

            </div>

            <div className="text-3xl font-semibold text-white">
              €19
              <span className="text-sm text-slate-400"> / month</span>
            </div>

            <ul className="text-sm text-slate-400 space-y-2">

              <li>• 1 restaurant workspace</li>
              <li>• Unlimited dishes</li>
              <li>• Allergen management</li>
              <li>• Guest allergen view</li>

            </ul>

            <a
              href="/sign-up"
              className="so-btn-primary mt-4 text-center"
            >
              Start workspace
            </a>

          </div>


          {/* STANDARD */}

          <div className="so-card flex flex-col gap-6 border border-emerald-400/30">

            <div>

              <h2 className="text-xl font-semibold text-white">
                Standard
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Ideal for busy restaurants
              </p>

            </div>

            <div className="text-3xl font-semibold text-white">
              €39
              <span className="text-sm text-slate-400"> / month</span>
            </div>

            <ul className="text-sm text-slate-400 space-y-2">

              <li>• Everything in Starter</li>
              <li>• Multiple menus</li>
              <li>• Advanced allergen filters</li>
              <li>• Staff dashboard</li>

            </ul>

            <a
              href="/sign-up"
              className="so-btn-primary mt-4 text-center"
            >
              Start workspace
            </a>

          </div>


          {/* PRO */}

          <div className="so-card flex flex-col gap-6">

            <div>

              <h2 className="text-xl font-semibold text-white">
                Pro
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                For multi-venue restaurants
              </p>

            </div>

            <div className="text-3xl font-semibold text-white">
              €79
              <span className="text-sm text-slate-400"> / month</span>
            </div>

            <ul className="text-sm text-slate-400 space-y-2">

              <li>• Everything in Standard</li>
              <li>• Multi-restaurant management</li>
              <li>• Team access</li>
              <li>• Priority support</li>

            </ul>

            <a
              href="/sign-up"
              className="so-btn-primary mt-4 text-center"
            >
              Start workspace
            </a>

          </div>

        </section>

      </div>

    </main>
  );
}
