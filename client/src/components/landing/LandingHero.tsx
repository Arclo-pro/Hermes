import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export function LandingHero() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const normalizeUrl = (input: string): string => {
    let normalized = input.trim().toLowerCase();
    if (!normalized) return "";
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }
    return normalized;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl || !normalizedUrl.includes(".")) {
      setError("Please enter a valid website.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to start scan");
      }
      
      const data = await res.json();
      navigate(`/scan/preview/${data.scanId || data.id}`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <section className="px-5 md:px-6 pt-12 pb-8 md:pt-20 md:pb-16">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-950 tracking-tight mb-4 leading-tight">
          Get a complete SEO action plan — <span className="marketing-gradient-text">no setup required.</span>
        </h1>
        <p className="text-base md:text-lg text-slate-600 mb-6 max-w-lg mx-auto">
          See exactly what's holding your site back and what to fix first.
        </p>
        
        <p className="text-sm text-slate-500 mb-4">
          Built for people who don't want to think about SEO
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 max-w-xl mx-auto mb-3">
          <Input
            type="text"
            placeholder="Enter your website (example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-12 md:h-14 text-base flex-1"
            aria-label="Website URL"
            data-testid="input-url"
          />
          <button 
            type="submit" 
            className="h-12 md:h-14 px-8 text-base font-semibold rounded-xl bg-gradient-to-r from-violet-500 via-pink-500 to-amber-500 text-white shadow-[0_14px_30px_rgba(139,92,246,0.20)] hover:shadow-[0_18px_40px_rgba(236,72,153,0.22)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center whitespace-nowrap focus:outline-none focus:ring-4 focus:ring-violet-200"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
            disabled={loading}
            data-testid="button-scan"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning…
              </>
            ) : (
              "Get Free SEO Action Plan"
            )}
          </button>
        </form>
        
        {error && (
          <p className="text-sm text-red-600 mb-3" data-testid="text-error">{error}</p>
        )}
        
        <p className="text-sm text-slate-400">
          No logins • No integrations • Takes ~60 seconds
        </p>
      </div>
    </section>
  );
}
