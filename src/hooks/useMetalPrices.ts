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
        if (!cancelled) {
          setPrices((prev) => ({
            ...prev,
            isLoading: false,
            error: "Could not fetch live prices. Using estimated rates.",
          }));
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
