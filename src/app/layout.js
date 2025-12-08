// src/app/layout.js
import "../styles/globals.css";
import "../styles/theme.css";

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant menu & allergen cockpit",
  manifest: "/manifest.json",
  themeColor: "#020617",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};
}
