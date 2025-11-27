import "../styles/globals.css";
import "../styles/theme.css";
import { Satoshi } from "next/font/google";

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant menu & allergen cockpit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          {/* SIDEBAR */}
          <aside className="sidebar">
            <a href="/dashboard" className="active">🏠</a>
            <a href="/dashboard/menu">📋</a>
            <a href="/dashboard/dishes">🍽️</a>
            <a href="/dashboard/allergen">⚠️</a>
            <a href="/dashboard/billing">💳</a>
            <a href="/dashboard/settings">⚙️</a>
          </aside>

          {/* MAIN AREA */}
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
