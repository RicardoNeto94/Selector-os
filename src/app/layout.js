// src/app/layout.js
import "../styles/globals.css";
import "../styles/theme.css";

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant menu & allergen cockpit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
