import * as fs from 'fs';
import * as path from 'path';
import type { EventBus } from '../core/event-bus.js';
import type { AgentConfig, BuildFile, BrainOutput } from '../types.js';

/**
 * Builder Module
 * Materializes BuildFiles extracted by Brain onto the filesystem
 * 
 * Responsibility:
 * - Create project directory structure
 * - Write extracted files to disk
 * - Verify file integrity
 * - Emit 'builder_completed' event with BrainOutput for next stage (Packer)
 */
export class Builder {
  constructor(
    private bus: EventBus,
    private config: AgentConfig
  ) {}

  /**
   * Build project from BrainOutput
   * Creates directory structure and writes all files
   */
  async buildFromOutput(jobId: string, brainOutput: BrainOutput): Promise<void> {
    const buildDir = path.join(process.cwd(), '.build', jobId);

    try {
      console.log(`[Builder] Starting build for job ${jobId}...`);

      // Create build directory
      fs.mkdirSync(buildDir, { recursive: true });

      // Write all extracted files
      for (const file of brainOutput.files) {
        const filePath = path.join(buildDir, file.path);
        const fileDir = path.dirname(filePath);

        // Ensure directory exists
        fs.mkdirSync(fileDir, { recursive: true });

        // Write file
        fs.writeFileSync(filePath, file.content, 'utf-8');
        console.log(`[Builder] Written: ${file.path}`);
      }

      // Verify files were created
      const filesWritten = this.verifyFiles(buildDir, brainOutput.files);
      if (filesWritten !== brainOutput.files.length) {
        throw new Error(
          `File verification failed: expected ${brainOutput.files.length}, got ${filesWritten}`
        );
      }

      console.log(`[Builder] Build complete: ${brainOutput.files.length} files written to ${buildDir}`);

      // Emit completion
      this.bus.emit('job_processing', {
        id: jobId,
        stage: 'packing',
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error(`[Builder] Build failed for job ${jobId}:`, error);

      // Cleanup on failure
      try {
        fs.rmSync(buildDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }

      this.bus.emit('job_failed', {
        id: jobId,
        error: `Builder failed: ${error instanceof Error ? error.message : String(error)}`,
        stage: 'building',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Verify all files were written correctly
   */
  private verifyFiles(buildDir: string, expectedFiles: BuildFile[]): number {
    let count = 0;

    for (const file of expectedFiles) {
      const filePath = path.join(buildDir, file.path);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content === file.content) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Get build directory path for a job
   */
  getBuildDir(jobId: string): string {
    return path.join(process.cwd(), '.build', jobId);
  }
}

export default Builder;
