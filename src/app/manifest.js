export default function manifest() {

  // server-safe host detection
  const host =
    typeof headers !== "undefined"
      ? headers().get("host")
      : "";

  let name = "Vaxeron";
  let start_url = "/";
  let icon = "/icon.png";

  if (host?.includes("burman")) {
    name = "Burman Hotel";
    start_url = "/menu/burman-hotel";
    icon = "/burman-icon.png";
  }

  if (host?.includes("foxden")) {
    name = "Fox Den";
    start_url = "/menu/foxden";
    icon = "/icon-512.png";
  }

  return {
    name,
    short_name: name,
    start_url,
    display: "standalone",
    background_color: "#05070a",
    theme_color: "#05070a",
    icons: [
      {
        src: icon,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: icon,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}