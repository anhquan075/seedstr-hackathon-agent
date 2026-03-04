import { tool } from 'ai';
import { z } from 'zod';

export const textProcessingTool = tool({
  description: 'Process text to extract information, format content, or analyze structure',
  inputSchema: z.object({
    text: z.string().describe('The input text to process'),
    operation: z.enum([
      'extract_emails',
      'extract_urls',
      'count_stats',
      'clean_whitespace',
      'to_markdown',
      'sentiment_basic', // Simple keyword based
    ]).describe('The operation to perform'),
  }),
  execute: async ({ text, operation }) => {
    try {
      switch (operation) {
        case 'extract_emails': {
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const emails = text.match(emailRegex) || [];
          return {
            success: true,
            emails: [...new Set(emails)], // Unique
            count: emails.length,
          };
        }
        
        case 'extract_urls': {
          const urlRegex = /https?:\/\/[^\s]+/g;
          const urls = text.match(urlRegex) || [];
          return {
            success: true,
            urls: [...new Set(urls)],
            count: urls.length,
          };
        }
        
        case 'count_stats': {
          const words = text.trim().split(/\s+/).length;
          const chars = text.length;
          const lines = text.split('\n').length;
          const paragraphs = text.split(/\n\s*\n/).length;
          return {
            success: true,
            stats: { words, chars, lines, paragraphs },
          };
        }
        
        case 'clean_whitespace': {
          const cleaned = text.replace(/\s+/g, ' ').trim();
          return {
            success: true,
            cleaned_text: cleaned,
          };
        }

        case 'sentiment_basic': {
          // Very basic keyword matching
          const positive = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'best', 'happy'];
          const negative = ['bad', 'terrible', 'worst', 'hate', 'awful', 'sad', 'poor', 'fail'];
          
          const words = text.toLowerCase().split(/\W+/);
          let score = 0;
          let details: string[] = [];
          
          for (const w of words) {
            if (positive.includes(w)) {
              score++;
              details.push(`+ ${w}`);
            }
            if (negative.includes(w)) {
              score--;
              details.push(`- ${w}`);
            }
          }
          
          return {
            success: true,
            sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
            score,
            details,
          };
        }
        
        default:
          return { error: `Unknown operation: ${operation}` };
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});
