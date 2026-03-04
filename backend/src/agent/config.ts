import Conf from 'conf';

interface ConfigSchema {
  apiKey?: string;
  twitterHandle?: string;
  skills?: string[];
  reputation?: number;
  pollInterval?: number;
  processedJobs?: string[];
  autonomyMode?: 'manual' | 'supervised' | 'autonomous';
}

type AutonomyMode = NonNullable<ConfigSchema['autonomyMode']>;

function parseAutonomyMode(value?: string): AutonomyMode {
  if (value === 'manual' || value === 'autonomous' || value === 'supervised') {
    return value;
  }
  return 'supervised';
}

class ConfigManager {
  private store: Conf<ConfigSchema>;

  constructor() {
    this.store = new Conf<ConfigSchema>({
      projectName: 'seedstr-agent',
      defaults: {
        pollInterval: 30000, // 30 seconds (optimized for hackathon)
        processedJobs: [],
        reputation: 0,
        autonomyMode: parseAutonomyMode(process.env.AUTONOMY_MODE),
      },
    });
  }

  get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    return this.store.get(key);
  }

  getAutonomyMode(): AutonomyMode {
    return parseAutonomyMode(
      (this.store.get('autonomyMode') as string | undefined) ?? process.env.AUTONOMY_MODE
    );
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
