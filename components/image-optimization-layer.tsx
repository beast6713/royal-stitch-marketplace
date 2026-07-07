"use client";

import { useEffect } from "react";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";

export function ImageOptimizationLayer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // We scan all images dynamically loaded by Next.js and apply attributes
    const optimizeImages = () => {
      const images = document.querySelectorAll("img");
      
      images.forEach((img) => {
        // Next.js explicitly manages its own Image components (data-nimg). Touching them causes massive hydration crashes.
        if (img.hasAttribute("data-nimg") || img.getAttribute("src")?.includes("_next/image")) return;
        
        // Ensure lazy loading is applied (excluding small tracking images or icons)
        if (!img.getAttribute("loading") && img.width > 50) {
          img.setAttribute("loading", "lazy");
        }
        
        // Skip optimizing Next.js already-optimized _next/image paths 
        // Focus heavily on raw URLS, placeholders, or user-uploaded content
        const src = img.getAttribute("src");
        if (src && src.startsWith("http") && !src.includes("_next/image")) {
          const optimized = getOptimizedImageUrl(src, 800);
          if (src !== optimized) {
            img.src = optimized;
          }
        }
      });
    };

    // Run after hydration
    const timeoutId = setTimeout(() => {
      optimizeImages();
    }, 100);
    // Re-run periodically to catch dynamically appended nodes, or use a observer
    const observer = new MutationObserver((mutations) => {
      let isImgAdded = false;
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeName === "IMG") isImgAdded = true;
          if (node instanceof HTMLElement && node.querySelector("img")) isImgAdded = true;
        });
      });
      
      if (isImgAdded) {
        optimizeImages();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  // Return a null fragment since it works entirely on the DOM
  return null;
}
