import Conf from 'conf';

interface ConfigSchema {
  apiKey?: string;
  twitterHandle?: string;
  skills?: string[];
  reputation?: number;
  pollInterval?: number;
  processedJobs?: string[];
}

class ConfigManager {
  private store: Conf<ConfigSchema>;

  constructor() {
    this.store = new Conf<ConfigSchema>({
      projectName: 'seedstr-agent',
      defaults: {
        pollInterval: 120000, // 2 minutes
        processedJobs: [],
        reputation: 0,
      },
    });
  }

  get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    return this.store.get(key);
  }

  set<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
    this.store.set(key, value);
  }

  has(key: keyof ConfigSchema): boolean {
    return this.store.has(key);
  }

  addProcessedJob(jobId: string): void {
    const jobs = this.get('processedJobs') || [];
    // Keep last 1000 to prevent unbounded growth
    const updated = [...jobs, jobId].slice(-1000);
    this.set('processedJobs', updated);
  }

  isJobProcessed(jobId: string): boolean {
    const jobs = this.get('processedJobs') || [];
    return jobs.includes(jobId);
  }

  clear(): void {
    this.store.clear();
  }
}

export const config = new ConfigManager();
