import { Link } from "wouter";
import { FileText, Zap, HeadphonesIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WAYS = [
  {
    icon: FileText,
    title: "DIY",
    badge: "Free",
    description: "Get the report + a plan for your dev",
    cta: "See what's included",
    href: "#benefits",
  },
  {
    icon: Zap,
    title: "Autopilot",
    badge: "Recommended",
    description: "Arclo monitors and deploys fixes safely",
    cta: "How Autopilot works",
    href: "/how-it-works",
    highlighted: true,
  },
  {
    icon: HeadphonesIcon,
    title: "Done-for-you",
    badge: null,
    description: "We can build/host/manage your site if needed",
    cta: "Talk to us",
    href: "mailto:hello@arclo.io",
  },
];

export function ThreeWaysCards() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-[#020617] mb-8">
          Three ways to use Arclo
        </h2>
        
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {WAYS.map((way) => (
            <Card 
              key={way.title} 
              className={`bg-white border border-[#CBD5E1] shadow-[0_4px_12px_rgba(15,23,42,0.06)] ${way.highlighted ? 'ring-2 ring-[#16A34A]/50' : ''}`}
            >
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <way.icon className="h-5 w-5 text-[#15803D]" />
                  <h3 className="font-semibold text-[#0F172A]">{way.title}</h3>
                  {way.badge && (
                    <Badge 
                      variant="secondary" 
                      className={`ml-auto text-xs ${way.highlighted ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]' : 'bg-[#F1F5F9] text-[#64748B]'}`}
                    >
                      {way.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-[#64748B] mb-6 flex-1">{way.description}</p>
                <Link href={way.href}>
                  {way.highlighted ? (
                    <button 
                      className="w-full h-9 px-4 text-sm font-medium rounded-md bg-[linear-gradient(135deg,#22C55E_0%,#16A34A_100%)] text-white shadow-[0_10px_20px_rgba(22,163,74,0.25)] hover:shadow-[0_10px_20px_rgba(22,163,74,0.40)] hover:brightness-110 transition-all duration-200"
                      data-testid={`button-${way.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {way.cta}
                    </button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      data-testid={`button-${way.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {way.cta}
                    </Button>
                  )}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
