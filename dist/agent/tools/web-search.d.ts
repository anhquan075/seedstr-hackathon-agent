export declare const webSearchTool: import("ai").Tool<{
    query: string;
}, {
    success: boolean;
    results: {
        title: string;
        snippet: string;
        url: string;
    }[];
    error?: undefined;
} | {
    success: boolean;
    error: string;
    results?: undefined;
}>;
//# sourceMappingURL=web-search.d.ts.map