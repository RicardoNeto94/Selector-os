export const metadata = {
  title: "Burman Hotel",
  description: "Luxury hospitality experience",

  manifest: "/manifest-burman.json",

  icons: {
    icon: "/burman-icon.png",
    apple: "/burman-icon.png",
  },
};

export default function BurmanLayout({ children }) {
  return children;
}