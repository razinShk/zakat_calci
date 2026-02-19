import { useState, useCallback } from "react";
import mosqueHero from "@/assets/mosque-hero.jpg";
import { useMetalPrices } from "@/hooks/useMetalPrices";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "SAR", symbol: "ر.س", name: "Saudi Riyal" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
];

// USD exchange rates (for Nisab calculation)
const USD_RATES: Record<string, number> = {
  USD: 1, INR: 83.5, SAR: 3.75, GBP: 0.79, EUR: 0.92,
};

// Nisab thresholds
const NISAB_GOLD_GRAMS = 87.48;
const NISAB_SILVER_GRAMS = 612.36;

type InputField = {
  key: string;
  label: string;
  sublabel: string;
};

const ASSET_FIELDS: InputField[] = [
  { key: "gold", label: "Gold & Silver", sublabel: "Value of gold/silver jewellery & coins" },
  { key: "cash", label: "Cash & Savings", sublabel: "Bank accounts, cash at home" },
  { key: "investments", label: "Investments & Shares", sublabel: "Stocks, mutual funds, crypto" },
  { key: "business", label: "Business Goods", sublabel: "Inventory & trade goods value" },
];

function formatAmount(val: number, symbol: string) {
  if (val === 0) return `${symbol}0`;
  return `${symbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const Index = () => {
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [assets, setAssets] = useState<Record<string, string>>({
    gold: "", cash: "", investments: "", business: "",
  });
  const [debts, setDebts] = useState("");
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorInputs, setCalculatorInputs] = useState({
    goldWeight: "",
    goldUnit: "g" as "g" | "tola",
    silverWeight: "",
    silverUnit: "g" as "g" | "tola",
  });

  const { prices, convertTo } = useMetalPrices();
  const currency = CURRENCIES.find((c) => c.code === currencyCode)!;
  const rate = USD_RATES[currencyCode] ?? 1;

  // Real-time Nisab from live spot prices (in selected currency)
  const goldPerGram = prices.isLoading || prices.goldPerGram === 0
    ? null
    : convertTo(prices.goldPerGram, currencyCode);
  const silverPerGram = prices.isLoading || prices.silverPerGram === 0
    ? null
    : convertTo(prices.silverPerGram, currencyCode);

  const nisabGold = goldPerGram ? NISAB_GOLD_GRAMS * goldPerGram : null;
  const nisabSilver = silverPerGram ? NISAB_SILVER_GRAMS * silverPerGram : null;
  // Use silver (lower/stricter threshold) when both available
  const nisabThreshold = nisabGold && nisabSilver ? Math.min(nisabGold, nisabSilver) : (nisabSilver ?? nisabGold);

  const handleAsset = useCallback((key: string, value: string) => {
    setAssets((prev) => ({ ...prev, [key]: value }));
  }, []);

  const totalAssets = ASSET_FIELDS.reduce(
    (sum, f) => sum + (parseFloat(assets[f.key]) || 0), 0
  );
  const totalDebts = parseFloat(debts) || 0;
  const netValue = Math.max(0, totalAssets - totalDebts);

  const isObligatory = nisabThreshold != null ? netValue >= nisabThreshold : false;
  const zakatDue = isObligatory ? netValue * 0.025 : 0;
  const hasAnyInput = totalAssets > 0 || totalDebts > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden">
        <img
          src={mosqueHero}
          alt="Islamic mosque arch with golden ornaments"
          className="w-full h-56 md:h-72 object-cover object-top opacity-80"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pb-4">
          <p className="text-accent text-sm tracking-[0.3em] uppercase font-medium mb-2 opacity-90">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <h1 className="gold-text text-3xl md:text-5xl font-bold tracking-wide">
            Zakat Calculator
          </h1>
          <p className="text-foreground/60 text-sm md:text-base mt-2 font-light">
            Calculate your annual Zakat with accuracy & clarity
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Live Prices Bar */}
        <div
          className="rounded-xl border border-navy-border px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2"
          style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${prices.isLoading ? "bg-yellow-400 animate-pulse" : prices.error ? "bg-red-400" : "bg-green-400"}`}
            />
            <span className="text-xs text-muted-foreground">
              {prices.isLoading ? "Fetching live rates…" : prices.error ? prices.error : "Live Spot Prices"}
            </span>
          </div>
          {goldPerGram != null && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs">
                <span className="text-muted-foreground">Gold/g: </span>
                <span className="text-accent font-semibold">{currency.symbol}{goldPerGram.toFixed(2)}</span>
              </span>
              {silverPerGram != null && (
                <span className="text-xs">
                  <span className="text-muted-foreground">Silver/g: </span>
                  <span className="text-accent font-semibold">{currency.symbol}{silverPerGram.toFixed(3)}</span>
                </span>
              )}
              {prices.lastUpdated && (
                <span className="text-xs text-muted-foreground/60">
                  Updated {prices.lastUpdated.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Currency Selector */}
        <div
          className="rounded-xl p-4 border border-navy-border flex items-center gap-4"
          style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
        >
          <span className="text-accent text-sm font-medium tracking-wide whitespace-nowrap">Currency</span>
          <div className="flex flex-wrap gap-2 flex-1">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCurrencyCode(c.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 ${currencyCode === c.code
                  ? "bg-accent text-accent-foreground shadow-md"
                  : "bg-navy-elevated text-muted-foreground hover:text-foreground hover:bg-navy-border"
                  }`}
              >
                {c.symbol} {c.code}
              </button>
            ))}
          </div>
        </div>

        {/* ASSETS SECTION */}
        <div
          className="rounded-2xl border border-navy-border overflow-hidden"
          style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="px-6 pt-5 pb-3">
            <div className="divider-ornament mb-1">
              <span className="text-accent text-xs tracking-[0.2em] uppercase font-semibold">
                ➕ Zakatable Assets
              </span>
            </div>
            <p className="text-muted-foreground text-xs text-center">
              Enter the current market value of each asset
            </p>
          </div>
          <div className="px-6 pb-6 space-y-3">
            {ASSET_FIELDS.map((field, i) => (
              <div key={field.key} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <label className="text-foreground/80 text-sm font-medium flex items-center gap-1.5 mb-1">
                  <span className="text-accent text-xs">✦</span>
                  {field.label}
                </label>
                <p className="text-muted-foreground text-xs mb-1.5">{field.sublabel}</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-accent font-semibold text-sm pointer-events-none">
                    {currency.symbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={assets[field.key]}
                    onChange={(e) => handleAsset(field.key, e.target.value)}
                    className="gold-input w-full rounded-lg py-2.5 pl-8 pr-4 text-sm"
                  />
                </div>

                {/* Gold/Silver Calculator */}
                {field.key === "gold" && (
                  <div className="mt-3 bg-navy-elevated/50 rounded-lg p-3 border border-navy-border/50">
                    <button
                      onClick={() => setCalculatorOpen(!calculatorOpen)}
                      className="text-xs text-accent flex items-center gap-1.5 hover:text-accent/80 transition-colors w-full"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 3H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zM5 19V5h14l.002 14H5z" /><path d="M7 7h10v2H7zm0 4h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zm-8 4h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
                      </svg>
                      {calculatorOpen ? "Hide Calculator" : "Calculate from Weight"}
                    </button>

                    {calculatorOpen && (
                      <div className="mt-3 space-y-3 animate-fade-in-up">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Gold Weight</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={calculatorInputs.goldWeight}
                                onChange={(e) => setCalculatorInputs(prev => ({ ...prev, goldWeight: e.target.value }))}
                                className="w-full bg-background border border-navy-border rounded px-2 py-1.5 text-xs"
                              />
                              <select
                                value={calculatorInputs.goldUnit}
                                onChange={(e) => setCalculatorInputs(prev => ({ ...prev, goldUnit: e.target.value as "g" | "tola" }))}
                                className="bg-background border border-navy-border rounded px-1 py-1.5 text-xs text-muted-foreground"
                              >
                                <option value="g">g</option>
                                <option value="tola">Tola</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Silver Weight</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={calculatorInputs.silverWeight}
                                onChange={(e) => setCalculatorInputs(prev => ({ ...prev, silverWeight: e.target.value }))}
                                className="w-full bg-background border border-navy-border rounded px-2 py-1.5 text-xs"
                              />
                              <select
                                value={calculatorInputs.silverUnit}
                                onChange={(e) => setCalculatorInputs(prev => ({ ...prev, silverUnit: e.target.value as "g" | "tola" }))}
                                className="bg-background border border-navy-border rounded px-1 py-1.5 text-xs text-muted-foreground"
                              >
                                <option value="g">g</option>
                                <option value="tola">Tola</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-navy-border/30">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Total: </span>
                            <span className="text-accent font-semibold">
                              {currency.symbol}{
                                formatAmount(
                                  ((parseFloat(calculatorInputs.goldWeight) || 0) * (calculatorInputs.goldUnit === 'tola' ? 11.664 : 1) * (goldPerGram || 0)) +
                                  ((parseFloat(calculatorInputs.silverWeight) || 0) * (calculatorInputs.silverUnit === 'tola' ? 11.664 : 1) * (silverPerGram || 0)),
                                  ""
                                )
                              }
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              const goldVal = ((parseFloat(calculatorInputs.goldWeight) || 0) * (calculatorInputs.goldUnit === 'tola' ? 11.664 : 1) * (goldPerGram || 0));
                              const silverVal = ((parseFloat(calculatorInputs.silverWeight) || 0) * (calculatorInputs.silverUnit === 'tola' ? 11.664 : 1) * (silverPerGram || 0));
                              handleAsset("gold", (goldVal + silverVal).toFixed(2));
                            }}
                            className="bg-accent/10 hover:bg-accent/20 text-accent text-xs px-3 py-1.5 rounded transition-colors"
                            disabled={!goldPerGram && !silverPerGram}
                          >
                            Apply
                          </button>
                        </div>
                        {(!goldPerGram && !silverPerGram) && (
                          <p className="text-[10px] text-red-400">Live prices unavailable. Cannot calculate.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {i < ASSET_FIELDS.length - 1 && (
                  <div className="mt-3 border-t border-navy-border/50" />
                )}
              </div>
            ))}

            {/* Total Assets Row */}
            <div
              className="mt-4 rounded-xl p-3 flex justify-between items-center border border-gold/20"
              style={{ background: "linear-gradient(135deg, hsl(42 82% 55% / 0.08), hsl(222 45% 8% / 0.5))" }}
            >
              <span className="text-sm font-semibold text-foreground">Total Assets</span>
              <span className="text-accent font-bold text-base">
                {formatAmount(totalAssets, currency.symbol)}
              </span>
            </div>
          </div>
        </div>

        {/* Minus divider */}
        <div className="flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-accent text-xl font-bold"
            style={{ background: "hsl(222 40% 10%)" }}
          >
            −
          </div>
        </div>

        {/* LIABILITIES SECTION */}
        <div
          className="rounded-2xl border border-navy-border overflow-hidden"
          style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="px-6 pt-5 pb-3">
            <div className="divider-ornament mb-1">
              <span className="text-accent text-xs tracking-[0.2em] uppercase font-semibold">
                ➖ Liabilities & Debts
              </span>
            </div>
          </div>
          <div className="px-6 pb-6">
            <label className="text-foreground/80 text-sm font-medium flex items-center gap-1.5 mb-1">
              <span className="text-accent text-xs">✦</span>
              Total Repayable Debts & Loans
            </label>
            <p className="text-muted-foreground text-xs mb-1.5">
              Only include debts due within the next year
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-accent font-semibold text-sm pointer-events-none">
                {currency.symbol}
              </span>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={debts}
                onChange={(e) => setDebts(e.target.value)}
                className="gold-input w-full rounded-lg py-2.5 pl-8 pr-4 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Equals divider */}
        <div className="flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-accent text-xl font-bold"
            style={{ background: "hsl(222 40% 10%)" }}
          >
            =
          </div>
        </div>

        {/* NET VALUE */}
        <div
          className="rounded-2xl border border-navy-border p-5"
          style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-widest mb-0.5">Net Zakatable Wealth</p>
              <p className="text-foreground/70 text-xs">Assets − Debts</p>
            </div>
            <span className="text-foreground font-bold text-xl">
              {formatAmount(netValue, currency.symbol)}
            </span>
          </div>
        </div>

        {/* NISAB CHECK */}
        {hasAnyInput && nisabThreshold != null && (
          <div
            className={`rounded-xl border px-5 py-4 flex items-start gap-3 animate-fade-in-up ${isObligatory
              ? "border-green-600/40 bg-green-950/30"
              : "border-yellow-600/40 bg-yellow-950/20"
              }`}
          >
            <span className="text-2xl mt-0.5">{isObligatory ? "✅" : "⚠️"}</span>
            <div>
              <p className={`font-semibold text-sm ${isObligatory ? "text-green-400" : "text-yellow-400"}`}>
                {isObligatory ? "Zakat is Obligatory on You" : "You have not yet reached Nisab"}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Nisab ({currency.code}): {formatAmount(nisabThreshold, currency.symbol)}
                {silverPerGram != null && (
                  <span className="block opacity-70 mt-0.5">
                    Silver nisab: {NISAB_SILVER_GRAMS}g × {currency.symbol}{silverPerGram.toFixed(3)}/g — live rate applied
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Nisab loading state */}
        {hasAnyInput && nisabThreshold == null && prices.isLoading && (
          <div className="rounded-xl border border-navy-border px-5 py-4 flex items-center gap-3 animate-fade-in-up"
            style={{ background: "var(--gradient-card)" }}>
            <span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-muted-foreground text-sm">Fetching live Nisab rates…</span>
          </div>
        )}

        {/* ZAKAT RESULT */}
        {hasAnyInput && isObligatory && (
          <div
            className="rounded-2xl border border-gold/40 p-6 text-center animate-pulse-gold animate-fade-in-up"
            style={{ background: "var(--gradient-result)", boxShadow: "var(--shadow-gold)" }}
          >
            <p className="text-accent/70 text-xs tracking-[0.25em] uppercase mb-1">Your Zakat Due</p>
            <p className="gold-text text-4xl md:text-5xl font-bold my-3">
              {formatAmount(zakatDue, currency.symbol)}
            </p>
            <p className="text-muted-foreground text-xs">2.5% of your net zakatable wealth</p>

            {/* Breakdown */}
            <div className="mt-5 space-y-2 text-sm border-t border-gold/20 pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Assets</span>
                <span className="text-foreground">{formatAmount(totalAssets, currency.symbol)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Debts</span>
                <span className="text-foreground">− {formatAmount(totalDebts, currency.symbol)}</span>
              </div>
              <div className="flex justify-between border-t border-gold/20 pt-2">
                <span className="text-foreground font-medium">Net Zakatable Wealth</span>
                <span className="text-foreground font-medium">{formatAmount(netValue, currency.symbol)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-accent font-semibold">Zakat (2.5%)</span>
                <span className="text-accent font-bold">{formatAmount(zakatDue, currency.symbol)}</span>
              </div>
            </div>
          </div>
        )}

        {/* No zakat message */}
        {hasAnyInput && !isObligatory && nisabThreshold != null && (
          <div
            className="rounded-2xl border border-navy-border p-6 text-center animate-fade-in-up"
            style={{ background: "var(--gradient-card)" }}
          >
            <p className="text-muted-foreground text-sm">
              Your net wealth is below Nisab. <span className="text-foreground">No Zakat is due</span> at this time.
            </p>
          </div>
        )}

        {/* FOOTER NOTE */}
        {/* CONTACT SECTION */}
        <div className="rounded-xl border border-gold/30 p-4 mb-6 text-center animate-fade-in-up"
          style={{ background: "linear-gradient(135deg, hsl(222 45% 10%), hsl(222 45% 15%))" }}>
          <p className="text-foreground/90 text-sm font-medium mb-3">
            For any query contact <span className="text-accent">Mufti Abdul Qadir</span>
          </p>
          <a
            href="https://wa.me/918268326055?text=Assalamualaikum,%20I%20have%20a%20query%20regarding%20Zakat"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-[#25D366]/20 group"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-8.67-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Chat on WhatsApp
          </a>
        </div>

        <div className="rounded-xl border border-navy-border p-6 text-center space-y-4" style={{ background: "hsl(var(--navy-card))" }}>
          <div className="divider-ornament mb-3">
            <span className="text-accent/60 text-xs tracking-widest uppercase">Islamic Reference</span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            <span className="text-accent/80">"Take from their wealth a charity by which you purify them and cause them increase."</span>
            <br />
            <span className="mt-1 block">— Surah At-Tawbah 9:103</span>
          </p>

          <div className="pt-4 mt-4 border-t border-navy-border/50">
            <p className="text-accent text-sm font-medium mb-2 font-arabic">دعاء میں یاد رکھنا</p>
            <p className="text-muted-foreground text-xs mb-3">(Remember me in your Dua)</p>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <a
                href="https://github.com/razinshaikh"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub Profile
              </a>
              <span className="text-navy-border">|</span>
              <a
                href="https://razinshaikh.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent fill-none stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                razinshaikh.xyz
              </a>
            </div>

            <p className="text-muted-foreground/40 text-[10px] mt-4">
              Spot prices sourced from {prices.source || "Loading..."} · Refreshed every 5 minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
