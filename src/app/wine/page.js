import ProductLanding from "@/components/public/ProductLanding";

export const metadata = {
  title: "Vaxeron Wine | Cellar operations & digital wine lists",
  description: "Connect wine catalogues, venue stock and branded digital wine lists in one considered workspace. Discover Vaxeron Wine for your team.",
  alternates: { canonical: "https://vaxeron.com/wine" },
};

export default function WineProductPage() {
  return <ProductLanding type="wine" />;
}
