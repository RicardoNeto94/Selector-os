"use client";

export const dynamic = "force-dynamic";

import SpaCategoryManager from "@/components/dashboard/SpaCategoryManager";

export default function SpaSelfCarePage() {
  return <SpaCategoryManager type="selfcare" title="Self Care" description="Curate wellness, skincare, bath rituals and retail products offered throughout the Burman Spa guest journey." singular="Self care category" basePath="/dashboard/spa/selfcare" />;
}
