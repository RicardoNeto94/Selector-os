// src/app/layout.js
import "../styles/globals.css";
import "../styles/theme.css";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant menu & allergen cockpit",
  manifest: "/manifest.json",
  themeColor: "#020617"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
