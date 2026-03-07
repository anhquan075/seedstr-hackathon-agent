#!/usr/bin/env node
/**
 * Test script to verify PostgreSQL connection and create schema
 */

import pg from 'pg';

const { Pool } = pg;

// Must set DATABASE_URL environment variable
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
 console.error(' DATABASE_URL environment variable is required');
 process.exit(1);
}

async function main() {
 console.log('Testing PostgreSQL connection...\n');
 console.log('Connection URL:', DATABASE_URL!.replace(/:[^:@]+@/, ':***@'));
 
 const pool = new Pool({
  connectionString: DATABASE_URL!,
  ssl: {
   rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
 });

 try {
  // Test connection
  console.log('Connecting to database...');
  const client = await pool.connect();
  console.log(' Connected successfully!\n');

  // Check version
  const version = await client.query('SELECT version()');
  console.log('PostgreSQL version:', version.rows[0].version.split(' ').slice(0, 2).join(' '));

  // List tables
  const tables = await client.query(`
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
  `);
  
  console.log('\nExisting tables:');
  if (tables.rows.length === 0) {
   console.log(' (none)');
  } else {
   tables.rows.forEach((row: any) => {
    console.log(' -', row.table_name);
   });
  }

  // Create schema if not exists
  console.log('\n--- Creating processed_jobs table ---');
  await client.query(`
   CREATE TABLE IF NOT EXISTS processed_jobs (
    job_id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    processed_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
    created_at TIMESTAMP DEFAULT NOW()
   )
  `);
  console.log(' Table created/verified!');

  // Test insert
  console.log('\n--- Testing insert ---');
  await client.query(`
   INSERT INTO processed_jobs (job_id, status, processed_at)
   VALUES ('test-job-123', 'completed', $1)
   ON CONFLICT (job_id) DO UPDATE SET status = EXCLUDED.status
  `, [Date.now()]);
  console.log(' Insert test passed!');

  // Test select
  const result = await client.query('SELECT * FROM processed_jobs WHERE job_id = $1', ['test-job-123']);
  console.log(' Select test passed! Found:', result.rows[0]);

  // Clean up test
  await client.query('DELETE FROM processed_jobs WHERE job_id = $1', ['test-job-123']);
  console.log(' Cleanup test passed!');

  console.log('\n All database tests passed!');
  
  client.release();
  await pool.end();
 } catch (error) {
  console.error('\n Database test failed:', error);
  await pool.end();
  process.exit(1);
 }
}

main();
