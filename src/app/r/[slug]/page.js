import GuestMenu from "../../components/GuestMenu";

export const dynamic = "force-dynamic";

export default function PublicMenuPage({ params }) {
  const { slug } = params;

  return <GuestMenu slug={slug} />;
}
