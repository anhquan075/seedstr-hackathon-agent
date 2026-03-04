#!/usr/bin/env node

/**
 * Comprehensive Smoke Test Suite for Seedstr Agent
 * Tests all critical features before deployment
 */

import { SeedstrAPIClient } from './api-client.js';
import { LLMClient } from './llm-client.js';
import { repairJSON } from './json-repair.js';
import { getDesignSystemNames, getDesignSystem } from './design-system.js';
import { getAllTemplates } from './ui-templates.js';
import * as tools from './tools/index.js';

class SmokeTest {
  private passed = 0;
  private failed = 0;
  private skipped = 0;

  async runTest(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      this.passed++;
    } catch (error: any) {
      console.error(`  ❌ ${name}: ${error.message}`);
      this.failed++;
    }
  }

  async run(): Promise<void> {
    console.log('\n🚀 Seedstr Agent Smoke Test Suite\n');
    console.log('='.repeat(50));

    await this.testAPIClient();
    await this.testLLMClient();
    await this.testJSONRepair();
    await this.testDesignSystems();
    await this.testUITemplates();
    await this.testTools();

    this.printReport();
  }

  private async testAPIClient(): Promise<void> {
    console.log('\n🔌 Testing API Client...');

    await this.runTest('API Client - Initialization', async () => {
      const client = new SeedstrAPIClient('test-key');
      if (!client) throw new Error('Failed to initialize API Client');
    });

    await this.runTest('API Client - Optional API Key', async () => {
      const client = new SeedstrAPIClient();
      if (!client) throw new Error('Failed to initialize without API key');
    });

    await this.runTest('API Client - Methods Exist', async () => {
      const client = new SeedstrAPIClient('test-key');
      const methods = ['getJobs', 'getJob', 'submitResponse', 'acceptJob', 'declineJob', 'getMe', 'register', 'uploadFiles'];
      for (const method of methods) {
        if (typeof (client as any)[method] !== 'function') {
          throw new Error(`Method ${method} not found`);
        }
      }
    });
  }

  private async testLLMClient(): Promise<void> {
    console.log('\n🤖 Testing LLM Client...');

    await this.runTest('LLM Client - Initialization', async () => {
      const client = new LLMClient({
        openrouterApiKey: process.env.OPENROUTER_API_KEY || 'test-key',
      });
      if (!client) throw new Error('Failed to initialize LLM Client');
    });

    if (process.env.OPENROUTER_API_KEY) {
      await this.runTest('LLM Client - Generate (live)', async () => {
        const client = new LLMClient({
          openrouterApiKey: process.env.OPENROUTER_API_KEY!,
        });
        const response = await client.generate({
          messages: [{ role: 'user', content: 'Say "test" and nothing else' }],
          temperature: 0,
          budget: 1.0,
        });
        if (!response || !response.text) {
          throw new Error('Generate returned invalid response');
        }
      });
    } else {
      console.log('  ⚠️  LLM Client - Generate (skipped: no API key)');
      this.skipped++;
    }
  }

  private async testJSONRepair(): Promise<void> {
    console.log('\n🔧 Testing JSON Repair...');

    await this.runTest('JSON Repair - Valid JSON', async () => {
      const result = repairJSON('{"test": true}');
      if (typeof result !== 'object' || result === null) {
        throw new Error('Failed to parse valid JSON');
      }
    });

    await this.runTest('JSON Repair - Markdown Wrapped', async () => {
      const result = repairJSON('```json\n{"test": true}\n```');
      if (typeof result !== 'object' || result === null) {
        throw new Error('Failed to repair markdown-wrapped JSON');
      }
    });

    await this.runTest('JSON Repair - Trailing Comma', async () => {
      const result = repairJSON('{"a": 1, "b": 2,}');
      if (typeof result !== 'object' || result === null) {
        throw new Error('Failed to repair trailing comma');
      }
    });

    await this.runTest('JSON Repair - Missing Quotes', async () => {
      const result = repairJSON('{test: true}');
      if (typeof result !== 'object' || result === null) {
        throw new Error('Failed to repair missing quotes');
      }
    });
  }

  private async testDesignSystems(): Promise<void> {
    console.log('\n🎨 Testing Design Systems...');

    await this.runTest('Design Systems - Get All Names', async () => {
      const names = getDesignSystemNames();
      if (!Array.isArray(names) || names.length < 13) {
        throw new Error(`Expected at least 13 design systems, got ${names.length}`);
      }
    });

    await this.runTest('Design Systems - Get Glassmorphism', async () => {
      const system = getDesignSystem('glassmorphism');
      if (!system || !system.tokens) {
        throw new Error('Failed to get glassmorphism design system');
      }
    });

    await this.runTest('Design Systems - Get Corporate', async () => {
      const system = getDesignSystem('corporate-professional');
      if (!system || !system.tokens) {
        throw new Error('Failed to get corporate design system');
      }
    });

    await this.runTest('Design Systems - Get Default', async () => {
      const system = getDesignSystem();
      if (!system || !system.tokens) {
        throw new Error('Failed to get default design system');
      }
    });
  }

  private async testUITemplates(): Promise<void> {
    console.log('\n📄 Testing UI Templates...');

    await this.runTest('UI Templates - Get All', async () => {
      const templates = getAllTemplates();
      if (!Array.isArray(templates) || templates.length < 20) {
        throw new Error(`Expected at least 20 templates, got ${templates.length}`);
      }
    });

    await this.runTest('UI Templates - Templates Have Required Fields', async () => {
      const templates = getAllTemplates();
      const first = templates[0];
      if (!first.name || !first.description || !first.prompt) {
        throw new Error('Template missing required fields');
      }
    });
  }

  private async testTools(): Promise<void> {
    console.log('\n🛠️  Testing Tools...');

    await this.runTest('Tools - Import All', async () => {
      const exportedTools = Object.keys(tools);
      if (exportedTools.length < 9) {
        throw new Error(`Expected at least 9 tool exports, got ${exportedTools.length}`);
      }
    });

    await this.runTest('Tools - QR Code Tool Exists', async () => {
      const { generateQrCodeTool } = await import('./tools/qr-code.js');
      if (typeof generateQrCodeTool !== 'object' || !generateQrCodeTool.description) {
        throw new Error('QR Code tool not found or invalid');
      }
    });

    await this.runTest('Tools - CSV Analysis Tool Exists', async () => {
      const { csvAnalysisTool } = await import('./tools/csv-analysis.js');
      if (typeof csvAnalysisTool !== 'object' || !csvAnalysisTool.description) {
        throw new Error('CSV Analysis tool not found or invalid');
      }
    });

    await this.runTest('Tools - Text Processing Tool Exists', async () => {
      const { textProcessingTool } = await import('./tools/text-processing.js');
      if (typeof textProcessingTool !== 'object' || !textProcessingTool.description) {
        throw new Error('Text Processing tool not found or invalid');
      }
    });

    await this.runTest('Tools - Web Search Tool Exists', async () => {
      const { webSearchTool } = await import('./tools/web-search.js');
      if (typeof webSearchTool !== 'object' || !webSearchTool.description) {
        throw new Error('Web Search tool not found or invalid');
      }
    });
  }

  private printReport(): void {
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Test Results:\n');
    console.log(`  ✅ Passed:  ${this.passed}`);
    console.log(`  ❌ Failed:  ${this.failed}`);
    console.log(`  ⚠️  Skipped: ${this.skipped}`);
    console.log(`  📈 Total:   ${this.passed + this.failed + this.skipped}`);
    
    const successRate = this.passed / (this.passed + this.failed) * 100;
    console.log(`\n  Success Rate: ${successRate.toFixed(1)}%\n`);

    if (this.failed > 0) {
      console.log('❌ Smoke test FAILED');
      process.exit(1);
    } else {
      console.log('✅ All smoke tests PASSED!');
      process.exit(0);
    }
  }
}

// Run smoke test
const smokeTest = new SmokeTest();
smokeTest.run().catch((error) => {
  console.error('\n❌ Smoke test crashed:', error);
  process.exit(1);
});
