import Tool from "./Tool";

export default function PublicMenuPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Menu & Allergen Guide</h1>
      <p className="text-gray-600">Live restaurant-powered allergen filtering.</p>

      <Tool />
    </div>
  );
}
