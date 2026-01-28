/**
 * Step 7.1: Website ID Validation Middleware
 *
 * Provides middleware for enforcing tenant isolation by validating
 * and requiring website_id in API requests.
 */

import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { websites } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface WebsiteIdRequest extends Request {
  websiteId?: string;
  website?: any;
}

/**
 * Middleware to require and validate websiteId from query parameters
 *
 * Usage:
 * ```typescript
 * app.get("/api/data", requireWebsiteId, async (req: WebsiteIdRequest, res) => {
 *   const { websiteId } = req;
 *   // websiteId is guaranteed to be present and valid
 * });
 * ```
 */
export function requireWebsiteId(
  req: WebsiteIdRequest,
  res: Response,
  next: NextFunction
): void {
  const websiteId = req.query.websiteId as string | undefined;

  if (!websiteId) {
    res.status(400).json({
      error: "websiteId query parameter is required",
      message: "Step 7.1: All API requests must include websiteId for tenant isolation",
    });
    return;
  }

  // Attach to request for downstream handlers
  req.websiteId = websiteId;
  next();
}

/**
 * Middleware to require, validate, and verify websiteId exists in database
 *
 * This performs an additional database check to ensure the website exists.
 *
 * Usage:
 * ```typescript
 * app.get("/api/data", requireAndVerifyWebsiteId, async (req: WebsiteIdRequest, res) => {
 *   const { websiteId, website } = req;
 *   // Both are guaranteed to exist
 * });
 * ```
 */
export async function requireAndVerifyWebsiteId(
  req: WebsiteIdRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const websiteId = req.query.websiteId as string | undefined;

  if (!websiteId) {
    res.status(400).json({
      error: "websiteId query parameter is required",
      message: "Step 7.1: All API requests must include websiteId for tenant isolation",
    });
    return;
  }

  try {
    // Verify website exists
    const [website] = await db
      .select()
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website) {
      res.status(404).json({
        error: "website_not_found",
        message: `Website with id ${websiteId} does not exist`,
      });
      return;
    }

    // Attach to request for downstream handlers
    req.websiteId = websiteId;
    req.website = website;
    next();
  } catch (error) {
    res.status(500).json({
      error: "database_error",
      message: "Failed to verify website",
    });
  }
}

/**
 * Middleware to extract websiteId from request body (for POST/PUT requests)
 *
 * Usage:
 * ```typescript
 * app.post("/api/data", requireWebsiteIdFromBody, async (req: WebsiteIdRequest, res) => {
 *   const { websiteId } = req;
 *   // websiteId is guaranteed to be present
 * });
 * ```
 */
export function requireWebsiteIdFromBody(
  req: WebsiteIdRequest,
  res: Response,
  next: NextFunction
): void {
  const websiteId = req.body?.websiteId as string | undefined;

  if (!websiteId) {
    res.status(400).json({
      error: "websiteId field is required in request body",
      message: "Step 7.1: All API requests must include websiteId for tenant isolation",
    });
    return;
  }

  // Attach to request for downstream handlers
  req.websiteId = websiteId;
  next();
}

/**
 * Helper function to validate websiteId format (UUID)
 */
export function isValidWebsiteId(websiteId: string): boolean {
  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(websiteId);
}

/**
 * Middleware to validate websiteId format (without DB lookup)
 *
 * Usage:
 * ```typescript
 * app.get("/api/data", requireWebsiteId, validateWebsiteIdFormat, async (req, res) => {
 *   // websiteId is present and properly formatted
 * });
 * ```
 */
export function validateWebsiteIdFormat(
  req: WebsiteIdRequest,
  res: Response,
  next: NextFunction
): void {
  const { websiteId } = req;

  if (!websiteId || !isValidWebsiteId(websiteId)) {
    res.status(400).json({
      error: "invalid_website_id",
      message: "websiteId must be a valid UUID",
    });
    return;
  }

  next();
}
