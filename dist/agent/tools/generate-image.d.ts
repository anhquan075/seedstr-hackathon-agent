export declare const generateImageTool: import("ai").Tool<{
    prompt: string;
    width?: number | undefined;
    height?: number | undefined;
    seed?: number | undefined;
}, {
    success: boolean;
    imageUrl: string;
    dataUrl: string;
    prompt: string;
    dimensions: {
        width: number;
        height: number;
    };
    error?: undefined;
} | {
    success: boolean;
    error: string;
    imageUrl?: undefined;
    dataUrl?: undefined;
    prompt?: undefined;
    dimensions?: undefined;
}>;
//# sourceMappingURL=generate-image.d.ts.map