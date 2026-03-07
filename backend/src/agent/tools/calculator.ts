import { tool } from 'ai';
import { z } from 'zod';
import { evaluate } from 'mathjs';

export const calculatorTool = tool({
 description: 'Perform mathematical calculations',
 inputSchema: z.object({
  expression: z.string().describe('The mathematical expression to evaluate'),
 }),
 execute: async ({ expression }) => {
  try {
   const result = evaluate(expression);
   return {
    success: true,
    result,
    expression,
   };
  } catch (error) {
   return {
    success: false,
    error: (error as Error).message,
   };
  }
 },
});
