// src/app/layout.js
import "./styles/globals.css";
import "./styles/theme.css";
import "./styles/sidebar.css";

import Sidebar from "./components/Sidebar";

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant menu & allergen cockpit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* No bg-* here, background comes from globals.css */}
      <body className="min-h-screen text-slate-100 antialiased">
        <Sidebar />
        <main className="min-h-screen pl-20">
          {/* 5rem left padding = 80px sidebar */}
          {children}
        </main>
      </body>
    </html>
  );
}
