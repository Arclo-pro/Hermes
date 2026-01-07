import { Link } from "wouter";
import { Wrench, Users, Gauge, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SPECIALISTS = [
  {
    icon: Wrench,
    title: "Technical SEO",
    description: "Finds and explains structural issues",
  },
  {
    icon: Users,
    title: "Competitive Intelligence",
    description: "Shows why competitors outrank you",
  },
  {
    icon: Gauge,
    title: "Performance Monitor",
    description: "Flags speed and UX problems",
  },
  {
    icon: TrendingDown,
    title: "Content Decay Monitor",
    description: "Detects pages losing traffic",
  },
];

export function AISpecialists() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16 bg-[#F1F5F9]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-[#020617] mb-3">
          Turn insights into action with AI specialists.
        </h2>
        <p className="text-center text-[#334155] mb-10 max-w-xl mx-auto">
          Enable only the capabilities you need — from technical SEO to competitive intelligence to automated execution.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SPECIALISTS.map((specialist) => (
            <Card key={specialist.title} className="bg-white border border-[#CBD5E1] shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center mx-auto mb-3">
                  <specialist.icon className="h-5 w-5 text-[#15803D]" />
                </div>
                <h3 className="font-medium text-[#0F172A] text-sm mb-1">{specialist.title}</h3>
                <p className="text-xs text-[#64748B]">{specialist.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link href="/app/crew">
            <button 
              className="h-10 px-6 text-sm font-medium rounded-lg bg-[linear-gradient(135deg,#22C55E_0%,#16A34A_100%)] text-white shadow-[0_10px_20px_rgba(22,163,74,0.25)] hover:shadow-[0_10px_20px_rgba(22,163,74,0.40)] hover:brightness-110 transition-all duration-200"
              data-testid="button-staff-crew"
            >
              Staff your AI crew
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
