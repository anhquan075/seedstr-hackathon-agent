import { tool } from 'ai';
import { z } from 'zod';

export const marketingTools = tool({
 description: 'Marketing and content optimization tools for SEO, Email, and Translation',
 inputSchema: z.object({
  operation: z.enum([
   'seo_analyze',
   'email_validate_template',
   'translation_helper',
  ]).describe('The marketing operation to perform'),
  content: z.string().describe('The content to analyze or process'),
  context: z.record(z.any()).optional().describe('Optional context (e.g., keywords, target language)'),
 }),
 execute: async ({ operation, content, context }) => {
  try {
   switch (operation) {
    case 'seo_analyze': {
     const keywords = context?.keywords || [];
     const lowerContent = content.toLowerCase();
     const keywordCount: Record<string, number> = {};
     
     keywords.forEach((kw: string) => {
      const regex = new RegExp(kw.toLowerCase(), 'g');
      keywordCount[kw] = (lowerContent.match(regex) || []).length;
     });
     
     const wordCount = content.trim().split(/\s+/).length;
     const hasH1 = /<h1/i.test(content) || /^#\s/m.test(content);
     const metaDescription = /<meta name="description"/i.test(content);
     
     return {
      success: true,
      analysis: {
       wordCount,
       keywordDensity: Object.fromEntries(
        Object.entries(keywordCount).map(([kw, count]) => [kw, (count / wordCount) * 100])
       ),
       checklist: {
        hasH1,
        metaDescription,
        optimalLength: wordCount > 300,
       }
      }
     };
    }
    
    case 'email_validate_template': {
     const placeholders = content.match(/\{\{.*?\}\}/g) || [];
     const commonIssues = [];
     if (!content.includes('unsubscribe')) commonIssues.push('Missing unsubscribe link');
     if (content.length > 102400) commonIssues.push('Email might be clipped (too large)');
     
     return {
      success: true,
      placeholders: [...new Set(placeholders)],
      issues: commonIssues,
      isValid: commonIssues.length === 0,
     };
    }
    
    case 'translation_helper': {
     // Pre-processes text for translation (splits into chunks, protects tags)
     const tags = content.match(/<[^>]*>/g) || [];
     const protectedContent = content.replace(/<[^>]*>/g, ' [[TAG]] ');
     const chunks = protectedContent.match(/.{1,4000}/g) || [];
     
     return {
      success: true,
      chunks,
      tagCount: tags.length,
      note: 'Text chunked for LLM translation. Use chunks sequentially.',
     };
    }
    
    default:
     return { error: `Unknown operation: ${operation}` };
   }
  } catch (error) {
   return { success: false, error: (error as Error).message };
  }
 },
});
