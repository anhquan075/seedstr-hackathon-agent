import * as fs from 'fs';
import * as path from 'path';
import { Buffer } from 'buffer';
import type { EventBus } from '../core/event-bus.js';
import type { AgentConfig, ApprovalEventData, BrainOutput } from '../types.js';
import { SeedstrAPIClient } from '../api-client.js';

import archiver from 'archiver';
type AutonomyMode = 'manual' | 'supervised' | 'autonomous';

interface JobMetadata {
  id: string;
  prompt: string;
  budget: number;
  skills: string[];
  jobType: 'SWARM' | 'STANDARD';
}

export class Packer {
  private apiClient: SeedstrAPIClient;
  private swarmDeadlines: Map<string, number> = new Map();
  private static readonly SWARM_DEADLINE_MS = 2 * 60 * 60 * 1000;

  constructor(
    private bus: EventBus,
    private config: AgentConfig
  ) {
    const seedstrApiKey = config.seedstrApiKey || process.env.SEEDSTR_API_KEY;
    if (!seedstrApiKey) {
      throw new Error('[Packer] SEEDSTR_API_KEY not configured');
    }

    this.apiClient = new SeedstrAPIClient(seedstrApiKey);
  }

  registerSwarmDeadline(jobId: string, jobType: 'STANDARD' | 'SWARM'): void {
    if (jobType === 'SWARM') {
      const deadline = Date.now() + Packer.SWARM_DEADLINE_MS;
      this.swarmDeadlines.set(jobId, deadline);
      console.log(`[Packer] SWARM deadline registered for ${jobId}: ${new Date(deadline).toISOString()}`);
    }
  }

  broadcastSwarmAcceptance(job: JobMetadata): void {
    this.broadcastApproval({
      id: job.id,
      action: 'accept_swarm',
      job,
      autoApproved: true,
      timestamp: Date.now(),
    });
  }

