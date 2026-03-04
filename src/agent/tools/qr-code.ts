import { tool } from 'ai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

export const generateQrCodeTool = tool({
  description: 'Generate a QR code image for a given text or URL',
  inputSchema: z.object({
    data: z.string().describe('The text or URL to encode in the QR code'),
    size: z.number().optional().describe('Size of the QR code in pixels (default: 300)'),
    format: z.enum(['png', 'svg']).optional().describe('Output format (default: png)'),
    savePath: z.string().optional().describe('Optional path to save the QR code image locally'),
  }),
  execute: async ({ data, size = 300, format = 'png', savePath }) => {
    try {
      // Use quickchart.io API for reliable QR code generation
      // It supports high customization and formats
      const apiUrl = `https://quickchart.io/qr?text=${encodeURIComponent(data)}&size=${size}&format=${format}`;
      
      const result = {
        success: true,
        url: apiUrl,
        message: `QR code generated for "${data}"`,
        savedPath: undefined as string | undefined,
      };

      // If savePath is provided, download and save the file
      if (savePath) {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch QR code: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Ensure directory exists
        const dir = path.dirname(savePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(savePath, buffer);
        result.savedPath = savePath;
        result.message += `. Saved to ${savePath}`;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});
