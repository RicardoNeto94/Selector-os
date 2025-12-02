// src/app/layout.js
import "../styles/globals.css";
import "../styles/theme.css";
import ServiceWorkerProvider from "./ServiceWorkerProvider";

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant menu & allergen cockpit",
  // Next.js will also expose this manifest for you
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Fallback link for non-Next-aware UAs */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#f4f4f0" />
      </head>
      <body>
        {/* Registers service worker on the client */}
        <ServiceWorkerProvider />
        {children}
      </body>
    </html>
  );
}
