import { tool } from 'ai';
import { z } from 'zod';

export const socialTools = tool({
 description: 'Tools for managing social media and community platform content',
 inputSchema: z.object({
  operation: z.enum([
   'format_twitter_thread',
   'format_reddit_post',
   'format_discord_webhook',
  ]).describe('The social media operation to perform'),
  content: z.string().describe('The content to format'),
  metadata: z.record(z.any()).optional().describe('Metadata like titles, tags, or thread limits'),
 }),
 execute: async ({ operation, content, metadata }) => {
  try {
   switch (operation) {
    case 'format_twitter_thread': {
     const maxLength = 280;
     const paragraphs = content.split('\n\n');
     const thread = [];
     
     let currentTweet = '';
     for (const p of paragraphs) {
      if ((currentTweet + p).length > maxLength - 10) {
       if (currentTweet) thread.push(currentTweet.trim());
       currentTweet = p;
      } else {
       currentTweet += (currentTweet ? '\n\n' : '') + p;
      }
     }
     if (currentTweet) thread.push(currentTweet.trim());
     
     return {
      success: true,
      platform: 'Twitter/X',
      thread: thread.map((t, i) => `${t} (${i + 1}/${thread.length})`),
      count: thread.length,
     };
    }
    
    case 'format_reddit_post': {
     const title = metadata?.title || 'Post Title';
     const subreddit = metadata?.subreddit || 'general';
     const formatted = `# ${title}\n\n${content}`;
     
     return {
      success: true,
      platform: 'Reddit',
      formatted,
      subreddit,
     };
    }
    
    case 'format_discord_webhook': {
     const username = metadata?.username || 'Seedstr Agent';
     const avatarUrl = metadata?.avatar_url || '';
     const embed = {
      title: metadata?.title || 'Notification',
      description: content,
      color: metadata?.color || 0x00ff00,
      timestamp: new Date().toISOString(),
     };
     
     return {
      success: true,
      platform: 'Discord',
      payload: {
       username,
       avatar_url: avatarUrl,
       embeds: [embed],
      },
     };
    }
    
    default:
     return { error: `Unknown operation: ${operation}` };
   }
  } catch (error) {
   return { success: false, error: (error as Error).message };
  }
 },
});
