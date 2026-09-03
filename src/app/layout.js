import "../styles/globals.css";
import "../styles/theme.css";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

export const metadata = {
  metadataBase: new URL("https://vaxeron.com"),
  title: {
    default: "VAXERON — The operating system for modern hospitality",
    template: "%s | VAXERON",
  },
  description:
    "VAXERON unifies guest experience, wine programmes, inventory, and operational workflows into one connected platform for modern hospitality.",

  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    title: "VAXERON",
    statusBarStyle: "default",
  },

  icons: {
    icon: [
      { url: "/vaxeron-favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/vaxeron-icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/vaxeron-favicon.png",
    apple: "/vaxeron-icon-192.png",
  },

  openGraph: {
    title: "VAXERON — The operating system for modern hospitality",
    description:
      "VAXERON unifies guest experience, wine programmes, inventory, and operational workflows into one connected platform for modern hospitality.",
    url: "https://vaxeron.com",
    siteName: "VAXERON",
    images: [
      {
        url: "/vaxeron/hospitality-arrival.png",
        width: 1200,
        height: 630,
        alt: "VAXERON — operational infrastructure for modern hospitality",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "VAXERON — The operating system for modern hospitality",
    description:
      "VAXERON unifies guest experience, wine programmes, inventory, and operational workflows into one connected platform for modern hospitality.",
    images: ["/vaxeron/hospitality-arrival.png"],
  },
};

export const viewport = {
  themeColor: "#eae6e2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
      </head>

      <body>
        <div id="app-scroll" className="app-container">
          {children}
        </div>

        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
