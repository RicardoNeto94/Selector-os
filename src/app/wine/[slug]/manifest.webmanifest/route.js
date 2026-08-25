import { NextResponse } from "next/server";

const MENU_IDENTITIES = {
  "shang-shi-wine": {
    name: "Shang Shi Wine",
    shortName: "Shang Shi",
    themeColor: "#001a12",
    backgroundColor: "#00140e",
    icons: [
      { src: "/shangshi-icon-192.png", sizes: "192x192" },
      { src: "/shangshi-icon-512.png", sizes: "512x512" },
    ],
  },
  "koyo-wine": {
    name: "Koyo Wine",
    shortName: "Koyo",
    themeColor: "#17120e",
    backgroundColor: "#17120e",
    icons: [
      { src: "/koyo-icon-192.png", sizes: "192x192" },
      { src: "/koyo-icon-512.png", sizes: "512x512" },
    ],
  },
};

export async function GET(_request, { params }) {
  const { slug } = await params;
  const identity = MENU_IDENTITIES[slug] || {
    name: "Vaxeron Wine",
    shortName: "Vaxeron Wine",
    themeColor: "#001a12",
    backgroundColor: "#00140e",
    icons: [{ src: "/burman-icon.png", sizes: "2991x2991" }],
  };

  return NextResponse.json(
    {
      id: `/wine/${slug}`,
      name: identity.name,
      short_name: identity.shortName,
      description: "A live, venue-specific wine experience powered by Vaxeron.",
      start_url: `/wine/${slug}`,
      scope: `/wine/${slug}`,
      display: "standalone",
      orientation: "any",
      background_color: identity.backgroundColor,
      theme_color: identity.themeColor,
      icons: identity.icons.map((icon) => ({
          src: icon.src,
          sizes: icon.sizes,
          type: "image/png",
          purpose: "any",
        })),
    },
    {
      headers: {
        "content-type": "application/manifest+json",
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}
