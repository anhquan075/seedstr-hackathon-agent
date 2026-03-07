import * as fs from 'fs';
import * as path from 'path';
import type { EventBus } from '../core/event-bus.js';
import type { AgentConfig } from '../types.js';
import { logger } from '../logger.js';

/**
 * Watcher Module
 * Monitors the project directory for files that match agent triggers
 * Detects: .agent-prompt files, specific markers in code changes
 * Emits: job_received events to bus when a prompt is detected
 * 
 * Polling-based for simplicity (can be upgraded to chokidar)
 */
export class Watcher {
 private isRunning = false;
 private pollInterval: NodeJS.Timeout | null = null;
 private lastSeenPrompts = new Set<string>();

 constructor(
  private bus: EventBus,
  private config: AgentConfig
 ) {}

 /**
  * Start watching for prompts
  */
 start(): void {
  if (this.isRunning) {
   logger.info('[Watcher] Already running');
   return;
  }

  this.isRunning = true;
  logger.info('[Watcher] Started');

  // Poll every 2 seconds for prompts
  this.pollInterval = setInterval(() => this.poll(), 2000);
 }

 /**
  * Stop watching
  */
 stop(): void {
  if (!this.isRunning) return;

  this.isRunning = false;
  if (this.pollInterval) clearInterval(this.pollInterval);
  logger.info('[Watcher] Stopped');
 }

 /**
  * Pause polling (soft pause - internal state tracking)
  * Jobs in progress will continue; no new polls will occur
  */
 pause(): void {
  if (!this.isRunning) {
   logger.info('[Watcher] Not running, cannot pause');
   return;
  }

  if (this.pollInterval) {
   clearInterval(this.pollInterval);
   this.pollInterval = null;
   logger.info('[Watcher] Polling paused');
  }
 }

 /**
  * Resume polling after pause
  */
 resume(): void {
  if (!this.isRunning) {
   logger.info('[Watcher] Not running, cannot resume');
   return;
  }

  if (this.pollInterval) {
   logger.info('[Watcher] Already polling');
   return;
  }

  // Resume polling every 2 seconds
  this.pollInterval = setInterval(() => this.poll(), 2000);
  logger.info('[Watcher] Polling resumed');
 }

 /**
  * Check if currently paused
  */
 isPaused(): boolean {
  return this.isRunning && !this.pollInterval;
 }

 /**
  * Poll for new prompts in project root
  */
 private poll(): void {
  try {
   // Check for .agent-prompt file in project root
   const promptFile = path.join(process.cwd(), '.agent-prompt');
   if (!fs.existsSync(promptFile)) return;

   const content = fs.readFileSync(promptFile, 'utf-8').trim();
   if (!content) return;

   // Detect if this is a new prompt (not seen before)
   const hash = `${content}:${Date.now() % 10000}`;
   if (this.lastSeenPrompts.has(hash)) return;

   this.lastSeenPrompts.add(hash);

   const lines = content.split('\n');
   const prompt = lines[0];
   const budget = this.parseBudget(lines) || 100000;
   const jobType = this.parseJobType(lines);
   const skills = this.parseSkills(lines);
   const description = this.parseDescription(lines);
   const responseType = this.parseResponseType(lines);
   const jobId = this.parseField(lines, 'jobId') || `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

   logger.info(`[Watcher] New prompt detected: "${prompt.slice(0, 50)}..."`);

   // Emit job_received event
   this.bus.emit('job_received', {
    id: jobId,
    prompt,
    budget,
    timestamp: Date.now(),
    jobType,
    skills,
    description,
    responseType,
    isLocal: this.parseField(lines, 'isLocal') === 'true',
   });

   // Clean up the prompt file
   fs.unlinkSync(promptFile);
  } catch (error) {
   logger.info('[Watcher] Poll error:', error);
  }
 }

 /**
  * Parse budget from prompt file lines
  */
 private parseBudget(lines: string[]): number | null {
  for (const line of lines) {
   if (line.startsWith('budget:')) {
    const value = parseInt(line.split(':')[1].trim(), 10);
    return isNaN(value) ? null : value;
   }
  }
  return null;
 }

 private parseJobType(lines: string[]): 'STANDARD' | 'SWARM' {
  const value = this.parseField(lines, 'jobType')?.toLowerCase();
  if (value === 'swarm') return 'SWARM';
  return 'STANDARD';
 }

 private parseSkills(lines: string[]): string[] {
  const raw = this.parseField(lines, 'skills');
  if (!raw) return [];
  return raw
   .split(',')
   .map((s) => s.trim())
   .filter((s) => s.length > 0);
 }

 private parseDescription(lines: string[]): string | undefined {
  const raw = this.parseField(lines, 'description');
  return raw || undefined;
 }

 private parseResponseType(lines: string[]): 'TEXT' | 'FILE' | undefined {
  const value = this.parseField(lines, 'responseType')?.toLowerCase();
  if (value === 'text') return 'TEXT';
  if (value === 'file') return 'FILE';
  return undefined;
 }

 private parseField(lines: string[], key: string): string | null {
  const prefix = `${key}:`;
  for (const line of lines) {
   if (line.toLowerCase().startsWith(prefix.toLowerCase())) {
    return line.slice(prefix.length).trim();
   }
  }
  return null;
 }
}

export default Watcher;
