import archiver from 'archiver';
import { logger } from './logger.js';

export interface ProjectFile {
 path: string;
 content: string;
}

export class ProjectBuilder {
 private files: Map<string, string> = new Map();
 private projectId: string;

 constructor(projectId: string) {
  this.projectId = projectId;
 }

 addFile(path: string, content: string): void {
  logger.debug(`Adding file: ${path}`);
  this.files.set(path, content);
 }

 getFiles(): ProjectFile[] {
  return Array.from(this.files.entries()).map(([path, content]) => ({
   path,
   content,
  }));
 }

 hasFile(path: string): boolean {
  return this.files.has(path);
 }

 getFile(path: string): string | undefined {
  return this.files.get(path);
 }

 clear(): void {
  this.files.clear();
 }

 async createZip(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
   try {
    logger.info(`Creating ZIP with ${this.files.size} files`);

    const chunks: Buffer[] = [];
    const archive = archiver('zip', {
     zlib: { level: 9 }, // Maximum compression
    });

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => {
     const buffer = Buffer.concat(chunks);
     logger.info(`ZIP created: ${buffer.length} bytes`);
     resolve(buffer);
    });
    archive.on('error', (err: Error) => {
     logger.error('ZIP creation failed', err);
     reject(err);
    });

    // Add all files to archive
    for (const [path, content] of this.files.entries()) {
     archive.append(content, { name: path });
    }

    // Finalize the archive
    archive.finalize();
   } catch (error) {
    logger.error('ZIP creation setup failed', error);
    reject(error);
   }
  });
 }

 async cleanup(): Promise<void> {
  this.clear();
  logger.debug(`Project ${this.projectId} cleaned up`);
 }
}
