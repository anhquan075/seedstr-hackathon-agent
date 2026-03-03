import Conf from 'conf';
class ConfigManager {
    store;
    constructor() {
        this.store = new Conf({
            projectName: 'seedstr-agent',
            defaults: {
                pollInterval: 120000, // 2 minutes
                processedJobs: [],
                reputation: 0,
            },
        });
    }
    get(key) {
        return this.store.get(key);
    }
    set(key, value) {
        this.store.set(key, value);
    }
    has(key) {
        return this.store.has(key);
    }
    addProcessedJob(jobId) {
        const jobs = this.get('processedJobs') || [];
        // Keep last 1000 to prevent unbounded growth
        const updated = [...jobs, jobId].slice(-1000);
        this.set('processedJobs', updated);
    }
    isJobProcessed(jobId) {
        const jobs = this.get('processedJobs') || [];
        return jobs.includes(jobId);
    }
    clear() {
        this.store.clear();
    }
}
export const config = new ConfigManager();
//# sourceMappingURL=config.js.map