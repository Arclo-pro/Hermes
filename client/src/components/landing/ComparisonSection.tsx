import { Check, X, Minus } from "lucide-react";

const COMPARISON_ROWS = [
  {
    label: "Skill required",
    diy: "High – you learn SEO",
    agency: "None – they do it",
    arclo: "None – we do it",
  },
  {
    label: "Time required",
    diy: "10+ hrs/week",
    agency: "Meetings & approvals",
    arclo: "Minutes to setup",
  },
  {
    label: "Transparency",
    diy: "You see everything",
    agency: "Monthly reports",
    arclo: "Real-time activity log",
  },
  {
    label: "Ongoing optimization",
    diy: "Only if you keep working",
    agency: "Depends on contract",
    arclo: "Automatic weekly",
  },
];

export function ComparisonSection() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16 bg-slate-50/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-950 mb-4 tracking-tight">
          Why Arclo?
        </h2>
        <p className="text-center text-slate-600 mb-10 max-w-xl mx-auto">
          Compare your options for getting found on Google.
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-4 text-left text-sm font-medium text-slate-500"></th>
                <th className="p-4 text-center text-sm font-semibold text-slate-700">DIY Tools</th>
                <th className="p-4 text-center text-sm font-semibold text-slate-700">SEO Agencies</th>
                <th className="p-4 text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)" }}>
                    Arclo
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, index) => (
                <tr 
                  key={row.label} 
                  className={index < COMPARISON_ROWS.length - 1 ? "border-b border-slate-100" : ""}
                  data-testid={`row-comparison-${index}`}
                >
                  <td className="p-4 text-sm font-medium text-slate-700">{row.label}</td>
                  <td className="p-4 text-center text-sm text-slate-500">{row.diy}</td>
                  <td className="p-4 text-center text-sm text-slate-500">{row.agency}</td>
                  <td className="p-4 text-center text-sm font-medium text-violet-700">{row.arclo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
