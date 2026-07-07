"use client";

import { Globe2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { pushMarketplaceToast } from "@/lib/client-toast";

const LANGUAGE_KEY = "rs_language";
const DATA_MODE_KEY = "rs_low_data";

export function AccountPreferences() {
  const [language, setLanguage] = useState("English");
  const [lowDataMode, setLowDataMode] = useState(false);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    const savedLowData = window.localStorage.getItem(DATA_MODE_KEY);

    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    if (savedLowData) {
      setLowDataMode(savedLowData === "true");
    }
  }, []);

  function updateLanguage(nextLanguage: string) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    pushMarketplaceToast({
      title: "Language preference saved",
      description: `${nextLanguage} is now your preferred marketplace language.`
    });
  }

  function updateLowData(nextValue: boolean) {
    setLowDataMode(nextValue);
    window.localStorage.setItem(DATA_MODE_KEY, String(nextValue));
    pushMarketplaceToast({
      title: nextValue ? "Low-data mode on" : "Low-data mode off",
      description: nextValue
        ? "Use lighter browsing when network conditions feel tight."
        : "Full visual browsing is active again."
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-royal">
          <Globe2 className="h-4 w-4" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em]">Language</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["English", "Hindi", "Marathi"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateLanguage(option)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                language === option
                  ? "bg-royal text-white"
                  : "border border-royal/15 bg-white text-royal"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 text-royal">
          <Zap className="h-4 w-4" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em]">Performance mode</p>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-[24px] bg-royal/5 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-royal">Low-data images</p>
            <p className="mt-1 text-sm text-slate-600">Use lighter browsing for slow networks.</p>
          </div>
          <button
            type="button"
            onClick={() => updateLowData(!lowDataMode)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              lowDataMode ? "bg-pine text-white" : "bg-white text-royal"
            }`}
          >
            {lowDataMode ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>
    </div>
  );
}
