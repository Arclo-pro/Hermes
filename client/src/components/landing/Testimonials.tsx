import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "Finally, an SEO solution that actually does the work for me. Our leads doubled in 3 months.",
    name: "Mike R.",
    business: "HVAC Company Owner",
  },
  {
    quote: "I was skeptical at first, but Arclo delivered. We're now ranking #1 for our main keywords.",
    name: "Sarah T.",
    business: "Landscaping Business",
  },
  {
    quote: "Set it up once and it keeps improving our site every week. Best investment for my plumbing business.",
    name: "David K.",
    business: "Plumber",
  },
];

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="px-5 md:px-6 py-16 md:py-20 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-12">
          Trusted by Local Service Businesses
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
              data-testid={`testimonial-card-${index}`}
            >
              <StarRating />
              <blockquote className="mt-4 text-slate-600 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="font-semibold text-slate-900">{testimonial.name}</p>
                <p className="text-sm text-slate-500">{testimonial.business}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
