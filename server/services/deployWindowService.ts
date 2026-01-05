import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { deployWindows, changes, type DeployWindow, type Change } from '@shared/schema';
import { eq, and, gte, desc, lte } from 'drizzle-orm';
import { changeLogService } from './changeLog';

export interface CreateWindowInput {
  websiteId: string;
  theme?: string;
  scheduledFor?: Date;
}

export class DeployWindowService {
  /**
   * Assign a change to a deploy window
   * Creates a new window if none exists for this week
   */
  async assignToDeployWindow(websiteId: string, changeId: string): Promise<string> {
    const change = await changeLogService.getChange(changeId);
    if (!change) {
      throw new Error(`Change not found: ${changeId}`);
    }

    // Determine theme based on change type
    const theme = this.getThemeForChange(change);
    
    // Find or create an appropriate window
    const window = await this.findOrCreateWindow(websiteId, theme, change.riskLevel);
    
    // Mark change as queued with this window
    await changeLogService.markQueued(changeId, window.deployWindowId);
    
    return window.deployWindowId;
  }

  /**
   * Get theme based on change properties
   */
  private getThemeForChange(change: Change): string {
    switch (change.changeType) {
      case 'technical':
        return 'Technical Cleanup';
      case 'performance':
        return 'Performance Optimization';
      case 'content':
        return 'Content Update';
      case 'config':
        return 'Configuration';
      default:
        return 'General';
    }
  }

  /**
   * Find existing window or create new one
   * Never mix high-risk with low-risk changes
   */
  async findOrCreateWindow(websiteId: string, theme: string, riskLevel: string): Promise<DeployWindow> {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Find a scheduled window for this week with matching theme
    // Don't mix high-risk changes with others
    const isHighRisk = riskLevel === 'high';
    const existingWindows = await db.select()
      .from(deployWindows)
      .where(and(
        eq(deployWindows.websiteId, websiteId),
        eq(deployWindows.status, 'scheduled'),
        gte(deployWindows.scheduledFor, now),
        lte(deployWindows.scheduledFor, weekFromNow)
      ))
      .orderBy(deployWindows.scheduledFor);

    // Try to find a matching window
    for (const window of existingWindows) {
      // Check if window theme matches and risk level is compatible
      if (window.theme === theme) {
        // Get existing changes in this window
        const windowChanges = await db.select()
          .from(changes)
          .where(eq(changes.deployWindowId, window.deployWindowId));
        
        const hasHighRisk = windowChanges.some(c => c.riskLevel === 'high');
        
        // Don't mix high-risk with non-high-risk
        if (isHighRisk === hasHighRisk) {
          return window;
        }
      }
    }

    // No suitable window found, create a new one
    return this.createWindow({
      websiteId,
      theme,
      scheduledFor: this.getNextScheduledTime(),
    });
  }

  /**
   * Get next scheduled time (next weekday at 10am)
   */
  private getNextScheduledTime(): Date {
    const now = new Date();
    const scheduledFor = new Date(now);
    
    // Schedule for next day at 10am
    scheduledFor.setDate(scheduledFor.getDate() + 1);
    scheduledFor.setHours(10, 0, 0, 0);
    
    // Skip weekends
    const dayOfWeek = scheduledFor.getDay();
    if (dayOfWeek === 0) scheduledFor.setDate(scheduledFor.getDate() + 1); // Sunday -> Monday
    if (dayOfWeek === 6) scheduledFor.setDate(scheduledFor.getDate() + 2); // Saturday -> Monday
    
    return scheduledFor;
  }

  /**
   * Create a new deploy window
   */
  async createWindow(input: CreateWindowInput): Promise<DeployWindow> {
    const deployWindowId = uuidv4();
    
    const [window] = await db.insert(deployWindows)
      .values({
        deployWindowId,
        websiteId: input.websiteId,
        theme: input.theme || 'General',
        scheduledFor: input.scheduledFor || this.getNextScheduledTime(),
        status: 'scheduled',
      })
      .returning();
    
    return window;
  }

  /**
   * Get upcoming windows for a website
   */
  async getScheduledWindows(websiteId: string): Promise<DeployWindow[]> {
    return db.select()
      .from(deployWindows)
      .where(and(
        eq(deployWindows.websiteId, websiteId),
        eq(deployWindows.status, 'scheduled')
      ))
      .orderBy(deployWindows.scheduledFor);
  }

  /**
   * Get a window by ID
   */
  async getWindow(deployWindowId: string): Promise<DeployWindow | undefined> {
    const [window] = await db.select()
      .from(deployWindows)
      .where(eq(deployWindows.deployWindowId, deployWindowId))
      .limit(1);
    return window;
  }

  /**
   * Get changes in a window
   */
  async getWindowChanges(deployWindowId: string): Promise<Change[]> {
    return db.select()
      .from(changes)
      .where(eq(changes.deployWindowId, deployWindowId));
  }

  /**
   * Execute a deploy window
   */
  async executeWindow(deployWindowId: string): Promise<void> {
    const window = await this.getWindow(deployWindowId);
    if (!window) {
      throw new Error(`Window not found: ${deployWindowId}`);
    }

    if (window.status !== 'scheduled') {
      throw new Error(`Window is not in scheduled status: ${window.status}`);
    }

    // Get all queued changes for this window
    const windowChanges = await this.getWindowChanges(deployWindowId);
    const queuedChanges = windowChanges.filter(c => c.status === 'queued');

    // Mark window as executed
    await db.update(deployWindows)
      .set({
        status: 'executed',
        executedAt: new Date(),
      })
      .where(eq(deployWindows.deployWindowId, deployWindowId));

    // Mark all changes as applied
    for (const change of queuedChanges) {
      await changeLogService.markApplied(change.changeId);
    }
  }

  /**
   * Cancel a deploy window
   */
  async cancelWindow(deployWindowId: string): Promise<void> {
    await db.update(deployWindows)
      .set({ status: 'canceled' })
      .where(eq(deployWindows.deployWindowId, deployWindowId));

    // Mark changes as skipped
    const windowChanges = await this.getWindowChanges(deployWindowId);
    for (const change of windowChanges) {
      if (change.status === 'queued') {
        await changeLogService.markSkipped(change.changeId, 'Deploy window canceled');
      }
    }
  }

  /**
   * Flag a window for regression
   */
  async flagRegression(deployWindowId: string, reasons: string[]): Promise<void> {
    await db.update(deployWindows)
      .set({
        regressionFlagged: true,
        regressionReasons: reasons,
      })
      .where(eq(deployWindows.deployWindowId, deployWindowId));
  }

  /**
   * Get recent windows (executed, rolled back, etc.)
   */
  async getRecentWindows(websiteId: string, limit: number = 10): Promise<DeployWindow[]> {
    return db.select()
      .from(deployWindows)
      .where(eq(deployWindows.websiteId, websiteId))
      .orderBy(desc(deployWindows.createdAt))
      .limit(limit);
  }
}

export const deployWindowService = new DeployWindowService();
