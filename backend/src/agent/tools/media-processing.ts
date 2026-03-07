import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../logger.js';

const execPromise = promisify(exec);

export const mediaProcessingTool = tool({
 description: 'Perform basic media processing operations using FFmpeg',
 inputSchema: z.object({
  operation: z.enum([
   'get_metadata',
   'resize_video',
   'extract_audio',
   'convert_format',
   'create_thumbnail',
  ]).describe('The FFmpeg operation to perform'),
  inputFile: z.string().describe('Path to the input file'),
  outputFile: z.string().optional().describe('Path to the output file (optional for some operations)'),
  params: z.record(z.any()).optional().describe('Additional parameters for the operation'),
 }),
 execute: async ({ operation, inputFile, outputFile, params }) => {
  try {
   let command = '';
   
   switch (operation) {
    case 'get_metadata':
     command = `ffprobe -v quiet -print_format json -show_format -show_streams "${inputFile}"`;
     const { stdout } = await execPromise(command);
     return { success: true, metadata: JSON.parse(stdout) };
    
    case 'resize_video':
     if (!outputFile) throw new Error('outputFile is required for resize_video');
     const width = params?.width || 1280;
     const height = params?.height || 720;
     command = `ffmpeg -i "${inputFile}" -vf scale=${width}:${height} -c:a copy "${outputFile}"`;
     break;
    
    case 'extract_audio':
     if (!outputFile) throw new Error('outputFile is required for extract_audio');
     command = `ffmpeg -i "${inputFile}" -vn -acodec libmp3lame "${outputFile}"`;
     break;
    
    case 'convert_format':
     if (!outputFile) throw new Error('outputFile is required for convert_format');
     command = `ffmpeg -i "${inputFile}" "${outputFile}"`;
     break;
    
    case 'create_thumbnail':
     if (!outputFile) throw new Error('outputFile is required for create_thumbnail');
     const time = params?.time || '00:00:01';
     command = `ffmpeg -i "${inputFile}" -ss ${time} -vframes 1 "${outputFile}"`;
     break;
     
    default:
     throw new Error(`Unknown operation: ${operation}`);
   }

   logger.info(`[MediaProcessing] Executing: ${command}`);
   await execPromise(command);
   return { success: true, outputFile };
  } catch (error) {
   logger.error(`[MediaProcessing] Error:`, error);
   return { success: false, error: (error as Error).message };
  }
 },
});
