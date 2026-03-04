import type { EventBus } from '../core/event-bus.js';
import type { AgentConfig, BrainOutput, BuildFile } from '../types.js';
import { LLMClient } from '../llm-client.js';

export class Brain {
  private llmClient: LLMClient;

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
  }

  async generateFromPrompt(jobId: string, prompt: string, budget: number): Promise<BrainOutput> {
    const startTime = Date.now();

    try {
      console.log(`[Brain] Starting generation for job ${jobId}...`);

      const generation = await this.llmClient.generate({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const generationTimeMs = Date.now() - startTime;
      const responseText = generation.text;

      const brainOutput: BrainOutput = {
        rawResponse: responseText,
        files: this.extractFiles(responseText),
        llmModel: 'openrouter-selected',
        tokensUsed: undefined,
        generationTimeMs,
      };

      console.log(
        `[Brain] Generation complete: ${generationTimeMs}ms, ${brainOutput.files.length} files extracted`
      );

      return brainOutput;
    } catch (error) {
      console.error(`[Brain] Generation failed for job ${jobId}:`, error);
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
