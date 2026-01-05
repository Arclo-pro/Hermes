import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Search, Target, Rocket, ArrowRight, CheckCircle2, Zap, Clock, Shield } from "lucide-react";

export default function HowItWorks() {
  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              How Arclo Works
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From diagnosis to deployment in three simple steps. No agencies, no waiting, no complexity.
            </p>
          </div>

          <div className="space-y-16">
            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                    1
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Diagnose</h2>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  Arclo runs the same comprehensive checks that experienced SEO professionals use. We analyze your technical SEO, content quality, performance metrics, and competitive positioning.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success" />
                    <span className="text-foreground">100+ technical SEO checks</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success" />
                    <span className="text-foreground">Content quality analysis</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success" />
                    <span className="text-foreground">Core Web Vitals monitoring</span>
                  </li>
                </ul>
              </div>
              <Card className="bg-card/50">
                <CardContent className="p-8 flex items-center justify-center">
                  <Search className="w-32 h-32 text-primary/20" />
                </CardContent>
              </Card>
            </div>

            {/* Step 2 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <Card className="bg-card/50 md:order-1">
                <CardContent className="p-8 flex items-center justify-center">
                  <Target className="w-32 h-32 text-primary/20" />
                </CardContent>
              </Card>
              <div className="md:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                    2
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Decide</h2>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  Issues are automatically prioritized by impact and effort. You see what matters most, not a 200-page audit you'll never read. Each issue comes with a clear recommendation and expected outcome.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-semantic-warning" />
                    <span className="text-foreground">Impact-based prioritization</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-semantic-warning" />
                    <span className="text-foreground">Effort estimation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-semantic-warning" />
                    <span className="text-foreground">Risk assessment</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                    3
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Deploy</h2>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  One click deploys fixes directly to your site. No developer tickets. No waiting weeks for changes. Just results. Arclo handles the implementation so you can focus on your business.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success" />
                    <span className="text-foreground">One-click deployment</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success" />
                    <span className="text-foreground">Safe rollback capability</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success" />
                    <span className="text-foreground">Continuous monitoring</span>
                  </li>
                </ul>
              </div>
              <Card className="bg-card/50">
                <CardContent className="p-8 flex items-center justify-center">
                  <Rocket className="w-32 h-32 text-primary/20" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-20">
            <Link href={ROUTES.LANDING}>
              <Button size="lg" className="h-14 px-10 text-lg">
                Run Free SEO Scan
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
