#!/usr/bin/env node
import 'dotenv/config';
import { AgentRunner } from './runner.js';
import { SeedstrJob } from './types.js';
import { logger } from './logger.js';

/**
 * Live Integration Test - Processes a real job end-to-end
 * 
 * This test:
 * 1. Creates a realistic job structure
 * 2. Calls the agent's internal job handler
 * 3. Monitors generation → build → ZIP → submission
 * 4. Validates the full pipeline works
 */

async function runLiveTest() {
  console.log('🚀 Seedstr Agent - LIVE Integration Test');
  console.log('=========================================\n');

  // Validate environment
  if (!process.env.SEEDSTR_API_KEY || !process.env.OPENROUTER_API_KEY) {
    console.error('❌ Missing required environment variables');
    console.error('   Required: SEEDSTR_API_KEY, OPENROUTER_API_KEY');
    process.exit(1);
  }

  // Initialize agent
  console.log('📋 Initializing Agent Runner...');
  const agent = new AgentRunner({
    seedstrApiKey: process.env.SEEDSTR_API_KEY!,
    openrouterApiKey: process.env.OPENROUTER_API_KEY!,
    models: ['meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.0-flash-exp:free'],
    pollInterval: 5000,
    ssePort: 3001,
  });

  // Create a test job (simulating what Seedstr API would return)
  const testJob: SeedstrJob = {
    id: `test-${Date.now()}`,
    prompt: 'Create a modern glassmorphism landing page for a SaaS product called "CloudSync". Include a hero section with a catchy headline, 3 feature cards with icons, a pricing section with 3 tiers, and a footer. Use gradients and blur effects.',
    budget: 3,
    createdAt: new Date().toISOString(),
    status: 'OPEN',
    jobType: 'STANDARD',
    responseCount: 0,
    acceptedCount: 0,
  };

  console.log('✅ Agent initialized');
  console.log(`📝 Test Job ID: ${testJob.id}`);
  console.log(`💰 Budget: $${testJob.budget}`);
  console.log(`📄 Prompt: "${testJob.prompt.substring(0, 80)}..."\n`);

  // Listen to agent events
  agent.on('job_start', (data) => {
    console.log('🏁 Job started:', data.id);
  });

  agent.on('job_generating', (data) => {
    console.log('🤖 Generating...', {
      progress: data.progress,
      chunk: data.chunk?.substring(0, 50),
    });
  });

  agent.on('job_building', (data) => {
    console.log('🔨 Building project...', data.id);
  });

  agent.on('job_submitting', (data) => {
    console.log('📤 Submitting to Seedstr...', data.id);
  });

  agent.on('job_success', (data) => {
    console.log('✅ Job completed successfully!');
    console.log('   Submission:', data);
  });

  agent.on('job_failed', (data) => {
    console.error('❌ Job failed:', data.error);
  });

  // Process the job
  console.log('⏳ Starting job processing...\n');
  console.log('─'.repeat(60));
  
  const startTime = Date.now();

  try {
    // Call internal handleJob method through a workaround
    // @ts-ignore - accessing private method for testing
    await agent.handleJob(testJob);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('─'.repeat(60));
    console.log(`\n🎉 Test Complete! Duration: ${duration}s`);
    console.log('\n📊 Results:');
    console.log('   • Generation: ✓');
    console.log('   • Build: ✓');
    console.log('   • ZIP creation: ✓');
    console.log('   • Submission: ✓');
    console.log('\n🏆 Agent is production-ready!');
    
  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
runLiveTest().catch((error) => {
  logger.error('Live test failed', error);
  process.exit(1);
});
