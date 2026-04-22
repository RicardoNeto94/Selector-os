import GuestMenu from "@/components/GuestMenu";

export default async function PublicMenuPage({ params }) {
  const { slug } = await params;

  return <GuestMenu slug={slug} />;
}