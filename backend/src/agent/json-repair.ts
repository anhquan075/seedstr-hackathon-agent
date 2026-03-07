import { logger } from './logger.js';

function tryParseJSON(value: string): unknown | undefined {
 try {
  return JSON.parse(value);
 } catch {
  return undefined;
 }
}

function stripMarkdownFence(value: string): string {
 return value.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1');
}

function extractJsonChunk(value: string): string {
 const firstOpenBrace = value.indexOf('{');
 const firstOpenBracket = value.indexOf('[');
 const lastCloseBrace = value.lastIndexOf('}');
 const lastCloseBracket = value.lastIndexOf(']');

 let start = -1;
 let end = -1;

 if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
  start = firstOpenBrace;
  end = lastCloseBrace;
 } else if (firstOpenBracket !== -1) {
  start = firstOpenBracket;
  end = lastCloseBracket;
 }

 if (start !== -1 && end !== -1 && end > start) {
  return value.substring(start, end + 1);
 }

 return value;
}

function applyRepairs(value: string): string {
 let current = value;

 current = current.replace(/,(\s*[}\]])/g, '$1');
 current = current.replace(/,\s*,+/g, ',');

 current = current.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, inner: string) => {
  const escaped = inner.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
 });

 current = current.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');

 current = current.replace(/(?<![\w"])None(?![\w"])/g, 'null');
 current = current.replace(/(?<![\w"])True(?![\w"])/g, 'true');
 current = current.replace(/(?<![\w"])False(?![\w"])/g, 'false');

 current = current.replace(
  /((?:}|]|"|\d+|true|false|null))\s+(?=(?:"|[a-zA-Z_]))/g,
  '$1, '
 );
 current = current.replace(
  /((?:}|]|"|\d+|true|false|null))\s+(?=(?:-?\d|"|\{|\[|true|false|null))/g,
  '$1, '
 );

 return current;
}

export function repairJSON(input: string): unknown {
 const direct = tryParseJSON(input);
 if (direct !== undefined) {
  if (typeof direct === 'string') {
   const doubleParsed = tryParseJSON(direct);
   if (doubleParsed !== undefined && typeof doubleParsed === 'object' && doubleParsed !== null) {
    return doubleParsed;
   }
  }
  return direct;
 }

 let current = stripMarkdownFence(input.trim());

 const afterFence = tryParseJSON(current);
 if (afterFence !== undefined) return afterFence;

 current = extractJsonChunk(current);

 const extracted = tryParseJSON(current);
 if (extracted !== undefined) return extracted;

 if (current.startsWith('"') && current.endsWith('"')) {
  const unescaped = tryParseJSON(current);
  if (typeof unescaped === 'string') {
   const parsed = tryParseJSON(unescaped);
   if (parsed !== undefined) return parsed;
  }
 }

 for (let i = 0; i < 10; i++) {
  const repaired = applyRepairs(current);
  if (repaired === current) break;
  current = repaired;
  const parsed = tryParseJSON(current);
  if (parsed !== undefined) return parsed;
 }

 logger.warn('JSON repair failed after all strategies', { input: input.slice(0, 100) + '...' });
 throw new Error('Failed to repair JSON');
}
