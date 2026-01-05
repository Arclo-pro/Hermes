import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { ArrowRight, Building2, ShoppingCart, Briefcase, Users, Heart, Wrench } from "lucide-react";

const useCases = [
  {
    icon: Building2,
    title: "Small Businesses",
    description: "Local businesses, professional services, and small companies that want professional SEO without agency fees.",
    benefits: [
      "No monthly retainer costs",
      "Immediate results, not quarterly reports",
      "Focus on running your business, not managing SEO",
    ],
  },
  {
    icon: ShoppingCart,
    title: "E-commerce Sites",
    description: "Online stores that need consistent SEO maintenance across hundreds or thousands of product pages.",
    benefits: [
      "Automated product page optimization",
      "Schema markup management",
      "Category page improvements",
    ],
  },
  {
    icon: Heart,
    title: "Healthcare & Clinics",
    description: "Medical practices, mental health clinics, and healthcare providers looking to reach more patients online.",
    benefits: [
      "HIPAA-conscious approach",
      "Local SEO optimization",
      "Patient-focused content recommendations",
    ],
  },
  {
    icon: Briefcase,
    title: "Marketing Teams",
    description: "In-house marketing teams that want to add SEO capability without hiring a dedicated specialist.",
    benefits: [
      "No SEO expertise required",
      "Integrates with existing workflows",
      "Clear ROI tracking",
    ],
  },
  {
    icon: Users,
    title: "Agencies",
    description: "Digital agencies managing SEO for multiple clients who want to scale their operations.",
    benefits: [
      "Manage multiple sites from one dashboard",
      "White-label reporting",
      "Automated maintenance frees up team time",
    ],
  },
  {
    icon: Wrench,
    title: "Developers & Startups",
    description: "Technical teams that want to ensure their sites are SEO-friendly without becoming SEO experts.",
    benefits: [
      "Technical SEO automation",
      "CI/CD integration options",
      "API access for custom workflows",
    ],
  },
];

export default function UseCases() {
  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Use Cases
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Arclo helps teams of all sizes automate their SEO. See how different organizations use the platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              return (
                <Card key={useCase.title} className="bg-card/50 hover:bg-card transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{useCase.title}</h3>
                    <p className="text-muted-foreground mb-4">{useCase.description}</p>
                    <ul className="space-y-2">
                      {useCase.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
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
