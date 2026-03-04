import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { EventBus } from '../src/agent/core/event-bus';
import { Bridge } from '../src/agent/modules/bridge';
import { Packer } from '../src/agent/modules/packer';
import type { ApprovalEventData } from '../src/agent/types';

jest.mock('conf', () => ({
  __esModule: true,
  default: class MockConf {
    private defaults: Record<string, unknown>;
    private values = new Map<string, unknown>();

    constructor(options?: { defaults?: Record<string, unknown> }) {
      this.defaults = options?.defaults || {};
    }

    get(key: string) {
      return this.values.has(key) ? this.values.get(key) : this.defaults[key];
    }

    set(key: string, value: unknown) {
      this.values.set(key, value);
    }

    has(key: string) {
      return this.values.has(key);
    }

    clear() {
      this.values.clear();
    }
  },
}));

const mockSubmitResponse = jest.fn();
const mockUploadFiles = jest.fn();

jest.mock('../src/agent/api-client', () => ({
  SeedstrAPIClient: jest.fn().mockImplementation(() => ({
    submitResponse: mockSubmitResponse,
    uploadFiles: mockUploadFiles,
  })),
}));

describe('Supervised Mode Approval Broadcast', () => {
  const originalAutonomyMode = process.env.AUTONOMY_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTONOMY_MODE = undefined;
    mockSubmitResponse.mockResolvedValue({ success: true, message: 'ok', responseId: 'resp-1' });
    mockUploadFiles.mockResolvedValue({ files: [] });
  });

  afterAll(() => {
    process.env.AUTONOMY_MODE = originalAutonomyMode;
  });

  test('config defaults autonomy mode to supervised', () => {
    jest.isolateModules(() => {
      const { config } = require('../src/agent/config');
      config.set('autonomyMode', undefined);
      expect(config.getAutonomyMode()).toBe('supervised');
    });
  });

  test('Packer broadcasts job_approval_request before submit', async () => {
    const bus = new EventBus();
    const packer = new Packer(bus, {
      apiKey: 'k',
      seedstrApiKey: 'k',
      autonomyMode: 'supervised',
    });

    const callOrder: string[] = [];
    bus.on('job_approval_request', () => callOrder.push('approval'));
    mockSubmitResponse.mockImplementation(async () => {
      callOrder.push('submit');
      return { success: true, message: 'ok', responseId: 'resp-1' };
    });

    await packer.packAndSubmit(
      'job-1',
      '/tmp/unused',
      { rawResponse: 'hello', files: [], llmModel: 'test' },
      'TEXT',
      { prompt: 'Build UI', budget: 1.25, skills: ['react'], jobType: 'SWARM' }
    );

    expect(callOrder.slice(0, 2)).toEqual(['approval', 'submit']);
  });

  test('Bridge relays job_approval_request via SSE', () => {
    const bus = new EventBus();
    const sseServer = {
      broadcast: jest.fn(),
    } as any;
    const bridge = new Bridge(bus, sseServer);
    bridge.start();

    const payload: ApprovalEventData = {
      id: 'job-2',
      action: 'accept_swarm',
      job: {
        id: 'job-2',
        prompt: 'Build dashboard',
        budget: 2,
        skills: ['typescript'],
        jobType: 'SWARM',
      },
      autoApproved: true,
      timestamp: Date.now(),
    };

    bus.emit('job_approval_request', payload);

    expect(sseServer.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'job_approval_request',
        data: expect.objectContaining({ id: 'job-2', action: 'accept_swarm' }),
      })
    );

    bridge.stop();
  });

  test('Manual mode throws expected error', async () => {
    const bus = new EventBus();
    const packer = new Packer(bus, {
      apiKey: 'k',
      seedstrApiKey: 'k',
      autonomyMode: 'manual',
    });

    await expect(
      packer.packAndSubmit(
        'job-3',
        '/tmp/unused',
        { rawResponse: 'hello', files: [], llmModel: 'test' },
        'TEXT',
        { prompt: 'Build app', budget: 1, skills: ['node'], jobType: 'STANDARD' }
      )
    ).rejects.toThrow('Manual approval gate not yet implemented');
  });

  test('Approval event includes all required fields', async () => {
    const bus = new EventBus();
    const packer = new Packer(bus, {
      apiKey: 'k',
      seedstrApiKey: 'k',
      autonomyMode: 'supervised',
    });

    const events: ApprovalEventData[] = [];
    bus.on('job_approval_request', (event) => events.push(event));

    const buildDir = mkdtempSync(join(tmpdir(), 'seedstr-supervised-'));
    try {
      await packer.packAndSubmit(
        'job-4',
        buildDir,
        { rawResponse: 'done', files: [], llmModel: 'test' },
        'FILE',
        { prompt: 'Build landing page', budget: 3.5, skills: ['react', 'tailwind'], jobType: 'SWARM' }
      );
    } finally {
      rmSync(buildDir, { recursive: true, force: true });
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        id: 'job-4',
        action: 'submit_response',
        autoApproved: true,
        responseType: 'FILE',
        timestamp: expect.any(Number),
        job: {
          id: 'job-4',
          prompt: 'Build landing page',
          budget: 3.5,
          skills: ['react', 'tailwind'],
          jobType: 'SWARM',
        },
      })
    );
  });
});
