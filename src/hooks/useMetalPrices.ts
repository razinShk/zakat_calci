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
};

export function useMetalPrices() {
  const [prices, setPrices] = useState<MetalPrices>({
    goldPerGram: 0,
    silverPerGram: 0,
    lastUpdated: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchPrices = async () => {
      try {
        // data-asg.goldprice.org provides free real-time spot prices
        const res = await fetch("https://data-asg.goldprice.org/dbXRates/USD", {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Response format: { items: [{ xauPrice: number, xagPrice: number, ... }] }
        const data = await res.json();
        const spot = data.items[0];

        // Prices come in USD per troy oz
        const goldPerGram = spot.xauPrice / TROY_OZ_TO_GRAMS;
        const silverPerGram = spot.xagPrice / TROY_OZ_TO_GRAMS;

        if (!cancelled) {
          setPrices({
            goldPerGram,
            silverPerGram,
            lastUpdated: new Date(),
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        console.error("Error fetching prices:", err);
        if (!cancelled) {
          // Fallback to estimated rates if API fails
          // Rates as of Feb 19, 2026: Gold ~$2500/oz (conservative estimate for fallback), Silver ~$30/oz
          // Actually using the values we saw earlier: Gold ~$4980/oz, Silver ~$77/oz
          const FALLBACK_GOLD_OZ = 4980;
          const FALLBACK_SILVER_OZ = 78;

          setPrices({
            goldPerGram: FALLBACK_GOLD_OZ / TROY_OZ_TO_GRAMS,
            silverPerGram: FALLBACK_SILVER_OZ / TROY_OZ_TO_GRAMS,
            lastUpdated: new Date(), // showing current time as "last checked"
            isLoading: false,
            error: "Live rates unavailable. Using estimated rates (Feb 2026).",
          });
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
    return usdPerGram * rate;
  };

  return { prices, convertTo };
}
