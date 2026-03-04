import { logger } from './logger.js';

/**
 * Advanced JSON Repair Engine
 * Attempts to repair malformed JSON strings from LLM outputs using multiple strategies.
 */
export function repairJSON(input: string): unknown {
  // Strategy 1: Direct Parse
  try {
    const parsed = JSON.parse(input);
    // If it's a string, it might be double-encoded JSON (e.g. "{\"a\":1}")
    if (typeof parsed === 'string') {
      try {
        const doubleParsed = JSON.parse(parsed);
        if (typeof doubleParsed === 'object' && doubleParsed !== null) {
          return doubleParsed;
        }
      } catch {
        // Not double-encoded, return original string if it was valid JSON string
      }
    }
    return parsed;
  } catch {
    // Continue to repair
  }

  let current = input.trim();

  // Strategy 2: Remove Markdown Code Blocks
  // Matches ```json ... ``` or just ``` ... ```
  current = current.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1');
  
  // Try parse after markdown removal
  try {
    return JSON.parse(current);
  } catch {
    // Continue
  }

  // Strategy 3: Extract JSON object/array from text
  // Finds the first '{' or '[' and the last '}' or ']'
  const jsonStart = current.search(/[{\[]/);
  const jsonEnd = current.search(/[}\]]\s*$/); // Search from end is harder with regex, let's use lastIndexOf
  
  const firstOpenBrace = current.indexOf('{');
  const firstOpenBracket = current.indexOf('[');
  const lastCloseBrace = current.lastIndexOf('}');
  const lastCloseBracket = current.lastIndexOf(']');

  let start = -1;
  let end = -1;

  // Determine if it looks like an object or array
  if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
    start = firstOpenBrace;
    end = lastCloseBrace;
  } else if (firstOpenBracket !== -1) {
    start = firstOpenBracket;
    end = lastCloseBracket;
  }

  if (start !== -1 && end !== -1 && end > start) {
    current = current.substring(start, end + 1);
    try {
      return JSON.parse(current);
    } catch {
      // Continue
    }
  }

  // Strategy 4: Iterative Regex Fixes
  // We apply fixes one by one and try parsing.
  
  // 4.1 Fix trailing commas (e.g. {"a": 1,})
  current = current.replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(current); } catch {}

  // 4.2 Fix unquoted keys (e.g. {key: "value"})
  // This regex finds word characters followed by colon, not in quotes
  // Note: This is a naive heuristic and might break mixed content, but often works for LLM output
  current = current.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');
  try { return JSON.parse(current); } catch {}

  // 4.3 Fix single quotes for keys (e.g. {'key': "value"})
  current = current.replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":');
  try { return JSON.parse(current); } catch {}

  // 4.4 Fix single quotes for values (RISKY - e.g. { "key": 'value' })
  // We try to match simple string values in single quotes
  current = current.replace(/:\s*'([^']*)'(?=\s*[,}\]])/g, ': "$1"');
  try { return JSON.parse(current); } catch {}

  // 4.5 Fix missing commas between properties (e.g. "a": 1 "b": 2)
  // Look for end of a value (quote, digit, boolean, null, brace, bracket) followed by whitespace and a quote (start of next key)
  current = current.replace(/((?:}|]|"|'|\d+|true|false|null))\s+(?=")/g, '$1, ');
  try { return JSON.parse(current); } catch {}

  // 4.6 Fix Python-style constants
  current = current.replace(/: \s*None/g, ': null');
  current = current.replace(/: \s*True/g, ': true');
  current = current.replace(/: \s*False/g, ': false');
  try { return JSON.parse(current); } catch {}

  // 4.7 Fix escaped quotes in JSON strings (LLMs sometimes double escape)
  // e.g. "{\"key\": \"value\"}" -> {"key": "value"}
  if (current.startsWith('"') && current.endsWith('"')) {
    try {
      const unescaped = JSON.parse(current);
      if (typeof unescaped === 'string') {
        try {
          return JSON.parse(unescaped);
        } catch {}
        // If unescaped is a string that looks like JSON, maybe it was stringified JSON
        if (unescaped.trim().startsWith('{') || unescaped.trim().startsWith('[')) {
             try { return JSON.parse(unescaped); } catch {}
        }
      }
    } catch {}
  }
  
  // Final Attempt: Aggressive Cleanup
  // Remove control characters that are strictly illegal in JSON strings (newlines, tabs in values)
  // This is hard to do correctly with regex without breaking valid structure. 
  // We'll skip this to avoid data corruption.

  logger.warn('JSON repair failed after all strategies', { input: input.slice(0, 100) + '...' });
  throw new Error('Failed to repair JSON');
}
