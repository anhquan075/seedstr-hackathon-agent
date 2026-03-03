import { ProjectBuilder } from '../project-builder.js';
export declare function setActiveProjectBuilder(builder: ProjectBuilder): void;
export declare function getActiveProjectBuilder(): ProjectBuilder | null;
export declare const createFileTool: import("ai").Tool<{
    path: string;
    content: string;
}, {
    success: boolean;
    error: string;
    path?: undefined;
    size?: undefined;
} | {
    success: boolean;
    path: string;
    size: number;
    error?: undefined;
}>;
export declare const finalizeProjectTool: import("ai").Tool<{}, {
    success: boolean;
    error: string;
    message?: undefined;
    fileCount?: undefined;
    files?: undefined;
} | {
    success: boolean;
    message: string;
    fileCount: number;
    files: string[];
    error?: undefined;
}>;
//# sourceMappingURL=project-tools.d.ts.map