import ProductLanding from "@/components/public/ProductLanding";

export const metadata = {
  title: "Vaxeron Hospitality | Thoughtful digital guest experiences",
  description: "Bring dining, room delicacies and wellness into a branded digital guest experience. Discover Vaxeron Hospitality for hotels and hospitality teams.",
  alternates: { canonical: "https://vaxeron.com/hospitality" },
};

export default function HospitalityProductPage() {
  return <ProductLanding type="hospitality" />;
}
