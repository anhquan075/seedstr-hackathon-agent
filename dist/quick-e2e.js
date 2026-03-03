#!/usr/bin/env node
"use strict";
/**
 * Quick E2E Verification Test
 * Tests core components without full agent initialization
 */
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const path_1 = require("path");
const dotenv_1 = require("dotenv");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
const rootDir = (0, path_1.join)(__dirname, '../..');
// Load environment variables
(0, dotenv_1.config)({ path: (0, path_1.join)(rootDir, '.env') });
console.log('===================================');
console.log('Quick E2E Verification Test');
console.log('===================================\n');
let testsRun = 0;
let testsPassed = 0;
async function test(name, fn) {
    testsRun++;
    console.log(`[TEST ${testsRun}] ${name}`);
    try {
        await fn();
        testsPassed++;
        console.log(`  ✓ PASSED\n`);
    }
    catch (error) {
        console.error(`  ✗ FAILED: ${error.message}\n`);
    }
}
async function main() {
    // Test 1: Environment Variables
    await test('Environment Configuration', async () => {
        const hasApiKey = !!process.env.SEEDSTR_API_KEY;
        const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
        if (!hasApiKey)
            throw new Error('SEEDSTR_API_KEY not found');
        if (!hasOpenRouter)
            throw new Error('OPENROUTER_API_KEY not found');
        console.log(`    - SEEDSTR_API_KEY: ${hasApiKey ? 'SET' : 'MISSING'}`);
        console.log(`    - OPENROUTER_API_KEY: ${hasOpenRouter ? 'SET' : 'MISSING'}`);
    });
    // Test 2: Tool Imports
    await test('Tool Imports', async () => {
        const { webSearchTool, calculatorTool, createFileTool, finalizeProjectTool, generateImageTool, httpRequestTool, } = await import('./tools/index.js');
        const tools = [
            webSearchTool,
            calculatorTool,
            createFileTool,
            finalizeProjectTool,
            generateImageTool,
            httpRequestTool,
        ];
        if (tools.some(t => !t))
            throw new Error('Some tools are undefined');
        console.log(`    - Imported 6 tools successfully`);
    });
    // Test 3: Calculator Tool
    await test('Calculator Tool', async () => {
        const { calculatorTool } = await import('./tools/index.js');
        const result = await calculatorTool.execute({ expression: '2 + 2 * 3' });
        if (!result.success)
            throw new Error('Calculator failed');
        if (result.result !== 8)
            throw new Error(`Expected 8, got ${result.result}`);
        console.log(`    - Expression: 2 + 2 * 3`);
        console.log(`    - Result: ${result.result}`);
    });
    // Test 4: HTTP Request Tool
    await test('HTTP Request Tool', async () => {
        const { httpRequestTool } = await import('./tools/index.js');
        const result = await httpRequestTool.execute({
            url: 'https://api.github.com/zen',
            method: 'GET',
        });
        if (!result.success)
            throw new Error('HTTP request failed');
        if (result.status !== 200)
            throw new Error(`Expected 200, got ${result.status}`);
        console.log(`    - URL: https://api.github.com/zen`);
        console.log(`    - Status: ${result.status}`);
        console.log(`    - Response: ${String(result.data).substring(0, 50)}...`);
    });
    // Test 5: Image Generation Tool
    await test('Image Generation Tool', async () => {
        const { generateImageTool } = await import('./tools/index.js');
        const result = await generateImageTool.execute({
            prompt: 'a simple test pattern',
            width: 256,
            height: 256,
        });
        if (!result.success)
            throw new Error('Image generation failed');
        if (!result.imageUrl)
            throw new Error('No image URL returned');
        console.log(`    - Prompt: ${result.prompt}`);
        console.log(`    - Image URL: ${result.imageUrl.substring(0, 60)}...`);
    });
    // Test 6: Project Builder
    await test('Project Builder', async () => {
        const { ProjectBuilder } = await import('./project-builder.js');
        const builder = new ProjectBuilder('test-project');
        builder.addFile('index.html', '<h1>Test</h1>');
        builder.addFile('style.css', 'body { margin: 0; }');
        const zip = await builder.createZip();
        if (!(zip instanceof Buffer))
            throw new Error('ZIP is not a Buffer');
        if (zip.byteLength === 0)
            throw new Error('ZIP is empty');
        console.log(`    - Files: index.html, style.css`);
        console.log(`    - ZIP size: ${zip.byteLength} bytes`);
    });
    // Test 7: Seedstr API Client
    await test('Seedstr API Client', async () => {
        const { SeedstrApiClient } = await import('./api-client.js');
        const apiKey = process.env.SEEDSTR_API_KEY || '';
        const client = new SeedstrApiClient(apiKey);
        const jobs = await client.getJobs(1);
        console.log(`    - API Response: ${jobs.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`    - Active jobs: ${jobs.jobs?.length || 0}`);
    });
    // Summary
    console.log('===================================');
    console.log(`Results: ${testsPassed}/${testsRun} tests passed`);
    console.log('===================================');
    if (testsPassed !== testsRun) {
        process.exit(1);
    }
}
main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});
