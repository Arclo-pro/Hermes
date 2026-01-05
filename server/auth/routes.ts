import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { hashPassword, verifyPassword, getSessionUser, requireAuth } from "./session";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().optional(),
});

const selectWebsiteSchema = z.object({
  website_id: z.string().min(1, "Website ID required"),
});

export function registerAuthRoutes(app: Express): void {
  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.errors[0]?.message || "Validation failed" 
        });
      }

      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: "Invalid email or password" 
        });
      }

      const validPassword = await verifyPassword(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ 
          success: false, 
          error: "Invalid email or password" 
        });
      }

      // Update login timestamp
      await storage.updateUserLogin(user.id);

      // Set session
      req.session.userId = user.id;
      req.session.activeWebsiteId = user.defaultWebsiteId || undefined;

      const sessionUser = await getSessionUser(user.id);

      return res.json({
        success: true,
        user: sessionUser,
      });
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Login failed" 
      });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("[Auth] Logout error:", err);
        return res.status(500).json({ success: false, error: "Logout failed" });
      }
      res.clearCookie('arclo.sid');
      return res.json({ success: true });
    });
  });

  // GET /api/auth/session
  app.get("/api/auth/session", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.json({ authenticated: false });
      }

      const sessionUser = await getSessionUser(req.session.userId);
      if (!sessionUser) {
        req.session.destroy(() => {});
        return res.json({ authenticated: false });
      }

      return res.json({
        authenticated: true,
        user: sessionUser,
        active_website_id: req.session.activeWebsiteId || null,
      });
    } catch (error: any) {
      console.error("[Auth] Session check error:", error);
      return res.json({ authenticated: false });
    }
  });

  // POST /api/auth/register (for initial setup/testing)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.errors[0]?.message || "Validation failed" 
        });
      }

      const { email, password, displayName } = parsed.data;

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: "Email already registered" 
        });
      }

      // Create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash,
        displayName: displayName || email.split('@')[0],
        role: 'user',
        plan: 'free',
        addons: {},
      });

      // Auto-login after registration
      req.session.userId = user.id;
      const sessionUser = await getSessionUser(user.id);

      return res.status(201).json({
        success: true,
        user: sessionUser,
      });
    } catch (error: any) {
      console.error("[Auth] Registration error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Registration failed" 
      });
    }
  });

  // POST /api/websites/select - Select active website
  app.post("/api/websites/select", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = selectWebsiteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.errors[0]?.message || "Validation failed" 
        });
      }

      const { website_id } = parsed.data;
      const userId = req.session.userId!;

      // Verify user has access to this website
      const userWebsites = await storage.getUserWebsites(userId);
      if (!userWebsites.includes(website_id)) {
        return res.status(403).json({ 
          success: false, 
          error: "Access denied to this website" 
        });
      }

      // Update session and user default
      req.session.activeWebsiteId = website_id;
      await storage.updateUserDefaultWebsite(userId, website_id);

      return res.json({
        success: true,
        active_website_id: website_id,
      });
    } catch (error: any) {
      console.error("[Auth] Select website error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to select website" 
      });
    }
  });
}
