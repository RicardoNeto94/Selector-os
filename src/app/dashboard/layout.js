import Sidebar from "../components/Sidebar";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen text-slate-100">
      {/* SIDEBAR */}
      <Sidebar />

      {/* RIGHT SIDE – HEADER + CONTENT */}
      <div className="flex-1 flex flex-col">
        {/* TOP HEADER – full width, no side margins */}
        <header className="border-b border-white/10 bg-gradient-to-r from-[#111827] to-[#020617]">
          <div className="px-6 py-4 flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-white/20 text-sm font-semibold">
                S
              </div>
              <div>
                <div className="text-sm font-semibold">SelectorOS</div>
                <div className="text-xs text-slate-400">
                  Service-ready allergen &amp; menu cockpit
                </div>
              </div>
            </div>

            {/* Active restaurant + live pill */}
            <div className="flex items-center gap-3 text-xs">
              <div className="text-right">
                <div className="uppercase tracking-[0.18em] text-slate-400 text-[10px]">
                  Active restaurant
                </div>
                <div className="text-sm font-semibold">My Restaurant</div>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1 border border-emerald-500/40 text-[11px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT WRAPPER */}
        <main className="flex-1 px-4 md:px-8 py-8">
          <div
            className="
              rounded-3xl border border-white/10
              bg-slate-950/70 backdrop-blur-2xl
              shadow-[0_32px_80px_rgba(0,0,0,0.75)]
              p-6 md:p-8
            "
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
