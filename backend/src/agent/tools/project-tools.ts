import { tool } from 'ai';
import { z } from 'zod';
import { ProjectBuilder } from '../project-builder.js';

let activeProjectBuilder: ProjectBuilder | null = null;

export function setActiveProjectBuilder(builder: ProjectBuilder): void {
  activeProjectBuilder = builder;
}

export function getActiveProjectBuilder(): ProjectBuilder | null {
  return activeProjectBuilder;
}

export const createFileTool = tool({
  description: 'Create a file in the project',
  inputSchema: z.object({
    path: z.string().describe('The file path (relative, e.g., "index.html" or "css/style.css")'),
    content: z.string().describe('The file content'),
  }),
  execute: async ({ path, content }) => {
    if (!activeProjectBuilder) {
      return {
        success: false,
        error: 'No active project builder',
      };
    }

    try {
      activeProjectBuilder.addFile(path, content);
      return {
        success: true,
        path,
        size: content.length,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const finalizeProjectTool = tool({
  description: 'Finalize the project and create the deliverable ZIP file',
  inputSchema: z.object({}),
  execute: async () => {
    if (!activeProjectBuilder) {
      return {
        success: false,
        error: 'No active project builder',
      };
    }

    try {
      const files = activeProjectBuilder.getFiles();
      return {
        success: true,
        message: 'Project finalized',
        fileCount: files.length,
        files: files.map((f) => f.path),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});
