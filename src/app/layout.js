import "../styles/globals.css";
import "../styles/theme.css";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

export const metadata = {
  title: "Vexaron Systems",
  description: "Powerfull hospitality system.",

  icons: {
    icon: "/favicon.ico",
    apple: "/burman-icon.png",
  },
};

export function generateViewport({ params }) {

  const slug = params?.slug || "";

  if (slug.includes("burman")) {
    return { themeColor: "#eae6e2" };
  }

  if (slug.includes("foxden")) {
    return { themeColor: "#07090c" };
  }

  return { themeColor: "#eae6e2" };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="SelectorOS" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/favicon.ico" />
      </head>

      {/* 🔥 FIXED: removed hardcoded background */}
      <body>
        <div id="app-scroll" className="app-container">
          {children}
        </div>

        <ServiceWorkerRegister />
      </body>
    </html>
  );
}