import { publicMetadata } from "@/lib/site/metadata";
import ProductLanding from "@/components/public/ProductLanding";

export const metadata = publicMetadata("/hospitality", "Thoughtful digital guest experiences", "Bring dining, room delicacies and wellness into a branded digital guest experience. Discover Vaxeron Hospitality for hotels and hospitality teams.");

export default function HospitalityProductPage() {
  return <ProductLanding type="hospitality" />;
}
