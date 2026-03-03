"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeProjectTool = exports.createFileTool = void 0;
exports.setActiveProjectBuilder = setActiveProjectBuilder;
exports.getActiveProjectBuilder = getActiveProjectBuilder;
const ai_1 = require("ai");
const zod_1 = require("zod");
let activeProjectBuilder = null;
function setActiveProjectBuilder(builder) {
    activeProjectBuilder = builder;
}
function getActiveProjectBuilder() {
    return activeProjectBuilder;
}
exports.createFileTool = (0, ai_1.tool)({
    description: 'Create a file in the project',
    inputSchema: zod_1.z.object({
        path: zod_1.z.string().describe('The file path (relative, e.g., "index.html" or "css/style.css")'),
        content: zod_1.z.string().describe('The file content'),
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
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    },
});
exports.finalizeProjectTool = (0, ai_1.tool)({
    description: 'Finalize the project and create the deliverable ZIP file',
    inputSchema: zod_1.z.object({}),
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
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    },
});
