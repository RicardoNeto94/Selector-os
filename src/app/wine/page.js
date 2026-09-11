import { publicMetadata } from "@/lib/site/metadata";
import ProductLanding from "@/components/public/ProductLanding";

export const metadata = publicMetadata("/wine", "Cellar operations & digital wine lists", "Connect wine catalogues, venue stock and branded digital wine lists in one considered workspace. Discover Vaxeron Wine for your team.");

export default function WineProductPage() {
  return <ProductLanding type="wine" />;
}
