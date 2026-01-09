import { MarketingLayout } from "@/components/layout/MarketingLayout";
import {
  LandingHero,
  TrustRow,
  HowItWorks,
  BenefitCards,
  IndustriesSection,
  ExamplesPreview,
  ComparisonSection,
  BottomCTA,
  FounderNote,
} from "@/components/landing";

export default function Landing() {
  return (
    <MarketingLayout>
      <LandingHero />
      <TrustRow />
      <HowItWorks />
      <BenefitCards />
      <IndustriesSection />
      <ExamplesPreview />
      <ComparisonSection />
      <FounderNote />
      <BottomCTA />
    </MarketingLayout>
  );
}
