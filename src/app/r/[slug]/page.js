import dynamic from "next/dynamic";

const GuestMenu = dynamic(
  () => import("../../components/GuestMenu"),
  { ssr: false }
);

export default function PublicMenuPage({ params }) {
  const { slug } = params;
  return <GuestMenu slug={slug} />;
}