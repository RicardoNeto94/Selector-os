import SpaTransition from "./SpaTransition";

export const metadata = {
  title: "Burman Spa",
  manifest: "/manifest-spa.json",
};

export default function SpaLayout({ children }) {

  return (
    <SpaTransition>
      {children}
    </SpaTransition>
  );

}