import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  Book,
  MessageCircle,
  Mail,
  ExternalLink,
  Lightbulb,
  FileText,
  Video,
  Users
} from "lucide-react";
import { Link } from "wouter";
import { colors, pageStyles, gradients } from "@/lib/design-system";

const helpSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of Hermes and set up your first site",
    icon: Lightbulb,
    links: [
      { label: "Add your first site", href: "/sites/new" },
      { label: "Configure integrations", href: "/integrations" },
      { label: "Run your first diagnostic", href: "/runs" },
    ],
  },
  {
    id: "agents",
    title: "Understanding Agents",
    description: "Learn what each specialist agent does and how to use their insights",
    icon: Users,
    links: [
      { label: "View all agents", href: "/agents" },
      { label: "Agent capabilities", href: "/agents" },
    ],
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    description: "Understand your SEO health through diagnostics and benchmarks",
    icon: FileText,
    links: [
      { label: "View run history", href: "/runs" },
      { label: "Review audit log", href: "/audit" },
    ],
  },
];

const externalResources = [
  {
    title: "Documentation",
    description: "Full technical documentation and API reference",
    icon: Book,
    href: "#",
  },
  {
    title: "Video Tutorials",
    description: "Step-by-step video guides for common tasks",
    icon: Video,
    href: "#",
  },
  {
    title: "Contact Support",
    description: "Get help from our support team",
    icon: Mail,
    href: "mailto:support@example.com",
  },
];

export default function Help() {
  return (
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold" style={{ color: colors.text.primary, letterSpacing: "-0.03em" }}>
            <span style={gradients.brandText}>Help Center</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.text.muted }}>Resources and guides to help you get the most out of Hermes</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {helpSections.map((section) => {
            const Icon = section.icon;
            return (
              <GlassCard key={section.id} variant="marketing" data-testid={`card-help-${section.id}`}>
                <GlassCardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors.brand.purple}15` }}>
                      <Icon className="w-5 h-5" style={{ color: colors.brand.purple }} />
                    </div>
                    <div>
                      <GlassCardTitle className="text-base" style={{ color: colors.text.primary }}>{section.title}</GlassCardTitle>
                      <p className="text-xs" style={{ color: colors.text.muted }}>{section.description}</p>
                    </div>
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="space-y-2">
                    {section.links.map((link) => (
                      <Link key={link.href} href={link.href}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm"
                          data-testid={`link-help-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                  </div>
                </GlassCardContent>
              </GlassCard>
            );
          })}
        </div>

        <GlassCard variant="marketing">
          <GlassCardHeader>
            <GlassCardTitle style={{ color: colors.text.primary }}>External Resources</GlassCardTitle>
            <p className="text-sm" style={{ color: colors.text.muted }}>Additional help and support channels</p>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {externalResources.map((resource) => {
                const Icon = resource.icon;
                return (
                  <a
                    key={resource.title}
                    href={resource.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-4 rounded-lg transition-colors hover:bg-slate-50"
                    style={{ border: `1px solid ${colors.border.default}` }}
                    data-testid={`link-external-${resource.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: colors.background.muted }}>
                      <Icon className="w-4 h-4" style={{ color: colors.text.muted }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm flex items-center gap-1" style={{ color: colors.text.primary }}>
                        {resource.title}
                        <ExternalLink className="w-3 h-3" />
                      </p>
                      <p className="text-xs" style={{ color: colors.text.muted }}>{resource.description}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="marketing">
          <GlassCardContent className="py-8 text-center">
            <HelpCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.text.muted }} />
            <h3 className="font-semibold mb-2" style={{ color: colors.text.primary }}>Still need help?</h3>
            <p className="text-sm mb-4" style={{ color: colors.text.muted }}>
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <Button data-testid="btn-contact-support">
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
}
