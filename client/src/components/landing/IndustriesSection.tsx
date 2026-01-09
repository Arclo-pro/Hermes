import { 
  Wrench, 
  Wind, 
  Stethoscope, 
  Trees, 
  Zap, 
  Car, 
  Home, 
  Hammer,
  Paintbrush,
  Shield,
  Droplets,
  Bug
} from "lucide-react";

const INDUSTRIES = [
  { icon: Wrench, name: "Plumbing" },
  { icon: Wind, name: "HVAC" },
  { icon: Zap, name: "Electrical" },
  { icon: Stethoscope, name: "Dental & Medical" },
  { icon: Trees, name: "Landscaping" },
  { icon: Car, name: "Auto Repair" },
  { icon: Home, name: "Roofing" },
  { icon: Hammer, name: "General Contractors" },
  { icon: Paintbrush, name: "Painting" },
  { icon: Shield, name: "Security" },
  { icon: Droplets, name: "Pool Services" },
  { icon: Bug, name: "Pest Control" },
];

export function IndustriesSection() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16 bg-slate-50/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-950 mb-4 tracking-tight">
          Who It's For
        </h2>
        <p className="text-center text-slate-600 mb-10 max-w-xl mx-auto">
          Arclo is built for businesses that serve customers locally.
        </p>
        
        <div className="flex flex-wrap justify-center gap-3">
          {INDUSTRIES.map((industry) => (
            <div
              key={industry.name}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-300 transition-all duration-200"
              data-testid={`pill-industry-${industry.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <industry.icon className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-slate-700">{industry.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