  async acceptJob(job: JobMetadata): Promise<void> {
    // For SWARM jobs, broadcast acceptance for UI/Metrics tracking
    if (job.jobType === 'SWARM') {
      this.broadcastSwarmAcceptance(job);
    }

    try {
      console.log(`[Packer] Attempting to accept ${job.jobType} job ${job.id}...`);
      await this.apiClient.acceptJob(job.id);
      this.bus.emit('job_accepted', {
        id: job.id,
        prompt: job.prompt,
        budget: job.budget,
        jobType: job.jobType,
        timestamp: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Handle 409 Conflict as a 'already claimed' signal for both types
      if (message.includes('409')) {
        const typeMsg = job.jobType === 'SWARM' ? 'already accepted or full' : 'already claimed by another instance';
        throw new Error(`${job.jobType} job ${job.id} ${typeMsg}`);
      }
      throw error instanceof Error ? error : new Error(message);
    }
  }

  async packAndSubmit(
    jobId: string,
    buildDir: string,
    brainOutput: BrainOutput,
    responseType: 'TEXT' | 'FILE' = 'FILE',
    jobMetadata?: Omit<JobMetadata, 'id'> & { isLocal?: boolean }
  ): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`[Packer] Starting pack & submit for job ${jobId} (type: ${responseType})...`);

      if (this.isDeadlineExceeded(jobId)) {
        const error = `SWARM deadline exceeded for job ${jobId}. Cannot submit after 2-hour window.`;
        console.error(`[Packer] ${error}`);
        throw new Error(error);
      }

      this.broadcastApproval({
        id: jobId,
        action: 'submit_response',
        job: {
          id: jobId,
          prompt: jobMetadata?.prompt || '',
          budget: jobMetadata?.budget ?? 0,
          skills: jobMetadata?.skills || [],
          jobType: jobMetadata?.jobType || 'STANDARD',
        },
        autoApproved: true,
        responseType,
        timestamp: Date.now(),
      });

      if (jobMetadata?.isLocal) {
        console.log(`[Packer] SKIPPING real submission for LOCAL job ${jobId}`);
        // Simulate completion for local jobs so they show up in UI terminal as finished
        this.bus.emit('job_completed', {
          id: jobId,
          output: brainOutput.rawResponse,
          outputTruncated: brainOutput.rawResponse.slice(0, 80) + '...',
          responseId: `local-${jobId}`,
          timestamp: Date.now(),
          responseType,
        });
      } else {
        if (responseType === 'TEXT') {
          await this.submitTextResponse(jobId, brainOutput);
        } else {
          await this.submitFileResponse(jobId, buildDir, brainOutput);
        }
      }

      this.swarmDeadlines.delete(jobId);
      console.log(`[Packer] Job ${jobId} submission completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`[Packer] Pack & submit failed for job ${jobId}:`, error);

      this.bus.emit('job_failed', {
        id: jobId,
        error: `Packer failed: ${error instanceof Error ? error.message : String(error)}`,
        stage: 'packing',
        timestamp: Date.now(),
      });

      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private async submitTextResponse(jobId: string, brainOutput: BrainOutput): Promise<void> {
    const submitResponse = await this.apiClient.submitResponse(jobId, brainOutput.rawResponse, []);

    this.bus.emit('job_completed', {
      id: jobId,
      output: brainOutput.rawResponse,
      outputTruncated: brainOutput.rawResponse.slice(0, 80) + '...',
      responseId: submitResponse.responseId || jobId,
      timestamp: Date.now(),
      responseType: 'TEXT',
    });
  }

  private async submitFileResponse(jobId: string, buildDir: string, brainOutput: BrainOutput): Promise<void> {
    const files = this.collectFilesFromDir(buildDir);
    console.log(`[Packer] Collected ${files.length} files for upload`);

    // Create ZIP file from build directory
    console.log(`[Packer] Creating ZIP archive...`);
    const zipBuffer = await this.createZipFile(buildDir);
    console.log(`[Packer] ZIP created: ${zipBuffer.length} bytes`);

    // Upload ZIP file
    const zipFileName = `build-${jobId}.zip`;
    const uploadedFiles = [{
      name: zipFileName,
      content: zipBuffer.toString('base64'),
      type: 'application/zip',
    }];

    const uploadResponse = await this.apiClient.uploadFiles(uploadedFiles);
    const submitResponse = await this.apiClient.submitResponse(jobId, brainOutput.rawResponse, uploadResponse.files);

    this.bus.emit('job_completed', {
      id: jobId,
      output: brainOutput.rawResponse,
      outputTruncated: brainOutput.rawResponse.slice(0, 80) + '...',
      responseId: submitResponse.responseId || jobId,
      timestamp: Date.now(),
      responseType: 'FILE',
      uploadedFiles: files.map((f) => ({ name: path.basename(f.path), size: f.content.length })),
    });

    this.cleanupBuildDir(buildDir);
  }

  private broadcastApproval(event: ApprovalEventData): void {
    const autonomyMode = this.getAutonomyMode();

    if (autonomyMode === 'manual') {
      throw new Error('Manual approval gate not yet implemented');
    }

    if (autonomyMode === 'supervised') {
      this.bus.emit('job_approval_request', event);
    }
  }

  private getAutonomyMode(): AutonomyMode {
    const mode = this.config.autonomyMode || process.env.AUTONOMY_MODE || 'supervised';
    if (mode === 'manual' || mode === 'autonomous' || mode === 'supervised') {
      return mode;
    }
    return 'supervised';
  }

  private isDeadlineExceeded(jobId: string): boolean {
    const deadline = this.swarmDeadlines.get(jobId);
    if (!deadline) return false;
    return Date.now() > deadline;
  }

  private collectFilesFromDir(dir: string, prefix = ''): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(prefix, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.collectFilesFromDir(fullPath, relativePath));
      } else if (entry.isFile()) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        files.push({ path: relativePath, content });
      }
    }

    return files;
  }
  private async createZipFile(buildDir: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err: Error) => reject(err));

      archive.directory(buildDir, false);
      archive.finalize();
    });
  }


  private cleanupBuildDir(buildDir: string): void {
    try {
      if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`[Packer] Cleanup warning: ${error}`);
    }
  }

  private inferFileType(ext: string): string {
    const typeMap: Record<string, string> = {
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    return typeMap[ext.toLowerCase()] || 'application/octet-stream';
  }
}

export default Packer;
