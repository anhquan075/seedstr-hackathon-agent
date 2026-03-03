export interface ProjectFile {
    path: string;
    content: string;
}
export declare class ProjectBuilder {
    private files;
    private projectId;
    constructor(projectId: string);
    addFile(path: string, content: string): void;
    getFiles(): ProjectFile[];
    hasFile(path: string): boolean;
    getFile(path: string): string | undefined;
    clear(): void;
    createZip(): Promise<Buffer>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=project-builder.d.ts.map