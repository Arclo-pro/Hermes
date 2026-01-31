/**
 * Migration Runner - Step 10.5: Schema & Version Management
 *
 * Safely applies database migrations with:
 * - Version tracking
 * - Checksum verification
 * - Rollback support
 * - Execution time tracking
 * - Idempotent execution
 */

import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { createHash } from 'crypto';
import { db } from '../db';
import { schemaMigrations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  path: string;
  sql: string;
  checksum: string;
}

export interface MigrationResult {
  version: string;
  name: string;
  status: 'applied' | 'skipped' | 'failed';
  executionTimeMs?: number;
  error?: string;
}

/**
 * Parse migration filename to extract version and name
 * Format: 001_add_feature_name.sql
 */
function parseMigrationFilename(filename: string): { version: string; name: string } | null {
  const match = filename.match(/^(\d{3})_(.+)\.sql$/);
  if (!match) return null;

  return {
    version: match[1],
    name: match[2],
  };
}

/**
 * Calculate checksum for migration content verification
 */
function calculateChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Load all migration files from the migrations directory
 */
export function loadMigrationFiles(migrationsDir: string): MigrationFile[] {
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Ensure migrations are ordered by version

  const migrations: MigrationFile[] = [];

  for (const filename of files) {
    const parsed = parseMigrationFilename(filename);
    if (!parsed) {
      logger.warn('MigrationRunner', `Skipping invalid migration filename: ${filename}`);
      continue;
    }

    const path = join(migrationsDir, filename);
    const sql = readFileSync(path, 'utf-8');
    const checksum = calculateChecksum(sql);

    migrations.push({
      version: parsed.version,
      name: parsed.name,
      filename,
      path,
      sql,
      checksum,
    });
  }

  return migrations;
}

/**
 * Get list of already applied migrations from database
 */
export async function getAppliedMigrations(): Promise<Map<string, { checksum: string | null }>> {
  const applied = await db.select().from(schemaMigrations);

  const map = new Map<string, { checksum: string | null }>();
  for (const migration of applied) {
    map.set(migration.version, { checksum: (migration as any).checksum });
  }

  return map;
}

/**
 * Apply a single migration
 */
async function applyMigration(migration: MigrationFile): Promise<MigrationResult> {
  const startTime = Date.now();

  try {
    logger.info('MigrationRunner', `Applying migration ${migration.version}: ${migration.name}`);

    // Execute the migration SQL
    await db.execute(migration.sql as any);

    const executionTimeMs = Date.now() - startTime;

    // Record the migration in schema_migrations table
    await db.insert(schemaMigrations).values({
      version: migration.version,
      name: migration.name,
      executionTimeMs,
      checksum: migration.checksum,
      appliedBy: 'migration_runner',
    } as any);

    logger.info('MigrationRunner', `Migration ${migration.version} applied successfully (${executionTimeMs}ms)`);

    return {
      version: migration.version,
      name: migration.name,
      status: 'applied',
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('MigrationRunner', `Migration ${migration.version} failed: ${errorMessage}`);

    return {
      version: migration.version,
      name: migration.name,
      status: 'failed',
      executionTimeMs,
      error: errorMessage,
    };
  }
}

/**
 * Run all pending migrations
 *
 * @param migrationsDir - Path to migrations directory
 * @param options - Migration options
 * @returns Array of migration results
 */
export async function runMigrations(
  migrationsDir: string,
  options: {
    dryRun?: boolean;
    verifyChecksums?: boolean;
  } = {}
): Promise<MigrationResult[]> {
  const { dryRun = false, verifyChecksums = true } = options;

  logger.info('MigrationRunner', `Starting migration run (dryRun: ${dryRun})`);

  // Load all migration files
  const allMigrations = loadMigrationFiles(migrationsDir);
  logger.info('MigrationRunner', `Found ${allMigrations.length} migration files`);

  // Get already applied migrations
  const appliedMigrations = await getAppliedMigrations();
  logger.info('MigrationRunner', `${appliedMigrations.size} migrations already applied`);

  const results: MigrationResult[] = [];

  for (const migration of allMigrations) {
    const applied = appliedMigrations.get(migration.version);

    if (applied) {
      // Migration already applied - verify checksum if enabled
      if (verifyChecksums && applied.checksum && applied.checksum !== migration.checksum) {
        logger.error(
          'MigrationRunner',
          `Checksum mismatch for migration ${migration.version}! ` +
          `Expected: ${applied.checksum}, Got: ${migration.checksum}`
        );
        results.push({
          version: migration.version,
          name: migration.name,
          status: 'failed',
          error: 'Checksum mismatch - migration file has been modified',
        });
        continue;
      }

      results.push({
        version: migration.version,
        name: migration.name,
        status: 'skipped',
      });
      continue;
    }

    // Apply new migration (unless dry run)
    if (dryRun) {
      logger.info('MigrationRunner', `[DRY RUN] Would apply migration ${migration.version}: ${migration.name}`);
      results.push({
        version: migration.version,
        name: migration.name,
        status: 'skipped',
      });
    } else {
      const result = await applyMigration(migration);
      results.push(result);

      // Stop on first failure
      if (result.status === 'failed') {
        logger.error('MigrationRunner', 'Stopping migration run due to failure');
        break;
      }
    }
  }

  // Summary
  const applied = results.filter(r => r.status === 'applied').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'failed').length;

  logger.info(
    'MigrationRunner',
    `Migration run complete: ${applied} applied, ${skipped} skipped, ${failed} failed`
  );

  return results;
}

/**
 * Check migration status without applying
 */
export async function checkMigrationStatus(migrationsDir: string): Promise<{
  total: number;
  applied: number;
  pending: number;
  pendingMigrations: string[];
}> {
  const allMigrations = loadMigrationFiles(migrationsDir);
  const appliedMigrations = await getAppliedMigrations();

  const pending = allMigrations.filter(m => !appliedMigrations.has(m.version));

  return {
    total: allMigrations.length,
    applied: appliedMigrations.size,
    pending: pending.length,
    pendingMigrations: pending.map(m => `${m.version}_${m.name}`),
  };
}

/**
 * Rollback a specific migration (future enhancement)
 *
 * Note: Rollback requires separate down migration files or reversible SQL
 */
export async function rollbackMigration(version: string): Promise<void> {
  throw new Error('Rollback not yet implemented - requires down migration files');
}
