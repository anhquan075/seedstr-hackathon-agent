#!/usr/bin/env node

/**
 * Run distributed job leases migration on Railway Postgres
 * Usage: node run-migration.js
 * 
 * This script connects to the DATABASE_URL environment variable
 * and executes the migration to add lease tracking columns.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  console.error('   Please set DATABASE_URL before running this script');
  process.exit(1);
}

console.log('🔗 Connecting to Postgres...');
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Railway
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('📂 Reading migration file...');
    const migrationPath = path.join(__dirname, 'backend/migrations/001-add-distributed-job-leases.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('⏳ Executing migration...\n');
    console.log('SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log('\n⏱️  Running...\n');

    // Execute the migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!\n');

    // Verify the columns were added
    console.log('🔍 Verifying migration...\n');
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'processed_jobs' 
      AND column_name IN ('claimed_by', 'claimed_at', 'lease_expires_at', 'last_heartbeat')
      ORDER BY ordinal_position;
    `);

    if (result.rows.length === 0) {
      console.error('❌ Verification failed: No lease columns found');
      process.exit(1);
    }

    console.log('Lease columns in processed_jobs table:');
    console.log('┌─────────────────┬─────────────┬────────────┐');
    console.log('│ Column Name     │ Data Type   │ Nullable   │');
    console.log('├─────────────────┼─────────────┼────────────┤');
    result.rows.forEach(row => {
      const colName = row.column_name.padEnd(15);
      const dataType = row.data_type.padEnd(11);
      const isNull = row.is_nullable ? 'YES' : 'NO';
      console.log(`│ ${colName} │ ${dataType} │ ${isNull.padEnd(10)} │`);
    });
    console.log('└─────────────────┴─────────────┴────────────┘\n');

    // Check index was created
    console.log('🔍 Checking index...\n');
    const indexResult = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'processed_jobs' 
      AND indexname = 'idx_lease_expiration';
    `);

    if (indexResult.rows.length > 0) {
      console.log('✅ Index idx_lease_expiration created:');
      console.log(`   ${indexResult.rows[0].indexdef}\n`);
    } else {
      console.warn('⚠️  Warning: Index idx_lease_expiration not found\n');
    }

    console.log('━'.repeat(60));
    console.log('✨ MIGRATION COMPLETE ✨');
    console.log('━'.repeat(60));
    console.log('\nThe distributed job leases system is now ready:');
    console.log('  • 4 lease tracking columns added');
    console.log('  • Index created for efficient lease queries');
    console.log('  • Ready for heartbeat and cleanup operations');
    console.log('\nNext steps:');
    console.log('  1. Restart the Railway app (if not auto-restarting)');
    console.log('  2. Monitor logs for heartbeat activity:');
    console.log('     "[Orchestrator] Heartbeat sent for X in-flight jobs"');
    console.log('  3. Verify crash recovery works');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

runMigration();
