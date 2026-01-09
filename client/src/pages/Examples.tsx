import { Link } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@shared/routes";
import { BrandButton } from "@/components/marketing/BrandButton";
import { 
  Wrench, 
  Wind, 
  Stethoscope, 
  Trees, 
  Zap, 
  Car, 
  Home, 
  Hammer,
  ExternalLink,
  Sparkles
} from "lucide-react";

const EXAMPLES = [
  {
    id: "plumbing",
    business: "Austin Pro Plumbers",
    industry: "Plumbing",
    city: "Austin, TX",
    icon: Wrench,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    services: ["Emergency repairs", "Water heater installation", "Drain cleaning"],
  },
  {
    id: "hvac",
    business: "Denver Climate Control",
    industry: "HVAC",
    city: "Denver, CO",
    icon: Wind,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    services: ["AC repair", "Furnace installation", "Duct cleaning"],
  },
  {
    id: "dental",
    business: "Evergreen Family Dental",
    industry: "Dental Clinic",
    city: "Seattle, WA",
    icon: Stethoscope,
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
    services: ["General dentistry", "Cosmetic procedures", "Emergency care"],
  },
  {
    id: "landscaping",
    business: "Desert Bloom Landscaping",
    industry: "Landscaping",
    city: "Phoenix, AZ",
    icon: Trees,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    services: ["Lawn care", "Irrigation", "Landscape design"],
  },
  {
    id: "electrical",
    business: "Bright Spark Electric",
    industry: "Electrical",
    city: "Portland, OR",
    icon: Zap,
    color: "from-yellow-500 to-yellow-600",
    bgColor: "bg-yellow-50",
    services: ["Panel upgrades", "Lighting installation", "EV chargers"],
  },
  {
    id: "auto",
    business: "Summit Auto Repair",
    industry: "Auto Repair",
    city: "Salt Lake City, UT",
    icon: Car,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    services: ["Brake service", "Oil changes", "Engine repair"],
  },
  {
    id: "roofing",
    business: "Skyline Roofing Co",
    industry: "Roofing",
    city: "Dallas, TX",
    icon: Home,
    color: "from-slate-500 to-slate-600",
    bgColor: "bg-slate-100",
    services: ["Roof replacement", "Storm damage", "Inspections"],
  },
  {
    id: "contractor",
    business: "Premier Home Builders",
    industry: "General Contractor",
    city: "San Diego, CA",
    icon: Hammer,
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    services: ["Kitchen remodels", "Bathroom renovations", "Additions"],
  },
];

export default function Examples() {
  return (
    <MarketingLayout>
      <section className="px-5 md:px-6 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-slate-950 mb-4 tracking-tight">
              Real Examples of Arclo-Built Sites
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              See what Arclo creates for local service businesses. Each site is fully optimized for search engines and designed to convert visitors into customers.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {EXAMPLES.map((example) => (
              <Card 
                key={example.id}
                className="bg-gradient-to-b from-white to-slate-50 border border-slate-100 shadow-[0_20px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 overflow-hidden"
                data-testid={`card-example-${example.id}`}
              >
                <div className={`h-36 ${example.bgColor} flex items-center justify-center relative`}>
                  <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${example.color} flex items-center justify-center shadow-lg`}>
                    <example.icon className="h-10 w-10 text-white" />
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-1">{example.business}</h3>
                  <p className="text-sm text-slate-500 mb-3">{example.industry} • {example.city}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {example.services.map((service) => (
                      <span 
                        key={service}
                        className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button 
                      className="flex items-center justify-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 py-2 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
                      data-testid={`button-demo-${example.id}`}
                    >
                      View demo <ExternalLink className="h-3 w-3" />
                    </button>
                    <Link href={ROUTES.WEBSITE_GENERATOR}>
                      <button 
                        className="w-full flex items-center justify-center gap-1 text-sm font-medium text-white py-2 rounded-lg transition-colors"
                        style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)" }}
                        data-testid={`button-generate-like-${example.id}`}
                      >
                        <Sparkles className="h-3 w-3" />
                        Generate like this
                      </button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-16 py-12 px-6 bg-slate-50 rounded-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-950 mb-4">
              Ready to create your own?
            </h2>
            <p className="text-slate-600 mb-6 max-w-lg mx-auto">
              Get a professional, SEO-optimized website for your business in under 60 seconds.
            </p>
            <Link href={ROUTES.WEBSITE_GENERATOR}>
              <BrandButton 
                variant="primary"
                size="lg"
                className="gap-2"
                data-testid="button-examples-cta"
              >
                <Sparkles className="h-4 w-4" />
                Generate My Site
              </BrandButton>
            </Link>
            <p className="text-sm text-slate-400 mt-4">
              Free preview. No credit card required.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
