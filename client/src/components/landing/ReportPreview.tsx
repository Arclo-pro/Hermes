import { AlertTriangle, Target, Users, Sparkles, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export function ReportPreview() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16 bg-[#F1F5F9]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-[#020617] mb-3">
          Your SEO, fixed automatically.
        </h2>
        <p className="text-center text-[#334155] mb-10 max-w-xl mx-auto">
          Hermes finds issues and fixes them for you. No reports to review. No agencies. No waiting.
        </p>
        
        <Card className="bg-white border border-[#CBD5E1] overflow-hidden shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <div className="bg-[#F1F5F9] px-6 py-4 border-b border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748B]">SEO Report</span>
              <span className="text-sm font-medium text-[#0F172A]">yoursite.com</span>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
                <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-[#DC2626]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">12</p>
                  <p className="text-sm text-[#64748B]">Technical Issues found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-[#16A34A]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">24</p>
                  <p className="text-sm text-[#64748B]">Keyword Opportunities found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
                <div className="w-10 h-10 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">8</p>
                  <p className="text-sm text-[#64748B]">Competitor Gaps found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]">
                <div className="w-10 h-10 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-[#15803D]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Ready to fix</p>
                  <p className="text-sm text-[#15803D] font-medium">44 improvements queued</p>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-[#E2E8F0]">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  className="h-12 px-8 text-base font-semibold rounded-lg bg-[linear-gradient(135deg,#22C55E_0%,#16A34A_100%)] text-white shadow-[0_10px_20px_rgba(22,163,74,0.25)] hover:shadow-[0_10px_20px_rgba(22,163,74,0.40)] hover:brightness-110 hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
                  data-testid="button-fix-it"
                >
                  <Sparkles className="h-5 w-5" />
                  Fix it
                </button>
                <button 
                  className="h-10 px-6 text-sm font-medium text-[#64748B] hover:text-[#334155] flex items-center gap-2 transition-colors"
                  data-testid="button-view-details"
                >
                  <Eye className="h-4 w-4" />
                  View details
                </button>
              </div>
              <p className="text-center text-xs text-[#64748B] mt-4">
                Review changes before they go live, or let Hermes handle everything automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
