"use client";

export const dynamic = "force-dynamic";

import SpaCategoryManager from "@/components/dashboard/SpaCategoryManager";

export default function SpaFoodAndBeveragePage() {
  return <SpaCategoryManager type="fnb" title="Food & Beverage" description="Structure waters, teas, juices, refreshments and light bites available through the spa guest experience." singular="Food & beverage category" basePath="/dashboard/spa/fnb" />;
}
