"use client";

import ShangShiWineView from "@/components/menus/wine-views/ShangShiWineView";
import KoyoWineView from "@/components/menus/wine-views/KoyoWineView";
import StandardWineView from "@/components/menus/wine-views/StandardWineView";

export default function WineClientView(props) {

  const { menu } = props;

  /* =======================================================
     KOYO
  ======================================================= */

  if(
    menu?.slug === "koyo-wine"
  ){

    return (
      <KoyoWineView {...props} />
    );

  }

  if (menu?.slug === "shang-shi-wine") {
    return <ShangShiWineView {...props} />;
  }

  return <StandardWineView {...props} />;

}
