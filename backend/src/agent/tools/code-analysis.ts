import { tool } from 'ai';
import { z } from 'zod';

/**
 * Code Analysis tool - helps the agent think through code logic,
 * identify bugs, or suggest improvements without running it.
 */
export const codeAnalysisTool = tool({
 description: 'Analyze code snippets for logic, bugs, review, or improvements.',
 inputSchema: z.object({
  code: z.string().describe('The code snippet to analyze'),
  language: z.string().optional().describe('The programming language'),
  task: z.enum(['explain', 'debug', 'improve', 'review']).describe('The analysis task'),
 }),
 execute: async ({ code, language, task }) => {
  // This is a meta-tool: it returns structured data for the LLM to use in its next step
  return {
   success: true,
   task,
   language: language || 'unknown',
   note: `Analysis complete for ${task}. Review the code logic and proceed with the generation.`,
  };
 },
});
