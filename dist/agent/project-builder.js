import archiver from 'archiver';
import { logger } from './logger.js';
export class ProjectBuilder {
    files = new Map();
    projectId;
    constructor(projectId) {
        this.projectId = projectId;
    }
    addFile(path, content) {
        logger.debug(`Adding file: ${path}`);
        this.files.set(path, content);
    }
    getFiles() {
        return Array.from(this.files.entries()).map(([path, content]) => ({
            path,
            content,
        }));
    }
    hasFile(path) {
        return this.files.has(path);
    }
    getFile(path) {
        return this.files.get(path);
    }
    clear() {
        this.files.clear();
    }
    async createZip() {
        return new Promise((resolve, reject) => {
            try {
                logger.info(`Creating ZIP with ${this.files.size} files`);
                const chunks = [];
                const archive = archiver('zip', {
                    zlib: { level: 9 }, // Maximum compression
                });
                archive.on('data', (chunk) => chunks.push(chunk));
                archive.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    logger.info(`ZIP created: ${buffer.length} bytes`);
                    resolve(buffer);
                });
                archive.on('error', (err) => {
                    logger.error('ZIP creation failed', err);
                    reject(err);
                });
                // Add all files to archive
                for (const [path, content] of this.files.entries()) {
                    archive.append(content, { name: path });
                }
                // Finalize the archive
                archive.finalize();
            }
            catch (error) {
                logger.error('ZIP creation setup failed', error);
                reject(error);
            }
        });
    }
    async cleanup() {
        this.clear();
        logger.debug(`Project ${this.projectId} cleaned up`);
    }
}
//# sourceMappingURL=project-builder.js.map