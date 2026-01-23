import { SEOHead } from "@/components/marketing/SEOHead";
import WhiteHero from "@/pages/landing/WhiteHero";
import {
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
import SiteFooter from "@/components/marketing/SiteFooter";

export default function Landing() {
  return (
    <>
      <SEOHead 
        path="/" 
        title="Arclo – Fully Automated SEO From Audit to Execution"
        description="Arclo replaces SEO agencies and tools by automating diagnosis, prioritization, and deployment. Stop managing SEO. Start running your business."
      />
      <div className="marketing-shell">
        <WhiteHero />
        <Testimonials />
        <HowItWorks />
        <BenefitCards />
        <IndustriesSection />
        <ExamplesPreview />
        <ComparisonSection />
        <FounderNote />
        <FAQSection />
        <BottomCTA />
        <SiteFooter />
      </div>
    </>
  );
}
