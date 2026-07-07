"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MARKETPLACE_NAME } from "@/lib/constants";

export function SeoLayer() {
  const pathname = usePathname();

  useEffect(() => {
    // Dynamically update document properties based on page context
    const isHomePage = pathname === "/";
    const primaryHeading = document.querySelector("h1")?.textContent || MARKETPLACE_NAME;
    
    if (!isHomePage && primaryHeading) {
      document.title = `${primaryHeading} | ${MARKETPLACE_NAME}`;
    }

    // Read meta description, or set a dynamic one
    let metaDesc = document.querySelector("meta[name='description']");
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    
    const paragraphs = Array.from(document.querySelectorAll("p"));
    const mainDesc = paragraphs.find(p => p.textContent && p.textContent.length > 50)?.textContent;
    if (mainDesc) {
      metaDesc.setAttribute("content", mainDesc.trim());
    }

    // Inject JSON-LD
    let scriptTag = document.getElementById("seo-jsonld") as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = "seo-jsonld";
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }

    // Determine type (WebSite vs Product)
    const isProductPage = pathname?.includes("/products/");
    
    // Attempt basic scraping for product details to enrich LD structure
    let jsonLdStructure: any = {
      "@context": "https://schema.org",
      "@type": isProductPage ? "Product" : "WebSite",
      "name": document.title,
      "url": window.location.href,
    };

    if (isProductPage) {
      const priceText = document.body.textContent?.match(/\$[\d,]+\.\d{2}/)?.[0] 
        || document.body.textContent?.match(/\₹[\d,]+/)?.[0];
      
      jsonLdStructure.offers = {
        "@type": "Offer",
        "price": priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : undefined,
        "priceCurrency": priceText?.includes("₹") ? "INR" : "USD",
        "availability": "https://schema.org/InStock"
      };
      
      const img = document.querySelector("article img")?.getAttribute("src");
      if (img) jsonLdStructure.image = img;
    }

    scriptTag.textContent = JSON.stringify(jsonLdStructure);

    // Add OG tags
    const createOrUpdateOgTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    createOrUpdateOgTag("og:title", document.title);
    if (mainDesc) createOrUpdateOgTag("og:description", mainDesc.trim());
    createOrUpdateOgTag("og:url", window.location.href);
    createOrUpdateOgTag("og:type", isProductPage ? "product" : "website");

  }, [pathname]);

  return null;
}
