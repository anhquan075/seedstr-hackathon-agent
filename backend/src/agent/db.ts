/**
 * Database module for PostgreSQL persistence using Drizzle ORM
 * Handles job state and processed jobs to prevent race conditions
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { processedJobs } from './schema.js';
import { logger } from './logger.js';

export { processedJobs };
export type { ProcessedJob, NewProcessedJob } from './schema.js';

export class Database {
  private pool: Pool | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private isDbAvailable = false;

  async connect(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      logger.warn('[Database] DATABASE_URL not found, using in-memory fallback');
      return;
    }

    try {
      const isInternal = databaseUrl.includes('.railway.internal:');
      
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: isInternal ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      // Initialize Drizzle
      this.db = drizzle(this.pool);
      this.isDbAvailable = true;
      
      logger.info('[Database] Connected to PostgreSQL via Drizzle ORM');
      
      // Run migrations
      await this.runMigrations();
    } catch (error) {
      logger.error('[Database] Failed to connect:', error);
      this.isDbAvailable = false;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db || !this.pool) return;
    
    try {
      // Create table if not exists using raw SQL
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS processed_jobs (
          id SERIAL PRIMARY KEY,
          job_id VARCHAR(255) NOT NULL UNIQUE,
          status VARCHAR(50) NOT NULL DEFAULT 'completed',
          processed_at BIGINT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          finished_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create index for faster lookups
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_processed_jobs_job_id ON processed_jobs(job_id)
      `);
      
      // Add finished_at column if it doesn't exist (migration for existing databases)
      await this.pool.query(`
        ALTER TABLE processed_jobs
        ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP DEFAULT NOW()
      `);
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_processed_jobs_job_id ON processed_jobs(job_id)
      `);
      
      logger.info('[Database] Migrations completed');
    } catch (error) {
      logger.error('[Database] Migration failed:', error);
    }
  }

  isAvailable(): boolean {
    return this.isDbAvailable;
  }

  /**
   * Atomically claim a job to prevent race conditions
   * Returns true if successfully claimed, false if already being processed
   */
  async claimJob(jobId: string): Promise<boolean> {
    if (!this.db || !this.pool) return false;

    try {
      const result = await this.pool.query(
        `INSERT INTO processed_jobs (job_id, status, processed_at)
         VALUES ($1, 'processing', $2)
         ON CONFLICT (job_id) DO 
         UPDATE SET status = 'processing', processed_at = $2
         WHERE processed_jobs.status = 'completed'
         RETURNING job_id`,
        [jobId, Date.now()]
      );
      
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('[Database] claimJob failed:', error);
      return false;
    }
  }

  /**
   * Mark a job as processed/completed
   */
  async markJobProcessed(jobId: string, status: 'completed' | 'failed' = 'completed'): Promise<void> {
    if (!this.db || !this.pool) return;

    try {
      await this.pool.query(
        `INSERT INTO processed_jobs (job_id, status, processed_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (job_id) DO UPDATE SET status = $2, processed_at = $3`,
        [jobId, status, Date.now()]
      );
    } catch (error) {
      logger.error('[Database] markJobProcessed failed:', error);
    }
  }

  /**
   * Get recent jobs (for loading into memory on startup)
   */
  async getRecentJobs(limit: number = 1000): Promise<Array<{job_id: string; status: string; processed_at: number}>> {
    if (!this.pool) return [];

    try {
      const result = await this.pool.query(
        `SELECT job_id, status, processed_at 
         FROM processed_jobs 
         WHERE status != 'processing'
         ORDER BY processed_at DESC 
         LIMIT $1`,
        [limit]
      );
      
      return result.rows.map(row => ({
        job_id: row.job_id,
        status: row.status,
        processed_at: Number(row.processed_at),
      }));
    } catch (error) {
      logger.error('[Database] getRecentJobs failed:', error);
      return [];
    }
  }

  /**
   * Check if a job has been processed
   */
  async isJobProcessed(jobId: string): Promise<boolean> {
    if (!this.db || !this.pool) return false;

    try {
      const result = await this.pool.query(
        'SELECT 1 FROM processed_jobs WHERE job_id = $1 AND status != $2',
        [jobId, 'processing']
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('[Database] isJobProcessed failed:', error);
      return false;
    }
  }

  /**
   * Prune old jobs to keep only the most recent ones
   */
  /**
   * Prune old jobs to keep only the most recent ones
   */
  async pruneOldJobs(keepCount: number = 1000): Promise<void> {
    if (!this.pool) return;

    try {
      // Delete all rows except the most recent keepCount rows (by processed_at DESC)
      await this.pool.query(
        `DELETE FROM processed_jobs 
         WHERE ctid NOT IN (
           SELECT ctid FROM processed_jobs 
           ORDER BY processed_at DESC 
           LIMIT $1
         )`,
        [keepCount]
      );
      logger.debug(`[Database] Pruned old jobs, kept ${keepCount} most recent`);
    } catch (error) {
      logger.error('[Database] pruneOldJobs failed:', error);
    }
  }

  /**
   * Get job count
   */
  async getJobCount(): Promise<number> {
    if (!this.pool) return 0;

    try {
      const result = await this.pool.query('SELECT COUNT(*) as count FROM processed_jobs');
      return Number(result.rows[0]?.count || 0);
    } catch (error) {
      logger.error('[Database] getJobCount failed:', error);
      return 0;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
      this.isDbAvailable = false;
      logger.info('[Database] Disconnected');
    }
  }
}

export const database = new Database();
