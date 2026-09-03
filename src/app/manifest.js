export default function manifest() {

  // server-safe host detection
  const host =
    typeof headers !== "undefined"
      ? headers().get("host")
      : "";

  let name = "Vaxeron";
  let start_url = "/";
  let icons = [
    { src: "/vaxeron-icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/vaxeron-icon-512.png", sizes: "512x512", type: "image/png" },
  ];

  if (host?.includes("burman")) {
    name = "Burman Hotel";
    start_url = "/menu/burman-hotel";
    icons = [
      { src: "/burman-icon.png", sizes: "192x192", type: "image/png" },
      { src: "/burman-icon.png", sizes: "512x512", type: "image/png" },
    ];
  }

  if (host?.includes("foxden")) {
    name = "Fox Den";
    start_url = "/menu/foxden";
    icons = [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ];
  }

  return {
    name,
    short_name: name,
    start_url,
    display: "standalone",
    background_color: "#05070a",
    theme_color: "#05070a",
    icons,
  };
}
