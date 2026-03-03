export declare const httpRequestTool: import("ai").Tool<{
    url: string;
    method?: "POST" | "PATCH" | "GET" | "PUT" | "DELETE" | undefined;
    headers?: Record<string, string> | undefined;
    body?: string | undefined;
    timeout?: number | undefined;
}, {
    success: boolean;
    status: number;
    statusText: string;
    headers: {
        [k: string]: string;
    };
    data: unknown;
    attempt: number;
    error?: undefined;
} | {
    success: boolean;
    error: string;
    attempt: number;
    status?: undefined;
    statusText?: undefined;
    headers?: undefined;
    data?: undefined;
}>;
//# sourceMappingURL=http-request.d.ts.map