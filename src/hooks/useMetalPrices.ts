import { useState, useEffect } from "react";

// 1 troy oz = 31.1035 grams
const TROY_OZ_TO_GRAMS = 31.1035;

// Approximate USD exchange rates (updated periodically as fallback)
const USD_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.5,
  SAR: 3.75,
  GBP: 0.79,
  EUR: 0.92,
};

export type MetalPrices = {
  goldPerGram: number;   // in USD
  silverPerGram: number; // in USD
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
  source: string;
};

export function useMetalPrices() {
  const [prices, setPrices] = useState<MetalPrices>({
    goldPerGram: 0,
    silverPerGram: 0,
    lastUpdated: null,
    isLoading: true,
    error: null,
    source: "",
  });

  useEffect(() => {
    let cancelled = false;

    const fetchPrices = async () => {
      try {
        // 1. Try Primary API: freegoldapi.com (provides Gold price per Ounce in USD)
        const res = await fetch("https://freegoldapi.com/data/latest.json");

        if (!res.ok) throw new Error(`Primary API HTTP ${res.status}`);

        const data = await res.json();

        // Get the latest record (last item in the array)
        const latest = data[data.length - 1];

        // Price is provided per Ounce in USD. Convert to per Gram.
        const goldPerGram = latest.price / TROY_OZ_TO_GRAMS;

        // Since freegoldapi.com only provides Gold, we fetch Silver from the secondary API
        // or calculate it using a standard Gold/Silver ratio (e.g., ~1/86) as a fallback.
        let silverPerGram = 0;
        try {
          const silverRes = await fetch("https://api.gold-api.com/price/XAG");
          if (silverRes.ok) {
            const silverData = await silverRes.json();
            silverPerGram = silverData.price / TROY_OZ_TO_GRAMS;
          } else {
            throw new Error("Secondary silver API failed");
          }
        } catch (silverErr) {
          console.warn("Falling back to computed silver ratio", silverErr);
          silverPerGram = goldPerGram / 86; // Approximate historical ratio
        }

        if (!cancelled) {
          setPrices({
            goldPerGram,
            silverPerGram,
            lastUpdated: new Date(latest.date), // Use date from the API
            isLoading: false,
            error: null,
            source: latest.source.includes("yahoo_finance") ? "Yahoo Finance (via FreeGoldAPI)" : "FreeGoldAPI",
          });
        }
      } catch (err) {
        console.warn("Primary API failed, trying secondary...", err);

        try {
          // 2. Try Secondary API: api.gold-api.com
          // We need separate calls for Gold (XAU) and Silver (XAG)
          const [goldRes, silverRes] = await Promise.all([
            fetch("https://api.gold-api.com/price/XAU"),
            fetch("https://api.gold-api.com/price/XAG")
          ]);

          if (!goldRes.ok || !silverRes.ok) throw new Error("Secondary API failed");

          const goldData = await goldRes.json();
          const silverData = await silverRes.json();

          const goldPerGram = goldData.price / TROY_OZ_TO_GRAMS;
          const silverPerGram = silverData.price / TROY_OZ_TO_GRAMS;

          if (!cancelled) {
            setPrices({
              goldPerGram,
              silverPerGram,
              lastUpdated: new Date(),
              isLoading: false,
              error: null, // Successfully fetched from secondary, so no error to show
              source: "api.gold-api.com",
            });
          }
        } catch (secErr) {
          console.error("Secondary API also failed, using fallback:", secErr);

          if (!cancelled) {
            // 3. Last Resort: Fallback to estimated rates
            // Rates as of Feb 19, 2026
            const FALLBACK_GOLD_OZ = 4980;
            const FALLBACK_SILVER_OZ = 78;

            setPrices({
              goldPerGram: FALLBACK_GOLD_OZ / TROY_OZ_TO_GRAMS,
              silverPerGram: FALLBACK_SILVER_OZ / TROY_OZ_TO_GRAMS,
              lastUpdated: new Date("2026-02-19T13:00:00"), // showing fallback date
              isLoading: false,
              error: "Live rates unavailable. Using estimated rates (Feb 2026).",
              source: "Estimated Rates",
            });
          }
        }
      }
    };

    fetchPrices();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Helper: convert USD/gram to a given currency
  const convertTo = (usdPerGram: number, currencyCode: string) => {
    const rate = USD_RATES[currencyCode] ?? 1;
    let converted = usdPerGram * rate;

    // Apply Indian market premium
    // The international spot price does not include India's Import Duty, AIDC, and GST, 
    // which together add ~18.7% to the landed retail price of gold and silver in India.
    if (currencyCode === "INR") {
      converted = converted * 1.1869;
    }

    return converted;
  };

  return { prices, convertTo };
}
