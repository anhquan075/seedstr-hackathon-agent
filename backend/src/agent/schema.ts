import { pgTable, varchar, bigint, timestamp, serial } from 'drizzle-orm/pg-core';

export const processedJobs = pgTable('processed_jobs', {
 id: serial('id').primaryKey(),
 jobId: varchar('job_id', { length: 255 }).notNull().unique(),
 status: varchar('status', { length: 50 }).notNull().default('completed'),
 processedAt: bigint('processed_at', { mode: 'number' }).notNull(),
 createdAt: timestamp('created_at').defaultNow(),
 finishedAt: timestamp('finished_at').defaultNow(),
 // Lease tracking for distributed job claiming
 claimedBy: varchar('claimed_by', { length: 255 }),
 claimedAt: bigint('claimed_at', { mode: 'number' }),
 leaseExpiresAt: bigint('lease_expires_at', { mode: 'number' }),
 lastHeartbeat: bigint('last_heartbeat', { mode: 'number' }),
});

export type ProcessedJob = typeof processedJobs.$inferSelect;
export type NewProcessedJob = typeof processedJobs.$inferInsert;
