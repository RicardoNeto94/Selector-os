export default function DashboardHome() {
  return (
    <div className="space-y-10">

      {/* Welcome Header */}
      <div className="card">
        <h1 className="text-4xl font-bold">
          Welcome back, <span className="accent">Chef</span>.
        </h1>
        <p className="text-soft mt-2">
          Manage menus, allergens & service flow more efficiently.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* Left card */}
        <div className="card h-[380px]">
          <h2 className="text-xl font-semibold mb-4 accent">Overview</h2>
          <p className="text-soft">Charts, stats, and usage coming here.</p>
        </div>

        {/* Right card */}
        <div className="card h-[380px]">
          <h2 className="text-xl font-semibold mb-4 accent">Recent Actions</h2>
          <p className="text-soft">Latest dishes, updates, and edits.</p>
        </div>

      </div>

    </div>
  );
}
