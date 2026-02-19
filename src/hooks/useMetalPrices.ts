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
        // 1. Try Primary API: data-asg.goldprice.org
        const res = await fetch("https://data-asg.goldprice.org/dbXRates/USD", {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) throw new Error(`Primary API HTTP ${res.status}`);

        const data = await res.json();
        const spot = data.items[0];

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
    return usdPerGram * rate;
  };

  return { prices, convertTo };
}
