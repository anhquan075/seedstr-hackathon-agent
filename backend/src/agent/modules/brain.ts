import type { EventBus } from '../core/event-bus.js';
import type { AgentConfig, BrainOutput, BuildFile, LLMMessage } from '../types.js';
import { LLMClient } from '../llm-client.js';
import { logger } from '../logger.js';
import { ProjectValidator } from './validator.js';
import { getSystemPrompt, getFrontendGenerationPrompt } from '../prompts.js';
import * as tools from '../tools/index.js';
import { setActiveProjectBuilder } from '../tools/project-tools.js';
import { ProjectBuilder } from '../project-builder.js';

export class Brain {
  private llmClient: LLMClient;
  private validator: ProjectValidator;
  private readonly MAX_CORRECTION_ATTEMPTS = 2;

  constructor(
    private bus: EventBus,
    private config: AgentConfig
  ) {
    const openrouterApiKey = config.openrouterApiKey || process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      throw new Error('[Brain] OPENROUTER_API_KEY not configured');
    }

    this.llmClient = new LLMClient({
      openrouterApiKey,
      models: config.models,
    });
    this.validator = new ProjectValidator();
  }

  async generateFromPrompt(jobId: string, prompt: string, budget: number): Promise<BrainOutput> {
    const startTime = Date.now();
    let currentPrompt = getFrontendGenerationPrompt(prompt);
    let attempts = 0;
    
    // Initialize project builder for this job and link it to tools
    const projectBuilder = new ProjectBuilder(jobId);
    setActiveProjectBuilder(projectBuilder);

    const history: LLMMessage[] = [
      {
        role: 'system',
        content: getSystemPrompt({
          name: this.config.name,
          bio: this.config.bio,
          skills: this.config.skills,
        }),
      }
    ];

    try {
      logger.info(`[Brain] Starting generation for job ${jobId}...`);
      
      while (attempts <= this.MAX_CORRECTION_ATTEMPTS) {
        attempts++;
        const userMsg: LLMMessage = { role: 'user', content: currentPrompt };
        history.push(userMsg);

        const generation = await this.llmClient.generate({
          messages: history,
          budget,
          tools: tools as any,
          maxSteps: 10,
        });

        const responseText = generation.text;
        history.push({ role: 'assistant', content: responseText });

        // Merge files from both patterns: regex extraction AND tool-based creation
        const extractedFiles = this.extractFiles(responseText);
        const toolCreatedFiles = projectBuilder.getFiles();
        
        // Convert ProjectBuilder files to BuildFile format
        const formattedToolFiles: BuildFile[] = toolCreatedFiles.map(f => ({
          path: f.path,
          content: f.content,
          type: this.mapLanguageToFileType(f.path.split('.').pop() || 'text')
        }));

        // Combine files (prefer tool-created files if paths collide)
        const fileMap = new Map<string, BuildFile>();
        extractedFiles.forEach(f => fileMap.set(f.path, f));
        formattedToolFiles.forEach(f => fileMap.set(f.path, f));
        
        const allFiles = Array.from(fileMap.values());
        const validation = this.validator.validate(allFiles);

        if (validation.isValid) {
          const generationTimeMs = Date.now() - startTime;
          return {
            rawResponse: responseText,
            files: allFiles,
            llmModel: 'openrouter-selected',
            tokensUsed: generation.usage?.totalTokens,
            generationTimeMs,
            usage: generation.usage,
            cost: generation.cost,
          };
        }

        // If invalid, prepare fix prompt for next loop
        logger.warn(`[Brain] Validation failed for job ${jobId} (Attempt ${attempts}/${this.MAX_CORRECTION_ATTEMPTS + 1}):`, validation.errors);
        
        if (attempts > this.MAX_CORRECTION_ATTEMPTS) {
          logger.error(`[Brain] Self-correction failed after ${attempts} attempts for job ${jobId}.`);
          // Return what we have anyway, or throw
          break;
        }

        currentPrompt = `Your previous response had the following errors. Please fix them and provide the corrected output:
${validation.errors.map(e => `- ${e}`).join('\n')}

IMPORTANT: Ensure you include all necessary files, especially index.html.`;
      }

      // Final fallback if loop ends without valid state
      const lastResponse = history[history.length - 1].content;
      return {
        rawResponse: lastResponse,
        files: this.extractFiles(lastResponse),
        llmModel: 'openrouter-selected',
        generationTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      logger.error(`[Brain] Generation failed for job ${jobId}:`, error);
      throw error;
    }
  }

  getResponseType(job: { budget: number; description?: string; prompt: string }): 'TEXT' | 'FILE' {
    if (job.budget > 10) return 'FILE';
    if (job.description && job.description.length > 200) return 'FILE';

    const projectKeywords = [
      'build',
      'create',
      'develop',
      'website',
      'app',
      'frontend',
      'dashboard',
      'ui',
      'component',
      'system',
      'tool',
    ];
    const text = (job.description || job.prompt).toLowerCase();
    if (projectKeywords.some((kw) => text.includes(kw))) return 'FILE';

    return 'TEXT';
  }

  shouldUploadFiles(responseType: 'TEXT' | 'FILE'): boolean {
    return responseType === 'FILE';
  }

  private extractFiles(response: string): BuildFile[] {
    const files: BuildFile[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

    let match: RegExpExecArray | null;
    let fileIndex = 0;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || 'text';
      const content = match[2];

      files.push({
        path: this.generateFileName(language, fileIndex),
        content,
        type: this.mapLanguageToFileType(language),
      });

      fileIndex++;
    }

    return files;
  }

  private mapLanguageToFileType(language: string): BuildFile['type'] {
    const normalizedLang = language.toLowerCase();

    if (normalizedLang.includes('html')) return 'html';
    if (normalizedLang.includes('css')) return 'css';
    if (normalizedLang.includes('javascript') || normalizedLang.includes('js')) return 'js';
    if (normalizedLang.includes('json')) return 'json';

    return 'other';
  }

  private generateFileName(language: string, index: number): string {
    const timestamp = Date.now().toString(36);
    const baseNames: Record<string, string> = {
      html: 'index.html',
      css: `styles-${timestamp}.css`,
      js: `script-${timestamp}.js`,
      json: `data-${timestamp}.json`,
    };

    const normalizedLang = language.toLowerCase();
    for (const [lang, name] of Object.entries(baseNames)) {
      if (normalizedLang.includes(lang)) {
        return index === 0 ? name : `${name.replace(/\.[^.]+$/, '')}-${index}.${lang}`;
      }
    }

    return `file-${timestamp}-${index}.txt`;
  }
}

export default Brain;
