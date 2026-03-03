import { logger } from './logger.js';
/**
 * Attempts to repair common JSON malformations from LLM outputs
 */
export function repairJSON(input) {
    try {
        // Try direct parse first
        return JSON.parse(input);
    }
    catch {
        logger.debug('Initial JSON parse failed, attempting repair');
    }
    let repaired = input.trim();
    // Remove markdown code blocks
    repaired = repaired.replace(/^```(?:json)?\s*\n?/gm, '');
    repaired = repaired.replace(/\n?```\s*$/gm, '');
    // Remove leading/trailing non-JSON content
    const jsonStart = repaired.search(/[{\[]/);
    const jsonEnd = repaired.search(/[}\]]\s*$/);
    if (jsonStart !== -1 && jsonEnd !== -1) {
        repaired = repaired.slice(jsonStart, jsonEnd + 1);
    }
    // Fix unescaped quotes in strings (naive approach)
    // This is tricky and may fail on complex cases
    repaired = repaired.replace(/([^\\])"([^":{}\[\],]*)":/g, '$1\\"$2":');
    // Fix trailing commas
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    // Fix missing commas between properties
    repaired = repaired.replace(/("\s*)\n\s*"/g, '$1,\n"');
    repaired = repaired.replace(/(\d)\n\s*"/g, '$1,\n"');
    repaired = repaired.replace(/(true|false|null)\n\s*"/g, '$1,\n"');
    // Fix single quotes to double quotes (risky)
    repaired = repaired.replace(/'/g, '"');
    // Try parsing again
    try {
        return JSON.parse(repaired);
    }
    catch (error) {
        logger.error('JSON repair failed', { input: input.slice(0, 200), error });
        throw new Error(`Unable to repair JSON: ${error.message}`);
    }
}
//# sourceMappingURL=json-repair.js.map