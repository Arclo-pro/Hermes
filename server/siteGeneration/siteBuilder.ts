import type { GeneratedContent } from "./contentGenerator";

export interface SiteBundle {
  files: Array<{
    path: string;
    content: string;
    contentType: string;
  }>;
}

export interface SiteBuildOptions {
  businessName: string;
  content: GeneratedContent;
  colorTheme: string;
  brandPreference: string;
  logoUrl?: string;
  heroImageUrl?: string;
  phone?: string;
  email: string;
  city?: string;
}

interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryText: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

const colorThemes: Record<string, ThemeColors> = {
  blue: {
    primary: "bg-blue-600",
    primaryHover: "hover:bg-blue-700",
    primaryText: "text-blue-600",
    secondary: "bg-blue-100",
    accent: "text-blue-500",
    background: "bg-white",
    surface: "bg-gray-50",
    text: "text-gray-900",
    textMuted: "text-gray-600",
    border: "border-gray-200",
  },
  green: {
    primary: "bg-green-600",
    primaryHover: "hover:bg-green-700",
    primaryText: "text-green-600",
    secondary: "bg-green-100",
    accent: "text-green-500",
    background: "bg-white",
    surface: "bg-gray-50",
    text: "text-gray-900",
    textMuted: "text-gray-600",
    border: "border-gray-200",
  },
  purple: {
    primary: "bg-purple-600",
    primaryHover: "hover:bg-purple-700",
    primaryText: "text-purple-600",
    secondary: "bg-purple-100",
    accent: "text-purple-500",
    background: "bg-white",
    surface: "bg-gray-50",
    text: "text-gray-900",
    textMuted: "text-gray-600",
    border: "border-gray-200",
  },
  red: {
    primary: "bg-red-600",
    primaryHover: "hover:bg-red-700",
    primaryText: "text-red-600",
    secondary: "bg-red-100",
    accent: "text-red-500",
    background: "bg-white",
    surface: "bg-gray-50",
    text: "text-gray-900",
    textMuted: "text-gray-600",
    border: "border-gray-200",
  },
  orange: {
    primary: "bg-orange-600",
    primaryHover: "hover:bg-orange-700",
    primaryText: "text-orange-600",
    secondary: "bg-orange-100",
    accent: "text-orange-500",
    background: "bg-white",
    surface: "bg-gray-50",
    text: "text-gray-900",
    textMuted: "text-gray-600",
    border: "border-gray-200",
  },
  teal: {
    primary: "bg-teal-600",
    primaryHover: "hover:bg-teal-700",
    primaryText: "text-teal-600",
    secondary: "bg-teal-100",
    accent: "text-teal-500",
    background: "bg-white",
    surface: "bg-gray-50",
    text: "text-gray-900",
    textMuted: "text-gray-600",
    border: "border-gray-200",
  },
};

function getTheme(colorTheme: string): ThemeColors {
  return colorThemes[colorTheme.toLowerCase()] || colorThemes.blue;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateLocalBusinessJsonLd(options: SiteBuildOptions): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: options.businessName,
    description: options.content.seoMetadata.siteDescription,
    ...(options.email && { email: options.email }),
    ...(options.phone && { telephone: options.phone }),
    ...(options.city && {
      address: {
        "@type": "PostalAddress",
        addressLocality: options.city,
      },
    }),
    ...(options.logoUrl && { logo: options.logoUrl }),
  };
  return JSON.stringify(jsonLd, null, 2);
}

