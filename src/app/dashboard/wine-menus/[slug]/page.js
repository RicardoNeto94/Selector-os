import { redirect } from "next/navigation";

export default async function LegacyWineMenuPage({ params }) {
  const { slug } = await params;
  redirect(`/dashboard/wine-menus/${slug}/editor`);
}
