import { useState } from "react";
import { useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Search, Wrench, Rocket, CheckCircle2, X, Zap, Target, Users, Building2, ShoppingCart, Briefcase } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { buildRoute } from "@shared/routes";

export default function Landing() {
  const [url, setUrl] = useState("");
  const [, navigate] = useLocation();

  const scanMutation = useMutation({
    mutationFn: async (targetUrl: string) => {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to start scan");
      }
      return res.json();
    },
    onSuccess: (data) => {
      navigate(buildRoute.scanPreview(data.scanId));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter a website URL");
      return;
    }
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    scanMutation.mutate(normalizedUrl);
  };

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 md:px-6 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground" data-testid="text-hero-headline">
              SEO, Automated — From Diagnosis to Deployment
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-subheadline">
              Arclo turns proven, real-world SEO workflows into automation — finding issues, prioritizing fixes, and pushing changes so you can focus on your business.
            </p>
            
            <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <Input
                type="text"
                placeholder="Enter your website URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 h-12 text-base"
                data-testid="input-url"
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-12 px-8"
                disabled={scanMutation.isPending}
                data-testid="button-scan"
              >
                {scanMutation.isPending ? (
                  "Scanning..."
                ) : (
                  <>
                    Run Free SEO Scan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
            
            <p className="text-sm text-muted-foreground" data-testid="text-microcopy">
              No credit card. No contracts. No agencies.
            </p>
          </div>
        </div>
      </section>

      {/* Story Block */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">
              Why Arclo Exists
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Arclo was built after replacing multiple SEO firms for a real psychiatry clinic. We spent months watching agencies charge thousands for PDF reports that sat in inboxes. We saw "SEO tools" that surfaced problems but never fixed them. So we built Arclo: an SEO operations platform that doesn't just diagnose issues—it deploys fixes automatically, so you can stop managing SEO and start running your business.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">1. Diagnose</h3>
                <p className="text-muted-foreground">
                  Arclo scans your site for technical issues, content gaps, and ranking opportunities using the same checks real SEO experts run.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">2. Decide</h3>
                <p className="text-muted-foreground">
                  Issues are automatically prioritized by impact and effort. You see what matters most, not a 200-page audit you'll never read.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Rocket className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">3. Deploy</h3>
                <p className="text-muted-foreground">
                  One click deploys fixes directly to your site. No developer tickets. No waiting weeks. Just results.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-center text-xl font-semibold text-foreground">
            Most SEO tools stop at reports. Arclo doesn't.
          </p>
        </div>
      </section>

      {/* Differentiation */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-card border-border/50">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-foreground mb-6">Arclo vs Agencies</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">No retainers or long contracts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">No waiting weeks for reports</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">No mysterious "proprietary methods"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Instant diagnosis + deployment</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border/50">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-foreground mb-6">Arclo vs SEO Tools</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">No 200-page PDFs to interpret</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">No developer handoffs required</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">No separate implementation phase</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Fixes deploy automatically</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-primary/30 border-2">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-primary mb-6">What You Get</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0 mt-0.5" />
                    <span className="text-foreground">Real-time site monitoring</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0 mt-0.5" />
                    <span className="text-foreground">Prioritized, actionable fixes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0 mt-0.5" />
                    <span className="text-foreground">One-click deployment</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0 mt-0.5" />
                    <span className="text-foreground">Continuous improvement</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            Is Arclo Right for You?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-semantic-success-soft/30 border-semantic-success/30">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-semantic-success mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  Perfect For
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-foreground">Small businesses tired of agency runaround</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ShoppingCart className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-foreground">E-commerce sites that need consistent SEO</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-foreground">Marketing teams without dedicated SEO staff</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-foreground">Agencies managing multiple client sites</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/30 border-border/50">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-muted-foreground mb-6 flex items-center gap-2">
                  <X className="w-6 h-6" />
                  Probably Not For
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 shrink-0" />
                    <span>Enterprise sites with complex approval workflows</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 shrink-0" />
                    <span>Sites that can't accept automated deployments</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 shrink-0" />
                    <span>Companies requiring hands-on consulting</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Preview Mock */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            See What Arclo Finds
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            A real scan shows you prioritized issues with clear next steps
          </p>
          
          <div className="max-w-4xl mx-auto">
            <Card className="bg-card border-border overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Diagnosis Summary</h3>
                  <span className="text-sm text-muted-foreground">Score: 67/100</span>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-semantic-danger-soft/30 rounded-lg border border-semantic-danger/20">
                    <div className="w-10 h-10 rounded-full bg-semantic-danger/20 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-semantic-danger" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">Missing Meta Descriptions</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-semantic-danger/20 text-semantic-danger">High Impact</span>
                      </div>
                      <p className="text-sm text-muted-foreground">12 pages are missing meta descriptions, hurting click-through rates</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-semantic-warning-soft/30 rounded-lg border border-semantic-warning/20">
                    <div className="w-10 h-10 rounded-full bg-semantic-warning/20 flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5 text-semantic-warning" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">Slow Page Speed</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-semantic-warning/20 text-semantic-warning">Medium Impact</span>
                      </div>
                      <p className="text-sm text-muted-foreground">LCP is 4.2s on mobile—optimizing images could improve this</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">Content Opportunities</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Low Effort</span>
                      </div>
                      <p className="text-sm text-muted-foreground">3 high-value keywords you're not targeting yet</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-dashed border-border text-center">
                  <p className="text-sm text-muted-foreground mb-2">+ 8 more findings in full report</p>
                  <p className="text-xs text-muted-foreground">Create a free account to see all issues and deploy fixes</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to automate your SEO?
            </h2>
            <p className="text-xl text-muted-foreground">
              Start with a free scan and see what Arclo can do for your site.
            </p>
            
            <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <Input
                type="text"
                placeholder="Enter your website URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 h-12 text-base"
                data-testid="input-url-footer"
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-12 px-8"
                disabled={scanMutation.isPending}
                data-testid="button-scan-footer"
              >
                {scanMutation.isPending ? (
                  "Scanning..."
                ) : (
                  <>
                    Run Free SEO Scan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
