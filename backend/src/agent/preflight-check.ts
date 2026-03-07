/**
 * Preflight verification checks for Seedstr Blind Hackathon
 * Ensures agent is registered, verified, and ready for blind-drop competition
 */

import { SeedstrAPIClient } from './api-client.js';
import { logger } from './logger.js';

export interface PreflightResult {
 verified: boolean;
 agentId?: string;
 walletAddress?: string;
 walletType?: string;
 isVerified?: boolean;
 errors: string[];
 timestamp: number;
}

export class PreflightChecker {
 private apiClient: SeedstrAPIClient;

 constructor(apiKey: string) {
  this.apiClient = new SeedstrAPIClient(apiKey);
 }

 /**
  * Run all preflight checks
  * Returns true if agent is ready for blind-drop competition
  */
 async runAllChecks(): Promise<PreflightResult> {
  const result: PreflightResult = {
   verified: false,
   errors: [],
   timestamp: Date.now(),
  };

  logger.info('Running preflight checks for Blind Hackathon...');

  try {
   // Check 1: Agent identity and verification status
   const meData = await this.checkAgentIdentity();
   if (!meData.verified) {
    result.errors.push('Agent identity check failed');
    return result;
   }

   result.agentId = meData.agentId;
   result.walletAddress = meData.walletAddress;
   result.walletType = meData.walletType;
   result.isVerified = meData.isVerified;

   // Check 2: Verification status
   if (!meData.isVerified) {
    result.errors.push(
     `Agent is not verified. Please complete verification on Seedstr before blind-drop.`
    );
    return result;
   }

   // Check 4: Wallet configuration
   if (!meData.walletAddress) {
    result.errors.push('Wallet address not configured');
    return result;
   }

   // Check 5: FFmpeg availability (required for Video Editing skill)
   if (meData.skills && meData.skills.includes('Video Editing')) {
    try {
     const { execSync } = await import('child_process');
     execSync('ffmpeg -version');
     logger.info(' FFmpeg check PASSED');
    } catch (e) {
     result.errors.push('FFmpeg is required for the Video Editing skill but not found in PATH');
     return result;
    }
   }

   logger.info(' All preflight checks passed');
   logger.info('Agent Details:', {
    agentId: meData.agentId,
    walletAddress: meData.walletAddress,
    walletType: meData.walletType,
    verified: meData.isVerified,
   });

   result.verified = true;
   return result;
  } catch (error) {
   const errorMsg =
    error instanceof Error ? error.message : String(error);
   logger.error('Preflight check failed:', errorMsg);
   result.errors.push(`Preflight check error: ${errorMsg}`);
   return result;
  }
 }

 /**
  * Check agent identity from /me endpoint
  */
 private async checkAgentIdentity(): Promise<{
  verified: boolean;
  agentId?: string;
  walletAddress?: string;
  walletType?: string;
  isVerified?: boolean;
  skills?: string[];
 }> {
  try {
   const me = await this.apiClient.getMe();

   if (!me || typeof me !== 'object') {
    throw new Error('Invalid response from /me endpoint');
   }

   const agentId = me.id || me.agentId;
   const walletAddress = me.walletAddress || me.wallet?.address;
   const walletType = me.walletType || me.wallet?.type;
   const isVerified = me.verification?.isVerified || me.isVerified;
   const skills = me.skills || [];

   if (!agentId) {
    throw new Error('Agent ID not found in /me response');
   }

   return {
    verified: !!agentId,
    agentId,
    walletAddress,
    walletType,
    isVerified,
    skills,
   };
  } catch (error) {
   const errorMsg =
    error instanceof Error ? error.message : String(error);
   logger.error('Failed to check agent identity:', errorMsg);
   throw error;
  }
 }

 /**
  * Generate preflight report for documentation
  */
 async generateReport(result: PreflightResult): Promise<string> {
  const timestamp = new Date(result.timestamp).toISOString();

  let report = `# Seedstr Preflight Check Report\n\n`;
  report += `**Generated**: ${timestamp}\n\n`;

  if (result.verified) {
   report += `## Status: VERIFIED\n\n`;
   report += `Your agent is ready for the Blind Hackathon.\n\n`;
   report += `### Agent Details\n`;
   report += `- **Agent ID**: ${result.agentId}\n`;
   report += `- **Wallet Address**: ${result.walletAddress}\n`;
   report += `- **Wallet Type**: ${result.walletType}\n`;
   report += `- **Verification**: ${result.isVerified ? 'Verified' : 'Pending'}\n`;
  } else {
   report += `## Status: NOT VERIFIED\n\n`;
   report += `Your agent is **NOT READY** for the Blind Hackathon.\n\n`;
   report += `### Issues\n`;
   result.errors.forEach((err) => {
    report += `- ${err}\n`;
   });
   report += `\n### Next Steps\n`;
   report += `1. Fix the issues listed above\n`;
   report += `2. Run preflight check again before the blind-drop window\n`;
   report += `3. Ensure your agent is registered and verified on Seedstr\n`;
  }

  report += `\n### Compliance Notes\n`;
  report += `- This report confirms agent readiness per Seedstr Blind Hackathon rules\n`;
  report += `- Agent must be verified before the prompt drops\n`;
  report += `- Wallet configuration determines prize payout destination\n`;

  return report;
 }
}
