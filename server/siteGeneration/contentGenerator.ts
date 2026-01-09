import OpenAI from "openai";
import { z } from "zod";
import { logger } from "../utils/logger";

const ValuePropositionSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
});

const ServiceContentSchema = z.object({
  name: z.string(),
  shortDescription: z.string(),
  benefits: z.array(z.string()),
  callToAction: z.string(),
});

const HomePageContentSchema = z.object({
  heroHeadline: z.string(),
  heroSubheadline: z.string(),
  valuePropositions: z.array(ValuePropositionSchema),
  primaryCta: z.string(),
  secondaryCta: z.string().optional(),
  trustSignals: z.array(z.string()).optional(),
});

const AboutPageContentSchema = z.object({
  companyStory: z.string(),
  missionStatement: z.string(),
  teamDescription: z.string(),
  yearsInBusiness: z.string().optional(),
  whyChooseUs: z.array(z.string()),
});

const ServicesPageContentSchema = z.object({
  introHeadline: z.string(),
  introDescription: z.string(),
  services: z.array(ServiceContentSchema),
});

const BusinessHoursSchema = z.object({
  monday: z.string(),
  tuesday: z.string(),
  wednesday: z.string(),
  thursday: z.string(),
  friday: z.string(),
  saturday: z.string(),
  sunday: z.string(),
});

const ContactPageContentSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  contactIntro: z.string(),
  businessHours: BusinessHoursSchema,
  formCta: z.string(),
  mapDescription: z.string().optional(),
});

const GeneratedContentSchema = z.object({
  home: HomePageContentSchema,
  about: AboutPageContentSchema,
  services: ServicesPageContentSchema,
  contact: ContactPageContentSchema,
  seoMetadata: z.object({
    siteTitle: z.string(),
    siteDescription: z.string(),
    keywords: z.array(z.string()),
  }),
});

export type GeneratedContent = z.infer<typeof GeneratedContentSchema>;
export type HomePageContent = z.infer<typeof HomePageContentSchema>;
export type AboutPageContent = z.infer<typeof AboutPageContentSchema>;
export type ServicesPageContent = z.infer<typeof ServicesPageContentSchema>;
export type ContactPageContent = z.infer<typeof ContactPageContentSchema>;

export interface BusinessInfo {
  businessName: string;
  businessCategory: string;
  city?: string;
  description?: string;
  services?: string[];
  phone?: string;
  email: string;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!apiKey) {
    throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY.");
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

function buildContentPrompt(businessInfo: BusinessInfo): string {
  const location = businessInfo.city ? ` in ${businessInfo.city}` : "";
  const servicesText = businessInfo.services?.length
    ? `Services offered: ${businessInfo.services.join(", ")}`
    : "Generate 3-5 relevant services based on the business category";

  return `Generate professional website content for a ${businessInfo.businessCategory} business called "${businessInfo.businessName}"${location}.

Business Details:
- Name: ${businessInfo.businessName}
- Category: ${businessInfo.businessCategory}
- Location: ${businessInfo.city || "Not specified"}
- Description: ${businessInfo.description || "Not provided"}
- ${servicesText}
- Contact Email: ${businessInfo.email}
- Phone: ${businessInfo.phone || "Not provided"}

Generate compelling, professional content for all 4 pages of the website:

1. HOME PAGE:
   - A powerful hero headline that captures attention (max 10 words)
   - A subheadline that explains the value proposition (max 25 words)
   - 3 value propositions with titles and descriptions
   - Primary CTA button text
   - Optional secondary CTA
   - 2-3 trust signals

2. ABOUT PAGE:
   - Company story (2-3 paragraphs, warm and professional tone)
   - Mission statement (1-2 sentences)
   - Team description (1 paragraph)
   - 3-4 reasons why customers should choose this business

3. SERVICES PAGE:
   - Intro headline
   - Intro description (2-3 sentences)
   - For each service: name, short description, 3 benefits, and a CTA

4. CONTACT PAGE:
   - Headline and subheadline
   - Contact intro paragraph
   - Typical business hours for a ${businessInfo.businessCategory}
   - Form CTA text

5. SEO METADATA:
   - Site title (includes business name and key service)
   - Site description (150-160 characters)
   - 5-8 relevant keywords

Make the content:
- Professional yet approachable
- Focused on customer benefits
- Action-oriented with clear CTAs
- Locally relevant if a city is provided
- Industry-appropriate for ${businessInfo.businessCategory}`;
}

export async function generateWebsiteContent(businessInfo: BusinessInfo): Promise<GeneratedContent> {
  const startTime = Date.now();
  
  logger.info("ContentGenerator", "Starting website content generation", {
    businessName: businessInfo.businessName,
    category: businessInfo.businessCategory,
    city: businessInfo.city,
  });

  try {
    const openai = getOpenAIClient();
    const prompt = buildContentPrompt(businessInfo);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert website copywriter specializing in small business websites. Generate compelling, professional content that converts visitors into customers. Always maintain a consistent brand voice and focus on customer benefits. You MUST respond with valid JSON matching the exact schema requested.",
        },
        {
          role: "user",
          content: prompt + "\n\nRespond with valid JSON matching this schema:\n" + JSON.stringify({
            home: { heroHeadline: "string", heroSubheadline: "string", valuePropositions: [{ title: "string", description: "string" }], primaryCta: "string", secondaryCta: "string", trustSignals: ["string"] },
            about: { companyStory: "string", missionStatement: "string", teamDescription: "string", yearsInBusiness: "string", whyChooseUs: ["string"] },
            services: { introHeadline: "string", introDescription: "string", services: [{ name: "string", shortDescription: "string", benefits: ["string"], callToAction: "string" }] },
            contact: { headline: "string", subheadline: "string", contactIntro: "string", businessHours: { monday: "string", tuesday: "string", wednesday: "string", thursday: "string", friday: "string", saturday: "string", sunday: "string" }, formCta: "string", mapDescription: "string" },
            seoMetadata: { siteTitle: "string", siteDescription: "string", keywords: ["string"] }
          }, null, 2),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      throw new Error("OpenAI returned empty content");
    }

    const parsed = JSON.parse(rawContent);
    const content = GeneratedContentSchema.parse(parsed);

    const durationMs = Date.now() - startTime;
    logger.info("ContentGenerator", "Website content generated successfully", {
      businessName: businessInfo.businessName,
      durationMs,
      servicesCount: content.services.services.length,
    });

    return content;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    
    logger.error("ContentGenerator", "Failed to generate website content", {
      businessName: businessInfo.businessName,
      error: error.message,
      durationMs,
    });

    if (error.code === "insufficient_quota") {
      throw new Error("OpenAI API quota exceeded. Please try again later.");
    }

    if (error.code === "rate_limit_exceeded") {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }

    throw new Error(`Content generation failed: ${error.message}`);
  }
}

export async function generatePageContent(
  businessInfo: BusinessInfo,
  page: "home" | "about" | "services" | "contact"
): Promise<HomePageContent | AboutPageContent | ServicesPageContent | ContactPageContent> {
  const fullContent = await generateWebsiteContent(businessInfo);
  return fullContent[page];
}

export { GeneratedContentSchema };
