#!/usr/bin/env tsx

/**
 * Migration CLI Script - Step 10.5: Schema & Version Management
 *
 * Usage:
 *   npm run migrate              # Run all pending migrations
 *   npm run migrate:status       # Check migration status
 *   npm run migrate:dry-run      # Test migrations without applying
 *   tsx scripts/runMigrations.ts [command]
 */

import { join } from 'path';
import { runMigrations, checkMigrationStatus } from '../server/db/migrationRunner';

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

async function main() {
  const command = process.argv[2] || 'run';

  console.log('🔧 ARQLO Migration Tool - Step 10.5\n');

  try {
    switch (command) {
      case 'run':
        console.log('Running migrations...\n');
        const results = await runMigrations(MIGRATIONS_DIR, { verifyChecksums: true });

        // Display results
        console.log('\n📊 Migration Results:');
        console.log('═══════════════════════════════════════════════════\n');

        for (const result of results) {
          const icon = result.status === 'applied' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
          const time = result.executionTimeMs ? ` (${result.executionTimeMs}ms)` : '';
          console.log(`${icon} ${result.version}: ${result.name}${time}`);

          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
        }

        const applied = results.filter(r => r.status === 'applied').length;
        const failed = results.filter(r => r.status === 'failed').length;

        console.log('\n═══════════════════════════════════════════════════');
        if (failed > 0) {
          console.log(`❌ Migration failed! ${failed} error(s)\n`);
          process.exit(1);
        } else if (applied > 0) {
          console.log(`✅ Successfully applied ${applied} migration(s)\n`);
        } else {
          console.log('✨ All migrations up to date\n');
        }
        break;

      case 'status':
        console.log('Checking migration status...\n');
        const status = await checkMigrationStatus(MIGRATIONS_DIR);

        console.log('📊 Migration Status:');
        console.log('═══════════════════════════════════════════════════\n');
        console.log(`Total migrations:    ${status.total}`);
        console.log(`Applied:             ${status.applied} ✅`);
        console.log(`Pending:             ${status.pending} ⏳\n`);

        if (status.pending > 0) {
          console.log('Pending migrations:');
          for (const migration of status.pendingMigrations) {
            console.log(`  - ${migration}`);
          }
          console.log('\nRun "npm run migrate" to apply pending migrations\n');
        } else {
          console.log('✨ All migrations up to date\n');
        }
        break;

      case 'dry-run':
        console.log('Dry run - no changes will be made\n');
        const dryResults = await runMigrations(MIGRATIONS_DIR, {
          dryRun: true,
          verifyChecksums: true,
        });

        console.log('\n📊 Dry Run Results:');
        console.log('═══════════════════════════════════════════════════\n');

        for (const result of dryResults) {
          const icon = result.status === 'skipped' ? '⏭️' : '📝';
          console.log(`${icon} ${result.version}: ${result.name}`);
        }

        const wouldApply = dryResults.filter(
          r => r.status === 'skipped' && r.version
        ).length;

        console.log('\n═══════════════════════════════════════════════════');
        console.log(`Would apply ${wouldApply} migration(s)\n`);
        break;

      case 'help':
      default:
        console.log('Usage:');
        console.log('  npm run migrate              Run all pending migrations');
        console.log('  npm run migrate:status       Check migration status');
        console.log('  npm run migrate:dry-run      Test migrations (no changes)\n');
        console.log('Commands:');
        console.log('  run        Apply all pending migrations');
        console.log('  status     Show migration status');
        console.log('  dry-run    Preview what would be applied');
        console.log('  help       Show this help message\n');
        break;
    }
  } catch (error) {
    console.error('\n❌ Migration Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('\nStack trace:', error);
    process.exit(1);
  }
}

main();
