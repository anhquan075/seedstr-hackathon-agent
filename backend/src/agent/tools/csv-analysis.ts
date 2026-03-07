import { tool } from 'ai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

/**
 * Simple CSV parser
 * Handles basic CSV rules (quotes, commas)
 */
function parseCSV(text: string): string[][] {
 const rows: string[][] = [];
 let currentRow: string[] = [];
 let currentCell = '';
 let inQuotes = false;
 
 for (let i = 0; i < text.length; i++) {
  const char = text[i];
  const nextChar = text[i + 1];
  
  if (inQuotes) {
   if (char === '"' && nextChar === '"') {
    currentCell += '"';
    i++; // Skip next quote
   } else if (char === '"') {
    inQuotes = false;
   } else {
    currentCell += char;
   }
  } else {
   if (char === '"') {
    inQuotes = true;
   } else if (char === ',') {
    currentRow.push(currentCell);
    currentCell = '';
   } else if (char === '\n' || char === '\r') {
    if (currentCell || currentRow.length > 0) {
     currentRow.push(currentCell);
     rows.push(currentRow);
     currentRow = [];
     currentCell = '';
    }
    // Handle \r\n
    if (char === '\r' && nextChar === '\n') i++;
   } else {
    currentCell += char;
   }
  }
 }
 
 if (currentCell || currentRow.length > 0) {
  currentRow.push(currentCell);
  rows.push(currentRow);
 }
 
 return rows;
}

/**
 * Calculate basic statistics for a column
 */
function analyzeColumn(values: string[]): any {
 const numericValues = values
  .map(v => parseFloat(v))
  .filter(v => !isNaN(v));
  
 const isNumeric = numericValues.length > values.length * 0.8; // 80% numeric
 
 if (isNumeric && numericValues.length > 0) {
  const sum = numericValues.reduce((a, b) => a + b, 0);
  const mean = sum / numericValues.length;
  const sorted = [...numericValues].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  
  return {
   type: 'numeric',
   count: values.length,
   valid_numeric: numericValues.length,
   min,
   max,
   mean: Number(mean.toFixed(4)),
   median,
   sum: Number(sum.toFixed(4)),
  };
 }
 
 // Categorical analysis
 const counts: Record<string, number> = {};
 for (const v of values) {
  counts[v] = (counts[v] || 0) + 1;
 }
 
 const uniqueCount = Object.keys(counts).length;
 const topValues = Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([value, count]) => ({ value, count }));
  
 return {
  type: 'categorical',
  count: values.length,
  unique: uniqueCount,
  top_values: topValues,
 };
}

export const csvAnalysisTool = tool({
 description: 'Analyze CSV data to extract statistics, schema, and insights',
 inputSchema: z.object({
  filePath: z.string().optional().describe('Path to the CSV file to analyze'),
  content: z.string().optional().describe('Direct CSV content string (if file not provided)'),
  delimiter: z.string().optional().default(','),
 }),
 execute: async ({ filePath, content, delimiter = ',' }) => {
  try {
   let csvContent = content || '';
   
   // Load file if path provided
   if (filePath) {
    if (!fs.existsSync(filePath)) {
     return { error: `File not found: ${filePath}` };
    }
    csvContent = fs.readFileSync(filePath, 'utf-8');
   }
   
   if (!csvContent) {
    return { error: 'No CSV content provided' };
   }
   
   // Parse CSV
   const rows = parseCSV(csvContent);
   
   if (rows.length === 0) {
    return { error: 'Empty CSV content' };
   }
   
   // Assume header is first row
   const headers = rows[0];
   const dataRows = rows.slice(1);
   
   // Analyze columns
   const columnStats: Record<string, any> = {};
   
   for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const values = dataRows.map(row => row[i] || '').filter(v => v !== '');
    columnStats[header] = analyzeColumn(values);
   }
   
   return {
    success: true,
    summary: {
     rows: dataRows.length,
     columns: headers.length,
     headers: headers,
    },
    analysis: columnStats,
    preview: dataRows.slice(0, 3), // Return first 3 rows as preview
   };
   
  } catch (error) {
   return {
    success: false,
    error: (error as Error).message,
   };
  }
 },
});
