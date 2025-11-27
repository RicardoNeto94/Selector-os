export default function Sidebar({ active = "" }) {
  const items = [
    { id: "dashboard", icon: "🏠", href: "/dashboard" },
    { id: "menu", icon: "📋", href: "/dashboard/menu" },
    { id: "dishes", icon: "🍽️", href: "/dashboard/dishes" },
    { id: "allergens", icon: "⚠️", href: "/dashboard/allergens" },
    { id: "billing", icon: "💳", href: "/dashboard/billing" },
    { id: "settings", icon: "⚙️", href: "/dashboard/settings" },
  ];

  return (
    <aside className="sidebar-wall w-24 min-h-screen flex flex-col items-center py-12 space-y-8">
      {items.map(item => (
        <a
          key={item.id}
          href={item.href}
          className={`sidebar-pill ${active === item.id ? "active" : ""}`}
        >
          <span className="sidebar-icon text-2xl">{item.icon}</span>
        </a>
      ))}
    </aside>
  );
}
