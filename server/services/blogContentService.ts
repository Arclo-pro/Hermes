import OpenAI from "openai";
import { db } from "../db";
import { blogPosts, usedBlogImages } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import { logger } from "../utils/logger";

/**
 * Normalize a slug for SEO best practices
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI not configured. Please set OPENAI_API_KEY environment variable.");
    }
    openai = new OpenAI({
      baseURL: process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey,
    });
  }
  return openai;
}

export interface BlogGenerationRequest {
  siteId: string;
  topic: string;
  keywords: string;
  city?: string;
  imageStyle?: string;
  targetWordCount?: number;
  author?: string;
  category?: string;
}

export interface BlogGenerationResult {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  metaDescription: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  featuredImageAlt: string;
  contentImages: Array<{ url: string; alt: string; description: string }>;
  internalLinks: string[];
  externalLinks: string[];
  seoScore: number;
  wordCount: number;
  validationResults: {
    wordCountValid: boolean;
    metaDescriptionValid: boolean;
    h1Count: number;
    internalLinkCount: number;
    externalLinkCount: number;
    uniqueAnchorText: boolean;
  };
}

export class BlogContentService {
  /**
   * Pre-validate input before running expensive GPT calls
   */
  private preValidateInput(request: BlogGenerationRequest): void {
    const errors: string[] = [];

    if (!request.siteId?.trim()) {
      errors.push("Missing siteId");
    }

    if (!request.topic?.trim()) {
      errors.push("Missing topic");
    }

    if (!request.keywords?.trim()) {
      errors.push("Missing keywords");
    }

    if (request.topic && request.topic.length < 10) {
      errors.push("Topic too short (minimum 10 characters)");
    }

    if (request.keywords && request.keywords.length < 5) {
      errors.push("Keywords too short (minimum 5 characters)");
    }

    if (errors.length > 0) {
      throw new Error(`Input Validation Failed: ${errors.join(", ")}`);
    }

    logger.info("BlogContentService", "Input validation passed", { siteId: request.siteId, topic: request.topic });
  }

  /**
   * Fetch unique images from Unsplash that haven't been used
   */
  private async fetchUniqueImages(
    siteId: string,
    query: string,
    count: number,
    retryCount = 0
  ): Promise<Array<{ url: string; description: string }>> {
    const MAX_RETRIES = 3;

    try {
      const usedImages = await db.select({ imageUrl: usedBlogImages.imageUrl })
        .from(usedBlogImages)
        .where(eq(usedBlogImages.siteId, siteId));
      const usedUrls = new Set(usedImages.map(img => img.imageUrl));

      const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
      if (!unsplashKey) {
        logger.warn("BlogContentService", "UNSPLASH_ACCESS_KEY not set, using fallback images");
        return this.generateFallbackImages(query, count);
      }

      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&client_id=${unsplashKey}`
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.statusText}`);
      }

      const data = await response.json();
      const availableImages = data.results
        .filter((img: any) => !usedUrls.has(img.urls.regular))
        .slice(0, count)
        .map((img: any) => ({
          url: img.urls.regular,
          description: img.description || img.alt_description || query,
        }));

      const successfullyReserved: Array<{ url: string; description: string }> = [];

      for (const img of availableImages) {
        try {
          await db.insert(usedBlogImages).values({
            siteId,
            imageUrl: img.url,
            description: img.description,
            altText: img.description,
            source: "unsplash",
          });
          successfullyReserved.push(img);
        } catch (error) {
          logger.debug("BlogContentService", "Image already taken, skipping", { url: img.url });
        }

        if (successfullyReserved.length >= count) {
          break;
        }
      }

      if (successfullyReserved.length < count && retryCount < MAX_RETRIES) {
        const additionalNeeded = count - successfullyReserved.length;
        const additionalImages = await this.fetchUniqueImages(siteId, query, additionalNeeded, retryCount + 1);
        return [...successfullyReserved, ...additionalImages];
      }

      return successfullyReserved;
    } catch (error) {
      logger.error("BlogContentService", "Error fetching Unsplash images", { error });
      return this.generateFallbackImages(query, count);
    }
  }

  private generateFallbackImages(query: string, count: number): Array<{ url: string; description: string }> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    return Array(count).fill(null).map((_, i) => ({
      url: `/site-assets/stock_images/fallback-${timestamp}-${randomId}-${i}.jpg`,
      description: query,
    }));
  }

  /**
   * Count words in HTML content
   */
  private countWords(content: string): number {
    const textOnly = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return textOnly.split(' ').filter(word => word.length > 0).length;
  }

  /**
   * Calculate SEO score based on quality standards
   */
  private calculateSEOScore(
    content: string,
    metaDescription: string,
    title: string,
    internalLinks: string[],
    externalLinks: string[],
    keywords: string
  ): { score: number; validationResults: any } {
    let score = 100;
    const primaryKeyword = keywords.split(',')[0]?.trim().toLowerCase() || '';

    // Meta description length (120-160 chars)
    if (metaDescription.length < 120 || metaDescription.length > 160) {
      score -= 25;
    }

    // Word count (1800-2200 words)
    const wordCount = this.countWords(content);
    if (wordCount < 1800 || wordCount > 2200) {
      score -= 25;
    }

    // H1 tag check
    const h1Matches = content.match(/<h1[^>]*>/gi);
    const h1Count = h1Matches ? h1Matches.length : 0;
    if (h1Count === 0 || h1Count > 3) {
      score -= 20;
    }

    // H2 tags
    const h2Matches = content.match(/<h2[^>]*>/gi);
    const h2Count = h2Matches ? h2Matches.length : 0;
    if (h2Count < 6) {
      score -= 5;
    }

    // Internal links
    if (internalLinks.length < 4) {
      score -= 8;
    }

    // External links
    if (externalLinks.length < 3) {
      score -= 8;
    }

    // Unique anchor text
    const anchorTextSet = new Set<string>();
    const anchorMatches = Array.from(content.matchAll(/<a[^>]*>([^<]+)<\/a>/gi));
    let duplicateAnchors = false;
    for (const match of anchorMatches) {
      const anchorText = match[1].toLowerCase().trim();
      if (anchorTextSet.has(anchorText)) {
        duplicateAnchors = true;
        break;
      }
      anchorTextSet.add(anchorText);
    }
    if (duplicateAnchors) {
      score -= 10;
    }

    // Title length
    if (title.length < 30 || title.length > 65) {
      score -= 5;
    }

    // Primary keyword in title
    if (primaryKeyword && !title.toLowerCase().includes(primaryKeyword)) {
      score -= 8;
    }

    // Primary keyword in meta description
    if (primaryKeyword && !metaDescription.toLowerCase().includes(primaryKeyword)) {
      score -= 8;
    }

    const h3Matches = content.match(/<h3[^>]*>/gi);
    const h3Count = h3Matches ? h3Matches.length : 0;

    return {
      score: Math.max(0, score),
      validationResults: {
        wordCountValid: wordCount >= 1800 && wordCount <= 2200,
        metaDescriptionValid: metaDescription.length >= 120 && metaDescription.length <= 160,
        h1Count,
        h2Count,
        h3Count,
        internalLinkCount: internalLinks.length,
        externalLinkCount: externalLinks.length,
        uniqueAnchorText: !duplicateAnchors,
        wordCount,
      },
    };
  }

  /**
   * Generate a blog title from keywords using OpenAI
   */
  async generateTitle(keywords: string, city?: string): Promise<string> {
    const cityContext = city ? ` Focus on ${city} if relevant.` : '';

    const prompt = `Generate ONE engaging blog title for a mental health clinic's blog.

Keywords: ${keywords}${cityContext}

Requirements:
- Make it attention-grabbing and emotionally compelling
- Keep it under 70 characters for SEO
- Appeal to people seeking mental health help

Return ONLY the title, nothing else.`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 100,
    });

    return completion.choices[0].message.content?.trim() || "Understanding Mental Health: A Complete Guide";
  }

  /**
   * Main blog generation method using 3-stage approach
   */
  async generateBlog(request: BlogGenerationRequest): Promise<BlogGenerationResult> {
    const { siteId, topic, keywords, city, imageStyle, author, category } = request;

    this.preValidateInput(request);

    const targetWordCount = request.targetWordCount || 2000;
    const primaryKeyword = keywords.split(',')[0].trim();

    logger.info("BlogContentService", "Starting 3-stage blog generation", { siteId, topic });

    try {
      // STAGE 1: PLANNER
      logger.info("BlogContentService", "Stage 1: Creating content plan");
      const plannerPrompt = `Create a detailed content outline for a mental health blog about: ${topic}

TARGET: ${targetWordCount - 200}-${targetWordCount + 200} words
PRIMARY KEYWORD: ${primaryKeyword}

OUTPUT JSON:
{
  "title": "30-65 chars with keyword '${primaryKeyword}'",
  "metaDescription": "Exactly 120-160 chars with keyword",
  "slug": "url-friendly-slug",
  "outline": [
    {"section": "intro", "wordBudget": 220, "notes": "Include keyword in first paragraph"},
    {"section": "h2", "heading": "Section Title", "wordBudget": 280, "notes": "Include internal link"},
    ... (5-7 more H2 sections)
    {"section": "conclusion", "wordBudget": 80, "notes": "Final CTA"}
  ],
  "totalWordBudget": ${targetWordCount}
}`;

      const plannerCompletion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: plannerPrompt }],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const rawPlanContent = plannerCompletion.choices[0].message.content || "{}";
      const cleanPlanContent = rawPlanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const outline = JSON.parse(cleanPlanContent);

      // STAGE 2: DRAFTER
      logger.info("BlogContentService", "Stage 2: Writing content");
      const drafterPrompt = `Write a comprehensive ${targetWordCount}-word blog following this outline.

OUTLINE:
${JSON.stringify(outline, null, 2)}

CONTENT REQUIREMENTS:
1. Include primary keyword "${primaryKeyword}" naturally throughout
2. Each H2 section should be detailed with examples
3. Include clear CTAs

RETURN JSON:
{
  "content": "<h1>...</h1><p>Intro...</p><h2>Section 1</h2>...",
  "finalWordCount": ${targetWordCount}
}`;

      const drafterCompletion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: drafterPrompt }],
        temperature: 0.6,
        max_tokens: 16000,
      });

      const rawDraftContent = drafterCompletion.choices[0].message.content || "{}";
      const cleanDraftContent = rawDraftContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const draftedContent = JSON.parse(cleanDraftContent);

      // STAGE 3: FORMATTER
      logger.info("BlogContentService", "Stage 3: Formatting final output");
      const formatterPrompt = `Assemble the final blog post JSON with all elements.

TITLE: ${outline.title}
META DESCRIPTION: ${outline.metaDescription}
SLUG: ${outline.slug}
CONTENT: ${draftedContent.content}

OUTPUT JSON:
{
  "title": "${outline.title}",
  "metaDescription": "120-160 char description with keyword",
  "slug": "${outline.slug}",
  "excerpt": "First 200 chars as plain text",
  "content": "... COMPLETE HTML ...",
  "featuredImageQuery": "peaceful nature healing mental wellness",
  "contentImageQueries": ["professional therapy bright", "wellness mindfulness calm"],
  "internalLinks": ["/services", "/request-appointment"],
  "externalLinks": ["https://www.nimh.nih.gov/...", "https://www.apa.org/..."]
}`;

      const formatterCompletion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: formatterPrompt }],
        temperature: 0.3,
        max_tokens: 16000,
      });

      const rawResult = formatterCompletion.choices[0].message.content || "{}";
      const cleanResult = rawResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanResult);

      // Fetch images
      const featuredImages = await this.fetchUniqueImages(
        siteId,
        result.featuredImageQuery || imageStyle || "mental health wellness",
        1
      );
      const contentImages = await this.fetchUniqueImages(
        siteId,
        result.contentImageQueries?.[0] || "therapy wellness",
        2
      );

      // Calculate SEO score
      const validation = this.calculateSEOScore(
        result.content,
        result.metaDescription,
        result.title,
        result.internalLinks || [],
        result.externalLinks || [],
        keywords
      );

      // Save to database
      const blogPostData = {
        siteId,
        title: result.title,
        slug: normalizeSlug(result.slug),
        excerpt: result.excerpt,
        content: result.content,
        author: author || "Content Team",
        publishedDate: new Date().toISOString(),
        category: category || "Mental Health",
        featuredImage: featuredImages[0]?.url || null,
        isFeatured: true,
        status: "draft" as const,
        metaTitle: result.title,
        metaDescription: result.metaDescription,
        keywords: keywords.split(',').map(k => k.trim()),
        order: 0,
      };

      const [savedPost] = await db.insert(blogPosts)
        .values(blogPostData)
        .returning();

      // Update used images with blog post ID
      const allImageUrls = [
        featuredImages[0]?.url,
        ...contentImages.map(img => img.url)
      ].filter(Boolean);

      for (const imageUrl of allImageUrls) {
        await db.update(usedBlogImages)
          .set({ usedInBlogPostId: savedPost.id })
          .where(eq(usedBlogImages.imageUrl, imageUrl));
      }

      logger.info("BlogContentService", "Blog generated and saved", {
        siteId,
        postId: savedPost.id,
        score: validation.score,
        wordCount: validation.validationResults.wordCount,
      });

      return {
        id: savedPost.id,
        siteId,
        title: result.title,
        slug: savedPost.slug,
        metaDescription: result.metaDescription,
        content: result.content,
        excerpt: result.excerpt,
        featuredImage: featuredImages[0]?.url || "",
        featuredImageAlt: featuredImages[0]?.description || result.title,
        contentImages: contentImages.map(img => ({
          url: img.url,
          alt: img.description,
          description: img.description,
        })),
        internalLinks: result.internalLinks || [],
        externalLinks: result.externalLinks || [],
        seoScore: validation.score,
        wordCount: validation.validationResults.wordCount,
        validationResults: validation.validationResults,
      };
    } catch (error: any) {
      logger.error("BlogContentService", "Blog generation failed", {
        siteId,
        topic,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Publish a draft blog post
   */
  async publishBlogPost(postId: string): Promise<BlogPost> {
    const [published] = await db.update(blogPosts)
      .set({
        status: "published",
        publishedAt: new Date().toISOString(),
      })
      .where(eq(blogPosts.id, postId))
      .returning();

    return published;
  }

  /**
   * Get all blog posts for a site
   */
  async getBlogPostsBySite(siteId: string): Promise<BlogPost[]> {
    return db.select()
      .from(blogPosts)
      .where(eq(blogPosts.siteId, siteId))
      .orderBy(sql`${blogPosts.order} ASC`);
  }

  /**
   * Get a single blog post by ID
   */
  async getBlogPost(postId: string): Promise<BlogPost | undefined> {
    const [post] = await db.select()
      .from(blogPosts)
      .where(eq(blogPosts.id, postId));
    return post;
  }
}

// Export singleton instance
export const blogContentService = new BlogContentService();

// Export types
export type { BlogPost } from "@shared/schema";
