export async function generateMetadata({ params }) {
  const { slug } = await params;
  const isShangShi = slug === "shang-shi-wine";
  const isKoyo = slug === "koyo-wine";
  const applicationName = isShangShi
    ? "Shang Shi Wine"
    : isKoyo
      ? "Koyo Wine"
      : "Vaxeron Wine";
  const appleIcon = isShangShi
    ? "/shangshi-icon-192.png"
    : isKoyo
      ? "/koyo-icon-192.png"
      : "/favicon.ico";

  return {
    applicationName,
    manifest: `/wine/${slug}/manifest.webmanifest`,
    icons: {
      apple: appleIcon,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: applicationName,
    },
  };
}

export default function WineMenuLayout({ children }) {
  return children;
}
