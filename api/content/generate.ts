import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";

/**
 * POST /api/content/generate
 * Generates content for a draft based on target keywords and content type.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { siteId, draftId, contentType, targetKeywords, targetUrl } = req.body;

  if (!siteId || !draftId) {
    return res.status(400).json({ error: "siteId and draftId are required" });
  }

  const pool = getPool();

  try {
    // Verify site ownership
    const siteResult = await pool.query(
      `SELECT id, base_url FROM sites WHERE site_id = $1 AND user_id = $2 LIMIT 1`,
      [siteId, user.id]
    );
    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }

    const siteNumericId = siteResult.rows[0].id;
    const baseUrl = siteResult.rows[0].base_url;

    // For now, simulate content generation with a delay
    // In production, this would call an AI content generation service
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate content based on type
    const generatedContent = generateContentByType(contentType, targetKeywords, targetUrl, baseUrl);

    // Store or update the draft (in production, this would go to a content_drafts table)
    // For now, we just return success
    console.log(`[ContentGenerate] Generated ${contentType} for site ${siteId}:`, {
      draftId,
      title: generatedContent.title,
      wordCount: generatedContent.content.split(/\s+/).length,
    });

    return res.json({
      success: true,
      draftId,
      generated: {
        title: generatedContent.title,
        content: generatedContent.content,
        metaDescription: generatedContent.metaDescription,
        wordCount: generatedContent.content.split(/\s+/).length,
        targetKeywords,
      },
    });
  } catch (error: any) {
    console.error("[ContentGenerate] Error:", error.message);
    return res.status(500).json({ error: "Failed to generate content" });
  }
}

interface GeneratedContent {
  title: string;
  content: string;
  metaDescription: string;
}

function generateContentByType(
  contentType: string,
  targetKeywords: string[] | null,
  targetUrl: string | null,
  baseUrl: string
): GeneratedContent {
  const primaryKeyword = targetKeywords?.[0] || "your topic";
  const formattedKeyword = capitalizeWords(primaryKeyword);

  switch (contentType) {
    case "blog_post":
      return generateBlogPost(primaryKeyword, formattedKeyword);
    case "service_page":
      return generateServicePage(primaryKeyword, formattedKeyword);
    case "landing_page":
      return generateLandingPage(primaryKeyword, formattedKeyword);
    case "page_edit":
      return generatePageEdit(primaryKeyword, targetUrl);
    default:
      return generateBlogPost(primaryKeyword, formattedKeyword);
  }
}

function generateBlogPost(keyword: string, formattedKeyword: string): GeneratedContent {
  return {
    title: `Understanding ${formattedKeyword}: A Comprehensive Guide`,
    metaDescription: `Learn everything you need to know about ${keyword}. Expert insights, treatment options, and practical guidance from our team of specialists.`,
    content: `# Understanding ${formattedKeyword}: A Comprehensive Guide

${formattedKeyword} is a topic that affects many individuals and families. In this comprehensive guide, we'll explore what you need to know, available treatment options, and how to take the next steps toward better outcomes.

## What is ${formattedKeyword}?

${formattedKeyword} encompasses a range of experiences and challenges. Understanding the fundamentals is the first step toward finding the right support and treatment approach for your unique situation.

## Signs and Symptoms

Recognizing the signs early can make a significant difference in treatment outcomes. Common indicators include:

- Changes in daily functioning
- Impact on relationships and work
- Physical and emotional symptoms
- Duration and intensity of experiences

## Treatment Options

Modern approaches to ${keyword} include several evidence-based methods:

### Therapy and Counseling

Professional therapy provides a safe space to explore challenges and develop coping strategies. Options include:

- Individual therapy
- Group therapy
- Family counseling
- Specialized treatment modalities

### Medical Interventions

When appropriate, medication can be an effective component of a comprehensive treatment plan. Our team works with each patient to determine the best approach.

## Finding the Right Care

Choosing a provider who understands your needs is essential. Look for:

- Licensed, experienced professionals
- Evidence-based treatment approaches
- Compassionate, patient-centered care
- Convenient location and scheduling

## Taking the Next Step

If you or someone you love is dealing with ${keyword}, know that help is available. Contact our team to schedule a consultation and learn more about your options.

---

*This content was generated as a starting point for your blog post. Please review and customize it with specific information about your practice, services, and expertise.*`,
  };
}

function generateServicePage(keyword: string, formattedKeyword: string): GeneratedContent {
  const location = keyword.includes("orlando") ? "Orlando" : "the Orlando area";

  return {
    title: `${formattedKeyword} Services in ${location}`,
    metaDescription: `Expert ${keyword} services in ${location}. Compassionate care from experienced professionals. Schedule your appointment today.`,
    content: `# ${formattedKeyword} Services in ${location}

## Expert Care, Personalized Approach

Our team provides comprehensive ${keyword} services designed to meet your unique needs. With years of experience and a commitment to evidence-based care, we're here to support you on your journey.

## Our Services Include

- Initial assessment and evaluation
- Personalized treatment planning
- Ongoing therapy and support
- Medication management when appropriate
- Family involvement and education

## Why Choose Us?

### Experienced Team
Our providers bring years of specialized experience in ${keyword}, ensuring you receive knowledgeable, effective care.

### Convenient Location
Located in ${location}, our office provides easy access for patients throughout Central Florida.

### Flexible Scheduling
We offer appointment times that work with your schedule, including early morning and evening availability.

## Getting Started

Taking the first step toward care is simple:

1. **Contact Us** - Call or fill out our online form
2. **Initial Consultation** - Meet with our team to discuss your needs
3. **Begin Treatment** - Start your personalized care plan

## Insurance and Payment

We accept most major insurance plans and offer flexible payment options. Contact our office to verify your coverage.

---

*Ready to take the next step? Contact us today to schedule your consultation.*`,
  };
}

function generateLandingPage(keyword: string, formattedKeyword: string): GeneratedContent {
  return {
    title: formattedKeyword,
    metaDescription: `Find ${keyword}. Expert care, compassionate support, and proven results. Schedule your consultation today.`,
    content: `# ${formattedKeyword}

## Finding the Right Care for You

When searching for ${keyword}, you deserve a provider who combines expertise with genuine compassion. Our team is dedicated to delivering exceptional care tailored to your unique needs.

## What Sets Us Apart

### Proven Results
Our evidence-based approach has helped countless patients achieve their goals.

### Patient-Centered Care
You're more than a diagnosis. We take time to understand your complete picture.

### Accessible Treatment
Convenient location, flexible scheduling, and insurance acceptance make care accessible.

## Services We Offer

- Comprehensive evaluations
- Personalized treatment plans
- Individual and group therapy options
- Medication management
- Ongoing support and follow-up

## Take the First Step

Don't wait to get the help you deserve. Contact us today to schedule your initial consultation.

**Call:** [Your Phone Number]
**Email:** [Your Email]
**Location:** [Your Address]

---

*Serving patients throughout Central Florida with compassionate, expert care.*`,
  };
}

function generatePageEdit(keyword: string, targetUrl: string | null): GeneratedContent {
  return {
    title: `Content Optimization for "${capitalizeWords(keyword)}"`,
    metaDescription: `Optimize this page for "${keyword}" to improve search rankings.`,
    content: `## Recommended Optimizations for "${capitalizeWords(keyword)}"

### Current Page: ${targetUrl || "/"}

To improve rankings for "${keyword}", consider the following optimizations:

### 1. Title Tag Update
Include the primary keyword near the beginning of your title tag while keeping it natural and compelling.

**Suggested:** Include "${keyword}" in the first 60 characters of your title.

### 2. Meta Description
Update the meta description to include the keyword and a clear call-to-action.

### 3. Header Optimization
- Ensure H1 includes or relates to "${keyword}"
- Add H2 subheadings that cover related topics
- Use natural keyword variations throughout

### 4. Content Enhancement
- Add 200-300 words of relevant content
- Include keyword naturally 2-3 times
- Add internal links to related pages
- Consider adding FAQ section

### 5. Schema Markup
Add appropriate structured data (LocalBusiness, Service, FAQPage) to enhance search appearance.

---

*Apply these optimizations to improve your ranking for "${keyword}" from position 11-20 to page 1.*`,
  };
}

function capitalizeWords(text: string): string {
  return text.split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
