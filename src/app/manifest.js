export default function manifest() {
  const host =
    typeof window !== "undefined"
      ? window.location.hostname
      : "";

  let name = "Vaxeron";
  let start_url = "/";
  let icon = "/icon.png";

  if (host.includes("burman")) {
    name = "Burman Hotel";
    start_url = "/menu/burman-hotel";
    icon = "/burman-icon.png";
  }

  if (host.includes("foxden")) {
    name = "Fox Den";
    start_url = "/menu/foxden";
    icon = "/foxden-icon.png";
  }

  return {
    name,
    short_name: name,
    start_url,
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
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