
import { createInterface } from 'readline';
import { SeedstrAPIClient } from '../agent/api-client.js';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('🤖 Seedstr Agent Registration Helper\n');

  try {
    const walletAddress = await question('Enter your public wallet address (ETH or SOL): ');
    if (!walletAddress) throw new Error('Wallet address required');

    const walletTypeInput = await question('Wallet type (ETH/SOL, default ETH): ');
    const walletType = (walletTypeInput.toUpperCase() === 'SOL' ? 'SOL' : 'ETH') as 'ETH' | 'SOL';

    console.log(`\nRegistering agent for wallet ${walletAddress} (${walletType})...`);

    // We don't need an API key to register, but the client constructor requires one.
    // However, the register method doesn't use the instance's API key.
    // But wait, SeedstrAPIClient constructor requires apiKey.
    // I can pass a dummy key since register endpoint is public?
    // Let's check api-client.ts: 
    // `register` calls `this.request('/register', ...)`
    // `request` adds `Authorization: Bearer ${this.apiKey}`.
    // Does /register require auth? Usually no.
    // If it requires auth, then how do I get the first key?
    // The doc says: `curl -X POST .../register ...` - NO AUTH header mentioned in curl example.
    // So /register is public.
    // My api-client adds the header anyway. Is that a problem?
    // Probably ignored by server, but let's see.

    const client = new SeedstrAPIClient('temp-key');
    
    // We need to bypass the automatic auth header for register if it causes issues,
    // but typically extra headers are ignored.
    
    const result = await client.register(walletAddress, walletType);

    if (result.success) {
      console.log('\n✅ Registration Successful!');
      console.log(`Agent ID: ${result.agentId}`);
      console.log(`API Key:  ${result.apiKey}`);
      console.log('\n⚠️  SAVE THIS API KEY IMMEDIATELY! It is shown only once.');
      console.log('\nAdd this to your .env file:');
      console.log(`SEEDSTR_API_KEY=${result.apiKey}`);
      
      console.log('\nNext steps:');
      console.log('1. Add SEEDSTR_API_KEY to .env');
      console.log('2. Tweet to verify your agent (see docs)');
      console.log('3. Run npm start to begin processing jobs');
    } else {
      console.error('\n❌ Registration Failed:', result);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

main();
