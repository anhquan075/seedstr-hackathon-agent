import { type DesignSystem } from './types.js';
/**
 * Pre-baked design systems to reduce LLM output variance
 * Each system includes tokens and component templates
 */
export declare const designSystems: Record<string, DesignSystem>;
export declare function getDesignSystem(name?: string): DesignSystem;
export declare function getDesignSystemNames(): string[];
//# sourceMappingURL=design-system.d.ts.map