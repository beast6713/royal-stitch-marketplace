"use client";

import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";

export function DynamicFilterLayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Parse the DOM to find categories based on articles elements
  useEffect(() => {
    const scanDomForCategories = () => {
      const articles = document.querySelectorAll("article");
      const foundCategories = new Set<string>();
      
      articles.forEach((article) => {
        // Find category text from our known DOM structure (e.g., text-[11px] font-semibold uppercase)
        // A generic approach: look for elements that might represent category tags.
        // The project uses `product.category` inside a specific styling.
        const categoryElement = article.querySelector("p.uppercase.tracking-\\[0\\.22em\\]");
        if (categoryElement && categoryElement.textContent) {
          foundCategories.add(categoryElement.textContent.trim());
        }
      });
      
      if (foundCategories.size > 0) {
        setCategories(Array.from(foundCategories));
      }
    };

    // Run on initial load and setup a mutation observer to catch dynamically loaded products
    scanDomForCategories();
    
    const observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldRescan = true;
          break;
        }
      }
      if (shouldRescan) {
        scanDomForCategories();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isOpen]);

  // Apply visual filtering by toggling DOM visibility
  useEffect(() => {
    const articles = document.querySelectorAll("article");
    
    articles.forEach((article) => {
      const parent = article.parentElement; // the wrapper that handles column width
      
      if (!activeCategory) {
        if (parent) parent.style.display = "";
        article.style.display = "";
        return;
      }

      const categoryElement = article.querySelector("p.uppercase.tracking-\\[0\\.22em\\]");
      const currentCategory = categoryElement?.textContent?.trim() || "";
      
      if (currentCategory.toLowerCase() === activeCategory.toLowerCase()) {
        if (parent) parent.style.display = "";
        article.style.display = "";
      } else {
        if (parent) parent.style.display = "none";
        article.style.display = "none";
      }
    });
  }, [activeCategory]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-royal shadow-lg transition hover:scale-105 active:scale-95 sm:bottom-8 lg:bottom-12"
        aria-label="Filter products"
      >
        <Filter className="h-6 w-6 text-white" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-royal/40 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-sm bg-white p-6 shadow-2xl h-full overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-royal">Filters</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-gray-100 p-2 text-royal transition hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-8">
              <h3 className="text-lg font-medium text-royal">Category</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        activeCategory === category
                          ? "bg-royal text-white"
                          : "bg-gray-100 text-slate-700 hover:bg-gray-200"
                      }`}
                    >
                      {category}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No categories found on this page.</p>
                )}
              </div>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-6">
              <button
                onClick={() => setActiveCategory(null)}
                className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-royal transition hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
