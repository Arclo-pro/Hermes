import { AlertTriangle, Target, Users, Sparkles, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export function ReportPreview() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16 bg-slate-50/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-950 mb-3 tracking-tight">
          Your SEO, <span className="marketing-gradient-text">fixed automatically.</span>
        </h2>
        <p className="text-center text-slate-600 mb-10 max-w-xl mx-auto">
          Arclo finds issues and fixes them for you. No reports to review. No agencies. No waiting.
        </p>
        
        <Card className="bg-gradient-to-b from-white to-slate-50 border border-slate-100 overflow-hidden shadow-[0_24px_48px_rgba(15,23,42,0.1)]">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">SEO Report</span>
              <span className="text-sm font-medium text-slate-900">yoursite.com</span>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">12</p>
                  <p className="text-sm text-slate-500">Technical Issues found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">24</p>
                  <p className="text-sm text-slate-500">Keyword Opportunities found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">8</p>
                  <p className="text-sm text-slate-500">Competitor Gaps found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-violet-50 border border-violet-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 via-pink-500 to-amber-400 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Ready to fix</p>
                  <p className="text-sm text-violet-600 font-medium">44 improvements queued</p>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  className="h-12 px-8 text-base font-semibold rounded-xl bg-gradient-to-r from-violet-500 via-pink-500 to-amber-500 text-white shadow-[0_14px_30px_rgba(139,92,246,0.20)] hover:shadow-[0_18px_40px_rgba(236,72,153,0.22)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
                  data-testid="button-fix-it"
                >
                  <Sparkles className="h-5 w-5" />
                  Fix it
                </button>
                <button 
                  className="h-10 px-6 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-2 transition-colors"
                  data-testid="button-view-details"
                >
                  <Eye className="h-4 w-4" />
                  View details
                </button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-4">
                Review changes before they go live, or let Arclo handle everything automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
