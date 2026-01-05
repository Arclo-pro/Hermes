import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { storage } from "../storage";
import type { SessionUser, User } from "@shared/schema";
import crypto from "crypto";

// Bcrypt-compatible password hashing using Node.js crypto
// Using PBKDF2 with 100,000 iterations (OWASP recommended minimum)
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    activeWebsiteId?: string;
  }
}

// Setup session middleware
export function setupSession(app: Express): void {
  const PgSession = connectPgSimple(session);
  
  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'arclo.sid',
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  }));
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ 
      authenticated: false, 
      error: 'Authentication required' 
    });
    return;
  }
  next();
}

// Get session user data
export async function getSessionUser(userId: number): Promise<SessionUser | null> {
  const user = await storage.getUserById(userId);
  if (!user) return null;
  
  const websites = await storage.getUserWebsites(userId);
  
  return {
    user_id: user.id,
    email: user.email,
    display_name: user.displayName,
    websites,
    default_website_id: user.defaultWebsiteId,
    plan: user.plan,
    addons: {
      content_growth: user.addons?.content_growth ?? false,
      competitive_intel: user.addons?.competitive_intel ?? false,
      authority_signals: user.addons?.authority_signals ?? false,
    },
  };
}
