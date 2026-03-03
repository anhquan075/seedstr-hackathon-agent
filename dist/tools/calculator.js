"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatorTool = void 0;
const ai_1 = require("ai");
const zod_1 = require("zod");
const mathjs_1 = require("mathjs");
exports.calculatorTool = (0, ai_1.tool)({
    description: 'Perform mathematical calculations',
    inputSchema: zod_1.z.object({
        expression: zod_1.z.string().describe('The mathematical expression to evaluate'),
    }),
    execute: async ({ expression }) => {
        try {
            const result = (0, mathjs_1.evaluate)(expression);
            return {
                success: true,
                result,
                expression,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    },
});
