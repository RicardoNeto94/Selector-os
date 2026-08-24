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

  icons: {
    icon: "/favicon.ico",
    apple: "/burman-icon.png",
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
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="VAXERON" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/favicon.ico" />
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