function buildMetaTags(
  options: SiteBuildOptions,
  pageTitle: string,
  pageDescription: string
): string {
  const { content, businessName } = options;
  const fullTitle = `${pageTitle} | ${businessName}`;

  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(pageDescription)}">
    <meta name="keywords" content="${escapeHtml(content.seoMetadata.keywords.join(", "))}">
    <meta name="author" content="${escapeHtml(businessName)}">
    <meta name="robots" content="index, follow">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(fullTitle)}">
    <meta property="og:description" content="${escapeHtml(pageDescription)}">
    <meta property="og:type" content="website">
    ${options.logoUrl ? `<meta property="og:image" content="${escapeHtml(options.logoUrl)}">` : ""}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
    <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
    
    <title>${escapeHtml(fullTitle)}</title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
  `;
}

function buildHeader(options: SiteBuildOptions, theme: ThemeColors, currentPage: string): string {
  const navItems = [
    { href: "index.html", label: "Home", page: "home" },
    { href: "about.html", label: "About", page: "about" },
    { href: "services.html", label: "Services", page: "services" },
    { href: "contact.html", label: "Contact", page: "contact" },
  ];

  const logoHtml = options.logoUrl
    ? `<img src="${escapeHtml(options.logoUrl)}" alt="${escapeHtml(options.businessName)}" class="h-10 w-auto">`
    : `<span class="text-2xl font-bold ${theme.primaryText}">${escapeHtml(options.businessName)}</span>`;

  return `
  <header class="sticky top-0 z-50 ${theme.background} shadow-sm">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <a href="index.html" class="flex items-center">
          ${logoHtml}
        </a>
        
        <!-- Mobile menu button -->
        <button type="button" class="md:hidden inline-flex items-center justify-center p-2 rounded-md ${theme.textMuted} hover:${theme.text}" 
                onclick="document.getElementById('mobile-menu').classList.toggle('hidden')">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        
        <!-- Desktop navigation -->
        <div class="hidden md:flex md:items-center md:space-x-8">
          ${navItems
            .map(
              (item) => `
            <a href="${item.href}" class="${
                currentPage === item.page
                  ? `${theme.primaryText} font-semibold`
                  : `${theme.textMuted} hover:${theme.text}`
              } transition-colors duration-200">
              ${item.label}
            </a>
          `
            )
            .join("")}
          <a href="contact.html" class="${theme.primary} ${theme.primaryHover} text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
            Get in Touch
          </a>
        </div>
      </div>
      
      <!-- Mobile navigation -->
      <div id="mobile-menu" class="hidden md:hidden pb-4">
        <div class="flex flex-col space-y-2">
          ${navItems
            .map(
              (item) => `
            <a href="${item.href}" class="${
                currentPage === item.page
                  ? `${theme.primaryText} font-semibold`
                  : `${theme.textMuted}`
              } py-2 px-3 rounded-md hover:${theme.surface}">
              ${item.label}
            </a>
          `
            )
            .join("")}
          <a href="contact.html" class="${theme.primary} text-white py-2 px-3 rounded-md text-center font-medium mt-2">
            Get in Touch
          </a>
        </div>
      </div>
    </nav>
  </header>
  `;
}

function buildFooter(options: SiteBuildOptions, theme: ThemeColors): string {
  const currentYear = new Date().getFullYear();

  return `
  <footer class="bg-gray-900 text-gray-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Company Info -->
        <div>
          <h3 class="text-white text-lg font-semibold mb-4">${escapeHtml(options.businessName)}</h3>
          <p class="text-sm leading-relaxed">
            ${escapeHtml(options.content.seoMetadata.siteDescription)}
          </p>
        </div>
        
        <!-- Quick Links -->
        <div>
          <h3 class="text-white text-lg font-semibold mb-4">Quick Links</h3>
          <ul class="space-y-2">
            <li><a href="index.html" class="text-sm hover:text-white transition-colors">Home</a></li>
            <li><a href="about.html" class="text-sm hover:text-white transition-colors">About Us</a></li>
            <li><a href="services.html" class="text-sm hover:text-white transition-colors">Services</a></li>
            <li><a href="contact.html" class="text-sm hover:text-white transition-colors">Contact</a></li>
          </ul>
        </div>
        
        <!-- Contact Info -->
        <div>
          <h3 class="text-white text-lg font-semibold mb-4">Contact Us</h3>
          <ul class="space-y-2 text-sm">
            ${options.phone ? `<li class="flex items-center"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>${escapeHtml(options.phone)}</li>` : ""}
            <li class="flex items-center"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>${escapeHtml(options.email)}</li>
            ${options.city ? `<li class="flex items-center"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>${escapeHtml(options.city)}</li>` : ""}
          </ul>
        </div>
      </div>
      
      <div class="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
        <p>&copy; ${currentYear} ${escapeHtml(options.businessName)}. All rights reserved.</p>
      </div>
    </div>
  </footer>
  `;
}

function buildPageWrapper(
  options: SiteBuildOptions,
  theme: ThemeColors,
  currentPage: string,
  pageTitle: string,
  pageDescription: string,
  bodyContent: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${buildMetaTags(options, pageTitle, pageDescription)}
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  ${generateLocalBusinessJsonLd(options)}
  </script>
</head>
<body class="${theme.background} ${theme.text} antialiased">
  ${buildHeader(options, theme, currentPage)}
  
  <main>
    ${bodyContent}
  </main>
  
  ${buildFooter(options, theme)}
</body>
</html>`;
}

