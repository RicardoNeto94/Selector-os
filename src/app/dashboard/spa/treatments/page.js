"use client";

export const dynamic = "force-dynamic";

import SpaCategoryManager from "@/components/dashboard/SpaCategoryManager";

export default function SpaTreatmentsPage() {
  return <SpaCategoryManager type="treatments" title="Treatments" description="Organise massages, facials, rituals and signature wellness journeys presented through the guest iPad experience." singular="Treatment category" basePath="/dashboard/spa/treatments" />;
}
