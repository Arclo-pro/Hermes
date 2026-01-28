import { Router } from "express";
import { z } from "zod";
import { blogContentService, type BlogGenerationRequest } from "../services/blogContentService";
import { logger } from "../utils/logger";
import { apiKeyAuth } from "../middleware/apiAuth";

const router = Router();

// Schema validation
const generateBlogSchema = z.object({
  siteId: z.string().min(1, "siteId is required"),
  topic: z.string().min(10, "Topic must be at least 10 characters"),
  keywords: z.string().min(5, "Keywords must be at least 5 characters"),
  city: z.string().optional(),
  imageStyle: z.string().optional(),
  targetWordCount: z.number().min(1000).max(5000).optional(),
  author: z.string().optional(),
  category: z.string().optional(),
});

const generateTitleSchema = z.object({
  keywords: z.string().min(1, "Keywords are required"),
  city: z.string().optional(),
});

/**
 * POST /api/content/generate-blog
 * Generate a new blog post for a site
 */
router.post("/generate-blog", apiKeyAuth, async (req, res) => {
  try {
    const validated = generateBlogSchema.parse(req.body);

    logger.info("ContentRoutes", "Blog generation request received", {
      siteId: validated.siteId,
      topic: validated.topic,
    });

    const result = await blogContentService.generateBlog(validated as BlogGenerationRequest);

    res.json({
      success: true,
      data: result,
      message: `Blog generated successfully! Score: ${result.seoScore}/100 | Words: ${result.wordCount}`,
    });
  } catch (error: any) {
    logger.error("ContentRoutes", "Blog generation failed", { error: error.message });

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || "Blog generation failed",
    });
  }
});

/**
 * POST /api/content/generate-title
 * Generate a blog title from keywords
 */
router.post("/generate-title", apiKeyAuth, async (req, res) => {
  try {
    const validated = generateTitleSchema.parse(req.body);

    const title = await blogContentService.generateTitle(
      validated.keywords,
      validated.city
    );

    res.json({
      success: true,
      data: { title },
    });
  } catch (error: any) {
    logger.error("ContentRoutes", "Title generation failed", { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message || "Title generation failed",
    });
  }
});

/**
 * POST /api/content/publish/:postId
 * Publish a draft blog post
 */
router.post("/publish/:postId", apiKeyAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await blogContentService.publishBlogPost(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Blog post not found",
      });
    }

    res.json({
      success: true,
      data: post,
      message: "Blog post published successfully",
    });
  } catch (error: any) {
    logger.error("ContentRoutes", "Publish failed", { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message || "Publish failed",
    });
  }
});

/**
 * GET /api/content/posts/:siteId
 * Get all blog posts for a site
 */
router.get("/posts/:siteId", apiKeyAuth, async (req, res) => {
  try {
    const { siteId } = req.params;

    const posts = await blogContentService.getBlogPostsBySite(siteId);

    res.json({
      success: true,
      data: posts,
      total: posts.length,
    });
  } catch (error: any) {
    logger.error("ContentRoutes", "Get posts failed", { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch posts",
    });
  }
});

/**
 * GET /api/content/post/:postId
 * Get a single blog post by ID
 */
router.get("/post/:postId", apiKeyAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await blogContentService.getBlogPost(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Blog post not found",
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error: any) {
    logger.error("ContentRoutes", "Get post failed", { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch post",
    });
  }
});

export default router;
