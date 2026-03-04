#!/usr/bin/env tsx
import 'dotenv/config';
import { SeedstrAPIClient } from '../agent/api-client';

async function updateSkills() {
  const apiKey = process.env.SEEDSTR_API_KEY;
  if (!apiKey) {
    console.error('❌ SEEDSTR_API_KEY not found in .env');
    process.exit(1);
  }

  const client = new SeedstrAPIClient(apiKey);

  // Current skills + recommended additions (max 15 total)
  const allSkills = [
    // Current (10)
    'Content Writing',
    'Code Review',
    'Data Analysis',
    'Research',
    'Technical Writing',
    'Web Scraping',
    'API Integration',
    'Graphic Design',
    'Copywriting',
    'SEO',
    // Recommended additions (5 more = 15 total)
    'Video Editing',
    'Translation',
    'Community Management',
    'Discord Management',
    'Email Marketing',
  ];

  console.log(`📝 Updating agent skills to ${allSkills.length}/15...`);
  console.log(`\nSkills:`);
  allSkills.forEach((skill, i) => console.log(`  ${i + 1}. ${skill}`));

  try {
    const result = await client.updateProfile({ skills: allSkills });
    console.log('\n✅ Skills updated successfully!');
    console.log(JSON.stringify(result, null, 2));

    // Verify update
    const profile = await client.getMe();
    console.log(`\n✅ Verified: Agent now has ${profile.skills.length} skills`);
  } catch (error: any) {
    console.error('❌ Failed to update skills:', error.message);
    process.exit(1);
  }
}

updateSkills();
