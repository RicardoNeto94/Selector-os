// src/app/layout.js
import "./styles/globals.css";

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant menu & allergen cockpit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* IMPORTANT: no bg-* class here */}
      <body className="min-h-screen text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
