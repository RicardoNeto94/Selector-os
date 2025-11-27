export default function Sidebar({ active = "home" }) {
  const items = [
    { id: "home", icon: "🏠" },
    { id: "menu", icon: "📄" },
    { id: "users", icon: "👥" },
    { id: "clock", icon: "🕒" },
    { id: "calendar", icon: "📅" },
    { id: "settings", icon: "⚙️" },
  ];

  return (
    <aside className="sidebar-wall w-24 min-h-screen flex flex-col items-center py-12 space-y-8">
      {items.map((item) => (
        <button
          key={item.id}
          className={`
            sidebar-pill relative flex items-center justify-center
            ${active === item.id ? "active" : ""}
          `}
        >
          <span className="sidebar-icon text-2xl">{item.icon}</span>
        </button>
      ))}
    </aside>
  );
}
