"use client";

import ShangShiWineView from "@/components/menus/wine-views/ShangShiWineView";
import KoyoWineView from "@/components/menus/wine-views/KoyoWineView";

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

  /* =======================================================
     DEFAULT
  ======================================================= */

  return (
    <ShangShiWineView {...props} />
  );

}