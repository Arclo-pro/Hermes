import { Link } from "wouter";
import { ROUTES, buildRoute } from "@shared/routes";
import { Phone, Star, MapPin, ChevronRight, ExternalLink } from "lucide-react";

import plumbingImage from "@assets/generated_images/plumbing_hero_diverse_female.webp";
import hvacImage from "@assets/generated_images/hvac_hero_diverse_asian_woman.webp";
import dentalImage from "@assets/generated_images/dental_hero_diverse_team.webp";
import landscapingImage from "@assets/generated_images/landscaping_hero_diverse_latino.webp";

const EXAMPLES = [
  {
    id: "plumbing",
    business: "Austin Pro Plumbers",
    industry: "Plumbing",
    city: "Austin, TX",
    image: plumbingImage,
    tagline: "Fast, reliable plumbing for your home and business",
    phone: "(512) 555-0147",
    rating: 4.9,
    reviewCount: 312,
    services: ["Emergency Repairs", "Water Heater Installation", "Drain Cleaning"],
  },
  {
    id: "hvac",
    business: "Denver Climate Control",
    industry: "HVAC",
    city: "Denver, CO",
    image: hvacImage,
    tagline: "Keep your home comfortable year-round",
    phone: "(720) 555-0283",
    rating: 4.8,
    reviewCount: 247,
    services: ["AC Repair", "Furnace Installation", "Duct Cleaning"],
  },
  {
    id: "dental",
    business: "Evergreen Family Dental",
    industry: "Dental Clinic",
    city: "Seattle, WA",
    image: dentalImage,
    tagline: "Gentle, comprehensive dental care for the whole family",
    phone: "(206) 555-0419",
    rating: 4.9,
    reviewCount: 189,
    services: ["General Dentistry", "Cosmetic Procedures", "Emergency Care"],
  },
  {
    id: "landscaping",
    business: "Desert Bloom Landscaping",
    industry: "Landscaping",
    city: "Phoenix, AZ",
    image: landscapingImage,
    tagline: "Beautiful, water-smart landscapes for the desert Southwest",
    phone: "(480) 555-0362",
    rating: 4.7,
    reviewCount: 156,
    services: ["Lawn Care", "Irrigation Systems", "Landscape Design"],
  },
];

function MiniSitePreview({ example }: { example: typeof EXAMPLES[number] }) {
  return (
    <Link href={buildRoute.examplePreview(example.id)}>
      <div
        className="group relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        data-testid={`mini-preview-${example.id}`}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border-b border-gray-200">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="ml-2 flex-1 h-4 bg-white rounded text-[8px] text-gray-400 flex items-center px-2 truncate">
            {example.business.toLowerCase().replace(/\s+/g, "")}.com
          </span>
        </div>

        {/* Mini site content */}
        <div className="relative">
          {/* Mini nav bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900">
            <span className="text-[9px] font-bold text-white truncate">{example.business}</span>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[7px] text-gray-400">Services</span>
              <span className="text-[7px] text-gray-400">About</span>
              <span className="text-[7px] text-gray-400">Contact</span>
            </div>
            <span className="flex items-center gap-0.5 bg-white text-gray-900 text-[7px] font-semibold px-1.5 py-0.5 rounded">
              <Phone className="h-2 w-2" />
              <span className="hidden sm:inline">{example.phone}</span>
              <span className="sm:hidden">Call</span>
            </span>
          </div>

          {/* Mini hero */}
          <div className="relative h-28 sm:h-32 overflow-hidden">
            <img
              src={example.image}
              alt={`${example.business} website preview`}
              loading="lazy"
              width={600}
              height={400}
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
            <div className="absolute inset-0 flex items-center px-3 sm:px-4">
              <div>
                <p className="text-[7px] sm:text-[8px] text-white/80 uppercase tracking-wider font-medium">
                  {example.industry} · {example.city}
                </p>
                <p className="text-[11px] sm:text-sm font-bold text-white leading-tight mt-0.5">
                  {example.business}
                </p>
                <p className="text-[8px] sm:text-[9px] text-white/80 mt-0.5 hidden sm:block">
                  {example.tagline}
                </p>
                <div className="flex gap-1.5 mt-1.5">
                  <span className="bg-white text-gray-900 text-[7px] font-semibold px-2 py-0.5 rounded">
                    Call Now
                  </span>
                  <span className="bg-white/20 text-white text-[7px] font-semibold px-2 py-0.5 rounded border border-white/30">
                    Free Quote
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini trust bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-y border-gray-200">
            <div className="flex items-center gap-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-2 w-2 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-[8px] font-medium text-gray-900">{example.rating}</span>
              <span className="text-[7px] text-gray-500">({example.reviewCount})</span>
            </div>
            <div className="flex items-center gap-0.5 text-[7px] text-gray-500">
              <MapPin className="h-2 w-2" />
              {example.city}
            </div>
          </div>

          {/* Mini services */}
          <div className="px-3 py-2">
            <p className="text-[8px] font-semibold text-gray-900 mb-1.5">Our Services</p>
            <div className="space-y-1">
              {example.services.map((service) => (
                <div key={service} className="flex items-center justify-between">
                  <span className="text-[7px] sm:text-[8px] text-gray-700">{service}</span>
                  <ChevronRight className="h-2 w-2 text-gray-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Mini footer */}
          <div className="px-3 py-1.5 bg-gray-900">
            <span className="text-[7px] text-gray-400">
              © {example.business} · {example.city}
            </span>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="bg-white/95 backdrop-blur-sm text-gray-900 text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
            <ExternalLink className="h-3 w-3" />
            View full preview
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ExamplesPreview() {
  return (
    <section className="px-4 sm:px-5 md:px-6 py-12 md:py-16">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-foreground mb-4 tracking-tight">
          See What Arclo Builds
        </h2>
        <p className="text-center text-sm sm:text-base text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto">
          Real examples of websites generated for local businesses — fully optimized for SEO and conversions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {EXAMPLES.map((example) => (
            <MiniSitePreview key={example.id} example={example} />
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href={ROUTES.EXAMPLES}>
            <span className="text-sm font-medium text-brand hover:opacity-80 underline-offset-2 hover:underline cursor-pointer" data-testid="link-see-all-examples">
              See all examples →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
