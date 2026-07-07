"use client";

import { useEffect } from "react";
import { DynamicFilterLayer } from "@/components/dynamic-filter-layer";
import { ImageOptimizationLayer } from "@/components/image-optimization-layer";
import { AnalyticsLayer } from "@/components/analytics-layer";
import { SeoLayer } from "@/components/seo-layer";
import { A11yLayer } from "@/components/a11y-layer";
import { PwaLayer } from "@/components/pwa-layer";

export default function Template({ children }: { children: React.ReactNode }) {
  // A template is a boundary that remounts on every navigation in Next.js.
  // We use it as a purely additive global layer injector.
  return (
    <>
      {children}
      <DynamicFilterLayer />
      <ImageOptimizationLayer />
      <AnalyticsLayer />
      <SeoLayer />
      <A11yLayer />
      <PwaLayer />
    </>
  );
}
