"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const conf_1 = __importDefault(require("conf"));
class ConfigManager {
    store;
    constructor() {
        this.store = new conf_1.default({
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
exports.config = new ConfigManager();
