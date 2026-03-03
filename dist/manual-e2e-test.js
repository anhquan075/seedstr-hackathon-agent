#!/usr/bin/env node
"use strict";
/**
 * Manual E2E Test - Component Verification
 * Tests agent components without requiring dist/ access
 */
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_js_1 = require("./api-client.js");
const llm_client_js_1 = require("./llm-client.js");
const project_builder_js_1 = require("./project-builder.js");
const index_js_1 = require("./tools/index.js");
async function main() {
    console.log('\n=================================');
    console.log('Manual E2E Component Test');
    console.log('=================================\n');
    let passedTests = 0;
    let failedTests = 0;
    // Test 1: Environment Variables
    console.log('[TEST 1] Environment Variables');
    const hasSeedstrKey = !!process.env.SEEDSTR_API_KEY;
    const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
    console.log(`  Seedstr API Key: ${hasSeedstrKey ? '✓ FOUND' : '✗ MISSING'}`);
    console.log(`  OpenRouter API Key: ${hasOpenRouterKey ? '✓ FOUND' : '✗ MISSING'}`);
    if (hasSeedstrKey && hasOpenRouterKey) {
        console.log('  ✓ Test 1 PASSED\n');
        passedTests++;
    }
    else {
        console.log('  ✗ Test 1 FAILED\n');
        failedTests++;
        process.exit(1);
    }
    // Test 2: API Client Connectivity
    console.log('[TEST 2] Seedstr API Connectivity');
    try {
        const apiClient = new api_client_js_1.ApiClient(process.env.SEEDSTR_API_KEY);
        const jobs = await apiClient.getJobs(1);
        console.log(`  ✓ Connected to Seedstr API`);
        console.log(`  ✓ Found ${jobs.jobs?.length || 0} active jobs`);
        console.log('  ✓ Test 2 PASSED\n');
        passedTests++;
    }
    catch (error) {
        console.error('  ✗ Failed to connect to Seedstr API');
        console.error(`  Error: ${error.message}`);
        console.log('  ✗ Test 2 FAILED\n');
        failedTests++;
    }
    // Test 3: LLM Client
    console.log('[TEST 3] OpenRouter LLM Connectivity');
    try {
        const llmClient = new llm_client_js_1.LLMClient(process.env.OPENROUTER_API_KEY);
        const response = await llmClient.generate({
            messages: [
                { role: 'system', content: 'You are a test assistant.' },
                { role: 'user', content: 'Say "OK" and nothing else.' },
            ],
            maxSteps: 1,
        });
        console.log(`  ✓ LLM responded: "${response.text.trim()}"`);
        console.log(`  ✓ Finish reason: ${response.finishReason}`);
        console.log('  ✓ Test 3 PASSED\n');
        passedTests++;
    }
    catch (error) {
        console.error('  ✗ Failed to connect to OpenRouter');
        console.error(`  Error: ${error.message}`);
        console.log('  ✗ Test 3 FAILED\n');
        failedTests++;
    }
    // Test 4: Calculator Tool
    console.log('[TEST 4] Calculator Tool');
    try {
        const result = await index_js_1.calculatorTool.execute({ expression: '2 + 2 * 3' });
        if (result.success && result.result === 8) {
            console.log(`  ✓ Calculator: 2 + 2 * 3 = ${result.result}`);
            console.log('  ✓ Test 4 PASSED\n');
            passedTests++;
        }
        else {
            throw new Error('Calculator returned incorrect result');
        }
    }
    catch (error) {
        console.error('  ✗ Calculator tool failed');
        console.error(`  Error: ${error.message}`);
        console.log('  ✗ Test 4 FAILED\n');
        failedTests++;
    }
    // Test 5: HTTP Request Tool
    console.log('[TEST 5] HTTP Request Tool');
    try {
        const result = await index_js_1.httpRequestTool.execute({
            url: 'https://api.github.com/zen',
            method: 'GET',
        });
        if (result.success && result.status === 200) {
            console.log(`  ✓ HTTP request successful (status ${result.status})`);
            console.log(`  ✓ Response: ${typeof result.data === 'string' ? result.data.substring(0, 50) : 'OK'}`);
            console.log('  ✓ Test 5 PASSED\n');
            passedTests++;
        }
        else {
            throw new Error(`HTTP request failed with status ${result.status}`);
        }
    }
    catch (error) {
        console.error('  ✗ HTTP request tool failed');
        console.error(`  Error: ${error.message}`);
        console.log('  ✗ Test 5 FAILED\n');
        failedTests++;
    }
    // Test 6: Image Generation Tool
    console.log('[TEST 6] Image Generation Tool');
    try {
        const result = await index_js_1.generateImageTool.execute({
            prompt: 'test image',
            width: 256,
            height: 256,
        });
        if (result.success && result.imageUrl) {
            console.log(`  ✓ Image generated successfully`);
            console.log(`  ✓ URL: ${result.imageUrl.substring(0, 60)}...`);
            console.log('  ✓ Test 6 PASSED\n');
            passedTests++;
        }
        else {
            throw new Error('Image generation failed');
        }
    }
    catch (error) {
        console.error('  ✗ Image generation tool failed');
        console.error(`  Error: ${error.message}`);
        console.log('  ✗ Test 6 FAILED\n');
        failedTests++;
    }
    // Test 7: Web Search Tool
    console.log('[TEST 7] Web Search Tool');
    try {
        const result = await index_js_1.webSearchTool.execute({
            query: 'Next.js',
            maxResults: 3,
        });
        if (result.success && result.results && result.results.length > 0) {
            console.log(`  ✓ Web search successful`);
            console.log(`  ✓ Found ${result.results.length} results`);
            console.log('  ✓ Test 7 PASSED\n');
            passedTests++;
        }
        else {
            throw new Error('Web search returned no results');
        }
    }
    catch (error) {
        console.error('  ✗ Web search tool failed');
        console.error(`  Error: ${error.message}`);
        console.log('  ✗ Test 7 FAILED\n');
        failedTests++;
    }
    // Test 8: Project Builder
    console.log('[TEST 8] Project Builder');
    try {
        const builder = new project_builder_js_1.ProjectBuilder();
        builder.createFile('test.html', '<h1>Test</h1>');
        builder.createFile('test.css', 'body { margin: 0; }');
        const zip = await builder.buildZip();
        if (zip.byteLength > 0) {
            console.log(`  ✓ Project builder created ZIP (${zip.byteLength} bytes)`);
            console.log('  ✓ Test 8 PASSED\n');
            passedTests++;
        }
        else {
            throw new Error('ZIP file is empty');
        }
    }
    catch (error) {
        console.error('  ✗ Project builder failed');
        console.error(`  Error: ${error.message}`);
        console.log('  ✗ Test 8 FAILED\n');
        failedTests++;
    }
    // Summary
    console.log('=================================');
    console.log('Test Summary');
    console.log('=================================');
    console.log(`Total Tests: ${passedTests + failedTests}`);
    console.log(`✓ Passed: ${passedTests}`);
    console.log(`✗ Failed: ${failedTests}`);
    console.log('=================================\n');
    if (failedTests === 0) {
        console.log('🎉 ALL TESTS PASSED! Agent is ready for production.\n');
        process.exit(0);
    }
    else {
        console.log('❌ SOME TESTS FAILED. Please fix the issues above.\n');
        process.exit(1);
    }
}
main().catch((error) => {
    console.error('\n❌ Test suite crashed:');
    console.error(error);
    process.exit(1);
});
