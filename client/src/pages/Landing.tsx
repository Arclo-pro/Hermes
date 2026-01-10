import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SEOHead } from "@/components/marketing/SEOHead";
import {
  LandingHero,
  TrustRow,
  Testimonials,
  HowItWorks,
  BenefitCards,
  IndustriesSection,
  ExamplesPreview,
  ComparisonSection,
  FAQSection,
  BottomCTA,
  FounderNote,
} from "@/components/landing";

export default function Landing() {
  return (
    <MarketingLayout>
      <SEOHead 
        path="/" 
        title="Arclo – Fully Automated SEO From Audit to Execution"
        description="Arclo replaces SEO agencies and tools by automating diagnosis, prioritization, and deployment. Stop managing SEO. Start running your business."
      />
      <LandingHero />
      <TrustRow />
      <Testimonials />
      <HowItWorks />
      <BenefitCards />
      <IndustriesSection />
      <ExamplesPreview />
      <ComparisonSection />
      <FounderNote />
      <FAQSection />
      <BottomCTA />
    </MarketingLayout>
  );
}
