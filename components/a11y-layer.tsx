"use client";

import { useEffect } from "react";

export function A11yLayer() {
  useEffect(() => {
    // Basic accessibility enhancements executed post-hydration
    const enhanceAccessibility = () => {
      // 1. Highlight contrast issues visually across elements dynamically
      const styleElId = "a11y-contrast-styles";
      if (!document.getElementById(styleElId)) {
        const style = document.createElement("style");
        style.id = styleElId;
        style.textContent = `
          /* Additive High Contrast Overrides */
          :focus-visible {
            outline: 3px solid #ff9900 !important;
            outline-offset: 3px !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    // Delay initial run to allow React hydration to complete fully
    const timeoutId = setTimeout(() => {
      enhanceAccessibility();
    }, 100);

    // Re-run safely on dynamic nodes being added
    const observer = new MutationObserver((mutations) => {
      let isLayoutChanged = false;
      mutations.forEach(m => {
        if (m.addedNodes.length > 0) isLayoutChanged = true;
      });
      if (isLayoutChanged) {
        enhanceAccessibility();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
