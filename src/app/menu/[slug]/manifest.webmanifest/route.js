export const dynamic = "force-static";

export async function GET(req, { params }) {

  const { slug } = await params;

  const manifests = {

    "burman-hotel": {
      name: "Burman Hotel",
      short_name: "Burman",
      theme: "#f3f0ed",
      background: "#f3f0ed",
      icon: "/burman-icon.png"
    },

    "foxden": {
      name: "Fox Den",
      short_name: "Fox Den",
      theme: "#111111",
      background: "#111111",
      icon: "/icon-512.png"
    }

  };

  const app = manifests[slug] || {
    name: "Vaxeron",
    short_name: "Vaxeron",
    theme: "#ffffff",
    background: "#ffffff",
    icon: "/selectoros-logo.png"
  };

  return new Response(
    JSON.stringify({
      name: app.name,
      short_name: app.short_name,
      description: app.name,

      start_url: `/menu/${slug}`,

      display: "standalone",
      orientation: "portrait",

      background_color: app.background,
      theme_color: app.theme,

      icons: [
        {
          src: app.icon,
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: app.icon,
          sizes: "512x512",
          type: "image/png"
        }
      ]
    }),
    {
      headers: {
        "Content-Type": "application/manifest+json"
      }
    }
  );
}