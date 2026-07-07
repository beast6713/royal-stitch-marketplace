"use client";

import { useEffect } from "react";

export function PwaLayer() {
  useEffect(() => {
    // Inject Manifest Link
    let manifestLink = document.querySelector("link[rel='manifest']");
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.setAttribute("rel", "manifest");
      manifestLink.setAttribute("href", "/manifest.json");
      document.head.appendChild(manifestLink);
    }
    
    // Inject Theme Color
    let themeColorInfo = document.querySelector("meta[name='theme-color']");
    if (!themeColorInfo) {
      themeColorInfo = document.createElement("meta");
      themeColorInfo.setAttribute("name", "theme-color");
      themeColorInfo.setAttribute("content", "#102542");
      document.head.appendChild(themeColorInfo);
    }

    // Register Service Worker purely additively
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("/service-worker.js").then(
          function (registration) {
            console.log("[PWA Layer] ServiceWorker registration successful with scope: ", registration.scope);
          },
          function (err) {
            console.log("[PWA Layer] ServiceWorker registration failed: ", err);
          }
        );
      });
    }
  }, []);

  return null;
}
