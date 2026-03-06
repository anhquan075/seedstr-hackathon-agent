import { Database } from '../src/agent/db';

describe('Distributed Job Leases', () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database();
    await db.connect();

    const pool = (db as any).pool;
    if (pool) {
      await pool.query('DELETE FROM processed_jobs WHERE job_id LIKE $1', [
        'test-job-%',
      ]);
    }
  }, 30000);

  afterEach(async () => {
    const pool = (db as any).pool;
    if (pool) {
      await pool.query('DELETE FROM processed_jobs WHERE job_id LIKE $1', [
        'test-job-%',
      ]);
      await pool.end();
    }
  }, 30000);

  describe('claimJob() - Lease-based claiming', () => {
    it('should claim a new job successfully', async () => {
      const jobId = 'test-job-001';
      const instanceId = 'instance-1';

      const claimed = await db.claimJob(jobId, instanceId, 30000);
      expect(claimed).toBe(true);

      const pool = (db as any).pool;
      const result = await pool.query(
        'SELECT * FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].status).toBe('processing');
      expect(result.rows[0].claimed_by).toBe(instanceId);
      expect(result.rows[0].lease_expires_at).toBeGreaterThan(Date.now());
    }, 10000);

    it('should prevent duplicate claims of same job', async () => {
      const jobId = 'test-job-002';
      const instance1 = 'instance-1';
      const instance2 = 'instance-2';

      const claimed1 = await db.claimJob(jobId, instance1, 30000);
      expect(claimed1).toBe(true);

      const claimed2 = await db.claimJob(jobId, instance2, 30000);
      expect(claimed2).toBe(false);

      const pool = (db as any).pool;
      const result = await pool.query(
        'SELECT claimed_by FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(result.rows[0].claimed_by).toBe(instance1);
    }, 10000);

    it('should allow reclaim after lease expires', async () => {
      const jobId = 'test-job-003';
      const instance1 = 'instance-1';
      const instance2 = 'instance-2';
      const shortTTL = 100;

      const claimed1 = await db.claimJob(jobId, instance1, shortTTL);
      expect(claimed1).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      const claimed2 = await db.claimJob(jobId, instance2, 30000);
      expect(claimed2).toBe(true);

      const pool = (db as any).pool;
      const result = await pool.query(
        'SELECT claimed_by FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(result.rows[0].claimed_by).toBe(instance2);
    }, 20000);

    it('should allow reclaim of failed jobs', async () => {
      const jobId = 'test-job-004';
      const instance1 = 'instance-1';
      const instance2 = 'instance-2';

      await db.claimJob(jobId, instance1, 30000);
      await db.markJobProcessed(jobId, 'failed');

      const claimed2 = await db.claimJob(jobId, instance2, 30000);
      expect(claimed2).toBe(true);

      const pool = (db as any).pool;
      const result = await pool.query(
        'SELECT claimed_by, status FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(result.rows[0].claimed_by).toBe(instance2);
      expect(result.rows[0].status).toBe('processing');
    }, 10000);
  });

  describe('heartbeat() - Lease renewal', () => {
    it('should update heartbeat for in-flight job', async () => {
      const jobId = 'test-job-005';
      const instanceId = 'instance-1';

      await db.claimJob(jobId, instanceId, 30000);

      const pool = (db as any).pool;
      const before = await pool.query(
        'SELECT last_heartbeat FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      const initialHeartbeat = before.rows[0].last_heartbeat;

      await new Promise(resolve => setTimeout(resolve, 50));
      const heartbeatSuccess = await db.heartbeat(jobId);
      expect(heartbeatSuccess).toBe(true);

      const after = await pool.query(
        'SELECT last_heartbeat FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      const newHeartbeat = after.rows[0].last_heartbeat;

      expect(newHeartbeat).toBeGreaterThan(initialHeartbeat);
    }, 10000);

    it('should fail heartbeat for non-processing job', async () => {
      const jobId = 'test-job-006';

      const pool = (db as any).pool;
      await pool.query(
        'INSERT INTO processed_jobs (job_id, status, processed_at) VALUES ($1, $2, $3)',
        [jobId, 'completed', Date.now()]
      );

      const heartbeatSuccess = await db.heartbeat(jobId);
      expect(heartbeatSuccess).toBe(false);
    }, 10000);

    it('should handle multiple heartbeats', async () => {
      const jobId = 'test-job-007';
      const instanceId = 'instance-1';

      await db.claimJob(jobId, instanceId, 5000);

      const heartbeats = await Promise.all([
        db.heartbeat(jobId),
        db.heartbeat(jobId),
        db.heartbeat(jobId),
      ]);

      expect(heartbeats).toEqual([true, true, true]);
    }, 10000);
  });

  describe('releaseExpiredLeases() - Crash recovery', () => {
    it('should release expired leases', async () => {
      const jobId = 'test-job-008';
      const instanceId = 'instance-1';
      const shortTTL = 50;

      await db.claimJob(jobId, instanceId, shortTTL);

      await new Promise(resolve => setTimeout(resolve, 100));

      const releasedCount = await db.releaseExpiredLeases();
      expect(releasedCount).toBeGreaterThanOrEqual(1);

      const pool = (db as any).pool;
      const result = await pool.query(
        'SELECT status FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(result.rows[0].status).toBe('failed');
    }, 30000);

    it('should release multiple expired leases', async () => {
      const jobIds = ['test-job-009', 'test-job-010', 'test-job-011'];
      const shortTTL = 50;

      for (const jobId of jobIds) {
        await db.claimJob(jobId, 'instance-1', shortTTL);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const releasedCount = await db.releaseExpiredLeases();
      expect(releasedCount).toBe(3);

      const pool = (db as any).pool;
      const result = await pool.query(
        'SELECT status FROM processed_jobs WHERE job_id = ANY($1)',
        [jobIds]
      );
      expect(result.rows).toHaveLength(3);
      result.rows.forEach((row: any) => {
        expect(row.status).toBe('failed');
      });
    }, 30000);

    it('should not release non-expired leases', async () => {
      const jobId = 'test-job-012';
      const longTTL = 30000;

      await db.claimJob(jobId, 'instance-1', longTTL);

      const releasedCount = await db.releaseExpiredLeases();
      expect(releasedCount).toBe(0);

      const pool = (db as any).pool;
      const result = await pool.query(
        'SELECT status FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(result.rows[0].status).toBe('processing');
    }, 10000);
  });

  describe('Integration: Full lifecycle', () => {
    it('should handle crash and recovery flow', async () => {
      const jobId = 'test-job-013';
      const instance1 = 'instance-1-crashed';
      const instance2 = 'instance-2-recovery';
      const shortTTL = 50;

      const claimed1 = await db.claimJob(jobId, instance1, shortTTL);
      expect(claimed1).toBe(true);

      const pool = (db as any).pool;
      let result = await pool.query(
        'SELECT status, claimed_by FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(result.rows[0].status).toBe('processing');
      expect(result.rows[0].claimed_by).toBe(instance1);

      await new Promise(resolve => setTimeout(resolve, 100));

      const releasedCount = await db.releaseExpiredLeases();
      expect(releasedCount).toBe(1);

      result = await pool.query(
        'SELECT status FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(result.rows[0].status).toBe('failed');

      const claimed2 = await db.claimJob(jobId, instance2, 30000);
      expect(claimed2).toBe(true);

      result = await pool.query(
        'SELECT status, claimed_by FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(result.rows[0].status).toBe('processing');
      expect(result.rows[0].claimed_by).toBe(instance2);
    }, 50000);

    it('should maintain lease with periodic heartbeats', async () => {
      const jobId = 'test-job-014';
      const instanceId = 'instance-1';
      const leaseTTL = 200;
      const heartbeatInterval = 50;

      await db.claimJob(jobId, instanceId, leaseTTL);

      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, heartbeatInterval));
        const heartbeatSuccess = await db.heartbeat(jobId);
        expect(heartbeatSuccess).toBe(true);
      }

      const pool = (db as any).pool;
      let result = await pool.query(
        'SELECT status FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(result.rows[0].status).toBe('processing');

      await new Promise(resolve => setTimeout(resolve, leaseTTL + 100));

      const releasedCount = await db.releaseExpiredLeases();
      expect(releasedCount).toBe(1);

      const finalResult = await pool.query(
        'SELECT status FROM processed_jobs WHERE job_id = $1',
        [jobId]
      );
      expect(finalResult.rows[0].status).toBe('failed');
    }, 50000);
  });

  describe('Performance & Concurrency', () => {
    it('should handle 100 concurrent claims without duplicates', async () => {
      const jobCount = 100;
      const instanceCount = 5;
      const jobIds = Array.from({ length: jobCount }, (_, i) => `test-job-perf-${i}`);
      const instanceIds = Array.from(
        { length: instanceCount },
        (_, i) => `instance-perf-${i}`
      );

      const claimPromises = jobIds.flatMap(jobId =>
        instanceIds.map(instanceId => db.claimJob(jobId, instanceId, 30000))
      );

      const results = await Promise.all(claimPromises);
      const successCount = results.filter(r => r === true).length;

      expect(successCount).toBe(jobCount);

      const pool = (db as any).pool;
      const dbResult = await pool.query(
        'SELECT job_id, COUNT(*) as count FROM processed_jobs WHERE job_id LIKE $1 GROUP BY job_id',
        ['test-job-perf-%']
      );
      dbResult.rows.forEach((row: any) => {
        expect(row.count).toBe(1);
      });
    }, 50000);
  });
});
