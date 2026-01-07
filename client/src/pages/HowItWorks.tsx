import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { IconBadge } from "@/components/marketing/IconBadge";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Search, Sparkles, TrendingUp, Shield, CheckCircle2, Bell } from "lucide-react";

export default function HowItWorks() {
  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-[#020617] mb-6">
              SEO that runs on autopilot
            </h1>
            <p className="text-xl text-[#334155] max-w-2xl mx-auto">
              We find issues, fix them, and keep your site optimized — without you lifting a finger.
            </p>
          </div>

          <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-6 mb-16">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#15803D] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#0F172A] text-lg mb-1">No work required</h3>
                <p className="text-[#334155]">
                  Arclo runs automatically in the background. You'll only hear from us when something improves — or if action is needed.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-20">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <IconBadge icon={Search} size="md" />
              </div>
              <h2 className="text-2xl font-bold text-[#020617] mb-3">
                We find what's broken
              </h2>
              <p className="text-lg text-[#334155] max-w-lg mx-auto">
                Arclo continuously scans your site for technical issues, content gaps, and missed opportunities — the same checks a senior SEO professional would run.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-6">
                <IconBadge icon={Sparkles} size="md" />
              </div>
              <h2 className="text-2xl font-bold text-[#020617] mb-3">
                We fix it automatically
              </h2>
              <p className="text-lg text-[#334155] max-w-lg mx-auto">
                You never have to read reports or make decisions. Arclo applies fixes in the background — safely and with rollback protection.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-6">
                <IconBadge icon={TrendingUp} size="md" />
              </div>
              <h2 className="text-2xl font-bold text-[#020617] mb-3">
                Your traffic improves
              </h2>
              <p className="text-lg text-[#334155] max-w-lg mx-auto">
                As issues get fixed and content gets optimized, your organic visibility grows. You focus on your business — we handle the SEO.
              </p>
            </div>
          </div>

          <div className="mt-20 bg-white border border-[#CBD5E1] rounded-xl p-8 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-[#2563EB]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#0F172A] text-lg mb-1">You stay in control (if you want)</h3>
                <p className="text-[#334155]">
                  Every fix can be reviewed before it goes live. You can enable full automation, or approve changes one by one. The choice is yours — but you don't have to choose.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#0F172A] text-lg mb-1">We only notify you when it matters</h3>
                <p className="text-[#334155]">
                  No weekly reports. No dashboards to check. We'll reach out when something significant happens — like a traffic spike or a problem we can't fix automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link href={ROUTES.LANDING}>
              <button 
                className="h-14 px-10 text-lg font-semibold rounded-lg bg-[linear-gradient(135deg,#22C55E_0%,#16A34A_100%)] text-white shadow-[0_10px_20px_rgba(22,163,74,0.25)] hover:shadow-[0_10px_20px_rgba(22,163,74,0.40)] hover:brightness-110 hover:scale-[1.02] transition-all duration-200 flex items-center gap-2 mx-auto"
                data-testid="button-fix-my-seo"
              >
                <Sparkles className="w-5 h-5" />
                Fix my SEO automatically
              </button>
            </Link>
            <Link href={ROUTES.FREE_REPORT}>
              <button 
                className="mt-4 text-[#64748B] hover:text-[#334155] text-sm font-medium transition-colors"
                data-testid="link-see-example"
              >
                See an example report
              </button>
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