function buildHomePage(options: SiteBuildOptions, theme: ThemeColors): string {
  const { content, heroImageUrl } = options;
  const home = content.home;

  const heroBackground = heroImageUrl
    ? `style="background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${escapeHtml(heroImageUrl)}'); background-size: cover; background-position: center;"`
    : "";

  const heroTextColor = heroImageUrl ? "text-white" : theme.text;
  const heroSubTextColor = heroImageUrl ? "text-gray-200" : theme.textMuted;

  const bodyContent = `
    <!-- Hero Section -->
    <section class="relative ${heroImageUrl ? "" : theme.surface} py-20 lg:py-32" ${heroBackground}>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold ${heroTextColor} mb-6 leading-tight">
          ${escapeHtml(home.heroHeadline)}
        </h1>
        <p class="text-xl md:text-2xl ${heroSubTextColor} mb-8 max-w-3xl mx-auto">
          ${escapeHtml(home.heroSubheadline)}
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="contact.html" class="${theme.primary} ${theme.primaryHover} text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-lg">
            ${escapeHtml(home.primaryCta)}
          </a>
          ${
            home.secondaryCta
              ? `<a href="services.html" class="bg-white ${theme.primaryText} px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 border-2 ${theme.border} hover:${theme.surface}">
              ${escapeHtml(home.secondaryCta)}
            </a>`
              : ""
          }
        </div>
      </div>
    </section>
    
    <!-- Value Propositions -->
    <section class="py-16 lg:py-24 ${theme.background}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold ${theme.text} mb-4">Why Choose Us</h2>
          <p class="${theme.textMuted} text-lg">What sets us apart from the competition</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          ${home.valuePropositions
            .map(
              (vp) => `
            <div class="${theme.surface} rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div class="w-12 h-12 ${theme.secondary} ${theme.primaryText} rounded-lg flex items-center justify-center mb-6">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold ${theme.text} mb-3">${escapeHtml(vp.title)}</h3>
              <p class="${theme.textMuted}">${escapeHtml(vp.description)}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </section>
    
    ${
      home.trustSignals && home.trustSignals.length > 0
        ? `
    <!-- Trust Signals -->
    <section class="py-12 ${theme.surface}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          ${home.trustSignals
            .map(
              (signal) => `
            <div class="flex items-center ${theme.textMuted}">
              <svg class="w-5 h-5 ${theme.accent} mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <span class="font-medium">${escapeHtml(signal)}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </section>
    `
        : ""
    }
    
    <!-- CTA Section -->
    <section class="py-16 lg:py-24 ${theme.primary}">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
        <p class="text-xl text-white/90 mb-8">Contact us today to discuss how we can help you.</p>
        <a href="contact.html" class="inline-block bg-white ${theme.primaryText} px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 hover:bg-gray-100 shadow-lg">
          Contact Us Now
        </a>
      </div>
    </section>
  `;

  return buildPageWrapper(
    options,
    theme,
    "home",
    content.seoMetadata.siteTitle,
    content.seoMetadata.siteDescription,
    bodyContent
  );
}

function buildAboutPage(options: SiteBuildOptions, theme: ThemeColors): string {
  const about = options.content.about;

  const bodyContent = `
    <!-- Page Header -->
    <section class="${theme.surface} py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl md:text-5xl font-bold ${theme.text} mb-4">About Us</h1>
        <p class="text-xl ${theme.textMuted} max-w-2xl mx-auto">
          Learn more about who we are and what drives us
        </p>
      </div>
    </section>
    
    <!-- Company Story -->
    <section class="py-16 lg:py-24 ${theme.background}">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold ${theme.text} mb-8">Our Story</h2>
        <div class="${theme.textMuted} text-lg leading-relaxed space-y-6">
          ${about.companyStory
            .split("\n")
            .filter((p) => p.trim())
            .map((p) => `<p>${escapeHtml(p)}</p>`)
            .join("")}
        </div>
      </div>
    </section>
    
    <!-- Mission Statement -->
    <section class="py-16 lg:py-20 ${theme.surface}">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-bold ${theme.text} mb-8">Our Mission</h2>
        <blockquote class="text-2xl md:text-3xl ${theme.primaryText} font-medium italic">
          "${escapeHtml(about.missionStatement)}"
        </blockquote>
      </div>
    </section>
    
    <!-- Team Description -->
    <section class="py-16 lg:py-24 ${theme.background}">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold ${theme.text} mb-8">Our Team</h2>
        <p class="${theme.textMuted} text-lg leading-relaxed">
          ${escapeHtml(about.teamDescription)}
        </p>
      </div>
    </section>
    
    <!-- Why Choose Us -->
    <section class="py-16 lg:py-24 ${theme.surface}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold ${theme.text} mb-12 text-center">Why Choose ${escapeHtml(options.businessName)}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${about.whyChooseUs
            .map(
              (reason) => `
            <div class="flex items-start ${theme.background} rounded-xl p-6 shadow-sm">
              <div class="flex-shrink-0 w-10 h-10 ${theme.secondary} ${theme.primaryText} rounded-full flex items-center justify-center mr-4">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p class="${theme.text} text-lg">${escapeHtml(reason)}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </section>
    
    <!-- CTA Section -->
    <section class="py-16 lg:py-20 ${theme.primary}">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-bold text-white mb-6">Ready to Work With Us?</h2>
        <a href="contact.html" class="inline-block bg-white ${theme.primaryText} px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 hover:bg-gray-100 shadow-lg">
          Get in Touch
        </a>
      </div>
    </section>
  `;

  return buildPageWrapper(
    options,
    theme,
    "about",
    "About Us",
    `Learn about ${options.businessName} - ${about.missionStatement}`,
    bodyContent
  );
}

function buildServicesPage(options: SiteBuildOptions, theme: ThemeColors): string {
  const services = options.content.services;

  const bodyContent = `
    <!-- Page Header -->
    <section class="${theme.surface} py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl md:text-5xl font-bold ${theme.text} mb-4">${escapeHtml(services.introHeadline)}</h1>
        <p class="text-xl ${theme.textMuted} max-w-3xl mx-auto">
          ${escapeHtml(services.introDescription)}
        </p>
      </div>
    </section>
    
    <!-- Services Grid -->
    <section class="py-16 lg:py-24 ${theme.background}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          ${services.services
            .map(
              (service) => `
            <div class="${theme.surface} rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
              <h3 class="text-2xl font-bold ${theme.text} mb-4">${escapeHtml(service.name)}</h3>
              <p class="${theme.textMuted} mb-6">${escapeHtml(service.shortDescription)}</p>
              
              <h4 class="text-sm font-semibold ${theme.text} uppercase tracking-wide mb-3">Benefits</h4>
              <ul class="space-y-2 mb-6">
                ${service.benefits
                  .map(
                    (benefit) => `
                  <li class="flex items-start">
                    <svg class="w-5 h-5 ${theme.accent} mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    <span class="${theme.textMuted}">${escapeHtml(benefit)}</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>
              
              <a href="contact.html" class="inline-flex items-center ${theme.primaryText} font-semibold hover:underline">
                ${escapeHtml(service.callToAction)}
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </section>
    
    <!-- CTA Section -->
    <section class="py-16 lg:py-20 ${theme.primary}">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-bold text-white mb-6">Need Help Choosing a Service?</h2>
        <p class="text-xl text-white/90 mb-8">Contact us for a free consultation and we'll help you find the perfect solution.</p>
        <a href="contact.html" class="inline-block bg-white ${theme.primaryText} px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 hover:bg-gray-100 shadow-lg">
          Get a Free Quote
        </a>
      </div>
    </section>
  `;

  return buildPageWrapper(
    options,
    theme,
    "services",
    "Our Services",
    `Explore our professional services - ${services.introDescription}`,
    bodyContent
  );
}

function buildContactPage(options: SiteBuildOptions, theme: ThemeColors): string {
  const contact = options.content.contact;
  const hours = contact.businessHours;

  const hoursArray = [
    { day: "Monday", hours: hours.monday },
    { day: "Tuesday", hours: hours.tuesday },
    { day: "Wednesday", hours: hours.wednesday },
    { day: "Thursday", hours: hours.thursday },
    { day: "Friday", hours: hours.friday },
    { day: "Saturday", hours: hours.saturday },
    { day: "Sunday", hours: hours.sunday },
  ];

  const bodyContent = `
    <!-- Page Header -->
    <section class="${theme.surface} py-16 lg:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl md:text-5xl font-bold ${theme.text} mb-4">${escapeHtml(contact.headline)}</h1>
        <p class="text-xl ${theme.textMuted} max-w-2xl mx-auto">
          ${escapeHtml(contact.subheadline)}
        </p>
      </div>
    </section>
    
    <!-- Contact Section -->
    <section class="py-16 lg:py-24 ${theme.background}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <!-- Contact Form -->
          <div class="${theme.surface} rounded-xl p-8 shadow-sm">
            <h2 class="text-2xl font-bold ${theme.text} mb-6">Send Us a Message</h2>
            <p class="${theme.textMuted} mb-8">${escapeHtml(contact.contactIntro)}</p>
            
            <form action="#" method="POST" class="space-y-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label for="firstName" class="block text-sm font-medium ${theme.text} mb-2">First Name</label>
                  <input type="text" id="firstName" name="firstName" required
                         class="w-full px-4 py-3 rounded-lg border ${theme.border} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors">
                </div>
                <div>
                  <label for="lastName" class="block text-sm font-medium ${theme.text} mb-2">Last Name</label>
                  <input type="text" id="lastName" name="lastName" required
                         class="w-full px-4 py-3 rounded-lg border ${theme.border} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors">
                </div>
              </div>
              
              <div>
                <label for="email" class="block text-sm font-medium ${theme.text} mb-2">Email</label>
                <input type="email" id="email" name="email" required
                       class="w-full px-4 py-3 rounded-lg border ${theme.border} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors">
              </div>
              
              <div>
                <label for="phone" class="block text-sm font-medium ${theme.text} mb-2">Phone (optional)</label>
                <input type="tel" id="phone" name="phone"
                       class="w-full px-4 py-3 rounded-lg border ${theme.border} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors">
              </div>
              
              <div>
                <label for="message" class="block text-sm font-medium ${theme.text} mb-2">Message</label>
                <textarea id="message" name="message" rows="5" required
                          class="w-full px-4 py-3 rounded-lg border ${theme.border} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"></textarea>
              </div>
              
              <button type="submit" class="w-full ${theme.primary} ${theme.primaryHover} text-white py-4 px-6 rounded-lg font-semibold text-lg transition-colors duration-200 shadow-lg">
                ${escapeHtml(contact.formCta)}
              </button>
            </form>
          </div>
          
          <!-- Contact Info & Hours -->
          <div class="space-y-8">
            <!-- Contact Details -->
            <div class="${theme.surface} rounded-xl p-8 shadow-sm">
              <h2 class="text-2xl font-bold ${theme.text} mb-6">Contact Information</h2>
              <div class="space-y-4">
                ${
                  options.phone
                    ? `
                <div class="flex items-center">
                  <div class="w-10 h-10 ${theme.secondary} ${theme.primaryText} rounded-lg flex items-center justify-center mr-4">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm ${theme.textMuted}">Phone</p>
                    <a href="tel:${escapeHtml(options.phone)}" class="${theme.text} font-medium hover:${theme.primaryText}">${escapeHtml(options.phone)}</a>
                  </div>
                </div>
                `
                    : ""
                }
                
                <div class="flex items-center">
                  <div class="w-10 h-10 ${theme.secondary} ${theme.primaryText} rounded-lg flex items-center justify-center mr-4">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm ${theme.textMuted}">Email</p>
                    <a href="mailto:${escapeHtml(options.email)}" class="${theme.text} font-medium hover:${theme.primaryText}">${escapeHtml(options.email)}</a>
                  </div>
                </div>
                
                ${
                  options.city
                    ? `
                <div class="flex items-center">
                  <div class="w-10 h-10 ${theme.secondary} ${theme.primaryText} rounded-lg flex items-center justify-center mr-4">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm ${theme.textMuted}">Location</p>
                    <p class="${theme.text} font-medium">${escapeHtml(options.city)}</p>
                  </div>
                </div>
                `
                    : ""
                }
              </div>
            </div>
            
            <!-- Business Hours -->
            <div class="${theme.surface} rounded-xl p-8 shadow-sm">
              <h2 class="text-2xl font-bold ${theme.text} mb-6">Business Hours</h2>
              <div class="space-y-3">
                ${hoursArray
                  .map(
                    (item) => `
                  <div class="flex justify-between items-center py-2 border-b ${theme.border} last:border-0">
                    <span class="${theme.textMuted}">${item.day}</span>
                    <span class="${theme.text} font-medium">${escapeHtml(item.hours)}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  return buildPageWrapper(
    options,
    theme,
    "contact",
    "Contact Us",
    `Get in touch with ${options.businessName} - ${contact.subheadline}`,
    bodyContent
  );
}

export async function buildStaticSiteBundle(options: SiteBuildOptions): Promise<SiteBundle> {
  const theme = getTheme(options.colorTheme);

  const files = [
    {
      path: "index.html",
      content: buildHomePage(options, theme),
      contentType: "text/html",
    },
    {
      path: "about.html",
      content: buildAboutPage(options, theme),
      contentType: "text/html",
    },
    {
      path: "services.html",
      content: buildServicesPage(options, theme),
      contentType: "text/html",
    },
    {
      path: "contact.html",
      content: buildContactPage(options, theme),
      contentType: "text/html",
    },
  ];

  return { files };
}
