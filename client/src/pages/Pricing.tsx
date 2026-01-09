import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Check, Zap, Building2, Rocket, Sparkles } from "lucide-react";
import { BrandButton } from "@/components/marketing/BrandButton";

const plans = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "Perfect for small businesses getting started with SEO",
    icon: Zap,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    accentColor: "text-amber-600",
    features: [
      "1 website",
      "Weekly automated scans",
      "Basic issue detection",
      "Email reports",
      "Core Web Vitals monitoring",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Professional",
    price: "$299",
    period: "/month",
    description: "For growing businesses that need comprehensive SEO",
    icon: Rocket,
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    iconBg: "gradient",
    iconColor: "text-white",
    accentColor: "text-violet-600",
    features: [
      "Up to 5 websites",
      "Daily automated scans",
      "Advanced issue detection & auto-fix",
      "Priority support",
      "Competitor tracking",
      "Content optimization",
      "Backlink monitoring",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For agencies and large organizations",
    icon: Building2,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    accentColor: "text-green-600",
    features: [
      "Unlimited websites",
      "Real-time monitoring",
      "Full autonomous SEO",
      "Dedicated account manager",
      "Custom integrations",
      "White-label reports",
      "SLA guarantees",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <MarketingLayout>
      <div 
        className="min-h-screen"
        style={{
          background: `
            radial-gradient(1200px circle at 10% 0%, rgba(139, 92, 246, 0.06), transparent 40%),
            radial-gradient(1200px circle at 90% 10%, rgba(236, 72, 153, 0.04), transparent 40%),
            radial-gradient(800px circle at 50% 80%, rgba(245, 158, 11, 0.03), transparent 40%),
            #FFFFFF
          `
        }}
      >
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold text-[#020617] mb-6 tracking-tight">
                Simple,{" "}
                <span 
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                  }}
                >
                  transparent
                </span>
                {" "}pricing
              </h1>
              <p className="text-xl text-[#334155] max-w-2xl mx-auto">
                Choose the plan that fits your needs. All plans include our core autonomous SEO features.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-20">
              {plans.map((plan) => (
                <div 
                  key={plan.name}
                  className={`rounded-lg p-6 ${plan.bgColor} border ${plan.borderColor} relative`}
                  data-testid={`pricing-card-${plan.name.toLowerCase()}`}
                >
                  {plan.popular && (
                    <div 
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-medium"
                      style={{
                        background: "linear-gradient(135deg, #8B5CF6, #EC4899)"
                      }}
                    >
                      Most Popular
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        plan.iconBg === "gradient" 
                          ? "bg-gradient-to-br from-violet-500 via-pink-500 to-amber-400" 
                          : plan.iconBg
                      }`}
                    >
                      <plan.icon className={`w-5 h-5 ${plan.iconColor}`} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {plan.name}
                      </h2>
                      <p className={`text-sm font-medium ${plan.accentColor}`}>
                        {plan.price}{plan.period}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-slate-600 text-sm mb-4">
                    {plan.description}
                  </p>
                  
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 ${plan.accentColor} shrink-0 mt-0.5`} />
                        <span className="text-slate-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link href={plan.name === "Enterprise" ? "/contact" : ROUTES.SIGNUP}>
                    {plan.popular ? (
                      <BrandButton 
                        variant="primary"
                        size="sm"
                        className="w-full"
                        icon={Sparkles}
                        data-testid={`button-${plan.name.toLowerCase()}-cta`}
                      >
                        {plan.cta}
                      </BrandButton>
                    ) : (
                      <Button 
                        variant="outline"
                        className={`w-full ${plan.borderColor} bg-white/50 hover:bg-white text-slate-700`}
                        data-testid={`button-${plan.name.toLowerCase()}-cta`}
                      >
                        {plan.cta}
                      </Button>
                    )}
                  </Link>
                </div>
              ))}
            </div>

            <div 
              className="rounded-lg p-8 md:p-12 bg-violet-50 border border-violet-200"
            >
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500 via-pink-500 to-amber-400"
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Need a custom solution?
                  </h3>
                  <p className="text-slate-600">
                    We work with agencies and enterprises to create tailored SEO automation solutions.
                  </p>
                </div>
                <Link href="/contact">
                  <Button 
                    variant="outline" 
                    className="border-violet-300 text-violet-700 hover:bg-violet-100 bg-white"
                    data-testid="button-contact-sales"
                  >
                    Talk to Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
