import { SITE_ORIGIN } from "./publicSite.mjs";

export function publicMetadata(path, title, description) {
  const fullTitle = `${title} | Vaxeron`;
  return {
    title: { absolute: fullTitle }, description,
    alternates: { canonical: `${SITE_ORIGIN}${path === "/" ? "" : path}` },
    openGraph: { title: fullTitle, description, url: `${SITE_ORIGIN}${path}`, siteName: "Vaxeron", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Vaxeron — Wine & Hospitality. Quietly connected." }] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: ["/og.png"] },
  };
}
