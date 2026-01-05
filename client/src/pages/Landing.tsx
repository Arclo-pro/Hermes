import { MarketingLayout } from "@/components/layout/MarketingLayout";
import {
  LandingHero,
  TrustRow,
  BenefitCards,
  ReportPreview,
  ThreeWaysCards,
  FounderNote,
} from "@/components/landing";

export default function Landing() {
  return (
    <MarketingLayout>
      <LandingHero />
      <TrustRow />
      <BenefitCards />
      <ReportPreview />
      <ThreeWaysCards />
      <FounderNote />
    </MarketingLayout>
  );
}
