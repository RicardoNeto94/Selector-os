// src/app/layout.js
import "../styles/globals.css";
import "../styles/theme.css";
import "../styles/sidebar.css";

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant menu & allergen cockpit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Background comes from globals.css; no bg-* here */}
      <body className="min-h-screen text-slate-100 antialiased">
        {/* Fixed sidebar on the left */}
        <Sidebar />

        {/* Main content shifted to the right of the sidebar */}
        <main className="min-h-screen pl-20">
          {children}
        </main>
      </body>
    </html>
  );
}
