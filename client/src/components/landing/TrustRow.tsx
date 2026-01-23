import { Building2, XCircle, Eye, Sparkles } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Building2, text: "Built for service businesses" },
  { icon: XCircle, text: "Cancel anytime" },
  { icon: Eye, text: "Your changes logged" },
  { icon: Sparkles, text: "SEO best practices, automated" },
];

export function TrustRow() {
  return (
    <section className="px-5 md:px-6 py-6 border-y border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-4 md:gap-8">
        {TRUST_ITEMS.map((item) => (
          <div key={item.text} className="flex items-center gap-2 text-sm text-[#475569]" data-testid={`trust-item-${item.text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}>
            <item.icon className="h-4 w-4 text-[#7C3AED]" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
